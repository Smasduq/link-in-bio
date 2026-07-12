from fastapi import APIRouter, Depends, File, UploadFile
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user, get_user_profile
from app.models.user import User
from app.schemas.user import AvatarUploadResponse
from app.services.avatar import upload_avatar

router = APIRouter(prefix="/users", tags=["users"])


@router.post("/me/avatar", response_model=AvatarUploadResponse)
async def upload_my_avatar(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    profile = get_user_profile(current_user)
    result = await upload_avatar(current_user.id, file)
    profile.avatar_public_id = result.public_id
    profile.avatar_version = result.version
    profile.avatar_url = None
    db.commit()
    db.refresh(profile)
    return AvatarUploadResponse(
        avatar_url=result.delivery_url,
        avatar_public_id=result.public_id,
    )
