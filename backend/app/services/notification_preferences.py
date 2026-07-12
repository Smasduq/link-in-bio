from sqlalchemy.orm import Session

from app.models.notification_preferences import NotificationPreferences


def get_or_create_preferences(db: Session, user_id: str) -> NotificationPreferences:
    prefs = db.query(NotificationPreferences).filter(NotificationPreferences.user_id == user_id).first()
    if prefs is None:
        prefs = NotificationPreferences(user_id=user_id)
        db.add(prefs)
        db.flush()
    return prefs
