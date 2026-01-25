"""
Native Parallel Graph Module
LangGraph StateGraph for dependency-aware parallel domain execution.

Based on Grok's Parallel Domain Execution Recommendations

Architecture:
  START → dependency_sort → layer_executor → [loop or done] → END
"""

from typing import Optional
from langgraph.graph import StateGraph, END
from langgraph.checkpoint.base import BaseCheckpointSaver
from langgraph.graph.state import CompiledStateGraph

from .parallel_state import ParallelState
from .dependency_sort import dependency_sort_node
from .layer_executor import layer_execution_node, should_continue_layers


def create_native_parallel_graph() -> StateGraph:
    """
    Create the native parallel execution StateGraph.

    Graph structure:
    1. dependency_sort: Topologically sort domains and compute execution layers
    2. layer_executor: Execute current layer, update state
    3. Conditional: loop back to layer_executor or proceed to end

    Returns:
        StateGraph configured for parallel execution
    """
    # Create graph with ParallelState schema
    graph = StateGraph(ParallelState)

    # Add nodes
    graph.add_node("dependency_sort", dependency_sort_node)
    graph.add_node("layer_executor", layer_execution_node)

    # Set entry point
    graph.set_entry_point("dependency_sort")

    # Add edges
    graph.add_edge("dependency_sort", "layer_executor")

    # Add conditional edge for layer loop
    graph.add_conditional_edges(
        "layer_executor",
        should_continue_layers,
        {
            "next_layer": "layer_executor",  # Loop back for next layer
            "done": END,  # All layers complete
        }
    )

    return graph


def compile_native_parallel_graph(
    checkpointer: Optional[BaseCheckpointSaver] = None
) -> CompiledStateGraph:
    """
    Compile the native parallel graph for execution.

    Args:
        checkpointer: Optional checkpointer for state persistence

    Returns:
        Compiled StateGraph ready for invocation
    """
    graph = create_native_parallel_graph()

    if checkpointer:
        return graph.compile(checkpointer=checkpointer)
    else:
        return graph.compile()


__all__ = [
    "create_native_parallel_graph",
    "compile_native_parallel_graph",
]
