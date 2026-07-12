"""Run hourly engagement notification cron (morning/evening/weekly/inactivity)."""

from __future__ import annotations

import os
import sys

import httpx

BACKEND_URL = os.environ.get("BACKEND_URL", "http://127.0.0.1:8000").rstrip("/")
CRON_SECRET = os.environ.get("CRON_SECRET", "")


def main() -> int:
    if not CRON_SECRET:
        print("CRON_SECRET is required", file=sys.stderr)
        return 1

    url = f"{BACKEND_URL}/api/cron/engagement-notifications"
    response = httpx.post(url, headers={"X-Cron-Secret": CRON_SECRET}, timeout=120.0)
    response.raise_for_status()
    print(response.json())
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
