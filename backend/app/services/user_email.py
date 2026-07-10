import hashlib
import secrets
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.config import settings
from app.models.password_reset import PasswordResetToken
from app.models.user import User
from app.services.email import send_password_reset_email, send_welcome_email


def create_password_reset_token(db: Session, user: User) -> str | None:
    raw_token = secrets.token_urlsafe(32)
    token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
    expires_at = datetime.now(timezone.utc) + timedelta(hours=1)

    db.query(PasswordResetToken).filter(PasswordResetToken.user_id == user.id).delete()

    db.add(
        PasswordResetToken(
            user_id=user.id,
            token_hash=token_hash,
            expires_at=expires_at,
        )
    )
    db.commit()
    return raw_token


def reset_password_with_token(db: Session, raw_token: str, new_password: str) -> bool:
    from app.services.auth import hash_password

    token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
    record = (
        db.query(PasswordResetToken)
        .filter(PasswordResetToken.token_hash == token_hash)
        .first()
    )
    if not record:
        return False

    expires_at = record.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)

    if expires_at < datetime.now(timezone.utc):
        db.delete(record)
        db.commit()
        return False

    user = db.query(User).filter(User.id == record.user_id).first()
    if not user:
        return False

    user.password_hash = hash_password(new_password)
    db.delete(record)
    db.commit()
    return True


def send_welcome(to: str, username: str) -> None:
    send_welcome_email(to=to, username=username)


def send_password_reset(to: str, raw_token: str) -> None:
    reset_url = f"{settings.frontend_url}/reset-password?token={raw_token}"
    send_password_reset_email(to=to, reset_url=reset_url)
