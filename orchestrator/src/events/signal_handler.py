"""
WAVE Signal Handlers (Command Pattern)
Story: WAVE-P2-002

Each handler processes a specific signal type. Handlers are idempotent —
duplicate signals produce the same result without side effects.
"""

import logging
from abc import ABC, abstractmethod
from typing import Optional

from src.pubsub.types import WaveMessage, EventType
from .signal_types import HandlerResult

logger = logging.getLogger(__name__)


class SignalHandler(ABC):
    """Base signal handler — one per signal type."""

    @abstractmethod
    def handle(self, message: WaveMessage) -> HandlerResult:
        """
        Process a signal message.

        Args:
            message: The incoming WaveMessage to process.

        Returns:
            HandlerResult indicating success/failure and action taken.
        """
        ...

    @property
    def name(self) -> str:
        return self.__class__.__name__


class GateCompleteHandler(SignalHandler):
    """WHEN gate_complete received THEN advance to next gate."""

    def handle(self, message: WaveMessage) -> HandlerResult:
        gate_id = message.payload.get("gate_id", "unknown")
        result = message.payload.get("result", "unknown")
        story_id = message.story_id or message.payload.get("story_id", "unknown")

        logger.info(
            "Gate %s completed for story %s with result: %s",
            gate_id, story_id, result,
        )

        return HandlerResult(
            success=True,
            action_taken=f"gate_advance:{gate_id}",
            data={
                "gate_id": gate_id,
                "result": result,
                "story_id": story_id,
                "next_gate": _next_gate(gate_id),
            },
        )


class AgentErrorHandler(SignalHandler):
    """WHEN agent_error received THEN trigger retry or escalation."""

    def __init__(self, max_retries: int = 3):
        self._max_retries = max_retries

    def handle(self, message: WaveMessage) -> HandlerResult:
        agent_id = message.source
        error = message.payload.get("error", "unknown error")
        retry_count = message.payload.get("retry_count", 0)
        story_id = message.story_id or "unknown"

        if retry_count < self._max_retries:
            action = f"retry:{agent_id}:attempt_{retry_count + 1}"
            logger.warning(
                "Agent %s error (attempt %d/%d): %s — retrying",
                agent_id, retry_count + 1, self._max_retries, error,
            )
            return HandlerResult(
                success=True,
                action_taken=action,
                data={
                    "agent_id": agent_id,
                    "retry_count": retry_count + 1,
                    "max_retries": self._max_retries,
                    "should_retry": True,
                },
            )
        else:
            action = f"escalate:{agent_id}"
            logger.error(
                "Agent %s exceeded max retries (%d): %s — escalating",
                agent_id, self._max_retries, error,
            )
            return HandlerResult(
                success=True,
                action_taken=action,
                data={
                    "agent_id": agent_id,
                    "retry_count": retry_count,
                    "should_retry": False,
                    "escalated": True,
                },
            )


class AgentBlockedHandler(SignalHandler):
    """WHEN agent_blocked received THEN pause and escalate."""

    def handle(self, message: WaveMessage) -> HandlerResult:
        agent_id = message.source
        reason = message.payload.get("reason", "unknown")
        blocked_by = message.payload.get("blocked_by", "unknown")

        logger.warning(
            "Agent %s blocked: %s (blocked by: %s)",
            agent_id, reason, blocked_by,
        )

        return HandlerResult(
            success=True,
            action_taken=f"pause:{agent_id}",
            data={
                "agent_id": agent_id,
                "reason": reason,
                "blocked_by": blocked_by,
                "paused": True,
            },
        )


class SessionPauseHandler(SignalHandler):
    """WHEN session_pause received THEN gracefully pause session."""

    def handle(self, message: WaveMessage) -> HandlerResult:
        session_id = message.session_id or message.payload.get("session_id", "unknown")
        reason = message.payload.get("reason", "manual pause")

        logger.info("Session %s pausing: %s", session_id, reason)

        return HandlerResult(
            success=True,
            action_taken=f"session_pause:{session_id}",
            data={
                "session_id": session_id,
                "reason": reason,
                "paused": True,
            },
        )


class EmergencyStopHandler(SignalHandler):
    """WHEN emergency_stop received THEN halt immediately."""

    def handle(self, message: WaveMessage) -> HandlerResult:
        reason = message.payload.get("reason", "emergency stop triggered")
        source = message.source

        logger.critical(
            "EMERGENCY STOP from %s: %s",
            source, reason,
        )

        return HandlerResult(
            success=True,
            action_taken="emergency_stop",
            data={
                "reason": reason,
                "source": source,
                "halted": True,
            },
        )


def _next_gate(gate_id: str) -> Optional[str]:
    """Determine the next gate after the given one."""
    gate_order = [
        "gate-0", "gate-1", "gate-2", "gate-3",
        "gate-4", "gate-5", "gate-6", "gate-7",
    ]
    try:
        idx = gate_order.index(gate_id)
        if idx + 1 < len(gate_order):
            return gate_order[idx + 1]
    except ValueError:
        pass
    return None
