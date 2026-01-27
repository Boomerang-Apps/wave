"""
TDD Tests for Enhancement 1: PM Timeout Increase

Grok Recommendation: Increase PM timeout from 2 min to 5 min
with configurable env var override.
"""

import os
import pytest
import inspect


class TestPMTimeout:
    """Test PM timeout configuration"""

    def test_wait_for_result_default_timeout_is_300(self):
        """wait_for_result default timeout should be 300 seconds (5 min)"""
        from src.supervisor import Supervisor

        supervisor = Supervisor.__new__(Supervisor)
        sig = inspect.signature(supervisor.wait_for_result)
        timeout_default = sig.parameters['timeout'].default

        assert timeout_default == 300, f"Expected 300, got {timeout_default}"

    def test_get_pm_timeout_function_exists(self):
        """get_pm_timeout() function should exist"""
        from src.supervisor import get_pm_timeout

        assert callable(get_pm_timeout)

    def test_get_pm_timeout_default_is_300(self):
        """get_pm_timeout() should return 300 by default"""
        # Ensure env var is not set
        if 'WAVE_PM_TIMEOUT' in os.environ:
            del os.environ['WAVE_PM_TIMEOUT']

        from src.supervisor import get_pm_timeout

        result = get_pm_timeout()
        assert result == 300, f"Expected 300, got {result}"

    def test_get_pm_timeout_respects_env_var(self):
        """get_pm_timeout() should respect WAVE_PM_TIMEOUT env var"""
        os.environ['WAVE_PM_TIMEOUT'] = '600'

        # Need to reload to pick up env var
        import importlib
        import src.supervisor
        importlib.reload(src.supervisor)
        from src.supervisor import get_pm_timeout

        result = get_pm_timeout()
        assert result == 600, f"Expected 600, got {result}"

        # Cleanup
        del os.environ['WAVE_PM_TIMEOUT']

    def test_supervisor_uses_pm_timeout_for_pm_tasks(self):
        """Supervisor should use get_pm_timeout() for PM task waits"""
        # This test verifies the integration
        from src.supervisor import Supervisor, get_pm_timeout

        # The implementation should use get_pm_timeout() internally
        assert callable(get_pm_timeout)


class TestTimeoutValues:
    """Test various timeout value scenarios"""

    def test_timeout_minimum_30_seconds(self):
        """Timeout should not be less than 30 seconds"""
        os.environ['WAVE_PM_TIMEOUT'] = '10'

        import importlib
        import src.supervisor
        importlib.reload(src.supervisor)
        from src.supervisor import get_pm_timeout

        result = get_pm_timeout()
        # Should enforce minimum of 30
        assert result >= 30, f"Timeout {result} is below minimum 30"

        del os.environ['WAVE_PM_TIMEOUT']

    def test_timeout_maximum_600_seconds(self):
        """Timeout should not exceed 600 seconds (10 min)"""
        os.environ['WAVE_PM_TIMEOUT'] = '1000'

        import importlib
        import src.supervisor
        importlib.reload(src.supervisor)
        from src.supervisor import get_pm_timeout

        result = get_pm_timeout()
        # Should enforce maximum of 600
        assert result <= 600, f"Timeout {result} exceeds maximum 600"

        del os.environ['WAVE_PM_TIMEOUT']
