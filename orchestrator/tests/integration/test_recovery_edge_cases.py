"""
Recovery Edge Case Tests
Story: WAVE-P1-003 - Day 3

Tests edge cases and error conditions:
- Corrupted checkpoint data
- Missing session
- Invalid UUIDs
- Non-existent story
- Completed story recovery attempt
- Empty checkpoint state
"""

import pytest
from uuid import uuid4, UUID

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from src.db.models import Base
from src.db import SessionRepository, CheckpointRepository, StoryExecutionRepository
from src.execution import StoryExecutionEngine, ExecutionContext, GateStatus, GateResult
from src.recovery import RecoveryManager, RecoveryStrategy


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
    session = session_repo.create(project_name="edge-case-test", wave_number=1)
    db_session.commit()
    return session


@pytest.fixture
def execution_engine(db_session):
    """Create execution engine instance."""
    return StoryExecutionEngine(db_session)


@pytest.fixture
def recovery_manager(db_session):
    """Create recovery manager instance."""
    return RecoveryManager(db_session)


@pytest.fixture
def checkpoint_repo(db_session):
    """Create checkpoint repository instance."""
    return CheckpointRepository(db_session)


@pytest.fixture
def execution_repo(db_session):
    """Create story execution repository instance."""
    return StoryExecutionRepository(db_session)


class TestInvalidInputs:
    """Test recovery with invalid inputs."""

    def test_recover_nonexistent_session(self, recovery_manager):
        """Attempt to recover session that doesn't exist."""
        fake_session_id = uuid4()

        with pytest.raises(ValueError, match="Session .* not found"):
            recovery_manager.get_recovery_status(fake_session_id)

    def test_recover_nonexistent_story(self, recovery_manager, wave_session):
        """Attempt to recover story that doesn't exist."""
        result = recovery_manager.can_recover(wave_session.id, "FAKE-STORY-001")

        assert result is False

    def test_recover_with_invalid_strategy(self, recovery_manager, wave_session):
        """Attempt recovery with invalid strategy string."""
        # This should raise ValueError since "invalid" is not a valid RecoveryStrategy
        with pytest.raises(ValueError):
            RecoveryStrategy("invalid_strategy")

    def test_recover_without_target_gate(
        self, execution_engine, recovery_manager, wave_session, db_session
    ):
        """Attempt RESUME_FROM_GATE without target_gate parameter."""
        context = ExecutionContext(
            session_id=wave_session.id,
            story_id="NO-TARGET-GATE",
            story_title="No Target Gate Test",
            domain="test",
            agent="test-agent",
        )

        execution_id = execution_engine.start_execution(context)
        execution_engine.fail_execution(execution_id, "Test")

        with pytest.raises(ValueError, match="target_gate required"):
            recovery_manager.recover_story(
                wave_session.id,
                "NO-TARGET-GATE",
                RecoveryStrategy.RESUME_FROM_GATE
            )

    def test_recover_from_nonexistent_gate(
        self, execution_engine, recovery_manager, wave_session, db_session
    ):
        """Attempt to resume from gate that was never reached."""
        context = ExecutionContext(
            session_id=wave_session.id,
            story_id="FAKE-GATE",
            story_title="Fake Gate Test",
            domain="test",
            agent="test-agent",
        )

        execution_id = execution_engine.start_execution(context)
        execution_engine.fail_execution(execution_id, "Test")

        with pytest.raises(ValueError, match="No checkpoint found"):
            recovery_manager.recover_story(
                wave_session.id,
                "FAKE-GATE",
                RecoveryStrategy.RESUME_FROM_GATE,
                target_gate="gate-99"  # Never executed
            )


class TestTerminalStates:
    """Test recovery attempts on stories in terminal states."""

    def test_cannot_recover_completed_story(
        self, execution_engine, recovery_manager, wave_session, db_session
    ):
        """Completed stories cannot be recovered."""
        context = ExecutionContext(
            session_id=wave_session.id,
            story_id="COMPLETED-001",
            story_title="Completed Story",
            domain="test",
            agent="test-agent",
        )

        execution_id = execution_engine.start_execution(context)
        execution_engine.complete_execution(execution_id)

        # Verify cannot recover
        can_recover = recovery_manager.can_recover(wave_session.id, "COMPLETED-001")
        assert can_recover is False

    def test_cannot_recover_cancelled_story(
        self, execution_engine, recovery_manager, wave_session, db_session
    ):
        """Cancelled stories cannot be recovered."""
        context = ExecutionContext(
            session_id=wave_session.id,
            story_id="CANCELLED-001",
            story_title="Cancelled Story",
            domain="test",
            agent="test-agent",
        )

        execution_id = execution_engine.start_execution(context)

        # Skip the story (marks as cancelled)
        recovery_manager.recover_story(
            wave_session.id,
            "CANCELLED-001",
            RecoveryStrategy.SKIP
        )

        # Verify cannot recover again
        can_recover = recovery_manager.can_recover(wave_session.id, "CANCELLED-001")
        assert can_recover is False


class TestEmptyStates:
    """Test recovery with empty or minimal state."""

    def test_recover_story_with_no_gates_executed(
        self, execution_engine, recovery_manager, wave_session, db_session
    ):
        """Recover story that failed immediately after starting."""
        context = ExecutionContext(
            session_id=wave_session.id,
            story_id="NO-GATES-001",
            story_title="No Gates Executed",
            domain="test",
            agent="test-agent",
        )

        execution_id = execution_engine.start_execution(context)
        # Fail immediately without executing any gates
        execution_engine.fail_execution(execution_id, "Immediate failure")

        # Should still be recoverable from story_start checkpoint
        can_recover = recovery_manager.can_recover(wave_session.id, "NO-GATES-001")
        assert can_recover is True

        # Perform recovery
        result = recovery_manager.recover_story(
            wave_session.id,
            "NO-GATES-001",
            RecoveryStrategy.RESUME_FROM_LAST
        )

        assert result["status"] == "resumed"

    def test_recover_empty_session(
        self, recovery_manager, wave_session, db_session
    ):
        """Recover session with no stories."""
        result = recovery_manager.recover_session(
            wave_session.id,
            RecoveryStrategy.RESUME_FROM_LAST
        )

        assert result["total_stories"] == 0
        assert len(result["recovered"]) == 0
        assert len(result["failed"]) == 0


class TestMultipleRecoveryAttempts:
    """Test recovering the same story multiple times."""

    def test_recover_already_recovered_story(
        self, execution_engine, recovery_manager, wave_session, db_session
    ):
        """Recover a story that was already recovered."""
        context = ExecutionContext(
            session_id=wave_session.id,
            story_id="DOUBLE-RECOVER",
            story_title="Double Recovery Test",
            domain="test",
            agent="test-agent",
        )

        execution_id = execution_engine.start_execution(context)
        execution_engine.fail_execution(execution_id, "First failure")

        # First recovery
        result1 = recovery_manager.recover_story(
            wave_session.id,
            "DOUBLE-RECOVER",
            RecoveryStrategy.RESUME_FROM_LAST
        )
        assert result1["status"] == "resumed"

        # Second recovery should work (story is now in_progress)
        # Fail again
        execution_engine.fail_execution(execution_id, "Second failure")

        result2 = recovery_manager.recover_story(
            wave_session.id,
            "DOUBLE-RECOVER",
            RecoveryStrategy.RESUME_FROM_LAST
        )
        assert result2["status"] == "resumed"

    def test_restart_after_resume(
        self, execution_engine, recovery_manager, wave_session, db_session, execution_repo
    ):
        """Resume a story, then restart it."""
        context = ExecutionContext(
            session_id=wave_session.id,
            story_id="RESUME-THEN-RESTART",
            story_title="Resume Then Restart",
            domain="test",
            agent="test-agent",
        )

        execution_id = execution_engine.start_execution(context)

        # Execute some gates
        for gate_num in range(0, 3):
            gate_result = GateResult(
                gate=f"gate-{gate_num}",
                status=GateStatus.PASSED,
            )
            execution_engine.execute_gate(execution_id, gate_result)

        # Fail and resume
        execution_engine.fail_execution(execution_id, "Test failure")
        recovery_manager.recover_story(
            wave_session.id,
            "RESUME-THEN-RESTART",
            RecoveryStrategy.RESUME_FROM_LAST
        )

        # Now restart from beginning
        result = recovery_manager.recover_story(
            wave_session.id,
            "RESUME-THEN-RESTART",
            RecoveryStrategy.RESTART
        )

        assert result["status"] == "restarted"

        # Verify state reset
        execution_repo = StoryExecutionRepository(db_session)
        db_session.expire_all()
        execution = execution_repo.get_by_id(execution_id)
        assert execution.status == "pending"
        assert execution.retry_count == 0


class TestCorruptedData:
    """Test handling of corrupted or unusual checkpoint data."""

    def test_checkpoint_with_empty_state(
        self, checkpoint_repo, wave_session, recovery_manager, db_session
    ):
        """Handle checkpoint with empty state dictionary."""
        # Manually create checkpoint with empty state
        checkpoint = checkpoint_repo.create(
            session_id=wave_session.id,
            checkpoint_type="manual",
            checkpoint_name="Empty State Checkpoint",
            state={},  # Empty state
            story_id="EMPTY-STATE",
        )
        db_session.commit()

        # Should not crash when querying
        recovery_points = recovery_manager.find_recovery_points(
            wave_session.id,
            "EMPTY-STATE"
        )

        assert len(recovery_points) == 1
        assert recovery_points[0].state == {}

    def test_checkpoint_with_missing_fields(
        self, checkpoint_repo, wave_session, db_session
    ):
        """Handle checkpoint with incomplete state data."""
        # Create checkpoint with minimal state
        checkpoint = checkpoint_repo.create(
            session_id=wave_session.id,
            checkpoint_type="gate",
            checkpoint_name="Minimal State",
            state={"gate": "gate-0"},  # Missing many expected fields
            story_id="MINIMAL-STATE",
            gate="gate-0",
        )
        db_session.commit()

        # Should not crash
        assert checkpoint.id is not None
        assert checkpoint.state["gate"] == "gate-0"


class TestConcurrentRecovery:
    """Test recovery scenarios with multiple concurrent operations."""

    def test_recover_multiple_stories_one_fails(
        self, execution_engine, recovery_manager, wave_session, db_session
    ):
        """Recover session where one story fails to recover."""
        # Create two stories
        for i in range(2):
            context = ExecutionContext(
                session_id=wave_session.id,
                story_id=f"CONCURRENT-{i}",
                story_title=f"Concurrent Story {i}",
                domain="test",
                agent="test-agent",
            )
            execution_id = execution_engine.start_execution(context)
            execution_engine.fail_execution(execution_id, "Test failure")

        # Complete one of them (so it can't be recovered)
        execution_repo = StoryExecutionRepository(db_session)
        concurrent_0 = execution_repo.get_by_story_id(wave_session.id, "CONCURRENT-0")
        execution_engine.complete_execution(concurrent_0.id)

        # Recover session
        result = recovery_manager.recover_session(
            wave_session.id,
            RecoveryStrategy.RESUME_FROM_LAST
        )

        # Only CONCURRENT-1 should be recovered
        assert result["total_stories"] == 1
        assert len(result["recovered"]) == 1
        assert result["recovered"][0]["story_id"] == "CONCURRENT-1"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
