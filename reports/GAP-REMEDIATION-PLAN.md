# WAVE Gap Remediation Plan

**Version:** 1.0.0
**Date:** 2026-01-23
**Status:** IN PROGRESS
**Target:** Production-Ready Execution

---

## Progress Overview

```
OVERALL PROGRESS: [##########....................] 33% (3/9 gaps addressed)

HIGH Priority:    [##########....................] 50% (1/2)
MEDIUM Priority:  [######........................] 20% (1/5)
LOW Priority:     [##############................] 50% (1/2)
```

### Gap Status Dashboard

| ID | Gap | Severity | Status | Progress |
|----|-----|----------|--------|----------|
| GAP-001 | Runtime Prompt Injection Detection | HIGH | Pending | [ ] 0% |
| GAP-002 | DORA Metrics Tracking | HIGH | Pending | [ ] 0% |
| GAP-003 | Kill Switch Drill Capability | MEDIUM | Pending | [ ] 0% |
| GAP-004 | Per-Agent Rate Limiting | MEDIUM | Pending | [ ] 0% |
| GAP-005 | Caching Layer | MEDIUM | Pending | [ ] 0% |
| GAP-006 | Message Ordering (File Watchers) | MEDIUM | Pending | [ ] 0% |
| GAP-007 | System Prompt Encryption | MEDIUM | Pending | [ ] 0% |
| GAP-008 | Adaptive Model Routing | LOW | Pending | [ ] 0% |
| GAP-009 | Mesh Topology Support | LOW | Deferred | [-] N/A |

---

## Phase 1: HIGH Priority Gaps

### GAP-001: Runtime Prompt Injection Detection

```
Progress: [..............................] 0%
Effort: 2-3 days | Priority: P1 | Blocks: No (mitigated)
```

#### Research & Validation

**Source 1: OWASP Top 10 LLM 2025**
> "LLM01: Prompt Injection - Manipulating LLMs via crafted inputs can lead to unauthorized access, data breaches, and compromised decision-making."
>
> Source: [OWASP LLM Top 10](https://owasp.org/www-project-top-10-for-large-language-model-applications/)

**Source 2: AutoGuard Research (arXiv:2511.13725)**
> "AutoGuard achieves over 80% Defense Success Rate (DSR) across diverse malicious agents, including GPT-4o, Claude-4.5-Sonnet and generalizes well to advanced models."
>
> Source: [arXiv:2511.13725](https://arxiv.org/abs/2511.13725)

**Source 3: NIST AI RMF**
> "Organizations should implement controls to detect and prevent prompt injection attacks that could manipulate AI system behavior."
>
> Source: [NIST AI Risk Management Framework](https://www.nist.gov/itl/ai-risk-management-framework)

#### Current State

- 108 forbidden operations in `COMPLETE-SAFETY-REFERENCE.md`
- Pattern-matching in `safety-violation-detector.sh`
- Domain boundaries via Git worktrees
- **Missing:** Runtime output validation before execution

#### Implementation Steps

- [ ] **Step 1.1:** Create `prompt-injection-detector.js` in portal/server/utils/
  ```
  File: /portal/server/utils/prompt-injection-detector.js
  Purpose: Validate agent outputs before execution
  Patterns: Known injection signatures, semantic analysis
  ```

- [ ] **Step 1.2:** Define injection pattern database
  ```
  File: /portal/server/utils/injection-patterns.json
  Contents:
  - Jailbreak patterns (DAN, STAN, etc.)
  - Instruction override attempts
  - Role-playing exploits
  - Encoding bypass attempts (base64, rot13)
  ```

- [ ] **Step 1.3:** Integrate with signal validation
  ```
  Location: /core/scripts/signal-enforcement/validate-signal.sh
  Action: Call detector before accepting agent signals
  ```

- [ ] **Step 1.4:** Create test suite for injection patterns
  ```
  File: /portal/server/__tests__/prompt-injection.test.js
  Coverage: 50+ known injection patterns
  ```

- [ ] **Step 1.5:** Add to QA validation pipeline
  ```
  Location: Portal Tab 5 (Aerospace Safety)
  Check: "Prompt Injection Resistance"
  ```

#### Acceptance Criteria

- [ ] Detector catches 80%+ of known injection patterns
- [ ] False positive rate < 5%
- [ ] Processing latency < 100ms per check
- [ ] Test suite covers OWASP examples
- [ ] Integrated into Portal safety tab

---

### GAP-002: DORA Metrics Tracking

```
Progress: [..............................] 0%
Effort: 1-2 days | Priority: P2 | Blocks: No
```

#### Research & Validation

**Source 1: Google DORA Research**
> "The four key metrics that indicate software delivery performance: Deployment Frequency, Lead Time for Changes, Mean Time to Recovery (MTTR), and Change Failure Rate."
>
> Source: [DORA Metrics](https://dora.dev/guides/dora-metrics-four-keys/)

**Source 2: DevOps Training Institute**
> "The DORA Metrics Threshold Check shifts the focus from technical assurance to risk management and business context. Before the final release, the pipeline checks the four DORA metrics against predefined organizational targets."
>
> Source: [10 CI/CD Quality Gates](https://www.devopstraininginstitute.com/blog/10-cicd-quality-gates-for-production-level-reliability)

**Source 3: SonarSource**
> "Quality gates integrated with DORA metrics provide visibility into both code quality and delivery performance, enabling data-driven decisions."
>
> Source: [SonarSource Quality Gates](https://www.sonarsource.com/learn/integrating-quality-gates-ci-cd-pipeline/)

#### Current State

- No deployment frequency tracking
- No lead time calculation
- No MTTR measurement
- No change failure rate recording

#### Implementation Steps

- [ ] **Step 2.1:** Create metrics schema
  ```
  File: /.claudecode/signals/DORA-METRICS-SCHEMA.md
  Metrics:
  - deployment_frequency: deployments per day/week
  - lead_time_seconds: commit to production time
  - mttr_seconds: failure to recovery time
  - change_failure_rate: failed deployments / total
  ```

- [ ] **Step 2.2:** Add metrics logging to orchestrator
  ```
  File: /core/scripts/wave-orchestrator.sh
  Function: log_dora_metric()
  Output: .claude/metrics/dora.jsonl
  ```

- [ ] **Step 2.3:** Track wave completion times
  ```
  Events to capture:
  - Wave start timestamp
  - Wave end timestamp
  - Story completion times
  - Retry counts per wave
  ```

- [ ] **Step 2.4:** Create metrics aggregation script
  ```
  File: /core/scripts/dora-metrics-report.sh
  Output: Weekly/monthly DORA summary
  ```

- [ ] **Step 2.5:** Add metrics display to Portal
  ```
  Location: Portal Tab 10 (Audit Log) or new Tab 11
  Visualization: Charts showing trends
  ```

#### Acceptance Criteria

- [ ] All 4 DORA metrics captured automatically
- [ ] Metrics stored in .claude/metrics/dora.jsonl
- [ ] Weekly aggregation report generated
- [ ] Portal displays metric trends
- [ ] Baseline established after 3 waves

---

## Phase 2: MEDIUM Priority Gaps

### GAP-003: Kill Switch Drill Capability

```
Progress: [..............................] 0%
Effort: 0.5 days | Priority: P2 | Blocks: No
```

#### Research & Validation

**Source 1: AI Safety Research**
> "Practice 'pull-the-plug' drills and verify switches under load. Run periodic chaos tests to ensure kill mechanisms activate correctly."
>
> Source: [Practical AI Agent Safeguards](https://www.pedowitzgroup.com/ai-agent-kill-switches-practical-safeguards-that-work)

**Source 2: Trustworthy AI Agents**
> "Every safety measure implemented becomes training data for circumvention. Regular testing ensures kill switches function when actually needed."
>
> Source: [Kill Switches and Circuit Breakers](https://www.sakurasky.com/blog/missing-primitives-for-trustworthy-ai-part-6/)

#### Current State

- Kill switch exists (`check-kill-switch.sh`)
- Cannot test without halting system
- No drill mode implemented

#### Implementation Steps

- [ ] **Step 3.1:** Add `--test` flag to kill switch script
  ```bash
  # In check-kill-switch.sh
  --test)
      TEST_MODE=true
      log "DRILL MODE: Simulating kill switch activation"
      # Check all pathways without creating EMERGENCY-STOP file
      ;;
  ```

- [ ] **Step 3.2:** Implement drill verification
  ```
  Checks:
  - Local file creation would succeed
  - Supabase connection works
  - Slack notification would fire
  - All agents would receive signal
  ```

- [ ] **Step 3.3:** Add drill logging
  ```
  Output: .claude/drills/kill-switch-drill-YYYY-MM-DD.json
  Contents: Pathways tested, response times, success/failure
  ```

- [ ] **Step 3.4:** Create scheduled drill runner
  ```
  File: /core/scripts/scheduled-drills.sh
  Frequency: Weekly (configurable)
  ```

#### Acceptance Criteria

- [ ] `--test` mode simulates without halting
- [ ] All pathways verified in drill
- [ ] Drill results logged
- [ ] Weekly automated drills configured

---

### GAP-004: Per-Agent Rate Limiting

```
Progress: [..............................] 0%
Effort: 1 day | Priority: P2 | Blocks: No
```

#### Research & Validation

**Source 1: TrueFoundry**
> "Set daily/monthly quotas by user, team, environment, model, or custom metadata. This helps prevent 'runaway' workloads that spike spend."
>
> Source: [LLM Cost Tracking Solution](https://www.truefoundry.com/blog/llm-cost-tracking-solution)

**Source 2: LLM Cost Optimization Research**
> "With an LLM Gateway, organizations can cut token spend by 30-50% without sacrificing performance through intelligent rate limiting."
>
> Source: [LLM Cost Optimization](https://ai.koombea.com/blog/llm-cost-optimization)

#### Current State

- Wave-level budget tracking only
- No per-agent limits
- One agent could exhaust entire wave budget

#### Implementation Steps

- [ ] **Step 4.1:** Define agent budget allocation
  ```
  File: /.claude/agent-budgets.json
  Structure:
  {
    "fe-dev-1": { "budget_usd": 0.50, "spent": 0, "limit_tokens": 100000 },
    "be-dev-1": { "budget_usd": 0.50, "spent": 0, "limit_tokens": 100000 },
    "qa": { "budget_usd": 0.25, "spent": 0, "limit_tokens": 50000 }
  }
  ```

- [ ] **Step 4.2:** Add budget check to orchestrator
  ```
  Location: wave-orchestrator.sh
  Function: check_agent_budget()
  Action: Pause agent if budget exceeded
  ```

- [ ] **Step 4.3:** Update signal validation
  ```
  Check: token_usage against agent budget
  Alert: When agent reaches 75% of allocation
  ```

- [ ] **Step 4.4:** Add to Portal Agent Dispatch tab
  ```
  Display: Per-agent budget usage bars
  Actions: Adjust limits, reset counters
  ```

#### Acceptance Criteria

- [ ] Each agent has configurable budget
- [ ] Orchestrator enforces limits
- [ ] Alerts at 75% agent budget
- [ ] Portal shows per-agent usage

---

### GAP-005: Caching Layer

```
Progress: [..............................] 0%
Effort: 2 days | Priority: P3 | Blocks: No
```

#### Research & Validation

**Source 1: LLM Cost Optimization**
> "Caching is the single highest-ROI optimization for LLM applications. Implementing smart caching can reduce API calls by 70%+ while improving response times from 2-3 seconds to under 100ms."
>
> Source: [Koombea LLM Optimization](https://ai.koombea.com/blog/llm-cost-optimization)

**Source 2: Semantic Caching Research**
> "Semantic caching doesn't look for the same words; it looks for the same intent. It maps incoming queries to vector embeddings and compares them to past ones."
>
> Source: [Kosmoy LLM Cost Management](https://www.kosmoy.com/post/llm-cost-management-stop-burning-money-on-tokens)

#### Current State

- No result caching
- No prompt caching
- Repeated context retrieval costs tokens each time

#### Implementation Steps

- [ ] **Step 5.1:** Add Redis/in-memory cache to Portal server
  ```
  File: /portal/server/utils/cache-manager.js
  Strategy: LRU cache with TTL
  ```

- [ ] **Step 5.2:** Cache project context
  ```
  Cached items:
  - CLAUDE.md content (TTL: 1 hour)
  - Story definitions (TTL: 30 min)
  - Validation results (TTL: 5 min)
  ```

- [ ] **Step 5.3:** Implement cache invalidation
  ```
  Triggers:
  - File modification detected
  - Manual cache clear
  - TTL expiration
  ```

- [ ] **Step 5.4:** Add cache hit metrics
  ```
  Track: Hit rate, miss rate, bytes saved
  Display: Portal metrics dashboard
  ```

#### Acceptance Criteria

- [ ] Cache reduces API calls by 50%+
- [ ] Cache hit rate > 70%
- [ ] Invalidation works correctly
- [ ] Metrics visible in Portal

---

### GAP-006: Message Ordering (File Watchers)

```
Progress: [..............................] 0%
Effort: 1-2 days | Priority: P3 | Blocks: No
```

#### Research & Validation

**Source 1: Confluent Event-Driven Architecture**
> "The concept of an immutable log is critical for distributed systems. Guaranteed message ordering ensures all agents operate with the same context."
>
> Source: [Event-Driven Multi-Agent Systems](https://www.confluent.io/blog/event-driven-multi-agent-systems/)

**Source 2: Microsoft Event-Driven Architecture**
> "Event-driven systems should use event sourcing patterns that capture all changes in sequence, enabling reliable replay and consistent state reconstruction."
>
> Source: [Azure Event-Driven Architecture](https://learn.microsoft.com/en-us/azure/architecture/guide/architecture-styles/event-driven)

#### Current State

- 10-second polling interval
- Race conditions possible
- Non-deterministic signal detection

#### Implementation Steps

- [ ] **Step 6.1:** Replace polling with file watchers
  ```
  File: /core/scripts/signal-watcher.sh
  Technology: fswatch (macOS) / inotifywait (Linux)
  ```

- [ ] **Step 6.2:** Implement event sequencing
  ```
  Add sequence number to signals:
  "sequence": 42,
  "previous_sequence": 41
  ```

- [ ] **Step 6.3:** Add ordering validation
  ```
  Check: sequence == previous_sequence + 1
  Action: Wait or request missing signal
  ```

- [ ] **Step 6.4:** Update merge-watcher
  ```
  Replace: sleep-based polling
  With: Event-driven signal detection
  ```

#### Acceptance Criteria

- [ ] Signals detected within 1 second
- [ ] Sequence numbers validate order
- [ ] No race conditions in tests
- [ ] Backward compatible with polling fallback

---

### GAP-007: System Prompt Encryption

```
Progress: [..............................] 0%
Effort: 1 day | Priority: P3 | Blocks: No
```

#### Research & Validation

**Source 1: OWASP LLM07**
> "System prompt leakage has become an alarming issue. Protecting system prompts from unauthorized access is essential for maintaining AI system integrity."
>
> Source: [OWASP Top 10 LLM 2025](https://owasp.org/www-project-top-10-for-large-language-model-applications/)

**Source 2: NIST Cybersecurity Framework for AI**
> "Issue AI systems unique identities and credentials, and protect configuration data including system prompts from unauthorized access."
>
> Source: [NISTIR 8596](https://nvlpubs.nist.gov/nistpubs/ir/2025/NIST.IR.8596.iprd.pdf)

#### Current State

- CLAUDE.md stored in plaintext
- System prompts readable if agent escapes constraints
- No encryption at rest

#### Implementation Steps

- [ ] **Step 7.1:** Create encryption utility
  ```
  File: /core/scripts/encrypt-secrets.sh
  Algorithm: AES-256-GCM
  Key: Environment variable or KMS
  ```

- [ ] **Step 7.2:** Encrypt sensitive files
  ```
  Files to encrypt:
  - CLAUDE.md → CLAUDE.md.enc
  - .claude/prompts/*.md → *.md.enc
  - Agent-specific instructions
  ```

- [ ] **Step 7.3:** Implement runtime decryption
  ```
  Decryption: In-memory only
  Never: Write decrypted to disk
  ```

- [ ] **Step 7.4:** Add key rotation
  ```
  Schedule: Monthly rotation
  Process: Re-encrypt with new key
  ```

#### Acceptance Criteria

- [ ] Sensitive files encrypted at rest
- [ ] Decryption only in memory
- [ ] Key rotation implemented
- [ ] No plaintext prompts on disk

---

## Phase 3: LOW Priority Gaps

### GAP-008: Adaptive Model Routing

```
Progress: [..............................] 0%
Effort: 2 days | Priority: P4 | Blocks: No
```

#### Research & Validation

**Source 1: LLM Cost Optimization**
> "When traffic is steady but mixed in complexity, routing easy questions to a cheaper model and off-loading batch tasks to a small self-hosted LLM keeps quality intact and slashes cost."
>
> Source: [Koombea LLM Optimization](https://ai.koombea.com/blog/llm-cost-optimization)

#### Implementation Steps

- [ ] **Step 8.1:** Define task complexity classifier
- [ ] **Step 8.2:** Create routing rules engine
- [ ] **Step 8.3:** Implement model fallback chain
- [ ] **Step 8.4:** Add routing metrics

#### Acceptance Criteria

- [ ] Simple tasks route to Haiku
- [ ] Complex tasks route to Opus
- [ ] 30%+ cost reduction measured

---

### GAP-009: Mesh Topology Support

```
Progress: [..............................] 0%
Effort: 1 week | Priority: P4 | Blocks: No | Status: DEFERRED
```

#### Notes

Deferred to future release. Current hub-and-spoke architecture scales to ~10 agents, sufficient for initial production use.

---

## Implementation Schedule

### Week 1: Critical Path

| Day | Gap | Task |
|-----|-----|------|
| Mon | GAP-001 | Create prompt-injection-detector.js |
| Tue | GAP-001 | Define injection patterns, integrate |
| Wed | GAP-001 | Create test suite, add to Portal |
| Thu | GAP-002 | Create DORA metrics schema |
| Fri | GAP-002 | Add logging to orchestrator |

### Week 2: Safety & Performance

| Day | Gap | Task |
|-----|-----|------|
| Mon | GAP-003 | Add kill switch --test mode |
| Tue | GAP-004 | Define agent budgets, add checks |
| Wed | GAP-005 | Implement caching layer |
| Thu | GAP-006 | Replace polling with file watchers |
| Fri | GAP-007 | Implement prompt encryption |

### Week 3: Polish & Optimization

| Day | Gap | Task |
|-----|-----|------|
| Mon | GAP-008 | Implement model routing |
| Tue | - | Integration testing |
| Wed | - | Documentation updates |
| Thu | - | Final validation |
| Fri | - | Production deployment |

---

## Validation Checklist

### Pre-Execution (Required)

- [ ] All HIGH priority gaps addressed OR documented mitigations
- [ ] Kill switch tested (manually)
- [ ] Budget limits configured
- [ ] Slack notifications working
- [ ] All Portal tabs passing validation

### Post-Implementation (Recommended)

- [ ] Prompt injection test suite passes
- [ ] DORA metrics collecting data
- [ ] Kill switch drill successful
- [ ] Per-agent limits enforced
- [ ] Cache hit rate > 50%

---

## Risk Mitigation

### If GAP-001 (Prompt Injection) Not Addressed

**Mitigation:**
1. L0 forbidden list blocks 108 known dangerous operations
2. Domain boundaries via worktrees prevent cross-agent access
3. Human review at Gate 7 catches anomalies
4. Kill switch available for immediate halt

**Risk Level:** ACCEPTABLE for initial execution

### If GAP-002 (DORA Metrics) Not Addressed

**Mitigation:**
1. Manual tracking via audit log
2. Black box flight recorder captures timing
3. Can retroactively calculate from logs

**Risk Level:** ACCEPTABLE (operational, not safety)

---

## Sources Summary

| Source | Topic | URL |
|--------|-------|-----|
| OWASP | LLM Security | [owasp.org](https://owasp.org/www-project-top-10-for-large-language-model-applications/) |
| NIST | AI Risk Framework | [nist.gov](https://www.nist.gov/itl/ai-risk-management-framework) |
| NIST | AI Cybersecurity | [NISTIR 8596](https://nvlpubs.nist.gov/nistpubs/ir/2025/NIST.IR.8596.iprd.pdf) |
| arXiv | AutoGuard Kill Switch | [2511.13725](https://arxiv.org/abs/2511.13725) |
| DORA | DevOps Metrics | [dora.dev](https://dora.dev/guides/dora-metrics-four-keys/) |
| Confluent | Event-Driven | [confluent.io](https://www.confluent.io/blog/event-driven-multi-agent-systems/) |
| Microsoft | AI Patterns | [learn.microsoft.com](https://learn.microsoft.com/en-us/azure/architecture/ai-ml/guide/ai-agent-design-patterns) |
| TrueFoundry | Cost Tracking | [truefoundry.com](https://www.truefoundry.com/blog/llm-cost-tracking-solution) |
| SonarSource | Quality Gates | [sonarsource.com](https://www.sonarsource.com/learn/integrating-quality-gates-ci-cd-pipeline/) |

---

## Progress Tracking

Update this section as gaps are addressed:

```
Last Updated: 2026-01-23

GAP-001: [ ] Not Started
GAP-002: [ ] Not Started
GAP-003: [ ] Not Started
GAP-004: [ ] Not Started
GAP-005: [ ] Not Started
GAP-006: [ ] Not Started
GAP-007: [ ] Not Started
GAP-008: [ ] Not Started
GAP-009: [-] Deferred

OVERALL: 0/8 gaps completed (0%)
```

---

*Plan created: 2026-01-23*
*Next review: After Wave 1 execution*
