# /preflight - Wave V2 Pre-Flight Authorization

**Priority:** P0 (CRITICAL - Must run before ANY execution)
**Aliases:** /pf, /takeoff-check

## Purpose

Complete pre-flight authorization check with execution mode selection and GO/NO-GO decision gate. This command validates all systems, lets the user choose their execution mode, and provides clear visual confirmation of flight readiness.

## When to Run

- **ALWAYS** at the start of every development session
- Before launching any wave execution
- Before any story implementation
- After pulling new changes from remote
- When switching between projects

---

## PHASE 1: System Validation Checks

Run all checks and collect results. Use icons:
- `[✓]` = PASS (green)
- `[✗]` = FAIL (red/blocking)
- `[○]` = OPTIONAL (yellow/warning)
- `[!]` = WARNING (non-blocking)

### 1.1 Configuration Files
```bash
# Check .claude/config.json exists and is valid
cat .claude/config.json | head -5
```
- **PASS:** Config file exists and contains valid JSON
- **FAIL:** Missing or invalid config → Run `/wave-init`

### 1.2 Docker Status (Optional for Single-Thread Mode)
```bash
docker ps --filter "name=wave" --format "{{.Names}}: {{.Status}}" 2>/dev/null || echo "Docker not available"
```
- **PASS:** Wave containers running (required for Autonomous mode)
- **OPTIONAL:** Not running (acceptable for Single-Thread mode)
- Note: wave-redis, wave-orchestrator containers

### 1.3 Safety Files
Check existence of safety infrastructure:
- `.claude/settings.json` or `.claude/config.json`
- `planning/schemas/story-schema-v4.1.json`
- `planning/checklists/preflight-checklist.json`

### 1.4 Build Verification
```bash
# Run build check based on project config
npm run build 2>&1 || npm run type-check 2>&1
```
- **PASS:** Build/type-check succeeds
- **FAIL:** Build errors → Must fix before proceeding

### 1.5 Test Status
```bash
npm run test 2>&1 | tail -20
```
- **PASS:** Tests passing
- **WARNING:** Some tests failing (non-blocking but noted)

### 1.6 Git Repository Status
```bash
git status --porcelain | head -20
git branch --show-current
git log origin/main..HEAD --oneline 2>/dev/null | wc -l
```
- **INFO:** Report branch, uncommitted files, unpushed commits
- **WARNING:** On main branch (suggest feature branch for new work)

### 1.7 Stories Available
```bash
find stories/ -name "*.json" -type f 2>/dev/null | wc -l
ls stories/wave*/  2>/dev/null | head -10
```
- **INFO:** Count available stories
- **WARNING:** No stories found

### 1.8 LangSmith Tracing (Optional but Recommended)
```bash
# Check LangSmith environment variables
env | grep -E "LANGCHAIN_|LANGSMITH_" || echo "No LangSmith config"

# Verify API connection if configured
if [ -n "$LANGSMITH_API_KEY" ]; then
  curl -s -H "x-api-key: $LANGSMITH_API_KEY" \
    https://api.smith.langchain.com/info | \
    python3 -c "import sys,json; data=json.load(sys.stdin); print(f\"✓ Connected to LangSmith v{data['version']}\")" \
    2>/dev/null || echo "⚠ LangSmith API unreachable"
fi
```
- **PASS:** LangSmith configured and API accessible
- **OPTIONAL:** Not configured (tracing will be disabled)
- **WARNING:** Configured but API unreachable

**Verification Points:**
- `LANGCHAIN_TRACING_V2=true` - Enable tracing
- `LANGCHAIN_API_KEY` or `LANGSMITH_API_KEY` - Valid API key
- `LANGCHAIN_PROJECT` - Project name (e.g., wave-local-development)
- `LANGSMITH_WORKSPACE_ID` - Workspace identifier

**What LangSmith Provides:**
- 🔍 Full agent execution traces
- 💰 Token usage and cost tracking per story
- 🐛 Debugging with prompt/response history
- 📊 Performance metrics and optimization insights

**To Enable:**
```bash
# Get API key from: https://smith.langchain.com/settings
export LANGCHAIN_TRACING_V2=true
export LANGCHAIN_API_KEY=lsv2_...
export LANGCHAIN_PROJECT=wave-local-development
```

**Documentation:** `orchestrator/src/tracing/config.py`

---

## PHASE 2: Execution Mode Selection

After system checks pass, prompt user to select execution mode:

### Ask User: Execution Mode

**Question:** "How do you want to execute work in this session?"

**Options:**

| Mode | Description | Requirements |
|------|-------------|--------------|
| **Autonomous Pipeline** | Multi-agent Wave V2 with Docker containers, parallel execution, separate worktrees, full E2E automation | Docker required, wave containers running |
| **Single-Thread Mode** | Sequential execution in current conversation, one story at a time, interactive guidance | No Docker required, works in any environment |

### Mode Details

#### Autonomous Pipeline Mode
- Launches separate Claude instances per agent role (BE-Dev, FE-Dev, QA, etc.)
- Uses Docker containers for isolation
- Parallel story execution within wave
- Automated gate progression (Gate 0 → Gate 7)
- Requires: Docker running, wave-redis, orchestrator
- Best for: Full wave execution, CI/CD pipelines

#### Single-Thread Mode
- Everything runs in current conversation
- You guide the agent through each step
- Sequential story execution
- Manual gate verification with your approval
- No Docker required
- Best for: Learning, debugging, single stories, quick fixes

---

## PHASE 3: Development Type Selection

### Ask User: What do you want to do?

**Options:**

| Type | Description | Typical Flow |
|------|-------------|--------------|
| **Execute Story** | Implement a specific story through all gates | Gate 0 → Code → Gate 7 |
| **Launch Wave** | Execute all stories in a wave | Parallel/sequential based on mode |
| **Bug Fix / Hotfix** | Quick fix for production issue | Minimal gates, fast track |
| **Spike / Research** | Investigate technical approach | No gates, exploration only |
| **Custom Task** | Freeform development work | User-defined scope |

---

## PHASE 4: GO / NO-GO Decision

Based on all checks, determine flight status:

### GO Criteria (ALL must be true)
- [x] Configuration files present and valid
- [x] Build passes (no errors)
- [x] Git repository accessible
- [x] If Autonomous Mode: Docker containers running
- [x] At least one story available (for story/wave execution)

### NO-GO Criteria (ANY triggers NO-GO)
- [ ] Missing .claude/config.json
- [ ] Build failures
- [ ] Autonomous mode selected but Docker not running
- [ ] Critical safety files missing
- [ ] Git repository in detached HEAD state with uncommitted changes

---

## PHASE 5: Visual Output

### On GO - Display Green Light Banner

```
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║    ██████╗  ██████╗                                                            ║
║   ██╔════╝ ██╔═══██╗                                                           ║
║   ██║  ███╗██║   ██║                                                           ║
║   ██║   ██║██║   ██║                                                           ║
║   ╚██████╔╝╚██████╔╝                                                           ║
║    ╚═════╝  ╚═════╝                                                            ║
║                                                                                ║
║   ═══════════════════════════════════════════════════════════════════════════  ║
║                                                                                ║
║   STATUS: ALL SYSTEMS GREEN - CLEARED FOR EXECUTION                            ║
║                                                                                ║
║   Mode:     {AUTONOMOUS PIPELINE | SINGLE-THREAD}                              ║
║   Task:     {STORY | WAVE | HOTFIX | SPIKE | CUSTOM}                           ║
║   Project:  {project-name}                                                     ║
║   Branch:   {current-branch}                                                   ║
║                                                                                ║
║   Ready to proceed. Run your next command:                                     ║
║   • /execute-story story {ID}     - Execute specific story                     ║
║   • /launch-wave wave {N}         - Launch wave execution                      ║
║   • /tdd story {ID}               - Start TDD cycle                            ║
║   • /story-create {args}          - Create new story                           ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
```

### On NO-GO - Display Red Block Banner

```
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   ███╗   ██╗ ██████╗        ██████╗  ██████╗                                   ║
║   ████╗  ██║██╔═══██╗      ██╔════╝ ██╔═══██╗                                  ║
║   ██╔██╗ ██║██║   ██║█████╗██║  ███╗██║   ██║                                  ║
║   ██║╚██╗██║██║   ██║╚════╝██║   ██║██║   ██║                                  ║
║   ██║ ╚████║╚██████╔╝      ╚██████╔╝╚██████╔╝                                  ║
║   ╚═╝  ╚═══╝ ╚═════╝        ╚═════╝  ╚═════╝                                   ║
║                                                                                ║
║   ═══════════════════════════════════════════════════════════════════════════  ║
║                                                                                ║
║   STATUS: BLOCKED - CANNOT PROCEED                                             ║
║                                                                                ║
║   BLOCKING ISSUES:                                                             ║
║   ✗ {issue 1 description}                                                      ║
║   ✗ {issue 2 description}                                                      ║
║                                                                                ║
║   REQUIRED ACTIONS:                                                            ║
║   1. {fix command or instruction}                                              ║
║   2. {fix command or instruction}                                              ║
║                                                                                ║
║   After fixing, run /preflight again.                                          ║
║                                                                                ║
║   ⚠️  DO NOT proceed with any code changes until pre-flight passes.            ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
```

---

## Complete Check Report Format

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  WAVE PRE-FLIGHT CHECK                                                       │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  SYSTEM VALIDATION                                                           │
│  ─────────────────                                                           │
│  [✓] Configuration: .claude/config.json valid                                │
│  [○] Docker: wave-redis not running (optional for CLI mode)                  │
│  [✓] Safety Files: All present                                               │
│  [✓] Build: Passing                                                          │
│  [✓] Tests: 1864 unit + 20 E2E passing                                       │
│  [!] Git: 12 uncommitted files (non-critical)                                │
│  [✓] Branch: main (synced with origin)                                       │
│  [✓] Stories: 15 stories available in wave1-wave3                            │
│                                                                              │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  EXECUTION MODE                                                              │
│  ──────────────                                                              │
│  Selected: SINGLE-THREAD MODE                                                │
│  • Sequential execution in current conversation                              │
│  • Manual gate verification                                                  │
│  • No Docker required                                                        │
│                                                                              │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  DEVELOPMENT TYPE                                                            │
│  ────────────────                                                            │
│  Selected: EXECUTE STORY                                                     │
│  • Will implement story through Gate 0 → Gate 7                              │
│  • TDD approach with test-first development                                  │
│                                                                              │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  DECISION: GO ✓                                                              │
│                                                                              │
│  All critical systems operational.                                           │
│  Cleared for {selected development type}.                                    │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Signal File Output

On successful GO, create/update `.claude/signals/preflight-clearance.json`:

```json
{
  "status": "GO",
  "timestamp": "2026-01-31T16:00:00Z",
  "mode": "single-thread",
  "developmentType": "execute-story",
  "project": "footprint",
  "branch": "main",
  "checks": {
    "config": "pass",
    "docker": "optional",
    "safety": "pass",
    "build": "pass",
    "tests": "pass",
    "git": "warning"
  },
  "warnings": [
    "12 uncommitted files (non-critical)"
  ],
  "clearanceValidUntil": "2026-01-31T20:00:00Z"
}
```

---

## Interactive Flow Summary

```
┌─────────────────────────────────────────────────────────────────┐
│                    /PREFLIGHT FLOW                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. RUN SYSTEM CHECKS                                           │
│     ↓                                                           │
│  2. DISPLAY CHECK RESULTS                                       │
│     ↓                                                           │
│  3. PROMPT: SELECT EXECUTION MODE                               │
│     • Autonomous Pipeline (Docker, multi-agent)                 │
│     • Single-Thread (current conversation)                      │
│     ↓                                                           │
│  4. PROMPT: SELECT DEVELOPMENT TYPE                             │
│     • Execute Story                                             │
│     • Launch Wave                                               │
│     • Bug Fix / Hotfix                                          │
│     • Spike / Research                                          │
│     • Custom Task                                               │
│     ↓                                                           │
│  5. EVALUATE GO / NO-GO                                         │
│     ↓                                                           │
│  6. DISPLAY RESULT BANNER                                       │
│     • GO: Green banner + next steps                             │
│     • NO-GO: Red banner + required fixes                        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Usage Examples

```bash
# Standard pre-flight check
/preflight

# Quick alias
/pf

# After pre-flight GO, proceed with:
/execute-story story AUTH-BE-001
/launch-wave wave 1
/tdd story UI-FE-002
```

---

## Failure Recovery

If NO-GO is received:

1. **Missing config:** Run `/wave-init` to initialize Wave V2 framework
2. **Build failures:** Fix compilation/type errors, then re-run `/preflight`
3. **Docker not running (for Autonomous mode):**
   - Start Docker: `docker-compose up -d`
   - Or switch to Single-Thread mode
4. **Missing stories:** Run `/story-create` or check `stories/` directory
5. **Git issues:** Commit or stash changes, ensure clean state

---

## Integration

- **Creates:** `.claude/signals/preflight-clearance.json`
- **Reads:** `.claude/config.json`, `planning/schemas/`, `stories/`
- **Validates:** Build system, test suite, git status
- **Blocks:** All execution commands if NO-GO status
