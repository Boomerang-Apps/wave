#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# WAVE Docker Image Validation Script
# ═══════════════════════════════════════════════════════════════════════════════
# Validates Docker images are ready with all dependencies
# Usage: ./validate-docker-images.sh [--full]
# ═══════════════════════════════════════════════════════════════════════════════

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# Counters
PASSED=0
FAILED=0
WARNINGS=0

# Full test mode (includes API connectivity)
FULL_TEST="${1:-}"

# ─────────────────────────────────────────────────────────────────────────────
# Helper Functions
# ─────────────────────────────────────────────────────────────────────────────

check_pass() {
    echo -e "  ${GREEN}✓${NC} $1"
    ((PASSED++))
}

check_fail() {
    echo -e "  ${RED}✗${NC} $1"
    ((FAILED++))
}

check_warn() {
    echo -e "  ${YELLOW}⚠${NC} $1"
    ((WARNINGS++))
}

print_header() {
    echo ""
    echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE} $1${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
}

# ─────────────────────────────────────────────────────────────────────────────
# HEADER
# ─────────────────────────────────────────────────────────────────────────────

clear
echo ""
echo -e "${CYAN}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║                                                               ║${NC}"
echo -e "${CYAN}║          ${BOLD}WAVE DOCKER IMAGE VALIDATION${NC}${CYAN}                        ║${NC}"
echo -e "${CYAN}║                                                               ║${NC}"
echo -e "${CYAN}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  Date: $(date '+%Y-%m-%d %H:%M:%S')"
echo -e "  Mode: ${FULL_TEST:+Full (with API tests)}${FULL_TEST:-Quick}"
echo ""

# ─────────────────────────────────────────────────────────────────────────────
# 1. IMAGE EXISTENCE
# ─────────────────────────────────────────────────────────────────────────────

print_header "1. IMAGE EXISTENCE"

REQUIRED_IMAGES=(
    "wave-orchestrator"
    "wave-cto"
    "wave-pm"
    "wave-fe-dev"
    "wave-be-dev"
    "wave-qa"
)

DOCKER_IMAGES=$(docker images --format '{{.Repository}}' 2>/dev/null || echo "")

for img in "${REQUIRED_IMAGES[@]}"; do
    if echo "$DOCKER_IMAGES" | grep -q "^${img}$\|wave-${img}\|${img}-"; then
        check_pass "Image: $img"
    else
        # Check for alternative naming
        if echo "$DOCKER_IMAGES" | grep -qi "$img"; then
            check_warn "Image: $img (alternative naming found)"
        else
            check_fail "Image: $img NOT FOUND"
        fi
    fi
done

# ─────────────────────────────────────────────────────────────────────────────
# 2. BASE IMAGE DEPENDENCIES
# ─────────────────────────────────────────────────────────────────────────────

print_header "2. BASE IMAGE DEPENDENCIES"

# Pick an agent image to test
TEST_IMAGE="wave-cto:latest"
if ! docker images --format '{{.Repository}}:{{.Tag}}' | grep -q "$TEST_IMAGE"; then
    TEST_IMAGE=$(docker images --format '{{.Repository}}:{{.Tag}}' | grep -E '^wave-' | head -1)
fi

if [ -n "$TEST_IMAGE" ]; then
    echo -e "  Testing with image: ${CYAN}$TEST_IMAGE${NC}"
    echo ""

    # Node.js
    NODE_VERSION=$(docker run --rm "$TEST_IMAGE" node --version 2>/dev/null || echo "")
    if [[ "$NODE_VERSION" == v20* ]]; then
        check_pass "Node.js: $NODE_VERSION"
    elif [ -n "$NODE_VERSION" ]; then
        check_warn "Node.js: $NODE_VERSION (expected v20.x)"
    else
        check_fail "Node.js: NOT FOUND"
    fi

    # Python
    PYTHON_VERSION=$(docker run --rm "$TEST_IMAGE" python3 --version 2>/dev/null || echo "")
    if [ -n "$PYTHON_VERSION" ]; then
        check_pass "Python: $PYTHON_VERSION"
    else
        check_fail "Python: NOT FOUND"
    fi

    # Git
    GIT_VERSION=$(docker run --rm "$TEST_IMAGE" git --version 2>/dev/null || echo "")
    if [ -n "$GIT_VERSION" ]; then
        check_pass "Git: $GIT_VERSION"
    else
        check_fail "Git: NOT FOUND"
    fi

    # jq
    JQ_VERSION=$(docker run --rm "$TEST_IMAGE" jq --version 2>/dev/null || echo "")
    if [ -n "$JQ_VERSION" ]; then
        check_pass "jq: $JQ_VERSION"
    else
        check_fail "jq: NOT FOUND"
    fi

    # Bash
    BASH_VERSION=$(docker run --rm "$TEST_IMAGE" bash --version 2>/dev/null | head -1 || echo "")
    if [ -n "$BASH_VERSION" ]; then
        check_pass "Bash: available"
    else
        check_fail "Bash: NOT FOUND"
    fi

    # Claude Code CLI
    CLAUDE_VERSION=$(docker run --rm "$TEST_IMAGE" claude --version 2>/dev/null || echo "")
    if [ -n "$CLAUDE_VERSION" ]; then
        check_pass "Claude Code CLI: $CLAUDE_VERSION"
    else
        check_warn "Claude Code CLI: Not found (may be installed differently)"
    fi
else
    check_fail "No WAVE image found for testing"
fi

# ─────────────────────────────────────────────────────────────────────────────
# 3. ENVIRONMENT VARIABLES
# ─────────────────────────────────────────────────────────────────────────────

print_header "3. ENVIRONMENT CONFIGURATION"

if [ -n "$TEST_IMAGE" ]; then
    # Check default environment variables in image
    ENV_VARS=$(docker inspect "$TEST_IMAGE" --format '{{range .Config.Env}}{{println .}}{{end}}' 2>/dev/null || echo "")

    REQUIRED_ENV=(
        "WAVE_HOME"
        "PROJECT_PATH"
        "PYTHONUNBUFFERED"
    )

    for var in "${REQUIRED_ENV[@]}"; do
        if echo "$ENV_VARS" | grep -q "^${var}="; then
            VALUE=$(echo "$ENV_VARS" | grep "^${var}=" | cut -d'=' -f2)
            check_pass "ENV: $var=$VALUE"
        else
            check_warn "ENV: $var (set at runtime)"
        fi
    done

    # Check runtime env vars from docker-compose
    if [ -f "/Volumes/SSD-01/Projects/WAVE/.env" ]; then
        check_pass "WAVE .env file exists"

        # Check critical runtime vars
        source /Volumes/SSD-01/Projects/WAVE/.env 2>/dev/null || true

        if [ -n "${ANTHROPIC_API_KEY:-}" ]; then
            check_pass "ANTHROPIC_API_KEY: configured (${#ANTHROPIC_API_KEY} chars)"
        else
            check_fail "ANTHROPIC_API_KEY: NOT SET"
        fi

        if [ -n "${SLACK_WEBHOOK_URL:-}" ]; then
            check_pass "SLACK_WEBHOOK_URL: configured"
        else
            check_warn "SLACK_WEBHOOK_URL: not set"
        fi

        if [ -n "${PROJECT_PATH:-}" ]; then
            check_pass "PROJECT_PATH: $PROJECT_PATH"
        else
            check_warn "PROJECT_PATH: not set (will use default)"
        fi
    else
        check_fail "WAVE .env file NOT FOUND"
    fi
fi

# ─────────────────────────────────────────────────────────────────────────────
# 4. VOLUME MOUNT POINTS
# ─────────────────────────────────────────────────────────────────────────────

print_header "4. VOLUME MOUNT POINTS"

if [ -n "$TEST_IMAGE" ]; then
    # Check expected directories exist in image
    EXPECTED_DIRS=(
        "/project"
        "/scripts"
        "/wave"
    )

    for dir in "${EXPECTED_DIRS[@]}"; do
        if docker run --rm "$TEST_IMAGE" test -d "$dir" 2>/dev/null; then
            check_pass "Directory: $dir exists"
        else
            check_warn "Directory: $dir (created at runtime)"
        fi
    done

    # Check project path exists on host
    PROJECT_PATH="${PROJECT_PATH:-/Volumes/SSD-01/Projects/Footprint/footprint}"
    if [ -d "$PROJECT_PATH" ]; then
        check_pass "Host project path: $PROJECT_PATH"
    else
        check_fail "Host project path: $PROJECT_PATH NOT FOUND"
    fi

    # Check worktrees
    if [ -d "$PROJECT_PATH/worktrees" ]; then
        WORKTREE_COUNT=$(ls -d "$PROJECT_PATH/worktrees"/*/ 2>/dev/null | wc -l | tr -d ' ')
        check_pass "Worktrees directory: $WORKTREE_COUNT worktrees"
    else
        check_warn "Worktrees directory: not created yet"
    fi
fi

# ─────────────────────────────────────────────────────────────────────────────
# 5. NETWORK CONNECTIVITY
# ─────────────────────────────────────────────────────────────────────────────

print_header "5. NETWORK CONNECTIVITY"

# Check wave-network exists
if docker network ls --format '{{.Name}}' | grep -q "wave-network"; then
    check_pass "Docker network: wave-network exists"
else
    check_warn "Docker network: wave-network (will be created)"
fi

# Check Redis container
if docker ps --format '{{.Names}}' | grep -q "wave-redis"; then
    check_pass "Redis container: running"

    # Test Redis connectivity
    REDIS_PING=$(docker exec wave-redis redis-cli ping 2>/dev/null || echo "")
    if [ "$REDIS_PING" = "PONG" ]; then
        check_pass "Redis connectivity: PONG"
    else
        check_fail "Redis connectivity: no response"
    fi
else
    check_warn "Redis container: not running"
fi

# Check Dozzle
if docker ps --format '{{.Names}}' | grep -qE "wave-dozzle|dozzle"; then
    DOZZLE_PORT=$(docker port wave-dozzle 8080 2>/dev/null | cut -d: -f2 || echo "9080")
    check_pass "Dozzle: running on port ${DOZZLE_PORT:-9080}"
else
    check_warn "Dozzle: not running"
fi

# ─────────────────────────────────────────────────────────────────────────────
# 6. ENTRY POINT & USER
# ─────────────────────────────────────────────────────────────────────────────

print_header "6. ENTRY POINT & USER CONFIGURATION"

if [ -n "$TEST_IMAGE" ]; then
    # Check entrypoint
    ENTRYPOINT=$(docker inspect "$TEST_IMAGE" --format '{{.Config.Entrypoint}}' 2>/dev/null || echo "")
    if [ -n "$ENTRYPOINT" ] && [ "$ENTRYPOINT" != "[]" ]; then
        check_pass "Entrypoint: $ENTRYPOINT"
    else
        check_warn "Entrypoint: using default"
    fi

    # Check user
    USER=$(docker inspect "$TEST_IMAGE" --format '{{.Config.User}}' 2>/dev/null || echo "")
    if [ "$USER" = "wave" ] || [ "$USER" = "1001" ]; then
        check_pass "User: $USER (non-root)"
    elif [ -z "$USER" ] || [ "$USER" = "root" ]; then
        check_warn "User: running as root"
    else
        check_pass "User: $USER"
    fi

    # Check working directory
    WORKDIR=$(docker inspect "$TEST_IMAGE" --format '{{.Config.WorkingDir}}' 2>/dev/null || echo "")
    if [ -n "$WORKDIR" ]; then
        check_pass "WorkingDir: $WORKDIR"
    else
        check_warn "WorkingDir: not set"
    fi
fi

# ─────────────────────────────────────────────────────────────────────────────
# 7. HEALTH CHECK
# ─────────────────────────────────────────────────────────────────────────────

print_header "7. HEALTH CHECK CONFIGURATION"

if [ -n "$TEST_IMAGE" ]; then
    HEALTHCHECK=$(docker inspect "$TEST_IMAGE" --format '{{.Config.Healthcheck}}' 2>/dev/null || echo "")
    if [ -n "$HEALTHCHECK" ] && [ "$HEALTHCHECK" != "<nil>" ]; then
        check_pass "Health check: configured"
    else
        check_warn "Health check: not configured"
    fi
fi

# ─────────────────────────────────────────────────────────────────────────────
# 8. API CONNECTIVITY (Full test only)
# ─────────────────────────────────────────────────────────────────────────────

if [ "$FULL_TEST" = "--full" ]; then
    print_header "8. API CONNECTIVITY (Full Test)"

    # Load API key
    source /Volumes/SSD-01/Projects/WAVE/.env 2>/dev/null || true

    # Test Anthropic API
    if [ -n "${ANTHROPIC_API_KEY:-}" ]; then
        echo -e "  Testing Anthropic API..."
        API_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" \
            -H "x-api-key: $ANTHROPIC_API_KEY" \
            -H "anthropic-version: 2023-06-01" \
            "https://api.anthropic.com/v1/messages" \
            -X POST \
            -H "Content-Type: application/json" \
            -d '{"model":"claude-3-haiku-20240307","max_tokens":1,"messages":[{"role":"user","content":"hi"}]}' \
            2>/dev/null || echo "000")

        if [ "$API_RESPONSE" = "200" ]; then
            check_pass "Anthropic API: connected (HTTP 200)"
        elif [ "$API_RESPONSE" = "401" ]; then
            check_fail "Anthropic API: invalid key (HTTP 401)"
        elif [ "$API_RESPONSE" = "429" ]; then
            check_warn "Anthropic API: rate limited (HTTP 429)"
        else
            check_warn "Anthropic API: HTTP $API_RESPONSE"
        fi
    else
        check_fail "Anthropic API: no key configured"
    fi

    # Test Slack
    if [ -n "${SLACK_WEBHOOK_URL:-}" ]; then
        SLACK_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" \
            -X POST "$SLACK_WEBHOOK_URL" \
            -H "Content-Type: application/json" \
            -d '{"text":"Docker validation test"}' \
            2>/dev/null || echo "000")

        if [ "$SLACK_RESPONSE" = "200" ]; then
            check_pass "Slack webhook: connected (HTTP 200)"
        else
            check_warn "Slack webhook: HTTP $SLACK_RESPONSE"
        fi
    fi
fi

# ─────────────────────────────────────────────────────────────────────────────
# 9. AGENT MODEL CONFIGURATION
# ─────────────────────────────────────────────────────────────────────────────

print_header "9. AGENT MODEL CONFIGURATION"

# Parse docker-compose for model assignments
COMPOSE_FILE="/Volumes/SSD-01/Projects/WAVE/docker-compose.yml"
if [ -f "$COMPOSE_FILE" ]; then
    echo -e "  ${CYAN}Agent Model Assignments:${NC}"

    # CTO - Opus
    if grep -A20 "cto:" "$COMPOSE_FILE" | grep -q "claude-opus"; then
        check_pass "CTO: Claude Opus 4.5"
    else
        check_warn "CTO: model not specified"
    fi

    # PM - Opus
    if grep -A20 "pm:" "$COMPOSE_FILE" | grep -q "claude-opus"; then
        check_pass "PM: Claude Opus 4.5"
    else
        check_warn "PM: model not specified"
    fi

    # FE-Dev - Sonnet
    if grep -A20 "fe-dev" "$COMPOSE_FILE" | grep -q "claude-sonnet"; then
        check_pass "FE-Dev: Claude Sonnet 4"
    else
        check_warn "FE-Dev: model not specified"
    fi

    # BE-Dev - Sonnet
    if grep -A20 "be-dev" "$COMPOSE_FILE" | grep -q "claude-sonnet"; then
        check_pass "BE-Dev: Claude Sonnet 4"
    else
        check_warn "BE-Dev: model not specified"
    fi

    # QA - Haiku
    if grep -A20 "qa:" "$COMPOSE_FILE" | grep -q "claude-haiku"; then
        check_pass "QA: Claude Haiku 4"
    else
        check_warn "QA: model not specified"
    fi
else
    check_fail "docker-compose.yml not found"
fi

# ─────────────────────────────────────────────────────────────────────────────
# SUMMARY
# ─────────────────────────────────────────────────────────────────────────────

echo ""
echo -e "${CYAN}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║                   VALIDATION SUMMARY                          ║${NC}"
echo -e "${CYAN}╠═══════════════════════════════════════════════════════════════╣${NC}"
echo -e "${CYAN}║${NC}  ${GREEN}PASSED:${NC}   $PASSED                                              ${CYAN}║${NC}"
echo -e "${CYAN}║${NC}  ${YELLOW}WARNINGS:${NC} $WARNINGS                                              ${CYAN}║${NC}"
echo -e "${CYAN}║${NC}  ${RED}FAILED:${NC}   $FAILED                                              ${CYAN}║${NC}"
echo -e "${CYAN}╠═══════════════════════════════════════════════════════════════╣${NC}"

if [ $FAILED -eq 0 ]; then
    echo -e "${CYAN}║${NC}  ${GREEN}STATUS: DOCKER IMAGES READY${NC}                                 ${CYAN}║${NC}"
else
    echo -e "${CYAN}║${NC}  ${RED}STATUS: ISSUES FOUND - FIX BEFORE LAUNCH${NC}                    ${CYAN}║${NC}"
fi

echo -e "${CYAN}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Exit code
if [ $FAILED -gt 0 ]; then
    exit 1
fi

exit 0
