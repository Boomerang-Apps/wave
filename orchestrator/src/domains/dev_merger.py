"""
Dev Merger Module
Merge results from parallel frontend/backend developer execution.

Based on Grok's Parallel Domain Execution Recommendations

Aggregates files and tests from multiple dev agents into
unified domain results.
"""

from typing import Dict, Any, List


def aggregate_dev_files(dev_results: List[Dict[str, Any]]) -> List[str]:
    """
    Aggregate files modified by all dev agents.

    Args:
        dev_results: List of results from dev agents

    Returns:
        Deduplicated list of all files modified
    """
    all_files = []
    seen = set()

    for result in dev_results:
        files = result.get("files_modified", [])
        for f in files:
            if f not in seen:
                seen.add(f)
                all_files.append(f)

    return all_files


def aggregate_dev_tests(dev_results: List[Dict[str, Any]]) -> List[str]:
    """
    Aggregate tests written by all dev agents.

    Args:
        dev_results: List of results from dev agents

    Returns:
        Deduplicated list of all tests written
    """
    all_tests = []
    seen = set()

    for result in dev_results:
        tests = result.get("tests_written", [])
        for t in tests:
            if t not in seen:
                seen.add(t)
                all_tests.append(t)

    return all_tests


def merge_dev_results(state: Dict[str, Any]) -> Dict[str, Any]:
    """
    Merge results from all dev agents into unified domain results.

    Called after parallel fe/be execution to aggregate:
    - All files modified
    - All tests written
    - Success/failure status

    Args:
        state: Domain dev state with dev_results

    Returns:
        Dict with merged_files and merged_tests
    """
    dev_results = state.get("dev_results", [])

    # Aggregate files and tests
    merged_files = aggregate_dev_files(dev_results)
    merged_tests = aggregate_dev_tests(dev_results)

    # Check if all devs succeeded
    all_success = all(r.get("success", True) for r in dev_results)

    # Collect any errors
    errors = [r.get("error") for r in dev_results if r.get("error")]

    return {
        "merged_files": merged_files,
        "merged_tests": merged_tests,
        "all_devs_success": all_success,
        "dev_errors": errors,
    }


__all__ = [
    "merge_dev_results",
    "aggregate_dev_files",
    "aggregate_dev_tests",
]
