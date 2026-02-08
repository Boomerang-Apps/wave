"""
WAVE Signal Types
Story: WAVE-P2-002

Signal type definitions, result schemas, and event-to-handler mapping.
"""

from enum import Enum
from typing import Optional, Dict, Any, List
from dataclasses import dataclass, field


class SignalCategory(str, Enum):
    """Categories for grouping signal types."""
    GATE = "gate"
    AGENT = "agent"
    SESSION = "session"
    SYSTEM = "system"


@dataclass
class HandlerResult:
    """Result returned by a signal handler."""
    success: bool
    action_taken: str = ""
    data: Dict[str, Any] = field(default_factory=dict)
    errors: List[str] = field(default_factory=list)
    should_ack: bool = True  # Whether to acknowledge the message

    @property
    def failed(self) -> bool:
        return not self.success


# Map EventType values to their signal category
SIGNAL_CATEGORIES: Dict[str, SignalCategory] = {
    "gate.started": SignalCategory.GATE,
    "gate.passed": SignalCategory.GATE,
    "gate.failed": SignalCategory.GATE,
    "story.started": SignalCategory.GATE,
    "story.completed": SignalCategory.GATE,
    "story.failed": SignalCategory.GATE,
    "story.blocked": SignalCategory.GATE,
    "agent.ready": SignalCategory.AGENT,
    "agent.busy": SignalCategory.AGENT,
    "agent.error": SignalCategory.AGENT,
    "agent.handoff": SignalCategory.AGENT,
    "session.started": SignalCategory.SESSION,
    "session.completed": SignalCategory.SESSION,
    "session.failed": SignalCategory.SESSION,
    "system.health": SignalCategory.SYSTEM,
    "system.emergency_stop": SignalCategory.SYSTEM,
    "system.checkpoint": SignalCategory.SYSTEM,
}
