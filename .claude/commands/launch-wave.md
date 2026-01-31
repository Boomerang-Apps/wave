# Launch Wave: Start Wave Execution

Launch a complete wave with multi-agent orchestration.

## Arguments
- `$ARGUMENTS` - Wave number (e.g., "1" or "wave 1")

## Purpose
Orchestrate the execution of an entire wave, coordinating multiple agents and tracking progress through all gates.

## Pre-Launch Requirements

```
□ All stories for wave exist in stories/wave{N}/
□ All stories pass Schema V4.1 validation
□ All stories have research validation complete
□ Gate 0 pre-flight checklist passed
□ No blocking dependencies from previous waves
□ Agent workspace branches exist
```

## Execution Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  WAVE {N} LAUNCH SEQUENCE                                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  T-MINUS CHECKS                                                             │
│  ──────────────                                                             │
│  □ Load wave configuration                                                  │
│  □ Validate all stories (Schema V4.1)                                       │
│  □ Verify research validation complete                                      │
│  □ Run Gate 0 pre-flight checklist                                          │
│  □ Check agent availability                                                 │
│  □ Verify workspace branches                                                │
│                                                                             │
│  LAUNCH                                                                     │
│  ──────                                                                     │
│  □ Create wave signal: signal-wave{N}-launched.json                         │
│  □ Generate execution plan (phases, dependencies)                           │
│  □ Notify agents of assignments                                             │
│                                                                             │
│  PHASE EXECUTION                                                            │
│  ───────────────                                                            │
│  For each execution phase:                                                  │
│  ├── Identify parallel-safe stories                                         │
│  ├── Assign to agents based on story.agent field                            │
│  ├── Monitor progress via signal files                                      │
│  ├── Wait for phase completion                                              │
│  └── Verify no blockers before next phase                                   │
│                                                                             │
│  WAVE COMPLETION                                                            │
│  ───────────────                                                            │
│  □ All stories complete (Gate 7 passed)                                     │
│  □ Integration verification                                                 │
│  □ Wave sign-off                                                            │
│  □ Create signal: signal-wave{N}-complete.json                              │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Execution Plan Generation

Analyze story dependencies to create execution phases:

```
WAVE 1 EXECUTION PLAN
=====================

Phase 1 (Sequential - Foundation):
└── AUTH-BE-001 (Schema Setup) → be-dev
    No dependencies, blocks all other stories

Phase 2 (Parallel - Core Implementation):
├── Group A [be-dev]:
│   ├── AUTH-BE-002 (Register Client)
│   ├── AUTH-BE-003 (Register Pilot)
│   ├── AUTH-BE-004 (Login)
│   └── AUTH-BE-005 (Password Reset)
│
└── Group B [fe-dev]:
    ├── AUTH-FE-001 (Login UI)
    ├── AUTH-FE-002 (Client Registration UI)
    ├── AUTH-FE-003 (Pilot Registration UI)
    └── AUTH-FE-004 (Email Verification UI)

Phase 3 (Sequential - Integration):
├── AUTH-INT-001 (Auth Context) → fe-dev
│   Depends on: AUTH-BE-004, AUTH-FE-001
└── AUTH-INT-002 (Protected Routes) → fe-dev
    Depends on: AUTH-BE-002, AUTH-BE-003, AUTH-FE-002, AUTH-FE-003
```

## Agent Coordination

| Agent | Stories | Workspace Branch |
|-------|---------|------------------|
| be-dev | {list} | workspace/be-dev |
| fe-dev | {list} | workspace/fe-dev |
| qa | Gate 4 for all | workspace/qa |
| pm | Gate 5 for all | workspace/pm |

## Progress Tracking

Monitor via signal files:
```
.claude/signals/
├── signal-wave{N}-launched.json
├── signal-wave{N}-phase1-complete.json
├── signal-wave{N}-{STORY-ID}-complete.json
├── ...
└── signal-wave{N}-complete.json
```

## Output Format

```
╔══════════════════════════════════════════════════════════════════════════════╗
║  WAVE {N} LAUNCH                                                             ║
║  {Wave Title/Domain}                                                         ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  WAVE SUMMARY                                                                ║
║  ────────────                                                                ║
║  Stories: {N}                                                                ║
║  Story Points: {N}                                                           ║
║  Agents: be-dev ({N}), fe-dev ({N})                                          ║
║  Phases: {N}                                                                 ║
║                                                                              ║
║  PRE-LAUNCH CHECKS                                                           ║
║  ─────────────────                                                           ║
║  ✓ Schema validation: {N}/{N} stories valid                                  ║
║  ✓ Research validation: {N}/{N} complete                                     ║
║  ✓ Gate 0: APPROVED                                                          ║
║  ✓ Dependencies: No blockers                                                 ║
║  ✓ Agents: Available                                                         ║
║                                                                              ║
║  EXECUTION PLAN                                                              ║
║  ──────────────                                                              ║
║  Phase 1: {story} [sequential]                                               ║
║  Phase 2: {N} stories [parallel]                                             ║
║    ├── be-dev: {list}                                                        ║
║    └── fe-dev: {list}                                                        ║
║  Phase 3: {N} stories [sequential]                                           ║
║                                                                              ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  STATUS: LAUNCHED                                                            ║
║  Signal: .claude/signals/signal-wave{N}-launched.json                        ║
║                                                                              ║
║  Next: Execute /execute-story {first-story-id}                               ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

## Wave Progress Dashboard

During execution, use `/wave-status` to monitor:

```
WAVE {N} PROGRESS
=================

Phase 1: ████████████████████ 100% COMPLETE
Phase 2: ████████░░░░░░░░░░░░  40% IN PROGRESS
  be-dev: AUTH-BE-002 ✓, AUTH-BE-003 →, AUTH-BE-004 ○, AUTH-BE-005 ○
  fe-dev: AUTH-FE-001 ✓, AUTH-FE-002 →, AUTH-FE-003 ○, AUTH-FE-004 ○
Phase 3: ░░░░░░░░░░░░░░░░░░░░   0% BLOCKED (waiting for Phase 2)

Overall: ████████░░░░░░░░░░░░  45% ({N}/{N} stories complete)
```
