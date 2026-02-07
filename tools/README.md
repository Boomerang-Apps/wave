# WAVE Development Tools

Story: SCHEMA-004

## Schema Validator

Validates AI Stories against V4.1, V4.2, or V4.3 schemas.

### Installation

```bash
cd tools
npm install
```

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

### Testing

```bash
# Run tests
npm test

# Watch mode
npm run test:watch

# Coverage
npm run test:coverage
```

### CI/CD Integration

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
