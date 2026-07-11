from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.link import Link
from app.models.user import User
from app.schemas.link import LinkCreate, LinkReorderRequest, LinkResponse, LinkUpdate
from app.schemas.analytics import TrackClickRequest
from app.services.auth import get_favicon_url
from app.services.click_tracking import record_link_click

router = APIRouter(prefix="/links", tags=["links"])


@router.post("/{link_id}/click", status_code=status.HTTP_204_NO_CONTENT)
def track_link_click(link_id: str, payload: TrackClickRequest, db: Session = Depends(get_db)):
    """Public click tracking — no auth; increments click_count and logs referrer + timestamp."""
    record_link_click(db, link_id, payload.referrer)


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
    max_position = (
        db.query(Link.position)
        .filter(Link.user_id == current_user.id)
        .order_by(Link.position.desc())
        .first()
    )
    next_position = (max_position[0] + 1) if max_position else 0

    url = payload.url.strip()
    if not url.startswith(("http://", "https://")):
        url = f"https://{url}"

    link = Link(
        user_id=current_user.id,
        title=payload.title.strip(),
        url=url,
        icon=get_favicon_url(url),
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
    if "url" in updates and updates["url"]:
        url = updates["url"].strip()
        if not url.startswith(("http://", "https://")):
            url = f"https://{url}"
        updates["url"] = url
        if "icon" not in updates:
            updates["icon"] = get_favicon_url(url)

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
