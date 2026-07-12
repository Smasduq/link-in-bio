#!/usr/bin/env python3
"""Test MaxMind GeoLite2-Country lookup for a public IP.

Run from the backend directory:

  python scripts/test_geoip.py 8.8.8.8
  python scripts/test_geoip.py 208.67.222.222

Simulate a proxied Render request when testing click tracking:

  curl -X POST "http://127.0.0.1:8000/api/links/<link_id>/click" \\
    -H "Content-Type: application/json" \\
    -H "X-Forwarded-For: 8.8.8.8" \\
    -d "{\"referrer\": null}"
"""

from __future__ import annotations

import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_ROOT))

from app.services.geoip import close_geoip, init_geoip, lookup_country, resolve_geolite2_db_path


def main() -> int:
    test_ip = sys.argv[1] if len(sys.argv) > 1 else "8.8.8.8"
    db_path = resolve_geolite2_db_path()

    print(f"Database path: {db_path}")
    print(f"Database exists: {db_path.is_file()}")

    reader = init_geoip()
    if reader is None:
        print("GeoIP reader failed to initialize — check logs above.")
        return 1

    code, name = lookup_country(test_ip)
    print(f"IP: {test_ip}")
    print(f"Country code: {code or '(none)'}")
    print(f"Country name: {name or '(none)'}")

    close_geoip()
    return 0 if code else 1


if __name__ == "__main__":
    raise SystemExit(main())
