import logging
from functools import lru_cache
from pathlib import Path

from app.config import settings

logger = logging.getLogger(__name__)


@lru_cache(maxsize=1)
def _country_reader():
    path = settings.geolite2_country_path
    if not path:
        return None

    db_path = Path(path)
    if not db_path.is_file():
        logger.info("GeoLite2 country database not found at %s — country lookup disabled", db_path)
        return None

    try:
        import geoip2.database
    except ImportError:
        logger.warning("geoip2 package not installed — country lookup disabled")
        return None

    try:
        return geoip2.database.Reader(str(db_path))
    except Exception:
        logger.exception("Failed to open GeoLite2 database at %s", db_path)
        return None


def lookup_country_code(ip: str | None) -> str | None:
    """Resolve ISO 3166-1 alpha-2 country code from IP using local MaxMind GeoLite2 (offline)."""
    if not ip or ip in {"127.0.0.1", "::1", "localhost"}:
        return None

    reader = _country_reader()
    if reader is None:
        return None

    try:
        response = reader.country(ip)
        code = response.country.iso_code
        return code.upper() if code else None
    except Exception:
        return None
