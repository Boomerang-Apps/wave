"""
Token Tracker
Story: WAVE-P4-001

Tracks token usage: baseline vs actual for cost reduction measurement.
"""

import logging
from dataclasses import dataclass, field
from typing import Dict

logger = logging.getLogger(__name__)


@dataclass
class StoryUsage:
    """Token usage for a single story."""
    story_id: str
    tokens_used: int = 0
    baseline_tokens: int = 0


class TokenTracker:
    """
    Tracks token usage for cost reduction verification (AC-06).

    Records baseline (full codebase) vs actual (domain-scoped) usage
    to measure the >50% reduction target.
    """

    def __init__(self):
        self.baseline_tokens: int = 0
        self.actual_tokens: int = 0
        self._per_story: Dict[str, StoryUsage] = {}

    def set_baseline(self, full_codebase_tokens: int) -> None:
        """Set the baseline token count (full codebase)."""
        self.baseline_tokens = full_codebase_tokens

    def record_actual(self, tokens_used: int, story_id: str = "") -> None:
        """
        Record actual tokens used (domain-scoped).

        Args:
            tokens_used: Tokens actually used.
            story_id: Optional story identifier for per-story tracking.
        """
        self.actual_tokens = tokens_used
        if story_id:
            if story_id not in self._per_story:
                self._per_story[story_id] = StoryUsage(story_id=story_id)
            self._per_story[story_id].tokens_used = tokens_used

    @property
    def reduction_percent(self) -> float:
        """Calculate percentage reduction from baseline."""
        if self.baseline_tokens <= 0:
            return 0.0
        reduction = self.baseline_tokens - self.actual_tokens
        return (reduction / self.baseline_tokens) * 100

    @property
    def meets_target(self) -> bool:
        """Check if >50% reduction target is met."""
        return self.reduction_percent > 50.0

    def get_summary(self) -> dict:
        """Return usage summary."""
        return {
            "baseline_tokens": self.baseline_tokens,
            "actual_tokens": self.actual_tokens,
            "reduction_percent": round(self.reduction_percent, 1),
            "meets_target": self.meets_target,
            "per_story": {
                sid: {"tokens_used": u.tokens_used}
                for sid, u in self._per_story.items()
            },
        }


def estimate_tokens(content: str) -> int:
    """
    Estimate token count for a string.

    Uses ~4 chars per token heuristic.
    """
    return len(content) // 4
