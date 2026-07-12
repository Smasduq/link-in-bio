"""Email-gated product downloads with rate limiting and PDF watermarking."""

from __future__ import annotations

import logging
import re
from datetime import datetime, timedelta, timezone
from io import BytesIO

import httpx
from fastapi import HTTPException, status
from pypdf import PdfReader, PdfWriter
from reportlab.pdfgen import canvas
from sqlalchemy.orm import Session, joinedload

from app.config import settings
from app.models.product import Product
from app.models.product_purchase import ProductPurchase
from app.models.profile import Profile
from app.models.user import User
from app.services.cloudinary_storage import generate_signed_private_download_url

logger = logging.getLogger(__name__)

GENERIC_UNAVAILABLE_MESSAGE = "This download link is not available."
EMAIL_MISMATCH_MESSAGE = "Email doesn't match our records."
RATE_LIMIT_MESSAGE = "Too many attempts. Try again in an hour."
DOWNLOAD_LIMIT_MESSAGE = (
    "This link has reached its download limit. Contact the creator if you need help."
)

_watermarked_pdf_cache: dict[str, tuple[bytes, datetime]] = {}
_WATERMARK_CACHE_TTL = timedelta(hours=1)


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def normalize_buyer_email(email: str) -> str:
    return email.strip().lower()


def _is_pdf_file(file_name: str) -> bool:
    return file_name.lower().endswith(".pdf")


def _lookup_purchase(db: Session, token: str) -> ProductPurchase | None:
    return (
        db.query(ProductPurchase)
        .options(joinedload(ProductPurchase.product).joinedload(Product.profile).joinedload(Profile.user))
        .filter(ProductPurchase.download_token == token)
        .first()
    )


def _token_expired(purchase: ProductPurchase) -> bool:
    expires_at = purchase.download_token_expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    return _utcnow() > expires_at.astimezone(timezone.utc)


def _maybe_reset_verify_window(purchase: ProductPurchase) -> None:
    window_start = purchase.download_verify_window_started_at
    if window_start is None:
        return
    if window_start.tzinfo is None:
        window_start = window_start.replace(tzinfo=timezone.utc)
    window_hours = settings.product_download_verify_window_hours
    if _utcnow() - window_start.astimezone(timezone.utc) >= timedelta(hours=window_hours):
        purchase.download_verify_attempts = 0
        purchase.download_verify_window_started_at = None


def _ensure_verify_rate_limit_allowed(purchase: ProductPurchase) -> None:
    _maybe_reset_verify_window(purchase)
    attempts = purchase.download_verify_attempts or 0
    if attempts >= settings.product_download_verify_max_attempts:
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail=RATE_LIMIT_MESSAGE)


def _record_failed_verify_attempt(purchase: ProductPurchase) -> None:
    _maybe_reset_verify_window(purchase)
    if purchase.download_verify_window_started_at is None:
        purchase.download_verify_window_started_at = _utcnow()
    purchase.download_verify_attempts = (purchase.download_verify_attempts or 0) + 1


def _require_available_purchase(purchase: ProductPurchase | None) -> ProductPurchase:
    if purchase is None or _token_expired(purchase):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=GENERIC_UNAVAILABLE_MESSAGE,
        )
    return purchase


def get_download_gate_status(db: Session, token: str) -> dict:
    """
    Return minimal gate metadata for the download page.
    Invalid and expired tokens share the same generic message.
    """
    purchase = _lookup_purchase(db, token)
    if purchase is None or _token_expired(purchase):
        return {"available": False, "message": GENERIC_UNAVAILABLE_MESSAGE}

    product = purchase.product
    return {
        "available": True,
        "product_title": product.title if product else "Your purchase",
        "requires_email": True,
        "expires_at": purchase.download_token_expires_at,
    }


def fetch_private_file_bytes(public_id: str) -> bytes:
    url = generate_signed_private_download_url(public_id, expires_in_seconds=300)
    try:
        response = httpx.get(url, follow_redirects=True, timeout=120.0)
        response.raise_for_status()
    except httpx.HTTPError as exc:
        logger.error("Failed to fetch private file public_id=%s: %s", public_id, exc)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Could not retrieve your file. Please try again shortly.",
        ) from exc
    return response.content


def watermark_pdf_bytes(pdf_bytes: bytes, footer_text: str) -> bytes:
    """Stamp a small footer on every page without altering the original page content."""
    try:
        reader = PdfReader(BytesIO(pdf_bytes))
        if reader.is_encrypted:
            raise ValueError("Encrypted PDFs cannot be watermarked.")

        writer = PdfWriter()
        for page in reader.pages:
            media_box = page.mediabox
            width = float(media_box.width)
            height = float(media_box.height)

            overlay_buffer = BytesIO()
            overlay_canvas = canvas.Canvas(overlay_buffer, pagesize=(width, height))
            overlay_canvas.setFont("Helvetica", 8)
            overlay_canvas.setFillColorRGB(0.45, 0.45, 0.45)
            overlay_canvas.drawCentredString(width / 2, 18, footer_text)
            overlay_canvas.save()
            overlay_buffer.seek(0)

            overlay_page = PdfReader(overlay_buffer).pages[0]
            page.merge_page(overlay_page)
            writer.add_page(page)

        output = BytesIO()
        writer.write(output)
        return output.getvalue()
    except Exception as exc:
        logger.exception("PDF watermarking failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Could not prepare your download. Please try again shortly.",
        ) from exc


def _get_watermarked_pdf(purchase_id: str, pdf_bytes: bytes, footer_text: str) -> bytes:
    cached = _watermarked_pdf_cache.get(purchase_id)
    now = _utcnow()
    if cached and now - cached[1] < _WATERMARK_CACHE_TTL:
        return cached[0]

    watermarked = watermark_pdf_bytes(pdf_bytes, footer_text)
    _watermarked_pdf_cache[purchase_id] = (watermarked, now)
    return watermarked


def _safe_attachment_filename(file_name: str) -> str:
    cleaned = re.sub(r"[^\w.\- ]", "_", file_name).strip()
    return cleaned or "download"


def _creator_contact(purchase: ProductPurchase) -> User | None:
    product = purchase.product
    if product and product.profile:
        return product.profile.user
    return None


def verify_and_prepare_download(
    db: Session,
    token: str,
    email: str,
) -> tuple[bytes, str, str]:
    """
    Verify buyer email and return (file_bytes, media_type, filename).
    Increments download_count on success.
    """
    purchase = _require_available_purchase(_lookup_purchase(db, token))
    _ensure_verify_rate_limit_allowed(purchase)

    submitted = normalize_buyer_email(email)
    if not submitted or "@" not in submitted:
        _record_failed_verify_attempt(purchase)
        db.add(purchase)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=EMAIL_MISMATCH_MESSAGE)

    if submitted != normalize_buyer_email(purchase.buyer_email):
        _record_failed_verify_attempt(purchase)
        db.add(purchase)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=EMAIL_MISMATCH_MESSAGE)

    if (purchase.download_count or 0) >= (purchase.max_downloads or 3):
        creator = _creator_contact(purchase)
        detail: str | dict = DOWNLOAD_LIMIT_MESSAGE
        if creator and creator.email:
            detail = {"message": DOWNLOAD_LIMIT_MESSAGE, "creator_email": creator.email}
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=detail)

    product = purchase.product
    if product is None or not product.file_public_id:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Could not retrieve your file. Please try again shortly.",
        )

    raw_bytes = fetch_private_file_bytes(product.file_public_id)
    file_name = _safe_attachment_filename(product.file_name)
    footer = f"Licensed to {purchase.buyer_email} - Order #{purchase.id} - Do not redistribute"

    if _is_pdf_file(file_name):
        file_bytes = _get_watermarked_pdf(purchase.id, raw_bytes, footer)
        media_type = "application/pdf"
    else:
        # Known gap: non-PDF files are not watermarked; email gate + download limit only.
        file_bytes = raw_bytes
        media_type = "application/octet-stream"

    purchase.download_count += 1
    if purchase.download_count > 10:
        purchase.download_flagged = True
        logger.warning(
            "Download token used excessively purchase=%s count=%s",
            purchase.id,
            purchase.download_count,
        )

    purchase.download_verify_attempts = 0
    purchase.download_verify_window_started_at = None
    db.add(purchase)

    return file_bytes, media_type, file_name
