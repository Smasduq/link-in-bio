from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user, get_user_profile
from app.models.analytics import LinkClick, PageView
from app.models.link import Link
from app.models.profile import Profile
from app.models.user import User
from app.schemas.analytics import (
    AnalyticsOverview,
    AnalyticsResponse,
    DailyStat,
    LinkAnalytics,
    TrackClickRequest,
    TrackViewRequest,
)
from app.schemas.link import LinkResponse
from app.schemas.profile import PublicProfileResponse, ThemeSettings

router = APIRouter(prefix="/public", tags=["public"])


class PublicPageResponse(PublicProfileResponse):
    links: list[LinkResponse]


def _serialize_public_profile(profile: Profile, links: list[Link]) -> PublicPageResponse:
    theme = profile.theme_settings or {}
    return PublicPageResponse(
        username=profile.username,
        full_name=profile.full_name,
        bio=profile.bio,
        avatar_url=profile.avatar_url,
        theme_settings=ThemeSettings(**theme),
        links=[LinkResponse.model_validate(link) for link in links],
    )


@router.get("/{username}", response_model=PublicPageResponse)
def get_public_profile(username: str, db: Session = Depends(get_db)):
    profile = db.query(Profile).filter(Profile.username == username.lower()).first()
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found")

    links = (
        db.query(Link)
        .filter(Link.user_id == profile.user_id, Link.is_active.is_(True))
        .order_by(Link.position.asc(), Link.created_at.asc())
        .all()
    )
    return _serialize_public_profile(profile, links)


@router.post("/{username}/view", status_code=status.HTTP_204_NO_CONTENT)
def track_page_view(username: str, payload: TrackViewRequest, db: Session = Depends(get_db)):
    profile = db.query(Profile).filter(Profile.username == username.lower()).first()
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found")

    db.add(
        PageView(
            profile_id=profile.id,
            referrer=payload.referrer,
            user_agent=payload.user_agent,
        )
    )
    db.commit()


@router.post("/links/{link_id}/click", status_code=status.HTTP_204_NO_CONTENT)
def track_link_click(link_id: str, payload: TrackClickRequest, db: Session = Depends(get_db)):
    link = db.query(Link).filter(Link.id == link_id, Link.is_active.is_(True)).first()
    if not link:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Link not found")

    link.click_count += 1
    db.add(
        LinkClick(
            link_id=link.id,
            referrer=payload.referrer,
            user_agent=payload.user_agent,
        )
    )
    db.commit()
