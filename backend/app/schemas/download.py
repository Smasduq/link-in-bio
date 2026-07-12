from pydantic import BaseModel, EmailStr, Field


class DownloadVerifyRequest(BaseModel):
    email: EmailStr = Field(..., description="Email address used at checkout")
