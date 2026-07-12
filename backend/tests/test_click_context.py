from app.services.click_context import (
    get_client_ip,
    hash_visitor_ip,
    normalize_referrer,
    parse_device_type,
)


def test_hash_visitor_ip_daily_rotation():
    ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
    h1 = hash_visitor_ip("203.0.113.5", ua, "secret")
    h2 = hash_visitor_ip("203.0.113.5", ua, "secret")
    assert h1 == h2
    assert h1 != hash_visitor_ip("203.0.113.6", ua, "secret")
    assert h1 != hash_visitor_ip("203.0.113.5", "Mozilla/5.0 iPhone", "secret")
    assert hash_visitor_ip(None, ua, "secret") is None


def test_normalize_referrer_direct():
    assert normalize_referrer(None, None) == "direct"
    assert normalize_referrer("", "") == "direct"


def test_normalize_referrer_from_header():
    assert normalize_referrer("https://www.instagram.com/stories/", None) == "instagram.com"


def test_normalize_referrer_prefers_header():
    assert normalize_referrer("https://twitter.com/", "https://instagram.com") == "twitter.com"


def test_normalize_referrer_body_fallback():
    assert normalize_referrer(None, "https://tiktok.com/@user") == "tiktok.com"


def test_parse_device_type():
    assert parse_device_type(None) == "desktop"
    assert parse_device_type("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)") == "mobile"
    assert parse_device_type("Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)") == "tablet"
    assert parse_device_type("Mozilla/5.0 (Windows NT 10.0; Win64; x64)") == "desktop"
