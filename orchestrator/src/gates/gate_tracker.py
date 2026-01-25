"""
Gate Tracker Module
Progress tracking for gate transitions.

Based on Grok's Gate System from LANGGRAPH-ENHANCEMENT-PLAN.md
"""

from datetime import datetime, timezone
from typing import TypedDict, List, Dict, Any, Optional

from .gate_system import Gate


class GateTransition(TypedDict):
    """Record of a gate transition"""
    gate: int
    gate_name: str
    passed_at: str
    passed_by: Optional[str]


class GateProgress(TypedDict):
    """
    Gate progress tracking state.

    Tracks which gates have been passed and transition history.
    """
    passed_gates: List[Gate]
    current_gate: Optional[int]
    history: List[GateTransition]
    started_at: str
    completed_at: Optional[str]


def create_gate_progress() -> GateProgress:
    """
    Create initial gate progress state.

    Returns:
        GateProgress with empty progress
    """
    timestamp = datetime.now(timezone.utc).isoformat()

    return GateProgress(
        passed_gates=[],
        current_gate=None,
        history=[],
        started_at=timestamp,
        completed_at=None,
    )


def mark_gate_passed(
    progress: GateProgress,
    gate: Gate,
    passed_by: Optional[str] = None
) -> GateProgress:
    """
    Mark a gate as passed.

    Args:
        progress: Current progress state
        gate: Gate that was passed
        passed_by: Optional identifier of who/what passed the gate

    Returns:
        Updated GateProgress
    """
    timestamp = datetime.now(timezone.utc).isoformat()

    # Create transition record
    transition = GateTransition(
        gate=gate.value,
        gate_name=gate.name,
        passed_at=timestamp,
        passed_by=passed_by,
    )

    # Update passed gates list (handle missing key)
    new_passed = list(progress.get("passed_gates", []))
    if gate not in new_passed:
        new_passed.append(gate)

    # Update history (handle missing key)
    new_history = list(progress.get("history", []))
    new_history.append(transition)

    # Check if completed (all gates passed)
    completed_at = None
    if gate == Gate.DEPLOYED:
        completed_at = timestamp

    return GateProgress(
        passed_gates=new_passed,
        current_gate=gate.value,
        history=new_history,
        started_at=progress.get("started_at", timestamp),
        completed_at=completed_at,
    )


def get_gate_history(progress: GateProgress) -> List[GateTransition]:
    """
    Get gate transition history.

    Args:
        progress: Gate progress state

    Returns:
        List of gate transitions
    """
    return progress["history"]


def get_progress_summary(progress: GateProgress) -> Dict[str, Any]:
    """
    Get summary of gate progress.

    Args:
        progress: Gate progress state

    Returns:
        Summary dict with statistics
    """
    passed_count = len(progress["passed_gates"])
    total_gates = len(Gate)

    return {
        "passed_count": passed_count,
        "total_gates": total_gates,
        "completion_percent": (passed_count / total_gates) * 100,
        "current_gate": progress["current_gate"],
        "is_complete": progress["completed_at"] is not None,
        "started_at": progress["started_at"],
        "completed_at": progress["completed_at"],
    }


def reset_gate_progress() -> GateProgress:
    """
    Reset gate progress to initial state.

    Returns:
        Fresh GateProgress
    """
    return create_gate_progress()


__all__ = [
    "GateProgress",
    "GateTransition",
    "create_gate_progress",
    "mark_gate_passed",
    "get_gate_history",
    "get_progress_summary",
    "reset_gate_progress",
]
