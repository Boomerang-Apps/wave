"""
TDD Tests for Container Completeness Validator
Gate 0 Research Item #3: Container Completeness Validation

These tests are written BEFORE implementation per TDD methodology.
Run with: pytest tests/test_container_validator.py -v
"""

import pytest
from unittest.mock import patch, MagicMock
from typing import List


class TestContainerValidator:
    """Tests for ContainerValidator class."""

    def test_get_required_containers_returns_list(self):
        """Should return list of required containers."""
        from src.monitoring.container_validator import ContainerValidator

        validator = ContainerValidator()
        required = validator.get_required_containers()

        assert isinstance(required, list)
        assert len(required) >= 3  # At minimum: orchestrator, redis, dozzle

    def test_required_containers_includes_critical(self):
        """Required containers should include all critical services."""
        from src.monitoring.container_validator import ContainerValidator

        validator = ContainerValidator()
        required = validator.get_required_containers()
        container_names = [c.name for c in required]

        # Critical containers must be present
        assert "wave-orchestrator" in container_names
        assert "wave-redis" in container_names
        assert "wave-dozzle" in container_names

    def test_container_status_healthy(self):
        """Healthy container should return healthy status."""
        from src.monitoring.container_validator import ContainerValidator, ContainerStatus

        validator = ContainerValidator()

        # Mock docker check
        with patch.object(validator, '_docker_inspect') as mock_inspect:
            mock_inspect.return_value = {
                "State": {"Status": "running", "Health": {"Status": "healthy"}}
            }

            status = validator.check_container("wave-redis")

            assert status.name == "wave-redis"
            assert status.running is True
            assert status.healthy is True

    def test_container_status_missing(self):
        """Missing container should return not running."""
        from src.monitoring.container_validator import ContainerValidator

        validator = ContainerValidator()

        # Mock docker check returning None (container not found)
        with patch.object(validator, '_docker_inspect') as mock_inspect:
            mock_inspect.return_value = None

            status = validator.check_container("wave-nonexistent")

            assert status.name == "wave-nonexistent"
            assert status.running is False
            assert status.healthy is False

    def test_container_status_unhealthy(self):
        """Unhealthy container should return unhealthy status."""
        from src.monitoring.container_validator import ContainerValidator

        validator = ContainerValidator()

        # Mock unhealthy container
        with patch.object(validator, '_docker_inspect') as mock_inspect:
            mock_inspect.return_value = {
                "State": {"Status": "running", "Health": {"Status": "unhealthy"}}
            }

            status = validator.check_container("wave-test")

            assert status.running is True
            assert status.healthy is False

    def test_validate_all_returns_result(self):
        """validate_all should return comprehensive result."""
        from src.monitoring.container_validator import ContainerValidator

        validator = ContainerValidator()

        # Mock all containers as healthy
        with patch.object(validator, 'check_container') as mock_check:
            from src.monitoring.container_validator import ContainerStatus
            mock_check.return_value = ContainerStatus(
                name="mock", running=True, healthy=True, level="required"
            )

            result = validator.validate_all()

            assert hasattr(result, 'all_healthy')
            assert hasattr(result, 'missing')
            assert hasattr(result, 'unhealthy')
            assert hasattr(result, 'go_status')

    def test_missing_critical_container_blocks(self):
        """Missing critical container should result in NO-GO."""
        from src.monitoring.container_validator import ContainerValidator, ContainerStatus

        validator = ContainerValidator()

        # Mock orchestrator as missing
        def mock_check(name):
            if name == "wave-orchestrator":
                return ContainerStatus(name=name, running=False, healthy=False, level="critical")
            return ContainerStatus(name=name, running=True, healthy=True, level="required")

        with patch.object(validator, 'check_container', side_effect=mock_check):
            result = validator.validate_all()

            assert result.go_status == "NO-GO"
            assert "wave-orchestrator" in result.missing

    def test_missing_required_container_warns(self):
        """Missing required (non-critical) container should warn but GO."""
        from src.monitoring.container_validator import ContainerValidator, ContainerStatus

        validator = ContainerValidator()

        # Mock qa-agent as missing (required but not critical)
        def mock_check(name):
            if name == "wave-qa-agent":
                return ContainerStatus(name=name, running=False, healthy=False, level="required")
            return ContainerStatus(name=name, running=True, healthy=True, level="critical")

        with patch.object(validator, 'check_container', side_effect=mock_check):
            result = validator.validate_all()

            # Should still be GO but with warnings
            assert result.go_status in ["GO", "CONDITIONAL-GO"]
            assert len(result.warnings) > 0

    def test_all_healthy_returns_go(self):
        """All healthy containers should return GO."""
        from src.monitoring.container_validator import ContainerValidator, ContainerStatus

        validator = ContainerValidator()

        # Mock all containers healthy
        with patch.object(validator, 'check_container') as mock_check:
            mock_check.return_value = ContainerStatus(
                name="mock", running=True, healthy=True, level="critical"
            )

            result = validator.validate_all()

            assert result.go_status == "GO"
            assert len(result.missing) == 0


class TestContainerStatus:
    """Tests for ContainerStatus dataclass."""

    def test_container_status_has_required_fields(self):
        """ContainerStatus should have name, running, healthy, level."""
        from src.monitoring.container_validator import ContainerStatus

        status = ContainerStatus(
            name="wave-test",
            running=True,
            healthy=True,
            level="critical"
        )

        assert status.name == "wave-test"
        assert status.running is True
        assert status.healthy is True
        assert status.level == "critical"

    def test_container_status_to_dict(self):
        """ContainerStatus should serialize to dict."""
        from src.monitoring.container_validator import ContainerStatus

        status = ContainerStatus(
            name="wave-redis",
            running=True,
            healthy=True,
            level="critical"
        )

        d = status.to_dict()

        assert d["name"] == "wave-redis"
        assert d["running"] is True
        assert d["healthy"] is True
        assert d["level"] == "critical"


class TestValidationResult:
    """Tests for ValidationResult dataclass."""

    def test_validation_result_has_required_fields(self):
        """ValidationResult should have all required fields."""
        from src.monitoring.container_validator import ValidationResult

        result = ValidationResult(
            all_healthy=True,
            missing=[],
            unhealthy=[],
            warnings=[],
            go_status="GO"
        )

        assert result.all_healthy is True
        assert result.missing == []
        assert result.unhealthy == []
        assert result.go_status == "GO"

    def test_validation_result_to_dict(self):
        """ValidationResult should serialize to dict."""
        from src.monitoring.container_validator import ValidationResult

        result = ValidationResult(
            all_healthy=False,
            missing=["wave-qa-agent"],
            unhealthy=["wave-redis"],
            warnings=["QA agent not running"],
            go_status="CONDITIONAL-GO"
        )

        d = result.to_dict()

        assert d["all_healthy"] is False
        assert "wave-qa-agent" in d["missing"]
        assert d["go_status"] == "CONDITIONAL-GO"


class TestContainerLevels:
    """Tests for container criticality levels."""

    def test_critical_level_defined(self):
        """Critical level should be defined."""
        from src.monitoring.container_validator import ContainerLevel

        assert hasattr(ContainerLevel, 'CRITICAL')
        assert ContainerLevel.CRITICAL.value == "critical"

    def test_required_level_defined(self):
        """Required level should be defined."""
        from src.monitoring.container_validator import ContainerLevel

        assert hasattr(ContainerLevel, 'REQUIRED')
        assert ContainerLevel.REQUIRED.value == "required"

    def test_optional_level_defined(self):
        """Optional level should be defined."""
        from src.monitoring.container_validator import ContainerLevel

        assert hasattr(ContainerLevel, 'OPTIONAL')
        assert ContainerLevel.OPTIONAL.value == "optional"

    def test_level_ordering(self):
        """Levels should be orderable by importance."""
        from src.monitoring.container_validator import ContainerLevel

        # Critical > Required > Optional
        assert ContainerLevel.CRITICAL.importance > ContainerLevel.REQUIRED.importance
        assert ContainerLevel.REQUIRED.importance > ContainerLevel.OPTIONAL.importance


class TestContainerConfiguration:
    """Tests for container configuration."""

    def test_can_add_custom_container(self):
        """Should be able to add custom containers to check."""
        from src.monitoring.container_validator import ContainerValidator

        validator = ContainerValidator()
        validator.add_container("wave-custom", level="required")

        required = validator.get_required_containers()
        names = [c.name for c in required]

        assert "wave-custom" in names

    def test_can_remove_container(self):
        """Should be able to remove containers from check."""
        from src.monitoring.container_validator import ContainerValidator

        validator = ContainerValidator()
        initial_count = len(validator.get_required_containers())

        validator.remove_container("wave-dozzle")

        final_count = len(validator.get_required_containers())
        assert final_count == initial_count - 1

    def test_from_compose_file(self):
        """Should be able to load containers from docker-compose.yml."""
        from src.monitoring.container_validator import ContainerValidator

        # Mock compose file content
        compose_content = """
services:
  orchestrator:
    container_name: wave-orchestrator
  redis:
    container_name: wave-redis
"""
        with patch('builtins.open', MagicMock(return_value=MagicMock(read=MagicMock(return_value=compose_content)))):
            validator = ContainerValidator.from_compose_file("/fake/path.yml")
            required = validator.get_required_containers()

            names = [c.name for c in required]
            assert "wave-orchestrator" in names
