"""
Autonomous Pipeline
Story: WAVE-P5-001

End-to-end pipeline: PRD → Stories → Assignment → Parallel Dev →
QA → Dev-Fix → Merge. Tracks cost and human interventions.
"""

import logging
from dataclasses import dataclass, field
from typing import List, Optional

from .story_generator import GeneratedStory
from .cost_tracker import CostTracker

logger = logging.getLogger(__name__)


@dataclass
class PipelineStage:
    """A pipeline stage."""
    name: str
    order: int
    completed: bool = False


@dataclass
class PipelineStatus:
    """Current pipeline status."""
    current_stage: str
    total_stories: int
    completed_stories: int = 0
    failed_stories: int = 0
    total_cost: float = 0.0
    human_interventions: int = 0


@dataclass
class PipelineConfig:
    """Pipeline configuration."""
    max_parallel: int = 4
    max_qa_retries: int = 3
    budget_limit: float = 100.0
    domain_config: dict = field(default_factory=dict)


PIPELINE_STAGES = [
    PipelineStage(name="prd_ingestion", order=1),
    PipelineStage(name="story_generation", order=2),
    PipelineStage(name="assignment", order=3),
    PipelineStage(name="development", order=4),
    PipelineStage(name="qa", order=5),
    PipelineStage(name="merge", order=6),
]


class AutonomousPipeline:
    """
    Full autonomous pipeline (AC-08).

    Manages the lifecycle from PRD to merged code with minimal
    human intervention. Each stage is checkpointed.
    """

    def __init__(self, config: PipelineConfig):
        self.config = config
        self.stages = [
            PipelineStage(name=s.name, order=s.order)
            for s in PIPELINE_STAGES
        ]
        self._current_stage_idx = 0
        self._stories: List[GeneratedStory] = []
        self._cost_tracker = CostTracker(budget_limit=config.budget_limit)
        self.human_interventions = 0

    def plan_parallel_batches(
        self, stories: List[GeneratedStory]
    ) -> List[List[GeneratedStory]]:
        """
        Partition stories into parallel batches by domain (AC-03).

        Stories in different domains go in the same batch.
        Same-domain stories go in separate batches.

        Returns:
            List of batches, each containing non-conflicting stories.
        """
        batches: List[List[GeneratedStory]] = []
        remaining = list(stories)

        while remaining:
            batch: List[GeneratedStory] = []
            claimed_domains: set = set()
            next_remaining: List[GeneratedStory] = []

            for story in remaining:
                if (story.domain not in claimed_domains
                        and len(batch) < self.config.max_parallel):
                    batch.append(story)
                    claimed_domains.add(story.domain)
                else:
                    next_remaining.append(story)

            batches.append(batch)
            remaining = next_remaining

        return batches

    def get_status(self) -> PipelineStatus:
        """Get current pipeline status."""
        current = self.stages[self._current_stage_idx].name
        return PipelineStatus(
            current_stage=current,
            total_stories=len(self._stories),
            total_cost=self._cost_tracker.total_cost,
            human_interventions=self.human_interventions,
        )
