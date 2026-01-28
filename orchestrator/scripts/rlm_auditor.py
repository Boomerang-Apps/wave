"""
RLM Auditor - Real-time Budget and Context Monitoring
Gate 0 Enhancement - Grok Improvement Request

Monitors RLM budget during WAVE runs:
- Tracks token and cost usage
- Generates alerts at thresholds
- Optimizes context for agents
- Integrates with issue_detector

Usage:
    python rlm_auditor.py --project /path/to/project
    python rlm_auditor.py --project /Volumes/SSD-01/Projects/Footprint &
"""

import os
import sys
import json
import time
import argparse
from datetime import datetime, timezone
from typing import Dict, Any, Optional, List

# Add parent to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from tools.p_variable import (
    load_p_variable,
    load_rlm_config,
    get_default_rlm_config,
    check_rlm_budget,
    prune_p_variable,
    estimate_token_count
)


class RLMAuditor:
    """
    Real-time RLM budget and context auditor.

    Monitors token/cost usage and generates alerts when thresholds are crossed.
    """

    def __init__(
        self,
        project_path: str,
        issue_detector: Optional[Any] = None,
        poll_interval: int = 60
    ):
        """
        Initialize RLM Auditor.

        Args:
            project_path: Path to project root
            issue_detector: Optional IssueDetector instance for integration
            poll_interval: Seconds between status checks
        """
        self.project_path = project_path
        self.issue_detector = issue_detector
        self.poll_interval = poll_interval

        # Load configs
        self.rlm_config = load_rlm_config(project_path) or get_default_rlm_config()
        self.p_variable = load_p_variable(project_path)

        # Usage tracking
        self.tokens_used = 0
        self.cost_used = 0.0
        self.start_time = datetime.now()  # Use naive datetime for consistency

        # Context optimization stats
        self.original_context_size = 0
        self.optimized_context_size = 0

        # Alerts
        self._alerts: List[str] = []

        # State
        self.is_running = False

    def get_status(self) -> Dict[str, Any]:
        """Get current auditor status."""
        budget_check = self.check_budget()
        return {
            "tokens_used": self.tokens_used,
            "cost_used": self.cost_used,
            "budget_ok": budget_check["ok"],
            "warnings": self._alerts,
            "elapsed_seconds": (datetime.now() - self.start_time).total_seconds()
        }

    def check_budget(self) -> Dict[str, Any]:
        """
        Check current budget status.

        Returns:
            Dict with ok status, warnings, and halt recommendations
        """
        rate_limit = self.rlm_config.get("rateLimit", {})
        budget = self.rlm_config.get("budget", {})

        max_tokens = rate_limit.get("maxTokensPerMinute", 100000)
        max_daily = budget.get("maxDailySpend", 50)
        alert_threshold = budget.get("alertThreshold", 0.8)

        token_percent = (self.tokens_used / max_tokens * 100) if max_tokens > 0 else 0
        cost_percent = (self.cost_used / max_daily * 100) if max_daily > 0 else 0

        # Check thresholds
        token_warning = token_percent >= (alert_threshold * 100)
        cost_warning = cost_percent >= (alert_threshold * 100)
        over_limit = token_percent > 100 or cost_percent > 100

        result = {
            "ok": not over_limit,
            "token_percent": token_percent,
            "cost_percent": cost_percent,
            "warning": token_warning or cost_warning,
            "halt_recommended": over_limit
        }

        # Add warning message if needed
        if token_warning:
            result["warning_message"] = f"Token usage at {token_percent:.1f}% of limit"
        elif cost_warning:
            result["warning_message"] = f"Cost usage at {cost_percent:.1f}% of daily limit"

        return result

    def record_usage(self, tokens: int = 0, cost: float = 0.0):
        """
        Record token and cost usage.

        Args:
            tokens: Tokens used
            cost: Cost in USD
        """
        self.tokens_used += tokens
        self.cost_used += cost

        # Check for alerts
        budget_status = self.check_budget()
        if budget_status.get("warning") and not budget_status.get("halt_recommended"):
            alert = f"[WARNING] Budget alert: {budget_status.get('warning_message', 'threshold crossed')}"
            if alert not in self._alerts:
                self._alerts.append(alert)
                print(alert)

        if budget_status.get("halt_recommended"):
            alert = f"[CRITICAL] Budget exceeded - halt recommended"
            if alert not in self._alerts:
                self._alerts.append(alert)
                print(alert)

            # Report to issue detector if available
            if self.issue_detector:
                try:
                    self.issue_detector.report_issue({
                        "type": "budget_exceeded",
                        "tokens": self.tokens_used,
                        "cost": self.cost_used
                    })
                except Exception:
                    pass

    def get_alerts(self) -> List[str]:
        """Get all generated alerts."""
        return self._alerts.copy()

    def optimize_context(self) -> Dict[str, Any]:
        """
        Get optimized (pruned) P Variable.

        Returns:
            Pruned P Variable dict
        """
        if not self.p_variable:
            self.p_variable = load_p_variable(self.project_path)

        if self.p_variable:
            self.original_context_size = estimate_token_count(self.p_variable)
            pruned = prune_p_variable(self.p_variable)
            self.optimized_context_size = estimate_token_count(pruned)
            return pruned

        return {}

    def generate_report(self) -> Dict[str, Any]:
        """
        Generate audit report.

        Returns:
            Dict with all metrics and status
        """
        budget_status = self.check_budget()
        elapsed = (datetime.now() - self.start_time).total_seconds()

        # Calculate context reduction if we have data
        context_reduction = 0
        if self.original_context_size > 0:
            context_reduction = (
                (self.original_context_size - self.optimized_context_size)
                / self.original_context_size * 100
            )

        return {
            "tokens_used": self.tokens_used,
            "cost_used": self.cost_used,
            "elapsed_seconds": elapsed,
            "duration": f"{elapsed:.1f}s",
            "budget_status": "OK" if budget_status["ok"] else "EXCEEDED",
            "token_percent": budget_status["token_percent"],
            "cost_percent": budget_status["cost_percent"],
            "alerts": self._alerts,
            "context_reduction": f"{context_reduction:.1f}%",
            "optimization": {
                "original_tokens": self.original_context_size,
                "optimized_tokens": self.optimized_context_size,
                "reduction_percent": context_reduction
            }
        }

    def run(self):
        """
        Run auditor in monitoring loop.

        Polls status every poll_interval seconds.
        """
        self.is_running = True
        print(f"[RLM Auditor] Starting for project: {self.project_path}")
        print(f"[RLM Auditor] Poll interval: {self.poll_interval}s")
        print(f"[RLM Auditor] Config: {json.dumps(self.rlm_config, indent=2)}")

        # Initial context optimization
        optimized = self.optimize_context()
        print(f"[RLM Auditor] Context optimized: {self.original_context_size} -> {self.optimized_context_size} tokens")

        try:
            while self.is_running:
                status = self.get_status()
                budget = self.check_budget()

                print(f"\n[RLM Status] Tokens: {status['tokens_used']} | Cost: ${status['cost_used']:.4f}")
                print(f"[RLM Status] Budget OK: {budget['ok']} | Token%: {budget['token_percent']:.1f}%")

                if budget.get("halt_recommended"):
                    print("[RLM ALERT] Budget exceeded - HALT RECOMMENDED")

                time.sleep(self.poll_interval)

        except KeyboardInterrupt:
            print("\n[RLM Auditor] Stopped by user")
        finally:
            self.is_running = False
            report = self.generate_report()
            print(f"\n[RLM Report] {json.dumps(report, indent=2)}")


def main():
    parser = argparse.ArgumentParser(description="RLM Budget Auditor")
    parser.add_argument("--project", "-p", required=True, help="Project path")
    parser.add_argument("--interval", "-i", type=int, default=60, help="Poll interval (seconds)")
    args = parser.parse_args()

    auditor = RLMAuditor(
        project_path=args.project,
        poll_interval=args.interval
    )
    auditor.run()


if __name__ == "__main__":
    main()
