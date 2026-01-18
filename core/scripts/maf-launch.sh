#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# MAF WAVE LAUNCH SCRIPT
# ═══════════════════════════════════════════════════════════════════════════════
# Complete launch sequence with human approval gate
# Usage: ./maf-launch.sh <wave_number> [project_root]
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
    echo "Example: $0 4 /path/to/project"
    exit 1
fi

WAVE=$1
PROJECT_ROOT="${2:-.}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

cd "$PROJECT_ROOT"

# Load environment
if [ -f ".env" ]; then
    source .env
fi

# ─────────────────────────────────────────────────────────────────────────────
# HEADER
# ─────────────────────────────────────────────────────────────────────────────

clear
echo ""
echo -e "${MAGENTA}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${MAGENTA}║                                                               ║${NC}"
echo -e "${MAGENTA}║              ${BOLD}MAF WAVE LAUNCH SEQUENCE${NC}${MAGENTA}                        ║${NC}"
echo -e "${MAGENTA}║                     Version 11.2                              ║${NC}"
echo -e "${MAGENTA}║                                                               ║${NC}"
echo -e "${MAGENTA}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  ${CYAN}Wave:${NC}     $WAVE"
echo -e "  ${CYAN}Project:${NC}  $(basename "$PROJECT_ROOT")"
echo -e "  ${CYAN}Date:${NC}     $(date '+%Y-%m-%d %H:%M:%S')"
echo ""

# ─────────────────────────────────────────────────────────────────────────────
# STEP 1: INFRASTRUCTURE VALIDATION
# ─────────────────────────────────────────────────────────────────────────────

echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE} STEP 1: INFRASTRUCTURE VALIDATION${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

# Check for infrastructure validator
INFRA_VALIDATOR="${SCRIPT_DIR}/validate-infrastructure.sh"
if [ ! -f "$INFRA_VALIDATOR" ]; then
    INFRA_VALIDATOR="$PROJECT_ROOT/scripts/validate-infrastructure.sh"
fi

if [ -f "$INFRA_VALIDATOR" ]; then
    echo -e "${YELLOW}Running infrastructure validation...${NC}"
    echo ""

    if bash "$INFRA_VALIDATOR" "$PROJECT_ROOT"; then
        echo ""
        echo -e "${GREEN}✓ Infrastructure validation PASSED${NC}"
    else
        echo ""
        echo -e "${RED}✗ Infrastructure validation FAILED${NC}"
        echo -e "${RED}  Fix issues above before launching${NC}"
        exit 1
    fi
else
    echo -e "${YELLOW}Warning: Infrastructure validator not found${NC}"
    echo -e "${YELLOW}Proceeding without infrastructure validation...${NC}"
fi

echo ""
read -p "Press ENTER to continue to wave pre-flight..."

# ─────────────────────────────────────────────────────────────────────────────
# STEP 2: WAVE PRE-FLIGHT
# ─────────────────────────────────────────────────────────────────────────────

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE} STEP 2: WAVE $WAVE PRE-FLIGHT${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

# Check for wave preflight
WAVE_PREFLIGHT="${SCRIPT_DIR}/wave-preflight.sh"
if [ ! -f "$WAVE_PREFLIGHT" ]; then
    WAVE_PREFLIGHT="$PROJECT_ROOT/scripts/wave-preflight.sh"
fi

if [ -f "$WAVE_PREFLIGHT" ]; then
    echo -e "${YELLOW}Running wave pre-flight for Wave $WAVE...${NC}"
    echo ""

    if bash "$WAVE_PREFLIGHT" "$WAVE" "$PROJECT_ROOT"; then
        echo ""
        echo -e "${GREEN}✓ Wave $WAVE pre-flight PASSED${NC}"
    else
        echo ""
        echo -e "${RED}✗ Wave $WAVE pre-flight FAILED${NC}"
        echo -e "${RED}  Fix issues above before launching${NC}"
        exit 1
    fi
else
    echo -e "${YELLOW}Warning: Wave pre-flight not found${NC}"
    echo -e "${YELLOW}Proceeding without wave pre-flight...${NC}"
fi

echo ""
read -p "Press ENTER to continue to launch summary..."

# ─────────────────────────────────────────────────────────────────────────────
# STEP 3: LAUNCH SUMMARY
# ─────────────────────────────────────────────────────────────────────────────

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE} STEP 3: LAUNCH SUMMARY${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

# Count stories
STORIES_DIR="stories/wave${WAVE}"
STORY_COUNT=$(find "$STORIES_DIR" -name "*.json" 2>/dev/null | wc -l | tr -d ' ')

# Get budget
WAVE_BUDGET="${WAVE_BUDGET:-2.00}"
STORY_BUDGET="${STORY_BUDGET:-0.50}"

echo -e "${CYAN}┌─────────────────────────────────────────────────────────────┐${NC}"
echo -e "${CYAN}│ WAVE $WAVE LAUNCH CONFIGURATION                              ${NC}"
echo -e "${CYAN}├─────────────────────────────────────────────────────────────┤${NC}"
echo -e "${CYAN}│${NC} Stories:        $STORY_COUNT                                        ${CYAN}│${NC}"
echo -e "${CYAN}│${NC} Wave Budget:    \$$WAVE_BUDGET                                      ${CYAN}│${NC}"
echo -e "${CYAN}│${NC} Story Budget:   \$$STORY_BUDGET per story                          ${CYAN}│${NC}"
echo -e "${CYAN}├─────────────────────────────────────────────────────────────┤${NC}"
echo -e "${CYAN}│ AGENTS                                                      │${NC}"
echo -e "${CYAN}├─────────────────────────────────────────────────────────────┤${NC}"
echo -e "${CYAN}│${NC} • wave${WAVE}-fe-dev  → Frontend Development               ${CYAN}│${NC}"
echo -e "${CYAN}│${NC} • wave${WAVE}-be-dev  → Backend Development                ${CYAN}│${NC}"
echo -e "${CYAN}│${NC} • wave${WAVE}-qa      → Quality Assurance                  ${CYAN}│${NC}"
echo -e "${CYAN}├─────────────────────────────────────────────────────────────┤${NC}"
echo -e "${CYAN}│ STORIES                                                     │${NC}"
echo -e "${CYAN}├─────────────────────────────────────────────────────────────┤${NC}"

# List stories
for story in $(find "$STORIES_DIR" -name "*.json" 2>/dev/null); do
    STORY_ID=$(jq -r '.id // "?"' "$story" 2>/dev/null)
    STORY_TITLE=$(jq -r '.title // "?"' "$story" 2>/dev/null | cut -c1-35)
    echo -e "${CYAN}│${NC} • $STORY_ID: $STORY_TITLE ${CYAN}│${NC}"
done

echo -e "${CYAN}└─────────────────────────────────────────────────────────────┘${NC}"

# ─────────────────────────────────────────────────────────────────────────────
# STEP 4: TERMINAL SETUP
# ─────────────────────────────────────────────────────────────────────────────

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE} STEP 4: TERMINAL SETUP${NC}"
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
echo -e "  ${GREEN}cd \"$PROJECT_ROOT\" && WAVE=$WAVE ./scripts/merge-watcher-v11.2.sh${NC}"
echo ""
echo -e "${BOLD}Terminal 3 (Docker Agents):${NC}"
echo "  Purpose: Run development agents"
echo "  Command:"
echo -e "  ${GREEN}cd \"$PROJECT_ROOT\" && docker compose -f docker-compose-v11.2.yml up wave${WAVE}-fe-dev wave${WAVE}-be-dev wave${WAVE}-qa${NC}"
echo ""

# ─────────────────────────────────────────────────────────────────────────────
# STEP 5: HUMAN APPROVAL
# ─────────────────────────────────────────────────────────────────────────────

echo ""
echo -e "${MAGENTA}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${MAGENTA} STEP 5: HUMAN APPROVAL REQUIRED${NC}"
echo -e "${MAGENTA}═══════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${YELLOW}Review the above configuration carefully.${NC}"
echo ""
echo -e "${BOLD}Checklist before approval:${NC}"
echo "  [ ] Terminal 2 ready for merge-watcher"
echo "  [ ] Terminal 3 ready for docker agents"
echo "  [ ] Slack channel open for notifications"
echo "  [ ] Dozzle ready at http://localhost:8080"
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
# STEP 6: SEND SLACK NOTIFICATION
# ─────────────────────────────────────────────────────────────────────────────

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE} STEP 6: SENDING LAUNCH NOTIFICATION${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

if [ -n "${SLACK_WEBHOOK_URL:-}" ]; then
    # Get story list for Slack
    STORY_LIST=""
    for story in $(find "$STORIES_DIR" -name "*.json" 2>/dev/null); do
        STORY_ID=$(jq -r '.id // "?"' "$story" 2>/dev/null)
        STORY_TITLE=$(jq -r '.title // "?"' "$story" 2>/dev/null)
        STORY_LIST="${STORY_LIST}• \`${STORY_ID}\`: ${STORY_TITLE}\n"
    done

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
        {"type": "mrkdwn", "text": "*Stories:*\n$STORY_COUNT"},
        {"type": "mrkdwn", "text": "*Status:*\n:rocket: APPROVED"}
      ]
    },
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": "*Story List:*\n${STORY_LIST}"
      }
    },
    {
      "type": "context",
      "elements": [
        {"type": "mrkdwn", "text": ":white_check_mark: Human approved | $(date '+%Y-%m-%d %H:%M')"}
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
# STEP 7: CREATE START SIGNAL
# ─────────────────────────────────────────────────────────────────────────────

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE} STEP 7: CREATING START SIGNAL${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

SIGNAL_FILE=".claude/signal-wave${WAVE}-start.json"
cat > "$SIGNAL_FILE" <<EOF
{
  "signal": "wave-start",
  "wave": $WAVE,
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "approved_by": "human",
  "budget": $WAVE_BUDGET,
  "story_count": $STORY_COUNT
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
echo -e "   ${GREEN}cd \"$PROJECT_ROOT\" && WAVE=$WAVE ./scripts/merge-watcher-v11.2.sh${NC}"
echo ""
echo "2. In Terminal 3, run:"
echo -e "   ${GREEN}cd \"$PROJECT_ROOT\" && docker compose -f docker-compose-v11.2.yml up wave${WAVE}-fe-dev wave${WAVE}-be-dev wave${WAVE}-qa${NC}"
echo ""
echo "3. Monitor:"
echo "   - Dozzle: http://localhost:8080"
echo "   - Slack: Watch for notifications"
echo ""
echo -e "${YELLOW}Wave $WAVE is ready. Start the agents when ready.${NC}"
echo ""
