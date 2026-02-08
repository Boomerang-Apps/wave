"""
Domain Scoper
Story: WAVE-P4-002

Analyzes the codebase to determine which files are relevant for each
domain. Uses config patterns, import graph analysis, shared dependency
detection, caching, and relevance scoring.
"""

import logging
import os
from dataclasses import dataclass
from fnmatch import fnmatch
from typing import Dict, List, Optional, Set

from .import_analyzer import ImportAnalyzer
from .scope_cache import ScopeCache

logger = logging.getLogger(__name__)


@dataclass
class ScopedFile:
    """A file in a domain's scope with relevance metadata."""
    path: str
    relevance: float  # 0.0 to 1.0
    is_domain_native: bool = True
    is_shared: bool = False
    import_depth: int = 0


class DomainScoper:
    """
    Computes domain-specific file scopes using config patterns
    and import graph analysis.

    - AC-01: Scope from config patterns
    - AC-02: Import graph for transitive dependencies
    - AC-03: Shared dependency identification
    - AC-04: Scope caching
    - AC-05: Relevance ranking (0-1)
    - AC-06: Invalidation on file changes
    """

    def __init__(self, repo_path: str, domain_config: dict):
        self.repo_path = repo_path
        self.domain_config = domain_config
        self._analyzer = ImportAnalyzer(repo_path)
        self._cache = ScopeCache()
        self._all_files: Optional[List[str]] = None

    def compute_scope(self, domain: str) -> List[ScopedFile]:
        """
        Compute the file scope for a domain (AC-01, AC-02, AC-05).

        Returns cached result if available.

        Args:
            domain: Domain ID (e.g. 'auth').

        Returns:
            List of ScopedFile sorted by relevance (descending).
        """
        cached = self._cache.get(domain)
        if cached is not None:
            return cached

        # Step 1: Get domain-native files from config patterns (AC-01)
        patterns = self._get_domain_patterns(domain)
        native_files = self._find_matching_files(patterns)

        # Step 2: Analyze imports for transitive dependencies (AC-02)
        imported_files: Dict[str, int] = {}  # path -> min import depth
        for f in native_files:
            deps = self._analyzer.get_transitive_imports(f)
            for dep in deps:
                if dep not in native_files:
                    current_depth = imported_files.get(dep, 999)
                    imported_files[dep] = min(current_depth, 1)

        # Step 3: Build ScopedFile list with relevance scores (AC-05)
        scope: List[ScopedFile] = []

        for f in native_files:
            scope.append(ScopedFile(
                path=f,
                relevance=1.0,
                is_domain_native=True,
                import_depth=0,
            ))

        for f, depth in imported_files.items():
            # Imported files get lower relevance based on depth
            relevance = max(0.1, 0.7 - (depth * 0.1))
            scope.append(ScopedFile(
                path=f,
                relevance=relevance,
                is_domain_native=False,
                import_depth=depth,
            ))

        # Sort by relevance descending
        scope.sort(key=lambda s: s.relevance, reverse=True)

        # Cache the result (AC-04)
        self._cache.put(domain, scope)
        return scope

    def find_shared_files(self) -> List[ScopedFile]:
        """
        Find files that are imported by multiple domains (AC-03).

        Returns:
            List of ScopedFile that are used by 2+ domains.
        """
        domains = [d["id"] for d in self.domain_config.get("domains", [])]
        file_domain_count: Dict[str, Set[str]] = {}

        for domain in domains:
            scope = self.compute_scope(domain)
            for s in scope:
                if s.path not in file_domain_count:
                    file_domain_count[s.path] = set()
                file_domain_count[s.path].add(domain)

        shared = []
        for path, using_domains in file_domain_count.items():
            if len(using_domains) >= 2:
                shared.append(ScopedFile(
                    path=path,
                    relevance=0.5,
                    is_domain_native=False,
                    is_shared=True,
                ))

        return shared

    def invalidate(self, domain: str) -> None:
        """
        Invalidate cached scope for a domain (AC-06).

        Call when files in the domain are modified.
        """
        self._cache.invalidate(domain)

    def _get_domain_patterns(self, domain: str) -> List[str]:
        """Get file patterns for a domain from config."""
        for d in self.domain_config.get("domains", []):
            if d.get("id") == domain:
                return d.get("file_patterns", [])
        return []

    def _find_matching_files(self, patterns: List[str]) -> Set[str]:
        """Find all files in repo matching any of the patterns."""
        if self._all_files is None:
            self._all_files = self._scan_files()

        matches = set()
        for f in self._all_files:
            for pattern in patterns:
                if _glob_match(f, pattern):
                    matches.add(f)
                    break
        return matches

    def _scan_files(self) -> List[str]:
        """Scan repo for all files (relative paths)."""
        files = []
        for root, _, filenames in os.walk(self.repo_path):
            for fname in filenames:
                full = os.path.join(root, fname)
                rel = os.path.relpath(full, self.repo_path)
                files.append(rel)
        return files


def _glob_match(path: str, pattern: str) -> bool:
    """Match a file path against a glob pattern supporting **."""
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
