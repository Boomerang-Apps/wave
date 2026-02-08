"""
WAVE Event-Driven Architecture
Story: WAVE-P2-002

Replaces polling-based signal detection with event-driven pub/sub.
"""

from .signal_types import HandlerResult, SignalCategory, SIGNAL_CATEGORIES
from .signal_handler import (
    SignalHandler,
    GateCompleteHandler,
    AgentErrorHandler,
    AgentBlockedHandler,
    SessionPauseHandler,
    EmergencyStopHandler,
)
from .event_dispatcher import EventDispatcher, ResultWaiter

__all__ = [
    "HandlerResult",
    "SignalCategory",
    "SIGNAL_CATEGORIES",
    "SignalHandler",
    "GateCompleteHandler",
    "AgentErrorHandler",
    "AgentBlockedHandler",
    "SessionPauseHandler",
    "EmergencyStopHandler",
    "EventDispatcher",
    "ResultWaiter",
]
