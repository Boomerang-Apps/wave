"""
TDD Tests for Workflow Locker
Gate 0 Validation - Grok Improvement Request

These tests are written FIRST (RED state) before implementation.
Tests should FAIL initially, then pass after implementation (GREEN state).

Grok Requirement: Lock workflow to ensure gates are followed sequentially
"""

import pytest
import json
import os
import sys
import tempfile
from unittest.mock import MagicMock, patch

# Add parent to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


class TestWorkflowLockerBasic:
    """Basic TDD tests for Workflow Locker."""

    def test_workflow_locker_initialization(self):
        """Test that WorkflowLocker initializes correctly."""
        from scripts.workflow_locker import WorkflowLocker

        locker = WorkflowLocker(project_path="/test/path")

        assert locker.project_path == "/test/path"
        assert locker.gates is not None
        assert len(locker.gates) == 9  # Gates 0-8

    def test_workflow_locker_gates_defined(self):
        """Test that all 9 gates are defined in correct order."""
        from scripts.workflow_locker import WorkflowLocker, GATES

        assert len(GATES) == 9
        assert "Research" in GATES[0]
        assert "Planning" in GATES[1]
        assert "TDD" in GATES[2]
        assert "Branching" in GATES[3]
        assert "Develop" in GATES[4]
        assert "Refactor" in GATES[5]
        assert "Safety" in GATES[6]
        assert "QA" in GATES[7]
        assert "Merge" in GATES[8] or "Deploy" in GATES[8]


class TestWorkflowLocking:
    """TDD tests for workflow locking mechanism."""

    def test_lock_workflow_creates_lock_file(self):
        """Test that lock_workflow creates a lock file."""
        from scripts.workflow_locker import WorkflowLocker

        with tempfile.TemporaryDirectory() as tmpdir:
            # Create .claude directory
            os.makedirs(os.path.join(tmpdir, ".claude"))

            locker = WorkflowLocker(project_path=tmpdir)
            locker.lock_workflow()

            lock_path = os.path.join(tmpdir, ".claude", "WORKFLOW.lock")
            assert os.path.exists(lock_path)

    def test_lock_workflow_contains_gates(self):
        """Test that lock file contains all gates."""
        from scripts.workflow_locker import WorkflowLocker

        with tempfile.TemporaryDirectory() as tmpdir:
            os.makedirs(os.path.join(tmpdir, ".claude"))

            locker = WorkflowLocker(project_path=tmpdir)
            locker.lock_workflow()

            lock_path = os.path.join(tmpdir, ".claude", "WORKFLOW.lock")
            with open(lock_path) as f:
                lock_data = json.load(f)

            assert "gates" in lock_data
            assert len(lock_data["gates"]) == 9
            assert "timestamp" in lock_data or "locked_at" in lock_data


class TestGateTracking:
    """TDD tests for gate state tracking."""

    def test_get_current_gate_from_p_json(self):
        """Test getting current gate from P.json."""
        from scripts.workflow_locker import WorkflowLocker

        with tempfile.TemporaryDirectory() as tmpdir:
            os.makedirs(os.path.join(tmpdir, ".claude"))

            # Create P.json with current_gate
            p_json = {
                "wave_state": {
                    "current_wave": 1,
                    "current_gate": 2
                }
            }
            with open(os.path.join(tmpdir, ".claude", "P.json"), "w") as f:
                json.dump(p_json, f)

            locker = WorkflowLocker(project_path=tmpdir)
            assert locker.get_current_gate() == 2

    def test_update_gate_in_p_json(self):
        """Test updating current gate in P.json."""
        from scripts.workflow_locker import WorkflowLocker

        with tempfile.TemporaryDirectory() as tmpdir:
            os.makedirs(os.path.join(tmpdir, ".claude"))

            # Create initial P.json
            p_json = {"wave_state": {"current_wave": 1, "current_gate": 0}}
            with open(os.path.join(tmpdir, ".claude", "P.json"), "w") as f:
                json.dump(p_json, f)

            locker = WorkflowLocker(project_path=tmpdir)
            locker.update_gate(3)

            # Verify update
            with open(os.path.join(tmpdir, ".claude", "P.json")) as f:
                updated = json.load(f)
            assert updated["wave_state"]["current_gate"] == 3


class TestGateEnforcement:
    """TDD tests for gate enforcement (no skipping)."""

    def test_check_gate_passes_when_in_sequence(self):
        """Test that check_gate passes when gates are in sequence."""
        from scripts.workflow_locker import WorkflowLocker

        with tempfile.TemporaryDirectory() as tmpdir:
            os.makedirs(os.path.join(tmpdir, ".claude"))

            p_json = {"wave_state": {"current_wave": 1, "current_gate": 2}}
            with open(os.path.join(tmpdir, ".claude", "P.json"), "w") as f:
                json.dump(p_json, f)

            locker = WorkflowLocker(project_path=tmpdir)

            # Should pass - checking gate 2 when at gate 2
            result = locker.check_gate(expected_gate=2)
            assert result["valid"] is True

    def test_check_gate_fails_on_drift(self):
        """Test that check_gate fails when gate drift detected."""
        from scripts.workflow_locker import WorkflowLocker

        with tempfile.TemporaryDirectory() as tmpdir:
            os.makedirs(os.path.join(tmpdir, ".claude"))

            p_json = {"wave_state": {"current_wave": 1, "current_gate": 2}}
            with open(os.path.join(tmpdir, ".claude", "P.json"), "w") as f:
                json.dump(p_json, f)

            locker = WorkflowLocker(project_path=tmpdir)

            # Should fail - expecting gate 5 but at gate 2 (skip attempt)
            result = locker.check_gate(expected_gate=5)
            assert result["valid"] is False
            assert "drift" in result.get("error", "").lower() or result.get("drift_detected", False)

    def test_advance_gate_only_increments_by_one(self):
        """Test that advance_gate only moves to next gate."""
        from scripts.workflow_locker import WorkflowLocker

        with tempfile.TemporaryDirectory() as tmpdir:
            os.makedirs(os.path.join(tmpdir, ".claude"))

            p_json = {"wave_state": {"current_wave": 1, "current_gate": 3}}
            with open(os.path.join(tmpdir, ".claude", "P.json"), "w") as f:
                json.dump(p_json, f)

            locker = WorkflowLocker(project_path=tmpdir)
            locker.advance_gate()

            assert locker.get_current_gate() == 4  # Only incremented by 1

    def test_cannot_skip_gates(self):
        """Test that skipping gates is blocked."""
        from scripts.workflow_locker import WorkflowLocker

        with tempfile.TemporaryDirectory() as tmpdir:
            os.makedirs(os.path.join(tmpdir, ".claude"))

            p_json = {"wave_state": {"current_wave": 1, "current_gate": 1}}
            with open(os.path.join(tmpdir, ".claude", "P.json"), "w") as f:
                json.dump(p_json, f)

            locker = WorkflowLocker(project_path=tmpdir)

            # Try to jump to gate 5 (skip 2, 3, 4)
            result = locker.set_gate(5)
            assert result["success"] is False
            assert "skip" in result.get("error", "").lower() or "sequential" in result.get("error", "").lower()


class TestGateHistory:
    """TDD tests for gate history tracking."""

    def test_gate_history_recorded(self):
        """Test that gate transitions are recorded in history."""
        from scripts.workflow_locker import WorkflowLocker

        with tempfile.TemporaryDirectory() as tmpdir:
            os.makedirs(os.path.join(tmpdir, ".claude"))

            p_json = {
                "wave_state": {
                    "current_wave": 1,
                    "current_gate": 0,
                    "gate_history": []
                }
            }
            with open(os.path.join(tmpdir, ".claude", "P.json"), "w") as f:
                json.dump(p_json, f)

            locker = WorkflowLocker(project_path=tmpdir)
            locker.advance_gate()

            history = locker.get_gate_history()
            assert len(history) >= 1
            assert history[-1]["gate"] == 1 or history[-1]["from_gate"] == 0


class TestWorkflowReset:
    """TDD tests for workflow reset functionality."""

    def test_reset_requires_confirmation(self):
        """Test that reset requires explicit confirmation."""
        from scripts.workflow_locker import WorkflowLocker

        with tempfile.TemporaryDirectory() as tmpdir:
            os.makedirs(os.path.join(tmpdir, ".claude"))

            p_json = {"wave_state": {"current_wave": 1, "current_gate": 5}}
            with open(os.path.join(tmpdir, ".claude", "P.json"), "w") as f:
                json.dump(p_json, f)

            locker = WorkflowLocker(project_path=tmpdir)

            # Reset without confirmation should fail
            result = locker.reset_workflow(confirm=False)
            assert result["success"] is False

    def test_reset_with_confirmation_succeeds(self):
        """Test that reset with confirmation succeeds."""
        from scripts.workflow_locker import WorkflowLocker

        with tempfile.TemporaryDirectory() as tmpdir:
            os.makedirs(os.path.join(tmpdir, ".claude"))

            p_json = {"wave_state": {"current_wave": 1, "current_gate": 5}}
            with open(os.path.join(tmpdir, ".claude", "P.json"), "w") as f:
                json.dump(p_json, f)

            locker = WorkflowLocker(project_path=tmpdir)
            result = locker.reset_workflow(confirm=True)

            assert result["success"] is True
            assert locker.get_current_gate() == 0


class TestDriftDetection:
    """TDD tests for drift detection."""

    def test_detect_drift_returns_drift_info(self):
        """Test that detect_drift returns drift information."""
        from scripts.workflow_locker import WorkflowLocker

        with tempfile.TemporaryDirectory() as tmpdir:
            os.makedirs(os.path.join(tmpdir, ".claude"))

            # Simulate drift: P.json says gate 5, but expected is gate 2
            p_json = {"wave_state": {"current_wave": 1, "current_gate": 5}}
            with open(os.path.join(tmpdir, ".claude", "P.json"), "w") as f:
                json.dump(p_json, f)

            locker = WorkflowLocker(project_path=tmpdir)
            drift = locker.detect_drift(expected_gate=2)

            assert drift["has_drift"] is True
            assert drift["expected"] == 2
            assert drift["actual"] == 5


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
