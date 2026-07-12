from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models.user import User
from app.services.auth import decode_access_token
from app.services.premium_access import get_premium_status, require_premium

security = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
    db: Session = Depends(get_db),
) -> User:
    if credentials is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")

    user_id = decode_access_token(credentials.credentials)
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")

    user = (
        db.query(User)
        .options(joinedload(User.profile))
        .filter(User.id == user_id)
        .first()
    )
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user


def get_premium_status_dep(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    """FastAPI dependency — synced premium status for the current user."""
    status_info = get_premium_status(user, db)
    db.commit()
    return status_info


def require_active_premium(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> User:
    require_premium(user, db)
    db.commit()
    return user


def get_user_profile(user: User):
    if not user.profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found")
    return user.profile
