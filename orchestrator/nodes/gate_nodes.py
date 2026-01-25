"""
Gate Nodes Module
LangGraph nodes for gate validation and progression.

Based on Grok's Gate System from LANGGRAPH-ENHANCEMENT-PLAN.md

Provides:
- Generic gate_check_node for any gate
- Specific nodes for key gates (0, 6, 9)
- Gate routing functions
"""

from datetime import datetime, timezone
from typing import Dict, Any, Literal

from src.gates.gate_system import Gate
from src.gates.gate_validator import can_pass_gate
from src.gates.gate_tracker import mark_gate_passed, create_gate_progress


# Router return types
GateRoute = Literal["next_gate", "gate_failed"]


def gate_check_node(state: Dict[str, Any], gate: Gate) -> Dict[str, Any]:
    """
    Generic gate check node.

    Validates if a gate can be passed based on current progress.

    Args:
        state: Current workflow state
        gate: Gate to check

    Returns:
        Dict with gate_passed bool and updated progress
    """
    timestamp = datetime.now(timezone.utc).isoformat()

    # Get or create gate progress
    progress = state.get("gate_progress")
    if progress is None:
        progress = create_gate_progress()

    passed_gates = progress.get("passed_gates", [])

    # Check if gate can be passed
    if can_pass_gate(gate, passed_gates):
        # Mark gate as passed
        updated_progress = mark_gate_passed(progress, gate)

        return {
            "gate_passed": True,
            "current_gate": gate.value,
            "gate_progress": updated_progress,
            "gate_timestamp": timestamp,
        }
    else:
        return {
            "gate_passed": False,
            "current_gate": gate.value,
            "gate_progress": progress,
            "gate_error": f"Cannot pass {gate.name}: prerequisites not met",
            "gate_timestamp": timestamp,
        }


def gate_0_design_node(state: Dict[str, Any]) -> Dict[str, Any]:
    """
    Gate 0: Validate design foundation.

    Checks:
    - Mockups exist
    - PRD exists
    - Folder structure is valid

    Args:
        state: Current workflow state

    Returns:
        Dict with gate check result
    """
    timestamp = datetime.now(timezone.utc).isoformat()

    # Get or create gate progress
    progress = state.get("gate_progress")
    if progress is None:
        progress = create_gate_progress()

    # Gate 0 can always be passed (no dependencies)
    # In real implementation, would check for design artifacts
    design_valid = True  # Placeholder - would check actual artifacts

    if design_valid:
        updated_progress = mark_gate_passed(progress, Gate.DESIGN_VALIDATED)

        return {
            "gate_passed": True,
            "current_gate": Gate.DESIGN_VALIDATED.value,
            "gate_progress": updated_progress,
            "gate_timestamp": timestamp,
        }
    else:
        return {
            "gate_passed": False,
            "current_gate": Gate.DESIGN_VALIDATED.value,
            "gate_progress": progress,
            "gate_error": "Design validation failed",
            "gate_timestamp": timestamp,
        }


def gate_6_safety_node(state: Dict[str, Any]) -> Dict[str, Any]:
    """
    Gate 6: Aerospace safety checkpoint.

    Checks:
    - Constitutional AI score >= 0.9
    - No critical violations
    - Safety clearance granted

    Args:
        state: Current workflow state

    Returns:
        Dict with gate check result
    """
    timestamp = datetime.now(timezone.utc).isoformat()

    # Get or create gate progress
    progress = state.get("gate_progress")
    if progress is None:
        progress = create_gate_progress()

    # Get safety state
    safety = state.get("safety", {})
    score = safety.get("constitutional_score", 0.0)
    violations = safety.get("violations", [])

    # Safety threshold
    SAFETY_THRESHOLD = 0.9

    # Check safety criteria
    safety_cleared = score >= SAFETY_THRESHOLD and len(violations) == 0

    if safety_cleared:
        # Check prerequisites first
        passed_gates = progress.get("passed_gates", [])
        if can_pass_gate(Gate.SAFETY_CLEARED, passed_gates):
            updated_progress = mark_gate_passed(progress, Gate.SAFETY_CLEARED)

            return {
                "gate_passed": True,
                "current_gate": Gate.SAFETY_CLEARED.value,
                "gate_progress": updated_progress,
                "safety_score": score,
                "gate_timestamp": timestamp,
            }

    return {
        "gate_passed": False,
        "current_gate": Gate.SAFETY_CLEARED.value,
        "gate_progress": progress,
        "gate_error": f"Safety check failed: score={score:.2f}, violations={len(violations)}",
        "safety_score": score,
        "gate_timestamp": timestamp,
    }


def gate_9_deploy_node(state: Dict[str, Any]) -> Dict[str, Any]:
    """
    Gate 9: Final deployment.

    Triggers:
    - CI/CD pipeline
    - RLM summary update
    - Stakeholder notification

    Args:
        state: Current workflow state

    Returns:
        Dict with gate check result
    """
    timestamp = datetime.now(timezone.utc).isoformat()

    # Get or create gate progress
    progress = state.get("gate_progress")
    if progress is None:
        progress = create_gate_progress()

    # Check prerequisites
    passed_gates = progress.get("passed_gates", [])

    if can_pass_gate(Gate.DEPLOYED, passed_gates):
        updated_progress = mark_gate_passed(progress, Gate.DEPLOYED)

        return {
            "gate_passed": True,
            "current_gate": Gate.DEPLOYED.value,
            "gate_progress": updated_progress,
            "status": "completed",
            "deployment_timestamp": timestamp,
            "gate_timestamp": timestamp,
        }
    else:
        return {
            "gate_passed": False,
            "current_gate": Gate.DEPLOYED.value,
            "gate_progress": progress,
            "gate_error": "Cannot deploy: prerequisites not met",
            "gate_timestamp": timestamp,
        }


def gate_router(state: Dict[str, Any]) -> GateRoute:
    """
    Route based on gate check result.

    Args:
        state: State with gate_passed field

    Returns:
        "next_gate" if passed, "gate_failed" if not
    """
    if state.get("gate_passed", False):
        return "next_gate"
    else:
        return "gate_failed"


def get_gate_node_for(gate: Gate):
    """
    Get the appropriate gate node function for a gate.

    Args:
        gate: The gate to get a node for

    Returns:
        Gate node function
    """
    special_gates = {
        Gate.DESIGN_VALIDATED: gate_0_design_node,
        Gate.SAFETY_CLEARED: gate_6_safety_node,
        Gate.DEPLOYED: gate_9_deploy_node,
    }

    if gate in special_gates:
        return special_gates[gate]

    # Return a partial function for generic gate check
    def generic_gate_node(state: Dict[str, Any]) -> Dict[str, Any]:
        return gate_check_node(state, gate)

    return generic_gate_node


__all__ = [
    "gate_check_node",
    "gate_0_design_node",
    "gate_6_safety_node",
    "gate_9_deploy_node",
    "gate_router",
    "get_gate_node_for",
]
