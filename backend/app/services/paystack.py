"""Paystack API client and webhook signature verification."""

from __future__ import annotations

import hashlib
import hmac
import logging
from typing import Any

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

PAYSTACK_BASE_URL = "https://api.paystack.co"


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


def plan_amount_kobo(plan: str) -> int:
    if plan == "yearly":
        return settings.paystack_yearly_amount_ngn * 100
    return settings.paystack_monthly_amount_ngn * 100


def plan_amount_ngn(plan: str) -> int:
    if plan == "yearly":
        return settings.paystack_yearly_amount_ngn
    return settings.paystack_monthly_amount_ngn


async def initialize_transaction(
    *,
    email: str,
    plan: str,
    user_id: str,
    callback_url: str,
) -> dict[str, Any]:
    amount = plan_amount_kobo(plan)
    payload = {
        "email": email,
        "amount": amount,
        "currency": "NGN",
        "callback_url": callback_url,
        "metadata": {
            "user_id": user_id,
            "plan": plan,
            "custom_fields": [
                {"display_name": "Plan", "variable_name": "plan", "value": plan},
                {"display_name": "User ID", "variable_name": "user_id", "value": user_id},
            ],
        },
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            f"{PAYSTACK_BASE_URL}/transaction/initialize",
            headers=_paystack_headers(),
            json=payload,
        )

    data = response.json()
    if response.status_code >= 400 or not data.get("status"):
        message = data.get("message", "Paystack initialize failed")
        logger.error("Paystack initialize error: %s — %s", response.status_code, message)
        raise RuntimeError(message)

    return data["data"]
