# Schema V4.2 Migration Guide

**Version:** 4.2
**Date:** 2026-02-01
**Status:** ACTIVE

---

## Overview

Schema V4.2 is a hybrid schema that combines:
- **V4 Strengths:** Comprehensive TDD, practical test_approach, files.forbidden, design_specs
- **V4.1 Additions:** EARS format, hazard_analysis, gates_completed, traceability, metadata

### Design Principles

1. **Backward Compatible** - Existing V4 stories work without modification
2. **Progressive Enhancement** - New fields are optional for existing stories
3. **TDD Excellence** - Preserves V4's superior testing section
4. **Formal Compliance** - Adds V4.1 traceability and gates when needed

---

## Quick Reference

### Required Fields (V4.2)

```json
{
  "story_id": "WAVE5-FE-001",        // Flexible pattern
  "title": "Feature Title",
  "domain": "frontend",
  "wave_number": 5,
  "priority": "high",
  "status": "pending",
  "objective": { "as_a": "", "i_want": "", "so_that": "" },
  "acceptance_criteria": [],
  "files": { "create": [], "modify": [], "forbidden": [] },
  "safety": { "stop_conditions": [] }
}
```

### Optional but Recommended

```json
{
  "type": "feature",                 // NEW in V4.2
  "agent": "fe-dev",
  "story_points": 5,
  "description": "...",
  "tdd": { ... },                    // V4 excellence
  "hazard_analysis": { ... },        // V4.1 addition
  "gates_completed": [],             // V4.1 addition
  "metadata": { "created_at": "" }   // V4.1 addition
}
```

---

## Field Mapping

### From V4 to V4.2 (No Changes Required)

| V4 Field | V4.2 Field | Change |
|----------|------------|--------|
| story_id | story_id | None |
| wave_number | wave_number | None |
| acceptance_criteria[].description | acceptance_criteria[].description | None |
| acceptance_criteria[].test_approach | acceptance_criteria[].test_approach | None |
| files.create | files.create | None |
| files.forbidden | files.forbidden | None |
| tdd.* | tdd.* | None |
| safety.* | safety.* | None |
| dependencies.* | dependencies.* | None |

### New V4.2 Fields (Add to New Stories)

| Field | Purpose | Required |
|-------|---------|----------|
| type | Story classification | No (default: feature) |
| acceptance_criteria[].ears_format | EARS syntax | No (optional) |
| hazard_analysis | Risk assessment | No |
| gates_completed | Gate tracking | No |
| traceability | Requirements linkage | No |
| metadata | Timestamps | No |
| schema_version | Version identifier | No |

---

## EARS Format Guide

### What is EARS?

**E**asy **A**pproach to **R**equirements **S**yntax - a standardized way to write testable requirements.

### Pattern

```
WHEN {trigger} THEN {expected behavior} [threshold: {metric}]
```

### Examples

```json
{
  "acceptance_criteria": [
    {
      "id": "AC-01",
      "description": "User can upload image from gallery",
      "ears_format": "WHEN user selects image from gallery THEN image preview displays within 500ms",
      "threshold": "latency: <500ms"
    },
    {
      "id": "AC-02",
      "description": "Show error for oversized files",
      "ears_format": "WHEN user uploads file >20MB THEN display Hebrew error toast 'הקובץ גדול מדי'"
    },
    {
      "id": "AC-03",
      "description": "Form validates on submit",
      "ears_format": "WHEN user submits form with empty required fields THEN highlight invalid fields and prevent submission"
    }
  ]
}
```

### When to Use EARS

- **New stories (Wave 5+):** Recommended for all ACs
- **Existing stories:** Optional - add only if updating the story
- **Complex behaviors:** Always use for edge cases and error handling

---

## Hazard Analysis Guide

### When to Include

- Stories involving payment processing
- Authentication/authorization changes
- Data deletion operations
- External API integrations
- User data handling

### Severity Levels

| Level | Description | Example |
|-------|-------------|---------|
| catastrophic | System-wide failure, data loss | Database corruption |
| critical | Feature unusable, security breach | Auth bypass |
| major | Significant degradation | Payment fails silently |
| minor | Inconvenience | UI glitch |

### Likelihood Levels

| Level | Description |
|-------|-------------|
| frequent | Expected to occur often |
| probable | Will occur several times |
| occasional | Likely to occur sometime |
| remote | Unlikely but possible |
| improbable | Very unlikely |

### Example

```json
{
  "hazard_analysis": {
    "identified_hazards": [
      {
        "id": "HAZ-001",
        "description": "Payment processed but order not created",
        "severity": "critical",
        "likelihood": "remote",
        "mitigation": "Use database transaction, implement idempotency"
      }
    ],
    "risk_level": "medium"
  }
}
```

---

## Gates Tracking

### Gate Definitions

| Gate | Owner | Purpose |
|------|-------|---------|
| gate-0 | CTO | Pre-flight, research validation |
| gate-1 | Agent | Self-review, branch created |
| gate-2 | Agent | Build passes |
| gate-3 | Agent | Tests pass |
| gate-4 | QA | Acceptance testing |
| gate-5 | PM | Requirements met |
| gate-6 | CTO | Architecture review |
| gate-7 | CTO | Merge approval |

### Tracking Format

```json
{
  "gates_completed": [
    {
      "gate": "gate-0",
      "completed_at": "2026-02-01T10:00:00Z",
      "approved_by": "cto",
      "evidence": "stories/wave5/WAVE5-FE-001-GATE0-RESEARCH.md"
    },
    {
      "gate": "gate-1",
      "completed_at": "2026-02-01T11:00:00Z",
      "approved_by": "fe-dev-1",
      "evidence": "commit:abc123"
    }
  ]
}
```

---

## Migration Paths

### Path A: New Stories (Recommended)

Use full V4.2 schema with all features:

```bash
# Copy template
cp planning/schemas/story-template-v4.2.json stories/wave5/WAVE5-FE-001.json

# Edit with your story details
# Include EARS format, hazard_analysis, gates_completed
```

### Path B: Existing Stories (No Migration)

Leave as-is. V4 stories are compatible:

- Wave 1-4 stories: **DO NOT MIGRATE**
- They work without changes
- Add V4.2 fields only when updating

### Path C: Selective Enhancement

Add V4.2 fields when touching existing stories:

```json
// Before (V4)
{
  "story_id": "BE-03",
  "acceptance_criteria": [
    { "id": "AC-001", "description": "...", "test_approach": "..." }
  ]
}

// After (V4.2 enhanced)
{
  "story_id": "BE-03",
  "type": "feature",
  "acceptance_criteria": [
    {
      "id": "AC-001",
      "description": "...",
      "ears_format": "WHEN ... THEN ...",  // Added
      "test_approach": "..."
    }
  ],
  "gates_completed": [  // Added
    { "gate": "gate-7", "completed_at": "2026-01-30T00:00:00Z" }
  ]
}
```

---

## Validation

### Schema Validation

```bash
# Validate a story against V4.2 schema
npx ajv validate -s planning/schemas/story-schema-v4.2.json -d stories/wave5/WAVE5-FE-001.json
```

### Using /schema-validate Command

```
/schema-validate WAVE5-FE-001
/schema-validate wave 5
/schema-validate all
```

---

## Best Practices

### DO

- Use full V4.2 for new stories (Wave 5+)
- Include EARS format for complex behaviors
- Add hazard_analysis for risky operations
- Track gates_completed as you progress
- Keep V4 TDD section detailed

### DON'T

- Migrate completed stories unnecessarily
- Remove existing fields when adding V4.2 fields
- Skip test_approach when adding ears_format
- Force EARS on simple, obvious criteria

---

## Example: Complete V4.2 Story

See: `planning/schemas/story-template-v4.2.json`

---

## Questions?

- Schema file: `planning/schemas/story-schema-v4.2.json`
- Template: `planning/schemas/story-template-v4.2.json`
- V4.1 (reference): `planning/schemas/story-schema-v4.1.json`
