"""
WAVE LangGraph Definition
Multi-agent graph with checkpointing and safety gate

Nodes: Supervisor -> PM -> CTO -> Dev -> Safety Gate -> QA -> END
Conditional routing based on supervisor decisions
Safety gate validates constitutional AI compliance

Story: WAVE-P1-003 - Session recovery integration
"""

from typing import Optional
from uuid import UUID

from langgraph.graph import StateGraph, END
from langgraph.graph.state import CompiledStateGraph
from sqlalchemy.orm import Session

from state import WAVEState
from nodes.supervisor import supervisor_node, route_to_agent
from nodes.cto import cto_node
from nodes.pm import pm_node
from nodes.dev import dev_node
from nodes.qa import qa_node
from nodes.safety_gate import safety_gate_node
from src.checkpoint import WAVECheckpointSaver


def create_wave_graph() -> StateGraph:
    """
    Create the WAVE multi-agent graph.

    The graph follows this flow:
    1. Supervisor evaluates state and routes
    2. PM creates/updates plan
    3. CTO reviews architecture
    4. Dev implements code
    5. Safety Gate validates constitutional compliance
    6. QA validates implementation
    7. Loop back to supervisor or END

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
    graph.add_node("safety_gate", safety_gate_node)
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

    # PM and CTO route back to supervisor
    graph.add_edge("pm", "supervisor")
    graph.add_edge("cto", "supervisor")

    # Dev routes through safety gate
    graph.add_edge("dev", "safety_gate")

    # Safety gate routes to QA (or could route to END if blocked)
    graph.add_edge("safety_gate", "qa")

    # QA routes back to supervisor
    graph.add_edge("qa", "supervisor")

    return graph


def compile_wave_graph(
    checkpointer=None,
    db: Optional[Session] = None,
    session_id: Optional[UUID] = None
) -> CompiledStateGraph:
    """
    Compile the WAVE graph with optional checkpointer.

    Args:
        checkpointer: Optional checkpointer for state persistence
        db: Optional database session for WAVECheckpointSaver
        session_id: Optional session ID for WAVECheckpointSaver

    Returns:
        Compiled graph ready for execution

    Note:
        If db and session_id are provided but checkpointer is None,
        a WAVECheckpointSaver will be created automatically.
    """
    graph = create_wave_graph()

    # Auto-create WAVE checkpointer if db and session_id provided
    if checkpointer is None and db is not None and session_id is not None:
        checkpointer = WAVECheckpointSaver(db, session_id)

    return graph.compile(checkpointer=checkpointer)


def create_wave_graph_with_recovery(
    db: Session,
    session_id: UUID
) -> CompiledStateGraph:
    """
    Create WAVE graph with session recovery enabled.

    Args:
        db: Database session
        session_id: WAVE session ID

    Returns:
        Compiled graph with checkpoint persistence
    """
    checkpointer = WAVECheckpointSaver(db, session_id)
    return compile_wave_graph(checkpointer=checkpointer)


# Pre-compiled graph instance for import (without checkpointer)
# For production use, create graph with create_wave_graph_with_recovery()
wave_graph: CompiledStateGraph = compile_wave_graph()


__all__ = [
    "create_wave_graph",
    "compile_wave_graph",
    "create_wave_graph_with_recovery",
    "wave_graph"
]
