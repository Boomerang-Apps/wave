"""
LangSmith Tracing API Module
Phase LangSmith-5: Portal Integration

Provides FastAPI endpoints for tracing metrics:
    - GET /tracing/metrics/{run_id} - Get run metrics
    - GET /tracing/summary/{run_id} - Get run summary
    - GET /tracing/health - Health check

Includes in-memory storage for run metrics.
"""

import threading
from typing import Optional, Dict, Any

from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse

from .metrics import RunMetrics, get_run_summary as compute_run_summary
from .manager import is_tracing_active


# =============================================================================
# METRICS STORAGE
# =============================================================================

# In-memory storage for run metrics (thread-safe)
_metrics_storage: Dict[str, RunMetrics] = {}
_storage_lock = threading.Lock()


def store_run_metrics(run_id: str, metrics: RunMetrics) -> None:
    """
    Store metrics for a run.

    Args:
        run_id: Unique run identifier
        metrics: RunMetrics to store
    """
    with _storage_lock:
        _metrics_storage[run_id] = metrics


def get_stored_metrics(run_id: str) -> Optional[RunMetrics]:
    """
    Retrieve stored metrics for a run.

    Args:
        run_id: Unique run identifier

    Returns:
        RunMetrics or None if not found
    """
    with _storage_lock:
        return _metrics_storage.get(run_id)


def clear_stored_metrics() -> None:
    """Clear all stored metrics (for testing)."""
    with _storage_lock:
        _metrics_storage.clear()


def get_all_run_ids() -> list:
    """Get list of all stored run IDs."""
    with _storage_lock:
        return list(_metrics_storage.keys())


# =============================================================================
# API ROUTER
# =============================================================================

router = APIRouter(prefix="/tracing", tags=["tracing"])


@router.get("/metrics/{run_id}")
async def get_run_metrics(run_id: str) -> JSONResponse:
    """
    Get metrics for a specific run.

    Args:
        run_id: Unique run identifier

    Returns:
        JSON with run metrics

    Raises:
        HTTPException: 404 if run not found
    """
    metrics = get_stored_metrics(run_id)

    if metrics is None:
        raise HTTPException(
            status_code=404,
            detail=f"Metrics not found for run: {run_id}"
        )

    return JSONResponse(content=metrics.to_dict())


@router.get("/summary/{run_id}")
async def get_run_summary_endpoint(run_id: str) -> JSONResponse:
    """
    Get human-readable summary for a run.

    Args:
        run_id: Unique run identifier

    Returns:
        JSON with run summary

    Raises:
        HTTPException: 404 if run not found
    """
    metrics = get_stored_metrics(run_id)

    if metrics is None:
        raise HTTPException(
            status_code=404,
            detail=f"Metrics not found for run: {run_id}"
        )

    summary = compute_run_summary(metrics)
    return JSONResponse(content=summary)


@router.get("/health")
async def tracing_health() -> JSONResponse:
    """
    Check tracing subsystem health.

    Returns:
        JSON with health status
    """
    tracing_enabled = is_tracing_active()
    stored_runs = len(get_all_run_ids())

    if tracing_enabled:
        status = "healthy"
    elif stored_runs > 0:
        status = "degraded"
    else:
        status = "disabled"

    return JSONResponse(content={
        "status": status,
        "tracing_enabled": tracing_enabled,
        "stored_runs": stored_runs,
    })


@router.get("/runs")
async def list_runs() -> JSONResponse:
    """
    List all stored run IDs.

    Returns:
        JSON with list of run IDs
    """
    run_ids = get_all_run_ids()
    return JSONResponse(content={
        "runs": run_ids,
        "count": len(run_ids),
    })


# =============================================================================
# EXPORTS
# =============================================================================

__all__ = [
    "router",
    "store_run_metrics",
    "get_stored_metrics",
    "clear_stored_metrics",
    "get_all_run_ids",
]
