"""
WAVE Gates Module

Provides the 12-gate TDD launch sequence for workflow progression.
Each gate represents a checkpoint that must be passed before proceeding.

TDD Flow: Design → Story → Plan → TESTS (RED) → Dev → Complete → REFACTOR → QA → Safety → Review → Merge → Deploy

Based on Grok's Gate System from LANGGRAPH-ENHANCEMENT-PLAN.md
Fixed: 2026-01-30 - TDD gate ordering (gates 25, 45 now properly sequenced)
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
    GATE_ORDER,  # TDD-aware gate sequence
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
    # Gate Validator (TDD-aware)
    "GATE_ORDER",  # TDD gate sequence
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
