#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# WAVE LAUNCH SCRIPT
# ═══════════════════════════════════════════════════════════════════════════════
# Complete launch sequence with human approval gate
# Validates both WAVE (controller) and target project (e.g., Footprint)
# Usage: ./wave-launch.sh <wave_number> [project_root]
# ═══════════════════════════════════════════════════════════════════════════════

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
BOLD='\033[1m'
NC='\033[0m'

# ─────────────────────────────────────────────────────────────────────────────
# ARGUMENTS
# ─────────────────────────────────────────────────────────────────────────────

if [ -z "${1:-}" ]; then
    echo -e "${RED}Error: Wave number required${NC}"
    echo "Usage: $0 <wave_number> [project_root]"
    echo "Example: $0 1 /Volumes/SSD-01/Projects/Footprint/footprint"
    exit 1
fi

WAVE=$1
PROJECT_ROOT="${2:-$PROJECT_PATH}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WAVE_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"

# Validate PROJECT_ROOT exists
if [ -z "$PROJECT_ROOT" ] || [ ! -d "$PROJECT_ROOT" ]; then
    echo -e "${RED}Error: Project root not found: $PROJECT_ROOT${NC}"
    echo "Set PROJECT_PATH environment variable or pass as second argument"
    exit 1
fi

# Load WAVE environment
if [ -f "$WAVE_ROOT/.env" ]; then
    source "$WAVE_ROOT/.env"
fi

# ─────────────────────────────────────────────────────────────────────────────
# HEADER
# ─────────────────────────────────────────────────────────────────────────────

clear
echo ""
echo -e "${MAGENTA}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${MAGENTA}║                                                               ║${NC}"
echo -e "${MAGENTA}║              ${BOLD}WAVE LAUNCH SEQUENCE${NC}${MAGENTA}                            ║${NC}"
echo -e "${MAGENTA}║                     Version 2.0                               ║${NC}"
echo -e "${MAGENTA}║                                                               ║${NC}"
echo -e "${MAGENTA}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  ${CYAN}Wave:${NC}        $WAVE"
echo -e "  ${CYAN}Controller:${NC}  $WAVE_ROOT"
echo -e "  ${CYAN}Target:${NC}      $PROJECT_ROOT"
echo -e "  ${CYAN}Project:${NC}     $(basename "$PROJECT_ROOT")"
echo -e "  ${CYAN}Date:${NC}        $(date '+%Y-%m-%d %H:%M:%S')"
echo ""

# ─────────────────────────────────────────────────────────────────────────────
# STEP 0: VALIDATE TARGET PROJECT (Footprint) READINESS
# ─────────────────────────────────────────────────────────────────────────────

echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE} STEP 0: TARGET PROJECT VALIDATION${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

TARGET_PASSED=0
TARGET_FAILED=0

check_target() {
    local name=$1
    local condition=$2
    local details=${3:-""}

    if [ "$condition" = "true" ]; then
        echo -e "  ${GREEN}✓${NC} $name ${details:+- $details}"
        ((TARGET_PASSED++))
    else
        echo -e "  ${RED}✗${NC} $name ${details:+- $details}"
        ((TARGET_FAILED++))
    fi
}

echo -e "${YELLOW}Checking target project: $(basename "$PROJECT_ROOT")${NC}"
echo ""

# Check critical Footprint files
check_target "CLAUDE.md exists" "$([ -f "$PROJECT_ROOT/CLAUDE.md" ] && echo true || echo false)"
check_target ".claude directory" "$([ -d "$PROJECT_ROOT/.claude" ] && echo true || echo false)"
check_target "PREFLIGHT.lock" "$([ -f "$PROJECT_ROOT/.claude/PREFLIGHT.lock" ] && echo true || echo false)"
check_target "P.md (P Variable)" "$([ -f "$PROJECT_ROOT/.claude/P.md" ] && echo true || echo false)"
check_target "Safety module" "$([ -f "$PROJECT_ROOT/src/safety/__init__.py" ] && echo true || echo false)"
check_target "Constitutional safety" "$([ -f "$PROJECT_ROOT/src/safety/constitutional.py" ] && echo true || echo false)"
check_target "Emergency stop" "$([ -f "$PROJECT_ROOT/src/safety/emergency_stop.py" ] && echo true || echo false)"
check_target "Budget enforcement" "$([ -f "$PROJECT_ROOT/src/safety/budget.py" ] && echo true || echo false)"
check_target "package.json" "$([ -f "$PROJECT_ROOT/package.json" ] && echo true || echo false)"
check_target "tsconfig.json" "$([ -f "$PROJECT_ROOT/tsconfig.json" ] && echo true || echo false)"

# Check .env.local for Footprint
if [ -f "$PROJECT_ROOT/.env.local" ]; then
    check_target ".env.local exists" "true"

    # Check critical env vars in target
    ENV_CONTENT=$(cat "$PROJECT_ROOT/.env.local")
    check_target "SUPABASE_URL set" "$(echo "$ENV_CONTENT" | grep -q "NEXT_PUBLIC_SUPABASE_URL=" && echo true || echo false)"
    check_target "SUPABASE_ANON_KEY set" "$(echo "$ENV_CONTENT" | grep -q "NEXT_PUBLIC_SUPABASE_ANON_KEY=" && echo true || echo false)"
    check_target "SENTRY_DSN set" "$(echo "$ENV_CONTENT" | grep -q "SENTRY_DSN=" && echo true || echo false)"
else
    check_target ".env.local exists" "false" "File not found"
fi

echo ""
echo -e "  ${CYAN}Target validation: $TARGET_PASSED passed, $TARGET_FAILED failed${NC}"

if [ $TARGET_FAILED -gt 0 ]; then
    echo ""
    echo -e "${RED}✗ Target project validation FAILED${NC}"
    echo -e "${RED}  Fix issues above before launching${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}✓ Target project validation PASSED${NC}"
echo ""
read -p "Press ENTER to continue to WAVE controller validation..."

# ─────────────────────────────────────────────────────────────────────────────
# STEP 1: WAVE CONTROLLER VALIDATION
# ─────────────────────────────────────────────────────────────────────────────

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE} STEP 1: WAVE CONTROLLER VALIDATION${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

WAVE_PASSED=0
WAVE_FAILED=0

check_wave() {
    local name=$1
    local condition=$2
    local details=${3:-""}

    if [ "$condition" = "true" ]; then
        echo -e "  ${GREEN}✓${NC} $name ${details:+- $details}"
        ((WAVE_PASSED++))
    else
        echo -e "  ${RED}✗${NC} $name ${details:+- $details}"
        ((WAVE_FAILED++))
    fi
}

echo -e "${YELLOW}Checking WAVE controller: $WAVE_ROOT${NC}"
echo ""

# Check Docker
check_wave "Docker daemon" "$(docker info > /dev/null 2>&1 && echo true || echo false)"
check_wave "wave-redis container" "$(docker ps --format '{{.Names}}' 2>/dev/null | grep -q wave-redis && echo true || echo false)"
check_wave "wave-dozzle container" "$(docker ps --format '{{.Names}}' 2>/dev/null | grep -qE 'wave-dozzle|dozzle' && echo true || echo false)"

# Check Redis
REDIS_PING=$(docker exec wave-redis redis-cli ping 2>/dev/null || echo "")
check_wave "Redis responding" "$([ "$REDIS_PING" = "PONG" ] && echo true || echo false)" "$REDIS_PING"

# Check WAVE .env
if [ -f "$WAVE_ROOT/.env" ]; then
    check_wave "WAVE .env exists" "true"
    WAVE_ENV=$(cat "$WAVE_ROOT/.env")
    check_wave "ANTHROPIC_API_KEY set" "$(echo "$WAVE_ENV" | grep -q "ANTHROPIC_API_KEY=" && echo true || echo false)"
    check_wave "SLACK_WEBHOOK_URL set" "$(echo "$WAVE_ENV" | grep -q "SLACK_WEBHOOK_URL=" && echo true || echo false)"
    check_wave "SUPABASE_URL set" "$(echo "$WAVE_ENV" | grep -q "SUPABASE_URL=" && echo true || echo false)"
else
    check_wave "WAVE .env exists" "false" "File not found"
fi

# Check Docker images
echo ""
echo -e "${YELLOW}Checking Docker images:${NC}"
DOCKER_IMAGES=$(docker images --format '{{.Repository}}:{{.Tag}}' 2>/dev/null || echo "")
for img in wave-orchestrator wave-cto wave-pm wave-fe-dev wave-be-dev wave-qa; do
    check_wave "Image: $img" "$(echo "$DOCKER_IMAGES" | grep -q "$img" && echo true || echo false)"
done

echo ""
echo -e "  ${CYAN}WAVE validation: $WAVE_PASSED passed, $WAVE_FAILED failed${NC}"

if [ $WAVE_FAILED -gt 0 ]; then
    echo ""
    echo -e "${RED}✗ WAVE controller validation FAILED${NC}"
    echo -e "${RED}  Fix issues above before launching${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}✓ WAVE controller validation PASSED${NC}"
echo ""
read -p "Press ENTER to continue to launch summary..."

# ─────────────────────────────────────────────────────────────────────────────
# STEP 2: LAUNCH SUMMARY
# ─────────────────────────────────────────────────────────────────────────────

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE} STEP 2: LAUNCH SUMMARY${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

# Get budget
WAVE_BUDGET="${WAVE_BUDGET:-2.00}"
STORY_BUDGET="${STORY_BUDGET:-0.50}"

echo -e "${CYAN}┌─────────────────────────────────────────────────────────────┐${NC}"
echo -e "${CYAN}│ WAVE $WAVE LAUNCH CONFIGURATION                              ${NC}"
echo -e "${CYAN}├─────────────────────────────────────────────────────────────┤${NC}"
echo -e "${CYAN}│${NC} Controller:   WAVE at $WAVE_ROOT                              ${CYAN}│${NC}"
echo -e "${CYAN}│${NC} Target:       $(basename "$PROJECT_ROOT")                                    ${CYAN}│${NC}"
echo -e "${CYAN}│${NC} Wave Budget:  \$$WAVE_BUDGET                                      ${CYAN}│${NC}"
echo -e "${CYAN}│${NC} Story Budget: \$$STORY_BUDGET per story                          ${CYAN}│${NC}"
echo -e "${CYAN}├─────────────────────────────────────────────────────────────┤${NC}"
echo -e "${CYAN}│ VALIDATION SUMMARY                                          │${NC}"
echo -e "${CYAN}├─────────────────────────────────────────────────────────────┤${NC}"
echo -e "${CYAN}│${NC}  Target Checks:     ${GREEN}$TARGET_PASSED PASSED${NC}                         ${CYAN}│${NC}"
echo -e "${CYAN}│${NC}  Controller Checks: ${GREEN}$WAVE_PASSED PASSED${NC}                          ${CYAN}│${NC}"
echo -e "${CYAN}└─────────────────────────────────────────────────────────────┘${NC}"

# ─────────────────────────────────────────────────────────────────────────────
# STEP 3: TERMINAL SETUP
# ─────────────────────────────────────────────────────────────────────────────

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE} STEP 3: TERMINAL SETUP${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

echo -e "${YELLOW}You need 3 terminals configured as follows:${NC}"
echo ""
echo -e "${BOLD}Terminal 1 (CTO Master):${NC}"
echo "  Purpose: Monitor and control"
echo "  Status:  THIS TERMINAL"
echo ""
echo -e "${BOLD}Terminal 2 (Merge Watcher):${NC}"
echo "  Purpose: Orchestrate merges and notifications"
echo "  Command:"
echo -e "  ${GREEN}cd \"$PROJECT_ROOT\" && WAVE=$WAVE ./scripts/merge-watcher.sh${NC}"
echo ""
echo -e "${BOLD}Terminal 3 (Docker Agents):${NC}"
echo "  Purpose: Run development agents"
echo "  Command:"
echo -e "  ${GREEN}cd \"$WAVE_ROOT\" && docker compose up wave${WAVE}-fe-dev wave${WAVE}-be-dev wave${WAVE}-qa${NC}"
echo ""

# ─────────────────────────────────────────────────────────────────────────────
# STEP 4: HUMAN APPROVAL
# ─────────────────────────────────────────────────────────────────────────────

echo ""
echo -e "${MAGENTA}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${MAGENTA} STEP 4: HUMAN APPROVAL REQUIRED${NC}"
echo -e "${MAGENTA}═══════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${YELLOW}Review the above configuration carefully.${NC}"
echo ""
echo -e "${BOLD}Checklist before approval:${NC}"
echo "  [ ] Terminal 2 ready for merge-watcher"
echo "  [ ] Terminal 3 ready for docker agents"
echo "  [ ] Slack channel open for notifications"
echo "  [ ] Dozzle ready at http://localhost:${DOZZLE_PORT:-9080}"
echo "  [ ] Budget approved: \$$WAVE_BUDGET for Wave $WAVE"
echo ""
echo -e "${RED}Type 'APPROVE' to launch Wave $WAVE, or anything else to abort:${NC}"
read -p "> " APPROVAL

if [ "$APPROVAL" != "APPROVE" ]; then
    echo ""
    echo -e "${YELLOW}Launch aborted by user.${NC}"
    exit 0
fi

# ─────────────────────────────────────────────────────────────────────────────
# STEP 5: SEND SLACK NOTIFICATION
# ─────────────────────────────────────────────────────────────────────────────

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE} STEP 5: SENDING LAUNCH NOTIFICATION${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

if [ -n "${SLACK_WEBHOOK_URL:-}" ]; then
    SLACK_PAYLOAD=$(cat <<EOF
{
  "blocks": [
    {
      "type": "header",
      "text": {"type": "plain_text", "text": "Wave $WAVE Launching", "emoji": true}
    },
    {
      "type": "section",
      "fields": [
        {"type": "mrkdwn", "text": "*Project:*\n$(basename "$PROJECT_ROOT")"},
        {"type": "mrkdwn", "text": "*Budget:*\n\$$WAVE_BUDGET"}
      ]
    },
    {
      "type": "section",
      "fields": [
        {"type": "mrkdwn", "text": "*Controller:*\nWAVE"},
        {"type": "mrkdwn", "text": "*Status:*\n:rocket: APPROVED"}
      ]
    },
    {
      "type": "context",
      "elements": [
        {"type": "mrkdwn", "text": ":white_check_mark: Human approved | Target: $TARGET_PASSED checks | Controller: $WAVE_PASSED checks | $(date '+%Y-%m-%d %H:%M')"}
      ]
    }
  ]
}
EOF
)

    SLACK_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" \
        -X POST "$SLACK_WEBHOOK_URL" \
        -H "Content-Type: application/json" \
        -d "$SLACK_PAYLOAD" 2>/dev/null || echo "000")

    if [ "$SLACK_RESPONSE" = "200" ]; then
        echo -e "${GREEN}✓ Slack notification sent${NC}"
    else
        echo -e "${YELLOW}⚠ Slack notification failed (HTTP $SLACK_RESPONSE)${NC}"
    fi
else
    echo -e "${YELLOW}⚠ SLACK_WEBHOOK_URL not set - skipping notification${NC}"
fi

# ─────────────────────────────────────────────────────────────────────────────
# STEP 6: CREATE START SIGNAL
# ─────────────────────────────────────────────────────────────────────────────

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE} STEP 6: CREATING START SIGNAL${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

mkdir -p "$PROJECT_ROOT/.claude"
SIGNAL_FILE="$PROJECT_ROOT/.claude/signal-wave${WAVE}-start.json"
cat > "$SIGNAL_FILE" <<EOF
{
  "signal": "wave-start",
  "wave": $WAVE,
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "approved_by": "human",
  "budget": $WAVE_BUDGET,
  "controller": "$WAVE_ROOT",
  "target": "$PROJECT_ROOT",
  "validation": {
    "target_passed": $TARGET_PASSED,
    "controller_passed": $WAVE_PASSED
  }
}
EOF

echo -e "${GREEN}✓ Start signal created: $SIGNAL_FILE${NC}"

# ─────────────────────────────────────────────────────────────────────────────
# LAUNCH COMPLETE
# ─────────────────────────────────────────────────────────────────────────────

echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                                                               ║${NC}"
echo -e "${GREEN}║              ${BOLD}WAVE $WAVE LAUNCH COMPLETE${NC}${GREEN}                          ║${NC}"
echo -e "${GREEN}║                                                               ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${CYAN}Next steps:${NC}"
echo ""
echo "1. In Terminal 2, run:"
echo -e "   ${GREEN}cd \"$PROJECT_ROOT\" && WAVE=$WAVE ./scripts/merge-watcher.sh${NC}"
echo ""
echo "2. In Terminal 3, run:"
echo -e "   ${GREEN}cd \"$WAVE_ROOT\" && docker compose up orchestrator${NC}"
echo ""
echo "3. Monitor:"
echo "   - Dozzle: http://localhost:${DOZZLE_PORT:-9080}"
echo "   - Slack: Watch for notifications"
echo ""
echo -e "${YELLOW}Wave $WAVE is ready. Start the agents when ready.${NC}"
echo ""
