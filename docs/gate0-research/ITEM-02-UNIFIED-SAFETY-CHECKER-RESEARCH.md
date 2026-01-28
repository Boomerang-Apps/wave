# Gate 0 Research Report: Item #2 - Unified SafetyChecker Class

## Overview

**Item:** Unified SafetyChecker Class
**Proposed by:** Grok
**Researcher:** Claude Opus 4.5
**Date:** 2026-01-28
**Status:** Research Complete - **VALIDATED (CRITICAL)**

---

## 1. Critical Finding: THREE Overlapping Implementations

### Evidence of Duplication

| File | Implementation | Lines | Last Modified |
|------|---------------|-------|---------------|
| `src/safety/constitutional.py` | `ConstitutionalChecker` class | 763 | 2026-01-27 |
| `tools/constitutional_scorer.py` | `score_action()` function | 250 | 2026-01-27 |
| `src/agent_worker.py` | `ConstitutionalSafety` class | ~100 | 2026-01-28 |

### Feature Comparison

| Feature | constitutional.py | constitutional_scorer.py | agent_worker.py |
|---------|------------------|--------------------------|-----------------|
| Pattern matching | ✅ | ✅ | ✅ |
| Domain awareness (FE/BE) | ❌ | ❌ | ✅ |
| Server-side file detection | ✅ | ❌ | ❌ |
| Server-side content detection | ✅ | ❌ | ❌ |
| Grok LLM integration | ✅ | ❌ | ❌ |
| WAVE_PRINCIPLES (P001-P006) | ✅ | ❌ | ❌ |
| P006 explicit triggers | ✅ | ❌ | ❌ |
| Escalation levels | ✅ | ✅ | ❌ |
| Configurable threshold | ✅ | ✅ | ✅ |

### Root Cause of False Positives

The **`api_key =`** pattern that blocked WAVE1-FE-002 exists ONLY in `agent_worker.py`:

```python
# src/agent_worker.py lines 83-86
FE_ONLY_DANGEROUS = [
    "private_key",
    "api_key =",  # <-- THIS IS THE PROBLEM
]
```

This pattern is NOT in `constitutional.py` which has proper server-side awareness!

---

## 2. Why This Matters

### Current State (Broken)

```
User dispatches WAVE1-FE-002
    ↓
agent_worker.py runs
    ↓
ConstitutionalSafety.score() called  <-- Uses its own patterns
    ↓
"api_key =" found in server-side API route
    ↓
BLOCKED (score 0.70)  <-- WRONG!
    ↓
constitutional.py NEVER consulted  <-- Has proper server-side logic!
```

### Desired State (Fixed)

```
User dispatches WAVE1-FE-002
    ↓
agent_worker.py runs
    ↓
UnifiedSafetyChecker.check() called  <-- Single implementation
    ↓
Detects server-side file/content
    ↓
Skips "api_key =" pattern for server code
    ↓
ALLOWED (score 0.95)  <-- CORRECT!
```

---

## 3. Proof of Duplication

### Pattern 1: `process.env` handling

**constitutional.py** (has proper handling):
```python
# Lines 68-88
SERVER_SIDE_FILE_PATTERNS = [
    r"app/api/.*\.ts$",
    r"route\.ts$",
    ...
]

def is_server_side_file(file_path: str) -> bool:
    for pattern in SERVER_SIDE_FILE_PATTERNS:
        if re.search(pattern, normalized):
            return True
    return False
```

**agent_worker.py** (MISSING this logic):
```python
# Lines 83-86 - NO SERVER-SIDE AWARENESS
FE_ONLY_DANGEROUS = [
    "private_key",
    "api_key =",
]
# No check for file path or server-side content!
```

### Pattern 2: Different threshold defaults

```python
# constitutional.py
# No default threshold - uses EscalationLevel logic

# constitutional_scorer.py line 173
threshold = float(os.getenv("CONSTITUTIONAL_BLOCK_THRESHOLD", "0.85"))

# agent_worker.py line 104
def __init__(self, block_threshold: float = 0.85, domain: str = "fe"):
```

---

## 4. Recommendation: Unified SafetyChecker

### Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   UnifiedSafetyChecker                   │
├─────────────────────────────────────────────────────────┤
│  - WAVE_PRINCIPLES (P001-P006)                          │
│  - Pattern matching (domain-aware)                      │
│  - Server-side file/content detection                   │
│  - Configurable thresholds                              │
│  - Optional Grok LLM integration                        │
│  - P006 explicit triggers                               │
│  - Escalation levels                                    │
└─────────────────────────────────────────────────────────┘
         ↑                    ↑                    ↑
         │                    │                    │
┌────────┴────────┐ ┌────────┴────────┐ ┌────────┴────────┐
│  agent_worker   │ │  safety_gate    │ │ constitutional  │
│  (imports from) │ │  (imports from) │ │    scorer       │
└─────────────────┘ └─────────────────┘ └─────────────────┘
```

### Key Features

1. **Domain awareness**: FE, BE, QA, PM domains with different rules
2. **Server-side detection**: Both file path and content pattern based
3. **Unified patterns**: Single source of truth for dangerous patterns
4. **Context-aware scoring**: File path passed for intelligent decisions
5. **Backward compatible**: Drop-in replacement for existing callers

---

## 5. TDD Implementation Plan

### Tests to Write FIRST

```python
class TestUnifiedSafetyChecker:

    def test_server_side_api_route_allows_env_vars(self):
        """process.env allowed in app/api/ routes."""
        checker = UnifiedSafetyChecker()
        result = checker.check(
            content="const key = process.env.API_KEY",
            file_path="app/api/transform/route.ts"
        )
        assert result.safe is True
        assert result.score >= 0.85

    def test_client_side_blocks_env_vars(self):
        """process.env blocked in client components."""
        checker = UnifiedSafetyChecker()
        result = checker.check(
            content="const key = process.env.API_KEY",
            file_path="components/Button.tsx"
        )
        assert result.safe is False

    def test_domain_fe_stricter_than_be(self):
        """FE domain is stricter about secrets."""
        fe_checker = UnifiedSafetyChecker(domain="fe")
        be_checker = UnifiedSafetyChecker(domain="be")

        content = "const apiKey = config.api_key"

        fe_result = fe_checker.check(content)
        be_result = be_checker.check(content)

        assert fe_result.score < be_result.score

    def test_api_key_allowed_in_server_route(self):
        """api_key pattern allowed in server-side route."""
        checker = UnifiedSafetyChecker()
        result = checker.check(
            content="const api_key = getConfig().apiKey",
            file_path="app/api/auth/route.ts"
        )
        assert result.safe is True  # Server-side, allowed

    def test_backward_compatible_with_score_action(self):
        """Maintains compatibility with old score_action() API."""
        from unified_safety import score_action
        score, violations, risks = score_action("rm -rf /")
        assert score < 0.5
        assert len(violations) > 0
```

---

## 6. Files to Create/Modify

### Create

| File | Purpose |
|------|---------|
| `src/safety/unified.py` | New unified SafetyChecker |
| `tests/test_unified_safety.py` | TDD tests |

### Modify

| File | Change |
|------|--------|
| `src/agent_worker.py` | Import from unified, remove inline class |
| `tools/constitutional_scorer.py` | Delegate to unified |
| `nodes/safety_gate.py` | Use unified checker |

### Delete (after migration)

| File | Reason |
|------|--------|
| Inline `ConstitutionalSafety` in agent_worker.py | Replaced by unified |

---

## 7. Migration Path

### Phase 1: Create unified module
- Copy best features from all three implementations
- Add comprehensive tests

### Phase 2: Update agent_worker.py
- Remove `ConstitutionalSafety` class
- Import from `src/safety/unified.py`
- **This fixes the `api_key =` false positive**

### Phase 3: Update other modules
- `constitutional_scorer.py` → delegate to unified
- `nodes/safety_gate.py` → use unified

### Phase 4: Deprecate old code
- Add deprecation warnings to old functions
- Remove in next major version

---

## 8. Conclusion

| Aspect | Finding |
|--------|---------|
| Grok's Recommendation | **VALIDATED - CRITICAL** |
| Root Cause of False Positives | agent_worker.py has separate implementation without server-side awareness |
| Impact | HIGH - Currently blocking valid code |
| Effort | MEDIUM - 2-3 hours for migration |
| Risk | LOW - Backward compatible design |

**Immediate Action Required:** Remove `api_key =` from `FE_ONLY_DANGEROUS` in `agent_worker.py` as hotfix, then implement unified checker.

---

## 9. Hotfix (Immediate)

Until unified checker is implemented, apply this hotfix:

```python
# src/agent_worker.py line 83-86
# CHANGE FROM:
FE_ONLY_DANGEROUS = [
    "private_key",
    "api_key =",
]

# TO:
FE_ONLY_DANGEROUS = [
    "private_key",
    # "api_key =",  # REMOVED - causes false positives in server-side code
]
```

This is the same fix pattern as `process.env` (which Grok already removed).
