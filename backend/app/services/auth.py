from datetime import datetime, timedelta, timezone

from jose import JWTError, jwt
import bcrypt
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.config import settings
from app.models.profile import Profile
from app.models.user import User

ALGORITHM = "HS256"


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))


def create_access_token(user_id: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.access_token_expire_minutes)
    payload = {"sub": user_id, "exp": int(expire.timestamp())}
    return jwt.encode(payload, settings.secret_key, algorithm=ALGORITHM)


def decode_access_token(token: str) -> str | None:
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        return user_id if isinstance(user_id, str) else None
    except JWTError:
        return None


def normalize_login_identifier(identifier: str) -> str:
    value = identifier.strip().lower()
    if value.startswith("@"):
        value = value[1:]
    return value


def authenticate_user(db: Session, identifier: str, password: str) -> User | None:
    user, block_reason = verify_login_credentials(db, identifier, password)
    if block_reason:
        return None
    return user


def verify_login_credentials(db: Session, identifier: str, password: str) -> tuple[User | None, str | None]:
    """Returns (user, block_reason). block_reason is 'suspended', 'deleted', or 'invalid'."""
    normalized = normalize_login_identifier(identifier)
    if not normalized:
        return None, "invalid"

    if "@" in normalized:
        user = db.query(User).filter(func.lower(User.email) == normalized).first()
    else:
        profile = db.query(Profile).filter(func.lower(Profile.username) == normalized).first()
        if not profile:
            return None, "invalid"
        user = db.query(User).filter(User.id == profile.user_id).first()

    if not user or not verify_password(password, user.password_hash):
        return None, "invalid"
    if user.deleted_at is not None:
        return None, "deleted"
    if user.is_suspended:
        return None, "suspended"
    return user, None


def get_favicon_url(url: str) -> str | None:
    try:
        from urllib.parse import urlparse

        parsed = urlparse(url if "://" in url else f"https://{url}")
        domain = parsed.netloc or parsed.path.split("/")[0]
        if not domain:
            return None
        return f"https://www.google.com/s2/favicons?sz=64&domain={domain}"
    except Exception:
        return None
