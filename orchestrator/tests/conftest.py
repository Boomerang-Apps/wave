"""
Pytest fixtures for WAVE orchestrator tests.

Includes RLM mocks for budget simulation (Grok suggestion #4).
"""

import pytest
from unittest.mock import MagicMock, patch
from typing import Dict, Any


# ═══════════════════════════════════════════════════════════════════════════════
# RLM MOCK FIXTURES (Grok Suggestion #4)
# ═══════════════════════════════════════════════════════════════════════════════

@pytest.fixture
def mock_rlm_config() -> Dict[str, Any]:
    """Mock RLM configuration for testing."""
    return {
        "rateLimit": {
            "maxTokensPerMinute": 100000,
            "maxRequestsPerMinute": 60
        },
        "budget": {
            "maxDailySpend": 50.0,
            "alertThreshold": 0.8,
            "maxTokensPerStory": 50000
        }
    }


@pytest.fixture
def mock_rlm_config_low_budget() -> Dict[str, Any]:
    """Mock RLM configuration with low budget for testing thresholds."""
    return {
        "rateLimit": {
            "maxTokensPerMinute": 10000,
            "maxRequestsPerMinute": 10
        },
        "budget": {
            "maxDailySpend": 5.0,
            "alertThreshold": 0.5,
            "maxTokensPerStory": 5000
        }
    }


@pytest.fixture
def mock_budget_safe():
    """Mock that simulates budget within safe limits (50%)."""
    return {
        "safe": True,
        "warning": False,
        "usage_percent": 50.0,
        "message": "Budget OK: 50.0% used"
    }


@pytest.fixture
def mock_budget_warning():
    """Mock that simulates budget at warning threshold (85%)."""
    return {
        "safe": True,
        "warning": True,
        "usage_percent": 85.0,
        "message": "Budget warning: 85.0% used"
    }


@pytest.fixture
def mock_budget_exceeded():
    """Mock that simulates budget exceeded (110%)."""
    return {
        "safe": False,
        "warning": True,
        "usage_percent": 110.0,
        "message": "Budget EXCEEDED: 110.0% used"
    }


@pytest.fixture
def mock_p_variable() -> Dict[str, Any]:
    """Mock P Variable for context optimization tests."""
    return {
        "project_id": "test-project",
        "wave_state": {
            "current_wave": 1,
            "current_gate": 2,
            "gate_history": [
                {"gate": 0, "status": "passed"},
                {"gate": 1, "status": "passed"}
            ]
        },
        "stories": {
            "wave_1": [
                {"id": "STORY-001", "title": "Test Story 1", "status": "in_progress"},
                {"id": "STORY-002", "title": "Test Story 2", "status": "pending"}
            ],
            "wave_2": [
                {"id": "STORY-003", "title": "Future Story", "status": "pending"}
            ]
        },
        "agent_memory": {
            "fe-1": {"last_action": "component created"},
            "be-1": {"last_action": "endpoint added"},
            "qa-1": {"last_action": "tests written"}
        },
        "codebase": {
            "files": ["file1.ts", "file2.ts", "file3.ts"] * 100,  # Bloated for pruning test
            "directories": ["src", "tests", "docs"]
        },
        "metadata": {
            "created_at": "2026-01-28T10:00:00Z",
            "updated_at": "2026-01-28T12:00:00Z"
        }
    }


@pytest.fixture
def mock_p_variable_minimal() -> Dict[str, Any]:
    """Minimal mock P Variable for basic tests."""
    return {
        "wave_state": {
            "current_wave": 1,
            "current_gate": 0
        }
    }


# ═══════════════════════════════════════════════════════════════════════════════
# RLM BUDGET TRACKER MOCKS
# ═══════════════════════════════════════════════════════════════════════════════

@pytest.fixture
def mock_budget_tracker():
    """Mock RLMBudgetTracker for testing."""
    tracker = MagicMock()
    tracker.tokens_used = 50000
    tracker.cost_used = 0.75
    tracker.check_limits.return_value = {
        "safe": True,
        "warning": False,
        "tokens_percent": 50.0,
        "cost_percent": 1.5
    }
    return tracker


@pytest.fixture
def mock_budget_tracker_exceeded():
    """Mock RLMBudgetTracker that has exceeded limits."""
    tracker = MagicMock()
    tracker.tokens_used = 150000
    tracker.cost_used = 75.0
    tracker.check_limits.return_value = {
        "safe": False,
        "warning": True,
        "tokens_percent": 150.0,
        "cost_percent": 150.0
    }
    return tracker


# ═══════════════════════════════════════════════════════════════════════════════
# RLM FUNCTION MOCKS
# ═══════════════════════════════════════════════════════════════════════════════

@pytest.fixture
def patch_check_rlm_budget_safe():
    """Patch check_rlm_budget to return safe status."""
    with patch('tools.p_variable.check_rlm_budget') as mock:
        mock.return_value = {
            "safe": True,
            "warning": False,
            "usage_percent": 50.0,
            "message": "Budget OK"
        }
        yield mock


@pytest.fixture
def patch_check_rlm_budget_warning():
    """Patch check_rlm_budget to return warning status."""
    with patch('tools.p_variable.check_rlm_budget') as mock:
        mock.return_value = {
            "safe": True,
            "warning": True,
            "usage_percent": 85.0,
            "message": "Budget warning"
        }
        yield mock


@pytest.fixture
def patch_check_rlm_budget_exceeded():
    """Patch check_rlm_budget to return exceeded status."""
    with patch('tools.p_variable.check_rlm_budget') as mock:
        mock.return_value = {
            "safe": False,
            "warning": True,
            "usage_percent": 110.0,
            "message": "Budget EXCEEDED"
        }
        yield mock


# ═══════════════════════════════════════════════════════════════════════════════
# WORKFLOW LOCKER MOCKS
# ═══════════════════════════════════════════════════════════════════════════════

@pytest.fixture
def mock_workflow_locker():
    """Mock WorkflowLocker for testing."""
    locker = MagicMock()
    locker.get_current_gate.return_value = 2
    locker.check_gate.return_value = {"valid": True, "current_gate": 2}
    locker.advance_gate.return_value = {"success": True, "current_gate": 3}
    locker.detect_drift.return_value = {"has_drift": False}
    return locker


@pytest.fixture
def mock_workflow_locker_drift():
    """Mock WorkflowLocker that detects drift."""
    locker = MagicMock()
    locker.get_current_gate.return_value = 5
    locker.check_gate.return_value = {"valid": False, "drift_detected": True}
    locker.detect_drift.return_value = {
        "has_drift": True,
        "expected": 2,
        "actual": 5
    }
    return locker


# ═══════════════════════════════════════════════════════════════════════════════
# HELPER FIXTURES
# ═══════════════════════════════════════════════════════════════════════════════

@pytest.fixture
def temp_claude_dir(tmp_path):
    """Create temporary .claude directory structure."""
    claude_dir = tmp_path / ".claude"
    claude_dir.mkdir()
    return claude_dir


@pytest.fixture
def temp_project_with_p_json(tmp_path, mock_p_variable):
    """Create temporary project with P.json file."""
    import json

    claude_dir = tmp_path / ".claude"
    claude_dir.mkdir()

    p_json_path = claude_dir / "P.json"
    p_json_path.write_text(json.dumps(mock_p_variable, indent=2))

    return tmp_path
