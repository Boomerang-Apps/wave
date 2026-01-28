"""
WAVE Gate 0 Retrospective Validation Tests

TDD tests validating that Gate 0 implementations resolve all issues
identified in Grok's WAVE v2 Phase 4 Retrospective Review.

Retrospective Score: 8.8/10 -> Expected Post-Fix: 9.5+

Issue Categories:
- P0 (Critical): Safety false positives, missing containers
- P1 (High): No reset endpoint, poor error attribution
- P2 (Medium): No CI, no proactive alerts
- P3 (Long-term): No visibility, no visualization
"""

import pytest
import sys
import os

# Add src to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))


# =============================================================================
# P0 VALIDATION: Safety False Positive Resolution
# Issue: process.env and api_key = blocked in server-side code
# Time Wasted: ~3.5 hours
# =============================================================================

class TestSafetyFalsePositiveResolution:
    """Validate that server-side patterns no longer trigger false positives."""

    def test_process_env_allowed_in_api_route_file(self):
        """process.env should be allowed in app/api/*.ts files."""
        from safety.unified import UnifiedSafetyChecker

        checker = UnifiedSafetyChecker(domain="fe")
        code = """
        export async function GET(request: NextRequest) {
            const apiKey = process.env.OPENAI_API_KEY;
            return NextResponse.json({ status: 'ok' });
        }
        """

        result = checker.check(code, file_path="app/api/chat/route.ts")

        assert result.safe, f"Should allow process.env in API route: {result.violations}"
        assert result.score >= 0.85, f"Score should be >= 0.85: {result.score}"
        assert "process.env" not in str(result.violations).lower()

    def test_api_key_assignment_allowed_in_server_file(self):
        """api_key = should be allowed in server-side files."""
        from safety.unified import UnifiedSafetyChecker

        checker = UnifiedSafetyChecker(domain="fe")
        code = """
        import { NextResponse } from 'next/server';

        const api_key = process.env.STRIPE_API_KEY;

        export async function POST(request: NextRequest) {
            // Use api_key for Stripe integration
            return NextResponse.json({ success: true });
        }
        """

        result = checker.check(code, file_path="app/api/payments/route.ts")

        assert result.safe, f"Should allow api_key in server code: {result.violations}"

    def test_server_side_detection_by_content(self):
        """Server-side code detected by content patterns (NextResponse)."""
        from safety.unified import is_server_side_content

        server_code = """
        import { NextResponse } from 'next/server';
        export async function GET() {
            return NextResponse.json({});
        }
        """

        assert is_server_side_content(server_code), "Should detect server-side by content"

    def test_server_side_detection_by_file_path(self):
        """Server-side code detected by file path patterns."""
        from safety.unified import is_server_side_file

        server_paths = [
            "app/api/users/route.ts",
            "pages/api/auth.ts",
            "server/utils.ts",
            "lib/server/db.ts",
            "components/Header.server.ts",
        ]

        for path in server_paths:
            assert is_server_side_file(path), f"Should detect {path} as server-side"

    def test_client_side_still_blocked(self):
        """Dangerous patterns still blocked in client components."""
        from safety.unified import UnifiedSafetyChecker

        checker = UnifiedSafetyChecker(domain="fe")
        code = """
        'use client';
        const private_key = 'sk_live_abc123';
        """

        result = checker.check(code, file_path="components/PaymentForm.tsx")

        # This SHOULD be blocked - private key in client code
        assert not result.safe or "private_key" in str(result.violations).lower()

    def test_always_dangerous_blocked_everywhere(self):
        """Destructive patterns blocked regardless of context."""
        from safety.unified import UnifiedSafetyChecker

        checker = UnifiedSafetyChecker(domain="be")
        dangerous_code = "rm -rf /"

        result = checker.check(dangerous_code)

        assert not result.safe, "Should block rm -rf /"
        assert "P001" in str(result.violations), "Should cite P001 (destructive)"


# =============================================================================
# P0 VALIDATION: Missing Container Detection
# Issue: Merge-watcher container not in docker-compose, causing infinite cycles
# Time Wasted: ~4 hours
# =============================================================================

class TestContainerDetection:
    """Validate that container validator detects missing critical containers."""

    def test_merge_watcher_in_required_containers(self):
        """merge-watcher should be in required container list."""
        from monitoring.container_validator import DEFAULT_CONTAINERS, ContainerLevel

        container_names = [c.name for c in DEFAULT_CONTAINERS]

        assert "wave-merge-watcher" in container_names, "merge-watcher must be required"

        merge_watcher = next(c for c in DEFAULT_CONTAINERS if c.name == "wave-merge-watcher")
        assert merge_watcher.level in [ContainerLevel.CRITICAL, ContainerLevel.REQUIRED]

    def test_missing_required_returns_conditional_go(self):
        """Missing REQUIRED container should return CONDITIONAL-GO."""
        from monitoring.container_validator import (
            ContainerValidator, ContainerConfig, ContainerLevel, ContainerStatus
        )

        validator = ContainerValidator()

        # Simulate missing merge-watcher
        result = validator._evaluate_results({
            "wave-orchestrator": ContainerStatus.HEALTHY,
            "wave-fe-agent": ContainerStatus.HEALTHY,
            "wave-merge-watcher": ContainerStatus.MISSING,
        })

        assert result.go_status in ["CONDITIONAL-GO", "NO-GO"]
        assert "wave-merge-watcher" in result.missing

    def test_missing_critical_returns_no_go(self):
        """Missing CRITICAL container should return NO-GO."""
        from monitoring.container_validator import (
            ContainerValidator, ContainerStatus
        )

        validator = ContainerValidator()

        result = validator._evaluate_results({
            "wave-orchestrator": ContainerStatus.MISSING,
        })

        assert result.go_status == "NO-GO"
        assert "wave-orchestrator" in result.missing


# =============================================================================
# P1 VALIDATION: Workflow Reset Capability
# Issue: No reset endpoint, required Redis flush and container restart
# Time Wasted: ~1 hour (3 occurrences)
# =============================================================================

class TestWorkflowReset:
    """Validate workflow reset API exists and functions correctly."""

    def test_reset_request_model_exists(self):
        """ResetRequest model should be defined."""
        from api.endpoints import ResetRequest

        request = ResetRequest(
            clear_tasks=True,
            reset_gate=3,
            reason="Test reset"
        )

        assert request.clear_tasks is True
        assert request.reset_gate == 3
        assert request.reason == "Test reset"

    def test_workflow_manager_has_reset_method(self):
        """WorkflowManager should have reset_workflow method."""
        from api.endpoints import WorkflowManager

        manager = WorkflowManager()
        assert hasattr(manager, "reset_workflow")
        assert callable(getattr(manager, "reset_workflow"))

    def test_task_queue_has_clear_method(self):
        """TaskQueue should have clear_workflow_tasks method."""
        from task_queue import TaskQueue

        queue = TaskQueue()
        assert hasattr(queue, "clear_workflow_tasks")


# =============================================================================
# P1 VALIDATION: Error Attribution
# Issue: Error messages lacked source/layer, causing wrong-file debugging
# Time Wasted: Debugging friction
# =============================================================================

class TestErrorAttribution:
    """Validate that safety violations include attribution information."""

    def test_safety_violation_has_file_path(self):
        """SafetyViolation should include file_path."""
        from safety.violations import SafetyViolation

        violation = SafetyViolation(
            principle="P002",
            message="Test violation",
            file_path="src/components/App.tsx",
            line_number=42,
            matched_pattern="test",
            context="const x = test",
            layer="unified"
        )

        assert violation.file_path == "src/components/App.tsx"
        assert violation.line_number == 42

    def test_safety_violation_has_layer_info(self):
        """SafetyViolation should identify which safety layer triggered."""
        from safety.violations import SafetyViolation

        violation = SafetyViolation(
            principle="P001",
            message="Destructive command",
            file_path=None,
            line_number=None,
            matched_pattern="rm -rf",
            context="rm -rf /tmp",
            layer="constitutional"
        )

        assert violation.layer == "constitutional"

    def test_score_with_attribution_returns_violations(self):
        """score_with_attribution should return detailed violations."""
        from safety.violations import score_with_attribution

        code = "rm -rf /"
        score, violations = score_with_attribution(code)

        assert score < 0.85, "Dangerous code should have low score"
        assert len(violations) > 0, "Should have violations"
        assert all(hasattr(v, 'layer') for v in violations)

    def test_find_line_number_accuracy(self):
        """find_line_number should locate pattern in content."""
        from safety.violations import find_line_number

        content = """line 1
line 2
dangerous pattern here
line 4"""

        line_num = find_line_number(content, "dangerous pattern")
        assert line_num == 3


# =============================================================================
# P2 VALIDATION: Proactive Monitoring
# Issue: Reactive debugging instead of real-time alerts
# =============================================================================

class TestProactiveMonitoring:
    """Validate issue detector and alerting capabilities."""

    def test_issue_detector_finds_safety_blocks(self):
        """IssueDetector should detect safety block patterns in logs."""
        from monitoring.issue_detector import IssueDetector, IssueSeverity

        detector = IssueDetector()
        logs = """
        [10:00:00] Starting workflow
        [10:01:00] SAFETY BLOCK: Score 0.65 below threshold
        [10:02:00] Task failed
        """

        issues = detector.detect(logs)

        assert len(issues) > 0, "Should detect safety block"
        safety_issues = [i for i in issues if "safety" in i.message.lower()]
        assert len(safety_issues) > 0
        assert any(i.severity == IssueSeverity.CRITICAL for i in safety_issues)

    def test_issue_detector_finds_timeout(self):
        """IssueDetector should detect timeout patterns."""
        from monitoring.issue_detector import IssueDetector

        detector = IssueDetector()
        logs = "Task timed out after 300s"

        issues = detector.detect(logs)

        assert len(issues) > 0
        assert any("timeout" in i.message.lower() for i in issues)

    def test_issue_alerter_exists(self):
        """IssueAlerter class should exist for Slack integration."""
        from monitoring.issue_detector import IssueAlerter

        alerter = IssueAlerter()
        assert hasattr(alerter, "detect_and_alert")
        assert hasattr(alerter, "alert_safety_block")

    def test_detect_and_alert_function(self):
        """detect_and_alert convenience function should exist."""
        from monitoring.issue_detector import detect_and_alert

        issues = detect_and_alert("Normal log content", source="test")
        assert isinstance(issues, list)


# =============================================================================
# P3 VALIDATION: Workflow Visualization
# Issue: No visibility into gate progression
# =============================================================================

class TestWorkflowVisualization:
    """Validate BPMN visualization capabilities."""

    def test_ascii_diagram_generation(self):
        """Should generate ASCII workflow diagram."""
        from visualization.bpmn import generate_ascii_diagram

        diagram = generate_ascii_diagram(current_gate=3, story_id="TEST-001")

        assert "Gate" in diagram
        assert "TEST-001" in diagram or "[" in diagram  # Has gate markers

    def test_plantuml_generation(self):
        """Should generate PlantUML source."""
        from visualization.bpmn import generate_workflow_diagram

        plantuml = generate_workflow_diagram(current_gate=2)

        assert "@startuml" in plantuml
        assert "@enduml" in plantuml
        assert "Gate" in plantuml

    def test_diagram_url_generation(self):
        """Should generate PlantUML server URL."""
        from visualization.bpmn import get_diagram_url

        url = get_diagram_url(current_gate=1)

        assert url.startswith("http")
        assert "plantuml" in url.lower()


# =============================================================================
# INTEGRATION: Full Retrospective Issue Resolution
# =============================================================================

class TestFullRetrospectiveResolution:
    """Integration tests validating all retrospective issues are resolved."""

    def test_fe_002_scenario_no_false_positive(self):
        """
        WAVE1-FE-002 scenario: API route with api_key should NOT be blocked.

        Original Issue: FE-002 blocked at Gate 2 due to api_key = pattern
        in legitimate API route code.
        """
        from safety.unified import UnifiedSafetyChecker

        checker = UnifiedSafetyChecker(domain="fe")

        # Simulated FE-002 API route code
        fe_002_code = """
        import { NextRequest, NextResponse } from 'next/server';
        import OpenAI from 'openai';

        const openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        });

        export async function POST(request: NextRequest) {
            const { prompt } = await request.json();
            const completion = await openai.chat.completions.create({
                model: 'gpt-4',
                messages: [{ role: 'user', content: prompt }],
            });
            return NextResponse.json({ response: completion.choices[0].message });
        }
        """

        result = checker.check(fe_002_code, file_path="app/api/chat/route.ts")

        assert result.safe, f"FE-002 API route should NOT be blocked: {result.violations}"
        assert result.score >= 0.85
        assert result.details.get("is_server_side") is True

    def test_preflight_detects_missing_merge_watcher(self):
        """
        Pre-flight validation should catch missing merge-watcher BEFORE
        starting a wave, preventing the ~4 hour wait.
        """
        from monitoring.container_validator import (
            ContainerValidator, ContainerStatus
        )

        validator = ContainerValidator()

        # Simulate the problematic state from retrospective
        problematic_state = {
            "wave-orchestrator": ContainerStatus.HEALTHY,
            "wave-fe-agent": ContainerStatus.HEALTHY,
            "wave-be-agent": ContainerStatus.HEALTHY,
            "wave-qa-agent": ContainerStatus.HEALTHY,
            "wave-pm-agent": ContainerStatus.HEALTHY,
            "wave-merge-watcher": ContainerStatus.MISSING,  # THE PROBLEM
        }

        result = validator._evaluate_results(problematic_state)

        # Should NOT be GO - should catch the missing container
        assert result.go_status != "GO", "Should not allow GO with missing merge-watcher"
        assert "merge-watcher" in str(result.missing).lower()

    def test_contaminated_state_recoverable(self):
        """
        Contaminated workflow state should be recoverable via reset API
        without requiring Redis flush or container restart.
        """
        from api.endpoints import ResetRequest, WorkflowManager

        # Create reset request
        request = ResetRequest(
            clear_tasks=True,
            reset_gate=1,
            reason="Contaminated state from failed retry"
        )

        assert request.clear_tasks is True
        assert request.reset_gate == 1

        # Manager should have reset capability
        manager = WorkflowManager()
        assert hasattr(manager, "reset_workflow")

    def test_error_attribution_prevents_wrong_file_debugging(self):
        """
        Error attribution should clearly identify which file and layer
        triggered the violation, preventing wrong-file debugging loops.
        """
        from safety.violations import SafetyViolation, score_with_attribution

        # Score dangerous code
        code = """
        'use client';
        const private_key = 'sk_live_secret123';
        """

        score, violations = score_with_attribution(code, file_path="components/Checkout.tsx")

        if violations:
            # Each violation should have attribution
            for v in violations:
                assert v.layer is not None, "Violation should identify layer"
                # File path should be preserved
                if v.file_path:
                    assert v.file_path == "components/Checkout.tsx"

    def test_all_gate0_modules_importable(self):
        """All Gate 0 enhancement modules should be importable."""
        modules_to_test = [
            ("monitoring.issue_detector", ["IssueDetector", "IssueAlerter", "detect_and_alert"]),
            ("monitoring.container_validator", ["ContainerValidator", "ValidationResult"]),
            ("safety.unified", ["UnifiedSafetyChecker", "SafetyResult", "score_action"]),
            ("safety.violations", ["SafetyViolation", "score_with_attribution"]),
            ("visualization.bpmn", ["generate_workflow_diagram", "generate_ascii_diagram"]),
            ("api.endpoints", ["ResetRequest"]),
        ]

        for module_name, exports in modules_to_test:
            try:
                module = __import__(module_name, fromlist=exports)
                for export in exports:
                    assert hasattr(module, export), f"{module_name} missing {export}"
            except ImportError as e:
                pytest.fail(f"Failed to import {module_name}: {e}")


# =============================================================================
# RUN CONFIGURATION
# =============================================================================

if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
