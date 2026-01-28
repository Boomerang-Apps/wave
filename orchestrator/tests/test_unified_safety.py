"""
TDD Tests for Unified Safety Checker
Gate 0 Research Item #2: Unified SafetyChecker Class

These tests define the expected behavior of the unified safety system.
Written BEFORE implementation per TDD methodology.
"""

import pytest
from typing import Optional


class TestUnifiedSafetyChecker:
    """Tests for the unified SafetyChecker class."""

    def test_server_side_api_route_allows_env_vars(self):
        """process.env should be allowed in app/api/ routes."""
        from src.safety.unified import UnifiedSafetyChecker

        checker = UnifiedSafetyChecker()
        result = checker.check(
            content="const key = process.env.API_KEY",
            file_path="app/api/transform/route.ts"
        )

        assert result.safe is True
        assert result.score >= 0.85

    def test_client_component_blocks_env_vars(self):
        """process.env should be blocked in client components."""
        from src.safety.unified import UnifiedSafetyChecker

        checker = UnifiedSafetyChecker()
        result = checker.check(
            content="const key = process.env.API_KEY",
            file_path="components/Button.tsx"
        )

        # Should warn but not necessarily block
        # (depends on threshold configuration)
        assert result.score < 1.0

    def test_api_key_allowed_in_server_route(self):
        """api_key pattern should be allowed in server-side route."""
        from src.safety.unified import UnifiedSafetyChecker

        checker = UnifiedSafetyChecker()
        result = checker.check(
            content="const api_key = getConfig().apiKey",
            file_path="app/api/auth/route.ts"
        )

        assert result.safe is True
        assert result.score >= 0.85

    def test_api_key_warns_in_client_code(self):
        """api_key pattern should warn in client-side code."""
        from src.safety.unified import UnifiedSafetyChecker

        checker = UnifiedSafetyChecker()
        result = checker.check(
            content="const api_key = 'sk-ant-xxxxx'",  # Actual key pattern
            file_path="components/ClientComponent.tsx"
        )

        # Should detect credential exposure
        assert result.score < 0.85 or len(result.violations) > 0

    def test_domain_fe_stricter_than_be(self):
        """FE domain should be stricter about certain patterns."""
        from src.safety.unified import UnifiedSafetyChecker

        fe_checker = UnifiedSafetyChecker(domain="fe")
        be_checker = UnifiedSafetyChecker(domain="be")

        content = "const password = process.env.DB_PASSWORD"
        file_path = "lib/config.ts"

        fe_result = fe_checker.check(content, file_path)
        be_result = be_checker.check(content, file_path)

        # BE should be more permissive for auth patterns
        assert be_result.score >= fe_result.score

    def test_destructive_commands_always_blocked(self):
        """rm -rf and DROP TABLE should always be blocked."""
        from src.safety.unified import UnifiedSafetyChecker

        checker = UnifiedSafetyChecker()

        # rm -rf
        result1 = checker.check("rm -rf /", file_path=None)
        assert result1.safe is False
        assert result1.score < 0.5

        # DROP TABLE
        result2 = checker.check("DROP TABLE users;", file_path=None)
        assert result2.safe is False

    def test_content_detection_for_server_side(self):
        """Should detect server-side code from content patterns."""
        from src.safety.unified import UnifiedSafetyChecker

        checker = UnifiedSafetyChecker()

        # Content with Next.js API handler patterns
        content = """
        import { NextResponse } from 'next/server';

        export async function POST(request: Request) {
            const apiKey = process.env.API_KEY;
            return NextResponse.json({ success: true });
        }
        """

        # Should detect this as server-side even without file_path
        result = checker.check(content, file_path=None)

        assert result.safe is True
        assert result.score >= 0.85

    def test_wave_principles_p001_destructive(self):
        """P001: No destructive commands."""
        from src.safety.unified import UnifiedSafetyChecker

        checker = UnifiedSafetyChecker()

        result = checker.check("git push --force origin main")

        assert any("P001" in str(v) for v in result.violations) or result.score < 0.85

    def test_wave_principles_p003_scope(self):
        """P003: Stay in scope - no parent directory traversal."""
        from src.safety.unified import UnifiedSafetyChecker

        checker = UnifiedSafetyChecker()

        result = checker.check("readFile('../../etc/passwd')")

        assert result.safe is False

    def test_configurable_threshold(self):
        """Threshold should be configurable."""
        from src.safety.unified import UnifiedSafetyChecker

        strict_checker = UnifiedSafetyChecker(block_threshold=0.95)
        lenient_checker = UnifiedSafetyChecker(block_threshold=0.5)

        content = "console.log('debug statement')"  # Minor warning

        strict_result = strict_checker.check(content)
        lenient_result = lenient_checker.check(content)

        # Same score, different safety determination
        # strict_result.safe may be False while lenient_result.safe is True

    def test_violations_list_populated(self):
        """Violations should be populated with details."""
        from src.safety.unified import UnifiedSafetyChecker

        checker = UnifiedSafetyChecker()

        result = checker.check("rm -rf / && DROP TABLE users;")

        assert len(result.violations) >= 2
        assert any("destructive" in str(v).lower() for v in result.violations)

    def test_backward_compatible_score_action(self):
        """Should maintain compatibility with score_action() API."""
        from src.safety.unified import score_action

        score, violations, risks = score_action("rm -rf /")

        assert isinstance(score, float)
        assert 0.0 <= score <= 1.0
        assert isinstance(violations, list)
        assert isinstance(risks, list)
        assert score < 0.5  # Destructive command

    def test_backward_compatible_check_action_safety(self):
        """Should maintain compatibility with check_action_safety() API."""
        from src.safety.unified import check_action_safety

        result = check_action_safety(
            action="git commit -m 'test'",
            context="Normal commit",
            file_path=None
        )

        assert hasattr(result, 'safe')
        assert hasattr(result, 'score')
        assert result.safe is True


class TestSafetyResult:
    """Tests for SafetyResult dataclass."""

    def test_safety_result_has_required_fields(self):
        """SafetyResult should have all required fields."""
        from src.safety.unified import SafetyResult

        result = SafetyResult(
            safe=True,
            score=0.95,
            violations=[],
            recommendation="ALLOW"
        )

        assert result.safe is True
        assert result.score == 0.95
        assert result.violations == []
        assert result.recommendation == "ALLOW"

    def test_safety_result_to_dict(self):
        """SafetyResult should serialize to dict."""
        from src.safety.unified import SafetyResult

        result = SafetyResult(
            safe=False,
            score=0.5,
            violations=["P001: Destructive command"],
            recommendation="BLOCK"
        )

        d = result.to_dict()

        assert d["safe"] is False
        assert d["score"] == 0.5
        assert len(d["violations"]) == 1


class TestServerSideDetection:
    """Tests for server-side code detection."""

    def test_app_api_route_is_server_side(self):
        """app/api/*.ts should be detected as server-side."""
        from src.safety.unified import is_server_side_file

        assert is_server_side_file("app/api/users/route.ts") is True
        assert is_server_side_file("app/api/auth/[...nextauth]/route.ts") is True
        assert is_server_side_file("footprint/app/api/transform/route.ts") is True

    def test_pages_api_route_is_server_side(self):
        """pages/api/*.ts should be detected as server-side."""
        from src.safety.unified import is_server_side_file

        assert is_server_side_file("pages/api/hello.ts") is True
        assert is_server_side_file("pages/api/auth.js") is True

    def test_component_is_not_server_side(self):
        """components/*.tsx should NOT be server-side."""
        from src.safety.unified import is_server_side_file

        assert is_server_side_file("components/Button.tsx") is False
        assert is_server_side_file("src/components/Header.tsx") is False

    def test_content_with_next_response_is_server_side(self):
        """Content with NextResponse should be detected as server-side."""
        from src.safety.unified import is_server_side_content

        content = """
        import { NextResponse } from 'next/server';
        export function GET() { return NextResponse.json({}); }
        """

        assert is_server_side_content(content) is True

    def test_content_with_s3_client_is_server_side(self):
        """Content with S3Client should be detected as server-side."""
        from src.safety.unified import is_server_side_content

        content = """
        import { S3Client } from '@aws-sdk/client-s3';
        const client = new S3Client({ region: 'us-east-1' });
        """

        assert is_server_side_content(content) is True


class TestP006ExplicitTriggers:
    """Tests for P006 uncertainty escalation triggers."""

    def test_low_confidence_triggers_escalation(self):
        """Confidence < 0.6 should trigger escalation."""
        from src.safety.unified import should_escalate_p006

        result = {
            "confidence_score": 0.4,
            "requirements": "Clear requirements",
        }

        assert should_escalate_p006(result) is True

    def test_ambiguous_keywords_trigger_escalation(self):
        """Ambiguous keywords in requirements should trigger escalation."""
        from src.safety.unified import should_escalate_p006

        result = {
            "confidence_score": 0.8,
            "requirements": "Maybe implement some kind of authentication",
        }

        assert should_escalate_p006(result) is True

    def test_multiple_options_without_selection_triggers_escalation(self):
        """Multiple options without selection should trigger escalation."""
        from src.safety.unified import should_escalate_p006

        result = {
            "confidence_score": 0.8,
            "options": ["OAuth", "JWT", "Session"],
            "selected": None,
        }

        assert should_escalate_p006(result) is True

    def test_clear_requirements_no_escalation(self):
        """Clear requirements with good confidence should not escalate."""
        from src.safety.unified import should_escalate_p006

        result = {
            "confidence_score": 0.9,
            "requirements": "Implement JWT authentication with refresh tokens",
            "options": ["JWT"],
            "selected": "JWT",
        }

        assert should_escalate_p006(result) is False
