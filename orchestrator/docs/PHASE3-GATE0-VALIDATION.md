# Phase 3: Enhanced Retry/Dev-Fix Loop - Gate 0 Validation

**Date:** 2026-01-25
**Phase:** 3 - Cyclic Retry with Dev-Fix Agent
**Status:** Gate 0 Research & Validation

---

## 1. Research Summary

### 1.1 Current Implementation (Post Phase 2)

| File | Lines | Purpose | Status |
|------|-------|---------|--------|
| `state.py` | 154 | WAVEState with retry_count | Basic counter only |
| `nodes/qa.py` | ~50 | QA node | No retry routing |
| `graph.py` | 100 | Main graph | No dev-fix cycle |

### 1.2 Current Retry Behavior

```python
# Current WAVEState has:
retry_count: int  # Simple counter, no max or backoff

# Current graph flow:
dev → safety_gate → qa → supervisor → END
# No cycle back to fix failures
```

**Limitations:**
- No dedicated Dev-Fix agent for targeted fixes
- No max retry limit enforcement
- No exponential backoff
- No QA feedback tracking
- No human escalation on failure
- No cyclic retry loop in graph

---

## 2. Grok's Retry Pattern Target

### 2.1 Dev-Fix Cycle Architecture

```
                    ┌─────────────────┐
                    │      DEV        │
                    │  (initial impl) │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │  CONSTITUTIONAL │
                    │   (safety check)│
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
              ┌─────│       QA        │─────┐
              │     │   (validate)    │     │
              │     └─────────────────┘     │
              │                             │
         PASS │                             │ FAIL
              │                             │
              ▼                             ▼
    ┌─────────────────┐           ┌─────────────────┐
    │   CTO MASTER    │           │    DEV-FIX      │
    │  (approve)      │           │ (targeted fix)  │
    └─────────────────┘           └────────┬────────┘
                                           │
                                           │ retry_count < max?
                                           │
                              ┌────────────┴────────────┐
                              │ YES                     │ NO
                              ▼                         ▼
                    ┌─────────────────┐       ┌─────────────────┐
                    │  CONSTITUTIONAL │       │ HUMAN ESCALATE  │
                    │   (re-check)    │       │  (needs_human)  │
                    └────────┬────────┘       └─────────────────┘
                             │
                             ▼
                         (back to QA)
```

### 2.2 Target Implementation

```python
# From Grok's example in LANGGRAPH-ENHANCEMENT-PLAN.md

class RetryState(TypedDict):
    count: int
    max_retries: int
    last_error: str
    backoff_seconds: float

def dev_fix_node(state: WAVEState) -> dict:
    """Specialized agent for fixing QA failures"""
    if retry_count >= max_retries:
        return {"next": "escalate_human"}
    # Generate targeted fix
    return {"retry": {..., "count": retry_count + 1}, "next": "qa"}

def qa_retry_router(state: WAVEState) -> str:
    """Route after QA with exponential backoff consideration"""
    if state["qa_passed"]: return "cto_master"
    if safety_score < 0.3: return "escalate_human"
    if retry_count >= max_retries: return "escalate_human"
    return "dev_fix"
```

---

## 3. Gap Analysis

| Feature | Current | Target | Gap |
|---------|---------|--------|-----|
| RetryState schema | ❌ | ✅ | Add RetryState TypedDict |
| qa_passed field | ❌ | ✅ | Add to WAVEState |
| qa_feedback field | ❌ | ✅ | Add to WAVEState |
| Dev-Fix node | ❌ | ✅ | Create nodes/dev_fix.py |
| Retry router | ❌ | ✅ | Create src/retry/retry_router.py |
| Exponential backoff | ❌ | ✅ | Calculate backoff_seconds |
| Human escalation | ❌ | ✅ | Create escalation node |
| Cyclic graph edges | ❌ | ✅ | Add dev_fix → constitutional → qa cycle |
| Max retry enforcement | ❌ | ✅ | Check and escalate |

---

## 4. Implementation Plan (TDD)

### Phase 3.1: Retry State Schema

**Tests to write first:**
1. `test_retry_state_exists`
2. `test_retry_state_has_count`
3. `test_retry_state_has_max_retries`
4. `test_retry_state_has_last_error`
5. `test_retry_state_has_backoff_seconds`
6. `test_wave_state_has_retry_field`
7. `test_wave_state_has_qa_passed`
8. `test_wave_state_has_qa_feedback`

### Phase 3.2: Dev-Fix Agent Node

**Tests to write first:**
1. `test_dev_fix_node_exists`
2. `test_dev_fix_node_returns_dict`
3. `test_dev_fix_increments_retry_count`
4. `test_dev_fix_escalates_at_max_retries`
5. `test_dev_fix_uses_qa_feedback`
6. `test_dev_fix_calculates_backoff`

### Phase 3.3: Retry Router

**Tests to write first:**
1. `test_qa_retry_router_exists`
2. `test_router_returns_cto_on_pass`
3. `test_router_returns_dev_fix_on_fail`
4. `test_router_escalates_at_max_retries`
5. `test_router_escalates_on_safety_violation`
6. `test_calculate_backoff_exponential`

### Phase 3.4: Human Escalation

**Tests to write first:**
1. `test_human_escalation_node_exists`
2. `test_escalation_sets_needs_human`
3. `test_escalation_records_reason`
4. `test_escalation_pauses_workflow`

### Phase 3.5: Retry Graph Integration

**Tests to write first:**
1. `test_retry_graph_has_dev_fix_node`
2. `test_retry_graph_has_escalation_node`
3. `test_qa_routes_to_dev_fix`
4. `test_dev_fix_routes_to_constitutional`
5. `test_graph_handles_retry_cycle`

---

## 5. Test File Location

```
tests/test_c3_retry_loop.py
```

**Naming Convention:**
- `test_c1_*` - Hierarchical Supervisor (Phase 1) ✅
- `test_c2_*` - Parallel Execution (Phase 2) ✅
- `test_c3_*` - Retry/Dev-Fix Loop (Phase 3) ← NEW

---

## 6. Success Criteria

| Criteria | Metric | Target |
|----------|--------|--------|
| New tests written | Count | 25 minimum |
| Tests passing | % | 100% |
| RetryState fields | Count | 4 fields |
| Max retries | Default | 3 |
| Backoff multiplier | Factor | 2x exponential |

---

## 7. File Changes Required

### New Files:
1. `tests/test_c3_retry_loop.py` - TDD tests (25+)
2. `src/retry/__init__.py` - Module exports
3. `src/retry/retry_state.py` - RetryState TypedDict
4. `src/retry/retry_router.py` - QA retry routing
5. `src/retry/backoff.py` - Exponential backoff
6. `nodes/dev_fix.py` - Dev-Fix agent node
7. `nodes/human_escalation.py` - Human escalation node

### Modified Files:
1. `state.py` - Add retry, qa_passed, qa_feedback fields
2. `graph.py` - Add dev_fix cycle and escalation

---

## 8. Gate 0 Validation Checklist

- [x] Read Phase 3 requirements from enhancement plan
- [x] Document current implementation gaps
- [x] Analyze Grok's retry pattern
- [x] Create gap analysis table
- [x] Define TDD test requirements
- [x] Plan file changes
- [ ] Create TDD test file (next step)
- [ ] Run tests (should fail initially)
- [ ] Implement to make tests pass

---

## 9. Implementation Complete

**Date Completed:** 2026-01-25

### Test Results

```
TDD Tests (Phase 3): 46/46 PASSED
Full Test Suite:    282/282 PASSED
```

### Files Created

| File | Lines | Purpose |
|------|-------|---------|
| `tests/test_c3_retry_loop.py` | 420+ | TDD tests (46 tests) |
| `src/retry/__init__.py` | 50 | Module exports |
| `src/retry/retry_state.py` | 50 | RetryState TypedDict |
| `src/retry/backoff.py` | 70 | Exponential backoff |
| `src/retry/retry_router.py` | 100 | QA retry routing |
| `src/retry/retry_graph.py` | 100 | Retry cycle graph |
| `nodes/dev_fix.py` | 90 | Dev-Fix agent node |
| `nodes/human_escalation.py` | 80 | Human escalation node |

### Key Features Implemented

1. **RetryState** - count, max_retries, last_error, backoff_seconds
2. **Dev-Fix Node** - Targeted fix generation, retry tracking
3. **Exponential Backoff** - 2^n seconds with max cap at 300s
4. **QA Retry Router** - Routes to dev_fix, escalate_human, or cto_master
5. **Human Escalation** - Pauses workflow, records reason
6. **Retry Graph** - Cyclic graph: qa → dev_fix → constitutional → qa

---

**Gate 0 Status:** COMPLETE
**Phase 3 Status:** COMPLETE
**Tests:** 282/282 passing (100%)
