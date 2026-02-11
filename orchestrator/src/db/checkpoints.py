"""
WAVE Checkpoint Repository
Story: WAVE-P1-001

Repository pattern for WaveCheckpoint CRUD operations.
"""

from datetime import datetime
from typing import List, Optional, Dict, Any
from uuid import UUID

from sqlalchemy.orm import Session
from sqlalchemy import and_, desc

from .models import WaveCheckpoint


class CheckpointRepository:
    """
    Repository for managing WAVE checkpoints.

    Provides operations for creating and querying state checkpoints
    for crash recovery and session resumption.
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
        session_id: UUID,
        checkpoint_type: str,
        checkpoint_name: str,
        state: Dict[str, Any],
        story_id: Optional[str] = None,
        gate: Optional[str] = None,
        agent_id: Optional[str] = None,
        parent_checkpoint_id: Optional[UUID] = None,
    ) -> WaveCheckpoint:
        """
        Create a new checkpoint.

        Args:
            session_id: UUID of the wave session
            checkpoint_type: Type of checkpoint (gate, story_start, etc.)
            checkpoint_name: Human-readable name
            state: State data as dictionary
            story_id: Optional story ID
            gate: Optional gate name (gate-0 through gate-7)
            agent_id: Optional agent ID
            parent_checkpoint_id: Optional parent checkpoint UUID

        Returns:
            Created WaveCheckpoint instance

        Raises:
            ValueError: If checkpoint_type or gate is invalid
        """
        valid_types = [
            "gate",
            "story_start",
            "story_complete",
            "agent_handoff",
            "error",
            "manual",
        ]
        if checkpoint_type not in valid_types:
            raise ValueError(
                f"Invalid checkpoint_type '{checkpoint_type}'. Must be one of: {valid_types}"
            )

        if gate is not None:
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
            if gate not in valid_gates:
                raise ValueError(
                    f"Invalid gate '{gate}'. Must be one of: {valid_gates}"
                )

        checkpoint = WaveCheckpoint(
            session_id=session_id,
            checkpoint_type=checkpoint_type,
            checkpoint_name=checkpoint_name,
            state=state,
            story_id=story_id,
            gate=gate,
            agent_id=agent_id,
            parent_checkpoint_id=parent_checkpoint_id,
        )
        self.db.add(checkpoint)
        self.db.flush()
        return checkpoint

    def get_by_id(self, checkpoint_id: UUID) -> Optional[WaveCheckpoint]:
        """
        Get checkpoint by ID.

        Args:
            checkpoint_id: UUID of the checkpoint

        Returns:
            WaveCheckpoint instance or None if not found
        """
        return (
            self.db.query(WaveCheckpoint)
            .filter(WaveCheckpoint.id == checkpoint_id)
            .first()
        )

    def get_latest_by_session(
        self, session_id: UUID
    ) -> Optional[WaveCheckpoint]:
        """
        Get most recent checkpoint for a session.

        Args:
            session_id: UUID of the wave session

        Returns:
            Latest WaveCheckpoint or None
        """
        return (
            self.db.query(WaveCheckpoint)
            .filter(WaveCheckpoint.session_id == session_id)
            .order_by(desc(WaveCheckpoint.created_at), desc(WaveCheckpoint.id))
            .first()
        )

    def list_by_session(
        self, session_id: UUID, limit: int = 100
    ) -> List[WaveCheckpoint]:
        """
        List all checkpoints for a session.

        Args:
            session_id: UUID of the wave session
            limit: Maximum number of results

        Returns:
            List of WaveCheckpoint instances ordered by creation time
        """
        return (
            self.db.query(WaveCheckpoint)
            .filter(WaveCheckpoint.session_id == session_id)
            .order_by(desc(WaveCheckpoint.created_at))
            .limit(limit)
            .all()
        )

    def list_by_story(
        self, session_id: UUID, story_id: str, limit: int = 50
    ) -> List[WaveCheckpoint]:
        """
        List checkpoints for a specific story within a session.

        Args:
            session_id: UUID of the wave session
            story_id: Story ID
            limit: Maximum number of results

        Returns:
            List of WaveCheckpoint instances
        """
        return (
            self.db.query(WaveCheckpoint)
            .filter(
                and_(
                    WaveCheckpoint.session_id == session_id,
                    WaveCheckpoint.story_id == story_id,
                )
            )
            .order_by(desc(WaveCheckpoint.created_at))
            .limit(limit)
            .all()
        )

    def list_by_type(
        self, session_id: UUID, checkpoint_type: str, limit: int = 50
    ) -> List[WaveCheckpoint]:
        """
        List checkpoints of a specific type within a session.

        Args:
            session_id: UUID of the wave session
            checkpoint_type: Type of checkpoint to filter
            limit: Maximum number of results

        Returns:
            List of WaveCheckpoint instances
        """
        return (
            self.db.query(WaveCheckpoint)
            .filter(
                and_(
                    WaveCheckpoint.session_id == session_id,
                    WaveCheckpoint.checkpoint_type == checkpoint_type,
                )
            )
            .order_by(desc(WaveCheckpoint.created_at))
            .limit(limit)
            .all()
        )

    def list_by_gate(
        self, session_id: UUID, gate: str, limit: int = 50
    ) -> List[WaveCheckpoint]:
        """
        List checkpoints for a specific gate within a session.

        Args:
            session_id: UUID of the wave session
            gate: Gate name (gate-0 through gate-7)
            limit: Maximum number of results

        Returns:
            List of WaveCheckpoint instances
        """
        return (
            self.db.query(WaveCheckpoint)
            .filter(
                and_(
                    WaveCheckpoint.session_id == session_id,
                    WaveCheckpoint.gate == gate,
                )
            )
            .order_by(desc(WaveCheckpoint.created_at))
            .limit(limit)
            .all()
        )

    def get_gate_checkpoint(
        self, session_id: UUID, story_id: str, gate: str
    ) -> Optional[WaveCheckpoint]:
        """
        Get checkpoint for a specific story at a specific gate.

        Args:
            session_id: UUID of the wave session
            story_id: Story ID
            gate: Gate name (gate-0 through gate-7)

        Returns:
            WaveCheckpoint instance or None if not found
        """
        return (
            self.db.query(WaveCheckpoint)
            .filter(
                and_(
                    WaveCheckpoint.session_id == session_id,
                    WaveCheckpoint.story_id == story_id,
                    WaveCheckpoint.gate == gate,
                    WaveCheckpoint.checkpoint_type == "gate",
                )
            )
            .order_by(desc(WaveCheckpoint.created_at))
            .first()
        )

    def list_child_checkpoints(
        self, parent_checkpoint_id: UUID
    ) -> List[WaveCheckpoint]:
        """
        List all child checkpoints of a parent checkpoint.

        Args:
            parent_checkpoint_id: UUID of the parent checkpoint

        Returns:
            List of child WaveCheckpoint instances
        """
        return (
            self.db.query(WaveCheckpoint)
            .filter(WaveCheckpoint.parent_checkpoint_id == parent_checkpoint_id)
            .order_by(desc(WaveCheckpoint.created_at))
            .all()
        )

    def delete(self, checkpoint_id: UUID) -> bool:
        """
        Delete a checkpoint by ID.

        Args:
            checkpoint_id: UUID of the checkpoint

        Returns:
            True if deleted, False if not found

        Note:
            This will also delete all child checkpoints.
        """
        checkpoint = self.get_by_id(checkpoint_id)
        if not checkpoint:
            return False

        self.db.delete(checkpoint)
        self.db.flush()
        return True

    def delete_by_session(self, session_id: UUID) -> int:
        """
        Delete all checkpoints for a session.

        Args:
            session_id: UUID of the wave session

        Returns:
            Number of checkpoints deleted
        """
        count = (
            self.db.query(WaveCheckpoint)
            .filter(WaveCheckpoint.session_id == session_id)
            .delete()
        )
        self.db.flush()
        return count

    def cleanup_old_checkpoints(self, session_id: UUID, keep: int = 5) -> int:
        """
        Delete old checkpoints, retaining only the most recent N.

        Args:
            session_id: UUID of the wave session
            keep: Number of most recent checkpoints to retain (default: 5)

        Returns:
            Number of checkpoints deleted

        Note:
            Checkpoints are ordered by created_at descending. The most recent
            'keep' checkpoints are retained, and all older ones are deleted.
            This helps manage disk space for long-running sessions.
        """
        # Get all checkpoints for session ordered by created_at descending
        all_checkpoints = (
            self.db.query(WaveCheckpoint)
            .filter(WaveCheckpoint.session_id == session_id)
            .order_by(desc(WaveCheckpoint.created_at))
            .all()
        )

        # If we have fewer checkpoints than keep limit, nothing to delete
        if len(all_checkpoints) <= keep:
            return 0

        # Get IDs of checkpoints to delete (all except the most recent 'keep')
        checkpoints_to_delete = all_checkpoints[keep:]
        delete_ids = [cp.id for cp in checkpoints_to_delete]

        # Delete old checkpoints
        count = (
            self.db.query(WaveCheckpoint)
            .filter(WaveCheckpoint.id.in_(delete_ids))
            .delete(synchronize_session=False)
        )
        self.db.flush()
        return count
