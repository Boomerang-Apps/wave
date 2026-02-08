"""
Escalation Handler
Story: WAVE-P5-002

Handles timeout-based escalation when approvals are not received.
"""

import logging
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import List

from .approval_manager import ApprovalDecision, ApprovalStatus

logger = logging.getLogger(__name__)


@dataclass
class EscalationResult:
    """Result of a timeout check."""
    should_escalate: bool
    contacts: List[str] = field(default_factory=list)
    elapsed_seconds: float = 0.0


class EscalationHandler:
    """
    Handles approval timeout and escalation (AC-07).

    When approval is not received within timeout_seconds, escalates
    to the configured escalation contacts.
    """

    def __init__(
        self,
        timeout_seconds: int = 14400,  # 4 hours default
        escalation_contacts: List[str] = None,
    ):
        self.timeout_seconds = timeout_seconds
        self.escalation_contacts = escalation_contacts or []

    def check_timeout(self, decision: ApprovalDecision) -> EscalationResult:
        """
        Check if a pending decision has timed out.

        Args:
            decision: The approval decision to check.

        Returns:
            EscalationResult indicating whether escalation is needed.
        """
        if decision.status != ApprovalStatus.PENDING:
            return EscalationResult(should_escalate=False)

        now = datetime.now(timezone.utc)
        elapsed = (now - decision.requested_at).total_seconds()

        if elapsed > self.timeout_seconds:
            logger.warning(
                "Checkpoint %s timed out after %.0fs, escalating to %s",
                decision.checkpoint_id, elapsed, self.escalation_contacts,
            )
            return EscalationResult(
                should_escalate=True,
                contacts=list(self.escalation_contacts),
                elapsed_seconds=elapsed,
            )

        return EscalationResult(
            should_escalate=False,
            elapsed_seconds=elapsed,
        )
