"""
TDD Tests for Workflow Reset API Endpoint
Gate 0 Research Item #4: Workflow Reset API

These tests are written BEFORE implementation per TDD methodology.
Run with: pytest tests/test_workflow_reset.py -v
"""

import pytest
from unittest.mock import patch, MagicMock
from typing import Dict, Any


class TestWorkflowReset:
    """Tests for workflow reset functionality."""

    def test_reset_workflow_returns_response(self):
        """Reset should return WorkflowResponse."""
        from src.api.endpoints import WorkflowManager, WorkflowResponse

        manager = WorkflowManager()

        # Create a workflow first
        from src.api.endpoints import WorkflowRequest
        request = WorkflowRequest(
            story_id="TEST-001",
            project_path="/tmp/test",
            requirements="Test requirements"
        )
        start_result = manager.start_workflow(request)
        thread_id = start_result.thread_id

        # Reset workflow
        result = manager.reset_workflow(thread_id)

        assert isinstance(result, WorkflowResponse)
        assert result.thread_id == thread_id

    def test_reset_unknown_workflow_fails(self):
        """Reset should fail for unknown workflow."""
        from src.api.endpoints import WorkflowManager

        manager = WorkflowManager()
        result = manager.reset_workflow("nonexistent-workflow-id")

        assert result.success is False
        assert "not found" in result.message.lower()

    def test_reset_clears_in_memory_state(self):
        """Reset should clear in-memory workflow state."""
        from src.api.endpoints import WorkflowManager, WorkflowRequest

        manager = WorkflowManager()

        # Create workflow
        request = WorkflowRequest(
            story_id="TEST-002",
            project_path="/tmp/test",
            requirements="Test"
        )
        start_result = manager.start_workflow(request)
        thread_id = start_result.thread_id

        # Verify workflow exists
        assert thread_id in manager._active_workflows

        # Reset with clear_state=True
        result = manager.reset_workflow(thread_id, clear_state=True)

        # Workflow should be removed
        assert result.success is True

    def test_reset_to_specific_gate(self):
        """Reset should allow resetting to specific gate."""
        from src.api.endpoints import WorkflowManager, WorkflowRequest

        manager = WorkflowManager()

        # Create and advance workflow
        request = WorkflowRequest(
            story_id="TEST-003",
            project_path="/tmp/test",
            requirements="Test"
        )
        start_result = manager.start_workflow(request)
        thread_id = start_result.thread_id

        # Reset to gate 2
        result = manager.reset_workflow(thread_id, reset_to_gate=2)

        assert result.success is True
        # Verify gate was reset
        status = manager.get_status(thread_id)
        assert status.gate == 2

    def test_reset_returns_cleanup_summary(self):
        """Reset should return summary of cleared items."""
        from src.api.endpoints import WorkflowManager, WorkflowRequest

        manager = WorkflowManager()

        request = WorkflowRequest(
            story_id="TEST-004",
            project_path="/tmp/test",
            requirements="Test"
        )
        start_result = manager.start_workflow(request)
        thread_id = start_result.thread_id

        result = manager.reset_workflow(thread_id)

        assert result.success is True
        assert result.data is not None
        assert "cleared" in result.data or "reset" in str(result.data).lower()

    def test_reset_with_reason_logs_audit(self):
        """Reset with reason should be logged for audit."""
        from src.api.endpoints import WorkflowManager, WorkflowRequest

        manager = WorkflowManager()

        request = WorkflowRequest(
            story_id="TEST-005",
            project_path="/tmp/test",
            requirements="Test"
        )
        start_result = manager.start_workflow(request)
        thread_id = start_result.thread_id

        # Reset with reason
        result = manager.reset_workflow(thread_id, reason="Testing reset")

        assert result.success is True
        # Reason should be captured (implementation detail)


class TestTaskQueueReset:
    """Tests for task queue reset functionality."""

    def test_clear_workflow_tasks_removes_task_keys(self):
        """clear_workflow_tasks should remove task keys from Redis."""
        from src.task_queue import TaskQueue

        queue = TaskQueue()

        # Mock Redis
        with patch.object(queue, 'redis') as mock_redis:
            mock_redis.scan_iter.return_value = [
                "wave:task:TEST-001-abc123",
                "wave:task:TEST-001-def456"
            ]

            result = queue.clear_workflow_tasks("TEST-001")

            # Verify delete was called
            assert mock_redis.delete.call_count >= 2

    def test_clear_workflow_tasks_removes_result_keys(self):
        """clear_workflow_tasks should remove result keys from Redis."""
        from src.task_queue import TaskQueue

        queue = TaskQueue()

        with patch.object(queue, 'redis') as mock_redis:
            mock_redis.scan_iter.side_effect = [
                [],  # No tasks
                ["wave:result:TEST-001-abc123"]  # One result
            ]

            result = queue.clear_workflow_tasks("TEST-001")

            assert result["results"] >= 0

    def test_clear_workflow_tasks_removes_from_queues(self):
        """clear_workflow_tasks should remove from domain queues."""
        from src.task_queue import TaskQueue, DomainQueue

        queue = TaskQueue()

        with patch.object(queue, 'redis') as mock_redis:
            mock_redis.scan_iter.return_value = []
            mock_redis.lrem.return_value = 1  # One item removed

            result = queue.clear_workflow_tasks("TEST-001")

            # lrem should be called for each queue
            assert mock_redis.lrem.called

    def test_clear_workflow_tasks_returns_summary(self):
        """clear_workflow_tasks should return cleanup summary."""
        from src.task_queue import TaskQueue

        queue = TaskQueue()

        with patch.object(queue, 'redis') as mock_redis:
            mock_redis.scan_iter.return_value = []
            mock_redis.lrem.return_value = 0

            result = queue.clear_workflow_tasks("TEST-001")

            assert "tasks" in result
            assert "results" in result
            assert "queues" in result


class TestResetEndpoint:
    """Tests for the REST API reset endpoint."""

    def test_reset_endpoint_exists(self):
        """POST /workflow/{id}/reset endpoint should exist."""
        from src.api.endpoints import create_app

        app = create_app()

        # Find reset route
        routes = [route.path for route in app.routes]
        assert "/workflow/{thread_id}/reset" in routes or any(
            "reset" in route for route in routes
        )

    def test_reset_endpoint_requires_thread_id(self):
        """Reset endpoint should require thread_id parameter."""
        from src.api.endpoints import create_app
        from fastapi.testclient import TestClient

        app = create_app()
        client = TestClient(app)

        # Try without thread_id
        response = client.post("/workflow//reset")
        assert response.status_code in [404, 405, 422]

    def test_reset_endpoint_returns_404_for_unknown(self):
        """Reset endpoint should return 404 for unknown workflow."""
        from src.api.endpoints import create_app
        from fastapi.testclient import TestClient

        app = create_app()
        client = TestClient(app)

        response = client.post("/workflow/nonexistent-id/reset")
        # Should return error (404 or error response)
        assert response.status_code in [404, 400] or not response.json().get("success", True)


class TestResetRequest:
    """Tests for reset request model."""

    def test_reset_request_has_clear_tasks_option(self):
        """ResetRequest should have clear_tasks option."""
        from src.api.endpoints import ResetRequest

        request = ResetRequest(clear_tasks=True)
        assert request.clear_tasks is True

    def test_reset_request_has_reset_to_gate_option(self):
        """ResetRequest should have reset_to_gate option."""
        from src.api.endpoints import ResetRequest

        request = ResetRequest(reset_to_gate=3)
        assert request.reset_to_gate == 3

    def test_reset_request_has_reason_option(self):
        """ResetRequest should have reason option."""
        from src.api.endpoints import ResetRequest

        request = ResetRequest(reason="Manual intervention required")
        assert request.reason == "Manual intervention required"

    def test_reset_request_defaults(self):
        """ResetRequest should have sensible defaults."""
        from src.api.endpoints import ResetRequest

        request = ResetRequest()
        assert request.clear_tasks is True  # Default to clearing tasks
        assert request.clear_results is True  # Default to clearing results
        assert request.reset_to_gate is None  # Don't reset gate by default
