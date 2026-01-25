"""
Gate Validator Module
Validation functions for gate transitions and dependencies.

Based on Grok's Gate System from LANGGRAPH-ENHANCEMENT-PLAN.md
"""

from typing import Dict, Any, List, Optional

from .gate_system import Gate, get_all_prerequisites


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
    Get the highest gate that has been passed.

    Args:
        passed_gates: List of passed gates

    Returns:
        Highest passed gate, or None if no gates passed
    """
    if not passed_gates:
        return None

    # Convert to values and find max
    max_value = max(g.value for g in passed_gates)
    return Gate(max_value)


def get_next_gate(passed_gates: List[Gate]) -> Optional[Gate]:
    """
    Get the next gate to pass.

    Args:
        passed_gates: List of passed gates

    Returns:
        Next gate to pass, or None if all gates passed
    """
    if not passed_gates:
        return Gate.DESIGN_VALIDATED

    current = get_current_gate(passed_gates)
    if current is None:
        return Gate.DESIGN_VALIDATED

    # Get next gate value
    next_value = current.value + 1

    # Check if we've passed all gates
    if next_value > Gate.DEPLOYED.value:
        return None

    return Gate(next_value)


def validate_gate_transition(
    from_gate: Gate,
    to_gate: Gate
) -> Dict[str, Any]:
    """
    Validate a gate transition.

    Rules:
    - Can only move forward by one gate
    - Cannot skip gates
    - Cannot move backward

    Args:
        from_gate: Current gate
        to_gate: Target gate

    Returns:
        Dict with 'valid' bool and 'reason' string
    """
    from_value = from_gate.value
    to_value = to_gate.value

    # Cannot move backward
    if to_value < from_value:
        return {
            "valid": False,
            "reason": f"Cannot move backward from {from_gate.name} to {to_gate.name}",
        }

    # Cannot skip gates (must move exactly one step)
    if to_value != from_value + 1:
        return {
            "valid": False,
            "reason": f"Cannot skip from {from_gate.name} to {to_gate.name}. Must pass gates sequentially.",
        }

    return {
        "valid": True,
        "reason": f"Valid transition from {from_gate.name} to {to_gate.name}",
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
    "can_pass_gate",
    "get_current_gate",
    "get_next_gate",
    "validate_gate_transition",
    "get_missing_prerequisites",
]
