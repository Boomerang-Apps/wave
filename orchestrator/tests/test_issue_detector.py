"""
TDD Tests for Issue Detector
Gate 0 Research Item #1: Real-time Monitoring

These tests are written BEFORE implementation per TDD methodology.
Run with: pytest tests/test_issue_detector.py -v
"""

import pytest
from typing import List


class TestIssueDetector:
    """Tests for IssueDetector class."""

    def test_detect_safety_block_in_logs(self):
        """Detect safety score below threshold in logs."""
        from src.monitoring.issue_detector import IssueDetector

        detector = IssueDetector()
        logs = """
        [08:11:50] [FE-1] Running constitutional safety check...
        [08:11:50] [FE-1] SAFETY BLOCK: Score 0.70 below threshold
        [08:11:50] [FE-1]   - CRITICAL: Found dangerous pattern 'api_key ='
        """

        issues = detector.detect(logs)

        assert len(issues) >= 1
        assert any("safety" in issue.message.lower() for issue in issues)
        assert any("0.70" in issue.message or "below threshold" in issue.message for issue in issues)

    def test_detect_timeout_in_logs(self):
        """Detect workflow timeout exceeding limit."""
        from src.monitoring.issue_detector import IssueDetector

        detector = IssueDetector()
        logs = """
        [08:15:00] [ORCHESTRATOR] Task timed out after 600s
        [08:15:00] [ORCHESTRATOR] Workflow exceeded maximum duration
        """

        issues = detector.detect(logs)

        assert len(issues) >= 1
        assert any("timeout" in issue.message.lower() or "timed out" in issue.message.lower() for issue in issues)

    def test_detect_retry_limit_reached(self):
        """Detect when maximum retries are hit."""
        from src.monitoring.issue_detector import IssueDetector

        detector = IssueDetector()
        logs = """
        [08:20:00] [DEV-FIX] Retry attempt 3/3
        [08:20:01] [DEV-FIX] Retry limit reached, escalating
        """

        issues = detector.detect(logs)

        assert len(issues) >= 1
        assert any("retry" in issue.message.lower() for issue in issues)

    def test_detect_budget_exceeded(self):
        """Detect budget threshold exceeded."""
        from src.monitoring.issue_detector import IssueDetector

        detector = IssueDetector()
        logs = """
        [08:25:00] [ORCHESTRATOR] Budget warning: 95% used
        [08:25:00] [ORCHESTRATOR] Story budget exceeded: $5.50 > $5.00 limit
        """

        issues = detector.detect(logs)

        assert len(issues) >= 1
        assert any("budget" in issue.message.lower() for issue in issues)

    def test_detect_container_crash(self):
        """Detect container crash or restart loop."""
        from src.monitoring.issue_detector import IssueDetector

        detector = IssueDetector()
        logs = """
        wave-fe-dev-1 exited with code 1
        wave-fe-dev-1 restarting (attempt 3)
        """

        issues = detector.detect(logs)

        assert len(issues) >= 1
        assert any("exit" in issue.message.lower() or "crash" in issue.message.lower() or "restart" in issue.message.lower() for issue in issues)

    def test_no_issues_in_clean_logs(self):
        """Return empty list when no issues detected."""
        from src.monitoring.issue_detector import IssueDetector

        detector = IssueDetector()
        logs = """
        [08:30:00] [FE-1] Task started
        [08:30:05] [FE-1] Files generated: 3
        [08:30:06] [FE-1] Safety score: 0.95
        [08:30:07] [FE-1] Task completed successfully
        """

        issues = detector.detect(logs)

        assert len(issues) == 0

    def test_severity_classification(self):
        """Issues should have severity level."""
        from src.monitoring.issue_detector import IssueDetector, IssueSeverity

        detector = IssueDetector()

        # Safety block is CRITICAL
        safety_issues = detector.detect("SAFETY BLOCK: Score 0.70")
        assert safety_issues[0].severity == IssueSeverity.CRITICAL

        # Budget warning is WARNING
        budget_issues = detector.detect("Budget warning: 75% used")
        assert budget_issues[0].severity == IssueSeverity.WARNING

    def test_custom_patterns(self):
        """Support custom detection patterns."""
        from src.monitoring.issue_detector import IssueDetector

        custom_patterns = [
            (r"MY_CUSTOM_ERROR", "Custom error detected", "critical"),
        ]

        detector = IssueDetector(extra_patterns=custom_patterns)
        issues = detector.detect("Log contains MY_CUSTOM_ERROR here")

        assert len(issues) >= 1
        assert any("custom" in issue.lower() for issue in [i.message for i in issues])

    def test_deduplication(self):
        """Don't report same issue multiple times."""
        from src.monitoring.issue_detector import IssueDetector

        detector = IssueDetector()
        logs = """
        SAFETY BLOCK: Score 0.70
        SAFETY BLOCK: Score 0.70
        SAFETY BLOCK: Score 0.70
        """

        issues = detector.detect(logs)

        # Should deduplicate to single issue
        safety_issues = [i for i in issues if "safety" in i.message.lower()]
        assert len(safety_issues) == 1


class TestIssue:
    """Tests for Issue dataclass."""

    def test_issue_has_required_fields(self):
        """Issue should have message, severity, timestamp, source."""
        from src.monitoring.issue_detector import Issue, IssueSeverity

        issue = Issue(
            message="Test issue",
            severity=IssueSeverity.WARNING,
            source="test",
        )

        assert issue.message == "Test issue"
        assert issue.severity == IssueSeverity.WARNING
        assert issue.source == "test"
        assert issue.timestamp is not None

    def test_issue_to_dict(self):
        """Issue should serialize to dict."""
        from src.monitoring.issue_detector import Issue, IssueSeverity

        issue = Issue(
            message="Test issue",
            severity=IssueSeverity.CRITICAL,
            source="logs",
        )

        d = issue.to_dict()

        assert d["message"] == "Test issue"
        assert d["severity"] == "critical"
        assert "timestamp" in d


class TestIssueSeverity:
    """Tests for IssueSeverity enum."""

    def test_severity_ordering(self):
        """Severity levels should be orderable."""
        from src.monitoring.issue_detector import IssueSeverity

        assert IssueSeverity.INFO.value < IssueSeverity.WARNING.value
        assert IssueSeverity.WARNING.value < IssueSeverity.CRITICAL.value

    def test_severity_from_string(self):
        """Create severity from string."""
        from src.monitoring.issue_detector import IssueSeverity

        assert IssueSeverity.from_string("critical") == IssueSeverity.CRITICAL
        assert IssueSeverity.from_string("WARNING") == IssueSeverity.WARNING
        assert IssueSeverity.from_string("info") == IssueSeverity.INFO
