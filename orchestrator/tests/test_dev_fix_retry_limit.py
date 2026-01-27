"""
TDD Tests for Enhancement 2: Dev-Fix Retry Limit

Grok Recommendation: Add max 3 retries in dev-fix loop
to prevent infinite loops on unfixable issues.
"""

import pytest


class TestDevFixRetryLimit:
    """Test dev-fix retry limit functionality"""

    def test_dev_fix_max_retries_constant_exists(self):
        """DEV_FIX_MAX_RETRIES constant should be defined"""
        from src.graph import DEV_FIX_MAX_RETRIES

        assert DEV_FIX_MAX_RETRIES is not None
        assert isinstance(DEV_FIX_MAX_RETRIES, int)

    def test_dev_fix_max_retries_is_3(self):
        """DEV_FIX_MAX_RETRIES should be 3"""
        from src.graph import DEV_FIX_MAX_RETRIES

        assert DEV_FIX_MAX_RETRIES == 3, f"Expected 3, got {DEV_FIX_MAX_RETRIES}"

    def test_should_retry_dev_fix_function_exists(self):
        """should_retry_dev_fix() function should exist"""
        from src.graph import should_retry_dev_fix

        assert callable(should_retry_dev_fix)


class TestShouldRetryDevFix:
    """Test should_retry_dev_fix routing logic"""

    def test_should_retry_when_under_max_and_qa_failed(self):
        """Should retry when retries < max AND QA failed"""
        from src.graph import should_retry_dev_fix

        state = {
            'dev_fix_retries': 2,
            'qa_passed': False
        }

        result = should_retry_dev_fix(state)
        assert result is True, "Should retry when under max retries"

    def test_should_not_retry_when_at_max(self):
        """Should NOT retry when retries >= max"""
        from src.graph import should_retry_dev_fix

        state = {
            'dev_fix_retries': 3,
            'qa_passed': False
        }

        result = should_retry_dev_fix(state)
        assert result is False, "Should not retry when at max retries"

    def test_should_not_retry_when_qa_passed(self):
        """Should NOT retry when QA passed (no need)"""
        from src.graph import should_retry_dev_fix

        state = {
            'dev_fix_retries': 1,
            'qa_passed': True
        }

        result = should_retry_dev_fix(state)
        assert result is False, "Should not retry when QA passed"

    def test_should_retry_at_zero_retries(self):
        """Should retry when retries is 0"""
        from src.graph import should_retry_dev_fix

        state = {
            'dev_fix_retries': 0,
            'qa_passed': False
        }

        result = should_retry_dev_fix(state)
        assert result is True, "Should retry at 0 retries"

    def test_handles_missing_retries_key(self):
        """Should handle missing dev_fix_retries key (default to 0)"""
        from src.graph import should_retry_dev_fix

        state = {
            'qa_passed': False
        }

        result = should_retry_dev_fix(state)
        assert result is True, "Should default to 0 retries and allow retry"


class TestDevFixRetryIncrement:
    """Test dev-fix retry counter increment"""

    def test_increment_retry_counter_function_exists(self):
        """increment_dev_fix_retries() function should exist"""
        from src.graph import increment_dev_fix_retries

        assert callable(increment_dev_fix_retries)

    def test_increment_from_zero(self):
        """Should increment retry count from 0 to 1"""
        from src.graph import increment_dev_fix_retries

        state = {'dev_fix_retries': 0}
        new_state = increment_dev_fix_retries(state)

        assert new_state['dev_fix_retries'] == 1

    def test_increment_from_existing(self):
        """Should increment existing retry count"""
        from src.graph import increment_dev_fix_retries

        state = {'dev_fix_retries': 2}
        new_state = increment_dev_fix_retries(state)

        assert new_state['dev_fix_retries'] == 3

    def test_increment_initializes_missing_key(self):
        """Should initialize missing key to 1"""
        from src.graph import increment_dev_fix_retries

        state = {}
        new_state = increment_dev_fix_retries(state)

        assert new_state['dev_fix_retries'] == 1
