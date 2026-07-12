from __future__ import annotations

from collections.abc import Callable
from collections import defaultdict
from datetime import datetime, timezone

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.analytics import LinkClick, PageView
from app.models.link import Link
from app.schemas.analytics import InsightBucket, VisitorInsights

_COUNTRY_NAMES: dict[str, str] = {
    "US": "United States",
    "NG": "Nigeria",
    "GB": "United Kingdom",
    "CA": "Canada",
    "DE": "Germany",
    "FR": "France",
    "IN": "India",
    "AU": "Australia",
    "BR": "Brazil",
    "ZA": "South Africa",
    "GH": "Ghana",
    "KE": "Kenya",
}

_DEVICE_LABELS: dict[str, str] = {
    "mobile": "Mobile",
    "desktop": "Desktop",
    "tablet": "Tablet",
}

_TIME_LABELS: dict[str, str] = {
    "morning": "Morning",
    "afternoon": "Afternoon",
    "evening": "Evening",
}


def _country_flag(code: str) -> str:
    code = code.upper()
    if len(code) != 2 or not code.isalpha():
        return ""
    return "".join(chr(ord(char) + 127397) for char in code)


def format_region_label(code: str) -> str:
    name = _COUNTRY_NAMES.get(code.upper(), code.upper())
    flag = _country_flag(code)
    return f"{flag} {name}".strip()


def time_of_day_bucket(dt: datetime) -> str:
    """Bucket a timestamp into morning/afternoon/evening using UTC."""
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    hour = dt.astimezone(timezone.utc).hour
    if 6 <= hour < 12:
        return "morning"
    if 12 <= hour < 18:
        return "afternoon"
    return "evening"


def _to_pct_buckets(
    counts: dict[str, int],
    label_fn: Callable[[str], str],
    *,
    top_n: int = 3,
    default_keys: list[str] | None = None,
) -> list[InsightBucket]:
    total = sum(counts.values())
    if total == 0:
        return []

    keys = sorted(counts, key=lambda key: counts[key], reverse=True)
    if default_keys:
        for key in default_keys:
            if key not in keys:
                keys.append(key)

    buckets: list[InsightBucket] = []
    for key in keys[:top_n]:
        count = counts.get(key, 0)
        pct = round((count / total) * 100)
        buckets.append(InsightBucket(label=label_fn(key), count=count, pct=pct))

    return buckets


def get_visitor_insights(db: Session, user_id: str, profile_id: str) -> VisitorInsights:
    link_ids = [
        row[0]
        for row in db.query(Link.id).filter(Link.user_id == user_id).all()
    ]

    region_counts: dict[str, int] = defaultdict(int)
    device_counts: dict[str, int] = defaultdict(int)
    time_counts: dict[str, int] = defaultdict(int)

    if link_ids:
        country_rows = (
            db.query(LinkClick.country, func.count(LinkClick.id))
            .filter(LinkClick.link_id.in_(link_ids), LinkClick.country.isnot(None))
            .group_by(LinkClick.country)
            .all()
        )
        for country, count in country_rows:
            if country:
                region_counts[country.upper()] += count

        device_rows = (
            db.query(LinkClick.device_type, func.count(LinkClick.id))
            .filter(LinkClick.link_id.in_(link_ids))
            .group_by(LinkClick.device_type)
            .all()
        )
        for device, count in device_rows:
            device_counts[(device or "desktop").lower()] += count

        click_times = (
            db.query(LinkClick.clicked_at)
            .filter(LinkClick.link_id.in_(link_ids), LinkClick.clicked_at.isnot(None))
            .all()
        )
        for (clicked_at,) in click_times:
            if clicked_at:
                time_counts[time_of_day_bucket(clicked_at)] += 1

    page_country_rows = (
        db.query(PageView.country, func.count(PageView.id))
        .filter(PageView.profile_id == profile_id, PageView.country.isnot(None))
        .group_by(PageView.country)
        .all()
    )
    for country, count in page_country_rows:
        if country:
            region_counts[country.upper()] += count

    page_device_rows = (
        db.query(PageView.device_type, func.count(PageView.id))
        .filter(PageView.profile_id == profile_id)
        .group_by(PageView.device_type)
        .all()
    )
    for device, count in page_device_rows:
        device_counts[(device or "desktop").lower()] += count

    view_times = (
        db.query(PageView.viewed_at)
        .filter(PageView.profile_id == profile_id, PageView.viewed_at.isnot(None))
        .all()
    )
    for (viewed_at,) in view_times:
        if viewed_at:
            time_counts[time_of_day_bucket(viewed_at)] += 1

    return VisitorInsights(
        top_regions=_to_pct_buckets(region_counts, format_region_label),
        top_devices=_to_pct_buckets(
            device_counts,
            lambda key: _DEVICE_LABELS.get(key, key.title()),
            default_keys=["mobile", "desktop", "tablet"],
        ),
        most_active_time=_to_pct_buckets(
            time_counts,
            lambda key: _TIME_LABELS.get(key, key.title()),
            default_keys=["morning", "afternoon", "evening"],
        ),
    )
