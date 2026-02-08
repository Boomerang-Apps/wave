"""
Tests for Signal Handlers
Story: WAVE-P2-002

Tests the command pattern signal handlers for gate completion,
agent errors, blocking, session pause, and emergency stop.
"""

import pytest

from src.pubsub.types import WaveMessage, EventType, MessagePriority
from src.events.signal_handler import (
    GateCompleteHandler,
    AgentErrorHandler,
    AgentBlockedHandler,
    SessionPauseHandler,
    EmergencyStopHandler,
)
from src.events.signal_types import HandlerResult


def _make_message(
    event_type: EventType,
    payload: dict,
    source: str = "test-agent",
    **kwargs,
) -> WaveMessage:
    """Helper to create test messages."""
    return WaveMessage(
        event_type=event_type,
        payload=payload,
        source=source,
        project="test-project",
        **kwargs,
    )


class TestGateCompleteHandler:
    """Tests for GateCompleteHandler (AC-04)."""

    def test_advances_gate(self):
        """AC-04: Gate completion advances to next gate."""
        handler = GateCompleteHandler()
        msg = _make_message(
            EventType.GATE_PASSED,
            {"gate_id": "gate-2", "result": "pass"},
            story_id="TEST-001",
        )

        result = handler.handle(msg)

        assert result.success is True
        assert "gate_advance:gate-2" in result.action_taken
        assert result.data["gate_id"] == "gate-2"
        assert result.data["next_gate"] == "gate-3"

    def test_last_gate_has_no_next(self):
        """Last gate (gate-7) has no next gate."""
        handler = GateCompleteHandler()
        msg = _make_message(
            EventType.GATE_PASSED,
            {"gate_id": "gate-7", "result": "pass"},
        )

        result = handler.handle(msg)

        assert result.success is True
        assert result.data["next_gate"] is None

    def test_extracts_story_id_from_message(self):
        """Story ID is extracted from message fields."""
        handler = GateCompleteHandler()
        msg = _make_message(
            EventType.GATE_PASSED,
            {"gate_id": "gate-1", "result": "pass"},
            story_id="STORY-123",
        )

        result = handler.handle(msg)

        assert result.data["story_id"] == "STORY-123"


class TestAgentErrorHandler:
    """Tests for AgentErrorHandler (AC-05)."""

    def test_triggers_retry_below_max(self):
        """AC-05: Error below max retries triggers retry."""
        handler = AgentErrorHandler(max_retries=3)
        msg = _make_message(
            EventType.AGENT_ERROR,
            {"error": "build failed", "retry_count": 1},
        )

        result = handler.handle(msg)

        assert result.success is True
        assert "retry:" in result.action_taken
        assert result.data["should_retry"] is True
        assert result.data["retry_count"] == 2

    def test_escalates_at_max_retries(self):
        """AC-05: Error at max retries triggers escalation."""
        handler = AgentErrorHandler(max_retries=3)
        msg = _make_message(
            EventType.AGENT_ERROR,
            {"error": "persistent failure", "retry_count": 3},
        )

        result = handler.handle(msg)

        assert result.success is True
        assert "escalate:" in result.action_taken
        assert result.data["should_retry"] is False
        assert result.data["escalated"] is True

    def test_first_error_retries(self):
        """First error (retry_count=0) should retry."""
        handler = AgentErrorHandler(max_retries=3)
        msg = _make_message(
            EventType.AGENT_ERROR,
            {"error": "transient error", "retry_count": 0},
        )

        result = handler.handle(msg)

        assert result.data["should_retry"] is True
        assert result.data["retry_count"] == 1


class TestAgentBlockedHandler:
    """Tests for AgentBlockedHandler."""

    def test_pauses_execution(self):
        """Blocked agent triggers pause."""
        handler = AgentBlockedHandler()
        msg = _make_message(
            EventType.STORY_BLOCKED,
            {"reason": "dependency not met", "blocked_by": "STORY-100"},
            source="be-dev-1",
        )

        result = handler.handle(msg)

        assert result.success is True
        assert "pause:" in result.action_taken
        assert result.data["paused"] is True
        assert result.data["blocked_by"] == "STORY-100"


class TestSessionPauseHandler:
    """Tests for SessionPauseHandler."""

    def test_pauses_session(self):
        """Session pause request is handled."""
        handler = SessionPauseHandler()
        msg = _make_message(
            EventType.SESSION_COMPLETED,
            {"reason": "user requested pause"},
            session_id="session-abc",
        )

        result = handler.handle(msg)

        assert result.success is True
        assert "session_pause:" in result.action_taken
        assert result.data["session_id"] == "session-abc"
        assert result.data["paused"] is True


class TestEmergencyStopHandler:
    """Tests for EmergencyStopHandler."""

    def test_halts_immediately(self):
        """AC-05: Emergency stop halts workflow."""
        handler = EmergencyStopHandler()
        msg = _make_message(
            EventType.EMERGENCY_STOP,
            {"reason": "critical safety violation"},
            source="safety-monitor",
        )

        result = handler.handle(msg)

        assert result.success is True
        assert result.action_taken == "emergency_stop"
        assert result.data["halted"] is True
        assert result.data["source"] == "safety-monitor"


class TestUnknownSignals:
    """Tests for unknown/unregistered signal types."""

    def test_handler_returns_handler_result(self):
        """All handlers return HandlerResult instances."""
        handlers = [
            GateCompleteHandler(),
            AgentErrorHandler(),
            AgentBlockedHandler(),
            SessionPauseHandler(),
            EmergencyStopHandler(),
        ]

        msg = _make_message(
            EventType.GATE_PASSED,
            {"gate_id": "gate-1", "result": "pass"},
        )

        for handler in handlers:
            result = handler.handle(msg)
            assert isinstance(result, HandlerResult)
