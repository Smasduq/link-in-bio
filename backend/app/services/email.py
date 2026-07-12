import logging
import re

import sib_api_v3_sdk
from sib_api_v3_sdk.rest import ApiException

from app.config import SITE_NAME, settings
from app.services.email_templates import (
    otp_email_html,
    password_reset_email_html,
    welcome_email_html,
)

logger = logging.getLogger(__name__)

SENDER_NAME = "Smasduq"
SENDER_EMAIL = "hello@smasduq.xyz"

_configuration: sib_api_v3_sdk.Configuration | None = None
_api_instance: sib_api_v3_sdk.TransactionalEmailsApi | None = None


def _get_api() -> sib_api_v3_sdk.TransactionalEmailsApi | None:
    global _configuration, _api_instance
    if not settings.brevo_api_key:
        return None
    if _api_instance is None:
        _configuration = sib_api_v3_sdk.Configuration()
        _configuration.api_key["api-key"] = settings.brevo_api_key
        _api_instance = sib_api_v3_sdk.TransactionalEmailsApi(sib_api_v3_sdk.ApiClient(_configuration))
    return _api_instance


def send_email(to: str, subject: str, html_body: str) -> bool:
    """Send a transactional HTML email via Brevo. Never raises — failures are logged only."""
    api_instance = _get_api()
    if api_instance is None:
        logger.error("Email not configured — missing BREVO_API_KEY")
        return False

    logger.info("Sending email via Brevo to %s — %s", to, subject)

    try:
        send_smtp_email = sib_api_v3_sdk.SendSmtpEmail(
            to=[{"email": to}],
            sender={"name": SENDER_NAME, "email": SENDER_EMAIL},
            subject=subject,
            html_content=html_body,
        )
        api_instance.send_transac_email(send_smtp_email)
        logger.info("Email sent successfully to %s", to)
        return True
    except ApiException as exc:
        logger.error("Failed to send email to %s: %s", to, exc)
        return False
    except Exception:
        logger.exception("Unexpected failure sending email to %s", to)
        return False


def _html_to_plain(html: str) -> str:
    text = re.sub(r"<br\s*/?>", "\n", html, flags=re.I)
    text = re.sub(r"</p>", "\n\n", text, flags=re.I)
    text = re.sub(r"<[^>]+>", "", text)
    return text.strip()


def send_welcome_email(*, to: str, username: str) -> bool:
    profile_url = f"{settings.frontend_url}/{username}"
    dashboard_url = f"{settings.frontend_url}/dashboard"
    html = welcome_email_html(username=username, profile_url=profile_url, dashboard_url=dashboard_url)
    return send_email(
        to=to,
        subject=f"Welcome to {SITE_NAME} — your page is live",
        html_body=html,
    )


def send_password_reset_email(*, to: str, reset_url: str) -> bool:
    html = password_reset_email_html(reset_url=reset_url)
    return send_email(
        to=to,
        subject=f"Reset your {SITE_NAME} password",
        html_body=html,
    )


def send_otp_email(*, to: str, otp: str, purpose: str) -> tuple[bool, str | None]:
    html = otp_email_html(otp=otp, purpose=purpose)
    sent = send_email(
        to=to,
        subject=f"{otp} is your {SITE_NAME} verification code",
        html_body=html,
    )
    if not sent:
        return False, "Email send failed"
    return True, None
