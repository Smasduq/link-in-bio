"""API-level premium gating — free user must receive 403 on Pro-only mutations."""

from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient

from app.database import get_db
from app.dependencies import get_current_user, get_user_profile
from app.main import app
from app.models.profile import Profile
from app.models.user import User


def _free_user() -> User:
    user = User(
        id="user-free-1",
        email="free@example.com",
        password_hash="hash",
        is_premium=False,
    )
    user.profile = Profile(
        id="profile-free-1",
        user_id=user.id,
        username="freeuser",
        theme_settings={"backgroundType": "solid", "buttonStyle": "filled"},
    )
    return user


@pytest.fixture
def free_client():
    user = _free_user()
    mock_db = MagicMock()
    mock_db.commit = MagicMock()
    mock_db.add = MagicMock()

    def override_db():
        yield mock_db

    app.dependency_overrides[get_current_user] = lambda: user
    app.dependency_overrides[get_db] = override_db
    app.dependency_overrides[get_user_profile] = lambda u=user: u.profile

    client = TestClient(app)
    yield client, user, mock_db
    app.dependency_overrides.clear()


def test_free_user_cannot_save_pro_theme(free_client):
    client, _, _ = free_client
    response = client.patch(
        "/api/profile",
        json={"theme_settings": {"buttonStyle": "glass", "backgroundType": "solid"}},
        headers={"Authorization": "Bearer test-token"},
    )
    assert response.status_code == 403
    assert "Pro plan" in response.json()["detail"]


def test_free_user_cannot_enable_email_capture(free_client):
    client, _, _ = free_client
    response = client.patch(
        "/api/profile/email-capture",
        json={"email_capture_enabled": True, "email_capture_heading": "Join us"},
        headers={"Authorization": "Bearer test-token"},
    )
    assert response.status_code == 403


def test_free_user_cannot_set_featured_link(free_client):
    client, user, mock_db = free_client
    from app.models.link import Link

    link = Link(
        id="link-1",
        user_id=user.id,
        title="Test",
        url="https://example.com",
        position=0,
        is_featured=False,
    )

    def query_side_effect(model):
        q = MagicMock()
        if model.__name__ == "Link":
            q.filter.return_value.first.return_value = link
        return q

    mock_db.query.side_effect = query_side_effect

    response = client.patch(
        "/api/links/link-1",
        json={"is_featured": True},
        headers={"Authorization": "Bearer test-token"},
    )
    assert response.status_code == 403


def test_free_user_link_insights_requires_premium(free_client):
    client, _, _ = free_client
    response = client.get(
        "/api/links/link-1/insights",
        headers={"Authorization": "Bearer test-token"},
    )
    assert response.status_code == 403
