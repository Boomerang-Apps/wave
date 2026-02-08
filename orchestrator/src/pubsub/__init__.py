"""
WAVE Pub/Sub Infrastructure
Story: WAVE-P2-001

Redis Streams-based event messaging for inter-agent communication.
Replaces polling-based signal detection (10s latency) with
event-driven messaging (<100ms latency).
"""

from .types import (
    EventType,
    MessagePriority,
    WaveMessage,
    StreamEntry,
    ConsumerInfo,
)
from .channels import ChannelManager
from .redis_client import RedisClient
from .publisher import Publisher
from .subscriber import Subscriber

__all__ = [
    "EventType",
    "MessagePriority",
    "WaveMessage",
    "StreamEntry",
    "ConsumerInfo",
    "ChannelManager",
    "RedisClient",
    "Publisher",
    "Subscriber",
]
