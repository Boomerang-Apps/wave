"""
Result Collector
Story: WAVE-P4-003

Collects and aggregates results from multiple subagents.
"""

import logging
from typing import Dict, List

from .subagent import SubagentResult

logger = logging.getLogger(__name__)


class ResultCollector:
    """
    Collects subagent results and provides aggregated summaries (AC-03).
    """

    def __init__(self, parent_story_id: str):
        self.parent_story_id = parent_story_id
        self.results: List[SubagentResult] = []

    def add(self, result: SubagentResult) -> None:
        """Add a subagent result."""
        self.results.append(result)

    def summary(self) -> Dict:
        """
        Aggregated summary of all collected results.

        Returns:
            Dict with total, succeeded, failed, total_tokens, files_modified.
        """
        succeeded = sum(1 for r in self.results if r.success)
        failed = sum(1 for r in self.results if not r.success)
        total_tokens = sum(r.tokens_used for r in self.results)
        all_files = []
        for r in self.results:
            all_files.extend(r.files_modified)

        return {
            "parent_story_id": self.parent_story_id,
            "total": len(self.results),
            "succeeded": succeeded,
            "failed": failed,
            "total_tokens": total_tokens,
            "files_modified": list(set(all_files)),
            "errors": [
                {"subagent_id": r.subagent_id, "error": r.error}
                for r in self.results if r.error
            ],
        }
