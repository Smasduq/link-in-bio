"""HTML email templates aligned with LinkBio site design (emerald, clean, premium)."""

from urllib.parse import urlparse

from app.config import settings

# Site palette
EMERALD_500 = "#10b981"
EMERALD_600 = "#059669"
EMERALD_50 = "#ecfdf5"
EMERALD_100 = "#d1fae5"
EMERALD_200 = "#a7f3d0"
TEXT_PRIMARY = "#111827"
TEXT_MUTED = "#6b7280"
TEXT_SUBTLE = "#9ca3af"
BG_PAGE = "#f9fafb"
BG_CARD = "#ffffff"
BORDER = "#e5e7eb"

FONT_STACK = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, Roboto, Helvetica, Arial, sans-serif"


def _site_label() -> str:
    host = urlparse(settings.frontend_url).netloc or settings.frontend_url
    return host.replace("www.", "")


def _button(href: str, label: str) -> str:
    return f"""
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 28px 0 0;">
      <tr>
        <td style="border-radius: 12px; background: linear-gradient(180deg, {EMERALD_500} 0%, {EMERALD_600} 100%);">
          <a href="{href}"
             style="display: inline-block; padding: 14px 28px; font-family: {FONT_STACK}; font-size: 15px;
                    font-weight: 600; color: #ffffff; text-decoration: none; border-radius: 12px;">
            {label}
          </a>
        </td>
      </tr>
    </table>
    """


def _footer() -> str:
    return f"""
    <tr>
      <td style="padding: 24px 32px 32px; border-top: 1px solid {BORDER}; background-color: {BG_PAGE};">
        <p style="margin: 0 0 6px; font-family: {FONT_STACK}; font-size: 13px; color: {TEXT_MUTED};">
          — The LinkBio Team
        </p>
        <p style="margin: 0; font-family: {FONT_STACK}; font-size: 13px;">
          <a href="mailto:{settings.mail_from}" style="color: {EMERALD_600}; text-decoration: none;">
            {settings.mail_from}
          </a>
        </p>
      </td>
    </tr>
    """


def _layout(*, title: str, content: str, preheader: str = "") -> str:
    preheader_html = (
        f'<div style="display:none;max-height:0;overflow:hidden;opacity:0;">{preheader}</div>'
        if preheader
        else ""
    )
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: {BG_PAGE}; -webkit-font-smoothing: antialiased;">
  {preheader_html}
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"
         style="background-color: {BG_PAGE}; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"
               style="max-width: 560px; background-color: {BG_CARD}; border-radius: 16px;
                      border: 1px solid {BORDER}; overflow: hidden;
                      box-shadow: 0 4px 24px rgba(0, 0, 0, 0.04);">
          <!-- Header -->
          <tr>
            <td style="padding: 32px 32px 24px; background: linear-gradient(180deg, {EMERALD_50} 0%, {BG_CARD} 100%);">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="width: 36px; height: 36px; background-color: {EMERALD_600}; border-radius: 12px;
                             text-align: center; vertical-align: middle;">
                    <span style="font-family: {FONT_STACK}; font-size: 16px; font-weight: 700; color: #ffffff; line-height: 36px;">L</span>
                  </td>
                  <td style="padding-left: 12px; vertical-align: middle;">
                    <span style="font-family: {FONT_STACK}; font-size: 18px; font-weight: 700; color: {TEXT_PRIMARY};">
                      LinkBio
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding: 8px 32px 32px; font-family: {FONT_STACK};">
              {content}
            </td>
          </tr>
          {_footer()}
        </table>
        <p style="margin: 24px 0 0; font-family: {FONT_STACK}; font-size: 12px; color: {TEXT_SUBTLE}; text-align: center;">
          © 2026 LinkBio · {_site_label()}
        </p>
      </td>
    </tr>
  </table>
</body>
</html>"""


def otp_email_html(*, otp: str, purpose: str) -> str:
    action = "sign up" if purpose == "signup" else "sign in"
    content = f"""
      <h1 style="margin: 0 0 12px; font-size: 24px; font-weight: 800; letter-spacing: -0.02em; color: {TEXT_PRIMARY};">
        Your verification code
      </h1>
      <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: {TEXT_MUTED};">
        Use this 6-digit code to {action} to your LinkBio account.
      </p>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
        <tr>
          <td align="center" style="padding: 20px 24px; background-color: {EMERALD_50};
              border: 1px solid {EMERALD_200}; border-radius: 16px;">
            <span style="font-family: {FONT_STACK}; font-size: 36px; font-weight: 800;
                         letter-spacing: 10px; color: {EMERALD_600};">
              {otp}
            </span>
          </td>
        </tr>
      </table>
      <p style="margin: 24px 0 0; font-size: 14px; line-height: 1.6; color: {TEXT_MUTED};">
        This code expires in {settings.otp_expire_minutes} minutes.
        If you didn't request it, you can safely ignore this email.
      </p>
    """
    return _layout(
        title="Your LinkBio verification code",
        content=content,
        preheader=f"Your verification code is {otp}",
    )


def welcome_email_html(*, username: str, profile_url: str, dashboard_url: str) -> str:
    content = f"""
      <h1 style="margin: 0 0 12px; font-size: 24px; font-weight: 800; letter-spacing: -0.02em; color: {TEXT_PRIMARY};">
        Welcome to <span style="color: {EMERALD_600};">LinkBio</span>
      </h1>
      <p style="margin: 0 0 8px; font-size: 16px; line-height: 1.6; color: {TEXT_MUTED};">
        Hi @{username}, your account is ready.
      </p>
      <p style="margin: 0 0 8px; font-size: 16px; line-height: 1.6; color: {TEXT_MUTED};">
        Your public page is live at:
      </p>
      <p style="margin: 0 0 8px;">
        <a href="{profile_url}" style="font-family: {FONT_STACK}; font-size: 15px; font-weight: 600;
           color: {EMERALD_600}; text-decoration: none;">{profile_url}</a>
      </p>
      <p style="margin: 0; font-size: 16px; line-height: 1.6; color: {TEXT_MUTED};">
        Add links, customize your appearance, and track analytics from your dashboard.
      </p>
      {_button(dashboard_url, "Go to Dashboard →")}
    """
    return _layout(
        title="Welcome to LinkBio",
        content=content,
        preheader=f"Your page is live at {profile_url}",
    )


def password_reset_email_html(*, reset_url: str) -> str:
    content = f"""
      <h1 style="margin: 0 0 12px; font-size: 24px; font-weight: 800; letter-spacing: -0.02em; color: {TEXT_PRIMARY};">
        Reset your password
      </h1>
      <p style="margin: 0 0 8px; font-size: 16px; line-height: 1.6; color: {TEXT_MUTED};">
        We received a request to reset your LinkBio password.
      </p>
      <p style="margin: 0; font-size: 16px; line-height: 1.6; color: {TEXT_MUTED};">
        Click the button below to choose a new password. This link expires in 1 hour.
      </p>
      {_button(reset_url, "Reset Password →")}
      <p style="margin: 24px 0 0; font-size: 14px; line-height: 1.6; color: {TEXT_MUTED};">
        If you didn't request this, you can safely ignore this email.
      </p>
    """
    return _layout(
        title="Reset your LinkBio password",
        content=content,
        preheader="Reset your LinkBio password",
    )
