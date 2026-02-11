# AI Story Schema V4 Compliance Report
**Date:** 2026-01-29
**Stories Analyzed:** WAVE1-FE-001, WAVE1-FE-002

---

## Schema V4 Required Fields

| Field | Required | Type | Description |
|-------|----------|------|-------------|
| `id` | YES | string | Pattern: `WAVE1-FE-001` or `AUTH-FE-001` |
| `title` | YES | string | Must start with action verb |
| `domain` | YES | enum | auth, client, pilot, project, proposal, messaging, payment, deliverables, admin, layout, general, public |
| `objective` | YES | object | `{as_a, i_want, so_that}` |
| `acceptance_criteria` | YES | array | Min 3 items, each with `{id: "AC-X", description}` |
| `files` | YES | object | Must include `forbidden[]` (min 1) |
| `safety` | YES | object | Must include `stop_conditions[]` (min 3) |

---

## Compliance Issues Found

### WAVE1-FE-001: Upload Flow Enhancement

| Issue | Severity | Current Value | Required |
|-------|----------|---------------|----------|
| `title` doesn't start with action verb | HIGH | "Upload Flow Enhancement" | "Implement Upload Flow Enhancement" |
| `domain` uses invalid value | HIGH | "fe" | Must be from enum (use "general") |
| `acceptance_criteria` wrong format | HIGH | Array of strings | Array of objects with id/description |
| `safety.stop_conditions` count | MEDIUM | 3 items | OK (minimum 3) |
| Missing `technical_domain` | LOW | - | "frontend" |
| Missing `priority` | LOW | - | "P2-Medium" |
| Missing `tests.commands` | MEDIUM | - | Required array |

### WAVE1-FE-002: Style Editor Improvements

| Issue | Severity | Current Value | Required |
|-------|----------|---------------|----------|
| `title` doesn't start with action verb | HIGH | "Style Editor Improvements" | "Implement Style Editor Improvements" |
| `domain` uses invalid value | HIGH | "fe" | Must be from enum |
| `acceptance_criteria` wrong format | HIGH | Array of strings | Array of objects |
| `safety.stop_conditions` count | HIGH | 1 item | Minimum 3 required |
| Missing `technical_domain` | LOW | - | "frontend" |
| Missing `tests.commands` | MEDIUM | - | Required array |

---

## Schema Updates Recommended

The schema `domain` enum should be extended to include technical domains:

```json
"domain": {
  "enum": [
    "auth", "client", "pilot", "project", "proposal",
    "messaging", "payment", "deliverables", "admin",
    "layout", "general", "public",
    "frontend", "backend", "infrastructure"  // ADD THESE
  ]
}
```

Or stories should map FE→"general", BE→"general" with `technical_domain` for routing.

---

## Corrected Story Format

### Example: WAVE1-FE-001 (Compliant)

```json
{
  "id": "WAVE1-FE-001",
  "title": "Implement Drag-and-Drop Image Upload with Progress Tracking",
  "domain": "general",
  "technical_domain": "frontend",
  "agent": "fe-dev-1",
  "priority": "P2-Medium",
  "risk": "low",
  "approval_required": "L5",
  "safety_tags": ["file_system"],
  "complexity": "M",
  "estimate_hours": 4,
  "objective": {
    "as_a": "user",
    "i_want": "to easily upload images with visual feedback",
    "so_that": "I can quickly add photos to my project"
  },
  "acceptance_criteria": [
    {
      "id": "AC-01",
      "title": "Drag and Drop Support",
      "ears_pattern": "event-driven",
      "given": "the upload zone is visible",
      "when": "user drags and drops an image file",
      "then": "the file is added to the upload queue",
      "description": "Users can drag and drop images onto the upload zone"
    },
    {
      "id": "AC-02",
      "title": "Progress Indicator",
      "ears_pattern": "state-driven",
      "given": "a file is uploading",
      "when": "upload progress changes",
      "then": "percentage indicator updates in real-time",
      "threshold": "update every 100ms",
      "description": "Upload progress is displayed with percentage indicator"
    },
    {
      "id": "AC-03",
      "title": "Multiple File Selection",
      "ears_pattern": "ubiquitous",
      "given": "the file picker is open",
      "when": "user selects multiple files",
      "then": "up to 10 files can be queued",
      "description": "Multiple file selection is supported (up to 10 files)"
    }
  ],
  "files": {
    "create": [
      "src/components/upload/DropZone.tsx",
      "src/components/upload/ProgressBar.tsx",
      "src/components/upload/ThumbnailPreview.tsx"
    ],
    "modify": [
      "src/components/upload/ImageUploader.tsx"
    ],
    "forbidden": [
      ".env",
      ".env.local",
      "supabase/migrations/*"
    ]
  },
  "tests": {
    "commands": [
      "pnpm test src/components/upload",
      "pnpm test:coverage"
    ],
    "coverage_threshold": 80,
    "unit_tests": [
      "DropZone renders correctly",
      "DropZone accepts valid file types",
      "DropZone rejects invalid file types",
      "ProgressBar shows correct percentage",
      "ThumbnailPreview displays image"
    ]
  },
  "safety": {
    "max_iterations": 25,
    "token_budget": 100000,
    "timeout_minutes": 60,
    "stop_conditions": [
      "Safety score drops below 0.85",
      "Attempting to modify auth flow",
      "Attempting database schema changes",
      "Token budget exceeded"
    ],
    "escalation_triggers": [
      "Storage bucket configuration changes",
      "File size limit modifications"
    ]
  },
  "implementation_hints": [
    "Use react-dropzone for drag-and-drop",
    "Implement chunked upload for large files",
    "Use Supabase Storage with presigned URLs"
  ],
  "definition_of_done": [
    "All acceptance criteria verified",
    "Unit tests passing with 80%+ coverage",
    "No TypeScript errors",
    "Accessibility audit passed",
    "Code reviewed by CTO agent"
  ],
  "status": "ready",
  "gate": 3,
  "wave": 1
}
```

---

## Action Items

1. **Update existing stories** to comply with schema V4
2. **Consider schema update** to add frontend/backend to domain enum
3. **Add `tests.commands`** to all stories (required field)
4. **Ensure minimum 3 stop_conditions** in all stories
5. **Use action verbs** in all titles

---

## Validation Script

Run this to validate stories against schema:

```bash
# Install ajv-cli if needed
npm install -g ajv-cli

# Validate story
ajv validate -s ai-story-schema-v4.json -d WAVE1-FE-001.json
```
