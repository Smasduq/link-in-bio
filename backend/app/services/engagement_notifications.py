"""Scheduled engagement notifications — timezone-aware morning/evening/weekly/inactivity."""

from __future__ import annotations

import logging
from datetime import date, datetime, timedelta, timezone
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.models.analytics import LinkClick, PageView
from app.models.link import Link
from app.models.notification_preferences import NotificationPreferences
from app.models.push_subscription import PushSubscription
from app.models.user import User
from app.services.notifications import has_recent_notification, notify_user

logger = logging.getLogger(__name__)

CLICK_MILESTONES = (100, 500, 1000, 5000, 10000)


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _local_now(user: User) -> datetime | None:
    if not user.timezone:
        return None
    try:
        return _utcnow().astimezone(ZoneInfo(user.timezone))
    except ZoneInfoNotFoundError:
        return None


def find_users_for_local_hour(db: Session, *, target_hour: int) -> list[User]:
    """
    Timezone-based scheduling query.

    Loads users with a stored IANA timezone who have at least one push subscription
    and engagement pushes enabled, then filters in Python to those whose LOCAL clock
    is currently `target_hour` (e.g. 8 for 8:00 AM / 8:00 PM window).

    Hourly cron should call this twice: target_hour=8 (morning) and target_hour=20 (evening).
    """
    rows = (
        db.query(User)
        .join(NotificationPreferences, NotificationPreferences.user_id == User.id)
        .join(PushSubscription, PushSubscription.user_id == User.id)
        .filter(
            User.timezone.isnot(None),
            NotificationPreferences.push_engagement_enabled.is_(True),
        )
        .options(joinedload(User.profile))
        .distinct()
        .all()
    )

    matching: list[User] = []
    for user in rows:
        local = _local_now(user)
        if local is None:
            continue
        if local.hour == target_hour:
            matching.append(user)
    return matching


def _clicks_on_date(db: Session, user_id: str, day: date) -> int:
    day_start = datetime.combine(day, datetime.min.time(), tzinfo=timezone.utc)
    day_end = day_start + timedelta(days=1)
    link_ids = [row[0] for row in db.query(Link.id).filter(Link.user_id == user_id).all()]
    if not link_ids:
        return 0
    return (
        db.query(func.count(LinkClick.id))
        .filter(
            LinkClick.link_id.in_(link_ids),
            LinkClick.clicked_at >= day_start,
            LinkClick.clicked_at < day_end,
        )
        .scalar()
        or 0
    )


def _clicks_in_range(db: Session, user_id: str, start: datetime, end: datetime) -> int:
    link_ids = [row[0] for row in db.query(Link.id).filter(Link.user_id == user_id).all()]
    if not link_ids:
        return 0
    return (
        db.query(func.count(LinkClick.id))
        .filter(LinkClick.link_id.in_(link_ids), LinkClick.clicked_at >= start, LinkClick.clicked_at < end)
        .scalar()
        or 0
    )


def _unique_visitors_in_range(db: Session, profile_id: str, start: datetime, end: datetime) -> int:
    return (
        db.query(func.count(func.distinct(PageView.visitor_hash)))
        .filter(
            PageView.profile_id == profile_id,
            PageView.viewed_at >= start,
            PageView.viewed_at < end,
            PageView.visitor_hash.isnot(None),
        )
        .scalar()
        or 0
    )


def send_morning_notifications(db: Session) -> int:
    sent = 0
    for user in find_users_for_local_hour(db, target_hour=8):
        local = _local_now(user)
        if local is None:
            continue
        if user.last_morning_notification_date == local.date():
            continue

        yesterday = local.date() - timedelta(days=1)
        clicks = _clicks_on_date(db, user.id, yesterday)
        notify_user(
            db,
            user.id,
            "good_morning",
            {"clicks": clicks, "period_label": "yesterday"},
        )
        user.last_morning_notification_date = local.date()
        db.add(user)
        sent += 1
    return sent


def send_evening_notifications(db: Session) -> int:
    sent = 0
    for user in find_users_for_local_hour(db, target_hour=20):
        local = _local_now(user)
        if local is None:
            continue
        if user.last_evening_notification_date == local.date():
            continue

        clicks = _clicks_on_date(db, user.id, local.date())
        notify_user(
            db,
            user.id,
            "good_evening",
            {"clicks": clicks, "period_label": "today"},
        )
        user.last_evening_notification_date = local.date()
        db.add(user)
        sent += 1
    return sent


def send_weekly_summaries(db: Session) -> int:
    """Send once per user on Monday ~9 AM local."""
    sent = 0
    for user in find_users_for_local_hour(db, target_hour=9):
        local = _local_now(user)
        if local is None or local.weekday() != 0:
            continue
        if user.last_weekly_summary_date == local.date():
            continue

        week_end = datetime.combine(local.date(), datetime.min.time(), tzinfo=local.tzinfo)
        week_start = week_end - timedelta(days=7)
        clicks = _clicks_in_range(db, user.id, week_start.astimezone(timezone.utc), week_end.astimezone(timezone.utc))
        visitors = 0
        if user.profile:
            visitors = _unique_visitors_in_range(
                db, user.profile.id, week_start.astimezone(timezone.utc), week_end.astimezone(timezone.utc)
            )

        notify_user(
            db,
            user.id,
            "weekly_summary",
            {"clicks": clicks, "visitors": visitors},
        )
        user.last_weekly_summary_date = local.date()
        db.add(user)
        sent += 1
    return sent


def send_inactivity_nudges(db: Session) -> int:
    """Users inactive 7+ days, max one nudge per week."""
    cutoff = _utcnow() - timedelta(days=7)
    sent = 0
    rows = (
        db.query(User)
        .join(NotificationPreferences, NotificationPreferences.user_id == User.id)
        .join(PushSubscription, PushSubscription.user_id == User.id)
        .filter(
            NotificationPreferences.push_engagement_enabled.is_(True),
            User.last_login_at.isnot(None),
            User.last_login_at < cutoff,
        )
        .distinct()
        .all()
    )

    for user in rows:
        if has_recent_notification(db, user_id=user.id, notification_type="inactivity_nudge", within_hours=168):
            continue
        if user.last_inactivity_nudge_at and (_utcnow() - user.last_inactivity_nudge_at).days < 7:
            continue

        notify_user(db, user.id, "inactivity_nudge", {})
        user.last_inactivity_nudge_at = _utcnow()
        db.add(user)
        sent += 1
    return sent


def check_click_milestone(db: Session, user_id: str) -> None:
    """Fire milestone notification when total link clicks cross a threshold."""
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        return

    total = (
        db.query(func.coalesce(func.sum(Link.click_count), 0))
        .filter(Link.user_id == user_id)
        .scalar()
        or 0
    )
    total = int(total)

    next_milestone = None
    for threshold in CLICK_MILESTONES:
        if total >= threshold and user.clicks_milestone_sent < threshold:
            next_milestone = threshold
            break

    if next_milestone is None:
        return

    notify_user(db, user_id, "milestone_clicks", {"total_clicks": next_milestone})
    user.clicks_milestone_sent = next_milestone
    db.add(user)


def run_engagement_cron(db: Session) -> dict[str, int]:
    """Hourly entry point — run all scheduled engagement sends."""
    return {
        "morning": send_morning_notifications(db),
        "evening": send_evening_notifications(db),
        "weekly": send_weekly_summaries(db),
        "inactivity": send_inactivity_nudges(db),
    }
