"""
Assignment Engine
Story: WAVE-P5-001

Prioritizes stories and assigns them to appropriate agents.
"""

from dataclasses import dataclass
from typing import Dict, List

from .story_generator import GeneratedStory


@dataclass
class StoryAssignment:
    """A story assigned to an agent."""
    story: GeneratedStory
    agent: str
    domain: str


class AssignmentEngine:
    """
    Assigns stories to agents based on domain expertise (AC-02).
    """

    DEFAULT_AGENT = "be-dev-1"

    def __init__(self, domain_config: dict):
        self.domain_config = domain_config
        self._domain_agent_map = self._build_agent_map()

    def assign(self, stories: List[GeneratedStory]) -> List[StoryAssignment]:
        """
        Assign stories to agents, sorted by priority.

        Args:
            stories: Stories to assign.

        Returns:
            Sorted list of StoryAssignment.
        """
        # Sort by priority (lower number = higher priority)
        sorted_stories = sorted(stories, key=lambda s: s.priority)

        assignments = []
        for story in sorted_stories:
            agent = self._get_agent_for_domain(story.domain)
            assignments.append(StoryAssignment(
                story=story,
                agent=agent,
                domain=story.domain,
            ))

        return assignments

    def _get_agent_for_domain(self, domain: str) -> str:
        """Get the assigned agent for a domain."""
        return self._domain_agent_map.get(domain, self.DEFAULT_AGENT)

    def _build_agent_map(self) -> Dict[str, str]:
        """Build domain → agent mapping from config."""
        agent_map = {}
        for d in self.domain_config.get("domains", []):
            if "agent" in d:
                agent_map[d["id"]] = d["agent"]
        return agent_map
