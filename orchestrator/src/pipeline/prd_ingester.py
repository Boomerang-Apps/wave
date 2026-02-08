"""
PRD Ingester
Story: WAVE-P5-001

Parses PRD documents and extracts structured requirements.
"""

import re
from dataclasses import dataclass, field
from typing import List


@dataclass
class Requirement:
    """A single requirement extracted from PRD."""
    id: str
    text: str
    category: str = ""


@dataclass
class PRDDocument:
    """Parsed PRD document."""
    title: str
    raw_text: str
    requirements: List[Requirement] = field(default_factory=list)
    acceptance_criteria: List[str] = field(default_factory=list)


class PRDIngester:
    """
    Parses PRD text into structured requirements (AC-01).

    Extracts title, numbered requirements, and acceptance criteria
    from markdown-formatted PRD documents.
    """

    def parse(self, prd_text: str) -> PRDDocument:
        """
        Parse PRD text into a PRDDocument.

        Args:
            prd_text: Raw PRD text (markdown).

        Returns:
            Structured PRDDocument.
        """
        title = self._extract_title(prd_text)
        requirements = self._extract_requirements(prd_text)
        acceptance_criteria = self._extract_acceptance_criteria(prd_text)

        return PRDDocument(
            title=title,
            raw_text=prd_text,
            requirements=requirements,
            acceptance_criteria=acceptance_criteria,
        )

    def _extract_title(self, text: str) -> str:
        """Extract title from first heading."""
        match = re.search(r"^#\s+(.+)$", text, re.MULTILINE)
        return match.group(1).strip() if match else "Untitled PRD"

    def _extract_requirements(self, text: str) -> List[Requirement]:
        """Extract numbered requirements."""
        reqs = []
        # Match numbered items (1. xxx, 2. xxx, etc.)
        pattern = re.compile(r"^\s*(\d+)\.\s+(.+)$", re.MULTILINE)
        for match in pattern.finditer(text):
            req_id = f"REQ-{match.group(1).zfill(3)}"
            reqs.append(Requirement(
                id=req_id,
                text=match.group(2).strip(),
            ))
        return reqs

    def _extract_acceptance_criteria(self, text: str) -> List[str]:
        """Extract acceptance criteria (bullet points under AC heading)."""
        criteria = []
        in_ac_section = False
        for line in text.split("\n"):
            if "acceptance criteria" in line.lower():
                in_ac_section = True
                continue
            if in_ac_section and line.strip().startswith("-"):
                criteria.append(line.strip().lstrip("- "))
            elif in_ac_section and line.strip().startswith("#"):
                break
        return criteria
