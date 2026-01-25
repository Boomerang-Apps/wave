"""
Human Loop Graph Module
Creates LangGraph for human-in-the-loop interrupt/resume flow.

Based on Grok's Human-in-the-Loop Pattern from LANGGRAPH-ENHANCEMENT-PLAN.md

Graph Flow:
START → work → [escalation needed?] → escalation → [wait for human] → resume → END
"""

from typing import Dict, Any, Literal
from langgraph.graph import StateGraph, END
from langgraph.graph.state import CompiledStateGraph

from .interrupt_handler import create_escalation_context
from .resume_handler import can_resume


# Router return types
HumanDecisionRoute = Literal["continue", "failed"]


def escalation_node(state: Dict[str, Any]) -> Dict[str, Any]:
    """
    Escalation node - prepares state for human review.

    This node is entered when human intervention is needed.
    It sets up the escalation context and pauses the workflow.

    Args:
        state: Current workflow state

    Returns:
        Dict with escalation state updates
    """
    reason = state.get("escalation_reason", "Unknown reason")

    # Create escalation context
    context = create_escalation_context(state, reason)

    return {
        "needs_human": True,
        "status": "paused",
        "escalation_context": context,
        "current_agent": "escalation",
    }


def resume_node(state: Dict[str, Any]) -> Dict[str, Any]:
    """
    Resume node - processes human decision and continues.

    This node is entered after human provides their decision.

    Args:
        state: State with human decision

    Returns:
        Dict with resume state updates
    """
    human_approved = state.get("human_approved", False)
    human_feedback = state.get("human_feedback", "")

    if human_approved:
        return {
            "needs_human": False,
            "status": "running",
            "current_agent": "resume",
            "human_feedback": human_feedback,
        }
    else:
        return {
            "needs_human": False,
            "status": "cancelled",
            "current_agent": "resume",
            "human_feedback": human_feedback,
        }


def human_decision_router(state: Dict[str, Any]) -> HumanDecisionRoute:
    """
    Route based on human decision.

    Args:
        state: State with human_approved field

    Returns:
        "continue" if approved, "failed" if rejected
    """
    if state.get("human_approved", False):
        return "continue"
    else:
        return "failed"


class HumanLoopGraphState(Dict[str, Any]):
    """State type for human loop graph"""
    pass


def create_human_loop_graph() -> StateGraph:
    """
    Create a human-in-the-loop graph.

    Flow:
    START → escalation → resume → router → END

    Returns:
        StateGraph configured for human interrupt/resume
    """
    graph = StateGraph(HumanLoopGraphState)

    # Add nodes
    graph.add_node("escalation", escalation_node)
    graph.add_node("resume", resume_node)

    # Set entry point
    graph.set_entry_point("escalation")

    # Escalation leads to resume (after human decision)
    graph.add_edge("escalation", "resume")

    # Route based on human decision
    graph.add_conditional_edges(
        "resume",
        human_decision_router,
        {
            "continue": END,
            "failed": END,
        }
    )

    return graph


def compile_human_loop_graph(checkpointer=None) -> CompiledStateGraph:
    """
    Compile the human loop graph.

    Args:
        checkpointer: Optional checkpointer for state persistence

    Returns:
        Compiled graph ready for execution
    """
    graph = create_human_loop_graph()
    return graph.compile(checkpointer=checkpointer)


__all__ = [
    "create_human_loop_graph",
    "compile_human_loop_graph",
    "human_decision_router",
    "escalation_node",
    "resume_node",
    "HumanLoopGraphState",
]
