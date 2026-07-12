"""Simple in-memory IP rate limiting for public endpoints."""

from __future__ import annotations

import threading
import time
from collections import defaultdict


class InMemoryRateLimiter:
    """Fixed-window rate limiter keyed by caller identifier (e.g. client IP)."""

    def __init__(self) -> None:
        self._hits: dict[str, list[float]] = defaultdict(list)
        self._lock = threading.Lock()

    def allow(self, key: str, *, max_calls: int, window_seconds: int) -> bool:
        if not key:
            key = "unknown"

        now = time.time()
        with self._lock:
            recent = [timestamp for timestamp in self._hits[key] if now - timestamp < window_seconds]
            if len(recent) >= max_calls:
                self._hits[key] = recent
                return False
            recent.append(now)
            self._hits[key] = recent
            return True

    def reset(self) -> None:
        with self._lock:
            self._hits.clear()


subscribe_rate_limiter = InMemoryRateLimiter()
