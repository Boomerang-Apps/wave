"""
Supervisor Node
Orchestration decisions and routing
"""

from datetime import datetime, timezone
from typing import Dict, Any, Literal
from state import WAVEState, AgentAction


SUPERVISOR_SYSTEM_PROMPT = """You are the Supervisor agent in a multi-agent software development system.

Your responsibilities:
1. Coordinate the workflow between agents (CTO, PM, Dev, QA)
2. Decide which agent should act next based on current state
3. Determine when a task is complete
4. Handle errors and decide on recovery actions
5. Manage the overall task progression through gates

Routing logic:
- New task → PM (for planning)
- Plan ready → CTO (for architecture review)
- Architecture approved → Dev (for implementation)
- Code complete → QA (for testing)
- Tests pass → CTO (for final approval)
- Final approval → END

State-based decisions:
- Check current_agent to know who just acted
- Check actions to see task history
- Check gates to know progression status
- Check safety for any violations
- Check budget for resource limits

Always ensure:
- Tasks progress through proper gates
- No agent acts twice in a row without reason
- Errors are escalated appropriately
- Budget limits are respected
"""


AgentRoute = Literal["cto", "pm", "dev", "qa", "supervisor", "END"]


def route_to_agent(state: WAVEState) -> AgentRoute:
    """
    Determine which agent should act next based on state.

    This implements a simple round-robin for the skeleton.
    Will be enhanced with LLM-based routing in Phase B.

    Args:
        state: Current WAVE state

    Returns:
        Name of next agent or "END"
    """
    status = state.get("status", "pending")

    # If completed or failed, end
    if status in ("completed", "failed", "cancelled"):
        return "END"

    # Look at actions to find last non-supervisor agent
    actions = state.get("actions", [])

    # Find the last agent that wasn't supervisor
    last_agent = None
    for action in reversed(actions):
        if action.get("agent") != "supervisor":
            last_agent = action.get("agent")
            break

    # Simple routing logic for skeleton: PM -> CTO -> Dev -> QA -> END
    if last_agent is None:
        return "pm"
    elif last_agent == "pm":
        return "cto"
    elif last_agent == "cto":
        return "dev"
    elif last_agent == "dev":
        return "qa"
    elif last_agent == "qa":
        return "END"

    return "END"


def supervisor_node(state: WAVEState) -> Dict[str, Any]:
    """
    Supervisor decides next action based on state.

    This is a skeleton implementation that will be enhanced with
    LLM integration in Phase B.

    Args:
        state: Current WAVE state

    Returns:
        Dict with state updates including routing decision
    """
    timestamp = datetime.now(timezone.utc).isoformat()

    # Determine next agent
    next_agent = route_to_agent(state)

    # Create action record
    action = AgentAction(
        agent="supervisor",
        action_type="route",
        timestamp=timestamp,
        details={
            "next_agent": next_agent,
            "current_agent": state.get("current_agent"),
            "status": "skeleton_implementation"
        }
    )

    # Return state updates
    return {
        "current_agent": "supervisor",
        "actions": state.get("actions", []) + [action]
    }
