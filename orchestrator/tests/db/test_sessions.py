"""
Tests for SessionRepository
Story: WAVE-P1-001

Tests CRUD operations for WAVE session management.
"""

import pytest
from decimal import Decimal
from datetime import datetime
from uuid import uuid4

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.exc import IntegrityError

from src.db.models import Base, WaveSession
from src.db.sessions import SessionRepository


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
def repo(db_session):
    """Create SessionRepository instance."""
    return SessionRepository(db_session)


class TestSessionRepositoryCreate:
    """Test session creation operations."""

    def test_create_session_with_defaults(self, repo, db_session):
        """AC-01: Create session with default values."""
        session = repo.create(
            project_name="test-project",
            wave_number=1,
        )

        assert session.id is not None
        assert session.project_name == "test-project"
        assert session.wave_number == 1
        assert session.status == "pending"
        assert session.budget_usd == Decimal("2.00")
        assert session.actual_cost_usd == Decimal("0.00")
        assert session.token_count == 0
        assert session.story_count == 0
        assert session.stories_completed == 0
        assert session.stories_failed == 0
        assert session.meta_data == {}

    def test_create_session_with_custom_budget(self, repo, db_session):
        """AC-01: Create session with custom budget."""
        session = repo.create(
            project_name="test-project",
            wave_number=1,
            budget_usd=Decimal("5.00"),
        )

        assert session.budget_usd == Decimal("5.00")

    def test_create_session_with_metadata(self, repo, db_session):
        """AC-01: Create session with metadata."""
        metadata = {"env": "test", "user": "dev"}
        session = repo.create(
            project_name="test-project",
            wave_number=1,
            metadata=metadata,
        )

        assert session.meta_data == metadata


class TestSessionRepositoryRead:
    """Test session read operations."""

    def test_get_by_id_existing(self, repo, db_session):
        """AC-02: Get session by ID."""
        created = repo.create(project_name="test-project", wave_number=1)
        db_session.commit()

        retrieved = repo.get_by_id(created.id)

        assert retrieved is not None
        assert retrieved.id == created.id
        assert retrieved.project_name == "test-project"

    def test_get_by_id_nonexistent(self, repo, db_session):
        """AC-02: Return None for nonexistent ID."""
        result = repo.get_by_id(uuid4())
        assert result is None

    def test_get_by_project_and_wave(self, repo, db_session):
        """AC-02: Get session by project name and wave number."""
        created = repo.create(project_name="test-project", wave_number=1)
        db_session.commit()

        retrieved = repo.get_by_project_and_wave("test-project", 1)

        assert retrieved is not None
        assert retrieved.id == created.id

    def test_get_active_session(self, repo, db_session):
        """AC-02: Get active session for project."""
        # Create multiple sessions
        repo.create(project_name="test-project", wave_number=1)
        active = repo.create(project_name="test-project", wave_number=2)
        active.status = "in_progress"
        db_session.commit()

        retrieved = repo.get_active_session("test-project")

        assert retrieved is not None
        assert retrieved.id == active.id
        assert retrieved.status == "in_progress"

    def test_list_by_project(self, repo, db_session):
        """AC-02: List all sessions for a project."""
        repo.create(project_name="project-a", wave_number=1)
        repo.create(project_name="project-a", wave_number=2)
        repo.create(project_name="project-b", wave_number=1)
        db_session.commit()

        sessions = repo.list_by_project("project-a")

        assert len(sessions) == 2
        assert all(s.project_name == "project-a" for s in sessions)

    def test_list_active(self, repo, db_session):
        """AC-02: List all active sessions."""
        session1 = repo.create(project_name="project-a", wave_number=1)
        session1.status = "in_progress"
        session2 = repo.create(project_name="project-b", wave_number=1)
        session2.status = "pending"
        session3 = repo.create(project_name="project-c", wave_number=1)
        session3.status = "completed"
        db_session.commit()

        active_sessions = repo.list_active()

        assert len(active_sessions) == 2
        assert all(
            s.status in ["pending", "in_progress"] for s in active_sessions
        )


class TestSessionRepositoryUpdate:
    """Test session update operations."""

    def test_start_session(self, repo, db_session):
        """AC-03: Mark session as started."""
        session = repo.create(project_name="test-project", wave_number=1)
        db_session.commit()

        updated = repo.start_session(session.id)

        assert updated.status == "in_progress"
        assert updated.started_at is not None

    def test_start_session_not_found(self, repo, db_session):
        """AC-03: Raise error if session not found."""
        with pytest.raises(ValueError, match="not found"):
            repo.start_session(uuid4())

    def test_complete_session(self, repo, db_session):
        """AC-03: Mark session as completed."""
        session = repo.create(project_name="test-project", wave_number=1)
        db_session.commit()

        updated = repo.complete_session(
            session.id, actual_cost_usd=Decimal("1.50")
        )

        assert updated.status == "completed"
        assert updated.completed_at is not None
        assert updated.actual_cost_usd == Decimal("1.50")

    def test_fail_session(self, repo, db_session):
        """AC-03: Mark session as failed."""
        session = repo.create(project_name="test-project", wave_number=1)
        db_session.commit()

        updated = repo.fail_session(session.id, error_message="Test error")

        assert updated.status == "failed"
        assert updated.failed_at is not None
        assert updated.meta_data.get("error_message") == "Test error"

    def test_update_progress(self, repo, db_session):
        """AC-03: Update session progress metrics."""
        session = repo.create(project_name="test-project", wave_number=1)
        db_session.commit()

        updated = repo.update_progress(
            session.id,
            story_count=10,
            stories_completed=5,
            stories_failed=1,
            actual_cost_usd=Decimal("0.75"),
            token_count=5000,
        )

        assert updated.story_count == 10
        assert updated.stories_completed == 5
        assert updated.stories_failed == 1
        assert updated.actual_cost_usd == Decimal("0.75")
        assert updated.token_count == 5000

    def test_update_metadata(self, repo, db_session):
        """AC-03: Update session metadata."""
        session = repo.create(
            project_name="test-project",
            wave_number=1,
            metadata={"key1": "value1"},
        )
        db_session.commit()

        updated = repo.update_metadata(
            session.id, metadata={"key2": "value2"}
        )

        assert updated.meta_data == {"key1": "value1", "key2": "value2"}


class TestSessionRepositoryDelete:
    """Test session delete operations."""

    def test_delete_existing_session(self, repo, db_session):
        """AC-04: Delete session by ID."""
        session = repo.create(project_name="test-project", wave_number=1)
        db_session.commit()

        result = repo.delete(session.id)
        db_session.commit()

        assert result is True
        assert repo.get_by_id(session.id) is None

    def test_delete_nonexistent_session(self, repo, db_session):
        """AC-04: Return False for nonexistent session."""
        result = repo.delete(uuid4())
        assert result is False


class TestSessionRepositoryConstraints:
    """Test database constraints and validation."""

    def test_wave_number_constraint(self, repo, db_session):
        """AC-05: Validate wave_number >= 0."""
        with pytest.raises(IntegrityError):
            session = repo.create(project_name="test-project", wave_number=-1)
            db_session.commit()

    def test_budget_constraint(self, repo, db_session):
        """AC-05: Validate budget_usd >= 0."""
        with pytest.raises(IntegrityError):
            session = repo.create(
                project_name="test-project",
                wave_number=1,
                budget_usd=Decimal("-1.00"),
            )
            db_session.commit()

    def test_status_values(self, repo, db_session):
        """AC-05: Validate status enum values."""
        with pytest.raises(IntegrityError):
            session = repo.create(project_name="test-project", wave_number=1)
            session.status = "invalid_status"
            db_session.commit()
