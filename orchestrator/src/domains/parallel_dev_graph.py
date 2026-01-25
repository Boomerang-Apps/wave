"""
Parallel Dev Graph Module
LangGraph StateGraph for parallel frontend/backend developer execution.

Based on Grok's Parallel Domain Execution Recommendations

Architecture:
  START → [fe_dev || be_dev] → merge_results → END
"""

from typing import Optional
from langgraph.graph import StateGraph, END
from langgraph.checkpoint.base import BaseCheckpointSaver
from langgraph.graph.state import CompiledStateGraph

from .dev_agent_state import DomainDevState
from .dev_merger import merge_dev_results

# Import dev nodes from nodes package
import sys
import os
# Add project root to path for nodes import
project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if project_root not in sys.path:
    sys.path.insert(0, project_root)

from nodes.dev_agents import fe_dev_node, be_dev_node


def fe_dev_wrapper(state: DomainDevState) -> dict:
    """Wrapper for fe_dev_node that updates dev_results."""
    result = fe_dev_node(state)
    existing_results = list(state.get("dev_results", []))
    existing_results.append(result)
    return {"dev_results": existing_results}


def be_dev_wrapper(state: DomainDevState) -> dict:
    """Wrapper for be_dev_node that updates dev_results."""
    result = be_dev_node(state)
    existing_results = list(state.get("dev_results", []))
    existing_results.append(result)
    return {"dev_results": existing_results}


def create_parallel_dev_graph() -> StateGraph:
    """
    Create the parallel dev execution StateGraph.

    Graph structure:
    1. fe_dev: Execute frontend development
    2. be_dev: Execute backend development (parallel with fe_dev)
    3. merge_results: Aggregate results from both devs

    Note: True parallelism would use LangGraph's Send() or .map() pattern.
    This simplified version runs sequentially but structures the graph
    for parallel semantics.

    Returns:
        StateGraph configured for parallel dev execution
    """
    # Create graph with DomainDevState schema
    graph = StateGraph(DomainDevState)

    # Add nodes
    graph.add_node("fe_dev", fe_dev_wrapper)
    graph.add_node("be_dev", be_dev_wrapper)
    graph.add_node("merge_results", merge_dev_results)

    # Set entry point - both devs start from entry
    graph.set_entry_point("fe_dev")

    # Add edges
    # fe_dev → be_dev (sequential for simplicity, would be parallel with Send())
    graph.add_edge("fe_dev", "be_dev")
    # be_dev → merge_results
    graph.add_edge("be_dev", "merge_results")
    # merge_results → END
    graph.add_edge("merge_results", END)

    return graph


def compile_parallel_dev_graph(
    checkpointer: Optional[BaseCheckpointSaver] = None
) -> CompiledStateGraph:
    """
    Compile the parallel dev graph for execution.

    Args:
        checkpointer: Optional checkpointer for state persistence

    Returns:
        Compiled StateGraph ready for invocation
    """
    graph = create_parallel_dev_graph()

    if checkpointer:
        return graph.compile(checkpointer=checkpointer)
    else:
        return graph.compile()


__all__ = [
    "create_parallel_dev_graph",
    "compile_parallel_dev_graph",
]
