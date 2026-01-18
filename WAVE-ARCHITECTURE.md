# WAVE Architecture - Comprehensive Technical Documentation

**Version:** 2.0.0
**Classification:** AEROSPACE-GRADE | DO-178C Level B Inspired
**Date:** 2026-01-17
**Status:** AUTHORITATIVE REFERENCE

---

## Document Purpose

This document provides the definitive architectural specification for WAVE (Workflow Automation for Verified Execution). It addresses:

1. The separation between WAVE Controller and Project Buckets
2. Domain-Specific Execution model
3. AI Story validation flow
4. Git Worktree isolation strategy
5. Scaled deployment with CTO Master
6. Aerospace-grade safety standards

---

# PART 1: THE BIG PICTURE

## 1.1 Two Distinct Systems

WAVE architecture consists of **two fundamentally separate concerns**:

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                                                                 │
│                        WAVE CONTROLLER                                          │
│                   (The Orchestration System)                                    │
│                                                                                 │
│   • Project-agnostic automation framework                                       │
│   • Defines HOW work is done (process, safety, gates)                          │
│   • Contains: scripts, validators, agent configs, safety rules                  │
│   • Location: /Volumes/SSD-01/Projects/WAVE/                                   │
│   • Reusable across ALL projects                                               │
│                                                                                 │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│                        PROJECT BUCKETS                                          │
│                   (The Actual Applications)                                     │
│                                                                                 │
│   • Domain-specific codebases                                                   │
│   • Defines WHAT is being built (features, business logic)                     │
│   • Contains: source code, tests, assets, AI Stories                           │
│   • Examples: AirView, PhotoGallery, Fixr                                      │
│   • Each project is CONTROLLED BY WAVE                                         │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Analogy: Air Traffic Control

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                                                                  │
│                          ✈️  THE AVIATION ANALOGY  ✈️                            │
│                                                                                  │
│  ┌───────────────────────────────────────────────────────────────────────────┐  │
│  │                           WAVE FRAMEWORK                                  │  │
│  │                      (Air Traffic Control - ATC)                          │  │
│  │                                                                           │  │
│  │  • Controls ALL airline companies (projects)                              │  │
│  │  • Ensures safety standards across the industry                           │  │
│  │  • Coordinates takeoffs and landings (merges/deploys)                     │  │
│  │  • Emergency management (kill switch, E1-E5)                              │  │
│  │  • CTO Master monitors from here                                          │  │
│  └───────────────────────────────────────────────────────────────────────────┘  │
│                                       │                                         │
│           ┌───────────────────────────┼───────────────────────────┐             │
│           │                           │                           │             │
│           ▼                           ▼                           ▼             │
│  ┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐   │
│  │  PHOTOGALLERY   │         │     AIRVIEW     │         │      FIXR       │   │
│  │ (Delta Airlines)│         │(United Airlines)│         │  (Southwest)    │   │
│  │                 │         │                 │         │                 │   │
│  │ Multiple flights│         │ Multiple flights│         │ Multiple flights│   │
│  │ (domains)       │         │ (domains)       │         │ (domains)       │   │
│  └────────┬────────┘         └────────┬────────┘         └────────┬────────┘   │
│           │                           │                           │             │
│   ┌───────┴───────┐           ┌───────┴───────┐           ┌───────┴───────┐    │
│   │               │           │               │           │               │    │
│   ▼               ▼           ▼               ▼           ▼               ▼    │
│ ┌─────┐       ┌─────┐      ┌─────┐       ┌─────┐      ┌─────┐       ┌─────┐   │
│ │ ✈️  │       │ ✈️  │      │ ✈️  │       │ ✈️  │      │ ✈️  │       │ ✈️  │   │
│ │AUTH │       │ALBUM│      │FLIGHT│      │BOOK │      │JOBS │       │ MSG │   │
│ │DL101│       │DL102│      │UA201│       │UA202│      │SW301│       │SW302│   │
│ │     │       │     │      │     │       │     │      │     │       │     │   │
│ │Crew:│       │Crew:│      │Crew:│       │Crew:│      │Crew:│       │Crew:│   │
│ │7 AI │       │7 AI │      │7 AI │       │7 AI │      │7 AI │       │7 AI │   │
│ │Agents│      │Agents│     │Agents│      │Agents│     │Agents│      │Agents│  │
│ │     │       │     │      │     │       │     │      │     │       │     │   │
│ │Pass:│       │Pass:│      │Pass:│       │Pass:│      │Pass:│       │Pass:│   │
│ │Stories│     │Stories│    │Stories│     │Stories│    │Stories│     │Stories│ │
│ └─────┘       └─────┘      └─────┘       └─────┘      └─────┘       └─────┘   │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## The Complete Aviation Mapping

| Aviation Concept | WAVE Equivalent | Description |
|------------------|-----------------|-------------|
| **Airport** | WAVE Portal | The entire facility/system |
| **ATC Master Controller** | CTO Master (Claude Code) | Single authority controlling all traffic |
| **Airline Company** | Project (PhotoGallery, AirView, Fixr) | Organization with multiple flights |
| **Individual Aircraft** | Domain (Auth, Payment, Albums) | One flight, one journey |
| **Flight Crew** | 7-Agent Team | Operates the aircraft |
| **Passengers** | AI Stories | The "cargo" being delivered safely |

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                                                                  │
│                              WAVE PORTAL                                         │
│                            (The Airport)                                         │
│                                                                                  │
│   ┌─────────────────────────────────────────────────────────────────────────┐   │
│   │                                                                          │   │
│   │                    🗼 CTO MASTER (Claude Code)                           │   │
│   │                   (ATC Master Controller)                                │   │
│   │                                                                          │   │
│   │   • Sits in the control tower                                           │   │
│   │   • Oversees ALL flights (domains) across ALL airlines (projects)       │   │
│   │   • Validates execution plans (Step 5)                                  │   │
│   │   • Connects systems (Step 7)                                           │   │
│   │   • Runs pre-flight checks (Step 8)                                     │   │
│   │   • Gives clearance for takeoff/landing                                 │   │
│   │   • Approves merges to main                                             │   │
│   │   • Handles emergencies (escalations, kill switch)                      │   │
│   │   • SINGLE AUTHORITY for the entire airport                             │   │
│   │                                                                          │   │
│   └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## Crew Roles (7 Agents)

| Crew Role | Agent | Responsibility |
|-----------|-------|----------------|
| **Captain** | Domain CTO | Validates flight plan, makes critical decisions |
| **First Officer** | Domain PM | Executes flight plan, coordinates crew |
| **Flight Engineer 1** | FE-Dev-1 | Operates frontend systems |
| **Flight Engineer 2** | FE-Dev-2 | Operates frontend systems (Wave 2) |
| **Systems Engineer 1** | BE-Dev-1 | Operates backend systems |
| **Systems Engineer 2** | BE-Dev-2 | Operates backend systems (Wave 2) |
| **Safety Officer** | QA | Pre-landing safety checks |
| **Maintenance** | Dev-Fix | Repairs when something breaks mid-flight |

## Passenger Journey (Story Lifecycle)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        🎫 PASSENGER (STORY) JOURNEY                             │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  1. TICKET PURCHASED (Story Created)                                            │
│     └─ Passenger books flight → Story written in AI PRD                         │
│                                                                                  │
│  2. CHECK-IN (Story Validated)                                                  │
│     └─ Passenger verified → Domain CTO validates story is achievable            │
│                                                                                  │
│  3. BOARDING (Story Assigned)                                                   │
│     └─ Passenger boards plane → Domain PM assigns to developer                  │
│                                                                                  │
│  4. TAKEOFF (Execution Begins)                                                  │
│     └─ Plane departs → Developer starts coding in worktree                      │
│                                                                                  │
│  5. IN-FLIGHT (Gates 2-4)                                                       │
│     └─ Cruising altitude → Code written, tested, QA validated                   │
│                                                                                  │
│  6. LANDING CLEARANCE (Gate 5)                                                  │
│     └─ ATC clears landing → PM approves, pre-merge-validator passes             │
│                                                                                  │
│  7. TOUCHDOWN (Merge)                                                           │
│     └─ Wheels down → CTO Master merges to main branch                           │
│                                                                                  │
│  8. ARRIVAL GATE (Deploy)                                                       │
│     └─ Passenger exits → Story deployed, post-deploy-validator confirms         │
│                                                                                  │
│  ✅ PASSENGER DELIVERED SAFELY = STORY COMPLETED SUCCESSFULLY                   │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## Flight Operations Mapping

| Flight Phase | WAVE Phase | Validator |
|--------------|------------|-----------|
| **Pre-flight Check** | Before pipeline | `pre-flight-validator.sh` |
| **Taxi to Runway** | Story assignment | Gate 0-1 |
| **Takeoff Clearance** | GO decision | Must pass all pre-flight |
| **Climb** | Development | Gates 2-3 |
| **Cruise** | QA Validation | Gate 4 |
| **Descent** | PM Review | Gate 5 |
| **Landing Clearance** | Merge approval | `pre-merge-validator.sh` |
| **Touchdown** | Merge to main | CTO Master executes |
| **Taxi to Gate** | Deployment | CI/CD pipeline |
| **Arrival** | Live in production | `post-deploy-validator.sh` |

## Safety Systems Mapping

| Aviation Safety | WAVE Safety | Purpose |
|-----------------|-------------|---------|
| **FAA Regulations** | 108 Forbidden Operations | What you CANNOT do |
| **Pre-flight Checklist** | `pre-flight-validator.sh` | 80+ checks before start |
| **TCAS (Collision Avoidance)** | `safety-violation-detector.sh` | Real-time monitoring |
| **Black Box (FDR/CVR)** | Supabase Event Logging | Full audit trail |
| **Mayday Call** | E5 Emergency Halt | Immediate stop everything |
| **Emergency Landing** | E3 Wave Stop | Abort current operation safely |
| **Pilot Authority** | Human Escalation | Human makes final call |
| **Runway Incursion Prevention** | Domain Boundaries | Domains can't interfere |

## Why This Analogy Works

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                                                                  │
│  "Just as aviation's goal is to transport passengers safely from A to B,        │
│   WAVE's goal is to transport Stories (features) safely from PRD to             │
│   Production. The crew (agents) operates the flight (domain), the airline       │
│   (project) owns multiple flights, and ATC (WAVE) ensures everyone follows      │
│   safety protocols and lands without collision."                                │
│                                                                                  │
│  KEY INSIGHT: Stories are passengers - they're what we're delivering.           │
│  The entire system exists to get passengers to their destination safely.        │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 1.2 Visual Architecture

```
                                    ┌─────────────────────────────────────┐
                                    │         CTO MASTER AI               │
                                    │        (Merge-Watcher)              │
                                    │  ════════════════════════════════   │
                                    │  • EXTERNAL to all Docker envs      │
                                    │  • Watches for approved stories     │
                                    │  • Cross-domain conflict check      │
                                    │  • Merges to main branch            │
                                    │  • Triggers production deploy       │
                                    │  • Single source of truth           │
                                    └──────────────┬──────────────────────┘
                                                   │
                    ┌──────────────────────────────┼──────────────────────────────┐
                    │                              │                              │
                    ▼                              ▼                              ▼
     ┌──────────────────────────┐  ┌──────────────────────────┐  ┌──────────────────────────┐
     │          VM 1            │  │          VM 2            │  │          VM 3            │
     │    AUTHENTICATION        │  │        PAYMENTS          │  │      USER PROFILE        │
     │        DOMAIN            │  │         DOMAIN           │  │         DOMAIN           │
     │                          │  │                          │  │                          │
     │  ┌────────────────────┐  │  │  ┌────────────────────┐  │  │  ┌────────────────────┐  │
     │  │  WAVE CONTROLLER   │  │  │  │  WAVE CONTROLLER   │  │  │  │  WAVE CONTROLLER   │  │
     │  │    (Instance)      │  │  │  │    (Instance)      │  │  │  │    (Instance)      │  │
     │  └────────────────────┘  │  │  └────────────────────┘  │  │  └────────────────────┘  │
     │           │              │  │           │              │  │           │              │
     │           ▼              │  │           ▼              │  │           ▼              │
     │  ┌────────────────────┐  │  │  ┌────────────────────┐  │  │  ┌────────────────────┐  │
     │  │      Docker        │  │  │  │      Docker        │  │  │  │      Docker        │  │
     │  │   7-Agent Team     │  │  │  │   7-Agent Team     │  │  │  │   7-Agent Team     │  │
     │  │                    │  │  │  │                    │  │  │  │                    │  │
     │  │  CTO ← validates   │  │  │  │  CTO ← validates   │  │  │  │  CTO ← validates   │  │
     │  │  PM  ← assigns     │  │  │  │  PM  ← assigns     │  │  │  │  PM  ← assigns     │  │
     │  │  FE-Dev-1/2        │  │  │  │  FE-Dev-1/2        │  │  │  │  FE-Dev-1/2        │  │
     │  │  BE-Dev-1/2        │  │  │  │  BE-Dev-1/2        │  │  │  │  BE-Dev-1/2        │  │
     │  │  QA                │  │  │  │  QA                │  │  │  │  QA                │  │
     │  │  Dev-Fix           │  │  │  │  Dev-Fix           │  │  │  │  Dev-Fix           │  │
     │  └────────────────────┘  │  │  └────────────────────┘  │  │  └────────────────────┘  │
     │           │              │  │           │              │  │           │              │
     │           ▼              │  │           ▼              │  │           ▼              │
     │  ┌────────────────────┐  │  │  ┌────────────────────┐  │  │  ┌────────────────────┐  │
     │  │  PROJECT BUCKET    │  │  │  │  PROJECT BUCKET    │  │  │  │  PROJECT BUCKET    │  │
     │  │    (AirView)       │  │  │  │    (AirView)       │  │  │  │    (AirView)       │  │
     │  │   /auth domain     │  │  │  │  /payments domain  │  │  │  │   /users domain    │  │
     │  └────────────────────┘  │  │  └────────────────────┘  │  │  └────────────────────┘  │
     └──────────────────────────┘  └──────────────────────────┘  └──────────────────────────┘
```

---

## 1.3 WAVE Controller vs Project Bucket

### WAVE Controller Contains:

```
/Volumes/SSD-01/Projects/WAVE/
│
├── core/
│   ├── scripts/                    # Orchestration automation
│   │   ├── wave-orchestrator.sh    # Main execution loop
│   │   ├── pre-flight-validator.sh # 80+ pre-execution checks
│   │   ├── pre-merge-validator.sh  # Gate 5 validation
│   │   ├── post-deploy-validator.sh# Deployment verification
│   │   ├── check-kill-switch.sh    # Emergency stop
│   │   ├── setup-worktrees.sh      # Git worktree creation
│   │   └── ...
│   │
│   └── templates/                  # Project initialization
│       ├── project-setup.sh        # Initialize any project
│       ├── docker-compose.template.yml
│       ├── CLAUDE.md.template
│       └── Dockerfile.agent
│
├── .claudecode/
│   ├── agents/                     # 7 agent definitions
│   ├── safety/                     # 108 forbidden operations
│   ├── workflows/                  # Gate protocols
│   └── signals/                    # Communication schemas
│
└── WAVE-PLAN.md                    # Master documentation
```

### Project Bucket Contains:

```
/path/to/project/  (e.g., AirView, PhotoGallery, Fixr)
│
├── src/                            # Application source code
├── tests/                          # Test suites
├── package.json                    # Dependencies
│
├── .claude/                        # WAVE integration (created by setup)
│   ├── CLAUDE.md                   # Agent instructions for THIS project
│   ├── signals/                    # Runtime signals
│   └── stories/                    # AI Stories for this project
│
├── ai-prd/                         # AI Product Requirements
│   ├── AI-PRD.md                   # Product requirements document
│   └── stories/                    # AI Stories derived from PRD
│       ├── WAVE1-AUTH-001.json
│       ├── WAVE1-AUTH-002.json
│       └── ...
│
└── worktrees/                      # Git worktrees (created by setup)
    ├── cto/
    ├── pm/
    ├── fe-dev-1/
    ├── fe-dev-2/
    ├── be-dev-1/
    ├── be-dev-2/
    └── qa/
```

---

# PART 2: DOMAIN-SPECIFIC EXECUTION

## 2.1 What is a Domain?

A **Domain** is a bounded context of functionality within a larger application:

| Project | Domains |
|---------|---------|
| **AirView** | Authentication, Flights, Bookings, Payments, Notifications |
| **PhotoGallery** | Auth, Albums, Photos, Sharing, Storage |
| **Fixr** | Users, Jobs, Payments, Messaging, Reviews |

Each domain:
- Has its own AI Stories
- Runs on its own VM (at scale)
- Has its own 7-agent team
- Operates independently
- Merges via CTO Master

## 2.2 Why Domain-Specific?

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         BENEFITS OF DOMAIN ISOLATION                             │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  1. PARALLEL EXECUTION                                                          │
│     • Auth team works while Payment team works                                  │
│     • No waiting, no blocking                                                   │
│     • N domains = N parallel streams                                            │
│                                                                                  │
│  2. BOUNDED BLAST RADIUS                                                        │
│     • Auth bug doesn't break Payments                                           │
│     • Failures contained to domain                                              │
│     • Aerospace principle: compartmentalization                                 │
│                                                                                  │
│  3. SPECIALIZED CONTEXT                                                         │
│     • Agents only see domain-relevant code                                      │
│     • Smaller context = better decisions                                        │
│     • Domain expertise develops                                                 │
│                                                                                  │
│  4. SCALABLE                                                                    │
│     • Add VMs as domains grow                                                   │
│     • Horizontal scaling                                                        │
│     • Cost-efficient resource allocation                                        │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## 2.3 Domain Boundaries (workspace-validator.sh)

Each domain has strict boundaries enforced by `workspace-validator.sh`:

```yaml
# Example: auth-domain.yaml
domain: authentication
allowed_paths:
  - src/auth/**
  - src/lib/auth/**
  - tests/auth/**
  - api/auth/**

forbidden_paths:
  - src/payments/**      # Cannot touch payments
  - src/users/**         # Cannot touch users
  - database/migrations/** # No direct DB access

allowed_dependencies:
  - @auth0/nextjs-auth0
  - jsonwebtoken
  - bcrypt
```

**Violation = Immediate Stop + Human Escalation**

---

# PART 3: AI STORY LIFECYCLE

## 3.1 From PRD to Execution

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           AI STORY LIFECYCLE                                     │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  PHASE 1: CREATION (Human)                                                      │
│  ─────────────────────────                                                      │
│       │                                                                          │
│       │  Human writes AI PRD (Product Requirements Document)                    │
│       │  PRD broken into AI Stories (JSON format, Schema V4)                    │
│       │                                                                          │
│       ▼                                                                          │
│  ┌─────────────────────────────────────────────────────────────┐                │
│  │  AI Story: WAVE1-AUTH-001                                   │                │
│  │  ─────────────────────────────────────────────              │                │
│  │  {                                                          │                │
│  │    "id": "WAVE1-AUTH-001",                                  │                │
│  │    "domain": "authentication",                              │                │
│  │    "title": "Implement OAuth2 login",                       │                │
│  │    "acceptance_criteria": [...],                            │                │
│  │    "technical_notes": "...",                                │                │
│  │    "estimated_complexity": "medium"                         │                │
│  │  }                                                          │                │
│  └─────────────────────────────────────────────────────────────┘                │
│       │                                                                          │
│       ▼                                                                          │
│  PHASE 2: VALIDATION (Domain CTO)                                               │
│  ─────────────────────────────────                                              │
│       │                                                                          │
│       │  Domain CTO Agent RESEARCHES:                                           │
│       │  • Analyzes existing codebase                                           │
│       │  • Identifies dependencies                                              │
│       │  • Validates technical feasibility                                      │
│       │  • Checks for conflicts with other stories                              │
│       │  • Estimates actual complexity                                          │
│       │  • Documents architectural approach                                     │
│       │                                                                          │
│       │  Domain CTO Agent VALIDATES:                                            │
│       │  • Story is achievable                                                  │
│       │  • Acceptance criteria are testable                                     │
│       │  • No forbidden operations required                                     │
│       │  • Within domain boundaries                                             │
│       │                                                                          │
│       │  OUTPUT: signal-cto-validation.json                                     │
│       │  {                                                                       │
│       │    "story_id": "WAVE1-AUTH-001",                                        │
│       │    "validated": true,                                                   │
│       │    "approach": "Use NextAuth.js with...",                               │
│       │    "risks": ["Rate limiting needed"],                                   │
│       │    "dependencies": ["next-auth@4.x"]                                    │
│       │  }                                                                       │
│       │                                                                          │
│       ▼                                                                          │
│  PHASE 3: ASSIGNMENT (Domain PM)                                                │
│  ─────────────────────────────────                                              │
│       │                                                                          │
│       │  Domain PM receives validated story                                     │
│       │  PM assigns to appropriate developer:                                   │
│       │  • Frontend work → FE-Dev-1 or FE-Dev-2                                │
│       │  • Backend work → BE-Dev-1 or BE-Dev-2                                 │
│       │  • Full-stack → Coordinates both                                        │
│       │                                                                          │
│       │  OUTPUT: signal-assignment.json                                         │
│       │                                                                          │
│       ▼                                                                          │
│  PHASE 4: EXECUTION (Dev Agents)                                                │
│  ─────────────────────────────────                                              │
│       │                                                                          │
│       │  Developer works in isolated WORKTREE                                   │
│       │  Passes through Gates 2-3-4                                             │
│       │  QA validates independently                                             │
│       │                                                                          │
│       ▼                                                                          │
│  PHASE 5: DOMAIN APPROVAL (Domain PM)                                           │
│  ─────────────────────────────────────                                          │
│       │                                                                          │
│       │  PM runs pre-merge-validator.sh                                         │
│       │  Confirms all gates passed                                              │
│       │  Signals "ready for merge"                                              │
│       │                                                                          │
│       │  OUTPUT: signal-ready-for-merge.json                                    │
│       │                                                                          │
│       ▼                                                                          │
│  PHASE 6: MERGE (CTO Master - External)                                         │
│  ─────────────────────────────────────────                                      │
│       │                                                                          │
│       │  CTO Master (Merge-Watcher) receives signal                             │
│       │  Reviews for cross-domain conflicts                                     │
│       │  Merges to main branch                                                  │
│       │  Triggers deployment pipeline                                           │
│       │                                                                          │
│       ▼                                                                          │
│  PHASE 7: DEPLOY & VERIFY                                                       │
│  ─────────────────────────────                                                  │
│                                                                                  │
│       post-deploy-validator.sh confirms success                                 │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

# PART 4: GIT WORKTREE ISOLATION

## 4.1 Why Worktrees?

**Problem:** Multiple agents working on the same codebase = merge conflicts, race conditions, chaos.

**Solution:** Each agent gets its own complete copy of the repository via Git Worktrees.

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              GIT WORKTREE MODEL                                  │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│                         Main Repository                                          │
│                     /path/to/project/.git                                       │
│                              │                                                   │
│     ┌────────────────────────┼────────────────────────┐                         │
│     │           │            │            │           │                         │
│     ▼           ▼            ▼            ▼           ▼                         │
│  ┌──────┐  ┌──────┐    ┌──────────┐  ┌──────────┐  ┌────┐                       │
│  │ CTO  │  │  PM  │    │ FE-Dev-1 │  │ BE-Dev-1 │  │ QA │  ...                  │
│  │      │  │      │    │          │  │          │  │    │                       │
│  │ wt/  │  │ wt/  │    │   wt/    │  │   wt/    │  │wt/ │                       │
│  │ cto  │  │ pm   │    │fe-dev-1  │  │be-dev-1  │  │ qa │                       │
│  └──────┘  └──────┘    └──────────┘  └──────────┘  └────┘                       │
│     │           │            │            │           │                         │
│     │           │            │            │           │                         │
│  branch:    branch:      branch:      branch:     branch:                       │
│  cto/       pm/         fe-dev-1/   be-dev-1/    qa/                           │
│  research   orchestrate WAVE1-AUTH  WAVE1-API    validate                      │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## 4.2 Worktree Creation (setup-worktrees.sh)

```bash
# What setup-worktrees.sh does:

# 1. Create worktree directory
mkdir -p /path/to/project/worktrees

# 2. Create worktree for each agent
git worktree add worktrees/cto -b cto/workspace
git worktree add worktrees/pm -b pm/workspace
git worktree add worktrees/fe-dev-1 -b fe-dev-1/workspace
git worktree add worktrees/fe-dev-2 -b fe-dev-2/workspace
git worktree add worktrees/be-dev-1 -b be-dev-1/workspace
git worktree add worktrees/be-dev-2 -b be-dev-2/workspace
git worktree add worktrees/qa -b qa/workspace

# 3. Each agent mounts ONLY their worktree in Docker
# docker-compose.yml:
#   fe-dev-1:
#     volumes:
#       - ./worktrees/fe-dev-1:/workspace:rw  # Only their worktree
```

## 4.3 Worktree Benefits

| Benefit | Description |
|---------|-------------|
| **Isolation** | Agent A's changes don't affect Agent B until merge |
| **Parallel Work** | All 7 agents can work simultaneously |
| **Clean Rollback** | Delete worktree = instant cleanup |
| **Branch Safety** | Each agent on own branch, can't corrupt main |
| **Audit Trail** | Git history shows exactly what each agent did |

## 4.4 Merge Flow with Worktrees

```
FE-Dev-1 worktree          Main Branch              BE-Dev-1 worktree
       │                        │                          │
       │ (works on             │                          │ (works on
       │  login UI)            │                          │  auth API)
       │                        │                          │
       ▼                        │                          ▼
   Commits to                   │                      Commits to
   fe-dev-1/WAVE1-AUTH          │                      be-dev-1/WAVE1-AUTH
       │                        │                          │
       │                        │                          │
       └──── QA validates ──────┼────── QA validates ──────┘
                               │
                               │
                    PM approves both
                               │
                               ▼
                    ┌─────────────────┐
                    │   CTO Master    │
                    │  Merge-Watcher  │
                    │                 │
                    │ 1. Pull both    │
                    │ 2. Check conflicts│
                    │ 3. Merge to main│
                    │ 4. Deploy       │
                    └─────────────────┘
```

---

# PART 5: CTO MASTER (MERGE-WATCHER)

## 5.1 Role Definition

The **CTO Master** is a special AI agent that operates **EXTERNAL** to all Domain Docker environments:

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                            CTO MASTER RESPONSIBILITIES                           │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  WATCHES:                                                                        │
│  • Supabase for "ready-for-merge" signals from all domains                      │
│  • GitHub for branch status                                                     │
│  • CI/CD pipeline status                                                        │
│                                                                                  │
│  VALIDATES:                                                                      │
│  • Cross-domain conflicts (Auth change affecting Payments?)                     │
│  • Merge order (dependencies between stories)                                   │
│  • All required gates passed                                                    │
│  • No pending escalations                                                       │
│                                                                                  │
│  EXECUTES:                                                                       │
│  • Merge approved branches to main                                              │
│  • Trigger deployment pipeline                                                  │
│  • Run post-deploy-validator.sh                                                 │
│  • Signal deployment success/failure                                            │
│                                                                                  │
│  ESCALATES:                                                                      │
│  • Merge conflicts requiring human decision                                     │
│  • Cross-domain architectural concerns                                          │
│  • Deployment failures                                                          │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## 5.2 Why External to Docker?

| Reason | Explanation |
|--------|-------------|
| **Single Source of Truth** | Only ONE entity merges to main |
| **Cross-Domain Visibility** | Can see all domains, not just one |
| **Persistence** | Runs continuously, not per-wave |
| **Security** | Has elevated permissions (merge, deploy) |
| **Coordination** | Orchestrates between isolated domains |

## 5.3 CTO Master vs Domain CTO

| Aspect | Domain CTO | CTO Master |
|--------|------------|------------|
| **Location** | Inside Docker (per domain) | External to Docker |
| **Scope** | Single domain | All domains |
| **Function** | Validate stories, research | Merge, deploy |
| **Quantity** | One per domain VM | ONE globally |
| **Model** | Opus 4.5 | Opus 4.5 |

---

# PART 6: MONITORING & NOTIFICATIONS

## 6.1 The Three Pillars of Observability

WAVE provides complete visibility into autonomous execution through three integrated systems:

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        WAVE MONITORING ARCHITECTURE                              │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│                              CTO MASTER                                          │
│                           (ATC Controller)                                       │
│                                 │                                                │
│          ┌──────────────────────┼──────────────────────┐                        │
│          │                      │                      │                        │
│          ▼                      ▼                      ▼                        │
│   ┌─────────────┐        ┌─────────────┐        ┌─────────────┐                │
│   │   DOZZLE    │        │    SLACK    │        │  SUPABASE   │                │
│   │             │        │             │        │             │                │
│   │  Real-time  │        │   Instant   │        │ Persistent  │                │
│   │    Logs     │        │   Alerts    │        │   Storage   │                │
│   │             │        │             │        │             │                │
│   │ :8080 Web   │        │  Webhooks   │        │  Database   │                │
│   └─────────────┘        └─────────────┘        └─────────────┘                │
│         │                      │                      │                        │
│         │                      │                      │                        │
│         └──────────────────────┴──────────────────────┘                        │
│                                 │                                                │
│                          HUMAN OPERATOR                                         │
│                      (Monitors from anywhere)                                   │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## 6.2 Dozzle - Container Log Viewer

**Purpose:** Real-time container log aggregation and viewing

**Location:** `docker-compose.template.yml` → `dozzle` service

**Access:** `http://localhost:8080` (configurable via `DOZZLE_PORT`)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  DOZZLE FEATURES                                                                │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  • Live streaming logs from ALL agent containers                                │
│  • Filter by container name (CTO, PM, FE-Dev-1, etc.)                          │
│  • Search within logs                                                           │
│  • Download logs for debugging                                                  │
│  • Auto-filters to project containers only                                      │
│  • No configuration needed - just run docker-compose up                        │
│                                                                                  │
│  USE WHEN:                                                                      │
│  • Debugging agent behavior                                                     │
│  • Watching execution in real-time                                             │
│  • Investigating failures                                                       │
│  • Understanding agent decision-making                                         │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## 6.3 Slack - Real-time Notifications

**Purpose:** Instant alerts for pipeline events

**Script:** `core/scripts/slack-notify.sh`

**Configuration:** `SLACK_WEBHOOK_URL` in `.env`

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  SLACK NOTIFICATION TYPES                                                       │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  NOTIFICATION TYPE     │ WHEN SENT                    │ CONTAINS               │
│  ──────────────────────┼──────────────────────────────┼──────────────────────   │
│  pipeline_start        │ Execution begins             │ Project, mode, time    │
│  agent_start           │ Agent picks up work          │ Agent, wave, story     │
│  agent_complete        │ Agent finishes               │ Duration, token cost   │
│  gate_complete         │ Gate validation done         │ Gate #, status         │
│  qa_result             │ QA approves/rejects          │ Tests, coverage        │
│  wave_complete         │ All wave stories done        │ Stories, cost          │
│  pipeline_complete     │ Everything done              │ Total cost, summary    │
│  error                 │ Something failed             │ Error message          │
│  escalation            │ Human needed                 │ Reason, story          │
│                                                                                  │
│  USE WHEN:                                                                      │
│  • You want to be notified without watching                                    │
│  • Running overnight executions                                                │
│  • Team needs visibility into progress                                         │
│  • Immediate alert on failures/escalations                                     │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## 6.4 Supabase - Event Storage (Black Box)

**Purpose:** Persistent event logging for audit trail and analytics

**Script:** `core/scripts/supabase-report.sh`

**Configuration:** `SUPABASE_URL`, `SUPABASE_ANON_KEY` in `.env`

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  SUPABASE EVENT TYPES                                                           │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  EVENT TYPE            │ LOGGED WHEN                  │ DATA STORED            │
│  ──────────────────────┼──────────────────────────────┼──────────────────────   │
│  PIPELINE_START        │ Execution begins             │ Pipeline ID, project   │
│  GATE_START            │ Agent enters gate            │ Gate, agent, story     │
│  GATE_COMPLETE         │ Agent completes gate         │ Duration, status       │
│  AGENT_ERROR           │ Agent fails                  │ Error, context         │
│  RETRY_TRIGGERED       │ QA rejects, retry starts     │ Attempt #, reason      │
│  ESCALATION            │ Max retries exceeded         │ Story, attempts        │
│  KILL_SWITCH           │ Emergency stop               │ Trigger source         │
│  PIPELINE_COMPLETE     │ Everything done              │ Summary, costs         │
│                                                                                  │
│  TABLE: maf_events                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │ id │ pipeline_id │ event_type │ message │ gate │ agent │ timestamp     │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│  USE WHEN:                                                                      │
│  • Post-mortem analysis                                                        │
│  • Cost tracking over time                                                     │
│  • Compliance/audit requirements                                               │
│  • Building WAVE Portal dashboard                                              │
│  • Querying historical data                                                    │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## 6.5 Monitoring Summary Table

| Component | Type | Access | Purpose | Script |
|-----------|------|--------|---------|--------|
| **Dozzle** | Web UI | localhost:8080 | Live container logs | (docker service) |
| **Slack** | Push notifications | Webhook | Instant alerts | `slack-notify.sh` |
| **Supabase** | Database | API/Portal | Persistent audit trail | `supabase-report.sh` |

## 6.6 Aviation Analogy for Monitoring

| Aviation | WAVE | Purpose |
|----------|------|---------|
| **Cockpit Voice Recorder** | Dozzle | Real-time logs of what agents "say" |
| **Flight Data Recorder** | Supabase | Black box of all events |
| **ATC Radio** | Slack | Communication channel for alerts |
| **Control Tower Displays** | WAVE Portal (future) | Unified dashboard |

---

# PART 7: AEROSPACE-GRADE SAFETY STANDARDS

## 7.1 Inspiration: DO-178C

WAVE is inspired by **DO-178C** (Software Considerations in Airborne Systems and Equipment Certification), the international standard for safety-critical aviation software.

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                                                                  │
│                    ✈️  AEROSPACE-GRADE SAFETY PRINCIPLES  ✈️                     │
│                                                                                  │
│     "Software in aircraft cannot fail. WAVE applies the same rigor to           │
│      autonomous AI development - because when AI writes code that               │
│      handles payments, authentication, or user data, failure is not             │
│      an option."                                                                 │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## 7.2 DO-178C Principles Applied to WAVE

| DO-178C Principle | WAVE Implementation |
|-------------------|---------------------|
| **Verification at Every Level** | 8 Gates with mandatory validation |
| **Traceability** | Every action logged to Supabase (black box) |
| **Configuration Management** | Git worktrees, immutable signals |
| **Quality Assurance** | Independent QA agent validation |
| **Failure Mode Analysis** | FMEA.md with 17 documented failure modes |
| **Redundancy** | Retry loop with Dev-Fix agent |
| **Emergency Procedures** | E1-E5 graduated response, kill switch |

## 7.3 Safety Features Matrix

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        AEROSPACE-GRADE SAFETY MATRIX                             │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  CATEGORY              │ FEATURE                  │ AVIATION EQUIVALENT          │
│  ──────────────────────┼──────────────────────────┼─────────────────────────     │
│                        │                          │                              │
│  PRE-FLIGHT            │ pre-flight-validator.sh  │ Pre-flight checklist        │
│  (80+ checks)          │ 13 sections (A-M)        │ Walk-around inspection      │
│                        │ GO/NO-GO decision        │ Takeoff clearance           │
│                        │                          │                              │
│  ──────────────────────┼──────────────────────────┼─────────────────────────     │
│                        │                          │                              │
│  FORBIDDEN OPS         │ 108 forbidden patterns   │ Prohibited maneuvers        │
│  (Real-time)           │ safety-violation-detector│ TCAS collision avoidance    │
│                        │ Immediate halt on detect │ Stick shaker warning        │
│                        │                          │                              │
│  ──────────────────────┼──────────────────────────┼─────────────────────────     │
│                        │                          │                              │
│  GATE PROTOCOL         │ 8 mandatory gates        │ Flight phases               │
│  (Sequential)          │ Cannot skip gates        │ Altitude restrictions       │
│                        │ Each gate = checkpoint   │ Approach procedures         │
│                        │                          │                              │
│  ──────────────────────┼──────────────────────────┼─────────────────────────     │
│                        │                          │                              │
│  REDUNDANCY            │ Dev-Fix retry loop       │ Dual/triple redundancy      │
│  (Fault tolerance)     │ Max 3 retries            │ Backup systems              │
│                        │ Escalate if still fails  │ Alternate procedures        │
│                        │                          │                              │
│  ──────────────────────┼──────────────────────────┼─────────────────────────     │
│                        │                          │                              │
│  BLACK BOX             │ Supabase event logging   │ Flight Data Recorder        │
│  (Full audit)          │ Every action recorded    │ Cockpit Voice Recorder      │
│                        │ Timestamped, immutable   │ Accident investigation      │
│                        │                          │                              │
│  ──────────────────────┼──────────────────────────┼─────────────────────────     │
│                        │                          │                              │
│  EMERGENCY STOP        │ EMERGENCY-STOP file      │ Engine fire shutoff         │
│  (Immediate halt)      │ Kill switch (Supabase)   │ Emergency descent           │
│                        │ E1-E5 graduated response │ Mayday procedures           │
│                        │                          │                              │
│  ──────────────────────┼──────────────────────────┼─────────────────────────     │
│                        │                          │                              │
│  DOMAIN ISOLATION      │ Worktrees, boundaries    │ Compartmentalization        │
│  (Blast radius)        │ workspace-validator.sh   │ Fire containment            │
│                        │ Domain-specific VMs      │ Isolated fuel tanks         │
│                        │                          │                              │
│  ──────────────────────┼──────────────────────────┼─────────────────────────     │
│                        │                          │                              │
│  HUMAN ESCALATION      │ 30 trigger conditions    │ Pilot authority             │
│  (Human in loop)       │ Mandatory for production │ ATC clearance required      │
│                        │ Security, budget, scope  │ Captain's decision          │
│                        │                          │                              │
│  ──────────────────────┼──────────────────────────┼─────────────────────────     │
│                        │                          │                              │
│  STUCK DETECTION       │ Error loop detection     │ Stall warning               │
│  (Anomaly response)    │ No progress detection    │ Unusual attitude            │
│                        │ Auto-escalation          │ GPWS alerts                 │
│                        │                          │                              │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## 7.4 Emergency Levels (E1-E5)

Graduated response inspired by aviation emergency procedures:

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           EMERGENCY LEVEL MATRIX                                 │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  LEVEL │ NAME            │ SCOPE          │ ACTION            │ AVIATION        │
│  ──────┼─────────────────┼────────────────┼───────────────────┼────────────     │
│        │                 │                │                   │                 │
│   E1   │ Agent Stop      │ Single agent   │ Stop agent,       │ Passenger       │
│        │                 │                │ reassign work     │ illness         │
│        │                 │                │                   │                 │
│  ──────┼─────────────────┼────────────────┼───────────────────┼────────────     │
│        │                 │                │                   │                 │
│   E2   │ Domain Stop     │ Entire domain  │ Stop domain VM,   │ System          │
│        │                 │                │ preserve state    │ malfunction     │
│        │                 │                │                   │                 │
│  ──────┼─────────────────┼────────────────┼───────────────────┼────────────     │
│        │                 │                │                   │                 │
│   E3   │ Wave Stop       │ Current wave   │ Abort wave,       │ Weather         │
│        │                 │                │ save progress     │ diversion       │
│        │                 │                │                   │                 │
│  ──────┼─────────────────┼────────────────┼───────────────────┼────────────     │
│        │                 │                │                   │                 │
│   E4   │ System Stop     │ All domains    │ Graceful halt,    │ Emergency       │
│        │                 │                │ backup state      │ landing         │
│        │                 │                │                   │                 │
│  ──────┼─────────────────┼────────────────┼───────────────────┼────────────     │
│        │                 │                │                   │                 │
│   E5   │ EMERGENCY HALT  │ EVERYTHING     │ Immediate kill,   │ MAYDAY          │
│        │                 │                │ no grace period   │                 │
│        │                 │                │                   │                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

# PART 8: SCALING MODEL

## 8.1 Single Project (Development)

```
┌────────────────────────────────────────┐
│            Single Machine              │
│                                        │
│  ┌──────────────────────────────────┐  │
│  │           Docker                 │  │
│  │    7-Agent Team (one domain)    │  │
│  └──────────────────────────────────┘  │
│                  │                     │
│  ┌──────────────────────────────────┐  │
│  │        Project Bucket            │  │
│  │    (PhotoGallery - all code)    │  │
│  └──────────────────────────────────┘  │
│                                        │
└────────────────────────────────────────┘
```

## 8.2 Multi-Domain (Production)

```
                         ┌─────────────────────┐
                         │    CTO MASTER       │
                         │   (Merge-Watcher)   │
                         │  Dedicated Server   │
                         └──────────┬──────────┘
                                    │
            ┌───────────────────────┼───────────────────────┐
            │                       │                       │
            ▼                       ▼                       ▼
     ┌─────────────┐         ┌─────────────┐         ┌─────────────┐
     │    VM 1     │         │    VM 2     │         │    VM 3     │
     │   4 CPU     │         │   4 CPU     │         │   4 CPU     │
     │   16GB RAM  │         │   16GB RAM  │         │   16GB RAM  │
     │             │         │             │         │             │
     │ Auth Domain │         │ Pay Domain  │         │ User Domain │
     │ 7 agents    │         │ 7 agents    │         │ 7 agents    │
     └─────────────┘         └─────────────┘         └─────────────┘
```

## 8.3 Enterprise Scale

```
                              ┌─────────────────────┐
                              │    CTO MASTER       │
                              │   HA Cluster (3)    │
                              └──────────┬──────────┘
                                         │
          ┌──────────────────────────────┼──────────────────────────────┐
          │                              │                              │
          ▼                              ▼                              ▼
   ┌─────────────┐                ┌─────────────┐                ┌─────────────┐
   │  PROJECT A  │                │  PROJECT B  │                │  PROJECT C  │
   │  (AirView)  │                │ (PhotoGallery)│               │   (Fixr)    │
   └──────┬──────┘                └──────┬──────┘                └──────┬──────┘
          │                              │                              │
    ┌─────┴─────┐                  ┌─────┴─────┐                  ┌─────┴─────┐
    │           │                  │           │                  │           │
    ▼           ▼                  ▼           ▼                  ▼           ▼
 ┌─────┐     ┌─────┐            ┌─────┐     ┌─────┐            ┌─────┐     ┌─────┐
 │Auth │     │Pay  │            │Album│     │Share│            │Jobs │     │Msg  │
 │ VM  │     │ VM  │            │ VM  │     │ VM  │            │ VM  │     │ VM  │
 └─────┘     └─────┘            └─────┘     └─────┘            └─────┘     └─────┘
```

---

# PART 9: SUMMARY

## 9.1 Key Takeaways

1. **WAVE Controller** is the reusable framework; **Project Buckets** are the applications being built.

2. **Domain-Specific Execution** isolates work by functional area (Auth, Payments, etc.) for parallel execution and contained blast radius.

3. **AI Stories** flow from PRD → Domain CTO validation → Domain PM assignment → Execution.

4. **Git Worktrees** give each agent an isolated workspace, preventing conflicts.

5. **CTO Master** (external to Docker) is the single authority for merging and deploying across all domains.

6. **Aerospace-Grade Safety** is not a marketing term - it's a systematic application of DO-178C principles including pre-flight checks, forbidden operations, gate protocols, black box recording, and emergency procedures.

7. **Three-Pillar Monitoring** provides complete visibility: Dozzle (live logs), Slack (instant alerts), Supabase (persistent audit trail).

8. **Prototype-First Development** ensures AI Stories are derived from approved HTML mockups, eliminating ambiguity.

## 9.2 The WAVE Promise

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                                                                  │
│   "WAVE enables autonomous AI development with the safety standards             │
│    of aviation software. Your code is built by AI agents that cannot            │
│    delete your database, expose your secrets, or push broken code               │
│    to production - because the system makes those actions physically            │
│    impossible."                                                                  │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

**END OF WAVE ARCHITECTURE DOCUMENT v2.0.0**
