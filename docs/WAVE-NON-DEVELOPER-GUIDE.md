# WAVE Framework: A Non-Developer Guide

## The Aerospace Analogy

WAVE operates like **Air Traffic Control (ATC)** for software development. Instead of human developers, AI "pilots" fly missions (build features) under the strict supervision of a control tower. Every flight requires clearance, every phase has checkpoints, and nothing takes off without proper authorization.

---

## The Control Tower View

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│                        🗼 WAVE CONTROL TOWER                                │
│                                                                             │
│   ┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐              │
│   │ FLIGHT  │     │ PRE-    │     │ MISSION │     │ LANDING │              │
│   │  PLAN   │────►│ FLIGHT  │────►│  EXEC   │────►│CLEARANCE│              │
│   │         │     │  CHECK  │     │         │     │         │              │
│   └─────────┘     └─────────┘     └─────────┘     └─────────┘              │
│    Phase 0         Phase 2         Phase 3         Phase 4                 │
│                                                                             │
│   "Tower,          "Systems        "Mission        "Requesting              │
│    requesting       check           complete,       permission              │
│    flight plan      complete,       returning       to land"                │
│    approval"        ready for       to base"                                │
│                     takeoff"                                                │
│                                                                             │
│   🔒 CLEARANCE     🔒 CLEARANCE    🔒 CLEARANCE    🔒 CLEARANCE             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## The Flight Crew (AI Agents)

| Callsign | Role | Mission |
|----------|------|---------|
| **FE-Dev** | Frontend Pilot | Builds what users see (cockpit instruments) |
| **BE-Dev** | Backend Pilot | Builds the engines and systems |
| **QA** | Flight Inspector | Checks everything before landing clearance |
| **Dev-Fix** | Emergency Response | Repairs issues found during inspection |

Each pilot operates in their own **airspace** (worktree) — no mid-air collisions.

---

## The 4 Phases (Flight Phases)

### Phase 0: Flight Plan Filing
**ATC Equivalent:** Submitting your flight plan before departure

You file "flight plans" (stories) describing the mission:
```json
{
  "id": "MISSION-001",
  "title": "Add photo upload capability",
  "pilot": "fe-dev",
  "objectives": [
    "User can select image from device",
    "Preview displays before upload",
    "Successful save to database"
  ]
}
```

**Clearance required:** Tower validates the flight plan is complete and makes sense.

🔒 **No clearance = No flight**

---

### Phase 2: Pre-Flight Check
**ATC Equivalent:** Pilots running through the pre-flight checklist

Before any mission launches, the system verifies:

| Check | Status |
|-------|--------|
| Engines start (build compiles) | ✓ |
| Instruments calibrated (tests pass) | ✓ |
| No warning lights (no lint errors) | ✓ |
| Fuel calculated (dependencies installed) | ✓ |

**Clearance required:** All systems green before takeoff.

🔒 **Failed pre-flight = Grounded**

---

### Phase 3: Mission Execution
**ATC Equivalent:** Aircraft in flight, executing the mission

Pilots are airborne and working:

```
┌─────────────────────────────────────────────────────────────┐
│                     ACTIVE AIRSPACE                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   ✈️ FE-Dev                        ✈️ BE-Dev                │
│   Altitude: Feature Branch         Altitude: Feature Branch │
│   Status: Building UI              Status: Building API     │
│   Heading: Component work          Heading: Database work   │
│                                                             │
│   ─────────────────────────────────────────────────────     │
│                    ISOLATED AIRSPACE                        │
│              (No collision possible)                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

When pilots complete their objectives, they radio: "Mission complete, RTB" (Return to Base)

🔒 **Clearance issued when all pilots report mission complete**

---

### Phase 4: Landing Clearance
**ATC Equivalent:** Final approach and landing authorization

The **Flight Inspector (QA)** reviews everything:

```
┌─────────────────────────────────────────────────────────────┐
│                   FLIGHT INSPECTION                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   QA Inspector checking:                                    │
│   ├── All tests passing?              ✓ PASS               │
│   ├── No structural damage (errors)?  ✓ PASS               │
│   ├── Mission objectives met?         ✓ PASS               │
│   └── Safe to land (merge)?           ✓ CLEARED            │
│                                                             │
│   ════════════════════════════════════════════════════════  │
│                                                             │
│   DECISION:  ✅ CLEARED FOR LANDING                         │
│              Code merged to main                            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**If inspection fails:**
```
┌─────────────────────────────────────────────────────────────┐
│   DECISION:  ❌ GO AROUND                                   │
│              Issues found, Dev-Fix dispatched               │
│              Retry attempt: 1 of 3                          │
└─────────────────────────────────────────────────────────────┘
```

After 3 failed attempts → **Mayday declared** → Human intervention required

---

## Flight Recorder (RLM - The Black Box)

### The Problem
Pilots (AI agents) have no memory between flights. Every mission, they start fresh — forgetting the aircraft, the airspace, everything.

### The Solution: P Variable (Pilot Briefing Package)

Before each flight, pilots receive a **briefing package** containing everything they need:

```
┌─────────────────────────────────────────────────────────────┐
│                    📋 P VARIABLE                            │
│               (Pilot Briefing Package)                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   AIRCRAFT STATUS                                           │
│   • Current codebase structure                              │
│   • Recent modifications                                    │
│   • Known issues                                            │
│                                                             │
│   MISSION HISTORY                                           │
│   • Previous waves completed                                │
│   • Patterns established                                    │
│   • Technical decisions made                                │
│                                                             │
│   CURRENT OBJECTIVES                                        │
│   • Active stories                                          │
│   • Work in progress                                        │
│   • Blockers                                                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Result:** Pilots start briefed, not blind.

---

## Clearance System (Lock Files)

Every phase requires **ATC clearance** before proceeding:

```
┌─────────────────────────────────────────────────────────────┐
│                   CLEARANCE PROTOCOL                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   Phase 0  ──►  🔒 CLEARANCE GRANTED  ──►  Proceed          │
│                 Checksum: SHA256:abc123                     │
│                 Valid: Until drift detected                 │
│                                                             │
│   Phase 2  ──►  🔒 CLEARANCE GRANTED  ──►  Proceed          │
│                 Checksum: SHA256:def456                     │
│                 Depends on: Phase 0 clearance               │
│                                                             │
│   Phase 3  ──►  🔒 CLEARANCE GRANTED  ──►  Proceed          │
│                                                             │
│   Phase 4  ──►  🔒 CLEARANCE GRANTED  ──►  MERGE            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Drift Detection (Radar Alert)

If something changes unexpectedly (unauthorized modification), the system detects it:

```
⚠️  DRIFT DETECTED
    Phase 0 clearance INVALIDATED
    ──► Phase 2 clearance INVALIDATED (downstream)
    ──► Phase 3 clearance INVALIDATED (downstream)
    ──► Phase 4 clearance INVALIDATED (downstream)

    ACTION: Must re-validate from Phase 0
```

**No shortcuts. No exceptions.**

---

## What You Need to Implement WAVE

### 1. Ground Infrastructure (One-Time Setup)

| Component | ATC Equivalent | Purpose |
|-----------|----------------|---------|
| **Anthropic API Key** | Radio frequency | Communication with AI pilots |
| **Git Repository** | Flight data recorder | Tracks all changes |
| **Node.js/pnpm** | Ground power unit | Runs the project |
| **Bash 4+** | Control tower systems | Runs WAVE scripts |

### 2. Airfield Setup (Per Project)

```
Your Project/
├── .claude/                  ◄── Control Tower Data
│   ├── locks/                ◄── Clearance records
│   ├── P.json                ◄── Pilot briefing package
│   ├── black-box/            ◄── Flight recorder
│   └── signals/              ◄── Radio communications
├── stories/                  ◄── Flight Plans
│   └── wave1/
│       ├── MISSION-001.json
│       └── MISSION-002.json
├── CLAUDE.md                 ◄── Flight rules & safety protocol
└── [your code]               ◄── The aircraft
```

### 3. Flight Plans (You Write These)

```json
{
  "id": "MISSION-001",
  "title": "Add user authentication",
  "pilot": "be-dev",
  "priority": "HIGH",
  "objectives": [
    "Users can register with email",
    "Users can log in securely",
    "Session persists across browser refresh"
  ],
  "constraints": {
    "files": ["src/auth/*", "src/api/auth/*"],
    "budget": "$0.50"
  }
}
```

---

## Complete Flight Operations

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        WAVE FLIGHT OPERATIONS                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  GROUND OPS              TOWER                        STATUS                │
│  ──────────              ─────                        ──────                │
│                                                                             │
│  1. File flight    ────► Tower validates plan                               │
│     plans                 Issues Phase 0 clearance    📋 FILED             │
│                                  │                                          │
│                                  ▼                                          │
│  2. Request        ────► Pre-flight check                                   │
│     departure             Issues Phase 2 clearance    ✓ CLEARED            │
│                                  │                                          │
│                                  ▼                                          │
│                           Pilots execute mission                            │
│  3. Monitor        ────► FE-Dev + BE-Dev airborne     ✈️ IN FLIGHT         │
│     flight                Issues Phase 3 clearance                          │
│                                  │                                          │
│                                  ▼                                          │
│                           QA inspection                                     │
│                           ├── PASS ──► Landing        ✅ LANDED            │
│                           └── FAIL ──► Go around      🔄 RETRY             │
│                                  │                                          │
│                                  ▼                                          │
│  4. Receive        ◄──── Mission complete!            📦 DELIVERED         │
│     notification          or Mayday (escalation)      🚨 MAYDAY            │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Safety Systems

| System | ATC Equivalent | Function |
|--------|----------------|----------|
| **Emergency Stop** | Ground all flights | `EMERGENCY-STOP` file halts everything instantly |
| **Budget Limits** | Fuel restrictions | Max spend per wave, stops if exceeded |
| **Lock Enforcement** | Clearance required | No phase skipping, every step verified |
| **Drift Detection** | Radar anomaly | Unauthorized changes invalidate clearances |
| **3-Strike Rule** | Divert to alternate | 3 QA failures → human takes control |
| **Black Box** | Flight recorder | Full audit trail of every action |

---

## Quick Start Checklist

```
PRE-FLIGHT CHECKLIST
════════════════════

□ 1. INSTALL WAVE
     Clone repo, configure API key

□ 2. SETUP AIRFIELD
     Run setup script on your project

□ 3. FILE FLIGHT PLANS
     Create story files for Wave 1

□ 4. REQUEST DEPARTURE
     ./merge-watcher-v12.sh --project /your/project --wave 1

□ 5. MONITOR & RECEIVE
     Wait for mission complete or mayday notification
```

---

**Bottom line:** You file the flight plan, WAVE's control tower manages the mission, pilots execute autonomously, inspectors verify quality, and code lands safely — with full clearance protocol at every phase.
