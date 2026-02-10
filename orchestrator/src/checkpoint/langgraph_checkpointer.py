"""
LangGraph Checkpointer Integration
Story: WAVE-P1-003

Custom checkpointer that bridges LangGraph state persistence
with WAVE CheckpointRepository (PostgreSQL).
"""

from typing import Optional, Dict, Any, Iterator, Tuple
from uuid import UUID
from datetime import datetime

from langgraph.checkpoint.base import BaseCheckpointSaver, Checkpoint
from sqlalchemy.orm import Session

from ..db import CheckpointRepository, SessionRepository


class WAVECheckpointSaver(BaseCheckpointSaver):
    """
    Custom LangGraph checkpointer using WAVE CheckpointRepository.

    Integrates LangGraph's state persistence with PostgreSQL-backed
    checkpoint system for crash recovery and session resumption.
    """

    def __init__(
        self,
        db: Session,
        session_id: UUID,
        story_id: Optional[str] = None
    ):
        """
        Initialize WAVE checkpointer.

        Args:
            db: SQLAlchemy database session
            session_id: WAVE session ID
            story_id: Optional story ID for checkpoint filtering
        """
        super().__init__()
        self.db = db
        self.session_id = session_id
        self.story_id = story_id
        self.checkpoint_repo = CheckpointRepository(db)
        self.session_repo = SessionRepository(db)

    def put(
        self,
        config: Dict[str, Any],
        checkpoint: Checkpoint,
        metadata: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Save a checkpoint.

        Args:
            config: LangGraph configuration
            checkpoint: Checkpoint data from LangGraph
            metadata: Additional metadata

        Returns:
            Updated configuration with checkpoint reference
        """
        # Extract checkpoint information
        thread_id = config.get("configurable", {}).get("thread_id", str(self.session_id))
        checkpoint_ns = config.get("configurable", {}).get("checkpoint_ns", "")

        # Determine checkpoint type from metadata
        checkpoint_type = metadata.get("checkpoint_type", "manual")
        gate = metadata.get("gate")
        story_id = metadata.get("story_id", self.story_id)

        # Create checkpoint name
        checkpoint_name = metadata.get(
            "checkpoint_name",
            f"LangGraph checkpoint {datetime.utcnow().isoformat()}"
        )

        # Prepare state data
        state_data = {
            "checkpoint": checkpoint,
            "config": config,
            "metadata": metadata,
            "thread_id": thread_id,
            "checkpoint_ns": checkpoint_ns,
            "parent_checkpoint_id": checkpoint.get("id"),
            "created_at": datetime.utcnow().isoformat(),
        }

        # Save to checkpoint repository
        wave_checkpoint = self.checkpoint_repo.create(
            session_id=self.session_id,
            checkpoint_type=checkpoint_type,
            checkpoint_name=checkpoint_name,
            state=state_data,
            story_id=story_id,
            gate=gate,
        )

        self.db.commit()

        # Return config with checkpoint reference
        updated_config = config.copy()
        updated_config["configurable"] = {
            **config.get("configurable", {}),
            "checkpoint_id": str(wave_checkpoint.id),
            "thread_id": thread_id,
        }

        return updated_config

    def get(
        self,
        config: Dict[str, Any]
    ) -> Optional[Checkpoint]:
        """
        Retrieve a checkpoint.

        Args:
            config: LangGraph configuration

        Returns:
            Checkpoint data or None if not found
        """
        checkpoint_id = config.get("configurable", {}).get("checkpoint_id")

        if checkpoint_id:
            # Get specific checkpoint by ID
            wave_checkpoint = self.checkpoint_repo.get_by_id(UUID(checkpoint_id))
        else:
            # Get latest checkpoint for session
            wave_checkpoint = self.checkpoint_repo.get_latest_by_session(
                self.session_id
            )

        if not wave_checkpoint:
            return None

        # Extract LangGraph checkpoint from state
        state_data = wave_checkpoint.state
        return state_data.get("checkpoint")

    def list(
        self,
        config: Dict[str, Any],
        limit: int = 10
    ) -> Iterator[Tuple[Dict[str, Any], Checkpoint]]:
        """
        List checkpoints.

        Args:
            config: LangGraph configuration
            limit: Maximum number of checkpoints to return

        Yields:
            Tuples of (config, checkpoint)
        """
        # Get checkpoints from repository
        if self.story_id:
            wave_checkpoints = self.checkpoint_repo.list_by_story(
                self.session_id,
                self.story_id,
                limit=limit
            )
        else:
            wave_checkpoints = self.checkpoint_repo.list_by_session(
                self.session_id,
                limit=limit
            )

        # Yield as (config, checkpoint) tuples
        for wave_checkpoint in wave_checkpoints:
            state_data = wave_checkpoint.state
            checkpoint_config = state_data.get("config", {})
            checkpoint_data = state_data.get("checkpoint", {})

            # Add checkpoint ID to config
            checkpoint_config["configurable"] = {
                **checkpoint_config.get("configurable", {}),
                "checkpoint_id": str(wave_checkpoint.id),
            }

            yield (checkpoint_config, checkpoint_data)

    def get_tuple(
        self,
        config: Dict[str, Any]
    ) -> Optional[Tuple[Dict[str, Any], Checkpoint, Dict[str, Any]]]:
        """
        Get checkpoint as tuple.

        Args:
            config: LangGraph configuration

        Returns:
            Tuple of (config, checkpoint, metadata) or None
        """
        checkpoint_id = config.get("configurable", {}).get("checkpoint_id")

        if checkpoint_id:
            wave_checkpoint = self.checkpoint_repo.get_by_id(UUID(checkpoint_id))
        else:
            wave_checkpoint = self.checkpoint_repo.get_latest_by_session(
                self.session_id
            )

        if not wave_checkpoint:
            return None

        state_data = wave_checkpoint.state
        checkpoint_config = state_data.get("config", {})
        checkpoint_data = state_data.get("checkpoint", {})
        metadata = state_data.get("metadata", {})

        # Add checkpoint ID to config
        checkpoint_config["configurable"] = {
            **checkpoint_config.get("configurable", {}),
            "checkpoint_id": str(wave_checkpoint.id),
        }

        return (checkpoint_config, checkpoint_data, metadata)
