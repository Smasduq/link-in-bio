"""Paystack API client and webhook signature verification."""

from __future__ import annotations

import hashlib
import hmac
import logging
from typing import Any

import httpx
from sqlalchemy.orm import Session

from app.config import settings
from app.models.billing_plan import BillingPlanRecord

logger = logging.getLogger(__name__)

PAYSTACK_BASE_URL = "https://api.paystack.co"
PAYSTACK_NETWORK_ERROR = "Could not reach Paystack. Check your internet connection and try again."


async def _paystack_request(method: str, path: str, *, json: dict[str, Any] | None = None) -> httpx.Response:
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            return await client.request(
                method,
                f"{PAYSTACK_BASE_URL}{path}",
                headers=_paystack_headers(),
                json=json,
            )
    except httpx.RequestError as exc:
        logger.error("Paystack network error for %s %s: %s", method, path, exc)
        raise RuntimeError(PAYSTACK_NETWORK_ERROR) from exc


def verify_paystack_signature(payload: bytes, signature: str | None, secret_key: str | None = None) -> bool:
    """
    Verify Paystack webhook authenticity using HMAC SHA512.

    Paystack signs the raw request body with your secret key and sends the digest
    in the ``x-paystack-signature`` header. Reject any webhook where the signature
    does not match — this is the primary defense against forged payment events.
    """
    if not signature:
        return False

    key = secret_key or settings.paystack_secret_key
    if not key:
        logger.error("Paystack secret key missing — cannot verify webhook signature")
        return False

    computed = hmac.new(key.encode("utf-8"), payload, hashlib.sha512).hexdigest()
    return hmac.compare_digest(computed, signature)


def _paystack_headers() -> dict[str, str]:
    if not settings.paystack_secret_key:
        raise RuntimeError("Paystack secret key is not configured")
    return {
        "Authorization": f"Bearer {settings.paystack_secret_key}",
        "Content-Type": "application/json",
    }


async def create_paystack_plan(*, name: str, interval: str, amount_kobo: int) -> str:
    """Create a Paystack plan using the fee-inclusive amount in kobo."""
    payload = {
        "name": name,
        "interval": interval,
        "amount": amount_kobo,
        "currency": "NGN",
    }

    response = await _paystack_request("POST", "/plan", json=payload)

    data = response.json()
    if response.status_code >= 400 or not data.get("status"):
        message = data.get("message", "Paystack plan creation failed")
        logger.error("Paystack plan error: %s — %s", response.status_code, message)
        raise RuntimeError(message)

    plan_code = data["data"]["plan_code"]
    return plan_code


async def get_paystack_plan_amount_kobo(plan_code: str) -> int | None:
    """Return the Paystack plan amount in kobo, or None if the plan cannot be fetched."""
    try:
        response = await _paystack_request("GET", f"/plan/{plan_code}")
    except RuntimeError:
        return None

    data = response.json()
    if response.status_code >= 400 or not data.get("status"):
        message = data.get("message", "Paystack plan fetch failed")
        logger.error("Paystack plan fetch error: %s — %s", response.status_code, message)
        return None

    amount = data.get("data", {}).get("amount")
    return int(amount) if amount is not None else None


async def initialize_transaction(
    *,
    db: Session,
    email: str,
    plan_slug: str,
    user_id: str,
    callback_url: str,
    auto_renew: bool = True,
) -> tuple[dict[str, Any], BillingPlanRecord]:
    from app.services.plan_catalog import get_plan_by_slug

    plan_record = get_plan_by_slug(db, plan_slug)
    if plan_record is None:
        raise RuntimeError(f"Unknown billing plan: {plan_slug}")

    payload: dict[str, Any] = {
        "email": email,
        "amount": plan_record.total_charge_kobo,
        "currency": "NGN",
        "callback_url": callback_url,
        "metadata": {
            "user_id": user_id,
            "plan": plan_slug,
            "auto_renew": auto_renew,
            "base_amount": plan_record.base_amount,
            "total_charge": plan_record.total_charge,
            "custom_fields": [
                {"display_name": "Plan", "variable_name": "plan", "value": plan_slug},
                {"display_name": "User ID", "variable_name": "user_id", "value": user_id},
                {"display_name": "Auto renew", "variable_name": "auto_renew", "value": str(auto_renew).lower()},
            ],
        },
    }

    # Attaching a Paystack plan code is what triggers subscription creation after payment.
    if auto_renew and plan_record.paystack_plan_code:
        payload["plan"] = plan_record.paystack_plan_code

    response = await _paystack_request("POST", "/transaction/initialize", json=payload)

    data = response.json()
    if response.status_code >= 400 or not data.get("status"):
        message = data.get("message", "Paystack initialize failed")
        logger.error("Paystack initialize error: %s — %s", response.status_code, message)
        raise RuntimeError(message)

    return data["data"], plan_record


async def verify_transaction(reference: str) -> dict[str, Any]:
    """Verify a transaction with Paystack — never trust client-side redirects alone."""
    response = await _paystack_request("GET", f"/transaction/verify/{reference}")
    payload = response.json()
    if response.status_code >= 400 or not payload.get("status"):
        message = payload.get("message", "Paystack transaction verification failed")
        logger.error("Paystack verify error: %s — %s", response.status_code, message)
        raise RuntimeError(message)

    data = payload.get("data") or {}
    raw_status = (data.get("status") or "failed").lower()
    if raw_status == "success":
        status = "success"
    elif raw_status == "abandoned":
        status = "abandoned"
    else:
        status = "failed"

    return {
        "status": status,
        "reference": data.get("reference") or reference,
        "gateway_response": data.get("gateway_response"),
        "amount": data.get("amount"),
        "paid_at": data.get("paid_at"),
        "data": data,
    }


async def disable_paystack_subscription(*, subscription_code: str, email_token: str) -> None:
    response = await _paystack_request(
        "POST",
        "/subscription/disable",
        json={"code": subscription_code, "token": email_token},
    )
    payload = response.json()
    if response.status_code >= 400 or not payload.get("status"):
        message = payload.get("message", "Paystack subscription disable failed")
        logger.error("Paystack disable error: %s — %s", response.status_code, message)
        raise RuntimeError(message)
