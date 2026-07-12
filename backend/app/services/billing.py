"""Premium billing helpers and webhook event handling."""

from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import Any

from sqlalchemy.orm import Session

from app.models.billing_event import BillingEvent
from app.models.user import User
from app.services.plan_catalog import plan_pricing_payload

logger = logging.getLogger(__name__)

PLAN_PERIOD_DAYS = {
    "monthly": 30,
    "yearly": 365,
}


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _as_utc(value: datetime | None) -> datetime | None:
    if value is None:
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def get_current_user_premium_status(user: User) -> dict[str, Any]:
    """
    Active premium requires is_premium=True AND a future premium_period_end.
    Expired subscriptions fall back to free even if a renewal webhook was missed.
    """
    period_end = _as_utc(user.premium_period_end)
    now = _utcnow()
    active = bool(user.is_premium and period_end and period_end > now)

    if user.is_premium and period_end and period_end <= now:
        active = False

    plan = user.premium_plan if active else "free"

    return {
        "plan": plan,
        "is_premium": active,
        "premium_until": period_end,
        "paystack_subscription_code": user.paystack_subscription_code,
        "last_paystack_reference": user.last_paystack_reference,
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


def _find_user_for_event(db: Session, data: dict[str, Any]) -> User | None:
    metadata = data.get("metadata") or {}
    user_id = metadata.get("user_id")
    if user_id:
        user = db.query(User).filter(User.id == user_id).first()
        if user:
            return user

    subscription_code = data.get("subscription_code") or data.get("subscription", {}).get("subscription_code")
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
) -> None:
    days = PLAN_PERIOD_DAYS.get(plan, 30)
    now = _utcnow()
    current_end = _as_utc(user.premium_period_end)
    base = current_end if current_end and current_end > now else now

    user.is_premium = True
    user.premium_plan = plan
    user.premium_period_end = base + timedelta(days=days)
    if reference:
        user.last_paystack_reference = reference
    if subscription_code:
        user.paystack_subscription_code = subscription_code
    if customer_code:
        user.paystack_customer_code = customer_code
    db.add(user)


def deactivate_premium(db: Session, user: User) -> None:
    user.is_premium = False
    db.add(user)


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

    if event_type == "charge.success" and user:
        metadata = data.get("metadata") or {}
        plan = metadata.get("plan") or user.premium_plan or "monthly"
        subscription = data.get("subscription") or {}
        activate_premium(
            db,
            user,
            plan=plan,
            reference=reference,
            subscription_code=subscription.get("subscription_code") or data.get("subscription_code"),
            customer_code=(data.get("customer") or {}).get("customer_code"),
        )
        logger.info("Premium activated for user %s via charge.success", user.id)
        return

    if event_type in {"subscription.disable", "subscription.not_renew"} and user:
        deactivate_premium(db, user)
        logger.info("Premium deactivated for user %s via %s", user.id, event_type)
        return

    if event_type == "invoice.payment_failed" and user:
        deactivate_premium(db, user)
        logger.info("Premium deactivated for user %s via invoice.payment_failed", user.id)
        return

    if event_type == "subscription.create" and user:
        subscription = data.get("subscription") or data
        plan = (data.get("metadata") or {}).get("plan") or user.premium_plan or "monthly"
        activate_premium(
            db,
            user,
            plan=plan,
            reference=reference,
            subscription_code=subscription.get("subscription_code"),
            customer_code=(data.get("customer") or {}).get("customer_code"),
        )
        logger.info("Premium subscription created for user %s", user.id)


def billing_status_payload(user: User, db: Session) -> dict[str, Any]:
    status = get_current_user_premium_status(user)
    plans = {item["slug"]: item for item in plan_pricing_payload(db)}
    monthly = plans.get("monthly", {})
    yearly = plans.get("yearly", {})
    return {
        "plan": status["plan"],
        "is_premium": status["is_premium"],
        "premium_until": status["premium_until"],
        "monthly_base_amount_ngn": monthly.get("base_amount"),
        "yearly_base_amount_ngn": yearly.get("base_amount"),
        "yearly_savings_percent": yearly.get("yearly_savings_percent"),
        "yearly_savings_amount": yearly.get("yearly_savings_amount"),
        "paystack_public_key": None,
    }
