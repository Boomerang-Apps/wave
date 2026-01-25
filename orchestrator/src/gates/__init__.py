"""
WAVE Gates Module

Provides the 10-gate launch sequence for workflow progression.
Each gate represents a checkpoint that must be passed before proceeding.

Based on Grok's Gate System from LANGGRAPH-ENHANCEMENT-PLAN.md
"""

from .gate_system import (
    Gate,
    GATE_DEPENDENCIES,
    GATE_DESCRIPTIONS,
    get_gate_name,
    get_gate_description,
    get_gate_dependencies,
    get_all_prerequisites,
)
from .gate_validator import (
    can_pass_gate,
    get_current_gate,
    get_next_gate,
    validate_gate_transition,
    get_missing_prerequisites,
)
from .gate_tracker import (
    GateProgress,
    GateTransition,
    create_gate_progress,
    mark_gate_passed,
    get_gate_history,
    get_progress_summary,
    reset_gate_progress,
)

__all__ = [
    # Gate System
    "Gate",
    "GATE_DEPENDENCIES",
    "GATE_DESCRIPTIONS",
    "get_gate_name",
    "get_gate_description",
    "get_gate_dependencies",
    "get_all_prerequisites",
    # Gate Validator
    "can_pass_gate",
    "get_current_gate",
    "get_next_gate",
    "validate_gate_transition",
    "get_missing_prerequisites",
    # Gate Tracker
    "GateProgress",
    "GateTransition",
    "create_gate_progress",
    "mark_gate_passed",
    "get_gate_history",
    "get_progress_summary",
    "reset_gate_progress",
]
