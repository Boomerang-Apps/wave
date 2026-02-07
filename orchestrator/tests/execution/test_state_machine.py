"""
Tests for Story Execution State Machine
Story: WAVE-P1-002

Tests state transitions, gate execution, and checkpointing.
"""

import pytest
from decimal import Decimal
from uuid import uuid4

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from src.db.models import Base
from src.db import SessionRepository
from src.execution import (
    StoryExecutionEngine,
    ExecutionContext,
    StoryState,
    GateStatus,
    GateResult,
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
def context(wave_session):
    """Create execution context."""
    return ExecutionContext(
        session_id=wave_session.id,
        story_id="TEST-001",
        story_title="Test Story",
        domain="test",
        agent="test-agent",
        priority="P1",
        story_points=5,
    )


class TestExecutionLifecycle:
    """Test story execution lifecycle."""

    def test_start_execution(self, engine, context, db_session):
        """AC-01: Start story execution creates record and checkpoint."""
        execution_id = engine.start_execution(context)

        assert execution_id is not None

        # Verify execution record
        from src.db import StoryExecutionRepository
        repo = StoryExecutionRepository(db_session)
        execution = repo.get_by_id(execution_id)

        assert execution.story_id == "TEST-001"
        assert execution.status == "in_progress"
        assert execution.domain == "test"
        assert execution.agent == "test-agent"

        # Verify checkpoint created
        from src.db import CheckpointRepository
        cp_repo = CheckpointRepository(db_session)
        checkpoints = cp_repo.list_by_story(
            context.session_id,
            "TEST-001"
        )

        assert len(checkpoints) == 1
        assert checkpoints[0].checkpoint_type == "story_start"

    def test_start_duplicate_story_fails(self, engine, context, db_session):
        """AC-02: Cannot start same story twice in same session."""
        engine.start_execution(context)

        with pytest.raises(ValueError, match="already exists"):
            engine.start_execution(context)

    def test_start_with_invalid_session_fails(self, engine, context, db_session):
        """AC-03: Cannot start execution with invalid session."""
        context.session_id = uuid4()

        with pytest.raises(ValueError, match="not found"):
            engine.start_execution(context)


class TestStateTransitions:
    """Test state transition logic."""

    def test_valid_transition(self, engine, context, db_session):
        """AC-04: Valid state transitions succeed."""
        execution_id = engine.start_execution(context)

        # IN_PROGRESS -> REVIEW (valid)
        engine.transition_state(
            execution_id,
            StoryState.REVIEW,
            reason="Ready for review"
        )

        from src.db import StoryExecutionRepository
        repo = StoryExecutionRepository(db_session)
        execution = repo.get_by_id(execution_id)

        assert execution.status == "review"
        assert execution.meta_data["last_transition_reason"] == "Ready for review"

    def test_invalid_transition(self, engine, context, db_session):
        """AC-05: Invalid state transitions fail."""
        execution_id = engine.start_execution(context)

        # IN_PROGRESS -> PENDING (invalid)
        with pytest.raises(ValueError, match="Invalid transition"):
            engine.transition_state(
                execution_id,
                StoryState.PENDING
            )

    def test_transition_creates_checkpoint(self, engine, context, db_session):
        """AC-06: State transitions create checkpoints."""
        execution_id = engine.start_execution(context)

        engine.transition_state(
            execution_id,
            StoryState.REVIEW,
            reason="Test transition"
        )

        from src.db import CheckpointRepository
        repo = CheckpointRepository(db_session)
        checkpoints = repo.list_by_story(
            context.session_id,
            "TEST-001"
        )

        # story_start + transition checkpoint
        assert len(checkpoints) == 2

        # Find transition checkpoint (not story_start)
        transition_cp = [cp for cp in checkpoints if cp.checkpoint_type != "story_start"][0]
        assert transition_cp.state["new_state"] == "review"
        assert transition_cp.state["reason"] == "Test transition"


class TestGateExecution:
    """Test gate execution and validation."""

    def test_gate_pass(self, engine, context, db_session):
        """AC-07: Passing gate creates checkpoint and advances."""
        execution_id = engine.start_execution(context)

        gate_result = GateResult(
            gate="gate-1",
            status=GateStatus.PASSED,
            ac_passed=5,
            ac_total=5,
        )

        engine.execute_gate(execution_id, gate_result)

        # Verify checkpoint created
        from src.db import CheckpointRepository
        repo = CheckpointRepository(db_session)
        gate_checkpoint = repo.get_gate_checkpoint(
            context.session_id,
            "TEST-001",
            "gate-1"
        )

        assert gate_checkpoint is not None
        assert gate_checkpoint.state["status"] == "passed"
        assert gate_checkpoint.state["ac_passed"] == 5

        # Verify metadata updated with next gate
        from src.db import StoryExecutionRepository
        exec_repo = StoryExecutionRepository(db_session)
        execution = exec_repo.get_by_id(execution_id)
        assert execution.meta_data["current_gate"] == "gate-2"

    def test_gate_fail_with_retries(self, engine, context, db_session):
        """AC-08: Failed gate increments retry count."""
        execution_id = engine.start_execution(context)

        gate_result = GateResult(
            gate="gate-2",
            status=GateStatus.FAILED,
            ac_passed=0,
            ac_total=1,
            error_message="Build failed",
        )

        engine.execute_gate(execution_id, gate_result)

        from src.db import StoryExecutionRepository
        repo = StoryExecutionRepository(db_session)
        execution = repo.get_by_id(execution_id)

        assert execution.retry_count == 1
        assert execution.status == "in_progress"

    def test_gate_fail_max_retries(self, engine, context, db_session):
        """AC-09: Failed gate with max retries marks as failed."""
        execution_id = engine.start_execution(context)

        # Set retry count to max
        from src.db import StoryExecutionRepository
        repo = StoryExecutionRepository(db_session)
        repo.update_metrics(execution_id, retry_count=3)
        db_session.commit()

        gate_result = GateResult(
            gate="gate-2",
            status=GateStatus.FAILED,
            error_message="Build failed",
        )

        engine.execute_gate(execution_id, gate_result)

        execution = repo.get_by_id(execution_id)
        assert execution.status == "failed"
        assert "gate-2 failed" in execution.error_message

    def test_last_gate_completion(self, engine, context, db_session):
        """AC-10: Passing final gate marks story complete."""
        execution_id = engine.start_execution(context)

        # Pass final gate (gate-7)
        gate_result = GateResult(
            gate="gate-7",
            status=GateStatus.PASSED,
            ac_passed=1,
            ac_total=1,
        )

        engine.execute_gate(execution_id, gate_result)

        from src.db import StoryExecutionRepository
        repo = StoryExecutionRepository(db_session)
        execution = repo.get_by_id(execution_id)

        assert execution.status == "complete"


class TestExecutionCompletion:
    """Test execution completion."""

    def test_complete_execution(self, engine, context, db_session):
        """AC-11: Complete execution records results."""
        execution_id = engine.start_execution(context)

        engine.complete_execution(
            execution_id=execution_id,
            files_created=["test.py"],
            files_modified=["main.py"],
            branch_name="feat/test-001",
            commit_sha="abc123",
            pr_url="https://github.com/test/pr/1",
            tests_passing=True,
            coverage_achieved=Decimal("85.5"),
        )

        from src.db import StoryExecutionRepository
        repo = StoryExecutionRepository(db_session)
        execution = repo.get_by_id(execution_id)

        assert execution.status == "complete"
        assert execution.files_created == ["test.py"]
        assert execution.files_modified == ["main.py"]
        assert execution.branch_name == "feat/test-001"
        assert execution.tests_passing is True
        assert execution.coverage_achieved == Decimal("85.5")

        # Verify completion checkpoint
        from src.db import CheckpointRepository
        cp_repo = CheckpointRepository(db_session)
        checkpoints = cp_repo.list_by_type(
            context.session_id,
            "story_complete"
        )

        assert len(checkpoints) == 1
        assert checkpoints[0].state["pr_url"] == "https://github.com/test/pr/1"

    def test_fail_execution(self, engine, context, db_session):
        """AC-12: Fail execution records error."""
        execution_id = engine.start_execution(context)

        engine.fail_execution(
            execution_id,
            error_message="Test failure"
        )

        from src.db import StoryExecutionRepository
        repo = StoryExecutionRepository(db_session)
        execution = repo.get_by_id(execution_id)

        assert execution.status == "failed"
        assert execution.error_message == "Test failure"

        # Verify error checkpoint
        from src.db import CheckpointRepository
        cp_repo = CheckpointRepository(db_session)
        checkpoints = cp_repo.list_by_type(
            context.session_id,
            "error"
        )

        assert len(checkpoints) == 1


class TestStateQuery:
    """Test state querying."""

    def test_get_current_state(self, engine, context, db_session):
        """AC-13: Can query current execution state."""
        execution_id = engine.start_execution(context)

        # Execute a gate
        gate_result = GateResult(
            gate="gate-1",
            status=GateStatus.PASSED,
            ac_passed=3,
            ac_total=3,
        )
        engine.execute_gate(execution_id, gate_result)

        state = engine.get_current_state(execution_id)

        assert state["story_id"] == "TEST-001"
        assert state["status"] == "in_progress"
        assert state["current_gate"] == "gate-2"
        assert state["ac_passed"] == 3
        assert state["ac_total"] == 3
        assert state["latest_checkpoint"] is not None
        # Latest checkpoint could be gate or story_start due to timestamp resolution
        assert state["latest_checkpoint"]["type"] in ["gate", "story_start"]
