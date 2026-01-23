# GPT Feedback - Improvement Plan

**Date:** 2026-01-24
**Status:** PRE-EXECUTION CHECKLIST
**Priority:** Address before first production run

---

## Executive Summary

GPT review identified 6 key risk areas. Benchmarking against our implementation:

| Area | Current State | Gap | Priority |
|------|---------------|-----|----------|
| Truth-Source Consistency | 70% | No run_id, no sequence | HIGH |
| Signals Reliability | 40% | No atomic writes, no idempotency | CRITICAL |
| Slack Throttling | 60% | No batching, no priority queue | MEDIUM |
| Budget Hard Stop | 50% | No automatic pipeline termination | CRITICAL |
| Validator Trust | 30% | Validators trust agent output | HIGH |
| Run ID Consistency | 60% | No global run_id or sequence | HIGH |

---

## Gap Analysis Details

### 1. Truth-Source Consistency (70% Complete)

**What We Have:**
- Consistent `maf_*` and `wave_*` table prefixes
- SOURCE OF TRUTH comments in migrations
- Consistent wave/story_id across signals and DB

**What's Missing:**
- [ ] No `run_id` for unique execution identification
- [ ] No `sequence` field for signal ordering
- [ ] No documented conflict resolution policy (DB vs file)

**Improvement Actions:**
```
IMPROVEMENT-001: Add run_id field
- Generate: run_YYYYMMDD_HHMMSS_wave{N}
- Add to: signals, DB records, Slack messages
- Effort: 2 hours

IMPROVEMENT-002: Add sequence field
- Increment per signal per wave
- Track in orchestrator state
- Effort: 1 hour

IMPROVEMENT-003: Document truth hierarchy
- Create: docs/SOURCE-OF-TRUTH.md
- Define: DB wins on conflict, signals are audit trail
- Effort: 30 mins
```

---

### 2. Signals Reliability (40% Complete) - CRITICAL

**What We Have:**
- Signal watcher with polling
- Rate limiting per agent
- Kill switch detection

**What's Missing:**
- [ ] No atomic writes (temp → fsync → rename)
- [ ] No idempotency (duplicate detection)
- [ ] No concurrency control (locks)
- [ ] No sequence ordering

**Improvement Actions:**
```
IMPROVEMENT-004: Atomic signal writes
File: core/scripts/lib/signal-writer.sh
- Write to .tmp file first
- fsync before rename
- Use flock for concurrent access
- Effort: 2 hours

IMPROVEMENT-005: Signal idempotency
- Add event_id: UUID to each signal
- Check for duplicate event_id before processing
- Store processed IDs in .claude/processed-signals.json
- Effort: 2 hours

IMPROVEMENT-006: Sequence tracking
- Add sequence number to each signal
- Reject out-of-order signals (log + alert)
- Effort: 1 hour
```

---

### 3. Slack Throttling (60% Complete)

**What We Have:**
- Per-message rate limiting (500ms interval)
- Retry with exponential backoff
- Circuit breaker (10 failures)
- Thread-per-story pattern

**What's Missing:**
- [ ] No message batching
- [ ] No priority queuing
- [ ] No load shedding under pressure

**Improvement Actions:**
```
IMPROVEMENT-007: Message batching
File: portal/server/slack-notifier.js
- Add message queue with batch window (5 seconds)
- Combine INFO messages into single update
- Keep CRITICAL/ERROR as immediate
- Effort: 3 hours

IMPROVEMENT-008: Priority queuing
- Priority levels: CRITICAL (0), ERROR (1), WARN (2), INFO (3)
- CRITICAL/ERROR bypass queue
- INFO queued and batched
- Effort: 2 hours
```

---

### 4. Budget Hard Stop (50% Complete) - CRITICAL

**What We Have:**
- Budget tracking endpoints
- Threshold alerts (75%, 90%, 100%)
- Slack notifications on budget events
- Kill switch mechanism (separate)

**What's Missing:**
- [ ] No automatic EMERGENCY-STOP at budget exceeded
- [ ] No budget trip test
- [ ] No latency measurement for stop confirmation

**Improvement Actions:**
```
IMPROVEMENT-009: Auto-halt on budget exceeded
File: portal/server/index.js (budget endpoints)
File: core/scripts/wave-orchestrator.sh

When budget >= 100%:
1. Create EMERGENCY-STOP file
2. Log: "BUDGET EXCEEDED - EMERGENCY STOP TRIGGERED"
3. Notify Slack with CRITICAL severity
4. Return 503 on all subsequent API calls

Effort: 2 hours

IMPROVEMENT-010: Budget trip test
File: core/scripts/tests/budget-trip-test.sh

Test procedure:
1. Set wave_budget to $0.01
2. Start minimal agent task
3. Verify E3 triggers within 5 seconds
4. Verify all containers stopped
5. Log latencies: request→stop, stop→confirmed

Effort: 2 hours
```

---

### 5. Validator Trust (30% Complete) - HIGH

**What We Have:**
- QA agent runs tests and reports results
- Signal contains test/build/lint status
- Validation run tracking in DB

**What's Missing:**
- [ ] Validators trust agent-reported results
- [ ] No independent re-execution of tests
- [ ] No result verification/checksums

**Improvement Actions:**
```
IMPROVEMENT-011: Independent test verification
File: portal/server/utils/build-validator.js

Add verification layer:
1. QA agent submits results
2. Validator re-runs: npm test --json
3. Compare: agent.passed vs actual.passed
4. FAIL if mismatch > 0
5. Store raw output as artifact

Effort: 4 hours

IMPROVEMENT-012: Result checksums
- Hash test output file
- Include hash in signal
- Validator compares hashes
- Effort: 2 hours

IMPROVEMENT-013: Forbid skip flags
- Block: --passWithNoTests
- Block: --testPathIgnorePatterns
- Block: empty test suites in strict mode
- Effort: 1 hour
```

---

### 6. Run ID Consistency (60% Complete)

**What We Have:**
- wave_number consistent across signals/DB/Slack
- story_id consistent across signals/DB/Slack
- Thread tracking with task_id

**What's Missing:**
- [ ] No global run_id
- [ ] No sequence number per signal
- [ ] Cannot trace single execution end-to-end

**Improvement Actions:**
```
IMPROVEMENT-014: Global run_id
Generated at wave start: run_20260124_103045_w1
Propagated to:
- All signals: "run_id": "run_..."
- All DB records: run_id column
- All Slack messages: Run ID in context
- Effort: 3 hours

IMPROVEMENT-015: Execution tracing
- Create run manifest: .claude/runs/run_XXX/manifest.json
- Link all signals, DB records, Slack threads
- Enable: "show me everything from run X"
- Effort: 2 hours
```

---

## Additional GPT Recommendations

### 7. Outbound Network Policy (NEW)

**Recommendation:** Allowlist domains for agent network access

```
IMPROVEMENT-016: Network allowlist
File: core/docker/network-policy.sh

Allowlist:
- registry.npmjs.org
- github.com
- api.anthropic.com
- hooks.slack.com
- *.supabase.co

Block: everything else (or log + alert)
Effort: 4 hours (Docker network rules)
```

### 8. Golden Run / Rehearsal Mode (NEW)

**Recommendation:** Dry-run that validates without burning tokens

```
IMPROVEMENT-017: Rehearsal mode
File: core/scripts/wave-orchestrator.sh

Flag: --rehearsal or --dry-run
Behavior:
- Use mock LLM responses (canned)
- Validate all signals created correctly
- Verify DB writes succeed
- Confirm Slack posts format correctly
- No actual agent execution

Effort: 4 hours
```

---

## Priority Matrix

### Must Have Before First Run (CRITICAL)

| ID | Improvement | Effort | Blocks Execution |
|----|-------------|--------|------------------|
| 009 | Auto-halt on budget exceeded | 2h | YES |
| 010 | Budget trip test | 2h | YES |
| 004 | Atomic signal writes | 2h | YES |
| 005 | Signal idempotency | 2h | YES |

### Should Have (HIGH)

| ID | Improvement | Effort | Risk Mitigation |
|----|-------------|--------|-----------------|
| 011 | Independent test verification | 4h | Prevents false passes |
| 014 | Global run_id | 3h | Enables debugging |
| 001 | Add run_id field | 2h | Traceability |
| 002 | Add sequence field | 1h | Order guarantee |

### Nice to Have (MEDIUM)

| ID | Improvement | Effort | Benefit |
|----|-------------|--------|---------|
| 007 | Message batching | 3h | Reduces Slack noise |
| 008 | Priority queuing | 2h | Better alerting |
| 017 | Rehearsal mode | 4h | Safe testing |
| 016 | Network allowlist | 4h | Security hardening |

---

## Go/No-Go Checklist

Based on GPT's recommendations, here's the execution checklist:

### MUST PASS (No-Go if any fail)

- [ ] Kill switch tested end-to-end (E5 stops everything)
- [ ] Budget trip test verified (E3 triggers reliably)
- [ ] Signals are atomic + deduped
- [ ] Slack notifier throttling enabled
- [ ] Validator runs tests itself (not trusting agent)
- [ ] Stories have risk classification

### SHOULD PASS (Proceed with caution if fail)

- [ ] Rehearsal/dry-run mode exists
- [ ] Run_id propagated everywhere
- [ ] Network allowlist configured
- [ ] Message batching enabled

---

## Implementation Timeline

### Phase 1: Critical Path (4 hours)
- IMPROVEMENT-009: Auto-halt on budget exceeded
- IMPROVEMENT-010: Budget trip test
- IMPROVEMENT-004: Atomic signal writes
- IMPROVEMENT-005: Signal idempotency

### Phase 2: High Priority (6 hours)
- IMPROVEMENT-011: Independent test verification
- IMPROVEMENT-014: Global run_id
- IMPROVEMENT-001: Add run_id field
- IMPROVEMENT-002: Add sequence field

### Phase 3: Hardening (8 hours)
- IMPROVEMENT-007: Message batching
- IMPROVEMENT-017: Rehearsal mode
- IMPROVEMENT-016: Network allowlist

---

## Conclusion

**Current State:** 55% ready for production execution

**Critical Gaps:**
1. Budget exceeded doesn't halt pipeline
2. Signal writes not atomic
3. Validators trust agent output

**Recommendation:** Complete Phase 1 improvements before first execution.

---

*Report generated: 2026-01-24*
*Based on: GPT-4 external review feedback*
