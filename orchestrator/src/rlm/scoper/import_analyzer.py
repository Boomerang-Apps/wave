"""
Import Analyzer
Story: WAVE-P4-002

Parses Python import statements to build a dependency graph.
Supports 'import X' and 'from X import Y' patterns.
"""

import logging
import os
import re
from typing import List, Set

logger = logging.getLogger(__name__)

# Patterns for Python imports
_IMPORT_RE = re.compile(
    r"^\s*(?:from\s+([\w.]+)\s+import|import\s+([\w.]+))",
    re.MULTILINE,
)


class ImportAnalyzer:
    """
    Analyzes Python imports to build a file dependency graph.

    Parses import statements and resolves them to file paths
    relative to the repo root.
    """

    def __init__(self, repo_path: str):
        self.repo_path = repo_path

    def get_imports(self, rel_path: str) -> List[str]:
        """
        Get direct imports from a Python file.

        Args:
            rel_path: File path relative to repo root.

        Returns:
            List of resolved file paths (relative to repo).
        """
        full_path = os.path.join(self.repo_path, rel_path)
        if not os.path.isfile(full_path):
            return []

        try:
            with open(full_path, "r") as f:
                content = f.read()
        except (IOError, UnicodeDecodeError):
            return []

        imports = []
        for match in _IMPORT_RE.finditer(content):
            module = match.group(1) or match.group(2)
            if module:
                resolved = self._resolve_module(module)
                if resolved:
                    imports.append(resolved)

        return imports

    def get_transitive_imports(
        self, rel_path: str, max_depth: int = 10
    ) -> Set[str]:
        """
        Get all transitive imports (BFS).

        Args:
            rel_path: Starting file path.
            max_depth: Maximum depth to prevent infinite loops.

        Returns:
            Set of all transitively imported file paths.
        """
        visited: Set[str] = set()
        queue = [(rel_path, 0)]

        while queue:
            current, depth = queue.pop(0)
            if current in visited or depth > max_depth:
                continue
            visited.add(current)

            for imp in self.get_imports(current):
                if imp not in visited:
                    queue.append((imp, depth + 1))

        # Remove the starting file itself
        visited.discard(rel_path)
        return visited

    def _resolve_module(self, module_path: str) -> str:
        """
        Resolve a dotted module path to a file path.

        'src.auth.login' → 'src/auth/login.py'
        """
        parts = module_path.split(".")
        # Try as a .py file
        candidate = os.path.join(*parts) + ".py"
        full = os.path.join(self.repo_path, candidate)
        if os.path.isfile(full):
            return candidate

        # Try as a package (__init__.py)
        candidate_pkg = os.path.join(*parts, "__init__.py")
        full_pkg = os.path.join(self.repo_path, candidate_pkg)
        if os.path.isfile(full_pkg):
            return candidate_pkg

        return ""
