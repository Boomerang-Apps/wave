"""
Dev Agent State Module
State schemas for parallel frontend/backend developer agents.

Based on Grok's Parallel Domain Execution Recommendations

Defines state types for:
- Individual dev agent execution (DevAgentState)
- Domain-level dev coordination (DomainDevState)
"""

from typing import TypedDict, List, Dict, Any, Optional


class DevAgentState(TypedDict):
    """
    State for individual dev agent execution.

    Used when a single dev (fe or be) is executing.
    """
    # Context
    domain: str
    current_assignment: str  # "frontend" or "backend"

    # Results
    agent_type: str  # "frontend" or "backend"
    files_modified: List[str]
    tests_written: List[str]

    # Status
    success: bool
    error: Optional[str]


class DevAgentResult(TypedDict):
    """Result from a single dev agent execution"""
    agent_type: str
    files_modified: List[str]
    tests_written: List[str]
    success: bool
    error: Optional[str]


class DomainDevState(TypedDict):
    """
    State for domain-level dev coordination.

    Used when coordinating parallel fe/be execution.
    """
    # Context
    domain: str

    # Assignments to execute
    dev_assignments: List[str]  # ["frontend", "backend"]

    # Results from each dev
    dev_results: List[DevAgentResult]

    # Merged results
    merged_files: List[str]
    merged_tests: List[str]


def create_dev_agent_state(
    domain: str,
    assignment: str,
) -> DevAgentState:
    """
    Factory function to create initial dev agent state.

    Args:
        domain: Domain name (e.g., "auth")
        assignment: Assignment type ("frontend" or "backend")

    Returns:
        Initialized DevAgentState
    """
    return DevAgentState(
        domain=domain,
        current_assignment=assignment,
        agent_type=assignment,
        files_modified=[],
        tests_written=[],
        success=False,
        error=None,
    )


def create_domain_dev_state(
    domain: str,
    assignments: List[str] = None,
) -> DomainDevState:
    """
    Factory function to create domain dev state.

    Args:
        domain: Domain name
        assignments: List of assignments (defaults to ["frontend", "backend"])

    Returns:
        Initialized DomainDevState
    """
    if assignments is None:
        assignments = ["frontend", "backend"]

    return DomainDevState(
        domain=domain,
        dev_assignments=assignments,
        dev_results=[],
        merged_files=[],
        merged_tests=[],
    )


__all__ = [
    "DevAgentState",
    "DevAgentResult",
    "DomainDevState",
    "create_dev_agent_state",
    "create_domain_dev_state",
]
