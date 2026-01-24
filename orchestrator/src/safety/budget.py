"""
WAVE v2 Budget Tracking Module

Tracks token usage and costs, enforces limits, and triggers alerts.
"""

import os
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Optional, Callable, Dict

# Import state types
import sys
_src_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _src_dir not in sys.path:
    sys.path.insert(0, _src_dir)

try:
    from src.graph import WAVEState, EscalationLevel
except ImportError:
    from graph import WAVEState, EscalationLevel


# ═══════════════════════════════════════════════════════════════════════════════
# BUDGET TYPES
# ═══════════════════════════════════════════════════════════════════════════════

class BudgetAlertLevel(str, Enum):
    """Budget alert severity levels."""
    NORMAL = "normal"      # Under 75%
    WARNING = "warning"    # 75-89%
    CRITICAL = "critical"  # 90-99%
    EXCEEDED = "exceeded"  # 100%+


@dataclass
class BudgetAlert:
    """A budget alert notification."""
    level: BudgetAlertLevel
    message: str
    percentage: float
    tokens_used: int
    token_limit: int
    cost_usd: float
    cost_limit_usd: float
    story_id: str
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())


@dataclass
class BudgetResult:
    """Result of a budget check."""
    allowed: bool
    alert: Optional[BudgetAlert] = None
    percentage: float = 0.0
    remaining_tokens: int = 0
    remaining_cost: float = 0.0


# ═══════════════════════════════════════════════════════════════════════════════
# BUDGET TRACKER
# ═══════════════════════════════════════════════════════════════════════════════

class BudgetTracker:
    """
    Tracks and enforces budget limits for WAVE workflows.

    Features:
    - Token counting and cost estimation
    - Configurable thresholds
    - Alert generation
    - Hard limit enforcement
    """

    # Cost per 1K tokens (approximate)
    COST_PER_1K_TOKENS = {
        "claude-3-sonnet": 0.003,
        "claude-3-opus": 0.015,
        "grok-3": 0.005,
        "default": 0.005,
    }

    def __init__(
        self,
        warning_threshold: float = 0.75,
        critical_threshold: float = 0.90,
        hard_limit: bool = True
    ):
        """
        Initialize budget tracker.

        Args:
            warning_threshold: Percentage to trigger warning (default 75%)
            critical_threshold: Percentage to trigger critical (default 90%)
            hard_limit: Whether to enforce hard limits (stop at 100%)
        """
        self.warning_threshold = warning_threshold
        self.critical_threshold = critical_threshold
        self.hard_limit = hard_limit
        self._alerts: list[BudgetAlert] = []

    def estimate_tokens(self, text: str) -> int:
        """
        Estimate token count for text.

        Args:
            text: Text to estimate

        Returns:
            Estimated token count
        """
        # Rough estimate: ~4 characters per token
        return len(text) // 4

    def estimate_cost(self, tokens: int, model: str = "default") -> float:
        """
        Estimate cost for token usage.

        Args:
            tokens: Number of tokens
            model: Model name

        Returns:
            Estimated cost in USD
        """
        cost_per_1k = self.COST_PER_1K_TOKENS.get(
            model,
            self.COST_PER_1K_TOKENS["default"]
        )
        return (tokens / 1000) * cost_per_1k

    def check_budget(
        self,
        tokens_used: int,
        token_limit: int,
        cost_usd: float = 0.0,
        cost_limit_usd: float = 10.0,
        story_id: str = ""
    ) -> BudgetResult:
        """
        Check if budget allows continued operation.

        Args:
            tokens_used: Tokens used so far
            token_limit: Maximum allowed tokens
            cost_usd: Cost incurred so far
            cost_limit_usd: Maximum allowed cost
            story_id: Story identifier for alerts

        Returns:
            BudgetResult with status and any alerts
        """
        # Calculate percentages
        token_percentage = tokens_used / token_limit if token_limit > 0 else 0
        cost_percentage = cost_usd / cost_limit_usd if cost_limit_usd > 0 else 0

        # Use higher of the two
        percentage = max(token_percentage, cost_percentage)

        # Determine alert level
        if percentage >= 1.0:
            level = BudgetAlertLevel.EXCEEDED
            allowed = not self.hard_limit
            message = f"Budget exceeded! {percentage:.0%} used"
        elif percentage >= self.critical_threshold:
            level = BudgetAlertLevel.CRITICAL
            allowed = True
            message = f"Critical: {percentage:.0%} of budget used"
        elif percentage >= self.warning_threshold:
            level = BudgetAlertLevel.WARNING
            allowed = True
            message = f"Warning: {percentage:.0%} of budget used"
        else:
            level = BudgetAlertLevel.NORMAL
            allowed = True
            message = ""

        # Create alert if needed
        alert = None
        if level != BudgetAlertLevel.NORMAL:
            alert = BudgetAlert(
                level=level,
                message=message,
                percentage=percentage,
                tokens_used=tokens_used,
                token_limit=token_limit,
                cost_usd=cost_usd,
                cost_limit_usd=cost_limit_usd,
                story_id=story_id
            )
            self._alerts.append(alert)

        return BudgetResult(
            allowed=allowed,
            alert=alert,
            percentage=percentage,
            remaining_tokens=max(0, token_limit - tokens_used),
            remaining_cost=max(0, cost_limit_usd - cost_usd)
        )

    def track_usage(
        self,
        current_tokens: int,
        new_tokens: int,
        token_limit: int,
        model: str = "default",
        story_id: str = ""
    ) -> tuple[int, float, BudgetResult]:
        """
        Track new token usage and check budget.

        Args:
            current_tokens: Current token count
            new_tokens: New tokens to add
            token_limit: Maximum allowed tokens
            model: Model for cost estimation
            story_id: Story identifier

        Returns:
            Tuple of (new_total, cost, budget_result)
        """
        new_total = current_tokens + new_tokens
        cost = self.estimate_cost(new_total, model)

        result = self.check_budget(
            tokens_used=new_total,
            token_limit=token_limit,
            cost_usd=cost,
            story_id=story_id
        )

        return new_total, cost, result

    def get_alerts(self, level: Optional[BudgetAlertLevel] = None) -> list[BudgetAlert]:
        """Get all alerts, optionally filtered by level."""
        if level:
            return [a for a in self._alerts if a.level == level]
        return self._alerts.copy()

    def clear_alerts(self):
        """Clear all stored alerts."""
        self._alerts.clear()


# ═══════════════════════════════════════════════════════════════════════════════
# HELPER FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════════

def check_budget(
    tokens_used: int,
    token_limit: int,
    cost_usd: float = 0.0,
    cost_limit_usd: float = 10.0
) -> BudgetResult:
    """
    Quick helper to check budget status.

    Args:
        tokens_used: Tokens used
        token_limit: Token limit
        cost_usd: Cost incurred
        cost_limit_usd: Cost limit

    Returns:
        BudgetResult
    """
    tracker = BudgetTracker()
    return tracker.check_budget(tokens_used, token_limit, cost_usd, cost_limit_usd)


def create_budget_node(
    tracker: Optional[BudgetTracker] = None
) -> Callable[[WAVEState], dict]:
    """
    Create a budget checking node for the WAVE graph.

    Args:
        tracker: Optional pre-configured tracker

    Returns:
        Node function for the graph
    """
    _tracker = tracker or BudgetTracker()

    def budget_node(state: WAVEState) -> dict:
        """Check and update budget state."""
        budget = state.get("budget", {})

        tokens_used = budget.get("tokens_used", 0)
        token_limit = budget.get("token_limit", 100_000)
        cost_usd = budget.get("cost_usd", 0.0)
        cost_limit_usd = budget.get("cost_limit_usd", 10.0)

        result = _tracker.check_budget(
            tokens_used=tokens_used,
            token_limit=token_limit,
            cost_usd=cost_usd,
            cost_limit_usd=cost_limit_usd,
            story_id=state.get("story_id", "")
        )

        # Determine escalation
        safety = state.get("safety", {})
        if result.alert:
            if result.alert.level == BudgetAlertLevel.EXCEEDED:
                escalation = EscalationLevel.CRITICAL.value
            elif result.alert.level == BudgetAlertLevel.CRITICAL:
                escalation = EscalationLevel.WARNING.value
            else:
                escalation = safety.get("escalation_level", EscalationLevel.NONE.value)
        else:
            escalation = safety.get("escalation_level", EscalationLevel.NONE.value)

        return {
            "budget": {
                **budget,
                "percentage": result.percentage,
                "remaining_tokens": result.remaining_tokens,
                "remaining_cost": result.remaining_cost,
            },
            "safety": {
                **safety,
                "escalation_level": escalation,
                "emergency_stop": not result.allowed
            }
        }

    return budget_node


# ═══════════════════════════════════════════════════════════════════════════════
# EXPORTS
# ═══════════════════════════════════════════════════════════════════════════════

__all__ = [
    "BudgetAlertLevel",
    "BudgetAlert",
    "BudgetResult",
    "BudgetTracker",
    "check_budget",
    "create_budget_node",
]
