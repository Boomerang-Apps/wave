"""
Interrupt Handler Module
Functions for creating and processing escalation requests.

Based on Grok's Human-in-the-Loop Pattern from LANGGRAPH-ENHANCEMENT-PLAN.md
"""

from datetime import datetime, timezone
from typing import Dict, Any, Optional

from .interrupt_state import EscalationRequest, create_escalation_request


def create_escalation_context(
    state: Dict[str, Any],
    reason: str
) -> Dict[str, Any]:
    """
    Create escalation context from current state.

    Extracts relevant information for human reviewer.

    Args:
        state: Current workflow state
        reason: Reason for escalation

    Returns:
        Dict with escalation context
    """
    timestamp = datetime.now(timezone.utc).isoformat()

    # Extract relevant context from state
    context = {
        "run_id": state.get("run_id", "unknown"),
        "reason": reason,
        "timestamp": timestamp,
    }

    # Add QA feedback if present
    if "qa_feedback" in state:
        context["qa_feedback"] = state["qa_feedback"]

    # Add retry info if present
    if "retry" in state:
        retry = state["retry"]
        context["retry_count"] = retry.get("count", 0)
        context["max_retries"] = retry.get("max_retries", 3)
        context["last_error"] = retry.get("last_error", "")

    # Add safety info if present
    if "safety" in state:
        safety = state["safety"]
        context["constitutional_score"] = safety.get("constitutional_score", 1.0)
        context["violations"] = safety.get("violations", [])

    # Add task info
    context["task"] = state.get("task", "")
    context["current_agent"] = state.get("current_agent", "")

    return context


def validate_human_decision(decision: Dict[str, Any]) -> Dict[str, Any]:
    """
    Validate human decision input.

    Checks that required fields are present and valid.

    Args:
        decision: Decision dict from human reviewer

    Returns:
        Dict with 'valid' bool and 'errors' list
    """
    errors = []

    # Check required fields
    if "approved" not in decision:
        errors.append("Missing required field: approved")
    elif not isinstance(decision.get("approved"), bool):
        errors.append("Field 'approved' must be a boolean")

    # Feedback is optional but should be string if present
    if "feedback" in decision and not isinstance(decision["feedback"], str):
        errors.append("Field 'feedback' must be a string")

    return {
        "valid": len(errors) == 0,
        "errors": errors,
    }


def process_human_decision(
    state: Dict[str, Any],
    decision: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Process human decision and update state.

    Args:
        state: Current workflow state
        decision: Validated human decision

    Returns:
        Dict with state updates
    """
    approved = decision.get("approved", False)
    feedback = decision.get("feedback", "")

    if approved:
        return {
            "human_approved": True,
            "human_feedback": feedback,
            "needs_human": False,
            "status": "running",
        }
    else:
        return {
            "human_approved": False,
            "human_feedback": feedback,
            "needs_human": False,
            "status": "cancelled",
        }


__all__ = [
    "create_escalation_context",
    "validate_human_decision",
    "process_human_decision",
]
