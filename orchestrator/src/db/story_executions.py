"""
WAVE Story Execution Repository
Story: WAVE-P1-001

Repository pattern for WaveStoryExecution CRUD operations.
"""

from datetime import datetime
from decimal import Decimal
from typing import List, Optional, Dict, Any
from uuid import UUID

from sqlalchemy.orm import Session
from sqlalchemy import and_, desc

from .models import WaveStoryExecution


class StoryExecutionRepository:
    """
    Repository for managing WAVE story executions.

    Provides operations for tracking individual story execution with
    detailed metrics and results.
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
        story_id: str,
        story_title: str,
        domain: str,
        agent: str,
        priority: Optional[str] = None,
        story_points: Optional[int] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> WaveStoryExecution:
        """
        Create a new story execution record.

        Args:
            session_id: UUID of the wave session
            story_id: Story ID
            story_title: Story title
            domain: Technical domain
            agent: Agent name
            priority: Optional priority (P0, P1, P2, etc.)
            story_points: Optional story points
            metadata: Optional metadata dictionary

        Returns:
            Created WaveStoryExecution instance
        """
        execution = WaveStoryExecution(
            session_id=session_id,
            story_id=story_id,
            story_title=story_title,
            domain=domain,
            agent=agent,
            status="pending",
            priority=priority,
            story_points=story_points,
            meta_data=metadata or {},
        )
        self.db.add(execution)
        self.db.flush()
        return execution

    def get_by_id(self, execution_id: UUID) -> Optional[WaveStoryExecution]:
        """
        Get story execution by ID.

        Args:
            execution_id: UUID of the story execution

        Returns:
            WaveStoryExecution instance or None if not found
        """
        return (
            self.db.query(WaveStoryExecution)
            .filter(WaveStoryExecution.id == execution_id)
            .first()
        )

    def get_by_story_id(
        self, session_id: UUID, story_id: str
    ) -> Optional[WaveStoryExecution]:
        """
        Get story execution by session and story ID.

        Args:
            session_id: UUID of the wave session
            story_id: Story ID

        Returns:
            WaveStoryExecution instance or None if not found
        """
        return (
            self.db.query(WaveStoryExecution)
            .filter(
                and_(
                    WaveStoryExecution.session_id == session_id,
                    WaveStoryExecution.story_id == story_id,
                )
            )
            .first()
        )

    def list_by_session(
        self, session_id: UUID, limit: int = 100
    ) -> List[WaveStoryExecution]:
        """
        List all story executions for a session.

        Args:
            session_id: UUID of the wave session
            limit: Maximum number of results

        Returns:
            List of WaveStoryExecution instances ordered by creation time
        """
        return (
            self.db.query(WaveStoryExecution)
            .filter(WaveStoryExecution.session_id == session_id)
            .order_by(desc(WaveStoryExecution.created_at))
            .limit(limit)
            .all()
        )

    def list_by_status(
        self, session_id: UUID, status: str, limit: int = 100
    ) -> List[WaveStoryExecution]:
        """
        List story executions by status.

        Args:
            session_id: UUID of the wave session
            status: Status filter (pending, in_progress, complete, etc.)
            limit: Maximum number of results

        Returns:
            List of WaveStoryExecution instances
        """
        return (
            self.db.query(WaveStoryExecution)
            .filter(
                and_(
                    WaveStoryExecution.session_id == session_id,
                    WaveStoryExecution.status == status,
                )
            )
            .order_by(desc(WaveStoryExecution.created_at))
            .limit(limit)
            .all()
        )

    def list_by_agent(
        self, session_id: UUID, agent: str, limit: int = 100
    ) -> List[WaveStoryExecution]:
        """
        List story executions by agent.

        Args:
            session_id: UUID of the wave session
            agent: Agent name
            limit: Maximum number of results

        Returns:
            List of WaveStoryExecution instances
        """
        return (
            self.db.query(WaveStoryExecution)
            .filter(
                and_(
                    WaveStoryExecution.session_id == session_id,
                    WaveStoryExecution.agent == agent,
                )
            )
            .order_by(desc(WaveStoryExecution.created_at))
            .limit(limit)
            .all()
        )

    def list_by_domain(
        self, session_id: UUID, domain: str, limit: int = 100
    ) -> List[WaveStoryExecution]:
        """
        List story executions by domain.

        Args:
            session_id: UUID of the wave session
            domain: Domain name
            limit: Maximum number of results

        Returns:
            List of WaveStoryExecution instances
        """
        return (
            self.db.query(WaveStoryExecution)
            .filter(
                and_(
                    WaveStoryExecution.session_id == session_id,
                    WaveStoryExecution.domain == domain,
                )
            )
            .order_by(desc(WaveStoryExecution.created_at))
            .limit(limit)
            .all()
        )

    def start_execution(self, execution_id: UUID) -> WaveStoryExecution:
        """
        Mark story execution as started.

        Args:
            execution_id: UUID of the story execution

        Returns:
            Updated WaveStoryExecution instance

        Raises:
            ValueError: If execution not found
        """
        execution = self.get_by_id(execution_id)
        if not execution:
            raise ValueError(f"Story execution {execution_id} not found")

        execution.status = "in_progress"
        execution.started_at = datetime.utcnow()
        self.db.flush()
        return execution

    def complete_execution(
        self,
        execution_id: UUID,
        tests_passing: bool = False,
        coverage_achieved: Optional[Decimal] = None,
        files_created: Optional[List[str]] = None,
        files_modified: Optional[List[str]] = None,
        branch_name: Optional[str] = None,
        commit_sha: Optional[str] = None,
        pr_url: Optional[str] = None,
    ) -> WaveStoryExecution:
        """
        Mark story execution as completed.

        Args:
            execution_id: UUID of the story execution
            tests_passing: Whether all tests are passing
            coverage_achieved: Code coverage percentage
            files_created: List of created file paths
            files_modified: List of modified file paths
            branch_name: Git branch name
            commit_sha: Git commit SHA
            pr_url: Pull request URL

        Returns:
            Updated WaveStoryExecution instance

        Raises:
            ValueError: If execution not found
        """
        execution = self.get_by_id(execution_id)
        if not execution:
            raise ValueError(f"Story execution {execution_id} not found")

        execution.status = "complete"
        execution.completed_at = datetime.utcnow()
        execution.tests_passing = tests_passing
        if coverage_achieved is not None:
            execution.coverage_achieved = coverage_achieved
        if files_created is not None:
            execution.files_created = files_created
        if files_modified is not None:
            execution.files_modified = files_modified
        if branch_name is not None:
            execution.branch_name = branch_name
        if commit_sha is not None:
            execution.commit_sha = commit_sha
        if pr_url is not None:
            execution.pr_url = pr_url

        self.db.flush()
        return execution

    def fail_execution(
        self, execution_id: UUID, error_message: str
    ) -> WaveStoryExecution:
        """
        Mark story execution as failed.

        Args:
            execution_id: UUID of the story execution
            error_message: Error message describing the failure

        Returns:
            Updated WaveStoryExecution instance

        Raises:
            ValueError: If execution not found
        """
        execution = self.get_by_id(execution_id)
        if not execution:
            raise ValueError(f"Story execution {execution_id} not found")

        execution.status = "failed"
        execution.failed_at = datetime.utcnow()
        execution.error_message = error_message
        self.db.flush()
        return execution

    def block_execution(
        self, execution_id: UUID, block_reason: str
    ) -> WaveStoryExecution:
        """
        Mark story execution as blocked.

        Args:
            execution_id: UUID of the story execution
            block_reason: Reason for blocking

        Returns:
            Updated WaveStoryExecution instance

        Raises:
            ValueError: If execution not found
        """
        execution = self.get_by_id(execution_id)
        if not execution:
            raise ValueError(f"Story execution {execution_id} not found")

        execution.status = "blocked"
        execution.meta_data = execution.meta_data or {}
        execution.meta_data["block_reason"] = block_reason
        self.db.flush()
        return execution

    def update_metrics(
        self,
        execution_id: UUID,
        token_count: Optional[int] = None,
        cost_usd: Optional[Decimal] = None,
        retry_count: Optional[int] = None,
        acceptance_criteria_passed: Optional[int] = None,
        acceptance_criteria_total: Optional[int] = None,
    ) -> WaveStoryExecution:
        """
        Update execution metrics.

        Args:
            execution_id: UUID of the story execution
            token_count: Total token count
            cost_usd: Cost in USD
            retry_count: Number of retries
            acceptance_criteria_passed: Number of passed acceptance criteria
            acceptance_criteria_total: Total number of acceptance criteria

        Returns:
            Updated WaveStoryExecution instance

        Raises:
            ValueError: If execution not found
        """
        execution = self.get_by_id(execution_id)
        if not execution:
            raise ValueError(f"Story execution {execution_id} not found")

        if token_count is not None:
            execution.token_count = token_count
        if cost_usd is not None:
            execution.cost_usd = cost_usd
        if retry_count is not None:
            execution.retry_count = retry_count
        if acceptance_criteria_passed is not None:
            execution.acceptance_criteria_passed = acceptance_criteria_passed
        if acceptance_criteria_total is not None:
            execution.acceptance_criteria_total = acceptance_criteria_total

        self.db.flush()
        return execution

    def update_metadata(
        self, execution_id: UUID, metadata: Dict[str, Any]
    ) -> WaveStoryExecution:
        """
        Update execution metadata.

        Args:
            execution_id: UUID of the story execution
            metadata: Metadata dictionary to merge

        Returns:
            Updated WaveStoryExecution instance

        Raises:
            ValueError: If execution not found
        """
        execution = self.get_by_id(execution_id)
        if not execution:
            raise ValueError(f"Story execution {execution_id} not found")

        execution.meta_data = {**(execution.meta_data or {}), **metadata}
        self.db.flush()
        return execution

    def delete(self, execution_id: UUID) -> bool:
        """
        Delete a story execution by ID.

        Args:
            execution_id: UUID of the story execution

        Returns:
            True if deleted, False if not found
        """
        execution = self.get_by_id(execution_id)
        if not execution:
            return False

        self.db.delete(execution)
        self.db.flush()
        return True

    def delete_by_session(self, session_id: UUID) -> int:
        """
        Delete all story executions for a session.

        Args:
            session_id: UUID of the wave session

        Returns:
            Number of executions deleted
        """
        count = (
            self.db.query(WaveStoryExecution)
            .filter(WaveStoryExecution.session_id == session_id)
            .delete()
        )
        self.db.flush()
        return count
