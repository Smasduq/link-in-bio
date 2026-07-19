"""Admin grant/revoke/suspend user action tests."""

from datetime import datetime, timezone
from unittest.mock import MagicMock, patch

from app.models.profile import Profile
from app.models.user import User
from app.services.admin_users import grant_pro, revoke_pro, suspend_user
from app.services.auth import verify_login_credentials


def _admin_user() -> User:
    user = User(
        id="admin-1",
        email="admin@example.com",
        password_hash="hash",
        role="admin",
    )
    user.profile = Profile(id="profile-admin", user_id=user.id, username="adminuser")
    return user


def _target_user(*, manual_pro_grant: bool = False, paystack_subscription_code: str | None = None) -> User:
    user = User(
        id="user-1",
        email="target@example.com",
        password_hash="hash",
        role="user",
        is_premium=False,
        manual_pro_grant=manual_pro_grant,
        paystack_subscription_code=paystack_subscription_code,
        subscription_status="active" if paystack_subscription_code else None,
    )
    user.profile = Profile(id="profile-1", user_id=user.id, username="targetuser")
    return user


def test_grant_pro_sets_manual_flags_without_paystack():
    admin = _admin_user()
    target = _target_user(paystack_subscription_code="SUB_123")
    mock_db = MagicMock()

    with patch("app.services.admin_users.get_user_or_404", return_value=target), patch(
        "app.services.admin_users.log_admin_action"
    ), patch(
        "app.services.admin_users.get_current_user_premium_status", return_value={"is_premium": True}
    ), patch.object(mock_db, "commit"), patch.object(mock_db, "refresh"):
        grant_pro(mock_db, admin=admin, user_id=target.id, reason="VIP creator")

    assert target.is_premium is True
    assert target.manual_pro_grant is True
    assert target.manual_pro_reason == "VIP creator"
    assert target.paystack_subscription_code == "SUB_123"


def test_revoke_pro_warns_when_paystack_subscription_exists():
    admin = _admin_user()
    target = _target_user(manual_pro_grant=True, paystack_subscription_code="SUB_456")
    mock_db = MagicMock()

    with patch("app.services.admin_users.get_user_or_404", return_value=target), patch(
        "app.services.admin_users.log_admin_action"
    ), patch(
        "app.services.admin_users.get_current_user_premium_status", return_value={"is_premium": False}
    ), patch.object(mock_db, "commit"), patch.object(mock_db, "refresh"):
        result = revoke_pro(mock_db, admin=admin, user_id=target.id, reason="No longer needed")

    assert target.is_premium is False
    assert target.manual_pro_grant is False
    assert target.paystack_subscription_code == "SUB_456"
    assert result.get("warning")


def test_suspend_can_disable_public_profile():
    admin = _admin_user()
    target = _target_user()
    mock_db = MagicMock()

    with patch("app.services.admin_users.get_user_or_404", return_value=target), patch(
        "app.services.admin_users.log_admin_action"
    ), patch.object(mock_db, "commit"):
        result = suspend_user(
            mock_db,
            admin=admin,
            user_id=target.id,
            reason="Policy violation",
            disable_public_profile=True,
        )

    assert target.is_suspended is True
    assert target.suspended_reason == "Policy violation"
    assert target.suspended_at is not None
    assert target.profile.profile_disabled is True
    assert result["profile_disabled"] is True


def test_suspended_login_returns_clear_message():
    user = _target_user()
    user.is_suspended = True
    user.suspended_at = datetime.now(timezone.utc)
    mock_db = MagicMock()
    mock_db.query.return_value.filter.return_value.first.return_value = user

    with patch("app.services.auth.verify_password", return_value=True):
        result, block_reason = verify_login_credentials(mock_db, "target@example.com", "password")

    assert result is None
    assert block_reason == "suspended"
