"""
WAVE Human Loop Module

Provides human-in-the-loop interrupt/resume pattern for workflow escalation.
Humans can review paused workflows and provide decisions to continue or cancel.

Based on Grok's Human-in-the-Loop Pattern from LANGGRAPH-ENHANCEMENT-PLAN.md
"""

from . import interrupt_state

from .interrupt_state import (
    EscalationRequest,
    HumanDecision,
    InterruptState,
    create_escalation_request,
    create_human_decision,
    create_interrupt_state,
)
from .interrupt_handler import (
    create_escalation_context,
    validate_human_decision,
    process_human_decision,
)
from .resume_handler import (
    can_resume,
    get_pending_escalation,
    resume_workflow,
    get_resume_options,
)
from .human_loop_graph import (
    create_human_loop_graph,
    compile_human_loop_graph,
    human_decision_router,
    escalation_node,
    resume_node,
    HumanLoopGraphState,
)

__all__ = [
    # Module
    "interrupt_state",
    # State Types
    "EscalationRequest",
    "HumanDecision",
    "InterruptState",
    "create_escalation_request",
    "create_human_decision",
    "create_interrupt_state",
    # Interrupt Handler
    "create_escalation_context",
    "validate_human_decision",
    "process_human_decision",
    # Resume Handler
    "can_resume",
    "get_pending_escalation",
    "resume_workflow",
    "get_resume_options",
    # Graph
    "create_human_loop_graph",
    "compile_human_loop_graph",
    "human_decision_router",
    "escalation_node",
    "resume_node",
    "HumanLoopGraphState",
]
