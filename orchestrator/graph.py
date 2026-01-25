"""
WAVE LangGraph Definition
Multi-agent graph with checkpointing

Nodes: Supervisor -> PM -> CTO -> Dev -> QA -> END
Conditional routing based on supervisor decisions
"""

from langgraph.graph import StateGraph, END
from langgraph.graph.state import CompiledStateGraph

from state import WAVEState
from nodes.supervisor import supervisor_node, route_to_agent
from nodes.cto import cto_node
from nodes.pm import pm_node
from nodes.dev import dev_node
from nodes.qa import qa_node


def create_wave_graph() -> StateGraph:
    """
    Create the WAVE multi-agent graph.

    The graph follows this flow:
    1. Supervisor evaluates state and routes
    2. PM creates/updates plan
    3. CTO reviews architecture
    4. Dev implements code
    5. QA validates implementation
    6. Loop back to supervisor or END

    Returns:
        StateGraph configured with all nodes and edges
    """
    # Create graph with WAVEState
    graph = StateGraph(WAVEState)

    # Add all agent nodes
    graph.add_node("supervisor", supervisor_node)
    graph.add_node("cto", cto_node)
    graph.add_node("pm", pm_node)
    graph.add_node("dev", dev_node)
    graph.add_node("qa", qa_node)

    # Set entry point - supervisor decides first action
    graph.set_entry_point("supervisor")

    # Add conditional edges from supervisor based on routing
    graph.add_conditional_edges(
        "supervisor",
        route_to_agent,
        {
            "pm": "pm",
            "cto": "cto",
            "dev": "dev",
            "qa": "qa",
            "END": END
        }
    )

    # Each agent routes back to supervisor for next decision
    graph.add_edge("pm", "supervisor")
    graph.add_edge("cto", "supervisor")
    graph.add_edge("dev", "supervisor")
    graph.add_edge("qa", "supervisor")

    return graph


def compile_wave_graph(checkpointer=None) -> CompiledStateGraph:
    """
    Compile the WAVE graph with optional checkpointer.

    Args:
        checkpointer: Optional checkpointer for state persistence

    Returns:
        Compiled graph ready for execution
    """
    graph = create_wave_graph()
    return graph.compile(checkpointer=checkpointer)


# Pre-compiled graph instance for import
wave_graph: CompiledStateGraph = compile_wave_graph()


__all__ = ["create_wave_graph", "compile_wave_graph", "wave_graph"]
