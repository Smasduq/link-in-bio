from datetime import datetime

from pydantic import BaseModel


class AnalyticsOverview(BaseModel):
    total_page_views: int
    total_link_clicks: int
    views_last_7_days: int
    clicks_last_7_days: int


class LinkAnalytics(BaseModel):
    id: str
    title: str
    url: str
    click_count: int
    clicks_last_7_days: int
    is_active: bool


class DailyStat(BaseModel):
    date: str
    page_views: int
    link_clicks: int


class AnalyticsResponse(BaseModel):
    overview: AnalyticsOverview
    links: list[LinkAnalytics]
    daily_stats: list[DailyStat]


class TrackViewRequest(BaseModel):
    referrer: str | None = None


class TrackClickRequest(BaseModel):
    referrer: str | None = None
