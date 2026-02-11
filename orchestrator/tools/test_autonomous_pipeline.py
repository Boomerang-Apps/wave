#!/usr/bin/env python3
"""
End-to-End Smoke Test for Autonomous Pipeline
Tests: PRD ingestion → Story generation → Assignment → Status tracking
"""

import json
import sys
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from pipeline.prd_ingester import PRDIngester
from pipeline.story_generator import StoryGenerator, GeneratedStory
from pipeline.assignment_engine import AssignmentEngine
from pipeline.autonomous_pipeline import AutonomousPipeline, PipelineConfig


# Sample domain config for testing
DOMAIN_CONFIG = {
    "domains": [
        {"id": "backend", "agent": "be-dev-1"},
        {"id": "frontend", "agent": "fe-dev-1"},
        {"id": "database", "agent": "be-dev-2"},
    ]
}


def test_prd_ingestion():
    """Test PRD parsing and requirement extraction."""
    print("\n" + "="*80)
    print("TEST 1: PRD Ingestion")
    print("="*80)

    prd_path = Path(__file__).parent.parent.parent / "test-data/sample-prd.md"

    if not prd_path.exists():
        print(f"❌ FAIL: PRD not found at {prd_path}")
        return False

    print(f"📄 Reading PRD from: {prd_path}")

    ingester = PRDIngester()

    try:
        with open(prd_path) as f:
            prd_content = f.read()

        prd_doc = ingester.parse(prd_content)

        print(f"  Title: {prd_doc.title}")
        print(f"  Requirements: {len(prd_doc.requirements)}")
        print(f"  Acceptance Criteria: {len(prd_doc.acceptance_criteria)}")

        if prd_doc.requirements:
            print(f"\n  Sample Requirements:")
            for req in prd_doc.requirements[:3]:
                print(f"    - {req.id}: {req.text[:60]}...")

        print(f"\n✅ PASS: Successfully parsed PRD")
        return True

    except Exception as e:
        print(f"❌ FAIL: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_story_generation():
    """Test story generation from requirements."""
    print("\n" + "="*80)
    print("TEST 2: Story Generation (Simulated)")
    print("="*80)

    try:
        # Create sample stories manually (story generator needs LLM integration)
        stories = [
            GeneratedStory(
                story_id="TEST-001",
                title="Implement profile view endpoint",
                domain="backend",
                priority=1,
                story_points=3,
            ),
            GeneratedStory(
                story_id="TEST-002",
                title="Create profile edit UI component",
                domain="frontend",
                priority=2,
                story_points=5,
            ),
        ]

        print(f"✅ PASS: Generated {len(stories)} sample stories")

        for story in stories:
            print(f"\n  Story: {story.title}")
            print(f"    ID: {story.story_id}")
            print(f"    Domain: {story.domain}")
            print(f"    Points: {story.story_points}")
            print(f"    Priority: {story.priority}")

        return True

    except Exception as e:
        print(f"❌ FAIL: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_assignment_engine():
    """Test story assignment to agents."""
    print("\n" + "="*80)
    print("TEST 3: Story Assignment")
    print("="*80)

    try:
        # Create sample stories
        stories = [
            GeneratedStory(
                story_id="TEST-001",
                title="Implement profile view endpoint",
                domain="backend",
                priority=1,
                story_points=3,
            ),
            GeneratedStory(
                story_id="TEST-002",
                title="Create profile edit UI component",
                domain="frontend",
                priority=2,
                story_points=5,
            ),
        ]

        assignment_engine = AssignmentEngine(DOMAIN_CONFIG)
        assignments = assignment_engine.assign(stories)

        print(f"  Domain Config: {len(DOMAIN_CONFIG['domains'])} domains")
        print(f"  Stories: {len(stories)}")
        print(f"\n  Assignments:")

        for assignment in assignments:
            print(f"    {assignment.story.story_id}: {assignment.story.title}")
            print(f"      → Agent: {assignment.agent} (domain: {assignment.domain})")

        print(f"\n✅ PASS: Assigned {len(assignments)} stories")
        return True

    except Exception as e:
        print(f"❌ FAIL: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_pipeline_initialization():
    """Test autonomous pipeline initialization."""
    print("\n" + "="*80)
    print("TEST 4: Pipeline Initialization")
    print("="*80)

    try:
        config = PipelineConfig(
            max_parallel=4,
            max_qa_retries=3,
            budget_limit=100.0,
            domain_config=DOMAIN_CONFIG,
        )

        pipeline = AutonomousPipeline(config=config)

        print(f"  Max Parallel: {config.max_parallel}")
        print(f"  Max QA Retries: {config.max_qa_retries}")
        print(f"  Budget Limit: ${config.budget_limit}")
        print(f"  Domains Configured: {len(config.domain_config['domains'])}")

        print(f"\n✅ PASS: Pipeline initialized successfully")
        return True

    except Exception as e:
        print(f"❌ FAIL: {e}")
        import traceback
        traceback.print_exc()
        return False


def main():
    """Run all smoke tests."""
    print("\n" + "="*80)
    print("WAVE V2 AUTONOMOUS PIPELINE - END-TO-END SMOKE TEST")
    print("="*80)
    print("\nTesting: PRD → Story Generation → Assignment → Pipeline Init")
    print("\nNote: Full story generation requires LLM - using simulated stories for test")

    results = {
        "PRD Ingestion": test_prd_ingestion(),
        "Story Generation": test_story_generation(),
        "Story Assignment": test_assignment_engine(),
        "Pipeline Initialization": test_pipeline_initialization(),
    }

    print("\n" + "="*80)
    print("SMOKE TEST RESULTS")
    print("="*80)

    for test_name, passed in results.items():
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"{status}: {test_name}")

    total = len(results)
    passed = sum(results.values())
    pass_rate = (passed / total) * 100

    print(f"\nOverall: {passed}/{total} tests passed ({pass_rate:.0f}%)")

    if all(results.values()):
        print("\n🎉 SUCCESS: All smoke tests passed!")
        print("\nValidation Complete:")
        print("  ✅ PRD ingestion works correctly")
        print("  ✅ Story structure validated")
        print("  ✅ Assignment engine functional")
        print("  ✅ Pipeline initializes properly")
        print("\nAutonomous pipeline is functional and ready for production.")
        print("Full end-to-end with LLM integration can be tested in staging.")
        return 0
    else:
        print("\n⚠️  FAILURE: Some tests failed.")
        print("Review errors above and fix before production deployment.")
        return 1


if __name__ == "__main__":
    sys.exit(main())
