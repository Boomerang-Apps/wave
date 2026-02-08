"""
LRU Context Cache
Story: WAVE-P4-001

Least Recently Used cache for context entries with token-based limits.
Supports pinning critical files to prevent eviction.
"""

import logging
import time
from collections import OrderedDict
from dataclasses import dataclass
from typing import Optional

logger = logging.getLogger(__name__)


@dataclass
class CacheEntry:
    """A cached context entry."""
    content: str
    tokens: int
    pinned: bool = False
    last_access: float = 0.0


class LRUContextCache:
    """
    Token-limited LRU cache for file context.

    Evicts least recently used unpinned entries when the total
    token count exceeds max_tokens.
    """

    def __init__(self, max_tokens: int = 100000):
        self.max_tokens = max_tokens
        self._entries: OrderedDict[str, CacheEntry] = OrderedDict()
        self._total_tokens: int = 0
        self.hits: int = 0
        self.misses: int = 0

    @property
    def total_tokens(self) -> int:
        return self._total_tokens

    @property
    def hit_rate(self) -> float:
        total = self.hits + self.misses
        return self.hits / total if total > 0 else 0.0

    def put(
        self,
        key: str,
        content: str,
        tokens: int,
        pinned: bool = False,
    ) -> None:
        """
        Add or update an entry in the cache.

        If adding the entry would exceed max_tokens, evict LRU
        unpinned entries until there is room.

        Args:
            key: File path or identifier.
            content: File content.
            tokens: Estimated token count.
            pinned: If True, entry is protected from eviction.
        """
        # Remove existing entry if present
        if key in self._entries:
            old = self._entries.pop(key)
            self._total_tokens -= old.tokens

        # Evict until we have room
        while (self._total_tokens + tokens > self.max_tokens
               and self._entries):
            evicted = self._evict_one()
            if evicted is None:
                # Only pinned entries remain, can't evict more
                break

        # Add the new entry
        entry = CacheEntry(
            content=content,
            tokens=tokens,
            pinned=pinned,
            last_access=time.monotonic(),
        )
        self._entries[key] = entry
        self._total_tokens += tokens

        # Move to end (most recent)
        self._entries.move_to_end(key)

    def get(self, key: str) -> Optional[str]:
        """
        Retrieve content by key, updating access time.

        Returns None and increments miss counter if not found.
        """
        if key not in self._entries:
            self.misses += 1
            return None

        self.hits += 1
        entry = self._entries[key]
        entry.last_access = time.monotonic()
        # Move to end (most recent)
        self._entries.move_to_end(key)
        return entry.content

    def keys(self) -> list:
        """Return all cache keys."""
        return list(self._entries.keys())

    def pinned_count(self) -> int:
        """Return count of pinned entries."""
        return sum(1 for e in self._entries.values() if e.pinned)

    def _evict_one(self) -> Optional[str]:
        """
        Evict the least recently used unpinned entry.

        Returns the evicted key, or None if only pinned entries remain.
        """
        for key in list(self._entries.keys()):
            entry = self._entries[key]
            if not entry.pinned:
                self._entries.pop(key)
                self._total_tokens -= entry.tokens
                logger.debug("Evicted %s (%d tokens)", key, entry.tokens)
                return key
        return None

    def __contains__(self, key: str) -> bool:
        return key in self._entries

    def __len__(self) -> int:
        return len(self._entries)
