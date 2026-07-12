from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user, get_user_profile
from app.models.profile import Profile
from app.models.user import User
from app.schemas.profile import AnnouncementUpdate, ProfileResponse, ProfileUpdate, ThemeSettings
from app.services.avatar import resolve_profile_avatar_url

router = APIRouter(prefix="/profile", tags=["profile"])


def _serialize_profile(profile: Profile) -> ProfileResponse:
    theme = profile.theme_settings or {}
    return ProfileResponse(
        id=profile.id,
        user_id=profile.user_id,
        username=profile.username,
        full_name=profile.full_name,
        bio=profile.bio,
        avatar_url=resolve_profile_avatar_url(profile),
        avatar_public_id=profile.avatar_public_id,
        email_capture_enabled=profile.email_capture_enabled,
        email_capture_heading=profile.email_capture_heading,
        announcement_enabled=profile.announcement_enabled,
        announcement_text=profile.announcement_text,
        theme_settings=ThemeSettings(**theme),
        created_at=profile.created_at,
        updated_at=profile.updated_at,
    )


@router.get("", response_model=ProfileResponse)
def get_profile(current_user: User = Depends(get_current_user)):
    profile = get_user_profile(current_user)
    return _serialize_profile(profile)


@router.patch("", response_model=ProfileResponse)
def update_profile(
    payload: ProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    profile = get_user_profile(current_user)
    updates = payload.model_dump(exclude_unset=True)

    if "username" in updates and updates["username"]:
        updates["username"] = updates["username"].lower().strip()

    if "theme_settings" in updates and updates["theme_settings"] is not None:
        theme = updates["theme_settings"]
        updates["theme_settings"] = theme.model_dump() if hasattr(theme, "model_dump") else theme

    for key, value in updates.items():
        setattr(profile, key, value)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username already taken")

    db.refresh(profile)
    return _serialize_profile(profile)


@router.patch("/announcement", response_model=AnnouncementUpdate)
def update_announcement_settings(
    payload: AnnouncementUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    profile = get_user_profile(current_user)
    updates = payload.model_dump(exclude_unset=True)
    if "announcement_text" in updates and updates["announcement_text"] is not None:
        updates["announcement_text"] = updates["announcement_text"].strip() or None

    for key, value in updates.items():
        setattr(profile, key, value)

    db.commit()
    db.refresh(profile)
    return AnnouncementUpdate(
        announcement_enabled=profile.announcement_enabled,
        announcement_text=profile.announcement_text,
    )
