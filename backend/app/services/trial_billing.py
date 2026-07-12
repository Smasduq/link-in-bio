"""Free Pro trial — tokenize card, refund, deferred Paystack subscription."""

from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.config import settings
from app.models.trial_email_claim import TrialEmailClaim
from app.models.user import User
from app.services.notifications import has_recent_notification, notify_user
from app.services.paystack import (
    create_paystack_subscription,
    initialize_trial_tokenization,
    refund_transaction,
)
from app.services.plan_catalog import get_plan_by_slug

logger = logging.getLogger(__name__)

TRIAL_TOKENIZATION_PURPOSE = "trial_tokenization"
TRIAL_GRACE_AFTER_END_HOURS = 48


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _as_utc(value: datetime | None) -> datetime | None:
    if value is None:
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def email_has_used_trial(db: Session, email: str) -> bool:
    normalized = email.strip().lower()
    if (
        db.query(TrialEmailClaim.email).filter(TrialEmailClaim.email == normalized).first() is not None
    ):
        return True
    return (
        db.query(User.id)
        .filter(User.email == email, User.trial_used.is_(True))
        .first()
        is not None
    )


def assert_can_start_trial(db: Session, user: User) -> None:
    if user.trial_used:
        raise ValueError("You have already used your free trial on this account.")
    if email_has_used_trial(db, user.email):
        raise ValueError("This email address has already been used for a free trial.")
    if user.is_premium and user.subscription_status != "cancelled":
        raise ValueError("You already have an active Pro plan.")


def _claim_trial_email(db: Session, user: User) -> None:
    normalized = user.email.strip().lower()
    existing = db.query(TrialEmailClaim).filter(TrialEmailClaim.email == normalized).first()
    if existing is None:
        db.add(TrialEmailClaim(email=normalized, user_id=user.id))


def is_trial_tokenization_charge(data: dict) -> bool:
    metadata = data.get("metadata") or {}
    return metadata.get("purpose") == TRIAL_TOKENIZATION_PURPOSE


async def initialize_user_trial(
    db: Session,
    user: User,
    *,
    plan_slug: str = "monthly",
    callback_url: str,
) -> dict:
    assert_can_start_trial(db, user)
    plan_record = get_plan_by_slug(db, plan_slug)
    if plan_record is None or not plan_record.paystack_plan_code:
        raise RuntimeError("Monthly Pro plan is not configured for trials.")

    data = await initialize_trial_tokenization(
        email=user.email,
        user_id=user.id,
        plan_slug=plan_slug,
        callback_url=callback_url,
    )
    user.last_paystack_reference = data["reference"]
    db.add(user)
    return {
        "access_code": data["access_code"],
        "reference": data["reference"],
        "authorization_url": data["authorization_url"],
        "plan": plan_slug,
        "tokenization_amount_ngn": settings.trial_tokenization_amount_ngn,
        "tokenization_amount_kobo": settings.trial_tokenization_amount_kobo,
    }


async def process_trial_tokenization_charge(
    db: Session,
    user: User,
    data: dict,
    *,
    reference: str | None = None,
) -> bool:
    """
    After charge.success for a trial tokenization transaction:
    1. Refund the tokenization amount (only once charge is confirmed)
    2. Activate trial premium access
    3. Create a Paystack subscription with start_date = trial_ends_at

    Returns True when handled (including idempotent no-ops).
    """
    if not is_trial_tokenization_charge(data):
        return False

    ref = reference or data.get("reference")
    if not ref:
        logger.error("Trial tokenization missing reference for user %s", user.id)
        return True

    if user.is_trial and user.paystack_subscription_code and user.trial_used:
        logger.info("Trial already active for user %s — skipping duplicate webhook", user.id)
        return True

    authorization = data.get("authorization") or {}
    auth_code = authorization.get("authorization_code")
    customer = data.get("customer") or {}
    customer_code = customer.get("customer_code")

    if not auth_code or not customer_code:
        logger.error(
            "Trial tokenization charge %s missing authorization/customer for user %s",
            ref,
            user.id,
        )
        return True

    metadata = data.get("metadata") or {}
    plan_slug = metadata.get("plan") or "monthly"
    plan_record = get_plan_by_slug(db, plan_slug)
    if plan_record is None or not plan_record.paystack_plan_code:
        logger.error("Trial plan %s not found for user %s", plan_slug, user.id)
        return True

    try:
        await refund_transaction(reference=ref, amount_kobo=settings.trial_tokenization_amount_kobo)
        logger.info("Refunded trial tokenization charge %s for user %s", ref, user.id)
    except Exception:
        logger.exception("Trial refund failed for %s — not activating trial", ref)
        return True

    trial_ends = _utcnow() + timedelta(days=settings.trial_days)

    try:
        subscription_data = await create_paystack_subscription(
            customer_code=customer_code,
            plan_code=plan_record.paystack_plan_code,
            authorization_code=auth_code,
            start_date=trial_ends,
        )
    except Exception:
        logger.exception(
            "Paystack subscription creation failed after refund for user %s reference %s",
            user.id,
            ref,
        )
        return True

    subscription_code = subscription_data.get("subscription_code")
    email_token = subscription_data.get("email_token")

    user.is_premium = True
    user.is_trial = True
    user.trial_used = True
    user.trial_ends_at = trial_ends
    user.premium_plan = plan_slug
    user.premium_period_end = trial_ends
    user.renewal_type = "auto"
    user.subscription_status = "active"
    user.premium_grace_until = None
    user.manual_renewal_reminder_sent_at = None
    user.paystack_customer_code = customer_code
    user.paystack_subscription_code = subscription_code
    user.paystack_email_token = email_token
    user.last_paystack_reference = ref
    db.add(user)
    _claim_trial_email(db, user)

    if not has_recent_notification(db, user_id=user.id, notification_type="payment_success", within_hours=2):
        notify_user(
            db,
            user.id,
            "payment_success",
            {
                "plan": plan_slug,
                "plan_name": f"Pro {plan_slug} (free trial)",
                "amount": 0,
                "period_end": trial_ends,
            },
        )

    logger.info("Trial activated for user %s until %s", user.id, trial_ends.isoformat())
    return True


def cancel_trial_immediately(db: Session, user: User) -> None:
    """Revoke trial access immediately after Paystack subscription is disabled."""
    user.is_premium = False
    user.is_trial = False
    user.subscription_status = "cancelled"
    user.premium_period_end = _utcnow()
    user.premium_grace_until = None
    db.add(user)


def trial_access_until(user: User) -> datetime | None:
    if not user.is_trial:
        return None
    return _as_utc(user.trial_ends_at)


def is_within_trial_grace(user: User) -> bool:
    """After trial_ends_at, wait briefly for Paystack's deferred first charge webhook."""
    if not user.is_trial:
        return False
    trial_end = _as_utc(user.trial_ends_at)
    if trial_end is None or _utcnow() <= trial_end:
        return False
    elapsed_hours = (_utcnow() - trial_end).total_seconds() / 3600
    return elapsed_hours <= TRIAL_GRACE_AFTER_END_HOURS
