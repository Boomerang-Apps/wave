"""
Resume Handler Module
Functions for resuming paused workflows after human decision.

Based on Grok's Human-in-the-Loop Pattern from LANGGRAPH-ENHANCEMENT-PLAN.md
"""

from typing import Dict, Any, Optional

from .interrupt_handler import validate_human_decision, process_human_decision


def can_resume(state: Dict[str, Any]) -> bool:
    """
    Check if workflow can be resumed.

    A workflow can be resumed if:
    1. Status is 'paused'
    2. needs_human flag is True

    Args:
        state: Current workflow state

    Returns:
        True if workflow can be resumed
    """
    status = state.get("status", "")
    needs_human = state.get("needs_human", False)

    return status == "paused" and needs_human


def get_pending_escalation(state: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    Get pending escalation details.

    Args:
        state: Current workflow state

    Returns:
        Escalation context dict or None if no pending escalation
    """
    if not can_resume(state):
        return None

    return state.get("escalation_context", {})


def resume_workflow(
    state: Dict[str, Any],
    decision: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Resume a paused workflow with human decision.

    Args:
        state: Current workflow state (must be paused)
        decision: Human decision dict

    Returns:
        Dict with state updates for resume
    """
    # Validate decision
    validation = validate_human_decision(decision)
    if not validation["valid"]:
        return {
            "status": "paused",
            "needs_human": True,
            "resume_error": f"Invalid decision: {validation['errors']}",
        }

    # Process the decision
    updates = process_human_decision(state, decision)

    return updates


def get_resume_options() -> Dict[str, Any]:
    """
    Get available resume options for human reviewer.

    Returns:
        Dict describing available actions
    """
    return {
        "actions": [
            {
                "id": "approve",
                "label": "Approve",
                "description": "Approve and continue workflow",
            },
            {
                "id": "reject",
                "label": "Reject",
                "description": "Reject and cancel workflow",
            },
            {
                "id": "modify",
                "label": "Modify and Retry",
                "description": "Provide modifications and retry",
            },
        ],
        "requires_feedback": True,
    }


__all__ = [
    "can_resume",
    "get_pending_escalation",
    "resume_workflow",
    "get_resume_options",
]
