"""
Integration Tests for Event-Driven Architecture
Story: WAVE-P2-002

Tests full publish → subscribe → dispatch → handle cycle.
"""

import pytest
import time
import threading

import fakeredis

from src.pubsub.redis_client import RedisClient
from src.pubsub.publisher import Publisher
from src.pubsub.types import EventType, MessagePriority
from src.events.event_dispatcher import EventDispatcher, ResultWaiter
from src.events.signal_handler import (
    GateCompleteHandler,
    AgentErrorHandler,
    EmergencyStopHandler,
)
from src.events.signal_types import HandlerResult


@pytest.fixture
def fake_server():
    return fakeredis.FakeServer()


@pytest.fixture
def redis_client(fake_server):
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
    return Publisher(redis_client, project="test-project", source="test-agent")


@pytest.fixture
def dispatcher(redis_client):
    d = EventDispatcher(
        redis_client,
        project="test-project",
        group="integration-group",
        consumer="integration-consumer",
    )
    yield d
    d.stop()


class TestFullGateCycle:
    """Tests complete gate cycle via events (AC-01, AC-02, AC-04)."""

    def test_publish_and_dispatch_gate_complete(self, publisher, dispatcher):
        """AC-01/AC-04: Publish gate_passed → handler processes it."""
        results = []
        dispatcher.register(EventType.GATE_PASSED, GateCompleteHandler())

        def callback(event_type, result):
            results.append(result)

        dispatcher.on_dispatch(callback)

        # Publish gate completion
        publisher.publish(
            EventType.GATE_PASSED,
            {"gate_id": "gate-2", "result": "pass"},
            story_id="INT-TEST-001",
        )

        # Read and dispatch manually (no background thread for deterministic test)
        entries = dispatcher._subscriber.read(block=0)
        assert len(entries) == 1

        result = dispatcher.dispatch(entries[0])

        assert result.success is True
        assert result.data["gate_id"] == "gate-2"
        assert result.data["next_gate"] == "gate-3"
        assert len(results) == 1

    def test_multiple_signals_in_sequence(self, publisher, dispatcher):
        """Should process multiple signals in correct order."""
        dispatcher.register(EventType.GATE_PASSED, GateCompleteHandler())
        dispatcher.register(EventType.AGENT_ERROR, AgentErrorHandler())

        # Publish gate completion, then error
        publisher.publish(
            EventType.GATE_PASSED,
            {"gate_id": "gate-1", "result": "pass"},
        )
        publisher.publish(
            EventType.AGENT_ERROR,
            {"error": "build failed", "retry_count": 0},
        )

        entries = dispatcher._subscriber.read(block=0, count=10)
        assert len(entries) == 2

        result1 = dispatcher.dispatch(entries[0])
        result2 = dispatcher.dispatch(entries[1])

        assert "gate_advance:gate-1" in result1.action_taken
        assert "retry:" in result2.action_taken

    def test_gate_cycle_sequence(self, publisher, dispatcher):
        """AC-04: Full gate-0 through gate-3 cycle via events."""
        dispatcher.register(EventType.GATE_PASSED, GateCompleteHandler())

        gates = ["gate-0", "gate-1", "gate-2", "gate-3"]
        results = []

        for gate in gates:
            publisher.publish(
                EventType.GATE_PASSED,
                {"gate_id": gate, "result": "pass"},
            )

        entries = dispatcher._subscriber.read(block=0, count=10)
        assert len(entries) == 4

        for entry in entries:
            result = dispatcher.dispatch(entry)
            results.append(result)

        # Verify gate progression
        assert results[0].data["next_gate"] == "gate-1"
        assert results[1].data["next_gate"] == "gate-2"
        assert results[2].data["next_gate"] == "gate-3"
        assert results[3].data["next_gate"] == "gate-4"


class TestAgentHandoff:
    """Tests agent handoff via events."""

    def test_agent_handoff_via_events(self, publisher, dispatcher):
        """Should handle agent handoff signal."""
        received = []

        class HandoffTracker(GateCompleteHandler):
            def handle(self, message):
                result = super().handle(message)
                received.append(message.payload)
                return result

        dispatcher.register(EventType.GATE_PASSED, HandoffTracker())

        publisher.publish(
            EventType.GATE_PASSED,
            {"gate_id": "gate-3", "result": "pass", "handoff_to": "qa-agent"},
        )

        entries = dispatcher._subscriber.read(block=0)
        dispatcher.dispatch(entries[0])

        assert len(received) == 1
        assert received[0]["handoff_to"] == "qa-agent"


class TestErrorRecovery:
    """Tests error handling and retry/escalation (AC-05)."""

    def test_retry_then_escalate(self, publisher, dispatcher):
        """AC-05: Error triggers retry, then escalation at max."""
        dispatcher.register(EventType.AGENT_ERROR, AgentErrorHandler(max_retries=2))

        results = []

        # First error (retry_count=0) → should retry
        publisher.publish(
            EventType.AGENT_ERROR,
            {"error": "transient", "retry_count": 0},
        )
        # Second error (retry_count=1) → should retry
        publisher.publish(
            EventType.AGENT_ERROR,
            {"error": "transient", "retry_count": 1},
        )
        # Third error (retry_count=2) → should escalate
        publisher.publish(
            EventType.AGENT_ERROR,
            {"error": "persistent", "retry_count": 2},
        )

        entries = dispatcher._subscriber.read(block=0, count=10)

        for entry in entries:
            results.append(dispatcher.dispatch(entry))

        assert results[0].data["should_retry"] is True
        assert results[1].data["should_retry"] is True
        assert results[2].data["should_retry"] is False
        assert results[2].data["escalated"] is True


class TestEmergencyStop:
    """Tests emergency stop handling."""

    def test_emergency_stop_via_events(self, publisher, dispatcher):
        """AC-05: Emergency stop signal halts workflow."""
        dispatcher.register(EventType.EMERGENCY_STOP, EmergencyStopHandler())

        publisher.publish(
            EventType.EMERGENCY_STOP,
            {"reason": "safety violation detected"},
            priority=MessagePriority.CRITICAL,
        )

        entries = dispatcher._subscriber.read(block=0)
        assert len(entries) == 1

        result = dispatcher.dispatch(entries[0])

        assert result.success is True
        assert result.data["halted"] is True


class TestResultWaiterIntegration:
    """Tests ResultWaiter with pub/sub (AC-02, AC-03)."""

    def test_event_driven_wait(self):
        """AC-02/AC-03: Result notification arrives via event, not polling."""
        waiter = ResultWaiter()
        waiter.expect("task-123")

        # Simulate async notification (as if from pub/sub handler)
        def notify_after_delay():
            time.sleep(0.05)
            waiter.notify("task-123", {"status": "completed", "output": "success"})

        thread = threading.Thread(target=notify_after_delay)
        thread.start()

        start = time.time()
        result = waiter.wait("task-123", timeout=5.0)
        elapsed = time.time() - start

        assert result is not None
        assert result["status"] == "completed"
        assert elapsed < 1.0  # Should be ~50ms, not 5s

        thread.join()

    def test_backward_compat_session_format(self):
        """AC-06: ResultWaiter works with existing result dict format."""
        waiter = ResultWaiter()
        waiter.expect("legacy-task")

        # Simulate result in existing session format
        waiter.notify("legacy-task", {
            "status": "completed",
            "result": {"code": "function hello() { return 'world'; }"},
            "passed": True,
            "agent_id": "be-dev-1",
        })

        result = waiter.wait("legacy-task", timeout=1.0)

        assert result is not None
        assert result["status"] == "completed"
        assert result["passed"] is True
        assert result["agent_id"] == "be-dev-1"


class TestGracefulDegradation:
    """Tests graceful degradation when Redis unavailable (AC-07)."""

    def test_dispatcher_handles_disconnected_redis(self):
        """AC-07: Dispatcher doesn't crash when Redis disconnects."""
        client = RedisClient(url="redis://localhost:6379/0")
        client._client = None
        client._connected = False

        dispatcher = EventDispatcher(
            client,
            project="test-project",
            group="test-group",
            consumer="test-consumer",
        )

        # Should not crash — just log and handle gracefully
        assert dispatcher.is_running is False
        assert dispatcher.dispatch_count == 0

    def test_result_waiter_timeout_on_no_redis(self):
        """AC-07: ResultWaiter returns None on timeout (graceful degradation)."""
        waiter = ResultWaiter()
        waiter.expect("task-no-redis")

        # No notification will arrive (simulating Redis down)
        result = waiter.wait("task-no-redis", timeout=0.1)

        assert result is None
