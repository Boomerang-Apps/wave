"""
RLM Context Manager
Story: WAVE-P4-001

Intelligent context management for WAVE agents. Loads only relevant
files based on domain scope and story requirements, enforces token
limits via LRU eviction, and supports state externalization.
"""

import logging
import os
from dataclasses import dataclass, field
from fnmatch import fnmatch
from typing import Any, Dict, List, Optional

from .lru_cache import LRUContextCache
from .token_tracker import estimate_tokens

logger = logging.getLogger(__name__)


@dataclass
class ContextEntry:
    """A file loaded into context."""
    path: str
    content: str
    tokens: int
    pinned: bool = False


class RLMContextManager:
    """
    Manages agent context using RLM principles.

    - Domain-scoped loading (AC-01): only loads files matching domain patterns
    - Story-specific context (AC-02): loads files from story.context.read_files
    - Token-limited LRU cache (AC-03): evicts oldest when over limit
    - On-demand retrieval (AC-05): dynamically loads files when requested
    - Pins domain files (AC-07): prevents eviction of critical domain context
    """

    def __init__(
        self,
        domain: str,
        domain_config: dict,
        repo_path: str,
        max_tokens: int = 100000,
    ):
        self.domain = domain
        self.domain_config = domain_config
        self.repo_path = repo_path
        self.max_tokens = max_tokens
        self._cache = LRUContextCache(max_tokens=max_tokens)
        self._domain_patterns: List[str] = self._resolve_domain_patterns()

    def _resolve_domain_patterns(self) -> List[str]:
        """Get file patterns for this domain from config."""
        domains = self.domain_config.get("domains", [])
        for d in domains:
            if d.get("id") == self.domain:
                return d.get("file_patterns", [])
        return []

    def load_domain_context(self) -> None:
        """
        Load all files matching domain patterns (AC-01).

        Walks the repo and loads files that match domain file_patterns.
        Domain files are pinned to prevent eviction.
        """
        if not self._domain_patterns:
            logger.warning("No patterns for domain %s", self.domain)
            return

        for root, _, files in os.walk(self.repo_path):
            for fname in files:
                full_path = os.path.join(root, fname)
                rel_path = os.path.relpath(full_path, self.repo_path)

                if self._matches_domain(rel_path):
                    self._load_file(rel_path, pinned=True)

    def load_story_context(self, story: dict) -> None:
        """
        Load files specified in story's context.read_files (AC-02).

        Args:
            story: Story JSON dict.
        """
        context = story.get("context", {})
        read_files = context.get("read_files", [])

        for file_path in read_files:
            self._load_file(file_path, pinned=False)

    def retrieve(self, file_path: str) -> Optional[str]:
        """
        Retrieve a file on demand (AC-05).

        If the file is already cached, return it. Otherwise, load it
        from disk and add it to the cache (unpinned).

        Args:
            file_path: Relative path from repo root.

        Returns:
            File content, or None if not found.
        """
        # Check cache first
        cached = self._cache.get(file_path)
        if cached is not None:
            return cached

        # Load from disk
        return self._load_file(file_path, pinned=False)

    def loaded_files(self) -> List[str]:
        """Return list of currently loaded file paths."""
        return self._cache.keys()

    @property
    def total_tokens(self) -> int:
        """Total tokens currently in cache."""
        return self._cache.total_tokens

    @property
    def pinned_count(self) -> int:
        """Count of pinned entries in cache."""
        return self._cache.pinned_count()

    def get_context(self) -> Dict[str, str]:
        """Return all cached content as {path: content} dict."""
        result = {}
        for key in self._cache.keys():
            content = self._cache.get(key)
            if content is not None:
                result[key] = content
        return result

    def _matches_domain(self, rel_path: str) -> bool:
        """Check if a file path matches any domain pattern."""
        for pattern in self._domain_patterns:
            if _glob_match(rel_path, pattern):
                return True
        return False

    def _load_file(self, rel_path: str, pinned: bool = False) -> Optional[str]:
        """
        Load a file into the cache.

        Args:
            rel_path: Relative path from repo root.
            pinned: If True, mark as pinned (no eviction).

        Returns:
            File content, or None if file doesn't exist.
        """
        full_path = os.path.join(self.repo_path, rel_path)
        if not os.path.isfile(full_path):
            return None

        try:
            with open(full_path, "r") as f:
                content = f.read()
        except (IOError, UnicodeDecodeError):
            return None

        tokens = estimate_tokens(content)
        self._cache.put(rel_path, content, tokens=tokens, pinned=pinned)
        return content


def _glob_match(path: str, pattern: str) -> bool:
    """
    Match a file path against a glob pattern supporting **.

    Handles patterns like 'src/auth/**/*' where ** matches
    any number of directory levels.
    """
    if "**" not in pattern:
        return fnmatch(path, pattern)

    idx = pattern.index("**")
    prefix_pattern = pattern[:idx].rstrip("/")
    suffix_pattern = pattern[idx + 2:].lstrip("/")

    path_segments = path.split("/")

    if not prefix_pattern:
        for i in range(len(path_segments)):
            sub = "/".join(path_segments[i:])
            if not suffix_pattern or fnmatch(sub, suffix_pattern):
                return True
        return not suffix_pattern

    prefix_seg_count = len(prefix_pattern.split("/"))
    for n in range(prefix_seg_count, len(path_segments) + 1):
        candidate_prefix = "/".join(path_segments[:n])
        if fnmatch(candidate_prefix, prefix_pattern):
            remaining_segments = path_segments[n:]
            if not suffix_pattern:
                return True
            for i in range(len(remaining_segments)):
                sub = "/".join(remaining_segments[i:])
                if fnmatch(sub, suffix_pattern):
                    return True
    return False


__all__ = [
    "RLMContextManager",
    "ContextEntry",
]
