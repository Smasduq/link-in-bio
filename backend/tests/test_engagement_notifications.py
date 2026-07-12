from datetime import datetime, timezone
from unittest.mock import MagicMock, patch
from zoneinfo import ZoneInfo

from app.models.notification_preferences import NotificationPreferences
from app.models.user import User
from app.services.engagement_notifications import find_users_for_local_hour, send_morning_notifications


def _user(user_id: str, tz: str) -> User:
    user = User(email=f"{user_id}@example.com", password_hash="hash")
    user.id = user_id
    user.timezone = tz
    return user


@patch("app.services.engagement_notifications._utcnow")
def test_find_users_for_local_hour_filters_by_timezone(mock_utcnow):
    # 07:00 UTC = 08:00 in Africa/Lagos (UTC+1)
    mock_utcnow.return_value = datetime(2026, 7, 12, 7, 15, tzinfo=timezone.utc)

    lagos_user = _user("lagos", "Africa/Lagos")
    ny_user = _user("ny", "America/New_York")

    db = MagicMock()
    db.query.return_value.join.return_value.join.return_value.filter.return_value.options.return_value.distinct.return_value.all.return_value = [
        lagos_user,
        ny_user,
    ]

    matching = find_users_for_local_hour(db, target_hour=8)
    assert [user.id for user in matching] == ["lagos"]


@patch("app.services.engagement_notifications.notify_user")
@patch("app.services.engagement_notifications._clicks_on_date", return_value=12)
@patch("app.services.engagement_notifications.find_users_for_local_hour")
def test_send_morning_notifications_dedupes_same_day(mock_find, mock_clicks, mock_notify):
    user = _user("u1", "Africa/Lagos")
    user.last_morning_notification_date = datetime(2026, 7, 12, tzinfo=ZoneInfo("Africa/Lagos")).date()

    with patch("app.services.engagement_notifications._local_now") as mock_local:
        mock_local.return_value = datetime(2026, 7, 12, 8, 5, tzinfo=ZoneInfo("Africa/Lagos"))
        mock_find.return_value = [user]

        db = MagicMock()
        sent = send_morning_notifications(db)

    assert sent == 0
    mock_notify.assert_not_called()


@patch("app.services.engagement_notifications.notify_user")
@patch("app.services.engagement_notifications._clicks_on_date", return_value=5)
@patch("app.services.engagement_notifications.find_users_for_local_hour")
def test_send_morning_notifications_sends_once_per_day(mock_find, mock_clicks, mock_notify):
    user = _user("u1", "Africa/Lagos")
    user.last_morning_notification_date = None

    local_now = datetime(2026, 7, 12, 8, 5, tzinfo=ZoneInfo("Africa/Lagos"))
    with patch("app.services.engagement_notifications._local_now", return_value=local_now):
        mock_find.return_value = [user]
        db = MagicMock()
        sent = send_morning_notifications(db)

    assert sent == 1
    mock_notify.assert_called_once()
    assert user.last_morning_notification_date == local_now.date()
    db.add.assert_called_with(user)
