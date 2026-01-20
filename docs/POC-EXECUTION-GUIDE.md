# WAVE POC Execution Guide
## Photo Gallery V10.0.7 Test Flight

---

## Mission Progress

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║   🛫 WAVE POC VALIDATION MISSION                                              ║
║                                                                               ║
║   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  0% NOT STARTED          ║
║                                                                               ║
║   Phases: [1] ▢  [2] ▢  [3] ▢  [4] ▢  [5] ▢  [6] ▢                           ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
```

---

## Quick Reference

| Variable | Value |
|----------|-------|
| **PROJECT** | `/Users/elizager/Downloads/Testing/test-v10.0.7-photo-gallery` |
| **CODE_DIR** | `/Users/elizager/Downloads/Testing/test-v10.0.7-photo-gallery/code` |
| **WAVE_SCRIPTS** | `/Volumes/SSD-01/Projects/WAVE/core/scripts` |
| **TEST_WAVE** | 3 |

---

# PHASE 1: Pre-Flight Setup
### Ground Operations

```
Progress: ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  0%
```

## Step 1.1: Verify Ground Infrastructure

- [ ] **Check WAVE scripts exist**
```bash
ls /Volumes/SSD-01/Projects/WAVE/core/scripts/building-blocks/
```
Expected: `phase0-validator.sh`, `phase2-validator.sh`, `lock-manager.sh`, etc.

---

- [ ] **Check test project exists**
```bash
ls /Users/elizager/Downloads/Testing/test-v10.0.7-photo-gallery/
```
Expected: `code/`, `stories/`, `.claude/`, `CLAUDE.md`

---

- [ ] **Verify stories exist for Wave 3**
```bash
ls /Users/elizager/Downloads/Testing/test-v10.0.7-photo-gallery/stories/wave3/
```
Expected: `WAVE3-FE-001-integration.json`, `WAVE3-FE-002-states.json`

---

- [ ] **Check code dependencies installed**
```bash
ls /Users/elizager/Downloads/Testing/test-v10.0.7-photo-gallery/code/node_modules/ | head -5
```
Expected: Node modules present (if not, run `cd code && pnpm install`)

---

## Step 1.2: Clear Previous State

- [ ] **Reset locks directory**
```bash
rm -rf /Users/elizager/Downloads/Testing/test-v10.0.7-photo-gallery/.claude/locks/*
mkdir -p /Users/elizager/Downloads/Testing/test-v10.0.7-photo-gallery/.claude/locks
```

---

- [ ] **Verify clean slate**
```bash
ls -la /Users/elizager/Downloads/Testing/test-v10.0.7-photo-gallery/.claude/locks/
```
Expected: Empty directory

---

### Phase 1 Complete?
```
✅ All checkboxes marked = Phase 1 COMPLETE
Progress: █████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  10%

Phases: [1] ✅  [2] ▢  [3] ▢  [4] ▢  [5] ▢  [6] ▢
```

---

# PHASE 2: Flight Plan Filing
### Phase 0 Validator (Stories)

```
Progress: █████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  10%
```

## Step 2.1: Run Phase 0 Validator

- [ ] **Execute Phase 0 (Story Validation)**
```bash
/Volumes/SSD-01/Projects/WAVE/core/scripts/building-blocks/phase0-validator.sh \
    --project /Users/elizager/Downloads/Testing/test-v10.0.7-photo-gallery \
    --wave 3 \
    --verbose
```

Expected Output:
```
[PHASE 0] Validating stories for wave 3...
[PHASE 0] Found 2 story files
[PHASE 0] ✓ WAVE3-FE-001-integration.json - Valid
[PHASE 0] ✓ WAVE3-FE-002-states.json - Valid
[PHASE 0] All stories validated successfully
[PHASE 0] PHASE 0 PASSED
```

---

- [ ] **Verify Phase 0 lock created**
```bash
ls -la /Users/elizager/Downloads/Testing/test-v10.0.7-photo-gallery/.claude/locks/
```
Expected: `PHASE0-wave3.lock` exists

---

- [ ] **Inspect lock content**
```bash
cat /Users/elizager/Downloads/Testing/test-v10.0.7-photo-gallery/.claude/locks/PHASE0-wave3.lock | head -20
```
Expected: JSON with `status: "PASSED"`, `checksum`, `stories_validated`

---

### Phase 2 Complete?
```
✅ All checkboxes marked = Phase 2 COMPLETE
Progress: ██████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  20%

Phases: [1] ✅  [2] ✅  [3] ▢  [4] ▢  [5] ▢  [6] ▢
```

---

# PHASE 3: Pre-Flight Check
### Phase 2 Validator (Smoke Test)

```
Progress: ██████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  20%
```

## Step 3.1: Run Phase 2 Validator

- [ ] **Execute Phase 2 (Build/Test/Lint)**
```bash
/Volumes/SSD-01/Projects/WAVE/core/scripts/building-blocks/phase2-validator.sh \
    --project /Users/elizager/Downloads/Testing/test-v10.0.7-photo-gallery \
    --wave 3 \
    --code-dir /Users/elizager/Downloads/Testing/test-v10.0.7-photo-gallery/code \
    --verbose
```

Expected Output:
```
[PHASE 2] Running smoke test for wave 3...
[PHASE 2] ✓ Build passed
[PHASE 2] ✓ TypeScript: 0 errors
[PHASE 2] ✓ Lint: 0 errors
[PHASE 2] ✓ Tests passed
[PHASE 2] PHASE 2 PASSED
```

---

- [ ] **Verify Phase 2 lock created**
```bash
ls -la /Users/elizager/Downloads/Testing/test-v10.0.7-photo-gallery/.claude/locks/
```
Expected: `PHASE0-wave3.lock` AND `PHASE2-wave3.lock`

---

## Step 3.2: Verify Lock Chain

- [ ] **Check lock status**
```bash
/Volumes/SSD-01/Projects/WAVE/core/scripts/building-blocks/lock-manager.sh status \
    --project /Users/elizager/Downloads/Testing/test-v10.0.7-photo-gallery \
    --wave 3
```

Expected Output:
```
╔═══════════════════════════════════════════════════════════════╗
║                    LOCK STATUS - WAVE 3                       ║
╠═══════════════════════════════════════════════════════════════╣
║  Phase 0 (Stories):     ✅ LOCKED                             ║
║  Phase 2 (Smoke Test):  ✅ LOCKED                             ║
║  Phase 3 (Development): ❌ NOT LOCKED                         ║
║  Phase 4 (Validation):  ❌ NOT LOCKED                         ║
╚═══════════════════════════════════════════════════════════════╝
```

---

### Phase 3 Complete?
```
✅ All checkboxes marked = Phase 3 COMPLETE
Progress: ████████████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  40%

Phases: [1] ✅  [2] ✅  [3] ✅  [4] ▢  [5] ▢  [6] ▢
```

---

# PHASE 4: Drift Detection Test
### Radar Anomaly Simulation

```
Progress: ████████████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  40%
```

## Step 4.1: Create Drift (Simulate Unauthorized Change)

- [ ] **Modify a story file**
```bash
echo "" >> /Users/elizager/Downloads/Testing/test-v10.0.7-photo-gallery/stories/wave3/WAVE3-FE-001-integration.json
```

---

## Step 4.2: Detect Drift

- [ ] **Run drift detector**
```bash
/Volumes/SSD-01/Projects/WAVE/core/scripts/building-blocks/drift-detector.sh check \
    --project /Users/elizager/Downloads/Testing/test-v10.0.7-photo-gallery \
    --wave 3
```

Expected Output:
```
⚠️  DRIFT DETECTED
    Phase 0: Checksum mismatch
    Stored:  sha256:abc123...
    Current: sha256:def456...
```

---

## Step 4.3: Auto-Invalidate Locks

- [ ] **Run auto-fix**
```bash
/Volumes/SSD-01/Projects/WAVE/core/scripts/building-blocks/drift-detector.sh auto-fix \
    --project /Users/elizager/Downloads/Testing/test-v10.0.7-photo-gallery \
    --wave 3
```

Expected Output:
```
🔓 Phase 0 lock INVALIDATED
🔓 Phase 2 lock INVALIDATED (downstream)
```

---

## Step 4.4: Restore and Re-validate

- [ ] **Restore story file**
```bash
cd /Users/elizager/Downloads/Testing/test-v10.0.7-photo-gallery/stories/wave3
git checkout WAVE3-FE-001-integration.json
```

---

- [ ] **Re-run Phase 0 to restore lock**
```bash
/Volumes/SSD-01/Projects/WAVE/core/scripts/building-blocks/phase0-validator.sh \
    --project /Users/elizager/Downloads/Testing/test-v10.0.7-photo-gallery \
    --wave 3
```

---

- [ ] **Re-run Phase 2 to restore lock**
```bash
/Volumes/SSD-01/Projects/WAVE/core/scripts/building-blocks/phase2-validator.sh \
    --project /Users/elizager/Downloads/Testing/test-v10.0.7-photo-gallery \
    --wave 3 \
    --code-dir /Users/elizager/Downloads/Testing/test-v10.0.7-photo-gallery/code
```

---

### Phase 4 Complete?
```
✅ All checkboxes marked = Phase 4 COMPLETE
Progress: ██████████████████████████████░░░░░░░░░░░░░░░░░░░░  60%

Phases: [1] ✅  [2] ✅  [3] ✅  [4] ✅  [5] ▢  [6] ▢
```

---

# PHASE 5: RLM Validation
### Pilot Briefing Package

```
Progress: ██████████████████████████████░░░░░░░░░░░░░░░░░░░░  60%
```

## Step 5.1: Generate P Variable

- [ ] **Run P variable generator**
```bash
/Volumes/SSD-01/Projects/WAVE/core/scripts/rlm/generate-p-variable.sh \
    --project /Users/elizager/Downloads/Testing/test-v10.0.7-photo-gallery \
    --wave 3 \
    --verbose
```

Expected: P.json created/updated

---

- [ ] **Verify P variable content**
```bash
cat /Users/elizager/Downloads/Testing/test-v10.0.7-photo-gallery/.claude/P.json | head -30
```

Expected: JSON with `meta`, `codebase`, `active_wave` sections

---

## Step 5.2: Verify Context Hash

- [ ] **Check context hash exists**
```bash
cat /Users/elizager/Downloads/Testing/test-v10.0.7-photo-gallery/.claude/P.json | grep context_hash
```

Expected: `"context_hash": "src:xxxxxx,stories:yyyyyy"`

---

### Phase 5 Complete?
```
✅ All checkboxes marked = Phase 5 COMPLETE
Progress: ████████████████████████████████████████░░░░░░░░░░  80%

Phases: [1] ✅  [2] ✅  [3] ✅  [4] ✅  [5] ✅  [6] ▢
```

---

# PHASE 6: Merge Watcher Integration
### Control Tower Online

```
Progress: ████████████████████████████████████████░░░░░░░░░░  80%
```

## Step 6.1: Verify Merge Watcher

- [ ] **Check merge-watcher version**
```bash
/Volumes/SSD-01/Projects/WAVE/core/scripts/merge-watcher-v12.sh --help | head -10
```

Expected: `WAVE Merge Watcher V12.2 (with RLM + Building Blocks)`

---

## Step 6.2: Test Lock Enforcement

- [ ] **Clear locks to test enforcement**
```bash
rm -rf /Users/elizager/Downloads/Testing/test-v10.0.7-photo-gallery/.claude/locks/*
```

---

- [ ] **Attempt to start merge-watcher (should warn)**
```bash
timeout 5 /Volumes/SSD-01/Projects/WAVE/core/scripts/merge-watcher-v12.sh \
    --project /Users/elizager/Downloads/Testing/test-v10.0.7-photo-gallery \
    --wave 3 2>&1 || echo "Expected timeout/warning"
```

Expected: Warning about missing Phase 0 lock

---

## Step 6.3: Restore Locks for Full Run

- [ ] **Run phase orchestrator up to Phase 2**
```bash
/Volumes/SSD-01/Projects/WAVE/core/scripts/building-blocks/phase-orchestrator.sh \
    --project /Users/elizager/Downloads/Testing/test-v10.0.7-photo-gallery \
    --wave 3 \
    --up-to 2 \
    --code-dir /Users/elizager/Downloads/Testing/test-v10.0.7-photo-gallery/code
```

---

- [ ] **Verify all prerequisite locks**
```bash
/Volumes/SSD-01/Projects/WAVE/core/scripts/building-blocks/lock-manager.sh status \
    --project /Users/elizager/Downloads/Testing/test-v10.0.7-photo-gallery \
    --wave 3
```

Expected: Phase 0 ✅, Phase 2 ✅

---

### Phase 6 Complete?
```
✅ All checkboxes marked = Phase 6 COMPLETE
Progress: ██████████████████████████████████████████████████  100%

Phases: [1] ✅  [2] ✅  [3] ✅  [4] ✅  [5] ✅  [6] ✅
```

---

# 🎉 MISSION COMPLETE

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║   🛬 WAVE POC VALIDATION COMPLETE                                             ║
║                                                                               ║
║   ██████████████████████████████████████████████████  100% COMPLETE           ║
║                                                                               ║
║   Phases: [1] ✅  [2] ✅  [3] ✅  [4] ✅  [5] ✅  [6] ✅                        ║
║                                                                               ║
║   ┌─────────────────────────────────────────────────────────────────────┐     ║
║   │  ✅ Pre-Flight Setup      - Ground infrastructure verified         │     ║
║   │  ✅ Flight Plan Filing    - Phase 0 validator working              │     ║
║   │  ✅ Pre-Flight Check      - Phase 2 validator working              │     ║
║   │  ✅ Drift Detection       - Radar detecting changes                │     ║
║   │  ✅ RLM Integration       - P variable generating                  │     ║
║   │  ✅ Merge Watcher         - Control tower operational              │     ║
║   └─────────────────────────────────────────────────────────────────────┘     ║
║                                                                               ║
║   STATUS: CLEARED FOR AUTONOMOUS OPERATIONS                                   ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
```

---

# OPTIONAL: Full Autonomous Run

⚠️ **WARNING:** This will consume API credits and make real code changes.

## Launch Sequence

### Terminal 1: Control Tower (Merge Watcher)
```bash
/Volumes/SSD-01/Projects/WAVE/core/scripts/merge-watcher-v12.sh \
    --project /Users/elizager/Downloads/Testing/test-v10.0.7-photo-gallery \
    --wave 3 \
    --type FE_ONLY \
    --interval 10
```

### Terminal 2: Pilot Launch (Docker Agent)
```bash
cd /Users/elizager/Downloads/Testing/test-v10.0.7-photo-gallery
docker compose up fe-dev
```

### Terminal 3: Mission Monitor
```bash
watch -n 5 'echo "=== SIGNALS ===" && \
ls -la /Users/elizager/Downloads/Testing/test-v10.0.7-photo-gallery/.claude/*.json 2>/dev/null && \
echo "" && echo "=== LOCKS ===" && \
ls -la /Users/elizager/Downloads/Testing/test-v10.0.7-photo-gallery/.claude/locks/'
```

---

## Expected Autonomous Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         AUTONOMOUS MISSION FLOW                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  TIME        EVENT                                    STATUS                │
│  ────        ─────                                    ──────                │
│                                                                             │
│  T+0:00      Merge Watcher starts                     🗼 Tower Online       │
│  T+0:05      FE-Dev agent launches                    ✈️ Pilot Airborne     │
│  T+2:00      Agent reads stories                      📋 Mission Briefed    │
│  T+5:00      Agent builds WAVE3-FE-001                🔧 Building           │
│  T+10:00     Agent builds WAVE3-FE-002                🔧 Building           │
│  T+15:00     Agent creates Gate 3 signal              📡 Mission Complete   │
│  T+15:05     Watcher detects signal                   🗼 Signal Received    │
│  T+15:10     Phase 3 validator runs                   🔍 Inspecting         │
│  T+15:15     Worktrees synced                         🔄 Syncing            │
│  T+15:20     Phase 4 (QA) validator runs              🔍 Final Check        │
│  T+15:30     Merge to main                            🛬 Landed             │
│  T+15:35     Notification sent                        📢 Mission Complete   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Phase 2 build fails | Run `cd code && pnpm install` first |
| Lock not created | Check `.claude/locks/` directory exists |
| Drift always detected | Ensure story files are committed to git |
| Bash errors | Use `/opt/homebrew/bin/bash` (version 4+) |
| merge-watcher exits | Check API key in `.env` |

---

*WAVE POC Execution Guide | Version 1.0 | 2026-01-20*
