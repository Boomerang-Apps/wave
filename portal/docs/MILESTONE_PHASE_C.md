# Phase C Milestone: Portal API Extensions

## Milestone Information

| Field | Value |
|-------|-------|
| **Phase** | C - Portal API Extensions |
| **Start Tag** | `v2.0.0-phase-c-start` |
| **Started** | 2026-01-25 |
| **Status** | 🔄 In Progress |
| **Dependencies** | Phase A & B (Complete) |

---

## Objective

Extend the Portal API (Node.js/Express) to communicate with the Python orchestrator, enabling:
- Orchestrator run management from portal
- Real-time status updates via SSE
- Integration with existing agent workflows

---

## Rollback Plan

### Quick Rollback Commands

```bash
# If Phase C fails, rollback to Phase B completion:
cd /Volumes/SSD-01/Projects/WAVE

# Reset to Phase B completion
git checkout v2.0.0-phase-b-complete

# Or selectively revert portal files
git checkout v2.0.0-phase-b-complete -- portal/server/
```

---

## Task Checklist

### C.1: OrchestratorClient Module
- [ ] Gate 0 Complete
- [ ] Tests Written
- [ ] Implementation Complete
- [ ] Tests Passing

### C.2: Portal API Endpoints
- [ ] Gate 0 Complete
- [ ] Tests Written
- [ ] Implementation Complete
- [ ] Tests Passing

### C.3: SSE Real-time Updates
- [ ] Gate 0 Complete
- [ ] Tests Written
- [ ] Implementation Complete
- [ ] Tests Passing

### C.4: Integration Test
- [ ] All Unit Tests Pass
- [ ] Integration Tests Pass
- [ ] Manual Verification
- [ ] Tag Created: `v2.0.0-phase-c-complete`

---

## Acceptance Criteria (Phase C)

1. ✅ OrchestratorClient class for HTTP communication
2. ✅ POST /api/orchestrator/runs - Create orchestrator run
3. ✅ GET /api/orchestrator/runs/:runId - Get run status
4. ✅ GET /api/orchestrator/runs/:runId/stream - SSE status stream
5. ✅ Health check integration
6. ✅ Error handling and retries
7. ✅ All tests pass

---

## API Design

### New Endpoints

```
POST /api/orchestrator/runs
  Request: { task, projectPath, branch?, tokenLimit?, costLimit? }
  Response: { success, runId, status, message }

GET /api/orchestrator/runs/:runId
  Response: { runId, status, task, currentAgent, actionsCount, createdAt }

GET /api/orchestrator/runs/:runId/stream
  Response: SSE stream with real-time updates

GET /api/orchestrator/health
  Response: { status, orchestratorStatus, version }
```

---

## Progress Log

| Timestamp | Task | Status | Notes |
|-----------|------|--------|-------|
| 2026-01-25 | Phase C Start | ✅ | Tag created |
| | | | |

