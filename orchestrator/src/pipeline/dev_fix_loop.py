"""
Dev-Fix Loop
Story: WAVE-P5-001

Retries fixing QA failures up to a configurable max (default 3).
"""

import logging
from dataclasses import dataclass, field
from typing import Any, Callable, Dict, List

from .qa_trigger import QAResult

logger = logging.getLogger(__name__)


@dataclass
class FixAttempt:
    """Result of a fix attempt."""
    story_id: str
    attempt_number: int
    attempted: bool
    success: bool = False
    files_modified: List[str] = field(default_factory=list)
    reason: str = ""


class DevFixLoop:
    """
    Attempts to fix QA failures up to max_retries (AC-05).
    """

    def __init__(self, max_retries: int = 3):
        self.max_retries = max_retries
        self._attempt_counts: Dict[str, int] = {}

    def attempt_fix(
        self,
        qa_result: QAResult,
        fix_fn: Callable[[List[str]], Dict[str, Any]],
    ) -> FixAttempt:
        """
        Attempt to fix QA failures.

        Args:
            qa_result: The failed QA result.
            fix_fn: Callable(error_details) → {fixed: bool, files_modified: list}.

        Returns:
            FixAttempt with results.
        """
        story_id = qa_result.story_id
        count = self._attempt_counts.get(story_id, 0)

        if count >= self.max_retries:
            return FixAttempt(
                story_id=story_id,
                attempt_number=count + 1,
                attempted=False,
                reason="max_retries_exceeded",
            )

        self._attempt_counts[story_id] = count + 1

        try:
            raw = fix_fn(qa_result.error_details)
            success = raw.get("fixed", False)

            return FixAttempt(
                story_id=story_id,
                attempt_number=count + 1,
                attempted=True,
                success=success,
                files_modified=raw.get("files_modified", []),
            )
        except Exception as e:
            logger.error("Fix attempt %d for %s failed: %s", count + 1, story_id, e)
            return FixAttempt(
                story_id=story_id,
                attempt_number=count + 1,
                attempted=True,
                success=False,
                reason=str(e),
            )
