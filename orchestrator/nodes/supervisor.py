"""
Supervisor Node
Orchestration decisions and routing

Enhanced with Hierarchical Supervisor Pattern (Phase 1):
- Analyzes tasks to detect relevant domains
- Delegates to domain sub-graphs when appropriate
- Coordinates multi-domain execution
"""

from datetime import datetime, timezone
from typing import Dict, Any, Literal, List
from state import WAVEState, AgentAction
from src.domains.domain_router import analyze_story_domains


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

    Enhanced with Hierarchical Supervisor Pattern (Phase 1):
    - Analyzes task to detect relevant domains
    - Includes domain information in routing decisions
    - Sets domain field for downstream processing

    Args:
        state: Current WAVE state

    Returns:
        Dict with state updates including routing decision and domain analysis
    """
    timestamp = datetime.now(timezone.utc).isoformat()

    # Analyze task to detect relevant domains (Phase 1: Hierarchical Supervisor)
    task = state.get("task", "")
    detected_domains: List[str] = analyze_story_domains(task)
    primary_domain = detected_domains[0] if detected_domains else ""

    # Determine next agent
    next_agent = route_to_agent(state)

    # Create action record with domain analysis
    action = AgentAction(
        agent="supervisor",
        action_type="route",
        timestamp=timestamp,
        details={
            "next_agent": next_agent,
            "current_agent": state.get("current_agent"),
            "domains_detected": detected_domains,
            "primary_domain": primary_domain,
            "status": "hierarchical_supervisor"
        }
    )

    # Return state updates including domain
    return {
        "current_agent": "supervisor",
        "domain": primary_domain,
        "actions": state.get("actions", []) + [action]
    }
