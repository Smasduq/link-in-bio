"""Tests for email-gated downloads, rate limiting, and PDF watermarking."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from io import BytesIO
from unittest.mock import MagicMock, patch

import pytest
from fastapi import HTTPException
from reportlab.pdfgen import canvas

from app.models.product import Product
from app.models.product_purchase import ProductPurchase
from app.services.download_verification import (
    EMAIL_MISMATCH_MESSAGE,
    GENERIC_UNAVAILABLE_MESSAGE,
    RATE_LIMIT_MESSAGE,
    normalize_buyer_email,
    verify_and_prepare_download,
    watermark_pdf_bytes,
)


def _make_pdf_bytes(text: str = "Sample product content") -> bytes:
    buffer = BytesIO()
    pdf = canvas.Canvas(buffer)
    pdf.drawString(72, 720, text)
    pdf.showPage()
    pdf.save()
    return buffer.getvalue()


def _purchase(*, buyer_email: str = "buyer@example.com", download_count: int = 0) -> ProductPurchase:
    product = Product(
        id="product-1",
        profile_id="profile-1",
        title="Test Guide",
        price=1000.0,
        file_public_id="products/product-1/file",
        file_name="guide.pdf",
    )
    purchase = ProductPurchase(
        id="purchase-1",
        product_id=product.id,
        buyer_email=buyer_email,
        paystack_reference="ref-123",
        amount_paid=1030.0,
        download_token="token-abc",
        download_token_expires_at=datetime.now(timezone.utc) + timedelta(hours=12),
        download_count=download_count,
        max_downloads=3,
        download_verify_attempts=0,
    )
    purchase.product = product
    return purchase


def test_normalize_buyer_email():
    assert normalize_buyer_email("  Buyer@Example.COM ") == "buyer@example.com"


def test_watermark_pdf_bytes_adds_footer_text():
    source = _make_pdf_bytes()
    footer = "Licensed to buyer@example.com - Order #purchase-1 - Do not redistribute"
    watermarked = watermark_pdf_bytes(source, footer)

    assert watermarked != source
    assert b"Licensed to buyer" in watermarked


def test_verify_rejects_wrong_email_without_leaking_details():
    purchase = _purchase()
    db = MagicMock()
    db.query.return_value.options.return_value.filter.return_value.first.return_value = purchase

    with patch("app.services.download_verification.fetch_private_file_bytes") as fetch_mock:
        with pytest.raises(HTTPException) as exc:
            verify_and_prepare_download(db, "token-abc", "wrong@example.com")

    assert exc.value.status_code == 400
    assert exc.value.detail == EMAIL_MISMATCH_MESSAGE
    assert purchase.download_verify_attempts == 1
    fetch_mock.assert_not_called()


def test_verify_rate_limits_after_five_failed_attempts():
    purchase = _purchase()
    purchase.download_verify_attempts = 5
    purchase.download_verify_window_started_at = datetime.now(timezone.utc)
    db = MagicMock()
    db.query.return_value.options.return_value.filter.return_value.first.return_value = purchase

    with pytest.raises(HTTPException) as exc:
        verify_and_prepare_download(db, "token-abc", "wrong@example.com")

    assert exc.value.status_code == 429
    assert exc.value.detail == RATE_LIMIT_MESSAGE


def test_verify_invalid_token_is_generic():
    db = MagicMock()
    db.query.return_value.options.return_value.filter.return_value.first.return_value = None

    with pytest.raises(HTTPException) as exc:
        verify_and_prepare_download(db, "missing-token", "buyer@example.com")

    assert exc.value.status_code == 404
    assert exc.value.detail == GENERIC_UNAVAILABLE_MESSAGE


def test_verify_success_watermarks_pdf_and_increments_count():
    purchase = _purchase()
    db = MagicMock()
    db.query.return_value.options.return_value.filter.return_value.first.return_value = purchase
    source_pdf = _make_pdf_bytes()

    with patch(
        "app.services.download_verification.fetch_private_file_bytes",
        return_value=source_pdf,
    ):
        file_bytes, media_type, file_name = verify_and_prepare_download(
            db, "token-abc", "  buyer@example.com "
        )

    assert media_type == "application/pdf"
    assert file_name == "guide.pdf"
    assert file_bytes != source_pdf
    assert purchase.download_count == 1
    assert purchase.download_verify_attempts == 0


def test_verify_blocks_when_download_limit_reached():
    purchase = _purchase(download_count=3)
    db = MagicMock()
    db.query.return_value.options.return_value.filter.return_value.first.return_value = purchase

    with patch("app.services.download_verification.fetch_private_file_bytes") as fetch_mock:
        with pytest.raises(HTTPException) as exc:
            verify_and_prepare_download(db, "token-abc", "buyer@example.com")

    assert exc.value.status_code == 403
    fetch_mock.assert_not_called()
