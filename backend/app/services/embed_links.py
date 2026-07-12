"""Parse and validate YouTube / Spotify embed URLs for profile content blocks."""

from __future__ import annotations

import re
from typing import Literal
from urllib.parse import parse_qs, urlparse

from fastapi import HTTPException, status

LinkType = Literal["link", "youtube_embed", "spotify_embed"]
SpotifyResourceType = Literal["track", "album", "playlist"]

YOUTUBE_VIDEO_ID_RE = re.compile(r"^[A-Za-z0-9_-]{11}$")
SPOTIFY_ID_RE = re.compile(r"^[A-Za-z0-9]{22}$")
SPOTIFY_RESOURCE_TYPES: frozenset[str] = frozenset({"track", "album", "playlist"})


def _normalize_input_url(raw_url: str) -> str:
    url = raw_url.strip()
    if not url:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="URL is required.")
    if not url.startswith(("http://", "https://")):
        url = f"https://{url}"
    return url


def _youtube_host(hostname: str) -> bool:
    host = hostname.lower().removeprefix("www.").removeprefix("m.")
    return host in {"youtube.com", "youtube-nocookie.com", "music.youtube.com"}


def parse_youtube_url(raw_url: str) -> dict[str, str]:
    """
    Accept youtube.com/watch?v=, youtu.be/, /embed/, and /shorts/ URLs.
    Returns canonical watch URL, video ID, and official embed src.
    """
    url = _normalize_input_url(raw_url)
    parsed = urlparse(url)
    hostname = (parsed.hostname or "").lower()

    video_id: str | None = None

    if hostname == "youtu.be":
        path_id = parsed.path.strip("/").split("/")[0] if parsed.path.strip("/") else ""
        if path_id:
            video_id = path_id.split("?")[0]

    elif _youtube_host(hostname):
        path_parts = [part for part in parsed.path.split("/") if part]
        if path_parts:
            head = path_parts[0].lower()
            if head in {"watch", "live"}:
                query_ids = parse_qs(parsed.query).get("v", [])
                if query_ids:
                    video_id = query_ids[0]
            elif head in {"embed", "shorts", "v"} and len(path_parts) > 1:
                video_id = path_parts[1]
            elif head.startswith("@"):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Paste a YouTube video link, not a channel URL.",
                )

    if not video_id or not YOUTUBE_VIDEO_ID_RE.match(video_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Enter a valid YouTube video URL (youtube.com/watch or youtu.be).",
        )

    canonical_url = f"https://www.youtube.com/watch?v={video_id}"
    embed_src = f"https://www.youtube.com/embed/{video_id}"
    return {
        "video_id": video_id,
        "canonical_url": canonical_url,
        "embed_src": embed_src,
    }


def parse_spotify_url(raw_url: str) -> dict[str, str]:
    """
    Accept open.spotify.com track/album/playlist URLs.
    Returns resource type, ID, canonical URL, and official embed src.
    """
    url = _normalize_input_url(raw_url)
    parsed = urlparse(url)
    hostname = (parsed.hostname or "").lower().removeprefix("www.")

    resource_type: str | None = None
    resource_id: str | None = None

    if hostname == "open.spotify.com":
        path_parts = [part for part in parsed.path.split("/") if part]
        if len(path_parts) >= 2 and path_parts[0] in SPOTIFY_RESOURCE_TYPES:
            resource_type = path_parts[0]
            resource_id = path_parts[1].split("?")[0]

    elif parsed.scheme == "spotify":
        resource_type = parsed.netloc or None
        resource_id = parsed.path.strip("/").split("/")[0] if parsed.path else None

    if (
        resource_type not in SPOTIFY_RESOURCE_TYPES
        or not resource_id
        or not SPOTIFY_ID_RE.match(resource_id)
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Enter a valid Spotify track, album, or playlist URL.",
        )

    canonical_url = f"https://open.spotify.com/{resource_type}/{resource_id}"
    embed_src = f"https://open.spotify.com/embed/{resource_type}/{resource_id}"
    return {
        "spotify_type": resource_type,
        "spotify_id": resource_id,
        "canonical_url": canonical_url,
        "embed_src": embed_src,
    }


def detect_embed_type(raw_url: str) -> LinkType | None:
    """Best-effort detection from a pasted URL before strict validation."""
    url = raw_url.strip().lower()
    if not url:
        return None
    if not url.startswith(("http://", "https://")):
        url = f"https://{url}"
    parsed = urlparse(url)
    hostname = (parsed.hostname or "").lower().removeprefix("www.").removeprefix("m.")

    if hostname in {"youtu.be"} or _youtube_host(hostname):
        return "youtube_embed"
    if hostname == "open.spotify.com" or url.startswith("spotify:"):
        return "spotify_embed"
    return None


def resolve_embed_src(link_type: str, url: str) -> str | None:
    if link_type == "youtube_embed":
        return parse_youtube_url(url)["embed_src"]
    if link_type == "spotify_embed":
        return parse_spotify_url(url)["embed_src"]
    return None


def resolve_spotify_embed_height(link_type: str, url: str) -> int:
    if link_type != "spotify_embed":
        return 152
    parsed = parse_spotify_url(url)
    return 352 if parsed["spotify_type"] in {"album", "playlist"} else 152


def normalize_link_url(link_type: str, raw_url: str) -> str:
    """Validate and return canonical source URL for storage."""
    if link_type == "youtube_embed":
        return parse_youtube_url(raw_url)["canonical_url"]
    if link_type == "spotify_embed":
        return parse_spotify_url(raw_url)["canonical_url"]

    url = raw_url.strip()
    if not url.startswith(("http://", "https://")):
        url = f"https://{url}"
    return url


def default_embed_title(link_type: str, raw_url: str) -> str:
    if link_type == "youtube_embed":
        return "YouTube video"
    if link_type == "spotify_embed":
        parsed = parse_spotify_url(raw_url)
        label = parsed["spotify_type"].capitalize()
        return f"Spotify {label}"
    return "Embed"
