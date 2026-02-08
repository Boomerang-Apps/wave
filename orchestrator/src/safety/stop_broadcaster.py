"""
Stop Broadcaster
Story: WAVE-P5-003

Broadcasts stop signal to all registered agents.
"""

import logging
from dataclasses import dataclass
from typing import Callable, Dict, List

logger = logging.getLogger(__name__)


@dataclass
class AgentHandle:
    """Reference to a running agent that can be stopped."""
    agent_id: str
    stop_fn: Callable[[], None]


class StopBroadcaster:
    """
    Broadcasts stop signal to all agents (AC-04).

    Handles individual agent failures gracefully so one
    failing agent doesn't prevent others from stopping.
    """

    def __init__(self):
        self._agents: List[AgentHandle] = []

    def register(self, handle: AgentHandle) -> None:
        """Register an agent for stop broadcasting."""
        self._agents.append(handle)

    def unregister(self, agent_id: str) -> None:
        """Unregister an agent."""
        self._agents = [a for a in self._agents if a.agent_id != agent_id]

    def broadcast_stop(self) -> List[Dict]:
        """
        Send stop signal to all registered agents.

        Returns:
            List of per-agent results.
        """
        results = []
        for handle in self._agents:
            try:
                handle.stop_fn()
                results.append({
                    "agent_id": handle.agent_id,
                    "stopped": True,
                })
                logger.info("Stopped agent %s", handle.agent_id)
            except Exception as e:
                logger.error(
                    "Failed to stop agent %s: %s", handle.agent_id, e
                )
                results.append({
                    "agent_id": handle.agent_id,
                    "stopped": False,
                    "error": str(e),
                })

        return results
