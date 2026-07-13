"""Log incoming Paystack webhooks for admin debugging."""

from __future__ import annotations

from typing import Any

from sqlalchemy.orm import Session

from app.models.paystack_webhook_event import PaystackWebhookEvent
from app.services.billing import find_user_for_paystack_event


def create_webhook_event(db: Session, event: dict[str, Any]) -> PaystackWebhookEvent:
    event_type = event.get("event") or "unknown"
    data = event.get("data") or {}
    reference = data.get("reference") or data.get("transaction_reference")
    user = find_user_for_paystack_event(db, data)

    row = PaystackWebhookEvent(
        event_type=event_type,
        paystack_reference=reference,
        user_id=user.id if user else None,
        payload=event,
        processing_status="pending",
    )
    db.add(row)
    db.flush()
    return row


def mark_webhook_success(db: Session, row: PaystackWebhookEvent) -> None:
    row.processing_status = "success"
    row.processing_error = None
    db.add(row)


def mark_webhook_failed(db: Session, row: PaystackWebhookEvent, error: str) -> None:
    row.processing_status = "failed"
    row.processing_error = error[:2000]
    db.add(row)
