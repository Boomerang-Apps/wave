"""
Merge Finalizer
Story: WAVE-P5-001

Checks merge readiness and coordinates final merge to main.
"""

from dataclasses import dataclass, field
from typing import List

from .qa_trigger import QAResult


@dataclass
class MergeStatus:
    """Status of merge readiness."""
    ready: bool
    blocking_stories: List[str] = field(default_factory=list)
    total_stories: int = 0
    passed_stories: int = 0


class MergeFinalizer:
    """
    Coordinates final merge after all QA passes (AC-06).
    """

    def check_merge_readiness(self, qa_results: List[QAResult]) -> MergeStatus:
        """
        Check if all stories have passed QA.

        Args:
            qa_results: QA results for all stories.

        Returns:
            MergeStatus indicating readiness.
        """
        blocking = [r.story_id for r in qa_results if not r.passed]
        passed = sum(1 for r in qa_results if r.passed)

        return MergeStatus(
            ready=len(blocking) == 0,
            blocking_stories=blocking,
            total_stories=len(qa_results),
            passed_stories=passed,
        )
