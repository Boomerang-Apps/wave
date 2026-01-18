#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# WAVE-SPECIFIC PRE-FLIGHT VALIDATOR
# ═══════════════════════════════════════════════════════════════════════════════
# Validates all wave-specific components before launch
# Run AFTER infrastructure validation passes
# Usage: ./wave-preflight.sh <wave_number> [project_root]
# ═══════════════════════════════════════════════════════════════════════════════

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

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
    echo -e "${CYAN}───────────────────────────────────────────────────────────────${NC}"
    echo -e "${CYAN} $1${NC}"
    echo -e "${CYAN}───────────────────────────────────────────────────────────────${NC}"
}

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
cd "$PROJECT_ROOT"

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE} WAVE $WAVE PRE-FLIGHT VALIDATION${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo "Project: $PROJECT_ROOT"
echo "Wave: $WAVE"
echo "Date: $(date '+%Y-%m-%d %H:%M:%S')"

# Load environment
if [ -f ".env" ]; then
    source .env
fi

# ─────────────────────────────────────────────────────────────────────────────
# SECTION 1: WAVE STORIES
# ─────────────────────────────────────────────────────────────────────────────

log_section "1. WAVE $WAVE STORIES"

STORIES_DIR="stories/wave${WAVE}"

# Check stories directory exists
if [ -d "$STORIES_DIR" ]; then
    log_pass "Stories directory exists: $STORIES_DIR"
else
    log_fail "Stories directory NOT FOUND: $STORIES_DIR"
    echo "       → Create stories for Wave $WAVE first"
fi

# Count story files
STORY_FILES=$(find "$STORIES_DIR" -name "*.json" 2>/dev/null || echo "")
STORY_COUNT=$(echo "$STORY_FILES" | grep -c "\.json$" 2>/dev/null || echo "0")

if [ "$STORY_COUNT" -gt 0 ]; then
    log_pass "Found $STORY_COUNT story files for Wave $WAVE"

    # List stories
    echo ""
    echo "Stories:"
    for story in $STORY_FILES; do
        STORY_ID=$(jq -r '.id // "unknown"' "$story" 2>/dev/null || echo "unknown")
        STORY_TITLE=$(jq -r '.title // "unknown"' "$story" 2>/dev/null || echo "unknown")
        STORY_AGENT=$(jq -r '.agent // "unknown"' "$story" 2>/dev/null || echo "unknown")
        echo "  - $STORY_ID: $STORY_TITLE (agent: $STORY_AGENT)"
    done
    echo ""
else
    log_fail "No story files found in $STORIES_DIR"
fi

# Validate story JSON structure
log_info "Validating story file structure..."
for story in $STORY_FILES; do
    STORY_NAME=$(basename "$story")

    # Check JSON validity
    if ! jq empty "$story" 2>/dev/null; then
        log_fail "Invalid JSON: $STORY_NAME"
        continue
    fi

    # Check required fields
    MISSING_FIELDS=""
    for field in id title wave status agent acceptance_criteria; do
        if [ "$(jq -r ".$field // \"missing\"" "$story" 2>/dev/null)" = "missing" ] || \
           [ "$(jq -r ".$field // \"missing\"" "$story" 2>/dev/null)" = "null" ]; then
            MISSING_FIELDS="$MISSING_FIELDS $field"
        fi
    done

    if [ -n "$MISSING_FIELDS" ]; then
        log_warn "$STORY_NAME missing fields:$MISSING_FIELDS"
    else
        log_pass "$STORY_NAME structure valid"
    fi
done

# ─────────────────────────────────────────────────────────────────────────────
# SECTION 2: DOCKER COMPOSE CONFIGURATION
# ─────────────────────────────────────────────────────────────────────────────

log_section "2. DOCKER COMPOSE CONFIGURATION"

COMPOSE_FILE="docker-compose-v11.2.yml"

if [ ! -f "$COMPOSE_FILE" ]; then
    log_fail "Docker compose file not found: $COMPOSE_FILE"
else
    log_pass "Docker compose file exists"

    # Check for wave-specific services
    FE_SERVICE="wave${WAVE}-fe-dev"
    BE_SERVICE="wave${WAVE}-be-dev"
    QA_SERVICE="wave${WAVE}-qa"

    if grep -q "$FE_SERVICE:" "$COMPOSE_FILE" 2>/dev/null; then
        log_pass "Service defined: $FE_SERVICE"
    else
        log_fail "Service NOT defined: $FE_SERVICE"
        echo "       → Add wave${WAVE} services to $COMPOSE_FILE"
    fi

    if grep -q "$BE_SERVICE:" "$COMPOSE_FILE" 2>/dev/null; then
        log_pass "Service defined: $BE_SERVICE"
    else
        log_fail "Service NOT defined: $BE_SERVICE"
    fi

    if grep -q "$QA_SERVICE:" "$COMPOSE_FILE" 2>/dev/null; then
        log_pass "Service defined: $QA_SERVICE"
    else
        log_fail "Service NOT defined: $QA_SERVICE"
    fi

    # Check story paths in prompts
    if grep -q "stories/wave${WAVE}" "$COMPOSE_FILE" 2>/dev/null; then
        log_pass "Story path configured for Wave $WAVE"
    else
        log_warn "Story path 'stories/wave${WAVE}' not found in compose file"
    fi
fi

# ─────────────────────────────────────────────────────────────────────────────
# SECTION 3: GIT WORKTREES
# ─────────────────────────────────────────────────────────────────────────────

log_section "3. GIT WORKTREES"

WORKTREES=("fe-dev" "be-dev" "qa" "dev-fix")

# Check worktrees exist
for wt in "${WORKTREES[@]}"; do
    WT_PATH="worktrees/$wt"
    if [ -d "$WT_PATH" ]; then
        log_pass "Worktree exists: $wt"
    else
        log_fail "Worktree missing: $wt"
        echo "       → Run: ./scripts/setup-worktrees.sh"
    fi
done

# Check worktree status
log_info "Checking worktree sync status..."
MAIN_COMMIT=$(git rev-parse HEAD 2>/dev/null || echo "unknown")
echo "Main branch commit: ${MAIN_COMMIT:0:8}"

for wt in "${WORKTREES[@]}"; do
    WT_PATH="worktrees/$wt"
    if [ -d "$WT_PATH" ]; then
        WT_COMMIT=$(git -C "$WT_PATH" rev-parse HEAD 2>/dev/null || echo "unknown")
        WT_BRANCH=$(git -C "$WT_PATH" branch --show-current 2>/dev/null || echo "unknown")

        # Check for uncommitted changes
        UNCOMMITTED=$(git -C "$WT_PATH" status --porcelain 2>/dev/null | wc -l | tr -d ' ')

        if [ "$UNCOMMITTED" -gt 0 ]; then
            log_warn "Worktree $wt has $UNCOMMITTED uncommitted changes"
        else
            log_pass "Worktree $wt is clean (branch: $WT_BRANCH)"
        fi
    fi
done

# ─────────────────────────────────────────────────────────────────────────────
# SECTION 4: MERGE WATCHER CONFIGURATION
# ─────────────────────────────────────────────────────────────────────────────

log_section "4. MERGE WATCHER"

MW_SCRIPT="scripts/merge-watcher-v11.2.sh"

if [ -f "$MW_SCRIPT" ]; then
    log_pass "Merge watcher script exists"

    # Check if script is executable
    if [ -x "$MW_SCRIPT" ]; then
        log_pass "Merge watcher is executable"
    else
        log_warn "Merge watcher not executable - run: chmod +x $MW_SCRIPT"
    fi

    # Check for wave signal pattern
    if grep -q "wave${WAVE}" "$MW_SCRIPT" 2>/dev/null || grep -q 'wave\${WAVE}' "$MW_SCRIPT" 2>/dev/null || grep -q 'wave$WAVE' "$MW_SCRIPT" 2>/dev/null; then
        log_pass "Merge watcher has wave variable support"
    else
        log_warn "Merge watcher may not support dynamic wave numbers"
    fi
else
    log_fail "Merge watcher script not found: $MW_SCRIPT"
fi

# ─────────────────────────────────────────────────────────────────────────────
# SECTION 5: SIGNAL DIRECTORY
# ─────────────────────────────────────────────────────────────────────────────

log_section "5. SIGNAL DIRECTORY"

SIGNAL_DIR=".claude"

if [ -d "$SIGNAL_DIR" ]; then
    log_pass "Signal directory exists: $SIGNAL_DIR"

    # Check for existing wave signals (should be clean)
    EXISTING_SIGNALS=$(find "$SIGNAL_DIR" -name "signal-wave${WAVE}-*.json" 2>/dev/null | wc -l | tr -d ' ')

    if [ "$EXISTING_SIGNALS" -gt 0 ]; then
        log_warn "Found $EXISTING_SIGNALS existing Wave $WAVE signals - consider cleaning"
        find "$SIGNAL_DIR" -name "signal-wave${WAVE}-*.json" 2>/dev/null | while read signal; do
            echo "       - $(basename "$signal")"
        done
    else
        log_pass "No existing Wave $WAVE signals (clean state)"
    fi
else
    log_fail "Signal directory missing: $SIGNAL_DIR"
    echo "       → Run: mkdir -p $SIGNAL_DIR"
fi

# ─────────────────────────────────────────────────────────────────────────────
# SECTION 6: AGENT REQUIREMENTS
# ─────────────────────────────────────────────────────────────────────────────

log_section "6. AGENT REQUIREMENTS"

# Determine required agents from stories
FE_STORIES=$(find "$STORIES_DIR" -name "*.json" -exec grep -l '"agent":\s*"frontend"' {} \; 2>/dev/null | wc -l | tr -d ' ')
BE_STORIES=$(find "$STORIES_DIR" -name "*.json" -exec grep -l '"agent":\s*"backend"' {} \; 2>/dev/null | wc -l | tr -d ' ')

echo "Agent assignments for Wave $WAVE:"
echo "  - Frontend stories: $FE_STORIES"
echo "  - Backend stories: $BE_STORIES"

if [ "$FE_STORIES" -gt 0 ]; then
    log_pass "FE-Dev agent required ($FE_STORIES stories)"
else
    log_info "FE-Dev agent will create NO_WORK_NEEDED signal"
fi

if [ "$BE_STORIES" -gt 0 ]; then
    log_pass "BE-Dev agent required ($BE_STORIES stories)"
else
    log_info "BE-Dev agent will create NO_WORK_NEEDED signal"
fi

log_pass "QA agent required (always)"

# ─────────────────────────────────────────────────────────────────────────────
# SUMMARY
# ─────────────────────────────────────────────────────────────────────────────

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE} WAVE $WAVE PRE-FLIGHT SUMMARY${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""
echo "Results:"
echo -e "  ${GREEN}PASSED: $PASS_COUNT${NC}"
echo -e "  ${RED}FAILED: $FAIL_COUNT${NC}"
echo -e "  ${YELLOW}WARNINGS: $WARN_COUNT${NC}"
echo ""

if [ $FAIL_COUNT -gt 0 ]; then
    echo -e "${RED}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${RED} WAVE $WAVE PRE-FLIGHT FAILED${NC}"
    echo -e "${RED} Fix the above issues before launching Wave $WAVE${NC}"
    echo -e "${RED}═══════════════════════════════════════════════════════════════${NC}"
    exit 1
else
    echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN} WAVE $WAVE PRE-FLIGHT PASSED${NC}"
    echo -e "${GREEN} Ready for launch - run maf-launch.sh${NC}"
    echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
    exit 0
fi
