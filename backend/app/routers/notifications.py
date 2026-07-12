import logging

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.notification import Notification
from app.models.user import User
from app.schemas.notification import MarkNotificationReadResponse, NotificationItem, NotificationListResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("", response_model=NotificationListResponse)
def list_notifications(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(Notification).filter(Notification.user_id == user.id)
    total = query.count()
    unread_count = query.filter(Notification.is_read.is_(False)).count()

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
