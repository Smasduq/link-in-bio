from collections import defaultdict
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, Request, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.config import settings
from app.models.analytics import LinkClick
from app.models.link import Link
from app.schemas.analytics import (
    ClickCountByDay,
    ClickCountByDevice,
    ClickCountByReferrer,
    LinkClickInsights,
)
from app.services.click_context import (
    get_client_ip,
    hash_visitor_ip,
    normalize_referrer,
    parse_device_type,
)
from app.services.geoip import lookup_country_code


def record_link_click(
    db: Session,
    link_id: str,
    request: Request,
    body_referrer: str | None = None,
) -> None:
    """Increment link click_count and append an anonymous click log."""
    link = db.query(Link).filter(Link.id == link_id, Link.is_active.is_(True)).first()
    if not link:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Link not found")

    referer_header = request.headers.get("referer")
    user_agent = request.headers.get("user-agent")
    client_ip = get_client_ip(request)

    link.click_count += 1
    db.add(
        LinkClick(
            link_id=link.id,
            referrer=normalize_referrer(referer_header, body_referrer),
            user_agent=user_agent[:500] if user_agent else None,
            device_type=parse_device_type(user_agent),
            country=lookup_country_code(client_ip),
            visitor_hash=hash_visitor_ip(client_ip, user_agent, settings.secret_key),
        )
    )
    db.commit()

    try:
        from app.services.engagement_notifications import check_click_milestone

        check_click_milestone(db, link.user_id)
        db.commit()
    except Exception:
        db.rollback()


def get_link_click_insights(db: Session, link_id: str, user_id: str) -> LinkClickInsights:
    link = db.query(Link).filter(Link.id == link_id, Link.user_id == user_id).first()
    if not link:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Link not found")

    total_clicks = (
        db.query(func.count(LinkClick.id)).filter(LinkClick.link_id == link_id).scalar() or 0
    )

    referrer_rows = (
        db.query(LinkClick.referrer, func.count(LinkClick.id))
        .filter(LinkClick.link_id == link_id)
        .group_by(LinkClick.referrer)
        .order_by(func.count(LinkClick.id).desc())
        .all()
    )
    clicks_by_referrer = [
        ClickCountByReferrer(referrer=row[0] or "direct", count=row[1]) for row in referrer_rows
    ]

    device_rows = (
        db.query(LinkClick.device_type, func.count(LinkClick.id))
        .filter(LinkClick.link_id == link_id)
        .group_by(LinkClick.device_type)
        .order_by(func.count(LinkClick.id).desc())
        .all()
    )
    clicks_by_device = [
        ClickCountByDevice(device=row[0] or "desktop", count=row[1]) for row in device_rows
    ]

    thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=29)
    thirty_days_ago = thirty_days_ago.replace(hour=0, minute=0, second=0, microsecond=0)

    recent_clicks = (
        db.query(LinkClick.clicked_at)
        .filter(LinkClick.link_id == link_id, LinkClick.clicked_at >= thirty_days_ago)
        .all()
    )

    counts_by_date: dict[str, int] = defaultdict(int)
    for (clicked_at,) in recent_clicks:
        if clicked_at is None:
            continue
        if clicked_at.tzinfo is None:
            clicked_at = clicked_at.replace(tzinfo=timezone.utc)
        counts_by_date[clicked_at.astimezone(timezone.utc).date().isoformat()] += 1

    clicks_by_day: list[ClickCountByDay] = []
    for offset in range(30):
        day_start = thirty_days_ago + timedelta(days=offset)
        date_key = day_start.date().isoformat()
        clicks_by_day.append(
            ClickCountByDay(date=date_key, count=counts_by_date.get(date_key, 0))
        )

    return LinkClickInsights(
        total_clicks=total_clicks,
        clicks_by_referrer=clicks_by_referrer,
        clicks_by_device=clicks_by_device,
        clicks_by_day=clicks_by_day,
    )
