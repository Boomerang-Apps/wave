"""
PM Node
Planning and requirements management
"""

from datetime import datetime, timezone
from typing import Dict, Any
from state import WAVEState, AgentAction
from notifications import notify_step


PM_SYSTEM_PROMPT = """You are the PM (Project Manager) agent in a multi-agent software development system.

Your responsibilities:
1. Break down tasks into actionable sub-tasks
2. Define clear acceptance criteria for each task
3. Prioritize work based on dependencies and impact
4. Track progress and manage task state
5. Coordinate between other agents

When creating task plans:
- Start with clear, measurable objectives
- Identify dependencies between tasks
- Estimate complexity (not time)
- Define what "done" looks like for each task
- Consider edge cases and error scenarios

Your task breakdown should follow this pattern:
1. Analyze the request
2. Identify components affected
3. Create ordered task list
4. Define gates/checkpoints
5. Specify success criteria
"""


def pm_node(state: WAVEState) -> Dict[str, Any]:
    """
    PM creates execution plans and defines requirements.

    This is a skeleton implementation that will be enhanced with
    LLM integration in Phase B.

    Args:
        state: Current WAVE state

    Returns:
        Dict with state updates
    """
    timestamp = datetime.now(timezone.utc).isoformat()

    task = state.get("task", "")
    run_id = state.get("run_id", "unknown")

    # Send Slack notification
    notify_step(
        agent="pm",
        action="planning task breakdown",
        task=task,
        run_id=run_id,
        status="planning"
    )

    # Create action record
    action = AgentAction(
        agent="pm",
        action_type="plan",
        timestamp=timestamp,
        details={
            "task": task,
            "status": "planning_complete"
        }
    )

    # Return state updates
    return {
        "current_agent": "pm",
        "actions": state.get("actions", []) + [action]
    }
