"""
TDD Tests for Enhanced Safety Violations
Gate 0 Research Item #5: Enhanced Error Attribution

These tests are written BEFORE implementation per TDD methodology.
Run with: pytest tests/test_safety_violations.py -v
"""

import pytest
from typing import Optional


class TestSafetyViolation:
    """Tests for SafetyViolation dataclass."""

    def test_violation_has_required_fields(self):
        """SafetyViolation should have all required fields."""
        from src.safety.violations import SafetyViolation

        v = SafetyViolation(
            principle_id="P001",
            severity="critical",
            message="Found destructive command",
            pattern=r"rm\s+-rf",
            matched_text="rm -rf /"
        )

        assert v.principle_id == "P001"
        assert v.severity == "critical"
        assert v.message == "Found destructive command"
        assert v.pattern == r"rm\s+-rf"
        assert v.matched_text == "rm -rf /"

    def test_violation_has_file_path(self):
        """SafetyViolation should include file path."""
        from src.safety.violations import SafetyViolation

        v = SafetyViolation(
            principle_id="P001",
            severity="critical",
            message="Found rm -rf",
            pattern=r"rm\s+-rf",
            file_path="scripts/deploy.sh",
            matched_text="rm -rf /tmp"
        )

        assert v.file_path == "scripts/deploy.sh"

    def test_violation_has_line_number(self):
        """SafetyViolation should include line number."""
        from src.safety.violations import SafetyViolation

        v = SafetyViolation(
            principle_id="P002",
            severity="warning",
            message="Found API key",
            pattern=r"api_key\s*=",
            file_path="config.py",
            line_number=42,
            matched_text="api_key = 'secret'"
        )

        assert v.line_number == 42

    def test_violation_has_context(self):
        """SafetyViolation should include context snippet."""
        from src.safety.violations import SafetyViolation

        v = SafetyViolation(
            principle_id="P003",
            severity="critical",
            message="Path traversal detected",
            pattern=r"\.\./\.\./",
            file_path="loader.py",
            line_number=15,
            context="file_path = '../../etc/passwd'",
            matched_text="../../"
        )

        assert v.context == "file_path = '../../etc/passwd'"

    def test_violation_to_dict(self):
        """SafetyViolation should serialize to dict."""
        from src.safety.violations import SafetyViolation

        v = SafetyViolation(
            principle_id="P001",
            severity="critical",
            message="Test",
            pattern="test",
            file_path="test.py",
            line_number=10,
            matched_text="test"
        )

        d = v.to_dict()

        assert d["principle_id"] == "P001"
        assert d["file_path"] == "test.py"
        assert d["line_number"] == 10

    def test_violation_str_backward_compatible(self):
        """str(violation) should return backward compatible format."""
        from src.safety.violations import SafetyViolation

        v = SafetyViolation(
            principle_id="P001",
            severity="critical",
            message="Found dangerous pattern 'rm -rf'",
            pattern=r"rm\s+-rf",
            matched_text="rm -rf"
        )

        s = str(v)

        # Should be compatible with old format
        assert "CRITICAL" in s.upper()
        assert "rm -rf" in s

    def test_violation_to_log_string(self):
        """to_log_string should include full attribution."""
        from src.safety.violations import SafetyViolation

        v = SafetyViolation(
            principle_id="P002",
            severity="critical",
            message="API key exposure",
            pattern=r"api_key",
            file_path="config.py",
            line_number=25,
            context="api_key = os.environ['KEY']",
            matched_text="api_key"
        )

        log = v.to_log_string()

        assert "P002" in log
        assert "config.py" in log
        assert "25" in log
        assert "api_key" in log


class TestFindLineNumber:
    """Tests for line number detection."""

    def test_find_line_number_first_line(self):
        """Should find match on first line."""
        from src.safety.violations import find_line_number

        content = "rm -rf /\necho done"
        line = find_line_number(content, 0)
        assert line == 1

    def test_find_line_number_middle(self):
        """Should find match in middle of content."""
        from src.safety.violations import find_line_number

        content = "line 1\nline 2\nrm -rf /\nline 4"
        # "rm -rf" starts at position 14
        match_pos = content.find("rm -rf")
        line = find_line_number(content, match_pos)
        assert line == 3

    def test_find_line_number_last_line(self):
        """Should find match on last line."""
        from src.safety.violations import find_line_number

        content = "line 1\nline 2\nrm -rf /"
        match_pos = content.find("rm -rf")
        line = find_line_number(content, match_pos)
        assert line == 3


class TestExtractContext:
    """Tests for context extraction."""

    def test_extract_context_single_line(self):
        """Should extract context around line."""
        from src.safety.violations import extract_context

        content = "line 1\nline 2\ntarget line\nline 4\nline 5"
        context = extract_context(content, line_number=3, context_lines=1)

        assert "line 2" in context
        assert "target line" in context
        assert "line 4" in context

    def test_extract_context_at_start(self):
        """Should handle context at file start."""
        from src.safety.violations import extract_context

        content = "first line\nsecond line\nthird line"
        context = extract_context(content, line_number=1, context_lines=2)

        assert "first line" in context
        # Should not crash on start boundary

    def test_extract_context_at_end(self):
        """Should handle context at file end."""
        from src.safety.violations import extract_context

        content = "first line\nsecond line\nlast line"
        context = extract_context(content, line_number=3, context_lines=2)

        assert "last line" in context
        # Should not crash on end boundary


class TestEnhancedScoring:
    """Tests for enhanced scoring with attribution."""

    def test_score_returns_attributed_violations(self):
        """Score method should return SafetyViolation objects."""
        from src.safety.violations import SafetyViolation, score_with_attribution

        content = """
        line 1
        line 2
        rm -rf /
        line 4
        """

        score, violations = score_with_attribution(
            content,
            file_path="test.sh"
        )

        assert len(violations) > 0
        assert isinstance(violations[0], SafetyViolation)
        assert violations[0].file_path == "test.sh"

    def test_score_includes_line_numbers(self):
        """Violations should include accurate line numbers."""
        from src.safety.violations import score_with_attribution

        content = """line 1
line 2
rm -rf /
line 4"""

        score, violations = score_with_attribution(content)

        assert len(violations) > 0
        assert violations[0].line_number == 3

    def test_score_includes_context(self):
        """Violations should include context snippet."""
        from src.safety.violations import score_with_attribution

        content = """# Deploy script
echo "Starting..."
rm -rf /tmp/build
echo "Done" """

        score, violations = score_with_attribution(content)

        assert len(violations) > 0
        # Context should include the matched line
        assert "rm -rf" in violations[0].matched_text


class TestViolationSeverity:
    """Tests for severity classification."""

    def test_severity_critical(self):
        """Destructive commands should be critical."""
        from src.safety.violations import SafetyViolation

        v = SafetyViolation(
            principle_id="P001",
            severity="critical",
            message="Destructive command",
            pattern=r"rm\s+-rf",
            matched_text="rm -rf"
        )

        assert v.severity == "critical"
        assert v.is_critical()

    def test_severity_warning(self):
        """Debug statements should be warning."""
        from src.safety.violations import SafetyViolation

        v = SafetyViolation(
            principle_id="P007",
            severity="warning",
            message="Debug statement",
            pattern=r"console\.log",
            matched_text="console.log"
        )

        assert v.severity == "warning"
        assert not v.is_critical()
