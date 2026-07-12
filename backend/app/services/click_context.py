import hashlib
import re
from datetime import datetime, timezone
from urllib.parse import urlparse

from fastapi import Request

_DEVICE_MOBILE = re.compile(r"mobile|iphone|ipod|android.*mobile|blackberry|windows phone", re.I)
_DEVICE_TABLET = re.compile(r"tablet|ipad|android(?!.*mobile)", re.I)


def get_client_ip(request: Request) -> str | None:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip() or None
    if request.client and request.client.host:
        return request.client.host
    return None


def normalize_referrer(referer_header: str | None, body_referrer: str | None = None) -> str:
    """Prefer the HTTP Referer header; fall back to JSON body referrer."""
    raw = (referer_header or body_referrer or "").strip()
    if not raw:
        return "direct"

    if "://" not in raw:
        raw = f"https://{raw}"

    host = urlparse(raw).netloc.lower()
    if host.startswith("www."):
        host = host[4:]
    return host or "direct"


def parse_device_type(user_agent: str | None) -> str:
    if not user_agent:
        return "desktop"
    if _DEVICE_TABLET.search(user_agent):
        return "tablet"
    if _DEVICE_MOBILE.search(user_agent):
        return "mobile"
    return "desktop"


def hash_visitor_ip(ip: str | None, user_agent: str | None, secret: str) -> str | None:
    """Daily-rotating salted hash (UTC date + IP + User-Agent) — no raw IP stored."""
    if not ip:
        return None
    utc_date = datetime.now(timezone.utc).date().isoformat()
    salt = f"{secret}:{utc_date}"
    return hashlib.sha256(f"{salt}:{ip}:{user_agent or ''}".encode()).hexdigest()
