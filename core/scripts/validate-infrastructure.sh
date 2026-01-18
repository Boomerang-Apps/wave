#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# WAVE INFRASTRUCTURE VALIDATOR
# ═══════════════════════════════════════════════════════════════════════════════
# Validates all infrastructure components before pipeline launch
# MUST PASS before any wave can be started
# ═══════════════════════════════════════════════════════════════════════════════

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
PASS_COUNT=0
FAIL_COUNT=0
WARN_COUNT=0

# ─────────────────────────────────────────────────────────────────────────────
# HELPER FUNCTIONS
# ─────────────────────────────────────────────────────────────────────────────

log_pass() {
    echo -e "${GREEN}[PASS]${NC} $1"
    ((PASS_COUNT++))
}

log_fail() {
    echo -e "${RED}[FAIL]${NC} $1"
    ((FAIL_COUNT++))
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
    ((WARN_COUNT++))
}

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_section() {
    echo ""
    echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE} $1${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
}

# ─────────────────────────────────────────────────────────────────────────────
# LOAD ENVIRONMENT
# ─────────────────────────────────────────────────────────────────────────────

PROJECT_ROOT="${1:-.}"
cd "$PROJECT_ROOT"

log_section "WAVE INFRASTRUCTURE VALIDATOR"
echo "Project: $PROJECT_ROOT"
echo "Date: $(date '+%Y-%m-%d %H:%M:%S')"

# Load environment file
if [ -f ".env" ]; then
    source .env
    log_pass "Environment file loaded"
else
    log_fail "No .env file found"
    exit 1
fi

# ─────────────────────────────────────────────────────────────────────────────
# SECTION 1: SUPABASE DATABASE
# ─────────────────────────────────────────────────────────────────────────────

log_section "1. SUPABASE DATABASE"

# Check required variables
if [ -z "${NEXT_PUBLIC_SUPABASE_URL:-}" ]; then
    log_fail "NEXT_PUBLIC_SUPABASE_URL not set"
else
    log_pass "NEXT_PUBLIC_SUPABASE_URL set: ${NEXT_PUBLIC_SUPABASE_URL:0:40}..."
fi

if [ -z "${NEXT_PUBLIC_SUPABASE_ANON_KEY:-}" ]; then
    log_fail "NEXT_PUBLIC_SUPABASE_ANON_KEY not set"
else
    log_pass "NEXT_PUBLIC_SUPABASE_ANON_KEY set (length: ${#NEXT_PUBLIC_SUPABASE_ANON_KEY})"
fi

# Test database connection
log_info "Testing database connection..."
DB_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" \
    "${NEXT_PUBLIC_SUPABASE_URL}/rest/v1/" \
    -H "apikey: ${NEXT_PUBLIC_SUPABASE_ANON_KEY}" \
    -H "Authorization: Bearer ${NEXT_PUBLIC_SUPABASE_ANON_KEY}" \
    2>/dev/null || echo "000")

if [ "$DB_RESPONSE" = "200" ]; then
    log_pass "Database connection successful (HTTP $DB_RESPONSE)"
else
    log_fail "Database connection failed (HTTP $DB_RESPONSE)"
fi

# Check photos table exists
log_info "Checking photos table..."
PHOTOS_CHECK=$(curl -s \
    "${NEXT_PUBLIC_SUPABASE_URL}/rest/v1/photos?select=count" \
    -H "apikey: ${NEXT_PUBLIC_SUPABASE_ANON_KEY}" \
    -H "Authorization: Bearer ${NEXT_PUBLIC_SUPABASE_ANON_KEY}" \
    2>/dev/null || echo "error")

if [[ "$PHOTOS_CHECK" == *"count"* ]] || [[ "$PHOTOS_CHECK" == "["* ]]; then
    log_pass "Photos table exists and accessible"
else
    log_fail "Photos table not accessible: $PHOTOS_CHECK"
fi

# ─────────────────────────────────────────────────────────────────────────────
# SECTION 2: SUPABASE STORAGE
# ─────────────────────────────────────────────────────────────────────────────

log_section "2. SUPABASE STORAGE"

# Check storage buckets
log_info "Checking storage buckets..."
BUCKETS=$(curl -s \
    "${NEXT_PUBLIC_SUPABASE_URL}/storage/v1/bucket" \
    -H "apikey: ${NEXT_PUBLIC_SUPABASE_ANON_KEY}" \
    -H "Authorization: Bearer ${NEXT_PUBLIC_SUPABASE_ANON_KEY}" \
    2>/dev/null || echo "[]")

if [[ "$BUCKETS" == *"photos"* ]]; then
    log_pass "Storage bucket 'photos' exists"

    # Check if bucket is public
    if [[ "$BUCKETS" == *'"public":true'* ]] || [[ "$BUCKETS" == *'"public": true'* ]]; then
        log_pass "Storage bucket 'photos' is PUBLIC"
    else
        log_warn "Storage bucket 'photos' may not be public - uploads might fail"
    fi
else
    log_fail "Storage bucket 'photos' NOT FOUND - uploads will fail!"
    echo "       → Create bucket at: ${NEXT_PUBLIC_SUPABASE_URL/\.supabase\.co/}/storage/buckets"
fi

# ─────────────────────────────────────────────────────────────────────────────
# SECTION 3: GITHUB
# ─────────────────────────────────────────────────────────────────────────────

log_section "3. GITHUB"

# Check GitHub token
if [ -z "${GITHUB_TOKEN:-}" ]; then
    log_fail "GITHUB_TOKEN not set"
else
    log_pass "GITHUB_TOKEN set (length: ${#GITHUB_TOKEN})"
fi

# Check GitHub repo
if [ -z "${GITHUB_REPO:-}" ]; then
    log_fail "GITHUB_REPO not set"
else
    log_pass "GITHUB_REPO set: $GITHUB_REPO"

    # Test repo access
    log_info "Testing repository access..."
    REPO_CHECK=$(gh repo view "$GITHUB_REPO" --json name 2>/dev/null || echo "error")

    if [[ "$REPO_CHECK" == *"name"* ]]; then
        log_pass "Repository accessible via GitHub CLI"
    else
        log_warn "Cannot verify repository access - check GITHUB_TOKEN permissions"
    fi
fi

# Check git remote
if git remote -v 2>/dev/null | grep -q "origin"; then
    REMOTE_URL=$(git remote get-url origin 2>/dev/null || echo "none")
    log_pass "Git remote configured: $REMOTE_URL"
else
    log_fail "No git remote 'origin' configured"
fi

# ─────────────────────────────────────────────────────────────────────────────
# SECTION 4: VERCEL
# ─────────────────────────────────────────────────────────────────────────────

log_section "4. VERCEL"

# Check Vercel token
if [ -z "${VERCEL_TOKEN:-}" ]; then
    log_warn "VERCEL_TOKEN not set - cannot verify Vercel configuration"
else
    log_pass "VERCEL_TOKEN set (length: ${#VERCEL_TOKEN})"
fi

# Check Vercel project ID
if [ -z "${VERCEL_PROJECT_ID:-}" ]; then
    log_warn "VERCEL_PROJECT_ID not set"
else
    log_pass "VERCEL_PROJECT_ID set: $VERCEL_PROJECT_ID"
fi

# ─────────────────────────────────────────────────────────────────────────────
# SECTION 5: SLACK
# ─────────────────────────────────────────────────────────────────────────────

log_section "5. SLACK"

# Check Slack webhook
if [ -z "${SLACK_WEBHOOK_URL:-}" ]; then
    log_fail "SLACK_WEBHOOK_URL not set - notifications will not work"
else
    log_pass "SLACK_WEBHOOK_URL set"

    # Test Slack webhook
    log_info "Testing Slack webhook..."
    SLACK_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" \
        -X POST "$SLACK_WEBHOOK_URL" \
        -H "Content-Type: application/json" \
        -d '{"text":"Infrastructure validation test - ignore this message"}' \
        2>/dev/null || echo "000")

    if [ "$SLACK_RESPONSE" = "200" ]; then
        log_pass "Slack webhook working (HTTP $SLACK_RESPONSE)"
    else
        log_fail "Slack webhook failed (HTTP $SLACK_RESPONSE)"
    fi
fi

# ─────────────────────────────────────────────────────────────────────────────
# SECTION 6: ANTHROPIC API
# ─────────────────────────────────────────────────────────────────────────────

log_section "6. ANTHROPIC API"

# Check Anthropic API key
if [ -z "${ANTHROPIC_API_KEY:-}" ]; then
    log_fail "ANTHROPIC_API_KEY not set - agents will not work"
else
    log_pass "ANTHROPIC_API_KEY set (starts with: ${ANTHROPIC_API_KEY:0:10}...)"
fi

# ─────────────────────────────────────────────────────────────────────────────
# SECTION 7: DOCKER
# ─────────────────────────────────────────────────────────────────────────────

log_section "7. DOCKER"

# Check Docker
if command -v docker &> /dev/null; then
    DOCKER_VERSION=$(docker --version 2>/dev/null | cut -d' ' -f3 | tr -d ',')
    log_pass "Docker installed: $DOCKER_VERSION"
else
    log_fail "Docker not installed"
fi

# Check Docker running
if docker info &> /dev/null; then
    log_pass "Docker daemon running"
else
    log_fail "Docker daemon not running"
fi

# Check agent image
if docker images maf-claude-agent:latest --format "{{.Repository}}" 2>/dev/null | grep -q "maf-claude-agent"; then
    IMAGE_SIZE=$(docker images maf-claude-agent:latest --format "{{.Size}}" 2>/dev/null)
    log_pass "Agent image exists: maf-claude-agent:latest ($IMAGE_SIZE)"
else
    log_fail "Agent image 'maf-claude-agent:latest' not found"
    echo "       → Build with: docker build -t maf-claude-agent:latest -f Dockerfile.agent ."
fi

# ─────────────────────────────────────────────────────────────────────────────
# SECTION 8: LOCAL FILES
# ─────────────────────────────────────────────────────────────────────────────

log_section "8. LOCAL FILES"

# Check required files
REQUIRED_FILES=(
    "CLAUDE.md"
    "docker-compose-v11.2.yml"
    "scripts/merge-watcher-v11.2.sh"
    "scripts/setup-worktrees.sh"
)

for file in "${REQUIRED_FILES[@]}"; do
    if [ -f "$file" ]; then
        log_pass "File exists: $file"
    else
        log_fail "File missing: $file"
    fi
done

# Check stories directory
if [ -d "stories" ]; then
    STORY_COUNT=$(find stories -name "*.json" 2>/dev/null | wc -l | tr -d ' ')
    log_pass "Stories directory exists ($STORY_COUNT story files)"
else
    log_fail "Stories directory missing"
fi

# ─────────────────────────────────────────────────────────────────────────────
# SUMMARY
# ─────────────────────────────────────────────────────────────────────────────

log_section "SUMMARY"

echo ""
echo "Results:"
echo -e "  ${GREEN}PASSED: $PASS_COUNT${NC}"
echo -e "  ${RED}FAILED: $FAIL_COUNT${NC}"
echo -e "  ${YELLOW}WARNINGS: $WARN_COUNT${NC}"
echo ""

if [ $FAIL_COUNT -gt 0 ]; then
    echo -e "${RED}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${RED} INFRASTRUCTURE VALIDATION FAILED${NC}"
    echo -e "${RED} Fix the above issues before launching any wave${NC}"
    echo -e "${RED}═══════════════════════════════════════════════════════════════${NC}"
    exit 1
else
    echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN} ALL INFRASTRUCTURE CHECKS PASSED${NC}"
    echo -e "${GREEN} Ready to proceed with wave pre-flight${NC}"
    echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
    exit 0
fi
