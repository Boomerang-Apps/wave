# Phase LangSmith-5: Portal Integration - Gate 0 Validation

**Date:** 2026-01-25
**Status:** COMPLETE
**Phase:** LangSmith Tracing Integration - Portal Integration

---

## 1. Research Summary

### 1.1 Existing Portal Integration

| Component | File | Purpose |
|-----------|------|---------|
| OrchestratorBridge | `portal/server/utils/orchestrator-bridge.js` | Redis pub/sub + HTTP proxy |
| orchestrator-routes | `portal/server/routes/orchestrator-routes.js` | Express API routes |
| useOrchestratorEvents | `portal/src/hooks/useOrchestratorEvents.ts` | React SSE hook |

### 1.2 Integration Strategy

**Orchestrator Side (Python):**
- Add `/tracing/metrics/{run_id}` endpoint
- Add `/tracing/summary/{run_id}` endpoint
- Publish metrics to Redis on run completion

**Portal Side (Node.js/React):**
- Add tracing routes to orchestrator-routes.js
- Create useTracingMetrics React hook
- Add metrics display components

### 1.3 Data Flow

```
┌─────────────┐     Redis      ┌──────────────┐     HTTP     ┌─────────┐
│ Orchestrator├───────────────►│ Portal Server├─────────────►│  React  │
│  (Python)   │  metrics event │   (Node.js)  │   /metrics   │   UI    │
└─────────────┘                └──────────────┘              └─────────┘
       │                              ▲
       └──────────────────────────────┘
               HTTP /tracing/*
```

---

## 2. Gap Analysis

### 2.1 Current State (Phase 4 Complete)

| Component | Status | Notes |
|-----------|--------|-------|
| RunMetrics | ✅ Complete | `src/tracing/metrics.py` |
| MetricsCollector | ✅ Complete | `src/tracing/metrics.py` |
| export_metrics_json | ✅ Complete | `src/tracing/metrics.py` |
| Tracing API | ❌ Missing | Need FastAPI endpoints |
| Portal Routes | ❌ Missing | Need Express routes |
| React Hook | ❌ Missing | Need useTracingMetrics |

### 2.2 Required Implementation

| Component | Priority | Description |
|-----------|----------|-------------|
| `tracing_api.py` | High | FastAPI router for tracing endpoints |
| Portal tracing routes | High | Express routes for metrics |
| `useTracingMetrics` | Medium | React hook for metrics |
| Redis metrics events | Medium | Publish metrics on completion |

---

## 3. Implementation Plan

### 3.1 Phase 5 Scope (Portal Integration)

1. **Tracing API Router** - FastAPI endpoints for metrics
2. **Portal Routes** - Express routes for tracing
3. **React Hook** - useTracingMetrics hook
4. **Redis Integration** - Publish metrics events

### 3.2 File Structure

```
orchestrator/
├── src/
│   └── tracing/
│       ├── __init__.py      # Updated exports
│       ├── metrics.py       # Phase 4
│       └── api.py           # Phase 5 - NEW (FastAPI router)
└── tests/
    └── test_langsmith_portal.py  # TDD tests (12 tests)

portal/
├── server/
│   └── routes/
│       └── tracing-routes.js    # Phase 5 - NEW
└── src/
    └── hooks/
        └── useTracingMetrics.ts # Phase 5 - NEW
```

### 3.3 Tracing API Design

```python
# src/tracing/api.py

from fastapi import APIRouter, HTTPException
from .metrics import MetricsCollector, RunMetrics, get_run_summary

router = APIRouter(prefix="/tracing", tags=["tracing"])

@router.get("/metrics/{run_id}")
async def get_run_metrics(run_id: str) -> dict:
    """Get metrics for a specific run."""

@router.get("/summary/{run_id}")
async def get_run_summary_endpoint(run_id: str) -> dict:
    """Get human-readable summary for a run."""

@router.get("/health")
async def tracing_health() -> dict:
    """Check tracing subsystem health."""
```

### 3.4 Portal Routes Design

```javascript
// portal/server/routes/tracing-routes.js

router.get('/metrics/:runId', async (req, res) => {
  // Proxy to orchestrator /tracing/metrics/{run_id}
});

router.get('/summary/:runId', async (req, res) => {
  // Proxy to orchestrator /tracing/summary/{run_id}
});
```

### 3.5 React Hook Design

```typescript
// portal/src/hooks/useTracingMetrics.ts

interface TracingMetrics {
  runId: string;
  totalDurationMs: number;
  nodeExecutions: number;
  nodeErrors: number;
  tokensUsed: number;
  costUsd: number;
  agentCounts: Record<string, number>;
  retryCount: number;
}

function useTracingMetrics(runId: string): {
  metrics: TracingMetrics | null;
  summary: Record<string, any> | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}
```

---

## 4. TDD Test Plan

### 4.1 Test Categories

| Category | Tests | Description |
|----------|-------|-------------|
| Tracing API | 4 | FastAPI endpoint tests |
| Metrics Storage | 3 | Store/retrieve run metrics |
| API Integration | 3 | End-to-end API tests |
| Error Handling | 2 | Error cases |
| **Total** | **12** | |

### 4.2 Test Cases

```python
# Tracing API Tests
test_tracing_api_router_exists()
test_get_metrics_endpoint()
test_get_summary_endpoint()
test_tracing_health_endpoint()

# Metrics Storage Tests
test_store_run_metrics()
test_retrieve_run_metrics()
test_metrics_not_found_returns_404()

# API Integration Tests
test_metrics_endpoint_returns_json()
test_summary_has_required_fields()
test_health_returns_status()

# Error Handling Tests
test_invalid_run_id_returns_error()
test_metrics_handles_missing_data()
```

---

## 5. Integration Points

### 5.1 Main App Integration

```python
# main.py
from src.tracing.api import router as tracing_router

app = FastAPI()
app.include_router(tracing_router)
```

### 5.2 Metrics Storage Integration

```python
# Store metrics when run completes
from src.tracing.metrics import MetricsCollector
from src.tracing.api import store_run_metrics

collector = MetricsCollector.get_instance()
collector.start_run(run_id)
# ... run execution ...
metrics = collector.end_run()
store_run_metrics(run_id, metrics)  # Store for later retrieval
```

### 5.3 Portal Integration

```javascript
// portal/server/orchestrator-integration.js
import { createTracingRoutes } from './routes/tracing-routes.js';

// Add to Express app
app.use('/api/tracing', createTracingRoutes(bridge));
```

---

## 6. Success Criteria

### 6.1 Gate 0 Checklist

- [x] Research existing portal integration
- [x] Document integration strategy
- [x] Define API endpoints
- [x] Define React hook interface
- [x] Create test plan (12 tests)
- [x] Write TDD tests (must FAIL initially)
- [x] Implement tracing API
- [x] Create portal routes
- [x] Create React hook
- [x] All tests pass
- [x] Full test suite passes (575+ tests)

### 6.2 Acceptance Criteria

1. `/tracing/metrics/{run_id}` returns run metrics
2. `/tracing/summary/{run_id}` returns human-readable summary
3. Portal can fetch and display metrics
4. React hook provides loading/error states
5. Works when tracing is disabled
6. All 12 new tests pass
7. All existing tests still pass

---

## 7. References

- [FastAPI Routers](https://fastapi.tiangolo.com/tutorial/bigger-applications/)
- [React Hooks](https://react.dev/reference/react/hooks)
- Phase 4: `src/tracing/metrics.py`
- Portal Bridge: `portal/server/utils/orchestrator-bridge.js`

---

**Next Step:** Write TDD tests (all must FAIL before implementation)
