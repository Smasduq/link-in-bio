from datetime import datetime, timedelta, timezone

from jose import JWTError, jwt
import bcrypt
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.config import settings
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


def authenticate_user(db: Session, email: str, password: str) -> User | None:
    normalized = email.strip().lower()
    user = db.query(User).filter(func.lower(User.email) == normalized).first()
    if not user or not verify_password(password, user.password_hash):
        return None
    return user


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
