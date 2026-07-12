from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user, get_user_profile
from app.models.analytics import LinkClick, PageView
from app.models.link import Link
from app.models.user import User
from app.schemas.analytics import AnalyticsOverview, AnalyticsResponse, DailyStat, LinkAnalytics, VisitorInsights
from app.services.premium_access import (
    FREE_ANALYTICS_HISTORY_DAYS,
    PREMIUM_ANALYTICS_HISTORY_DAYS,
    empty_visitor_insights,
    user_is_premium,
)
from app.services.unique_visitors import get_unique_visitors_by_day, get_unique_visitors_total
from app.services.visitor_insights import get_visitor_insights

router = APIRouter(prefix="/analytics", tags=["analytics"])


def _day_bounds(days_ago: int) -> tuple[datetime, datetime]:
    day_start = (datetime.now(timezone.utc) - timedelta(days=days_ago)).replace(
        hour=0, minute=0, second=0, microsecond=0
    )
    return day_start, day_start + timedelta(days=1)


@router.get("", response_model=AnalyticsResponse)
def get_analytics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    profile = get_user_profile(current_user)
    is_premium = user_is_premium(current_user, db)
    seven_days_ago = datetime.now(timezone.utc) - timedelta(days=7)
    today_start, today_end = _day_bounds(0)

    total_page_views = (
        db.query(func.count(PageView.id)).filter(PageView.profile_id == profile.id).scalar() or 0
    )
    views_last_7_days = (
        db.query(func.count(PageView.id))
        .filter(PageView.profile_id == profile.id, PageView.viewed_at >= seven_days_ago)
        .scalar()
        or 0
    )
    views_today = (
        db.query(func.count(PageView.id))
        .filter(
            PageView.profile_id == profile.id,
            PageView.viewed_at >= today_start,
            PageView.viewed_at < today_end,
        )
        .scalar()
        or 0
    )

    links = (
        db.query(Link)
        .filter(Link.user_id == current_user.id)
        .order_by(Link.position.asc())
        .all()
    )
    link_ids = [link.id for link in links]

    total_link_clicks = sum(link.click_count for link in links)

    clicks_last_7_days = 0
    clicks_today = 0
    if link_ids:
        clicks_last_7_days = (
            db.query(func.count(LinkClick.id))
            .filter(LinkClick.link_id.in_(link_ids), LinkClick.clicked_at >= seven_days_ago)
            .scalar()
            or 0
        )
        clicks_today = (
            db.query(func.count(LinkClick.id))
            .filter(
                LinkClick.link_id.in_(link_ids),
                LinkClick.clicked_at >= today_start,
                LinkClick.clicked_at < today_end,
            )
            .scalar()
            or 0
        )

    recent_since = seven_days_ago if is_premium else today_start

    link_analytics: list[LinkAnalytics] = []
    for link in links:
        recent_clicks = (
            db.query(func.count(LinkClick.id))
            .filter(LinkClick.link_id == link.id, LinkClick.clicked_at >= recent_since)
            .scalar()
            or 0
        )
        link_analytics.append(
            LinkAnalytics(
                id=link.id,
                title=link.title,
                url=link.url,
                click_count=link.click_count,
                clicks_last_7_days=recent_clicks,
                is_active=link.is_active,
            )
        )

    link_analytics.sort(key=lambda item: item.click_count, reverse=True)

    history_days = PREMIUM_ANALYTICS_HISTORY_DAYS if is_premium else FREE_ANALYTICS_HISTORY_DAYS
    daily_stats: list[DailyStat] = []
    for days_ago in range(history_days - 1, -1, -1):
        day_start, day_end = _day_bounds(days_ago)

        day_views = (
            db.query(func.count(PageView.id))
            .filter(
                PageView.profile_id == profile.id,
                PageView.viewed_at >= day_start,
                PageView.viewed_at < day_end,
            )
            .scalar()
            or 0
        )

        day_clicks = 0
        if link_ids:
            day_clicks = (
                db.query(func.count(LinkClick.id))
                .filter(
                    LinkClick.link_id.in_(link_ids),
                    LinkClick.clicked_at >= day_start,
                    LinkClick.clicked_at < day_end,
                )
                .scalar()
                or 0
            )

        daily_stats.append(
            DailyStat(
                date=day_start.strftime("%Y-%m-%d"),
                page_views=day_views,
                link_clicks=day_clicks,
            )
        )

    empty_insights = empty_visitor_insights()
    visitor_insights = (
        get_visitor_insights(db, current_user.id, profile.id)
        if is_premium
        else VisitorInsights(**empty_insights)
    )

    return AnalyticsResponse(
        overview=AnalyticsOverview(
            total_page_views=total_page_views,
            total_link_clicks=total_link_clicks,
            views_last_7_days=views_last_7_days if is_premium else views_today,
            clicks_last_7_days=clicks_last_7_days if is_premium else clicks_today,
            unique_visitors_total=get_unique_visitors_total(db, profile.id) if is_premium else 0,
            unique_visitors_by_day=get_unique_visitors_by_day(db, profile.id) if is_premium else [],
        ),
        links=link_analytics,
        daily_stats=daily_stats,
        visitor_insights=visitor_insights,
    )
