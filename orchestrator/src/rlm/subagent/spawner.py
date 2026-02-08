"""
Subagent Spawner
Story: WAVE-P4-003

Manages spawning of subagents with depth limits, model tiering,
and resource tracking. Parent agents use this to delegate subtasks.
"""

import logging
from dataclasses import dataclass, field
from typing import Any, Callable, Dict, List, Optional
from uuid import uuid4

from .subagent import Subagent, SubagentResult, TaskFn

logger = logging.getLogger(__name__)

# Model tier mapping by complexity
MODEL_TIERS = {
    "simple": "haiku",
    "medium": "sonnet",
    "complex": "opus",
}


@dataclass
class SubagentConfig:
    """Configuration for subagent spawning."""
    max_depth: int = 3
    default_model_tier: str = "sonnet"
    max_subagents: int = 10
    token_budget: int = 100000


class SubagentSpawner:
    """
    Spawns and manages subagents for complex task delegation.

    - AC-01: Creates subagents with specific tasks
    - AC-05: Enforces depth limit (max 3 levels)
    - AC-06: Assigns model tier based on complexity
    - AC-07: Tracks total resource usage across subagents
    """

    def __init__(
        self,
        parent_story_id: str,
        parent_domain: str,
        max_depth: int = 3,
        current_depth: int = 0,
    ):
        self.parent_story_id = parent_story_id
        self.parent_domain = parent_domain
        self.max_depth = max_depth
        self.current_depth = current_depth
        self._subagents: List[Subagent] = []
        self._total_tokens: int = 0

    def spawn(
        self,
        task: str,
        context_files: Dict[str, str],
        task_fn: TaskFn,
        complexity: str = "medium",
    ) -> Subagent:
        """
        Spawn a new subagent for a subtask (AC-01, AC-05, AC-06).

        Args:
            task: Description of the subtask.
            context_files: Files for the subagent's isolated context.
            task_fn: Callable(context_files, task) -> result_dict.
            complexity: 'simple', 'medium', or 'complex' for model tiering.

        Returns:
            Subagent instance.

        Raises:
            ValueError: If depth limit exceeded.
        """
        new_depth = self.current_depth + 1

        # AC-05: Enforce depth limit
        if new_depth > self.max_depth:
            raise ValueError(
                f"Subagent depth {new_depth} exceeds max depth {self.max_depth}"
            )

        # AC-06: Select model tier
        model_tier = MODEL_TIERS.get(complexity, "sonnet")

        subagent_id = f"sa-{str(uuid4())[:8]}"
        subagent = Subagent(
            subagent_id=subagent_id,
            task=task,
            context_files=context_files,
            task_fn=task_fn,
            model_tier=model_tier,
            depth=new_depth,
            parent_story_id=self.parent_story_id,
        )

        self._subagents.append(subagent)
        logger.info(
            "Spawned subagent %s at depth %d (model=%s) for story %s",
            subagent_id, new_depth, model_tier, self.parent_story_id,
        )
        return subagent

    @property
    def active_subagents(self) -> List[Subagent]:
        """Return all spawned subagents."""
        return list(self._subagents)

    @property
    def total_tokens_used(self) -> int:
        """Total tokens used across all completed subagents (AC-07)."""
        total = 0
        for s in self._subagents:
            if s.result is not None:
                total += s.result.tokens_used
        return total

    def create_child_spawner(self) -> "SubagentSpawner":
        """
        Create a child spawner for a subagent that needs to spawn its own children.

        The child spawner has incremented depth.
        """
        return SubagentSpawner(
            parent_story_id=self.parent_story_id,
            parent_domain=self.parent_domain,
            max_depth=self.max_depth,
            current_depth=self.current_depth + 1,
        )
