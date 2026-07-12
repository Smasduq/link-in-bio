"""Tests for profile content block ordering and premium layout fallback."""

from __future__ import annotations

from datetime import datetime, timezone
from unittest.mock import MagicMock, patch

from app.models.link import Link
from app.models.product import Product
from app.models.profile import Profile
from app.models.user import User
from app.services.content_blocks import effective_layout_mode, get_ordered_content_blocks


def _user(*, premium: bool) -> User:
    return User(
        email="creator@example.com",
        password_hash="hash",
        is_premium=premium,
        premium_period_end=datetime.now(timezone.utc) if premium else None,
    )


def _profile(*, layout_mode: str = "grouped") -> Profile:
    return Profile(
        user_id="user-1",
        username="creator",
        layout_mode=layout_mode,
        email_capture_enabled=True,
        email_capture_heading="Join my list",
        email_capture_position=0,
    )


def test_effective_layout_mode_falls_back_for_expired_premium():
    profile = _profile(layout_mode="freeform")
    user = _user(premium=False)
    db = MagicMock()

    assert effective_layout_mode(profile, user, db) == "grouped"


def test_effective_layout_mode_allows_freeform_for_premium():
    profile = _profile(layout_mode="freeform")
    user = _user(premium=True)
    db = MagicMock()

    with patch("app.services.content_blocks.user_is_premium", return_value=True):
        assert effective_layout_mode(profile, user, db) == "freeform"


def test_grouped_mode_orders_by_section_not_global_position():
    profile = _profile(layout_mode="grouped")
    links = [
        Link(
            id="link-1",
            user_id="user-1",
            title="My site",
            url="https://example.com",
            type="link",
            position=5,
            created_at=datetime.now(timezone.utc),
        ),
        Link(
            id="embed-1",
            user_id="user-1",
            title="Video",
            url="https://youtube.com/watch?v=abc",
            type="youtube_embed",
            position=0,
            created_at=datetime.now(timezone.utc),
        ),
    ]
    products = [
        Product(
            id="prod-1",
            profile_id=profile.id,
            title="Guide",
            price=1000.0,
            file_public_id="file",
            file_name="guide.pdf",
            position=1,
            created_at=datetime.now(timezone.utc),
        )
    ]

    blocks = get_ordered_content_blocks(
        profile,
        links,
        products,
        layout_mode="grouped",
        capture_enabled=True,
    )

    assert [block.block_type for block in blocks] == ["link", "product", "embed", "newsletter"]
    assert blocks[0].show_section_header is True
    assert blocks[0].section_title == "Links"
    assert blocks[1].section_title == "Shop"


def test_freeform_mode_sorts_by_global_position():
    profile = _profile(layout_mode="freeform")
    links = [
        Link(
            id="link-1",
            user_id="user-1",
            title="My site",
            url="https://example.com",
            type="link",
            position=2,
            created_at=datetime.now(timezone.utc),
        ),
        Link(
            id="embed-1",
            user_id="user-1",
            title="Video",
            url="https://youtube.com/watch?v=abc",
            type="youtube_embed",
            position=0,
            created_at=datetime.now(timezone.utc),
        ),
    ]
    products = [
        Product(
            id="prod-1",
            profile_id=profile.id,
            title="Guide",
            price=1000.0,
            file_public_id="file",
            file_name="guide.pdf",
            position=1,
            created_at=datetime.now(timezone.utc),
        )
    ]
    profile.email_capture_position = 3

    blocks = get_ordered_content_blocks(
        profile,
        links,
        products,
        layout_mode="freeform",
        capture_enabled=True,
    )

    assert [block.block_type for block in blocks] == ["embed", "product", "link", "newsletter"]
    assert all(block.badge_label for block in blocks)
    assert all(not block.show_section_header for block in blocks)
