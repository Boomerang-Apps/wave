"""
Scope Cache
Story: WAVE-P4-002

Caches computed domain scopes for performance.
Supports per-domain invalidation.
"""

import logging
import time
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)


class ScopeCache:
    """
    Per-domain scope cache with invalidation support (AC-04, AC-06).
    """

    def __init__(self):
        self._cache: Dict[str, Any] = {}
        self._timestamps: Dict[str, float] = {}

    def get(self, domain: str) -> Optional[Any]:
        """Get cached scope for domain, or None if not cached."""
        return self._cache.get(domain)

    def put(self, domain: str, scope: Any) -> None:
        """Cache scope for domain."""
        self._cache[domain] = scope
        self._timestamps[domain] = time.monotonic()

    def invalidate(self, domain: str) -> None:
        """Invalidate cached scope for domain."""
        self._cache.pop(domain, None)
        self._timestamps.pop(domain, None)
        logger.debug("Invalidated scope cache for %s", domain)

    def invalidate_all(self) -> None:
        """Invalidate all cached scopes."""
        self._cache.clear()
        self._timestamps.clear()

    def has(self, domain: str) -> bool:
        """Check if scope is cached for domain."""
        return domain in self._cache
