# WAVE v2 Pre-Flight Implementation Plan

**Version:** 1.0.0
**Date:** 2026-01-27
**Purpose:** Step-by-step implementation plan for Pre-Flight Checklist v1.3.0
**Approach:** Documentation-Driven TDD (Test-Driven Development)

---

## Executive Summary

### Current State Analysis

| Component | Status | Notes |
|-----------|--------|-------|
| Redis Task Queue (AOF) | DONE | `task_queue.py` implemented |
| Agent Worker Framework | DONE | `agent_worker.py` with LangSmith |
| Domain Agents (PM/CTO/FE/BE/QA) | DONE | In `/src/agents/` |
| Supervisor | DONE | `supervisor.py` for task distribution |
| Docker Compose Distributed | DONE | `docker-compose.distributed.yml` |
| Constitutional AI Safety | DONE | 0.85 threshold, pattern blocking |
| Parallel FE + BE Execution | DONE | `dispatch_parallel_dev()` |
| Domain-Prefixed Logging | DONE | `[PM-1]`, `[FE-1]`, etc. in Dozzle |
| Slack Notifications | DONE | `notifications.py` |

### Gaps to Address

| Gap | Priority | Checklist Step |
|-----|----------|----------------|
| Business Domain Isolation | HIGH | Step 4, Step 9 |
| Autonomous Mode (`--dangerously-skip-permissions`) | CRITICAL | Step 4, Step 9 |
| DO-178C Safety Probes | HIGH | Step 5 |
| Multi-LLM Routing (Grok) | HIGH | Step 9 |
| Emergency Stop Mechanism | CRITICAL | Step 9 |
| Foundation Analysis API | MEDIUM | Step 0 |
| PRD/Stories Validation | MEDIUM | Step 1 |
| Build/QA Validation | MEDIUM | Step 8 |
| gVisor Sandbox | LOW (Optional) | Step 9 |

---

## Gate 0: Validation Criteria

Before ANY implementation begins, the following must be verified:

### Gate 0 Checklist

```
GATE 0: FOUNDATION VALIDATION
═══════════════════════════════════════════════════════════════════════════════

Documentation:
[ ] Pre-flight checklist v1.3.0 reviewed and understood
[ ] Current implementation state documented
[ ] Gap analysis complete
[ ] Implementation plan approved

Infrastructure:
[ ] Existing distributed architecture tested and working
[ ] Redis healthy with AOF persistence
[ ] All 7 agent containers running
[ ] Dozzle showing domain-prefixed logs
[ ] Slack notifications working

Safety:
[ ] Constitutional AI threshold = 0.85
[ ] Safety scoring blocking unsafe code
[ ] No production data at risk

GATE 0 STATUS: [ ] PASS / [ ] FAIL
```

### Gate 0 Test Commands

```bash
# 1. Verify existing infrastructure
docker ps --filter "name=wave-" --format "table {{.Names}}\t{{.Status}}"

# 2. Verify Redis AOF
docker exec wave-redis redis-cli CONFIG GET appendonly

# 3. Verify agent logging
docker logs wave-pm-agent 2>&1 | grep "\[PM-1\]"

# 4. Verify safety threshold
grep "CONSTITUTIONAL_BLOCK_THRESHOLD" /Volumes/SSD-01/Projects/WAVE/orchestrator/.env

# 5. Verify Slack
curl -s http://localhost:8000/health | jq '.notifications'
```

---

## Implementation Phases

### Phase 1: Critical Safety (Priority: CRITICAL)

**Objective:** Implement safety mechanisms before enabling autonomous mode.

#### 1.1 Emergency Stop Mechanism

**TDD Test First:**
```python
# tests/test_emergency_stop.py
def test_emergency_stop_file_halts_all_agents():
    """When .claude/EMERGENCY-STOP exists, all agents must halt immediately."""
    Path(".claude/EMERGENCY-STOP").touch()
    assert agent_worker.check_emergency_stop() == True
    assert agent_worker.is_halted() == True

def test_emergency_stop_removal_resumes():
    """When EMERGENCY-STOP removed, agents resume."""
    Path(".claude/EMERGENCY-STOP").unlink()
    assert agent_worker.check_emergency_stop() == False
```

**Implementation:**
```
File: src/emergency_stop.py
- Monitor .claude/EMERGENCY-STOP file
- Broadcast halt signal via Redis pub/sub
- All agents subscribe to halt channel
- Immediate task abortion on signal
```

**Verification:**
```bash
# Create emergency stop
touch .claude/EMERGENCY-STOP

# Verify all agents halt
docker logs wave-pm-agent 2>&1 | grep "EMERGENCY STOP"

# Remove and verify resume
rm .claude/EMERGENCY-STOP
```

#### 1.2 DO-178C Safety Probes

**TDD Test First:**
```python
# tests/test_do178c_probes.py
REQUIRED_PROBES = [
    "file_write_boundary",      # No writes outside project
    "git_branch_protection",    # No direct main commits
    "token_budget_limit",       # Budget enforcement
    "api_key_exposure",         # No secrets in output
    "infinite_loop_detection",  # Loop guards
    "resource_exhaustion",      # Memory/CPU limits
    "network_boundary",         # No external calls without approval
    "data_exfiltration",        # No sensitive data leaks
]

def test_all_probes_pass():
    for probe in REQUIRED_PROBES:
        result = safety.run_probe(probe)
        assert result.passed, f"Probe {probe} failed: {result.reason}"
```

**Implementation:**
```
File: src/safety/do178c_probes.py
- 8 mandatory safety probes
- Each probe returns Pass/Fail with reason
- All probes must pass before autonomous mode
- Continuous monitoring during execution
```

#### 1.3 Budget Hard Limits

**TDD Test First:**
```python
# tests/test_budget.py
def test_budget_cannot_be_bypassed():
    """Budget limits are enforced at infrastructure level."""
    state = {"budget": {"cost_usd": 9.99, "cost_limit_usd": 10.0}}
    # This should fail
    with pytest.raises(BudgetExceededError):
        agent.process_task(expensive_task, state)

def test_budget_tracked_per_agent():
    """Each agent tracks its own budget consumption."""
    pm_budget = budget.get_agent_budget("pm-1")
    assert pm_budget.tokens_used >= 0
```

**Implementation:**
```
File: src/budget_enforcer.py
- Hard limits that cannot be bypassed
- Per-agent budget tracking
- Automatic shutdown when limit reached
- Real-time cost estimation
```

---

### Phase 2: Business Domain Isolation (Priority: HIGH)

**Objective:** Restructure from technical layers (FE/BE/QA) to business domains.

#### 2.1 Domain Architecture

**Current (Technical Layers):**
```
wave-pm-agent      → Plans all stories
wave-fe-agent-1/2  → All frontend work
wave-be-agent-1/2  → All backend work
wave-qa-agent      → All QA work
wave-cto-agent     → All reviews
```

**Target (Business Domains):**
```
wave-domain-auth/
  ├── pm-agent       → Plans AUTH stories
  ├── cto-agent      → Reviews AUTH code
  ├── fe-agent-1/2   → AUTH frontend
  ├── be-agent-1/2   → AUTH backend
  └── qa-agent       → AUTH QA

wave-domain-payments/
  ├── pm-agent       → Plans PAYMENTS stories
  ├── cto-agent      → Reviews PAYMENTS code
  ├── fe-agent-1/2   → PAYMENTS frontend
  ├── be-agent-1/2   → PAYMENTS backend
  └── qa-agent       → PAYMENTS QA
```

**TDD Test First:**
```python
# tests/test_domain_isolation.py
def test_auth_domain_only_processes_auth_stories():
    """Auth domain agents only pick up AUTH-* stories."""
    auth_agent = AgentWorker("auth", "pm", "1")
    task = create_task("PAYMENTS-001", "...")
    assert auth_agent.should_process(task) == False

def test_domains_run_in_parallel():
    """Multiple domains can execute simultaneously."""
    auth_task = create_task("AUTH-001", "...")
    payments_task = create_task("PAYMENTS-001", "...")
    # Both should be processable at same time
    assert supervisor.can_dispatch_parallel([auth_task, payments_task])
```

**Implementation:**
```
Files:
- src/domain_manager.py        # Domain registration and routing
- src/agents/domain_agent.py   # Base class for domain-specific agents
- docker/Dockerfile.domain     # Per-domain Dockerfile
- docker/docker-compose.domain-auth.yml
- docker/docker-compose.domain-payments.yml
```

#### 2.2 Domain-Specific Docker Images

**Dockerfile.domain:**
```dockerfile
# WAVE Domain Agent Dockerfile
ARG DOMAIN=auth
FROM wave-agent-base:v2

# Domain-specific configuration
ENV AGENT_DOMAIN=${DOMAIN}
COPY domains/${DOMAIN}/CLAUDE.md /app/CLAUDE.md
COPY domains/${DOMAIN}/prompts/ /app/prompts/

# Autonomous execution (CRITICAL)
ENTRYPOINT ["claude", "--dangerously-skip-permissions"]
CMD ["python", "-m", "src.agents.domain_worker"]
```

---

### Phase 3: Autonomous Mode (Priority: CRITICAL)

**Objective:** Enable `--dangerously-skip-permissions` with proper safety gates.

#### 3.1 Prerequisites Checklist

Before enabling autonomous mode, ALL of the following MUST pass:

```
AUTONOMOUS MODE PREREQUISITES
═══════════════════════════════════════════════════════════════════════════════

Safety Gates:
[ ] Emergency Stop mechanism implemented and tested
[ ] DO-178C probes (8/8) passing
[ ] Constitutional AI threshold ≥ 0.85
[ ] Budget hard limits enforced
[ ] All safety tests passing

Infrastructure:
[ ] Domain isolation verified
[ ] Git worktree locks working
[ ] No race conditions in parallel execution

Monitoring:
[ ] LangSmith tracing active
[ ] Dozzle logs accessible
[ ] Slack notifications working
[ ] Budget dashboard available

AUTONOMOUS MODE: [ ] APPROVED / [ ] BLOCKED
```

#### 3.2 Autonomous Dockerfile Update

**TDD Test First:**
```python
# tests/test_autonomous_mode.py
def test_dockerfile_has_autonomous_flag():
    """Dockerfile must include --dangerously-skip-permissions."""
    dockerfile = Path("docker/Dockerfile.agent").read_text()
    assert "--dangerously-skip-permissions" in dockerfile

def test_no_tty_prompts_in_execution():
    """Agent execution must not require TTY input."""
    result = subprocess.run(
        ["docker", "run", "--rm", "-t", "wave-agent:v2", "echo", "test"],
        capture_output=True, timeout=10
    )
    assert result.returncode == 0
```

**Implementation:**
```
Update: docker/Dockerfile.agent

# Add autonomous entrypoint
ENTRYPOINT ["claude", "--dangerously-skip-permissions"]
```

---

### Phase 4: Multi-LLM Routing (Priority: HIGH)

**Objective:** Route tasks to appropriate LLM (Claude for dev, Grok for safety).

#### 4.1 Routing Configuration

**TDD Test First:**
```python
# tests/test_multi_llm.py
def test_grok_routes_for_safety():
    """Safety checks must route to Grok."""
    task = {"type": "constitutional_check", "code": "..."}
    llm = router.get_llm_for_task(task)
    assert llm.provider == "grok"

def test_claude_routes_for_development():
    """Development tasks route to Claude."""
    task = {"type": "code_generation", "requirements": "..."}
    llm = router.get_llm_for_task(task)
    assert llm.provider == "anthropic"

def test_fallback_after_failures():
    """After 2 Claude failures, fallback to Grok."""
    router.record_failure("anthropic")
    router.record_failure("anthropic")
    llm = router.get_llm_for_task(dev_task)
    assert llm.provider == "grok"
```

**Implementation:**
```
File: src/multi_llm_router.py

ROUTING_CONFIG = {
    # Grok: Safety & Validation
    "constitutional_check": "grok",
    "cto_review": "grok",
    "safety_probe": "grok",
    "architecture_validation": "grok",

    # Claude: Development & Creative
    "code_generation": "anthropic",
    "planning": "anthropic",
    "qa_analysis": "anthropic",
    "documentation": "anthropic",
}

FALLBACK_THRESHOLD = 2  # Failures before fallback
```

---

### Phase 5: Portal Integration - Pre-Flight UI (Priority: MEDIUM)

**Objective:** Implement Step 0-9 validation in Portal UI.

#### 5.1 Pre-Flight API Endpoints

```
POST /api/preflight/step0/analyze     # Foundation analysis
POST /api/preflight/step1/validate    # PRD & Stories
GET  /api/preflight/step2/execution   # Execution plan
POST /api/preflight/step3/config      # Configuration validation
POST /api/preflight/step4/infra       # Infrastructure check
POST /api/preflight/step5/safety      # DO-178C probes
GET  /api/preflight/step6/rlm         # RLM status
POST /api/preflight/step7/notify      # Notification test
POST /api/preflight/step8/build       # Build validation
POST /api/preflight/step9/launch      # Launch readiness
```

#### 5.2 Launch Sequence Component

```typescript
// src/components/LaunchSequence.tsx
interface LaunchStep {
  id: number;
  name: string;
  status: 'pending' | 'running' | 'passed' | 'failed' | 'blocked';
  checks: Check[];
}

const LAUNCH_STEPS: LaunchStep[] = [
  { id: 0, name: 'Design', checks: ['foundation', 'mockups', 'docs'] },
  { id: 1, name: 'PRD', checks: ['prd_score', 'stories', 'qa_alignment'] },
  { id: 2, name: 'Execution', checks: ['waves', 'assignments'] },
  // ... steps 3-9
];
```

---

## Implementation Timeline

### Week 1: Critical Safety
| Day | Task | Deliverable |
|-----|------|-------------|
| 1 | Emergency Stop | `emergency_stop.py` + tests |
| 2 | DO-178C Probes | `do178c_probes.py` + 8 probes |
| 3 | Budget Enforcer | `budget_enforcer.py` + tests |
| 4 | Integration | All safety tests passing |
| 5 | Gate 0 Validation | Gate 0 checklist complete |

### Week 2: Domain Isolation
| Day | Task | Deliverable |
|-----|------|-------------|
| 1-2 | Domain Manager | `domain_manager.py` |
| 3 | Domain Dockerfiles | Per-domain images |
| 4 | Domain Compose | `docker-compose.domain-*.yml` |
| 5 | Parallel Test | Cross-domain isolation verified |

### Week 3: Autonomous & Multi-LLM
| Day | Task | Deliverable |
|-----|------|-------------|
| 1 | Autonomous Dockerfile | Updated with flag |
| 2 | Autonomous Tests | No TTY prompts verified |
| 3 | Multi-LLM Router | `multi_llm_router.py` |
| 4 | Grok Integration | Safety routing working |
| 5 | Full Integration | All routing tests passing |

### Week 4: Portal Integration
| Day | Task | Deliverable |
|-----|------|-------------|
| 1-2 | Pre-Flight APIs | `/api/preflight/*` endpoints |
| 3-4 | Launch Sequence UI | React components |
| 5 | E2E Testing | Full pre-flight flow |

---

## Verification Matrix

| Checklist Item | Test File | Implementation File | Status |
|----------------|-----------|---------------------|--------|
| Emergency Stop | `test_emergency_stop.py` | `emergency_stop.py` | TODO |
| DO-178C Probes | `test_do178c_probes.py` | `do178c_probes.py` | TODO |
| Budget Limits | `test_budget.py` | `budget_enforcer.py` | TODO |
| Domain Isolation | `test_domain_isolation.py` | `domain_manager.py` | TODO |
| Autonomous Mode | `test_autonomous_mode.py` | `Dockerfile.agent` | TODO |
| Multi-LLM Routing | `test_multi_llm.py` | `multi_llm_router.py` | TODO |
| LangSmith Tracing | `test_langsmith.py` | Already in `agent_worker.py` | DONE |
| Parallel Execution | `test_parallel.py` | Already in `supervisor.py` | DONE |
| Constitutional AI | `test_constitutional.py` | Already in `agent_worker.py` | DONE |

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Autonomous mode causes damage | Medium | Critical | DO-178C probes + Constitutional AI |
| Budget exceeded | Low | High | Hard limits at infrastructure level |
| Race conditions in domains | Medium | Medium | Git worktree locks |
| Grok API unavailable | Low | Medium | Claude fallback after 2 failures |
| Emergency stop fails | Very Low | Critical | Multiple halt mechanisms (file + Redis + API) |

---

## Success Criteria

### Gate 0 (Foundation)
- [ ] All existing tests passing
- [ ] Distributed architecture verified
- [ ] Gap analysis complete

### Phase 1 (Safety)
- [ ] Emergency stop halts all agents within 5 seconds
- [ ] All 8 DO-178C probes passing
- [ ] Budget cannot be exceeded

### Phase 2 (Domains)
- [ ] Auth domain processes only AUTH-* stories
- [ ] Domains run in parallel without conflicts
- [ ] Each domain has 7-agent team

### Phase 3 (Autonomous)
- [ ] No TTY prompts during execution
- [ ] All safety gates verified before enabling
- [ ] Constitutional AI active

### Phase 4 (Multi-LLM)
- [ ] Grok handles safety checks
- [ ] Claude handles development
- [ ] Fallback working after failures

### Final Launch
- [ ] All 10 pre-flight steps passing
- [ ] Readiness score ≥ 95%
- [ ] Zero blocking issues

---

## Commands Reference

```bash
# Gate 0 Validation
./scripts/validate-gate0.sh

# Run Safety Tests
pytest tests/test_emergency_stop.py tests/test_do178c_probes.py tests/test_budget.py -v

# Build Domain Images
./scripts/build-domain-images.sh auth payments orders

# Full Pre-Flight Check
wave preflight --all

# Launch with Pre-Flight
wave launch --preflight-required
```

---

**Document Status:** DRAFT
**Requires Approval:** Grok + Human
**Next Step:** Gate 0 Validation

