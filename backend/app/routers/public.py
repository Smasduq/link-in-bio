from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session, joinedload

from app.config import settings
from app.database import get_db
from app.models.analytics import PageView
from app.models.link import Link
from app.models.profile import Profile
from app.schemas.analytics import TrackClickRequest, TrackViewRequest
from app.schemas.link import LinkResponse
from app.models.product import Product
from app.schemas.product import PublicProductResponse
from app.schemas.profile import PublicProfileResponse, ThemeSettings
from app.services.cloudinary_storage import build_public_image_url
from app.services.fee_pricing import calculate_fee_inclusive_amount
from app.schemas.social_link import SocialLinkItem
from app.services.click_context import get_client_ip, hash_visitor_ip, parse_device_type
from app.services.click_tracking import record_link_click
from app.services.avatar import resolve_profile_avatar_url
from app.services.billing import get_current_user_premium_status
from app.services.geoip import lookup_country_code

router = APIRouter(prefix="/public", tags=["public"])


class PublicPageResponse(PublicProfileResponse):
    links: list[LinkResponse]
    products: list[PublicProductResponse] = []


def _serialize_public_product(product: Product) -> PublicProductResponse:
    pricing = calculate_fee_inclusive_amount(float(product.price))
    cover_url = None
    if product.cover_image_public_id:
        cover_url = build_public_image_url(
            product.cover_image_public_id,
            version=product.cover_image_version,
        )
    return PublicProductResponse(
        id=product.id,
        title=product.title,
        description=product.description,
        price=product.price,
        total_charge=pricing["total_charge"],
        cover_image_url=cover_url,
        file_name=product.file_name,
    )


def _serialize_social_links(raw_links: list | None) -> list[SocialLinkItem]:
    if not raw_links:
        return []
    ordered = sorted(raw_links, key=lambda item: item.get("position", 0))
    return [SocialLinkItem(**item) for item in ordered]


def _public_email_capture(db: Session, profile: Profile) -> tuple[bool, str | None]:
    user = profile.user
    if user is None:
        return False, None
    if not get_current_user_premium_status(user, db)["is_premium"]:
        return False, None
    if not profile.email_capture_enabled:
        return False, None
    heading = (profile.email_capture_heading or "Join my newsletter").strip()
    return True, heading or "Join my newsletter"


def _public_announcement(profile: Profile) -> str | None:
    if not profile.announcement_enabled:
        return None
    text = (profile.announcement_text or "").strip()
    return text or None


def _serialize_public_profile(db: Session, profile: Profile, links: list[Link], products: list[Product]) -> PublicPageResponse:
    theme = profile.theme_settings or {}
    capture_enabled, capture_heading = _public_email_capture(db, profile)
    return PublicPageResponse(
        username=profile.username,
        full_name=profile.full_name,
        bio=profile.bio,
        avatar_url=resolve_profile_avatar_url(profile),
        social_links=_serialize_social_links(profile.social_links),
        email_capture_enabled=capture_enabled,
        email_capture_heading=capture_heading if capture_enabled else None,
        announcement_text=_public_announcement(profile),
        theme_settings=ThemeSettings(**theme),
        links=[LinkResponse.model_validate(link) for link in links],
        products=[_serialize_public_product(product) for product in products],
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
    profile = (
        db.query(Profile)
        .options(joinedload(Profile.user))
        .filter(Profile.username == username.lower())
        .first()
    )
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found")

    links = (
        db.query(Link)
        .filter(Link.user_id == profile.user_id, Link.is_active.is_(True))
        .order_by(Link.position.asc(), Link.created_at.asc())
        .all()
    )
    products = (
        db.query(Product)
        .filter(Product.profile_id == profile.id, Product.is_active.is_(True))
        .order_by(Product.created_at.desc())
        .all()
    )
    return _serialize_public_profile(db, profile, links, products)


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
