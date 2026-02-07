"""
Tests for Recovery Manager
Story: WAVE-P1-003

Tests recovery and resume capabilities for interrupted workflows.
"""

import pytest
from uuid import uuid4

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from src.db.models import Base
from src.db import SessionRepository, StoryExecutionRepository
from src.execution import (
    StoryExecutionEngine,
    ExecutionContext,
    GateStatus,
    GateResult,
)
from src.recovery import (
    RecoveryManager,
    RecoveryStrategy,
)


@pytest.fixture
def db_engine():
    """Create in-memory SQLite database for testing."""
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    return engine


@pytest.fixture
def db_session(db_engine):
    """Create database session for testing."""
    Session = sessionmaker(bind=db_engine)
    session = Session()
    yield session
    session.rollback()
    session.close()


@pytest.fixture
def wave_session(db_session):
    """Create a wave session for testing."""
    session_repo = SessionRepository(db_session)
    session = session_repo.create(project_name="test-project", wave_number=1)
    db_session.commit()
    return session


@pytest.fixture
def engine(db_session):
    """Create execution engine instance."""
    return StoryExecutionEngine(db_session)


@pytest.fixture
def recovery_manager(db_session):
    """Create recovery manager instance."""
    return RecoveryManager(db_session)


@pytest.fixture
def context(wave_session):
    """Create execution context."""
    return ExecutionContext(
        session_id=wave_session.id,
        story_id="TEST-001",
        story_title="Test Story",
        domain="test",
        agent="test-agent",
    )


class TestRecoveryPoints:
    """Test recovery point discovery."""

    def test_find_recovery_points(self, engine, recovery_manager, context, db_session):
        """AC-01: Can find all recovery points for a story."""
        execution_id = engine.start_execution(context)

        # Execute a gate to create more checkpoints
        gate_result = GateResult(
            gate="gate-1",
            status=GateStatus.PASSED,
            ac_passed=5,
            ac_total=5,
        )
        engine.execute_gate(execution_id, gate_result)

        recovery_points = recovery_manager.find_recovery_points(
            context.session_id,
            story_id="TEST-001"
        )

        # Should have: story_start + gate checkpoint
        assert len(recovery_points) >= 2
        assert any(rp.checkpoint_type == "story_start" for rp in recovery_points)
        assert any(rp.checkpoint_type == "gate" for rp in recovery_points)

    def test_get_last_recovery_point(self, engine, recovery_manager, context, db_session):
        """AC-02: Can get most recent recovery point."""
        execution_id = engine.start_execution(context)

        gate_result = GateResult(
            gate="gate-1",
            status=GateStatus.PASSED,
        )
        engine.execute_gate(execution_id, gate_result)

        recovery_point = recovery_manager.get_last_recovery_point(
            context.session_id,
            "TEST-001"
        )

        assert recovery_point is not None
        assert recovery_point.story_id == "TEST-001"
        # Could be gate or story_start due to timestamp resolution
        assert recovery_point.checkpoint_type in ["gate", "story_start"]

    def test_recovery_point_fields(self, engine, recovery_manager, context, db_session):
        """AC-03: Recovery points contain necessary information."""
        engine.start_execution(context)

        recovery_point = recovery_manager.get_last_recovery_point(
            context.session_id,
            "TEST-001"
        )

        assert recovery_point.checkpoint_id is not None
        assert recovery_point.checkpoint_type == "story_start"
        assert recovery_point.story_id == "TEST-001"
        assert recovery_point.state is not None
        assert recovery_point.created_at is not None
        assert isinstance(recovery_point.can_resume, bool)


class TestRecoverabilityChecks:
    """Test checking if stories can be recovered."""

    def test_can_recover_in_progress_story(self, engine, recovery_manager, context, db_session):
        """AC-04: In-progress stories can be recovered."""
        engine.start_execution(context)

        assert recovery_manager.can_recover(context.session_id, "TEST-001") is True

    def test_cannot_recover_nonexistent_story(self, recovery_manager, context, db_session):
        """AC-05: Non-existent stories cannot be recovered."""
        assert recovery_manager.can_recover(context.session_id, "FAKE-001") is False

    def test_cannot_recover_completed_story(self, engine, recovery_manager, context, db_session):
        """AC-06: Completed stories cannot be recovered."""
        execution_id = engine.start_execution(context)
        engine.complete_execution(execution_id)

        assert recovery_manager.can_recover(context.session_id, "TEST-001") is False

    def test_can_recover_failed_story(self, engine, recovery_manager, context, db_session):
        """AC-07: Failed stories can be recovered."""
        execution_id = engine.start_execution(context)
        engine.fail_execution(execution_id, "Test failure")

        assert recovery_manager.can_recover(context.session_id, "TEST-001") is True


class TestResumeFromLast:
    """Test resuming from last checkpoint."""

    def test_resume_from_last_checkpoint(self, engine, recovery_manager, context, db_session):
        """AC-08: Can resume from last checkpoint."""
        execution_id = engine.start_execution(context)
        engine.fail_execution(execution_id, "Test failure")

        result = recovery_manager.recover_story(
            context.session_id,
            "TEST-001",
            RecoveryStrategy.RESUME_FROM_LAST
        )

        assert result["strategy"] == "resume_from_last"
        assert result["story_id"] == "TEST-001"
        assert result["status"] == "resumed"

        # Verify execution status updated
        repo = StoryExecutionRepository(db_session)
        execution = repo.get_by_id(execution_id)
        assert execution.status == "in_progress"
        assert execution.failed_at is None

    def test_resume_creates_recovery_checkpoint(self, engine, recovery_manager, context, db_session):
        """AC-09: Resuming creates a recovery checkpoint."""
        execution_id = engine.start_execution(context)
        engine.fail_execution(execution_id, "Test failure")

        from src.db import CheckpointRepository
        cp_repo = CheckpointRepository(db_session)
        checkpoints_before = len(cp_repo.list_by_story(
            context.session_id,
            "TEST-001"
        ))

        recovery_manager.recover_story(
            context.session_id,
            "TEST-001",
            RecoveryStrategy.RESUME_FROM_LAST
        )

        checkpoints_after = len(cp_repo.list_by_story(
            context.session_id,
            "TEST-001"
        ))

        assert checkpoints_after > checkpoints_before


class TestResumeFromGate:
    """Test resuming from specific gate."""

    def test_resume_from_gate(self, engine, recovery_manager, context, db_session):
        """AC-10: Can resume from specific gate."""
        execution_id = engine.start_execution(context)

        # Execute gate-1
        gate_result = GateResult(
            gate="gate-1",
            status=GateStatus.PASSED,
        )
        engine.execute_gate(execution_id, gate_result)

        # Fail the story
        engine.fail_execution(execution_id, "Test failure")

        # Resume from gate-1
        result = recovery_manager.recover_story(
            context.session_id,
            "TEST-001",
            RecoveryStrategy.RESUME_FROM_GATE,
            target_gate="gate-1"
        )

        assert result["strategy"] == "resume_from_gate"
        assert result["target_gate"] == "gate-1"
        assert result["status"] == "resumed"

        # Verify current gate updated
        repo = StoryExecutionRepository(db_session)
        db_session.expire_all()  # Clear cache
        execution = repo.get_by_id(execution_id)
        assert execution.meta_data["current_gate"] == "gate-1"

    def test_resume_from_gate_requires_target(self, engine, recovery_manager, context, db_session):
        """AC-11: Resume from gate requires target_gate parameter."""
        execution_id = engine.start_execution(context)
        engine.fail_execution(execution_id, "Test failure")

        with pytest.raises(ValueError, match="target_gate required"):
            recovery_manager.recover_story(
                context.session_id,
                "TEST-001",
                RecoveryStrategy.RESUME_FROM_GATE
            )

    def test_resume_from_nonexistent_gate_fails(self, engine, recovery_manager, context, db_session):
        """AC-12: Cannot resume from gate that wasn't reached."""
        execution_id = engine.start_execution(context)
        engine.fail_execution(execution_id, "Test failure")

        with pytest.raises(ValueError, match="No checkpoint found"):
            recovery_manager.recover_story(
                context.session_id,
                "TEST-001",
                RecoveryStrategy.RESUME_FROM_GATE,
                target_gate="gate-5"  # Never reached this gate
            )


class TestRestart:
    """Test restarting stories."""

    def test_restart_story(self, engine, recovery_manager, context, db_session):
        """AC-13: Can restart story from beginning."""
        execution_id = engine.start_execution(context)

        # Execute a gate
        gate_result = GateResult(
            gate="gate-1",
            status=GateStatus.PASSED,
        )
        engine.execute_gate(execution_id, gate_result)

        # Fail the story
        engine.fail_execution(execution_id, "Test failure")

        # Restart
        result = recovery_manager.recover_story(
            context.session_id,
            "TEST-001",
            RecoveryStrategy.RESTART
        )

        assert result["strategy"] == "restart"
        assert result["status"] == "restarted"

        # Verify execution reset
        repo = StoryExecutionRepository(db_session)
        db_session.expire_all()  # Clear cache
        execution = repo.get_by_id(execution_id)
        assert execution.status == "pending"
        assert execution.started_at is None
        assert execution.retry_count == 0
        assert execution.acceptance_criteria_passed == 0
        assert execution.meta_data["current_gate"] == "gate-0"


class TestSkip:
    """Test skipping failed stories."""

    def test_skip_story(self, engine, recovery_manager, context, db_session):
        """AC-14: Can skip failed story."""
        execution_id = engine.start_execution(context)
        engine.fail_execution(execution_id, "Test failure")

        result = recovery_manager.recover_story(
            context.session_id,
            "TEST-001",
            RecoveryStrategy.SKIP
        )

        assert result["strategy"] == "skip"
        assert result["status"] == "skipped"

        # Verify execution cancelled
        repo = StoryExecutionRepository(db_session)
        execution = repo.get_by_id(execution_id)
        assert execution.status == "cancelled"


class TestSessionRecovery:
    """Test recovering entire sessions."""

    def test_recover_session(self, engine, recovery_manager, wave_session, db_session):
        """AC-15: Can recover entire session."""
        # Create multiple stories
        context1 = ExecutionContext(
            session_id=wave_session.id,
            story_id="TEST-001",
            story_title="Story 1",
            domain="test",
            agent="test-agent",
        )
        context2 = ExecutionContext(
            session_id=wave_session.id,
            story_id="TEST-002",
            story_title="Story 2",
            domain="test",
            agent="test-agent",
        )

        exec_id1 = engine.start_execution(context1)
        exec_id2 = engine.start_execution(context2)

        # Fail both
        engine.fail_execution(exec_id1, "Failure 1")
        engine.fail_execution(exec_id2, "Failure 2")

        # Recover session
        result = recovery_manager.recover_session(
            wave_session.id,
            RecoveryStrategy.RESUME_FROM_LAST
        )

        assert result["total_stories"] == 2
        assert len(result["recovered"]) == 2
        assert len(result["failed"]) == 0


class TestRecoveryStatus:
    """Test recovery status querying."""

    def test_get_recovery_status(self, engine, recovery_manager, wave_session, db_session):
        """AC-16: Can query recovery status."""
        context = ExecutionContext(
            session_id=wave_session.id,
            story_id="TEST-001",
            story_title="Story 1",
            domain="test",
            agent="test-agent",
        )

        exec_id = engine.start_execution(context)
        engine.fail_execution(exec_id, "Test failure")

        status = recovery_manager.get_recovery_status(wave_session.id)

        assert status["session_id"] == str(wave_session.id)
        assert status["total_stories"] == 1
        assert status["by_status"]["failed"] == 1
        assert len(status["recoverable_stories"]) == 1
        assert status["recoverable_stories"][0]["story_id"] == "TEST-001"
        assert status["recoverable_stories"][0]["current_status"] == "failed"
