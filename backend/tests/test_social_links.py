import pytest
from fastapi import HTTPException

from app.schemas.social_link import SocialLinkItem
from app.services.social_links import normalize_social_url, validate_social_links


def test_validate_social_links_builds_urls_from_usernames():
    links = validate_social_links(
        [
            SocialLinkItem(platform="instagram", url="zippa", position=1),
            SocialLinkItem(platform="email", url="hello@example.com", position=0),
            SocialLinkItem(platform="twitter", url="@creator", position=2),
        ]
    )
    assert links[0]["url"] == "mailto:hello@example.com"
    assert links[1]["url"] == "https://instagram.com/zippa"
    assert links[2]["url"] == "https://x.com/creator"


def test_normalize_social_url_accepts_full_profile_links():
    assert normalize_social_url("tiktok", "https://tiktok.com/@creator") == "https://tiktok.com/@creator"
    assert normalize_social_url("linkedin", "https://linkedin.com/in/jane-doe") == "https://linkedin.com/in/jane-doe"


def test_validate_social_links_rejects_duplicate_platforms():
    with pytest.raises(HTTPException) as exc:
        validate_social_links(
            [
                SocialLinkItem(platform="instagram", url="one", position=0),
                SocialLinkItem(platform="instagram", url="two", position=1),
            ]
        )
    assert exc.value.status_code == 400


def test_normalize_whatsapp_phone_number():
    assert normalize_social_url("whatsapp", "+2348012345678") == "https://wa.me/2348012345678"
    assert normalize_social_url("whatsapp", "2348012345678") == "https://wa.me/2348012345678"
