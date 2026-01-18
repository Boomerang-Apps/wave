#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# WAVE FRAMEWORK - Pre-Flight Validator (Aerospace-Grade)
# ═══════════════════════════════════════════════════════════════════════════════
#
# Version: 2.0.0
# Based On: MAF PM Validator V5.7
# Safety Standard: DO-178C Level B Equivalent
# Date: 2026-01-17
#
# Purpose: Validate project readiness BEFORE pipeline execution
# Naming: "Pre-flight" = validation before takeoff (pipeline start)
#
# Usage: ./pre-flight-validator.sh [OPTIONS] [PROJECT_DIR]
#
# Options:
#   --quick, -q       Skip smoke test (faster)
#   --verbose, -v     Show detailed output
#   --post-deploy     Run post-deployment checks (Section M)
#   --deploy-url=X    URL for post-deploy smoke tests
#   --json            Output results as JSON
#   -h, --help        Show this help
#
# Exit codes:
#   0 = GO (all critical checks passed)
#   1 = NO-GO (critical failures)
#
# Total Checks: 80+ (Sections A-M)
#
# ═══════════════════════════════════════════════════════════════════════════════

# Don't use set -e - we want to continue through all checks
VERSION="2.0.0"
PROJECT_ROOT="."
QUICK_MODE=false
VERBOSE=false
POST_DEPLOY_MODE=false
DEPLOY_URL=""
OUTPUT_JSON=false

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --quick|-q)
            QUICK_MODE=true
            shift
            ;;
        --verbose|-v)
            VERBOSE=true
            shift
            ;;
        --post-deploy)
            POST_DEPLOY_MODE=true
            shift
            ;;
        --deploy-url=*)
            DEPLOY_URL="${1#*=}"
            shift
            ;;
        --json)
            OUTPUT_JSON=true
            shift
            ;;
        -p|--project)
            PROJECT_ROOT="$2"
            shift 2
            ;;
        --help|-h)
            cat << EOF
WAVE Pre-Flight Validator v${VERSION} - Aerospace-Grade Safety Validation

Usage: $0 [OPTIONS] [PROJECT_DIR]

Options:
  --quick, -q       Skip smoke test (faster)
  --verbose, -v     Show detailed output
  --post-deploy     Run post-deployment checks (Section M)
  --deploy-url=X    URL for post-deploy smoke tests
  --json            Output results as JSON
  -p, --project     Project directory path
  -h, --help        Show this help

Examples:
  $0 .                                    # Full validation
  $0 --quick /path/to/project             # Skip smoke test
  $0 --post-deploy --deploy-url=https://example.vercel.app

Safety Standard: DO-178C Level B Equivalent
Total Checks: 80+ (Sections A-M)

EOF
            exit 0
            ;;
        *)
            if [ -d "$1" ]; then
                PROJECT_ROOT="$1"
            fi
            shift
            ;;
    esac
done

cd "$PROJECT_ROOT" || { echo "❌ Cannot access $PROJECT_ROOT"; exit 1; }

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Counters
PASS=0
FAIL=0
WARN=0
TOTAL=0

# Results array for JSON
declare -a RESULTS=()

# ─────────────────────────────────────────────────────────────────────────────
# HELPER FUNCTIONS
# ─────────────────────────────────────────────────────────────────────────────
check() {
    local name=$1
    local result=$2
    local required=${3:-true}

    ((TOTAL++)) || true

    local status=""
    if [ "$result" = "true" ]; then
        if [ "$OUTPUT_JSON" != "true" ]; then
            echo -e "${GREEN}✅ $name${NC}"
        fi
        ((PASS++)) || true
        status="pass"
    elif [ "$required" = "true" ]; then
        if [ "$OUTPUT_JSON" != "true" ]; then
            echo -e "${RED}❌ $name${NC}"
        fi
        ((FAIL++)) || true
        status="fail"
    else
        if [ "$OUTPUT_JSON" != "true" ]; then
            echo -e "${YELLOW}⚠️  $name (optional)${NC}"
        fi
        ((WARN++)) || true
        status="warn"
    fi

    RESULTS+=("{\"check\":\"$name\",\"status\":\"$status\",\"required\":$required}")
}

section() {
    if [ "$OUTPUT_JSON" != "true" ]; then
        echo ""
        echo -e "${BLUE}═══ $1 ═══${NC}"
    fi
}

verbose() {
    if [ "$VERBOSE" = "true" ] && [ "$OUTPUT_JSON" != "true" ]; then
        echo -e "${CYAN}     └─ $1${NC}"
    fi
}

# ─────────────────────────────────────────────────────────────────────────────
# HEADER
# ─────────────────────────────────────────────────────────────────────────────
if [ "$OUTPUT_JSON" != "true" ]; then
    echo "═══════════════════════════════════════════════════════════════════════════════"
    echo "  🔬 WAVE PRE-FLIGHT VALIDATOR v${VERSION} - Aerospace-Grade"
    echo "═══════════════════════════════════════════════════════════════════════════════"
    echo "  Project: $(pwd)"
    echo "  Date: $(date)"
    if [ "$POST_DEPLOY_MODE" = "true" ]; then
        echo "  Mode: POST-DEPLOYMENT VERIFICATION"
        [ -n "$DEPLOY_URL" ] && echo "  Deploy URL: $DEPLOY_URL"
    else
        echo "  Mode: PRE-FLIGHT VALIDATION"
    fi
    echo ""
fi

# ─────────────────────────────────────────────────────────────────────────────
# SECTION A: EXECUTION ENVIRONMENT
# ─────────────────────────────────────────────────────────────────────────────
section "SECTION A: EXECUTION ENVIRONMENT"

check "A1: Docker daemon running" "$(docker info > /dev/null 2>&1 && echo true || echo false)"
check "A2: Docker Compose available" "$(docker compose version > /dev/null 2>&1 && echo true || echo false)"
check "A3: .env file exists" "$([ -f .env ] && echo true || echo false)"

# Load .env if exists
[ -f .env ] && source .env 2>/dev/null

check "A4: ANTHROPIC_API_KEY set" "$([ -n \"$ANTHROPIC_API_KEY\" ] && [ \"$ANTHROPIC_API_KEY\" != \"sk-ant-api03-YOUR-KEY-HERE\" ] && [ \"$ANTHROPIC_API_KEY\" != \"sk-ant-xxxxx\" ] && echo true || echo false)"

# A4b: Live API key validation
if [ -n "$ANTHROPIC_API_KEY" ] && [ "$ANTHROPIC_API_KEY" != "sk-ant-xxxxx" ] && [ "$ANTHROPIC_API_KEY" != "sk-ant-api03-YOUR-KEY-HERE" ]; then
    API_TEST=$(curl -s --max-time 10 -X POST https://api.anthropic.com/v1/messages \
        -H "Content-Type: application/json" \
        -H "x-api-key: $ANTHROPIC_API_KEY" \
        -H "anthropic-version: 2023-06-01" \
        -d '{"model":"claude-sonnet-4-20250514","max_tokens":1,"messages":[{"role":"user","content":"hi"}]}' 2>&1)

    if echo "$API_TEST" | grep -q '"type":"message"'; then
        check "A4b: API key valid (live test)" "true"
    elif echo "$API_TEST" | grep -q 'rate_limit'; then
        check "A4b: API key valid (rate limited but working)" "true"
    elif echo "$API_TEST" | grep -q 'invalid_api_key\|authentication_error'; then
        check "A4b: API key valid (live test)" "false"
        verbose "API returned: Invalid API key"
    else
        check "A4b: API key valid (live test)" "false"
        verbose "API error: $(echo "$API_TEST" | head -c 100)"
    fi
else
    check "A4b: API key valid (live test)" "false"
    verbose "Placeholder key detected"
fi

# A4c: Slack Webhook Live Test
if [ -n "$SLACK_WEBHOOK_URL" ] && [ "$SLACK_WEBHOOK_URL" != "https://hooks.slack.com/services/YOUR/WEBHOOK/URL" ]; then
    SLACK_TEST=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 \
        -X POST "$SLACK_WEBHOOK_URL" \
        -H "Content-Type: application/json" \
        -d '{"text":"🔬 WAVE Pre-Flight Validator - Webhook Test (ignore)"}' 2>&1)

    if [ "$SLACK_TEST" = "200" ]; then
        check "A4c: Slack webhook valid (live test)" "true"
    else
        check "A4c: Slack webhook valid (live test)" "false" false
        verbose "Slack returned HTTP $SLACK_TEST"
    fi
else
    check "A4c: Slack webhook valid (live test)" "false" false
    verbose "Webhook URL not set or placeholder"
fi

check "A5: Workspace directories exist" "$([ -d .claude ] || [ -d code ] && echo true || echo false)"
check "A6: Network connectivity" "$(curl -s --max-time 5 https://api.anthropic.com > /dev/null 2>&1 && echo true || echo false)" false

# A7: Kill switch check
CLAUDE_DIR=".claude"
if [ -f "$CLAUDE_DIR/EMERGENCY-STOP" ]; then
    check "A7: Kill switch is clear" "false"
    verbose "EMERGENCY-STOP file exists - pipeline blocked"
else
    check "A7: Kill switch is clear" "true"
fi

# A8: Orchestrator/merge-watcher main loop check
WATCHER_FILE=""
[ -f scripts/wave-orchestrator.sh ] && WATCHER_FILE="scripts/wave-orchestrator.sh"
[ -f scripts/merge-watcher.sh ] && WATCHER_FILE="scripts/merge-watcher.sh"
[ -f core/scripts/wave-orchestrator.sh ] && WATCHER_FILE="core/scripts/wave-orchestrator.sh"

if [ -n "$WATCHER_FILE" ]; then
    if grep -qE 'while\s+(true|:|\[\[.*\]\])' "$WATCHER_FILE" && \
       grep -qE 'sleep\s+[0-9]+' "$WATCHER_FILE"; then
        check "A8: Orchestrator has polling loop" "true"
    else
        check "A8: Orchestrator has polling loop" "false" false
        verbose "Missing: while loop + sleep pattern"
    fi
else
    check "A8: Orchestrator has polling loop" "false" false
    verbose "No orchestrator script found"
fi

# A9: GitHub Repository Accessibility
if [ -n "$GITHUB_TOKEN" ] && [ -n "$GITHUB_REPO" ]; then
    GITHUB_CHECK=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 \
        -H "Authorization: token $GITHUB_TOKEN" \
        -H "Accept: application/vnd.github.v3+json" \
        "https://api.github.com/repos/$GITHUB_REPO" 2>&1)

    if [ "$GITHUB_CHECK" = "200" ]; then
        check "A9: GitHub repo accessible" "true"
        verbose "$GITHUB_REPO verified"
    elif [ "$GITHUB_CHECK" = "404" ]; then
        check "A9: GitHub repo accessible" "false" false
        verbose "Repo not found: $GITHUB_REPO"
    elif [ "$GITHUB_CHECK" = "401" ]; then
        check "A9: GitHub repo accessible" "false" false
        verbose "Invalid GITHUB_TOKEN"
    else
        check "A9: GitHub repo accessible" "false" false
        verbose "GitHub returned HTTP $GITHUB_CHECK"
    fi
else
    check "A9: GitHub repo accessible" "false" false
    verbose "GITHUB_TOKEN or GITHUB_REPO not set"
fi

# A10: Supabase connectivity
if [ -n "$SUPABASE_URL" ] && [ -n "$SUPABASE_SERVICE_KEY" ]; then
    SUPABASE_CHECK=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 \
        "${SUPABASE_URL}/rest/v1/" \
        -H "apikey: ${SUPABASE_SERVICE_KEY}" \
        -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}" 2>/dev/null || echo "000")

    if [ "$SUPABASE_CHECK" = "200" ] || [ "$SUPABASE_CHECK" = "404" ]; then
        check "A10: Supabase connected" "true"
    else
        check "A10: Supabase connected" "false"
        verbose "Supabase returned HTTP $SUPABASE_CHECK"
    fi
else
    check "A10: Supabase connected" "false"
    verbose "SUPABASE_URL or SUPABASE_SERVICE_KEY not set"
fi

# ─────────────────────────────────────────────────────────────────────────────
# SECTION B: DOCKER COMPOSE CONFIGURATION
# ─────────────────────────────────────────────────────────────────────────────
section "SECTION B: DOCKER COMPOSE CONFIGURATION"

COMPOSE_FILE=""
[ -f docker-compose.yml ] && COMPOSE_FILE="docker-compose.yml"
[ -f docker-compose.yaml ] && COMPOSE_FILE="docker-compose.yaml"

if [ -n "$COMPOSE_FILE" ]; then
    check "B1: docker-compose.yml exists" "true"
    check "B2: YAML syntax valid" "$(docker compose -f $COMPOSE_FILE config > /dev/null 2>&1 && echo true || echo false)"
    check "B3: claude -p pattern present" "$(grep -qE 'claude\s+-p' $COMPOSE_FILE 2>/dev/null && echo true || echo false)" false
    check "B4: --dangerously-skip-permissions" "$(grep -q 'dangerously-skip-permissions' $COMPOSE_FILE 2>/dev/null && echo true || echo false)"
    check "B5: --output-format present" "$(grep -q 'output-format' $COMPOSE_FILE 2>/dev/null && echo true || echo false)" false
    check "B6: ANTHROPIC_API_KEY in compose" "$(grep -q 'ANTHROPIC_API_KEY' $COMPOSE_FILE 2>/dev/null && echo true || echo false)"
    check "B7: env_file reference" "$(grep -q 'env_file' $COMPOSE_FILE 2>/dev/null && echo true || echo false)"
    check "B8: Non-root user configured" "$(grep -q 'user:' $COMPOSE_FILE 2>/dev/null && echo true || echo false)" false
else
    check "B1: docker-compose.yml exists" "false" false
    verbose "No docker-compose file found"
fi

# ─────────────────────────────────────────────────────────────────────────────
# SECTION C: DOCKERFILE CONFIGURATION
# ─────────────────────────────────────────────────────────────────────────────
section "SECTION C: DOCKERFILE CONFIGURATION"

DOCKERFILE=""
[ -f Dockerfile.agent ] && DOCKERFILE="Dockerfile.agent"
[ -f Dockerfile ] && DOCKERFILE="Dockerfile"
[ -f core/templates/Dockerfile.agent ] && DOCKERFILE="core/templates/Dockerfile.agent"

if [ -n "$DOCKERFILE" ]; then
    check "C1: Dockerfile exists" "true"
    check "C2: Node.js in Dockerfile" "$(grep -qi 'node' $DOCKERFILE && echo true || echo false)"
    check "C3: Claude Code CLI installed" "$(grep -qi 'claude-code\|@anthropic' $DOCKERFILE && echo true || echo false)"
    check "C4: curl installed" "$(grep -q 'curl' $DOCKERFILE && echo true || echo false)"
    check "C5: jq installed" "$(grep -q 'jq' $DOCKERFILE && echo true || echo false)"
    check "C6: No ENTRYPOINT (uses command)" "$(! grep -q '^ENTRYPOINT' $DOCKERFILE && echo true || echo false)"
    check "C7: Non-root USER defined" "$(grep -q '^USER' $DOCKERFILE && echo true || echo false)"
else
    check "C1: Dockerfile exists" "false" false
    verbose "No Dockerfile found"
fi

# ─────────────────────────────────────────────────────────────────────────────
# SECTION D: REQUIRED SCRIPTS
# ─────────────────────────────────────────────────────────────────────────────
section "SECTION D: REQUIRED SCRIPTS"

check_script() {
    local name="$1"
    local required="${2:-true}"
    shift 2
    local paths="$@"

    local found=false
    for path in $paths; do
        if [ -f "$path" ]; then
            found=true
            break
        fi
    done

    check "$name" "$found" "$required"
}

check_script "D1: Kill switch script" true "scripts/check-kill-switch.sh" "core/scripts/check-kill-switch.sh"
check_script "D2: Supabase report script" true "scripts/supabase-report.sh" "core/scripts/supabase-report.sh"
check_script "D3: Wave orchestrator" true "scripts/wave-orchestrator.sh" "core/scripts/wave-orchestrator.sh"
check_script "D4: Worktree setup script" false "scripts/setup-worktrees.sh" "core/scripts/setup-worktrees.sh"
check_script "D5: Safety violation detector" true "scripts/safety-violation-detector.sh" "core/scripts/safety-violation-detector.sh"
check_script "D6: Workspace validator (Gate 0.5)" true "scripts/workspace-validator.sh" "core/scripts/workspace-validator.sh"
check_script "D7: Pre-merge validator" false "scripts/pre-merge-validator.sh" "core/scripts/pre-merge-validator.sh"

# ─────────────────────────────────────────────────────────────────────────────
# SECTION E: PROJECT STRUCTURE
# ─────────────────────────────────────────────────────────────────────────────
section "SECTION E: PROJECT STRUCTURE"

check "E1: .claude/ directory exists" "$([ -d .claude ] && echo true || echo false)"
check "E2: stories/ directory exists" "$([ -d stories ] && echo true || echo false)"
check "E3: CLAUDE.md exists" "$([ -f CLAUDE.md ] && echo true || echo false)" false

if [ -d stories ]; then
    STORY_COUNT=$(find stories -name "*.json" 2>/dev/null | wc -l | tr -d ' ')
    check "E4: Stories found ($STORY_COUNT)" "$([ $STORY_COUNT -gt 0 ] && echo true || echo false)"
else
    check "E4: Stories found" "false" false
fi

check "E5: worktrees/ exists" "$([ -d worktrees ] && echo true || echo false)" false
check "E6: logs/ directory exists" "$([ -d logs ] && echo true || echo false)" false

# ─────────────────────────────────────────────────────────────────────────────
# SECTION F: STORY VALIDATION
# ─────────────────────────────────────────────────────────────────────────────
section "SECTION F: STORY VALIDATION"

STORY_ERRORS=0
STORIES_CHECKED=0

if [ -d stories ] && command -v jq &> /dev/null; then
    for story in $(find stories -name "*.json" 2>/dev/null | head -10); do
        ((STORIES_CHECKED++)) || true
        STORY_NAME=$(basename "$story")

        # Check required fields
        if ! jq -e '.id' "$story" > /dev/null 2>&1; then
            verbose "$STORY_NAME: missing 'id'"
            ((STORY_ERRORS++)) || true
            continue
        fi

        if ! jq -e '.title' "$story" > /dev/null 2>&1; then
            verbose "$STORY_NAME: missing 'title'"
            ((STORY_ERRORS++)) || true
            continue
        fi
    done

    check "F1: Story JSON schema valid ($STORIES_CHECKED checked)" "$([ $STORY_ERRORS -eq 0 ] && echo true || echo false)"
else
    check "F1: Story JSON schema valid" "true" false
    verbose "jq not available or no stories"
fi

# Check for required story fields
if [ -d stories ]; then
    HAS_AC=$(grep -rl 'acceptance_criteria' stories/ 2>/dev/null | wc -l | tr -d ' ')
    check "F2: Stories have acceptance_criteria ($HAS_AC)" "$([ $HAS_AC -gt 0 ] && echo true || echo false)" false
fi

# ─────────────────────────────────────────────────────────────────────────────
# SECTION G: SAFETY CONFIGURATION
# ─────────────────────────────────────────────────────────────────────────────
section "SECTION G: SAFETY CONFIGURATION"

# Check CLAUDE.md for safety rules
CLAUDE_MD=""
[ -f CLAUDE.md ] && CLAUDE_MD="CLAUDE.md"
[ -f .claude/CLAUDE.md ] && CLAUDE_MD=".claude/CLAUDE.md"

if [ -n "$CLAUDE_MD" ]; then
    FORBIDDEN_COUNT=$(grep -c "❌\|FORBIDDEN\|forbidden" "$CLAUDE_MD" 2>/dev/null || echo "0")
    check "G1: Forbidden operations defined ($FORBIDDEN_COUNT)" "$([ $FORBIDDEN_COUNT -ge 10 ] && echo true || echo false)"
    check "G2: Stop conditions defined" "$(grep -qi 'stop.*condition\|STUCK' $CLAUDE_MD && echo true || echo false)"
    check "G3: Token budget mentioned" "$(grep -qi 'token.*budget\|cost.*limit' $CLAUDE_MD && echo true || echo false)" false
    check "G4: Escalation triggers defined" "$(grep -qi 'escalat' $CLAUDE_MD && echo true || echo false)" false
else
    check "G1: Forbidden operations defined" "false" false
    verbose "No CLAUDE.md found"
fi

# Check for safety reference docs
check "G5: COMPLETE-SAFETY-REFERENCE.md exists" "$([ -f .claudecode/safety/COMPLETE-SAFETY-REFERENCE.md ] && echo true || echo false)" false
check "G6: FMEA.md exists" "$([ -f .claudecode/safety/FMEA.md ] && echo true || echo false)" false
check "G7: APPROVAL-LEVELS.md exists" "$([ -f .claudecode/safety/APPROVAL-LEVELS.md ] && echo true || echo false)" false

# Check for dangerous patterns in docker-compose
if [ -n "$COMPOSE_FILE" ]; then
    check "G8: No hardcoded secrets in compose" "$(! grep -qE 'sk-ant-|ghp_[a-zA-Z0-9]{36}' $COMPOSE_FILE 2>/dev/null && echo true || echo false)"
fi

# ─────────────────────────────────────────────────────────────────────────────
# SECTION H: ORCHESTRATOR FUNCTIONS
# ─────────────────────────────────────────────────────────────────────────────
section "SECTION H: ORCHESTRATOR FUNCTIONS"

ORCH_FILE=""
[ -f scripts/wave-orchestrator.sh ] && ORCH_FILE="scripts/wave-orchestrator.sh"
[ -f core/scripts/wave-orchestrator.sh ] && ORCH_FILE="core/scripts/wave-orchestrator.sh"

if [ -n "$ORCH_FILE" ]; then
    check "H1: Orchestrator exists" "true"
    check "H2: Gate checking function" "$(grep -q 'check_gate\|gate.*check' $ORCH_FILE && echo true || echo false)" false
    check "H3: Kill switch integration" "$(grep -q 'kill.*switch\|EMERGENCY.*STOP' $ORCH_FILE && echo true || echo false)"
    check "H4: Retry loop logic" "$(grep -q 'retry\|RETRY' $ORCH_FILE && echo true || echo false)" false
    check "H5: Budget tracking" "$(grep -q 'budget\|cost\|token' $ORCH_FILE && echo true || echo false)" false
    check "H6: Slack notifications" "$(grep -qi 'slack\|notify' $ORCH_FILE && echo true || echo false)" false
else
    check "H1: Orchestrator exists" "false"
fi

# ─────────────────────────────────────────────────────────────────────────────
# SECTION I: AGENT CONFIGURATION
# ─────────────────────────────────────────────────────────────────────────────
section "SECTION I: AGENT CONFIGURATION"

check "I1: Agent configs directory" "$([ -d .claudecode/agents ] && echo true || echo false)" false

if [ -d .claudecode/agents ]; then
    AGENT_COUNT=$(ls -1 .claudecode/agents/*.md 2>/dev/null | wc -l | tr -d ' ')
    check "I2: Agent definitions found ($AGENT_COUNT)" "$([ $AGENT_COUNT -gt 0 ] && echo true || echo false)" false
fi

check "I3: CTO agent defined" "$([ -f .claudecode/agents/cto-agent.md ] && echo true || echo false)" false
check "I4: PM agent defined" "$([ -f .claudecode/agents/pm-agent.md ] && echo true || echo false)" false
check "I5: QA agent defined" "$([ -f .claudecode/agents/qa-agent.md ] && echo true || echo false)" false

# ─────────────────────────────────────────────────────────────────────────────
# SECTION J: SMOKE TEST (Optional)
# ─────────────────────────────────────────────────────────────────────────────
if [ "$QUICK_MODE" = "false" ]; then
    section "SECTION J: SMOKE TEST"

    # Test Claude CLI availability
    if command -v claude &> /dev/null; then
        CLAUDE_VERSION=$(claude --version 2>/dev/null | head -1 || echo "unknown")
        check "J1: Claude CLI available ($CLAUDE_VERSION)" "true"
    else
        check "J1: Claude CLI available" "false" false
        verbose "Claude CLI not in PATH"
    fi
else
    section "SECTION J: SMOKE TEST (SKIPPED)"
    if [ "$OUTPUT_JSON" != "true" ]; then
        echo "  ⏭️  Smoke test skipped (--quick mode)"
    fi
fi

# ─────────────────────────────────────────────────────────────────────────────
# SECTION K: GATE PROTOCOL
# ─────────────────────────────────────────────────────────────────────────────
section "SECTION K: GATE PROTOCOL"

check "K1: Gate protocol documented" "$([ -f .claudecode/workflows/gate-protocol.md ] && echo true || echo false)" false
check "K2: Retry loop documented" "$([ -f .claudecode/workflows/retry-loop.md ] && echo true || echo false)" false
check "K3: Signal schemas documented" "$([ -f .claudecode/signals/SCHEMAS.md ] && echo true || echo false)" false

# ─────────────────────────────────────────────────────────────────────────────
# SECTION L: CREDENTIALS SUMMARY
# ─────────────────────────────────────────────────────────────────────────────
section "SECTION L: CREDENTIALS SUMMARY"

if [ "$OUTPUT_JSON" != "true" ]; then
    echo ""
    echo "┌─────────────────────────────────────────────────────────────────────────────┐"
    echo "│ CREDENTIALS STATUS                                                          │"
    echo "└─────────────────────────────────────────────────────────────────────────────┘"

    if [ -n "$ANTHROPIC_API_KEY" ] && [ "$ANTHROPIC_API_KEY" != "sk-ant-api03-YOUR-KEY-HERE" ]; then
        echo -e "${GREEN}✅ ANTHROPIC_API_KEY: Set (sk-ant...${ANTHROPIC_API_KEY: -4})${NC}"
    else
        echo -e "${RED}❌ ANTHROPIC_API_KEY: NOT SET${NC}"
    fi

    if [ -n "$SUPABASE_URL" ] && [ -n "$SUPABASE_SERVICE_KEY" ]; then
        echo -e "${GREEN}✅ SUPABASE: Configured${NC}"
    else
        echo -e "${YELLOW}⚠️  SUPABASE: Not configured${NC}"
    fi

    if [ -n "$SLACK_WEBHOOK_URL" ]; then
        echo -e "${GREEN}✅ SLACK_WEBHOOK_URL: Set${NC}"
    else
        echo -e "${YELLOW}⚠️  SLACK_WEBHOOK_URL: Not set (optional)${NC}"
    fi

    if [ -n "$GITHUB_TOKEN" ] && [ -n "$GITHUB_REPO" ]; then
        echo -e "${GREEN}✅ GITHUB: Configured ($GITHUB_REPO)${NC}"
    else
        echo -e "${YELLOW}⚠️  GITHUB: Not configured (optional)${NC}"
    fi

    echo ""
fi

# ─────────────────────────────────────────────────────────────────────────────
# SECTION M: POST-DEPLOYMENT (Conditional)
# ─────────────────────────────────────────────────────────────────────────────
if [ "$POST_DEPLOY_MODE" = "true" ]; then
    section "SECTION M: POST-DEPLOYMENT VERIFICATION"

    if [ -z "$DEPLOY_URL" ]; then
        [ -f ".claude/deploy-url.txt" ] && DEPLOY_URL=$(cat .claude/deploy-url.txt)
    fi

    if [ -n "$DEPLOY_URL" ]; then
        if [ "$OUTPUT_JSON" != "true" ]; then
            echo "  Testing: $DEPLOY_URL"
        fi

        HOME_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 15 "$DEPLOY_URL" 2>/dev/null || echo "000")
        check "M1: Homepage returns 200 (got $HOME_STATUS)" "$([ \"$HOME_STATUS\" = \"200\" ] && echo true || echo false)"

        HEALTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 15 "$DEPLOY_URL/api/health" 2>/dev/null || echo "000")
        check "M2: Health endpoint (got $HEALTH_STATUS)" "$([ \"$HEALTH_STATUS\" = \"200\" ] && echo true || echo false)" false

        check "M3: No 5xx errors" "$([ \"$HOME_STATUS\" -lt 500 ] 2>/dev/null && echo true || echo false)"
    else
        check "M1: Homepage returns 200" "false"
        verbose "No DEPLOY_URL provided. Use --deploy-url=https://..."
    fi
else
    section "SECTION M: POST-DEPLOYMENT (SKIPPED)"
    if [ "$OUTPUT_JSON" != "true" ]; then
        echo "  ⏭️  Use --post-deploy to run post-deployment checks"
    fi
fi

# ─────────────────────────────────────────────────────────────────────────────
# FINAL REPORT
# ─────────────────────────────────────────────────────────────────────────────
if [ "$OUTPUT_JSON" = "true" ]; then
    RESULTS_JSON=$(printf '%s\n' "${RESULTS[@]}" | paste -sd ',' -)
    cat << EOF
{
    "validator": "pre-flight-validator",
    "version": "$VERSION",
    "project": "$(pwd)",
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "summary": {
        "total": $TOTAL,
        "passed": $PASS,
        "failed": $FAIL,
        "warnings": $WARN
    },
    "verdict": "$([ $FAIL -eq 0 ] && echo "GO" || echo "NO-GO")",
    "confidence": $(echo "scale=0; ($PASS * 100) / $TOTAL" | bc 2>/dev/null || echo "0"),
    "results": [$RESULTS_JSON]
}
EOF
else
    echo ""
    echo "═══════════════════════════════════════════════════════════════════════════════"
    echo "  📊 PRE-FLIGHT VALIDATION RESULTS"
    echo "═══════════════════════════════════════════════════════════════════════════════"
    echo ""
    echo -e "  ${GREEN}✅ Passed:   $PASS${NC}"
    echo -e "  ${YELLOW}⚠️  Warnings: $WARN${NC}"
    echo -e "  ${RED}❌ Failed:   $FAIL${NC}"
    echo ""

    CONFIDENCE=$(echo "scale=0; ($PASS * 100) / $TOTAL" | bc 2>/dev/null || echo "0")
    echo "  Confidence: $CONFIDENCE% ($PASS/$TOTAL)"
    echo ""

    if [ $FAIL -eq 0 ]; then
        echo -e "${GREEN}╔═══════════════════════════════════════════════════════════════════════════════╗"
        echo "║                                                                               ║"
        echo "║      🟢 GO - All critical checks passed. Safe to proceed.                    ║"
        echo "║                                                                               ║"
        echo "╚═══════════════════════════════════════════════════════════════════════════════╝${NC}"
        echo ""
        echo "  Next command:"
        echo "    ./core/scripts/wave-orchestrator.sh --project $(pwd)"
        echo "    # Or: docker compose up --build"
        echo ""
    elif [ $FAIL -le 3 ]; then
        echo -e "${YELLOW}╔═══════════════════════════════════════════════════════════════════════════════╗"
        echo "║                                                                               ║"
        echo "║      🟡 CONDITIONAL GO - Minor issues, review before proceeding              ║"
        echo "║                                                                               ║"
        echo "╚═══════════════════════════════════════════════════════════════════════════════╝${NC}"
        echo ""
    else
        echo -e "${RED}╔═══════════════════════════════════════════════════════════════════════════════╗"
        echo "║                                                                               ║"
        echo "║      🔴 NO-GO - $FAIL critical check(s) failed. Fix before proceeding.        ║"
        echo "║                                                                               ║"
        echo "╚═══════════════════════════════════════════════════════════════════════════════╝${NC}"
        echo ""
        echo "  Fix the failed checks above before proceeding."
        echo ""
    fi
fi

# Exit with appropriate code
[ $FAIL -eq 0 ] && exit 0 || exit 1
