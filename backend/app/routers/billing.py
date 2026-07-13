import json
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.billing import (
    BillingHistoryItem,
    BillingHistoryResponse,
    BillingStatusResponse,
    CancelBillingResponse,
    FeeBreakdown,
    InitializeBillingRequest,
    InitializeBillingResponse,
    PlanPricingItem,
    PlanPricingResponse,
    StartTrialRequest,
    StartTrialResponse,
    VerifyTransactionResponse,
)
from app.models.paystack_webhook_event import PaystackWebhookEvent
from app.services.billing import (
    apply_verified_transaction,
    billing_history_payload,
    billing_status_payload,
    find_user_for_paystack_event,
    handle_paystack_event,
    log_billing_event,
    mark_subscription_cancelled,
)
from app.services.webhook_logging import create_webhook_event, mark_webhook_failed, mark_webhook_success
from app.services.premium_access import get_premium_status
from app.services.notifications import has_recent_notification, notify_user
from app.services.product_purchases import process_product_purchase_webhook
from app.services.paystack import disable_paystack_subscription, initialize_transaction, verify_paystack_signature
from app.services.paystack import verify_transaction as verify_paystack_transaction
from app.services.plan_catalog import plan_pricing_payload
from app.services.trial_billing import (
    assert_can_start_trial,
    cancel_trial_immediately,
    initialize_user_trial,
    is_trial_tokenization_charge,
    process_trial_tokenization_charge,
)

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

    status_info = get_premium_status(user, db)
    if status_info["is_premium"] and status_info["subscription_status"] != "cancelled":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You already have an active Pro plan")

    callback_url = f"{settings.frontend_url.rstrip('/')}/billing/result"

    try:
        data, plan_record = await initialize_transaction(
            db=db,
            email=user.email,
            plan_slug=body.plan,
            user_id=user.id,
            callback_url=callback_url,
            auto_renew=body.auto_renew,
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc

    user.last_paystack_reference = data["reference"]
    db.add(user)
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


@router.post("/start-trial", response_model=StartTrialResponse)
async def start_trial(
    body: StartTrialRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not settings.paystack_configured:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Billing is not configured")

    try:
        assert_can_start_trial(db, user)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    callback_url = f"{settings.frontend_url.rstrip('/')}/billing/result"

    try:
        data = await initialize_user_trial(
            db,
            user,
            plan_slug=body.plan,
            callback_url=callback_url,
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc

    db.commit()

    return StartTrialResponse(
        access_code=data["access_code"],
        reference=data["reference"],
        authorization_url=data["authorization_url"],
        plan=data["plan"],
        public_key=settings.paystack_public_key,
        tokenization_amount_ngn=data["tokenization_amount_ngn"],
        tokenization_amount_kobo=data["tokenization_amount_kobo"],
    )


@router.get("/verify", response_model=VerifyTransactionResponse)
async def verify_billing_transaction(
    reference: str = Query(..., min_length=3),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not settings.paystack_configured:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Billing is not configured")

    try:
        result = await verify_paystack_transaction(reference)
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc

    paystack_data = result["data"]
    metadata = paystack_data.get("metadata") or {}
    owner_id = metadata.get("user_id")
    if owner_id and owner_id != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="This transaction does not belong to you")
    if not owner_id and user.last_paystack_reference and user.last_paystack_reference != reference:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="This transaction does not belong to you")

    if result["status"] == "success":
        if is_trial_tokenization_charge(paystack_data):
            await process_trial_tokenization_charge(db, user, paystack_data, reference=reference)
        else:
            apply_verified_transaction(db, user, paystack_data)
        db.commit()
    elif result["status"] in {"failed", "abandoned"}:
        reason = result.get("gateway_response") or (
            "Payment was abandoned before completion." if result["status"] == "abandoned" else "Payment failed."
        )
        if not has_recent_notification(db, user_id=user.id, notification_type="payment_failed", within_hours=2):
            notify_user(
                db,
                user.id,
                "payment_failed",
                {"reason": reason, "link": f"{settings.frontend_url.rstrip('/')}/upgrade"},
            )
        db.commit()

    status_info = get_premium_status(user, db)
    return VerifyTransactionResponse(
        status=result["status"],
        reference=result["reference"],
        gateway_response=result.get("gateway_response"),
        is_premium=status_info["is_premium"],
        premium_until=status_info["premium_until"],
    )


@router.post("/cancel", response_model=CancelBillingResponse)
async def cancel_billing(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not settings.paystack_configured:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Billing is not configured")

    status_info = get_premium_status(user, db)
    if user.subscription_status == "cancelled":
        return CancelBillingResponse(
            subscription_status="cancelled",
            premium_until=status_info["premium_until"],
            message="Subscription is already cancelled.",
        )

    if not user.paystack_subscription_code or not user.paystack_email_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No cancellable subscription found on your account.",
        )

    is_active_trial = bool(
        user.is_trial
        and user.trial_ends_at
        and user.trial_ends_at > datetime.now(timezone.utc)
    )

    try:
        await disable_paystack_subscription(
            subscription_code=user.paystack_subscription_code,
            email_token=user.paystack_email_token,
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc

    if is_active_trial:
        cancel_trial_immediately(db, user)
        if not has_recent_notification(db, user_id=user.id, notification_type="subscription_cancelled", within_hours=2):
            notify_user(
                db,
                user.id,
                "subscription_cancelled",
                {"current_period_end": user.premium_period_end},
            )
        db.commit()
        return CancelBillingResponse(
            subscription_status="cancelled",
            premium_until=None,
            message="Trial cancelled — you won't be charged and Pro access has ended.",
        )

    mark_subscription_cancelled(db, user)
    if not has_recent_notification(db, user_id=user.id, notification_type="subscription_cancelled", within_hours=2):
        notify_user(
            db,
            user.id,
            "subscription_cancelled",
            {"current_period_end": user.premium_period_end},
        )
    db.commit()

    status_info = get_premium_status(user, db)
    premium_until = status_info["premium_until"]
    until_text = premium_until.date().isoformat() if premium_until else "the end of your billing period"
    return CancelBillingResponse(
        subscription_status="cancelled",
        premium_until=premium_until,
        message=f"Subscription cancelled — you'll keep Pro features until {until_text}.",
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

    webhook_row = create_webhook_event(db, event)
    webhook_id = webhook_row.id
    db.commit()

    try:
        event_type = event.get("event")
        data = event.get("data") or {}
        reference = data.get("reference") or data.get("transaction_reference")
        metadata = data.get("metadata") or {}

        if event_type == "charge.success" and (
            metadata.get("product_id") or metadata.get("purchase_type") == "product"
        ):
            await process_product_purchase_webhook(db, reference)
            log_billing_event(
                db,
                event_type=event_type,
                payload=event,
                paystack_reference=reference,
            )
            row = db.query(PaystackWebhookEvent).filter(PaystackWebhookEvent.id == webhook_id).first()
            if row:
                mark_webhook_success(db, row)
            db.commit()
            return {"status": "ok"}

        if event_type == "charge.success" and metadata.get("purpose") == "trial_tokenization":
            user = find_user_for_paystack_event(db, data)
            log_billing_event(
                db,
                event_type=event_type,
                payload=event,
                user_id=user.id if user else None,
                paystack_reference=reference,
            )
            if user:
                await process_trial_tokenization_charge(db, user, data, reference=reference)
            row = db.query(PaystackWebhookEvent).filter(PaystackWebhookEvent.id == webhook_id).first()
            if row:
                mark_webhook_success(db, row)
            db.commit()
            return {"status": "ok"}

        handle_paystack_event(db, event)
        row = db.query(PaystackWebhookEvent).filter(PaystackWebhookEvent.id == webhook_id).first()
        if row:
            mark_webhook_success(db, row)
        db.commit()
    except Exception as exc:
        db.rollback()
        row = db.query(PaystackWebhookEvent).filter(PaystackWebhookEvent.id == webhook_id).first()
        if row:
            mark_webhook_failed(db, row, str(exc))
            db.commit()
        logger.exception("Failed to process Paystack webhook")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Webhook processing failed") from exc

    return {"status": "ok"}


@router.get("/status", response_model=BillingStatusResponse)
def billing_status(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    payload = billing_status_payload(user, db)
    db.commit()
    payload["paystack_public_key"] = settings.paystack_public_key if settings.paystack_configured else None
    return BillingStatusResponse(**payload)


@router.get("/history", response_model=BillingHistoryResponse)
def billing_history(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    items = [BillingHistoryItem(**item) for item in billing_history_payload(db, user.id)]
    return BillingHistoryResponse(items=items)
