"""
TDD Tests for GAP-004: Backward Compatibility Scoring

This test file was created BEFORE the implementation fix per TDD methodology.
These tests ensure backward-compatible functions work correctly with the new scoring.

GAP-004: Backward compatible score_action() and check_action_safety() must:
- Return proper scores (< 0.5 for dangerous, >= 0.5 for safe)
- Return violations list for dangerous actions
- Return risks list for warnings
- Maintain API compatibility with existing callers
"""

import pytest
from typing import Tuple, List


class TestBackwardCompatibility:
    """
    GAP-004: Backward compatibility for score_action() and check_action_safety().

    Test Categories:
    1. score_action() return format
    2. score_action() dangerous action scoring
    3. score_action() safe action scoring
    4. check_action_safety() return format
    5. check_action_safety() with file_path context
    6. Integration with GAP-001, GAP-002, GAP-003 fixes
    """

    # =========================================================================
    # SCORE_ACTION() RETURN FORMAT
    # =========================================================================

    def test_score_action_returns_tuple(self):
        """score_action() must return a 3-tuple."""
        from src.safety.unified import score_action

        result = score_action("echo hello")
        assert isinstance(result, tuple), "score_action must return a tuple"
        assert len(result) == 3, "score_action must return 3 elements"

    def test_score_action_tuple_types(self):
        """score_action() tuple must have correct types."""
        from src.safety.unified import score_action

        score, violations, risks = score_action("echo hello")
        assert isinstance(score, float), "First element must be float (score)"
        assert isinstance(violations, list), "Second element must be list (violations)"
        assert isinstance(risks, list), "Third element must be list (risks)"

    def test_score_action_score_range(self):
        """score_action() score must be between 0.0 and 1.0."""
        from src.safety.unified import score_action

        # Test with various inputs
        test_inputs = [
            "echo hello",
            "rm -rf /",
            "git status",
            "sudo rm -rf /",
        ]
        for input_str in test_inputs:
            score, _, _ = score_action(input_str)
            assert 0.0 <= score <= 1.0, f"Score {score} out of range for '{input_str}'"

    # =========================================================================
    # SCORE_ACTION() DANGEROUS ACTION SCORING
    # =========================================================================

    def test_score_action_rm_rf_root(self):
        """score_action('rm -rf /') must return score < 0.5."""
        from src.safety.unified import score_action

        score, violations, risks = score_action("rm -rf /")
        assert score < 0.5, f"Expected score < 0.5 for 'rm -rf /', got {score}"
        assert len(violations) > 0, "Expected violations for 'rm -rf /'"

    def test_score_action_sudo_rm_rf(self):
        """score_action('sudo rm -rf /') must return score < 0.3."""
        from src.safety.unified import score_action

        score, violations, risks = score_action("sudo rm -rf /")
        assert score < 0.3, f"Expected score < 0.3 for 'sudo rm -rf /', got {score}"

    def test_score_action_dd_disk_wipe(self):
        """score_action() must detect dd disk wipe."""
        from src.safety.unified import score_action

        score, violations, risks = score_action("dd if=/dev/zero of=/dev/sda")
        assert score < 0.3, f"Expected score < 0.3 for dd disk wipe, got {score}"

    def test_score_action_drop_database(self):
        """score_action('DROP DATABASE') must return low score."""
        from src.safety.unified import score_action

        score, violations, risks = score_action("DROP DATABASE production")
        assert score < 0.5, f"Expected score < 0.5 for DROP DATABASE, got {score}"

    def test_score_action_fork_bomb(self):
        """score_action() must detect fork bomb."""
        from src.safety.unified import score_action

        score, violations, risks = score_action(":(){ :|:& };:")
        assert score < 0.3, f"Expected score < 0.3 for fork bomb, got {score}"

    # =========================================================================
    # SCORE_ACTION() SAFE ACTION SCORING
    # =========================================================================

    def test_score_action_safe_commands(self):
        """score_action() must allow safe commands."""
        from src.safety.unified import score_action

        safe_commands = [
            "echo hello",
            "ls -la",
            "git status",
            "npm install",
            "python --version",
        ]
        for cmd in safe_commands:
            score, violations, risks = score_action(cmd)
            assert score >= 0.5, f"Expected score >= 0.5 for safe command '{cmd}', got {score}"

    def test_score_action_rm_rf_node_modules(self):
        """score_action('rm -rf node_modules') should be allowed."""
        from src.safety.unified import score_action

        score, violations, risks = score_action("rm -rf node_modules")
        assert score >= 0.5, f"Expected score >= 0.5 for 'rm -rf node_modules', got {score}"

    def test_score_action_rm_rf_tmp(self):
        """score_action('rm -rf /tmp/test') should be allowed."""
        from src.safety.unified import score_action

        score, violations, risks = score_action("rm -rf /tmp/test-abc123")
        assert score >= 0.5, f"Expected score >= 0.5 for /tmp cleanup, got {score}"

    # =========================================================================
    # SCORE_ACTION() VIOLATIONS AND RISKS
    # =========================================================================

    def test_score_action_violations_contain_principle(self):
        """Violations should contain principle codes (P001, P002, etc.)."""
        from src.safety.unified import score_action

        score, violations, risks = score_action("rm -rf /")
        violation_text = " ".join(violations)
        assert "P001" in violation_text or "P002" in violation_text or "destructive" in violation_text.lower()

    def test_score_action_no_violations_for_safe(self):
        """Safe commands should have no critical violations."""
        from src.safety.unified import score_action

        score, violations, risks = score_action("echo hello")
        # Safe commands shouldn't have critical violations (may have risks/warnings)
        critical_violations = [v for v in violations if "P001" in v or "P002" in v or "P003" in v]
        assert len(critical_violations) == 0, f"Unexpected violations for safe command: {violations}"

    # =========================================================================
    # CHECK_ACTION_SAFETY() RETURN FORMAT
    # =========================================================================

    def test_check_action_safety_returns_result(self):
        """check_action_safety() must return SafetyResult."""
        from src.safety.unified import check_action_safety, SafetyResult

        result = check_action_safety("echo hello")
        assert isinstance(result, SafetyResult), "check_action_safety must return SafetyResult"

    def test_check_action_safety_has_required_fields(self):
        """SafetyResult must have required fields."""
        from src.safety.unified import check_action_safety

        result = check_action_safety("echo hello")
        assert hasattr(result, 'safe'), "SafetyResult must have 'safe' field"
        assert hasattr(result, 'score'), "SafetyResult must have 'score' field"
        assert hasattr(result, 'violations'), "SafetyResult must have 'violations' field"
        assert hasattr(result, 'recommendation'), "SafetyResult must have 'recommendation' field"

    def test_check_action_safety_field_types(self):
        """SafetyResult fields must have correct types."""
        from src.safety.unified import check_action_safety

        result = check_action_safety("echo hello")
        assert isinstance(result.safe, bool), "'safe' must be bool"
        assert isinstance(result.score, float), "'score' must be float"
        assert isinstance(result.violations, list), "'violations' must be list"
        assert isinstance(result.recommendation, str), "'recommendation' must be str"

    # =========================================================================
    # CHECK_ACTION_SAFETY() WITH FILE_PATH CONTEXT
    # =========================================================================

    def test_check_action_safety_with_file_path(self):
        """check_action_safety() should accept file_path parameter."""
        from src.safety.unified import check_action_safety

        # Server-side file should allow env vars
        code = "const dbUrl = process.env.DATABASE_URL;"
        result = check_action_safety(code, file_path="app/api/users/route.ts")
        assert result.score >= 0.8, f"Server-side env var should be allowed, got {result.score}"

    def test_check_action_safety_client_code(self):
        """check_action_safety() should detect client-side issues."""
        from src.safety.unified import check_action_safety

        code = '''"use client"
const secret = process.env.SECRET_KEY;'''
        result = check_action_safety(code, file_path="components/Test.tsx")
        assert result.score < 1.0, "Client-side env var should be flagged"

    def test_check_action_safety_with_context(self):
        """check_action_safety() should accept context parameter."""
        from src.safety.unified import check_action_safety

        # Just verify it doesn't crash with context
        result = check_action_safety("rm -rf /", context="User requested cleanup")
        assert result.safe is False

    # =========================================================================
    # INTEGRATION WITH GAP-001, GAP-002, GAP-003
    # =========================================================================

    def test_backward_compat_gap001_destructive(self):
        """Backward compatible functions must integrate GAP-001 fixes."""
        from src.safety.unified import score_action, check_action_safety

        # Test destructive command detection
        score, violations, _ = score_action("rm -rf /var")
        assert score < 0.5, "GAP-001: Destructive commands must score < 0.5"

        result = check_action_safety("rm -rf /etc")
        assert result.score < 0.5, "GAP-001: check_action_safety must also detect"

    def test_backward_compat_gap002_env_vars(self):
        """Backward compatible functions must integrate GAP-002 fixes."""
        from src.safety.unified import score_action, check_action_safety

        code = '''"use client"
const key = process.env.API_KEY;'''

        score, violations, _ = score_action(code)
        assert score < 1.0 or len(violations) > 0, "GAP-002: Client env vars must be flagged"

    def test_backward_compat_gap003_api_keys(self):
        """Backward compatible functions must integrate GAP-003 fixes."""
        from src.safety.unified import score_action, check_action_safety

        code = '''"use client"
const stripe = new Stripe("sk_live_51ABC123XYZ789DEF456GHI");'''

        score, violations, _ = score_action(code)
        assert score < 0.5, f"GAP-003: API keys must be detected, got {score}"

    # =========================================================================
    # RECOMMENDATION VALUES
    # =========================================================================

    def test_recommendation_values_valid(self):
        """Recommendation must be ALLOW, WARN, or BLOCK."""
        from src.safety.unified import check_action_safety

        test_cases = [
            ("echo hello", ["ALLOW", "WARN"]),  # Safe command
            ("rm -rf /", ["BLOCK"]),  # Dangerous command
        ]
        for action, expected_recs in test_cases:
            result = check_action_safety(action)
            assert result.recommendation in ["ALLOW", "WARN", "BLOCK"], \
                f"Invalid recommendation '{result.recommendation}' for '{action}'"

    def test_block_recommendation_for_dangerous(self):
        """Dangerous actions must have BLOCK recommendation."""
        from src.safety.unified import check_action_safety

        result = check_action_safety("rm -rf /")
        assert result.recommendation == "BLOCK", \
            f"Expected BLOCK for 'rm -rf /', got {result.recommendation}"

    def test_safe_flag_consistency(self):
        """safe flag must be consistent with score and threshold."""
        from src.safety.unified import check_action_safety

        # Dangerous command - safe should be False
        result = check_action_safety("rm -rf /")
        assert result.safe is False, "Dangerous command should have safe=False"

        # Safe command - safe should be True (score >= threshold)
        result = check_action_safety("echo hello")
        assert result.safe is True, "Safe command should have safe=True"

    # =========================================================================
    # EDGE CASES
    # =========================================================================

    def test_empty_string(self):
        """Empty string should return safe result."""
        from src.safety.unified import score_action, check_action_safety

        score, violations, risks = score_action("")
        assert score == 1.0, "Empty string should score 1.0"

        result = check_action_safety("")
        assert result.safe is True
        assert result.score == 1.0

    def test_whitespace_only(self):
        """Whitespace-only string should return safe result."""
        from src.safety.unified import score_action, check_action_safety

        score, violations, risks = score_action("   \n\t  ")
        assert score >= 0.8, "Whitespace should be mostly safe"

    def test_very_long_input(self):
        """Very long input should not crash."""
        from src.safety.unified import score_action, check_action_safety

        long_input = "echo hello; " * 1000
        score, violations, risks = score_action(long_input)
        assert 0.0 <= score <= 1.0, "Score should be valid for long input"

        result = check_action_safety(long_input)
        assert result is not None

    def test_special_characters(self):
        """Special characters should be handled."""
        from src.safety.unified import score_action

        special_inputs = [
            "echo 'hello world'",
            'echo "test"',
            "echo $HOME",
            "echo `date`",
            "echo $(whoami)",
        ]
        for input_str in special_inputs:
            score, _, _ = score_action(input_str)
            assert 0.0 <= score <= 1.0, f"Failed for input: {input_str}"

    # =========================================================================
    # TO_DICT SERIALIZATION
    # =========================================================================

    def test_safety_result_to_dict(self):
        """SafetyResult.to_dict() should return serializable dict."""
        from src.safety.unified import check_action_safety

        result = check_action_safety("rm -rf /")
        result_dict = result.to_dict()

        assert isinstance(result_dict, dict), "to_dict() must return dict"
        assert "safe" in result_dict
        assert "score" in result_dict
        assert "violations" in result_dict
        assert "recommendation" in result_dict

    def test_safety_result_to_dict_serializable(self):
        """SafetyResult.to_dict() must be JSON serializable."""
        import json
        from src.safety.unified import check_action_safety

        result = check_action_safety("rm -rf /")
        result_dict = result.to_dict()

        # Should not raise
        json_str = json.dumps(result_dict)
        assert isinstance(json_str, str)

