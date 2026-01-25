"""
Fan-In Aggregator Module
Aggregates results from parallel domain executions (Reduce pattern).

Based on Grok's Parallel Execution Pattern from LANGGRAPH-ENHANCEMENT-PLAN.md
"""

from typing import Dict, Any, List
from datetime import datetime, timezone

from .parallel_state import ParallelState, DomainResult


def merge_files_modified(domain_results: List[Dict[str, Any]]) -> List[str]:
    """
    Merge files_modified from all domain results.

    Args:
        domain_results: List of domain execution results

    Returns:
        Combined list of all modified files (deduplicated)
    """
    all_files = []
    for result in domain_results:
        files = result.get("files_modified", [])
        for f in files:
            if f not in all_files:
                all_files.append(f)
    return all_files


def aggregate_test_results(domain_results: List[Dict[str, Any]]) -> bool:
    """
    Determine if all domains passed their tests.

    Args:
        domain_results: List of domain execution results

    Returns:
        True if all domains passed tests, False otherwise
    """
    if not domain_results:
        return False

    for result in domain_results:
        if not result.get("tests_passed", False):
            return False
    return True


def combine_budget_usage(domain_results: List[Dict[str, Any]]) -> float:
    """
    Sum budget usage across all domain executions.

    Args:
        domain_results: List of domain execution results

    Returns:
        Total budget used across all domains
    """
    total = 0.0
    for result in domain_results:
        total += result.get("budget_used", 0.0)
    return total


def handle_domain_errors(domain_results: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Extract error information from domain results.

    Args:
        domain_results: List of domain execution results

    Returns:
        Dict with failed_domains list and error details
    """
    failed_domains = []
    errors = {}

    for result in domain_results:
        if not result.get("success", True):
            domain = result.get("domain", "unknown")
            failed_domains.append(domain)
            errors[domain] = result.get("error", "Unknown error")

    return {
        "failed_domains": failed_domains,
        "errors": errors,
        "has_failures": len(failed_domains) > 0,
    }


def should_continue_after_failure(domain_results: List[Dict[str, Any]]) -> bool:
    """
    Determine if workflow should continue after domain failures.

    Critical domains (auth, payments, data) cause full stop.
    Non-critical domains (ui, profile) allow continuation.

    Args:
        domain_results: List of domain execution results

    Returns:
        True if workflow should continue, False if critical failure
    """
    for result in domain_results:
        if not result.get("success", True):
            if result.get("critical", False):
                return False
    return True


def fan_in_aggregator(state: Dict[str, Any]) -> Dict[str, Any]:
    """
    Fan-in aggregator node - combines results from parallel domain execution.

    Args:
        state: Current state with domain_results

    Returns:
        Dict with aggregated state updates
    """
    timestamp = datetime.now(timezone.utc).isoformat()
    domain_results = state.get("domain_results", [])

    # Aggregate all results
    aggregated_files = merge_files_modified(domain_results)
    all_tests_passed = aggregate_test_results(domain_results)
    total_budget_used = combine_budget_usage(domain_results)
    error_info = handle_domain_errors(domain_results)

    # Determine if partial failure occurred
    partial_failure = error_info["has_failures"] and should_continue_after_failure(domain_results)

    return {
        "aggregated_files": aggregated_files,
        "all_tests_passed": all_tests_passed,
        "total_budget_used": total_budget_used,
        "failed_domains": error_info["failed_domains"],
        "partial_failure": partial_failure,
        "execution_completed": True,
    }


__all__ = [
    "fan_in_aggregator",
    "merge_files_modified",
    "aggregate_test_results",
    "combine_budget_usage",
    "handle_domain_errors",
    "should_continue_after_failure",
]
