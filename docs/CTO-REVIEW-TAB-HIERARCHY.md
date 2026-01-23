# CTO Review: WAVE Portal Pre-Flight Checklist Architecture

> **Review Type:** Architecture & Hierarchy Analysis
> **Reviewer Role:** CTO Advisory
> **Date:** 2026-01-23

---

## Executive Summary

We have built an **aerospace-grade pre-flight validation system** for autonomous AI coding agents. The system ensures all prerequisites are met before launching agents that will autonomously write, test, and deploy code. This is critical because:

1. **Autonomous agents have real consequences** - They create PRs, modify code, and can incur costs
2. **Failure is expensive** - A misconfigured agent wastes tokens ($) and developer time
3. **Safety is paramount** - Agents must operate within defined boundaries

**Your intuition is correct.** The current tab hierarchy has a logical flaw. Let me explain what we built, why, and the correct order.

---

## What We Built: Purpose of Each Tab

### Tab 1: Project Overview
**Purpose:** Understand WHAT we're building

| Aspect | Details |
|--------|---------|
| **Function** | Analyzes project structure, discovers files, generates gap analysis |
| **Key Output** | Readiness score (0-100%), identified gaps with priorities |
| **Why First** | You can't plan what you don't understand |
| **Analogy** | Pilot reviewing flight plan and aircraft status before anything else |

**What it validates:**
- Project file structure exists and is organized
- CLAUDE.md (project guidelines) is present
- Stories are defined and properly formatted
- Prototypes/mockups are available
- Gaps are identified and prioritized

---

### Tab 2: Execution Plan
**Purpose:** Understand HOW we'll build it

| Aspect | Details |
|--------|---------|
| **Function** | Shows wave execution sequence, story assignments, timeline |
| **Key Output** | Clear understanding of development phases |
| **Why Second** | Before configuring anything, understand the plan |
| **Analogy** | Flight plan - route, waypoints, fuel requirements |

**What it shows:**
- Wave sequence (Wave 1 → Wave 2 → Wave 3)
- Story assignments per wave
- Agent allocation strategy
- Dependencies between stories

---

### Tab 3: Configurations (SHOULD BE HERE - Currently Tab 4)
**Purpose:** Ensure we have ACCESS to required services

| Aspect | Details |
|--------|---------|
| **Function** | Manage API keys, credentials, service connections |
| **Key Output** | All required credentials configured and tested |
| **Why Third** | Infrastructure validation DEPENDS on having credentials |
| **Analogy** | Ensuring you have fuel card, radio frequencies, clearance codes |

**What it manages:**
- `ANTHROPIC_API_KEY` - Access to Claude AI (REQUIRED)
- `SUPABASE_URL/KEY` - Database access (REQUIRED)
- `SLACK_WEBHOOK_URL` - Notifications (Optional)
- `GITHUB_TOKEN` - PR creation (Optional)
- `VERCEL_TOKEN` - Deployments (Optional)
- `WAVE_BUDGET_LIMIT` - Cost control (REQUIRED)

**Critical Insight:** You cannot validate that "Supabase is reachable" (Infrastructure) without first having the Supabase credentials (Configuration).

---

### Tab 4: Infrastructure (SHOULD BE HERE - Currently Tab 3)
**Purpose:** Validate the PLATFORM is ready

| Aspect | Details |
|--------|---------|
| **Function** | Validates Docker, Git, worktrees, services are operational |
| **Key Output** | All infrastructure components green/ready |
| **Why Fourth** | Depends on configurations; validates they work |
| **Analogy** | Pre-flight aircraft systems check - engines, hydraulics, avionics |

**What it validates:**
- Git worktrees exist and are on correct branches
- Docker is installed and running
- Docker Compose configuration is valid
- Services are reachable (using credentials from Config tab)
- Signal file system is ready

---

### Tab 5: Aerospace Safety
**Purpose:** Ensure SAFETY compliance before any autonomous operation

| Aspect | Details |
|--------|---------|
| **Function** | DO-178C inspired safety validation |
| **Key Output** | Safety certification - agents have boundaries |
| **Why Fifth** | After infrastructure is ready, ensure safety constraints exist |
| **Analogy** | Safety briefing, emergency procedures, abort criteria |

**What it validates:**
- FMEA (Failure Mode Effects Analysis) - 17 failure modes documented
- Emergency Levels (E1-E5) - Escalation procedures defined
- Approval Matrix (L0-L5) - What requires human approval
- Forbidden Operations (108) - What agents can NEVER do
- Safety scripts are executable

---

### Tab 6: RLM Protocol
**Purpose:** Ensure AI MEMORY and CONTEXT systems are ready

| Aspect | Details |
|--------|---------|
| **Function** | Validates P Variable, Agent Memory, Snapshots, Budget |
| **Key Output** | Gate 0 certification - AI context management ready |
| **Why Sixth** | After safety, ensure AI has proper context and memory |
| **Analogy** | Loading navigation data, previous flight logs, fuel calculations |

**What it validates:**
- P Variable (project context) is generated
- Agent memory directories exist
- Snapshot/recovery system is ready
- Token budget tracking is configured
- RLM scripts are available

**Gate 0 Lock:** This tab generates the critical `gate0-lock.json` that certifies the system is ready for autonomous operation.

---

### Tab 7: Build QA
**Purpose:** Ensure BUILD and TEST systems work

| Aspect | Details |
|--------|---------|
| **Function** | Validates build commands, test suites, linting |
| **Key Output** | Confidence that code changes can be validated |
| **Why Seventh** | Before dispatching agents, ensure their output can be tested |
| **Analogy** | Pre-flight test of instruments, control surfaces |

**What it should validate (PENDING IMPLEMENTATION):**
- Build command succeeds (`npm run build` / `pnpm build`)
- TypeScript compilation passes
- ESLint/Prettier configured
- Test suite runs (`npm test`)
- No critical vulnerabilities in dependencies

---

### Tab 8: Notifications
**Purpose:** Ensure COMMUNICATION channels are ready

| Aspect | Details |
|--------|---------|
| **Function** | Configure Slack alerts, webhooks, escalation |
| **Key Output** | Team will be notified of agent activity |
| **Why Eighth** | Before launch, ensure humans can monitor and intervene |
| **Analogy** | Radio check, confirming ATC communication |

**What it should validate (PENDING IMPLEMENTATION):**
- Slack webhook is configured and tested
- Notification templates are defined
- Escalation rules are configured
- Team channels are specified

---

### Tab 9: Agent Dispatch
**Purpose:** LAUNCH and MONITOR autonomous agents

| Aspect | Details |
|--------|---------|
| **Function** | Start/stop agents, view output, monitor costs |
| **Key Output** | Agents running and producing code |
| **Why Last** | Only after ALL checks pass should agents be launched |
| **Analogy** | Takeoff - only after all checklists complete |

**What it provides:**
- Visual status of all 8 agents
- Start/Stop controls
- Real-time terminal output
- Token usage and cost tracking
- Activity feed from signal files
- **Validate All** button for final check

---

## Current vs Recommended Hierarchy

### ~~Current Order (FLAWED)~~ FIXED!

The tab order has been corrected. The implementation now follows the logical dependency chain.

### Implemented Order (CORRECT)

```
1. Project Overview     → Understand WHAT
2. Execution Plan       → Understand HOW
3. Configurations       → Get ACCESS (keys, credentials)     ✓ FIXED
4. Infrastructure       → Validate PLATFORM (uses credentials) ✓ FIXED
5. Aerospace Safety     → Ensure BOUNDARIES
6. RLM Protocol         → Prepare AI CONTEXT
7. Build QA             → Validate BUILD SYSTEM
8. Notifications        → Ensure COMMUNICATION
9. Agent Dispatch       → LAUNCH (only when all green)
```

**Change Made:** Swapped tabs 3 and 4 so Configurations comes before Infrastructure.

---

## Dependency Chain Visualization

```
┌─────────────────────────────────────────────────────────────────────┐
│                         WAVE PRE-FLIGHT                             │
│                      Dependency Flow Chart                          │
└─────────────────────────────────────────────────────────────────────┘

┌──────────────────┐
│  1. PROJECT      │  "What are we building?"
│     OVERVIEW     │  - File structure
└────────┬─────────┘  - Stories discovered
         │
         ▼
┌──────────────────┐
│  2. EXECUTION    │  "How will we build it?"
│     PLAN         │  - Wave sequence
└────────┬─────────┘  - Agent assignments
         │
         ▼
┌──────────────────┐
│  3. CONFIG-      │  "Do we have access?"
│     URATIONS     │  - API keys          ◄── MUST COME BEFORE
└────────┬─────────┘  - Credentials            INFRASTRUCTURE
         │
         ▼
┌──────────────────┐
│  4. INFRA-       │  "Is the platform ready?"
│     STRUCTURE    │  - Docker running     ◄── USES credentials
└────────┬─────────┘  - Services reachable      from Config tab
         │
         ▼
┌──────────────────┐
│  5. AEROSPACE    │  "Are there safety boundaries?"
│     SAFETY       │  - FMEA documented
└────────┬─────────┘  - Forbidden ops defined
         │
         ▼
┌──────────────────┐
│  6. RLM          │  "Is AI context ready?"
│     PROTOCOL     │  - P Variable loaded
└────────┬─────────┘  - Gate 0 certified
         │
         ▼
┌──────────────────┐
│  7. BUILD QA     │  "Can we validate output?"
│                  │  - Build works
└────────┬─────────┘  - Tests pass
         │
         ▼
┌──────────────────┐
│  8. NOTIFI-      │  "Can humans monitor?"
│     CATIONS      │  - Slack configured
└────────┬─────────┘  - Alerts working
         │
         ▼
┌──────────────────┐
│  9. AGENT        │  "LAUNCH!"
│     DISPATCH     │  - All checks green
└──────────────────┘  - Start agents

```

---

## CTO Recommendations

### 1. Reorder Tabs Immediately

**Priority: HIGH**

Swap tabs 3 and 4:
- Current Tab 3 (Infrastructure) → New Tab 4
- Current Tab 4 (Configurations) → New Tab 3

This fixes the logical dependency issue.

### 2. Add Dependency Enforcement

**Priority: HIGH**

Prevent users from accessing later tabs until earlier tabs pass:

```typescript
// Pseudo-code
const canAccessTab = {
  'project-overview': true,  // Always accessible
  'execution-plan': projectOverviewPassed,
  'configurations': executionPlanViewed,
  'infrastructure': configurationsPassed,  // Requires configs!
  'aerospace-safety': infrastructurePassed,
  'rlm-protocol': safetyPassed,
  'build-qa': rlmPassed,
  'notifications': buildQaPassed,
  'agent-dispatch': allPreviousPassed
}
```

### 3. Add "Ready for Launch" Gate

**Priority: MEDIUM**

The Agent Dispatch tab should show a clear "Ready for Launch" status that summarizes all previous tabs:

```
┌─────────────────────────────────────────────┐
│         LAUNCH READINESS STATUS             │
├─────────────────────────────────────────────┤
│  ✓ Project Overview    ANALYZED             │
│  ✓ Execution Plan      REVIEWED             │
│  ✓ Configurations      ALL SET              │
│  ✓ Infrastructure      READY                │
│  ✓ Aerospace Safety    COMPLIANT            │
│  ✓ RLM Protocol        GATE 0 CERTIFIED     │
│  ⚠ Build QA            NOT VALIDATED        │
│  ✓ Notifications       CONFIGURED           │
├─────────────────────────────────────────────┤
│  STATUS: READY WITH WARNINGS                │
│  [  LAUNCH AGENTS  ]                        │
└─────────────────────────────────────────────┘
```

### 4. Complete Pending Tabs

**Priority: MEDIUM**

- **Build QA (Tab 7):** Critical for validating agent output
- **Notifications (Tab 8):** Critical for human oversight

Without these, you're flying partially blind.

### 5. Add "Quick Revalidate" Feature

**Priority: LOW**

After initial validation, allow quick re-validation that only checks changed items, not everything from scratch.

---

## Why This Architecture Matters

### The Autonomous Agent Risk Model

```
                    RISK INCREASES
                          ▲
                          │
    ┌─────────────────────┼─────────────────────┐
    │                     │                     │
    │   UNCONFIGURED      │     MISCONFIGURED   │
    │   AGENTS            │     AGENTS          │
    │                     │                     │
    │   - Won't start     │     - Wrong repo    │
    │   - Obvious failure │     - Wrong branch  │
    │   - Low risk        │     - Cost overrun  │
    │                     │                     │
    ├─────────────────────┼─────────────────────┤
    │                     │                     │
    │   PROPERLY          │     MALICIOUS/      │
    │   CONFIGURED        │     COMPROMISED     │
    │                     │                     │
    │   - Works correctly │     - Data breach   │
    │   - Within budget   │     - Code injection│
    │   - Safe operation  │     - Catastrophic  │
    │                     │                     │
    └─────────────────────┴─────────────────────┘
                          │
                          ▼
                    RISK DECREASES
```

The pre-flight checklist ensures we're in the "Properly Configured" quadrant.

### Cost of Skipping Checks

| Skipped Check | Potential Consequence |
|---------------|----------------------|
| Project Overview | Agents work on wrong files |
| Configurations | Agents can't access services |
| Infrastructure | Docker fails mid-operation |
| Safety | Agents exceed boundaries |
| RLM Protocol | Agents lose context, repeat work |
| Build QA | Broken code gets merged |
| Notifications | Issues go unnoticed |

---

## Implementation Checklist

### Immediate Actions (This Week)

- [x] Swap Tab 3 (Infrastructure) and Tab 4 (Configurations) ✅ DONE
- [x] Update tab numbering/shortcuts accordingly ✅ DONE
- [x] Update documentation to reflect new order ✅ DONE

### Short-Term Actions (This Month)

- [ ] Implement Build QA tab validation
- [ ] Implement Notifications tab configuration
- [ ] Add dependency enforcement between tabs
- [ ] Add "Launch Readiness" summary to Agent Dispatch

### Long-Term Actions (This Quarter)

- [ ] Add validation caching (don't re-run passed checks)
- [ ] Add historical tracking (when did each check last pass?)
- [ ] Add auto-remediation (fix common issues automatically)
- [ ] Add parallel validation for independent checks

---

## Conclusion

**Your intuition was correct.** Configurations must come before Infrastructure because Infrastructure validation depends on having the credentials configured.

The WAVE Pre-Flight Checklist is a sophisticated system that:

1. **Ensures understanding** before action (Tabs 1-2)
2. **Ensures access** before validation (Tab 3 - should be Config)
3. **Ensures readiness** before safety (Tab 4 - should be Infra)
4. **Ensures safety** before AI context (Tab 5)
5. **Ensures context** before build validation (Tab 6)
6. **Ensures validation** before communication (Tab 7)
7. **Ensures communication** before launch (Tab 8)
8. **Enables launch** only when ready (Tab 9)

This is aerospace-grade thinking applied to autonomous AI agents. The cost of a misconfigured agent is measured in dollars, time, and potentially compromised code. The pre-flight checklist is your insurance policy.

---

*"A checklist is not a limitation on expertise; it is a tool that enhances it."*
*— Adapted from Atul Gawande, The Checklist Manifesto*

---

**Recommended Next Step:** Reorder tabs 3 and 4, then implement the dependency enforcement to prevent users from skipping ahead.
