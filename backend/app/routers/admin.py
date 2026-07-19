from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_admin
from app.models.user import User
from app.schemas.admin import (
    AdminActionRequest,
    AdminActionResponse,
    AdminBroadcastRequest,
    AdminCronRunItem,
    AdminCronRunListResponse,
    AdminDeleteUserRequest,
    AdminFeatureFlagItem,
    AdminFeatureFlagListResponse,
    AdminFeatureFlagUpdateRequest,
    AdminGrantProRequest,
    AdminMarkWithdrawalPaidRequest,
    AdminOverviewResponse,
    AdminProductItem,
    AdminProductListResponse,
    AdminRefundRequest,
    AdminReportActionRequest,
    AdminReportItem,
    AdminReportListResponse,
    AdminSubscriptionItem,
    AdminSubscriptionListResponse,
    AdminSuspendRequest,
    AdminTransactionItem,
    AdminTransactionListResponse,
    AdminUserDetailResponse,
    AdminUserListItem,
    AdminUserListResponse,
    AdminWebhookEventItem,
    AdminWebhookListResponse,
    AdminWithdrawalItem,
    AdminWithdrawalListResponse,
)
from app.services.admin_billing import (
    list_subscriptions,
    list_transactions,
    list_webhook_events,
    refund_transaction_admin,
)
from app.services.admin_content import disable_product, list_all_products, list_reports, resolve_report
from app.services.admin_notifications import broadcast_notification
from app.services.admin_overview import get_overview_metrics, get_recent_activity
from app.services.admin_users import (
    get_user_detail,
    grant_pro,
    list_users,
    reactivate_user,
    revoke_pro,
    serialize_user_list_item,
    soft_delete_user,
    suspend_user,
)
from app.services.cron_logging import list_cron_runs
from app.services.feature_flags import list_feature_flags, update_feature_flag

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/overview", response_model=AdminOverviewResponse)
def admin_overview(
    db: Session = Depends(get_db),
    _admin: User = Depends(get_current_admin),
):
    return AdminOverviewResponse(
        metrics=get_overview_metrics(db),
        activity=get_recent_activity(db),
    )


@router.get("/users", response_model=AdminUserListResponse)
def admin_list_users(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: str | None = Query(None, max_length=100),
    db: Session = Depends(get_db),
    _admin: User = Depends(get_current_admin),
):
    users, total = list_users(db, page=page, page_size=page_size, search=search)
    return AdminUserListResponse(
        items=[AdminUserListItem(**serialize_user_list_item(user)) for user in users],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/users/{user_id}", response_model=AdminUserDetailResponse)
def admin_user_detail(
    user_id: str,
    db: Session = Depends(get_db),
    _admin: User = Depends(get_current_admin),
):
    return AdminUserDetailResponse(**get_user_detail(db, user_id))


@router.post("/users/{user_id}/grant-pro", response_model=AdminActionResponse)
def admin_grant_pro(
    user_id: str,
    payload: AdminGrantProRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    result = grant_pro(
        db,
        admin=admin,
        user_id=user_id,
        reason=payload.reason,
    )
    return AdminActionResponse(message="Pro access granted", data=result)


@router.post("/users/{user_id}/revoke-pro", response_model=AdminActionResponse)
def admin_revoke_pro(
    user_id: str,
    payload: AdminActionRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    result = revoke_pro(db, admin=admin, user_id=user_id, reason=payload.reason)
    message = "Pro access revoked"
    if result.get("warning"):
        message = f"{message}. {result['warning']}"
    return AdminActionResponse(message=message, data=result)


@router.post("/users/{user_id}/suspend", response_model=AdminActionResponse)
def admin_suspend_user(
    user_id: str,
    payload: AdminSuspendRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    result = suspend_user(
        db,
        admin=admin,
        user_id=user_id,
        reason=payload.reason,
        disable_public_profile=payload.disable_public_profile,
    )
    return AdminActionResponse(message="Account suspended", data=result)


@router.post("/users/{user_id}/reactivate", response_model=AdminActionResponse)
def admin_reactivate_user(
    user_id: str,
    payload: AdminActionRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    result = reactivate_user(db, admin=admin, user_id=user_id, reason=payload.reason)
    return AdminActionResponse(message="Account reactivated", data=result)


@router.post("/users/{user_id}/delete", response_model=AdminActionResponse)
def admin_delete_user(
    user_id: str,
    payload: AdminDeleteUserRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    result = soft_delete_user(
        db,
        admin=admin,
        user_id=user_id,
        reason=payload.reason,
        confirm_username=payload.confirm_username,
    )
    return AdminActionResponse(message="Account deleted", data=result)


@router.get("/billing/transactions", response_model=AdminTransactionListResponse)
def admin_list_transactions(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    tx_type: str | None = Query(None, pattern="^(subscription|product)$"),
    db: Session = Depends(get_db),
    _admin: User = Depends(get_current_admin),
):
    items, total = list_transactions(db, page=page, page_size=page_size, tx_type=tx_type)
    return AdminTransactionListResponse(
        items=[AdminTransactionItem(**item) for item in items],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.post("/billing/refund", response_model=AdminActionResponse)
async def admin_refund_transaction(
    payload: AdminRefundRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    result = await refund_transaction_admin(
        db,
        admin=admin,
        reference=payload.reference,
        reason=payload.reason,
    )
    return AdminActionResponse(message="Refund processed", data=result)


@router.get("/billing/subscriptions", response_model=AdminSubscriptionListResponse)
def admin_list_subscriptions(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status_filter: str | None = Query(None, pattern="^(active|cancelled|trial|past_due)$"),
    db: Session = Depends(get_db),
    _admin: User = Depends(get_current_admin),
):
    items, total = list_subscriptions(db, page=page, page_size=page_size, status_filter=status_filter)
    return AdminSubscriptionListResponse(
        items=[AdminSubscriptionItem(**item) for item in items],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/billing/webhooks", response_model=AdminWebhookListResponse)
def admin_list_webhooks(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status_filter: str | None = Query(None, pattern="^(pending|success|failed)$"),
    db: Session = Depends(get_db),
    _admin: User = Depends(get_current_admin),
):
    events, total = list_webhook_events(db, page=page, page_size=page_size, status_filter=status_filter)
    return AdminWebhookListResponse(
        items=[
            AdminWebhookEventItem(
                id=e.id,
                event_type=e.event_type,
                paystack_reference=e.paystack_reference,
                user_id=e.user_id,
                processing_status=e.processing_status,
                processing_error=e.processing_error,
                created_at=e.created_at,
                payload=e.payload,
            )
            for e in events
        ],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/content/products", response_model=AdminProductListResponse)
def admin_list_products(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: str | None = Query(None, max_length=100),
    db: Session = Depends(get_db),
    _admin: User = Depends(get_current_admin),
):
    items, total = list_all_products(db, page=page, page_size=page_size, search=search)
    return AdminProductListResponse(
        items=[AdminProductItem(**item) for item in items],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.post("/content/products/{product_id}/disable", response_model=AdminActionResponse)
def admin_disable_product(
    product_id: str,
    payload: AdminActionRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    result = disable_product(db, admin=admin, product_id=product_id, reason=payload.reason)
    return AdminActionResponse(message="Product disabled", data=result)


@router.get("/content/reports", response_model=AdminReportListResponse)
def admin_list_reports(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status_filter: str | None = Query("open", pattern="^(open|resolved|dismissed)$"),
    db: Session = Depends(get_db),
    _admin: User = Depends(get_current_admin),
):
    items, total = list_reports(db, page=page, page_size=page_size, status_filter=status_filter)
    return AdminReportListResponse(
        items=[AdminReportItem(**item) for item in items],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.post("/content/reports/{report_id}/action", response_model=AdminActionResponse)
def admin_report_action(
    report_id: str,
    payload: AdminReportActionRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    result = resolve_report(db, admin=admin, report_id=report_id, action=payload.action, reason=payload.reason)
    return AdminActionResponse(message=f"Report {payload.action}d", data=result)


@router.post("/notifications/broadcast", response_model=AdminActionResponse)
def admin_broadcast(
    payload: AdminBroadcastRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    try:
        result = broadcast_notification(
            db,
            admin=admin,
            message=payload.message,
            subject=payload.subject,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return AdminActionResponse(message="Broadcast sent", data=result)


@router.get("/notifications/cron-runs", response_model=AdminCronRunListResponse)
def admin_cron_runs(
    db: Session = Depends(get_db),
    _admin: User = Depends(get_current_admin),
):
    runs = list_cron_runs(db, job_name="engagement_notifications", limit=20)
    return AdminCronRunListResponse(
        items=[
            AdminCronRunItem(
                id=run.id,
                job_name=run.job_name,
                status=run.status,
                details=run.details,
                error_message=run.error_message,
                started_at=run.started_at,
                finished_at=run.finished_at,
            )
            for run in runs
        ]
    )


@router.get("/settings/feature-flags", response_model=AdminFeatureFlagListResponse)
def admin_list_feature_flags(
    db: Session = Depends(get_db),
    _admin: User = Depends(get_current_admin),
):
    flags = list_feature_flags(db)
    return AdminFeatureFlagListResponse(
        items=[
            AdminFeatureFlagItem(
                key=flag.key,
                value=flag.value,
                description=flag.description,
                updated_at=flag.updated_at,
            )
            for flag in flags
        ]
    )


@router.patch("/settings/feature-flags/{key}", response_model=AdminFeatureFlagItem)
def admin_update_feature_flag(
    key: str,
    payload: AdminFeatureFlagUpdateRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    from app.services.admin_audit import log_admin_action

    try:
        flag = update_feature_flag(db, key, payload.value)
    except KeyError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Feature flag not found") from exc

    log_admin_action(
        db,
        admin_user_id=admin.id,
        action="update_feature_flag",
        target_type="feature_flag",
        target_id=key,
        details={"value": payload.value},
    )
    db.commit()
    return AdminFeatureFlagItem(
        key=flag.key,
        value=flag.value,
        description=flag.description,
        updated_at=flag.updated_at,
    )


# ---------------------------------------------------------------------------
# Withdrawal requests
# ---------------------------------------------------------------------------

def _working_days_elapsed(from_dt: "datetime") -> int:
    """Count business days (Mon–Fri) between from_dt and now (UTC)."""
    from datetime import datetime, timedelta, timezone
    now = datetime.now(timezone.utc)
    if from_dt.tzinfo is None:
        from_dt = from_dt.replace(tzinfo=timezone.utc)
    count = 0
    cursor = from_dt.replace(hour=0, minute=0, second=0, microsecond=0)
    today = now.replace(hour=0, minute=0, second=0, microsecond=0)
    while cursor < today:
        cursor += timedelta(days=1)
        if cursor.weekday() < 5:  # Mon=0 … Fri=4
            count += 1
    return count


def _serialize_withdrawal(w, user_email: str | None, username: str | None) -> AdminWithdrawalItem:
    return AdminWithdrawalItem(
        id=w.id,
        user_id=w.user_id,
        user_email=user_email,
        username=username,
        amount=float(w.amount),
        bank_name=w.bank_name,
        account_number=w.account_number,
        account_name=w.account_name,
        status=w.status,
        requested_at=w.requested_at,
        paid_at=w.paid_at,
        admin_note=w.admin_note,
        working_days_elapsed=_working_days_elapsed(w.requested_at),
    )


@router.get("/withdrawals", response_model=AdminWithdrawalListResponse)
def admin_list_withdrawals(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status_filter: str | None = Query(None, pattern="^(pending|paid)$"),
    db: Session = Depends(get_db),
    _admin: User = Depends(get_current_admin),
):
    from app.models.withdrawal_request import WithdrawalRequest
    from app.models.profile import Profile

    q = db.query(WithdrawalRequest)
    if status_filter:
        q = q.filter(WithdrawalRequest.status == status_filter)
    total = q.count()
    rows = (
        q.order_by(WithdrawalRequest.requested_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    items = []
    for w in rows:
        user = db.query(User).filter(User.id == w.user_id).first()
        profile = db.query(Profile).filter(Profile.user_id == w.user_id).first() if user else None
        items.append(
            _serialize_withdrawal(
                w,
                user_email=user.email if user else None,
                username=profile.username if profile else None,
            )
        )

    return AdminWithdrawalListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
    )


@router.post("/withdrawals/{withdrawal_id}/mark-paid", response_model=AdminActionResponse)
def admin_mark_withdrawal_paid(
    withdrawal_id: str,
    payload: AdminMarkWithdrawalPaidRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    from datetime import datetime, timezone
    from app.models.withdrawal_request import WithdrawalRequest
    from app.models.profile import Profile
    from app.services.admin_audit import log_admin_action
    from app.services.notifications import notify_user

    withdrawal = db.query(WithdrawalRequest).filter(WithdrawalRequest.id == withdrawal_id).first()
    if not withdrawal:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Withdrawal request not found")

    if withdrawal.status == "paid":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This withdrawal has already been marked as paid.",
        )

    now = datetime.now(timezone.utc)
    withdrawal.status = "paid"
    withdrawal.paid_at = now
    if payload.admin_note is not None:
        withdrawal.admin_note = payload.admin_note
    db.add(withdrawal)

    log_admin_action(
        db,
        admin_user_id=admin.id,
        action="mark_withdrawal_paid",
        target_type="withdrawal_request",
        target_id=withdrawal_id,
        details={
            "amount": float(withdrawal.amount),
            "user_id": withdrawal.user_id,
            "admin_note": payload.admin_note,
        },
    )

    notify_user(
        db,
        withdrawal.user_id,
        "withdrawal_paid",
        {"amount": float(withdrawal.amount)},
    )

    db.commit()

    return AdminActionResponse(
        message=f"Withdrawal of ₦{float(withdrawal.amount):,.0f} marked as paid.",
        data={
            "withdrawal_id": withdrawal_id,
            "amount": float(withdrawal.amount),
            "paid_at": now.isoformat(),
            "admin_note": payload.admin_note,
        },
    )
