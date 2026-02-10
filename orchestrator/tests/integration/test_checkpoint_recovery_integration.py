"""
Integration Tests for Checkpoint and Recovery System
Story: WAVE-P1-003

Tests full checkpoint creation through workflow execution,
recovery after simulated crash, and <5s recovery time requirement.
"""

import pytest
import time
from uuid import uuid4
from datetime import datetime

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from src.db.models import Base
from src.db import SessionRepository, CheckpointRepository, StoryExecutionRepository
from src.execution import (
    StoryExecutionEngine,
    ExecutionContext,
    GateStatus,
    GateResult,
)
from src.recovery import RecoveryManager, RecoveryStrategy
from src.checkpoint import WAVECheckpointSaver


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


class TestCheckpointCreationThroughWorkflow:
    """Test AC-03: Checkpoint created at each gate."""

    def test_checkpoint_created_at_story_start(
        self, execution_engine, checkpoint_repo, wave_session, db_session
    ):
        """Verify checkpoint created when story starts."""
        context = ExecutionContext(
            session_id=wave_session.id,
            story_id="TEST-001",
            story_title="Test Story",
            domain="test",
            agent="test-agent",
        )

        execution_id = execution_engine.start_execution(context)

        # Verify checkpoint created
        checkpoints = checkpoint_repo.list_by_story(
            wave_session.id, "TEST-001"
        )

        assert len(checkpoints) == 1
        assert checkpoints[0].checkpoint_type == "story_start"
        assert checkpoints[0].story_id == "TEST-001"
        assert "started_at" in checkpoints[0].state

    def test_checkpoint_created_at_each_gate(
        self, execution_engine, checkpoint_repo, wave_session, db_session
    ):
        """Verify checkpoint created after each gate execution."""
        context = ExecutionContext(
            session_id=wave_session.id,
            story_id="TEST-002",
            story_title="Test Story 2",
            domain="test",
            agent="test-agent",
        )

        execution_id = execution_engine.start_execution(context)

        # Execute gates 0-3
        for gate_num in range(0, 4):
            gate_name = f"gate-{gate_num}"
            gate_result = GateResult(
                gate=gate_name,
                status=GateStatus.PASSED,
                ac_passed=5,
                ac_total=5,
            )
            execution_engine.execute_gate(execution_id, gate_result)

        # Verify checkpoints created
        checkpoints = checkpoint_repo.list_by_story(
            wave_session.id, "TEST-002"
        )

        # Should have: story_start + 4 gate checkpoints
        assert len(checkpoints) >= 5

        gate_checkpoints = [
            cp for cp in checkpoints if cp.checkpoint_type == "gate"
        ]
        assert len(gate_checkpoints) == 4

        # Verify gates in order
        gate_names = [cp.gate for cp in gate_checkpoints]
        assert "gate-0" in gate_names
        assert "gate-1" in gate_names
        assert "gate-2" in gate_names
        assert "gate-3" in gate_names

    def test_checkpoint_created_on_failure(
        self, execution_engine, checkpoint_repo, wave_session, db_session
    ):
        """Verify error checkpoint created when execution fails."""
        context = ExecutionContext(
            session_id=wave_session.id,
            story_id="TEST-003",
            story_title="Test Story 3",
            domain="test",
            agent="test-agent",
        )

        execution_id = execution_engine.start_execution(context)
        execution_engine.fail_execution(execution_id, "Test failure")

        # Verify error checkpoint created
        checkpoints = checkpoint_repo.list_by_story(
            wave_session.id, "TEST-003"
        )

        error_checkpoints = [
            cp for cp in checkpoints if cp.checkpoint_type == "error"
        ]

        assert len(error_checkpoints) == 1
        assert error_checkpoints[0].state["error_message"] == "Test failure"


class TestRecoveryAfterCrash:
    """Test AC-01 & AC-02: Recovery within 5 seconds from last checkpoint."""

    def test_recovery_from_last_checkpoint_under_5_seconds(
        self, execution_engine, recovery_manager, wave_session, db_session
    ):
        """AC-01: Verify recovery completes within 5 seconds."""
        # Setup: Create execution and fail it
        context = ExecutionContext(
            session_id=wave_session.id,
            story_id="PERF-001",
            story_title="Performance Test",
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

        # Fail the execution (simulating crash)
        execution_engine.fail_execution(execution_id, "Simulated crash")

        # Measure recovery time
        start_time = time.time()

        result = recovery_manager.recover_story(
            wave_session.id,
            "PERF-001",
            RecoveryStrategy.RESUME_FROM_LAST
        )

        recovery_time = time.time() - start_time

        # Verify recovery succeeded
        assert result["status"] == "resumed"
        assert result["story_id"] == "PERF-001"

        # AC-01: Recovery must complete within 5 seconds
        assert recovery_time < 5.0, f"Recovery took {recovery_time}s (must be <5s)"

    def test_resume_from_specific_gate(
        self, execution_engine, recovery_manager, wave_session, db_session
    ):
        """AC-02: Can resume from specific gate checkpoint."""
        context = ExecutionContext(
            session_id=wave_session.id,
            story_id="GATE-001",
            story_title="Gate Recovery Test",
            domain="test",
            agent="test-agent",
        )

        execution_id = execution_engine.start_execution(context)

        # Execute gates 0-2
        for gate_num in range(0, 3):
            gate_result = GateResult(
                gate=f"gate-{gate_num}",
                status=GateStatus.PASSED,
            )
            execution_engine.execute_gate(execution_id, gate_result)

        # Fail execution
        execution_engine.fail_execution(execution_id, "Test failure")

        # Recover from gate-1 specifically
        result = recovery_manager.recover_story(
            wave_session.id,
            "GATE-001",
            RecoveryStrategy.RESUME_FROM_GATE,
            target_gate="gate-1"
        )

        assert result["status"] == "resumed"
        assert result["target_gate"] == "gate-1"

    def test_restart_from_beginning(
        self, execution_engine, recovery_manager, wave_session, db_session
    ):
        """Test restarting story from beginning."""
        context = ExecutionContext(
            session_id=wave_session.id,
            story_id="RESTART-001",
            story_title="Restart Test",
            domain="test",
            agent="test-agent",
        )

        execution_id = execution_engine.start_execution(context)

        # Execute a gate
        gate_result = GateResult(
            gate="gate-0",
            status=GateStatus.PASSED,
        )
        execution_engine.execute_gate(execution_id, gate_result)

        # Fail execution
        execution_engine.fail_execution(execution_id, "Test failure")

        # Restart
        result = recovery_manager.recover_story(
            wave_session.id,
            "RESTART-001",
            RecoveryStrategy.RESTART
        )

        assert result["status"] == "restarted"

        # Verify execution reset
        execution_repo = StoryExecutionRepository(db_session)
        db_session.expire_all()
        execution = execution_repo.get_by_id(execution_id)
        assert execution.status == "pending"


class TestRecoveryStatusQuery:
    """Test AC-04: Recovery status can be queried."""

    def test_query_recovery_status(
        self, execution_engine, recovery_manager, wave_session, db_session
    ):
        """Verify recovery status can be queried."""
        # Create multiple stories in different states
        contexts = [
            ExecutionContext(
                session_id=wave_session.id,
                story_id=f"STATUS-{i}",
                story_title=f"Status Test {i}",
                domain="test",
                agent="test-agent",
            )
            for i in range(4)
        ]

        # Start all executions
        exec_ids = [
            execution_engine.start_execution(ctx)
            for ctx in contexts
        ]

        # Fail first two
        execution_engine.fail_execution(exec_ids[0], "Failure 1")
        execution_engine.fail_execution(exec_ids[1], "Failure 2")

        # Complete the third one
        execution_engine.complete_execution(exec_ids[2])

        # Query recovery status
        status = recovery_manager.get_recovery_status(wave_session.id)

        assert status["session_id"] == str(wave_session.id)
        assert status["total_stories"] == 4
        assert status["by_status"]["failed"] == 2
        assert status["by_status"]["in_progress"] == 1
        assert status["by_status"]["complete"] == 1

        # Failed and in_progress stories are recoverable (not complete)
        assert len(status["recoverable_stories"]) == 3


class TestLangGraphCheckpointer:
    """Test LangGraph checkpointer integration."""

    def test_langgraph_checkpointer_save_and_load(
        self, wave_session, db_session, checkpoint_repo
    ):
        """Verify WAVECheckpointSaver can save and load checkpoints."""
        checkpointer = WAVECheckpointSaver(
            db_session,
            wave_session.id,
            story_id="LANGGRAPH-001"
        )

        # Create a mock checkpoint
        config = {
            "configurable": {
                "thread_id": str(wave_session.id),
            }
        }

        checkpoint_data = {
            "id": str(uuid4()),
            "v": 1,
            "ts": datetime.utcnow().isoformat(),
            "channel_values": {
                "test": "value"
            }
        }

        metadata = {
            "checkpoint_type": "gate",
            "checkpoint_name": "Gate 0",
            "gate": "gate-0",
            "story_id": "LANGGRAPH-001"
        }

        # Save checkpoint
        updated_config = checkpointer.put(config, checkpoint_data, metadata)

        # Verify checkpoint saved
        checkpoint_id = updated_config["configurable"]["checkpoint_id"]
        assert checkpoint_id is not None

        # Load checkpoint
        loaded_checkpoint = checkpointer.get(updated_config)

        assert loaded_checkpoint is not None
        assert loaded_checkpoint["id"] == checkpoint_data["id"]
        assert loaded_checkpoint["channel_values"]["test"] == "value"


class TestSessionRecovery:
    """Test recovering entire sessions."""

    def test_recover_entire_session(
        self, execution_engine, recovery_manager, wave_session, db_session
    ):
        """AC-15: Can recover entire session with multiple stories."""
        # Create multiple stories
        contexts = [
            ExecutionContext(
                session_id=wave_session.id,
                story_id=f"SESSION-{i}",
                story_title=f"Session Test {i}",
                domain="test",
                agent="test-agent",
            )
            for i in range(3)
        ]

        exec_ids = [
            execution_engine.start_execution(ctx)
            for ctx in contexts
        ]

        # Fail all
        for exec_id in exec_ids:
            execution_engine.fail_execution(exec_id, "Test failure")

        # Recover entire session
        result = recovery_manager.recover_session(
            wave_session.id,
            RecoveryStrategy.RESUME_FROM_LAST
        )

        assert result["total_stories"] == 3
        assert len(result["recovered"]) == 3
        assert len(result["failed"]) == 0


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
