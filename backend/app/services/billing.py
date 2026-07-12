"""Premium billing helpers and webhook event handling."""

from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import Any, Literal

from sqlalchemy.orm import Session

from app.config import settings
from app.models.billing_event import BillingEvent
from app.models.user import User
from app.services.plan_catalog import plan_pricing_payload

logger = logging.getLogger(__name__)

PLAN_PERIOD_DAYS = {
    "monthly": 30,
    "yearly": 365,
}

SubscriptionStatus = Literal["active", "past_due", "cancelled", "expired"]


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _as_utc(value: datetime | None) -> datetime | None:
    if value is None:
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _access_until(user: User) -> datetime | None:
    period_end = _as_utc(user.premium_period_end)
    grace_until = _as_utc(user.premium_grace_until)
    if user.subscription_status == "past_due" and grace_until:
        return grace_until
    return period_end


def sync_subscription_access(db: Session, user: User) -> None:
    """Downgrade expired cancelled/past_due subscriptions on each status check."""
    if not user.is_premium:
        return

    access_until = _access_until(user)
    if access_until is None or _utcnow() <= access_until:
        return

    user.is_premium = False
    if user.subscription_status in {"cancelled", "past_due", "active"}:
        user.subscription_status = "expired"
    db.add(user)


def get_current_user_premium_status(user: User, db: Session | None = None) -> dict[str, Any]:
    """
    Active premium requires is_premium=True AND access until a future timestamp.
    Cancelled subscriptions keep access until premium_period_end.
    Past-due subscriptions keep access until premium_grace_until.
    """
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
        "subscription_status": user.subscription_status,
        "paystack_subscription_code": user.paystack_subscription_code,
        "last_paystack_reference": user.last_paystack_reference,
        "can_cancel": bool(
            user.paystack_subscription_code
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


def activate_premium(
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
    user.subscription_status = "active"
    user.premium_grace_until = None
    if reference:
        user.last_paystack_reference = reference
    if subscription_code:
        user.paystack_subscription_code = subscription_code
    if customer_code:
        user.paystack_customer_code = customer_code
    if email_token:
        user.paystack_email_token = email_token
    db.add(user)


def mark_subscription_cancelled(db: Session, user: User) -> None:
    """Stop future renewals but keep Pro access until premium_period_end."""
    user.subscription_status = "cancelled"
    db.add(user)


def mark_subscription_past_due(db: Session, user: User) -> None:
    """Failed renewal — keep access through period end plus a short grace window."""
    user.subscription_status = "past_due"
    period_end = _as_utc(user.premium_period_end) or _utcnow()
    grace_base = max(period_end, _utcnow())
    user.premium_grace_until = grace_base + timedelta(days=settings.billing_past_due_grace_days)
    db.add(user)

    try:
        from app.services.email import send_payment_failed_email

        send_payment_failed_email(
            to=user.email,
            grace_until=user.premium_grace_until,
            plan=user.premium_plan or "monthly",
        )
    except Exception:
        logger.exception("Failed to send payment failed email for user %s", user.id)


def apply_verified_transaction(db: Session, user: User, paystack_data: dict[str, Any]) -> None:
    """Apply premium activation when verify confirms success before the webhook arrives."""
    metadata = paystack_data.get("metadata") or {}
    plan = metadata.get("plan") or user.premium_plan or "monthly"
    subscription_fields = _extract_subscription_fields(paystack_data)
    activate_premium(
        db,
        user,
        plan=plan,
        reference=paystack_data.get("reference"),
        subscription_code=subscription_fields["subscription_code"],
        customer_code=subscription_fields["customer_code"],
        email_token=subscription_fields["email_token"],
    )


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

    subscription_fields = _extract_subscription_fields(data)

    if event_type == "charge.success":
        metadata = data.get("metadata") or {}
        plan = metadata.get("plan") or user.premium_plan or "monthly"
        activate_premium(
            db,
            user,
            plan=plan,
            reference=reference,
            subscription_code=subscription_fields["subscription_code"],
            customer_code=subscription_fields["customer_code"],
            email_token=subscription_fields["email_token"],
        )
        logger.info("Premium activated for user %s via charge.success", user.id)
        return

    if event_type == "subscription.create":
        metadata = data.get("metadata") or {}
        plan = metadata.get("plan") or user.premium_plan or "monthly"
        activate_premium(
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
        "subscription_status": status["subscription_status"],
        "can_cancel": status["can_cancel"],
        "is_cancelled_pending_expiry": status["is_cancelled_pending_expiry"],
        "monthly_base_amount_ngn": monthly.get("base_amount"),
        "yearly_base_amount_ngn": yearly.get("base_amount"),
        "yearly_savings_percent": yearly.get("yearly_savings_percent"),
        "yearly_savings_amount": yearly.get("yearly_savings_amount"),
        "paystack_public_key": None,
    }
