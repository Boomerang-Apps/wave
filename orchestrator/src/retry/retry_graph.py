"""
Retry Graph Module
Creates LangGraph with dev-fix cycle and human escalation.

Based on Grok's Cyclic Retry Pattern from LANGGRAPH-ENHANCEMENT-PLAN.md

Graph Flow:
dev → constitutional → qa → [dev_fix (cycle) | cto_master | escalate_human]
"""

from typing import Dict, Any
from langgraph.graph import StateGraph, END
from langgraph.graph.state import CompiledStateGraph

from .retry_router import qa_retry_router


def dev_fix_node_stub(state: Dict[str, Any]) -> Dict[str, Any]:
    """Stub for dev_fix node - actual implementation in nodes/dev_fix.py"""
    from nodes.dev_fix import dev_fix_node
    return dev_fix_node(state)


def human_escalation_stub(state: Dict[str, Any]) -> Dict[str, Any]:
    """Stub for human escalation - actual implementation in nodes/human_escalation.py"""
    from nodes.human_escalation import human_escalation_node
    return human_escalation_node(state)


def qa_stub(state: Dict[str, Any]) -> Dict[str, Any]:
    """Stub for QA node"""
    return {"current_agent": "qa"}


def constitutional_stub(state: Dict[str, Any]) -> Dict[str, Any]:
    """Stub for constitutional check node"""
    return {"current_agent": "constitutional"}


def cto_master_stub(state: Dict[str, Any]) -> Dict[str, Any]:
    """Stub for CTO master node"""
    return {"current_agent": "cto_master"}


class RetryGraphState(Dict[str, Any]):
    """State type for retry graph"""
    pass


def create_retry_graph() -> StateGraph:
    """
    Create a retry cycle graph.

    Flow:
    qa → [router] → dev_fix → constitutional → qa (cycle)
                 → cto_master → END
                 → escalate_human → END

    Returns:
        StateGraph configured with retry cycle
    """
    graph = StateGraph(RetryGraphState)

    # Add nodes
    graph.add_node("qa", qa_stub)
    graph.add_node("dev_fix", dev_fix_node_stub)
    graph.add_node("constitutional", constitutional_stub)
    graph.add_node("cto_master", cto_master_stub)
    graph.add_node("escalate_human", human_escalation_stub)

    # Set entry point
    graph.set_entry_point("qa")

    # QA routes based on result
    graph.add_conditional_edges(
        "qa",
        qa_retry_router,
        {
            "cto_master": "cto_master",
            "dev_fix": "dev_fix",
            "escalate_human": "escalate_human",
            "failed": END,
        }
    )

    # Dev-fix goes to constitutional (re-check safety)
    graph.add_edge("dev_fix", "constitutional")

    # Constitutional goes back to QA (retry cycle)
    graph.add_edge("constitutional", "qa")

    # CTO master and escalation end the graph
    graph.add_edge("cto_master", END)
    graph.add_edge("escalate_human", END)

    return graph


def compile_retry_graph(checkpointer=None) -> CompiledStateGraph:
    """
    Compile the retry graph.

    Args:
        checkpointer: Optional checkpointer for state persistence

    Returns:
        Compiled graph ready for execution
    """
    graph = create_retry_graph()
    return graph.compile(checkpointer=checkpointer)


__all__ = [
    "create_retry_graph",
    "compile_retry_graph",
    "RetryGraphState",
]
