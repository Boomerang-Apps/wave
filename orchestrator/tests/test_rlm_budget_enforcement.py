"""
TDD Tests for RLM Budget Enforcement
Gate 0 Validation - Grok Improvement Request

These tests are written FIRST (RED state) before implementation.
Tests should FAIL initially, then pass after implementation (GREEN state).

Grok Requirement: Add RLM hooks to agents (check_rlm_budget() before LLM calls)
"""

import pytest
from unittest.mock import MagicMock, patch
import os
import sys

# Add parent to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


class TestRLMBudgetEnforcement:
    """TDD tests for RLM budget enforcement in agents."""

    def test_check_rlm_budget_returns_true_when_under_limit(self):
        """Test that check_rlm_budget returns True when tokens used < 80% of limit."""
        from tools.p_variable import check_rlm_budget

        rlm_config = {
            "rateLimit": {
                "maxTokensPerMinute": 100000
            },
            "budget": {
                "alertThreshold": 0.8
            }
        }

        # 50,000 tokens used = 50% of 100,000 limit
        result = check_rlm_budget(rlm_config, tokens_used=50000)
        assert result["safe"] is True
        assert result["usage_percent"] == 50.0

    def test_check_rlm_budget_returns_warning_at_threshold(self):
        """Test that check_rlm_budget returns warning when at 80% threshold."""
        from tools.p_variable import check_rlm_budget

        rlm_config = {
            "rateLimit": {
                "maxTokensPerMinute": 100000
            },
            "budget": {
                "alertThreshold": 0.8
            }
        }

        # 80,000 tokens used = 80% of 100,000 limit (at threshold)
        result = check_rlm_budget(rlm_config, tokens_used=80000)
        assert result["safe"] is True  # Still safe but warning
        assert result["warning"] is True
        assert result["usage_percent"] == 80.0

    def test_check_rlm_budget_returns_false_when_over_limit(self):
        """Test that check_rlm_budget returns False when over limit."""
        from tools.p_variable import check_rlm_budget

        rlm_config = {
            "rateLimit": {
                "maxTokensPerMinute": 100000
            },
            "budget": {
                "alertThreshold": 0.8
            }
        }

        # 110,000 tokens used = 110% of 100,000 limit
        result = check_rlm_budget(rlm_config, tokens_used=110000)
        assert result["safe"] is False
        assert abs(result["usage_percent"] - 110.0) < 0.01  # Float comparison

    def test_check_rlm_cost_budget(self):
        """Test that check_rlm_budget checks cost limits too."""
        from tools.p_variable import check_rlm_budget

        rlm_config = {
            "rateLimit": {
                "maxTokensPerMinute": 100000,
                "maxCostPerHour": 10
            },
            "budget": {
                "alertThreshold": 0.8,
                "maxDailySpend": 50
            }
        }

        # Under token limit but over cost alert threshold
        result = check_rlm_budget(rlm_config, tokens_used=50000, cost_used=8.5)
        assert result["cost_warning"] is True  # 8.5 > 8.0 (80% of 10)

    def test_check_rlm_budget_with_default_config(self):
        """Test that check_rlm_budget works with default config."""
        from tools.p_variable import check_rlm_budget, get_default_rlm_config

        rlm_config = get_default_rlm_config()
        result = check_rlm_budget(rlm_config, tokens_used=50000)
        assert result["safe"] is True


class TestRLMBudgetIntegration:
    """Integration tests for RLM budget in agent worker."""

    def test_agent_worker_checks_budget_before_llm_call(self):
        """Test that agent worker checks RLM budget before making LLM calls."""
        from tools.p_variable import check_rlm_budget

        # Simulate over-budget scenario
        rlm_config = {"rateLimit": {"maxTokensPerMinute": 100000}, "budget": {"alertThreshold": 0.8}}
        result = check_rlm_budget(rlm_config, tokens_used=110000)

        # Should indicate not safe
        assert result["safe"] is False
        assert result["usage_percent"] > 100

    def test_agent_worker_proceeds_when_budget_ok(self):
        """Test that agent worker proceeds when budget is OK."""
        from tools.p_variable import check_rlm_budget

        # Simulate under-budget scenario
        rlm_config = {"rateLimit": {"maxTokensPerMinute": 100000}, "budget": {"alertThreshold": 0.8}}
        result = check_rlm_budget(rlm_config, tokens_used=50000)

        # Should indicate safe
        assert result["safe"] is True
        assert result["usage_percent"] == 50.0


class TestRLMBudgetTracking:
    """Tests for tracking token usage over time."""

    def test_budget_tracker_accumulates_tokens(self):
        """Test that budget tracker accumulates tokens correctly."""
        from tools.p_variable import RLMBudgetTracker

        tracker = RLMBudgetTracker()
        tracker.add_usage(tokens=1000, cost=0.015)
        tracker.add_usage(tokens=2000, cost=0.030)

        assert tracker.total_tokens == 3000
        assert tracker.total_cost == 0.045

    def test_budget_tracker_resets_on_new_minute(self):
        """Test that per-minute tracking resets correctly."""
        from tools.p_variable import RLMBudgetTracker

        tracker = RLMBudgetTracker()
        tracker.add_usage(tokens=50000)

        # Simulate 1 minute passing
        tracker._reset_minute_counter()

        assert tracker.tokens_this_minute == 0


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
