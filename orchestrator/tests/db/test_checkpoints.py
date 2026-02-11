"""
Tests for CheckpointRepository
Story: WAVE-P1-001

Tests CRUD operations for WAVE checkpoint management.
"""

import pytest
import time
from uuid import uuid4

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from src.db.models import Base, WaveSession, WaveCheckpoint
from src.db.sessions import SessionRepository
from src.db.checkpoints import CheckpointRepository


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
    session.close()


@pytest.fixture
def wave_session(db_session):
    """Create a wave session for testing."""
    session_repo = SessionRepository(db_session)
    session = session_repo.create(project_name="test-project", wave_number=1)
    db_session.commit()
    return session


@pytest.fixture
def repo(db_session):
    """Create CheckpointRepository instance."""
    return CheckpointRepository(db_session)


class TestCheckpointRepositoryCreate:
    """Test checkpoint creation operations."""

    def test_create_checkpoint_minimal(self, repo, wave_session, db_session):
        """AC-01: Create checkpoint with required fields only."""
        checkpoint = repo.create(
            session_id=wave_session.id,
            checkpoint_type="story_start",
            checkpoint_name="Starting AUTH-001",
            state={"current_gate": "gate-0"},
        )

        assert checkpoint.id is not None
        assert checkpoint.session_id == wave_session.id
        assert checkpoint.checkpoint_type == "story_start"
        assert checkpoint.checkpoint_name == "Starting AUTH-001"
        assert checkpoint.state == {"current_gate": "gate-0"}
        assert checkpoint.story_id is None
        assert checkpoint.gate is None

    def test_create_gate_checkpoint(self, repo, wave_session, db_session):
        """AC-01: Create gate checkpoint with all fields."""
        checkpoint = repo.create(
            session_id=wave_session.id,
            checkpoint_type="gate",
            checkpoint_name="Gate 1 Passed",
            state={"ac_passed": 5, "ac_total": 5},
            story_id="AUTH-001",
            gate="gate-1",
            agent_id="dev-agent-1",
        )

        assert checkpoint.checkpoint_type == "gate"
        assert checkpoint.story_id == "AUTH-001"
        assert checkpoint.gate == "gate-1"
        assert checkpoint.agent_id == "dev-agent-1"

    def test_create_checkpoint_with_parent(self, repo, wave_session, db_session):
        """AC-01: Create checkpoint with parent reference."""
        parent = repo.create(
            session_id=wave_session.id,
            checkpoint_type="story_start",
            checkpoint_name="Start",
            state={},
        )
        db_session.commit()

        child = repo.create(
            session_id=wave_session.id,
            checkpoint_type="gate",
            checkpoint_name="Gate 1",
            state={},
            parent_checkpoint_id=parent.id,
        )

        assert child.parent_checkpoint_id == parent.id

    def test_create_invalid_checkpoint_type(self, repo, wave_session, db_session):
        """AC-06: Reject invalid checkpoint type."""
        with pytest.raises(ValueError, match="Invalid checkpoint_type"):
            repo.create(
                session_id=wave_session.id,
                checkpoint_type="invalid_type",
                checkpoint_name="Test",
                state={},
            )

    def test_create_invalid_gate(self, repo, wave_session, db_session):
        """AC-06: Reject invalid gate value."""
        with pytest.raises(ValueError, match="Invalid gate"):
            repo.create(
                session_id=wave_session.id,
                checkpoint_type="gate",
                checkpoint_name="Test",
                state={},
                gate="gate-9",  # Invalid gate number
            )


class TestCheckpointRepositoryRead:
    """Test checkpoint read operations."""

    def test_get_by_id_existing(self, repo, wave_session, db_session):
        """AC-02: Get checkpoint by ID."""
        created = repo.create(
            session_id=wave_session.id,
            checkpoint_type="story_start",
            checkpoint_name="Test",
            state={},
        )
        db_session.commit()

        retrieved = repo.get_by_id(created.id)

        assert retrieved is not None
        assert retrieved.id == created.id

    def test_get_by_id_nonexistent(self, repo, db_session):
        """AC-02: Return None for nonexistent ID."""
        result = repo.get_by_id(uuid4())
        assert result is None

    def test_get_latest_by_session(self, repo, wave_session, db_session):
        """AC-02: Get most recent checkpoint for session."""
        first = repo.create(
            session_id=wave_session.id,
            checkpoint_type="story_start",
            checkpoint_name="First",
            state={"order": 1},
        )
        db_session.flush()

        # Add delay to ensure different timestamps (SQLite has 1-second precision)
        time.sleep(1.01)

        latest = repo.create(
            session_id=wave_session.id,
            checkpoint_type="gate",
            checkpoint_name="Latest",
            state={"order": 2},
        )
        db_session.flush()
        db_session.commit()

        # Verify timestamps are different
        db_session.refresh(first)
        db_session.refresh(latest)
        assert latest.created_at > first.created_at, f"Timestamps not different: first={first.created_at}, latest={latest.created_at}"

        retrieved = repo.get_latest_by_session(wave_session.id)

        assert retrieved is not None
        assert retrieved.id == latest.id, f"Expected latest ID {latest.id}, got {retrieved.id}"
        assert retrieved.state["order"] == 2

    def test_list_by_session(self, repo, wave_session, db_session):
        """AC-02: List all checkpoints for session."""
        repo.create(
            session_id=wave_session.id,
            checkpoint_type="story_start",
            checkpoint_name="CP1",
            state={},
        )
        repo.create(
            session_id=wave_session.id,
            checkpoint_type="gate",
            checkpoint_name="CP2",
            state={},
        )
        db_session.commit()

        checkpoints = repo.list_by_session(wave_session.id)

        assert len(checkpoints) == 2

    def test_list_by_story(self, repo, wave_session, db_session):
        """AC-02: List checkpoints for specific story."""
        repo.create(
            session_id=wave_session.id,
            checkpoint_type="story_start",
            checkpoint_name="AUTH-001 Start",
            state={},
            story_id="AUTH-001",
        )
        repo.create(
            session_id=wave_session.id,
            checkpoint_type="story_start",
            checkpoint_name="AUTH-002 Start",
            state={},
            story_id="AUTH-002",
        )
        db_session.commit()

        checkpoints = repo.list_by_story(wave_session.id, "AUTH-001")

        assert len(checkpoints) == 1
        assert checkpoints[0].story_id == "AUTH-001"

    def test_list_by_type(self, repo, wave_session, db_session):
        """AC-02: List checkpoints by type."""
        repo.create(
            session_id=wave_session.id,
            checkpoint_type="gate",
            checkpoint_name="Gate CP",
            state={},
        )
        repo.create(
            session_id=wave_session.id,
            checkpoint_type="error",
            checkpoint_name="Error CP",
            state={},
        )
        db_session.commit()

        checkpoints = repo.list_by_type(wave_session.id, "gate")

        assert len(checkpoints) == 1
        assert checkpoints[0].checkpoint_type == "gate"

    def test_list_by_gate(self, repo, wave_session, db_session):
        """AC-02: List checkpoints for specific gate."""
        repo.create(
            session_id=wave_session.id,
            checkpoint_type="gate",
            checkpoint_name="Gate 1",
            state={},
            gate="gate-1",
        )
        repo.create(
            session_id=wave_session.id,
            checkpoint_type="gate",
            checkpoint_name="Gate 2",
            state={},
            gate="gate-2",
        )
        db_session.commit()

        checkpoints = repo.list_by_gate(wave_session.id, "gate-1")

        assert len(checkpoints) == 1
        assert checkpoints[0].gate == "gate-1"

    def test_get_gate_checkpoint(self, repo, wave_session, db_session):
        """AC-02: Get checkpoint for story at specific gate."""
        repo.create(
            session_id=wave_session.id,
            checkpoint_type="gate",
            checkpoint_name="AUTH-001 Gate 1",
            state={},
            story_id="AUTH-001",
            gate="gate-1",
        )
        db_session.commit()

        checkpoint = repo.get_gate_checkpoint(
            wave_session.id, "AUTH-001", "gate-1"
        )

        assert checkpoint is not None
        assert checkpoint.story_id == "AUTH-001"
        assert checkpoint.gate == "gate-1"

    def test_list_child_checkpoints(self, repo, wave_session, db_session):
        """AC-02: List child checkpoints of parent."""
        parent = repo.create(
            session_id=wave_session.id,
            checkpoint_type="story_start",
            checkpoint_name="Parent",
            state={},
        )
        db_session.commit()

        repo.create(
            session_id=wave_session.id,
            checkpoint_type="gate",
            checkpoint_name="Child 1",
            state={},
            parent_checkpoint_id=parent.id,
        )
        repo.create(
            session_id=wave_session.id,
            checkpoint_type="gate",
            checkpoint_name="Child 2",
            state={},
            parent_checkpoint_id=parent.id,
        )
        db_session.commit()

        children = repo.list_child_checkpoints(parent.id)

        assert len(children) == 2


class TestCheckpointRepositoryDelete:
    """Test checkpoint delete operations."""

    def test_delete_existing_checkpoint(self, repo, wave_session, db_session):
        """AC-03: Delete checkpoint by ID."""
        checkpoint = repo.create(
            session_id=wave_session.id,
            checkpoint_type="story_start",
            checkpoint_name="Test",
            state={},
        )
        db_session.commit()

        result = repo.delete(checkpoint.id)
        db_session.commit()

        assert result is True
        assert repo.get_by_id(checkpoint.id) is None

    def test_delete_nonexistent_checkpoint(self, repo, db_session):
        """AC-03: Return False for nonexistent checkpoint."""
        result = repo.delete(uuid4())
        assert result is False

    def test_delete_by_session(self, repo, wave_session, db_session):
        """AC-03: Delete all checkpoints for session."""
        repo.create(
            session_id=wave_session.id,
            checkpoint_type="story_start",
            checkpoint_name="CP1",
            state={},
        )
        repo.create(
            session_id=wave_session.id,
            checkpoint_type="gate",
            checkpoint_name="CP2",
            state={},
        )
        db_session.commit()

        count = repo.delete_by_session(wave_session.id)
        db_session.commit()

        assert count == 2
        assert len(repo.list_by_session(wave_session.id)) == 0


class TestCheckpointRepositoryCleanup:
    """Test checkpoint cleanup operations (AC-05)."""

    def test_cleanup_retains_recent_checkpoints(self, repo, wave_session, db_session):
        """AC-05: Cleanup retains only the most recent N checkpoints."""
        # Create 10 checkpoints with delays to ensure different timestamps
        # SQLite has 1-second timestamp precision, so we need >1s delays
        for i in range(10):
            repo.create(
                session_id=wave_session.id,
                checkpoint_type="gate",
                checkpoint_name=f"CP-{i+1}",
                state={"order": i+1},
            )
            db_session.flush()
            if i < 9:  # No need to sleep after last one
                time.sleep(1.01)  # >1s delay for SQLite timestamp precision

        db_session.commit()

        # Cleanup, keeping only 5 most recent
        deleted_count = repo.cleanup_old_checkpoints(wave_session.id, keep=5)
        db_session.commit()

        assert deleted_count == 5

        # Verify only 5 checkpoints remain
        remaining = repo.list_by_session(wave_session.id)
        assert len(remaining) == 5

        # Verify the 5 most recent are kept (CP-6 through CP-10)
        remaining_orders = sorted([cp.state["order"] for cp in remaining])
        assert remaining_orders == [6, 7, 8, 9, 10]

    def test_cleanup_with_fewer_than_keep(self, repo, wave_session, db_session):
        """AC-05: Cleanup does nothing when fewer checkpoints than keep limit."""
        # Create only 3 checkpoints
        for i in range(3):
            repo.create(
                session_id=wave_session.id,
                checkpoint_type="gate",
                checkpoint_name=f"CP-{i+1}",
                state={},
            )
        db_session.commit()

        # Try to cleanup keeping 5
        deleted_count = repo.cleanup_old_checkpoints(wave_session.id, keep=5)
        db_session.commit()

        assert deleted_count == 0
        assert len(repo.list_by_session(wave_session.id)) == 3

    def test_cleanup_custom_keep_count(self, repo, wave_session, db_session):
        """AC-05: Cleanup supports custom retention count."""
        # Create 8 checkpoints with delays to ensure different timestamps
        for i in range(8):
            repo.create(
                session_id=wave_session.id,
                checkpoint_type="gate",
                checkpoint_name=f"CP-{i+1}",
                state={"order": i+1},
            )
            db_session.flush()
            if i < 7:
                time.sleep(1.01)  # >1s delay for SQLite timestamp precision

        db_session.commit()

        # Keep only 3 most recent
        deleted_count = repo.cleanup_old_checkpoints(wave_session.id, keep=3)
        db_session.commit()

        assert deleted_count == 5

        remaining = repo.list_by_session(wave_session.id)
        assert len(remaining) == 3

        remaining_orders = sorted([cp.state["order"] for cp in remaining])
        assert remaining_orders == [6, 7, 8]

    def test_cleanup_empty_session(self, repo, wave_session, db_session):
        """AC-05: Cleanup handles session with no checkpoints."""
        deleted_count = repo.cleanup_old_checkpoints(wave_session.id, keep=5)
        assert deleted_count == 0


class TestCheckpointRepositoryConstraints:
    """Test database constraints and validation."""

    def test_valid_checkpoint_types(self, repo, wave_session, db_session):
        """AC-05: All valid checkpoint types accepted."""
        valid_types = [
            "gate",
            "story_start",
            "story_complete",
            "agent_handoff",
            "error",
            "manual",
        ]

        for checkpoint_type in valid_types:
            checkpoint = repo.create(
                session_id=wave_session.id,
                checkpoint_type=checkpoint_type,
                checkpoint_name=f"Test {checkpoint_type}",
                state={},
            )
            assert checkpoint.checkpoint_type == checkpoint_type

    def test_valid_gates(self, repo, wave_session, db_session):
        """AC-05: All valid gates accepted."""
        valid_gates = [
            "gate-0",
            "gate-1",
            "gate-2",
            "gate-3",
            "gate-4",
            "gate-5",
            "gate-6",
            "gate-7",
        ]

        for gate in valid_gates:
            checkpoint = repo.create(
                session_id=wave_session.id,
                checkpoint_type="gate",
                checkpoint_name=f"Test {gate}",
                state={},
                gate=gate,
            )
            assert checkpoint.gate == gate
