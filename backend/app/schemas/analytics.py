from datetime import datetime

from pydantic import BaseModel


class UniqueVisitorsByDay(BaseModel):
    date: str
    unique_visitors: int


class AnalyticsOverview(BaseModel):
    total_page_views: int
    total_link_clicks: int
    views_last_7_days: int
    clicks_last_7_days: int
    unique_visitors_total: int
    unique_visitors_by_day: list[UniqueVisitorsByDay]


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


class InsightBucket(BaseModel):
    label: str
    count: int
    pct: float


class VisitorInsights(BaseModel):
    top_regions: list[InsightBucket]
    top_devices: list[InsightBucket]
    most_active_time: list[InsightBucket]


class AnalyticsResponse(BaseModel):
    overview: AnalyticsOverview
    links: list[LinkAnalytics]
    daily_stats: list[DailyStat]
    visitor_insights: VisitorInsights


class TrackViewRequest(BaseModel):
    referrer: str | None = None


class TrackClickRequest(BaseModel):
    referrer: str | None = None


class ClickCountByReferrer(BaseModel):
    referrer: str
    count: int


class ClickCountByDevice(BaseModel):
    device: str
    count: int


class ClickCountByDay(BaseModel):
    date: str
    count: int


class LinkClickInsights(BaseModel):
    total_clicks: int
    clicks_by_referrer: list[ClickCountByReferrer]
    clicks_by_device: list[ClickCountByDevice]
    clicks_by_day: list[ClickCountByDay]
