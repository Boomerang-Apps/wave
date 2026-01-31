# /build - Build Validation

**Priority:** P2 (MEDIUM)
**Recommended Model:** Haiku
**Aliases:** /b

## Purpose

Run complete build validation including type-check, linter, and production build. Ensures code is ready for commit or deployment.

## When to Run

- Before commit
- Before PR creation
- After major changes
- CI validation locally

## Arguments

| Argument | Description | Default |
|----------|-------------|---------|
| `--type-check` | Run type-check only | false |
| `--lint` | Run linter only | false |
| `--prod` | Run production build only | false |
| `--fix` | Auto-fix lint issues | false |
| `--verbose` | Show detailed output | false |

## Execution Steps

### 1. Type Check
```bash
cd /Volumes/SSD-01/Projects/Footprint/footprint
npm run type-check
```

### 2. Lint
```bash
npm run lint
# With auto-fix:
npm run lint -- --fix
```

### 3. Production Build
```bash
npm run build
```

## Output Format

### All Passing
```
Build Validation
================
[✓] Type Check: PASS (0 errors)
[✓] Lint: PASS (0 errors, 2 warnings)
[✓] Build: PASS (26 pages)

Build Time: 45.2s
Output: .next/

Ready for commit.
```

### Type Errors
```
Build Validation
================
[✗] Type Check: FAIL (3 errors)

Errors:
  src/components/Upload.tsx:45:12
    Type 'string' is not assignable to type 'number'

  src/lib/validation.ts:12:5
    Function lacks return type annotation

  src/lib/validation.ts:28:7
    'result' is declared but never used

[SKIPPED] Lint
[SKIPPED] Build

FIX REQUIRED: Resolve type errors before proceeding.
```

### Lint Errors
```
Build Validation
================
[✓] Type Check: PASS (0 errors)
[✗] Lint: FAIL (5 errors, 12 warnings)

Errors:
  src/components/Button.tsx:10:5
    'React' must be in scope when using JSX

  src/utils/helpers.ts:23:1
    Unexpected console statement (no-console)

  ... 3 more errors

Auto-fix available: Run /build --fix

[SKIPPED] Build
```

### Build Failure
```
Build Validation
================
[✓] Type Check: PASS
[✓] Lint: PASS
[✗] Build: FAIL

Build Error:
  Module not found: Can't resolve '@/components/Missing'

  Import trace:
    src/app/page.tsx:5
    src/components/Layout.tsx:12

FIX: Check import paths and ensure component exists.
```

## Build Stats

On successful build, show:
```
Build Statistics
================
Pages: 26
  - Static: 18
  - Dynamic: 8

Bundle Size:
  - First Load JS: 87.2 kB
  - Largest Page: /create (124 kB)

Performance:
  - Build Time: 45.2s
  - Type Check: 8.1s
  - Lint: 3.4s
```

## CI Parity

This command mirrors CI checks:
```yaml
# .github/workflows/ci.yml equivalent:
- npm run type-check
- npm run lint
- npm run build
```

## Integration

- Used by: `/commit` (pre-commit check)
- Used by: `/pr` (pre-PR validation)
- Used by: `/preflight` (build status)
- Outputs: Build artifacts to `.next/`

## Evidence Sources

- Spec: `/Volumes/SSD-01/Projects/Footprint/footprint/.claude/SKILLS-RECOMMENDATION.md` (Section 3.6)
- Scripts: `package.json` build commands
- CI: `.github/workflows/ci.yml`
