"""
Tests for Event Dispatcher
Story: WAVE-P2-002

Tests event routing, handler registration, multi-handler support,
and error handling.
"""

import pytest
import time

import fakeredis

from src.pubsub.redis_client import RedisClient
from src.pubsub.publisher import Publisher
from src.pubsub.types import EventType, WaveMessage, StreamEntry
from src.events.event_dispatcher import EventDispatcher, ResultWaiter
from src.events.signal_handler import (
    SignalHandler,
    GateCompleteHandler,
    AgentErrorHandler,
    EmergencyStopHandler,
)
from src.events.signal_types import HandlerResult


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
    return Publisher(redis_client, project="test-project", source="test-agent")


@pytest.fixture
def dispatcher(redis_client):
    return EventDispatcher(
        redis_client,
        project="test-project",
        group="test-group",
        consumer="test-consumer",
    )


def _make_entry(event_type: EventType, payload: dict, **kwargs) -> StreamEntry:
    """Create a StreamEntry for testing."""
    msg = WaveMessage(
        event_type=event_type,
        payload=payload,
        source="test-agent",
        project="test-project",
        **kwargs,
    )
    return StreamEntry(stream_id="1234567890-0", message=msg)


class TestHandlerRegistration:
    """Tests for handler registration."""

    def test_register_handler(self, dispatcher):
        """Should register handler for event type."""
        handler = GateCompleteHandler()
        dispatcher.register(EventType.GATE_PASSED, handler)

        assert EventType.GATE_PASSED in dispatcher.registered_events

    def test_multiple_handlers_per_event(self, dispatcher):
        """Should support multiple handlers per event type."""
        handler1 = GateCompleteHandler()
        handler2 = GateCompleteHandler()

        dispatcher.register(EventType.GATE_PASSED, handler1)
        dispatcher.register(EventType.GATE_PASSED, handler2)

        # Dispatch should call both handlers
        entry = _make_entry(
            EventType.GATE_PASSED,
            {"gate_id": "gate-1", "result": "pass"},
        )
        result = dispatcher.dispatch(entry)

        assert result.success is True
        assert dispatcher.dispatch_count == 1

    def test_no_handler_for_event(self, dispatcher):
        """Should handle events with no registered handler gracefully."""
        entry = _make_entry(
            EventType.HEALTH_CHECK,
            {"status": "ok"},
        )

        result = dispatcher.dispatch(entry)

        assert result.success is True
        assert result.action_taken == "no_handler"

    def test_registered_events_list(self, dispatcher):
        """Should return list of registered event types."""
        dispatcher.register(EventType.GATE_PASSED, GateCompleteHandler())
        dispatcher.register(EventType.AGENT_ERROR, AgentErrorHandler())

        events = dispatcher.registered_events
        assert EventType.GATE_PASSED in events
        assert EventType.AGENT_ERROR in events
        assert len(events) == 2


class TestEventDispatching:
    """Tests for event dispatch routing."""

    def test_routes_to_correct_handler(self, dispatcher):
        """Should route events to the correct handler."""
        dispatcher.register(EventType.GATE_PASSED, GateCompleteHandler())
        dispatcher.register(EventType.AGENT_ERROR, AgentErrorHandler())

        # Dispatch gate event
        gate_entry = _make_entry(
            EventType.GATE_PASSED,
            {"gate_id": "gate-3", "result": "pass"},
        )
        result = dispatcher.dispatch(gate_entry)

        assert "gate_advance:gate-3" in result.action_taken

    def test_handler_error_captured(self, dispatcher):
        """Should capture handler errors gracefully."""

        class FailingHandler(SignalHandler):
            def handle(self, message):
                raise ValueError("intentional test error")

        dispatcher.register(EventType.GATE_PASSED, FailingHandler())

        entry = _make_entry(
            EventType.GATE_PASSED,
            {"gate_id": "gate-1"},
        )
        result = dispatcher.dispatch(entry)

        assert result.success is False
        assert len(result.errors) == 1
        assert "intentional test error" in result.errors[0]
        assert dispatcher.error_count == 1

    def test_dispatch_count_tracks(self, dispatcher):
        """Should track dispatch count."""
        dispatcher.register(EventType.GATE_PASSED, GateCompleteHandler())

        for i in range(3):
            entry = _make_entry(
                EventType.GATE_PASSED,
                {"gate_id": f"gate-{i}", "result": "pass"},
            )
            dispatcher.dispatch(entry)

        assert dispatcher.dispatch_count == 3

    def test_on_dispatch_callback(self, dispatcher):
        """Should call on_dispatch callback after each dispatch."""
        received = []

        def callback(event_type, result):
            received.append((event_type, result))

        dispatcher.on_dispatch(callback)
        dispatcher.register(EventType.GATE_PASSED, GateCompleteHandler())

        entry = _make_entry(
            EventType.GATE_PASSED,
            {"gate_id": "gate-1", "result": "pass"},
        )
        dispatcher.dispatch(entry)

        assert len(received) == 1
        assert received[0][0] == EventType.GATE_PASSED


class TestResultWaiter:
    """Tests for ResultWaiter (polling replacement)."""

    def test_expect_and_notify(self):
        """Should notify waiting thread of result."""
        waiter = ResultWaiter()
        waiter.expect("task-1")
        waiter.notify("task-1", {"status": "completed", "output": "done"})

        result = waiter.wait("task-1", timeout=1.0)

        assert result is not None
        assert result["status"] == "completed"

    def test_wait_timeout(self):
        """Should return None on timeout."""
        waiter = ResultWaiter()
        waiter.expect("task-1")

        result = waiter.wait("task-1", timeout=0.1)

        assert result is None

    def test_wait_nonexistent_task(self):
        """Should return None for unknown task."""
        waiter = ResultWaiter()

        result = waiter.wait("nonexistent", timeout=0.1)

        assert result is None

    def test_pending_count(self):
        """Should track pending expectations."""
        waiter = ResultWaiter()
        waiter.expect("task-1")
        waiter.expect("task-2")

        assert waiter.pending_count == 2

        waiter.notify("task-1", {"done": True})
        waiter.wait("task-1", timeout=0.1)

        assert waiter.pending_count == 1

    def test_clear_expectation(self):
        """Should clear pending expectation."""
        waiter = ResultWaiter()
        waiter.expect("task-1")

        assert waiter.pending_count == 1

        waiter.clear("task-1")

        assert waiter.pending_count == 0

    def test_wait_multiple(self):
        """Should wait for multiple tasks."""
        waiter = ResultWaiter()
        waiter.expect("task-1")
        waiter.expect("task-2")

        waiter.notify("task-1", {"result": "a"})
        waiter.notify("task-2", {"result": "b"})

        results = waiter.wait_multiple(["task-1", "task-2"], timeout=1.0)

        assert len(results) == 2
        assert results["task-1"]["result"] == "a"
        assert results["task-2"]["result"] == "b"
