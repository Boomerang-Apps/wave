"""
Layer Executor Module
Execute domains in layers for dependency-respecting parallel execution.

Based on Grok's Parallel Domain Execution Recommendations

Executes domains layer-by-layer, where each layer contains domains
that have no dependencies on each other and can run in parallel.
"""

import asyncio
from typing import Dict, List, Any, Optional
from .parallel_state import ParallelState, DomainResult


async def execute_single_domain_async(
    domain: str,
    state: Dict[str, Any]
) -> DomainResult:
    """
    Execute a single domain asynchronously.

    This is a placeholder that should be replaced with actual domain execution.

    Args:
        domain: Domain name to execute
        state: Current parallel state

    Returns:
        DomainResult with execution outcome
    """
    # Placeholder implementation - actual execution would call domain agent
    return DomainResult(
        domain=domain,
        success=True,
        files_modified=[],
        tests_passed=True,
        budget_used=0.0,
        error=None,
        critical=False,
    )


async def execute_layer_parallel(
    domains: List[str],
    state: Dict[str, Any]
) -> List[DomainResult]:
    """
    Execute all domains in a layer in parallel.

    Args:
        domains: List of domains to execute in parallel
        state: Current parallel state

    Returns:
        List of DomainResult from all domain executions
    """
    if not domains:
        return []

    tasks = [execute_single_domain_async(domain, state) for domain in domains]
    results = await asyncio.gather(*tasks, return_exceptions=True)

    # Process results, converting exceptions to failed DomainResults
    processed_results = []
    for domain, result in zip(domains, results):
        if isinstance(result, Exception):
            processed_results.append(DomainResult(
                domain=domain,
                success=False,
                files_modified=[],
                tests_passed=False,
                budget_used=0.0,
                error=str(result),
                critical=True,
            ))
        else:
            processed_results.append(result)

    return processed_results


def execute_layer(state: ParallelState, layer_index: int) -> Dict[str, Any]:
    """
    Execute a specific layer of domains.

    Synchronous wrapper around async layer execution.

    Args:
        state: Current parallel state
        layer_index: Index of layer to execute

    Returns:
        Dict with layer execution results
    """
    execution_layers = state.get("execution_layers", [])

    if layer_index >= len(execution_layers):
        return {
            "layer_results": [],
            "layer_completed": True,
            "error": f"Layer index {layer_index} out of range",
        }

    domains = execution_layers[layer_index]

    # Run async execution in event loop
    try:
        loop = asyncio.get_event_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)

    results = loop.run_until_complete(execute_layer_parallel(domains, state))

    return {
        "layer_results": results,
        "layer_completed": True,
        "error": None,
    }


def layer_execution_node(state: Dict[str, Any]) -> Dict[str, Any]:
    """
    LangGraph node for layer execution.

    Executes the current layer and updates state for next iteration.

    Args:
        state: Current parallel state

    Returns:
        Dict with updated state fields
    """
    current_layer = state.get("current_layer", 0)
    execution_layers = state.get("execution_layers", [])
    existing_results = list(state.get("domain_results", []))

    # Check if we have layers to execute
    if not execution_layers or current_layer >= len(execution_layers):
        return {
            "execution_completed": True,
            "current_layer": current_layer,
        }

    # Execute current layer
    layer_result = execute_layer(state, current_layer)

    # Append results
    new_results = existing_results + layer_result.get("layer_results", [])

    # Check for failures
    layer_results = layer_result.get("layer_results", [])
    failed_in_layer = [r["domain"] for r in layer_results if not r.get("success", False)]
    existing_failed = list(state.get("failed_domains", []))
    all_failed = existing_failed + failed_in_layer

    # Compute aggregated values
    all_files = []
    total_budget = 0.0
    all_tests_passed = True

    for result in new_results:
        all_files.extend(result.get("files_modified", []))
        total_budget += result.get("budget_used", 0.0)
        if not result.get("tests_passed", True):
            all_tests_passed = False

    # Move to next layer
    next_layer = current_layer + 1
    is_completed = next_layer >= len(execution_layers)

    return {
        "domain_results": new_results,
        "current_layer": next_layer,
        "execution_started": True,
        "execution_completed": is_completed,
        "failed_domains": all_failed,
        "partial_failure": len(all_failed) > 0,
        "aggregated_files": list(set(all_files)),
        "total_budget_used": total_budget,
        "all_tests_passed": all_tests_passed,
    }


def should_continue_layers(state: Dict[str, Any]) -> str:
    """
    Conditional edge function for layer execution loop.

    Args:
        state: Current parallel state

    Returns:
        "next_layer" if more layers to execute, "done" otherwise
    """
    current_layer = state.get("current_layer", 0)
    execution_layers = state.get("execution_layers", [])
    execution_completed = state.get("execution_completed", False)

    if execution_completed or current_layer >= len(execution_layers):
        return "done"

    return "next_layer"


__all__ = [
    "execute_layer",
    "execute_layer_parallel",
    "layer_execution_node",
    "should_continue_layers",
]
