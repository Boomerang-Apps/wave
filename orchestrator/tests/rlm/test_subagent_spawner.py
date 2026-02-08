"""
Tests for Subagent Spawner
Story: WAVE-P4-003

Tests the Subagent Spawner that allows agents to delegate subtasks
to child agents with isolated context, depth limits, model tiering,
result collection, and error handling.

Test Categories:
1. Subagent Spawning (AC-01) — 3 tests
2. Isolated Context (AC-02) — 3 tests
3. Result Collection (AC-03) — 3 tests
4. Error Handling (AC-04) — 3 tests
5. Depth Limiting (AC-05) — 2 tests
6. Model Tiering (AC-06) — 2 tests
7. Resource Tracking (AC-07) — 3 tests

Total: 19 tests
"""

import pytest
from typing import Dict, Any, List
from unittest.mock import MagicMock

from src.rlm.subagent.spawner import SubagentSpawner, SubagentConfig
from src.rlm.subagent.subagent import Subagent, SubagentResult, SubagentStatus
from src.rlm.subagent.result_collector import ResultCollector


# ═══════════════════════════════════════════════════════════════════════════════
# FIXTURES
# ═══════════════════════════════════════════════════════════════════════════════

def simple_task_fn(context: Dict[str, str], task: str) -> Dict[str, Any]:
    """A simple task function that returns success."""
    return {
        "output": f"Completed: {task}",
        "files_modified": ["src/auth/login.py"],
        "tokens_used": 500,
    }


def failing_task_fn(context: Dict[str, str], task: str) -> Dict[str, Any]:
    """A task function that always raises."""
    raise RuntimeError("Subtask failed")


def slow_task_fn(context: Dict[str, str], task: str) -> Dict[str, Any]:
    """Task that uses many tokens."""
    return {
        "output": f"Done: {task}",
        "files_modified": [],
        "tokens_used": 25000,
    }


@pytest.fixture
def spawner():
    """SubagentSpawner with defaults."""
    return SubagentSpawner(
        parent_story_id="WAVE-001",
        parent_domain="auth",
        max_depth=3,
    )


@pytest.fixture
def collector():
    """ResultCollector instance."""
    return ResultCollector(parent_story_id="WAVE-001")


# ═══════════════════════════════════════════════════════════════════════════════
# 1. Subagent Spawning (AC-01)
# ═══════════════════════════════════════════════════════════════════════════════

class TestSubagentSpawning:
    """Tests for AC-01: Parent agent can spawn subagent."""

    def test_spawn_creates_subagent(self, spawner):
        """AC-01: Spawning creates a Subagent instance."""
        subagent = spawner.spawn(
            task="Implement login validation",
            context_files={"src/auth/login.py": "def login(): pass"},
            task_fn=simple_task_fn,
        )
        assert isinstance(subagent, Subagent)
        assert subagent.task == "Implement login validation"

    def test_spawn_assigns_unique_id(self, spawner):
        """AC-01: Each subagent gets a unique ID."""
        s1 = spawner.spawn(
            task="Task 1",
            context_files={},
            task_fn=simple_task_fn,
        )
        s2 = spawner.spawn(
            task="Task 2",
            context_files={},
            task_fn=simple_task_fn,
        )
        assert s1.subagent_id != s2.subagent_id

    def test_spawn_tracks_subagents(self, spawner):
        """AC-01: Spawner tracks all spawned subagents."""
        spawner.spawn(task="Task 1", context_files={}, task_fn=simple_task_fn)
        spawner.spawn(task="Task 2", context_files={}, task_fn=simple_task_fn)
        assert len(spawner.active_subagents) == 2


# ═══════════════════════════════════════════════════════════════════════════════
# 2. Isolated Context (AC-02)
# ═══════════════════════════════════════════════════════════════════════════════

class TestIsolatedContext:
    """Tests for AC-02: Subagent has isolated context."""

    def test_subagent_gets_only_specified_files(self, spawner):
        """AC-02: Subagent context contains only specified files."""
        context = {"src/auth/login.py": "def login(): pass"}
        subagent = spawner.spawn(
            task="Fix login",
            context_files=context,
            task_fn=simple_task_fn,
        )
        assert subagent.context_files == context
        assert len(subagent.context_files) == 1

    def test_subagent_context_independent_of_parent(self, spawner):
        """AC-02: Modifying subagent context doesn't affect parent."""
        parent_context = {"file.py": "original"}
        subagent = spawner.spawn(
            task="Task",
            context_files=parent_context.copy(),
            task_fn=simple_task_fn,
        )
        subagent.context_files["new_file.py"] = "added"
        assert "new_file.py" not in parent_context

    def test_subagent_has_limited_scope(self, spawner):
        """AC-02: Subagent context is a subset of available files."""
        full_context = {f"file_{i}.py": f"content {i}" for i in range(100)}
        subset = {k: v for k, v in list(full_context.items())[:5]}
        subagent = spawner.spawn(
            task="Small task",
            context_files=subset,
            task_fn=simple_task_fn,
        )
        assert len(subagent.context_files) == 5


# ═══════════════════════════════════════════════════════════════════════════════
# 3. Result Collection (AC-03)
# ═══════════════════════════════════════════════════════════════════════════════

class TestResultCollection:
    """Tests for AC-03: Subagent results returned to parent."""

    def test_subagent_returns_result(self, spawner):
        """AC-03: Running subagent returns SubagentResult."""
        subagent = spawner.spawn(
            task="Implement feature",
            context_files={"file.py": "code"},
            task_fn=simple_task_fn,
        )
        result = subagent.run()
        assert isinstance(result, SubagentResult)
        assert result.success is True
        assert "Completed" in result.output

    def test_collector_gathers_results(self, collector):
        """AC-03: ResultCollector gathers results from multiple subagents."""
        r1 = SubagentResult(
            subagent_id="sa-1", success=True,
            output="Done 1", tokens_used=500,
        )
        r2 = SubagentResult(
            subagent_id="sa-2", success=True,
            output="Done 2", tokens_used=700,
        )
        collector.add(r1)
        collector.add(r2)
        assert len(collector.results) == 2

    def test_collector_provides_summary(self, collector):
        """AC-03: ResultCollector provides aggregated summary."""
        collector.add(SubagentResult(
            subagent_id="sa-1", success=True, output="ok", tokens_used=500,
        ))
        collector.add(SubagentResult(
            subagent_id="sa-2", success=False, output="", tokens_used=300,
            error="Failed",
        ))
        summary = collector.summary()
        assert summary["total"] == 2
        assert summary["succeeded"] == 1
        assert summary["failed"] == 1


# ═══════════════════════════════════════════════════════════════════════════════
# 4. Error Handling (AC-04)
# ═══════════════════════════════════════════════════════════════════════════════

class TestErrorHandling:
    """Tests for AC-04: Subagent errors bubble up properly."""

    def test_subagent_failure_returns_error(self, spawner):
        """AC-04: Failed subagent returns error in result."""
        subagent = spawner.spawn(
            task="Risky task",
            context_files={},
            task_fn=failing_task_fn,
        )
        result = subagent.run()
        assert result.success is False
        assert result.error is not None
        assert "Subtask failed" in result.error

    def test_subagent_failure_doesnt_crash_parent(self, spawner):
        """AC-04: Subagent failure doesn't crash spawner."""
        s1 = spawner.spawn(task="Fail", context_files={}, task_fn=failing_task_fn)
        s2 = spawner.spawn(task="Succeed", context_files={}, task_fn=simple_task_fn)
        r1 = s1.run()
        r2 = s2.run()
        assert r1.success is False
        assert r2.success is True

    def test_subagent_status_reflects_failure(self, spawner):
        """AC-04: Subagent status set to FAILED on error."""
        subagent = spawner.spawn(
            task="Fail", context_files={}, task_fn=failing_task_fn,
        )
        subagent.run()
        assert subagent.status == SubagentStatus.FAILED


# ═══════════════════════════════════════════════════════════════════════════════
# 5. Depth Limiting (AC-05)
# ═══════════════════════════════════════════════════════════════════════════════

class TestDepthLimiting:
    """Tests for AC-05: Subagent depth limited."""

    def test_depth_within_limit_allowed(self, spawner):
        """AC-05: Spawning at depth < max is allowed."""
        subagent = spawner.spawn(
            task="Task", context_files={}, task_fn=simple_task_fn,
        )
        assert subagent.depth == 1

    def test_depth_exceeding_limit_rejected(self):
        """AC-05: Spawning beyond max depth raises error."""
        spawner = SubagentSpawner(
            parent_story_id="WAVE-001",
            parent_domain="auth",
            max_depth=3,
            current_depth=3,
        )
        with pytest.raises(ValueError, match="depth"):
            spawner.spawn(
                task="Too deep",
                context_files={},
                task_fn=simple_task_fn,
            )


# ═══════════════════════════════════════════════════════════════════════════════
# 6. Model Tiering (AC-06)
# ═══════════════════════════════════════════════════════════════════════════════

class TestModelTiering:
    """Tests for AC-06: Subagent uses appropriate model tier."""

    def test_simple_task_gets_haiku(self, spawner):
        """AC-06: Simple task assigns haiku model."""
        subagent = spawner.spawn(
            task="Fix typo",
            context_files={"file.py": "x"},
            task_fn=simple_task_fn,
            complexity="simple",
        )
        assert subagent.model_tier == "haiku"

    def test_complex_task_gets_opus(self, spawner):
        """AC-06: Complex task assigns opus model."""
        subagent = spawner.spawn(
            task="Redesign auth architecture",
            context_files={f"f{i}.py": "x" * 1000 for i in range(20)},
            task_fn=simple_task_fn,
            complexity="complex",
        )
        assert subagent.model_tier == "opus"


# ═══════════════════════════════════════════════════════════════════════════════
# 7. Resource Tracking (AC-07)
# ═══════════════════════════════════════════════════════════════════════════════

class TestResourceTracking:
    """Tests for AC-07: Subagent resource usage tracked."""

    def test_tokens_recorded_on_completion(self, spawner):
        """AC-07: Token usage recorded when subagent completes."""
        subagent = spawner.spawn(
            task="Task", context_files={}, task_fn=simple_task_fn,
        )
        result = subagent.run()
        assert result.tokens_used == 500

    def test_total_tokens_tracked_by_spawner(self, spawner):
        """AC-07: Spawner tracks total tokens across subagents."""
        s1 = spawner.spawn(task="T1", context_files={}, task_fn=simple_task_fn)
        s2 = spawner.spawn(task="T2", context_files={}, task_fn=simple_task_fn)
        s1.run()
        s2.run()
        assert spawner.total_tokens_used == 1000

    def test_tokens_attributed_to_parent(self, spawner):
        """AC-07: Tokens attributed to parent story."""
        s = spawner.spawn(task="T", context_files={}, task_fn=simple_task_fn)
        s.run()
        assert spawner.parent_story_id == "WAVE-001"
        assert spawner.total_tokens_used > 0
