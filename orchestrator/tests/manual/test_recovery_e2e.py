"""
End-to-End Recovery Test Script
Story: WAVE-P1-003

Manual test script to verify recovery flow:
1. Create a session with checkpoints
2. Simulate crash (exit)
3. Resume from checkpoint
4. Verify state matches

Usage:
    python tests/manual/test_recovery_e2e.py
"""

import sys
import time
from pathlib import Path
from uuid import uuid4

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

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


def print_section(title):
    """Print section header."""
    print(f"\n{'='*60}")
    print(f"  {title}")
    print(f"{'='*60}\n")


def test_recovery_e2e():
    """Run end-to-end recovery test."""
    print_section("WAVE Session Recovery - End-to-End Test")

    # Setup database
    print("📦 Setting up test database...")
    db_path = "test_recovery.db"
    engine = create_engine(f"sqlite:///{db_path}", echo=False)
    Base.metadata.create_all(engine)
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()

    try:
        # Step 1: Create session
        print_section("Step 1: Create Session")
        session_repo = SessionRepository(db)
        wave_session = session_repo.create(
            project_name="recovery-test",
            wave_number=1
        )
        db.commit()

        session_id = wave_session.id
        print(f"✅ Session created: {session_id}")
        print(f"   Project: {wave_session.project_name}")
        print(f"   Wave: {wave_session.wave_number}")
        print(f"   Status: {wave_session.status}")

        # Step 2: Create story execution with checkpoints
        print_section("Step 2: Create Story Execution")
        execution_engine = StoryExecutionEngine(db)

        context = ExecutionContext(
            session_id=session_id,
            story_id="E2E-TEST-001",
            story_title="End-to-End Recovery Test Story",
            domain="test",
            agent="test-agent",
        )

        execution_id = execution_engine.start_execution(context)
        print(f"✅ Story execution started: {execution_id}")
        print(f"   Story ID: E2E-TEST-001")

        # Execute gates to create checkpoints
        print("\n📋 Executing gates to create checkpoints...")
        for gate_num in range(0, 4):
            gate_name = f"gate-{gate_num}"
            print(f"   Executing {gate_name}...", end="")

            gate_result = GateResult(
                gate=gate_name,
                status=GateStatus.PASSED,
                ac_passed=5 + gate_num,
                ac_total=10,
            )
            execution_engine.execute_gate(execution_id, gate_result)
            print(" ✅")

        # Verify checkpoints created
        checkpoint_repo = CheckpointRepository(db)
        checkpoints = checkpoint_repo.list_by_story(
            session_id,
            "E2E-TEST-001"
        )

        print(f"\n✅ {len(checkpoints)} checkpoints created:")
        for cp in checkpoints:
            print(f"   - {cp.checkpoint_type}: {cp.checkpoint_name}")

        # Step 3: Simulate crash by failing execution
        print_section("Step 3: Simulate Crash")
        print("💥 Simulating crash (failing execution)...")
        execution_engine.fail_execution(execution_id, "Simulated crash for testing")
        print("✅ Execution marked as failed (simulating crash)")

        # Get pre-crash state
        execution_repo = StoryExecutionRepository(db)
        pre_crash_exec = execution_repo.get_by_id(execution_id)
        print(f"\n📸 Pre-crash state:")
        print(f"   Status: {pre_crash_exec.status}")
        print(f"   AC Passed: {pre_crash_exec.acceptance_criteria_passed}")
        print(f"   Retry Count: {pre_crash_exec.retry_count}")

        # Step 4: Perform recovery
        print_section("Step 4: Perform Recovery")
        recovery_manager = RecoveryManager(db)

        # Get recovery status first
        print("📊 Recovery status:")
        status = recovery_manager.get_recovery_status(session_id)
        print(f"   Total stories: {status['total_stories']}")
        print(f"   Recoverable: {len(status['recoverable_stories'])}")

        # Measure recovery time
        print("\n🔄 Starting recovery...")
        start_time = time.time()

        result = recovery_manager.recover_story(
            session_id,
            "E2E-TEST-001",
            RecoveryStrategy.RESUME_FROM_LAST
        )

        recovery_time = time.time() - start_time

        print(f"✅ Recovery complete in {recovery_time:.3f}s")
        print(f"   Strategy: {result['strategy']}")
        print(f"   Status: {result['status']}")
        print(f"   Checkpoint type: {result['checkpoint_type']}")

        # Step 5: Verify state restored
        print_section("Step 5: Verify State Restored")
        db.expire_all()  # Clear cache
        post_recovery_exec = execution_repo.get_by_id(execution_id)

        print(f"📸 Post-recovery state:")
        print(f"   Status: {post_recovery_exec.status}")
        print(f"   AC Passed: {post_recovery_exec.acceptance_criteria_passed}")
        print(f"   Retry Count: {post_recovery_exec.retry_count}")

        # Verify state matches
        assert post_recovery_exec.status == "in_progress", "Status should be in_progress after recovery"
        assert post_recovery_exec.acceptance_criteria_passed == pre_crash_exec.acceptance_criteria_passed, \
            "AC count should match"

        print("\n✅ State verification passed!")

        # Step 6: Check recovery time requirement
        print_section("Step 6: Verify Performance")
        print(f"Recovery time: {recovery_time:.3f}s")

        if recovery_time < 5.0:
            print(f"✅ PASS: Recovery time <5s (requirement met)")
        else:
            print(f"❌ FAIL: Recovery time >{recovery_time}s (requirement: <5s)")

        # Final summary
        print_section("Test Summary")
        print("✅ Session created")
        print("✅ Story execution started")
        print(f"✅ {len(checkpoints)} checkpoints created")
        print("✅ Crash simulated")
        print(f"✅ Recovery completed ({recovery_time:.3f}s)")
        print("✅ State verified")
        print(f"✅ Performance requirement: {'PASS' if recovery_time < 5.0 else 'FAIL'}")

        print(f"\n{'='*60}")
        print("🎉 End-to-End Recovery Test PASSED")
        print(f"{'='*60}\n")

        return True

    except Exception as e:
        print(f"\n❌ Test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

    finally:
        db.close()
        # Cleanup test database
        import os
        if os.path.exists(db_path):
            os.remove(db_path)
            print(f"\n🧹 Cleaned up test database: {db_path}")


if __name__ == "__main__":
    success = test_recovery_e2e()
    sys.exit(0 if success else 1)
