# /preflight - Gate 0 Pre-Flight Validation

**Priority:** P0 (CRITICAL)
**Recommended Model:** Haiku
**Aliases:** /pf

## Purpose

Verify all WAVE pre-flight requirements before allowing any code changes. This is Gate 0 enforcement - work MUST NOT proceed if validation fails.

## When to Run

- Start of every session
- Before any code changes
- After pulling new changes
- Before agent dispatch

## Validation Steps

Execute the following checks in order:

### 1. Docker Status
```bash
docker ps --filter "name=wave-redis" --format "{{.Names}}: {{.Status}}"
```
- **PASS:** wave-redis container running
- **FAIL:** Container not running → Run `docker start wave-redis`

### 2. Pre-flight Lock Check
```bash
python scripts/preflight_lock.py --check
```
- **PASS:** Lock is valid
- **FAIL:** Lock invalid → Run `python scripts/preflight_lock.py --validate --lock`

### 3. Safety Files Exist
Check these files exist:
- `src/safety/__init__.py`
- `src/safety/constitutional.py`
- `src/safety/emergency_stop.py`
- `src/safety/budget.py`

### 4. Build Status
```bash
cd footprint && npm run type-check
```
- **PASS:** No type errors
- **FAIL:** Fix type errors before proceeding

### 5. Git Status
```bash
git status --porcelain
```
- **INFO:** Report uncommitted changes
- **WARNING:** If on main/staging branch, suggest creating feature branch

## Output Format

```
WAVE Pre-Flight Check
=====================
[✓] Docker: wave-redis running
[✓] Pre-flight Lock: Valid (hash: abc123...)
[✓] Safety Files: 4/4 present
[✓] Build: Type-check passed
[✓] Git: Clean working tree

STATUS: READY FOR WORK
```

Or on failure:

```
WAVE Pre-Flight Check
=====================
[✓] Docker: wave-redis running
[✗] Pre-flight Lock: INVALID - files changed
[✓] Safety Files: 4/4 present
[✓] Build: Type-check passed
[!] Git: 3 uncommitted changes

STATUS: BLOCKED

FIX REQUIRED:
  python scripts/preflight_lock.py --validate --lock

DO NOT proceed with any code changes until pre-flight passes.
```

## Failure Behavior

If ANY check fails:
1. Print specific failure reason
2. Provide exact fix command
3. **DO NOT proceed with any work**
4. **DO NOT write any code**
5. Wait for user to fix and re-run /preflight

## Integration

- Uses: `scripts/preflight_lock.py`
- Updates: `.claude/preflight-report.json`
- Reads: `.claude/PREFLIGHT.lock`

## Evidence Sources

- Script: `/Volumes/SSD-01/Projects/Footprint/footprint/scripts/preflight_lock.py`
- Spec: `/Volumes/SSD-01/Projects/Footprint/footprint/.claude/SKILLS-RECOMMENDATION.md` (Section 3.1)
