"""
WAVE Orchestrator Agent Nodes
Multi-agent system with CTO, PM, Dev, QA, Supervisor, and Safety Gate

Phase 8 Enhancement: Parallel Dev Agents (fe-dev/be-dev)
"""

from typing import Dict, Any
from .cto import cto_node, CTO_SYSTEM_PROMPT
from .pm import pm_node, PM_SYSTEM_PROMPT
from .dev import dev_node, DEV_SYSTEM_PROMPT
from .qa import qa_node, QA_SYSTEM_PROMPT
from .supervisor import supervisor_node, SUPERVISOR_SYSTEM_PROMPT, route_to_agent
from .safety_gate import safety_gate_node, check_safety_and_decide
from tools.constitutional_scorer import evaluate_tool_call
# Phase 8: Parallel Dev Agents
from .dev_agents import fe_dev_node, be_dev_node, dev_agent_node

# All agent roles in the system
AGENT_ROLES = ("cto", "pm", "dev", "qa", "supervisor", "safety_gate")


def safe_tool_call(
    state: Dict[str, Any],
    tool_name: str,
    tool_args: Dict[str, Any],
    context: str = ""
) -> Dict[str, Any]:
    """
    Wrapper for tool calls that evaluates safety before execution.

    This function should be called before any tool execution
    to ensure constitutional AI principles are respected.

    Args:
        state: Current WAVE state
        tool_name: Name of the tool to call
        tool_args: Arguments for the tool
        context: Additional context for evaluation

    Returns:
        {
            "success": bool,  # If allowed and executed
            "blocked": bool,  # If blocked by safety
            "result": any,    # Tool result if executed
            "violations": list,  # Any violations found
            "score": float    # Safety score
        }
    """
    # Build context from state
    full_context = f"Project: {state.get('run_id', 'unknown')}, Task: {state.get('task', '')} {context}"

    # Evaluate the tool call
    evaluation = evaluate_tool_call(tool_name, tool_args, full_context)

    if not evaluation["allowed"]:
        # Blocked by constitutional scorer
        return {
            "success": False,
            "blocked": True,
            "result": None,
            "violations": evaluation["violations"],
            "risks": evaluation["risks"],
            "score": evaluation["score"]
        }

    # Tool is allowed - in skeleton, we don't actually execute
    # Real execution will be added in Phase C
    return {
        "success": True,
        "blocked": False,
        "result": f"[Skeleton] Would execute {tool_name}",
        "violations": [],
        "risks": evaluation["risks"],
        "score": evaluation["score"],
        "requires_review": evaluation["requires_review"]
    }


__all__ = [
    "cto_node",
    "pm_node",
    "dev_node",
    "qa_node",
    "supervisor_node",
    "safety_gate_node",
    "safe_tool_call",
    "route_to_agent",
    "check_safety_and_decide",
    "AGENT_ROLES",
    "CTO_SYSTEM_PROMPT",
    "PM_SYSTEM_PROMPT",
    "DEV_SYSTEM_PROMPT",
    "QA_SYSTEM_PROMPT",
    "SUPERVISOR_SYSTEM_PROMPT",
    # Phase 8: Parallel Dev Agents
    "fe_dev_node",
    "be_dev_node",
    "dev_agent_node",
]
