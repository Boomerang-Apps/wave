# WAVE Signal File Schemas

**Version:** 1.0.0
**Purpose:** Define all signal file formats for inter-agent communication

---

## Overview

Signal files are JSON files in `.claude/` directory used for agent coordination.
Each agent reads signals from previous gates and writes signals for next gates.

**Location:** `{PROJECT}/.claude/`

---

## Token Cost Tracking

ALL agent signals MUST include token usage:

```json
"token_usage": {
    "input_tokens": 15420,
    "output_tokens": 3250,
    "total_tokens": 18670,
    "estimated_cost_usd": 0.0842,
    "model": "claude-sonnet-4-20250514"
}
```

### Cost Calculation Reference

| Model | Input (per 1M) | Output (per 1M) |
|-------|----------------|-----------------|
| Claude Sonnet 4 | $3.00 | $15.00 |
| Claude Opus 4 | $15.00 | $75.00 |
| Claude Haiku 4 | $0.25 | $1.25 |

---

## Gate 3 Complete Signal (Development)

**File:** `.claude/signal-wave[N]-gate3-[agent]-complete.json`
**Created by:** FE-Dev or BE-Dev Agent
**Triggers:** QA Validation can begin

```json
{
    "wave": 1,
    "gate": 3,
    "agent": "fe-dev",
    "story_id": "STORY-001",
    "status": "COMPLETE",
    "files_created": ["src/app/faq/page.tsx"],
    "files_modified": [],
    "tests_passed": true,
    "token_usage": {
        "input_tokens": 12500,
        "output_tokens": 2800,
        "total_tokens": 15300,
        "estimated_cost_usd": 0.0795,
        "model": "claude-sonnet-4-20250514"
    },
    "timestamp": "2026-01-16T10:30:00Z"
}
```

---

## Gate 4 Approved Signal

**File:** `.claude/signal-wave[N]-gate4-approved.json`
**Created by:** QA Agent
**Triggers:** Proceed to Gate 5 (Code Review)

```json
{
    "wave": 1,
    "gate": 4,
    "decision": "APPROVED",
    "rejection_count": 0,
    "validations": {
        "build": {"status": "PASS", "exit_code": 0, "duration_ms": 5230},
        "typecheck": {"status": "PASS", "errors": 0, "warnings": 0},
        "lint": {"status": "PASS", "errors": 0, "warnings": 2},
        "test": {
            "status": "PASS",
            "passed": 47,
            "failed": 0,
            "skipped": 0,
            "coverage": 87.5
        }
    },
    "acceptance_criteria": {
        "AC-1": {"status": "PASS", "description": "User can upload images"},
        "AC-2": {"status": "PASS", "description": "Gallery displays images"}
    },
    "token_usage": {
        "input_tokens": 8000,
        "output_tokens": 1500,
        "total_tokens": 9500,
        "estimated_cost_usd": 0.0425,
        "model": "claude-haiku-4-20251001"
    },
    "agent": "qa",
    "timestamp": "2026-01-16T10:50:00Z"
}
```

---

## Gate 4 Rejected Signal

**File:** `.claude/signal-wave[N]-gate4-rejected.json`
**Created by:** QA Agent
**Triggers:** Gate 4.5 (Dev Fix retry cycle)

```json
{
    "wave": 1,
    "gate": 4,
    "decision": "REJECTED",
    "rejection_count": 1,
    "max_retries": 3,
    "validations": {
        "build": {"status": "PASS", "exit_code": 0},
        "typecheck": {"status": "FAIL", "errors": 3},
        "lint": {"status": "PASS", "errors": 0},
        "test": {"status": "FAIL", "passed": 42, "failed": 5, "coverage": 65.2}
    },
    "issues": [
        {
            "id": "QA-001",
            "severity": "HIGH",
            "category": "test_failure",
            "file": "src/api/upload.test.ts",
            "line": 45,
            "description": "Test 'should reject files over 5MB' fails",
            "error_message": "Expected: error, Received: success",
            "suggested_fix": "Add file size validation before upload"
        },
        {
            "id": "QA-002",
            "severity": "HIGH",
            "category": "typescript",
            "file": "src/components/Gallery.tsx",
            "line": 78,
            "description": "Type error: Property 'url' does not exist",
            "error_message": "TS2339: Property 'url' does not exist on type 'GalleryItem'",
            "suggested_fix": "Add 'url' property to GalleryItem interface"
        }
    ],
    "return_to_gate": 2,
    "token_usage": {
        "input_tokens": 10000,
        "output_tokens": 2000,
        "total_tokens": 12000,
        "estimated_cost_usd": 0.0550,
        "model": "claude-haiku-4-20251001"
    },
    "agent": "qa",
    "timestamp": "2026-01-16T10:47:08Z"
}
```

---

## Gate 4.5 Retry Signal

**File:** `.claude/signal-wave[N]-gate4.5-retry.json`
**Created by:** Orchestrator (wave-orchestrator.sh)
**Triggers:** Dev Fix agent starts fixing issues

```json
{
    "wave": 1,
    "gate": "4.5",
    "action": "DEV_FIX",
    "retry_count": 1,
    "max_retries": 3,
    "issues_file": "signal-wave1-gate4-rejected.json",
    "trigger": "qa_rejection",
    "timestamp": "2026-01-16T10:47:15Z"
}
```

---

## Gate 4.5 Fixed Signal

**File:** `.claude/signal-wave[N]-gate4.5-fixed.json`
**Created by:** Dev Fix Agent
**Triggers:** QA agent runs again

```json
{
    "wave": 1,
    "gate": "4.5",
    "status": "FIXED",
    "retry_count": 1,
    "issues_fixed": ["QA-001", "QA-002"],
    "issues_remaining": [],
    "changes_made": [
        {
            "file": "src/api/upload.ts",
            "action": "modified",
            "description": "Added file size validation"
        },
        {
            "file": "src/components/Gallery.tsx",
            "action": "modified",
            "description": "Fixed GalleryItem interface"
        }
    ],
    "tests_passed": true,
    "build_passed": true,
    "token_usage": {
        "input_tokens": 18500,
        "output_tokens": 4200,
        "total_tokens": 22700,
        "estimated_cost_usd": 0.1185,
        "model": "claude-sonnet-4-20250514"
    },
    "agent": "dev-fix",
    "timestamp": "2026-01-16T10:55:00Z"
}
```

---

## Gate 7 Merge Approved Signal

**File:** `.claude/signal-wave[N]-gate7-merge-approved.json`
**Created by:** PM Agent or Manual
**Triggers:** Merge to main and deploy

```json
{
    "wave": 1,
    "gate": 7,
    "status": "APPROVED",
    "approver": "pm-agent",
    "stories_included": ["STORY-001", "STORY-002"],
    "total_cost": 0.45,
    "timestamp": "2026-01-16T11:00:00Z"
}
```

---

## Escalation Signal

**File:** `.claude/signal-wave[N]-ESCALATION.json`
**Created by:** Orchestrator
**Triggers:** Pipeline halts, human intervention required

```json
{
    "wave": 1,
    "type": "ESCALATION",
    "reason": "Max retries exceeded",
    "rejection_count": 3,
    "max_retries": 3,
    "history": [
        {"attempt": 1, "timestamp": "2026-01-16T10:30:00Z", "issues": 5},
        {"attempt": 2, "timestamp": "2026-01-16T10:45:00Z", "issues": 3},
        {"attempt": 3, "timestamp": "2026-01-16T11:00:00Z", "issues": 2}
    ],
    "unresolved_issues": [
        {"id": "QA-001", "severity": "HIGH", "description": "..."}
    ],
    "requires": "HUMAN_INTERVENTION",
    "suggested_actions": [
        "Review remaining issues manually",
        "Consider simplifying requirements",
        "Check if issues are environment-specific"
    ],
    "timestamp": "2026-01-16T11:00:15Z"
}
```

---

## Signal Flow Diagram

```
FE-Dev/BE-Dev Agents
    │
    └─── signal-wave1-gate3-fe-dev-complete.json
    └─── signal-wave1-gate3-be-dev-complete.json
                        │
                        ▼
                   QA Agent
                        │
    ├─── PASS ──→ signal-wave1-gate4-approved.json ──→ Gate 7
    │
    └─── FAIL ──→ signal-wave1-gate4-rejected.json
                        │
                        ▼
                  Orchestrator
                        │
    ├─── retry < max ──→ signal-wave1-gate4.5-retry.json
    │                           │
    │                           ▼
    │                     Dev Fix Agent
    │                           │
    │                           ▼
    │                   signal-wave1-gate4.5-fixed.json
    │                           │
    │                           ▼
    │                     QA Agent (re-run)
    │
    └─── retry >= max ──→ signal-wave1-ESCALATION.json
                                │
                                ▼
                          HUMAN REVIEW
```

---

*WAVE Framework Signal Schemas | Version 1.0.0*
