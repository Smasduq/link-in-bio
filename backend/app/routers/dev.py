"""Development-only routes (disabled unless DEV_ROUTES_ENABLED=true)."""

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, EmailStr

from app.config import settings
from app.config import SITE_NAME
from app.services.email import send_email
from app.services.email_templates import transactional_email_html

router = APIRouter(prefix="/dev", tags=["dev"])


class TestEmailRequest(BaseModel):
    to: EmailStr


@router.post("/test-email")
def test_email(body: TestEmailRequest):
    if not settings.dev_routes_enabled:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")

    if not settings.brevo_api_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="BREVO_API_KEY is not configured",
        )

    html = transactional_email_html(
        title=f"Test email — {SITE_NAME}",
        content=(
            "<p style=\"margin: 0 0 8px; font-size: 16px; line-height: 1.6; color: #6b7280;\">"
            "This is a test email from <strong>Smasduq LinkBio</strong>.</p>"
            "<p style=\"margin: 0; font-size: 16px; line-height: 1.6; color: #6b7280;\">"
            "If you received this, Brevo delivery is working.</p>"
        ),
        preheader="Brevo test email",
    )

    sent = send_email(
        to=body.to,
        subject=f"{SITE_NAME} — test email",
        html_body=html,
    )
    if not sent:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Failed to send test email — check server logs",
        )

    return {"status": "sent", "to": body.to}
