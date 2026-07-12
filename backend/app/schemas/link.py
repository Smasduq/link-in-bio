from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, model_validator

from app.services.embed_links import resolve_embed_src, resolve_spotify_embed_height

LinkType = Literal["link", "youtube_embed", "spotify_embed"]


class LinkCreate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    url: str = Field(min_length=1)
    type: LinkType | None = None


class LinkUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    url: str | None = Field(default=None, min_length=1)
    icon: str | None = Field(default=None, max_length=500)
    position: int | None = None
    is_featured: bool | None = None
    is_active: bool | None = None
    type: LinkType | None = None


class LinkResponse(BaseModel):
    id: str
    user_id: str
    title: str
    url: str
    icon: str | None = None
    position: int
    is_featured: bool
    type: LinkType = "link"
    click_count: int
    is_active: bool
    created_at: datetime
    embed_src: str | None = None
    embed_height: int | None = None

    model_config = {"from_attributes": True}

    @model_validator(mode="after")
    def attach_embed_fields(self) -> "LinkResponse":
        if self.type != "link":
            self.embed_src = resolve_embed_src(self.type, self.url)
            if self.type == "spotify_embed":
                self.embed_height = resolve_spotify_embed_height(self.type, self.url)
        return self


class LinkReorderItem(BaseModel):
    id: str
    position: int


class LinkReorderRequest(BaseModel):
    links: list[LinkReorderItem]


class EmbedDetectRequest(BaseModel):
    url: str = Field(min_length=1)


class EmbedDetectResponse(BaseModel):
    type: LinkType
    title_suggestion: str
    embed_src: str
    canonical_url: str
