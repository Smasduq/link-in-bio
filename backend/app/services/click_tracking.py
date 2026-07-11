from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.analytics import LinkClick
from app.models.link import Link


def record_link_click(db: Session, link_id: str, referrer: str | None) -> None:
    """Increment link click_count and append an anonymous click log (referrer + timestamp only)."""
    link = db.query(Link).filter(Link.id == link_id, Link.is_active.is_(True)).first()
    if not link:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Link not found")

    link.click_count += 1
    db.add(LinkClick(link_id=link.id, referrer=referrer, user_agent=None))
    db.commit()
