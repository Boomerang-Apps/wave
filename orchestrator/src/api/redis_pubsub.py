"""
WAVE v2 Redis Pub/Sub Module

Provides real-time event publishing and subscription for workflow updates.
"""

import os
import json
from dataclasses import dataclass, asdict
from datetime import datetime
from enum import Enum
from typing import Optional, Callable, Dict, Any, List

# Try to import Redis
try:
    import redis
    REDIS_AVAILABLE = True
except ImportError:
    REDIS_AVAILABLE = False


# ═══════════════════════════════════════════════════════════════════════════════
# EVENT TYPES
# ═══════════════════════════════════════════════════════════════════════════════

class EventType(str, Enum):
    """Types of workflow events."""
    WORKFLOW_STARTED = "workflow_started"
    WORKFLOW_PROGRESS = "workflow_progress"
    WORKFLOW_COMPLETE = "workflow_complete"
    WORKFLOW_FAILED = "workflow_failed"
    GATE_ENTERED = "gate_entered"
    GATE_COMPLETE = "gate_complete"
    BUDGET_WARNING = "budget_warning"
    BUDGET_CRITICAL = "budget_critical"
    SAFETY_VIOLATION = "safety_violation"
    AGENT_MESSAGE = "agent_message"


@dataclass
class WorkflowEvent:
    """A workflow event for pub/sub."""
    event_type: str
    thread_id: str
    story_id: str
    timestamp: str
    data: Dict[str, Any]
    project: str = ""
    wave: int = 1
    gate: int = 1
    phase: str = ""

    def to_dict(self) -> dict:
        return asdict(self)

    def to_json(self) -> str:
        return json.dumps(self.to_dict())

    @classmethod
    def from_json(cls, json_str: str) -> "WorkflowEvent":
        data = json.loads(json_str)
        return cls(**data)


# ═══════════════════════════════════════════════════════════════════════════════
# REDIS PUB/SUB
# ═══════════════════════════════════════════════════════════════════════════════

class RedisPubSub:
    """
    Redis-based pub/sub for workflow events.

    Provides real-time event distribution for Portal integration.
    """

    DEFAULT_CHANNEL = "wave:events"

    def __init__(
        self,
        redis_url: Optional[str] = None,
        channel: str = DEFAULT_CHANNEL
    ):
        """
        Initialize Redis pub/sub.

        Args:
            redis_url: Redis connection URL
            channel: Channel name for events
        """
        self.redis_url = redis_url or os.getenv("REDIS_URL", "redis://localhost:6379/0")
        self.channel = channel
        self._client: Optional["redis.Redis"] = None
        self._pubsub: Optional["redis.client.PubSub"] = None
        self._handlers: Dict[str, List[Callable]] = {}

    def _get_client(self) -> Optional["redis.Redis"]:
        """Get or create Redis client."""
        if not REDIS_AVAILABLE:
            return None

        if self._client is None:
            try:
                self._client = redis.from_url(self.redis_url)
                self._client.ping()  # Test connection
            except Exception:
                self._client = None

        return self._client

    def is_connected(self) -> bool:
        """Check if Redis is connected."""
        client = self._get_client()
        if client:
            try:
                return client.ping()
            except Exception:
                pass
        return False

    def publish(self, event: WorkflowEvent) -> bool:
        """
        Publish an event to Redis.

        Args:
            event: Event to publish

        Returns:
            True if published successfully
        """
        client = self._get_client()
        if not client:
            return False

        try:
            # Publish to main channel
            client.publish(self.channel, event.to_json())

            # Also publish to story-specific channel
            story_channel = f"wave:story:{event.story_id}"
            client.publish(story_channel, event.to_json())

            return True
        except Exception:
            return False

    def subscribe(
        self,
        handler: Callable[[WorkflowEvent], None],
        event_type: Optional[str] = None
    ):
        """
        Subscribe to events.

        Args:
            handler: Callback function for events
            event_type: Optional filter for event type
        """
        key = event_type or "*"
        if key not in self._handlers:
            self._handlers[key] = []
        self._handlers[key].append(handler)

    def start_listening(self):
        """Start listening for events (blocking)."""
        client = self._get_client()
        if not client:
            return

        self._pubsub = client.pubsub()
        self._pubsub.subscribe(self.channel)

        for message in self._pubsub.listen():
            if message["type"] == "message":
                try:
                    event = WorkflowEvent.from_json(message["data"])
                    self._dispatch_event(event)
                except Exception:
                    pass

    def _dispatch_event(self, event: WorkflowEvent):
        """Dispatch event to registered handlers."""
        # Call specific handlers
        if event.event_type in self._handlers:
            for handler in self._handlers[event.event_type]:
                try:
                    handler(event)
                except Exception:
                    pass

        # Call wildcard handlers
        if "*" in self._handlers:
            for handler in self._handlers["*"]:
                try:
                    handler(event)
                except Exception:
                    pass

    def close(self):
        """Close Redis connection."""
        if self._pubsub:
            self._pubsub.close()
        if self._client:
            self._client.close()


# ═══════════════════════════════════════════════════════════════════════════════
# HELPER FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════════

# Global pubsub instance
_pubsub: Optional[RedisPubSub] = None


def get_pubsub() -> RedisPubSub:
    """Get or create global pubsub instance."""
    global _pubsub
    if _pubsub is None:
        _pubsub = RedisPubSub()
    return _pubsub


def publish_event(
    event_type: EventType,
    thread_id: str,
    story_id: str,
    data: Dict[str, Any] = None,
    **kwargs
) -> bool:
    """
    Quick helper to publish an event.

    Args:
        event_type: Type of event
        thread_id: Thread ID
        story_id: Story ID
        data: Additional data
        **kwargs: Additional event fields

    Returns:
        True if published
    """
    event = WorkflowEvent(
        event_type=event_type.value,
        thread_id=thread_id,
        story_id=story_id,
        timestamp=datetime.now().isoformat(),
        data=data or {},
        **kwargs
    )

    pubsub = get_pubsub()
    return pubsub.publish(event)


def subscribe_events(
    handler: Callable[[WorkflowEvent], None],
    event_type: Optional[EventType] = None
):
    """
    Quick helper to subscribe to events.

    Args:
        handler: Event handler callback
        event_type: Optional event type filter
    """
    pubsub = get_pubsub()
    type_str = event_type.value if event_type else None
    pubsub.subscribe(handler, type_str)


# ═══════════════════════════════════════════════════════════════════════════════
# MEMORY FALLBACK (for testing without Redis)
# ═══════════════════════════════════════════════════════════════════════════════

class MemoryPubSub:
    """In-memory pub/sub for testing without Redis."""

    def __init__(self):
        self._handlers: Dict[str, List[Callable]] = {}
        self._events: List[WorkflowEvent] = []

    def publish(self, event: WorkflowEvent) -> bool:
        self._events.append(event)
        self._dispatch_event(event)
        return True

    def subscribe(
        self,
        handler: Callable[[WorkflowEvent], None],
        event_type: Optional[str] = None
    ):
        key = event_type or "*"
        if key not in self._handlers:
            self._handlers[key] = []
        self._handlers[key].append(handler)

    def _dispatch_event(self, event: WorkflowEvent):
        if event.event_type in self._handlers:
            for handler in self._handlers[event.event_type]:
                handler(event)
        if "*" in self._handlers:
            for handler in self._handlers["*"]:
                handler(event)

    def get_events(self) -> List[WorkflowEvent]:
        return self._events.copy()

    def is_connected(self) -> bool:
        return True


# ═══════════════════════════════════════════════════════════════════════════════
# EXPORTS
# ═══════════════════════════════════════════════════════════════════════════════

__all__ = [
    "EventType",
    "WorkflowEvent",
    "RedisPubSub",
    "MemoryPubSub",
    "get_pubsub",
    "publish_event",
    "subscribe_events",
    "REDIS_AVAILABLE",
]
