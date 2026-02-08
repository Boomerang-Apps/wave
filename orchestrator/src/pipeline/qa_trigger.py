"""
QA Trigger
Story: WAVE-P5-001

Automatically triggers QA when development completes.
"""

import logging
from dataclasses import dataclass, field
from typing import Any, Callable, Dict, List

logger = logging.getLogger(__name__)


@dataclass
class QAResult:
    """Result of QA testing."""
    story_id: str
    passed: bool
    tests_run: int = 0
    failures: int = 0
    error_details: List[str] = field(default_factory=list)


class QATrigger:
    """
    Automatically runs QA on completed stories (AC-04).
    """

    def run_qa(
        self,
        story_id: str,
        files_modified: List[str],
        test_fn: Callable[[List[str]], Dict[str, Any]],
    ) -> QAResult:
        """
        Run QA for a completed story.

        Args:
            story_id: Story being tested.
            files_modified: Files changed by development.
            test_fn: Callable that runs tests on files → result dict.

        Returns:
            QAResult with pass/fail and details.
        """
        try:
            raw = test_fn(files_modified)
            return QAResult(
                story_id=story_id,
                passed=raw.get("passed", False),
                tests_run=raw.get("tests_run", 0),
                failures=raw.get("failures", 0),
                error_details=raw.get("error_details", []),
            )
        except Exception as e:
            logger.error("QA failed for %s: %s", story_id, e)
            return QAResult(
                story_id=story_id,
                passed=False,
                error_details=[str(e)],
            )
