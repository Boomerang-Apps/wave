"""
Review State Module
State schemas for multi-reviewer consensus pattern.

Based on Grok's Consensus Pattern from LANGGRAPH-ENHANCEMENT-PLAN.md
"""

from typing import TypedDict, List, Literal, Optional


# Consensus result types
ConsensusResult = Literal["approved", "rejected", "human_review"]


class ReviewResult(TypedDict):
    """
    Result from a single reviewer.

    Each reviewer (QA, Security, Architecture) produces this structure.
    """
    # Reviewer identifier
    reviewer: str

    # Approval decision
    approved: bool

    # Score between 0.0 and 1.0
    score: float

    # Feedback text
    feedback: str


class ConsensusState(TypedDict):
    """
    State for consensus aggregation.

    Collects all review results and produces final consensus.
    """
    # List of all review results
    reviews: List[ReviewResult]

    # Final consensus result
    consensus_result: ConsensusResult

    # Average score across all reviews
    average_score: float

    # Combined feedback
    combined_feedback: str

    # Reason for the consensus decision
    reason: str


def create_review_result(
    reviewer: str,
    approved: bool,
    score: float,
    feedback: str = "",
) -> ReviewResult:
    """
    Factory function to create a review result.

    Args:
        reviewer: Reviewer identifier (qa, security, architecture)
        approved: Whether the reviewer approved
        score: Review score (0.0 to 1.0)
        feedback: Optional feedback text

    Returns:
        ReviewResult dict
    """
    return ReviewResult(
        reviewer=reviewer,
        approved=approved,
        score=max(0.0, min(1.0, score)),  # Clamp to [0, 1]
        feedback=feedback,
    )


def create_consensus_state() -> ConsensusState:
    """
    Factory function to create initial consensus state.

    Returns:
        Empty ConsensusState ready to collect reviews
    """
    return ConsensusState(
        reviews=[],
        consensus_result="rejected",
        average_score=0.0,
        combined_feedback="",
        reason="",
    )


__all__ = [
    "ReviewResult",
    "ConsensusState",
    "ConsensusResult",
    "create_review_result",
    "create_consensus_state",
]
