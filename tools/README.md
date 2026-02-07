# WAVE Development Tools

Stories: SCHEMA-003, SCHEMA-004

## Installation

```bash
cd tools
npm install
```

---

## Migration Tool (V4.2 → V4.3)

Story: SCHEMA-003

Migrates AI Stories from V4.2 to V4.3 format.

### Usage

**Migrate a single story:**
```bash
npm run migrate -- ../stories/AUTH-001.json
# Creates: ../stories/AUTH-001.v43.json
```

**Dry-run (preview changes):**
```bash
npm run migrate -- --dry-run ../stories/AUTH-001.json
```

**Migrate all stories in a directory:**
```bash
npm run migrate -- ../stories/**/*.json
```

**Migrate in-place (overwrite original):**
```bash
npm run migrate -- --in-place ../stories/AUTH-001.json
```

**Disable backups:**
```bash
npm run migrate -- --no-backup ../stories/AUTH-001.json
```

### Features

- ✅ Preserves all V4.2 fields exactly
- ✅ Adds new V4.3 fields with sensible defaults (context, execution, subtasks, enterprise)
- ✅ Validates output against V4.3 schema
- ✅ Dry-run mode to preview changes
- ✅ Creates `.backup` files by default
- ✅ Batch migration support
- ✅ Idempotent (running twice produces same result)

### What Gets Added

- `schema_version`: Updated to "4.3"
- `$schema`: Updated to reference v4.3 schema
- `context`: Empty arrays for read_files, code_examples, similar_implementations
- `execution`: Defaults (max_retries: 3, timeout: 60min, model: sonnet)
- `subtasks`: Empty array
- `enterprise`: Empty compliance/approvals, modification_history entry
- `output`: Empty structure
- `validation`: Empty object
- `design_source`: Enhanced with components, interactions, accessibility (if present)

---

## Schema Validator

Story: SCHEMA-004

Validates AI Stories against V4.1, V4.2, or V4.3 schemas.

### Usage

**Validate a single story:**
```bash
npm run validate -- ../stories/AUTH-001.json
```

**Validate all stories in a directory:**
```bash
npm run validate -- ../stories/**/*.json
```

**Validate multiple files:**
```bash
npm run validate -- ../stories/AUTH-001.json ../stories/AUTH-002.json
```

**Direct execution:**
```bash
ts-node validate-story.ts ../stories/AUTH-001.json
```

### Features

- ✅ Auto-detects schema version (V4.1, V4.2, V4.3)
- ✅ Clear error messages with line numbers
- ✅ Helpful suggestions for common errors
- ✅ Exit code 0 for pass, 1 for fail (CI/CD ready)
- ✅ Supports single files, directories, and glob patterns
- ✅ Format validators for uri, date-time, etc. (via ajv-formats)

### Example Output

**Valid Story:**
```
✅ stories/AUTH-001.json: VALID
```

**Invalid Story:**
```
❌ stories/AUTH-002.json: INVALID
   /title: must be string (line 5)
   💡 Suggestion: Ensure the field contains a string value, not a number or boolean.

   /wave_number: must be integer (line 8)
   💡 Suggestion: Use a whole number (e.g., 5), not a decimal or string.
```

---

## Testing

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# Coverage
npm run test:coverage
```

---

## CI/CD Integration

### Validate Stories

Add to your `.github/workflows/ci.yml`:

```yaml
- name: Validate AI Stories
  run: |
    cd tools
    npm install
    npm run validate -- ../stories/**/*.json
```

### Pre-commit Hook

Add to `.git/hooks/pre-commit`:

```bash
#!/bin/bash
cd tools && npm run validate -- ../stories/**/*.json
if [ $? -ne 0 ]; then
  echo "❌ Story validation failed. Fix errors before committing."
  exit 1
fi
```

---

## Workflow: Migrating Your Stories

1. **Backup everything** (just in case):
   ```bash
   cp -r stories stories-backup
   ```

2. **Dry-run first**:
   ```bash
   cd tools
   npm run migrate -- --dry-run ../stories/**/*.json
   ```

3. **Run migration**:
   ```bash
   npm run migrate -- ../stories/**/*.json
   ```

4. **Review .v43 files**:
   ```bash
   diff stories/AUTH-001.json stories/AUTH-001.v43.json
   ```

5. **Validate migrated stories**:
   ```bash
   npm run validate -- ../stories/**/*.v43.json
   ```

6. **If all good, replace originals** (optional):
   ```bash
   # Rename .v43 files to replace originals
   cd ../stories
   for f in *.v43.json; do mv "$f" "${f/.v43/}"; done
   ```
