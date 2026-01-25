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
    """WAVE 10-Gate Launch Sequence"""

    # Design Foundation (Gate 0)
    DESIGN_VALIDATED = 0

    # PRD & Stories (Gate 1)
    STORY_ASSIGNED = 1

    # Execution Plan (Gate 2)
    PLAN_APPROVED = 2

    # Development (Gates 3-4)
    DEV_STARTED = 3
    DEV_COMPLETE = 4

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
GATE_DEPENDENCIES: Dict[Gate, List[Gate]] = {
    Gate.STORY_ASSIGNED: [Gate.DESIGN_VALIDATED],
    Gate.PLAN_APPROVED: [Gate.STORY_ASSIGNED],
    Gate.DEV_STARTED: [Gate.PLAN_APPROVED],
    Gate.DEV_COMPLETE: [Gate.DEV_STARTED],
    Gate.QA_PASSED: [Gate.DEV_COMPLETE],
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
    Gate.DEV_STARTED: "Development work has begun",
    Gate.DEV_COMPLETE: "Development work is complete",
    Gate.QA_PASSED: "All QA tests have passed",
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
    Get all prerequisite gates (transitive dependencies).

    For example, Gate 5 requires Gates 0, 1, 2, 3, 4.
    """
    if gate.value == 0:
        return []

    prerequisites = []
    for g in Gate:
        if g.value < gate.value:
            prerequisites.append(g)

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
