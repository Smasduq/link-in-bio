from datetime import datetime

from pydantic import BaseModel, Field, HttpUrl


class LinkCreate(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    url: str = Field(min_length=1)


class LinkUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    url: str | None = Field(default=None, min_length=1)
    icon: str | None = Field(default=None, max_length=500)
    position: int | None = None
    is_featured: bool | None = None
    is_active: bool | None = None


class LinkResponse(BaseModel):
    id: str
    user_id: str
    title: str
    url: str
    icon: str | None = None
    position: int
    is_featured: bool
    click_count: int
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class LinkReorderItem(BaseModel):
    id: str
    position: int


class LinkReorderRequest(BaseModel):
    links: list[LinkReorderItem]
