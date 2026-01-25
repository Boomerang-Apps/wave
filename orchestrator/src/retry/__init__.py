"""
WAVE Retry Module

Provides retry/dev-fix loop with exponential backoff and human escalation.
Implements cyclic retry pattern for QA failure recovery.

Based on Grok's Cyclic Retry Pattern from LANGGRAPH-ENHANCEMENT-PLAN.md
"""

from .retry_state import (
    RetryState,
    create_retry_state,
)
from .backoff import (
    calculate_backoff,
    should_retry,
    BASE_BACKOFF_SECONDS,
    MAX_BACKOFF_SECONDS,
    BACKOFF_MULTIPLIER,
)
from .retry_router import (
    qa_retry_router,
    should_escalate,
    get_escalation_reason,
    SAFETY_ESCALATION_THRESHOLD,
    RetryRoute,
)
from .retry_graph import (
    create_retry_graph,
    compile_retry_graph,
    RetryGraphState,
)

__all__ = [
    # State
    "RetryState",
    "create_retry_state",
    # Backoff
    "calculate_backoff",
    "should_retry",
    "BASE_BACKOFF_SECONDS",
    "MAX_BACKOFF_SECONDS",
    "BACKOFF_MULTIPLIER",
    # Router
    "qa_retry_router",
    "should_escalate",
    "get_escalation_reason",
    "SAFETY_ESCALATION_THRESHOLD",
    "RetryRoute",
    # Graph
    "create_retry_graph",
    "compile_retry_graph",
    "RetryGraphState",
]
