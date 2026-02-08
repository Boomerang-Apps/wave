"""
Approval Manager
Story: WAVE-P5-002

Manages approval requests, decisions, and audit logging.
"""

import enum
import logging
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Dict, List, Optional
from uuid import uuid4

from .human_checkpoint import CheckpointEvent

logger = logging.getLogger(__name__)


class ApprovalStatus(enum.Enum):
    """Status of an approval decision."""
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


@dataclass
class ApprovalDecision:
    """Record of an approval decision."""
    checkpoint_id: str
    story_id: str
    status: ApprovalStatus = ApprovalStatus.PENDING
    requested_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    decided_at: Optional[datetime] = None
    approver: Optional[str] = None
    reason: Optional[str] = None
    event: Optional[CheckpointEvent] = None
    description: str = ""


class ApprovalManager:
    """
    Manages checkpoint approvals (AC-06, AC-08).

    Tracks pending approvals, records decisions with approver
    identity and timestamp for audit.
    """

    def __init__(self):
        self._decisions: Dict[str, ApprovalDecision] = {}

    def request_approval(
        self,
        story_id: str,
        event: CheckpointEvent,
        description: str,
    ) -> str:
        """
        Create a new approval request.

        Returns:
            Checkpoint ID.
        """
        checkpoint_id = f"cp-{str(uuid4())[:8]}"
        self._decisions[checkpoint_id] = ApprovalDecision(
            checkpoint_id=checkpoint_id,
            story_id=story_id,
            event=event,
            description=description,
        )
        logger.info("Approval requested: %s for %s", checkpoint_id, story_id)
        return checkpoint_id

    def approve(self, checkpoint_id: str, approver: str) -> None:
        """Approve a checkpoint (AC-06, AC-08)."""
        decision = self._decisions.get(checkpoint_id)
        if decision:
            decision.status = ApprovalStatus.APPROVED
            decision.approver = approver
            decision.decided_at = datetime.now(timezone.utc)
            logger.info("Checkpoint %s approved by %s", checkpoint_id, approver)

    def reject(
        self, checkpoint_id: str, approver: str, reason: str = ""
    ) -> None:
        """Reject a checkpoint (AC-06, AC-08)."""
        decision = self._decisions.get(checkpoint_id)
        if decision:
            decision.status = ApprovalStatus.REJECTED
            decision.approver = approver
            decision.reason = reason
            decision.decided_at = datetime.now(timezone.utc)
            logger.info("Checkpoint %s rejected by %s: %s", checkpoint_id, approver, reason)

    def get_decision(self, checkpoint_id: str) -> Optional[ApprovalDecision]:
        """Get decision for a checkpoint."""
        return self._decisions.get(checkpoint_id)

    def get_pending(self) -> List[ApprovalDecision]:
        """Get all pending approvals."""
        return [
            d for d in self._decisions.values()
            if d.status == ApprovalStatus.PENDING
        ]

    def get_audit_log(self) -> List[ApprovalDecision]:
        """Get all decisions for audit (AC-08)."""
        return [
            d for d in self._decisions.values()
            if d.status != ApprovalStatus.PENDING
        ]
