"""Admin billing — transactions, refunds, subscriptions, webhook log."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Literal

from fastapi import HTTPException, status
from sqlalchemy import func, or_
from sqlalchemy.orm import Session, joinedload

from app.models.billing_event import BillingEvent
from app.models.paystack_webhook_event import PaystackWebhookEvent
from app.models.product import Product
from app.models.product_purchase import ProductPurchase
from app.models.profile import Profile
from app.models.user import User
from app.services.admin_audit import log_admin_action
from app.services.billing import _charge_amount_ngn, _parse_paid_at, log_billing_event
from app.services.paystack import refund_transaction, verify_transaction

TransactionType = Literal["subscription", "product"]


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _refunded_references(db: Session) -> set[str]:
    rows = (
        db.query(BillingEvent.paystack_reference)
        .filter(
            BillingEvent.event_type.in_(("admin.refund", "refund")),
            BillingEvent.paystack_reference.isnot(None),
        )
        .all()
    )
    return {row[0] for row in rows if row[0]}


def list_transactions(
    db: Session,
    *,
    page: int = 1,
    page_size: int = 20,
    tx_type: str | None = None,
) -> tuple[list[dict[str, Any]], int]:
    refunded = _refunded_references(db)
    items: list[dict[str, Any]] = []

    if tx_type in (None, "subscription"):
        events = (
            db.query(BillingEvent)
            .filter(BillingEvent.event_type == "charge.success")
            .order_by(BillingEvent.created_at.desc())
            .limit(500)
            .all()
        )
        for event in events:
            payload = event.payload or {}
            data = payload.get("data") if isinstance(payload.get("data"), dict) else payload
            metadata = data.get("metadata") or {}
            if metadata.get("product_id") or metadata.get("purchase_type") == "product":
                continue
            if metadata.get("purpose") == "trial_tokenization":
                continue
            reference = event.paystack_reference or data.get("reference")
            if not reference:
                continue
            user = db.query(User).options(joinedload(User.profile)).filter(User.id == event.user_id).first() if event.user_id else None
            items.append(
                {
                    "id": event.id,
                    "reference": reference,
                    "user_id": event.user_id,
                    "user_email": user.email if user else None,
                    "username": user.profile.username if user and user.profile else None,
                    "amount_ngn": _charge_amount_ngn(data),
                    "status": "refunded" if reference in refunded else (data.get("status") or "success"),
                    "type": "subscription",
                    "date": _parse_paid_at(data) if data else event.created_at,
                }
            )

    if tx_type in (None, "product"):
        purchases = (
            db.query(ProductPurchase)
            .options(joinedload(ProductPurchase.product).joinedload(Product.profile).joinedload(Profile.user))
            .order_by(ProductPurchase.created_at.desc())
            .limit(500)
            .all()
        )
        for purchase in purchases:
            reference = purchase.paystack_reference
            seller = None
            if purchase.product and purchase.product.profile and purchase.product.profile.user:
                seller = purchase.product.profile.user
            items.append(
                {
                    "id": purchase.id,
                    "reference": reference,
                    "user_id": seller.id if seller else None,
                    "user_email": seller.email if seller else None,
                    "username": purchase.product.profile.username if purchase.product and purchase.product.profile else None,
                    "amount_ngn": purchase.amount_paid,
                    "status": purchase.refund_status or ("refunded" if reference in refunded else "success"),
                    "type": "product",
                    "date": purchase.created_at,
                    "buyer_email": purchase.buyer_email,
                    "product_title": purchase.product.title if purchase.product else None,
                }
            )

    items.sort(key=lambda row: row["date"], reverse=True)
    total = len(items)
    start = (page - 1) * page_size
    return items[start : start + page_size], total


def list_subscriptions(
    db: Session,
    *,
    page: int = 1,
    page_size: int = 20,
    status_filter: str | None = None,
) -> tuple[list[dict[str, Any]], int]:
    query = (
        db.query(User)
        .options(joinedload(User.profile))
        .filter(User.deleted_at.is_(None))
        .filter(or_(User.is_premium.is_(True), User.subscription_status.isnot(None), User.is_trial.is_(True)))
    )

    if status_filter == "active":
        query = query.filter(User.subscription_status == "active", User.is_trial.is_(False))
    elif status_filter == "cancelled":
        query = query.filter(User.subscription_status == "cancelled")
    elif status_filter == "trial":
        query = query.filter(User.is_trial.is_(True))
    elif status_filter == "past_due":
        query = query.filter(User.subscription_status == "past_due")

    total = query.count()
    users = query.order_by(User.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()

    rows = []
    for user in users:
        label = "free"
        if user.is_trial:
            label = "trial"
        elif user.is_premium:
            label = user.premium_plan or "pro"
        rows.append(
            {
                "user_id": user.id,
                "email": user.email,
                "username": user.profile.username if user.profile else None,
                "plan": label,
                "subscription_status": user.subscription_status,
                "premium_until": user.premium_period_end,
                "is_trial": user.is_trial,
                "paystack_subscription_code": user.paystack_subscription_code,
            }
        )
    return rows, total


def list_webhook_events(
    db: Session,
    *,
    page: int = 1,
    page_size: int = 20,
    status_filter: str | None = None,
) -> tuple[list[PaystackWebhookEvent], int]:
    query = db.query(PaystackWebhookEvent)
    if status_filter:
        query = query.filter(PaystackWebhookEvent.processing_status == status_filter)
    total = query.count()
    events = query.order_by(PaystackWebhookEvent.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
    return events, total


async def refund_transaction_admin(
    db: Session,
    *,
    admin: User,
    reference: str,
    reason: str,
) -> dict[str, Any]:
    reference = reference.strip()
    if not reference:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Reference is required")

    purchase = db.query(ProductPurchase).filter(ProductPurchase.paystack_reference == reference).first()
    tx_type: TransactionType = "product" if purchase else "subscription"

    try:
        verified = await verify_transaction(reference)
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=f"Could not verify transaction: {exc}") from exc

    data = verified.get("data") or {}
    if data.get("status") != "success":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only successful transactions can be refunded")

    amount_kobo = int(data.get("amount") or 0)
    try:
        refund_data = await refund_transaction(reference=reference, amount_kobo=amount_kobo or None)
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc

    if purchase:
        purchase.refund_status = "refunded"
        db.add(purchase)

    log_billing_event(
        db,
        event_type="admin.refund",
        user_id=purchase.product.profile.user_id if purchase and purchase.product else None,
        paystack_reference=reference,
        payload={"reason": reason, "admin_id": admin.id, "refund": refund_data, "type": tx_type},
    )
    log_admin_action(
        db,
        admin_user_id=admin.id,
        action="refund_transaction",
        target_type="transaction",
        target_id=reference,
        details={"reason": reason, "type": tx_type, "amount_kobo": amount_kobo},
    )
    db.commit()
    return {"reference": reference, "type": tx_type, "status": "refunded", "refund": refund_data}
