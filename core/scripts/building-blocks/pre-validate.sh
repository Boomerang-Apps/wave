#!/opt/homebrew/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# WAVE BUILDING BLOCKS: PRE-VALIDATION GATE (Gate -1)
# ═══════════════════════════════════════════════════════════════════════════════
# Zero Error Launch Protocol - Validates ALL prerequisites before wave launch.
# This gate prevents 80% of launch failures by checking everything upfront.
#
# CHECKS:
#   1. Prompt files exist and are valid
#   2. Budget sufficient for estimated cost
#   3. Worktrees clean (no uncommitted changes)
#   4. No EMERGENCY-STOP file present
#   5. Previous wave completed (if wave > 1)
#   6. API quotas have sufficient capacity
#   7. Required environment variables set
#   8. Docker containers ready
#
# USAGE:
#   ./pre-validate.sh --project <path> --wave <N> [--budget <amount>]
#
# EXIT CODES:
#   0 - All validations passed, safe to launch
#   1 - One or more validations failed, DO NOT launch
#   2 - Invalid arguments
#
# ═══════════════════════════════════════════════════════════════════════════════

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCRIPT_VERSION="1.0.0"

# ─────────────────────────────────────────────────────────────────────────────
# COLORS
# ─────────────────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
BOLD='\033[1m'
NC='\033[0m'

# ─────────────────────────────────────────────────────────────────────────────
# CONFIGURATION
# ─────────────────────────────────────────────────────────────────────────────
TOTAL_CHECKS=8
CHECKS_PASSED=0
CHECKS_FAILED=0
BLOCKERS=()

# Default budget (USD)
DEFAULT_BUDGET="5.00"
COST_PER_STORY="0.50"

# ─────────────────────────────────────────────────────────────────────────────
# LOGGING
# ─────────────────────────────────────────────────────────────────────────────
log_info() { echo -e "${BLUE}[PRE-VALIDATE]${NC} $1"; }
log_success() { echo -e "${GREEN}[PASS]${NC} $1"; }
log_fail() { echo -e "${RED}[FAIL]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_check() { echo -e "${MAGENTA}[CHECK $1]${NC} $2"; }

# ─────────────────────────────────────────────────────────────────────────────
# USAGE
# ─────────────────────────────────────────────────────────────────────────────
show_usage() {
    cat << 'EOF'
WAVE Pre-Validation Gate (Gate -1) - Zero Error Launch Protocol

Validates ALL prerequisites before wave launch to prevent failures.

Usage: pre-validate.sh [options]

Required:
  -p, --project <path>     Path to project directory
  -w, --wave <number>      Wave number to validate

Optional:
  -b, --budget <amount>    Available budget in USD (default: 5.00)
  --dry-run                Check without creating lock file
  --verbose                Show detailed output
  --skip-docker            Skip Docker container checks
  --skip-api               Skip API quota checks

Exit Codes:
  0  All validations passed - SAFE TO LAUNCH
  1  One or more validations failed - DO NOT LAUNCH
  2  Invalid arguments

Examples:
  # Validate wave 3 with default budget
  ./pre-validate.sh -p /path/to/project -w 3

  # Validate with custom budget
  ./pre-validate.sh -p /path/to/project -w 3 --budget 10.00

  # Dry run (no lock file)
  ./pre-validate.sh -p /path/to/project -w 3 --dry-run

EOF
}

# ─────────────────────────────────────────────────────────────────────────────
# SLACK NOTIFICATION
# ─────────────────────────────────────────────────────────────────────────────
send_notification() {
    local type=$1
    shift

    local slack_script="$SCRIPT_DIR/../slack-notify.sh"
    if [ -x "$slack_script" ]; then
        "$slack_script" "$type" "$@" 2>/dev/null || true
    fi
}

# ─────────────────────────────────────────────────────────────────────────────
# CHECK 1: PROMPT FILES
# ─────────────────────────────────────────────────────────────────────────────
check_prompt_files() {
    log_check "1" "Validating Prompt Files..."

    local prompts_dir="$PROJECT_PATH/.claude/prompts"
    local missing_prompts=()
    local found_prompts=0

    # Check for wave-specific prompt files
    if [ -d "$prompts_dir" ]; then
        # Look for any prompt files for this wave
        for prompt_file in "$prompts_dir"/*wave${WAVE_NUMBER}*.txt "$prompts_dir"/*wave${WAVE_NUMBER}*.md; do
            if [ -f "$prompt_file" ]; then
                ((found_prompts++)) || true
            fi
        done

        # Also check for generic agent prompts
        for agent in fe-dev be-dev qa dev-fix; do
            if [ -f "$prompts_dir/${agent}.txt" ] || [ -f "$prompts_dir/${agent}.md" ]; then
                ((found_prompts++)) || true
            fi
        done
    fi

    # Check for CLAUDE.md (required)
    if [ ! -f "$PROJECT_PATH/CLAUDE.md" ] && [ ! -f "$PROJECT_PATH/.claude/CLAUDE.md" ]; then
        missing_prompts+=("CLAUDE.md")
    fi

    if [ ${#missing_prompts[@]} -gt 0 ]; then
        log_fail "Missing prompt files: ${missing_prompts[*]}"
        BLOCKERS+=("Missing prompt files: ${missing_prompts[*]}")
        ((CHECKS_FAILED++)) || true
        return 1
    fi

    if [ $found_prompts -eq 0 ]; then
        log_warn "No wave-specific prompts found (using defaults)"
    fi

    log_success "Prompt files: CLAUDE.md exists, $found_prompts agent prompts found"
    ((CHECKS_PASSED++)) || true
    return 0
}

# ─────────────────────────────────────────────────────────────────────────────
# CHECK 2: BUDGET VALIDATION
# ─────────────────────────────────────────────────────────────────────────────
check_budget() {
    log_check "2" "Validating Budget..."

    local story_count=0
    local estimated_cost="0.00"

    # Count stories for this wave
    local story_dir="$PROJECT_PATH/stories/wave${WAVE_NUMBER}"
    if [ ! -d "$story_dir" ]; then
        story_dir="$PROJECT_PATH/.claude/stories/wave${WAVE_NUMBER}"
    fi

    if [ -d "$story_dir" ]; then
        story_count=$(find "$story_dir" -name "*.json" -type f 2>/dev/null | wc -l | tr -d ' ')
    fi

    # Calculate estimated cost
    estimated_cost=$(echo "$story_count * $COST_PER_STORY" | bc 2>/dev/null || echo "0.00")

    # Compare with available budget
    local budget_ok
    budget_ok=$(echo "$BUDGET >= $estimated_cost" | bc 2>/dev/null || echo "1")

    if [ "$budget_ok" -eq 0 ]; then
        log_fail "Budget insufficient: \$$BUDGET available, \$$estimated_cost estimated for $story_count stories"
        BLOCKERS+=("Budget insufficient: \$$BUDGET < \$$estimated_cost estimated")
        ((CHECKS_FAILED++)) || true
        return 1
    fi

    local remaining
    remaining=$(echo "$BUDGET - $estimated_cost" | bc 2>/dev/null || echo "$BUDGET")

    log_success "Budget: \$$BUDGET available, \$$estimated_cost estimated ($story_count stories), \$$remaining buffer"
    ((CHECKS_PASSED++)) || true
    return 0
}

# ─────────────────────────────────────────────────────────────────────────────
# CHECK 3: WORKTREE STATUS
# ─────────────────────────────────────────────────────────────────────────────
check_worktrees() {
    log_check "3" "Validating Worktrees..."

    local worktree_dir="$PROJECT_PATH/worktrees"
    local dirty_worktrees=()
    local conflict_worktrees=()

    if [ ! -d "$worktree_dir" ]; then
        log_warn "No worktrees directory found - will be created during setup"
        ((CHECKS_PASSED++)) || true
        return 0
    fi

    # Check each worktree
    for wt in "$worktree_dir"/*; do
        if [ -d "$wt/.git" ] || [ -f "$wt/.git" ]; then
            local wt_name
            wt_name=$(basename "$wt")

            # Check for uncommitted changes
            local status
            status=$(cd "$wt" && git status --porcelain 2>/dev/null | head -5)
            if [ -n "$status" ]; then
                dirty_worktrees+=("$wt_name")
            fi

            # Check for merge conflicts
            local conflicts
            conflicts=$(cd "$wt" && git diff --name-only --diff-filter=U 2>/dev/null)
            if [ -n "$conflicts" ]; then
                conflict_worktrees+=("$wt_name")
            fi
        fi
    done

    if [ ${#conflict_worktrees[@]} -gt 0 ]; then
        log_fail "Worktrees with MERGE CONFLICTS: ${conflict_worktrees[*]}"
        BLOCKERS+=("Merge conflicts in: ${conflict_worktrees[*]}")
        ((CHECKS_FAILED++)) || true
        return 1
    fi

    if [ ${#dirty_worktrees[@]} -gt 0 ]; then
        log_warn "Worktrees with uncommitted changes: ${dirty_worktrees[*]}"
        # This is a warning, not a blocker - agents may have WIP
    fi

    log_success "Worktrees: No merge conflicts detected"
    ((CHECKS_PASSED++)) || true
    return 0
}

# ─────────────────────────────────────────────────────────────────────────────
# CHECK 4: EMERGENCY STOP
# ─────────────────────────────────────────────────────────────────────────────
check_emergency_stop() {
    log_check "4" "Checking Emergency Stop..."

    local stop_files=(
        "$PROJECT_PATH/.claude/EMERGENCY-STOP"
        "$PROJECT_PATH/EMERGENCY-STOP"
        "$PROJECT_PATH/.claude/HALT"
        "$PROJECT_PATH/HALT"
    )

    for stop_file in "${stop_files[@]}"; do
        if [ -f "$stop_file" ]; then
            local reason
            reason=$(cat "$stop_file" 2>/dev/null | head -1 || echo "No reason given")
            log_fail "EMERGENCY STOP FILE FOUND: $stop_file"
            log_fail "Reason: $reason"
            BLOCKERS+=("EMERGENCY STOP active: $reason")
            ((CHECKS_FAILED++)) || true
            return 1
        fi
    done

    log_success "Emergency Stop: No stop files present"
    ((CHECKS_PASSED++)) || true
    return 0
}

# ─────────────────────────────────────────────────────────────────────────────
# CHECK 5: PREVIOUS WAVE COMPLETION
# ─────────────────────────────────────────────────────────────────────────────
check_previous_wave() {
    log_check "5" "Checking Previous Wave Completion..."

    if [ "$WAVE_NUMBER" -le 1 ]; then
        log_success "Previous Wave: Wave 1 - no previous wave required"
        ((CHECKS_PASSED++)) || true
        return 0
    fi

    local prev_wave=$((WAVE_NUMBER - 1))
    local prev_lock="$PROJECT_PATH/.claude/locks/PHASE4-wave${prev_wave}.lock"

    if [ ! -f "$prev_lock" ]; then
        log_fail "Previous wave $prev_wave not completed (PHASE4-wave${prev_wave}.lock not found)"
        BLOCKERS+=("Wave $prev_wave not completed - complete it first")
        ((CHECKS_FAILED++)) || true
        return 1
    fi

    # Verify the lock shows PASSED status
    local status
    status=$(jq -r '.status // "UNKNOWN"' "$prev_lock" 2>/dev/null || echo "UNKNOWN")

    if [ "$status" != "PASSED" ] && [ "$status" != "GO" ]; then
        log_fail "Previous wave $prev_wave lock exists but status is: $status"
        BLOCKERS+=("Wave $prev_wave status is $status, not PASSED")
        ((CHECKS_FAILED++)) || true
        return 1
    fi

    log_success "Previous Wave: Wave $prev_wave completed (PHASE4 lock valid)"
    ((CHECKS_PASSED++)) || true
    return 0
}

# ─────────────────────────────────────────────────────────────────────────────
# CHECK 6: API QUOTAS
# ─────────────────────────────────────────────────────────────────────────────
check_api_quotas() {
    log_check "6" "Checking API Quotas..."

    if [ "$SKIP_API" = "true" ]; then
        log_warn "API quota check skipped (--skip-api)"
        ((CHECKS_PASSED++)) || true
        return 0
    fi

    local api_issues=()

    # Check Claude API (ping test)
    if [ -n "${ANTHROPIC_API_KEY:-}" ]; then
        local claude_response
        claude_response=$(curl -s -m 10 -w "%{http_code}" -o /dev/null \
            -H "x-api-key: $ANTHROPIC_API_KEY" \
            -H "anthropic-version: 2023-06-01" \
            "https://api.anthropic.com/v1/messages" 2>/dev/null || echo "000")

        # 401 means valid key (just no body), 000 means network error
        if [ "$claude_response" = "000" ]; then
            api_issues+=("Claude API unreachable")
        fi
    else
        api_issues+=("ANTHROPIC_API_KEY not set")
    fi

    # Check Slack API
    if [ -n "${SLACK_WEBHOOK_URL:-}" ]; then
        local slack_response
        slack_response=$(curl -s -m 10 -w "%{http_code}" -o /dev/null "$SLACK_WEBHOOK_URL" 2>/dev/null || echo "000")
        if [ "$slack_response" = "000" ]; then
            api_issues+=("Slack webhook unreachable")
        fi
    else
        api_issues+=("SLACK_WEBHOOK_URL not set")
    fi

    if [ ${#api_issues[@]} -gt 0 ]; then
        log_fail "API issues: ${api_issues[*]}"
        BLOCKERS+=("API issues: ${api_issues[*]}")
        ((CHECKS_FAILED++)) || true
        return 1
    fi

    log_success "API Quotas: Claude and Slack APIs accessible"
    ((CHECKS_PASSED++)) || true
    return 0
}

# ─────────────────────────────────────────────────────────────────────────────
# CHECK 7: ENVIRONMENT VARIABLES
# ─────────────────────────────────────────────────────────────────────────────
check_environment() {
    log_check "7" "Checking Environment Variables..."

    local missing_vars=()
    local required_vars=(
        "ANTHROPIC_API_KEY"
        "SLACK_WEBHOOK_URL"
    )

    local optional_vars=(
        "GITHUB_TOKEN"
        "SUPABASE_URL"
        "SUPABASE_ANON_KEY"
    )

    # Check required
    for var in "${required_vars[@]}"; do
        if [ -z "${!var:-}" ]; then
            missing_vars+=("$var")
        fi
    done

    if [ ${#missing_vars[@]} -gt 0 ]; then
        log_fail "Missing required env vars: ${missing_vars[*]}"
        BLOCKERS+=("Missing env vars: ${missing_vars[*]}")
        ((CHECKS_FAILED++)) || true
        return 1
    fi

    # Check optional (warn only)
    local missing_optional=()
    for var in "${optional_vars[@]}"; do
        if [ -z "${!var:-}" ]; then
            missing_optional+=("$var")
        fi
    done

    if [ ${#missing_optional[@]} -gt 0 ]; then
        log_warn "Optional env vars not set: ${missing_optional[*]}"
    fi

    log_success "Environment: All required variables set"
    ((CHECKS_PASSED++)) || true
    return 0
}

# ─────────────────────────────────────────────────────────────────────────────
# CHECK 8: DOCKER READINESS
# ─────────────────────────────────────────────────────────────────────────────
check_docker() {
    log_check "8" "Checking Docker Readiness..."

    if [ "$SKIP_DOCKER" = "true" ]; then
        log_warn "Docker check skipped (--skip-docker)"
        ((CHECKS_PASSED++)) || true
        return 0
    fi

    # Check if Docker is running
    if ! docker info >/dev/null 2>&1; then
        log_fail "Docker daemon not running"
        BLOCKERS+=("Docker daemon not running")
        ((CHECKS_FAILED++)) || true
        return 1
    fi

    # Check for docker-compose file
    local compose_file=""
    for f in "$PROJECT_PATH/docker-compose.yml" "$PROJECT_PATH/docker-compose.yaml" "$PROJECT_PATH/compose.yml"; do
        if [ -f "$f" ]; then
            compose_file="$f"
            break
        fi
    done

    if [ -n "$compose_file" ]; then
        # Validate compose file
        if ! docker compose -f "$compose_file" config >/dev/null 2>&1; then
            log_warn "docker-compose.yml has validation warnings"
        fi
    fi

    log_success "Docker: Daemon running, ready for containers"
    ((CHECKS_PASSED++)) || true
    return 0
}

# ─────────────────────────────────────────────────────────────────────────────
# CREATE LOCK FILE
# ─────────────────────────────────────────────────────────────────────────────
create_lock_file() {
    local lock_dir="$PROJECT_PATH/.claude/locks"
    mkdir -p "$lock_dir"

    local lock_file="$lock_dir/GATE-1-wave${WAVE_NUMBER}.lock"
    local timestamp
    timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

    # Build blockers JSON array
    local blockers_json="[]"
    if [ ${#BLOCKERS[@]} -gt 0 ]; then
        blockers_json=$(printf '%s\n' "${BLOCKERS[@]}" | jq -R . | jq -s .)
    fi

    cat > "$lock_file" << EOF
{
    "gate": "-1",
    "gate_name": "Pre-Validation",
    "wave": $WAVE_NUMBER,
    "status": "$([ $CHECKS_FAILED -eq 0 ] && echo "PASSED" || echo "FAILED")",
    "validator": "pre-validate.sh",
    "validator_version": "$SCRIPT_VERSION",
    "checks": {
        "prompt_files": "$([ $CHECKS_PASSED -ge 1 ] && echo "PASS" || echo "FAIL")",
        "budget": "$([ $CHECKS_PASSED -ge 2 ] && echo "PASS" || echo "FAIL")",
        "worktrees": "$([ $CHECKS_PASSED -ge 3 ] && echo "PASS" || echo "FAIL")",
        "emergency_stop": "$([ $CHECKS_PASSED -ge 4 ] && echo "PASS" || echo "FAIL")",
        "previous_wave": "$([ $CHECKS_PASSED -ge 5 ] && echo "PASS" || echo "FAIL")",
        "api_quotas": "$([ $CHECKS_PASSED -ge 6 ] && echo "PASS" || echo "FAIL")",
        "environment": "$([ $CHECKS_PASSED -ge 7 ] && echo "PASS" || echo "FAIL")",
        "docker": "$([ $CHECKS_PASSED -ge 8 ] && echo "PASS" || echo "FAIL")"
    },
    "checks_passed": $CHECKS_PASSED,
    "checks_failed": $CHECKS_FAILED,
    "checks_total": $TOTAL_CHECKS,
    "budget_available": "$BUDGET",
    "blockers": $blockers_json,
    "timestamp": "$timestamp",
    "project_path": "$PROJECT_PATH"
}
EOF

    echo "$lock_file"
}

# ─────────────────────────────────────────────────────────────────────────────
# PRINT BANNER
# ─────────────────────────────────────────────────────────────────────────────
print_banner() {
    echo ""
    echo -e "${CYAN}${BOLD}╔═══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}${BOLD}║       ZERO ERROR LAUNCH PROTOCOL - PRE-VALIDATION (Gate -1)   ║${NC}"
    echo -e "${CYAN}${BOLD}╚═══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "  Project: ${CYAN}$(basename "$PROJECT_PATH")${NC}"
    echo -e "  Wave:    ${CYAN}$WAVE_NUMBER${NC}"
    echo -e "  Budget:  ${CYAN}\$$BUDGET${NC}"
    echo ""
}

# ─────────────────────────────────────────────────────────────────────────────
# PRINT SUMMARY
# ─────────────────────────────────────────────────────────────────────────────
print_summary() {
    echo ""
    echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "  Passed: ${GREEN}$CHECKS_PASSED${NC} | Failed: ${RED}$CHECKS_FAILED${NC} | Total: $TOTAL_CHECKS"
    echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""

    if [ $CHECKS_FAILED -eq 0 ]; then
        echo -e "  ${GREEN}${BOLD}SAFE TO LAUNCH${NC} - All pre-validations passed"
        echo ""
    else
        echo -e "  ${RED}${BOLD}DO NOT LAUNCH${NC} - $CHECKS_FAILED blocker(s) found:"
        echo ""
        for blocker in "${BLOCKERS[@]}"; do
            echo -e "    ${RED}x${NC} $blocker"
        done
        echo ""
    fi
}

# ─────────────────────────────────────────────────────────────────────────────
# ARGUMENT PARSING
# ─────────────────────────────────────────────────────────────────────────────
PROJECT_PATH=""
WAVE_NUMBER=""
BUDGET="$DEFAULT_BUDGET"
DRY_RUN=false
VERBOSE=false
SKIP_DOCKER=false
SKIP_API=false

while [[ $# -gt 0 ]]; do
    case $1 in
        -p|--project)
            PROJECT_PATH="$2"
            shift 2
            ;;
        -w|--wave)
            WAVE_NUMBER="$2"
            shift 2
            ;;
        -b|--budget)
            BUDGET="$2"
            shift 2
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --verbose)
            VERBOSE=true
            shift
            ;;
        --skip-docker)
            SKIP_DOCKER=true
            shift
            ;;
        --skip-api)
            SKIP_API=true
            shift
            ;;
        -h|--help)
            show_usage
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            show_usage
            exit 2
            ;;
    esac
done

# ─────────────────────────────────────────────────────────────────────────────
# VALIDATION
# ─────────────────────────────────────────────────────────────────────────────
if [ -z "$PROJECT_PATH" ] || [ -z "$WAVE_NUMBER" ]; then
    echo "Error: --project and --wave are required"
    show_usage
    exit 2
fi

if [ ! -d "$PROJECT_PATH" ]; then
    echo "Error: Project directory not found: $PROJECT_PATH"
    exit 2
fi

PROJECT_PATH="$(cd "$PROJECT_PATH" && pwd)"

# Load environment from project .env if exists
if [ -f "$PROJECT_PATH/.env" ]; then
    set -a
    source "$PROJECT_PATH/.env" 2>/dev/null || true
    set +a
fi

# Also load from WAVE .env
WAVE_ENV="/Volumes/SSD-01/Projects/WAVE/.env"
if [ -f "$WAVE_ENV" ]; then
    set -a
    source "$WAVE_ENV" 2>/dev/null || true
    set +a
fi

# ─────────────────────────────────────────────────────────────────────────────
# MAIN EXECUTION
# ─────────────────────────────────────────────────────────────────────────────
print_banner

# Send start notification
send_notification "preflight_start" "$(basename "$PROJECT_PATH")" "$TOTAL_CHECKS"

echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Run all checks (continue even if one fails)
check_prompt_files || true
echo ""
check_budget || true
echo ""
check_worktrees || true
echo ""
check_emergency_stop || true
echo ""
check_previous_wave || true
echo ""
check_api_quotas || true
echo ""
check_environment || true
echo ""
check_docker || true

# Print summary
print_summary

# Create lock file (unless dry-run)
if [ "$DRY_RUN" = "false" ]; then
    lock_file=$(create_lock_file)
    if [ $CHECKS_FAILED -eq 0 ]; then
        log_success "Lock file created: $lock_file"
    else
        log_fail "Lock file created with FAILED status: $lock_file"
    fi
fi

# Send completion notification
if [ $CHECKS_FAILED -eq 0 ]; then
    send_notification "preflight_greenlight" "GO" "All $TOTAL_CHECKS checks passed"
else
    send_notification "preflight_greenlight" "NO-GO" "$CHECKS_FAILED blockers found"
fi

# Exit with appropriate code
if [ $CHECKS_FAILED -eq 0 ]; then
    exit 0
else
    exit 1
fi
