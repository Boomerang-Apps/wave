"""
Dev-Fix Agent Node
Specialized agent for fixing QA failures with targeted fixes.

Based on Grok's Cyclic Retry Pattern from LANGGRAPH-ENHANCEMENT-PLAN.md

Unlike regular dev node, this agent:
1. Analyzes specific QA failure feedback
2. Generates targeted fix (not full implementation)
3. Tracks retry count with exponential backoff
4. Escalates after max retries
"""

from datetime import datetime, timezone
from typing import Dict, Any

from src.retry.backoff import calculate_backoff


DEV_FIX_SYSTEM_PROMPT = """You are the Dev-Fix agent in a multi-agent software development system.

Your specialized role is to FIX QA failures, not implement new features.

You receive:
1. The original task/code
2. Specific QA failure feedback
3. Retry attempt number

Your responsibilities:
1. Analyze the specific QA failure
2. Generate a targeted fix (minimal change)
3. Focus on the exact error, not general improvements
4. Document what you changed and why

Guidelines:
- Keep changes minimal and focused
- Don't refactor unrelated code
- If the error is unclear, ask for clarification
- If you've tried the same fix before, try a different approach
"""


def dev_fix_node(state: Dict[str, Any]) -> Dict[str, Any]:
    """
    Dev-Fix node - generates targeted fixes for QA failures.

    Args:
        state: Current workflow state with qa_feedback and retry info

    Returns:
        Dict with state updates including incremented retry count
    """
    timestamp = datetime.now(timezone.utc).isoformat()

    # Get retry state
    retry = state.get("retry", {
        "count": 0,
        "max_retries": 3,
        "last_error": "",
        "backoff_seconds": 0.0,
    })

    retry_count = retry.get("count", 0)
    max_retries = retry.get("max_retries", 3)

    # Check if max retries reached - escalate
    if retry_count >= max_retries:
        return {
            "needs_human": True,
            "escalate": True,
            "escalation_reason": f"Max retries ({max_retries}) exceeded",
            "retry": retry,
            "current_agent": "dev_fix",
        }

    # Get QA feedback
    qa_feedback = state.get("qa_feedback", "Unknown failure")

    # Calculate backoff for this retry
    backoff = calculate_backoff(retry_count)

    # Increment retry count and store error
    new_retry = {
        "count": retry_count + 1,
        "max_retries": max_retries,
        "last_error": qa_feedback,
        "backoff_seconds": backoff,
    }

    # In real implementation, would call LLM here to generate fix
    # For skeleton, just return updated state

    return {
        "retry": new_retry,
        "current_agent": "dev_fix",
        "needs_human": False,
    }


__all__ = [
    "dev_fix_node",
    "DEV_FIX_SYSTEM_PROMPT",
]
