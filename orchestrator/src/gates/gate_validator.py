"""
Gate Validator Module
Validation functions for gate transitions and dependencies.

Based on Grok's Gate System from LANGGRAPH-ENHANCEMENT-PLAN.md

Fixed: 2026-01-30 - TDD gate ordering (gates 25, 45 are not sequential values)
"""

from typing import Dict, Any, List, Optional

from .gate_system import Gate, get_all_prerequisites, GATE_DEPENDENCIES


# ═══════════════════════════════════════════════════════════════════════════════
# TDD-AWARE GATE ORDERING
# ═══════════════════════════════════════════════════════════════════════════════
# Gates are NOT sequential by value. The correct order follows TDD flow:
# 0 → 1 → 2 → 25 (tests) → 3 → 4 → 45 (refactor) → 5 → 6 → 7 → 8 → 9

GATE_ORDER: List[Gate] = [
    Gate.DESIGN_VALIDATED,   # 0 - Design foundation
    Gate.STORY_ASSIGNED,     # 1 - Story assigned
    Gate.PLAN_APPROVED,      # 2 - Plan approved
    Gate.TESTS_WRITTEN,      # 25 - TDD RED: Write failing tests FIRST
    Gate.DEV_STARTED,        # 3 - TDD GREEN: Start coding
    Gate.DEV_COMPLETE,       # 4 - TDD GREEN: Code complete, tests pass
    Gate.REFACTOR_COMPLETE,  # 45 - TDD REFACTOR: Clean up
    Gate.QA_PASSED,          # 5 - QA validation
    Gate.SAFETY_CLEARED,     # 6 - Safety checkpoint
    Gate.REVIEW_APPROVED,    # 7 - Code review
    Gate.MERGED,             # 8 - Merged to main
    Gate.DEPLOYED,           # 9 - Deployed to production
]

# Create lookup for O(1) index access
_GATE_INDEX: Dict[Gate, int] = {gate: idx for idx, gate in enumerate(GATE_ORDER)}


def can_pass_gate(gate: Gate, passed_gates: List[Gate]) -> bool:
    """
    Check if a gate can be passed given current progress.

    A gate can be passed if all its prerequisites have been passed.

    Args:
        gate: The gate to check
        passed_gates: List of already passed gates

    Returns:
        True if the gate can be passed
    """
    # Gate 0 can always be passed (no dependencies)
    if gate == Gate.DESIGN_VALIDATED:
        return True

    # Get all prerequisites for this gate
    prerequisites = get_all_prerequisites(gate)

    # Check if all prerequisites have been passed
    for prereq in prerequisites:
        if prereq not in passed_gates:
            return False

    return True


def get_current_gate(passed_gates: List[Gate]) -> Optional[Gate]:
    """
    Get the highest gate that has been passed (by TDD order, not value).

    Args:
        passed_gates: List of passed gates

    Returns:
        Highest passed gate in TDD sequence, or None if no gates passed
    """
    if not passed_gates:
        return None

    # Find the gate with highest index in GATE_ORDER (not by value!)
    max_index = -1
    current_gate = None
    for gate in passed_gates:
        idx = _GATE_INDEX.get(gate, -1)
        if idx > max_index:
            max_index = idx
            current_gate = gate

    return current_gate


def get_next_gate(passed_gates: List[Gate]) -> Optional[Gate]:
    """
    Get the next gate to pass (following TDD order).

    TDD Flow: Plan → Tests (RED) → Dev (GREEN) → Refactor → QA → ...

    Args:
        passed_gates: List of passed gates

    Returns:
        Next gate in TDD sequence, or None if all gates passed
    """
    if not passed_gates:
        return Gate.DESIGN_VALIDATED

    current = get_current_gate(passed_gates)
    if current is None:
        return Gate.DESIGN_VALIDATED

    # Get current gate's index in TDD order
    current_index = _GATE_INDEX.get(current, -1)

    # Get next gate in sequence
    next_index = current_index + 1

    # Check if we've passed all gates
    if next_index >= len(GATE_ORDER):
        return None

    return GATE_ORDER[next_index]


def validate_gate_transition(
    from_gate: Gate,
    to_gate: Gate
) -> Dict[str, Any]:
    """
    Validate a gate transition (TDD-aware).

    Rules:
    - Must follow TDD gate order (not value order)
    - Can only move forward by one gate in sequence
    - Cannot skip gates
    - Cannot move backward

    TDD Flow: 0 → 1 → 2 → 25 → 3 → 4 → 45 → 5 → 6 → 7 → 8 → 9

    Args:
        from_gate: Current gate
        to_gate: Target gate

    Returns:
        Dict with 'valid' bool and 'reason' string
    """
    from_index = _GATE_INDEX.get(from_gate, -1)
    to_index = _GATE_INDEX.get(to_gate, -1)

    # Validate gates exist in order
    if from_index == -1:
        return {
            "valid": False,
            "reason": f"Unknown gate: {from_gate.name}",
        }
    if to_index == -1:
        return {
            "valid": False,
            "reason": f"Unknown gate: {to_gate.name}",
        }

    # Cannot move backward in TDD sequence
    if to_index < from_index:
        return {
            "valid": False,
            "reason": f"Cannot move backward from {from_gate.name} to {to_gate.name}",
        }

    # Must move exactly one step in TDD sequence
    if to_index != from_index + 1:
        expected_next = GATE_ORDER[from_index + 1] if from_index + 1 < len(GATE_ORDER) else None
        expected_name = expected_next.name if expected_next else "END"
        return {
            "valid": False,
            "reason": f"Cannot skip from {from_gate.name} to {to_gate.name}. Next gate must be {expected_name}.",
        }

    return {
        "valid": True,
        "reason": f"Valid TDD transition from {from_gate.name} to {to_gate.name}",
    }


def get_missing_prerequisites(gate: Gate, passed_gates: List[Gate]) -> List[Gate]:
    """
    Get list of missing prerequisites for a gate.

    Args:
        gate: Target gate
        passed_gates: List of passed gates

    Returns:
        List of gates that need to be passed first
    """
    prerequisites = get_all_prerequisites(gate)
    missing = [g for g in prerequisites if g not in passed_gates]
    return missing


__all__ = [
    # TDD Gate Order
    "GATE_ORDER",
    # Validation functions
    "can_pass_gate",
    "get_current_gate",
    "get_next_gate",
    "validate_gate_transition",
    "get_missing_prerequisites",
]
