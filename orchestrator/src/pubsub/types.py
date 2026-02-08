"""
WAVE Pub/Sub Types
Story: WAVE-P2-001

Type definitions for Redis Streams-based event messaging.
"""

from enum import Enum
from typing import Optional, Dict, Any
from dataclasses import dataclass, field
from datetime import datetime
from uuid import UUID, uuid4


class EventType(str, Enum):
    """Standard WAVE event types."""
    # Gate events
    GATE_STARTED = "gate.started"
    GATE_PASSED = "gate.passed"
    GATE_FAILED = "gate.failed"

    # Story events
    STORY_STARTED = "story.started"
    STORY_COMPLETED = "story.completed"
    STORY_FAILED = "story.failed"
    STORY_BLOCKED = "story.blocked"

    # Agent events
    AGENT_READY = "agent.ready"
    AGENT_BUSY = "agent.busy"
    AGENT_ERROR = "agent.error"
    AGENT_HANDOFF = "agent.handoff"

    # Session events
    SESSION_STARTED = "session.started"
    SESSION_COMPLETED = "session.completed"
    SESSION_FAILED = "session.failed"

    # System events
    HEALTH_CHECK = "system.health"
    EMERGENCY_STOP = "system.emergency_stop"
    CHECKPOINT_CREATED = "system.checkpoint"


class MessagePriority(str, Enum):
    """Message priority levels."""
    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"
    CRITICAL = "critical"


@dataclass
class WaveMessage:
    """
    A message published to a WAVE event stream.

    Uses Redis Streams (XADD) for durable, ordered delivery.
    """
    event_type: EventType
    payload: Dict[str, Any]
    source: str  # Agent or component that published
    project: str  # Project namespace for channel isolation
    priority: MessagePriority = MessagePriority.NORMAL
    message_id: str = field(default_factory=lambda: str(uuid4()))
    timestamp: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    session_id: Optional[str] = None
    story_id: Optional[str] = None
    correlation_id: Optional[str] = None  # For request/response pairing

    def to_stream_dict(self) -> Dict[str, str]:
        """Serialize to flat dict for Redis XADD (all values must be strings)."""
        data = {
            "event_type": self.event_type.value,
            "payload": _serialize_payload(self.payload),
            "source": self.source,
            "project": self.project,
            "priority": self.priority.value,
            "message_id": self.message_id,
            "timestamp": self.timestamp,
        }
        if self.session_id:
            data["session_id"] = self.session_id
        if self.story_id:
            data["story_id"] = self.story_id
        if self.correlation_id:
            data["correlation_id"] = self.correlation_id
        return data

    @classmethod
    def from_stream_dict(cls, data: Dict[str, str]) -> "WaveMessage":
        """Deserialize from Redis stream entry."""
        return cls(
            event_type=EventType(data["event_type"]),
            payload=_deserialize_payload(data["payload"]),
            source=data["source"],
            project=data["project"],
            priority=MessagePriority(data.get("priority", "normal")),
            message_id=data.get("message_id", str(uuid4())),
            timestamp=data.get("timestamp", datetime.utcnow().isoformat()),
            session_id=data.get("session_id"),
            story_id=data.get("story_id"),
            correlation_id=data.get("correlation_id"),
        )


@dataclass
class StreamEntry:
    """A raw entry read from a Redis Stream."""
    stream_id: str  # Redis stream ID (e.g., "1234567890-0")
    message: WaveMessage


@dataclass
class ConsumerInfo:
    """Consumer group consumer information."""
    name: str
    group: str
    pending_count: int = 0
    idle_ms: int = 0


def _serialize_payload(payload: Dict[str, Any]) -> str:
    """Serialize payload dict to JSON string for Redis storage."""
    import json
    return json.dumps(payload, default=str)


def _deserialize_payload(payload_str: str) -> Dict[str, Any]:
    """Deserialize payload JSON string from Redis."""
    import json
    return json.loads(payload_str)
