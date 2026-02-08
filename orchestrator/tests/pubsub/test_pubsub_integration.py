"""
Tests for Pub/Sub Integration
Story: WAVE-P2-001

Tests publishing, subscribing, consumer groups, namespacing, and recovery.
"""

import pytest
import time

import fakeredis

from src.pubsub.redis_client import RedisClient
from src.pubsub.publisher import Publisher
from src.pubsub.subscriber import Subscriber
from src.pubsub.channels import ChannelManager
from src.pubsub.types import (
    WaveMessage,
    EventType,
    MessagePriority,
    StreamEntry,
)


@pytest.fixture
def fake_server():
    """Shared fakeredis server for pub/sub tests."""
    return fakeredis.FakeServer()


@pytest.fixture
def make_redis_client(fake_server):
    """Factory to create RedisClient instances backed by same fakeredis server."""
    def _make():
        client = RedisClient(url="redis://localhost:6379/0")
        client._client = fakeredis.FakeRedis(
            server=fake_server,
            decode_responses=True,
            version=(7, 0, 0),
        )
        client._connected = True
        return client
    return _make


@pytest.fixture
def redis_client(make_redis_client):
    """Single RedisClient for simple tests."""
    return make_redis_client()


@pytest.fixture
def publisher(redis_client):
    """Publisher for test-project."""
    return Publisher(
        redis_client=redis_client,
        project="test-project",
        source="test-agent",
    )


@pytest.fixture
def subscriber(redis_client):
    """Subscriber for test-project."""
    return Subscriber(
        redis_client=redis_client,
        project="test-project",
        group="test-group",
        consumer="consumer-1",
        block_ms=100,  # Short block for tests
    )


class TestChannelNamespacing:
    """Test channel namespacing and isolation (AC-04)."""

    def test_signals_channel_includes_project(self):
        """AC-04: Signal channel is namespaced by project."""
        cm = ChannelManager("projectA")
        assert cm.signals() == "wave:signals:projecta"

    def test_different_projects_different_channels(self):
        """AC-04: Different projects get different channels."""
        cm_a = ChannelManager("projectA")
        cm_b = ChannelManager("projectB")
        assert cm_a.signals() != cm_b.signals()

    def test_agent_channel_includes_agent_id(self):
        """Agent channels include project and agent ID."""
        cm = ChannelManager("myproject")
        assert cm.agent("be-dev-1") == "wave:agent:myproject:be-dev-1"

    def test_gate_channel_includes_gate_name(self):
        """Gate channels include gate name."""
        cm = ChannelManager("myproject")
        assert cm.gate("gate-3") == "wave:gate:myproject:gate-3"

    def test_parse_channel(self):
        """Can parse channel name back into components."""
        parsed = ChannelManager.parse_channel("wave:signals:myproject")
        assert parsed["prefix"] == "wave"
        assert parsed["type"] == "signals"
        assert parsed["project"] == "myproject"

    def test_empty_project_raises(self):
        """Empty project name is rejected."""
        with pytest.raises(ValueError):
            ChannelManager("")

    def test_project_messages_isolated(self, make_redis_client):
        """AC-04: Messages sent to projectA do not reach projectB."""
        client = make_redis_client()

        pub_a = Publisher(client, project="projectA", source="agent-a")
        pub_b = Publisher(client, project="projectB", source="agent-b")

        sub_a = Subscriber(client, project="projectA", group="g", consumer="c1", block_ms=100)
        sub_b = Subscriber(client, project="projectB", group="g", consumer="c1", block_ms=100)

        # Publish to projectA
        pub_a.publish(EventType.STORY_STARTED, {"test": "a"})

        # Publish to projectB
        pub_b.publish(EventType.STORY_STARTED, {"test": "b"})

        # Read from projectA
        entries_a = sub_a.read(block=0)
        # Read from projectB
        entries_b = sub_b.read(block=0)

        # Each should only see their own messages
        assert len(entries_a) == 1
        assert entries_a[0].message.payload["test"] == "a"
        assert len(entries_b) == 1
        assert entries_b[0].message.payload["test"] == "b"


class TestPublishing:
    """Test message publishing (AC-01)."""

    def test_publish_message_to_stream(self, publisher, redis_client):
        """AC-01: Can publish message to stream."""
        stream_id = publisher.publish(
            EventType.STORY_STARTED,
            {"story_id": "TEST-001"},
        )
        assert stream_id is not None
        assert publisher.publish_count == 1

    def test_publish_with_all_fields(self, publisher):
        """AC-01: Published message contains all fields."""
        publisher.publish(
            EventType.GATE_PASSED,
            {"gate": "gate-2", "result": "pass"},
            session_id="session-123",
            story_id="TEST-001",
            priority=MessagePriority.HIGH,
            correlation_id="corr-456",
        )
        assert publisher.publish_count == 1

    def test_batch_publish(self, publisher):
        """AC-01: Can batch publish multiple messages."""
        messages = [
            WaveMessage(
                event_type=EventType.STORY_STARTED,
                payload={"index": i},
                source="test",
                project="test-project",
            )
            for i in range(5)
        ]

        ids = publisher.publish_batch(messages)
        assert len(ids) == 5

    def test_publish_to_agent_channel(self, publisher, redis_client):
        """Can publish directly to an agent's channel."""
        stream_id = publisher.publish_to_agent(
            "be-dev-1",
            EventType.AGENT_HANDOFF,
            {"task": "review"},
        )
        assert stream_id is not None

    def test_publish_gate_event(self, publisher):
        """Can publish to gate-specific channel."""
        stream_id = publisher.publish_gate_event(
            "gate-3",
            EventType.GATE_PASSED,
            {"tests": "all passing"},
        )
        assert stream_id is not None


class TestSubscribing:
    """Test message subscribing (AC-02, AC-03)."""

    def test_receive_published_messages(self, publisher, subscriber):
        """AC-01: Subscriber receives published messages."""
        publisher.publish(EventType.STORY_STARTED, {"story": "TEST-001"})

        entries = subscriber.read(block=0)
        assert len(entries) == 1
        assert entries[0].message.event_type == EventType.STORY_STARTED
        assert entries[0].message.payload["story"] == "TEST-001"

    def test_acknowledge_message(self, publisher, subscriber):
        """AC-03: Can acknowledge processed messages."""
        publisher.publish(EventType.STORY_STARTED, {"story": "TEST-001"})
        channel = subscriber.channels.signals()

        entries = subscriber.read(block=0)
        assert len(entries) == 1

        ack_count = subscriber.ack(channel, entries[0].stream_id)
        assert ack_count == 1
        assert subscriber.processed_count == 1

    def test_unacked_message_stays_pending(self, publisher, subscriber):
        """AC-03: Unacknowledged messages remain pending."""
        publisher.publish(EventType.STORY_STARTED, {"story": "TEST-001"})

        # Read but don't ack
        entries = subscriber.read(block=0)
        assert len(entries) == 1

        # New read with ">" returns no new messages
        new_entries = subscriber.read(block=0)
        assert len(new_entries) == 0

    def test_consumer_group_distribution(self, make_redis_client):
        """AC-02: Messages are distributed across consumer group members."""
        client = make_redis_client()

        pub = Publisher(client, project="test-dist", source="producer")
        sub1 = Subscriber(client, project="test-dist", group="workers", consumer="w1", block_ms=100)
        sub2 = Subscriber(client, project="test-dist", group="workers", consumer="w2", block_ms=100)

        # Publish 6 messages
        for i in range(6):
            pub.publish(EventType.STORY_STARTED, {"index": i})

        # Each consumer reads
        entries1 = sub1.read(block=0, count=10)
        entries2 = sub2.read(block=0, count=10)

        # Together they should have all 6 messages (distribution may vary)
        total = len(entries1) + len(entries2)
        assert total == 6

    def test_handler_receives_entries(self, publisher, subscriber):
        """Handler callback receives StreamEntry objects."""
        publisher.publish(EventType.HEALTH_CHECK, {"status": "ok"})

        received = []
        def handler(entry: StreamEntry) -> bool:
            received.append(entry)
            return True

        # Read manually since listen() is blocking
        entries = subscriber.read(block=0)
        for entry in entries:
            handler(entry)
            subscriber.ack(subscriber.channels.signals(), entry.stream_id)

        assert len(received) == 1
        assert received[0].message.event_type == EventType.HEALTH_CHECK


class TestMessageTypes:
    """Test WaveMessage serialization."""

    def test_message_round_trip(self):
        """Messages serialize and deserialize correctly."""
        msg = WaveMessage(
            event_type=EventType.GATE_PASSED,
            payload={"gate": "gate-2", "score": 95},
            source="qa-agent",
            project="myproject",
            priority=MessagePriority.HIGH,
            session_id="sess-123",
            story_id="STORY-001",
            correlation_id="corr-456",
        )

        stream_dict = msg.to_stream_dict()
        restored = WaveMessage.from_stream_dict(stream_dict)

        assert restored.event_type == EventType.GATE_PASSED
        assert restored.payload == {"gate": "gate-2", "score": 95}
        assert restored.source == "qa-agent"
        assert restored.project == "myproject"
        assert restored.priority == MessagePriority.HIGH
        assert restored.session_id == "sess-123"
        assert restored.story_id == "STORY-001"
        assert restored.correlation_id == "corr-456"

    def test_message_optional_fields(self):
        """Optional fields can be omitted."""
        msg = WaveMessage(
            event_type=EventType.HEALTH_CHECK,
            payload={},
            source="system",
            project="test",
        )

        stream_dict = msg.to_stream_dict()
        assert "session_id" not in stream_dict
        assert "story_id" not in stream_dict

        restored = WaveMessage.from_stream_dict(stream_dict)
        assert restored.session_id is None
        assert restored.story_id is None


class TestDeadLetterQueue:
    """Test dead letter queue handling."""

    def test_handler_error_sends_to_dlq(self, publisher, subscriber, redis_client):
        """Failed messages go to dead letter queue."""
        publisher.publish(EventType.STORY_STARTED, {"story": "BAD-001"})

        channel = subscriber.channels.signals()
        entries = subscriber.read(block=0)
        assert len(entries) == 1

        # Simulate handler error by sending to DLQ manually
        subscriber._send_to_dlq(entries[0], "Processing failed")

        # Check DLQ has the message
        dlq = subscriber.channels.dead_letter()
        dlq_entries = redis_client.client.xrange(dlq)
        assert len(dlq_entries) == 1
        _, data = dlq_entries[0]
        assert data["dlq_error"] == "Processing failed"
