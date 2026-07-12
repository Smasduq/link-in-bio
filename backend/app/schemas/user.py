from pydantic import BaseModel


class AvatarUploadResponse(BaseModel):
    avatar_url: str
