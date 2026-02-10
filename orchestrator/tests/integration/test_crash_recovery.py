"""
Crash Recovery Test Suite
Story: WAVE-P1-003 - Day 3

Tests crash recovery scenarios including:
- Hard crash simulation (kill -9 equivalent)
- Recovery at different gate positions
- Recovery time validation (<5s requirement)
- Data preservation after crash
"""

import pytest
import time
from uuid import uuid4

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
    session = session_repo.create(project_name="crash-test", wave_number=1)
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


class TestHardCrashRecovery:
    """Test AC-01: Resume from crash in <5s."""

    def test_crash_at_gate_0(
        self, execution_engine, recovery_manager, wave_session, db_session, execution_repo
    ):
        """Simulate crash at gate-0, verify recovery."""
        # Create execution and execute gate-0
        context = ExecutionContext(
            session_id=wave_session.id,
            story_id="CRASH-GATE-0",
            story_title="Crash at Gate 0",
            domain="test",
            agent="test-agent",
        )

        execution_id = execution_engine.start_execution(context)

        gate_result = GateResult(
            gate="gate-0",
            status=GateStatus.PASSED,
            ac_passed=3,
            ac_total=10,
        )
        execution_engine.execute_gate(execution_id, gate_result)

        # Simulate hard crash (fail execution)
        execution_engine.fail_execution(execution_id, "Simulated hard crash at gate-0")

        # Get pre-crash state
        db_session.expire_all()
        pre_crash = execution_repo.get_by_id(execution_id)
        pre_crash_ac = pre_crash.acceptance_criteria_passed

        # Measure recovery time
        start_time = time.time()

        result = recovery_manager.recover_story(
            wave_session.id,
            "CRASH-GATE-0",
            RecoveryStrategy.RESUME_FROM_LAST
        )

        recovery_time = time.time() - start_time

        # Verify recovery
        assert result["status"] == "resumed"
        assert recovery_time < 5.0, f"Recovery took {recovery_time}s (must be <5s)"

        # Verify state preserved
        db_session.expire_all()
        post_crash = execution_repo.get_by_id(execution_id)
        assert post_crash.status == "in_progress"
        assert post_crash.acceptance_criteria_passed == pre_crash_ac

    def test_crash_at_gate_2(
        self, execution_engine, recovery_manager, wave_session, db_session, execution_repo
    ):
        """Simulate crash at gate-2, verify recovery."""
        context = ExecutionContext(
            session_id=wave_session.id,
            story_id="CRASH-GATE-2",
            story_title="Crash at Gate 2",
            domain="test",
            agent="test-agent",
        )

        execution_id = execution_engine.start_execution(context)

        # Execute gates 0-2
        for gate_num in range(0, 3):
            gate_result = GateResult(
                gate=f"gate-{gate_num}",
                status=GateStatus.PASSED,
                ac_passed=3 + gate_num,
                ac_total=10,
            )
            execution_engine.execute_gate(execution_id, gate_result)

        # Simulate crash
        execution_engine.fail_execution(execution_id, "Simulated hard crash at gate-2")

        # Get pre-crash state
        db_session.expire_all()
        pre_crash = execution_repo.get_by_id(execution_id)
        pre_crash_ac = pre_crash.acceptance_criteria_passed

        # Measure recovery
        start_time = time.time()
        result = recovery_manager.recover_story(
            wave_session.id,
            "CRASH-GATE-2",
            RecoveryStrategy.RESUME_FROM_LAST
        )
        recovery_time = time.time() - start_time

        # Verify
        assert result["status"] == "resumed"
        assert recovery_time < 5.0, f"Recovery took {recovery_time}s (must be <5s)"

        db_session.expire_all()
        post_crash = execution_repo.get_by_id(execution_id)
        assert post_crash.status == "in_progress"
        assert post_crash.acceptance_criteria_passed == pre_crash_ac

    def test_crash_at_gate_5(
        self, execution_engine, recovery_manager, wave_session, db_session, execution_repo
    ):
        """Simulate crash at gate-5, verify recovery."""
        context = ExecutionContext(
            session_id=wave_session.id,
            story_id="CRASH-GATE-5",
            story_title="Crash at Gate 5",
            domain="test",
            agent="test-agent",
        )

        execution_id = execution_engine.start_execution(context)

        # Execute gates 0-5
        for gate_num in range(0, 6):
            gate_result = GateResult(
                gate=f"gate-{gate_num}",
                status=GateStatus.PASSED,
                ac_passed=2 + gate_num,
                ac_total=10,
            )
            execution_engine.execute_gate(execution_id, gate_result)

        # Simulate crash
        execution_engine.fail_execution(execution_id, "Simulated hard crash at gate-5")

        # Measure recovery
        start_time = time.time()
        result = recovery_manager.recover_story(
            wave_session.id,
            "CRASH-GATE-5",
            RecoveryStrategy.RESUME_FROM_LAST
        )
        recovery_time = time.time() - start_time

        # Verify
        assert result["status"] == "resumed"
        assert recovery_time < 5.0, f"Recovery took {recovery_time}s (must be <5s)"

    def test_crash_at_gate_7(
        self, execution_engine, recovery_manager, wave_session, db_session, execution_repo
    ):
        """Simulate crash at gate-7 (final gate), verify recovery."""
        context = ExecutionContext(
            session_id=wave_session.id,
            story_id="CRASH-GATE-7",
            story_title="Crash at Gate 7",
            domain="test",
            agent="test-agent",
        )

        execution_id = execution_engine.start_execution(context)

        # Execute all gates 0-7
        for gate_num in range(0, 8):
            gate_result = GateResult(
                gate=f"gate-{gate_num}",
                status=GateStatus.PASSED,
                ac_passed=1 + gate_num,
                ac_total=10,
            )
            execution_engine.execute_gate(execution_id, gate_result)

        # Simulate crash before completion
        execution_engine.fail_execution(execution_id, "Simulated hard crash at gate-7")

        # Measure recovery
        start_time = time.time()
        result = recovery_manager.recover_story(
            wave_session.id,
            "CRASH-GATE-7",
            RecoveryStrategy.RESUME_FROM_LAST
        )
        recovery_time = time.time() - start_time

        # Verify
        assert result["status"] == "resumed"
        assert recovery_time < 5.0, f"Recovery took {recovery_time}s (must be <5s)"


class TestDataPreservation:
    """Test AC-02: No data loss after recovery."""

    def test_all_checkpoints_preserved(
        self, execution_engine, checkpoint_repo, recovery_manager, wave_session, db_session
    ):
        """Verify all checkpoints are preserved after crash."""
        context = ExecutionContext(
            session_id=wave_session.id,
            story_id="DATA-PRESERVE-001",
            story_title="Data Preservation Test",
            domain="test",
            agent="test-agent",
        )

        execution_id = execution_engine.start_execution(context)

        # Execute multiple gates
        for gate_num in range(0, 5):
            gate_result = GateResult(
                gate=f"gate-{gate_num}",
                status=GateStatus.PASSED,
                ac_passed=gate_num + 1,
                ac_total=10,
            )
            execution_engine.execute_gate(execution_id, gate_result)

        # Count checkpoints before crash
        checkpoints_before = checkpoint_repo.list_by_story(
            wave_session.id,
            "DATA-PRESERVE-001"
        )
        checkpoint_count_before = len(checkpoints_before)

        # Simulate crash
        execution_engine.fail_execution(execution_id, "Crash for data preservation test")

        # Recover
        recovery_manager.recover_story(
            wave_session.id,
            "DATA-PRESERVE-001",
            RecoveryStrategy.RESUME_FROM_LAST
        )

        # Count checkpoints after recovery
        checkpoints_after = checkpoint_repo.list_by_story(
            wave_session.id,
            "DATA-PRESERVE-001"
        )

        # All original checkpoints should still exist
        # (recovery adds one more checkpoint)
        assert len(checkpoints_after) > checkpoint_count_before
        assert len([cp for cp in checkpoints_after if cp.checkpoint_type == "gate"]) == 5

    def test_acceptance_criteria_preserved(
        self, execution_engine, recovery_manager, wave_session, db_session, execution_repo
    ):
        """Verify acceptance criteria counts are preserved."""
        context = ExecutionContext(
            session_id=wave_session.id,
            story_id="AC-PRESERVE-001",
            story_title="AC Preservation Test",
            domain="test",
            agent="test-agent",
        )

        execution_id = execution_engine.start_execution(context)

        # Execute with specific AC counts
        expected_ac_passed = 7
        gate_result = GateResult(
            gate="gate-0",
            status=GateStatus.PASSED,
            ac_passed=expected_ac_passed,
            ac_total=10,
        )
        execution_engine.execute_gate(execution_id, gate_result)

        # Crash
        execution_engine.fail_execution(execution_id, "Test crash")

        # Recover
        recovery_manager.recover_story(
            wave_session.id,
            "AC-PRESERVE-001",
            RecoveryStrategy.RESUME_FROM_LAST
        )

        # Verify AC counts preserved
        db_session.expire_all()
        execution = execution_repo.get_by_id(execution_id)
        assert execution.acceptance_criteria_passed == expected_ac_passed

    def test_metadata_preserved(
        self, execution_engine, recovery_manager, wave_session, db_session, execution_repo
    ):
        """Verify execution metadata is preserved."""
        context = ExecutionContext(
            session_id=wave_session.id,
            story_id="META-PRESERVE-001",
            story_title="Metadata Preservation Test",
            domain="backend",
            agent="be-dev-1",
        )

        execution_id = execution_engine.start_execution(context)

        # Get pre-crash metadata
        db_session.expire_all()
        pre_crash = execution_repo.get_by_id(execution_id)
        pre_crash_domain = pre_crash.domain
        pre_crash_agent = pre_crash.agent

        # Crash and recover
        execution_engine.fail_execution(execution_id, "Test crash")
        recovery_manager.recover_story(
            wave_session.id,
            "META-PRESERVE-001",
            RecoveryStrategy.RESUME_FROM_LAST
        )

        # Verify metadata preserved
        db_session.expire_all()
        post_crash = execution_repo.get_by_id(execution_id)
        assert post_crash.domain == pre_crash_domain
        assert post_crash.agent == pre_crash_agent


class TestGatePreservation:
    """Test AC-03: All gates preserved."""

    def test_gate_checkpoints_queryable(
        self, execution_engine, checkpoint_repo, recovery_manager, wave_session, db_session
    ):
        """Verify gate checkpoints can be queried after recovery."""
        context = ExecutionContext(
            session_id=wave_session.id,
            story_id="GATE-QUERY-001",
            story_title="Gate Queryability Test",
            domain="test",
            agent="test-agent",
        )

        execution_id = execution_engine.start_execution(context)

        # Execute gates 0-3
        for gate_num in range(0, 4):
            gate_result = GateResult(
                gate=f"gate-{gate_num}",
                status=GateStatus.PASSED,
            )
            execution_engine.execute_gate(execution_id, gate_result)

        # Crash and recover
        execution_engine.fail_execution(execution_id, "Test crash")
        recovery_manager.recover_story(
            wave_session.id,
            "GATE-QUERY-001",
            RecoveryStrategy.RESUME_FROM_LAST
        )

        # Verify each gate checkpoint is queryable
        for gate_num in range(0, 4):
            gate_checkpoint = checkpoint_repo.get_gate_checkpoint(
                wave_session.id,
                "GATE-QUERY-001",
                f"gate-{gate_num}"
            )
            assert gate_checkpoint is not None
            assert gate_checkpoint.gate == f"gate-{gate_num}"

    def test_resume_from_specific_gate(
        self, execution_engine, recovery_manager, wave_session, db_session, execution_repo
    ):
        """Verify can resume from any gate checkpoint."""
        context = ExecutionContext(
            session_id=wave_session.id,
            story_id="GATE-RESUME-001",
            story_title="Gate Resume Test",
            domain="test",
            agent="test-agent",
        )

        execution_id = execution_engine.start_execution(context)

        # Execute gates 0-4
        for gate_num in range(0, 5):
            gate_result = GateResult(
                gate=f"gate-{gate_num}",
                status=GateStatus.PASSED,
            )
            execution_engine.execute_gate(execution_id, gate_result)

        # Crash
        execution_engine.fail_execution(execution_id, "Test crash")

        # Resume from gate-2 specifically
        result = recovery_manager.recover_story(
            wave_session.id,
            "GATE-RESUME-001",
            RecoveryStrategy.RESUME_FROM_GATE,
            target_gate="gate-2"
        )

        assert result["status"] == "resumed"
        assert result["target_gate"] == "gate-2"

        # Verify current gate set to gate-2
        db_session.expire_all()
        execution = execution_repo.get_by_id(execution_id)
        assert execution.meta_data["current_gate"] == "gate-2"


class TestRecoveryPerformance:
    """Test recovery performance across different scenarios."""

    def test_recovery_time_with_many_checkpoints(
        self, execution_engine, recovery_manager, wave_session, db_session
    ):
        """Verify recovery time <5s even with many checkpoints."""
        context = ExecutionContext(
            session_id=wave_session.id,
            story_id="PERF-MANY-CP",
            story_title="Performance Test - Many Checkpoints",
            domain="test",
            agent="test-agent",
        )

        execution_id = execution_engine.start_execution(context)

        # Execute all 8 gates to create many checkpoints
        for gate_num in range(0, 8):
            gate_result = GateResult(
                gate=f"gate-{gate_num}",
                status=GateStatus.PASSED,
            )
            execution_engine.execute_gate(execution_id, gate_result)

        # Crash
        execution_engine.fail_execution(execution_id, "Test crash")

        # Measure recovery time
        start_time = time.time()
        recovery_manager.recover_story(
            wave_session.id,
            "PERF-MANY-CP",
            RecoveryStrategy.RESUME_FROM_LAST
        )
        recovery_time = time.time() - start_time

        # Verify performance
        assert recovery_time < 5.0, f"Recovery with many checkpoints took {recovery_time}s"

    def test_recovery_time_multiple_stories(
        self, execution_engine, recovery_manager, wave_session, db_session
    ):
        """Verify session recovery time <5s with multiple stories."""
        # Create 3 stories
        for i in range(3):
            context = ExecutionContext(
                session_id=wave_session.id,
                story_id=f"PERF-MULTI-{i}",
                story_title=f"Performance Test Story {i}",
                domain="test",
                agent="test-agent",
            )
            execution_id = execution_engine.start_execution(context)

            # Execute a few gates
            for gate_num in range(0, 3):
                gate_result = GateResult(
                    gate=f"gate-{gate_num}",
                    status=GateStatus.PASSED,
                )
                execution_engine.execute_gate(execution_id, gate_result)

            # Crash each one
            execution_engine.fail_execution(execution_id, "Test crash")

        # Measure session recovery time
        start_time = time.time()
        result = recovery_manager.recover_session(
            wave_session.id,
            RecoveryStrategy.RESUME_FROM_LAST
        )
        recovery_time = time.time() - start_time

        # Verify all recovered
        assert result["total_stories"] == 3
        assert len(result["recovered"]) == 3

        # Verify performance (may be slightly higher for multiple stories)
        # Allow up to 1s per story, but should still be well under 5s total
        assert recovery_time < 5.0, f"Session recovery took {recovery_time}s"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
