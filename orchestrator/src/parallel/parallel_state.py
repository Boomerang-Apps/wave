"""
Parallel Execution State Module
State schema for parallel domain execution (Map/Reduce pattern).

Based on Grok's Parallel Execution Pattern from LANGGRAPH-ENHANCEMENT-PLAN.md
"""

from typing import TypedDict, List, Dict, Any, Optional


class DomainResult(TypedDict):
    """Result from a single domain execution"""
    domain: str
    success: bool
    files_modified: List[str]
    tests_passed: bool
    budget_used: float
    error: Optional[str]
    critical: bool


class ParallelState(TypedDict):
    """
    State schema for parallel domain execution.

    Used when multiple domains need to be processed concurrently.
    """
    # Identification
    parent_run_id: str
    task: str

    # Domains to process in parallel
    domains: List[str]

    # Results from domain executions
    domain_results: List[DomainResult]

    # Aggregated results
    aggregated_files: List[str]
    all_tests_passed: bool
    total_budget_used: float

    # Execution status
    execution_started: bool
    execution_completed: bool

    # Error tracking
    failed_domains: List[str]
    partial_failure: bool


def create_parallel_state(
    parent_run_id: str,
    task: str,
    domains: List[str],
) -> ParallelState:
    """
    Factory function to create initial parallel state.

    Args:
        parent_run_id: ID of parent workflow run
        task: Task description
        domains: List of domains to process in parallel

    Returns:
        Initialized ParallelState
    """
    return ParallelState(
        parent_run_id=parent_run_id,
        task=task,
        domains=domains,
        domain_results=[],
        aggregated_files=[],
        all_tests_passed=False,
        total_budget_used=0.0,
        execution_started=False,
        execution_completed=False,
        failed_domains=[],
        partial_failure=False,
    )


__all__ = [
    "ParallelState",
    "DomainResult",
    "create_parallel_state",
]
