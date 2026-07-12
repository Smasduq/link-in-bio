import json
import logging

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.billing import (
    BillingStatusResponse,
    FeeBreakdown,
    InitializeBillingRequest,
    InitializeBillingResponse,
    PlanPricingItem,
    PlanPricingResponse,
)
from app.services.billing import billing_status_payload, get_current_user_premium_status, handle_paystack_event
from app.services.paystack import initialize_transaction, verify_paystack_signature
from app.services.plan_catalog import plan_pricing_payload

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/billing", tags=["billing"])


@router.get("/plan-pricing", response_model=PlanPricingResponse)
def get_plan_pricing(db: Session = Depends(get_db)):
    plans = [PlanPricingItem(**item) for item in plan_pricing_payload(db)]
    return PlanPricingResponse(plans=plans)


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
        data, plan_record = await initialize_transaction(
            db=db,
            email=user.email,
            plan_slug=body.plan,
            user_id=user.id,
            callback_url=callback_url,
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc

    db.commit()

    pricing = FeeBreakdown(
        base_amount=plan_record.base_amount,
        service_fee=plan_record.service_fee,
        vat_on_fee=plan_record.vat_on_fee,
        total_charge=plan_record.total_charge,
        total_charge_kobo=plan_record.total_charge_kobo,
    )

    return InitializeBillingResponse(
        access_code=data["access_code"],
        reference=data["reference"],
        authorization_url=data["authorization_url"],
        plan=body.plan,
        public_key=settings.paystack_public_key,
        pricing=pricing,
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
def billing_status(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    payload = billing_status_payload(user, db)
    payload["paystack_public_key"] = settings.paystack_public_key if settings.paystack_configured else None
    return BillingStatusResponse(**payload)
