"""
Parallel Execution Graph Module
Creates LangGraph for parallel domain execution.

Based on Grok's Parallel Execution Pattern from LANGGRAPH-ENHANCEMENT-PLAN.md

Graph Flow:
START -> dispatcher (fan-out) -> [parallel domain execution] -> aggregator (fan-in) -> END
"""

from typing import Dict, Any
from langgraph.graph import StateGraph, END
from langgraph.graph.state import CompiledStateGraph

from .parallel_state import ParallelState
from .dispatcher import fan_out_dispatcher
from .aggregator import fan_in_aggregator


def should_use_parallel(state: Dict[str, Any]) -> bool:
    """
    Determine if parallel execution should be used.

    Args:
        state: Current state with domains_detected

    Returns:
        True if multiple domains detected, False otherwise
    """
    domains = state.get("domains_detected", [])
    if isinstance(domains, list):
        return len(domains) > 1
    return False


def route_to_parallel(state: Dict[str, Any]) -> str:
    """
    Route to parallel execution or single domain.

    Args:
        state: Current state

    Returns:
        "parallel" or "single" based on domain count
    """
    if should_use_parallel(state):
        return "parallel"
    return "single"


def parallel_executor_node(state: ParallelState) -> Dict[str, Any]:
    """
    Node that executes domains in parallel.

    This node runs the async parallel execution synchronously
    using asyncio.run().

    Args:
        state: Current parallel state

    Returns:
        Dict with domain_results
    """
    import asyncio
    from .dispatcher import execute_domains_parallel

    # Run async execution
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            # If we're already in an async context, create a new task
            import concurrent.futures
            with concurrent.futures.ThreadPoolExecutor() as executor:
                future = executor.submit(asyncio.run, execute_domains_parallel(state))
                results = future.result()
        else:
            results = asyncio.run(execute_domains_parallel(state))
    except RuntimeError:
        # No event loop, create one
        results = asyncio.run(execute_domains_parallel(state))

    return {
        "domain_results": results,
    }


def create_parallel_graph() -> StateGraph:
    """
    Create a parallel execution graph.

    Flow: dispatcher -> parallel_executor -> aggregator -> END

    Returns:
        StateGraph configured for parallel execution
    """
    # Create graph with ParallelState
    graph = StateGraph(ParallelState)

    # Add nodes
    graph.add_node("dispatcher", fan_out_dispatcher)
    graph.add_node("parallel_executor", parallel_executor_node)
    graph.add_node("aggregator", fan_in_aggregator)

    # Set entry point
    graph.set_entry_point("dispatcher")

    # Add edges: dispatcher -> executor -> aggregator -> END
    graph.add_edge("dispatcher", "parallel_executor")
    graph.add_edge("parallel_executor", "aggregator")
    graph.add_edge("aggregator", END)

    return graph


def compile_parallel_graph(checkpointer=None) -> CompiledStateGraph:
    """
    Compile the parallel execution graph.

    Args:
        checkpointer: Optional checkpointer for state persistence

    Returns:
        Compiled graph ready for execution
    """
    graph = create_parallel_graph()
    return graph.compile(checkpointer=checkpointer)


__all__ = [
    "create_parallel_graph",
    "compile_parallel_graph",
    "should_use_parallel",
    "route_to_parallel",
    "parallel_executor_node",
]
