# WAVE v2 Gate0 Validation & TDD Enhancement Plan

**Date:** 2026-01-27
**Validated By:** Claude Code
**Grok Review Score:** 9.0/10
**Status:** Ready for Implementation

---

## Gate0 Validation Summary

### Documentation Analysis

| Category | Files Found | Status |
|----------|-------------|--------|
| Phase Validations | 11 (Phase1-11) | Complete |
| Implementation Guides | 2 | Complete |
| Architecture Docs | 3 | Complete |
| Retrospectives | 2 | Complete |

**Key Documentation:**
- `docs/WAVE-V2-IMPLEMENTATION-GUIDE.md` - Master reference
- `docs/MULTI-AGENT-CONTAINER-ARCHITECTURE.md` - Container specs
- `docs/PHASE11-GATE0-VALIDATION.md` - Portal integration (Phase 11)

### Test Coverage Analysis

| Test File | Tests | Purpose |
|-----------|-------|---------|
| `test_b1_constitutional_scorer.py` | Safety scoring |
| `test_b2_b3_safety_integration.py` | Safety integration |
| `test_c3_retry_loop.py` | Dev-fix retries |
| `test_c6_gate_system.py` | Gate validation |
| `test_c7_native_parallel.py` | Parallel execution |
| `test_emergency_stop.py` | E-stop mechanisms |
| `test_langsmith_*.py` | Observability |

**Total Test Files:** 20+

### Architecture Alignment

| Component | Status | Evidence |
|-----------|--------|----------|
| Constitutional AI (P001-P006) | Implemented | `src/agent_worker.py:57-158` |
| Domain-Aware Safety | Implemented | `ConstitutionalSafety` class |
| Redis Task Queue | Operational | LPUSH/BRPOP pattern |
| LangSmith Tracing | Working | 35+ traces, 0% error |
| Slack Notifications | Working | Token/cost tracking |
| Docker Multi-Agent | Healthy | 8 containers running |

### Current System Status (Live)

```
Container           Status
---------           ------
wave-orchestrator   Up (healthy)
wave-fe-agent-1     Up (healthy)
wave-fe-agent-2     Up (healthy)
wave-be-agent-1     Up (healthy)
wave-be-agent-2     Up (healthy)
wave-qa-agent       Up (healthy)
wave-redis          Up (healthy)
wave-dozzle         Up (running)
```

---

## Grok's Recommendations Analysis

| # | Recommendation | Priority | Current State |
|---|----------------|----------|---------------|
| 1 | Orchestrator unhealthy | HIGH | **FIXED** (Python health check) |
| 2 | PM timeout 2min → 5min | HIGH | Pending |
| 3 | Merge watcher implementation | MEDIUM | Not implemented |
| 4 | Dev-fix retry loop (max 3) | MEDIUM | Partially exists |
| 5 | P006 explicit triggers | LOW | Relies on LLM only |

---

## TDD Enhancement Plan

### Enhancement 1: PM Timeout Increase

**Problem:** PM agent times out on complex planning tasks (2 min limit too short)

**Grok's Recommendation:** Increase from 2 min → 5 min

#### Test First (TDD)

```python
# tests/test_supervisor_timeout.py

def test_pm_timeout_default_is_300_seconds():
    """PM timeout should be 300 seconds (5 minutes)"""
    from src.supervisor import Supervisor
    supervisor = Supervisor()
    # The wait_for_result default should be 300
    import inspect
    sig = inspect.signature(supervisor.wait_for_result)
    timeout_default = sig.parameters['timeout'].default
    assert timeout_default == 300, f"Expected 300, got {timeout_default}"

def test_pm_timeout_configurable_via_env():
    """PM timeout should be configurable via WAVE_PM_TIMEOUT env var"""
    import os
    os.environ['WAVE_PM_TIMEOUT'] = '600'
    from src.supervisor import get_pm_timeout
    assert get_pm_timeout() == 600
    del os.environ['WAVE_PM_TIMEOUT']
```

#### Implementation

**File:** `src/supervisor.py`

**Changes:**
1. Line 318: Change `timeout: int = 300` (already 300, but verify PM-specific calls)
2. Add `get_pm_timeout()` function with env var override
3. Update PM dispatch to use configurable timeout

```python
# Add to supervisor.py

def get_pm_timeout() -> int:
    """Get PM timeout from env or default to 300 (5 min)"""
    return int(os.getenv('WAVE_PM_TIMEOUT', '300'))

# In dispatch_to_pm, add extended timeout handling
```

#### Verification

```bash
# Run test
pytest tests/test_supervisor_timeout.py -v

# Manual test
WAVE_PM_TIMEOUT=600 python -c "from src.supervisor import get_pm_timeout; print(get_pm_timeout())"
```

**CONFIRM THIS ENHANCEMENT?** [Y/N]

---

### Enhancement 2: Merge Watcher Implementation

**Problem:** No automated merge after QA passes - manual process

**Grok's Recommendation:** Implement merge watcher for deployment automation

#### Test First (TDD)

```python
# tests/test_merge_watcher.py

def test_merge_watcher_class_exists():
    """MergeWatcher class should exist"""
    from src.merge_watcher import MergeWatcher
    assert MergeWatcher is not None

def test_merge_watcher_monitors_qa_results():
    """MergeWatcher should subscribe to QA completion events"""
    from src.merge_watcher import MergeWatcher
    watcher = MergeWatcher()
    assert hasattr(watcher, 'subscribe_qa_results')

def test_merge_watcher_triggers_on_qa_pass():
    """MergeWatcher should trigger merge when QA passes with safety >= 0.85"""
    from src.merge_watcher import MergeWatcher
    watcher = MergeWatcher()

    qa_result = {
        'status': 'completed',
        'qa_passed': True,
        'safety_score': 0.92,
        'story_id': 'TEST-001'
    }

    should_merge = watcher.should_trigger_merge(qa_result)
    assert should_merge is True

def test_merge_watcher_blocks_on_qa_fail():
    """MergeWatcher should NOT merge when QA fails"""
    from src.merge_watcher import MergeWatcher
    watcher = MergeWatcher()

    qa_result = {
        'status': 'completed',
        'qa_passed': False,
        'safety_score': 0.92,
        'story_id': 'TEST-001'
    }

    should_merge = watcher.should_trigger_merge(qa_result)
    assert should_merge is False

def test_merge_watcher_blocks_on_low_safety():
    """MergeWatcher should NOT merge when safety < 0.85"""
    from src.merge_watcher import MergeWatcher
    watcher = MergeWatcher()

    qa_result = {
        'status': 'completed',
        'qa_passed': True,
        'safety_score': 0.70,
        'story_id': 'TEST-001'
    }

    should_merge = watcher.should_trigger_merge(qa_result)
    assert should_merge is False
```

#### Implementation

**File:** `src/merge_watcher.py` (NEW)

```python
"""
WAVE Merge Watcher - Automated merge after QA passes

Monitors Redis for QA completion events and triggers merge
when all conditions are met:
- QA passed
- Safety score >= 0.85
- No blocking violations

Integrates with GitHub/Vercel for deployment automation.
"""

import os
import redis
import json
from typing import Dict, Any, Optional
from datetime import datetime

class MergeWatcher:
    """
    Watches for QA completion and triggers automated merge.

    Flow:
    1. Subscribe to wave:results:qa channel
    2. On QA complete event, check conditions
    3. If conditions met, execute merge
    4. Notify via Slack
    """

    SAFETY_THRESHOLD = 0.85

    def __init__(self, redis_url: Optional[str] = None):
        self.redis_url = redis_url or os.getenv('REDIS_URL', 'redis://localhost:6379')
        self.redis = redis.from_url(self.redis_url)

    def subscribe_qa_results(self):
        """Subscribe to QA result channel"""
        pubsub = self.redis.pubsub()
        pubsub.subscribe('wave:results:qa')
        return pubsub

    def should_trigger_merge(self, qa_result: Dict[str, Any]) -> bool:
        """
        Determine if merge should be triggered.

        Conditions:
        - QA passed: True
        - Safety score >= 0.85
        - No critical violations
        """
        if qa_result.get('status') != 'completed':
            return False

        if not qa_result.get('qa_passed', False):
            return False

        safety_score = qa_result.get('safety_score', 0)
        if safety_score < self.SAFETY_THRESHOLD:
            return False

        return True

    def execute_merge(self, story_id: str, branch: str = None) -> bool:
        """
        Execute the merge operation.

        Args:
            story_id: Story identifier
            branch: Branch to merge (default: feature/{story_id})

        Returns:
            True if merge successful
        """
        # Implementation: git merge via subprocess or GitHub API
        pass

    def run(self):
        """Main watcher loop"""
        pubsub = self.subscribe_qa_results()

        for message in pubsub.listen():
            if message['type'] == 'message':
                qa_result = json.loads(message['data'])

                if self.should_trigger_merge(qa_result):
                    self.execute_merge(qa_result['story_id'])
```

#### Verification

```bash
# Run tests
pytest tests/test_merge_watcher.py -v

# Integration test
python -c "from src.merge_watcher import MergeWatcher; print('MergeWatcher loaded')"
```

**CONFIRM THIS ENHANCEMENT?** [Y/N]

---

### Enhancement 3: Dev-Fix Retry Loop (Max 3)

**Problem:** Dev-fix loop exists but needs explicit max retry limit

**Grok's Recommendation:** Add max 3 retries in graph.py

#### Test First (TDD)

```python
# tests/test_dev_fix_retry_limit.py

def test_dev_fix_max_retries_constant_exists():
    """DEV_FIX_MAX_RETRIES should be defined"""
    from src.graph import DEV_FIX_MAX_RETRIES
    assert DEV_FIX_MAX_RETRIES == 3

def test_dev_fix_increments_retry_count():
    """Dev-fix should increment retry count in state"""
    from src.graph import dev_fix_node

    state = {
        'story_id': 'TEST-001',
        'dev_fix_retries': 0,
        'qa_issues': ['Test failed']
    }

    new_state = dev_fix_node(state)
    assert new_state['dev_fix_retries'] == 1

def test_dev_fix_stops_after_max_retries():
    """Dev-fix should escalate after 3 retries"""
    from src.graph import should_retry_dev_fix

    state = {
        'dev_fix_retries': 3,
        'qa_passed': False
    }

    should_retry = should_retry_dev_fix(state)
    assert should_retry is False

def test_dev_fix_continues_under_max():
    """Dev-fix should continue if under max retries"""
    from src.graph import should_retry_dev_fix

    state = {
        'dev_fix_retries': 2,
        'qa_passed': False
    }

    should_retry = should_retry_dev_fix(state)
    assert should_retry is True
```

#### Implementation

**File:** `src/graph.py`

**Changes:**
1. Add `DEV_FIX_MAX_RETRIES = 3` constant
2. Update `dev_fix_node` to increment retry counter
3. Add `should_retry_dev_fix` routing function
4. Update graph routing to check retry limit

```python
# Add to graph.py

DEV_FIX_MAX_RETRIES = 3

def should_retry_dev_fix(state: dict) -> bool:
    """Determine if dev-fix should retry or escalate"""
    retries = state.get('dev_fix_retries', 0)
    qa_passed = state.get('qa_passed', False)

    if qa_passed:
        return False  # No retry needed, QA passed

    if retries >= DEV_FIX_MAX_RETRIES:
        return False  # Max retries reached, escalate

    return True  # Continue retrying

def dev_fix_node(state: dict) -> dict:
    """Fix issues found by QA"""
    # Increment retry counter
    state['dev_fix_retries'] = state.get('dev_fix_retries', 0) + 1

    # ... existing fix logic ...

    return state
```

#### Verification

```bash
# Run tests
pytest tests/test_dev_fix_retry_limit.py -v

# Check constant
python -c "from src.graph import DEV_FIX_MAX_RETRIES; print(f'Max retries: {DEV_FIX_MAX_RETRIES}')"
```

**CONFIRM THIS ENHANCEMENT?** [Y/N]

---

### Enhancement 4: P006 Explicit Triggers

**Problem:** P006 (Escalate Uncertainty) relies solely on LLM judgment

**Grok's Recommendation:** Add explicit triggers for uncertainty escalation

#### Test First (TDD)

```python
# tests/test_p006_explicit_triggers.py

def test_uncertainty_trigger_low_confidence():
    """Should escalate when confidence score < 0.6"""
    from src.safety.constitutional import should_escalate_p006

    result = {
        'confidence_score': 0.5,
        'decision': 'unsure'
    }

    assert should_escalate_p006(result) is True

def test_uncertainty_trigger_ambiguous_requirements():
    """Should escalate when requirements contain ambiguous keywords"""
    from src.safety.constitutional import should_escalate_p006

    result = {
        'requirements': 'maybe implement some kind of auth system?',
        'confidence_score': 0.8
    }

    assert should_escalate_p006(result) is True

def test_uncertainty_trigger_multiple_options():
    """Should escalate when multiple valid options exist"""
    from src.safety.constitutional import should_escalate_p006

    result = {
        'options': ['Option A', 'Option B', 'Option C'],
        'selected': None,
        'confidence_score': 0.8
    }

    assert should_escalate_p006(result) is True

def test_no_escalation_high_confidence():
    """Should NOT escalate when confidence is high"""
    from src.safety.constitutional import should_escalate_p006

    result = {
        'confidence_score': 0.95,
        'decision': 'clear',
        'requirements': 'Create a login button'
    }

    assert should_escalate_p006(result) is False

AMBIGUOUS_KEYWORDS = [
    'maybe', 'perhaps', 'possibly', 'might',
    'some kind of', 'something like', 'not sure',
    'TBD', 'TODO', 'unclear', 'ambiguous'
]

def test_ambiguous_keywords_list_exists():
    """AMBIGUOUS_KEYWORDS should be defined"""
    from src.safety.constitutional import AMBIGUOUS_KEYWORDS
    assert 'maybe' in AMBIGUOUS_KEYWORDS
    assert 'TBD' in AMBIGUOUS_KEYWORDS
```

#### Implementation

**File:** `src/safety/constitutional.py`

**Changes:**
1. Add `AMBIGUOUS_KEYWORDS` constant
2. Add `should_escalate_p006()` function
3. Update safety checker to use explicit triggers

```python
# Add to constitutional.py

AMBIGUOUS_KEYWORDS = [
    'maybe', 'perhaps', 'possibly', 'might',
    'some kind of', 'something like', 'not sure',
    'TBD', 'TODO', 'unclear', 'ambiguous',
    'could be', 'either', 'or maybe', 'not certain'
]

CONFIDENCE_THRESHOLD = 0.6

def should_escalate_p006(result: dict) -> bool:
    """
    Determine if P006 (Escalate Uncertainty) should trigger.

    Explicit triggers:
    1. Confidence score < 0.6
    2. Ambiguous keywords in requirements
    3. Multiple valid options without selection
    4. 'unsure' or similar decision
    """
    # Trigger 1: Low confidence
    confidence = result.get('confidence_score', 1.0)
    if confidence < CONFIDENCE_THRESHOLD:
        return True

    # Trigger 2: Ambiguous keywords
    requirements = result.get('requirements', '').lower()
    for keyword in AMBIGUOUS_KEYWORDS:
        if keyword.lower() in requirements:
            return True

    # Trigger 3: Multiple options without selection
    options = result.get('options', [])
    selected = result.get('selected')
    if len(options) > 1 and selected is None:
        return True

    # Trigger 4: Unsure decision
    decision = result.get('decision', '').lower()
    if decision in ['unsure', 'uncertain', 'unclear']:
        return True

    return False
```

#### Verification

```bash
# Run tests
pytest tests/test_p006_explicit_triggers.py -v

# Manual test
python -c "
from src.safety.constitutional import should_escalate_p006, AMBIGUOUS_KEYWORDS
print(f'Keywords: {len(AMBIGUOUS_KEYWORDS)}')
print(should_escalate_p006({'confidence_score': 0.5}))  # Should be True
"
```

**CONFIRM THIS ENHANCEMENT?** [Y/N]

---

## Implementation Order

| Order | Enhancement | Complexity | Dependencies |
|-------|-------------|------------|--------------|
| 1 | PM Timeout Increase | Low | None |
| 2 | Dev-Fix Retry Limit | Low | None |
| 3 | P006 Explicit Triggers | Medium | constitutional.py |
| 4 | Merge Watcher | High | Redis, Git |

---

## Test Execution Plan

```bash
# Phase 1: Create all test files
touch tests/test_supervisor_timeout.py
touch tests/test_dev_fix_retry_limit.py
touch tests/test_p006_explicit_triggers.py
touch tests/test_merge_watcher.py

# Phase 2: Run tests (all should FAIL - TDD Red phase)
pytest tests/test_supervisor_timeout.py -v        # FAIL
pytest tests/test_dev_fix_retry_limit.py -v       # FAIL
pytest tests/test_p006_explicit_triggers.py -v    # FAIL
pytest tests/test_merge_watcher.py -v             # FAIL

# Phase 3: Implement each enhancement
# After each implementation, tests should PASS (TDD Green phase)

# Phase 4: Full test suite
pytest tests/ -v --tb=short
```

---

## Acceptance Criteria

- [ ] All 4 enhancement test suites pass
- [ ] Existing test suite still passes (no regressions)
- [ ] PM timeout configurable via env var
- [ ] Dev-fix limited to 3 retries max
- [ ] P006 has explicit trigger conditions
- [ ] Merge watcher can detect QA pass conditions
- [ ] Documentation updated

---

## Risk Assessment

| Enhancement | Risk | Mitigation |
|-------------|------|------------|
| PM Timeout | Low - config change only | Test with various timeout values |
| Dev-Fix Limit | Low - adds safety limit | Verify escalation path works |
| P006 Triggers | Medium - changes safety behavior | Extensive keyword testing |
| Merge Watcher | High - automated git operations | Add dry-run mode, manual override |

---

## Rollback Plan

Each enhancement is independently deployable and reversible:

1. **PM Timeout:** Remove env var, defaults to original
2. **Dev-Fix Limit:** Set `DEV_FIX_MAX_RETRIES = 999` to effectively disable
3. **P006 Triggers:** Return `False` in `should_escalate_p006()` to disable
4. **Merge Watcher:** Simply don't start the watcher process

---

## Next Steps

1. Review this plan
2. Confirm each enhancement [Y/N]
3. Implement in TDD order (test first, then code)
4. Run full test suite
5. Commit with message: `feat(orchestrator): Grok-recommended enhancements`
6. Push to GitHub for Grok re-validation

---

**Document Version:** 1.0.0
**Last Updated:** 2026-01-27
