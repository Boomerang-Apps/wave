"""
WAVE Parallel Execution Module

Provides parallel domain execution using Map/Reduce pattern.
Fan-out to multiple domains, fan-in to aggregate results.

Based on Grok's Parallel Execution Pattern from LANGGRAPH-ENHANCEMENT-PLAN.md
"""

from .parallel_state import (
    ParallelState,
    DomainResult,
    create_parallel_state,
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

__all__ = [
    # State
    "ParallelState",
    "DomainResult",
    "create_parallel_state",
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
    # Graph
    "create_parallel_graph",
    "compile_parallel_graph",
    "should_use_parallel",
    "route_to_parallel",
    "parallel_executor_node",
]
