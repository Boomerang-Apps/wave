"""
Consensus Aggregator Module
Aggregates votes from multiple reviewers and determines consensus.

Based on Grok's Consensus Pattern from LANGGRAPH-ENHANCEMENT-PLAN.md

Consensus Rules:
1. All reviewers must approve for auto-merge
2. Average score must be >= 0.8 (APPROVAL_THRESHOLD)
3. Any score < 0.5 (HUMAN_REVIEW_THRESHOLD) triggers human review
"""

from typing import Dict, Any, List

from .review_state import ConsensusResult


# Consensus thresholds
APPROVAL_THRESHOLD = 0.8
HUMAN_REVIEW_THRESHOLD = 0.5


def consensus_aggregator(state: Dict[str, Any]) -> Dict[str, Any]:
    """
    Aggregate votes from multiple reviewers.

    Collects review_qa, review_security, review_architecture and
    determines final consensus based on rules.

    Args:
        state: Current state with review results

    Returns:
        Dict with consensus result, avg_score, and reason
    """
    # Collect all reviews
    reviews = [
        state.get("review_qa", {}),
        state.get("review_security", {}),
        state.get("review_architecture", {}),
    ]

    # Filter out empty reviews
    reviews = [r for r in reviews if r]

    if not reviews:
        return {
            "consensus": "rejected",
            "avg_score": 0.0,
            "reason": "No reviews available",
        }

    # Check if all approved
    all_approved = all(r.get("approved", False) for r in reviews)

    # Calculate average score
    scores = [r.get("score", 0.0) for r in reviews]
    avg_score = sum(scores) / len(scores)

    # Check for any low scores (triggers human review)
    any_low_score = any(r.get("score", 1.0) < HUMAN_REVIEW_THRESHOLD for r in reviews)

    # Collect feedback
    feedback_list = [r.get("feedback", "") for r in reviews if r.get("feedback")]
    combined_feedback = "; ".join(feedback_list)

    # Apply consensus rules
    if any_low_score:
        return {
            "consensus": "human_review",
            "avg_score": avg_score,
            "reason": f"Low reviewer score detected (below {HUMAN_REVIEW_THRESHOLD})",
            "combined_feedback": combined_feedback,
        }

    if all_approved and avg_score >= APPROVAL_THRESHOLD:
        return {
            "consensus": "approved",
            "avg_score": avg_score,
            "reason": f"All reviewers approved with average score {avg_score:.2f}",
            "combined_feedback": combined_feedback,
        }

    # Not all approved or low average score
    if not all_approved:
        rejected_by = [r.get("reviewer", "unknown") for r in reviews if not r.get("approved", False)]
        return {
            "consensus": "rejected",
            "avg_score": avg_score,
            "reason": f"Rejected by: {', '.join(rejected_by)}",
            "combined_feedback": combined_feedback,
        }

    return {
        "consensus": "rejected",
        "avg_score": avg_score,
        "reason": f"Average score {avg_score:.2f} below threshold {APPROVAL_THRESHOLD}",
        "combined_feedback": combined_feedback,
    }


def get_review_summary(state: Dict[str, Any]) -> Dict[str, Any]:
    """
    Get a summary of all reviews.

    Args:
        state: Current state with review results

    Returns:
        Summary dict with review details
    """
    reviews = {
        "qa": state.get("review_qa", {}),
        "security": state.get("review_security", {}),
        "architecture": state.get("review_architecture", {}),
    }

    summary = {
        "total_reviews": sum(1 for r in reviews.values() if r),
        "all_approved": all(r.get("approved", False) for r in reviews.values() if r),
        "reviews": reviews,
    }

    return summary


__all__ = [
    "consensus_aggregator",
    "get_review_summary",
    "APPROVAL_THRESHOLD",
    "HUMAN_REVIEW_THRESHOLD",
]
