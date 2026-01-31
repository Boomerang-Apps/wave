"""
TDD Tests for GAP-001: Destructive Commands Must Score < 0.5

This test file was created BEFORE the implementation fix per TDD methodology.
These tests define the expected behavior for destructive command blocking.

GAP-001: Destructive commands like `rm -rf /` currently score 0.7 but must score < 0.5
"""

import pytest
from typing import Tuple, List


class TestDestructiveCommandBlocking:
    """
    GAP-001: Destructive commands must score < 0.5 to be properly blocked.

    Test Categories:
    1. Core rm -rf variants (MUST block)
    2. Other destructive commands (MUST block)
    3. Safe rm patterns (MUST allow)
    4. Edge cases and variants
    5. Backward compatibility
    """

    @pytest.fixture
    def checker(self):
        """Create a UnifiedSafetyChecker instance."""
        from src.safety.unified import UnifiedSafetyChecker
        return UnifiedSafetyChecker()

    # =========================================================================
    # CORE RM -RF TESTS (MUST BLOCK - score < 0.5)
    # =========================================================================

    def test_rm_rf_root_blocked(self, checker):
        """rm -rf / must be blocked (score < 0.5)."""
        result = checker.check("rm -rf /")
        assert result.score < 0.5, f"Expected score < 0.5, got {result.score}"
        assert result.safe is False
        assert len(result.violations) > 0
        assert result.recommendation == "BLOCK"

    def test_rm_rf_wildcard_blocked(self, checker):
        """rm -rf * must be blocked."""
        result = checker.check("rm -rf *")
        assert result.score < 0.5, f"Expected score < 0.5, got {result.score}"
        assert result.safe is False

    def test_rm_rf_home_blocked(self, checker):
        """rm -rf ~ must be blocked."""
        result = checker.check("rm -rf ~")
        assert result.score < 0.5, f"Expected score < 0.5, got {result.score}"
        assert result.safe is False

    def test_rm_rf_var_blocked(self, checker):
        """rm -rf /var must be blocked."""
        result = checker.check("rm -rf /var")
        assert result.score < 0.5, f"Expected score < 0.5, got {result.score}"

    def test_rm_rf_etc_blocked(self, checker):
        """rm -rf /etc must be blocked."""
        result = checker.check("rm -rf /etc")
        assert result.score < 0.5, f"Expected score < 0.5, got {result.score}"

    def test_rm_rf_usr_blocked(self, checker):
        """rm -rf /usr must be blocked."""
        result = checker.check("rm -rf /usr")
        assert result.score < 0.5, f"Expected score < 0.5, got {result.score}"

    def test_rm_rf_home_dir_blocked(self, checker):
        """rm -rf /home must be blocked."""
        result = checker.check("rm -rf /home")
        assert result.score < 0.5, f"Expected score < 0.5, got {result.score}"

    # =========================================================================
    # RM FLAG VARIANTS (MUST BLOCK)
    # =========================================================================

    def test_rm_force_recursive_blocked(self, checker):
        """rm --force --recursive / must be blocked."""
        result = checker.check("rm --force --recursive /")
        assert result.score < 0.5, f"Expected score < 0.5, got {result.score}"

    def test_rm_r_f_blocked(self, checker):
        """rm -r -f / must be blocked."""
        result = checker.check("rm -r -f /")
        assert result.score < 0.5, f"Expected score < 0.5, got {result.score}"

    def test_rm_fr_blocked(self, checker):
        """rm -fr / must be blocked."""
        result = checker.check("rm -fr /")
        assert result.score < 0.5, f"Expected score < 0.5, got {result.score}"

    def test_rm_rf_no_preserve_root_blocked(self, checker):
        """rm -rf --no-preserve-root / must be blocked."""
        result = checker.check("rm -rf --no-preserve-root /")
        assert result.score < 0.3, f"Expected score < 0.3, got {result.score}"

    # =========================================================================
    # SUDO VARIANTS (MUST BLOCK with lower score)
    # =========================================================================

    def test_sudo_rm_rf_blocked(self, checker):
        """sudo rm -rf / must be blocked with very low score."""
        result = checker.check("sudo rm -rf /")
        assert result.score < 0.3, f"Expected score < 0.3 for sudo, got {result.score}"
        assert result.safe is False

    def test_sudo_rm_rf_wildcard_blocked(self, checker):
        """sudo rm -rf * must be blocked."""
        result = checker.check("sudo rm -rf *")
        assert result.score < 0.3, f"Expected score < 0.3, got {result.score}"

    # =========================================================================
    # OTHER DESTRUCTIVE COMMANDS (MUST BLOCK)
    # =========================================================================

    def test_dd_dev_zero_blocked(self, checker):
        """dd if=/dev/zero of=/dev/sda must be blocked."""
        result = checker.check("dd if=/dev/zero of=/dev/sda")
        assert result.score < 0.3, f"Expected score < 0.3, got {result.score}"

    def test_dd_dev_random_blocked(self, checker):
        """dd if=/dev/random of=/dev/sda must be blocked."""
        result = checker.check("dd if=/dev/random of=/dev/sda")
        assert result.score < 0.3, f"Expected score < 0.3, got {result.score}"

    def test_mkfs_blocked(self, checker):
        """mkfs.ext4 /dev/sda must be blocked."""
        result = checker.check("mkfs.ext4 /dev/sda")
        assert result.score < 0.3, f"Expected score < 0.3, got {result.score}"

    def test_mkfs_xfs_blocked(self, checker):
        """mkfs.xfs /dev/sdb must be blocked."""
        result = checker.check("mkfs.xfs /dev/sdb")
        assert result.score < 0.3, f"Expected score < 0.3, got {result.score}"

    def test_format_c_blocked(self, checker):
        """format c: must be blocked (Windows)."""
        result = checker.check("format c:")
        assert result.score < 0.5, f"Expected score < 0.5, got {result.score}"

    def test_fork_bomb_blocked(self, checker):
        """Fork bomb :(){ :|:& };: must be blocked."""
        result = checker.check(":(){ :|:& };:")
        assert result.score < 0.3, f"Expected score < 0.3, got {result.score}"

    def test_chmod_777_root_blocked(self, checker):
        """chmod -R 777 / must be blocked."""
        result = checker.check("chmod -R 777 /")
        assert result.score < 0.5, f"Expected score < 0.5, got {result.score}"

    def test_chown_root_blocked(self, checker):
        """chown -R root:root / must be blocked."""
        result = checker.check("chown -R root:root /")
        assert result.score < 0.5, f"Expected score < 0.5, got {result.score}"

    # =========================================================================
    # SAFE RM PATTERNS (MUST ALLOW - score >= 0.5)
    # =========================================================================

    def test_rm_rf_node_modules_allowed(self, checker):
        """rm -rf node_modules should be allowed."""
        result = checker.check("rm -rf node_modules")
        assert result.score >= 0.5, f"Expected score >= 0.5, got {result.score}"

    def test_rm_rf_relative_dir_allowed(self, checker):
        """rm -rf ./build should be allowed."""
        result = checker.check("rm -rf ./build")
        assert result.score >= 0.5, f"Expected score >= 0.5, got {result.score}"

    def test_rm_rf_tmp_allowed(self, checker):
        """rm -rf /tmp/test-abc123 should be allowed."""
        result = checker.check("rm -rf /tmp/test-abc123")
        assert result.score >= 0.5, f"Expected score >= 0.5, got {result.score}"

    def test_rm_rf_dist_allowed(self, checker):
        """rm -rf dist/ should be allowed."""
        result = checker.check("rm -rf dist/")
        assert result.score >= 0.5, f"Expected score >= 0.5, got {result.score}"

    def test_rm_rf_coverage_allowed(self, checker):
        """rm -rf coverage/ should be allowed."""
        result = checker.check("rm -rf coverage/")
        assert result.score >= 0.5, f"Expected score >= 0.5, got {result.score}"

    def test_rm_rf_next_allowed(self, checker):
        """rm -rf .next should be allowed."""
        result = checker.check("rm -rf .next")
        assert result.score >= 0.5, f"Expected score >= 0.5, got {result.score}"

    def test_rm_rf_cache_allowed(self, checker):
        """rm -rf .cache should be allowed."""
        result = checker.check("rm -rf .cache")
        assert result.score >= 0.5, f"Expected score >= 0.5, got {result.score}"

    # =========================================================================
    # EDGE CASES
    # =========================================================================

    def test_rm_rf_with_extra_spaces(self, checker):
        """rm  -rf   / with extra spaces must be blocked."""
        result = checker.check("rm  -rf   /")
        assert result.score < 0.5, f"Expected score < 0.5, got {result.score}"

    def test_rm_rf_in_script(self, checker):
        """rm -rf / embedded in script must be blocked."""
        script = """
        #!/bin/bash
        echo "Cleaning up..."
        rm -rf /
        echo "Done"
        """
        result = checker.check(script)
        assert result.score < 0.5, f"Expected score < 0.5, got {result.score}"

    def test_rm_rf_with_variable_safe(self, checker):
        """rm -rf $DIR should be allowed (variable, not system path)."""
        result = checker.check("rm -rf $BUILD_DIR")
        assert result.score >= 0.5, f"Expected score >= 0.5, got {result.score}"

    def test_multiple_destructive_commands(self, checker):
        """Multiple destructive commands should have very low score."""
        result = checker.check("rm -rf / && dd if=/dev/zero of=/dev/sda")
        assert result.score < 0.2, f"Expected score < 0.2, got {result.score}"
        assert len(result.violations) >= 2

    # =========================================================================
    # BACKWARD COMPATIBILITY
    # =========================================================================

    def test_score_action_destructive(self):
        """Backward compatible score_action function must score < 0.5."""
        from src.safety.unified import score_action

        score, violations, risks = score_action("rm -rf /")
        assert score < 0.5, f"Expected score < 0.5, got {score}"
        assert len(violations) > 0

    def test_check_action_safety_destructive(self):
        """Backward compatible check_action_safety must block."""
        from src.safety.unified import check_action_safety

        result = check_action_safety("rm -rf /")
        assert result.safe is False
        assert result.score < 0.5

    # =========================================================================
    # VIOLATION MESSAGE QUALITY
    # =========================================================================

    def test_violation_message_contains_description(self, checker):
        """Violation message should describe the issue."""
        result = checker.check("rm -rf /")

        # At least one violation should mention destructive/rm/dangerous
        violation_text = " ".join(str(v) for v in result.violations).lower()
        assert any(word in violation_text for word in ["destructive", "rm", "dangerous", "blocked"])

    def test_violation_contains_principle(self, checker):
        """Violation should reference WAVE principle (P001)."""
        result = checker.check("rm -rf /")

        # Should reference P001 (No destructive commands)
        violation_text = " ".join(str(v) for v in result.violations)
        assert "P001" in violation_text or "destructive" in violation_text.lower()
