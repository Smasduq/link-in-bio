import logging
from pathlib import Path
from typing import TYPE_CHECKING

from app.config import settings

if TYPE_CHECKING:
    import geoip2.database

logger = logging.getLogger(__name__)

_SERVICES_DIR = Path(__file__).resolve().parent
_BACKEND_ROOT = _SERVICES_DIR.parent.parent
_REPO_ROOT = _BACKEND_ROOT.parent
_DEFAULT_DB_PATH = _SERVICES_DIR / "GeoLite2-Country.mmdb"
_DB_FILENAME = "GeoLite2-Country.mmdb"

_reader: "geoip2.database.Reader | None" = None
_reader_path: Path | None = None


def _candidate_db_paths() -> list[Path]:
    """Search paths for GeoLite2-Country.mmdb (local dev + Vercel/serverless layouts)."""
    configured = (settings.geolite2_country_path or "").strip()
    candidates: list[Path] = []

    if configured:
        path = Path(configured).expanduser()
        if not path.is_absolute():
            path = (_BACKEND_ROOT / path).resolve()
        else:
            path = path.resolve()
        candidates.append(path)

    candidates.extend(
        [
            _DEFAULT_DB_PATH.resolve(),
            (_BACKEND_ROOT / "files" / _DB_FILENAME).resolve(),
            (_REPO_ROOT / "files" / _DB_FILENAME).resolve(),
            (Path("/var/task") / "files" / _DB_FILENAME).resolve(),
            (Path("/var/task") / "backend" / "files" / _DB_FILENAME).resolve(),
            (Path("/var/task") / "app" / "services" / _DB_FILENAME).resolve(),
        ]
    )

    seen: set[Path] = set()
    unique: list[Path] = []
    for candidate in candidates:
        if candidate not in seen:
            seen.add(candidate)
            unique.append(candidate)
    return unique


def resolve_geolite2_db_path() -> Path:
    """Return the first existing GeoLite2-Country.mmdb path, or the preferred default."""
    for candidate in _candidate_db_paths():
        if candidate.is_file():
            return candidate
    return _candidate_db_paths()[0]


def init_geoip() -> "geoip2.database.Reader | None":
    """Open the GeoLite2-Country reader once at application startup."""
    global _reader, _reader_path

    if _reader is not None:
        return _reader

    db_path = resolve_geolite2_db_path()
    _reader_path = db_path

    if not db_path.is_file():
        searched = ", ".join(str(path) for path in _candidate_db_paths()[:6])
        logger.warning(
            "GeoLite2-Country database not found at %s — country lookup disabled. "
            "Set GEOLITE2_COUNTRY_PATH or place %s in backend/files/ or repo files/. Searched: %s",
            db_path,
            _DB_FILENAME,
            searched,
        )
        return None

    try:
        import geoip2.database
    except ImportError:
        logger.warning("geoip2 package not installed — country lookup disabled")
        return None

    try:
        _reader = geoip2.database.Reader(str(db_path))
    except Exception:
        logger.exception("Failed to open GeoLite2 database at %s", db_path)
        _reader = None
        return None

    logger.info("GeoLite2-Country database loaded from %s", db_path)
    return _reader


def close_geoip() -> None:
    """Close the GeoLite2 reader on application shutdown."""
    global _reader, _reader_path

    if _reader is not None:
        try:
            _reader.close()
        except Exception:
            logger.exception("Failed to close GeoLite2 database at %s", _reader_path)
        finally:
            _reader = None
            _reader_path = None


def _get_reader() -> "geoip2.database.Reader | None":
    if _reader is None:
        logger.debug("GeoIP reader not initialized — call init_geoip() at startup")
    return _reader


def lookup_country(ip: str | None) -> tuple[str | None, str | None]:
    """
    Resolve ISO 3166-1 alpha-2 country code and English name from IP.

    Uses only Country-edition fields: response.country.iso_code and response.country.name.
    """
    if not ip or ip in {"127.0.0.1", "::1", "localhost"}:
        return None, None

    reader = _get_reader()
    if reader is None:
        return None, None

    try:
        import geoip2.errors

        response = reader.country(ip)
        code = response.country.iso_code
        name = response.country.name
        if not code:
            logger.debug(
                "GeoIP lookup for %s returned no country code (name=%r)",
                ip,
                name,
            )
            return None, name
        return code.upper(), name
    except geoip2.errors.AddressNotFoundError:
        logger.debug("GeoIP address not found in database: %s", ip)
        return None, None
    except ValueError as exc:
        logger.warning("GeoIP invalid IP address %r: %s", ip, exc)
        return None, None
    except geoip2.errors.GeoIP2Error as exc:
        logger.error("GeoIP lookup failed for %s: %s", ip, exc)
        return None, None
    except Exception:
        logger.exception("Unexpected GeoIP error for %s", ip)
        return None, None


def lookup_country_code(ip: str | None) -> str | None:
    """Resolve ISO 3166-1 alpha-2 country code from IP using local MaxMind GeoLite2 (offline)."""
    code, _ = lookup_country(ip)
    return code
