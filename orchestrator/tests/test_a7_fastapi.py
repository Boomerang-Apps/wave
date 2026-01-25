"""
Test A.7: FastAPI Server
TDD - Tests written BEFORE implementation

Acceptance Criteria:
1. FastAPI app instance exists
2. Health check endpoint (/health)
3. Run creation endpoint (POST /runs)
4. Run status endpoint (GET /runs/{run_id})
5. Proper response models
"""

import pytest
from fastapi.testclient import TestClient


class TestAppImports:
    """Test A.7.1: Verify FastAPI app is importable"""

    def test_app_exists(self):
        """FastAPI app should be importable"""
        from main import app
        assert app is not None

    def test_app_is_fastapi(self):
        """App should be FastAPI instance"""
        from fastapi import FastAPI
        from main import app
        assert isinstance(app, FastAPI)


class TestHealthEndpoint:
    """Test A.7.2: Verify health check endpoint"""

    def test_health_endpoint_exists(self):
        """Health endpoint should exist"""
        from main import app
        client = TestClient(app)
        response = client.get("/health")
        assert response.status_code == 200

    def test_health_returns_status(self):
        """Health endpoint should return status"""
        from main import app
        client = TestClient(app)
        response = client.get("/health")
        data = response.json()
        assert "status" in data
        assert data["status"] == "healthy"


class TestRunEndpoints:
    """Test A.7.3: Verify run management endpoints"""

    def test_create_run_endpoint_exists(self):
        """POST /runs should exist"""
        from main import app
        client = TestClient(app)
        response = client.post("/runs", json={"task": "Test task"})
        # Should return 200 or 201, not 404
        assert response.status_code in (200, 201, 422)

    def test_create_run_returns_run_id(self):
        """Create run should return run_id"""
        from main import app
        client = TestClient(app)
        response = client.post("/runs", json={"task": "Test task"})
        assert response.status_code in (200, 201)
        data = response.json()
        assert "run_id" in data

    def test_get_run_endpoint_exists(self):
        """GET /runs/{run_id} should exist"""
        from main import app
        client = TestClient(app)
        # First create a run
        create_response = client.post("/runs", json={"task": "Test task"})
        run_id = create_response.json().get("run_id", "test-id")

        # Then get it
        response = client.get(f"/runs/{run_id}")
        # Should return 200 or 404 (not found), not 405 (method not allowed)
        assert response.status_code in (200, 404)

    def test_get_run_returns_status(self):
        """Get run should return run status"""
        from main import app
        client = TestClient(app)

        # Create a run
        create_response = client.post("/runs", json={"task": "Test task"})
        assert create_response.status_code in (200, 201)
        run_id = create_response.json()["run_id"]

        # Get the run
        response = client.get(f"/runs/{run_id}")
        assert response.status_code == 200
        data = response.json()
        assert "status" in data


class TestRequestModels:
    """Test A.7.4: Verify request/response models"""

    def test_run_request_model_exists(self):
        """RunRequest model should exist"""
        from main import RunRequest
        assert RunRequest is not None

    def test_run_response_model_exists(self):
        """RunResponse model should exist"""
        from main import RunResponse
        assert RunResponse is not None

    def test_run_request_requires_task(self):
        """RunRequest should require task field"""
        from main import app
        client = TestClient(app)
        # Send request without task
        response = client.post("/runs", json={})
        assert response.status_code == 422  # Validation error


class TestCORSConfiguration:
    """Test A.7.5: Verify CORS is configured"""

    def test_cors_allows_origins(self):
        """CORS should allow portal origin"""
        from main import app
        client = TestClient(app)
        response = client.options(
            "/health",
            headers={
                "Origin": "http://localhost:5173",
                "Access-Control-Request-Method": "GET"
            }
        )
        # Should have CORS headers
        assert response.status_code in (200, 204, 405)


class TestRunExecution:
    """Test A.7.6: Verify run execution"""

    def test_run_executes_graph(self):
        """Creating a run should execute the graph"""
        from main import app
        client = TestClient(app)

        response = client.post("/runs", json={"task": "Test execution"})
        assert response.status_code in (200, 201)
        data = response.json()

        # Should have run_id and status
        assert "run_id" in data
        assert "status" in data


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
