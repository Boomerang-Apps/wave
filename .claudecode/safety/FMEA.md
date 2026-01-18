# WAVE Framework - Failure Mode and Effects Analysis (FMEA)

**Version:** 1.0.0
**Standard:** Aerospace DO-178C Inspired
**Purpose:** Document all known failure modes and mitigations

---

## FMEA Overview

This document catalogs **all known failure modes** in the WAVE multi-agent pipeline, their causes, effects, detection methods, and mitigations.

**Severity Levels:**
- **S1 (Catastrophic):** System destroyed, data loss, security breach
- **S2 (Critical):** Pipeline fails completely, requires restart
- **S3 (Major):** Significant delay, partial failure
- **S4 (Minor):** Inconvenience, workaround available
- **S5 (Negligible):** Cosmetic, no impact

**Detection Levels:**
- **D1:** Impossible to detect before failure
- **D2:** Low detection probability
- **D3:** Moderate detection probability
- **D4:** High detection probability
- **D5:** Automatic detection (built-in)

**Risk Priority Number (RPN) = Severity × Detection** (Lower is better)

---

## Failure Mode Catalog

### FM-001: Agent Runs as Root User

| Attribute | Value |
|-----------|-------|
| **ID** | FM-001 |
| **Mode** | Agent container runs as root |
| **Cause** | Missing USER directive in Dockerfile |
| **Effect** | `--dangerously-skip-permissions` blocked |
| **Severity** | S2 (Critical) |
| **Detection** | D5 (Auto - CLI error) |
| **RPN** | 10 |
| **Mitigation** | Dockerfile.agent with `USER waveagent` |
| **Verification** | `pre-flight-validator.sh` checks Dockerfile |

---

### FM-002: Missing API Key

| Attribute | Value |
|-----------|-------|
| **ID** | FM-002 |
| **Mode** | ANTHROPIC_API_KEY not set |
| **Cause** | .env not configured |
| **Effect** | All agents fail immediately |
| **Severity** | S2 (Critical) |
| **Detection** | D5 (Auto - pre-flight) |
| **RPN** | 10 |
| **Mitigation** | Pre-flight gate validates API key |
| **Verification** | `pre-flight-validator.sh` Section 1 |

---

### FM-003: Signal File Not Created

| Attribute | Value |
|-----------|-------|
| **ID** | FM-003 |
| **Mode** | Agent completes but no signal file |
| **Cause** | Agent prompt unclear, agent confusion |
| **Effect** | Next gate never starts (pipeline stuck) |
| **Severity** | S2 (Critical) |
| **Detection** | D3 (Requires monitoring) |
| **RPN** | 6 |
| **Mitigation** | Explicit signal file instructions in prompt |
| **Verification** | `wave-orchestrator.sh` stuck detection |

---

### FM-004: Kill Switch Ignored

| Attribute | Value |
|-----------|-------|
| **ID** | FM-004 |
| **Mode** | Agent continues after kill switch |
| **Cause** | Kill switch not checked in loop |
| **Effect** | Runaway agent, budget exceeded |
| **Severity** | S1 (Catastrophic) |
| **Detection** | D4 (Manual observation) |
| **RPN** | 4 |
| **Mitigation** | Kill switch check BEFORE and AFTER each Claude call |
| **Verification** | `check-kill-switch.sh --continuous` |

---

### FM-005: Budget Exceeded

| Attribute | Value |
|-----------|-------|
| **ID** | FM-005 |
| **Mode** | Token costs exceed budget |
| **Cause** | No budget enforcement, agent loops |
| **Effect** | Unexpected API charges |
| **Severity** | S3 (Major) |
| **Detection** | D5 (Auto - orchestrator) |
| **RPN** | 15 |
| **Mitigation** | Budget thresholds at 75%, 90%, 100% |
| **Verification** | `wave-orchestrator.sh` cost tracking |

---

### FM-006: Infinite Retry Loop

| Attribute | Value |
|-----------|-------|
| **ID** | FM-006 |
| **Mode** | QA keeps rejecting, dev keeps retrying |
| **Cause** | Unfixable issue, unclear acceptance criteria |
| **Effect** | Budget exhausted, time wasted |
| **Severity** | S3 (Major) |
| **Detection** | D5 (Auto - retry counter) |
| **RPN** | 15 |
| **Mitigation** | Max 3 retries then ESCALATION signal |
| **Verification** | `wave-orchestrator.sh` escalation logic |

---

### FM-007: Git Merge Conflict

| Attribute | Value |
|-----------|-------|
| **ID** | FM-007 |
| **Mode** | Worktree branches conflict on merge |
| **Cause** | FE and BE modified same file |
| **Effect** | Manual intervention required |
| **Severity** | S3 (Major) |
| **Detection** | D5 (Auto - git error) |
| **RPN** | 15 |
| **Mitigation** | Domain boundaries in agent configs |
| **Verification** | Agent ALLOWED/FORBIDDEN file lists |

---

### FM-008: Supabase Connection Failed

| Attribute | Value |
|-----------|-------|
| **ID** | FM-008 |
| **Mode** | Cannot connect to Supabase |
| **Cause** | Wrong URL, expired key, network issue |
| **Effect** | No event logging, no kill switch remote |
| **Severity** | S4 (Minor) |
| **Detection** | D5 (Auto - pre-flight) |
| **RPN** | 20 |
| **Mitigation** | Pre-flight connectivity test |
| **Verification** | `pre-flight-validator.sh` Section 5 |

---

### FM-009: Slack Notification Failed

| Attribute | Value |
|-----------|-------|
| **ID** | FM-009 |
| **Mode** | Slack webhook not working |
| **Cause** | Invalid URL, channel deleted |
| **Effect** | No real-time alerts |
| **Severity** | S4 (Minor) |
| **Detection** | D4 (Noticed when no alerts arrive) |
| **RPN** | 16 |
| **Mitigation** | Fallback to console logging |
| **Verification** | `pre-flight-validator.sh` Slack check |

---

### FM-010: Docker Not Running

| Attribute | Value |
|-----------|-------|
| **ID** | FM-010 |
| **Mode** | Docker daemon not started |
| **Cause** | System restart, Docker crashed |
| **Effect** | No agents can start |
| **Severity** | S2 (Critical) |
| **Detection** | D5 (Auto - pre-flight) |
| **RPN** | 10 |
| **Mitigation** | Pre-flight Docker check |
| **Verification** | `pre-flight-validator.sh` Section 5 |

---

### FM-011: Agent Timeout

| Attribute | Value |
|-----------|-------|
| **ID** | FM-011 |
| **Mode** | Agent takes too long, times out |
| **Cause** | Complex task, agent stuck in loop |
| **Effect** | Gate fails, retry needed |
| **Severity** | S3 (Major) |
| **Detection** | D5 (Auto - timeout) |
| **RPN** | 15 |
| **Mitigation** | Timeout limits in docker-compose |
| **Verification** | `timeout 600` in agent commands |

---

### FM-012: Safety Violation

| Attribute | Value |
|-----------|-------|
| **ID** | FM-012 |
| **Mode** | Agent executes forbidden operation |
| **Cause** | Prompt injection, unclear instructions |
| **Effect** | Security breach, data loss |
| **Severity** | S1 (Catastrophic) |
| **Detection** | D3 (Log monitoring) |
| **RPN** | 3 |
| **Mitigation** | Safety violation detector, forbidden ops list |
| **Verification** | `safety-violation-detector.sh` |

---

### FM-013: Story JSON Invalid

| Attribute | Value |
|-----------|-------|
| **ID** | FM-013 |
| **Mode** | Story file has invalid JSON |
| **Cause** | Manual editing error, encoding issue |
| **Effect** | Agent cannot parse story |
| **Severity** | S3 (Major) |
| **Detection** | D5 (Auto - JSON parse) |
| **RPN** | 15 |
| **Mitigation** | JSON schema validation |
| **Verification** | `pre-flight-validator.sh` story check |

---

### FM-014: Worktree Not Created

| Attribute | Value |
|-----------|-------|
| **ID** | FM-014 |
| **Mode** | Git worktree setup fails |
| **Cause** | Not a git repo, permission denied |
| **Effect** | Agents share same directory (conflicts) |
| **Severity** | S2 (Critical) |
| **Detection** | D5 (Auto - script error) |
| **RPN** | 10 |
| **Mitigation** | Pre-flight worktree validation |
| **Verification** | `setup-worktrees.sh` error handling |

---

### FM-015: Wave Dependency Not Met

| Attribute | Value |
|-----------|-------|
| **ID** | FM-015 |
| **Mode** | Wave 2 starts before Wave 1 complete |
| **Cause** | Missing depends_on, signal not checked |
| **Effect** | Wave 2 builds on incomplete code |
| **Severity** | S3 (Major) |
| **Detection** | D4 (Build failures) |
| **RPN** | 12 |
| **Mitigation** | Signal verification before each gate |
| **Verification** | `depends_on: service_completed_successfully` |

---

### FM-016: Environment Variable Leak

| Attribute | Value |
|-----------|-------|
| **ID** | FM-016 |
| **Mode** | API key logged or committed |
| **Cause** | Agent echoes $ANTHROPIC_API_KEY |
| **Effect** | Security breach, key compromised |
| **Severity** | S1 (Catastrophic) |
| **Detection** | D2 (Hard to detect) |
| **RPN** | 2 |
| **Mitigation** | FORBIDDEN: "echo $.*KEY" pattern |
| **Verification** | `safety-violation-detector.sh` |

---

### FM-017: Force Push to Main

| Attribute | Value |
|-----------|-------|
| **ID** | FM-017 |
| **Mode** | Agent runs `git push --force origin main` |
| **Cause** | Unclear instructions, agent confusion |
| **Effect** | Git history lost, webhooks broken |
| **Severity** | S1 (Catastrophic) |
| **Detection** | D3 (Log monitoring) |
| **RPN** | 3 |
| **Mitigation** | FORBIDDEN operation, use --force-with-lease |
| **Verification** | `safety-violation-detector.sh` |

---

## Summary Statistics

| Severity | Count | Mitigated |
|----------|-------|-----------|
| S1 (Catastrophic) | 4 | 4 (100%) |
| S2 (Critical) | 5 | 5 (100%) |
| S3 (Major) | 6 | 6 (100%) |
| S4 (Minor) | 2 | 2 (100%) |
| **Total** | **17** | **17 (100%)** |

**Average RPN:** 10.5 (Low risk with mitigations)

---

## Verification Matrix

| FM-ID | Pre-Flight | Orchestrator | Detector | Manual |
|-------|------------|--------------|----------|--------|
| FM-001 | ✅ | | | |
| FM-002 | ✅ | | | |
| FM-003 | | ✅ | | |
| FM-004 | | ✅ | ✅ | |
| FM-005 | | ✅ | | |
| FM-006 | | ✅ | | |
| FM-007 | | | | ✅ |
| FM-008 | ✅ | | | |
| FM-009 | ✅ | | | |
| FM-010 | ✅ | | | |
| FM-011 | | ✅ | | |
| FM-012 | | | ✅ | |
| FM-013 | ✅ | | | |
| FM-014 | ✅ | | | |
| FM-015 | | ✅ | | |
| FM-016 | | | ✅ | |
| FM-017 | | | ✅ | |

---

*WAVE Framework | FMEA Document | Version 1.0.0*
