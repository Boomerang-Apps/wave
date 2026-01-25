"""
WAVE Consensus Module

Provides multi-reviewer consensus pattern for code review and approval.
Multiple reviewers (QA, Security, Architecture) vote, then aggregate for decision.

Based on Grok's Consensus Pattern from LANGGRAPH-ENHANCEMENT-PLAN.md
"""

from .review_state import (
    ReviewResult,
    ConsensusState,
    ConsensusResult,
    create_review_result,
    create_consensus_state,
)
from .aggregator import (
    consensus_aggregator,
    get_review_summary,
    APPROVAL_THRESHOLD,
    HUMAN_REVIEW_THRESHOLD,
)
from .router import (
    consensus_router,
    should_merge,
    needs_human_review,
    ConsensusRoute,
)
from .review_graph import (
    create_consensus_graph,
    compile_consensus_graph,
    ConsensusGraphState,
)

__all__ = [
    # State
    "ReviewResult",
    "ConsensusState",
    "ConsensusResult",
    "create_review_result",
    "create_consensus_state",
    # Aggregator
    "consensus_aggregator",
    "get_review_summary",
    "APPROVAL_THRESHOLD",
    "HUMAN_REVIEW_THRESHOLD",
    # Router
    "consensus_router",
    "should_merge",
    "needs_human_review",
    "ConsensusRoute",
    # Graph
    "create_consensus_graph",
    "compile_consensus_graph",
    "ConsensusGraphState",
]
