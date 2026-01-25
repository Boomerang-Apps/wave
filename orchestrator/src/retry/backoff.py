"""
Exponential Backoff Module
Calculates backoff time for retry attempts.

Based on Grok's Cyclic Retry Pattern from LANGGRAPH-ENHANCEMENT-PLAN.md
"""

import random
from typing import Optional


# Constants
BASE_BACKOFF_SECONDS = 1.0
MAX_BACKOFF_SECONDS = 300.0  # 5 minutes max
BACKOFF_MULTIPLIER = 2.0
JITTER_FACTOR = 0.1  # 10% jitter


def calculate_backoff(
    retry_count: int,
    base: float = BASE_BACKOFF_SECONDS,
    multiplier: float = BACKOFF_MULTIPLIER,
    max_backoff: float = MAX_BACKOFF_SECONDS,
    jitter: bool = False,
) -> float:
    """
    Calculate exponential backoff with optional jitter.

    Formula: min(base * (multiplier ^ retry_count), max_backoff)

    Args:
        retry_count: Current retry attempt (0-based)
        base: Base backoff in seconds (default: 1.0)
        multiplier: Exponential multiplier (default: 2.0)
        max_backoff: Maximum backoff cap in seconds (default: 300)
        jitter: Whether to add random jitter to avoid thundering herd

    Returns:
        Backoff time in seconds
    """
    # Calculate exponential backoff
    backoff = base * (multiplier ** retry_count)

    # Apply maximum cap
    backoff = min(backoff, max_backoff)

    # Add jitter if requested
    if jitter:
        jitter_range = backoff * JITTER_FACTOR
        backoff += random.uniform(-jitter_range, jitter_range)
        # Ensure non-negative
        backoff = max(0, backoff)

    return backoff


def should_retry(retry_count: int, max_retries: int) -> bool:
    """
    Determine if another retry should be attempted.

    Args:
        retry_count: Current retry count
        max_retries: Maximum allowed retries

    Returns:
        True if retry is allowed, False if max reached
    """
    return retry_count < max_retries


__all__ = [
    "calculate_backoff",
    "should_retry",
    "BASE_BACKOFF_SECONDS",
    "MAX_BACKOFF_SECONDS",
    "BACKOFF_MULTIPLIER",
]
