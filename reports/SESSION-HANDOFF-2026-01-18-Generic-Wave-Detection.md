# WAVE Framework Session Handoff - 2026-01-18

## Framework: WAVE (Multi-Agent Framework) V11.2
## Test Project: Photo Gallery V10.0.7

---

## What Was Accomplished This Session

### 1. Fixed Hardcoded Wave Type Logic (CRITICAL)
**File:** `core/scripts/merge-watcher-v12.sh` (WAVE Framework core script)

**Problem:** Wave type detection was hardcoded to specific wave numbers:
```bash
# OLD - WRONG (not reusable across projects)
case "$WAVE" in
    1|3|4) WAVE_TYPE="FE_ONLY" ;;
    2)     WAVE_TYPE="BE_ONLY" ;;
esac
```

**Solution:** Implemented dynamic detection - works for ANY project, ANY wave:
```bash
# NEW - GENERIC (template-based, project-agnostic)
detect_wave_type() {
    # Counts *FE*.json and *BE*.json in stories/wave${N}/
    # Returns: FE_ONLY, BE_ONLY, or FULL
}
```

### 2. Fixed Function Order Bug
- `log_info` was called before it was defined (line 79 vs definition at line 121)
- Fixed by removing early log call; wave type is logged after functions defined

### 3. Updated merge-watcher-v12.sh to use --project flag
**Problem:** Script used inconsistent positional argument pattern:
```bash
# OLD - Inconsistent with other WAVE scripts
WAVE=4 ./merge-watcher-v12.sh [project_root]
```

**Solution:** Updated to use `--project` flag like `wave-orchestrator.sh`:
```bash
# NEW - Consistent with WAVE framework pattern (wave is a VARIABLE)
./merge-watcher-v12.sh --project /path/to/project --wave $N
```

**New flags added:**
| Flag | Description |
|------|-------------|
| `-p, --project` | Path to project (REQUIRED) |
| `-w, --wave` | Wave number - ANY number (default: 1) |
| `-t, --type` | Wave type override (FE_ONLY, BE_ONLY, FULL) |
| `-i, --interval` | Poll interval in seconds |
| `-h, --help` | Show help |

### 4. Cleaned Up Scattered Script Copies
**Problem:** 46 copies of merge-watcher scripts scattered across test projects

**Solution:** Removed all duplicates - now single source of truth in WAVE core

| Before | After |
|--------|-------|
| 47 copies (1 core + 46 scattered) | 1 copy (WAVE core only) |

### 5. Verified Generic Detection Works
Tested with Photo Gallery project:
| Wave | Stories | Detection |
|------|---------|-----------|
| 1 | none | FULL (default) |
| 2 | 2 BE | BE_ONLY |
| 3 | 2 FE | FE_ONLY |
| 99 | none | FULL (default) |

---

## Key Takeaways for WAVE Framework

### 1. Template Architecture is MANDATORY
The WAVE framework MUST be **template-based and generic**:
- Use `$WAVE` variable, NEVER hardcode wave numbers (1, 2, 3, 4...)
- Use `$AGENT_TYPE` variable, NEVER hardcode agent names
- Detection should be dynamic (check files/directories that exist)
- Environment variables provide overrides for edge cases
- Scripts must work for ANY project without modification

### 2. Scripts Run FROM WAVE, Control Projects
**Correct pattern:**
```bash
# Run from WAVE framework, pass project path
/Volumes/SSD-01/Projects/WAVE/core/scripts/merge-watcher-v12.sh --project /path/to/project
/Volumes/SSD-01/Projects/WAVE/core/scripts/wave-orchestrator.sh --project /path/to/project
```

**Wrong pattern:**
```bash
# DON'T copy scripts to projects
# DON'T run scripts from within projects
cd /path/to/project && ./scripts/merge-watcher.sh  # WRONG!
```

### 3. Signal File Patterns (Framework Standard)
Correct naming: `signal-wave${WAVE}-gate${N}-${status}.json`
- `signal-wave4-gate3-fe-complete.json` (correct)
- `signal-wave4-gate2-fe-complete.json` (WRONG - gate2 forbidden per V11.2)

### 4. Wave Type Detection Priority (Framework Standard)
1. `--type` flag or `WAVE_TYPE` environment variable (explicit override)
2. Auto-detect from `stories/wave${N}/*FE*.json` and `*BE*.json`
3. Default to `FULL` if nothing found

### 5. FE-Only / BE-Only Wave Handling
When `WAVE_TYPE=FE_ONLY`:
- Only waits for `gate3-fe-complete` signal
- Marks BE as complete automatically (not applicable)
- Proceeds to sync and QA

When `WAVE_TYPE=BE_ONLY`:
- Only waits for `gate3-be-complete` signal
- Marks FE as complete automatically (not applicable)
- Proceeds to sync and QA

---

## What Still Needs Improvement (WAVE Framework)

### HIGH Priority

1. ~~**Signal Enforcement Not Integrated**~~ **DONE**
   - Moved to WAVE core: `core/scripts/signal-enforcement/`
   - Updated with `--project` flag pattern

2. **Worktree Sync Recovery**
   - If sync fails mid-way, no recovery mechanism
   - Consider adding checkpoint/rollback to framework

3. **Git Remote Push Automation**
   - Push automation in merge-watcher needs testing
   - Should handle conflicts gracefully

### MEDIUM Priority

4. **Slack Integration Untested**
   - `lib/slack-notify.sh` functions are called if available
   - Not tested with real Slack webhook
   - Should be part of framework validation

5. **QA Worktree Sync Robustness**
   - Uses `git reset --hard` which can fail
   - Fallback copies files but may miss some
   - Need more robust sync mechanism

6. **Archive Directory Auto-Creation**
   - Rejection signals archived to `.claude/archive/`
   - Directory may not exist; should `mkdir -p` first

### LOW Priority

7. **Story Count Display**
   - `find "stories/wave${WAVE}"` may show 0 if directory missing
   - Not critical but could be confusing in logs

---

## WAVE Framework Files Modified

| File | Location | Change |
|------|----------|--------|
| `merge-watcher-v12.sh` | `core/scripts/` | Added --project flag, generic wave detection |
| `create-signal.sh` | `core/scripts/signal-enforcement/` | Moved from test project, added --project flag |
| `validate-signal.sh` | `core/scripts/signal-enforcement/` | Moved from test project, added --check-all mode |

## Files Cleaned Up

| Action | Count | Description |
|--------|-------|-------------|
| Removed | 46 | Scattered merge-watcher copies in test projects |
| Removed | 2 | Old signal-enforcement scripts from test project |

---

## Testing Commands (From WAVE Framework)

```bash
# Run merge-watcher from WAVE core (wave is a VARIABLE - any number)
/Volumes/SSD-01/Projects/WAVE/core/scripts/merge-watcher-v12.sh \
    --project /path/to/any-project \
    --wave $N                          # 1, 2, 3, 99... ANY wave

# With explicit wave type override (still generic)
/Volumes/SSD-01/Projects/WAVE/core/scripts/merge-watcher-v12.sh \
    --project /path/to/any-project \
    --wave $N \
    --type $TYPE                       # FE_ONLY, BE_ONLY, FULL

# Create a signal (ALL params are variables)
/Volumes/SSD-01/Projects/WAVE/core/scripts/signal-enforcement/create-signal.sh \
    --project /path/to/project \
    --wave $WAVE \                     # Any wave number
    --gate $GATE \                     # 0, 1, 3, 4, 4.5, 7
    --agent $AGENT \                   # fe-dev, be-dev, qa, etc.
    --status $STATUS                   # COMPLETE, APPROVED, etc.

# Validate all signals in a project
/Volumes/SSD-01/Projects/WAVE/core/scripts/signal-enforcement/validate-signal.sh \
    --project /path/to/project \
    --check-all

# Show help
/Volumes/SSD-01/Projects/WAVE/core/scripts/merge-watcher-v12.sh --help
/Volumes/SSD-01/Projects/WAVE/core/scripts/signal-enforcement/create-signal.sh --help

# Check stories in any project (wave is variable in path too)
ls -la /path/to/project/stories/wave*/

# Check signal files
ls -la /path/to/project/.claude/signal-*.json
```

---

## WAVE Framework Architecture

```
/Volumes/SSD-01/Projects/WAVE/           ← FRAMEWORK (Single Source of Truth)
├── core/
│   ├── scripts/                         ← Orchestration scripts (run FROM here)
│   │   ├── merge-watcher-v12.sh         ← Updated: --project flag
│   │   ├── wave-orchestrator.sh         ← Uses: --project flag
│   │   ├── pre-flight-validator.sh
│   │   ├── setup-worktrees.sh
│   │   ├── signal-enforcement/          ← NEW: Signal validation
│   │   │   ├── create-signal.sh         ← --project flag
│   │   │   └── validate-signal.sh       ← --project --check-all
│   │   ├── lib/
│   │   │   └── slack-notify.sh
│   │   └── (20+ other scripts)
│   ├── templates/                       ← COPIED to projects during setup
│   │   ├── project-setup.sh
│   │   ├── CLAUDE.md.template
│   │   ├── docker-compose.template.yml
│   │   └── .env.template
│   └── docs/
├── .claudecode/                         ← Agent definitions, safety rules
├── reports/                             ← Session handoffs, retros
└── README.md

[ANY PROJECT]/                           ← Projects are CONTROLLED by WAVE
├── stories/wave${N}/                    ← Story definitions (*FE*.json, *BE*.json)
├── .claude/                             ← Signal files, emergency stop
├── worktrees/
│   ├── fe-dev/                          ← Frontend development
│   ├── be-dev/                          ← Backend development
│   ├── qa/                              ← QA validation
│   └── dev-fix/                         ← Bug fixes
├── CLAUDE.md                            ← Generated from template
├── docker-compose.yml                   ← Generated from template
└── .env                                 ← Generated from template
                                         ← NO orchestration scripts here!
```

---

## Next Session Priorities

1. ~~Move signal-enforcement scripts to WAVE core~~ **DONE**
2. Test full wave cycle end-to-end using `--project` pattern
3. Add worktree sync recovery mechanism
4. Document framework usage for new projects
5. Consider creating convenience alias/wrapper for common commands
6. Test Slack integration with real webhook

---

## Framework Principle Reminder

> **"The WAVE framework controls projects - projects don't customize the framework."**
>
> - Scripts live in WAVE core, not in projects
> - Use `--project` flag to specify which project to control
> - If you find yourself copying scripts to projects, you're doing it wrong

---

*Handoff created: 2026-01-18 15:35*
*Handoff updated: 2026-01-18 16:15*
*Framework version: WAVE V11.2*
*Test project: Photo Gallery V10.0.7*
*Last working state: All scripts with --project flag, signal-enforcement in WAVE core*
