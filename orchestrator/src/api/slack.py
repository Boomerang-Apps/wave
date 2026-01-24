"""
WAVE v2 Slack Notification Module

Provides Slack integration for workflow notifications.
Supports thread-per-story pattern and severity-based routing.
"""

import os
import json
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Optional, Dict, Any, List

# Try to import requests
try:
    import requests
    REQUESTS_AVAILABLE = True
except ImportError:
    REQUESTS_AVAILABLE = False


# ═══════════════════════════════════════════════════════════════════════════════
# TYPES
# ═══════════════════════════════════════════════════════════════════════════════

class SlackChannel(str, Enum):
    """Slack channels for different notification types."""
    UPDATES = "updates"      # General updates
    ALERTS = "alerts"        # Critical alerts
    BUDGET = "budget"        # Budget notifications


class NotificationSeverity(str, Enum):
    """Notification severity levels."""
    INFO = "info"
    WARNING = "warning"
    CRITICAL = "critical"
    SUCCESS = "success"


@dataclass
class SlackMessage:
    """A Slack message."""
    text: str
    channel: SlackChannel = SlackChannel.UPDATES
    severity: NotificationSeverity = NotificationSeverity.INFO
    story_id: Optional[str] = None
    thread_ts: Optional[str] = None  # For thread replies
    blocks: Optional[List[Dict]] = None
    attachments: Optional[List[Dict]] = None


@dataclass
class SlackResponse:
    """Response from Slack API."""
    success: bool
    message_ts: Optional[str] = None
    error: Optional[str] = None


# ═══════════════════════════════════════════════════════════════════════════════
# SLACK NOTIFIER
# ═══════════════════════════════════════════════════════════════════════════════

class SlackNotifier:
    """
    Slack notification service for WAVE.

    Features:
    - Thread-per-story pattern
    - Severity-based channel routing
    - Rich message formatting
    """

    # Emoji for severity levels
    SEVERITY_EMOJI = {
        NotificationSeverity.INFO: ":information_source:",
        NotificationSeverity.WARNING: ":warning:",
        NotificationSeverity.CRITICAL: ":rotating_light:",
        NotificationSeverity.SUCCESS: ":white_check_mark:",
    }

    def __init__(
        self,
        webhook_url: Optional[str] = None,
        channels: Optional[Dict[SlackChannel, str]] = None
    ):
        """
        Initialize Slack notifier.

        Args:
            webhook_url: Default Slack webhook URL
            channels: Channel-specific webhook URLs
        """
        self.webhook_url = webhook_url or os.getenv("SLACK_WEBHOOK_URL", "")
        self.channels = channels or {}
        self._thread_cache: Dict[str, str] = {}  # story_id -> thread_ts
        self._enabled = bool(self.webhook_url)

    def is_enabled(self) -> bool:
        """Check if Slack is enabled."""
        return self._enabled and REQUESTS_AVAILABLE

    def _get_webhook(self, channel: SlackChannel) -> str:
        """Get webhook URL for channel."""
        return self.channels.get(channel, self.webhook_url)

    def _get_color(self, severity: NotificationSeverity) -> str:
        """Get color for severity level."""
        colors = {
            NotificationSeverity.INFO: "#36a64f",
            NotificationSeverity.WARNING: "#ff9900",
            NotificationSeverity.CRITICAL: "#ff0000",
            NotificationSeverity.SUCCESS: "#00ff00",
        }
        return colors.get(severity, "#808080")

    def send(self, message: SlackMessage) -> SlackResponse:
        """
        Send a Slack message.

        Args:
            message: Message to send

        Returns:
            SlackResponse with result
        """
        if not self.is_enabled():
            return SlackResponse(success=False, error="Slack not enabled")

        webhook = self._get_webhook(message.channel)
        if not webhook:
            return SlackResponse(success=False, error="No webhook URL")

        # Build payload
        payload = self._build_payload(message)

        try:
            response = requests.post(
                webhook,
                json=payload,
                headers={"Content-Type": "application/json"},
                timeout=10
            )

            if response.status_code == 200:
                # Try to get thread_ts from response
                try:
                    data = response.json()
                    thread_ts = data.get("ts")
                    if thread_ts and message.story_id:
                        self._thread_cache[message.story_id] = thread_ts
                    return SlackResponse(success=True, message_ts=thread_ts)
                except Exception:
                    return SlackResponse(success=True)
            else:
                return SlackResponse(
                    success=False,
                    error=f"HTTP {response.status_code}: {response.text}"
                )
        except Exception as e:
            return SlackResponse(success=False, error=str(e))

    def _build_payload(self, message: SlackMessage) -> dict:
        """Build Slack API payload."""
        emoji = self.SEVERITY_EMOJI.get(message.severity, "")
        color = self._get_color(message.severity)

        # Use blocks if provided
        if message.blocks:
            payload = {"blocks": message.blocks}
        else:
            # Build simple message with attachment
            payload = {
                "attachments": [{
                    "color": color,
                    "text": f"{emoji} {message.text}",
                    "footer": f"WAVE v2 | {datetime.now().strftime('%H:%M:%S')}",
                }]
            }

        # Add thread_ts for replies
        if message.thread_ts:
            payload["thread_ts"] = message.thread_ts
        elif message.story_id and message.story_id in self._thread_cache:
            payload["thread_ts"] = self._thread_cache[message.story_id]

        return payload

    def get_thread_ts(self, story_id: str) -> Optional[str]:
        """Get cached thread_ts for a story."""
        return self._thread_cache.get(story_id)

    # ═══════════════════════════════════════════════════════════════════════════
    # CONVENIENCE METHODS
    # ═══════════════════════════════════════════════════════════════════════════

    def notify_story_start(
        self,
        story_id: str,
        requirements: str,
        wave: int = 1
    ) -> SlackResponse:
        """Notify that a story has started."""
        message = SlackMessage(
            text=f"*[Wave {wave}] Story Started: {story_id}*\n{requirements[:200]}...",
            channel=SlackChannel.UPDATES,
            severity=NotificationSeverity.INFO,
            story_id=story_id
        )
        return self.send(message)

    def notify_story_complete(
        self,
        story_id: str,
        success: bool,
        cost: float = 0.0
    ) -> SlackResponse:
        """Notify that a story has completed."""
        severity = NotificationSeverity.SUCCESS if success else NotificationSeverity.CRITICAL
        status = "Complete" if success else "Failed"

        message = SlackMessage(
            text=f"*Story {status}: {story_id}*\nCost: ${cost:.2f}",
            channel=SlackChannel.UPDATES,
            severity=severity,
            story_id=story_id
        )
        return self.send(message)

    def notify_gate_transition(
        self,
        story_id: str,
        from_gate: int,
        to_gate: int
    ) -> SlackResponse:
        """Notify gate transition."""
        message = SlackMessage(
            text=f"Gate {from_gate} → {to_gate} | {story_id}",
            channel=SlackChannel.UPDATES,
            severity=NotificationSeverity.INFO,
            story_id=story_id
        )
        return self.send(message)

    def notify_budget_warning(
        self,
        story_id: str,
        percentage: float,
        tokens_used: int,
        token_limit: int
    ) -> SlackResponse:
        """Notify budget warning."""
        severity = (
            NotificationSeverity.CRITICAL if percentage >= 0.9
            else NotificationSeverity.WARNING
        )
        channel = SlackChannel.BUDGET if percentage >= 0.9 else SlackChannel.UPDATES

        message = SlackMessage(
            text=f"*Budget Alert: {story_id}*\n{percentage:.0%} used ({tokens_used:,}/{token_limit:,} tokens)",
            channel=channel,
            severity=severity,
            story_id=story_id
        )
        return self.send(message)

    def notify_safety_violation(
        self,
        story_id: str,
        violations: List[str]
    ) -> SlackResponse:
        """Notify safety violation."""
        violations_text = "\n".join(f"• {v}" for v in violations[:5])

        message = SlackMessage(
            text=f"*Safety Violation: {story_id}*\n{violations_text}",
            channel=SlackChannel.ALERTS,
            severity=NotificationSeverity.CRITICAL,
            story_id=story_id
        )
        return self.send(message)


# ═══════════════════════════════════════════════════════════════════════════════
# HELPER FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════════

# Global notifier instance
_notifier: Optional[SlackNotifier] = None


def get_notifier() -> SlackNotifier:
    """Get or create global notifier instance."""
    global _notifier
    if _notifier is None:
        _notifier = SlackNotifier()
    return _notifier


def send_notification(
    text: str,
    severity: NotificationSeverity = NotificationSeverity.INFO,
    channel: SlackChannel = SlackChannel.UPDATES,
    story_id: Optional[str] = None
) -> SlackResponse:
    """
    Quick helper to send a notification.

    Args:
        text: Message text
        severity: Notification severity
        channel: Target channel
        story_id: Optional story ID for threading

    Returns:
        SlackResponse
    """
    message = SlackMessage(
        text=text,
        channel=channel,
        severity=severity,
        story_id=story_id
    )
    notifier = get_notifier()
    return notifier.send(message)


# ═══════════════════════════════════════════════════════════════════════════════
# EXPORTS
# ═══════════════════════════════════════════════════════════════════════════════

__all__ = [
    "SlackChannel",
    "NotificationSeverity",
    "SlackMessage",
    "SlackResponse",
    "SlackNotifier",
    "get_notifier",
    "send_notification",
    "REQUESTS_AVAILABLE",
]
