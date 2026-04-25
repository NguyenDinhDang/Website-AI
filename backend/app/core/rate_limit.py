"""
Lightweight in-process rate limiter for AI endpoints.

Uses a token-bucket per (user_id, endpoint) stored in a plain dict.
This is intentionally simple — no Redis dependency — and is suitable for
single-process deployments. For multi-process/k8s, swap the storage
backend to Redis using the same interface.

Usage (FastAPI dependency):
    from app.core.rate_limit import ai_rate_limit
    ...
    _: None = Depends(ai_rate_limit(max_calls=20, window_seconds=60))
"""

import time
import logging
from collections import defaultdict, deque
from typing import Callable

from fastapi import Depends, Request

from app.core.exceptions import AppException
from app.dependencies.auth import get_current_user
from app.models.user import User

logger = logging.getLogger(__name__)

# { (user_id, endpoint_key): deque of timestamps }
_buckets: dict[tuple, deque] = defaultdict(deque)


def ai_rate_limit(max_calls: int, window_seconds: int) -> Callable:
    """
    Return a FastAPI dependency that enforces a sliding-window rate limit.

    Raises HTTP 429 when the user exceeds max_calls within window_seconds.
    The limit key is (user_id, request.url.path) so each endpoint has its
    own independent quota.

    Example:
        @router.post("/chat")
        async def chat(req, _=Depends(ai_rate_limit(max_calls=20, window_seconds=60))):
            ...
    """
    async def _check(
        request: Request,
        current_user: User = Depends(get_current_user),
    ) -> None:
        key = (current_user.id, request.url.path)
        now = time.monotonic()
        window_start = now - window_seconds
        bucket = _buckets[key]

        # Evict timestamps outside the current window
        while bucket and bucket[0] < window_start:
            bucket.popleft()

        if len(bucket) >= max_calls:
            retry_after = int(bucket[0] - window_start) + 1
            logger.warning(
                "Rate limit exceeded: user=%d path=%s calls=%d/%d window=%ds",
                current_user.id, request.url.path, len(bucket), max_calls, window_seconds,
            )
            raise AppException(
                429,
                f"Too many requests. Limit: {max_calls} calls per {window_seconds}s. "
                f"Retry after {retry_after}s.",
            )

        bucket.append(now)

    return _check
