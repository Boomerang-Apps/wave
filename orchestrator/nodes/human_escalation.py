"""
Human Escalation Node
Pauses workflow and requests human intervention.

Based on Grok's Human-in-the-Loop Pattern from LANGGRAPH-ENHANCEMENT-PLAN.md

Triggers when:
1. Max retries exceeded
2. Safety violation detected
3. Unrecoverable error encountered
4. Explicit escalation requested
"""

from datetime import datetime, timezone
from typing import Dict, Any

from src.retry.retry_router import get_escalation_reason


def human_escalation_node(state: Dict[str, Any]) -> Dict[str, Any]:
    """
    Human escalation node - pauses workflow for human review.

    Sets needs_human flag, records reason, and pauses workflow.
    Human can then approve, reject, or modify and continue.

    Args:
        state: Current workflow state

    Returns:
        Dict with state updates for human escalation
    """
    timestamp = datetime.now(timezone.utc).isoformat()

    # Get escalation reason
    reason = get_escalation_reason(state)

    # Get retry info for context
    retry = state.get("retry", {})
    retry_count = retry.get("count", 0)
    last_error = retry.get("last_error", "")

    # Get QA feedback for context
    qa_feedback = state.get("qa_feedback", "")

    # Build escalation context
    escalation_context = {
        "reason": reason,
        "retry_count": retry_count,
        "last_error": last_error,
        "qa_feedback": qa_feedback,
        "timestamp": timestamp,
    }

    return {
        "needs_human": True,
        "status": "paused",
        "escalation_reason": reason,
        "escalation_context": escalation_context,
        "current_agent": "human_escalation",
    }


def human_approval_node(state: Dict[str, Any]) -> Dict[str, Any]:
    """
    Human approval node - processes human decision after escalation.

    Args:
        state: State with human decision

    Returns:
        Dict with state updates based on human decision
    """
    human_approved = state.get("human_approved", False)

    if human_approved:
        return {
            "needs_human": False,
            "status": "running",
            "current_agent": "human_approval",
        }
    else:
        return {
            "needs_human": False,
            "status": "cancelled",
            "current_agent": "human_approval",
        }


__all__ = [
    "human_escalation_node",
    "human_approval_node",
]
