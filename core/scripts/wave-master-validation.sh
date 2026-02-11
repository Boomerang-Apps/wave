#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# WAVE MASTER VALIDATION SCRIPT
# ═══════════════════════════════════════════════════════════════════════════════
# Tests ALL requirements before launching WAVE:
#   1. Docker Images & Dependencies
#   2. WAVE Framework Access
#   3. Target Project (Footprint) Readiness
#   4. Stories Access (Supabase)
#   5. Slack Notifications
#   6. Environment Variables
#   7. Network & Infrastructure
#   8. Pre-flight Lock
#
# Usage: ./wave-master-validation.sh [--full]
#   --full: Include API connectivity tests (Anthropic, Slack send test)
# ═══════════════════════════════════════════════════════════════════════════════

set -uo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
BOLD='\033[1m'
NC='\033[0m'

# Paths
WAVE_PATH="/Volumes/SSD-01/Projects/WAVE"
PROJECT_PATH="${PROJECT_PATH:-/Volumes/SSD-01/Projects/Footprint/footprint}"

# Counters
TOTAL_PASSED=0
TOTAL_FAILED=0
TOTAL_WARNINGS=0
SECTION_PASSED=0
SECTION_FAILED=0

# Full test mode
FULL_TEST="${1:-}"

# ─────────────────────────────────────────────────────────────────────────────
# Helper Functions
# ─────────────────────────────────────────────────────────────────────────────

check_pass() {
    echo -e "  ${GREEN}✓${NC} $1"
    ((SECTION_PASSED++))
    ((TOTAL_PASSED++))
}

check_fail() {
    echo -e "  ${RED}✗${NC} $1"
    ((SECTION_FAILED++))
    ((TOTAL_FAILED++))
}

check_warn() {
    echo -e "  ${YELLOW}⚠${NC} $1"
    ((TOTAL_WARNINGS++))
}

section_header() {
    SECTION_PASSED=0
    SECTION_FAILED=0
    echo ""
    echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE} $1${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
}

section_summary() {
    local name=$1
    if [ $SECTION_FAILED -eq 0 ]; then
        echo -e "  ${CYAN}[$name: ${GREEN}$SECTION_PASSED passed${NC}${CYAN}]${NC}"
    else
        echo -e "  ${CYAN}[$name: ${GREEN}$SECTION_PASSED passed${NC}, ${RED}$SECTION_FAILED failed${NC}${CYAN}]${NC}"
    fi
}

# ─────────────────────────────────────────────────────────────────────────────
# HEADER
# ─────────────────────────────────────────────────────────────────────────────

clear
echo ""
echo -e "${MAGENTA}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${MAGENTA}║                                                               ║${NC}"
echo -e "${MAGENTA}║          ${BOLD}WAVE MASTER VALIDATION${NC}${MAGENTA}                              ║${NC}"
echo -e "${MAGENTA}║              All Systems Check                                ║${NC}"
echo -e "${MAGENTA}║                                                               ║${NC}"
echo -e "${MAGENTA}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  ${CYAN}Date:${NC}       $(date '+%Y-%m-%d %H:%M:%S')"
echo -e "  ${CYAN}Mode:${NC}       ${FULL_TEST:+Full (with API tests)}${FULL_TEST:-Quick}"
echo -e "  ${CYAN}Controller:${NC} $WAVE_PATH"
echo -e "  ${CYAN}Target:${NC}     $PROJECT_PATH"
echo ""

# Load environment
if [ -f "$WAVE_PATH/.env" ]; then
    source "$WAVE_PATH/.env"
fi

# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 1: DOCKER IMAGES
# ═══════════════════════════════════════════════════════════════════════════════

section_header "1. DOCKER IMAGES"

DOCKER_IMAGES=$(docker images --format '{{.Repository}}' 2>/dev/null || echo "")

for img in wave-orchestrator wave-cto wave-pm wave-fe-dev-1 wave-be-dev-1 wave-qa; do
    if echo "$DOCKER_IMAGES" | grep -q "^${img}$"; then
        check_pass "Image: $img"
    else
        check_fail "Image: $img NOT FOUND"
    fi
done

section_summary "Images"

# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 2: IMAGE DEPENDENCIES
# ═══════════════════════════════════════════════════════════════════════════════

section_header "2. IMAGE DEPENDENCIES"

TEST_IMAGE="wave-cto:latest"

# Node.js
NODE_V=$(docker run --rm --entrypoint node "$TEST_IMAGE" --version 2>/dev/null || echo "")
[[ "$NODE_V" == v20* ]] && check_pass "Node.js: $NODE_V" || check_fail "Node.js: $NODE_V (expected v20.x)"

# Python
PYTHON_V=$(docker run --rm --entrypoint python3 "$TEST_IMAGE" --version 2>/dev/null || echo "")
[[ -n "$PYTHON_V" ]] && check_pass "$PYTHON_V" || check_fail "Python: NOT FOUND"

# Git
GIT_V=$(docker run --rm --entrypoint git "$TEST_IMAGE" --version 2>/dev/null || echo "")
[[ -n "$GIT_V" ]] && check_pass "$GIT_V" || check_fail "Git: NOT FOUND"

# jq
JQ_V=$(docker run --rm --entrypoint jq "$TEST_IMAGE" --version 2>/dev/null || echo "")
[[ -n "$JQ_V" ]] && check_pass "jq: $JQ_V" || check_fail "jq: NOT FOUND"

# Bash
docker run --rm --entrypoint bash "$TEST_IMAGE" -c "exit 0" 2>/dev/null && check_pass "Bash: available" || check_fail "Bash: NOT FOUND"

# curl
docker run --rm --entrypoint curl "$TEST_IMAGE" --version 2>/dev/null | head -1 | grep -q "curl" && check_pass "curl: available" || check_fail "curl: NOT FOUND"

section_summary "Dependencies"

# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 3: WAVE FRAMEWORK ACCESS
# ═══════════════════════════════════════════════════════════════════════════════

section_header "3. WAVE FRAMEWORK ACCESS"

# Test container can access WAVE framework
WAVE_ACCESS=$(docker run --rm \
  -v "$WAVE_PATH:/wave-framework:ro" \
  --entrypoint bash "$TEST_IMAGE" \
  -c 'test -f /wave-framework/docker-compose.yml && echo "OK"' 2>/dev/null)

[[ "$WAVE_ACCESS" == "OK" ]] && check_pass "WAVE mounted at /wave-framework" || check_fail "WAVE mount failed"

# Check scripts access
SCRIPTS_ACCESS=$(docker run --rm \
  -v "$WAVE_PATH/core/scripts:/scripts:ro" \
  --entrypoint bash "$TEST_IMAGE" \
  -c 'ls /scripts/*.sh 2>/dev/null | wc -l' 2>/dev/null)

[[ "$SCRIPTS_ACCESS" -gt 0 ]] && check_pass "Scripts mounted: $SCRIPTS_ACCESS scripts" || check_fail "Scripts mount failed"

# Check docker-compose.yml exists
[[ -f "$WAVE_PATH/docker-compose.yml" ]] && check_pass "docker-compose.yml exists" || check_fail "docker-compose.yml NOT FOUND"

# Check Dockerfile.agent exists
[[ -f "$WAVE_PATH/Dockerfile.agent" ]] && check_pass "Dockerfile.agent exists" || check_fail "Dockerfile.agent NOT FOUND"

section_summary "WAVE Framework"

# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 4: TARGET PROJECT (FOOTPRINT)
# ═══════════════════════════════════════════════════════════════════════════════

section_header "4. TARGET PROJECT (Footprint)"

# Directory exists
[[ -d "$PROJECT_PATH" ]] && check_pass "Project directory exists" || check_fail "Project directory NOT FOUND"

# Critical files
[[ -f "$PROJECT_PATH/CLAUDE.md" ]] && check_pass "CLAUDE.md exists" || check_fail "CLAUDE.md NOT FOUND"
[[ -f "$PROJECT_PATH/.claude/P.md" ]] && check_pass "P.md (P Variable) exists" || check_fail "P.md NOT FOUND"
[[ -f "$PROJECT_PATH/.claude/wave-config.json" ]] && check_pass "wave-config.json exists" || check_fail "wave-config.json NOT FOUND"
[[ -f "$PROJECT_PATH/package.json" ]] && check_pass "package.json exists" || check_fail "package.json NOT FOUND"

# Safety files
[[ -f "$PROJECT_PATH/src/safety/constitutional.py" ]] && check_pass "Constitutional safety exists" || check_fail "Constitutional safety NOT FOUND"
[[ -f "$PROJECT_PATH/src/safety/emergency_stop.py" ]] && check_pass "Emergency stop exists" || check_fail "Emergency stop NOT FOUND"
[[ -f "$PROJECT_PATH/src/safety/budget.py" ]] && check_pass "Budget enforcement exists" || check_fail "Budget enforcement NOT FOUND"

# Worktrees
[[ -d "$PROJECT_PATH/worktrees" ]] && check_pass "Worktrees directory exists" || check_warn "Worktrees directory missing"

# Container access test
PROJECT_ACCESS=$(docker run --rm \
  -v "$PROJECT_PATH:/project:ro" \
  --entrypoint bash "$TEST_IMAGE" \
  -c 'test -f /project/CLAUDE.md && echo "OK"' 2>/dev/null)

[[ "$PROJECT_ACCESS" == "OK" ]] && check_pass "Project mounted at /project" || check_fail "Project mount failed"

section_summary "Target Project"

# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 5: STORIES ACCESS (SUPABASE)
# ═══════════════════════════════════════════════════════════════════════════════

section_header "5. STORIES ACCESS (Supabase)"

# Check Supabase config
[[ -n "${SUPABASE_URL:-}" ]] && check_pass "SUPABASE_URL configured" || check_fail "SUPABASE_URL NOT SET"
[[ -n "${SUPABASE_ANON_KEY:-}" ]] && check_pass "SUPABASE_ANON_KEY configured" || check_fail "SUPABASE_ANON_KEY NOT SET"

# Test Supabase connection
if [[ -n "${SUPABASE_URL:-}" ]] && [[ -n "${SUPABASE_ANON_KEY:-}" ]]; then
    STORIES_RESPONSE=$(curl -s \
      "${SUPABASE_URL}/rest/v1/stories?select=id&limit=10" \
      -H "apikey: ${SUPABASE_ANON_KEY}" \
      -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
      2>/dev/null)

    if echo "$STORIES_RESPONSE" | jq -e '.' >/dev/null 2>&1; then
        STORY_COUNT=$(echo "$STORIES_RESPONSE" | jq 'length')
        check_pass "Supabase connection: OK"
        check_pass "Stories accessible: $STORY_COUNT found"
    else
        check_fail "Supabase connection failed"
    fi

    # Test from inside container
    CONTAINER_STORIES=$(docker run --rm \
      -e SUPABASE_URL="$SUPABASE_URL" \
      -e SUPABASE_ANON_KEY="$SUPABASE_ANON_KEY" \
      --entrypoint bash "$TEST_IMAGE" \
      -c 'curl -s "${SUPABASE_URL}/rest/v1/stories?select=id&limit=1" -H "apikey: ${SUPABASE_ANON_KEY}" -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" 2>/dev/null | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d))"' 2>/dev/null)

    [[ "$CONTAINER_STORIES" -ge 0 ]] 2>/dev/null && check_pass "Container can access stories" || check_fail "Container stories access failed"
fi

section_summary "Stories"

# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 6: ENVIRONMENT VARIABLES
# ═══════════════════════════════════════════════════════════════════════════════

section_header "6. ENVIRONMENT VARIABLES"

# WAVE .env
[[ -f "$WAVE_PATH/.env" ]] && check_pass "WAVE .env exists" || check_fail "WAVE .env NOT FOUND"

# Critical env vars
[[ -n "${ANTHROPIC_API_KEY:-}" ]] && check_pass "ANTHROPIC_API_KEY: configured (${#ANTHROPIC_API_KEY} chars)" || check_fail "ANTHROPIC_API_KEY: NOT SET"
[[ -n "${SLACK_WEBHOOK_URL:-}" ]] && check_pass "SLACK_WEBHOOK_URL: configured" || check_fail "SLACK_WEBHOOK_URL: NOT SET"
[[ -n "${PROJECT_PATH:-}" ]] && check_pass "PROJECT_PATH: $PROJECT_PATH" || check_warn "PROJECT_PATH: using default"

# Optional env vars
[[ -n "${LANGSMITH_API_KEY:-}" ]] && check_pass "LANGSMITH_API_KEY: configured" || check_warn "LANGSMITH_API_KEY: not set (optional)"
[[ -n "${WAVE_BUDGET:-}" ]] && check_pass "WAVE_BUDGET: \$${WAVE_BUDGET}" || check_warn "WAVE_BUDGET: using default"

section_summary "Environment"

# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 6.5: LANGSMITH CONNECTIVITY
# ═══════════════════════════════════════════════════════════════════════════════

section_header "6.5. LANGSMITH CONNECTIVITY"

if [[ -n "${LANGSMITH_API_KEY:-}" ]]; then
    # Test LangSmith API
    LANGSMITH_INFO=$(curl -s \
        -H "x-api-key: ${LANGSMITH_API_KEY}" \
        "https://api.smith.langchain.com/api/v1/info" \
        2>/dev/null)

    if echo "$LANGSMITH_INFO" | jq -e '.version' >/dev/null 2>&1; then
        LS_VERSION=$(echo "$LANGSMITH_INFO" | jq -r '.version')
        check_pass "LangSmith API: connected (v$LS_VERSION)"
    else
        check_fail "LangSmith API: connection failed"
    fi

    # Test projects/sessions endpoint
    LANGSMITH_PROJECTS=$(curl -s \
        -H "x-api-key: ${LANGSMITH_API_KEY}" \
        "https://api.smith.langchain.com/api/v1/sessions?limit=5" \
        2>/dev/null)

    if echo "$LANGSMITH_PROJECTS" | jq -e '.' >/dev/null 2>&1; then
        PROJECT_COUNT=$(echo "$LANGSMITH_PROJECTS" | jq 'length')
        check_pass "LangSmith projects: $PROJECT_COUNT found"
    else
        check_warn "LangSmith projects: could not list"
    fi

    # Test from container
    CONTAINER_LS=$(docker run --rm \
        -e LANGSMITH_API_KEY="$LANGSMITH_API_KEY" \
        --entrypoint bash "$TEST_IMAGE" \
        -c 'curl -s -H "x-api-key: ${LANGSMITH_API_KEY}" "https://api.smith.langchain.com/api/v1/info" 2>/dev/null | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get(\"version\",\"error\"))"' 2>/dev/null)

    [[ "$CONTAINER_LS" =~ ^[0-9]+\.[0-9]+ ]] && check_pass "Container LangSmith access: OK" || check_fail "Container LangSmith access: failed"

    # Ping test for all agents (full mode only)
    if [[ "$FULL_TEST" == "--full" ]]; then
        echo ""
        echo -e "  ${CYAN}Agent Ping Tests:${NC}"

        for agent in wave-orchestrator wave-cto-agent wave-pm-agent wave-fe-agent wave-be-agent wave-qa-agent; do
            TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

            PING_RESPONSE=$(curl -s -X POST "https://api.smith.langchain.com/api/v1/runs" \
                -H "x-api-key: ${LANGSMITH_API_KEY}" \
                -H "x-tenant-id: ${LANGSMITH_WORKSPACE_ID:-}" \
                -H "Content-Type: application/json" \
                -d "{
                    \"name\": \"validation-ping\",
                    \"run_type\": \"chain\",
                    \"inputs\": {\"source\": \"wave-master-validation\"},
                    \"outputs\": {\"status\": \"pong\"},
                    \"session_name\": \"${agent}\",
                    \"start_time\": \"${TIMESTAMP}\",
                    \"end_time\": \"${TIMESTAMP}\"
                }" 2>/dev/null)

            if echo "$PING_RESPONSE" | grep -q "Run created"; then
                check_pass "Ping: $agent"
            else
                check_fail "Ping: $agent"
            fi
        done
    fi
else
    check_warn "LangSmith: API key not configured (skipping tests)"
fi

section_summary "LangSmith"

# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 7: NETWORK & INFRASTRUCTURE
# ═══════════════════════════════════════════════════════════════════════════════

section_header "7. NETWORK & INFRASTRUCTURE"

# Docker daemon
docker info >/dev/null 2>&1 && check_pass "Docker daemon: running" || check_fail "Docker daemon: NOT RUNNING"

# Docker network
docker network ls --format '{{.Name}}' | grep -q "wave-network" && check_pass "wave-network: exists" || check_warn "wave-network: will be created"

# Redis
if docker ps --format '{{.Names}}' | grep -q "wave-redis"; then
    check_pass "wave-redis: running"
    REDIS_PING=$(docker exec wave-redis redis-cli ping 2>/dev/null || echo "")
    [[ "$REDIS_PING" == "PONG" ]] && check_pass "Redis connectivity: PONG" || check_fail "Redis: no response"
else
    check_fail "wave-redis: NOT RUNNING"
fi

# Dozzle
if docker ps --format '{{.Names}}' | grep -qE "wave-dozzle|dozzle"; then
    check_pass "Dozzle: running"

    # Get Dozzle port
    DOZZLE_PORT=$(docker port wave-dozzle 8080 2>/dev/null | cut -d: -f2 || echo "9080")
    check_pass "Dozzle port: $DOZZLE_PORT"

    # Test Dozzle web UI
    DOZZLE_HTTP=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:${DOZZLE_PORT}" 2>/dev/null || echo "000")
    [[ "$DOZZLE_HTTP" == "200" ]] && check_pass "Dozzle web UI: HTTP 200" || check_fail "Dozzle web UI: HTTP $DOZZLE_HTTP"

    # Check Docker socket mount
    SOCKET_MOUNT=$(docker inspect wave-dozzle --format '{{range .Mounts}}{{.Source}}{{end}}' 2>/dev/null | grep -c "docker.sock")
    [[ "$SOCKET_MOUNT" -gt 0 ]] && check_pass "Dozzle docker.sock: mounted" || check_fail "Dozzle docker.sock: NOT mounted"
else
    check_fail "Dozzle: NOT RUNNING"
fi

section_summary "Infrastructure"

# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 7.5: DOZZLE LOG TEST (Full mode only)
# ═══════════════════════════════════════════════════════════════════════════════

if [[ "$FULL_TEST" == "--full" ]]; then
    section_header "7.5. DOZZLE LOG TEST"

    echo -e "  ${CYAN}Agent Log Tests:${NC}"

    for agent in wave-cto wave-pm wave-fe-dev-1 wave-be-dev-1 wave-qa; do
        # Run a quick container that outputs a test log
        LOG_OUTPUT=$(docker run --rm \
            --name "dozzle-ping-${agent}" \
            --label "wave.test=dozzle-ping" \
            --entrypoint echo \
            "${agent}:latest" \
            "[DOZZLE-PING] Validation test from ${agent}" \
            2>/dev/null)

        if [ $? -eq 0 ]; then
            check_pass "Log: $agent"
        else
            check_fail "Log: $agent"
        fi
    done

    section_summary "Dozzle Logs"
fi

# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 8: SLACK NOTIFICATIONS
# ═══════════════════════════════════════════════════════════════════════════════

section_header "8. SLACK NOTIFICATIONS"

# Check notification config
SLACK_CONFIG="$WAVE_PATH/core/config/slack-notifications.json"
if [[ -f "$SLACK_CONFIG" ]]; then
    check_pass "Notification config exists"

    # Check templates
    TEMPLATES=$(jq -r '.templates | keys[]' "$SLACK_CONFIG" 2>/dev/null | wc -l)
    check_pass "Notification templates: $TEMPLATES defined"

    # Check models config
    MODELS=$(jq -r '.models | keys[]' "$SLACK_CONFIG" 2>/dev/null | wc -l)
    check_pass "Agent models configured: $MODELS"
else
    check_fail "Notification config NOT FOUND"
fi

# Check lock file
[[ -f "$WAVE_PATH/core/config/slack-notifications.lock" ]] && check_pass "Notifications locked" || check_warn "Notifications not locked"

# Test Slack (full mode only)
if [[ "$FULL_TEST" == "--full" ]] && [[ -n "${SLACK_WEBHOOK_URL:-}" ]]; then
    SLACK_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" \
        -X POST "$SLACK_WEBHOOK_URL" \
        -H "Content-Type: application/json" \
        -d '{"text":"Master validation test"}' \
        2>/dev/null || echo "000")

    [[ "$SLACK_RESPONSE" == "200" ]] && check_pass "Slack webhook test: HTTP 200" || check_fail "Slack webhook: HTTP $SLACK_RESPONSE"
fi

section_summary "Slack"

# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 8.5: GITHUB BRANCH PROTECTION
# ═══════════════════════════════════════════════════════════════════════════════

section_header "8.5. GITHUB BRANCH PROTECTION"

# Check if gh CLI is available
if command -v gh &>/dev/null; then
    check_pass "GitHub CLI: available"

    # Get repo from git remote
    REPO=$(cd "$PROJECT_PATH" && git remote get-url origin 2>/dev/null | sed 's/.*github.com[:/]\(.*\)\.git/\1/' | sed 's/.*github.com[:/]\(.*\)/\1/')

    if [[ -n "$REPO" ]]; then
        check_pass "GitHub repo: $REPO"

        # Check main branch protection
        PROTECTION=$(gh api "repos/$REPO/branches/main/protection" 2>/dev/null)
        if [[ $? -eq 0 ]]; then
            check_pass "Main branch: PROTECTED"

            # Check specific protections
            FORCE_PUSH=$(echo "$PROTECTION" | jq -r '.allow_force_pushes.enabled' 2>/dev/null)
            DELETIONS=$(echo "$PROTECTION" | jq -r '.allow_deletions.enabled' 2>/dev/null)
            ENFORCE_ADMINS=$(echo "$PROTECTION" | jq -r '.enforce_admins.enabled' 2>/dev/null)
            PR_REVIEWS=$(echo "$PROTECTION" | jq -r '.required_pull_request_reviews.required_approving_review_count // 0' 2>/dev/null)

            [[ "$FORCE_PUSH" == "false" ]] && check_pass "Force push: BLOCKED" || check_fail "Force push: ALLOWED (unsafe!)"
            [[ "$DELETIONS" == "false" ]] && check_pass "Branch deletion: BLOCKED" || check_fail "Branch deletion: ALLOWED (unsafe!)"
            [[ "$ENFORCE_ADMINS" == "true" ]] && check_pass "Admin enforcement: ENABLED" || check_warn "Admin enforcement: disabled"
            [[ "$PR_REVIEWS" -ge 1 ]] && check_pass "Required PR reviews: $PR_REVIEWS" || check_warn "PR reviews: not required"
        else
            check_fail "Main branch: NOT PROTECTED"
        fi

        # Check staging branch exists
        gh api "repos/$REPO/branches/staging" &>/dev/null && \
            check_pass "Staging branch: exists" || check_warn "Staging branch: not found"

        # Check dev branch exists
        gh api "repos/$REPO/branches/dev" &>/dev/null && \
            check_pass "Dev branch: exists" || check_warn "Dev branch: not found"
    else
        check_fail "Could not determine GitHub repo"
    fi
else
    check_warn "GitHub CLI not available - skipping branch protection checks"
fi

section_summary "GitHub"

# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 9: PRE-FLIGHT LOCK
# ═══════════════════════════════════════════════════════════════════════════════

section_header "9. PRE-FLIGHT LOCK"

LOCK_FILE="$PROJECT_PATH/.claude/PREFLIGHT.lock"
if [[ -f "$LOCK_FILE" ]]; then
    check_pass "PREFLIGHT.lock exists"

    # Validate JSON
    if jq -e '.' "$LOCK_FILE" >/dev/null 2>&1; then
        check_pass "Lock file: valid JSON"

        VERSION=$(jq -r '.version' "$LOCK_FILE" 2>/dev/null)
        check_pass "Lock version: $VERSION"

        TIMESTAMP=$(jq -r '.created_at // .timestamp' "$LOCK_FILE" 2>/dev/null | cut -c1-19)
        check_pass "Lock timestamp: $TIMESTAMP"

        FILE_COUNT=$(jq -r '.file_hashes | keys | length' "$LOCK_FILE" 2>/dev/null)
        check_pass "Files locked: $FILE_COUNT"
    else
        check_fail "Lock file: invalid JSON"
    fi
else
    check_fail "PREFLIGHT.lock NOT FOUND"
fi

section_summary "Pre-flight"

# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 10: AGENT MODEL CONFIGURATION
# ═══════════════════════════════════════════════════════════════════════════════

section_header "10. AGENT MODEL CONFIGURATION"

echo -e "  ${CYAN}Agent Model Assignments:${NC}"
echo "  ─────────────────────────────────────────────────────"

COMPOSE_FILE="$WAVE_PATH/docker-compose.yml"
if [[ -f "$COMPOSE_FILE" ]]; then
    # CTO - Opus
    grep -A30 "cto:" "$COMPOSE_FILE" | grep -q "claude-opus" && \
        check_pass "CTO: Claude Opus 4.5" || check_warn "CTO: model not verified"

    # PM - Opus
    grep -A30 "pm:" "$COMPOSE_FILE" | grep -q "claude-opus" && \
        check_pass "PM: Claude Opus 4.5" || check_warn "PM: model not verified"

    # FE-Dev - Sonnet
    grep -A30 "fe-dev" "$COMPOSE_FILE" | grep -q "claude-sonnet" && \
        check_pass "FE-Dev: Claude Sonnet 4" || check_warn "FE-Dev: model not verified"

    # BE-Dev - Sonnet
    grep -A30 "be-dev" "$COMPOSE_FILE" | grep -q "claude-sonnet" && \
        check_pass "BE-Dev: Claude Sonnet 4" || check_warn "BE-Dev: model not verified"

    # QA - Haiku
    grep -A30 "qa:" "$COMPOSE_FILE" | grep -q "claude-haiku" && \
        check_pass "QA: Claude Haiku 4" || check_warn "QA: model not verified"
else
    check_fail "docker-compose.yml NOT FOUND"
fi

section_summary "Models"

# ═══════════════════════════════════════════════════════════════════════════════
# FINAL SUMMARY
# ═══════════════════════════════════════════════════════════════════════════════

echo ""
echo ""
echo -e "${MAGENTA}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${MAGENTA}║               MASTER VALIDATION SUMMARY                       ║${NC}"
echo -e "${MAGENTA}╠═══════════════════════════════════════════════════════════════╣${NC}"
echo -e "${MAGENTA}║${NC}                                                               ${MAGENTA}║${NC}"
echo -e "${MAGENTA}║${NC}   ${GREEN}PASSED:${NC}    $TOTAL_PASSED                                              ${MAGENTA}║${NC}"
echo -e "${MAGENTA}║${NC}   ${YELLOW}WARNINGS:${NC}  $TOTAL_WARNINGS                                               ${MAGENTA}║${NC}"
echo -e "${MAGENTA}║${NC}   ${RED}FAILED:${NC}    $TOTAL_FAILED                                               ${MAGENTA}║${NC}"
echo -e "${MAGENTA}║${NC}                                                               ${MAGENTA}║${NC}"
echo -e "${MAGENTA}╠═══════════════════════════════════════════════════════════════╣${NC}"

if [ $TOTAL_FAILED -eq 0 ]; then
    echo -e "${MAGENTA}║${NC}   ${GREEN}${BOLD}STATUS: ALL SYSTEMS GO - READY FOR LAUNCH${NC}                    ${MAGENTA}║${NC}"
    echo -e "${MAGENTA}║${NC}                                                               ${MAGENTA}║${NC}"
    echo -e "${MAGENTA}║${NC}   Next: ${CYAN}./wave-launch.sh 1${NC}                                      ${MAGENTA}║${NC}"
else
    echo -e "${MAGENTA}║${NC}   ${RED}${BOLD}STATUS: FIX $TOTAL_FAILED ISSUE(S) BEFORE LAUNCH${NC}                      ${MAGENTA}║${NC}"
fi

echo -e "${MAGENTA}║${NC}                                                               ${MAGENTA}║${NC}"
echo -e "${MAGENTA}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Send Slack notification if full mode and all passed
if [[ "$FULL_TEST" == "--full" ]] && [[ $TOTAL_FAILED -eq 0 ]] && [[ -n "${SLACK_WEBHOOK_URL:-}" ]]; then
    curl -s -X POST "$SLACK_WEBHOOK_URL" \
        -H "Content-Type: application/json" \
        -d "{
            \"blocks\": [
                {\"type\": \"header\", \"text\": {\"type\": \"plain_text\", \"text\": \"Master Validation Complete\"}},
                {\"type\": \"section\", \"fields\": [
                    {\"type\": \"mrkdwn\", \"text\": \"*Status:*\n:white_check_mark: All Systems Go\"},
                    {\"type\": \"mrkdwn\", \"text\": \"*Checks:*\n$TOTAL_PASSED passed, $TOTAL_WARNINGS warnings\"}
                ]},
                {\"type\": \"context\", \"elements\": [
                    {\"type\": \"mrkdwn\", \"text\": \":rocket: Ready for Wave launch | $(date '+%Y-%m-%d %H:%M:%S')\"}
                ]}
            ]
        }" >/dev/null 2>&1
fi

# Exit code
[[ $TOTAL_FAILED -gt 0 ]] && exit 1
exit 0
