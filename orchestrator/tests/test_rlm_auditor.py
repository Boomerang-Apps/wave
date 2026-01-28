"""
TDD Tests for RLM Auditor
Gate 0 Validation - Grok Improvement Request

These tests are written FIRST (RED state) before implementation.
Tests should FAIL initially, then pass after implementation (GREEN state).

Grok Requirement: Create rlm_auditor.py (monitors during runs)
- Real-time budget tracking
- Context optimization
- Alert generation
"""

import pytest
from unittest.mock import MagicMock, patch, AsyncMock
import json
import os
import sys
from datetime import datetime

# Add parent to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


class TestRLMAuditorBasic:
    """Basic TDD tests for RLM Auditor."""

    def test_rlm_auditor_initialization(self):
        """Test that RLM auditor initializes correctly."""
        from scripts.rlm_auditor import RLMAuditor

        auditor = RLMAuditor(project_path="/Volumes/SSD-01/Projects/Footprint")

        assert auditor.project_path == "/Volumes/SSD-01/Projects/Footprint"
        assert auditor.rlm_config is not None
        assert auditor.is_running is False

    def test_rlm_auditor_loads_config(self):
        """Test that RLM auditor loads RLM config correctly."""
        from scripts.rlm_auditor import RLMAuditor

        auditor = RLMAuditor(project_path="/test/path")

        # Should have default config even if file doesn't exist
        assert "rateLimit" in auditor.rlm_config
        assert "budget" in auditor.rlm_config

    def test_rlm_auditor_get_status(self):
        """Test that RLM auditor returns status correctly."""
        from scripts.rlm_auditor import RLMAuditor

        auditor = RLMAuditor(project_path="/test/path")
        auditor.tokens_used = 50000
        auditor.cost_used = 0.75

        status = auditor.get_status()

        assert status["tokens_used"] == 50000
        assert status["cost_used"] == 0.75
        assert "budget_ok" in status
        assert "warnings" in status


class TestRLMAuditorBudgetChecks:
    """TDD tests for RLM Auditor budget checking."""

    def test_check_budget_returns_ok_when_under_limit(self):
        """Test budget check returns OK when under limit."""
        from scripts.rlm_auditor import RLMAuditor

        auditor = RLMAuditor(project_path="/test/path")
        auditor.rlm_config = {
            "rateLimit": {"maxTokensPerMinute": 100000},
            "budget": {"alertThreshold": 0.8, "maxDailySpend": 50}
        }
        auditor.tokens_used = 50000
        auditor.cost_used = 20.0

        result = auditor.check_budget()

        assert result["ok"] is True
        assert result["token_percent"] == 50.0
        assert result["cost_percent"] == 40.0  # 20/50 * 100

    def test_check_budget_returns_warning_at_threshold(self):
        """Test budget check returns warning at 80% threshold."""
        from scripts.rlm_auditor import RLMAuditor

        auditor = RLMAuditor(project_path="/test/path")
        auditor.rlm_config = {
            "rateLimit": {"maxTokensPerMinute": 100000},
            "budget": {"alertThreshold": 0.8, "maxDailySpend": 50}
        }
        auditor.tokens_used = 80000  # 80% of limit
        auditor.cost_used = 20.0

        result = auditor.check_budget()

        assert result["ok"] is True  # Still OK but warning
        assert result["warning"] is True
        assert "token" in result["warning_message"].lower()

    def test_check_budget_returns_halt_when_over_limit(self):
        """Test budget check returns halt recommendation when over limit."""
        from scripts.rlm_auditor import RLMAuditor

        auditor = RLMAuditor(project_path="/test/path")
        auditor.rlm_config = {
            "rateLimit": {"maxTokensPerMinute": 100000},
            "budget": {"alertThreshold": 0.8, "maxDailySpend": 50}
        }
        auditor.tokens_used = 110000  # Over limit
        auditor.cost_used = 20.0

        result = auditor.check_budget()

        assert result["ok"] is False
        assert result["halt_recommended"] is True


class TestRLMAuditorContextOptimization:
    """TDD tests for RLM Auditor context optimization."""

    def test_optimize_context_returns_pruned_p_variable(self):
        """Test that optimize_context returns pruned P variable."""
        from scripts.rlm_auditor import RLMAuditor

        auditor = RLMAuditor(project_path="/test/path")
        auditor.p_variable = {
            "wave_state": {"current_wave": 1},
            "agent_memory": {"last_action": "test"},
            "codebase": {"files": ["file1", "file2", "file3"] * 1000}  # Bloated
        }

        optimized = auditor.optimize_context()

        # Should have essential keys
        assert "wave_state" in optimized
        assert "agent_memory" in optimized
        # Should NOT have bloated codebase files
        assert len(optimized.get("codebase", {}).get("files", [])) < 100


class TestRLMAuditorMonitoring:
    """TDD tests for RLM Auditor monitoring loop."""

    def test_auditor_tracks_usage_over_time(self):
        """Test that auditor tracks usage accumulation."""
        from scripts.rlm_auditor import RLMAuditor

        auditor = RLMAuditor(project_path="/test/path")

        auditor.record_usage(tokens=1000, cost=0.015)
        auditor.record_usage(tokens=2000, cost=0.030)

        assert auditor.tokens_used == 3000
        assert auditor.cost_used == 0.045

    def test_auditor_generates_alerts(self):
        """Test that auditor generates alerts when thresholds crossed."""
        from scripts.rlm_auditor import RLMAuditor

        auditor = RLMAuditor(project_path="/test/path")
        auditor.rlm_config = {
            "rateLimit": {"maxTokensPerMinute": 100000},
            "budget": {"alertThreshold": 0.8, "maxDailySpend": 50}
        }

        # Record usage that crosses threshold
        auditor.record_usage(tokens=85000, cost=0.0)

        alerts = auditor.get_alerts()

        assert len(alerts) > 0
        assert any("budget" in alert.lower() or "token" in alert.lower() for alert in alerts)


class TestRLMAuditorIntegration:
    """Integration tests for RLM Auditor with issue detector."""

    def test_auditor_integrates_with_issue_detector(self):
        """Test that auditor can report to issue detector."""
        from scripts.rlm_auditor import RLMAuditor

        # Create mock issue detector
        mock_detector = MagicMock()
        mock_detector.report_issue = MagicMock()

        auditor = RLMAuditor(project_path="/test/path", issue_detector=mock_detector)
        auditor.rlm_config = {
            "rateLimit": {"maxTokensPerMinute": 100000},
            "budget": {"alertThreshold": 0.8}
        }

        # Trigger a halt condition (over 100%)
        auditor.record_usage(tokens=110000)

        # Should have called issue detector's report_issue
        assert mock_detector.report_issue.called


class TestRLMAuditorReporting:
    """TDD tests for RLM Auditor reporting."""

    def test_generate_report_includes_all_metrics(self):
        """Test that report includes all required metrics."""
        from scripts.rlm_auditor import RLMAuditor

        auditor = RLMAuditor(project_path="/test/path")
        auditor.tokens_used = 50000
        auditor.cost_used = 0.75
        # start_time is already set in __init__

        report = auditor.generate_report()

        assert "tokens_used" in report
        assert "cost_used" in report
        assert "duration" in report or "elapsed_seconds" in report
        assert "budget_status" in report

    def test_report_includes_optimization_stats(self):
        """Test that report includes context optimization stats."""
        from scripts.rlm_auditor import RLMAuditor

        auditor = RLMAuditor(project_path="/test/path")
        auditor.original_context_size = 10000
        auditor.optimized_context_size = 5000

        report = auditor.generate_report()

        assert "context_reduction" in report or "optimization" in report


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
