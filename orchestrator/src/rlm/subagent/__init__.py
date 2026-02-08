"""
Subagent Spawner Sub-module
Story: WAVE-P4-003

Allows agents to delegate subtasks to child agents with isolated
context, depth limits, model tiering, and resource tracking.
"""

from .spawner import SubagentSpawner, SubagentConfig
from .subagent import Subagent, SubagentResult, SubagentStatus
from .result_collector import ResultCollector

__all__ = [
    "SubagentSpawner",
    "SubagentConfig",
    "Subagent",
    "SubagentResult",
    "SubagentStatus",
    "ResultCollector",
]
