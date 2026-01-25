"""
Fan-Out Dispatcher Module
Dispatches tasks to multiple domains in parallel (Map pattern).

Based on Grok's Parallel Execution Pattern from LANGGRAPH-ENHANCEMENT-PLAN.md
"""

import asyncio
from typing import Dict, Any, List
from datetime import datetime, timezone

from src.domains.domain_graph import (
    compile_domain_subgraph,
    create_initial_domain_state,
)
from .parallel_state import ParallelState, DomainResult


def create_domain_tasks(state: ParallelState) -> List[Dict[str, Any]]:
    """
    Create task configurations for each domain.

    Args:
        state: Current parallel state

    Returns:
        List of domain task configurations
    """
    domains = state.get("domains", [])
    parent_run_id = state.get("parent_run_id", "")
    task = state.get("task", "")

    tasks = []
    for domain in domains:
        task_config = {
            "domain": domain,
            "parent_run_id": parent_run_id,
            "task": task,
        }
        tasks.append(task_config)

    return tasks


async def execute_single_domain(
    domain: str,
    parent_run_id: str,
    task: str,
) -> DomainResult:
    """
    Execute a single domain sub-graph asynchronously.

    Args:
        domain: Domain name to execute
        parent_run_id: Parent workflow run ID
        task: Task description

    Returns:
        DomainResult with execution outcome
    """
    try:
        # Create domain state
        domain_state = create_initial_domain_state(
            domain=domain,
            parent_run_id=parent_run_id,
            task=task,
        )

        # Compile and execute domain sub-graph
        compiled = compile_domain_subgraph(domain)

        # Execute synchronously (LangGraph invoke)
        # In production, this could use ainvoke if available
        result = compiled.invoke(domain_state)

        return DomainResult(
            domain=domain,
            success=True,
            files_modified=result.get("files_modified", []),
            tests_passed=result.get("tests_passed", False),
            budget_used=100.0,  # Placeholder - would track actual usage
            error=None,
            critical=domain in ["auth", "payments", "data"],  # Critical domains
        )

    except Exception as e:
        return DomainResult(
            domain=domain,
            success=False,
            files_modified=[],
            tests_passed=False,
            budget_used=0.0,
            error=str(e),
            critical=domain in ["auth", "payments", "data"],
        )


async def execute_domains_parallel(state: ParallelState) -> List[DomainResult]:
    """
    Execute multiple domains in parallel using asyncio.gather.

    Args:
        state: Current parallel state

    Returns:
        List of DomainResult from all domain executions
    """
    domains = state.get("domains", [])
    parent_run_id = state.get("parent_run_id", "")
    task = state.get("task", "")

    if not domains:
        return []

    # Create async tasks for each domain
    tasks = [
        execute_single_domain(domain, parent_run_id, task)
        for domain in domains
    ]

    # Execute all domains in parallel
    results = await asyncio.gather(*tasks, return_exceptions=True)

    # Convert exceptions to DomainResult errors
    processed_results = []
    for i, result in enumerate(results):
        if isinstance(result, Exception):
            processed_results.append(DomainResult(
                domain=domains[i],
                success=False,
                files_modified=[],
                tests_passed=False,
                budget_used=0.0,
                error=str(result),
                critical=domains[i] in ["auth", "payments", "data"],
            ))
        else:
            processed_results.append(result)

    return processed_results


def fan_out_dispatcher(state: ParallelState) -> Dict[str, Any]:
    """
    Fan-out dispatcher node - initiates parallel domain execution.

    This is a synchronous wrapper that marks execution as started.
    The actual parallel execution happens in execute_domains_parallel.

    Args:
        state: Current parallel state

    Returns:
        Dict with state updates
    """
    timestamp = datetime.now(timezone.utc).isoformat()
    domains = state.get("domains", [])

    return {
        "execution_started": True,
        "execution_completed": False,
    }


__all__ = [
    "fan_out_dispatcher",
    "create_domain_tasks",
    "execute_domains_parallel",
    "execute_single_domain",
]
