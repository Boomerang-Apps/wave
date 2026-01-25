"""
LangSmith Configuration TDD Tests
Phase LangSmith-1: Configuration

Tests for TracingConfig and environment management.
All tests must FAIL initially (TDD process).

Test Categories:
1. Config Creation (3 tests)
2. Environment Loading (3 tests)
3. Validation (3 tests)
4. Application (2 tests)

Total: 11 tests
"""

import pytest
import os
from typing import Dict, Any


# =============================================================================
# Test Category 1: Config Creation (3 tests)
# =============================================================================

class TestConfigCreation:
    """Tests for TracingConfig instantiation"""

    def test_tracing_config_exists(self):
        """TracingConfig class should exist"""
        from src.tracing.config import TracingConfig

        config = TracingConfig()
        assert config is not None

    def test_tracing_config_has_required_fields(self):
        """TracingConfig should have all required fields"""
        from src.tracing.config import TracingConfig

        config = TracingConfig()

        assert hasattr(config, "enabled")
        assert hasattr(config, "api_key")
        assert hasattr(config, "endpoint")
        assert hasattr(config, "project")
        assert hasattr(config, "sample_rate")

    def test_tracing_config_default_values(self):
        """TracingConfig should have correct default values"""
        from src.tracing.config import TracingConfig

        config = TracingConfig()

        assert config.enabled is True
        assert config.api_key is None
        assert config.endpoint == "https://api.smith.langchain.com"
        assert config.project == "wave-orchestrator"
        assert config.sample_rate == 1.0


# =============================================================================
# Test Category 2: Environment Loading (3 tests)
# =============================================================================

class TestEnvironmentLoading:
    """Tests for loading config from environment variables"""

    def test_from_env_loads_api_key(self, monkeypatch):
        """from_env should load LANGSMITH_API_KEY"""
        from src.tracing.config import TracingConfig

        monkeypatch.setenv("LANGSMITH_API_KEY", "test-api-key-123")

        config = TracingConfig.from_env()

        assert config.api_key == "test-api-key-123"

    def test_from_env_loads_project(self, monkeypatch):
        """from_env should load LANGSMITH_PROJECT"""
        from src.tracing.config import TracingConfig

        monkeypatch.setenv("LANGSMITH_API_KEY", "test-key")
        monkeypatch.setenv("LANGSMITH_PROJECT", "my-custom-project")

        config = TracingConfig.from_env()

        assert config.project == "my-custom-project"

    def test_from_env_handles_missing_vars(self, monkeypatch):
        """from_env should handle missing environment variables gracefully"""
        from src.tracing.config import TracingConfig

        # Clear any existing env vars
        monkeypatch.delenv("LANGSMITH_API_KEY", raising=False)
        monkeypatch.delenv("LANGSMITH_PROJECT", raising=False)
        monkeypatch.delenv("LANGSMITH_TRACING", raising=False)

        config = TracingConfig.from_env()

        assert config.api_key is None
        assert config.project == "wave-orchestrator"  # default

    def test_from_env_loads_sample_rate(self, monkeypatch):
        """from_env should load LANGSMITH_SAMPLE_RATE as float"""
        from src.tracing.config import TracingConfig

        monkeypatch.setenv("LANGSMITH_API_KEY", "test-key")
        monkeypatch.setenv("LANGSMITH_SAMPLE_RATE", "0.5")

        config = TracingConfig.from_env()

        assert config.sample_rate == 0.5

    def test_from_env_loads_enabled_flag(self, monkeypatch):
        """from_env should load LANGSMITH_TRACING as boolean"""
        from src.tracing.config import TracingConfig

        monkeypatch.setenv("LANGSMITH_API_KEY", "test-key")
        monkeypatch.setenv("LANGSMITH_TRACING", "false")

        config = TracingConfig.from_env()

        assert config.enabled is False


# =============================================================================
# Test Category 3: Validation (3 tests)
# =============================================================================

class TestValidation:
    """Tests for configuration validation"""

    def test_validate_returns_valid_with_api_key(self):
        """validate should return valid=True when API key is present"""
        from src.tracing.config import TracingConfig

        config = TracingConfig(api_key="valid-api-key")
        valid, errors = config.validate()

        assert valid is True
        assert len(errors) == 0

    def test_validate_returns_invalid_without_api_key(self):
        """validate should return valid=False when API key is missing"""
        from src.tracing.config import TracingConfig

        config = TracingConfig(enabled=True, api_key=None)
        valid, errors = config.validate()

        assert valid is False
        assert any("api_key" in e.lower() for e in errors)

    def test_validate_checks_sample_rate_bounds(self):
        """validate should check sample_rate is between 0.0 and 1.0"""
        from src.tracing.config import TracingConfig

        # Invalid: above 1.0
        config = TracingConfig(api_key="key", sample_rate=1.5)
        valid, errors = config.validate()
        assert valid is False
        assert any("sample_rate" in e.lower() for e in errors)

        # Invalid: below 0.0
        config = TracingConfig(api_key="key", sample_rate=-0.1)
        valid, errors = config.validate()
        assert valid is False

        # Valid: exactly 0.0
        config = TracingConfig(api_key="key", sample_rate=0.0)
        valid, errors = config.validate()
        assert valid is True

        # Valid: exactly 1.0
        config = TracingConfig(api_key="key", sample_rate=1.0)
        valid, errors = config.validate()
        assert valid is True

    def test_validate_skips_api_key_check_when_disabled(self):
        """validate should not require API key when tracing is disabled"""
        from src.tracing.config import TracingConfig

        config = TracingConfig(enabled=False, api_key=None)
        valid, errors = config.validate()

        assert valid is True
        assert len(errors) == 0


# =============================================================================
# Test Category 4: Application (2 tests)
# =============================================================================

class TestApplication:
    """Tests for applying configuration to environment"""

    def test_apply_sets_environment_variables(self, monkeypatch):
        """apply should set LANGSMITH environment variables"""
        from src.tracing.config import TracingConfig

        # Clear existing vars
        for var in ["LANGSMITH_TRACING", "LANGSMITH_API_KEY", "LANGSMITH_PROJECT"]:
            monkeypatch.delenv(var, raising=False)

        config = TracingConfig(
            enabled=True,
            api_key="my-secret-key",
            project="test-project",
            endpoint="https://custom.endpoint.com",
            sample_rate=0.8,
        )

        config.apply()

        assert os.environ.get("LANGSMITH_TRACING") == "true"
        assert os.environ.get("LANGSMITH_API_KEY") == "my-secret-key"
        assert os.environ.get("LANGSMITH_PROJECT") == "test-project"
        assert os.environ.get("LANGSMITH_ENDPOINT") == "https://custom.endpoint.com"
        assert os.environ.get("LANGSMITH_SAMPLE_RATE") == "0.8"

    def test_apply_disabled_does_not_set_tracing(self, monkeypatch):
        """apply with enabled=False should set LANGSMITH_TRACING to false"""
        from src.tracing.config import TracingConfig

        monkeypatch.delenv("LANGSMITH_TRACING", raising=False)

        config = TracingConfig(enabled=False, api_key="key")
        config.apply()

        assert os.environ.get("LANGSMITH_TRACING") == "false"


# =============================================================================
# Test Category 5: Module Exports (2 tests)
# =============================================================================

class TestModuleExports:
    """Tests for module-level exports"""

    def test_tracing_module_exists(self):
        """src.tracing module should exist"""
        from src import tracing

        assert tracing is not None

    def test_tracing_module_exports_config(self):
        """src.tracing should export TracingConfig"""
        from src.tracing import TracingConfig

        assert TracingConfig is not None
