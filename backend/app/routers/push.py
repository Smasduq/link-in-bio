from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.dependencies import get_current_user
from app.models.push_subscription import PushSubscription
from app.models.user import User
from app.schemas.push import (
    NotificationPreferencesResponse,
    NotificationPreferencesUpdate,
    PushSubscribeRequest,
    PushSubscribeResponse,
    UserTimezoneUpdate,
    VapidPublicKeyResponse,
)
from app.services.cron_logging import finish_cron_run, list_cron_runs, start_cron_run
from app.services.engagement_notifications import run_engagement_cron
from app.services.notification_preferences import get_or_create_preferences
from datetime import datetime, timezone

router = APIRouter(tags=["push"])


@router.get("/push/vapid-public-key", response_model=VapidPublicKeyResponse)
def get_vapid_public_key():
    if not settings.vapid_public_key:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Push not configured")
    return VapidPublicKeyResponse(public_key=settings.vapid_public_key)


@router.post("/push/subscribe", response_model=PushSubscribeResponse)
def subscribe_push(
    payload: PushSubscribeRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not payload.p256dh or not payload.auth:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid subscription keys")

    existing = db.query(PushSubscription).filter(PushSubscription.endpoint == payload.endpoint).first()
    if existing:
        existing.user_id = user.id
        existing.p256dh_key = payload.p256dh
        existing.auth_key = payload.auth
    else:
        db.add(
            PushSubscription(
                user_id=user.id,
                endpoint=payload.endpoint,
                p256dh_key=payload.p256dh,
                auth_key=payload.auth,
            )
        )
    get_or_create_preferences(db, user.id)
    db.commit()
    return PushSubscribeResponse(subscribed=True)


@router.delete("/push/subscribe", status_code=status.HTTP_204_NO_CONTENT)
def unsubscribe_push(
    payload: PushSubscribeRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    row = (
        db.query(PushSubscription)
        .filter(PushSubscription.user_id == user.id, PushSubscription.endpoint == payload.endpoint)
        .first()
    )
    if row:
        db.delete(row)
        db.commit()


@router.get("/push/preferences", response_model=NotificationPreferencesResponse)
def get_notification_preferences(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    prefs = get_or_create_preferences(db, user.id)
    has_push = (
        db.query(PushSubscription.id).filter(PushSubscription.user_id == user.id).first() is not None
    )
    db.commit()
    return NotificationPreferencesResponse(
        email_billing_enabled=prefs.email_billing_enabled,
        email_engagement_enabled=prefs.email_engagement_enabled,
        push_billing_enabled=prefs.push_billing_enabled,
        push_engagement_enabled=prefs.push_engagement_enabled,
        has_push_subscription=has_push,
    )


@router.patch("/push/preferences", response_model=NotificationPreferencesResponse)
def update_notification_preferences(
    payload: NotificationPreferencesUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    prefs = get_or_create_preferences(db, user.id)
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(prefs, key, value)
    db.commit()
    has_push = (
        db.query(PushSubscription.id).filter(PushSubscription.user_id == user.id).first() is not None
    )
    return NotificationPreferencesResponse(
        email_billing_enabled=prefs.email_billing_enabled,
        email_engagement_enabled=prefs.email_engagement_enabled,
        push_billing_enabled=prefs.push_billing_enabled,
        push_engagement_enabled=prefs.push_engagement_enabled,
        has_push_subscription=has_push,
    )


@router.patch("/users/me/timezone")
def update_user_timezone(
    payload: UserTimezoneUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user.timezone = payload.timezone.strip()
    user.last_login_at = datetime.now(timezone.utc)
    db.add(user)
    db.commit()
    return {"timezone": user.timezone}


@router.post("/cron/engagement-notifications")
def cron_engagement_notifications(
    db: Session = Depends(get_db),
    x_cron_secret: str | None = Header(default=None, alias="X-Cron-Secret"),
):
    if not settings.cron_secret or x_cron_secret != settings.cron_secret:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized")

    run = start_cron_run(db, "engagement_notifications")
    try:
        counts = run_engagement_cron(db)
        finish_cron_run(db, run, details=counts)
    except Exception as exc:
        finish_cron_run(db, run, details={}, error=str(exc))
        db.commit()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Cron job failed") from exc
    db.commit()
    return {"status": "ok", "sent": counts, "run_id": run.id}
