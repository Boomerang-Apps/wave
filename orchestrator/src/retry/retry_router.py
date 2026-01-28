"""
Retry Router Module
Routes QA results to dev-fix, escalation, or approval.

Based on Grok's Cyclic Retry Pattern from LANGGRAPH-ENHANCEMENT-PLAN.md
"""

from typing import Dict, Any, Literal

# Router return types
RetryRoute = Literal["cto_master", "dev_fix", "escalate_human", "failed"]

# Safety score threshold for escalation
SAFETY_ESCALATION_THRESHOLD = 0.3


def qa_retry_router(state: Dict[str, Any]) -> RetryRoute:
    """
    Route after QA validation.

    Routing logic:
    - QA passed → cto_master (proceed to approval)
    - Safety violation (score < 0.3) → escalate_human
    - Max retries reached → escalate_human
    - QA failed, retries available → dev_fix (retry cycle)
    - Unrecoverable error → failed

    Args:
        state: Current workflow state

    Returns:
        Route name: "cto_master", "dev_fix", "escalate_human", or "failed"
    """
    # Check if QA passed
    qa_passed = state.get("qa_passed", False)
    if qa_passed:
        return "cto_master"

    # Get retry state
    retry = state.get("retry", {})
    retry_count = retry.get("count", 0)
    max_retries = retry.get("max_retries", 7)  # Grok: temporarily increased to 7

    # Get safety state
    safety = state.get("safety", {})
    safety_score = safety.get("constitutional_score", 1.0)

    # Check for safety violation - escalate immediately
    if safety_score < SAFETY_ESCALATION_THRESHOLD:
        return "escalate_human"

    # Check for unrecoverable error
    if state.get("unrecoverable", False):
        return "failed"

    # Check if max retries reached
    if retry_count >= max_retries:
        return "escalate_human"

    # Retry available - go to dev-fix
    return "dev_fix"


def should_escalate(state: Dict[str, Any]) -> bool:
    """
    Determine if the workflow should escalate to human.

    Args:
        state: Current workflow state

    Returns:
        True if escalation needed
    """
    route = qa_retry_router(state)
    return route == "escalate_human"


def get_escalation_reason(state: Dict[str, Any]) -> str:
    """
    Get the reason for escalation.

    Args:
        state: Current workflow state

    Returns:
        Human-readable escalation reason
    """
    retry = state.get("retry", {})
    retry_count = retry.get("count", 0)
    max_retries = retry.get("max_retries", 7)  # Grok: temporarily increased to 7

    safety = state.get("safety", {})
    safety_score = safety.get("constitutional_score", 1.0)

    if safety_score < SAFETY_ESCALATION_THRESHOLD:
        return f"Safety violation: constitutional score {safety_score:.2f} below threshold {SAFETY_ESCALATION_THRESHOLD}"

    if retry_count >= max_retries:
        last_error = retry.get("last_error", "Unknown error")
        return f"Max retries ({max_retries}) exceeded. Last error: {last_error}"

    return "Unknown escalation reason"


__all__ = [
    "qa_retry_router",
    "should_escalate",
    "get_escalation_reason",
    "SAFETY_ESCALATION_THRESHOLD",
    "RetryRoute",
]
