# Phase 10: Cross-Domain Merge Consensus - Gate 0 Validation

**Date:** 2026-01-25
**Phase:** 10 of 11
**Pattern:** Supervisor Consensus for Cross-Domain Merge

---

## Requirements from Grok's Recommendations

### Objective
Implement supervisor consensus for final cross-domain merge, ensuring all domains pass QA and safety checks before merging into the integration branch.

### Key Quote from Grok
> "Supervisor Consensus → Cross-Domain Merge → END (or) Human Review (escalate)"

The supervisor must aggregate results from all domains and make a consensus decision on whether to auto-merge or escalate to human review.

---

## Gap Analysis

### Current Implementation

```python
# Current: src/parallel/aggregator.py
def fan_in_aggregator(state: ParallelState) -> Dict[str, Any]:
    """Basic aggregation without consensus rules"""
    return {
        "aggregated_files": merged_files,
        "all_tests_passed": all_passed,
    }
```

**Limitations:**
- No consensus rules for merge approval
- No safety score threshold checking
- No cross-domain conflict detection
- No escalation routing for edge cases
- Simple aggregation without validation

### Required Implementation (Phase 10)

| Feature | Current | Required |
|---------|---------|----------|
| Consensus rules | ❌ None | ✅ All QA + safety thresholds |
| Safety threshold | ❌ None | ✅ Average safety >= 0.85 |
| Conflict detection | ❌ None | ✅ File/schema/API conflicts |
| Merge routing | ❌ None | ✅ Auto-merge vs escalate |
| Escalation reasons | ❌ None | ✅ Detailed failure context |

---

## Components to Implement

### 1. Cross-Domain Consensus (`src/parallel/cross_domain_consensus.py` - NEW)

```python
class ConsensusResult(TypedDict):
    merge_approved: bool
    merge_type: str  # "auto" or "manual"
    needs_human: bool
    avg_safety_score: float
    escalation_reason: Optional[str]
    failed_domains: List[str]

def cross_domain_consensus(state: ParallelState) -> Dict[str, Any]
def check_all_domains_passed(domain_results: Dict) -> bool
def calculate_average_safety(domain_results: Dict) -> float
def build_escalation_reason(failures: Dict) -> str
def consensus_router(state: Dict) -> str  # "auto_merge" or "escalate"
```

### 2. Conflict Detector (`src/git/conflict_detector.py` - NEW)

```python
@dataclass
class ConflictResult:
    has_conflicts: bool
    conflicting_files: Dict[str, List[str]]  # file -> [domains]
    conflict_type: str  # "file", "schema", "api"
    severity: str  # "blocking", "warning"

def check_cross_domain_conflicts(domain_results: Dict) -> ConflictResult
def detect_file_conflicts(domain_results: Dict) -> List[str]
def detect_schema_conflicts(domain_results: Dict) -> List[str]
def detect_api_conflicts(domain_results: Dict) -> List[str]
```

### 3. Consensus Constants (`src/parallel/consensus_constants.py` - NEW)

```python
SAFETY_THRESHOLD = 0.85
MIN_DOMAINS_FOR_CONSENSUS = 1
BLOCKING_CONFLICT_TYPES = ["schema", "api"]
```

---

## Test Categories (TDD)

### 1. Consensus Logic Tests (8 tests)
- `test_consensus_result_exists`
- `test_cross_domain_consensus_exists`
- `test_check_all_domains_passed_exists`
- `test_check_all_domains_passed_returns_true_when_all_pass`
- `test_check_all_domains_passed_returns_false_when_any_fail`
- `test_calculate_average_safety_exists`
- `test_calculate_average_safety_computes_correctly`
- `test_build_escalation_reason_exists`

### 2. Conflict Detection Tests (7 tests)
- `test_conflict_result_exists`
- `test_check_cross_domain_conflicts_exists`
- `test_detect_file_conflicts_exists`
- `test_detect_file_conflicts_finds_overlaps`
- `test_detect_schema_conflicts_exists`
- `test_detect_api_conflicts_exists`
- `test_conflict_result_has_severity`

### 3. Merge Routing Tests (5 tests)
- `test_consensus_router_exists`
- `test_consensus_router_returns_auto_merge_when_approved`
- `test_consensus_router_returns_escalate_when_rejected`
- `test_consensus_approves_when_all_conditions_met`
- `test_consensus_rejects_when_safety_below_threshold`

**Total: 20 tests**

---

## Implementation Order

1. **Create consensus_constants.py** - Threshold values
2. **Create conflict_detector.py** - Conflict detection logic
3. **Create cross_domain_consensus.py** - Consensus rules and routing
4. **Update __init__.py files** - Export new components

---

## Success Criteria

- [ ] All 20 TDD tests pass
- [ ] Full test suite (462 + 20 = 482) passes
- [ ] Consensus approves only when all domains pass QA
- [ ] Consensus approves only when avg safety >= 0.85
- [ ] Conflicts are detected and block auto-merge
- [ ] Escalation reasons are clear and actionable

---

## Example: Consensus Decision Flow

```
Input:
  domain_results: {
    "auth": {qa_passed: true, safety_score: 0.92, files: ["auth.py"]},
    "payments": {qa_passed: true, safety_score: 0.88, files: ["pay.py"]},
    "profile": {qa_passed: true, safety_score: 0.85, files: ["profile.py"]}
  }

Consensus Checks:
  1. All QA passed? ✓ (auth, payments, profile all passed)
  2. Avg safety >= 0.85? ✓ ((0.92 + 0.88 + 0.85) / 3 = 0.883)
  3. No file conflicts? ✓ (no overlapping files)
  4. No schema conflicts? ✓
  5. No API conflicts? ✓

Result:
  {
    merge_approved: true,
    merge_type: "auto",
    needs_human: false,
    avg_safety_score: 0.883
  }
```

---

## Example: Escalation Flow

```
Input:
  domain_results: {
    "auth": {qa_passed: true, safety_score: 0.92, files: ["shared/types.ts"]},
    "payments": {qa_passed: false, safety_score: 0.75, files: ["shared/types.ts"]},
  }

Consensus Checks:
  1. All QA passed? ✗ (payments failed)
  2. Avg safety >= 0.85? ✗ ((0.92 + 0.75) / 2 = 0.835)
  3. No file conflicts? ✗ (shared/types.ts modified by both)

Result:
  {
    merge_approved: false,
    merge_type: "manual",
    needs_human: true,
    avg_safety_score: 0.835,
    escalation_reason: "QA failed for: payments. File conflicts: shared/types.ts"
  }
```

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                   CROSS-DOMAIN CONSENSUS                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Domain Results (from parallel execution)                        │
│    ↓                                                            │
│  ┌──────────────────────┐                                       │
│  │   AGGREGATE RESULTS  │                                       │
│  │   - Collect QA status│                                       │
│  │   - Collect safety   │                                       │
│  │   - Collect files    │                                       │
│  └──────────┬───────────┘                                       │
│             ↓                                                    │
│  ┌──────────────────────┐                                       │
│  │  CONFLICT DETECTION  │                                       │
│  │   - File overlaps    │                                       │
│  │   - Schema conflicts │                                       │
│  │   - API conflicts    │                                       │
│  └──────────┬───────────┘                                       │
│             ↓                                                    │
│  ┌──────────────────────┐                                       │
│  │   CONSENSUS RULES    │                                       │
│  │   - All QA passed?   │                                       │
│  │   - Safety >= 0.85?  │                                       │
│  │   - No conflicts?    │                                       │
│  └──────────┬───────────┘                                       │
│             ↓                                                    │
│       ┌─────┴─────┐                                             │
│       ↓           ↓                                             │
│  ┌─────────┐ ┌──────────┐                                       │
│  │  AUTO   │ │ ESCALATE │                                       │
│  │  MERGE  │ │ (human)  │                                       │
│  └─────────┘ └──────────┘                                       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Notes

- Safety threshold of 0.85 is configurable via constants
- Conflict detection runs before consensus decision
- Escalation always includes detailed reason for human review
- Auto-merge requires ALL conditions to pass (AND logic)
- Any failure triggers escalation (fail-safe approach)
