"""
Consensus Router Module
Routes based on consensus result.

Based on Grok's Consensus Pattern from LANGGRAPH-ENHANCEMENT-PLAN.md
"""

from typing import Dict, Any, Literal


# Router return types
ConsensusRoute = Literal["merge", "escalate_human", "failed"]


def consensus_router(state: Dict[str, Any]) -> ConsensusRoute:
    """
    Route based on consensus result.

    Routing logic:
    - "approved" → "merge" (proceed to merge)
    - "human_review" → "escalate_human" (needs human decision)
    - "rejected" → "failed" (reject the change)

    Args:
        state: Current state with consensus result

    Returns:
        Route name: "merge", "escalate_human", or "failed"
    """
    consensus = state.get("consensus", "rejected")

    if consensus == "approved":
        return "merge"
    elif consensus == "human_review":
        return "escalate_human"
    else:
        return "failed"


def should_merge(state: Dict[str, Any]) -> bool:
    """
    Check if the consensus allows merging.

    Args:
        state: Current state with consensus result

    Returns:
        True if approved for merge
    """
    return state.get("consensus") == "approved"


def needs_human_review(state: Dict[str, Any]) -> bool:
    """
    Check if human review is required.

    Args:
        state: Current state with consensus result

    Returns:
        True if human review needed
    """
    return state.get("consensus") == "human_review"


__all__ = [
    "consensus_router",
    "should_merge",
    "needs_human_review",
    "ConsensusRoute",
]
