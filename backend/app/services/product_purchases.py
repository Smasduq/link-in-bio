"""Product purchase initialization, fulfillment, and secure download delivery."""

from __future__ import annotations

import logging
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.config import SITE_NAME, settings
from app.models.product import Product
from app.models.product_purchase import ProductPurchase
from app.models.profile import Profile
from app.models.user import User
from app.services.cloudinary_storage import generate_signed_private_download_url
from app.services.email import send_email
from app.services.email_templates import _button, transactional_email_html
from app.services.fee_pricing import calculate_fee_inclusive_amount, total_charge_kobo
from app.services.notifications import has_recent_notification, notify_user
from app.services.paystack import verify_transaction

logger = logging.getLogger(__name__)

EXCESSIVE_DOWNLOAD_THRESHOLD = 10


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _product_pricing(product: Product) -> dict[str, float]:
    return calculate_fee_inclusive_amount(float(product.price))


def _download_page_url(token: str) -> str:
    return f"{settings.frontend_url.rstrip('/')}/download/{token}"


async def initialize_product_purchase(db: Session, *, product: Product, buyer_email: str) -> dict:
    """
    Start a one-time Paystack checkout for a digital product.
    Amount is always computed server-side from the product's stored base price.
    """
    if not settings.paystack_configured:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Payments are not configured.")

    if not product.is_active:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product is not available.")

    email = buyer_email.strip().lower()
    if not email or "@" not in email:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Enter a valid email address.")

    pricing = _product_pricing(product)
    amount_kobo = total_charge_kobo(float(product.price))
    callback_url = f"{settings.frontend_url.rstrip('/')}/purchase/result"

    from app.services.paystack import _paystack_request

    profile = db.query(Profile).filter(Profile.id == product.profile_id).first()
    creator_user_id = profile.user_id if profile else None

    payload = {
        "email": email,
        "amount": amount_kobo,
        "currency": "NGN",
        "callback_url": callback_url,
        "metadata": {
            "purchase_type": "product",
            "product_id": product.id,
            "profile_id": product.profile_id,
            "creator_user_id": creator_user_id,
            "buyer_email": email,
            "base_amount": pricing["base_amount"],
            "total_charge": pricing["total_charge"],
            "custom_fields": [
                {"display_name": "Product", "variable_name": "product_id", "value": product.id},
                {"display_name": "Buyer email", "variable_name": "buyer_email", "value": email},
            ],
        },
    }

    response = await _paystack_request("POST", "/transaction/initialize", json=payload)
    data = response.json()
    if response.status_code >= 400 or not data.get("status"):
        message = data.get("message", "Paystack initialize failed")
        logger.error("Product purchase initialize failed: %s", message)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=message)

    init_data = data["data"]
    return {
        "access_code": init_data["access_code"],
        "reference": init_data["reference"],
        "authorization_url": init_data["authorization_url"],
        "public_key": settings.paystack_public_key,
        "product_id": product.id,
        "buyer_email": email,
        "pricing": {
            **pricing,
            "total_charge_kobo": amount_kobo,
        },
    }


def _get_product_for_fulfillment(db: Session, product_id: str) -> Product | None:
    return (
        db.query(Product)
        .options(joinedload(Product.profile).joinedload(Profile.user))
        .filter(Product.id == product_id)
        .first()
    )


async def fulfill_product_purchase(
    db: Session,
    reference: str,
    *,
    resend_email_if_exists: bool = False,
) -> tuple[ProductPurchase | None, bool]:
    """
    Verify a Paystack transaction and create a product purchase record.
    Always re-verifies with Paystack — never trusts webhook payload amounts alone.
    """
    existing = (
        db.query(ProductPurchase)
        .options(joinedload(ProductPurchase.product))
        .filter(ProductPurchase.paystack_reference == reference)
        .first()
    )
    if existing:
        email_sent = False
        if resend_email_if_exists and existing.product:
            email_sent = _send_buyer_download_email(
                existing.buyer_email,
                existing.product,
                _download_page_url(existing.download_token),
            )
        return existing, email_sent

    try:
        verified = await verify_transaction(reference)
    except RuntimeError as exc:
        logger.error("Product purchase verify failed for %s: %s", reference, exc)
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc

    if verified["status"] != "success":
        return None, False

    paystack_data = verified["data"]
    metadata = paystack_data.get("metadata") or {}
    product_id = metadata.get("product_id")
    if not product_id:
        return None, False

    product = _get_product_for_fulfillment(db, product_id)
    if product is None:
        logger.error("Product purchase for unknown product_id=%s ref=%s", product_id, reference)
        return None, False

    expected_kobo = total_charge_kobo(float(product.price))
    actual_kobo = int(paystack_data.get("amount") or 0)
    if actual_kobo != expected_kobo:
        logger.error(
            "Product purchase amount mismatch product=%s expected=%s actual=%s ref=%s",
            product_id,
            expected_kobo,
            actual_kobo,
            reference,
        )
        raise ValueError(
            f"Payment amount mismatch: expected {expected_kobo} kobo, got {actual_kobo} kobo."
        )

    buyer_email = (metadata.get("buyer_email") or paystack_data.get("customer", {}).get("email") or "").strip().lower()
    if not buyer_email:
        logger.error("Product purchase missing buyer email ref=%s", reference)
        return None, False

    pricing = _product_pricing(product)
    token = secrets.token_urlsafe(32)
    expires_at = _utcnow() + timedelta(days=settings.product_download_token_days)

    purchase = ProductPurchase(
        product_id=product.id,
        buyer_email=buyer_email,
        paystack_reference=reference,
        amount_paid=float(pricing["total_charge"]),
        download_token=token,
        download_token_expires_at=expires_at,
    )
    db.add(purchase)
    db.flush()

    download_url = _download_page_url(token)
    email_sent = _send_buyer_download_email(buyer_email, product, download_url)

    creator = product.profile.user if product.profile else None
    if creator:
        sale_context = {
            "product_title": product.title,
            "amount": pricing["total_charge"],
            "buyer_email": buyer_email,
        }
        dedupe_key = f"{product.id}:{reference}"
        if not has_recent_notification(db, user_id=creator.id, notification_type="product_sale", within_hours=1):
            notify_user(db, creator.id, "product_sale", sale_context)

    logger.info("Product purchase fulfilled product=%s ref=%s buyer=%s", product.id, reference, buyer_email)
    return purchase, email_sent


async def process_product_purchase_webhook(db: Session, reference: str | None) -> None:
    if not reference:
        return
    try:
        await fulfill_product_purchase(db, reference, resend_email_if_exists=False)
    except ValueError as exc:
        logger.error("Product purchase fulfillment rejected for %s: %s", reference, exc)
    except HTTPException:
        raise
    except Exception:
        logger.exception("Unexpected product purchase fulfillment error for %s", reference)


def verify_download_token(db: Session, token: str) -> tuple[ProductPurchase, Product, User | None]:
    """
    Look up a download token and return the purchase, product, and creator user.
    Raises HTTPException for invalid or expired tokens.
    """
    purchase = (
        db.query(ProductPurchase)
        .options(joinedload(ProductPurchase.product).joinedload(Product.profile).joinedload(Profile.user))
        .filter(ProductPurchase.download_token == token)
        .first()
    )
    if purchase is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Download link not found.")

    product = purchase.product
    creator = product.profile.user if product.profile else None
    expires_at = purchase.download_token_expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)

    if _utcnow() > expires_at.astimezone(timezone.utc):
        creator_email = creator.email if creator else settings.mail_from
        raise HTTPException(
            status_code=status.HTTP_410_GONE,
            detail={
                "message": "This download link has expired.",
                "creator_email": creator_email,
            },
        )

    return purchase, product, creator


def issue_signed_download(db: Session, token: str) -> str:
    """Validate token and return a short-lived signed Cloudinary URL for the private file."""
    purchase, product, _creator = verify_download_token(db, token)
    signed_url = generate_signed_private_download_url(product.file_public_id)

    purchase.download_count += 1
    if purchase.download_count > EXCESSIVE_DOWNLOAD_THRESHOLD:
        purchase.download_flagged = True
        logger.warning(
            "Download token used excessively purchase=%s count=%s",
            purchase.id,
            purchase.download_count,
        )

    db.add(purchase)
    return signed_url


def purchase_verify_payload(purchase: ProductPurchase) -> dict:
    product = purchase.product
    return {
        "status": "success",
        "reference": purchase.paystack_reference,
        "buyer_email": purchase.buyer_email,
        "product_title": product.title if product else None,
        "download_url": _download_page_url(purchase.download_token),
    }


def _send_buyer_download_email(buyer_email: str, product: Product, download_url: str) -> bool:
    subject = f"Your download: {product.title} — {SITE_NAME}"
    content = (
        f"<h1 style=\"margin: 0 0 12px; font-size: 24px; font-weight: 800; color: #111827;\">"
        f"Your download is ready</h1>"
        f"<p style=\"margin: 0 0 8px; font-size: 16px; line-height: 1.6; color: #6b7280;\">"
        f"Thanks for your purchase of <strong>{product.title}</strong>.</p>"
        f"<p style=\"margin: 0; font-size: 16px; line-height: 1.6; color: #6b7280;\">"
        f"This link expires in {settings.product_download_token_days} days.</p>"
        f"{_button(download_url, 'Download your file →')}"
    )
    html_body = transactional_email_html(
        title=subject,
        content=content,
        preheader=f"Download {product.title}",
    )
    sent = send_email(to=buyer_email, subject=subject, html_body=html_body)
    if not sent:
        logger.error("Failed to send product download email to %s", buyer_email)
    return sent
