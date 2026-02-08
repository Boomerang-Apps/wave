"""
WAVE Channel Namespacing
Story: WAVE-P2-001

Provides project-scoped channel naming for Redis Streams isolation (AC-04).
"""

from typing import Optional


# Channel prefix for all WAVE streams
WAVE_PREFIX = "wave"


class ChannelManager:
    """
    Manages Redis Stream channel names with project namespacing.

    Ensures messages from different projects are isolated (AC-04):
    wave:signals:projectA messages never reach projectB subscribers.
    """

    def __init__(self, project: str):
        """
        Initialize channel manager for a project.

        Args:
            project: Project name used for namespace isolation
        """
        if not project or not project.strip():
            raise ValueError("Project name cannot be empty")
        self.project = project.strip().lower()

    def signals(self) -> str:
        """Main signal channel for gate/story events."""
        return f"{WAVE_PREFIX}:signals:{self.project}"

    def agent(self, agent_id: str) -> str:
        """Per-agent channel for direct communication."""
        return f"{WAVE_PREFIX}:agent:{self.project}:{agent_id}"

    def gate(self, gate_name: str) -> str:
        """Per-gate channel for gate-specific events."""
        return f"{WAVE_PREFIX}:gate:{self.project}:{gate_name}"

    def system(self) -> str:
        """System-wide channel (health, emergency stop)."""
        return f"{WAVE_PREFIX}:system:{self.project}"

    def dead_letter(self) -> str:
        """Dead letter queue for failed message processing."""
        return f"{WAVE_PREFIX}:dlq:{self.project}"

    @staticmethod
    def global_system() -> str:
        """Global system channel (cross-project, e.g. emergency stop)."""
        return f"{WAVE_PREFIX}:system:global"

    def all_channels(self) -> list[str]:
        """Return all standard channels for this project."""
        return [
            self.signals(),
            self.system(),
            self.dead_letter(),
        ]

    @staticmethod
    def parse_channel(channel: str) -> dict:
        """
        Parse a channel name into its components.

        Args:
            channel: Full channel name (e.g., "wave:signals:myproject")

        Returns:
            Dict with prefix, type, project, and optional extra components
        """
        parts = channel.split(":")
        result = {"raw": channel}

        if len(parts) >= 1:
            result["prefix"] = parts[0]
        if len(parts) >= 2:
            result["type"] = parts[1]
        if len(parts) >= 3:
            result["project"] = parts[2]
        if len(parts) >= 4:
            result["extra"] = ":".join(parts[3:])

        return result
