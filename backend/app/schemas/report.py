from typing import Any, Literal

from pydantic import BaseModel, EmailStr, Field


class PublicReportRequest(BaseModel):
    reporter_email: EmailStr
    target_type: Literal["profile", "product"]
    target_id: str = Field(min_length=1, max_length=36)
    reason: str = Field(min_length=10, max_length=2000)
