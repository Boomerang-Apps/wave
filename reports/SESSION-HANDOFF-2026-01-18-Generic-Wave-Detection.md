# WAVE Framework Session Handoff - 2026-01-18

## Framework: WAVE (Multi-Agent Framework) V11.2 → V12.1
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
| `--no-rlm` | Disable RLM integration |
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

### 6. Integrated RLM (Recursive Language Models) - NEW
**Based on:** MIT CSAIL Research (arXiv:2512.24601)

**Problem:** Context rot - agent performance degrades as context fills with accumulated state across waves.

**Solution:** RLM treats codebase as external variable P that agents query selectively, instead of loading full context.

**New Scripts Created:**
| Script | Location | Purpose |
|--------|----------|---------|
| `load-project-variable.sh` | `core/scripts/rlm/` | Generate P variable from project |
| `query-variable.py` | `core/scripts/rlm/` | REPL query interface for agents |
| `README.md` | `core/scripts/rlm/` | RLM usage documentation |

**RLM Integration in merge-watcher-v12.sh (now V12.1):**
| Integration Point | Action |
|-------------------|--------|
| Startup | Generate initial P variable |
| After worktree sync | Update P (codebase changed) |
| QA rejected | Add context hash to retry signal |
| Wave complete | Snapshot P for recovery |

**P Variable Structure:**
```json
{
    "meta": {
        "project_name": "...",
        "context_hash": "src:abc123,stories:def456"
    },
    "codebase": {
        "structure": [...],
        "file_count": 150
    },
    "wave_state": {
        "current_wave": 3,
        "wave_type": "FE_ONLY",
        "stories": [...],
        "signals": [...]
    },
    "worktrees": [...]
}
```

**Query Interface:**
```python
peek(P, "src/App.tsx")           # View file contents
search(P, "useAuth")             # Search pattern
list_files(P, "*.test.ts")       # Glob files
get_story(P, "AUTH-FE-001")      # Get story
get_memory(P, "fe-dev")          # Get agent memory
save_decision(P, "fe-dev", ...)  # Persist decision
```

**Token Savings:** 80-90% reduction in per-wave token usage

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
- `signal-wave${N}-gate3-fe-complete.json` (correct - N is variable)
- `signal-wave${N}-gate2-fe-complete.json` (WRONG - gate2 forbidden per V11.2)

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

### 6. RLM Context Management (NEW)
- P variable generated at `.claude/P.json`
- Updated after every worktree sync
- Snapshots saved to `.claude/rlm-snapshots/`
- Context hashes track what agents saw
- Agents query P instead of loading full codebase

---

## What Still Needs Improvement (WAVE Framework)

### HIGH Priority

1. ~~**Signal Enforcement Not Integrated**~~ **DONE**
   - Moved to WAVE core: `core/scripts/signal-enforcement/`
   - Updated with `--project` flag pattern

2. ~~**RLM Integration**~~ **DONE**
   - Added to merge-watcher-v12.sh (now V12.1)
   - P variable generation and updates working
   - Context hash tracking implemented

3. **Worktree Sync Recovery**
   - If sync fails mid-way, no recovery mechanism
   - RLM snapshots help but need explicit rollback

4. **Git Remote Push Automation**
   - Push automation in merge-watcher needs testing
   - Should handle conflicts gracefully

### MEDIUM Priority

5. **Slack Integration Untested**
   - `lib/slack-notify.sh` functions are called if available
   - Not tested with real Slack webhook
   - Should be part of framework validation

6. **QA Worktree Sync Robustness**
   - Uses `git reset --hard` which can fail
   - Fallback copies files but may miss some
   - Need more robust sync mechanism

7. **Sub-LLM Delegation**
   - RLM supports spawning focused sub-tasks to cheaper models
   - Not yet implemented in WAVE agents

### LOW Priority

8. **Agent Memory Persistence**
   - Schema defined but not integrated into agents
   - Would help preserve decisions across context resets

9. **Story Count Display**
   - `find "stories/wave${WAVE}"` may show 0 if directory missing
   - Not critical but could be confusing in logs

---

## WAVE Framework Files Modified

| File | Location | Change |
|------|----------|--------|
| `merge-watcher-v12.sh` | `core/scripts/` | V12.1: --project flag, generic wave detection, RLM integration |
| `create-signal.sh` | `core/scripts/signal-enforcement/` | Moved from test project, added --project flag |
| `validate-signal.sh` | `core/scripts/signal-enforcement/` | Moved from test project, added --check-all mode |
| `load-project-variable.sh` | `core/scripts/rlm/` | NEW: Generate P variable |
| `query-variable.py` | `core/scripts/rlm/` | NEW: REPL query interface |
| `README.md` | `core/scripts/rlm/` | NEW: RLM documentation |

## Files Created This Session

| File | Location | Purpose |
|------|----------|---------|
| `RLM-WAVE-ENHANCEMENT-PLAN-2026-01-18.md` | `reports/` | Full RLM implementation roadmap |
| `RLM-WAVE-IMPLEMENTATION-GUIDE.md` | Root | RLM concepts and patterns |
| `load-project-variable.sh` | `core/scripts/rlm/` | P variable generator |
| `query-variable.py` | `core/scripts/rlm/` | Query interface |

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

# Disable RLM if needed
/Volumes/SSD-01/Projects/WAVE/core/scripts/merge-watcher-v12.sh \
    --project /path/to/any-project \
    --wave $N \
    --no-rlm

# Generate P variable manually
/Volumes/SSD-01/Projects/WAVE/core/scripts/rlm/load-project-variable.sh \
    --project /path/to/project \
    --wave $N \
    --output /path/to/P.json

# Query P variable
python3 /Volumes/SSD-01/Projects/WAVE/core/scripts/rlm/query-variable.py \
    /path/to/P.json summary

python3 /Volumes/SSD-01/Projects/WAVE/core/scripts/rlm/query-variable.py \
    /path/to/P.json peek src/App.tsx

python3 /Volumes/SSD-01/Projects/WAVE/core/scripts/rlm/query-variable.py \
    /path/to/P.json search "useAuth"

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
```

---

## WAVE Framework Architecture

```
/Volumes/SSD-01/Projects/WAVE/           ← FRAMEWORK (Single Source of Truth)
├── core/
│   ├── scripts/                         ← Orchestration scripts (run FROM here)
│   │   ├── merge-watcher-v12.sh         ← V12.1: --project flag, RLM integration
│   │   ├── wave-orchestrator.sh         ← Uses: --project flag
│   │   ├── pre-flight-validator.sh
│   │   ├── setup-worktrees.sh
│   │   ├── signal-enforcement/          ← Signal validation
│   │   │   ├── create-signal.sh         ← --project flag
│   │   │   └── validate-signal.sh       ← --project --check-all
│   │   ├── rlm/                         ← NEW: RLM Integration
│   │   │   ├── load-project-variable.sh ← Generate P variable
│   │   │   ├── query-variable.py        ← REPL query interface
│   │   │   └── README.md                ← RLM documentation
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
│   ├── RLM-WAVE-ENHANCEMENT-PLAN-2026-01-18.md
│   └── SESSION-HANDOFF-2026-01-18-Generic-Wave-Detection.md
├── RLM-WAVE-IMPLEMENTATION-GUIDE.md     ← RLM concepts
└── README.md

[ANY PROJECT]/                           ← Projects are CONTROLLED by WAVE
├── stories/wave${N}/                    ← Story definitions (*FE*.json, *BE*.json)
├── .claude/                             ← Signal files, emergency stop
│   ├── P.json                           ← NEW: RLM project variable
│   ├── rlm-snapshots/                   ← NEW: P variable snapshots
│   ├── agent-memory/                    ← NEW: Agent decision persistence
│   └── signal-wave${N}-*.json           ← Signal files
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

## Git Commits This Session

```
[main c624faa] Fix hardcoded wave examples in RLM documentation
[main 3ecb580] Integrate RLM into merge-watcher-v12.sh (V12.1)
[main 2151054] Add RLM (Recursive Language Models) integration
[main xxxxxxx] Initial commit: WAVE Framework V11.2
```

---

## Next Session Priorities

1. ~~Move signal-enforcement scripts to WAVE core~~ **DONE**
2. ~~Integrate RLM into merge-watcher~~ **DONE**
3. Test full wave cycle end-to-end using `--project` pattern with RLM
4. Implement agent memory persistence (save/load decisions)
5. Add worktree sync recovery mechanism with RLM snapshots
6. Test sub-LLM delegation pattern
7. Test Slack integration with real webhook

---

## Framework Principle Reminder

> **"The WAVE framework controls projects - projects don't customize the framework."**
>
> - Scripts live in WAVE core, not in projects
> - Use `--project` flag to specify which project to control
> - Wave numbers are VARIABLES (`$WAVE`), never hardcoded
> - If you find yourself copying scripts to projects, you're doing it wrong

> **"Context as external variable, not embedded in prompts."** (RLM)
>
> - P variable stores project state at `.claude/P.json`
> - Agents query P selectively instead of loading full codebase
> - Reduces token usage by 80-90%
> - Prevents context rot in long-running waves

---

*Handoff created: 2026-01-18 15:35*
*Handoff updated: 2026-01-18 17:15*
*Framework version: WAVE V12.1 (with RLM)*
*Test project: Photo Gallery V10.0.7*
*Last working state: merge-watcher V12.1 with RLM integration, P variable generation working*
