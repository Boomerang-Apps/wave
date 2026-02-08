"""
Subagent
Story: WAVE-P4-003

Represents a child agent with isolated context that executes
a specific subtask and returns results.
"""

import enum
import logging
import time
from dataclasses import dataclass, field
from typing import Any, Callable, Dict, List, Optional

logger = logging.getLogger(__name__)


class SubagentStatus(enum.Enum):
    """Subagent lifecycle status."""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


@dataclass
class SubagentResult:
    """Result of a subagent's execution."""
    subagent_id: str
    success: bool
    output: str = ""
    tokens_used: int = 0
    files_modified: List[str] = field(default_factory=list)
    error: Optional[str] = None
    duration_seconds: float = 0.0


# Type alias for task function
TaskFn = Callable[[Dict[str, str], str], Dict[str, Any]]


class Subagent:
    """
    A child agent with isolated context for executing a subtask.

    Has its own context_files, model tier, and depth tracking.
    Runs a task_fn with (context_files, task) -> result_dict.
    """

    def __init__(
        self,
        subagent_id: str,
        task: str,
        context_files: Dict[str, str],
        task_fn: TaskFn,
        model_tier: str = "sonnet",
        depth: int = 1,
        parent_story_id: str = "",
    ):
        self.subagent_id = subagent_id
        self.task = task
        self.context_files = dict(context_files)  # Copy for isolation
        self.task_fn = task_fn
        self.model_tier = model_tier
        self.depth = depth
        self.parent_story_id = parent_story_id
        self.status = SubagentStatus.PENDING
        self._result: Optional[SubagentResult] = None

    def run(self) -> SubagentResult:
        """
        Execute the subtask with isolated context.

        Returns:
            SubagentResult with success/failure and metadata.
        """
        self.status = SubagentStatus.RUNNING
        start = time.monotonic()

        try:
            raw = self.task_fn(self.context_files, self.task)
            duration = time.monotonic() - start

            self._result = SubagentResult(
                subagent_id=self.subagent_id,
                success=True,
                output=raw.get("output", ""),
                tokens_used=raw.get("tokens_used", 0),
                files_modified=raw.get("files_modified", []),
                duration_seconds=duration,
            )
            self.status = SubagentStatus.COMPLETED

        except Exception as e:
            duration = time.monotonic() - start
            logger.error("Subagent %s failed: %s", self.subagent_id, e)
            self._result = SubagentResult(
                subagent_id=self.subagent_id,
                success=False,
                error=str(e),
                duration_seconds=duration,
            )
            self.status = SubagentStatus.FAILED

        return self._result

    @property
    def result(self) -> Optional[SubagentResult]:
        return self._result
