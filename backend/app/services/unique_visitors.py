from datetime import datetime, timedelta, timezone

from sqlalchemy import Date, cast, func
from sqlalchemy.orm import Session

from app.config import settings
from app.models.analytics import PageView
from app.schemas.analytics import UniqueVisitorsByDay

_is_sqlite = settings.sqlalchemy_database_url.startswith("sqlite")


def _utc_viewed_date_expr():
    """Extract UTC calendar date from viewed_at for grouping."""
    if _is_sqlite:
        return func.strftime("%Y-%m-%d", PageView.viewed_at)
    return cast(func.timezone("UTC", PageView.viewed_at), Date)


def get_unique_visitors_total(db: Session, profile_id: str) -> int:
    return (
        db.query(func.count(func.distinct(PageView.visitor_hash)))
        .filter(
            PageView.profile_id == profile_id,
            PageView.visitor_hash.isnot(None),
        )
        .scalar()
        or 0
    )


def get_unique_visitors_by_day(db: Session, profile_id: str, days: int = 30) -> list[UniqueVisitorsByDay]:
    range_start = (datetime.now(timezone.utc) - timedelta(days=days - 1)).replace(
        hour=0, minute=0, second=0, microsecond=0
    )
    day_expr = _utc_viewed_date_expr()

    rows = (
        db.query(day_expr.label("view_date"), func.count(func.distinct(PageView.visitor_hash)))
        .filter(
            PageView.profile_id == profile_id,
            PageView.viewed_at >= range_start,
            PageView.visitor_hash.isnot(None),
        )
        .group_by(day_expr)
        .all()
    )

    counts_by_date = {str(row.view_date): row[1] for row in rows}

    result: list[UniqueVisitorsByDay] = []
    for offset in range(days):
        day = range_start + timedelta(days=offset)
        date_key = day.date().isoformat()
        result.append(
            UniqueVisitorsByDay(date=date_key, unique_visitors=counts_by_date.get(date_key, 0))
        )
    return result
