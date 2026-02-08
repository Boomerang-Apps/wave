"""
WAVE Event Publisher
Story: WAVE-P2-001

Publishes messages to Redis Streams using XADD for durable delivery (AC-01).
"""

import logging
from typing import Optional, List

from redis.exceptions import ConnectionError, RedisError

from .redis_client import RedisClient
from .channels import ChannelManager
from .types import WaveMessage, EventType, MessagePriority

logger = logging.getLogger(__name__)

# Stream limits
DEFAULT_MAX_STREAM_LEN = 10000  # Max messages per stream (AC safety: overflow >10k)


class Publisher:
    """
    Publishes WAVE events to Redis Streams.

    Uses XADD for durable, ordered message delivery.
    Supports batch publishing and retry on failure.
    """

    def __init__(
        self,
        redis_client: RedisClient,
        project: str,
        source: str,
        max_stream_len: int = DEFAULT_MAX_STREAM_LEN,
    ):
        """
        Initialize publisher.

        Args:
            redis_client: Managed Redis client
            project: Project name for channel namespacing
            source: Publisher identity (agent name or component)
            max_stream_len: Max stream length before trimming
        """
        self.redis = redis_client
        self.channels = ChannelManager(project)
        self.project = project
        self.source = source
        self.max_stream_len = max_stream_len
        self._publish_count = 0

    def publish(
        self,
        event_type: EventType,
        payload: dict,
        channel: Optional[str] = None,
        session_id: Optional[str] = None,
        story_id: Optional[str] = None,
        priority: MessagePriority = MessagePriority.NORMAL,
        correlation_id: Optional[str] = None,
    ) -> str:
        """
        Publish a message to a Redis Stream.

        Args:
            event_type: Type of event
            payload: Event data
            channel: Target channel (defaults to signals channel)
            session_id: Optional session ID
            story_id: Optional story ID
            priority: Message priority
            correlation_id: Optional correlation ID for request/response

        Returns:
            Redis stream entry ID

        Raises:
            ConnectionError: If Redis is unreachable
        """
        message = WaveMessage(
            event_type=event_type,
            payload=payload,
            source=self.source,
            project=self.project,
            priority=priority,
            session_id=session_id,
            story_id=story_id,
            correlation_id=correlation_id,
        )

        target_channel = channel or self.channels.signals()
        return self._xadd(target_channel, message)

    def publish_message(
        self,
        message: WaveMessage,
        channel: Optional[str] = None,
    ) -> str:
        """
        Publish a pre-built WaveMessage.

        Args:
            message: Pre-built message
            channel: Target channel (defaults to signals channel)

        Returns:
            Redis stream entry ID
        """
        target_channel = channel or self.channels.signals()
        return self._xadd(target_channel, message)

    def publish_batch(
        self,
        messages: List[WaveMessage],
        channel: Optional[str] = None,
    ) -> List[str]:
        """
        Publish multiple messages in a pipeline.

        Args:
            messages: List of messages to publish
            channel: Target channel (defaults to signals channel)

        Returns:
            List of Redis stream entry IDs
        """
        if not messages:
            return []

        target_channel = channel or self.channels.signals()
        client = self.redis.client
        pipe = client.pipeline(transaction=False)

        for msg in messages:
            pipe.xadd(
                target_channel,
                msg.to_stream_dict(),
                maxlen=self.max_stream_len,
                approximate=True,
            )

        results = pipe.execute()
        self._publish_count += len(messages)

        logger.debug(
            "Batch published %d messages to %s",
            len(messages),
            target_channel,
        )
        return results

    def publish_to_agent(
        self,
        agent_id: str,
        event_type: EventType,
        payload: dict,
        **kwargs,
    ) -> str:
        """
        Publish directly to an agent's channel.

        Args:
            agent_id: Target agent ID
            event_type: Type of event
            payload: Event data
            **kwargs: Additional WaveMessage fields

        Returns:
            Redis stream entry ID
        """
        channel = self.channels.agent(agent_id)
        return self.publish(event_type, payload, channel=channel, **kwargs)

    def publish_gate_event(
        self,
        gate: str,
        event_type: EventType,
        payload: dict,
        **kwargs,
    ) -> str:
        """
        Publish to a gate-specific channel.

        Args:
            gate: Gate name (e.g., "gate-0")
            event_type: Type of event
            payload: Event data
            **kwargs: Additional WaveMessage fields

        Returns:
            Redis stream entry ID
        """
        channel = self.channels.gate(gate)
        return self.publish(event_type, payload, channel=channel, **kwargs)

    @property
    def publish_count(self) -> int:
        """Total messages published by this publisher."""
        return self._publish_count

    def _xadd(self, channel: str, message: WaveMessage) -> str:
        """
        Execute XADD with retry.

        Args:
            channel: Stream name
            message: Message to publish

        Returns:
            Stream entry ID
        """
        def _do_xadd(client, ch, msg):
            return client.xadd(
                ch,
                msg.to_stream_dict(),
                maxlen=self.max_stream_len,
                approximate=True,
            )

        result = self.redis.execute_with_retry(_do_xadd, channel, message)
        self._publish_count += 1

        logger.debug(
            "Published %s to %s (id=%s)",
            message.event_type.value,
            channel,
            result,
        )
        return result
