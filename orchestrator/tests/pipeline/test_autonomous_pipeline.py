"""
Tests for End-to-End Autonomous Pipeline
Story: WAVE-P5-001

Tests the full autonomous pipeline: PRD → Stories → Assignment →
Parallel Development → QA → Dev-Fix Loop → Merge → Cost Tracking.

Test Categories:
1. PRD Ingestion & Story Generation (AC-01) — 4 tests
2. Story Prioritization & Assignment (AC-02) — 3 tests
3. Parallel Development (AC-03) — 2 tests
4. Automatic QA (AC-04) — 3 tests
5. Dev-Fix Loop (AC-05) — 3 tests
6. Final Merge (AC-06) — 2 tests
7. Cost Tracking (AC-07) — 3 tests
8. Autonomous End-to-End (AC-08) — 3 tests

Total: 23 tests
"""

import pytest
from typing import Dict, Any, List
from unittest.mock import MagicMock, patch

from src.pipeline.autonomous_pipeline import (
    AutonomousPipeline,
    PipelineStage,
    PipelineStatus,
    PipelineConfig,
)
from src.pipeline.prd_ingester import PRDIngester, PRDDocument, Requirement
from src.pipeline.story_generator import StoryGenerator, GeneratedStory
from src.pipeline.assignment_engine import AssignmentEngine, StoryAssignment
from src.pipeline.qa_trigger import QATrigger, QAResult
from src.pipeline.dev_fix_loop import DevFixLoop, FixAttempt
from src.pipeline.merge_finalizer import MergeFinalizer, MergeStatus
from src.pipeline.cost_tracker import CostTracker, CostEntry


# ═══════════════════════════════════════════════════════════════════════════════
# FIXTURES
# ═══════════════════════════════════════════════════════════════════════════════

SAMPLE_PRD = """
# User Authentication System

## Requirements
1. Users can register with email and password
2. Users can login with credentials
3. Users can reset their password via email
4. Session management with JWT tokens
5. Rate limiting on auth endpoints

## Acceptance Criteria
- Registration validates email format
- Passwords hashed with bcrypt
- JWT tokens expire after 24 hours
- Rate limit: 5 login attempts per minute
"""


@pytest.fixture
def prd_ingester():
    return PRDIngester()


@pytest.fixture
def story_generator():
    return StoryGenerator()


@pytest.fixture
def assignment_engine():
    domain_config = {
        "domains": [
            {"id": "auth", "name": "Auth", "agent": "be-dev-1"},
            {"id": "booking", "name": "Booking", "agent": "be-dev-2"},
            {"id": "frontend", "name": "Frontend", "agent": "fe-dev-1"},
        ],
    }
    return AssignmentEngine(domain_config)


@pytest.fixture
def qa_trigger():
    return QATrigger()


@pytest.fixture
def dev_fix_loop():
    return DevFixLoop(max_retries=3)


@pytest.fixture
def cost_tracker():
    return CostTracker(budget_limit=100.0)


@pytest.fixture
def pipeline():
    """Fully configured pipeline with mock agents."""
    config = PipelineConfig(
        max_parallel=4,
        max_qa_retries=3,
        budget_limit=100.0,
        domain_config={
            "domains": [
                {"id": "auth", "name": "Auth", "agent": "be-dev-1",
                 "file_patterns": ["src/auth/**/*"]},
                {"id": "booking", "name": "Booking", "agent": "be-dev-2",
                 "file_patterns": ["src/booking/**/*"]},
            ],
        },
    )
    return AutonomousPipeline(config)


# ═══════════════════════════════════════════════════════════════════════════════
# 1. PRD Ingestion & Story Generation (AC-01)
# ═══════════════════════════════════════════════════════════════════════════════

class TestPRDIngestion:
    """Tests for AC-01: PRD ingestion and story generation."""

    def test_parse_prd_document(self, prd_ingester):
        """AC-01: PRD text parsed into structured document."""
        doc = prd_ingester.parse(SAMPLE_PRD)
        assert isinstance(doc, PRDDocument)
        assert doc.title is not None
        assert len(doc.requirements) > 0

    def test_extract_requirements(self, prd_ingester):
        """AC-01: Requirements extracted from PRD."""
        doc = prd_ingester.parse(SAMPLE_PRD)
        assert len(doc.requirements) >= 3
        assert any("register" in r.text.lower() for r in doc.requirements)

    def test_generate_stories_from_prd(self, story_generator, prd_ingester):
        """AC-01: Stories generated from parsed PRD."""
        doc = prd_ingester.parse(SAMPLE_PRD)
        stories = story_generator.generate(doc)
        assert len(stories) > 0
        assert all(isinstance(s, GeneratedStory) for s in stories)

    def test_generated_stories_have_correct_format(self, story_generator, prd_ingester):
        """AC-01: Generated stories have required fields."""
        doc = prd_ingester.parse(SAMPLE_PRD)
        stories = story_generator.generate(doc)
        for story in stories:
            assert story.story_id
            assert story.title
            assert story.domain
            assert story.acceptance_criteria


# ═══════════════════════════════════════════════════════════════════════════════
# 2. Story Prioritization & Assignment (AC-02)
# ═══════════════════════════════════════════════════════════════════════════════

class TestStoryAssignment:
    """Tests for AC-02: Story prioritization and assignment."""

    def test_stories_assigned_to_agents(self, assignment_engine):
        """AC-02: Stories assigned to domain-appropriate agents."""
        stories = [
            GeneratedStory(
                story_id="S-1", title="Auth feature",
                domain="auth", acceptance_criteria=["AC-1"],
                priority=1,
            ),
        ]
        assignments = assignment_engine.assign(stories)
        assert len(assignments) == 1
        assert assignments[0].agent == "be-dev-1"

    def test_stories_prioritized_by_priority(self, assignment_engine):
        """AC-02: Stories ordered by priority."""
        stories = [
            GeneratedStory(
                story_id="S-1", title="Low priority",
                domain="auth", acceptance_criteria=["AC-1"],
                priority=3,
            ),
            GeneratedStory(
                story_id="S-2", title="High priority",
                domain="booking", acceptance_criteria=["AC-1"],
                priority=1,
            ),
        ]
        assignments = assignment_engine.assign(stories)
        assert assignments[0].story.priority <= assignments[1].story.priority

    def test_unknown_domain_uses_default_agent(self, assignment_engine):
        """AC-02: Unknown domain falls back to default agent."""
        stories = [
            GeneratedStory(
                story_id="S-1", title="Unknown domain",
                domain="unknown", acceptance_criteria=["AC-1"],
                priority=1,
            ),
        ]
        assignments = assignment_engine.assign(stories)
        assert len(assignments) == 1
        assert assignments[0].agent is not None


# ═══════════════════════════════════════════════════════════════════════════════
# 3. Parallel Development (AC-03)
# ═══════════════════════════════════════════════════════════════════════════════

class TestParallelDevelopment:
    """Tests for AC-03: Parallel development execution."""

    def test_non_conflicting_stories_run_parallel(self, pipeline):
        """AC-03: Non-conflicting stories scheduled in parallel."""
        stories = [
            GeneratedStory(
                story_id="S-1", title="Auth story",
                domain="auth", acceptance_criteria=["AC-1"],
                priority=1,
            ),
            GeneratedStory(
                story_id="S-2", title="Booking story",
                domain="booking", acceptance_criteria=["AC-1"],
                priority=1,
            ),
        ]
        batches = pipeline.plan_parallel_batches(stories)
        # Both should be in the first batch (different domains)
        assert len(batches[0]) == 2

    def test_conflicting_stories_serialized(self, pipeline):
        """AC-03: Same-domain stories go to separate batches."""
        stories = [
            GeneratedStory(
                story_id="S-1", title="Auth story 1",
                domain="auth", acceptance_criteria=["AC-1"],
                priority=1,
            ),
            GeneratedStory(
                story_id="S-2", title="Auth story 2",
                domain="auth", acceptance_criteria=["AC-1"],
                priority=2,
            ),
        ]
        batches = pipeline.plan_parallel_batches(stories)
        assert len(batches) == 2
        assert len(batches[0]) == 1
        assert len(batches[1]) == 1


# ═══════════════════════════════════════════════════════════════════════════════
# 4. Automatic QA (AC-04)
# ═══════════════════════════════════════════════════════════════════════════════

class TestAutomaticQA:
    """Tests for AC-04: Automatic QA on completed stories."""

    def test_qa_triggered_on_completion(self, qa_trigger):
        """AC-04: QA runs automatically when dev completes."""
        result = qa_trigger.run_qa(
            story_id="S-1",
            files_modified=["src/auth/login.py"],
            test_fn=lambda files: {"passed": True, "tests_run": 5, "failures": 0},
        )
        assert isinstance(result, QAResult)
        assert result.passed is True

    def test_qa_failure_detected(self, qa_trigger):
        """AC-04: QA failures properly detected."""
        result = qa_trigger.run_qa(
            story_id="S-1",
            files_modified=["src/auth/login.py"],
            test_fn=lambda files: {"passed": False, "tests_run": 5, "failures": 2},
        )
        assert result.passed is False
        assert result.failures == 2

    def test_qa_returns_test_details(self, qa_trigger):
        """AC-04: QA result includes test details."""
        result = qa_trigger.run_qa(
            story_id="S-1",
            files_modified=[],
            test_fn=lambda files: {"passed": True, "tests_run": 10, "failures": 0},
        )
        assert result.tests_run == 10


# ═══════════════════════════════════════════════════════════════════════════════
# 5. Dev-Fix Loop (AC-05)
# ═══════════════════════════════════════════════════════════════════════════════

class TestDevFixLoop:
    """Tests for AC-05: Dev-Fix loop for QA failures."""

    def test_fix_attempted_on_qa_failure(self, dev_fix_loop):
        """AC-05: Fix attempted when QA fails."""
        qa_result = QAResult(
            story_id="S-1", passed=False, tests_run=5,
            failures=2, error_details=["Test A failed", "Test B failed"],
        )
        attempt = dev_fix_loop.attempt_fix(
            qa_result=qa_result,
            fix_fn=lambda errors: {"fixed": True, "files_modified": ["fix.py"]},
        )
        assert isinstance(attempt, FixAttempt)
        assert attempt.attempted is True

    def test_max_retries_enforced(self, dev_fix_loop):
        """AC-05: Max 3 retries enforced."""
        qa_result = QAResult(
            story_id="S-1", passed=False, tests_run=5,
            failures=1, error_details=["fail"],
        )
        always_fail_fix = lambda errors: {"fixed": False, "files_modified": []}

        for _ in range(3):
            dev_fix_loop.attempt_fix(qa_result=qa_result, fix_fn=always_fail_fix)

        # 4th attempt should be rejected
        attempt = dev_fix_loop.attempt_fix(qa_result=qa_result, fix_fn=always_fail_fix)
        assert attempt.attempted is False
        assert attempt.reason == "max_retries_exceeded"

    def test_successful_fix_resets_nothing(self, dev_fix_loop):
        """AC-05: Successful fix recorded properly."""
        qa_result = QAResult(
            story_id="S-1", passed=False, tests_run=5,
            failures=1, error_details=["fail"],
        )
        attempt = dev_fix_loop.attempt_fix(
            qa_result=qa_result,
            fix_fn=lambda errors: {"fixed": True, "files_modified": ["fix.py"]},
        )
        assert attempt.success is True


# ═══════════════════════════════════════════════════════════════════════════════
# 6. Final Merge (AC-06)
# ═══════════════════════════════════════════════════════════════════════════════

class TestFinalMerge:
    """Tests for AC-06: Final merge to main branch."""

    def test_merge_after_all_qa_passes(self):
        """AC-06: Merge triggered when all stories pass QA."""
        finalizer = MergeFinalizer()
        qa_results = [
            QAResult(story_id="S-1", passed=True, tests_run=5, failures=0),
            QAResult(story_id="S-2", passed=True, tests_run=3, failures=0),
        ]
        status = finalizer.check_merge_readiness(qa_results)
        assert status.ready is True

    def test_merge_blocked_with_qa_failures(self):
        """AC-06: Merge blocked if any QA failed."""
        finalizer = MergeFinalizer()
        qa_results = [
            QAResult(story_id="S-1", passed=True, tests_run=5, failures=0),
            QAResult(story_id="S-2", passed=False, tests_run=3, failures=1),
        ]
        status = finalizer.check_merge_readiness(qa_results)
        assert status.ready is False
        assert "S-2" in status.blocking_stories


# ═══════════════════════════════════════════════════════════════════════════════
# 7. Cost Tracking (AC-07)
# ═══════════════════════════════════════════════════════════════════════════════

class TestCostTracking:
    """Tests for AC-07: Cost tracking throughout pipeline."""

    def test_cost_recorded_per_story(self, cost_tracker):
        """AC-07: Cost tracked per story."""
        cost_tracker.record(story_id="S-1", tokens=10000, cost=0.15)
        cost_tracker.record(story_id="S-2", tokens=20000, cost=0.30)
        assert cost_tracker.get_story_cost("S-1") == 0.15
        assert cost_tracker.get_story_cost("S-2") == 0.30

    def test_total_cost_summed(self, cost_tracker):
        """AC-07: Total cost summed across all stories."""
        cost_tracker.record(story_id="S-1", tokens=10000, cost=0.15)
        cost_tracker.record(story_id="S-2", tokens=20000, cost=0.30)
        assert abs(cost_tracker.total_cost - 0.45) < 1e-9

    def test_budget_exceeded_detected(self, cost_tracker):
        """AC-07: Budget exceeded triggers warning."""
        cost_tracker.record(story_id="S-1", tokens=1000000, cost=150.0)
        assert cost_tracker.budget_exceeded is True


# ═══════════════════════════════════════════════════════════════════════════════
# 8. Autonomous End-to-End (AC-08)
# ═══════════════════════════════════════════════════════════════════════════════

class TestAutonomousEndToEnd:
    """Tests for AC-08: Pipeline completes without human intervention."""

    def test_pipeline_stages_exist(self, pipeline):
        """AC-08: Pipeline has all required stages."""
        stages = pipeline.stages
        stage_names = [s.name for s in stages]
        assert "prd_ingestion" in stage_names
        assert "story_generation" in stage_names
        assert "assignment" in stage_names
        assert "development" in stage_names
        assert "qa" in stage_names
        assert "merge" in stage_names

    def test_pipeline_tracks_interventions(self, pipeline):
        """AC-08: Pipeline tracks human interventions (should be 0)."""
        assert pipeline.human_interventions == 0

    def test_pipeline_status_available(self, pipeline):
        """AC-08: Pipeline provides status at any point."""
        status = pipeline.get_status()
        assert isinstance(status, PipelineStatus)
        assert status.current_stage is not None
        assert status.total_stories == 0  # Not started yet
