import json
import logging

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.billing import BillingStatusResponse, InitializeBillingRequest, InitializeBillingResponse
from app.services.billing import billing_status_payload, get_current_user_premium_status, handle_paystack_event
from app.services.paystack import initialize_transaction, plan_amount_ngn, verify_paystack_signature

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/billing", tags=["billing"])


@router.post("/initialize", response_model=InitializeBillingResponse)
async def initialize_billing(
    body: InitializeBillingRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not settings.paystack_configured:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Billing is not configured")

    status_info = get_current_user_premium_status(user)
    if status_info["is_premium"]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You already have an active Pro plan")

    callback_url = f"{settings.frontend_url.rstrip('/')}/upgrade?status=success"

    try:
        data = await initialize_transaction(
            email=user.email,
            plan=body.plan,
            user_id=user.id,
            callback_url=callback_url,
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc

    db.commit()

    return InitializeBillingResponse(
        access_code=data["access_code"],
        reference=data["reference"],
        authorization_url=data["authorization_url"],
        amount_ngn=plan_amount_ngn(body.plan),
        plan=body.plan,
        public_key=settings.paystack_public_key,
    )


@router.post("/webhook")
async def paystack_webhook(request: Request, db: Session = Depends(get_db)):
    payload = await request.body()
    signature = request.headers.get("x-paystack-signature")

    if not verify_paystack_signature(payload, signature):
        logger.warning("Rejected Paystack webhook — invalid x-paystack-signature")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid webhook signature")

    try:
        event = json.loads(payload)
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid JSON payload") from exc

    try:
        handle_paystack_event(db, event)
        db.commit()
    except Exception:
        db.rollback()
        logger.exception("Failed to process Paystack webhook")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Webhook processing failed")

    return {"status": "ok"}


@router.get("/status", response_model=BillingStatusResponse)
def billing_status(user: User = Depends(get_current_user)):
    payload = billing_status_payload(user)
    payload["paystack_public_key"] = settings.paystack_public_key if settings.paystack_configured else None
    return BillingStatusResponse(**payload)
