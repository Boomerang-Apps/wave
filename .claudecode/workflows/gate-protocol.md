# WAVE 8-Gate Protocol

**Version:** 1.0.0
**Purpose:** Define the gate progression for autonomous development

---

## Gate Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    WAVE 8-GATE PROTOCOL                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  GATE 0: Story Assignment                                        │
│  └── Stories loaded from {project}/stories/                      │
│                                                                  │
│  GATE 1: Planning                                                │
│  └── Agents read stories, plan implementation                    │
│                                                                  │
│  GATE 2: Development                                             │
│  └── FE-Dev and BE-Dev write code in worktrees                  │
│                                                                  │
│  GATE 3: Development Complete                                    │
│  └── Signal: signal-wave{N}-gate3-{agent}-complete.json         │
│                                                                  │
│  GATE 4: QA Validation                                           │
│  └── QA agent runs: build, typecheck, lint, test                │
│  └── Signal: approved.json OR rejected.json                     │
│                                                                  │
│  GATE 4.5: Dev Fix (if rejected)                                │
│  └── Dev-Fix agent fixes issues from QA                         │
│  └── Max 3 retries → ESCALATION                                 │
│                                                                  │
│  GATE 5-6: Review & Merge Prep                                   │
│                                                                  │
│  GATE 7: Final Approval + Merge                                  │
│  └── Merge worktree branches to main                            │
│  └── Push to Git                                                │
│  └── Trigger deployment                                         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Gate Details

### Gate 0: Story Assignment
- Orchestrator loads stories from `stories/*.json`
- Assigns stories to waves (wave 1, wave 2)
- Assigns agents per story type

### Gate 1: Planning
- Agents read their assigned stories
- Create internal implementation plan
- No signal file required

### Gate 2: Development
- FE-Dev implements frontend features
- BE-Dev implements backend features
- Each works in isolated worktree

### Gate 3: Development Complete
- Agent creates completion signal
- Signal includes: files changed, tests passed, token usage
- File: `signal-wave{N}-gate3-{agent}-complete.json`

### Gate 4: QA Validation
- QA agent pulls changes to qa worktree
- Runs: build, typecheck, lint, test
- Creates approval OR rejection signal
- Rejection includes detailed issue list

### Gate 4.5: Dev Fix (Retry Loop)
- Triggered when QA rejects
- Dev-Fix agent reads issues
- Fixes all issues
- Creates fixed signal
- QA runs again
- Max 3 retries, then ESCALATION

### Gate 5-6: Review & Merge Prep
- Code review (optional)
- Merge preparation

### Gate 7: Final Approval
- PM or orchestrator approves
- Merges worktree branches to main
- Pushes to remote
- Triggers deployment

---

## Signal Files Summary

| Gate | Signal File | Created By |
|------|-------------|------------|
| 3 | signal-wave{N}-gate3-{agent}-complete.json | FE-Dev, BE-Dev |
| 4 | signal-wave{N}-gate4-approved.json | QA |
| 4 | signal-wave{N}-gate4-rejected.json | QA |
| 4.5 | signal-wave{N}-gate4.5-retry.json | Orchestrator |
| 4.5 | signal-wave{N}-gate4.5-fixed.json | Dev-Fix |
| 7 | signal-wave{N}-gate7-merge-approved.json | PM |
| - | signal-wave{N}-ESCALATION.json | Orchestrator |

---

*WAVE Framework | Gate Protocol | Version 1.0.0*
