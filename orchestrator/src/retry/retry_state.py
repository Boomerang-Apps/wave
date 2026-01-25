"""
Retry State Module
State schema for retry/dev-fix loop with exponential backoff.

Based on Grok's Cyclic Retry Pattern from LANGGRAPH-ENHANCEMENT-PLAN.md
"""

from typing import TypedDict


class RetryState(TypedDict):
    """
    State schema for retry tracking.

    Tracks retry attempts, backoff timing, and error history.
    """
    # Current retry count
    count: int

    # Maximum allowed retries before escalation
    max_retries: int

    # Last error message from QA
    last_error: str

    # Backoff time in seconds before next retry
    backoff_seconds: float


def create_retry_state(
    max_retries: int = 3,
    count: int = 0,
) -> RetryState:
    """
    Factory function to create initial retry state.

    Args:
        max_retries: Maximum retry attempts before escalation (default: 3)
        count: Initial retry count (default: 0)

    Returns:
        Initialized RetryState
    """
    return RetryState(
        count=count,
        max_retries=max_retries,
        last_error="",
        backoff_seconds=0.0,
    )


__all__ = [
    "RetryState",
    "create_retry_state",
]
