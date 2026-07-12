"""Premium billing helpers and webhook event handling."""

from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import Any, Literal

from sqlalchemy.orm import Session

from app.config import settings
from app.models.billing_event import BillingEvent
from app.models.user import User
from app.services.notifications import has_recent_notification, notify_user
from app.services.plan_catalog import plan_pricing_payload

logger = logging.getLogger(__name__)

PLAN_PERIOD_DAYS = {
    "monthly": 30,
    "yearly": 365,
}

SubscriptionStatus = Literal["active", "past_due", "cancelled", "expired"]
RenewalType = Literal["auto", "manual"]


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _as_utc(value: datetime | None) -> datetime | None:
    if value is None:
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _parse_paid_at(data: dict[str, Any]) -> datetime:
    paid_at = data.get("paid_at") or data.get("paidAt")
    if isinstance(paid_at, str) and paid_at:
        return datetime.fromisoformat(paid_at.replace("Z", "+00:00"))
    if isinstance(paid_at, datetime):
        return _as_utc(paid_at) or _utcnow()
    return _utcnow()


def _metadata_auto_renew(data: dict[str, Any]) -> bool | None:
    metadata = data.get("metadata") or {}
    raw = metadata.get("auto_renew")
    if raw is None:
        return None
    if isinstance(raw, bool):
        return raw
    return str(raw).lower() in {"true", "1", "yes"}


def _is_subscription_charge(data: dict[str, Any]) -> bool:
    """True when Paystack created or will create a subscription for this charge."""
    metadata_pref = _metadata_auto_renew(data)
    if metadata_pref is False:
        return False
    if metadata_pref is True:
        return True
    if data.get("plan"):
        return True
    subscription = data.get("subscription")
    if isinstance(subscription, dict) and subscription.get("subscription_code"):
        return True
    return False


def _access_until(user: User) -> datetime | None:
    period_end = _as_utc(user.premium_period_end)
    grace_until = _as_utc(user.premium_grace_until)
    if user.subscription_status == "past_due" and grace_until:
        return grace_until
    return period_end


def _charge_amount_ngn(data: dict[str, Any]) -> float:
    amount = data.get("amount")
    if amount is not None:
        return float(amount) / 100
    metadata = data.get("metadata") or {}
    if metadata.get("total_charge") is not None:
        return float(metadata["total_charge"])
    if metadata.get("base_amount") is not None:
        return float(metadata["base_amount"])
    return 0.0


def _plan_charge_amount(db: Session, plan_slug: str | None) -> float:
    if not plan_slug:
        return 0.0
    for item in plan_pricing_payload(db):
        if item["slug"] == plan_slug:
            return float(item["total_charge"])
    return 0.0


def maybe_send_scheduled_billing_notifications(db: Session, user: User) -> None:
    if not user.is_premium:
        return

    period_end = _as_utc(user.premium_period_end)
    if period_end is None:
        return

    days_left = (period_end - _utcnow()).total_seconds() / 86400
    if days_left > settings.billing_manual_renewal_reminder_days or days_left < 0:
        return

    plan_slug = user.premium_plan or "monthly"
    amount = _plan_charge_amount(db, plan_slug)
    context = {
        "plan": plan_slug,
        "plan_name": f"Pro {plan_slug}",
        "amount": amount,
        "period_end": period_end,
    }

    if user.renewal_type == "manual":
        if not has_recent_notification(db, user_id=user.id, notification_type="access_expiring"):
            notify_user(db, user.id, "access_expiring", context)
        return

    if user.renewal_type == "auto" and user.subscription_status in {None, "active"}:
        if not has_recent_notification(db, user_id=user.id, notification_type="renewal_upcoming"):
            notify_user(db, user.id, "renewal_upcoming", context)


def sync_subscription_access(db: Session, user: User) -> None:
    """Downgrade expired subscriptions and one-time plans on each status check."""
    maybe_send_scheduled_billing_notifications(db, user)

    if not user.is_premium:
        return

    access_until = _access_until(user)
    if access_until is None or _utcnow() <= access_until:
        return

    user.is_premium = False
    if user.subscription_status in {"cancelled", "past_due", "active"}:
        user.subscription_status = "expired"
    db.add(user)

    if not has_recent_notification(db, user_id=user.id, notification_type="access_expired", within_hours=168):
        notify_user(db, user.id, "access_expired", {})


def get_current_user_premium_status(user: User, db: Session | None = None) -> dict[str, Any]:
    if db is not None:
        sync_subscription_access(db, user)

    access_until = _access_until(user)
    now = _utcnow()
    active = bool(user.is_premium and access_until and access_until > now)
    plan = user.premium_plan if active else "free"

    return {
        "plan": plan,
        "is_premium": active,
        "premium_until": access_until,
        "renewal_type": user.renewal_type,
        "subscription_status": user.subscription_status,
        "paystack_subscription_code": user.paystack_subscription_code,
        "last_paystack_reference": user.last_paystack_reference,
        "can_cancel": bool(
            user.renewal_type == "auto"
            and user.paystack_subscription_code
            and user.paystack_email_token
            and user.subscription_status in {None, "active", "past_due"}
            and active
        ),
        "is_cancelled_pending_expiry": user.subscription_status == "cancelled" and active,
    }


def log_billing_event(
    db: Session,
    *,
    event_type: str,
    payload: dict[str, Any],
    user_id: str | None = None,
    paystack_reference: str | None = None,
) -> BillingEvent:
    event = BillingEvent(
        user_id=user_id,
        event_type=event_type,
        paystack_reference=paystack_reference,
        payload=payload,
    )
    db.add(event)
    return event


def _extract_subscription_fields(data: dict[str, Any]) -> dict[str, str | None]:
    subscription = data.get("subscription") or {}
    if isinstance(subscription, dict) and not subscription.get("subscription_code"):
        subscription = data

    return {
        "subscription_code": subscription.get("subscription_code") or data.get("subscription_code"),
        "email_token": subscription.get("email_token") or data.get("email_token"),
        "customer_code": (data.get("customer") or {}).get("customer_code"),
    }


def _find_user_for_event(db: Session, data: dict[str, Any]) -> User | None:
    metadata = data.get("metadata") or {}
    user_id = metadata.get("user_id")
    if user_id:
        user = db.query(User).filter(User.id == user_id).first()
        if user:
            return user

    subscription_code = data.get("subscription_code") or (data.get("subscription") or {}).get("subscription_code")
    if subscription_code:
        user = db.query(User).filter(User.paystack_subscription_code == subscription_code).first()
        if user:
            return user

    customer = data.get("customer") or {}
    email = customer.get("email") or data.get("customer_email")
    if email:
        return db.query(User).filter(User.email == email).first()

    return None


def activate_auto_premium(
    db: Session,
    user: User,
    *,
    plan: str,
    reference: str | None = None,
    subscription_code: str | None = None,
    customer_code: str | None = None,
    email_token: str | None = None,
) -> None:
    days = PLAN_PERIOD_DAYS.get(plan, 30)
    now = _utcnow()
    current_end = _as_utc(user.premium_period_end)
    base = current_end if current_end and current_end > now else now

    user.is_premium = True
    user.premium_plan = plan
    user.premium_period_end = base + timedelta(days=days)
    user.renewal_type = "auto"
    user.subscription_status = "active"
    user.premium_grace_until = None
    user.manual_renewal_reminder_sent_at = None
    if reference:
        user.last_paystack_reference = reference
    if subscription_code:
        user.paystack_subscription_code = subscription_code
    if customer_code:
        user.paystack_customer_code = customer_code
    if email_token:
        user.paystack_email_token = email_token
    db.add(user)


def activate_manual_premium(
    db: Session,
    user: User,
    *,
    plan: str,
    reference: str | None = None,
    paid_at: datetime | None = None,
    customer_code: str | None = None,
) -> None:
    paid = _as_utc(paid_at) or _utcnow()
    days = PLAN_PERIOD_DAYS.get(plan, 30)
    current_end = _as_utc(user.premium_period_end)
    base = current_end if current_end and current_end > paid else paid

    user.is_premium = True
    user.premium_plan = plan
    user.premium_period_end = base + timedelta(days=days)
    user.renewal_type = "manual"
    user.subscription_status = "active"
    user.premium_grace_until = None
    user.manual_renewal_reminder_sent_at = None
    user.paystack_subscription_code = None
    user.paystack_email_token = None
    if reference:
        user.last_paystack_reference = reference
    if customer_code:
        user.paystack_customer_code = customer_code
    db.add(user)


def process_successful_charge(db: Session, user: User, data: dict[str, Any], *, reference: str | None = None) -> None:
    metadata = data.get("metadata") or {}
    plan = metadata.get("plan") or user.premium_plan or "monthly"
    was_resubscribe = bool(
        user.subscription_status in {"expired", "cancelled"}
        or (user.premium_period_end is not None and not user.is_premium)
    )

    if _is_subscription_charge(data):
        subscription_fields = _extract_subscription_fields(data)
        activate_auto_premium(
            db,
            user,
            plan=plan,
            reference=reference or data.get("reference"),
            subscription_code=subscription_fields["subscription_code"],
            customer_code=subscription_fields["customer_code"],
            email_token=subscription_fields["email_token"],
        )
        logger.info("Auto-renew premium activated for user %s", user.id)
    else:
        activate_manual_premium(
            db,
            user,
            plan=plan,
            reference=reference or data.get("reference"),
            paid_at=_parse_paid_at(data),
            customer_code=(data.get("customer") or {}).get("customer_code"),
        )
        logger.info("One-time premium activated for user %s until %s", user.id, user.premium_period_end)

    amount = _charge_amount_ngn(data) or _plan_charge_amount(db, plan)
    payment_context = {
        "plan": plan,
        "plan_name": f"Pro {plan}",
        "amount": amount,
        "period_end": user.premium_period_end,
    }
    if not has_recent_notification(db, user_id=user.id, notification_type="payment_success", within_hours=2):
        notify_user(db, user.id, "payment_success", payment_context)
    if was_resubscribe and not has_recent_notification(db, user_id=user.id, notification_type="resubscribed", within_hours=2):
        notify_user(db, user.id, "resubscribed", payment_context)


def mark_subscription_cancelled(db: Session, user: User) -> None:
    user.subscription_status = "cancelled"
    db.add(user)


def mark_subscription_past_due(db: Session, user: User) -> None:
    user.subscription_status = "past_due"
    period_end = _as_utc(user.premium_period_end) or _utcnow()
    grace_base = max(period_end, _utcnow())
    user.premium_grace_until = grace_base + timedelta(days=settings.billing_past_due_grace_days)
    db.add(user)

    if not has_recent_notification(db, user_id=user.id, notification_type="renewal_failed", within_hours=48):
        notify_user(
            db,
            user.id,
            "renewal_failed",
            {
                "plan": user.premium_plan or "monthly",
                "period_end": user.premium_grace_until,
                "retry_info": "Paystack does not retry failed subscription payments automatically.",
            },
        )


def apply_verified_transaction(db: Session, user: User, paystack_data: dict[str, Any]) -> None:
    process_successful_charge(db, user, paystack_data, reference=paystack_data.get("reference"))


def handle_paystack_event(db: Session, event: dict[str, Any]) -> None:
    event_type = event.get("event", "unknown")
    data = event.get("data") or {}
    reference = data.get("reference") or data.get("transaction_reference")

    user = _find_user_for_event(db, data)
    log_billing_event(
        db,
        event_type=event_type,
        payload=event,
        user_id=user.id if user else None,
        paystack_reference=reference,
    )

    if not user:
        return

    if event_type == "charge.success":
        process_successful_charge(db, user, data, reference=reference)
        return

    if event_type == "subscription.create":
        metadata = data.get("metadata") or {}
        plan = metadata.get("plan") or user.premium_plan or "monthly"
        subscription_fields = _extract_subscription_fields(data)
        activate_auto_premium(
            db,
            user,
            plan=plan,
            reference=reference,
            subscription_code=subscription_fields["subscription_code"],
            customer_code=subscription_fields["customer_code"],
            email_token=subscription_fields["email_token"],
        )
        logger.info("Premium subscription created for user %s", user.id)
        return

    if event_type in {"subscription.disable", "subscription.not_renew"}:
        mark_subscription_cancelled(db, user)
        logger.info("Subscription marked cancelled for user %s via %s", user.id, event_type)
        return

    if event_type == "invoice.payment_failed":
        mark_subscription_past_due(db, user)
        logger.info(
            "Subscription marked past_due for user %s; grace until %s",
            user.id,
            user.premium_grace_until,
        )


def billing_status_payload(user: User, db: Session) -> dict[str, Any]:
    status = get_current_user_premium_status(user, db)
    plans = {item["slug"]: item for item in plan_pricing_payload(db)}
    monthly = plans.get("monthly", {})
    yearly = plans.get("yearly", {})
    return {
        "plan": status["plan"],
        "is_premium": status["is_premium"],
        "premium_until": status["premium_until"],
        "renewal_type": status["renewal_type"],
        "subscription_status": status["subscription_status"],
        "can_cancel": status["can_cancel"],
        "is_cancelled_pending_expiry": status["is_cancelled_pending_expiry"],
        "monthly_base_amount_ngn": monthly.get("base_amount"),
        "yearly_base_amount_ngn": yearly.get("base_amount"),
        "yearly_savings_percent": yearly.get("yearly_savings_percent"),
        "yearly_savings_amount": yearly.get("yearly_savings_amount"),
        "paystack_public_key": None,
    }
