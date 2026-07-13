from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_admin
from app.models.user import User
from app.schemas.admin import (
    AdminActionRequest,
    AdminActionResponse,
    AdminDeleteUserRequest,
    AdminGrantProRequest,
    AdminOverviewResponse,
    AdminUserDetailResponse,
    AdminUserListItem,
    AdminUserListResponse,
)
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
        plan=payload.plan,
        days=payload.days,
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
    return AdminActionResponse(message="Pro access revoked", data=result)


@router.post("/users/{user_id}/suspend", response_model=AdminActionResponse)
def admin_suspend_user(
    user_id: str,
    payload: AdminActionRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    result = suspend_user(db, admin=admin, user_id=user_id, reason=payload.reason)
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
