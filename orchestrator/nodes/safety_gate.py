"""
Safety Gate Node
Checkpoint node that validates safety state before proceeding
"""

from datetime import datetime, timezone
from typing import Dict, Any
from state import WAVEState, AgentAction, SafetyState
from tools.constitutional_scorer import should_block, should_escalate


def safety_gate_node(state: WAVEState) -> Dict[str, Any]:
    """
    Safety checkpoint that evaluates current safety state.

    This node runs after potentially dangerous operations
    and can halt the graph if violations are detected.

    Args:
        state: Current WAVE state

    Returns:
        Dict with state updates
    """
    timestamp = datetime.now(timezone.utc).isoformat()

    # Get current safety state
    safety = state.get("safety", {})
    score = safety.get("constitutional_score", 1.0)
    violations = safety.get("violations", [])

    # Determine gate decision
    if should_block(score):
        # Block - too dangerous to continue
        new_status = "held"
        gate_decision = "block"
        hold_reason = f"Safety score {score:.2f} below threshold. Violations: {violations}"
    elif should_escalate(score):
        # Escalate - needs human review but can continue
        new_status = state.get("status", "running")
        gate_decision = "escalate"
        hold_reason = None
    else:
        # Pass - safe to continue
        new_status = state.get("status", "running")
        gate_decision = "pass"
        hold_reason = None

    # Create action record
    action = AgentAction(
        agent="safety_gate",
        action_type="evaluate",
        timestamp=timestamp,
        details={
            "score": score,
            "decision": gate_decision,
            "violations_count": len(violations),
            "status": new_status
        }
    )

    # Build result
    result = {
        "current_agent": "safety_gate",
        "actions": state.get("actions", []) + [action]
    }

    # Update status if blocking
    if gate_decision == "block":
        result["status"] = "held"

    return result


def check_safety_and_decide(state: WAVEState) -> str:
    """
    Routing function for safety gate.

    Returns next node based on safety evaluation.
    """
    safety = state.get("safety", {})
    score = safety.get("constitutional_score", 1.0)

    if should_block(score):
        return "END"  # Stop execution
    else:
        return "continue"  # Proceed to next node
