"""
WAVE Event Subscriber
Story: WAVE-P2-001

Subscribes to Redis Streams using XREADGROUP for load-balanced consumption (AC-02, AC-03).
"""

import logging
import time
from typing import Optional, List, Callable, Dict, Any

from redis.exceptions import ConnectionError, RedisError, ResponseError

from .redis_client import RedisClient
from .channels import ChannelManager
from .types import WaveMessage, StreamEntry, EventType

logger = logging.getLogger(__name__)

# Consumer defaults
DEFAULT_BLOCK_MS = 5000  # Block for 5s waiting for messages
DEFAULT_BATCH_SIZE = 10  # Read up to 10 messages at a time
PENDING_CLAIM_MIN_IDLE_MS = 30000  # Claim pending messages idle >30s


class Subscriber:
    """
    Subscribes to WAVE event streams using Redis consumer groups.

    Features:
    - Consumer group load balancing (AC-02)
    - Message acknowledgment (AC-03)
    - Pending message redelivery (AC-03)
    - Dead letter queue for poison messages
    """

    def __init__(
        self,
        redis_client: RedisClient,
        project: str,
        group: str,
        consumer: str,
        block_ms: int = DEFAULT_BLOCK_MS,
        batch_size: int = DEFAULT_BATCH_SIZE,
    ):
        """
        Initialize subscriber.

        Args:
            redis_client: Managed Redis client
            project: Project name for channel namespacing
            group: Consumer group name
            consumer: Consumer name (unique within group)
            block_ms: How long to block waiting for messages
            batch_size: Max messages to read per call
        """
        self.redis = redis_client
        self.channels = ChannelManager(project)
        self.project = project
        self.group = group
        self.consumer = consumer
        self.block_ms = block_ms
        self.batch_size = batch_size
        self._running = False
        self._processed_count = 0

    def ensure_group(self, channel: str) -> None:
        """
        Create consumer group if it doesn't exist.

        Args:
            channel: Stream name to create group on
        """
        client = self.redis.client
        try:
            client.xgroup_create(
                channel,
                self.group,
                id="0",
                mkstream=True,
            )
            logger.info(
                "Created consumer group '%s' on '%s'",
                self.group,
                channel,
            )
        except ResponseError as e:
            if "BUSYGROUP" in str(e):
                # Group already exists
                pass
            else:
                raise

    def read(
        self,
        channel: Optional[str] = None,
        count: Optional[int] = None,
        block: Optional[int] = None,
    ) -> List[StreamEntry]:
        """
        Read messages from stream using consumer group.

        Args:
            channel: Stream to read from (defaults to signals)
            count: Max messages to read
            block: Block timeout in ms (None for non-blocking)

        Returns:
            List of StreamEntry objects
        """
        target = channel or self.channels.signals()
        self.ensure_group(target)

        client = self.redis.client
        results = client.xreadgroup(
            self.group,
            self.consumer,
            {target: ">"},
            count=count or self.batch_size,
            block=block if block is not None else self.block_ms,
        )

        entries = []
        if results:
            for stream_name, messages in results:
                for msg_id, msg_data in messages:
                    try:
                        message = WaveMessage.from_stream_dict(msg_data)
                        entries.append(StreamEntry(
                            stream_id=msg_id,
                            message=message,
                        ))
                    except (KeyError, ValueError) as e:
                        logger.warning(
                            "Failed to parse message %s: %s",
                            msg_id,
                            e,
                        )

        return entries

    def ack(self, channel: str, *stream_ids: str) -> int:
        """
        Acknowledge processed messages (AC-03).

        Args:
            channel: Stream name
            *stream_ids: One or more stream entry IDs to acknowledge

        Returns:
            Number of messages acknowledged
        """
        if not stream_ids:
            return 0

        client = self.redis.client
        count = client.xack(channel, self.group, *stream_ids)
        self._processed_count += count
        return count

    def read_pending(
        self,
        channel: Optional[str] = None,
        min_idle_ms: int = PENDING_CLAIM_MIN_IDLE_MS,
        count: Optional[int] = None,
    ) -> List[StreamEntry]:
        """
        Read pending (unacknowledged) messages that have been idle too long (AC-03).

        Uses XAUTOCLAIM to claim and read messages from other consumers
        that may have crashed.

        Args:
            channel: Stream name
            min_idle_ms: Minimum idle time before claiming
            count: Max messages to claim

        Returns:
            List of StreamEntry objects
        """
        target = channel or self.channels.signals()
        client = self.redis.client

        try:
            result = client.xautoclaim(
                target,
                self.group,
                self.consumer,
                min_idle_time=min_idle_ms,
                start_id="0-0",
                count=count or self.batch_size,
            )
        except ResponseError:
            # XAUTOCLAIM not supported or group doesn't exist
            return []

        # xautoclaim returns (next_start_id, messages, deleted_ids)
        entries = []
        if result and len(result) >= 2:
            messages = result[1]
            for msg_id, msg_data in messages:
                if msg_data:  # Skip deleted/nil entries
                    try:
                        message = WaveMessage.from_stream_dict(msg_data)
                        entries.append(StreamEntry(
                            stream_id=msg_id,
                            message=message,
                        ))
                    except (KeyError, ValueError) as e:
                        logger.warning(
                            "Failed to parse pending message %s: %s",
                            msg_id,
                            e,
                        )

        return entries

    def listen(
        self,
        handler: Callable[[StreamEntry], bool],
        channel: Optional[str] = None,
        event_filter: Optional[List[EventType]] = None,
    ) -> None:
        """
        Continuously listen for messages and process with handler.

        Args:
            handler: Callback that receives StreamEntry, returns True if processed
            channel: Stream to listen on (defaults to signals)
            event_filter: Optional list of event types to process (others are acked and skipped)
        """
        target = channel or self.channels.signals()
        self.ensure_group(target)
        self._running = True

        logger.info(
            "Subscriber %s/%s listening on %s",
            self.group,
            self.consumer,
            target,
        )

        while self._running:
            try:
                entries = self.read(channel=target)
                for entry in entries:
                    # Apply event filter
                    if event_filter and entry.message.event_type not in event_filter:
                        self.ack(target, entry.stream_id)
                        continue

                    try:
                        success = handler(entry)
                        if success:
                            self.ack(target, entry.stream_id)
                    except Exception as e:
                        logger.error(
                            "Handler error for %s: %s",
                            entry.stream_id,
                            e,
                        )
                        self._send_to_dlq(entry, str(e))
                        self.ack(target, entry.stream_id)

            except ConnectionError:
                logger.warning("Connection lost, attempting reconnect...")
                if not self.redis.reconnect():
                    logger.error("Reconnection failed, stopping listener")
                    self._running = False
                    break
                self.ensure_group(target)

    def stop(self) -> None:
        """Stop the listener loop."""
        self._running = False
        logger.info("Subscriber %s/%s stopping", self.group, self.consumer)

    @property
    def processed_count(self) -> int:
        """Total messages processed by this subscriber."""
        return self._processed_count

    @property
    def is_running(self) -> bool:
        """Whether the listener is running."""
        return self._running

    def get_group_info(self, channel: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Get consumer group info for a stream.

        Args:
            channel: Stream name

        Returns:
            List of consumer group info dicts
        """
        target = channel or self.channels.signals()
        try:
            return self.redis.client.xinfo_groups(target)
        except (ResponseError, RedisError):
            return []

    def get_pending_summary(self, channel: Optional[str] = None) -> Dict[str, Any]:
        """
        Get pending messages summary for the consumer group.

        Args:
            channel: Stream name

        Returns:
            Pending messages summary
        """
        target = channel or self.channels.signals()
        try:
            result = self.redis.client.xpending(target, self.group)
            return {
                "pending_count": result.get("pending", 0) if isinstance(result, dict) else 0,
                "group": self.group,
                "channel": target,
            }
        except (ResponseError, RedisError):
            return {"pending_count": 0, "group": self.group, "channel": target}

    def _send_to_dlq(self, entry: StreamEntry, error: str) -> None:
        """Send a failed message to the dead letter queue."""
        dlq_channel = self.channels.dead_letter()
        try:
            data = entry.message.to_stream_dict()
            data["dlq_error"] = error
            data["dlq_original_id"] = entry.stream_id
            self.redis.client.xadd(
                dlq_channel,
                data,
                maxlen=1000,
                approximate=True,
            )
        except (ConnectionError, RedisError) as e:
            logger.error("Failed to send to DLQ: %s", e)
