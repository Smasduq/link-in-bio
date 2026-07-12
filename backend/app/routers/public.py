from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models.analytics import PageView
from app.models.link import Link
from app.models.profile import Profile
from app.schemas.analytics import TrackClickRequest, TrackViewRequest
from app.schemas.link import LinkResponse
from app.schemas.profile import PublicProfileResponse, ThemeSettings
from app.services.click_context import get_client_ip, hash_visitor_ip, parse_device_type
from app.services.click_tracking import record_link_click
from app.services.geoip import lookup_country_code

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


def _record_page_view(db: Session, profile: Profile, request: Request, referrer: str | None) -> None:
    user_agent = request.headers.get("user-agent")
    client_ip = get_client_ip(request)

    db.add(
        PageView(
            profile_id=profile.id,
            referrer=referrer,
            user_agent=user_agent[:500] if user_agent else None,
            device_type=parse_device_type(user_agent),
            country=lookup_country_code(client_ip),
            visitor_hash=hash_visitor_ip(client_ip, user_agent, settings.secret_key),
        )
    )
    db.commit()


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
def track_page_view(
    username: str,
    payload: TrackViewRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    profile = db.query(Profile).filter(Profile.username == username.lower()).first()
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found")

    _record_page_view(db, profile, request, payload.referrer)


@router.post("/links/{link_id}/click", status_code=status.HTTP_204_NO_CONTENT)
def track_link_click_public(
    link_id: str,
    payload: TrackClickRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    record_link_click(db, link_id, request, payload.referrer)
