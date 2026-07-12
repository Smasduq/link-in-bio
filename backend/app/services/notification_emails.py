"""Plain HTML templates for billing notification emails."""

from __future__ import annotations

from datetime import datetime
from typing import Any

from app.config import SITE_NAME, settings
from app.services.email_templates import transactional_email_html

NotificationType = str

BANNER_TYPES = frozenset({"renewal_upcoming", "renewal_failed", "access_expiring"})


def _link(path: str) -> str:
    return f"{settings.frontend_url.rstrip('/')}{path}"


def _format_date(value: datetime | str | None) -> str:
    if value is None:
        return "soon"
    if isinstance(value, str):
        value = datetime.fromisoformat(value.replace("Z", "+00:00"))
    return value.strftime("%B %d, %Y")


def _format_ngn(amount: float | int | str | None) -> str:
    if amount is None:
        return "—"
    try:
        num = float(amount)
    except (TypeError, ValueError):
        return str(amount)
    return f"₦{num:,.2f}" if num % 1 else f"₦{num:,.0f}"


def render_notification_message(notification_type: NotificationType, context: dict[str, Any]) -> str:
    plan = context.get("plan_name") or context.get("plan") or "Pro"
    amount = _format_ngn(context.get("amount"))
    reason = context.get("reason") or "Payment was declined"
    period_end = _format_date(context.get("period_end") or context.get("current_period_end"))
    upgrade_link = context.get("link") or _link("/upgrade")

    messages = {
        "payment_success": f"You're now Pro! Receipt: {amount} for {plan}.",
        "payment_failed": f"Your payment didn't go through: {reason}.",
        "subscription_cancelled": f"Your subscription is cancelled. Pro features active until {period_end}.",
        "renewal_upcoming": f"Your Pro plan renews in 3 days for {amount}.",
        "renewal_failed": f"We couldn't renew your Pro plan. Please update your payment method.",
        "access_expiring": f"Your Pro access ends in 3 days. Renew at {upgrade_link}.",
        "access_expired": "Your Pro access has ended. You're now on the Free plan.",
        "resubscribed": "Welcome back to Pro!",
        "product_sale": f"You made a sale! {context.get('product_title', 'Product')} — {_format_ngn(context.get('amount'))}.",
    }
    return messages.get(notification_type, "You have a new billing update.")


def render_notification_email(
    notification_type: NotificationType,
    context: dict[str, Any],
    *,
    recipient_email: str,
) -> tuple[str, str, str]:
    plan = context.get("plan_name") or context.get("plan") or "Pro"
    amount = _format_ngn(context.get("amount"))
    reason = context.get("reason") or "Payment was declined"
    period_end = _format_date(context.get("period_end") or context.get("current_period_end"))
    upgrade_link = context.get("link") or _link("/upgrade")
    settings_link = _link("/dashboard/settings")

    subjects = {
        "payment_success": f"You're now Pro — {SITE_NAME}",
        "payment_failed": f"Payment failed — {SITE_NAME}",
        "subscription_cancelled": f"Subscription cancelled — {SITE_NAME}",
        "renewal_upcoming": f"Pro renews in 3 days — {SITE_NAME}",
        "renewal_failed": f"Pro renewal failed — {SITE_NAME}",
        "access_expiring": f"Pro access ending soon — {SITE_NAME}",
        "access_expired": f"Pro access ended — {SITE_NAME}",
        "resubscribed": f"Welcome back to Pro — {SITE_NAME}",
        "product_sale": f"You made a sale! — {SITE_NAME}",
    }

    bodies = {
        "payment_success": (
            f"<p>You're now Pro!</p>"
            f"<p>Receipt: <strong>{amount}</strong> for {plan}.</p>"
            f'<p><a href="{_link("/dashboard")}">Go to dashboard</a></p>'
        ),
        "payment_failed": (
            f"<p>Your payment didn't go through: {reason}.</p>"
            f'<p><a href="{upgrade_link}">Try again</a></p>'
        ),
        "subscription_cancelled": (
            f"<p>Your subscription is cancelled.</p>"
            f"<p>Pro features stay active until <strong>{period_end}</strong>.</p>"
            f'<p><a href="{settings_link}">Manage billing</a></p>'
        ),
        "renewal_upcoming": (
            f"<p>Your Pro plan renews in 3 days for <strong>{amount}</strong>.</p>"
            f'<p><a href="{settings_link}">View billing</a></p>'
        ),
        "renewal_failed": (
            f"<p>We couldn't renew your Pro plan.</p>"
            f"<p>{context.get('retry_info') or 'Please update your card to keep Pro access.'}</p>"
            f'<p><a href="{upgrade_link}">Update billing</a></p>'
        ),
        "access_expiring": (
            f"<p>Your Pro access ends in 3 days.</p>"
            f'<p><a href="{upgrade_link}?renew=manual">Renew now</a></p>'
        ),
        "access_expired": (
            f"<p>Your Pro access has ended. You're now on the Free plan.</p>"
            f'<p><a href="{upgrade_link}">Upgrade again</a></p>'
        ),
        "resubscribed": (
            f"<p>Welcome back to Pro!</p>"
            f'<p><a href="{_link("/dashboard")}">Open dashboard</a></p>'
        ),
        "product_sale": (
            f"<p>You made a sale!</p>"
            f"<p><strong>{context.get('product_title', 'Product')}</strong> — "
            f"<strong>{_format_ngn(context.get('amount'))}</strong></p>"
            f"<p>Buyer: {context.get('buyer_email', '—')}</p>"
            f'<p><a href="{_link("/dashboard/sales")}">View sales</a></p>'
        ),
    }

    subject = subjects.get(notification_type, f"Billing update — {SITE_NAME}")
    inner = bodies.get(notification_type, "<p>You have a new billing update.</p>")
    html_body = transactional_email_html(
        title=subject,
        content=(
            f'<div style="font-size: 16px; line-height: 1.6; color: #111827;">{inner}</div>'
            f'<p style="margin-top: 24px; font-size: 12px; color: #9ca3af;">Sent to {recipient_email}</p>'
        ),
        preheader=render_notification_message(notification_type, context),
    )
    text_body = render_notification_message(notification_type, context)
    return subject, html_body, text_body
