# Gate 0 Research Report: Item #4 - Workflow Reset API Endpoint

## Overview

**Item:** Workflow Reset API Endpoint
**Proposed by:** Grok
**Researcher:** Claude Opus 4.5
**Date:** 2026-01-28
**Status:** Research Complete - **VALIDATED**

---

## 1. Current State Analysis

### Existing Workflow Endpoints

| File | Endpoint | Purpose |
|------|----------|---------|
| `main.py` | `POST /runs` | Start new run |
| `main.py` | `GET /runs/{run_id}` | Get run status |
| `endpoints.py` | `POST /workflow/start` | Start workflow |
| `endpoints.py` | `POST /workflow/{id}/run` | Execute workflow |
| `endpoints.py` | `GET /workflow/{id}/status` | Get status |
| `endpoints.py` | `POST /workflow/{id}/stop` | Stop workflow |
| `endpoints.py` | `GET /workflows` | List all |

### Missing Endpoint

**`POST /workflow/{id}/reset`** - Clean up stuck workflow state and allow retry.

### Redis Key Structure

From `task_queue.py`:
```python
# Task data
wave:task:{task_id}    # Hash: data, status, queue, enqueued_at, etc.

# Results
wave:result:{task_id}  # String: JSON TaskResult

# Queues
wave:tasks:pm          # List: task IDs
wave:tasks:fe          # List: task IDs
wave:tasks:be          # List: task IDs
wave:tasks:qa          # List: task IDs
wave:tasks:safety      # List: task IDs
wave:results           # Pub/sub channel
```

---

## 2. Why This Matters

### Problem: Stuck Workflows

Workflows can get stuck in various states:
1. Task enqueued but never picked up (agent crash)
2. Task in progress but agent died
3. Result submitted but orchestrator didn't receive
4. Safety block with no clear path forward

### Current Workaround (Manual)

```bash
# Connect to Redis
redis-cli

# Find stuck tasks
KEYS wave:task:*

# Delete individual keys
DEL wave:task:{task_id}
DEL wave:result:{task_id}
```

This is error-prone and requires manual intervention.

---

## 3. Recommendation: Reset Endpoint

### API Design

```http
POST /workflow/{thread_id}/reset
Content-Type: application/json

{
    "clear_tasks": true,      # Clear pending tasks
    "clear_results": true,    # Clear stored results
    "reset_to_gate": 0,       # Optional: reset to specific gate
    "reason": "Manual reset"  # Audit trail
}
```

### Response

```json
{
    "success": true,
    "thread_id": "WAVE1-FE-002-abc123",
    "cleared": {
        "tasks": 3,
        "results": 2,
        "queues": ["fe", "qa"]
    },
    "new_state": {
        "gate": 0,
        "phase": "pending"
    }
}
```

---

## 4. Implementation Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                  Workflow Reset Handler                      │
├─────────────────────────────────────────────────────────────┤
│  1. Validate thread_id exists                               │
│  2. Stop any running tasks (set status=cancelled)           │
│  3. Clear Redis keys by pattern:                            │
│     - wave:task:{thread_id}*                                │
│     - wave:result:{thread_id}*                              │
│  4. Remove from domain queues                               │
│  5. Reset in-memory state (WorkflowManager)                 │
│  6. Optionally reset to specific gate                       │
│  7. Log reset action for audit                              │
│  8. Return cleanup summary                                  │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. TDD Implementation Plan

### Tests to Write FIRST

```python
class TestWorkflowReset:

    def test_reset_clears_redis_tasks(self):
        """Reset should clear all tasks for workflow."""
        manager = WorkflowManager()
        manager.reset_workflow("thread-123")
        # Verify Redis keys deleted

    def test_reset_clears_redis_results(self):
        """Reset should clear all results for workflow."""
        manager = WorkflowManager()
        manager.reset_workflow("thread-123", clear_results=True)
        # Verify result keys deleted

    def test_reset_removes_from_queues(self):
        """Reset should remove pending tasks from domain queues."""
        manager = WorkflowManager()
        # Enqueue task
        manager.reset_workflow("thread-123")
        # Verify queue is empty

    def test_reset_resets_gate(self):
        """Reset should optionally reset to specific gate."""
        manager = WorkflowManager()
        manager.reset_workflow("thread-123", reset_to_gate=2)
        status = manager.get_status("thread-123")
        assert status.gate == 2

    def test_reset_unknown_workflow_fails(self):
        """Reset should fail for unknown workflow."""
        manager = WorkflowManager()
        result = manager.reset_workflow("nonexistent")
        assert result.success is False

    def test_reset_returns_cleanup_summary(self):
        """Reset should return summary of cleared items."""
        manager = WorkflowManager()
        result = manager.reset_workflow("thread-123")
        assert "cleared" in result.data
        assert "tasks" in result.data["cleared"]
```

---

## 6. Files to Create/Modify

### Modify

| File | Change |
|------|--------|
| `src/api/endpoints.py` | Add `/workflow/{id}/reset` endpoint |
| `src/api/endpoints.py` | Add `reset_workflow()` to WorkflowManager |
| `src/task_queue.py` | Add `clear_workflow_tasks()` method |

### Create

| File | Purpose |
|------|---------|
| `tests/test_workflow_reset.py` | TDD tests |

---

## 7. Security Considerations

1. **Authentication**: Reset should require authentication
2. **Rate limiting**: Prevent abuse of reset endpoint
3. **Audit logging**: Log all reset actions with user/reason
4. **Confirmation**: Consider requiring confirmation for production

---

## 8. Conclusion

| Aspect | Finding |
|--------|---------|
| Grok's Recommendation | **VALIDATED** |
| Current Gap | No way to programmatically reset stuck workflows |
| Impact | HIGH - Reduces manual intervention |
| Effort | MEDIUM - 45 minutes |
| Risk | LOW - Additive endpoint |

**Implementation Ready:** Yes, proceed with TDD.

---

## 9. Redis Cleanup Pattern

```python
def clear_workflow_tasks(self, thread_id: str) -> dict:
    """
    Clear all Redis keys for a workflow.

    Pattern: wave:*:{task_id}* where task_id contains thread_id
    """
    cleared = {"tasks": 0, "results": 0, "queues": []}

    # Find all task keys for this workflow
    task_pattern = f"wave:task:*{thread_id}*"
    for key in self.redis.scan_iter(task_pattern):
        self.redis.delete(key)
        cleared["tasks"] += 1

    # Find all result keys
    result_pattern = f"wave:result:*{thread_id}*"
    for key in self.redis.scan_iter(result_pattern):
        self.redis.delete(key)
        cleared["results"] += 1

    # Remove from queues (need to scan each queue)
    for queue in DomainQueue:
        if queue == DomainQueue.RESULTS:
            continue
        # LREM removes matching elements
        removed = self.redis.lrem(queue.value, 0, thread_id)
        if removed > 0:
            cleared["queues"].append(queue.name)

    return cleared
```
