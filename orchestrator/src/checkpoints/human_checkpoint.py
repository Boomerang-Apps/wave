"""
Human Checkpoint
Story: WAVE-P5-002

Configurable checkpoint levels that determine when the pipeline
pauses for human review.
"""

import enum
import logging

logger = logging.getLogger(__name__)


class CheckpointLevel(enum.IntEnum):
    """Levels of human oversight (AC-01)."""
    EVERY_GATE = 1       # Pause after every gate (AC-02)
    AFTER_STORY = 2      # Pause after story completion (AC-03)
    PRE_MERGE_ONLY = 3   # Pause only before final merge (AC-04)
    FULL_AUTONOMY = 4    # No pauses (AC-05)


class CheckpointEvent(enum.Enum):
    """Events that can trigger a checkpoint."""
    GATE_COMPLETE = "gate_complete"
    STORY_COMPLETE = "story_complete"
    PRE_MERGE = "pre_merge"


# Which events pause at each level
_PAUSE_RULES = {
    CheckpointLevel.EVERY_GATE: {
        CheckpointEvent.GATE_COMPLETE,
        CheckpointEvent.STORY_COMPLETE,
        CheckpointEvent.PRE_MERGE,
    },
    CheckpointLevel.AFTER_STORY: {
        CheckpointEvent.STORY_COMPLETE,
        CheckpointEvent.PRE_MERGE,
    },
    CheckpointLevel.PRE_MERGE_ONLY: {
        CheckpointEvent.PRE_MERGE,
    },
    CheckpointLevel.FULL_AUTONOMY: set(),
}


class HumanCheckpoint:
    """
    Configurable human-in-the-loop checkpoint (AC-01 through AC-05).

    Determines whether the pipeline should pause at a given event
    based on the configured checkpoint level.
    """

    def __init__(self, level: CheckpointLevel = CheckpointLevel.PRE_MERGE_ONLY):
        self.level = level

    def should_pause(self, event: CheckpointEvent) -> bool:
        """
        Check if pipeline should pause at this event.

        Args:
            event: The pipeline event type.

        Returns:
            True if human review is required.
        """
        pause_events = _PAUSE_RULES.get(self.level, set())
        return event in pause_events
