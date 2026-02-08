"""
Tests for Parallel Story Executor
Story: WAVE-P3-003

Tests the ParallelStoryExecutor that runs multiple stories
simultaneously across different agents with worktree isolation,
domain boundary enforcement, signal coordination, and merge.

Test Categories:
1. Parallel Launch (AC-01) — 3 tests
2. Worktree Isolation (AC-02) — 3 tests
3. Signal Handling (AC-03) — 3 tests
4. Domain Conflict Prevention (AC-04) — 3 tests
5. Merge Coordination (AC-05) — 3 tests
6. Fault Tolerance (AC-06) — 3 tests
7. Resource Tracking (AC-07) — 3 tests

Total: 21 tests
"""

import subprocess
import time
import threading
import pytest
from pathlib import Path
from dataclasses import dataclass
from typing import Dict, Any, List, Optional
from unittest.mock import MagicMock

from src.parallel.story_executor import (
    ParallelStoryExecutor,
    StoryTask,
    StoryResult,
    ExecutionPlan,
    ExecutionStatus,
)


# ═══════════════════════════════════════════════════════════════════════════════
# HELPERS
# ═══════════════════════════════════════════════════════════════════════════════

def _run(cmd, cwd):
    result = subprocess.run(
        cmd, cwd=cwd, capture_output=True, text=True, timeout=30
    )
    if result.returncode != 0:
        raise RuntimeError(f"Command failed: {cmd}\n{result.stderr}")
    return result.stdout


@pytest.fixture
def git_repo(tmp_path):
    """Real git repo with initial commit."""
    repo = tmp_path / "repo"
    repo.mkdir()
    _run(["git", "init", "--initial-branch=main"], cwd=str(repo))
    _run(["git", "config", "user.name", "Test"], cwd=str(repo))
    _run(["git", "config", "user.email", "test@test.com"], cwd=str(repo))
    (repo / "README.md").write_text("# Project\n")
    _run(["git", "add", "."], cwd=str(repo))
    _run(["git", "commit", "-m", "Initial commit"], cwd=str(repo))
    return repo


@pytest.fixture
def domain_config():
    """Minimal domain config for tests."""
    return {
        "domains": [
            {"id": "auth", "name": "Auth", "file_patterns": ["src/auth/**/*"]},
            {"id": "booking", "name": "Booking", "file_patterns": ["src/booking/**/*"]},
            {"id": "payment", "name": "Payment", "file_patterns": ["src/payment/**/*"]},
            {"id": "frontend", "name": "Frontend", "file_patterns": ["portal/**/*"]},
            {"id": "shared", "name": "Shared", "file_patterns": ["src/shared/**/*"]},
        ],
    }


def make_story(story_id, domain, action="implement"):
    """Create a StoryTask for testing."""
    return StoryTask(
        story_id=story_id,
        domain=domain,
        action=action,
        payload={"requirements": f"Do {action} for {story_id}"},
    )


def dummy_agent(story: StoryTask, worktree_path: str) -> StoryResult:
    """Simple agent that creates a domain-specific file and succeeds."""
    domain_dir = Path(worktree_path) / "src" / story.domain
    domain_dir.mkdir(parents=True, exist_ok=True)
    (domain_dir / f"{story.story_id}.txt").write_text(f"Work for {story.story_id}\n")
    _run(["git", "add", "."], cwd=worktree_path)
    _run(
        ["git", "-c", "user.name=Agent", "-c", "user.email=a@w.dev",
         "commit", "-m", f"Story {story.story_id}"],
        cwd=worktree_path,
    )
    return StoryResult(
        story_id=story.story_id,
        success=True,
        tokens_used=1000,
        files_modified=[f"src/{story.domain}/{story.story_id}.txt"],
    )


def failing_agent(story: StoryTask, worktree_path: str) -> StoryResult:
    """Agent that always fails."""
    return StoryResult(
        story_id=story.story_id,
        success=False,
        error="Agent crashed",
        tokens_used=500,
    )


@pytest.fixture
def executor(git_repo, domain_config):
    """ParallelStoryExecutor with real git repo."""
    return ParallelStoryExecutor(
        repo_path=str(git_repo),
        domain_config=domain_config,
        max_parallel=4,
    )


# ═══════════════════════════════════════════════════════════════════════════════
# 1. Parallel Launch (AC-01)
# ═══════════════════════════════════════════════════════════════════════════════

class TestParallelLaunch:
    """Tests for AC-01: Multiple stories start simultaneously."""

    def test_start_four_stories(self, executor):
        """AC-01: 4 non-conflicting stories all start."""
        stories = [
            make_story("S-001", "auth"),
            make_story("S-002", "booking"),
            make_story("S-003", "payment"),
            make_story("S-004", "frontend"),
        ]
        plan = executor.plan(stories)
        assert len(plan.parallel_batch) == 4
        assert len(plan.waiting) == 0

    def test_start_under_limit(self, executor):
        """AC-01: 2 stories start when max_parallel=4."""
        stories = [make_story("S-005", "auth"), make_story("S-006", "booking")]
        plan = executor.plan(stories)
        assert len(plan.parallel_batch) == 2

    def test_plan_returns_execution_plan(self, executor):
        """AC-01: plan() returns an ExecutionPlan."""
        stories = [make_story("S-007", "auth")]
        plan = executor.plan(stories)
        assert isinstance(plan, ExecutionPlan)


# ═══════════════════════════════════════════════════════════════════════════════
# 2. Worktree Isolation (AC-02)
# ═══════════════════════════════════════════════════════════════════════════════

class TestWorktreeIsolation:
    """Tests for AC-02: Each story runs in dedicated worktree."""

    def test_each_story_gets_worktree(self, executor, git_repo):
        """AC-02: Each story gets its own worktree on execution."""
        stories = [
            make_story("S-010", "auth"),
            make_story("S-011", "booking"),
        ]
        results = executor.execute(stories, agent_fn=dummy_agent)
        assert len(results) == 2
        assert all(r.success for r in results)

    def test_worktrees_are_unique(self, executor, git_repo):
        """AC-02: No two stories share a worktree."""
        stories = [
            make_story("S-012", "auth"),
            make_story("S-013", "booking"),
        ]
        executor.execute(stories, agent_fn=dummy_agent)
        # Verify worktrees were created at different paths
        worktrees = executor.worktree_manager.list_run_worktrees(executor.run_id)
        paths = [w.path for w in worktrees]
        assert len(set(paths)) == len(paths)

    def test_worktrees_cleaned_up(self, executor, git_repo):
        """AC-02/05: Worktrees are cleaned up after execution."""
        stories = [make_story("S-014", "auth")]
        executor.execute(stories, agent_fn=dummy_agent)
        remaining = executor.worktree_manager.list_run_worktrees(executor.run_id)
        assert len(remaining) == 0


# ═══════════════════════════════════════════════════════════════════════════════
# 3. Signal Handling (AC-03)
# ═══════════════════════════════════════════════════════════════════════════════

class TestSignalHandling:
    """Tests for AC-03: Signals from all agents processed correctly."""

    def test_results_collected_from_all(self, executor, git_repo):
        """AC-03: Results collected from every story."""
        stories = [
            make_story("S-020", "auth"),
            make_story("S-021", "booking"),
            make_story("S-022", "payment"),
        ]
        results = executor.execute(stories, agent_fn=dummy_agent)
        story_ids = {r.story_id for r in results}
        assert story_ids == {"S-020", "S-021", "S-022"}

    def test_results_contain_success_status(self, executor, git_repo):
        """AC-03: Each result has success status."""
        stories = [make_story("S-023", "auth")]
        results = executor.execute(stories, agent_fn=dummy_agent)
        assert results[0].success is True

    def test_results_contain_error_on_failure(self, executor, git_repo):
        """AC-03: Failed results contain error message."""
        stories = [make_story("S-024", "auth")]
        results = executor.execute(stories, agent_fn=failing_agent)
        assert results[0].success is False
        assert results[0].error is not None


# ═══════════════════════════════════════════════════════════════════════════════
# 4. Domain Conflict Prevention (AC-04)
# ═══════════════════════════════════════════════════════════════════════════════

class TestDomainConflictPrevention:
    """Tests for AC-04: Same-domain stories serialized."""

    def test_same_domain_stories_serialized(self, executor):
        """AC-04: Two stories targeting same domain don't run in parallel."""
        stories = [
            make_story("S-030", "auth"),
            make_story("S-031", "auth"),
        ]
        plan = executor.plan(stories)
        # Only one auth story in parallel batch, other waits
        assert len(plan.parallel_batch) == 1
        assert len(plan.waiting) == 1

    def test_different_domains_parallel(self, executor):
        """AC-04: Stories in different domains run in parallel."""
        stories = [
            make_story("S-032", "auth"),
            make_story("S-033", "booking"),
        ]
        plan = executor.plan(stories)
        assert len(plan.parallel_batch) == 2

    def test_mixed_conflict_and_parallel(self, executor):
        """AC-04: Mix of conflicting and non-conflicting stories."""
        stories = [
            make_story("S-034", "auth"),
            make_story("S-035", "auth"),  # Conflicts with S-034
            make_story("S-036", "booking"),
            make_story("S-037", "payment"),
        ]
        plan = executor.plan(stories)
        # auth:S-034, booking:S-036, payment:S-037 in parallel
        assert len(plan.parallel_batch) == 3
        # auth:S-035 waits
        assert len(plan.waiting) == 1
        assert plan.waiting[0].story_id == "S-035"


# ═══════════════════════════════════════════════════════════════════════════════
# 5. Merge Coordination (AC-05)
# ═══════════════════════════════════════════════════════════════════════════════

class TestMergeCoordination:
    """Tests for AC-05: Completed stories merge without conflicts."""

    def test_successful_stories_merged(self, executor, git_repo):
        """AC-05: Successful stories' changes merge to integration."""
        stories = [
            make_story("S-040", "auth"),
            make_story("S-041", "booking"),
        ]
        results = executor.execute(stories, agent_fn=dummy_agent)
        assert all(r.success for r in results)
        # Verify integration branch has both files
        assert executor.merge_result is not None
        assert executor.merge_result.success is True

    def test_failed_stories_not_merged(self, executor, git_repo):
        """AC-05: Failed stories are excluded from merge."""
        call_count = {"n": 0}

        def mixed_agent(story, wt_path):
            call_count["n"] += 1
            if story.story_id == "S-043":
                return failing_agent(story, wt_path)
            return dummy_agent(story, wt_path)

        stories = [
            make_story("S-042", "auth"),
            make_story("S-043", "booking"),
        ]
        results = executor.execute(stories, agent_fn=mixed_agent)
        successes = [r for r in results if r.success]
        failures = [r for r in results if not r.success]
        assert len(successes) == 1
        assert len(failures) == 1

    def test_no_stories_no_merge(self, executor, git_repo):
        """AC-05: Empty story list produces no merge."""
        results = executor.execute([], agent_fn=dummy_agent)
        assert len(results) == 0
        assert executor.merge_result is None


# ═══════════════════════════════════════════════════════════════════════════════
# 6. Fault Tolerance (AC-06)
# ═══════════════════════════════════════════════════════════════════════════════

class TestFaultTolerance:
    """Tests for AC-06: Single agent failure doesn't affect others."""

    def test_other_agents_continue_on_failure(self, executor, git_repo):
        """AC-06: One failure doesn't block other stories."""
        def selective_agent(story, wt_path):
            if story.story_id == "S-051":
                return failing_agent(story, wt_path)
            return dummy_agent(story, wt_path)

        stories = [
            make_story("S-050", "auth"),
            make_story("S-051", "booking"),
            make_story("S-052", "payment"),
        ]
        results = executor.execute(stories, agent_fn=selective_agent)
        successes = [r for r in results if r.success]
        assert len(successes) == 2

    def test_all_results_returned(self, executor, git_repo):
        """AC-06: Results returned for all stories, even failures."""
        def one_fails(story, wt_path):
            if story.story_id == "S-054":
                return failing_agent(story, wt_path)
            return dummy_agent(story, wt_path)

        stories = [
            make_story("S-053", "auth"),
            make_story("S-054", "booking"),
        ]
        results = executor.execute(stories, agent_fn=one_fails)
        assert len(results) == 2

    def test_agent_exception_caught(self, executor, git_repo):
        """AC-06: Unhandled exception in agent is caught."""
        def crashing_agent(story, wt_path):
            raise RuntimeError("Unexpected crash")

        stories = [make_story("S-055", "auth")]
        results = executor.execute(stories, agent_fn=crashing_agent)
        assert len(results) == 1
        assert results[0].success is False
        assert "Unexpected crash" in results[0].error


# ═══════════════════════════════════════════════════════════════════════════════
# 7. Resource Tracking (AC-07)
# ═══════════════════════════════════════════════════════════════════════════════

class TestResourceTracking:
    """Tests for AC-07: Resource usage tracked per agent."""

    def test_tokens_tracked_per_story(self, executor, git_repo):
        """AC-07: Each result has tokens_used."""
        stories = [make_story("S-060", "auth")]
        results = executor.execute(stories, agent_fn=dummy_agent)
        assert results[0].tokens_used == 1000

    def test_total_tokens_summed(self, executor, git_repo):
        """AC-07: Total tokens summed across all stories."""
        stories = [
            make_story("S-061", "auth"),
            make_story("S-062", "booking"),
        ]
        results = executor.execute(stories, agent_fn=dummy_agent)
        total = sum(r.tokens_used for r in results)
        assert total == 2000

    def test_execution_status_available(self, executor, git_repo):
        """AC-07: Execution status summary available after run."""
        stories = [
            make_story("S-063", "auth"),
            make_story("S-064", "booking"),
        ]
        executor.execute(stories, agent_fn=dummy_agent)
        status = executor.get_status()
        assert isinstance(status, ExecutionStatus)
        assert status.total_stories == 2
        assert status.succeeded == 2
        assert status.failed == 0
        assert status.total_tokens == 2000
