"""
Parallel Story Executor
Story: WAVE-P3-003

Runs multiple stories simultaneously across different agents with:
- Worktree isolation (P3-001)
- Domain boundary enforcement (P3-002)
- Signal coordination (P2-003)
- Clean merge of completed work

Uses concurrent.futures for thread-based parallelism so each agent
gets its own worktree and can run git commands independently.
"""

import logging
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass, field
from typing import Callable, Dict, List, Optional
from uuid import uuid4

from src.git.domain_worktrees import DomainWorktreeManager, DomainWorktreeInfo
from src.git.tools import MergeResult
from src.domains.boundary_enforcer import BoundaryEnforcer

logger = logging.getLogger(__name__)


@dataclass
class StoryTask:
    """A story to be executed by an agent."""
    story_id: str
    domain: str
    action: str = "implement"
    payload: Dict = field(default_factory=dict)


@dataclass
class StoryResult:
    """Result of executing a story."""
    story_id: str
    success: bool
    tokens_used: int = 0
    files_modified: List[str] = field(default_factory=list)
    error: Optional[str] = None
    duration_seconds: float = 0.0


@dataclass
class ExecutionPlan:
    """Plan for parallel execution."""
    parallel_batch: List[StoryTask]
    waiting: List[StoryTask]
    run_id: str = ""


@dataclass
class ExecutionStatus:
    """Summary of a parallel execution run."""
    run_id: str
    total_stories: int
    succeeded: int
    failed: int
    total_tokens: int
    duration_seconds: float = 0.0


# Type alias for agent function
AgentFn = Callable[[StoryTask, str], StoryResult]


class ParallelStoryExecutor:
    """
    Executes multiple stories in parallel across isolated worktrees.

    Workflow:
    1. plan() — Partition stories into parallel batches (domain-conflict-free)
    2. execute() — Run stories concurrently with worktree isolation
    3. Merge completed work into integration branch
    4. Clean up worktrees

    Integrates:
    - DomainWorktreeManager (P3-001) for git isolation
    - BoundaryEnforcer (P3-002) for domain rules
    """

    def __init__(
        self,
        repo_path: str,
        domain_config: dict,
        max_parallel: int = 4,
    ):
        self.repo_path = repo_path
        self.max_parallel = max_parallel
        self.run_id = str(uuid4())[:8]

        # Components
        self.worktree_manager = DomainWorktreeManager(repo_path)
        self.boundary_enforcer = BoundaryEnforcer.from_dict(domain_config)

        # State
        self._results: List[StoryResult] = []
        self.merge_result: Optional[MergeResult] = None
        self._start_time: Optional[float] = None
        self._end_time: Optional[float] = None

    def plan(self, stories: List[StoryTask]) -> ExecutionPlan:
        """
        Plan parallel execution (AC-01, AC-04).

        Partitions stories into a parallel batch (one per domain) and
        a waiting queue (same-domain conflicts). Respects max_parallel.

        Args:
            stories: Stories to execute.

        Returns:
            ExecutionPlan with parallel_batch and waiting list.
        """
        parallel_batch: List[StoryTask] = []
        waiting: List[StoryTask] = []
        claimed_domains: set = set()

        for story in stories:
            if (story.domain not in claimed_domains
                    and len(parallel_batch) < self.max_parallel):
                parallel_batch.append(story)
                claimed_domains.add(story.domain)
            else:
                waiting.append(story)

        return ExecutionPlan(
            parallel_batch=parallel_batch,
            waiting=waiting,
            run_id=self.run_id,
        )

    def execute(
        self,
        stories: List[StoryTask],
        agent_fn: AgentFn,
    ) -> List[StoryResult]:
        """
        Execute stories in parallel (AC-01 through AC-07).

        For each batch:
        1. Create worktrees
        2. Run agents concurrently
        3. Merge successful results
        4. Clean up

        Waiting stories are executed in subsequent batches.

        Args:
            stories: Stories to execute.
            agent_fn: Callable(story, worktree_path) -> StoryResult.

        Returns:
            List of StoryResult for all stories.
        """
        if not stories:
            return []

        self._results = []
        self._start_time = time.time()

        remaining = list(stories)

        while remaining:
            plan = self.plan(remaining)
            batch_results = self._execute_batch(plan.parallel_batch, agent_fn)
            self._results.extend(batch_results)
            remaining = plan.waiting

        # Merge successful stories
        successful_domains = [
            r.story_id for r in self._results if r.success
        ]
        if successful_domains:
            self._merge_completed()

        # Cleanup all worktrees
        self.worktree_manager.cleanup_run_worktrees(self.run_id)

        self._end_time = time.time()
        return self._results

    def get_status(self) -> ExecutionStatus:
        """Get execution status summary (AC-07)."""
        succeeded = sum(1 for r in self._results if r.success)
        failed = sum(1 for r in self._results if not r.success)
        total_tokens = sum(r.tokens_used for r in self._results)
        duration = (
            (self._end_time - self._start_time)
            if self._start_time and self._end_time
            else 0.0
        )

        return ExecutionStatus(
            run_id=self.run_id,
            total_stories=len(self._results),
            succeeded=succeeded,
            failed=failed,
            total_tokens=total_tokens,
            duration_seconds=duration,
        )

    def _execute_batch(
        self,
        batch: List[StoryTask],
        agent_fn: AgentFn,
    ) -> List[StoryResult]:
        """Execute a batch of non-conflicting stories concurrently."""
        results: List[StoryResult] = []

        # Create worktrees for all stories in the batch
        worktree_map: Dict[str, DomainWorktreeInfo] = {}
        for story in batch:
            info = self.worktree_manager.create_domain_worktree(
                domain=story.domain,
                run_id=self.run_id,
            )
            worktree_map[story.story_id] = info

        # Execute stories in parallel using threads
        with ThreadPoolExecutor(max_workers=self.max_parallel) as pool:
            futures = {}
            for story in batch:
                wt_info = worktree_map[story.story_id]
                if not wt_info.is_valid:
                    results.append(StoryResult(
                        story_id=story.story_id,
                        success=False,
                        error=f"Failed to create worktree for {story.domain}",
                    ))
                    continue

                future = pool.submit(
                    self._run_agent_safe, story, wt_info.path, agent_fn
                )
                futures[future] = story

            for future in as_completed(futures):
                result = future.result()
                results.append(result)

        return results

    def _run_agent_safe(
        self,
        story: StoryTask,
        worktree_path: str,
        agent_fn: AgentFn,
    ) -> StoryResult:
        """Run an agent with exception handling (AC-06)."""
        start = time.time()
        try:
            result = agent_fn(story, worktree_path)
            result.duration_seconds = time.time() - start
            return result
        except Exception as e:
            logger.error(
                "Agent for %s crashed: %s", story.story_id, e
            )
            return StoryResult(
                story_id=story.story_id,
                success=False,
                error=str(e),
                duration_seconds=time.time() - start,
            )

    def _merge_completed(self) -> None:
        """Merge all successful story branches into integration (AC-05)."""
        successful = [r for r in self._results if r.success]
        if not successful:
            return

        # Find the domains that succeeded
        # Map story_id -> domain from our tracked worktrees
        successful_domains = []
        for result in successful:
            for key, info in self.worktree_manager._domain_worktrees.items():
                if info.run_id == self.run_id:
                    successful_domains.append(info.domain)

        successful_domains = list(set(successful_domains))

        if not successful_domains:
            return

        try:
            self.worktree_manager.create_integration_branch(self.run_id)
            self.merge_result = self.worktree_manager.merge_all_domains(
                self.run_id, successful_domains
            )
        except Exception as e:
            logger.error("Merge failed: %s", e)
            self.merge_result = MergeResult(
                success=False,
                has_conflicts=False,
                message=f"Merge error: {e}",
            )


__all__ = [
    "ParallelStoryExecutor",
    "StoryTask",
    "StoryResult",
    "ExecutionPlan",
    "ExecutionStatus",
]
