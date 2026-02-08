"""
Story Generator
Story: WAVE-P5-001

Generates AI Stories from parsed PRD requirements.
"""

import re
from dataclasses import dataclass, field
from typing import List

from .prd_ingester import PRDDocument, Requirement


@dataclass
class GeneratedStory:
    """A generated AI Story from PRD requirements."""
    story_id: str
    title: str
    domain: str
    acceptance_criteria: List[str] = field(default_factory=list)
    priority: int = 1
    story_points: int = 5
    requirements: List[str] = field(default_factory=list)


# Keywords → domain mapping
DOMAIN_KEYWORDS = {
    "auth": ["auth", "login", "register", "password", "session", "jwt", "token", "credential"],
    "booking": ["booking", "reservation", "schedule", "appointment", "availability"],
    "payment": ["payment", "charge", "refund", "billing", "invoice", "stripe"],
    "frontend": ["ui", "component", "page", "button", "form", "layout", "css", "style"],
    "backend": ["api", "endpoint", "server", "database", "query", "migration"],
}


class StoryGenerator:
    """
    Generates AI Stories from PRD documents (AC-01).

    Groups related requirements into stories and assigns domains
    based on keyword analysis.
    """

    def generate(self, prd: PRDDocument) -> List[GeneratedStory]:
        """
        Generate stories from a parsed PRD.

        Each requirement becomes a story. Related requirements
        could be grouped in future versions.

        Args:
            prd: Parsed PRD document.

        Returns:
            List of GeneratedStory.
        """
        stories = []

        for i, req in enumerate(prd.requirements):
            domain = self._infer_domain(req.text)
            story = GeneratedStory(
                story_id=f"GEN-{str(i + 1).zfill(3)}",
                title=req.text[:80],
                domain=domain,
                acceptance_criteria=self._generate_acceptance_criteria(req),
                priority=i + 1,
                story_points=self._estimate_points(req),
                requirements=[req.id],
            )
            stories.append(story)

        return stories

    def _infer_domain(self, text: str) -> str:
        """Infer domain from requirement text using keywords."""
        text_lower = text.lower()
        scores = {}
        for domain, keywords in DOMAIN_KEYWORDS.items():
            score = sum(1 for kw in keywords if kw in text_lower)
            if score > 0:
                scores[domain] = score

        if not scores:
            return "backend"
        return max(scores, key=scores.get)

    def _generate_acceptance_criteria(self, req: Requirement) -> List[str]:
        """Generate basic acceptance criteria from a requirement."""
        return [f"WHEN {req.text.lower()} THEN feature works correctly"]

    def _estimate_points(self, req: Requirement) -> int:
        """Estimate story points based on text complexity."""
        word_count = len(req.text.split())
        if word_count < 5:
            return 3
        elif word_count < 15:
            return 5
        return 8
