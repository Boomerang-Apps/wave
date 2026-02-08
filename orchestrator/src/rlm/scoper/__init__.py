"""
Domain Scoper Sub-module
Story: WAVE-P4-002

Analyzes codebases to determine file relevance per domain using
config patterns, import graph analysis, and relevance scoring.
"""

from .domain_scoper import DomainScoper, ScopedFile
from .import_analyzer import ImportAnalyzer
from .scope_cache import ScopeCache

__all__ = [
    "DomainScoper",
    "ScopedFile",
    "ImportAnalyzer",
    "ScopeCache",
]
