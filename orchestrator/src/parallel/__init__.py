"""
WAVE Parallel Execution Module

Provides parallel domain execution using Map/Reduce pattern.
Fan-out to multiple domains, fan-in to aggregate results.

Based on Grok's Parallel Execution Pattern from LANGGRAPH-ENHANCEMENT-PLAN.md

Phase 7 Enhancement: Native LangGraph Parallel Pattern
- Topological sort for domain dependencies
- Layer-based parallel execution
- Native StateGraph integration
"""

from .parallel_state import (
    ParallelState,
    DomainResult,
    create_parallel_state,
    create_parallel_state_with_deps,
)
from .dispatcher import (
    fan_out_dispatcher,
    create_domain_tasks,
    execute_domains_parallel,
    execute_single_domain,
)
from .aggregator import (
    fan_in_aggregator,
    merge_files_modified,
    aggregate_test_results,
    combine_budget_usage,
    handle_domain_errors,
    should_continue_after_failure,
)
from .parallel_graph import (
    create_parallel_graph,
    compile_parallel_graph,
    should_use_parallel,
    route_to_parallel,
    parallel_executor_node,
)
# Phase 7: Dependency-aware parallel execution
from .dependency_sort import (
    topological_sort_domains,
    compute_execution_layers,
    detect_circular_dependencies,
    validate_dependencies,
    dependency_sort_node,
)
from .layer_executor import (
    execute_layer,
    execute_layer_parallel,
    layer_execution_node,
    should_continue_layers,
)
from .native_parallel_graph import (
    create_native_parallel_graph,
    compile_native_parallel_graph,
)

__all__ = [
    # State
    "ParallelState",
    "DomainResult",
    "create_parallel_state",
    "create_parallel_state_with_deps",
    # Dispatcher (Fan-Out)
    "fan_out_dispatcher",
    "create_domain_tasks",
    "execute_domains_parallel",
    "execute_single_domain",
    # Aggregator (Fan-In)
    "fan_in_aggregator",
    "merge_files_modified",
    "aggregate_test_results",
    "combine_budget_usage",
    "handle_domain_errors",
    "should_continue_after_failure",
    # Graph (Phase 2)
    "create_parallel_graph",
    "compile_parallel_graph",
    "should_use_parallel",
    "route_to_parallel",
    "parallel_executor_node",
    # Phase 7: Dependency Sort
    "topological_sort_domains",
    "compute_execution_layers",
    "detect_circular_dependencies",
    "validate_dependencies",
    "dependency_sort_node",
    # Phase 7: Layer Executor
    "execute_layer",
    "execute_layer_parallel",
    "layer_execution_node",
    "should_continue_layers",
    # Phase 7: Native Parallel Graph
    "create_native_parallel_graph",
    "compile_native_parallel_graph",
]
