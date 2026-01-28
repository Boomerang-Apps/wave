"""
WAVE v2 Emergency Stop Tests (TDD)

These tests define the expected behavior of the emergency stop mechanism.
All tests must pass before autonomous mode can be enabled.
"""

import pytest
import asyncio
import time
from pathlib import Path
from unittest.mock import Mock, patch
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.safety.emergency_stop import (
    EmergencyStop,
    EmergencyStopError,
    EMERGENCY_STOP_FILE,
    EMERGENCY_STOP_CHANNEL,
)


class TestEmergencyStopFile:
    """Test file-based emergency stop trigger."""

    def setup_method(self):
        """Clean up before each test."""
        self.stop_file = Path(EMERGENCY_STOP_FILE)
        if self.stop_file.exists():
            self.stop_file.unlink()

    def teardown_method(self):
        """Clean up after each test."""
        if self.stop_file.exists():
            self.stop_file.unlink()

    def test_emergency_stop_file_triggers_halt(self):
        """When .claude/EMERGENCY-STOP exists, check returns True."""
        es = EmergencyStop()

        # Initially not stopped
        assert es.check() == False

        # Create stop file
        self.stop_file.parent.mkdir(parents=True, exist_ok=True)
        self.stop_file.touch()

        # Now should be stopped
        assert es.check() == True

    def test_emergency_stop_removal_resumes(self):
        """When EMERGENCY-STOP removed, check returns False."""
        es = EmergencyStop()

        # Create and remove
        self.stop_file.parent.mkdir(parents=True, exist_ok=True)
        self.stop_file.touch()
        assert es.check() == True

        self.stop_file.unlink()
        assert es.check() == False

    def test_emergency_stop_with_reason(self):
        """Stop file can contain a reason."""
        es = EmergencyStop()

        self.stop_file.parent.mkdir(parents=True, exist_ok=True)
        self.stop_file.write_text("Safety violation detected in BE-1")

        assert es.check() == True
        assert "Safety violation" in es.get_reason()


class TestEmergencyStopRedis:
    """Test Redis pub/sub emergency stop broadcast."""

    @pytest.fixture
    def mock_redis(self):
        """Mock Redis client."""
        with patch('src.safety.emergency_stop.get_redis_client') as mock:
            client = Mock()
            mock.return_value = client
            yield client

    def test_broadcast_sends_to_channel(self, mock_redis):
        """Broadcast sends HALT message to Redis channel."""
        es = EmergencyStop(redis_client=mock_redis)

        es.broadcast_halt("Test halt")

        mock_redis.publish.assert_called_once_with(
            EMERGENCY_STOP_CHANNEL,
            '{"action": "HALT", "reason": "Test halt", "timestamp": pytest.approx(time.time(), abs=5)}'
        )

    def test_subscribe_receives_halt(self, mock_redis):
        """Subscribers receive HALT messages."""
        pubsub = Mock()
        mock_redis.pubsub.return_value = pubsub
        pubsub.get_message.return_value = {
            'type': 'message',
            'data': b'{"action": "HALT", "reason": "Test"}'
        }

        es = EmergencyStop(redis_client=mock_redis)
        es.subscribe()

        # Should detect halt from message
        assert es.check_redis() == True


class TestEmergencyStopIntegration:
    """Integration tests for emergency stop with agents."""

    def test_agent_halts_on_emergency_stop(self):
        """Agent worker must halt when emergency stop triggered."""
        from src.safety.emergency_stop import EmergencyStop

        es = EmergencyStop()

        # Simulate agent checking stop condition
        def agent_loop():
            iterations = 0
            while not es.check() and iterations < 100:
                iterations += 1
                time.sleep(0.01)
            return iterations

        # Without stop, runs full iterations
        iterations = agent_loop()
        assert iterations == 100

        # With stop file, halts immediately
        stop_file = Path(EMERGENCY_STOP_FILE)
        stop_file.parent.mkdir(parents=True, exist_ok=True)
        stop_file.touch()

        iterations = agent_loop()
        assert iterations == 0  # Halted immediately

        stop_file.unlink()

    def test_all_agents_halt_within_timeout(self):
        """All agents must halt within 5 seconds of emergency stop."""
        # This is a specification test - implementation must ensure
        # that the halt signal propagates to all agents within 5s
        MAX_HALT_TIME_SECONDS = 5

        es = EmergencyStop()

        # Verify halt timeout is configured correctly
        assert es.halt_timeout <= MAX_HALT_TIME_SECONDS

    def test_emergency_stop_logs_event(self):
        """Emergency stop must log the event for audit."""
        es = EmergencyStop()

        with patch.object(es, '_log_event') as mock_log:
            es.trigger("Manual test trigger")

            mock_log.assert_called_once()
            call_args = mock_log.call_args[0][0]
            assert "EMERGENCY_STOP" in call_args
            assert "Manual test trigger" in call_args


class TestEmergencyStopAPI:
    """Test API endpoints for emergency stop."""

    def test_trigger_endpoint_creates_stop_file(self):
        """POST /emergency-stop creates the stop file."""
        es = EmergencyStop()

        es.trigger("API triggered")

        assert Path(EMERGENCY_STOP_FILE).exists()

        # Cleanup
        Path(EMERGENCY_STOP_FILE).unlink()

    def test_clear_endpoint_removes_stop_file(self):
        """DELETE /emergency-stop removes the stop file."""
        stop_file = Path(EMERGENCY_STOP_FILE)
        stop_file.parent.mkdir(parents=True, exist_ok=True)
        stop_file.touch()

        es = EmergencyStop()
        es.clear()

        assert not stop_file.exists()

    def test_status_endpoint_returns_state(self):
        """GET /emergency-stop returns current state."""
        es = EmergencyStop()

        status = es.status()

        assert 'active' in status
        assert 'reason' in status
        assert 'triggered_at' in status


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
