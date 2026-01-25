"""
Test A.3: Environment Configuration
TDD - Tests written BEFORE implementation

Acceptance Criteria:
1. Config class loads from environment variables
2. Default values are provided for optional settings
3. Required settings raise error if missing
4. Thresholds are within valid ranges
"""

import pytest
import os


class TestConfigLoading:
    """Test A.3: Verify configuration loading"""

    def test_config_class_exists(self):
        """Config class should be importable"""
        from config import Settings
        assert Settings is not None

    def test_config_has_required_fields(self):
        """Config should have all required fields"""
        from config import Settings
        settings = Settings()

        # Server settings
        assert hasattr(settings, 'host')
        assert hasattr(settings, 'port')
        assert hasattr(settings, 'debug')

        # Safety thresholds
        assert hasattr(settings, 'constitutional_block_threshold')
        assert hasattr(settings, 'constitutional_escalate_threshold')

        # Budget limits
        assert hasattr(settings, 'default_token_limit')
        assert hasattr(settings, 'default_cost_limit_usd')

    def test_config_default_values(self):
        """Config should have sensible defaults"""
        from config import Settings
        settings = Settings()

        # Defaults
        assert settings.host == "0.0.0.0"
        assert settings.port == 8000
        assert settings.debug is True

        # Thresholds
        assert 0 < settings.constitutional_block_threshold <= 1
        assert 0 < settings.constitutional_escalate_threshold <= 1
        assert settings.constitutional_block_threshold < settings.constitutional_escalate_threshold

    def test_config_threshold_validation(self):
        """Thresholds should be between 0 and 1"""
        from config import Settings
        settings = Settings()

        assert 0 <= settings.constitutional_block_threshold <= 1
        assert 0 <= settings.constitutional_escalate_threshold <= 1

    def test_config_from_env(self):
        """Config should load from environment variables"""
        os.environ["PORT"] = "9000"
        os.environ["DEBUG"] = "false"

        from importlib import reload
        import config
        reload(config)

        settings = config.Settings()
        assert settings.port == 9000
        assert settings.debug is False

        # Cleanup
        del os.environ["PORT"]
        del os.environ["DEBUG"]


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
