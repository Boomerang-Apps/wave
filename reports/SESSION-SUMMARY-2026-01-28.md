# WAVE E2E Pipeline Session Summary
**Date:** 2026-01-28
**Status:** Stopped for continuation tomorrow

---

## Session Objectives
1. Fix Slack notifications to show actual token cost and tokens used (not budget)
2. Start and monitor E2E pipeline execution
3. Verify agents picking up assignments and executing work

---

## Issues Identified

### P0 - Critical Issues

#### 1. Docker Images Use Old Entrypoint
**Problem:** Container entrypoint.sh is baked into the Docker image from an earlier build. My fixes to `/Volumes/SSD-01/Projects/WAVE/core/docker/entrypoint.sh` are NOT reflected in running containers.

**Evidence:**
```
Container entrypoint: /wave/entrypoint.sh (modified Jan 28 05:39)
Host file: /Volumes/SSD-01/Projects/WAVE/core/docker/entrypoint.sh (modified today with token tracking)
```

**Fix Required:** Rebuild Docker images to include updated entrypoint.sh

#### 2. Claude CLI Hanging in Containers
**Problem:** Agents show "Executing Claude..." but never complete. Process runs for 2+ hours without output.

**Evidence:**
```
docker top wave-fe-dev-1:
- /wave/entrypoint.sh running since 17:55
- claude process running since 18:51 (2+ hours)
- Worktree directory empty (no files created)
```

**Possible Causes:**
- Claude CLI waiting for interactive input
- API connectivity issues
- Prompt format issues
- Missing required flags

#### 3. SLACK_WEBHOOK_URL Not Set
**Problem:** Notifications disabled because env var not passed to dispatcher/agents.

**Evidence:**
```
[WARN] SLACK_WEBHOOK_URL not set - notifications disabled
```

**Fix Required:** Add SLACK_WEBHOOK_URL to .env or export in shell before running

#### 4. Wave Dispatch Not Triggering Consistently
**Problem:** Orchestrator showing "Wave 1: PENDING" in loop without triggering dispatch.

**Evidence:** Background task log shows 60+ status displays with Wave 1 staying PENDING.

**Possible Cause:** Path resolution issue when running with relative path (`.`)

---

### P1 - Fixed Issues (Code Changes Made)

#### 1. Bash 3.x Compatibility in work-dispatcher.sh
**Problem:** `declare -A` (associative arrays) not supported in macOS default bash 3.x

**Fix Applied:**
```bash
# Changed from:
declare -A AGENT_MODELS
AGENT_MODELS["pm"]="claude-opus-4-5-20251101"

# To:
get_model_for_agent() {
    case "$agent" in
        pm|cto) echo "claude-opus-4-5-20251101" ;;
        ...
    esac
}
```

#### 2. Project Name Showing as "project" Instead of "footprint"
**Problem:** merge-watcher used `$(basename "$PROJECT_ROOT")` which returns "project" in container.

**Fix Applied:** Now reads from P.json:
```bash
if [ -f ".claude/P.json" ] && command -v jq &>/dev/null; then
    SLACK_PROJECT_NAME=$(jq -r '.meta.project_name // "project"' ".claude/P.json")
fi
```

#### 3. Duplicate Wave Start Notifications (Spam)
**Problem:** merge-watcher sends notification on every restart.

**Fix Applied:** Added marker file guard:
```bash
WAVE_START_MARKER=".claude/signal-wave${WAVE}-slack-notified.marker"
if [ ! -f "$WAVE_START_MARKER" ]; then
    slack_wave_start ...
    touch "$WAVE_START_MARKER"
fi
```

#### 4. "Budget" Changed to "Cost" in Notifications
**Problem:** User wanted "Cost" not "Budget" in wave start notification.

**Fix Applied:** Changed in slack-notify.sh:
```bash
# Changed from:
{"type": "mrkdwn", "text": "*Budget:*\n\$$budget"}

# To:
{"type": "mrkdwn", "text": "*Cost:*\n\$$cost"}
```

#### 5. Token/Cost Tracking in Entrypoint (HOST FILE ONLY)
**Problem:** Story completion notifications not showing actual tokens/cost.

**Fix Applied:** Added to entrypoint.sh:
- Extract tokens from Claude JSON output
- Calculate cost based on model pricing
- Call slack_story_complete with actual values
- Include token data in completion signal

**NOTE:** This fix is in the HOST file, not in Docker containers!

---

## Files Modified This Session

| File | Change |
|------|--------|
| `/Volumes/SSD-01/Projects/WAVE/core/scripts/work-dispatcher.sh` | Bash 3.x compatible model lookup |
| `/Volumes/SSD-01/Projects/WAVE/core/scripts/merge-watcher-v12.sh` | Project name from P.json, duplicate notification guard, Cost instead of Budget |
| `/Volumes/SSD-01/Projects/WAVE/core/scripts/lib/slack-notify.sh` | "Budget" → "Cost" label |
| `/Volumes/SSD-01/Projects/WAVE/core/docker/entrypoint.sh` | Token extraction, cost calculation, Slack notifications |

---

## Key Takeaways

### Architecture Understanding
1. **Two entrypoint.sh files exist:**
   - `/Volumes/SSD-01/Projects/WAVE/core/docker/entrypoint.sh` - Host file I edited
   - `/wave/entrypoint.sh` in containers - Baked into Docker image

2. **Signal flow:**
   ```
   wave-start signal → work-dispatcher.sh → assignment signals → agent containers → Claude CLI
   ```

3. **Notification flow:**
   - Wave start: merge-watcher → slack_wave_start
   - Story start: work-dispatcher → slack_story_start
   - Story complete: entrypoint.sh → slack_story_complete (NOT WORKING - old image)

### What Worked
- Pre-flight validation (81/104 passed)
- Work dispatcher creating assignment signals
- Containers detecting and picking up assignments
- Duplicate notification prevention (marker files)

### What Didn't Work
- Claude CLI execution in containers (hanging)
- Token/cost tracking (old entrypoint in image)
- Slack notifications from agents (WEBHOOK not passed)

---

## Tomorrow's Action Items

### Priority 1: Fix Docker Images
```bash
# Rebuild images with updated entrypoint
cd /Volumes/SSD-01/Projects/WAVE
docker compose build --no-cache
docker compose up -d
```

### Priority 2: Debug Claude CLI Hanging
- Check Claude CLI flags being used
- Test manual execution in container
- Verify API key and connectivity
- Check prompt format

### Priority 3: Environment Variables
- Add SLACK_WEBHOOK_URL to project .env
- Ensure all required vars passed to containers

### Priority 4: Verify E2E Flow
1. Clear old signals and markers
2. Start fresh wave
3. Monitor agent execution
4. Verify Slack notifications with token/cost

---

## Container Status (When Stopped)
```
wave-redis      Up 6 hours (healthy)  - Infrastructure, leave running
dozzle          Up 10 days            - Log viewer, leave running
All agents      Stopped
```

---

## Commands for Tomorrow

```bash
# Clear old signals and markers
cd /Volumes/SSD-01/Projects/Footprint/footprint
rm -f .claude/signal-*-assignment.json
rm -f .claude/signal-*-slack-notified.marker

# Set Slack webhook
export SLACK_WEBHOOK_URL="your-webhook-url"

# Rebuild and start containers
cd /Volumes/SSD-01/Projects/WAVE
docker compose build
docker compose up -d

# Run pre-flight
/Volumes/SSD-01/Projects/WAVE/core/scripts/pre-flight-validator.sh --wave 1 --project /Volumes/SSD-01/Projects/Footprint/footprint

# Start orchestrator (use FULL path)
/Volumes/SSD-01/Projects/WAVE/core/scripts/wave-orchestrator.sh --project /Volumes/SSD-01/Projects/Footprint/footprint

# Monitor agents
docker logs -f wave-fe-dev-1
```

---

*Session ended: 2026-01-28 ~21:00 IST*
