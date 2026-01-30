"""
Gate System Module
10-Gate Launch Sequence with Dependencies.

Based on Grok's Gate System from LANGGRAPH-ENHANCEMENT-PLAN.md

Gates:
0. DESIGN_VALIDATED - Design foundation verified
1. STORY_ASSIGNED - Story assigned to team
2. PLAN_APPROVED - Execution plan approved
3. DEV_STARTED - Development started
4. DEV_COMPLETE - Development complete
5. QA_PASSED - QA tests passed
6. SAFETY_CLEARED - Safety checkpoint cleared
7. REVIEW_APPROVED - Code review approved
8. MERGED - Code merged to main
9. DEPLOYED - Deployed to production
"""

from enum import IntEnum
from typing import Dict, List


class Gate(IntEnum):
    """WAVE 10-Gate Launch Sequence with TDD Support"""

    # Design Foundation (Gate 0)
    DESIGN_VALIDATED = 0

    # PRD & Stories (Gate 1)
    STORY_ASSIGNED = 1

    # Execution Plan (Gate 2)
    PLAN_APPROVED = 2

    # TDD: Tests Written FIRST (Gate 2.5 - mapped to 25)
    # Tests must be written and FAIL (RED state) before code
    TESTS_WRITTEN = 25

    # Development (Gates 3-4)
    # Code written to make tests pass (GREEN state)
    DEV_STARTED = 3
    DEV_COMPLETE = 4

    # TDD: Refactor (Gate 4.5 - mapped to 45)
    # Refactor while keeping tests green
    REFACTOR_COMPLETE = 45

    # QA (Gate 5)
    QA_PASSED = 5

    # Safety (Gate 6 - Aerospace checkpoint)
    SAFETY_CLEARED = 6

    # Review (Gate 7)
    REVIEW_APPROVED = 7

    # Merge (Gate 8)
    MERGED = 8

    # Launch (Gate 9)
    DEPLOYED = 9


# Gate dependencies - each gate requires all previous gates
# TDD Flow: Plan -> Tests Written (RED) -> Dev (GREEN) -> Refactor
GATE_DEPENDENCIES: Dict[Gate, List[Gate]] = {
    Gate.STORY_ASSIGNED: [Gate.DESIGN_VALIDATED],
    Gate.PLAN_APPROVED: [Gate.STORY_ASSIGNED],
    # TDD: Tests must be written BEFORE development starts
    Gate.TESTS_WRITTEN: [Gate.PLAN_APPROVED],
    # Dev can only start after tests are written (TDD enforcement)
    Gate.DEV_STARTED: [Gate.TESTS_WRITTEN],
    Gate.DEV_COMPLETE: [Gate.DEV_STARTED],
    # TDD: Refactor after tests pass
    Gate.REFACTOR_COMPLETE: [Gate.DEV_COMPLETE],
    Gate.QA_PASSED: [Gate.REFACTOR_COMPLETE],
    Gate.SAFETY_CLEARED: [Gate.QA_PASSED],
    Gate.REVIEW_APPROVED: [Gate.SAFETY_CLEARED],
    Gate.MERGED: [Gate.REVIEW_APPROVED],
    Gate.DEPLOYED: [Gate.MERGED],
}


# Human-readable gate descriptions
GATE_DESCRIPTIONS: Dict[Gate, str] = {
    Gate.DESIGN_VALIDATED: "Design foundation verified - mockups, PRD, folder structure",
    Gate.STORY_ASSIGNED: "Story assigned to development team",
    Gate.PLAN_APPROVED: "Execution plan reviewed and approved",
    Gate.TESTS_WRITTEN: "TDD RED: Failing tests written BEFORE code (test-first)",
    Gate.DEV_STARTED: "TDD GREEN: Development started - writing code to pass tests",
    Gate.DEV_COMPLETE: "TDD GREEN: All tests now passing - development complete",
    Gate.REFACTOR_COMPLETE: "TDD REFACTOR: Code refactored while keeping tests green",
    Gate.QA_PASSED: "All QA tests have passed with >=80% coverage",
    Gate.SAFETY_CLEARED: "Safety checkpoint cleared - constitutional AI approved",
    Gate.REVIEW_APPROVED: "Code review approved by reviewers",
    Gate.MERGED: "Code merged to main branch",
    Gate.DEPLOYED: "Deployed to production environment",
}


def get_gate_name(gate: Gate) -> str:
    """Get human-readable name for a gate."""
    return gate.name.replace("_", " ").title()


def get_gate_description(gate: Gate) -> str:
    """Get description for a gate."""
    return GATE_DESCRIPTIONS.get(gate, "No description available")


def get_gate_dependencies(gate: Gate) -> List[Gate]:
    """Get dependencies for a gate."""
    return GATE_DEPENDENCIES.get(gate, [])


def get_all_prerequisites(gate: Gate) -> List[Gate]:
    """
    Get all prerequisite gates (transitive dependencies via GATE_DEPENDENCIES).

    TDD-aware: Follows actual dependency graph, not value ordering.
    For example, DEV_STARTED requires TESTS_WRITTEN (gate 25) even though 25 > 3.

    Fixed: 2026-01-30 - Use dependency graph traversal instead of value comparison.
    """
    if gate == Gate.DESIGN_VALIDATED:
        return []

    prerequisites: List[Gate] = []
    visited: set = set()

    def collect_deps(g: Gate) -> None:
        """Recursively collect all dependencies."""
        if g in visited:
            return
        visited.add(g)

        direct_deps = GATE_DEPENDENCIES.get(g, [])
        for dep in direct_deps:
            if dep not in prerequisites:
                prerequisites.append(dep)
            collect_deps(dep)

    collect_deps(gate)

    # Sort by TDD order for consistent output
    # Define order inline to avoid circular imports
    order = [
        Gate.DESIGN_VALIDATED, Gate.STORY_ASSIGNED, Gate.PLAN_APPROVED,
        Gate.TESTS_WRITTEN, Gate.DEV_STARTED, Gate.DEV_COMPLETE,
        Gate.REFACTOR_COMPLETE, Gate.QA_PASSED, Gate.SAFETY_CLEARED,
        Gate.REVIEW_APPROVED, Gate.MERGED, Gate.DEPLOYED
    ]
    order_map = {g: i for i, g in enumerate(order)}
    prerequisites.sort(key=lambda g: order_map.get(g, 999))

    return prerequisites


__all__ = [
    "Gate",
    "GATE_DEPENDENCIES",
    "GATE_DESCRIPTIONS",
    "get_gate_name",
    "get_gate_description",
    "get_gate_dependencies",
    "get_all_prerequisites",
]
