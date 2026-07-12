from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user, require_active_premium
from app.models.link import Link
from app.models.user import User
from app.dependencies import get_user_profile
from app.schemas.analytics import LinkClickInsights, TrackClickRequest
from app.schemas.link import (
    EmbedDetectRequest,
    EmbedDetectResponse,
    LinkCreate,
    LinkReorderRequest,
    LinkResponse,
    LinkUpdate,
)
from app.services.auth import get_favicon_url
from app.services.click_tracking import get_link_click_insights, record_link_click
from app.services.premium_access import require_premium, user_is_premium
from app.services.content_blocks import EMBED_TYPES, effective_layout_mode, next_block_position
from app.services.embed_links import (
    default_embed_title,
    detect_embed_type,
    normalize_link_url,
    parse_spotify_url,
    parse_youtube_url,
)

router = APIRouter(prefix="/links", tags=["links"])


def _resolve_create_type(payload: LinkCreate) -> str:
    if payload.type and payload.type != "link":
        return payload.type
    detected = detect_embed_type(payload.url)
    return detected or "link"


def _prepare_link_fields(link_type: str, raw_url: str, title: str | None) -> tuple[str, str, str | None]:
    url = normalize_link_url(link_type, raw_url)
    if link_type == "link":
        resolved_title = (title or "").strip()
    else:
        resolved_title = (title or "").strip() or default_embed_title(link_type, raw_url)
    icon = None if link_type != "link" else get_favicon_url(url)
    return resolved_title, url, icon


@router.post("/detect-embed", response_model=EmbedDetectResponse)
def detect_embed(payload: EmbedDetectRequest, current_user: User = Depends(get_current_user)):
    """Validate a pasted YouTube/Spotify URL and return detected embed metadata."""
    del current_user
    detected = detect_embed_type(payload.url)
    if detected == "youtube_embed":
        parsed = parse_youtube_url(payload.url)
        return EmbedDetectResponse(
            type=detected,
            title_suggestion=default_embed_title(detected, payload.url),
            embed_src=parsed["embed_src"],
            canonical_url=parsed["canonical_url"],
        )
    if detected == "spotify_embed":
        parsed = parse_spotify_url(payload.url)
        return EmbedDetectResponse(
            type=detected,
            title_suggestion=default_embed_title(detected, payload.url),
            embed_src=parsed["embed_src"],
            canonical_url=parsed["canonical_url"],
        )
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Paste a valid YouTube or Spotify URL.",
    )


@router.post("/{link_id}/click", status_code=status.HTTP_204_NO_CONTENT)
def track_link_click(
    link_id: str,
    payload: TrackClickRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    """Public click tracking — no auth; logs referrer, device, country, and hashed visitor id."""
    link = db.query(Link).filter(Link.id == link_id).first()
    if link and link.type != "link":
        return None
    record_link_click(db, link_id, request, payload.referrer)


@router.get("/{link_id}/insights", response_model=LinkClickInsights)
def link_click_insights(
    link_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_active_premium),
):
    """Owner-only aggregated click insights for a single link (Pro)."""
    return get_link_click_insights(db, link_id, current_user.id)


@router.get("", response_model=list[LinkResponse])
def list_links(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    links = (
        db.query(Link)
        .filter(Link.user_id == current_user.id)
        .order_by(Link.position.asc(), Link.created_at.asc())
        .all()
    )
    return links


@router.post("", response_model=LinkResponse, status_code=status.HTTP_201_CREATED)
def create_link(
    payload: LinkCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    profile = get_user_profile(current_user)
    link_type = _resolve_create_type(payload)
    layout_mode = effective_layout_mode(profile, current_user, db)
    capture_enabled = bool(profile.email_capture_enabled and user_is_premium(current_user, db))
    block_type = "embed" if link_type in EMBED_TYPES else "link"
    next_position = next_block_position(
        db,
        profile,
        current_user.id,
        block_type,
        layout_mode=layout_mode,
        capture_enabled=capture_enabled,
    )

    title, url, icon = _prepare_link_fields(link_type, payload.url, payload.title)
    if link_type == "link" and not title:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Title is required.")

    link = Link(
        user_id=current_user.id,
        title=title,
        url=url,
        icon=icon,
        type=link_type,
        position=next_position,
    )
    db.add(link)
    db.commit()
    db.refresh(link)
    return link


@router.patch("/{link_id}", response_model=LinkResponse)
def update_link(
    link_id: str,
    payload: LinkUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    link = db.query(Link).filter(Link.id == link_id, Link.user_id == current_user.id).first()
    if not link:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Link not found")

    updates = payload.model_dump(exclude_unset=True)
    next_type = updates.get("type", link.type)

    if updates.get("is_featured") is True:
        require_premium(current_user, db)

    if "url" in updates and updates["url"]:
        title = updates.get("title", link.title)
        resolved_title, url, icon = _prepare_link_fields(next_type, updates["url"], title)
        updates["url"] = url
        updates["title"] = resolved_title
        updates["icon"] = icon

    if "type" in updates and updates["type"] != "link" and "url" not in updates:
        resolved_title, url, icon = _prepare_link_fields(updates["type"], link.url, updates.get("title", link.title))
        updates["url"] = url
        updates["title"] = resolved_title
        updates["icon"] = icon

    for key, value in updates.items():
        setattr(link, key, value)

    db.commit()
    db.refresh(link)
    return link


@router.delete("/{link_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_link(
    link_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    link = db.query(Link).filter(Link.id == link_id, Link.user_id == current_user.id).first()
    if not link:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Link not found")
    db.delete(link)
    db.commit()


@router.post("/reorder", response_model=list[LinkResponse])
def reorder_links(
    payload: LinkReorderRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    link_ids = [item.id for item in payload.links]
    links = (
        db.query(Link)
        .filter(Link.user_id == current_user.id, Link.id.in_(link_ids))
        .all()
    )

    if len(links) != len(link_ids):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid link IDs")

    position_map = {item.id: item.position for item in payload.links}
    for link in links:
        link.position = position_map[link.id]

    db.commit()
    return (
        db.query(Link)
        .filter(Link.user_id == current_user.id)
        .order_by(Link.position.asc(), Link.created_at.asc())
        .all()
    )
