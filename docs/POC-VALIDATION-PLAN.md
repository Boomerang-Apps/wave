# WAVE POC Validation Plan
## Test Project: Photo Gallery V10.0.7

---

## Mission Objective

Validate that WAVE can autonomously:
1. ✈️ File flight plans (validate stories)
2. 🔧 Run pre-flight checks (smoke test)
3. 👨‍✈️ Execute missions with AI pilots (agents build code)
4. 🔍 Inspect and approve landing (QA validation)
5. 🛬 Merge to main (safe delivery)

---

## Test Project Overview

| Item | Value |
|------|-------|
| **Project** | test-v10.0.7-photo-gallery |
| **Location** | `/Users/elizager/Downloads/Testing/test-v10.0.7-photo-gallery` |
| **Code Dir** | `/Users/elizager/Downloads/Testing/test-v10.0.7-photo-gallery/code` |
| **Type** | Next.js Photo Gallery with Supabase |
| **Test Wave** | Wave 3 (2 frontend stories) |

### Wave 3 Missions (Stories)

| Mission ID | Title | Pilot |
|------------|-------|-------|
| WAVE3-FE-001 | Connect Gallery to Backend | FE-Dev |
| WAVE3-FE-002 | Loading States and Error Handling | FE-Dev |

---

## Pre-Validation Checklist

Before running the POC, verify these are in place:

```
□ 1. WAVE SCRIPTS ACCESSIBLE
     /Volumes/SSD-01/Projects/WAVE/core/scripts/

□ 2. TEST PROJECT EXISTS
     /Users/elizager/Downloads/Testing/test-v10.0.7-photo-gallery/

□ 3. ANTHROPIC API KEY SET
     Check .env file has ANTHROPIC_API_KEY

□ 4. STORIES EXIST
     stories/wave3/*.json (2 files)

□ 5. CODE DIRECTORY HAS NODE_MODULES
     code/node_modules/ exists

□ 6. SUPABASE CONFIGURED
     .env has SUPABASE_URL and keys
```

---

## Validation Phases

### PHASE 1: Building Blocks Validation
**Goal:** Verify phase-gate system works correctly

#### Step 1.1: Reset Environment
```bash
# Clear existing locks (fresh start)
rm -rf /Users/elizager/Downloads/Testing/test-v10.0.7-photo-gallery/.claude/locks/*

# Verify clean slate
ls /Users/elizager/Downloads/Testing/test-v10.0.7-photo-gallery/.claude/locks/
# Should be empty
```

#### Step 1.2: Run Phase 0 (Flight Plan Validation)
```bash
cd /Volumes/SSD-01/Projects/WAVE/core/scripts/building-blocks

./phase0-validator.sh \
    --project /Users/elizager/Downloads/Testing/test-v10.0.7-photo-gallery \
    --wave 3 \
    --verbose
```

**Expected Result:**
- ✅ Stories validated (2 stories found)
- ✅ JSON schema valid
- ✅ Required fields present
- 🔒 PHASE0-wave3.lock created

#### Step 1.3: Run Phase 2 (Pre-Flight Check)
```bash
./phase2-validator.sh \
    --project /Users/elizager/Downloads/Testing/test-v10.0.7-photo-gallery \
    --wave 3 \
    --code-dir /Users/elizager/Downloads/Testing/test-v10.0.7-photo-gallery/code \
    --verbose
```

**Expected Result:**
- ✅ Build passes (`pnpm build`)
- ✅ TypeScript compiles (0 errors)
- ✅ Lint passes (0 errors)
- ✅ Tests pass
- 🔒 PHASE2-wave3.lock created

#### Step 1.4: Verify Lock Chain
```bash
./lock-manager.sh status \
    --project /Users/elizager/Downloads/Testing/test-v10.0.7-photo-gallery \
    --wave 3
```

**Expected Result:**
```
Phase 0 (Stories):     ✅ LOCKED
Phase 2 (Smoke Test):  ✅ LOCKED
Phase 3 (Development): ❌ NOT LOCKED
Phase 4 (Validation):  ❌ NOT LOCKED
```

---

### PHASE 2: RLM Validation
**Goal:** Verify P variable and agent memory work

#### Step 2.1: Generate Fresh P Variable
```bash
cd /Volumes/SSD-01/Projects/WAVE/core/scripts/rlm

./generate-p-variable.sh \
    --project /Users/elizager/Downloads/Testing/test-v10.0.7-photo-gallery \
    --wave 3 \
    --verbose
```

**Expected Result:**
- ✅ P.json created/updated in .claude/
- ✅ Context hash calculated
- ✅ Codebase structure mapped
- ✅ Active stories identified

#### Step 2.2: Verify P Variable Content
```bash
cat /Users/elizager/Downloads/Testing/test-v10.0.7-photo-gallery/.claude/P.json | jq '.meta, .active_wave'
```

**Expected Result:**
- Project name correct
- Wave 3 active
- Context hash present

---

### PHASE 3: Drift Detection Validation
**Goal:** Verify drift detection and auto-invalidation

#### Step 3.1: Create a Drift Scenario
```bash
# Modify a story file (simulating unauthorized change)
echo '{"test": true}' >> /Users/elizager/Downloads/Testing/test-v10.0.7-photo-gallery/stories/wave3/WAVE3-FE-001-integration.json
```

#### Step 3.2: Run Drift Detection
```bash
cd /Volumes/SSD-01/Projects/WAVE/core/scripts/building-blocks

./drift-detector.sh check \
    --project /Users/elizager/Downloads/Testing/test-v10.0.7-photo-gallery \
    --wave 3
```

**Expected Result:**
- ⚠️ Drift detected in Phase 0
- 📢 Warning: checksums don't match

#### Step 3.3: Auto-Fix Drift
```bash
./drift-detector.sh auto-fix \
    --project /Users/elizager/Downloads/Testing/test-v10.0.7-photo-gallery \
    --wave 3
```

**Expected Result:**
- 🔓 Phase 0 lock INVALIDATED
- 🔓 Downstream locks INVALIDATED

#### Step 3.4: Restore Story File
```bash
# Restore the original story (remove test line)
cd /Users/elizager/Downloads/Testing/test-v10.0.7-photo-gallery/stories/wave3
git checkout WAVE3-FE-001-integration.json
```

---

### PHASE 4: Orchestrator Validation
**Goal:** Verify phase-orchestrator runs phases in sequence

#### Step 4.1: Run All Phases (Dry Run)
```bash
cd /Volumes/SSD-01/Projects/WAVE/core/scripts/building-blocks

./phase-orchestrator.sh \
    --project /Users/elizager/Downloads/Testing/test-v10.0.7-photo-gallery \
    --wave 3 \
    --up-to 2 \
    --dry-run \
    --verbose
```

**Expected Result:**
- Phase 0 would pass
- Phase 2 would pass
- No locks created (dry run)

#### Step 4.2: Run All Phases (Real)
```bash
./phase-orchestrator.sh \
    --project /Users/elizager/Downloads/Testing/test-v10.0.7-photo-gallery \
    --wave 3 \
    --up-to 2 \
    --code-dir /Users/elizager/Downloads/Testing/test-v10.0.7-photo-gallery/code \
    --verbose
```

**Expected Result:**
- ✅ Phase 0 PASSED
- ✅ Phase 2 PASSED
- 🔒 Both locks created

---

### PHASE 5: Merge Watcher Integration
**Goal:** Verify merge-watcher uses Building Blocks

#### Step 5.1: Test merge-watcher Startup Checks
```bash
cd /Volumes/SSD-01/Projects/WAVE/core/scripts

# Run merge-watcher (will check for locks at startup)
./merge-watcher-v12.sh \
    --project /Users/elizager/Downloads/Testing/test-v10.0.7-photo-gallery \
    --wave 3 \
    --help
```

**Expected Result:**
- Shows V12.2 with RLM + Building Blocks
- Shows `--no-building-blocks` option

#### Step 5.2: Verify Lock Enforcement at Startup
```bash
# Clear locks first
rm -rf /Users/elizager/Downloads/Testing/test-v10.0.7-photo-gallery/.claude/locks/*

# Try to run merge-watcher WITHOUT Phase 0 lock
timeout 10 ./merge-watcher-v12.sh \
    --project /Users/elizager/Downloads/Testing/test-v10.0.7-photo-gallery \
    --wave 3 2>&1 || true
```

**Expected Result:**
- ❌ Should fail/warn about missing Phase 0 lock
- 📢 Message: "Phase 0 (Stories) lock required"

---

### PHASE 6: End-to-End Autonomous Run (Optional)
**Goal:** Full autonomous wave execution

⚠️ **WARNING:** This phase will consume API credits and make actual code changes.

#### Step 6.1: Prepare for Full Run
```bash
# 1. Ensure clean worktrees
cd /Users/elizager/Downloads/Testing/test-v10.0.7-photo-gallery
ls worktrees/

# 2. Re-run phase orchestrator to get locks
cd /Volumes/SSD-01/Projects/WAVE/core/scripts/building-blocks
./phase-orchestrator.sh \
    --project /Users/elizager/Downloads/Testing/test-v10.0.7-photo-gallery \
    --wave 3 \
    --up-to 2 \
    --code-dir /Users/elizager/Downloads/Testing/test-v10.0.7-photo-gallery/code

# 3. Verify locks
./lock-manager.sh status \
    --project /Users/elizager/Downloads/Testing/test-v10.0.7-photo-gallery \
    --wave 3
```

#### Step 6.2: Launch Merge Watcher
```bash
cd /Volumes/SSD-01/Projects/WAVE/core/scripts

./merge-watcher-v12.sh \
    --project /Users/elizager/Downloads/Testing/test-v10.0.7-photo-gallery \
    --wave 3 \
    --type FE_ONLY \
    --interval 15
```

**Expected Behavior:**
1. 📋 Merge watcher starts, shows Building Blocks enabled
2. ⏳ Watches for Gate 3 completion signals
3. 👨‍✈️ (In separate terminal) Launch FE-Dev agent via Docker
4. 🔧 Agent builds features from Wave 3 stories
5. ✅ Agent creates completion signal
6. 🔍 Merge watcher detects signal, runs Phase 3 validator
7. 🔄 Syncs worktrees
8. 🔍 Runs Phase 4 (QA) validator
9. 🛬 Merges to main (or escalates if issues)

#### Step 6.3: Monitor Progress
```bash
# In another terminal, watch for signals
watch -n 5 'ls -la /Users/elizager/Downloads/Testing/test-v10.0.7-photo-gallery/.claude/*.json'

# Check lock status
watch -n 10 '/Volumes/SSD-01/Projects/WAVE/core/scripts/building-blocks/lock-manager.sh status \
    --project /Users/elizager/Downloads/Testing/test-v10.0.7-photo-gallery \
    --wave 3'
```

---

## Success Criteria

| Test | Pass Criteria |
|------|---------------|
| Phase 0 Validator | Creates lock, validates 2 stories |
| Phase 2 Validator | Build/test/lint all pass, creates lock |
| Drift Detection | Detects file changes, invalidates locks |
| Lock Manager | Shows correct status for all phases |
| Phase Orchestrator | Runs phases in sequence, stops on failure |
| RLM P Variable | Generated with correct structure |
| Merge Watcher | Starts with Building Blocks enabled |
| Lock Enforcement | Blocks without required locks |

---

## Troubleshooting

### Issue: Phase 2 build fails
```bash
# Check if dependencies installed
cd /Users/elizager/Downloads/Testing/test-v10.0.7-photo-gallery/code
pnpm install

# Check for missing env vars
cat ../.env | grep -E "SUPABASE|NEXT"
```

### Issue: Locks not being created
```bash
# Check locks directory exists
mkdir -p /Users/elizager/Downloads/Testing/test-v10.0.7-photo-gallery/.claude/locks

# Check script permissions
chmod +x /Volumes/SSD-01/Projects/WAVE/core/scripts/building-blocks/*.sh
```

### Issue: Bash version error
```bash
# Verify bash 4+
/opt/homebrew/bin/bash --version

# If not installed
brew install bash
```

---

## Quick Validation Script

Run this for a quick smoke test of all Building Blocks:

```bash
#!/bin/bash
# quick-validate.sh

PROJECT="/Users/elizager/Downloads/Testing/test-v10.0.7-photo-gallery"
CODE_DIR="$PROJECT/code"
WAVE=3
BB_DIR="/Volumes/SSD-01/Projects/WAVE/core/scripts/building-blocks"

echo "=== WAVE POC Quick Validation ==="
echo ""

# Clear locks
rm -rf "$PROJECT/.claude/locks/*"

# Phase 0
echo ">>> Phase 0: Story Validation"
$BB_DIR/phase0-validator.sh --project "$PROJECT" --wave $WAVE
echo ""

# Phase 2
echo ">>> Phase 2: Smoke Test"
$BB_DIR/phase2-validator.sh --project "$PROJECT" --wave $WAVE --code-dir "$CODE_DIR"
echo ""

# Status
echo ">>> Lock Status"
$BB_DIR/lock-manager.sh status --project "$PROJECT" --wave $WAVE
echo ""

echo "=== Validation Complete ==="
```

---

## Next Steps After Validation

1. **If all tests pass:** WAVE is ready for production use
2. **If some tests fail:** Debug using troubleshooting section
3. **For full autonomous run:** Launch Docker agents and observe

---

*WAVE POC Validation Plan | Version 1.0 | 2026-01-20*
