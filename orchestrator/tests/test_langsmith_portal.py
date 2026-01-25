"""
LangSmith Portal Integration TDD Tests
Phase LangSmith-5: Portal Integration

Tests for tracing API endpoints and metrics storage.
All tests must FAIL initially (TDD process).

Test Categories:
1. Tracing API (4 tests)
2. Metrics Storage (3 tests)
3. API Integration (3 tests)
4. Error Handling (2 tests)

Total: 12 tests
"""

import pytest
from datetime import datetime
from typing import Dict, Any
from unittest.mock import MagicMock, patch


# =============================================================================
# Test Fixtures
# =============================================================================

@pytest.fixture
def sample_run_id():
    """Sample run ID for testing."""
    return "test-run-portal-123"


@pytest.fixture
def sample_metrics():
    """Create sample RunMetrics for testing."""
    from src.tracing.metrics import RunMetrics

    return RunMetrics(
        run_id="test-run-portal-123",
        start_time=datetime(2026, 1, 25, 10, 0, 0),
        end_time=datetime(2026, 1, 25, 10, 5, 0),
        total_duration_ms=300000.0,
        node_executions=10,
        node_errors=1,
        tokens_used=5000,
        cost_usd=0.15,
        agent_counts={"cto_node": 2, "dev_node": 5, "qa_node": 3},
        agent_durations={"cto_node": 1000.0, "dev_node": 2500.0, "qa_node": 1500.0},
        retry_count=2,
        safety_violations=0,
    )


@pytest.fixture
def api_client():
    """Create FastAPI test client."""
    from fastapi.testclient import TestClient
    from src.tracing.api import router
    from fastapi import FastAPI

    app = FastAPI()
    app.include_router(router)
    return TestClient(app)


# =============================================================================
# Test Category 1: Tracing API (4 tests)
# =============================================================================

class TestTracingAPI:
    """Tests for FastAPI tracing endpoints"""

    def test_tracing_api_router_exists(self):
        """Tracing API router should exist"""
        from src.tracing.api import router

        assert router is not None
        assert hasattr(router, "routes")

    def test_get_metrics_endpoint(self, api_client, sample_run_id, sample_metrics):
        """GET /tracing/metrics/{run_id} should return metrics"""
        from src.tracing.api import store_run_metrics

        # Store metrics first
        store_run_metrics(sample_run_id, sample_metrics)

        response = api_client.get(f"/tracing/metrics/{sample_run_id}")

        assert response.status_code == 200
        data = response.json()
        assert data["run_id"] == sample_run_id
        assert data["node_executions"] == 10

    def test_get_summary_endpoint(self, api_client, sample_run_id, sample_metrics):
        """GET /tracing/summary/{run_id} should return summary"""
        from src.tracing.api import store_run_metrics

        store_run_metrics(sample_run_id, sample_metrics)

        response = api_client.get(f"/tracing/summary/{sample_run_id}")

        assert response.status_code == 200
        data = response.json()
        assert "run_id" in data
        assert "duration" in data
        assert "total_nodes" in data

    def test_tracing_health_endpoint(self, api_client):
        """GET /tracing/health should return health status"""
        response = api_client.get("/tracing/health")

        assert response.status_code == 200
        data = response.json()
        assert "status" in data
        assert data["status"] in ["healthy", "degraded", "disabled"]


# =============================================================================
# Test Category 2: Metrics Storage (3 tests)
# =============================================================================

class TestMetricsStorage:
    """Tests for metrics storage functionality"""

    def test_store_run_metrics(self, sample_run_id, sample_metrics):
        """store_run_metrics should store metrics"""
        from src.tracing.api import store_run_metrics, get_stored_metrics, clear_stored_metrics

        clear_stored_metrics()
        store_run_metrics(sample_run_id, sample_metrics)

        stored = get_stored_metrics(sample_run_id)
        assert stored is not None
        assert stored.run_id == sample_run_id

    def test_retrieve_run_metrics(self, sample_run_id, sample_metrics):
        """get_stored_metrics should retrieve stored metrics"""
        from src.tracing.api import store_run_metrics, get_stored_metrics, clear_stored_metrics

        clear_stored_metrics()
        store_run_metrics(sample_run_id, sample_metrics)

        retrieved = get_stored_metrics(sample_run_id)
        assert retrieved is not None
        assert retrieved.tokens_used == 5000
        assert retrieved.node_executions == 10

    def test_metrics_not_found_returns_none(self):
        """get_stored_metrics should return None for unknown run"""
        from src.tracing.api import get_stored_metrics, clear_stored_metrics

        clear_stored_metrics()
        result = get_stored_metrics("nonexistent-run-id")
        assert result is None


# =============================================================================
# Test Category 3: API Integration (3 tests)
# =============================================================================

class TestAPIIntegration:
    """Tests for API integration"""

    def test_metrics_endpoint_returns_json(self, api_client, sample_run_id, sample_metrics):
        """Metrics endpoint should return valid JSON"""
        from src.tracing.api import store_run_metrics

        store_run_metrics(sample_run_id, sample_metrics)

        response = api_client.get(f"/tracing/metrics/{sample_run_id}")

        assert response.headers["content-type"] == "application/json"
        data = response.json()
        assert isinstance(data, dict)

    def test_summary_has_required_fields(self, api_client, sample_run_id, sample_metrics):
        """Summary should include all required fields"""
        from src.tracing.api import store_run_metrics

        store_run_metrics(sample_run_id, sample_metrics)

        response = api_client.get(f"/tracing/summary/{sample_run_id}")
        data = response.json()

        required_fields = [
            "run_id",
            "duration",
            "total_nodes",
            "error_count",
            "total_tokens",
            "total_cost_usd",
        ]

        for field in required_fields:
            assert field in data, f"Missing required field: {field}"

    def test_health_returns_status(self, api_client):
        """Health endpoint should return status information"""
        response = api_client.get("/tracing/health")
        data = response.json()

        assert "status" in data
        assert "tracing_enabled" in data
        assert "stored_runs" in data


# =============================================================================
# Test Category 4: Error Handling (2 tests)
# =============================================================================

class TestErrorHandling:
    """Tests for error handling"""

    def test_invalid_run_id_returns_404(self, api_client):
        """Request for unknown run_id should return 404"""
        from src.tracing.api import clear_stored_metrics

        clear_stored_metrics()

        response = api_client.get("/tracing/metrics/unknown-run-id")

        assert response.status_code == 404
        data = response.json()
        assert "detail" in data or "error" in data

    def test_summary_handles_missing_data(self, api_client):
        """Summary endpoint should handle missing run gracefully"""
        from src.tracing.api import clear_stored_metrics

        clear_stored_metrics()

        response = api_client.get("/tracing/summary/missing-run")

        assert response.status_code == 404


# =============================================================================
# Test Category 5: Module Exports (2 tests)
# =============================================================================

class TestModuleExports:
    """Tests for module-level exports"""

    def test_api_module_exports(self):
        """src.tracing.api should export all utilities"""
        from src.tracing.api import (
            router,
            store_run_metrics,
            get_stored_metrics,
            clear_stored_metrics,
        )

        assert router is not None
        assert callable(store_run_metrics)
        assert callable(get_stored_metrics)
        assert callable(clear_stored_metrics)

    def test_tracing_module_exports_api(self):
        """src.tracing should export API router"""
        from src.tracing import tracing_router

        assert tracing_router is not None
