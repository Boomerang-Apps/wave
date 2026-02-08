"""
Tests for Emergency Stop System
Story: WAVE-P5-003

Tests the emergency stop that halts all WAVE execution, broadcasts
to agents, preserves state, logs events, and supports recovery.

Test Categories:
1. Stop Triggering (AC-01, AC-02, AC-08) — 4 tests
2. Agent Broadcasting (AC-04) — 3 tests
3. State Preservation (AC-03, AC-05) — 3 tests
4. Logging (AC-06) — 2 tests
5. Recovery (AC-07) — 3 tests

Total: 15 tests
"""

import time
import threading
import pytest
from datetime import datetime, timezone

from src.safety.emergency_stop import (
    EmergencyStop,
    StopReason,
    StopEvent,
    StopTrigger,
)
from src.safety.stop_broadcaster import StopBroadcaster, AgentHandle
from src.safety.state_preserver import StatePreserver


# ═══════════════════════════════════════════════════════════════════════════════
# FIXTURES
# ═══════════════════════════════════════════════════════════════════════════════

class MockAgent:
    """Agent that tracks stop signals."""
    def __init__(self, agent_id: str):
        self.agent_id = agent_id
        self.stopped = False
        self.stop_time = None

    def stop(self):
        self.stopped = True
        self.stop_time = time.monotonic()


@pytest.fixture
def emergency_stop():
    es = EmergencyStop()
    yield es
    # Reset class-level state between tests
    EmergencyStop._active = False
    EmergencyStop._reason = ""
    EmergencyStop._event = None


@pytest.fixture
def broadcaster():
    return StopBroadcaster()


@pytest.fixture
def state_preserver(tmp_path):
    return StatePreserver(storage_path=str(tmp_path / "state"))


# ═══════════════════════════════════════════════════════════════════════════════
# 1. Stop Triggering (AC-01, AC-02, AC-08)
# ═══════════════════════════════════════════════════════════════════════════════

class TestStopTriggering:
    """Tests for AC-01, AC-02, AC-08: Stop triggering methods."""

    def test_trigger_sets_stop_flag(self, emergency_stop):
        """AC-01: Emergency stop sets global stop flag."""
        assert emergency_stop.is_stopped is False
        emergency_stop.trigger_enhanced(
            reason="Test stop",
            triggered_by="admin",
            trigger_type=StopTrigger.CLI,
        )
        assert emergency_stop.is_stopped is True

    def test_multiple_trigger_types_supported(self, emergency_stop):
        """AC-02: Stop can be triggered via multiple methods."""
        assert StopTrigger.CLI is not None
        assert StopTrigger.API is not None
        assert StopTrigger.SLACK is not None
        assert StopTrigger.WEB is not None
        assert StopTrigger.FILE is not None

    def test_stop_overrides_all_operations(self, emergency_stop):
        """AC-08: Stop flag checked by all operations."""
        emergency_stop.trigger_enhanced("Override test", "admin", StopTrigger.API)
        # Any operation checking should_continue gets False
        assert emergency_stop.should_continue is False

    def test_stop_records_event(self, emergency_stop):
        """AC-01: Stop event is recorded with metadata."""
        emergency_stop.trigger_enhanced("Test", "admin@wave.dev", StopTrigger.CLI)
        event = emergency_stop.last_event
        assert event is not None
        assert isinstance(event, StopEvent)
        assert event.reason == "Test"


# ═══════════════════════════════════════════════════════════════════════════════
# 2. Agent Broadcasting (AC-04)
# ═══════════════════════════════════════════════════════════════════════════════

class TestAgentBroadcasting:
    """Tests for AC-04: All agents receive stop signal."""

    def test_broadcast_reaches_all_agents(self, broadcaster):
        """AC-04: Stop signal sent to every registered agent."""
        agents = [MockAgent(f"agent-{i}") for i in range(4)]
        for a in agents:
            broadcaster.register(AgentHandle(
                agent_id=a.agent_id,
                stop_fn=a.stop,
            ))

        broadcaster.broadcast_stop()
        assert all(a.stopped for a in agents)

    def test_broadcast_handles_agent_failure(self, broadcaster):
        """AC-04: One agent failing to stop doesn't block others."""
        good_agent = MockAgent("good")
        bad_fn = lambda: (_ for _ in ()).throw(RuntimeError("fail"))

        broadcaster.register(AgentHandle(
            agent_id="bad", stop_fn=bad_fn,
        ))
        broadcaster.register(AgentHandle(
            agent_id="good", stop_fn=good_agent.stop,
        ))

        broadcaster.broadcast_stop()
        assert good_agent.stopped is True

    def test_broadcast_returns_status(self, broadcaster):
        """AC-04: Broadcast returns per-agent stop status."""
        agent = MockAgent("a1")
        broadcaster.register(AgentHandle(
            agent_id="a1", stop_fn=agent.stop,
        ))
        results = broadcaster.broadcast_stop()
        assert len(results) == 1
        assert results[0]["agent_id"] == "a1"
        assert results[0]["stopped"] is True


# ═══════════════════════════════════════════════════════════════════════════════
# 3. State Preservation (AC-03, AC-05)
# ═══════════════════════════════════════════════════════════════════════════════

class TestStatePreservation:
    """Tests for AC-03, AC-05: State preserved for recovery."""

    def test_save_emergency_checkpoint(self, state_preserver):
        """AC-03: Emergency checkpoint saved on stop."""
        state = {
            "active_stories": ["S-1", "S-2"],
            "stage": "development",
            "tokens_used": 50000,
        }
        checkpoint_id = state_preserver.save_emergency(state, reason="Test stop")
        assert checkpoint_id is not None

    def test_restore_from_emergency(self, state_preserver):
        """AC-03: State can be restored from emergency checkpoint."""
        state = {"stories": ["S-1"], "stage": "qa"}
        cp_id = state_preserver.save_emergency(state, reason="Stop")
        restored = state_preserver.restore(cp_id)
        assert restored["stories"] == ["S-1"]

    def test_emergency_checkpoint_includes_metadata(self, state_preserver):
        """AC-05: Emergency checkpoint includes stop metadata."""
        cp_id = state_preserver.save_emergency(
            {"data": "test"},
            reason="Budget exceeded",
        )
        meta = state_preserver.get_checkpoint_metadata(cp_id)
        assert meta["reason"] == "Budget exceeded"
        assert meta["type"] == "emergency"


# ═══════════════════════════════════════════════════════════════════════════════
# 4. Logging (AC-06)
# ═══════════════════════════════════════════════════════════════════════════════

class TestLogging:
    """Tests for AC-06: Stop reason logged."""

    def test_stop_reason_recorded(self, emergency_stop):
        """AC-06: Stop reason recorded in event."""
        emergency_stop.trigger_enhanced("Cost overrun", "admin", StopTrigger.API)
        assert emergency_stop.last_event.reason == "Cost overrun"

    def test_triggering_user_recorded(self, emergency_stop):
        """AC-06: User who triggered stop is recorded."""
        emergency_stop.trigger_enhanced("Test", "cto@wave.dev", StopTrigger.SLACK)
        assert emergency_stop.last_event.triggered_by == "cto@wave.dev"


# ═══════════════════════════════════════════════════════════════════════════════
# 5. Recovery (AC-07)
# ═══════════════════════════════════════════════════════════════════════════════

class TestRecovery:
    """Tests for AC-07: Recovery possible after stop."""

    def test_reset_clears_stop_flag(self, emergency_stop):
        """AC-07: Reset allows pipeline to resume."""
        emergency_stop.trigger_enhanced("Test", "admin", StopTrigger.CLI)
        assert emergency_stop.is_stopped is True
        emergency_stop.reset()
        assert emergency_stop.is_stopped is False

    def test_event_history_preserved_after_reset(self, emergency_stop):
        """AC-07: Event history available even after reset."""
        emergency_stop.trigger_enhanced("First stop", "admin", StopTrigger.CLI)
        emergency_stop.reset()
        emergency_stop.trigger_enhanced("Second stop", "admin", StopTrigger.API)
        assert len(emergency_stop.event_history) == 2

    def test_state_preserver_lists_checkpoints(self, state_preserver):
        """AC-07: All emergency checkpoints discoverable for recovery."""
        state_preserver.save_emergency({"s": 1}, reason="Stop 1")
        state_preserver.save_emergency({"s": 2}, reason="Stop 2")
        checkpoints = state_preserver.list_checkpoints()
        assert len(checkpoints) == 2
