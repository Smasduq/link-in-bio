import logging

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.notification import BILLING_NOTIFICATION_TYPES, ENGAGEMENT_NOTIFICATION_TYPES, Notification
from app.models.user import User
from app.schemas.notification import MarkAllReadResponse, MarkNotificationReadResponse, NotificationItem, NotificationListResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/notifications", tags=["notifications"])


def _category_for_type(notification_type: str) -> str:
    if notification_type in BILLING_NOTIFICATION_TYPES:
        return "billing"
    if notification_type in ENGAGEMENT_NOTIFICATION_TYPES:
        return "activity"
    return "billing"


@router.get("", response_model=NotificationListResponse)
def list_notifications(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    category: str | None = Query(None, pattern="^(all|billing|activity)$"),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(Notification).filter(Notification.user_id == user.id)
    if category and category != "all":
        types = BILLING_NOTIFICATION_TYPES if category == "billing" else ENGAGEMENT_NOTIFICATION_TYPES
        query = query.filter(Notification.type.in_(types))

    total = query.count()
    unread_count = (
        db.query(Notification)
        .filter(Notification.user_id == user.id, Notification.is_read.is_(False))
        .count()
    )

    rows = (
        query.order_by(Notification.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    return NotificationListResponse(
        items=[
            NotificationItem(
                id=row.id,
                type=row.type,
                category=_category_for_type(row.type),
                message=row.message,
                is_read=row.is_read,
                created_at=row.created_at,
            )
            for row in rows
        ],
        total=total,
        unread_count=unread_count,
        page=page,
        page_size=page_size,
    )


@router.post("/{notification_id}/read", response_model=MarkNotificationReadResponse)
def mark_notification_read(
    notification_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    notification = (
        db.query(Notification)
        .filter(Notification.id == notification_id, Notification.user_id == user.id)
        .first()
    )
    if notification is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")

    notification.is_read = True
    db.add(notification)
    db.commit()
    return MarkNotificationReadResponse(id=notification.id, is_read=True)


@router.post("/read-all", response_model=MarkAllReadResponse)
def mark_all_notifications_read(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    updated = (
        db.query(Notification)
        .filter(Notification.user_id == user.id, Notification.is_read.is_(False))
        .update({Notification.is_read: True}, synchronize_session=False)
    )
    db.commit()
    return MarkAllReadResponse(updated=updated)
