# Phase 4: Consensus/Multi-Actor Review - Gate 0 Validation

**Date:** 2026-01-25
**Phase:** 4 - Consensus/Multi-Reviewer Pattern
**Status:** Gate 0 Research & Validation

---

## 1. Research Summary

### 1.1 Current Implementation (Post Phase 3)

| File | Lines | Purpose | Status |
|------|-------|---------|--------|
| `nodes/cto.py` | ~50 | Single CTO reviewer | No multi-reviewer |
| `nodes/qa.py` | ~50 | QA validation | No scoring |
| `graph.py` | 100 | Main graph | No consensus flow |

### 1.2 Current Review Flow

```python
# Current: Single CTO approval
qa → cto_master → merge → END

# No parallel reviewers
# No consensus voting
# No score-based routing
```

**Limitations:**
- Single point of approval (CTO only)
- No security review
- No architecture review
- No consensus mechanism
- No score aggregation

---

## 2. Grok's Consensus Pattern Target

### 2.1 Multi-Reviewer Architecture

```
                    ┌─────────────────┐
                    │   CODE READY    │
                    │  (from dev/QA)  │
                    └────────┬────────┘
                             │
           ┌─────────────────┼─────────────────┐
           ▼                 ▼                 ▼
    ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
    │ QA REVIEWER  │  │  SECURITY    │  │ ARCHITECTURE │
    │   (parallel) │  │  REVIEWER    │  │   REVIEWER   │
    └──────┬───────┘  └──────┬───────┘  └──────┬───────┘
           │                 │                 │
           │ {approved, score, feedback}       │
           │                 │                 │
           └─────────────────┼─────────────────┘
                             ▼
                    ┌─────────────────┐
                    │    CONSENSUS    │
                    │   AGGREGATOR    │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
         APPROVED      HUMAN_REVIEW     REJECTED
              │              │              │
              ▼              ▼              ▼
           Merge        Escalate         Failed
```

### 2.2 Consensus Rules

```python
# From Grok's example:
# 1. All reviewers must approve for auto-merge
# 2. Average score must be >= 0.8
# 3. Any score < 0.5 triggers human review
```

---

## 3. Gap Analysis

| Feature | Current | Target | Gap |
|---------|---------|--------|-----|
| QA reviewer node | ❌ | ✅ | Create qa_reviewer_node |
| Security reviewer | ❌ | ✅ | Create security_reviewer_node |
| Architecture reviewer | ❌ | ✅ | Create architecture_reviewer_node |
| ReviewResult schema | ❌ | ✅ | Create ReviewResult TypedDict |
| ConsensusState schema | ❌ | ✅ | Create ConsensusState TypedDict |
| Consensus aggregator | ❌ | ✅ | Create consensus_aggregator |
| Consensus router | ❌ | ✅ | Create consensus_router |
| Review graph | ❌ | ✅ | Create parallel review graph |
| Score thresholds | ❌ | ✅ | Configurable thresholds |

---

## 4. Implementation Plan (TDD)

### Phase 4.1: Review Result Schema

**Tests to write first:**
1. `test_review_result_exists`
2. `test_review_result_has_approved`
3. `test_review_result_has_score`
4. `test_review_result_has_feedback`
5. `test_review_result_has_reviewer`

### Phase 4.2: Reviewer Nodes

**Tests to write first:**
1. `test_qa_reviewer_node_exists`
2. `test_qa_reviewer_returns_review_result`
3. `test_security_reviewer_node_exists`
4. `test_security_reviewer_returns_review_result`
5. `test_architecture_reviewer_node_exists`
6. `test_architecture_reviewer_returns_review_result`

### Phase 4.3: Consensus Aggregator

**Tests to write first:**
1. `test_consensus_aggregator_exists`
2. `test_consensus_all_approved_high_score`
3. `test_consensus_rejected_when_not_all_approved`
4. `test_consensus_human_review_on_low_score`
5. `test_consensus_calculates_average_score`
6. `test_consensus_collects_all_feedback`

### Phase 4.4: Consensus Router

**Tests to write first:**
1. `test_consensus_router_exists`
2. `test_router_returns_merge_on_approved`
3. `test_router_returns_escalate_on_human_review`
4. `test_router_returns_failed_on_rejected`

### Phase 4.5: Review Graph Integration

**Tests to write first:**
1. `test_create_consensus_graph_exists`
2. `test_consensus_graph_has_qa_reviewer`
3. `test_consensus_graph_has_security_reviewer`
4. `test_consensus_graph_has_architecture_reviewer`
5. `test_consensus_graph_has_aggregator`
6. `test_consensus_graph_compiles`

---

## 5. Test File Location

```
tests/test_c4_consensus_review.py
```

**Naming Convention:**
- `test_c1_*` - Hierarchical Supervisor (Phase 1) ✅
- `test_c2_*` - Parallel Execution (Phase 2) ✅
- `test_c3_*` - Retry/Dev-Fix Loop (Phase 3) ✅
- `test_c4_*` - Consensus Review (Phase 4) ← NEW

---

## 6. Success Criteria

| Criteria | Metric | Target |
|----------|--------|--------|
| New tests written | Count | 25 minimum |
| Tests passing | % | 100% |
| Reviewer nodes | Count | 3 (QA, Security, Architecture) |
| Approval threshold | Score | >= 0.8 |
| Human review threshold | Score | < 0.5 |

---

## 7. File Changes Required

### New Files:
1. `tests/test_c4_consensus_review.py` - TDD tests (25+)
2. `src/consensus/__init__.py` - Module exports
3. `src/consensus/review_state.py` - ReviewResult, ConsensusState
4. `src/consensus/aggregator.py` - Consensus aggregation
5. `src/consensus/router.py` - Consensus routing
6. `src/consensus/review_graph.py` - Parallel review graph
7. `nodes/reviewers.py` - QA, Security, Architecture reviewers

### Modified Files:
1. `state.py` - Add reviews field if needed

---

## 8. Gate 0 Validation Checklist

- [x] Read Phase 4 requirements from enhancement plan
- [x] Document current implementation gaps
- [x] Analyze Grok's consensus pattern
- [x] Create gap analysis table
- [x] Define TDD test requirements
- [x] Plan file changes
- [ ] Create TDD test file (next step)
- [ ] Run tests (should fail initially)
- [ ] Implement to make tests pass

---

**Gate 0 Status:** VALIDATED
**Ready for:** TDD Test Creation
