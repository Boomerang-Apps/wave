"""
WAVE Recovery Manager
Story: WAVE-P1-003

Manages recovery and resume operations for interrupted workflows.
"""

import logging
from enum import Enum
from typing import Optional, Dict, Any, List
from uuid import UUID
from datetime import datetime
from dataclasses import dataclass
import time

from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import flag_modified

from ..db import (
    SessionRepository,
    CheckpointRepository,
    StoryExecutionRepository,
    WaveCheckpoint,
    WaveStoryExecution,
)
from ..execution import StoryExecutionEngine, ExecutionContext

# Configure logging
logger = logging.getLogger(__name__)
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)


class RecoveryStrategy(str, Enum):
    """Recovery strategy options."""
    RESUME_FROM_LAST = "resume_from_last"  # Resume from last checkpoint
    RESUME_FROM_GATE = "resume_from_gate"  # Resume from specific gate
    RESTART = "restart"  # Restart from beginning
    SKIP = "skip"  # Skip failed story


@dataclass
class RecoveryPoint:
    """Recovery point information."""
    checkpoint_id: UUID
    checkpoint_type: str
    checkpoint_name: str
    story_id: str
    gate: Optional[str]
    state: Dict[str, Any]
    created_at: datetime
    can_resume: bool
    resume_reason: str


class RecoveryManager:
    """
    Manages workflow recovery and resumption.

    Provides mechanisms to recover from crashes, interruptions, and errors
    by restoring state from checkpoints.
    """

    def __init__(self, db: Session):
        """
        Initialize recovery manager.

        Args:
            db: SQLAlchemy session
        """
        self.db = db
        self.session_repo = SessionRepository(db)
        self.checkpoint_repo = CheckpointRepository(db)
        self.execution_repo = StoryExecutionRepository(db)
        self.engine = StoryExecutionEngine(db)

    def find_recovery_points(
        self,
        session_id: UUID,
        story_id: Optional[str] = None
    ) -> List[RecoveryPoint]:
        """
        Find all available recovery points.

        Args:
            session_id: Wave session ID
            story_id: Optional story ID to filter

        Returns:
            List of RecoveryPoint objects
        """
        if story_id:
            checkpoints = self.checkpoint_repo.list_by_story(
                session_id,
                story_id
            )
        else:
            checkpoints = self.checkpoint_repo.list_by_session(session_id)

        recovery_points = []
        for cp in checkpoints:
            recovery_point = self._checkpoint_to_recovery_point(cp)
            recovery_points.append(recovery_point)

        return recovery_points

    def get_last_recovery_point(
        self,
        session_id: UUID,
        story_id: str
    ) -> Optional[RecoveryPoint]:
        """
        Get the most recent recovery point for a story.

        Args:
            session_id: Wave session ID
            story_id: Story ID

        Returns:
            RecoveryPoint or None if no checkpoints exist
        """
        checkpoint = self.checkpoint_repo.get_latest_by_session(session_id)

        if not checkpoint or checkpoint.story_id != story_id:
            # Get latest checkpoint for this specific story
            checkpoints = self.checkpoint_repo.list_by_story(
                session_id,
                story_id,
                limit=1
            )
            checkpoint = checkpoints[0] if checkpoints else None

        if not checkpoint:
            return None

        return self._checkpoint_to_recovery_point(checkpoint)

    def can_recover(
        self,
        session_id: UUID,
        story_id: str
    ) -> bool:
        """
        Check if a story can be recovered.

        Args:
            session_id: Wave session ID
            story_id: Story ID

        Returns:
            True if recovery is possible
        """
        # Check if execution exists
        execution = self.execution_repo.get_by_story_id(session_id, story_id)
        if not execution:
            return False

        # Can recover if not in terminal state
        terminal_states = ["complete", "cancelled"]
        if execution.status in terminal_states:
            return False

        # Check if there are checkpoints
        checkpoints = self.checkpoint_repo.list_by_story(
            session_id,
            story_id,
            limit=1
        )

        return len(checkpoints) > 0

    def recover_story(
        self,
        session_id: UUID,
        story_id: str,
        strategy: RecoveryStrategy = RecoveryStrategy.RESUME_FROM_LAST,
        target_gate: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Recover a story execution.

        Args:
            session_id: Wave session ID
            story_id: Story ID
            strategy: Recovery strategy to use
            target_gate: Target gate for RESUME_FROM_GATE strategy

        Returns:
            Recovery result with state information

        Raises:
            ValueError: If story cannot be recovered
        """
        # Log recovery start
        logger.info(
            f"🔄 Starting recovery | session={session_id} | story={story_id} | strategy={strategy.value}"
        )
        start_time = time.time()

        try:
            if not self.can_recover(session_id, story_id):
                logger.warning(
                    f"❌ Recovery failed: story cannot be recovered | "
                    f"session={session_id} | story={story_id}"
                )
                raise ValueError(
                    f"Story {story_id} cannot be recovered (completed or no checkpoints)"
                )

            execution = self.execution_repo.get_by_story_id(session_id, story_id)

            # Execute recovery strategy
            if strategy == RecoveryStrategy.RESUME_FROM_LAST:
                result = self._resume_from_last(session_id, story_id, execution)

            elif strategy == RecoveryStrategy.RESUME_FROM_GATE:
                if not target_gate:
                    raise ValueError("target_gate required for RESUME_FROM_GATE strategy")
                result = self._resume_from_gate(session_id, story_id, execution, target_gate)

            elif strategy == RecoveryStrategy.RESTART:
                result = self._restart_story(session_id, story_id, execution)

            elif strategy == RecoveryStrategy.SKIP:
                result = self._skip_story(session_id, story_id, execution)

            else:
                raise ValueError(f"Unknown recovery strategy: {strategy}")

            # Log success with timing
            recovery_time = time.time() - start_time
            logger.info(
                f"✅ Recovery complete | session={session_id} | story={story_id} | "
                f"strategy={strategy.value} | time={recovery_time:.3f}s | status={result['status']}"
            )

            # Add telemetry to result
            result["recovery_time_seconds"] = recovery_time
            result["recovery_timestamp"] = datetime.utcnow().isoformat()

            return result

        except Exception as e:
            recovery_time = time.time() - start_time
            logger.error(
                f"❌ Recovery error | session={session_id} | story={story_id} | "
                f"strategy={strategy.value} | time={recovery_time:.3f}s | error={str(e)}"
            )
            raise

    def recover_session(
        self,
        session_id: UUID,
        strategy: RecoveryStrategy = RecoveryStrategy.RESUME_FROM_LAST
    ) -> Dict[str, Any]:
        """
        Recover entire session.

        Args:
            session_id: Wave session ID
            strategy: Recovery strategy for all stories

        Returns:
            Recovery summary with per-story results
        """
        logger.info(
            f"🔄 Starting session recovery | session={session_id} | strategy={strategy.value}"
        )
        start_time = time.time()

        session = self.session_repo.get_by_id(session_id)
        if not session:
            logger.error(f"❌ Session not found | session={session_id}")
            raise ValueError(f"Session {session_id} not found")

        # Find all executions in non-terminal states
        executions = self.execution_repo.list_by_session(session_id)
        recoverable = [
            e for e in executions
            if e.status not in ["complete", "cancelled"]
        ]

        logger.info(
            f"📊 Session recovery status | session={session_id} | "
            f"total_executions={len(executions)} | recoverable={len(recoverable)}"
        )

        results = {
            "session_id": str(session_id),
            "strategy": strategy.value,
            "total_stories": len(recoverable),
            "recovered": [],
            "failed": [],
        }

        for execution in recoverable:
            try:
                result = self.recover_story(
                    session_id,
                    execution.story_id,
                    strategy
                )
                results["recovered"].append({
                    "story_id": execution.story_id,
                    "result": result,
                })
            except Exception as e:
                logger.warning(
                    f"⚠️  Story recovery failed | session={session_id} | "
                    f"story={execution.story_id} | error={str(e)}"
                )
                results["failed"].append({
                    "story_id": execution.story_id,
                    "error": str(e),
                })

        # Log session recovery summary
        recovery_time = time.time() - start_time
        logger.info(
            f"✅ Session recovery complete | session={session_id} | "
            f"recovered={len(results['recovered'])} | failed={len(results['failed'])} | "
            f"time={recovery_time:.3f}s"
        )

        results["recovery_time_seconds"] = recovery_time
        results["recovery_timestamp"] = datetime.utcnow().isoformat()

        return results

    def _resume_from_last(
        self,
        session_id: UUID,
        story_id: str,
        execution: WaveStoryExecution
    ) -> Dict[str, Any]:
        """Resume from last checkpoint."""
        recovery_point = self.get_last_recovery_point(session_id, story_id)
        if not recovery_point:
            raise ValueError("No recovery points available")

        # Update execution status if it was failed
        if execution.status == "failed":
            execution.status = "in_progress"
            execution.failed_at = None
            self.db.commit()

        # Create recovery checkpoint
        self.checkpoint_repo.create(
            session_id=session_id,
            checkpoint_type="manual",
            checkpoint_name=f"Recovered: {story_id}",
            state={
                "recovery_strategy": "resume_from_last",
                "recovered_from": str(recovery_point.checkpoint_id),
                "recovered_at": datetime.utcnow().isoformat(),
                "previous_state": recovery_point.state,
            },
            story_id=story_id,
        )
        self.db.commit()

        return {
            "strategy": "resume_from_last",
            "story_id": story_id,
            "checkpoint_id": str(recovery_point.checkpoint_id),
            "checkpoint_type": recovery_point.checkpoint_type,
            "state": recovery_point.state,
            "status": "resumed",
        }

    def _resume_from_gate(
        self,
        session_id: UUID,
        story_id: str,
        execution: WaveStoryExecution,
        target_gate: str
    ) -> Dict[str, Any]:
        """Resume from specific gate."""
        # Find checkpoint at target gate
        gate_checkpoint = self.checkpoint_repo.get_gate_checkpoint(
            session_id,
            story_id,
            target_gate
        )

        if not gate_checkpoint:
            raise ValueError(f"No checkpoint found for {target_gate}")

        # Update execution state
        if execution.status == "failed":
            execution.status = "in_progress"
            execution.failed_at = None

        # Update current gate in metadata
        metadata = execution.meta_data or {}
        metadata["current_gate"] = target_gate
        execution.meta_data = metadata
        flag_modified(execution, "meta_data")
        self.db.commit()

        # Create recovery checkpoint
        self.checkpoint_repo.create(
            session_id=session_id,
            checkpoint_type="manual",
            checkpoint_name=f"Recovered to {target_gate}: {story_id}",
            state={
                "recovery_strategy": "resume_from_gate",
                "target_gate": target_gate,
                "recovered_at": datetime.utcnow().isoformat(),
            },
            story_id=story_id,
            gate=target_gate,
        )
        self.db.commit()

        return {
            "strategy": "resume_from_gate",
            "story_id": story_id,
            "target_gate": target_gate,
            "checkpoint_id": str(gate_checkpoint.id),
            "status": "resumed",
        }

    def _restart_story(
        self,
        session_id: UUID,
        story_id: str,
        execution: WaveStoryExecution
    ) -> Dict[str, Any]:
        """Restart story from beginning."""
        # Reset execution state
        execution.status = "pending"
        execution.started_at = None
        execution.failed_at = None
        execution.retry_count = 0
        execution.acceptance_criteria_passed = 0
        execution.error_message = None

        # Reset metadata
        metadata = execution.meta_data or {}
        metadata["current_gate"] = "gate-0"
        metadata["restarted_at"] = datetime.utcnow().isoformat()
        execution.meta_data = metadata
        flag_modified(execution, "meta_data")
        self.db.commit()

        # Create restart checkpoint
        self.checkpoint_repo.create(
            session_id=session_id,
            checkpoint_type="manual",
            checkpoint_name=f"Restarted: {story_id}",
            state={
                "recovery_strategy": "restart",
                "restarted_at": datetime.utcnow().isoformat(),
            },
            story_id=story_id,
        )
        self.db.commit()

        return {
            "strategy": "restart",
            "story_id": story_id,
            "status": "restarted",
        }

    def _skip_story(
        self,
        session_id: UUID,
        story_id: str,
        execution: WaveStoryExecution
    ) -> Dict[str, Any]:
        """Skip failed story."""
        # Mark as cancelled
        execution.status = "cancelled"
        metadata = execution.meta_data or {}
        metadata["skip_reason"] = "Manual skip via recovery"
        metadata["skipped_at"] = datetime.utcnow().isoformat()
        execution.meta_data = metadata
        flag_modified(execution, "meta_data")
        self.db.commit()

        # Create skip checkpoint
        self.checkpoint_repo.create(
            session_id=session_id,
            checkpoint_type="manual",
            checkpoint_name=f"Skipped: {story_id}",
            state={
                "recovery_strategy": "skip",
                "skipped_at": datetime.utcnow().isoformat(),
            },
            story_id=story_id,
        )
        self.db.commit()

        return {
            "strategy": "skip",
            "story_id": story_id,
            "status": "skipped",
        }

    def _checkpoint_to_recovery_point(
        self,
        checkpoint: WaveCheckpoint
    ) -> RecoveryPoint:
        """Convert checkpoint to recovery point."""
        # Determine if this checkpoint can be used for recovery
        can_resume = checkpoint.checkpoint_type in [
            "gate",
            "story_start",
            "agent_handoff"
        ]

        reason = ""
        if checkpoint.checkpoint_type == "story_complete":
            reason = "Story already completed"
        elif checkpoint.checkpoint_type == "error":
            reason = "Error checkpoint - can resume with caution"
            can_resume = True  # Can still resume from errors
        elif can_resume:
            reason = f"Can resume from {checkpoint.checkpoint_type}"

        return RecoveryPoint(
            checkpoint_id=checkpoint.id,
            checkpoint_type=checkpoint.checkpoint_type,
            checkpoint_name=checkpoint.checkpoint_name,
            story_id=checkpoint.story_id or "",
            gate=checkpoint.gate,
            state=checkpoint.state,
            created_at=checkpoint.created_at,
            can_resume=can_resume,
            resume_reason=reason,
        )

    def get_recovery_status(self, session_id: UUID) -> Dict[str, Any]:
        """
        Get recovery status for a session.

        Args:
            session_id: Wave session ID

        Returns:
            Status summary with recoverable stories
        """
        session = self.session_repo.get_by_id(session_id)
        if not session:
            raise ValueError(f"Session {session_id} not found")

        executions = self.execution_repo.list_by_session(session_id)

        status = {
            "session_id": str(session_id),
            "session_status": session.status,
            "total_stories": len(executions),
            "by_status": {},
            "recoverable_stories": [],
            "completed_stories": [],
        }

        # Count by status
        for execution in executions:
            status["by_status"][execution.status] = \
                status["by_status"].get(execution.status, 0) + 1

            if execution.status in ["complete", "cancelled"]:
                status["completed_stories"].append(execution.story_id)
            elif self.can_recover(session_id, execution.story_id):
                recovery_point = self.get_last_recovery_point(
                    session_id,
                    execution.story_id
                )
                status["recoverable_stories"].append({
                    "story_id": execution.story_id,
                    "current_status": execution.status,
                    "retry_count": execution.retry_count,
                    "last_checkpoint": {
                        "type": recovery_point.checkpoint_type,
                        "gate": recovery_point.gate,
                        "created_at": recovery_point.created_at.isoformat(),
                    } if recovery_point else None,
                })

        return status
