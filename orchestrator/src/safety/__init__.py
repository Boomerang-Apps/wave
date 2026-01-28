# WAVE v2 Safety Module
#
# Critical safety infrastructure for autonomous agent execution.
# All safety gates must pass before enabling --dangerously-skip-permissions.

from .constitutional import (
    ConstitutionalChecker,
    SafetyPrinciple,
    SafetyViolation,
    SafetyResult,
    WAVE_PRINCIPLES,
    check_action_safety,
    create_constitutional_node,
    ESTOP,
)

from .budget import (
    BudgetTracker,
    BudgetAlert,
    BudgetResult,
    check_budget,
    create_budget_node,
)

from .emergency_stop import (
    EmergencyStop,
    EmergencyStopError,
    EmergencyStopEvent,
    check_emergency_stop,
    require_no_emergency_stop,
    EMERGENCY_STOP_FILE,
    EMERGENCY_STOP_CHANNEL,
)

__all__ = [
    # Constitutional
    "ConstitutionalChecker",
    "SafetyPrinciple",
    "SafetyViolation",
    "SafetyResult",
    "WAVE_PRINCIPLES",
    "check_action_safety",
    "create_constitutional_node",
    "ESTOP",
    # Budget
    "BudgetTracker",
    "BudgetAlert",
    "BudgetResult",
    "check_budget",
    "create_budget_node",
    # Emergency Stop
    "EmergencyStop",
    "EmergencyStopError",
    "EmergencyStopEvent",
    "check_emergency_stop",
    "require_no_emergency_stop",
    "EMERGENCY_STOP_FILE",
    "EMERGENCY_STOP_CHANNEL",
]
