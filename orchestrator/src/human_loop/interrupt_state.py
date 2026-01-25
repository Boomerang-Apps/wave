"""
Interrupt State Module
TypedDicts for human-in-the-loop escalation and decisions.

Based on Grok's Human-in-the-Loop Pattern from LANGGRAPH-ENHANCEMENT-PLAN.md
"""

from datetime import datetime, timezone
from typing import TypedDict, Dict, Any, Optional


class EscalationRequest(TypedDict):
    """
    Request for human escalation.

    Created when workflow needs human intervention.
    Includes context for human reviewer.
    """
    run_id: str
    reason: str
    context: Dict[str, Any]
    requested_at: str


class HumanDecision(TypedDict):
    """
    Human decision on escalation.

    Provided when human reviews and responds to escalation.
    """
    approved: bool
    feedback: str
    decided_by: Optional[str]
    decided_at: Optional[str]


class InterruptState(TypedDict):
    """
    State for interrupt/resume flow.

    Tracks the current interrupt status and context.
    """
    is_interrupted: bool
    escalation_request: Optional[EscalationRequest]
    human_decision: Optional[HumanDecision]


def create_escalation_request(
    run_id: str,
    reason: str,
    context: Optional[Dict[str, Any]] = None
) -> EscalationRequest:
    """
    Factory function to create an EscalationRequest.

    Args:
        run_id: Unique identifier for the run
        reason: Reason for escalation
        context: Additional context for reviewer

    Returns:
        EscalationRequest dict
    """
    timestamp = datetime.now(timezone.utc).isoformat()

    return EscalationRequest(
        run_id=run_id,
        reason=reason,
        context=context or {},
        requested_at=timestamp,
    )


def create_human_decision(
    approved: bool,
    feedback: str,
    decided_by: Optional[str] = None
) -> HumanDecision:
    """
    Factory function to create a HumanDecision.

    Args:
        approved: Whether the escalation was approved
        feedback: Human feedback/comments
        decided_by: Email/ID of the human reviewer

    Returns:
        HumanDecision dict
    """
    timestamp = datetime.now(timezone.utc).isoformat()

    return HumanDecision(
        approved=approved,
        feedback=feedback,
        decided_by=decided_by,
        decided_at=timestamp,
    )


def create_interrupt_state() -> InterruptState:
    """
    Factory function to create initial InterruptState.

    Returns:
        InterruptState with defaults
    """
    return InterruptState(
        is_interrupted=False,
        escalation_request=None,
        human_decision=None,
    )


__all__ = [
    "EscalationRequest",
    "HumanDecision",
    "InterruptState",
    "create_escalation_request",
    "create_human_decision",
    "create_interrupt_state",
]
