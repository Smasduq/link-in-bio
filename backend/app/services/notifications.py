"""In-app, email, and Web Push notifications."""

from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import Any

from sqlalchemy.orm import Session

from app.models.notification import (
    BILLING_NOTIFICATION_TYPES,
    ENGAGEMENT_NOTIFICATION_TYPES,
    NOTIFICATION_TYPES,
    Notification,
)
from app.models.user import User
from app.services.email import send_email
from app.services.notification_preferences import get_or_create_preferences
from app.services.notification_emails import render_notification_email, render_notification_message
from app.services.web_push import render_push_payload, send_push_to_user

logger = logging.getLogger(__name__)

NotificationType = str


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def notification_category(notification_type: NotificationType) -> str:
    if notification_type in BILLING_NOTIFICATION_TYPES:
        return "billing"
    if notification_type in ENGAGEMENT_NOTIFICATION_TYPES:
        return "engagement"
    return "billing"


def send_transactional_email(*, to: str, subject: str, html_body: str, text_body: str) -> None:
    send_email(to=to, subject=subject, html_body=html_body)


def has_recent_notification(
    db: Session,
    *,
    user_id: str,
    notification_type: NotificationType,
    within_hours: int = 96,
) -> bool:
    since = _utcnow() - timedelta(hours=within_hours)
    return (
        db.query(Notification.id)
        .filter(
            Notification.user_id == user_id,
            Notification.type == notification_type,
            Notification.created_at >= since,
        )
        .first()
        is not None
    )


def notify_user(
    db: Session,
    user_id: str,
    notification_type: NotificationType,
    context: dict[str, Any] | None = None,
) -> Notification | None:
    """
    Insert an in-app notification and deliver via email and/or Web Push based on
    user preferences. Channel failures are logged and never block other channels.
    """
    if notification_type not in NOTIFICATION_TYPES:
        raise ValueError(f"Unknown notification type: {notification_type}")

    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        logger.warning("notify_user skipped — user %s not found", user_id)
        return None

    prefs = get_or_create_preferences(db, user_id)
    category = notification_category(notification_type)
    ctx = dict(context or {})
    message = render_notification_message(notification_type, ctx)
    notification = Notification(
        user_id=user_id,
        type=notification_type,
        message=message,
        is_read=False,
    )
    db.add(notification)
    db.flush()

    email_ok = prefs.email_billing_enabled if category == "billing" else prefs.email_engagement_enabled
    push_ok = prefs.push_billing_enabled if category == "billing" else prefs.push_engagement_enabled

    if email_ok:
        try:
            subject, html_body, text_body = render_notification_email(
                notification_type,
                ctx,
                recipient_email=user.email,
            )
            send_transactional_email(
                to=user.email,
                subject=subject,
                html_body=html_body,
                text_body=text_body,
            )
        except Exception:
            logger.exception(
                "Failed to send %s notification email to user %s",
                notification_type,
                user_id,
            )

    if push_ok:
        try:
            title, body, url = render_push_payload(notification_type, ctx)
            send_push_to_user(db, user_id, title=title, body=body, url=url)
        except Exception:
            logger.exception(
                "Failed to send %s push notification to user %s",
                notification_type,
                user_id,
            )

    return notification
