"""
WAVE Story Execution State Machine
Story: WAVE-P1-002

Manages story execution lifecycle with state transitions and checkpointing.
"""

from enum import Enum
from typing import Optional, Dict, Any, List
from uuid import UUID
from datetime import datetime
from decimal import Decimal
from dataclasses import dataclass, field

from sqlalchemy.orm import Session

from ..db import (
    SessionRepository,
    CheckpointRepository,
    StoryExecutionRepository,
)


class StoryState(str, Enum):
    """Story execution states."""
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    BLOCKED = "blocked"
    REVIEW = "review"
    COMPLETE = "complete"
    FAILED = "failed"
    CANCELLED = "cancelled"


class GateStatus(str, Enum):
    """Gate execution status."""
    PENDING = "pending"
    PASSED = "passed"
    FAILED = "failed"
    SKIPPED = "skipped"


@dataclass
class ExecutionContext:
    """Context for story execution."""
    session_id: UUID
    story_id: str
    story_title: str
    domain: str
    agent: str
    priority: Optional[str] = None
    story_points: Optional[int] = None
    max_retries: int = 3
    current_gate: str = "gate-0"
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class GateResult:
    """Result of gate execution."""
    gate: str
    status: GateStatus
    ac_passed: int = 0
    ac_total: int = 0
    error_message: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)


class StoryExecutionEngine:
    """
    Story execution state machine with checkpointing.

    Manages the lifecycle of story execution from pending to completion,
    with automatic checkpointing at each gate transition.
    """

    # Valid state transitions
    TRANSITIONS = {
        StoryState.PENDING: [StoryState.IN_PROGRESS, StoryState.CANCELLED],
        StoryState.IN_PROGRESS: [
            StoryState.BLOCKED,
            StoryState.REVIEW,
            StoryState.COMPLETE,
            StoryState.FAILED,
            StoryState.CANCELLED,
        ],
        StoryState.BLOCKED: [
            StoryState.IN_PROGRESS,
            StoryState.FAILED,
            StoryState.CANCELLED,
        ],
        StoryState.REVIEW: [
            StoryState.IN_PROGRESS,
            StoryState.COMPLETE,
            StoryState.FAILED,
        ],
        StoryState.COMPLETE: [],  # Terminal state
        StoryState.FAILED: [],    # Terminal state
        StoryState.CANCELLED: [], # Terminal state
    }

    # Gate sequence (in order)
    GATE_SEQUENCE = [
        "gate-0",  # Pre-flight (CTO)
        "gate-1",  # Self-review
        "gate-2",  # Build verification
        "gate-3",  # Test verification
        "gate-4",  # QA acceptance
        "gate-5",  # PM validation
        "gate-6",  # Architecture review
        "gate-7",  # Merge authorization
    ]

    def __init__(self, db: Session):
        """
        Initialize execution engine.

        Args:
            db: SQLAlchemy session
        """
        self.db = db
        self.session_repo = SessionRepository(db)
        self.checkpoint_repo = CheckpointRepository(db)
        self.execution_repo = StoryExecutionRepository(db)

    def start_execution(self, context: ExecutionContext) -> UUID:
        """
        Start story execution.

        Args:
            context: Execution context

        Returns:
            Execution ID (UUID)

        Raises:
            ValueError: If session not found or already has this story
        """
        # Verify session exists
        session = self.session_repo.get_by_id(context.session_id)
        if not session:
            raise ValueError(f"Session {context.session_id} not found")

        # Check if story already exists
        existing = self.execution_repo.get_by_story_id(
            context.session_id,
            context.story_id
        )
        if existing:
            raise ValueError(
                f"Story {context.story_id} already exists in session"
            )

        # Create execution record
        execution = self.execution_repo.create(
            session_id=context.session_id,
            story_id=context.story_id,
            story_title=context.story_title,
            domain=context.domain,
            agent=context.agent,
            priority=context.priority,
            story_points=context.story_points,
            metadata=context.metadata,
        )

        # Start execution
        self.execution_repo.start_execution(execution.id)

        # Create initial checkpoint
        self._create_checkpoint(
            execution_id=execution.id,
            checkpoint_type="story_start",
            checkpoint_name=f"Started {context.story_id}",
            state={
                "current_gate": context.current_gate,
                "retry_count": 0,
                "started_at": datetime.utcnow().isoformat(),
            },
            story_id=context.story_id,
        )

        self.db.commit()
        return execution.id

    def transition_state(
        self,
        execution_id: UUID,
        new_state: StoryState,
        reason: Optional[str] = None
    ) -> None:
        """
        Transition story to new state.

        Args:
            execution_id: Execution ID
            new_state: Target state
            reason: Optional reason for transition

        Raises:
            ValueError: If transition is invalid
        """
        execution = self.execution_repo.get_by_id(execution_id)
        if not execution:
            raise ValueError(f"Execution {execution_id} not found")

        current_state = StoryState(execution.status)

        # Validate transition
        if new_state not in self.TRANSITIONS[current_state]:
            raise ValueError(
                f"Invalid transition from {current_state} to {new_state}"
            )

        # Update state in database
        execution.status = new_state.value
        if reason:
            metadata = execution.meta_data or {}
            metadata["last_transition_reason"] = reason
            execution.meta_data = metadata

        # Create checkpoint for state transition
        self._create_checkpoint(
            execution_id=execution_id,
            checkpoint_type="agent_handoff" if new_state == StoryState.REVIEW else "manual",
            checkpoint_name=f"Transitioned to {new_state.value}",
            state={
                "previous_state": current_state.value,
                "new_state": new_state.value,
                "reason": reason,
                "timestamp": datetime.utcnow().isoformat(),
            },
            story_id=execution.story_id,
        )

        self.db.commit()

    def execute_gate(
        self,
        execution_id: UUID,
        gate_result: GateResult
    ) -> None:
        """
        Execute gate and update execution state.

        Args:
            execution_id: Execution ID
            gate_result: Gate execution result

        Raises:
            ValueError: If gate sequence is invalid
        """
        execution = self.execution_repo.get_by_id(execution_id)
        if not execution:
            raise ValueError(f"Execution {execution_id} not found")

        # Validate gate sequence
        if gate_result.gate not in self.GATE_SEQUENCE:
            raise ValueError(f"Invalid gate: {gate_result.gate}")

        # Update acceptance criteria
        self.execution_repo.update_metrics(
            execution_id=execution_id,
            acceptance_criteria_passed=gate_result.ac_passed,
            acceptance_criteria_total=gate_result.ac_total,
        )

        # Create gate checkpoint
        self._create_checkpoint(
            execution_id=execution_id,
            checkpoint_type="gate",
            checkpoint_name=f"{gate_result.gate}: {gate_result.status.value}",
            state={
                "gate": gate_result.gate,
                "status": gate_result.status.value,
                "ac_passed": gate_result.ac_passed,
                "ac_total": gate_result.ac_total,
                "error_message": gate_result.error_message,
                "metadata": gate_result.metadata,
                "timestamp": datetime.utcnow().isoformat(),
            },
            story_id=execution.story_id,
            gate=gate_result.gate,
        )

        # Handle gate failure
        if gate_result.status == GateStatus.FAILED:
            if execution.retry_count >= 3:  # Max retries exceeded
                self.execution_repo.fail_execution(
                    execution_id,
                    error_message=f"{gate_result.gate} failed: {gate_result.error_message}"
                )
            else:
                # Increment retry counter
                self.execution_repo.update_metrics(
                    execution_id=execution_id,
                    retry_count=execution.retry_count + 1
                )

        # Move to next gate if passed
        elif gate_result.status == GateStatus.PASSED:
            current_gate_idx = self.GATE_SEQUENCE.index(gate_result.gate)
            if current_gate_idx < len(self.GATE_SEQUENCE) - 1:
                # More gates to go
                next_gate = self.GATE_SEQUENCE[current_gate_idx + 1]
                metadata = execution.meta_data or {}
                metadata["current_gate"] = next_gate
                execution.meta_data = metadata
            else:
                # All gates passed - mark as complete
                self.transition_state(
                    execution_id,
                    StoryState.COMPLETE,
                    reason="All gates passed"
                )

        self.db.commit()

    def complete_execution(
        self,
        execution_id: UUID,
        files_created: Optional[List[str]] = None,
        files_modified: Optional[List[str]] = None,
        branch_name: Optional[str] = None,
        commit_sha: Optional[str] = None,
        pr_url: Optional[str] = None,
        tests_passing: bool = False,
        coverage_achieved: Optional[Decimal] = None,
    ) -> None:
        """
        Mark execution as complete.

        Args:
            execution_id: Execution ID
            files_created: List of created files
            files_modified: List of modified files
            branch_name: Git branch name
            commit_sha: Git commit SHA
            pr_url: Pull request URL
            tests_passing: Whether tests pass
            coverage_achieved: Test coverage percentage
        """
        self.execution_repo.complete_execution(
            execution_id=execution_id,
            tests_passing=tests_passing,
            coverage_achieved=coverage_achieved,
            files_created=files_created,
            files_modified=files_modified,
            branch_name=branch_name,
            commit_sha=commit_sha,
            pr_url=pr_url,
        )

        # Create completion checkpoint
        execution = self.execution_repo.get_by_id(execution_id)
        self._create_checkpoint(
            execution_id=execution_id,
            checkpoint_type="story_complete",
            checkpoint_name=f"Completed {execution.story_id}",
            state={
                "files_created": files_created or [],
                "files_modified": files_modified or [],
                "branch_name": branch_name,
                "commit_sha": commit_sha,
                "pr_url": pr_url,
                "tests_passing": tests_passing,
                "coverage_achieved": str(coverage_achieved) if coverage_achieved else None,
                "completed_at": datetime.utcnow().isoformat(),
            },
            story_id=execution.story_id,
        )

        self.db.commit()

    def fail_execution(
        self,
        execution_id: UUID,
        error_message: str
    ) -> None:
        """
        Mark execution as failed.

        Args:
            execution_id: Execution ID
            error_message: Error description
        """
        self.execution_repo.fail_execution(execution_id, error_message)

        # Create error checkpoint
        execution = self.execution_repo.get_by_id(execution_id)
        self._create_checkpoint(
            execution_id=execution_id,
            checkpoint_type="error",
            checkpoint_name=f"Failed: {execution.story_id}",
            state={
                "error_message": error_message,
                "retry_count": execution.retry_count,
                "failed_at": datetime.utcnow().isoformat(),
            },
            story_id=execution.story_id,
        )

        self.db.commit()

    def _create_checkpoint(
        self,
        execution_id: UUID,
        checkpoint_type: str,
        checkpoint_name: str,
        state: Dict[str, Any],
        story_id: str,
        gate: Optional[str] = None,
    ) -> None:
        """
        Create checkpoint for execution.

        Args:
            execution_id: Execution ID
            checkpoint_type: Checkpoint type
            checkpoint_name: Checkpoint name
            state: State data
            story_id: Story ID
            gate: Optional gate name
        """
        execution = self.execution_repo.get_by_id(execution_id)
        if not execution:
            raise ValueError(f"Execution {execution_id} not found")

        self.checkpoint_repo.create(
            session_id=execution.session_id,
            checkpoint_type=checkpoint_type,
            checkpoint_name=checkpoint_name,
            state=state,
            story_id=story_id,
            gate=gate,
            agent_id=execution.agent,
        )

    def get_current_state(self, execution_id: UUID) -> Dict[str, Any]:
        """
        Get current execution state.

        Args:
            execution_id: Execution ID

        Returns:
            State dictionary with execution details
        """
        execution = self.execution_repo.get_by_id(execution_id)
        if not execution:
            raise ValueError(f"Execution {execution_id} not found")

        # Get latest checkpoint
        checkpoint = self.checkpoint_repo.get_latest_by_session(
            execution.session_id
        )

        return {
            "execution_id": str(execution.id),
            "story_id": execution.story_id,
            "status": execution.status,
            "current_gate": execution.meta_data.get("current_gate", "gate-0") if execution.meta_data else "gate-0",
            "retry_count": execution.retry_count,
            "ac_passed": execution.acceptance_criteria_passed,
            "ac_total": execution.acceptance_criteria_total,
            "latest_checkpoint": {
                "id": str(checkpoint.id),
                "type": checkpoint.checkpoint_type,
                "name": checkpoint.checkpoint_name,
                "created_at": checkpoint.created_at.isoformat(),
            } if checkpoint else None,
        }
