"""
Cost Tracker
Story: WAVE-P5-001

Tracks token usage and costs per story and overall pipeline.
"""

from dataclasses import dataclass, field
from typing import Dict, List


@dataclass
class CostEntry:
    """A cost entry for a story."""
    story_id: str
    tokens: int
    cost: float


class CostTracker:
    """
    Tracks costs throughout the pipeline (AC-07).
    """

    def __init__(self, budget_limit: float = 100.0):
        self.budget_limit = budget_limit
        self._entries: List[CostEntry] = []
        self._per_story: Dict[str, float] = {}

    def record(self, story_id: str, tokens: int, cost: float) -> None:
        """Record token usage and cost for a story."""
        self._entries.append(CostEntry(
            story_id=story_id,
            tokens=tokens,
            cost=cost,
        ))
        self._per_story[story_id] = (
            self._per_story.get(story_id, 0.0) + cost
        )

    def get_story_cost(self, story_id: str) -> float:
        """Get total cost for a specific story."""
        return self._per_story.get(story_id, 0.0)

    @property
    def total_cost(self) -> float:
        """Total cost across all stories."""
        return sum(e.cost for e in self._entries)

    @property
    def total_tokens(self) -> int:
        """Total tokens across all stories."""
        return sum(e.tokens for e in self._entries)

    @property
    def budget_exceeded(self) -> bool:
        """Check if budget has been exceeded."""
        return self.total_cost > self.budget_limit

    def summary(self) -> dict:
        """Return cost summary."""
        return {
            "total_cost": round(self.total_cost, 4),
            "total_tokens": self.total_tokens,
            "budget_limit": self.budget_limit,
            "budget_exceeded": self.budget_exceeded,
            "per_story": dict(self._per_story),
        }
