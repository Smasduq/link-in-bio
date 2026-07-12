from pydantic import BaseModel


class AvatarUploadResponse(BaseModel):
    avatar_url: str
    avatar_public_id: str
