"""
WAVE Orchestrator Slack Notifications
Simple webhook-based notifications for each step of the workflow
"""

import os
import json
from datetime import datetime
from typing import Optional, Dict, Any

try:
    import requests
    REQUESTS_AVAILABLE = True
except ImportError:
    REQUESTS_AVAILABLE = False


class SlackNotifier:
    """Simple Slack webhook notifier for WAVE orchestrator."""

    EMOJI_MAP = {
        "supervisor": ":brain:",
        "pm": ":clipboard:",
        "cto": ":gear:",
        "dev": ":hammer_and_wrench:",
        "safety_gate": ":shield:",
        "qa": ":white_check_mark:",
        "start": ":rocket:",
        "complete": ":trophy:",
        "error": ":x:"
    }

    def __init__(self):
        self.webhook_url = os.getenv("SLACK_WEBHOOK_URL", "")
        self.enabled = os.getenv("SLACK_ENABLED", "true").lower() == "true"
        self._available = REQUESTS_AVAILABLE and bool(self.webhook_url)

    def is_enabled(self) -> bool:
        return self.enabled and self._available

    def send(self, text: str, blocks: Optional[list] = None) -> bool:
        """Send a message to Slack."""
        if not self.is_enabled():
            return False

        payload = {"text": text}
        if blocks:
            payload["blocks"] = blocks

        try:
            response = requests.post(
                self.webhook_url,
                json=payload,
                headers={"Content-Type": "application/json"},
                timeout=10
            )
            return response.status_code == 200
        except Exception as e:
            print(f"[Slack] Error sending notification: {e}")
            return False

    def notify_step(
        self,
        agent: str,
        action: str,
        task: str,
        run_id: str,
        details: Optional[Dict[str, Any]] = None
    ) -> bool:
        """Notify about a workflow step."""
        emoji = self.EMOJI_MAP.get(agent, ":robot_face:")
        timestamp = datetime.now().strftime("%H:%M:%S")

        blocks = [
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": f"{emoji} *{agent.upper()}* | `{action}`"
                }
            },
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": f"*Task:* {task[:100]}..." if len(task) > 100 else f"*Task:* {task}"
                }
            }
        ]

        # Add details if provided
        if details:
            fields = []
            for key, value in list(details.items())[:4]:
                fields.append({
                    "type": "mrkdwn",
                    "text": f"*{key}:*\n{str(value)[:50]}"
                })
            if fields:
                blocks.append({"type": "section", "fields": fields})

        blocks.append({
            "type": "context",
            "elements": [
                {
                    "type": "mrkdwn",
                    "text": f"Run: `{run_id[:8]}...` | {timestamp}"
                }
            ]
        })

        return self.send(f"[{agent}] {action}", blocks)

    def notify_run_start(self, run_id: str, task: str) -> bool:
        """Notify that a new run has started."""
        blocks = [
            {
                "type": "header",
                "text": {
                    "type": "plain_text",
                    "text": ":rocket: WAVE Run Started",
                    "emoji": True
                }
            },
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": f"*Task:*\n{task}"
                }
            },
            {
                "type": "context",
                "elements": [
                    {
                        "type": "mrkdwn",
                        "text": f"Run ID: `{run_id}` | {datetime.now().strftime('%H:%M:%S')}"
                    }
                ]
            }
        ]
        return self.send(f"WAVE Run Started: {run_id}", blocks)

    def notify_run_complete(
        self,
        run_id: str,
        task: str,
        actions_count: int,
        status: str = "completed",
        tokens: int = 0,
        cost_usd: float = 0.0,
        duration_s: float = 0.0
    ) -> bool:
        """Notify that a run has completed with token/cost summary."""
        emoji = ":trophy:" if status == "completed" else ":x:"

        # Format cost nicely
        cost_str = f"${cost_usd:.4f}" if cost_usd > 0 else "N/A"
        tokens_str = f"{tokens:,}" if tokens > 0 else "N/A"
        duration_str = f"{duration_s:.1f}s" if duration_s > 0 else "N/A"

        blocks = [
            {
                "type": "header",
                "text": {
                    "type": "plain_text",
                    "text": f"{emoji} WAVE Run {status.title()}",
                    "emoji": True
                }
            },
            {
                "type": "section",
                "fields": [
                    {"type": "mrkdwn", "text": f"*Task:*\n{task[:50]}..."},
                    {"type": "mrkdwn", "text": f"*Status:*\n{status}"},
                    {"type": "mrkdwn", "text": f"*Tokens:*\n{tokens_str}"},
                    {"type": "mrkdwn", "text": f"*Cost:*\n{cost_str}"}
                ]
            },
            {
                "type": "section",
                "fields": [
                    {"type": "mrkdwn", "text": f"*Duration:*\n{duration_str}"},
                    {"type": "mrkdwn", "text": f"*Actions:*\n{actions_count}"}
                ]
            },
            {
                "type": "context",
                "elements": [
                    {
                        "type": "mrkdwn",
                        "text": f"Run ID: `{run_id}` | {datetime.now().strftime('%H:%M:%S')}"
                    }
                ]
            }
        ]
        return self.send(f"WAVE Run {status}: {run_id}", blocks)

    def notify_agent_complete(
        self,
        agent: str,
        story_id: str,
        files_count: int,
        tokens: int,
        cost_usd: float,
        duration_s: float,
        safety_score: float
    ) -> bool:
        """Notify that an agent task completed with metrics."""
        emoji = self.EMOJI_MAP.get(agent.lower(), ":robot_face:")
        status_emoji = ":white_check_mark:" if safety_score >= 0.85 else ":warning:"

        cost_str = f"${cost_usd:.4f}"

        blocks = [
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": f"{emoji} *{agent.upper()}* completed | {status_emoji} Safety: {safety_score:.2f}"
                }
            },
            {
                "type": "section",
                "fields": [
                    {"type": "mrkdwn", "text": f"*Story:*\n{story_id}"},
                    {"type": "mrkdwn", "text": f"*Files:*\n{files_count}"},
                    {"type": "mrkdwn", "text": f"*Tokens:*\n{tokens:,}"},
                    {"type": "mrkdwn", "text": f"*Cost:*\n{cost_str}"}
                ]
            },
            {
                "type": "context",
                "elements": [
                    {
                        "type": "mrkdwn",
                        "text": f"Duration: {duration_s:.1f}s | {datetime.now().strftime('%H:%M:%S')}"
                    }
                ]
            }
        ]
        return self.send(f"[{agent}] completed {story_id}", blocks)

    def notify_code_generated(
        self,
        run_id: str,
        file_path: Optional[str],
        code_preview: Optional[str]
    ) -> bool:
        """Notify that code was generated."""
        blocks = [
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": f":hammer_and_wrench: *Code Generated*"
                }
            }
        ]

        if file_path:
            blocks.append({
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": f"*File:*\n`{file_path}`"
                }
            })

        if code_preview:
            preview = code_preview[:200] + "..." if len(code_preview) > 200 else code_preview
            blocks.append({
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": f"*Preview:*\n```{preview}```"
                }
            })

        blocks.append({
            "type": "context",
            "elements": [
                {
                    "type": "mrkdwn",
                    "text": f"Run: `{run_id[:8]}...` | {datetime.now().strftime('%H:%M:%S')}"
                }
            ]
        })

        return self.send(f"Code generated for run {run_id}", blocks)


# Global singleton
_notifier: Optional[SlackNotifier] = None


def get_notifier() -> SlackNotifier:
    """Get or create the global notifier instance."""
    global _notifier
    if _notifier is None:
        _notifier = SlackNotifier()
    return _notifier


def notify_step(agent: str, action: str, task: str, run_id: str, **details) -> bool:
    """Quick helper to notify about a step."""
    return get_notifier().notify_step(agent, action, task, run_id, details)


def notify_run_start(run_id: str, task: str) -> bool:
    """Quick helper to notify run start."""
    return get_notifier().notify_run_start(run_id, task)


def notify_run_complete(run_id: str, task: str, actions_count: int, status: str = "completed") -> bool:
    """Quick helper to notify run complete."""
    return get_notifier().notify_run_complete(run_id, task, actions_count, status)


def notify_code_generated(run_id: str, file_path: Optional[str], code_preview: Optional[str]) -> bool:
    """Quick helper to notify code generation."""
    return get_notifier().notify_code_generated(run_id, file_path, code_preview)


def notify_agent_complete(
    agent: str,
    story_id: str,
    files_count: int = 0,
    tokens: int = 0,
    cost_usd: float = 0.0,
    duration_s: float = 0.0,
    safety_score: float = 1.0
) -> bool:
    """Quick helper to notify agent completion with metrics."""
    return get_notifier().notify_agent_complete(
        agent, story_id, files_count, tokens, cost_usd, duration_s, safety_score
    )
