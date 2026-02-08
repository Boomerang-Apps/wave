# WAVE AI Story Schema Documentation

## Schema Files

| File | Description |
|------|-------------|
| `planning/schemas/story-schema-v4.3.json` | Current schema (V4.3) |
| `planning/schemas/story-schema-v4.2.json` | Previous schema (V4.2) |
| `planning/schemas/story-schema-v4.1.json` | Legacy schema (V4.1) |
| `planning/schemas/story-template-v4.3.json` | V4.3 story template |
| `planning/schemas/story-template-v4.2.json` | V4.2 story template |

## Documentation

| Document | Description |
|----------|-------------|
| [V4.3 Field Reference](v4.3-reference.md) | Complete field reference for all V4.3 schema fields |
| [Migration Guide V4.2 to V4.3](migration-v42-v43.md) | Step-by-step migration from V4.2 to V4.3 |
| [Best Practices](best-practices.md) | Cost reduction, story writing, and execution tips |

## Tools

| Tool | Command | Description |
|------|---------|-------------|
| Validator | `cd tools && npm run test` | Validate stories against schema |
| Migration | `cd tools && npm run migrate -- <file>` | Migrate V4.2 stories to V4.3 |

## Quick Start

```bash
# Validate a story
cd tools && npx ts-node validate-story.ts stories/MY-STORY-001.json

# Migrate a V4.2 story to V4.3
cd tools && npx ts-node migrate-stories-v42-to-v43.ts stories/MY-STORY-001.json

# Dry-run migration (preview only)
cd tools && npx ts-node migrate-stories-v42-to-v43.ts --dry-run stories/MY-STORY-001.json
```

## Version History

| Version | Date | Changes |
|---------|------|---------|
| V4.3 | 2026-02-07 | Context loading, execution control, subtasks, enterprise compliance, enhanced design_source |
| V4.2 | 2026-02-01 | Story type classification, EARS format, hazard analysis, gates tracking |
| V4.1 | 2026-01-31 | Traceability, metadata, formal compliance additions |
