"""Admin API access control tests."""

from datetime import datetime, timezone
from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient

from app.database import get_db
from app.dependencies import get_current_user, get_user_profile
from app.main import app
from app.models.profile import Profile
from app.models.user import User


def _user(*, role: str = "user", suspended: bool = False) -> User:
    user = User(
        id="user-1",
        email="test@example.com",
        password_hash="hash",
        role=role,
        is_suspended=suspended,
    )
    user.profile = Profile(id="profile-1", user_id=user.id, username="testuser", full_name="Test")
    return user


@pytest.fixture
def client_factory():
    def _make(user: User):
        mock_db = MagicMock()
        mock_db.commit = MagicMock()
        mock_db.add = MagicMock()
        mock_db.query.return_value.filter.return_value.first.return_value = None
        mock_db.query.return_value.filter.return_value.count.return_value = 0
        mock_db.query.return_value.filter.return_value.order_by.return_value.offset.return_value.limit.return_value.all.return_value = []
        mock_db.query.return_value.filter.return_value.all.return_value = []

        def override_db():
            yield mock_db

        app.dependency_overrides[get_current_user] = lambda: user
        app.dependency_overrides[get_db] = override_db
        app.dependency_overrides[get_user_profile] = lambda u=user: u.profile

        client = TestClient(app)
        return client, mock_db

    yield _make
    app.dependency_overrides.clear()


def test_regular_user_cannot_access_admin_overview(client_factory):
    client, _ = client_factory(_user(role="user"))
    response = client.get("/api/admin/overview", headers={"Authorization": "Bearer test"})
    assert response.status_code == 403


def test_support_user_can_access_admin_overview(client_factory):
    client, _ = client_factory(_user(role="support"))
    response = client.get("/api/admin/overview", headers={"Authorization": "Bearer test"})
    assert response.status_code != 403


def test_admin_user_can_access_admin_users(client_factory):
    client, _ = client_factory(_user(role="admin"))
    response = client.get("/api/admin/users", headers={"Authorization": "Bearer test"})
    assert response.status_code != 403


def test_suspended_user_blocked_at_login():
    from unittest.mock import MagicMock, patch

    from app.services.auth import authenticate_user

    user = _user(role="admin", suspended=True)
    mock_db = MagicMock()
    mock_db.query.return_value.filter.return_value.first.return_value = user
    with patch("app.services.auth.verify_password", return_value=True):
        result = authenticate_user(mock_db, "test@example.com", "password")
    assert result is None
