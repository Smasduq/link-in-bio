"""Admin broadcast notifications."""

from __future__ import annotations

from typing import Any

from sqlalchemy.orm import Session

from app.models.user import User
from app.services.admin_audit import log_admin_action
from app.services.notifications import notify_user


def broadcast_notification(
    db: Session,
    *,
    admin: User,
    message: str,
    subject: str | None = None,
) -> dict[str, Any]:
    text = message.strip()
    if len(text) < 3:
        raise ValueError("Message is too short")

    users = db.query(User).filter(User.deleted_at.is_(None), User.is_suspended.is_(False)).all()
    sent = 0
    for user in users:
        result = notify_user(
            db,
            user.id,
            "admin_broadcast",
            {"message": text, "subject": subject or "Message from LinkBio"},
        )
        if result:
            sent += 1

    log_admin_action(
        db,
        admin_user_id=admin.id,
        action="broadcast_notification",
        target_type="platform",
        target_id=None,
        details={"message": text[:500], "recipients": sent, "subject": subject},
    )
    db.commit()
    return {"sent": sent, "total_users": len(users)}
