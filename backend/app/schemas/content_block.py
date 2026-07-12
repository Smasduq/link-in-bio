from typing import Literal

from pydantic import BaseModel, Field

from app.schemas.link import LinkResponse
from app.schemas.product import PublicProductResponse

LayoutMode = Literal["grouped", "freeform"]
ContentBlockType = Literal["link", "embed", "product", "newsletter"]


class ContentBlockResponse(BaseModel):
    id: str
    block_type: ContentBlockType
    position: int
    show_section_header: bool = False
    section: str | None = None
    section_title: str | None = None
    badge_label: str | None = None
    link: LinkResponse | None = None
    product: PublicProductResponse | None = None
    newsletter_heading: str | None = None


class LayoutModeUpdate(BaseModel):
    layout_mode: LayoutMode


class ContentReorderItem(BaseModel):
    id: str
    block_type: ContentBlockType
    position: int = Field(ge=0)


class ContentReorderRequest(BaseModel):
    blocks: list[ContentReorderItem]
