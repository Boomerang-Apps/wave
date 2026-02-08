"""
Tests for Domain Boundary Enforcer
Story: WAVE-P3-002

Tests the BoundaryEnforcer that validates agent file access
against domain ownership rules from wave-config.json.

Test Categories:
1. Rule Loading (AC-01) — 4 tests
2. Access Validation (AC-02, AC-03, AC-04) — 8 tests
3. Shared Domain (AC-05) — 3 tests
4. Audit Logging (AC-06) — 3 tests
5. Override Handling (AC-07) — 4 tests

Total: 22 tests
"""

import json
import time
import pytest
from pathlib import Path

from src.domains.boundary_enforcer import (
    BoundaryEnforcer,
    AccessResult,
    DomainRule,
    AccessViolation,
)


# ═══════════════════════════════════════════════════════════════════════════════
# FIXTURES
# ═══════════════════════════════════════════════════════════════════════════════

SAMPLE_CONFIG = {
    "domains": [
        {
            "id": "auth",
            "name": "Authentication",
            "file_patterns": [
                "src/auth/**/*",
                "apps/*/auth/**/*",
                "libs/auth/**/*",
            ],
        },
        {
            "id": "booking",
            "name": "Booking System",
            "file_patterns": [
                "src/booking/**/*",
                "apps/*/booking/**/*",
            ],
        },
        {
            "id": "payment",
            "name": "Payment Processing",
            "file_patterns": [
                "src/payment/**/*",
            ],
        },
        {
            "id": "shared",
            "name": "Shared",
            "file_patterns": [
                "src/shared/**/*",
                "src/common/**/*",
                "src/utils/**/*",
                "libs/shared/**/*",
            ],
        },
        {
            "id": "frontend",
            "name": "Frontend",
            "file_patterns": [
                "portal/**/*",
                "web/**/*",
            ],
        },
        {
            "id": "backend",
            "name": "Backend Core",
            "file_patterns": [
                "orchestrator/**/*",
                "server/**/*",
            ],
        },
    ],
}


@pytest.fixture
def enforcer():
    """BoundaryEnforcer loaded from sample config dict."""
    return BoundaryEnforcer.from_dict(SAMPLE_CONFIG)


@pytest.fixture
def config_file(tmp_path):
    """Write sample config to a temp file."""
    path = tmp_path / "wave-config.json"
    path.write_text(json.dumps(SAMPLE_CONFIG))
    return path


# ═══════════════════════════════════════════════════════════════════════════════
# 1. Rule Loading (AC-01)
# ═══════════════════════════════════════════════════════════════════════════════

class TestRuleLoading:
    """Tests for AC-01: Domain rules loaded from configuration."""

    def test_load_from_dict(self):
        """AC-01: Enforcer initializes from dict config."""
        enforcer = BoundaryEnforcer.from_dict(SAMPLE_CONFIG)
        assert len(enforcer.rules) == 6

    def test_load_from_file(self, config_file):
        """AC-01: Enforcer loads rules from wave-config.json."""
        enforcer = BoundaryEnforcer.from_file(str(config_file))
        assert len(enforcer.rules) == 6
        assert "auth" in enforcer.rules

    def test_rules_have_patterns(self, enforcer):
        """AC-01: Each rule has file patterns from config."""
        auth_rule = enforcer.rules["auth"]
        assert isinstance(auth_rule, DomainRule)
        assert len(auth_rule.file_patterns) == 3
        assert "src/auth/**/*" in auth_rule.file_patterns

    def test_missing_config_raises(self):
        """AC-01: Missing config file raises FileNotFoundError."""
        with pytest.raises(FileNotFoundError):
            BoundaryEnforcer.from_file("/nonexistent/wave-config.json")


# ═══════════════════════════════════════════════════════════════════════════════
# 2. Access Validation (AC-02, AC-03, AC-04)
# ═══════════════════════════════════════════════════════════════════════════════

class TestAccessValidation:
    """Tests for AC-02/03/04: File access validated against rules."""

    def test_check_access_returns_result(self, enforcer):
        """AC-02: check_access returns AccessResult."""
        result = enforcer.check_access("auth", "src/auth/login.ts")
        assert isinstance(result, AccessResult)

    def test_allowed_access_in_own_domain(self, enforcer):
        """AC-03: Agent can modify files in their domain."""
        result = enforcer.check_access("auth", "src/auth/login.ts")
        assert result.allowed is True
        assert result.domain == "auth"

    def test_allowed_nested_path(self, enforcer):
        """AC-03: Nested paths within domain are allowed."""
        result = enforcer.check_access("auth", "src/auth/middleware/jwt.ts")
        assert result.allowed is True

    def test_allowed_with_app_prefix(self, enforcer):
        """AC-03: Patterns with wildcards match correctly."""
        result = enforcer.check_access("auth", "apps/web/auth/callback.ts")
        assert result.allowed is True

    def test_denied_outside_domain(self, enforcer):
        """AC-04: Agent cannot modify files outside their domain."""
        result = enforcer.check_access("auth", "src/booking/flights.ts")
        assert result.allowed is False
        assert "booking" in result.owner_domain

    def test_denied_includes_explanation(self, enforcer):
        """AC-04: Denial includes explanation with domain info."""
        result = enforcer.check_access("auth", "src/payment/stripe.ts")
        assert result.allowed is False
        assert result.reason is not None
        assert len(result.reason) > 0

    def test_unowned_file_denied(self, enforcer):
        """AC-04: Files not in any domain are denied."""
        result = enforcer.check_access("auth", "random/unknown/file.ts")
        assert result.allowed is False

    def test_unknown_agent_domain_denied(self, enforcer):
        """AC-04: Unknown agent domain is always denied."""
        result = enforcer.check_access("nonexistent", "src/auth/login.ts")
        assert result.allowed is False


# ═══════════════════════════════════════════════════════════════════════════════
# 3. Shared Domain (AC-05)
# ═══════════════════════════════════════════════════════════════════════════════

class TestSharedDomain:
    """Tests for AC-05: SHARED domain accessible to all agents."""

    def test_auth_can_access_shared(self, enforcer):
        """AC-05: auth agent can modify shared files."""
        result = enforcer.check_access("auth", "src/shared/types.ts")
        assert result.allowed is True

    def test_booking_can_access_shared(self, enforcer):
        """AC-05: booking agent can modify shared files."""
        result = enforcer.check_access("booking", "src/utils/format.ts")
        assert result.allowed is True

    def test_multiple_agents_shared_access(self, enforcer):
        """AC-05: All agents can access shared domain."""
        domains = ["auth", "booking", "payment", "frontend", "backend"]
        for domain in domains:
            result = enforcer.check_access(domain, "src/common/logger.ts")
            assert result.allowed is True, f"{domain} should access shared"


# ═══════════════════════════════════════════════════════════════════════════════
# 4. Audit Logging (AC-06)
# ═══════════════════════════════════════════════════════════════════════════════

class TestAuditLogging:
    """Tests for AC-06: Violations logged for audit."""

    def test_violation_recorded(self, enforcer):
        """AC-06: Violation attempt is recorded."""
        enforcer.check_access("auth", "src/booking/flights.ts")
        assert len(enforcer.violations) == 1

    def test_violation_has_details(self, enforcer):
        """AC-06: Violation has agent_id, file_path, domain."""
        enforcer.check_access("auth", "src/booking/flights.ts")
        v = enforcer.violations[0]
        assert isinstance(v, AccessViolation)
        assert v.agent_domain == "auth"
        assert v.file_path == "src/booking/flights.ts"
        assert v.owner_domain == "booking"

    def test_allowed_access_not_in_violations(self, enforcer):
        """AC-06: Allowed access does not create a violation entry."""
        enforcer.check_access("auth", "src/auth/login.ts")
        assert len(enforcer.violations) == 0


# ═══════════════════════════════════════════════════════════════════════════════
# 5. Override Handling (AC-07)
# ═══════════════════════════════════════════════════════════════════════════════

class TestOverrideHandling:
    """Tests for AC-07: Override available with human approval."""

    def test_override_allows_cross_domain(self, enforcer):
        """AC-07: With override, agent can access other domains."""
        enforcer.grant_override("auth", "booking", duration_seconds=60)

        result = enforcer.check_access("auth", "src/booking/flights.ts")
        assert result.allowed is True
        assert result.override is True

    def test_override_expires(self, enforcer):
        """AC-07: Override expires after duration."""
        enforcer.grant_override("auth", "booking", duration_seconds=0.1)
        time.sleep(0.2)

        result = enforcer.check_access("auth", "src/booking/flights.ts")
        assert result.allowed is False

    def test_override_logged(self, enforcer):
        """AC-07: Override usage is logged."""
        enforcer.grant_override("auth", "booking", duration_seconds=60)
        enforcer.check_access("auth", "src/booking/flights.ts")

        assert len(enforcer.override_log) == 1
        assert enforcer.override_log[0]["agent_domain"] == "auth"
        assert enforcer.override_log[0]["target_domain"] == "booking"

    def test_revoke_override(self, enforcer):
        """AC-07: Override can be revoked."""
        enforcer.grant_override("auth", "booking", duration_seconds=60)
        enforcer.revoke_override("auth", "booking")

        result = enforcer.check_access("auth", "src/booking/flights.ts")
        assert result.allowed is False
