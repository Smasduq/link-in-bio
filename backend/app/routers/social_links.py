from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user, get_user_profile
from app.models.user import User
from app.schemas.social_link import SocialLinkItem, SocialLinksUpdate
from app.services.social_links import validate_social_links

router = APIRouter(prefix="/social-links", tags=["social-links"])


def _serialize_links(raw_links: list | None) -> list[SocialLinkItem]:
    if not raw_links:
        return []
    ordered = sorted(raw_links, key=lambda item: item.get("position", 0))
    return [SocialLinkItem(**item) for item in ordered]


@router.get("", response_model=list[SocialLinkItem])
def list_social_links(current_user: User = Depends(get_current_user)):
    profile = get_user_profile(current_user)
    return _serialize_links(profile.social_links)


@router.put("", response_model=list[SocialLinkItem])
def replace_social_links(
    payload: SocialLinksUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    profile = get_user_profile(current_user)
    profile.social_links = validate_social_links(payload.links)
    db.commit()
    db.refresh(profile)
    return _serialize_links(profile.social_links)
