"""
Consensus Review Graph Module
Creates LangGraph for parallel multi-reviewer consensus.

Based on Grok's Consensus Pattern from LANGGRAPH-ENHANCEMENT-PLAN.md

Graph Flow:
START → [qa_reviewer, security_reviewer, architecture_reviewer] → consensus → router → END
"""

from typing import Dict, Any
from langgraph.graph import StateGraph, END
from langgraph.graph.state import CompiledStateGraph

from .aggregator import consensus_aggregator
from .router import consensus_router


def qa_reviewer_stub(state: Dict[str, Any]) -> Dict[str, Any]:
    """Stub for QA reviewer - actual implementation in nodes/reviewers.py"""
    from nodes.reviewers import qa_reviewer_node
    return qa_reviewer_node(state)


def security_reviewer_stub(state: Dict[str, Any]) -> Dict[str, Any]:
    """Stub for Security reviewer - actual implementation in nodes/reviewers.py"""
    from nodes.reviewers import security_reviewer_node
    return security_reviewer_node(state)


def architecture_reviewer_stub(state: Dict[str, Any]) -> Dict[str, Any]:
    """Stub for Architecture reviewer - actual implementation in nodes/reviewers.py"""
    from nodes.reviewers import architecture_reviewer_node
    return architecture_reviewer_node(state)


class ConsensusGraphState(Dict[str, Any]):
    """State type for consensus graph"""
    pass


def create_consensus_graph() -> StateGraph:
    """
    Create a consensus review graph.

    Flow:
    fan_out → [qa_reviewer, security_reviewer, architecture_reviewer] → consensus → router

    Returns:
        StateGraph configured with multi-reviewer consensus
    """
    graph = StateGraph(ConsensusGraphState)

    # Add reviewer nodes
    graph.add_node("qa_reviewer", qa_reviewer_stub)
    graph.add_node("security_reviewer", security_reviewer_stub)
    graph.add_node("architecture_reviewer", architecture_reviewer_stub)

    # Add consensus aggregator
    graph.add_node("consensus", consensus_aggregator)

    # Set entry point - start with QA (in real impl would be parallel)
    graph.set_entry_point("qa_reviewer")

    # Sequential flow for skeleton (parallel would require special handling)
    # QA → Security → Architecture → Consensus
    graph.add_edge("qa_reviewer", "security_reviewer")
    graph.add_edge("security_reviewer", "architecture_reviewer")
    graph.add_edge("architecture_reviewer", "consensus")

    # Route based on consensus
    graph.add_conditional_edges(
        "consensus",
        consensus_router,
        {
            "merge": END,
            "escalate_human": END,
            "failed": END,
        }
    )

    return graph


def compile_consensus_graph(checkpointer=None) -> CompiledStateGraph:
    """
    Compile the consensus review graph.

    Args:
        checkpointer: Optional checkpointer for state persistence

    Returns:
        Compiled graph ready for execution
    """
    graph = create_consensus_graph()
    return graph.compile(checkpointer=checkpointer)


__all__ = [
    "create_consensus_graph",
    "compile_consensus_graph",
    "ConsensusGraphState",
]
