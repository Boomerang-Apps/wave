# Migration Guide: V4.2 to V4.3

**Version:** 4.3
**Date:** 2026-02-07

---

## What Changed in V4.3

V4.3 adds six new top-level sections while remaining fully backward compatible with V4.2.

| New Section | Purpose | Required |
|-------------|---------|----------|
| `context` | Pre-load files and examples to reduce exploration cost | No |
| `execution` | Control retries, timeouts, model tier, checkpointing | No |
| `subtasks` | Break complex stories into smaller units | No |
| `enterprise` | Compliance tracking, SLAs, approval workflows | No |
| `output` | Expected output for post-execution validation | No |
| `validation` | Automated validation commands | No |

Enhanced section:

| Section | Enhancement |
|---------|-------------|
| `design_source` | Added `components`, `interactions`, `responsive`, `accessibility` |

---

## Migration Paths

### Path A: Automated Migration (Recommended)

Use the migration tool to add V4.3 fields with sensible defaults:

```bash
cd tools
npm install  # First time only

# Preview changes (no files modified)
npx ts-node migrate-stories-v42-to-v43.ts --dry-run stories/MY-STORY-001.json

# Migrate single file (creates MY-STORY-001.v43.json)
npx ts-node migrate-stories-v42-to-v43.ts stories/MY-STORY-001.json

# Migrate in-place (overwrites original)
npx ts-node migrate-stories-v42-to-v43.ts --in-place stories/MY-STORY-001.json

# Migrate all stories in a directory
npx ts-node migrate-stories-v42-to-v43.ts stories/**/*.json
```

The migration tool:
- Preserves all existing V4.2 fields
- Adds new V4.3 sections with defaults
- Updates `schema_version` to `4.3`
- Updates `$schema` reference
- Validates output against V4.3 schema
- Creates `.backup` files by default

### Path B: Manual Migration

Add V4.3 fields manually to your story:

```json
{
  "schema_version": "4.3",
  "$schema": "../planning/schemas/story-schema-v4.3.json",

  "context": {
    "read_files": [],
    "code_examples": [],
    "similar_implementations": []
  },

  "execution": {
    "max_retries": 3,
    "timeout_minutes": 60,
    "model_tier": "sonnet",
    "checkpoint_frequency": "per_gate"
  },

  "subtasks": [],

  "enterprise": {
    "compliance": [],
    "approvals_required": [],
    "modification_history": []
  },

  "output": {
    "files_created": [],
    "files_modified": [],
    "tests_passing": false
  },

  "validation": {}
}
```

### Path C: No Migration

V4.2 stories work without modification. The V4.3 schema accepts `schema_version: "4.2"`. Migrate only when you update a story or want to use new features.

---

## Field-by-Field Changes

### New Fields

| Field | Default Value | When to Customize |
|-------|---------------|-------------------|
| `context.read_files` | `[]` | Add files the agent should read before starting |
| `context.code_examples` | `[]` | Add patterns to follow |
| `context.similar_implementations` | `[]` | Point to similar features |
| `execution.max_retries` | `3` | Increase for flaky operations, decrease for critical |
| `execution.timeout_minutes` | `60` | Adjust based on story complexity |
| `execution.model_tier` | `sonnet` | Use `opus` for complex architecture, `haiku` for simple tasks |
| `execution.checkpoint_frequency` | `per_gate` | Use `per_subtask` for large stories |
| `subtasks` | `[]` | Break down 8+ point stories |
| `enterprise.compliance` | `[]` | Add for regulated features |
| `output.files_created` | `[]` | List expected output files |
| `validation` | `{}` | Add lint/test/build commands |

### Enhanced Fields

**`design_source`** gains four new sub-fields:

```json
"design_source": {
  "type": "figma",
  "path": "mockups/test.html",
  "components": [],
  "interactions": [],
  "accessibility": {
    "wcag_level": "AA",
    "keyboard_navigation": true,
    "screen_reader_tested": false
  }
}
```

### Validation Constraint Changes

| Field | V4.2 | V4.3 |
|-------|------|------|
| `objective.i_want` | No min length | `minLength: 10` |
| `objective.so_that` | No min length | `minLength: 10` |
| `acceptance_criteria[].description` | No min length | `minLength: 10` |

These constraints ensure story requirements are descriptive enough for automated agents.

---

## Validation After Migration

```bash
# Validate migrated story
cd tools
npx ts-node validate-story.ts stories/MY-STORY-001.json

# Run migration tool tests
npm test
```

---

## Rollback

If migration causes issues:

```bash
# Restore from backup (created by default)
mv stories/MY-STORY-001.json.backup stories/MY-STORY-001.json
```

Or revert the `schema_version` and `$schema` fields to V4.2 values. All new V4.3 fields are ignored by the V4.2 schema.
