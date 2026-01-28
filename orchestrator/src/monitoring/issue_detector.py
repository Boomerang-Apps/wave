"""
WAVE Issue Detector

Detects issues in logs, metrics, and workflow state.
Part of Gate 0 Research Item #1: Real-time Monitoring.

Integrates with existing:
- src/api/slack.py (notifications)
- src/tracing/metrics.py (metrics collection)
- scripts/export-diagnostics.sh (log export)

Usage:
    detector = IssueDetector()
    issues = detector.detect(log_content)
    for issue in issues:
        print(f"[{issue.severity}] {issue.message}")
"""

import re
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import List, Tuple, Optional, Set


class IssueSeverity(Enum):
    """Severity levels for detected issues."""
    INFO = 1
    WARNING = 2
    CRITICAL = 3

    @classmethod
    def from_string(cls, s: str) -> "IssueSeverity":
        """Create severity from string."""
        mapping = {
            "info": cls.INFO,
            "warning": cls.WARNING,
            "critical": cls.CRITICAL,
        }
        return mapping.get(s.lower(), cls.INFO)


@dataclass
class Issue:
    """A detected issue."""
    message: str
    severity: IssueSeverity
    source: str
    timestamp: datetime = field(default_factory=datetime.now)
    pattern: Optional[str] = None

    def to_dict(self) -> dict:
        """Convert to dictionary for serialization."""
        return {
            "message": self.message,
            "severity": self.severity.name.lower(),
            "source": self.source,
            "timestamp": self.timestamp.isoformat(),
            "pattern": self.pattern,
        }

    def __str__(self) -> str:
        return f"[{self.severity.name}] {self.message}"


# Default detection patterns
# Format: (regex_pattern, message_template, severity)
DEFAULT_PATTERNS: List[Tuple[str, str, str]] = [
    # Safety blocks (CRITICAL)
    (
        r"SAFETY BLOCK[:\s]+Score\s+(\d+\.?\d*)",
        "Safety block detected: Score {0} below threshold",
        "critical"
    ),
    (
        r"safety score\s*[<:]\s*0\.85",
        "Safety score below threshold",
        "critical"
    ),
    (
        r"Found dangerous pattern\s+['\"]([^'\"]+)['\"]",
        "Dangerous pattern detected: {0}",
        "critical"
    ),

    # Timeouts (CRITICAL)
    (
        r"[Tt]imed?\s*out\s+(?:after\s+)?(\d+)s?",
        "Task timed out after {0}s",
        "critical"
    ),
    (
        r"exceeded maximum duration",
        "Workflow exceeded maximum duration",
        "critical"
    ),
    (
        r"timeout\s+(?:reached|exceeded)",
        "Timeout reached",
        "critical"
    ),

    # Retry limits (CRITICAL)
    (
        r"[Rr]etry limit\s+(?:reached|hit|exceeded)",
        "Retry limit reached",
        "critical"
    ),
    (
        r"[Rr]etry attempt\s+(\d+)/(\d+).*(?:final|last)",
        "Final retry attempt {0}/{1}",
        "critical"
    ),
    (
        r"max(?:imum)?\s+retries?\s+(?:reached|hit|exceeded)",
        "Maximum retries exceeded",
        "critical"
    ),

    # Container issues (CRITICAL)
    (
        r"exited with code\s+([1-9]\d*)",
        "Container exited with error code {0}",
        "critical"
    ),
    (
        r"(?:container|service)\s+(?:crashed|failed)",
        "Container crashed",
        "critical"
    ),
    (
        r"restarting\s+\(attempt\s+(\d+)\)",
        "Container restarting (attempt {0})",
        "warning"
    ),

    # Budget warnings (WARNING -> CRITICAL)
    (
        r"[Bb]udget\s+(?:warning|alert)[:\s]+(\d+)%\s+used",
        "Budget warning: {0}% used",
        "warning"
    ),
    (
        r"[Bb]udget exceeded[:\s]+\$?(\d+\.?\d*)",
        "Budget exceeded: ${0}",
        "critical"
    ),
    (
        r"[Ss]tory budget exceeded",
        "Story budget exceeded",
        "critical"
    ),

    # API errors (WARNING)
    (
        r"API\s+(?:error|failed)[:\s]+(.+)",
        "API error: {0}",
        "warning"
    ),
    (
        r"rate\s+limit(?:ed)?",
        "Rate limit hit",
        "warning"
    ),

    # Git/merge issues (WARNING)
    (
        r"merge conflict",
        "Merge conflict detected",
        "warning"
    ),
    (
        r"push\s+(?:failed|rejected)",
        "Git push failed",
        "warning"
    ),
]


class IssueDetector:
    """
    Detects issues in logs and workflow state.

    Uses pattern matching to identify:
    - Safety blocks (score < 0.85)
    - Timeouts (> 5 min)
    - Retry limit reached
    - Budget exceeded
    - Container crashes
    - API errors

    Integrates with existing WAVE infrastructure:
    - Reuses SlackNotifier for alerting
    - Works with MetricsCollector for tracking
    """

    def __init__(
        self,
        patterns: Optional[List[Tuple[str, str, str]]] = None,
        extra_patterns: Optional[List[Tuple[str, str, str]]] = None,
    ):
        """
        Initialize IssueDetector.

        Args:
            patterns: Override default patterns (replaces defaults)
            extra_patterns: Additional patterns (extends defaults)
        """
        self._patterns = patterns if patterns is not None else DEFAULT_PATTERNS.copy()

        if extra_patterns:
            self._patterns.extend(extra_patterns)

        # Compile patterns for efficiency
        self._compiled = [
            (re.compile(pattern, re.IGNORECASE), message, severity)
            for pattern, message, severity in self._patterns
        ]

        # Track seen issues for deduplication
        self._seen_hashes: Set[str] = set()

    def detect(self, logs: str, source: str = "logs") -> List[Issue]:
        """
        Detect issues in log content.

        Args:
            logs: Log content to analyze
            source: Source identifier for issues

        Returns:
            List of detected Issue objects (deduplicated)
        """
        issues: List[Issue] = []
        seen_in_this_call: Set[str] = set()

        for compiled_pattern, message_template, severity_str in self._compiled:
            matches = compiled_pattern.finditer(logs)

            for match in matches:
                # Build message from template
                groups = match.groups()
                if groups:
                    try:
                        message = message_template.format(*groups)
                    except (IndexError, KeyError):
                        message = message_template
                else:
                    message = message_template

                # Create hash for deduplication
                issue_hash = f"{severity_str}:{message}"

                # Skip if already seen
                if issue_hash in seen_in_this_call or issue_hash in self._seen_hashes:
                    continue

                seen_in_this_call.add(issue_hash)
                self._seen_hashes.add(issue_hash)

                # Create issue
                issue = Issue(
                    message=message,
                    severity=IssueSeverity.from_string(severity_str),
                    source=source,
                    pattern=compiled_pattern.pattern,
                )
                issues.append(issue)

        return issues

    def reset_deduplication(self) -> None:
        """Clear deduplication cache."""
        self._seen_hashes.clear()

    def add_pattern(
        self,
        pattern: str,
        message: str,
        severity: str = "warning"
    ) -> None:
        """
        Add a new detection pattern.

        Args:
            pattern: Regex pattern to match
            message: Message template (use {0}, {1} for groups)
            severity: Severity level (info, warning, critical)
        """
        compiled = re.compile(pattern, re.IGNORECASE)
        self._compiled.append((compiled, message, severity))

    @property
    def pattern_count(self) -> int:
        """Number of registered patterns."""
        return len(self._compiled)


# Convenience function
def detect_issues(logs: str, source: str = "logs") -> List[Issue]:
    """
    Quick helper to detect issues in logs.

    Args:
        logs: Log content to analyze
        source: Source identifier

    Returns:
        List of detected issues
    """
    detector = IssueDetector()
    return detector.detect(logs, source)


# ═══════════════════════════════════════════════════════════════════════════════
# SLACK ALERT INTEGRATION
# ═══════════════════════════════════════════════════════════════════════════════

class IssueAlerter:
    """
    Sends issue alerts to Slack.

    Integrates with existing SlackNotifier to send real-time alerts
    when critical issues are detected.

    Supports threshold filtering to reduce noise (Grok suggestion):
    - CRITICAL only: Only alert on critical issues
    - WARNING+: Alert on warning and critical (default)
    - ALL: Alert on everything including info

    Dynamic threshold (Grok refinement):
    - Production: CRITICAL only (reduce noise)
    - Development: WARNING+ (more visibility)
    """

    SEVERITY_EMOJI = {
        IssueSeverity.CRITICAL: ":rotating_light:",
        IssueSeverity.WARNING: ":warning:",
        IssueSeverity.INFO: ":information_source:",
    }

    @staticmethod
    def get_dynamic_threshold(environment: Optional[str] = None) -> IssueSeverity:
        """
        Get alert threshold based on environment.

        Args:
            environment: Environment name (prod/dev/staging). Auto-detects if None.

        Returns:
            IssueSeverity threshold for alerting
        """
        if environment is None:
            # Auto-detect from environment variables
            environment = os.environ.get("WAVE_ENVIRONMENT", "dev").lower()

        if environment in ("prod", "production"):
            return IssueSeverity.CRITICAL  # Reduce noise in production
        elif environment in ("staging", "stage"):
            return IssueSeverity.WARNING
        else:
            return IssueSeverity.WARNING  # Dev: more visibility

    def __init__(
        self,
        detector: Optional[IssueDetector] = None,
        default_threshold: Optional[IssueSeverity] = None,
        critical_only: bool = False,
        auto_threshold: bool = True
    ):
        """
        Initialize issue alerter.

        Args:
            detector: IssueDetector instance (creates new one if None)
            default_threshold: Default minimum severity for alerts (overrides auto)
            critical_only: If True, only alert on CRITICAL issues (overrides threshold)
            auto_threshold: If True and no default_threshold, auto-detect from environment
        """
        self.detector = detector or IssueDetector()
        self._notifier = None

        # Determine threshold: critical_only > explicit > auto > WARNING
        if critical_only:
            self.default_threshold = IssueSeverity.CRITICAL
        elif default_threshold is not None:
            self.default_threshold = default_threshold
        elif auto_threshold:
            self.default_threshold = self.get_dynamic_threshold()
        else:
            self.default_threshold = IssueSeverity.WARNING

    def _get_notifier(self):
        """Lazy-load Slack notifier."""
        if self._notifier is None:
            try:
                import sys
                import os
                # Add parent path for notifications import
                parent = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
                if parent not in sys.path:
                    sys.path.insert(0, parent)
                from notifications import get_notifier
                self._notifier = get_notifier()
            except ImportError:
                self._notifier = None
        return self._notifier

    def detect_and_alert(
        self,
        logs: str,
        source: str = "logs",
        story_id: Optional[str] = None,
        alert_threshold: Optional[IssueSeverity] = None
    ) -> List[Issue]:
        """
        Detect issues and send Slack alerts for those meeting threshold.

        Args:
            logs: Log content to analyze
            source: Source identifier
            story_id: Optional story ID for context
            alert_threshold: Minimum severity to alert (uses default_threshold if None)

        Returns:
            List of all detected issues
        """
        issues = self.detector.detect(logs, source)

        # Use instance default if not specified
        threshold = alert_threshold or self.default_threshold

        # Filter issues meeting threshold
        alertable = [
            i for i in issues
            if i.severity.value >= threshold.value
        ]

        # Send alerts
        for issue in alertable:
            self._send_alert(issue, story_id)

        return issues

    def detect_and_alert_critical_only(
        self,
        logs: str,
        source: str = "logs",
        story_id: Optional[str] = None
    ) -> List[Issue]:
        """
        Detect issues and send Slack alerts for CRITICAL issues only.

        This is a convenience method for reducing noise (Grok suggestion).

        Args:
            logs: Log content to analyze
            source: Source identifier
            story_id: Optional story ID for context

        Returns:
            List of all detected issues (alerts only sent for CRITICAL)
        """
        return self.detect_and_alert(
            logs, source, story_id,
            alert_threshold=IssueSeverity.CRITICAL
        )

    def _send_alert(self, issue: Issue, story_id: Optional[str] = None) -> bool:
        """Send Slack alert for an issue."""
        notifier = self._get_notifier()
        if not notifier or not notifier.is_enabled():
            return False

        emoji = self.SEVERITY_EMOJI.get(issue.severity, ":exclamation:")

        blocks = [
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": f"{emoji} *Issue Detected: {issue.severity.name}*"
                }
            },
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": f"*Message:*\n{issue.message}"
                }
            },
            {
                "type": "section",
                "fields": [
                    {"type": "mrkdwn", "text": f"*Source:*\n{issue.source}"},
                    {"type": "mrkdwn", "text": f"*Time:*\n{issue.timestamp.strftime('%H:%M:%S')}"},
                ]
            }
        ]

        if story_id:
            blocks[2]["fields"].append(
                {"type": "mrkdwn", "text": f"*Story:*\n{story_id}"}
            )

        return notifier.send(f"[ALERT] {issue.severity.name}: {issue.message}", blocks)

    def alert_safety_block(
        self,
        score: float,
        violations: List[str],
        story_id: Optional[str] = None,
        file_path: Optional[str] = None
    ) -> bool:
        """
        Send alert specifically for safety blocks.

        Args:
            score: Safety score that triggered block
            violations: List of violation messages
            story_id: Optional story ID
            file_path: Optional file path that was blocked

        Returns:
            True if alert sent successfully
        """
        notifier = self._get_notifier()
        if not notifier or not notifier.is_enabled():
            return False

        blocks = [
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": f":rotating_light: *SAFETY BLOCK* - Score: {score:.2f}"
                }
            }
        ]

        if story_id or file_path:
            fields = []
            if story_id:
                fields.append({"type": "mrkdwn", "text": f"*Story:*\n{story_id}"})
            if file_path:
                fields.append({"type": "mrkdwn", "text": f"*File:*\n`{file_path}`"})
            blocks.append({"type": "section", "fields": fields})

        if violations:
            violation_text = "\n".join([f"• {v}" for v in violations[:5]])
            blocks.append({
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": f"*Violations:*\n{violation_text}"
                }
            })

        return notifier.send(f"[SAFETY BLOCK] Score {score:.2f}", blocks)


def detect_and_alert(
    logs: str,
    source: str = "logs",
    story_id: Optional[str] = None,
    critical_only: bool = False
) -> List[Issue]:
    """
    Quick helper to detect issues and send Slack alerts.

    Args:
        logs: Log content to analyze
        source: Source identifier
        story_id: Optional story ID
        critical_only: If True, only alert on CRITICAL issues (reduces noise)

    Returns:
        List of detected issues
    """
    alerter = IssueAlerter(critical_only=critical_only)
    return alerter.detect_and_alert(logs, source, story_id)


def detect_and_alert_critical(
    logs: str,
    source: str = "logs",
    story_id: Optional[str] = None
) -> List[Issue]:
    """
    Quick helper to detect issues and alert CRITICAL only (Grok suggestion).

    This reduces alert noise by only sending Slack notifications for
    CRITICAL severity issues (safety blocks, timeouts, retry limits, etc.)

    Args:
        logs: Log content to analyze
        source: Source identifier
        story_id: Optional story ID

    Returns:
        List of detected issues (alerts only for CRITICAL)
    """
    return detect_and_alert(logs, source, story_id, critical_only=True)


__all__ = [
    "Issue",
    "IssueSeverity",
    "IssueDetector",
    "IssueAlerter",
    "detect_issues",
    "detect_and_alert",
    "detect_and_alert_critical",
    "DEFAULT_PATTERNS",
]
