"""
Test B.1: Constitutional Scorer
TDD - Tests written BEFORE implementation

Acceptance Criteria:
1. PRINCIPLES constant with safety rules
2. score_action function that evaluates actions
3. should_block/should_escalate with configurable thresholds
4. evaluate_tool_call for pre-execution checks
"""

import pytest
import os


class TestConstitutionalImports:
    """Test B.1.1: Verify constitutional scorer is importable"""

    def test_principles_exists(self):
        """PRINCIPLES constant should be importable"""
        from tools.constitutional_scorer import PRINCIPLES
        assert PRINCIPLES is not None
        assert isinstance(PRINCIPLES, (list, tuple))

    def test_score_action_exists(self):
        """score_action function should be importable"""
        from tools.constitutional_scorer import score_action
        assert score_action is not None
        assert callable(score_action)

    def test_should_block_exists(self):
        """should_block function should be importable"""
        from tools.constitutional_scorer import should_block
        assert should_block is not None
        assert callable(should_block)

    def test_should_escalate_exists(self):
        """should_escalate function should be importable"""
        from tools.constitutional_scorer import should_escalate
        assert should_escalate is not None
        assert callable(should_escalate)

    def test_evaluate_tool_call_exists(self):
        """evaluate_tool_call function should be importable"""
        from tools.constitutional_scorer import evaluate_tool_call
        assert evaluate_tool_call is not None
        assert callable(evaluate_tool_call)


class TestPrinciples:
    """Test B.1.2: Verify principles are defined"""

    def test_principles_not_empty(self):
        """Should have at least 5 principles"""
        from tools.constitutional_scorer import PRINCIPLES
        assert len(PRINCIPLES) >= 5

    def test_principles_are_strings(self):
        """All principles should be strings"""
        from tools.constitutional_scorer import PRINCIPLES
        for principle in PRINCIPLES:
            assert isinstance(principle, str)
            assert len(principle) > 10

    def test_security_principles_present(self):
        """Should have security-related principles"""
        from tools.constitutional_scorer import PRINCIPLES
        principles_text = " ".join(PRINCIPLES).lower()
        assert "secret" in principles_text or "credential" in principles_text
        assert "destructive" in principles_text or "delete" in principles_text


class TestScoreAction:
    """Test B.1.3: Verify score_action function"""

    def test_score_action_returns_tuple(self):
        """score_action should return (score, violations, risks)"""
        from tools.constitutional_scorer import score_action
        result = score_action("Create a new file test.py")
        assert isinstance(result, tuple)
        assert len(result) == 3

    def test_score_action_score_in_range(self):
        """Score should be between 0 and 1"""
        from tools.constitutional_scorer import score_action
        score, violations, risks = score_action("print hello world")
        assert 0.0 <= score <= 1.0

    def test_score_action_violations_is_list(self):
        """Violations should be a list"""
        from tools.constitutional_scorer import score_action
        score, violations, risks = score_action("test action")
        assert isinstance(violations, list)

    def test_score_action_risks_is_list(self):
        """Risks should be a list"""
        from tools.constitutional_scorer import score_action
        score, violations, risks = score_action("test action")
        assert isinstance(risks, list)


class TestSafeActions:
    """Test B.1.4: Safe actions should score high"""

    def test_safe_file_creation(self):
        """Creating a file should be safe"""
        from tools.constitutional_scorer import score_action
        score, violations, _ = score_action("Create file: src/utils/helper.py")
        assert score >= 0.7
        assert len(violations) == 0

    def test_safe_code_writing(self):
        """Writing code should be safe"""
        from tools.constitutional_scorer import score_action
        score, violations, _ = score_action(
            "Write function: def add(a, b): return a + b"
        )
        assert score >= 0.7

    def test_safe_test_running(self):
        """Running tests should be safe"""
        from tools.constitutional_scorer import score_action
        score, violations, _ = score_action("Run pytest tests/")
        assert score >= 0.7


class TestDangerousActions:
    """Test B.1.5: Dangerous actions should score low"""

    def test_destructive_command_low_score(self):
        """rm -rf should score very low"""
        from tools.constitutional_scorer import score_action
        score, violations, _ = score_action("rm -rf /")
        assert score < 0.5
        assert len(violations) > 0

    def test_credential_exposure_low_score(self):
        """Exposing credentials should score low"""
        from tools.constitutional_scorer import score_action
        score, violations, _ = score_action(
            "Print API key: sk-ant-api03-xxxxx to console"
        )
        assert score < 0.7

    def test_drop_table_low_score(self):
        """DROP TABLE should score low"""
        from tools.constitutional_scorer import score_action
        score, violations, _ = score_action("DROP TABLE users;")
        assert score < 0.5


class TestThresholds:
    """Test B.1.6: Verify threshold functions"""

    def test_should_block_high_score(self):
        """High scores should not be blocked"""
        from tools.constitutional_scorer import should_block
        assert should_block(1.0) is False
        assert should_block(0.9) is False
        assert should_block(0.8) is False

    def test_should_block_low_score(self):
        """Low scores should be blocked"""
        from tools.constitutional_scorer import should_block
        assert should_block(0.3) is True
        assert should_block(0.5) is True

    def test_should_escalate_high_score(self):
        """High scores should not need escalation"""
        from tools.constitutional_scorer import should_escalate
        assert should_escalate(1.0) is False
        assert should_escalate(0.95) is False

    def test_should_escalate_medium_score(self):
        """Medium scores may need escalation"""
        from tools.constitutional_scorer import should_escalate
        # Score of 0.8 is below typical 0.85 threshold
        assert should_escalate(0.8) is True


class TestEvaluateToolCall:
    """Test B.1.7: Verify evaluate_tool_call function"""

    def test_evaluate_returns_dict(self):
        """evaluate_tool_call should return a dict"""
        from tools.constitutional_scorer import evaluate_tool_call
        result = evaluate_tool_call("bash", {"command": "echo hello"})
        assert isinstance(result, dict)

    def test_evaluate_has_required_keys(self):
        """Result should have all required keys"""
        from tools.constitutional_scorer import evaluate_tool_call
        result = evaluate_tool_call("write_file", {"path": "test.py"})
        assert "allowed" in result
        assert "score" in result
        assert "violations" in result
        assert "risks" in result
        assert "requires_review" in result

    def test_evaluate_safe_tool(self):
        """Safe tool call should be allowed"""
        from tools.constitutional_scorer import evaluate_tool_call
        result = evaluate_tool_call(
            "write_file",
            {"path": "src/test.py", "content": "print('hello')"}
        )
        assert result["allowed"] is True
        assert result["score"] >= 0.7

    def test_evaluate_dangerous_tool(self):
        """Dangerous tool call should be blocked"""
        from tools.constitutional_scorer import evaluate_tool_call
        result = evaluate_tool_call(
            "bash",
            {"command": "rm -rf /"}
        )
        assert result["allowed"] is False
        assert len(result["violations"]) > 0


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
