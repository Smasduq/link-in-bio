"""Web Push delivery via pywebpush with dead-subscription cleanup."""

from __future__ import annotations

import json
import logging
from typing import Any

from pywebpush import WebPushException, webpush
from sqlalchemy.orm import Session

from app.config import settings
from app.models.push_subscription import PushSubscription

logger = logging.getLogger(__name__)


class PushDeliveryError(Exception):
    """Non-fatal push failure (transient or misconfiguration)."""


def _vapid_claims() -> dict[str, str]:
    return {"sub": f"mailto:{settings.mail_from}"}


def send_push_notification(
    subscription: PushSubscription,
    *,
    title: str,
    body: str,
    url: str,
    db: Session | None = None,
) -> bool:
    """
    Send one Web Push message to a stored subscription.

    Returns True on success. On HTTP 410 Gone (expired/revoked subscription),
    deletes the row when db is provided and returns False. Other failures
    are logged and return False without deleting.
    """
    if not settings.vapid_private_key or not settings.vapid_public_key:
        logger.debug("Web Push skipped — VAPID keys not configured")
        return False

    payload = json.dumps({"title": title, "body": body, "url": url, "icon": settings.resolved_push_icon_url})

    subscription_info = {
        "endpoint": subscription.endpoint,
        "keys": {"p256dh": subscription.p256dh_key, "auth": subscription.auth_key},
    }

    try:
        webpush(
            subscription_info=subscription_info,
            data=payload,
            vapid_private_key=settings.vapid_private_key,
            vapid_claims=_vapid_claims(),
        )
        return True
    except WebPushException as exc:
        status = getattr(getattr(exc, "response", None), "status_code", None)
        if status == 410 and db is not None:
            logger.info("Removing expired push subscription %s (410 Gone)", subscription.id)
            db.delete(subscription)
            db.flush()
            return False
        logger.warning(
            "Push failed for subscription %s (status=%s): %s",
            subscription.id,
            status,
            exc,
        )
        return False
    except Exception:
        logger.exception("Unexpected push error for subscription %s", subscription.id)
        return False


def send_push_to_user(
    db: Session,
    user_id: str,
    *,
    title: str,
    body: str,
    url: str,
) -> int:
    """Send push to all active subscriptions for a user. Returns success count."""
    rows = db.query(PushSubscription).filter(PushSubscription.user_id == user_id).all()
    sent = 0
    for row in rows:
        if send_push_notification(row, title=title, body=body, url=url, db=db):
            sent += 1
    return sent


def render_push_payload(notification_type: str, context: dict[str, Any]) -> tuple[str, str, str]:
    """Return (title, body, url) for a notification type."""
    from app.services.notification_emails import render_notification_message

    base = settings.frontend_url.rstrip("/")
    message = render_notification_message(notification_type, context)

    titles = {
        "good_morning": "Good morning ☀️",
        "good_evening": "Good evening 🌙",
        "weekly_summary": "Your weekly summary",
        "milestone_clicks": "Milestone reached 🎉",
        "inactivity_nudge": "Your page is still active",
    }
    urls = {
        "good_morning": f"{base}/dashboard/analytics",
        "good_evening": f"{base}/dashboard/analytics",
        "weekly_summary": f"{base}/dashboard/analytics",
        "milestone_clicks": f"{base}/dashboard/analytics",
        "inactivity_nudge": f"{base}/dashboard",
        "product_sale": f"{base}/dashboard/sales",
    }
    billing_url = f"{base}/dashboard/settings/billing"
    default_url = billing_url

    if notification_type in titles:
        return titles[notification_type], message, urls.get(notification_type, default_url)

    title = notification_type.replace("_", " ").title()
    return title, message, urls.get(notification_type, default_url)
