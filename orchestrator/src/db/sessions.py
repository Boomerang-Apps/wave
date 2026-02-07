"""
WAVE Session Repository
Story: WAVE-P1-001

Repository pattern for WaveSession CRUD operations.
"""

from datetime import datetime
from decimal import Decimal
from typing import List, Optional, Dict, Any
from uuid import UUID

from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, desc

from .models import WaveSession


class SessionRepository:
    """
    Repository for managing WAVE session state.

    Provides high-level operations for creating, reading, updating,
    and querying wave execution sessions.
    """

    def __init__(self, db: Session):
        """
        Initialize repository with database session.

        Args:
            db: SQLAlchemy session instance
        """
        self.db = db

    def create(
        self,
        project_name: str,
        wave_number: int,
        budget_usd: Optional[Decimal] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> WaveSession:
        """
        Create a new wave session.

        Args:
            project_name: Name of the project
            wave_number: Wave number (0-based)
            budget_usd: Budget in USD (defaults to 2.00)
            metadata: Optional metadata dictionary

        Returns:
            Created WaveSession instance
        """
        session = WaveSession(
            project_name=project_name,
            wave_number=wave_number,
            status="pending",
            budget_usd=budget_usd or Decimal("2.00"),
            meta_data=metadata or {},
        )
        self.db.add(session)
        self.db.flush()  # Populate ID without committing
        return session

    def get_by_id(self, session_id: UUID) -> Optional[WaveSession]:
        """
        Get session by ID.

        Args:
            session_id: UUID of the session

        Returns:
            WaveSession instance or None if not found
        """
        return self.db.query(WaveSession).filter(WaveSession.id == session_id).first()

    def get_active_session(self, project_name: str) -> Optional[WaveSession]:
        """
        Get currently active session for a project.

        Args:
            project_name: Name of the project

        Returns:
            Active WaveSession or None (prioritizes in_progress over pending)
        """
        # Try to get an in_progress session first
        in_progress = (
            self.db.query(WaveSession)
            .filter(
                and_(
                    WaveSession.project_name == project_name,
                    WaveSession.status == "in_progress",
                )
            )
            .order_by(desc(WaveSession.started_at))
            .first()
        )

        if in_progress:
            return in_progress

        # If no in_progress, get the most recent pending session
        return (
            self.db.query(WaveSession)
            .filter(
                and_(
                    WaveSession.project_name == project_name,
                    WaveSession.status == "pending",
                )
            )
            .order_by(desc(WaveSession.started_at))
            .first()
        )

    def get_by_project_and_wave(
        self, project_name: str, wave_number: int
    ) -> Optional[WaveSession]:
        """
        Get session by project name and wave number.

        Args:
            project_name: Name of the project
            wave_number: Wave number

        Returns:
            WaveSession instance or None if not found
        """
        return (
            self.db.query(WaveSession)
            .filter(
                and_(
                    WaveSession.project_name == project_name,
                    WaveSession.wave_number == wave_number,
                )
            )
            .first()
        )

    def list_by_project(
        self, project_name: str, limit: int = 50
    ) -> List[WaveSession]:
        """
        List all sessions for a project.

        Args:
            project_name: Name of the project
            limit: Maximum number of results

        Returns:
            List of WaveSession instances
        """
        return (
            self.db.query(WaveSession)
            .filter(WaveSession.project_name == project_name)
            .order_by(desc(WaveSession.started_at))
            .limit(limit)
            .all()
        )

    def list_active(self, limit: int = 50) -> List[WaveSession]:
        """
        List all active sessions across all projects.

        Args:
            limit: Maximum number of results

        Returns:
            List of active WaveSession instances
        """
        return (
            self.db.query(WaveSession)
            .filter(WaveSession.status.in_(["pending", "in_progress"]))
            .order_by(desc(WaveSession.started_at))
            .limit(limit)
            .all()
        )

    def start_session(self, session_id: UUID) -> WaveSession:
        """
        Mark session as started.

        Args:
            session_id: UUID of the session

        Returns:
            Updated WaveSession instance

        Raises:
            ValueError: If session not found
        """
        session = self.get_by_id(session_id)
        if not session:
            raise ValueError(f"Session {session_id} not found")

        session.status = "in_progress"
        session.started_at = datetime.utcnow()
        self.db.flush()
        return session

    def complete_session(
        self, session_id: UUID, actual_cost_usd: Optional[Decimal] = None
    ) -> WaveSession:
        """
        Mark session as completed.

        Args:
            session_id: UUID of the session
            actual_cost_usd: Actual cost in USD

        Returns:
            Updated WaveSession instance

        Raises:
            ValueError: If session not found
        """
        session = self.get_by_id(session_id)
        if not session:
            raise ValueError(f"Session {session_id} not found")

        session.status = "completed"
        session.completed_at = datetime.utcnow()
        if actual_cost_usd is not None:
            session.actual_cost_usd = actual_cost_usd
        self.db.flush()
        return session

    def fail_session(
        self, session_id: UUID, error_message: Optional[str] = None
    ) -> WaveSession:
        """
        Mark session as failed.

        Args:
            session_id: UUID of the session
            error_message: Optional error message to store in metadata

        Returns:
            Updated WaveSession instance

        Raises:
            ValueError: If session not found
        """
        session = self.get_by_id(session_id)
        if not session:
            raise ValueError(f"Session {session_id} not found")

        session.status = "failed"
        session.failed_at = datetime.utcnow()
        if error_message:
            session.meta_data = session.meta_data or {}
            session.meta_data["error_message"] = error_message
        self.db.flush()
        return session

    def update_progress(
        self,
        session_id: UUID,
        story_count: Optional[int] = None,
        stories_completed: Optional[int] = None,
        stories_failed: Optional[int] = None,
        actual_cost_usd: Optional[Decimal] = None,
        token_count: Optional[int] = None,
    ) -> WaveSession:
        """
        Update session progress metrics.

        Args:
            session_id: UUID of the session
            story_count: Total number of stories
            stories_completed: Number of completed stories
            stories_failed: Number of failed stories
            actual_cost_usd: Accumulated cost in USD
            token_count: Total token count

        Returns:
            Updated WaveSession instance

        Raises:
            ValueError: If session not found
        """
        session = self.get_by_id(session_id)
        if not session:
            raise ValueError(f"Session {session_id} not found")

        if story_count is not None:
            session.story_count = story_count
        if stories_completed is not None:
            session.stories_completed = stories_completed
        if stories_failed is not None:
            session.stories_failed = stories_failed
        if actual_cost_usd is not None:
            session.actual_cost_usd = actual_cost_usd
        if token_count is not None:
            session.token_count = token_count

        self.db.flush()
        return session

    def update_metadata(
        self, session_id: UUID, metadata: Dict[str, Any]
    ) -> WaveSession:
        """
        Update session metadata.

        Args:
            session_id: UUID of the session
            metadata: Metadata dictionary to merge

        Returns:
            Updated WaveSession instance

        Raises:
            ValueError: If session not found
        """
        session = self.get_by_id(session_id)
        if not session:
            raise ValueError(f"Session {session_id} not found")

        session.meta_data = {**(session.meta_data or {}), **metadata}
        self.db.flush()
        return session

    def delete(self, session_id: UUID) -> bool:
        """
        Delete a session by ID.

        Args:
            session_id: UUID of the session

        Returns:
            True if deleted, False if not found

        Note:
            This will cascade delete all checkpoints and story executions.
        """
        session = self.get_by_id(session_id)
        if not session:
            return False

        self.db.delete(session)
        self.db.flush()
        return True
