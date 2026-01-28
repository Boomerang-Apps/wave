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

    # LLM Model display names (Grok Suggestion - 2026-01-28)
    LLM_DISPLAY_NAMES = {
        "claude-opus-4-20250514": "Opus 4",
        "claude-opus-4-5-20250514": "Opus 4.5",
        "claude-sonnet-4-20250514": "Sonnet 4",
        "claude-3-5-haiku-20241022": "Haiku 3.5",
        "claude-3-5-sonnet-20241022": "Sonnet 3.5",
        "grok": "Grok",
    }

    @classmethod
    def format_llm_name(cls, model_id: str) -> str:
        """Convert model ID to display name (e.g., claude-opus-4-20250514 → Opus 4)."""
        if not model_id:
            return "Unknown"
        return cls.LLM_DISPLAY_NAMES.get(model_id, model_id)

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
        safety_score: float,
        llm_model: str = ""
    ) -> bool:
        """Notify that an agent task completed with metrics."""
        emoji = self.EMOJI_MAP.get(agent.lower(), ":robot_face:")
        status_emoji = ":white_check_mark:" if safety_score >= 0.85 else ":warning:"

        cost_str = f"${cost_usd:.4f}"
        llm_display = self.format_llm_name(llm_model) if llm_model else "N/A"

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
                    {"type": "mrkdwn", "text": f"*LLM:*\n{llm_display}"},
                    {"type": "mrkdwn", "text": f"*Files:*\n{files_count}"},
                    {"type": "mrkdwn", "text": f"*Tokens:*\n{tokens:,}"}
                ]
            },
            {
                "type": "section",
                "fields": [
                    {"type": "mrkdwn", "text": f"*Cost:*\n{cost_str}"},
                    {"type": "mrkdwn", "text": f"*Duration:*\n{duration_s:.1f}s"}
                ]
            },
            {
                "type": "context",
                "elements": [
                    {
                        "type": "mrkdwn",
                        "text": f"{datetime.now().strftime('%H:%M:%S')}"
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

    def notify_wave_start(
        self,
        story_id: str,
        title: str,
        wave_number: int,
        acceptance_criteria: list,
        files_to_generate: list,
        agents_config: Dict[str, str]
    ) -> bool:
        """
        Send Wave Start Overview notification.

        Args:
            story_id: Story identifier
            title: Story title
            wave_number: Wave number (1, 2, etc.)
            acceptance_criteria: List of AC items
            files_to_generate: List of files to create/modify
            agents_config: Dict mapping agent -> LLM model
        """
        # Format agents list
        agents_text = ""
        agent_order = ["pm", "fe", "be", "qa"]
        for agent in agent_order:
            if agent in agents_config:
                llm = self.format_llm_name(agents_config[agent])
                emoji = self.EMOJI_MAP.get(agent, ":robot_face:")
                role = {"pm": "Planning", "fe": "Frontend", "be": "Backend", "qa": "Validation"}.get(agent, agent)
                agents_text += f"{emoji} *{agent.upper()}* ({llm}) → {role}\n"

        # Format AC list (max 5)
        ac_text = ""
        for i, ac in enumerate(acceptance_criteria[:5]):
            ac_desc = ac.get("description", ac) if isinstance(ac, dict) else str(ac)
            ac_text += f"• {ac_desc[:60]}{'...' if len(str(ac_desc)) > 60 else ''}\n"
        if len(acceptance_criteria) > 5:
            ac_text += f"_...and {len(acceptance_criteria) - 5} more_"

        # Format files list (max 5)
        files_text = ""
        for f in files_to_generate[:5]:
            files_text += f"• `{f}`\n"
        if len(files_to_generate) > 5:
            files_text += f"_...and {len(files_to_generate) - 5} more_"

        blocks = [
            {
                "type": "header",
                "text": {
                    "type": "plain_text",
                    "text": "🚀 WAVE Run Started",
                    "emoji": True
                }
            },
            {
                "type": "section",
                "fields": [
                    {"type": "mrkdwn", "text": f"*Story:*\n`{story_id}`"},
                    {"type": "mrkdwn", "text": f"*Wave:*\n{wave_number}"}
                ]
            },
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": f"*Title:*\n{title[:100]}"
                }
            },
            {"type": "divider"},
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": f"*Agents:*\n{agents_text}"
                }
            },
            {"type": "divider"},
            {
                "type": "section",
                "fields": [
                    {"type": "mrkdwn", "text": f"*Acceptance Criteria ({len(acceptance_criteria)}):*\n{ac_text}"},
                    {"type": "mrkdwn", "text": f"*Files ({len(files_to_generate)}):*\n{files_text}" if files_to_generate else "*Files:*\nTo be determined"}
                ]
            },
            {
                "type": "context",
                "elements": [
                    {
                        "type": "mrkdwn",
                        "text": f"Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"
                    }
                ]
            }
        ]

        return self.send(f"WAVE Started: {story_id}", blocks)

    def notify_wave_summary(
        self,
        story_id: str,
        title: str,
        status: str,
        gate: int,
        duration_s: float,
        agent_results: Dict[str, Dict[str, Any]],
        total_tokens: int,
        total_cost: float,
        safety_score: float,
        files_generated: int,
        error: Optional[str] = None
    ) -> bool:
        """
        Send Wave End Summary notification.

        Args:
            story_id: Story identifier
            title: Story title
            status: Final status (success, failed, etc.)
            gate: Final gate number
            duration_s: Total duration in seconds
            agent_results: Dict with results per agent
            total_tokens: Total tokens used
            total_cost: Total cost in USD
            safety_score: Overall safety score
            files_generated: Number of files generated
            error: Error message if failed
        """
        # Status emoji and text
        if status.lower() in ["success", "completed", "done"]:
            status_emoji = "🏆"
            status_text = "SUCCESS"
        elif status.lower() == "failed":
            status_emoji = "❌"
            status_text = "FAILED"
        else:
            status_emoji = "⚠️"
            status_text = status.upper()

        # Format duration
        if duration_s >= 60:
            duration_str = f"{int(duration_s // 60)}m {int(duration_s % 60)}s"
        else:
            duration_str = f"{duration_s:.1f}s"

        # Format agent results
        agent_results_text = ""
        agent_order = ["pm", "fe", "be", "qa", "cto"]
        for agent in agent_order:
            if agent in agent_results:
                result = agent_results[agent]
                agent_status = "✓" if result.get("status") == "completed" else "✗"
                llm = self.format_llm_name(result.get("llm_model", ""))
                duration = result.get("duration_s", 0)

                # Agent-specific details
                if agent == "pm":
                    detail = f"{result.get('tasks_planned', 0)} tasks"
                elif agent in ["fe", "be"]:
                    detail = f"{result.get('files_count', 0)} files"
                elif agent == "qa":
                    qa_score = result.get("qa_score", 0)
                    detail = f"Score {qa_score:.2f}"
                else:
                    detail = result.get("status", "")

                agent_results_text += f"{agent_status} *{agent.upper()}:* {detail} | {llm} | {duration:.0f}s\n"

        # Safety indicator
        safety_emoji = "🛡️" if safety_score >= 0.85 else "⚠️"

        blocks = [
            {
                "type": "header",
                "text": {
                    "type": "plain_text",
                    "text": f"{status_emoji} WAVE Run {status_text}",
                    "emoji": True
                }
            },
            {
                "type": "section",
                "fields": [
                    {"type": "mrkdwn", "text": f"*Story:*\n`{story_id}`"},
                    {"type": "mrkdwn", "text": f"*Gate:*\n{gate}/7"}
                ]
            },
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": f"*Title:*\n{title[:80]}"
                }
            },
            {"type": "divider"},
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": f"*Agent Results:*\n{agent_results_text}"
                }
            },
            {"type": "divider"},
            {
                "type": "section",
                "fields": [
                    {"type": "mrkdwn", "text": f"*Duration:*\n{duration_str}"},
                    {"type": "mrkdwn", "text": f"*Files:*\n{files_generated}"},
                    {"type": "mrkdwn", "text": f"*Tokens:*\n{total_tokens:,}"},
                    {"type": "mrkdwn", "text": f"*Cost:*\n${total_cost:.4f}"}
                ]
            },
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": f"{safety_emoji} *Safety Score:* {safety_score:.2f}"
                }
            }
        ]

        # Add error if present
        if error:
            blocks.append({
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": f"*Error:*\n```{error[:200]}```"
                }
            })

        blocks.append({
            "type": "context",
            "elements": [
                {
                    "type": "mrkdwn",
                    "text": f"Completed: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"
                }
            ]
        })

        return self.send(f"WAVE {status_text}: {story_id}", blocks)


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
    safety_score: float = 1.0,
    llm_model: str = ""
) -> bool:
    """Quick helper to notify agent completion with metrics."""
    return get_notifier().notify_agent_complete(
        agent, story_id, files_count, tokens, cost_usd, duration_s, safety_score, llm_model
    )


def notify_wave_start(
    story_id: str,
    title: str,
    wave_number: int = 1,
    acceptance_criteria: list = None,
    files_to_generate: list = None,
    agents_config: Dict[str, str] = None
) -> bool:
    """
    Quick helper to send Wave Start Overview notification.

    Args:
        story_id: Story identifier
        title: Story title
        wave_number: Wave number (default: 1)
        acceptance_criteria: List of AC items
        files_to_generate: List of files to create/modify
        agents_config: Dict mapping agent -> LLM model
    """
    return get_notifier().notify_wave_start(
        story_id=story_id,
        title=title,
        wave_number=wave_number,
        acceptance_criteria=acceptance_criteria or [],
        files_to_generate=files_to_generate or [],
        agents_config=agents_config or {}
    )


def notify_wave_summary(
    story_id: str,
    title: str,
    status: str,
    gate: int,
    duration_s: float,
    agent_results: Dict[str, Dict[str, Any]] = None,
    total_tokens: int = 0,
    total_cost: float = 0.0,
    safety_score: float = 1.0,
    files_generated: int = 0,
    error: Optional[str] = None
) -> bool:
    """
    Quick helper to send Wave End Summary notification.

    Args:
        story_id: Story identifier
        title: Story title
        status: Final status (success, failed, etc.)
        gate: Final gate number
        duration_s: Total duration in seconds
        agent_results: Dict with results per agent
        total_tokens: Total tokens used
        total_cost: Total cost in USD
        safety_score: Overall safety score
        files_generated: Number of files generated
        error: Error message if failed
    """
    return get_notifier().notify_wave_summary(
        story_id=story_id,
        title=title,
        status=status,
        gate=gate,
        duration_s=duration_s,
        agent_results=agent_results or {},
        total_tokens=total_tokens,
        total_cost=total_cost,
        safety_score=safety_score,
        files_generated=files_generated,
        error=error
    )
