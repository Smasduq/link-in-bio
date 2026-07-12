"""Unified profile content block ordering — grouped sections vs freeform interleaving."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Literal

from sqlalchemy.orm import Session

from app.models.link import Link
from app.models.product import Product
from app.models.profile import Profile
from app.models.user import User
from app.services.premium_access import user_is_premium

LayoutMode = Literal["grouped", "freeform"]
BlockType = Literal["link", "embed", "product", "newsletter"]

GROUPED_SECTIONS: tuple[tuple[str, str], ...] = (
    ("links", "Links"),
    ("products", "Shop"),
    ("embeds", "Watch & Listen"),
    ("newsletter", "Newsletter"),
)

EMBED_TYPES = frozenset({"youtube_embed", "spotify_embed"})

FREEFORM_BADGES: dict[BlockType, str] = {
    "link": "Link",
    "embed": "Video",
    "product": "Product",
    "newsletter": "Newsletter",
}


def effective_layout_mode(profile: Profile, user: User | None, db: Session | None) -> LayoutMode:
    """
    Resolve the layout mode used for rendering.

    Non-premium users always get grouped mode even if layout_mode is stored as freeform
    (e.g. after subscription lapse) so the page keeps working predictably.
    """
    stored = (profile.layout_mode or "grouped").lower()
    if stored not in ("grouped", "freeform"):
        stored = "grouped"
    if stored == "freeform":
        if user is None or db is None or not user_is_premium(user, db):
            return "grouped"
    return stored  # type: ignore[return-value]


def _link_block_type(link: Link) -> BlockType:
    return "embed" if link.type in EMBED_TYPES else "link"


def _newsletter_active(profile: Profile, *, capture_enabled: bool) -> bool:
    return capture_enabled and bool((profile.email_capture_heading or "").strip())


@dataclass
class OrderedBlock:
    block_type: BlockType
    block_id: str
    position: int
    link: Link | None = None
    product: Product | None = None
    newsletter_heading: str | None = None
    section: str | None = None
    section_title: str | None = None
    show_section_header: bool = False
    badge_label: str | None = None


def _blocks_for_section(
    section_key: str,
    links: list[Link],
    products: list[Product],
    profile: Profile,
    *,
    capture_enabled: bool,
) -> list[OrderedBlock]:
    if section_key == "links":
        items = [link for link in links if link.type == "link"]
        return [
            OrderedBlock("link", link.id, link.position or 0, link=link)
            for link in sorted(items, key=lambda item: (item.position or 0, item.created_at))
        ]
    if section_key == "products":
        return [
            OrderedBlock("product", product.id, product.position or 0, product=product)
            for product in sorted(products, key=lambda item: (item.position or 0, item.created_at))
        ]
    if section_key == "embeds":
        items = [link for link in links if link.type in EMBED_TYPES]
        return [
            OrderedBlock("embed", link.id, link.position or 0, link=link)
            for link in sorted(items, key=lambda item: (item.position or 0, item.created_at))
        ]
    if section_key == "newsletter" and _newsletter_active(profile, capture_enabled=capture_enabled):
        return [
            OrderedBlock(
                "newsletter",
                "newsletter",
                profile.email_capture_position or 0,
                newsletter_heading=(profile.email_capture_heading or "Join my newsletter").strip(),
            )
        ]
    return []


def _collect_raw_blocks(
    profile: Profile,
    links: list[Link],
    products: list[Product],
    *,
    capture_enabled: bool,
) -> list[OrderedBlock]:
    blocks: list[OrderedBlock] = []
    for link in links:
        blocks.append(
            OrderedBlock(
                block_type=_link_block_type(link),
                block_id=link.id,
                position=link.position or 0,
                link=link,
            )
        )
    for product in products:
        blocks.append(
            OrderedBlock(
                block_type="product",
                block_id=product.id,
                position=product.position or 0,
                product=product,
            )
        )
    if _newsletter_active(profile, capture_enabled=capture_enabled):
        blocks.append(
            OrderedBlock(
                block_type="newsletter",
                block_id="newsletter",
                position=profile.email_capture_position or 0,
                newsletter_heading=(profile.email_capture_heading or "Join my newsletter").strip(),
            )
        )
    return blocks


def get_ordered_content_blocks(
    profile: Profile,
    links: list[Link],
    products: list[Product],
    *,
    layout_mode: LayoutMode,
    capture_enabled: bool,
) -> list[OrderedBlock]:
    """
    Return ordered content blocks for the public profile page.

    Grouped mode: fixed section order (Links → Shop → Embeds → Newsletter),
    sorted by position within each section. Section headers on first block per section.

    Freeform mode: all blocks sorted by global position, no section headers,
    with inline type badges.
    """
    ordered: list[OrderedBlock] = []

    if layout_mode == "grouped":
        for section_key, section_title in GROUPED_SECTIONS:
            section_blocks = _blocks_for_section(
                section_key,
                links,
                products,
                profile,
                capture_enabled=capture_enabled,
            )
            for index, block in enumerate(section_blocks):
                block.section = section_key
                block.section_title = section_title if index == 0 else None
                block.show_section_header = index == 0
                ordered.append(block)
    else:
        raw = _collect_raw_blocks(profile, links, products, capture_enabled=capture_enabled)
        ordered = sorted(raw, key=lambda block: (block.position, block.block_id))
        for block in ordered:
            block.badge_label = FREEFORM_BADGES.get(block.block_type)

    return ordered


def convert_layout_mode_positions(
    db: Session,
    profile: Profile,
    user_id: str,
    old_mode: LayoutMode,
    new_mode: LayoutMode,
    *,
    capture_enabled: bool,
) -> None:
    """
    When switching layout modes, remap position values without losing relative order.

    grouped → freeform: concatenate sections in fixed order into a global sequence.
    freeform → grouped: preserve global order but reassign within-type positions.
    """
    if old_mode == new_mode:
        return

    links = (
        db.query(Link)
        .filter(Link.user_id == user_id)
        .order_by(Link.position.asc(), Link.created_at.asc())
        .all()
    )
    products = (
        db.query(Product)
        .filter(Product.profile_id == profile.id)
        .order_by(Product.position.asc(), Product.created_at.asc())
        .all()
    )

    if old_mode == "grouped" and new_mode == "freeform":
        offset = 0
        for section_key, _title in GROUPED_SECTIONS:
            section_blocks = _blocks_for_section(
                section_key,
                links,
                products,
                profile,
                capture_enabled=capture_enabled,
            )
            for block in section_blocks:
                if block.link is not None:
                    block.link.position = offset
                elif block.product is not None:
                    block.product.position = offset
                elif block.block_type == "newsletter":
                    profile.email_capture_position = offset
                offset += 1
    elif old_mode == "freeform" and new_mode == "grouped":
        raw = _collect_raw_blocks(profile, links, products, capture_enabled=capture_enabled)
        sorted_blocks = sorted(raw, key=lambda block: (block.position, block.block_id))
        counters = {"link": 0, "embed": 0, "product": 0, "newsletter": 0}
        for block in sorted_blocks:
            pos = counters[block.block_type]
            if block.link is not None:
                block.link.position = pos
            elif block.product is not None:
                block.product.position = pos
            elif block.block_type == "newsletter":
                profile.email_capture_position = pos
            counters[block.block_type] += 1

    db.flush()


def next_block_position(
    db: Session,
    profile: Profile,
    user_id: str,
    block_type: BlockType,
    *,
    layout_mode: LayoutMode,
    capture_enabled: bool,
) -> int:
    """Return the next available position when creating a block."""
    if layout_mode == "grouped":
        if block_type in ("link", "embed"):
            query = db.query(Link).filter(Link.user_id == user_id)
            if block_type == "link":
                query = query.filter(Link.type == "link")
            else:
                query = query.filter(Link.type.in_(EMBED_TYPES))
            max_row = query.order_by(Link.position.desc()).first()
            return (max_row.position + 1) if max_row else 0
        if block_type == "product":
            max_row = (
                db.query(Product)
                .filter(Product.profile_id == profile.id)
                .order_by(Product.position.desc())
                .first()
            )
            return (max_row.position + 1) if max_row else 0
        return 0

    max_pos = -1
    for link in db.query(Link).filter(Link.user_id == user_id).all():
        max_pos = max(max_pos, link.position or 0)
    for product in db.query(Product).filter(Product.profile_id == profile.id).all():
        max_pos = max(max_pos, product.position or 0)
    if _newsletter_active(profile, capture_enabled=capture_enabled):
        max_pos = max(max_pos, profile.email_capture_position or 0)
    return max_pos + 1
