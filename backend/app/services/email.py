import logging
import smtplib
import ssl
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from app.config import SITE_NAME, settings
from app.services.email_templates import (
    otp_email_html,
    password_reset_email_html,
    welcome_email_html,
)

logger = logging.getLogger(__name__)

SMTP_TIMEOUT_SECONDS = 15


def _is_configured() -> bool:
    return bool(settings.smtp_host and settings.smtp_password and settings.mail_from and settings.smtp_user)


def send_email(*, to: str, subject: str, html_body: str, text_body: str | None = None) -> tuple[bool, str | None]:
    if not _is_configured():
        logger.error(
            "Email not configured — missing smtp_host=%s smtp_user=%s mail_from=%s password_set=%s",
            bool(settings.smtp_host),
            bool(settings.smtp_user),
            bool(settings.mail_from),
            bool(settings.smtp_password),
        )
        return False, "Email is not configured on the server."

    message = MIMEMultipart("alternative")
    message["Subject"] = subject
    message["From"] = f"{settings.mail_from_name} <{settings.mail_from}>"
    message["To"] = to

    plain = text_body or _html_to_plain(html_body)
    message.attach(MIMEText(plain, "plain", "utf-8"))
    message.attach(MIMEText(html_body, "html", "utf-8"))

    logger.info("Sending email via %s:%s to %s — %s", settings.smtp_host, settings.smtp_port, to, subject)

    try:
        if settings.smtp_use_ssl:
            context = ssl.create_default_context()
            with smtplib.SMTP_SSL(
                settings.smtp_host, settings.smtp_port, context=context, timeout=SMTP_TIMEOUT_SECONDS
            ) as server:
                server.login(settings.smtp_user, settings.smtp_password)
                server.sendmail(settings.mail_from, [to], message.as_string())
        else:
            with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=SMTP_TIMEOUT_SECONDS) as server:
                server.ehlo()
                server.starttls(context=ssl.create_default_context())
                server.ehlo()
                server.login(settings.smtp_user, settings.smtp_password)
                server.sendmail(settings.mail_from, [to], message.as_string())
        logger.info("Email sent successfully to %s", to)
        return True, None
    except smtplib.SMTPAuthenticationError as exc:
        logger.error(
            "SMTP authentication failed (host=%s user=%s code=%s): %s",
            settings.smtp_host,
            settings.smtp_user,
            exc.smtp_code,
            exc.smtp_error,
        )
        return False, (
            f"SMTP authentication failed for {settings.smtp_user}. "
            "Use a Zoho app password and the correct regional host (smtp.zoho.eu or smtp.zoho.com)."
        )
    except smtplib.SMTPException as exc:
        logger.error("SMTP error sending to %s via %s: %s", to, settings.smtp_host, exc)
        return False, f"SMTP error: {exc}"
    except OSError as exc:
        logger.error("Network error connecting to %s:%s — %s", settings.smtp_host, settings.smtp_port, exc)
        return False, f"Cannot reach mail server {settings.smtp_host}:{settings.smtp_port}."
    except Exception:
        logger.exception("Unexpected failure sending email to %s", to)
        return False, "Unexpected error while sending email."


def _html_to_plain(html: str) -> str:
    import re

    text = re.sub(r"<br\s*/?>", "\n", html, flags=re.I)
    text = re.sub(r"</p>", "\n\n", text, flags=re.I)
    text = re.sub(r"<[^>]+>", "", text)
    return text.strip()


def send_welcome_email(*, to: str, username: str) -> bool:
    profile_url = f"{settings.frontend_url}/{username}"
    dashboard_url = f"{settings.frontend_url}/dashboard"
    html = welcome_email_html(username=username, profile_url=profile_url, dashboard_url=dashboard_url)

    sent, _ = send_email(
        to=to,
        subject=f"Welcome to {SITE_NAME} — your page is live",
        html_body=html,
        text_body=f"Welcome to {SITE_NAME}, @{username}! Your page is live: {profile_url}",
    )
    return sent


def send_password_reset_email(*, to: str, reset_url: str) -> bool:
    html = password_reset_email_html(reset_url=reset_url)

    sent, _ = send_email(
        to=to,
        subject=f"Reset your {SITE_NAME} password",
        html_body=html,
        text_body=f"Reset your {SITE_NAME} password: {reset_url}",
    )
    return sent


def send_otp_email(*, to: str, otp: str, purpose: str) -> tuple[bool, str | None]:
    action = "sign up" if purpose == "signup" else "sign in"
    html = otp_email_html(otp=otp, purpose=purpose)

    return send_email(
        to=to,
        subject=f"{otp} is your {SITE_NAME} verification code",
        html_body=html,
        text_body=f"Your {SITE_NAME} verification code is {otp}. Use it to {action}. It expires in {settings.otp_expire_minutes} minutes.",
    )
