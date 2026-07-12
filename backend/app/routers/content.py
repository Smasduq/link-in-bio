from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user, get_premium_status_dep, get_user_profile
from app.models.link import Link
from app.models.product import Product
from app.models.profile import Profile
from app.models.user import User
from app.schemas.content_block import ContentReorderRequest, LayoutModeUpdate
from app.schemas.profile import ProfileResponse, ThemeSettings
from app.services.avatar import resolve_profile_avatar_url
from app.services.content_blocks import convert_layout_mode_positions, effective_layout_mode
from app.services.premium_access import require_premium, user_is_premium

router = APIRouter(prefix="/content", tags=["content"])


def _serialize_profile(profile: Profile, *, is_premium: bool) -> ProfileResponse:
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
        email_capture_position=profile.email_capture_position or 0,
        announcement_enabled=profile.announcement_enabled,
        announcement_text=profile.announcement_text,
        layout_mode=profile.layout_mode or "grouped",
        theme_settings=ThemeSettings(**theme),
        is_premium=is_premium,
        created_at=profile.created_at,
        updated_at=profile.updated_at,
    )


def _email_capture_enabled(db: Session, profile: Profile) -> bool:
    user = profile.user
    if user is None or not user_is_premium(user, db):
        return False
    return bool(profile.email_capture_enabled)


@router.patch("/layout", response_model=ProfileResponse)
def update_layout_mode(
    payload: LayoutModeUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    premium: dict = Depends(get_premium_status_dep),
):
    profile = get_user_profile(current_user)
    new_mode = payload.layout_mode
    if new_mode == "freeform":
        require_premium(current_user, db)

    old_mode = (profile.layout_mode or "grouped")
    if old_mode not in ("grouped", "freeform"):
        old_mode = "grouped"
    capture_enabled = _email_capture_enabled(db, profile)

    if old_mode != new_mode:
        convert_layout_mode_positions(
            db,
            profile,
            current_user.id,
            old_mode,
            new_mode,
            capture_enabled=capture_enabled,
        )

    profile.layout_mode = new_mode
    db.commit()
    db.refresh(profile)
    return _serialize_profile(profile, is_premium=premium["is_premium"])


@router.post("/reorder", status_code=status.HTTP_204_NO_CONTENT)
def reorder_content_blocks(
    payload: ContentReorderRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    profile = get_user_profile(current_user)
    layout_mode = effective_layout_mode(profile, current_user, db)
    if layout_mode != "freeform":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unified reorder is only available in freeform layout mode.",
        )

    for item in payload.blocks:
        if item.block_type in ("link", "embed"):
            link = (
                db.query(Link)
                .filter(Link.id == item.id, Link.user_id == current_user.id)
                .first()
            )
            if not link:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid block ID")
            link.position = item.position
        elif item.block_type == "product":
            product = (
                db.query(Product)
                .filter(Product.id == item.id, Product.profile_id == profile.id)
                .first()
            )
            if not product:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid block ID")
            product.position = item.position
        elif item.block_type == "newsletter":
            if item.id != "newsletter":
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid block ID")
            profile.email_capture_position = item.position
        else:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unknown block type")

    db.commit()
