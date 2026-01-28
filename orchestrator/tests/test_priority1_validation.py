"""
TDD Tests for Priority 1 Actions Validation

Gate0 validation tests for:
1. Docker container rebuild
2. Redis queue cleanup
3. Demo workflow execution

These tests validate the infrastructure is ready for enhancements.
"""

import os
import subprocess
import json
import pytest


class TestDockerRebuildValidation:
    """Validate Docker rebuild prerequisites and results"""

    def test_dockerfile_exists(self):
        """Dockerfile must exist in orchestrator root"""
        dockerfile = "/Volumes/SSD-01/Projects/WAVE/orchestrator/Dockerfile"
        assert os.path.exists(dockerfile), f"Dockerfile not found at {dockerfile}"

    def test_docker_compose_file_exists(self):
        """docker-compose.agents.yml must exist"""
        compose_file = "/Volumes/SSD-01/Projects/WAVE/orchestrator/docker/docker-compose.agents.yml"
        assert os.path.exists(compose_file), f"Compose file not found at {compose_file}"

    def test_dockerfile_copies_src_directory(self):
        """Dockerfile must copy src/ directory for enhancements"""
        dockerfile = "/Volumes/SSD-01/Projects/WAVE/orchestrator/Dockerfile"
        with open(dockerfile, 'r') as f:
            content = f.read()
        assert "COPY src/" in content, "Dockerfile must copy src/ directory"

    def test_enhancement_files_exist(self):
        """All enhancement files must exist before rebuild"""
        files = [
            "/Volumes/SSD-01/Projects/WAVE/orchestrator/src/supervisor.py",
            "/Volumes/SSD-01/Projects/WAVE/orchestrator/src/graph.py",
            "/Volumes/SSD-01/Projects/WAVE/orchestrator/src/safety/constitutional.py",
            "/Volumes/SSD-01/Projects/WAVE/orchestrator/src/merge_watcher.py",
        ]
        for f in files:
            assert os.path.exists(f), f"Enhancement file not found: {f}"

    def test_pm_timeout_enhancement_in_supervisor(self):
        """supervisor.py must contain PM timeout enhancement"""
        with open("/Volumes/SSD-01/Projects/WAVE/orchestrator/src/supervisor.py", 'r') as f:
            content = f.read()
        assert "get_pm_timeout" in content, "PM timeout function not found"
        assert "WAVE_PM_TIMEOUT" in content, "PM timeout env var not found"

    def test_dev_fix_retry_in_graph(self):
        """graph.py must contain dev-fix retry limit"""
        with open("/Volumes/SSD-01/Projects/WAVE/orchestrator/src/graph.py", 'r') as f:
            content = f.read()
        assert "DEV_FIX_MAX_RETRIES" in content, "Dev-fix max retries not found"
        assert "should_retry_dev_fix" in content, "should_retry_dev_fix not found"

    def test_p006_triggers_in_constitutional(self):
        """constitutional.py must contain P006 explicit triggers"""
        with open("/Volumes/SSD-01/Projects/WAVE/orchestrator/src/safety/constitutional.py", 'r') as f:
            content = f.read()
        assert "AMBIGUOUS_KEYWORDS" in content, "Ambiguous keywords not found"
        assert "should_escalate_p006" in content, "P006 escalation function not found"


class TestRedisQueueValidation:
    """Validate Redis queue operations"""

    def test_redis_cli_available(self):
        """redis-cli must be accessible via Docker"""
        result = subprocess.run(
            ["docker", "exec", "wave-redis", "redis-cli", "ping"],
            capture_output=True, text=True, timeout=10
        )
        assert result.returncode == 0, f"Redis not responding: {result.stderr}"
        assert "PONG" in result.stdout, "Redis ping failed"

    def test_can_check_queue_length(self):
        """Must be able to check PM queue length"""
        result = subprocess.run(
            ["docker", "exec", "wave-redis", "redis-cli", "LLEN", "wave:tasks:pm"],
            capture_output=True, text=True, timeout=10
        )
        assert result.returncode == 0, f"Cannot check queue: {result.stderr}"
        # Result should be a number
        try:
            int(result.stdout.strip())
        except ValueError:
            pytest.fail(f"Queue length not a number: {result.stdout}")

    def test_can_delete_queue(self):
        """Must be able to delete queue (test with dummy key)"""
        # Create a test key
        subprocess.run(
            ["docker", "exec", "wave-redis", "redis-cli", "SET", "wave:test:dummy", "1"],
            capture_output=True, timeout=10
        )
        # Delete it
        result = subprocess.run(
            ["docker", "exec", "wave-redis", "redis-cli", "DEL", "wave:test:dummy"],
            capture_output=True, text=True, timeout=10
        )
        assert result.returncode == 0, f"Cannot delete key: {result.stderr}"


class TestWorkflowAPIValidation:
    """Validate workflow API is accessible"""

    def test_orchestrator_health_endpoint(self):
        """Orchestrator /health endpoint must respond"""
        result = subprocess.run(
            ["curl", "-s", "http://localhost:8000/health"],
            capture_output=True, text=True, timeout=10
        )
        assert result.returncode == 0, "Cannot reach orchestrator"

        response = json.loads(result.stdout)
        assert response.get("status") == "healthy", f"Unhealthy: {response}"

    def test_workflow_start_endpoint_exists(self):
        """/workflow/start endpoint must exist"""
        result = subprocess.run(
            ["curl", "-s", "http://localhost:8000/openapi.json"],
            capture_output=True, text=True, timeout=10
        )
        assert result.returncode == 0, "Cannot reach OpenAPI"

        openapi = json.loads(result.stdout)
        paths = openapi.get("paths", {})
        assert "/workflow/start" in paths, "workflow/start endpoint not found"

    def test_workflows_list_endpoint(self):
        """/workflows endpoint must return list"""
        result = subprocess.run(
            ["curl", "-s", "http://localhost:8000/workflows"],
            capture_output=True, text=True, timeout=10
        )
        assert result.returncode == 0, "Cannot reach workflows"

        workflows = json.loads(result.stdout)
        assert isinstance(workflows, list), "Workflows should be a list"
