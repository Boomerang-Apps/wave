"""
Tests for Agent Signal Publisher
Story: WAVE-P2-003

Tests the SignalPublisherMixin that adds event publishing to all agents.
"""

import pytest
import time
import threading
from unittest.mock import MagicMock, patch

import fakeredis

from src.pubsub.redis_client import RedisClient
from src.pubsub.publisher import Publisher
from src.pubsub.types import EventType, WaveMessage, MessagePriority
from src.agents.signal_publisher import SignalPublisherMixin


@pytest.fixture
def fake_server():
    """Shared fakeredis server."""
    return fakeredis.FakeServer()


@pytest.fixture
def redis_client(fake_server):
    """RedisClient backed by fakeredis."""
    client = RedisClient(url="redis://localhost:6379/0")
    client._client = fakeredis.FakeRedis(
        server=fake_server,
        decode_responses=True,
        version=(7, 0, 0),
    )
    client._connected = True
    return client


@pytest.fixture
def publisher(redis_client):
    """Publisher instance for testing."""
    return Publisher(redis_client, project="test-project", source="test-agent")


@pytest.fixture
def mixin(redis_client):
    """SignalPublisherMixin configured for testing."""
    return SignalPublisherMixin(
        redis_client=redis_client,
        project="test-project",
        agent_id="be-dev-1",
        domain="be",
    )


class TestSignalPublisherInit:
    """Tests for AC-01: Signal publisher injection."""

    def test_mixin_creates_publisher(self, mixin):
        """AC-01: Agent has access to SignalPublisher instance."""
        assert mixin._publisher is not None
        assert isinstance(mixin._publisher, Publisher)

    def test_mixin_stores_agent_metadata(self, mixin):
        """AC-05: Publisher tracks agent identity."""
        assert mixin.agent_id == "be-dev-1"
        assert mixin.domain == "be"
        assert mixin.project == "test-project"

    def test_mixin_has_session_id(self, mixin):
        """AC-05: Publisher generates session_id."""
        assert mixin.session_id is not None
        assert len(mixin.session_id) > 0

    def test_mixin_with_explicit_session_id(self, redis_client):
        """AC-05: Accepts explicit session_id."""
        mixin = SignalPublisherMixin(
            redis_client=redis_client,
            project="test-project",
            agent_id="fe-dev-1",
            domain="fe",
            session_id="custom-session-123",
        )
        assert mixin.session_id == "custom-session-123"


class TestGateSignals:
    """Tests for AC-02: Gate completion publishes signal."""

    def test_publish_gate_complete(self, mixin, fake_server):
        """AC-02: Gate completion signal published with gate_id and result."""
        stream_id = mixin.signal_gate_complete(
            gate_id="gate-2",
            result="pass",
            story_id="STORY-001",
        )

        assert stream_id is not None

        # Read the published message from the stream
        raw = fakeredis.FakeRedis(
            server=fake_server, decode_responses=True, version=(7, 0, 0)
        )
        entries = raw.xrange("wave:signals:test-project")
        assert len(entries) == 1

        msg_data = entries[0][1]
        assert msg_data["event_type"] == EventType.GATE_PASSED.value
        assert "gate-2" in msg_data["payload"]
        assert msg_data["source"] == "be-dev-1"
        assert msg_data["story_id"] == "STORY-001"

    def test_publish_gate_failed(self, mixin, fake_server):
        """AC-02: Gate failure signal published."""
        stream_id = mixin.signal_gate_failed(
            gate_id="gate-3",
            error="tests did not pass",
            story_id="STORY-002",
        )

        assert stream_id is not None

        raw = fakeredis.FakeRedis(
            server=fake_server, decode_responses=True, version=(7, 0, 0)
        )
        entries = raw.xrange("wave:signals:test-project")
        assert len(entries) == 1

        msg_data = entries[0][1]
        assert msg_data["event_type"] == EventType.GATE_FAILED.value

    def test_gate_signal_includes_story_id(self, mixin, fake_server):
        """AC-05: Gate signals include story_id."""
        mixin.signal_gate_complete("gate-1", "pass", story_id="WAVE-123")

        raw = fakeredis.FakeRedis(
            server=fake_server, decode_responses=True, version=(7, 0, 0)
        )
        entries = raw.xrange("wave:signals:test-project")
        assert entries[0][1]["story_id"] == "WAVE-123"


class TestErrorSignals:
    """Tests for AC-03: Error conditions publish signal."""

    def test_publish_error_signal(self, mixin, fake_server):
        """AC-03: Agent error signal published with error details."""
        stream_id = mixin.signal_error(
            error="build compilation failed",
            story_id="STORY-001",
            retry_count=1,
        )

        assert stream_id is not None

        raw = fakeredis.FakeRedis(
            server=fake_server, decode_responses=True, version=(7, 0, 0)
        )
        entries = raw.xrange("wave:signals:test-project")
        assert len(entries) == 1

        msg_data = entries[0][1]
        assert msg_data["event_type"] == EventType.AGENT_ERROR.value
        assert "build compilation failed" in msg_data["payload"]
        assert msg_data["source"] == "be-dev-1"

    def test_error_signal_includes_retry_count(self, mixin, fake_server):
        """AC-03: Error signal includes retry count."""
        mixin.signal_error("transient failure", story_id="S-1", retry_count=2)

        raw = fakeredis.FakeRedis(
            server=fake_server, decode_responses=True, version=(7, 0, 0)
        )
        entries = raw.xrange("wave:signals:test-project")
        assert "2" in entries[0][1]["payload"]  # retry_count serialized in payload


class TestProgressSignals:
    """Tests for AC-04: Progress updates published periodically."""

    def test_publish_progress(self, mixin, fake_server):
        """AC-04: Progress signal published."""
        stream_id = mixin.signal_progress(
            story_id="STORY-001",
            detail="compiling source files",
        )

        assert stream_id is not None

        raw = fakeredis.FakeRedis(
            server=fake_server, decode_responses=True, version=(7, 0, 0)
        )
        entries = raw.xrange("wave:signals:test-project")
        assert len(entries) == 1

        msg_data = entries[0][1]
        assert msg_data["event_type"] == EventType.HEALTH_CHECK.value
        assert "compiling source files" in msg_data["payload"]

    def test_heartbeat_starts_and_publishes(self, mixin, fake_server):
        """AC-04: Heartbeat publishes progress every interval."""
        mixin.start_heartbeat(story_id="HB-001", interval=0.1)

        # Wait for at least 2 heartbeat cycles
        time.sleep(0.35)
        mixin.stop_heartbeat()

        raw = fakeredis.FakeRedis(
            server=fake_server, decode_responses=True, version=(7, 0, 0)
        )
        entries = raw.xrange("wave:signals:test-project")

        # Should have at least 2 heartbeat signals
        assert len(entries) >= 2

    def test_heartbeat_stops_cleanly(self, mixin):
        """AC-04: Heartbeat thread stops without error."""
        mixin.start_heartbeat(story_id="HB-002", interval=0.1)
        time.sleep(0.15)
        mixin.stop_heartbeat()

        # Thread should be stopped
        assert not mixin._heartbeat_running


class TestMetadata:
    """Tests for AC-05: Signals include required metadata."""

    def test_all_signals_include_agent_id(self, mixin, fake_server):
        """AC-05: All signals include agent_id as source."""
        mixin.signal_ready()

        raw = fakeredis.FakeRedis(
            server=fake_server, decode_responses=True, version=(7, 0, 0)
        )
        entries = raw.xrange("wave:signals:test-project")
        assert entries[0][1]["source"] == "be-dev-1"

    def test_all_signals_include_timestamp(self, mixin, fake_server):
        """AC-05: All signals include timestamp."""
        mixin.signal_ready()

        raw = fakeredis.FakeRedis(
            server=fake_server, decode_responses=True, version=(7, 0, 0)
        )
        entries = raw.xrange("wave:signals:test-project")
        assert "timestamp" in entries[0][1]
        # Should be ISO format
        assert "T" in entries[0][1]["timestamp"]

    def test_all_signals_include_session_id(self, mixin, fake_server):
        """AC-05: All signals include session_id."""
        mixin.signal_gate_complete("gate-1", "pass", story_id="S-1")

        raw = fakeredis.FakeRedis(
            server=fake_server, decode_responses=True, version=(7, 0, 0)
        )
        entries = raw.xrange("wave:signals:test-project")
        assert "session_id" in entries[0][1]
        assert entries[0][1]["session_id"] == mixin.session_id

    def test_signal_ready_includes_domain(self, mixin, fake_server):
        """AC-05: Ready signal includes domain info."""
        mixin.signal_ready()

        raw = fakeredis.FakeRedis(
            server=fake_server, decode_responses=True, version=(7, 0, 0)
        )
        entries = raw.xrange("wave:signals:test-project")
        assert "be" in entries[0][1]["payload"]

    def test_signal_busy_includes_story(self, mixin, fake_server):
        """AC-05: Busy signal includes story_id."""
        mixin.signal_busy(story_id="WAVE-P2-003")

        raw = fakeredis.FakeRedis(
            server=fake_server, decode_responses=True, version=(7, 0, 0)
        )
        entries = raw.xrange("wave:signals:test-project")
        assert entries[0][1]["story_id"] == "WAVE-P2-003"

    def test_publish_count_tracks(self, mixin):
        """Publish count increments correctly."""
        assert mixin.publish_count == 0
        mixin.signal_ready()
        assert mixin.publish_count == 1
        mixin.signal_busy(story_id="S-1")
        assert mixin.publish_count == 2


class TestGracefulDegradation:
    """Tests for AC-06: Publisher handles Redis failures gracefully."""

    def test_publish_with_disconnected_redis(self):
        """AC-06: Agent logs warning and continues when Redis unavailable."""
        client = RedisClient(url="redis://localhost:6379/0")
        mock_redis = MagicMock()
        mock_redis.xadd.side_effect = ConnectionError("Connection refused")
        mock_redis.ping.side_effect = ConnectionError("Connection refused")
        client._client = mock_redis
        client._connected = True  # Bypass lazy connect

        mixin = SignalPublisherMixin(
            redis_client=client,
            project="test-project",
            agent_id="be-dev-1",
            domain="be",
        )

        # Should not raise — returns None due to caught exception
        result = mixin.signal_ready()
        assert result is None

    def test_publish_error_does_not_crash(self):
        """AC-06: Redis errors are caught, not propagated."""
        client = RedisClient(url="redis://localhost:6379/0")
        client._client = MagicMock()
        client._connected = True

        # Make xadd raise
        client._client.xadd.side_effect = Exception("Redis connection lost")

        mixin = SignalPublisherMixin(
            redis_client=client,
            project="test-project",
            agent_id="fe-dev-1",
            domain="fe",
        )

        # Should not raise
        result = mixin.signal_gate_complete("gate-1", "pass", story_id="S-1")
        assert result is None

    def test_heartbeat_survives_redis_failure(self):
        """AC-06: Heartbeat continues when individual publish fails."""
        client = RedisClient(url="redis://localhost:6379/0")
        client._client = MagicMock()
        client._connected = True
        client._client.xadd.side_effect = Exception("temporary failure")

        mixin = SignalPublisherMixin(
            redis_client=client,
            project="test-project",
            agent_id="qa-1",
            domain="qa",
        )

        # Should not crash
        mixin.start_heartbeat(story_id="S-1", interval=0.05)
        time.sleep(0.15)
        mixin.stop_heartbeat()

        # Mixin should still be functional
        assert not mixin._heartbeat_running

    def test_no_publisher_when_redis_none(self):
        """AC-06: Mixin works even if RedisClient has no connection."""
        mixin = SignalPublisherMixin(
            redis_client=None,
            project="test-project",
            agent_id="pm-1",
            domain="pm",
        )

        # Should not raise
        result = mixin.signal_ready()
        assert result is None
        assert mixin.publish_count == 0


class TestAllAgentTypes:
    """Tests that all agent types can use the signal publisher."""

    @pytest.fixture(params=["pm", "cto", "fe", "be", "qa"])
    def agent_mixin(self, request, redis_client):
        """Create mixin for each agent type."""
        domain = request.param
        return SignalPublisherMixin(
            redis_client=redis_client,
            project="test-project",
            agent_id=f"{domain}-dev-1",
            domain=domain,
        )

    def test_agent_can_publish_gate_complete(self, agent_mixin):
        """AC-01/AC-02: All agent types can publish gate signals."""
        result = agent_mixin.signal_gate_complete("gate-1", "pass", story_id="S-1")
        assert result is not None

    def test_agent_can_publish_error(self, agent_mixin):
        """AC-01/AC-03: All agent types can publish error signals."""
        result = agent_mixin.signal_error("test error", story_id="S-1")
        assert result is not None

    def test_agent_can_publish_progress(self, agent_mixin):
        """AC-01/AC-04: All agent types can publish progress signals."""
        result = agent_mixin.signal_progress(story_id="S-1", detail="working")
        assert result is not None

    def test_all_use_same_signal_format(self, agent_mixin, fake_server):
        """AC-05: All agents use the same signal format."""
        agent_mixin.signal_ready()

        raw = fakeredis.FakeRedis(
            server=fake_server, decode_responses=True, version=(7, 0, 0)
        )
        entries = raw.xrange("wave:signals:test-project")
        msg = entries[-1][1]

        # Required fields
        assert "event_type" in msg
        assert "payload" in msg
        assert "source" in msg
        assert "timestamp" in msg
        assert "session_id" in msg
