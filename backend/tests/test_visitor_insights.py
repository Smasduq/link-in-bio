from datetime import datetime, timezone

from app.services.visitor_insights import format_region_label, time_of_day_bucket


def test_time_of_day_bucket_morning():
    dt = datetime(2026, 7, 12, 9, 0, tzinfo=timezone.utc)
    assert time_of_day_bucket(dt) == "morning"


def test_time_of_day_bucket_afternoon():
    dt = datetime(2026, 7, 12, 14, 0, tzinfo=timezone.utc)
    assert time_of_day_bucket(dt) == "afternoon"


def test_time_of_day_bucket_evening():
    dt = datetime(2026, 7, 12, 20, 0, tzinfo=timezone.utc)
    assert time_of_day_bucket(dt) == "evening"


def test_format_region_label():
    label = format_region_label("US")
    assert "United States" in label
    assert "🇺🇸" in label
