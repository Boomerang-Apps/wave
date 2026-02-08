"""
Tests for Human Checkpoint System
Story: WAVE-P5-002

Tests the configurable checkpoint system with 4 levels of autonomy,
async approval/rejection, timeout escalation, and audit logging.

Test Categories:
1. Checkpoint Levels (AC-01 through AC-05) — 5 tests
2. Approval Flow (AC-06) — 3 tests
3. Timeout & Escalation (AC-07) — 3 tests
4. Audit Logging (AC-08) — 3 tests

Total: 14 tests
"""

import time
import pytest
from datetime import datetime, timezone
from unittest.mock import MagicMock

from src.checkpoints.human_checkpoint import (
    HumanCheckpoint,
    CheckpointLevel,
    CheckpointEvent,
)
from src.checkpoints.approval_manager import (
    ApprovalManager,
    ApprovalDecision,
    ApprovalStatus,
)
from src.checkpoints.escalation_handler import EscalationHandler


# ═══════════════════════════════════════════════════════════════════════════════
# 1. Checkpoint Levels (AC-01 through AC-05)
# ═══════════════════════════════════════════════════════════════════════════════

class TestCheckpointLevels:
    """Tests for AC-01 through AC-05: Configurable checkpoint levels."""

    def test_level1_pauses_at_every_gate(self):
        """AC-02: Level 1 requires approval after every gate."""
        cp = HumanCheckpoint(level=CheckpointLevel.EVERY_GATE)
        assert cp.should_pause(event=CheckpointEvent.GATE_COMPLETE) is True
        assert cp.should_pause(event=CheckpointEvent.STORY_COMPLETE) is True
        assert cp.should_pause(event=CheckpointEvent.PRE_MERGE) is True

    def test_level2_pauses_at_story_completion(self):
        """AC-03: Level 2 pauses after story completion, not gates."""
        cp = HumanCheckpoint(level=CheckpointLevel.AFTER_STORY)
        assert cp.should_pause(event=CheckpointEvent.GATE_COMPLETE) is False
        assert cp.should_pause(event=CheckpointEvent.STORY_COMPLETE) is True
        assert cp.should_pause(event=CheckpointEvent.PRE_MERGE) is True

    def test_level3_pauses_before_merge_only(self):
        """AC-04: Level 3 pauses only before final merge."""
        cp = HumanCheckpoint(level=CheckpointLevel.PRE_MERGE_ONLY)
        assert cp.should_pause(event=CheckpointEvent.GATE_COMPLETE) is False
        assert cp.should_pause(event=CheckpointEvent.STORY_COMPLETE) is False
        assert cp.should_pause(event=CheckpointEvent.PRE_MERGE) is True

    def test_level4_no_pauses(self):
        """AC-05: Level 4 runs without any human checkpoints."""
        cp = HumanCheckpoint(level=CheckpointLevel.FULL_AUTONOMY)
        assert cp.should_pause(event=CheckpointEvent.GATE_COMPLETE) is False
        assert cp.should_pause(event=CheckpointEvent.STORY_COMPLETE) is False
        assert cp.should_pause(event=CheckpointEvent.PRE_MERGE) is False

    def test_level_configurable_at_init(self):
        """AC-01: Checkpoint level set at initialization."""
        cp = HumanCheckpoint(level=CheckpointLevel.AFTER_STORY)
        assert cp.level == CheckpointLevel.AFTER_STORY


# ═══════════════════════════════════════════════════════════════════════════════
# 2. Approval Flow (AC-06)
# ═══════════════════════════════════════════════════════════════════════════════

class TestApprovalFlow:
    """Tests for AC-06: Async approval via multiple channels."""

    def test_request_approval_creates_pending(self):
        """AC-06: Requesting approval creates pending decision."""
        mgr = ApprovalManager()
        checkpoint_id = mgr.request_approval(
            story_id="S-1",
            event=CheckpointEvent.STORY_COMPLETE,
            description="Story S-1 completed, ready for review",
        )
        assert checkpoint_id is not None
        decision = mgr.get_decision(checkpoint_id)
        assert decision.status == ApprovalStatus.PENDING

    def test_approve_checkpoint(self):
        """AC-06: Approving a checkpoint changes status."""
        mgr = ApprovalManager()
        cp_id = mgr.request_approval(
            story_id="S-1",
            event=CheckpointEvent.STORY_COMPLETE,
            description="Ready for review",
        )
        mgr.approve(cp_id, approver="pm@wave.dev")
        decision = mgr.get_decision(cp_id)
        assert decision.status == ApprovalStatus.APPROVED

    def test_reject_checkpoint(self):
        """AC-06: Rejecting a checkpoint records reason."""
        mgr = ApprovalManager()
        cp_id = mgr.request_approval(
            story_id="S-1",
            event=CheckpointEvent.STORY_COMPLETE,
            description="Ready for review",
        )
        mgr.reject(cp_id, approver="pm@wave.dev", reason="Quality issues")
        decision = mgr.get_decision(cp_id)
        assert decision.status == ApprovalStatus.REJECTED
        assert decision.reason == "Quality issues"


# ═══════════════════════════════════════════════════════════════════════════════
# 3. Timeout & Escalation (AC-07)
# ═══════════════════════════════════════════════════════════════════════════════

class TestTimeoutEscalation:
    """Tests for AC-07: Approval timeout with escalation."""

    def test_escalation_triggered_on_timeout(self):
        """AC-07: Escalation triggered when timeout exceeded."""
        handler = EscalationHandler(
            timeout_seconds=1,  # 1 second for testing
            escalation_contacts=["cto@wave.dev"],
        )
        # Create a checkpoint that's already "old"
        decision = ApprovalDecision(
            checkpoint_id="cp-1",
            story_id="S-1",
            status=ApprovalStatus.PENDING,
            requested_at=datetime(2020, 1, 1, tzinfo=timezone.utc),
        )
        result = handler.check_timeout(decision)
        assert result.should_escalate is True

    def test_no_escalation_within_timeout(self):
        """AC-07: No escalation when within timeout."""
        handler = EscalationHandler(
            timeout_seconds=86400,  # 24 hours
            escalation_contacts=["cto@wave.dev"],
        )
        decision = ApprovalDecision(
            checkpoint_id="cp-1",
            story_id="S-1",
            status=ApprovalStatus.PENDING,
            requested_at=datetime.now(timezone.utc),
        )
        result = handler.check_timeout(decision)
        assert result.should_escalate is False

    def test_escalation_contacts_provided(self):
        """AC-07: Escalation includes contact list."""
        handler = EscalationHandler(
            timeout_seconds=1,
            escalation_contacts=["cto@wave.dev", "backup@wave.dev"],
        )
        decision = ApprovalDecision(
            checkpoint_id="cp-1",
            story_id="S-1",
            status=ApprovalStatus.PENDING,
            requested_at=datetime(2020, 1, 1, tzinfo=timezone.utc),
        )
        result = handler.check_timeout(decision)
        assert len(result.contacts) == 2


# ═══════════════════════════════════════════════════════════════════════════════
# 4. Audit Logging (AC-08)
# ═══════════════════════════════════════════════════════════════════════════════

class TestAuditLogging:
    """Tests for AC-08: Approval/rejection recorded for audit."""

    def test_approval_logged_with_timestamp(self):
        """AC-08: Approval recorded with timestamp."""
        mgr = ApprovalManager()
        cp_id = mgr.request_approval(
            story_id="S-1",
            event=CheckpointEvent.STORY_COMPLETE,
            description="Review",
        )
        mgr.approve(cp_id, approver="pm@wave.dev")
        decision = mgr.get_decision(cp_id)
        assert decision.decided_at is not None

    def test_approver_identity_recorded(self):
        """AC-08: Approver identity saved in audit log."""
        mgr = ApprovalManager()
        cp_id = mgr.request_approval(
            story_id="S-1",
            event=CheckpointEvent.STORY_COMPLETE,
            description="Review",
        )
        mgr.approve(cp_id, approver="pm@wave.dev")
        decision = mgr.get_decision(cp_id)
        assert decision.approver == "pm@wave.dev"

    def test_audit_log_queryable(self):
        """AC-08: All decisions queryable from audit log."""
        mgr = ApprovalManager()
        cp1 = mgr.request_approval("S-1", CheckpointEvent.STORY_COMPLETE, "R1")
        cp2 = mgr.request_approval("S-2", CheckpointEvent.PRE_MERGE, "R2")
        mgr.approve(cp1, approver="pm")
        mgr.reject(cp2, approver="cto", reason="Not ready")

        log = mgr.get_audit_log()
        assert len(log) == 2
        assert log[0].status == ApprovalStatus.APPROVED
        assert log[1].status == ApprovalStatus.REJECTED
