import csv
import io

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import StreamingResponse
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.dependencies import get_current_user, get_user_profile, require_active_premium
from app.models.profile import Profile
from app.models.subscriber import Subscriber
from app.models.user import User
from app.schemas.subscriber import EmailCaptureUpdate, SubscribeRequest, SubscribeResponse, SubscriberResponse
from app.services.billing import get_current_user_premium_status
from app.services.click_context import get_client_ip
from app.services.rate_limit import subscribe_rate_limiter

router = APIRouter(tags=["subscribers"])

SUBSCRIBE_MAX_PER_MINUTE = 5


def _public_subscribe_success() -> SubscribeResponse:
    return SubscribeResponse(message="Thanks for subscribing!")


@router.post("/profiles/{username}/subscribe", response_model=SubscribeResponse)
def subscribe_to_profile(
    username: str,
    payload: SubscribeRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    """
    Public email capture endpoint — rate-limited per IP to reduce spam.
    Always returns a friendly success message (including duplicates).
    """
    client_ip = get_client_ip(request)
    if not subscribe_rate_limiter.allow(
        client_ip,
        max_calls=SUBSCRIBE_MAX_PER_MINUTE,
        window_seconds=60,
    ):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many submissions. Please try again in a minute.",
        )

    profile = (
        db.query(Profile)
        .options(joinedload(Profile.user))
        .filter(Profile.username == username.lower())
        .first()
    )
    if profile is None or profile.user is None:
        return _public_subscribe_success()

    premium_status = get_current_user_premium_status(profile.user, db)
    if not premium_status["is_premium"] or not profile.email_capture_enabled:
        return _public_subscribe_success()

    email = str(payload.email).strip().lower()
    existing = (
        db.query(Subscriber.id)
        .filter(Subscriber.profile_id == profile.id, Subscriber.email == email)
        .first()
    )
    if existing:
        return _public_subscribe_success()

    db.add(Subscriber(profile_id=profile.id, email=email))
    try:
        db.commit()
    except IntegrityError:
        db.rollback()

    return _public_subscribe_success()


@router.patch("/profile/email-capture", response_model=EmailCaptureUpdate)
def update_email_capture_settings(
    payload: EmailCaptureUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = get_user_profile(user)
    premium_status = get_current_user_premium_status(user, db)
    if not premium_status["is_premium"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Pro plan required to use email capture.",
        )

    updates = payload.model_dump(exclude_unset=True)
    if "email_capture_heading" in updates and updates["email_capture_heading"]:
        updates["email_capture_heading"] = updates["email_capture_heading"].strip()

    for key, value in updates.items():
        setattr(profile, key, value)

    db.commit()
    db.refresh(profile)
    return EmailCaptureUpdate(
        email_capture_enabled=profile.email_capture_enabled,
        email_capture_heading=profile.email_capture_heading,
    )


@router.get("/subscribers", response_model=list[SubscriberResponse])
def list_subscribers(user: User = Depends(require_active_premium), db: Session = Depends(get_db)):
    profile = get_user_profile(user)
    rows = (
        db.query(Subscriber)
        .filter(Subscriber.profile_id == profile.id)
        .order_by(Subscriber.subscribed_at.desc())
        .all()
    )
    return rows


@router.get("/subscribers/export")
def export_subscribers_csv(user: User = Depends(require_active_premium), db: Session = Depends(get_db)):
    profile = get_user_profile(user)
    rows = (
        db.query(Subscriber)
        .filter(Subscriber.profile_id == profile.id)
        .order_by(Subscriber.subscribed_at.desc())
        .all()
    )

    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(["Email", "Subscribed At"])
    for row in rows:
        writer.writerow([row.email, row.subscribed_at.isoformat()])

    buffer.seek(0)
    return StreamingResponse(
        iter([buffer.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="subscribers.csv"'},
    )
