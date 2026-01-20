#!/opt/homebrew/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# WAVE BUILDING BLOCKS: PHASE 3 VALIDATOR (Development Complete)
# ═══════════════════════════════════════════════════════════════════════════════
# Validates that development work is complete before QA validation begins.
# Creates PHASE3 lock file upon successful validation.
#
# PREREQUISITES:
#   - Phase 2 lock must exist and be valid
#
# VALIDATION CHECKS:
#   1. Phase 2 lock exists and is valid
#   2. FE completion signal exists (if FE stories exist)
#   3. BE completion signal exists (if BE stories exist)
#   4. Completion signals are valid JSON
#   5. Completion signals have required fields
#   6. Worktree changes are committable
#
# USAGE:
#   ./phase3-validator.sh --project <path> --wave <N>
#   ./phase3-validator.sh --project <path> --wave <N> --dry-run
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
BOLD='\033[1m'
NC='\033[0m'

# ─────────────────────────────────────────────────────────────────────────────
# LOGGING
# ─────────────────────────────────────────────────────────────────────────────
log_info() { echo -e "${BLUE}[P3]${NC} $1"; }
log_success() { echo -e "${GREEN}[P3]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[P3]${NC} $1"; }
log_error() { echo -e "${RED}[P3]${NC} $1"; }
log_check() { echo -e "${CYAN}[CHECK]${NC} $1"; }
log_pass() { echo -e "  ${GREEN}✓${NC} $1"; }
log_fail() { echo -e "  ${RED}✗${NC} $1"; }

# ─────────────────────────────────────────────────────────────────────────────
# USAGE
# ─────────────────────────────────────────────────────────────────────────────
show_usage() {
    cat << 'EOF'
WAVE Building Blocks: Phase 3 Validator (Development Complete)

Validates that development work is complete before QA.

Usage: phase3-validator.sh [options]

Required Options:
  -p, --project <path>    Path to project directory
  -w, --wave <number>     Wave number to validate

Optional:
  --dry-run               Check without creating lock file
  --verbose               Show detailed validation output
  --skip-git              Skip git status checks

Exit Codes:
  0  - All checks passed, lock created
  1  - Validation failed
  2  - Prerequisites not met (Phase 2 lock missing)

Examples:
  # Validate wave 3 development completion
  ./phase3-validator.sh -p /path/to/project -w 3

  # Dry run
  ./phase3-validator.sh -p /path/to/project -w 3 --dry-run

EOF
}

# ─────────────────────────────────────────────────────────────────────────────
# VALIDATE SIGNAL FILE
# ─────────────────────────────────────────────────────────────────────────────
validate_signal() {
    local signal_file=$1
    local verbose=$2

    # Check 1: File exists
    if [ ! -f "$signal_file" ]; then
        [ "$verbose" = "true" ] && log_fail "Signal file not found: $signal_file"
        return 1
    fi

    # Check 2: Valid JSON
    if ! jq empty "$signal_file" 2>/dev/null; then
        [ "$verbose" = "true" ] && log_fail "Invalid JSON: $signal_file"
        return 1
    fi

    # Check 3: Required fields
    local has_wave=$(jq -e '.wave' "$signal_file" 2>/dev/null)
    local has_gate=$(jq -e '.gate' "$signal_file" 2>/dev/null)
    local has_status=$(jq -e '.status' "$signal_file" 2>/dev/null)

    if [ -z "$has_wave" ] || [ -z "$has_gate" ] || [ -z "$has_status" ]; then
        [ "$verbose" = "true" ] && log_fail "Missing required fields in: $signal_file"
        return 1
    fi

    # Check 4: Status is valid
    local status=$(jq -r '.status' "$signal_file")
    case "$status" in
        complete|completed|COMPLETE|COMPLETED|success|SUCCESS)
            return 0
            ;;
        *)
            [ "$verbose" = "true" ] && log_fail "Invalid status '$status' in: $signal_file"
            return 1
            ;;
    esac
}

# ─────────────────────────────────────────────────────────────────────────────
# CHECK FOR STORIES BY DOMAIN
# ─────────────────────────────────────────────────────────────────────────────
has_stories_for_domain() {
    local project_root=$1
    local wave=$2
    local domain=$3

    cd "$project_root"

    # Check wave-specific directory
    if [ -d "stories/wave${wave}" ]; then
        local count=$(find "stories/wave${wave}" -name "*.json" -exec grep -l "\"domain\"[[:space:]]*:[[:space:]]*\"$domain\"" {} \; 2>/dev/null | wc -l | tr -d ' ')
        [ "$count" -gt 0 ] && return 0

        # Also check 'agent' field
        count=$(find "stories/wave${wave}" -name "*.json" -exec grep -l "\"agent\"[[:space:]]*:[[:space:]]*\"$domain\"" {} \; 2>/dev/null | wc -l | tr -d ' ')
        [ "$count" -gt 0 ] && return 0
    fi

    return 1
}

# ─────────────────────────────────────────────────────────────────────────────
# MAIN VALIDATION
# ─────────────────────────────────────────────────────────────────────────────
run_validation() {
    local project_root=$1
    local wave=$2
    local skip_git=$3
    local verbose=$4

    local all_passed=true
    local checks_json="{}"

    echo ""
    echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${CYAN} PHASE 3 VALIDATION: DEVELOPMENT COMPLETE (Wave $wave)${NC}"
    echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
    echo ""

    cd "$project_root"

    # ─────────────────────────────────────────────────────────────────────────
    # PREREQUISITE: Phase 2 lock must exist
    # ─────────────────────────────────────────────────────────────────────────
    log_check "Phase 2 lock exists and is valid"
    if "$SCRIPT_DIR/lock-manager.sh" validate --project "$project_root" --wave "$wave" --phase 2 >/dev/null 2>&1; then
        log_pass "Phase 2 (Smoke Test) lock is valid"
        checks_json=$(echo "$checks_json" | jq '.phase2_valid = true')
    else
        log_fail "Phase 2 (Smoke Test) lock is invalid or missing"
        log_error "Run phase2-validator.sh first"
        checks_json=$(echo "$checks_json" | jq '.phase2_valid = false')
        echo "JSON_OUTPUT:$(echo "$checks_json" | jq -c '.all_passed = false')"
        return 2
    fi

    # ─────────────────────────────────────────────────────────────────────────
    # CHECK: FE Completion Signal (if FE stories exist)
    # ─────────────────────────────────────────────────────────────────────────
    log_check "Frontend completion signal"

    local fe_signal_patterns=(
        ".claude/signal-wave${wave}-gate3-fe-complete.json"
        ".claude/signal-wave${wave}-fe-complete.json"
        ".claude/signals/wave${wave}-fe-complete.json"
    )

    local fe_signal_found=""
    for pattern in "${fe_signal_patterns[@]}"; do
        if [ -f "$project_root/$pattern" ]; then
            fe_signal_found="$project_root/$pattern"
            break
        fi
    done

    if has_stories_for_domain "$project_root" "$wave" "frontend"; then
        if [ -n "$fe_signal_found" ]; then
            if validate_signal "$fe_signal_found" "$verbose"; then
                log_pass "FE signal found and valid: $(basename $fe_signal_found)"
                checks_json=$(echo "$checks_json" | jq '.fe_signal = {"status": "PASS", "file": "'$(basename $fe_signal_found)'"}')
            else
                log_fail "FE signal found but invalid"
                checks_json=$(echo "$checks_json" | jq '.fe_signal = {"status": "FAIL", "reason": "invalid"}')
                all_passed=false
            fi
        else
            log_fail "FE stories exist but no completion signal"
            log_error "  Expected: .claude/signal-wave${wave}-gate3-fe-complete.json"
            checks_json=$(echo "$checks_json" | jq '.fe_signal = {"status": "FAIL", "reason": "missing"}')
            all_passed=false
        fi
    else
        if [ -n "$fe_signal_found" ]; then
            log_pass "FE signal found (no FE stories required)"
            checks_json=$(echo "$checks_json" | jq '.fe_signal = {"status": "PASS", "note": "no_stories_required"}')
        else
            log_pass "No FE stories - signal not required"
            checks_json=$(echo "$checks_json" | jq '.fe_signal = {"status": "SKIPPED", "reason": "no_fe_stories"}')
        fi
    fi

    # ─────────────────────────────────────────────────────────────────────────
    # CHECK: BE Completion Signal (if BE stories exist)
    # ─────────────────────────────────────────────────────────────────────────
    log_check "Backend completion signal"

    local be_signal_patterns=(
        ".claude/signal-wave${wave}-gate3-be-complete.json"
        ".claude/signal-wave${wave}-be-complete.json"
        ".claude/signals/wave${wave}-be-complete.json"
    )

    local be_signal_found=""
    for pattern in "${be_signal_patterns[@]}"; do
        if [ -f "$project_root/$pattern" ]; then
            be_signal_found="$project_root/$pattern"
            break
        fi
    done

    if has_stories_for_domain "$project_root" "$wave" "backend"; then
        if [ -n "$be_signal_found" ]; then
            if validate_signal "$be_signal_found" "$verbose"; then
                log_pass "BE signal found and valid: $(basename $be_signal_found)"
                checks_json=$(echo "$checks_json" | jq '.be_signal = {"status": "PASS", "file": "'$(basename $be_signal_found)'"}')
            else
                log_fail "BE signal found but invalid"
                checks_json=$(echo "$checks_json" | jq '.be_signal = {"status": "FAIL", "reason": "invalid"}')
                all_passed=false
            fi
        else
            log_fail "BE stories exist but no completion signal"
            log_error "  Expected: .claude/signal-wave${wave}-gate3-be-complete.json"
            checks_json=$(echo "$checks_json" | jq '.be_signal = {"status": "FAIL", "reason": "missing"}')
            all_passed=false
        fi
    else
        if [ -n "$be_signal_found" ]; then
            log_pass "BE signal found (no BE stories required)"
            checks_json=$(echo "$checks_json" | jq '.be_signal = {"status": "PASS", "note": "no_stories_required"}')
        else
            log_pass "No BE stories - signal not required"
            checks_json=$(echo "$checks_json" | jq '.be_signal = {"status": "SKIPPED", "reason": "no_be_stories"}')
        fi
    fi

    # ─────────────────────────────────────────────────────────────────────────
    # CHECK: Git Status (worktree changes committable)
    # ─────────────────────────────────────────────────────────────────────────
    if [ "$skip_git" = "true" ]; then
        log_check "Git status (SKIPPED)"
        log_pass "Skipped by user request"
        checks_json=$(echo "$checks_json" | jq '.git_status = {"status": "SKIPPED"}')
    else
        log_check "Git status"

        if [ -d "$project_root/.git" ] || [ -f "$project_root/.git" ]; then
            cd "$project_root"

            # Check for merge conflicts
            local conflicts=$(git diff --name-only --diff-filter=U 2>/dev/null | wc -l | tr -d ' ')
            if [ "$conflicts" -gt 0 ]; then
                log_fail "Merge conflicts detected: $conflicts file(s)"
                checks_json=$(echo "$checks_json" | jq ".git_status = {\"status\": \"FAIL\", \"reason\": \"conflicts\", \"count\": $conflicts}")
                all_passed=false
            else
                log_pass "No merge conflicts"
                checks_json=$(echo "$checks_json" | jq '.git_status = {"status": "PASS"}')
            fi
        else
            log_warn "Not a git repository - skipping"
            checks_json=$(echo "$checks_json" | jq '.git_status = {"status": "SKIPPED", "reason": "not_git_repo"}')
        fi
    fi

    # ─────────────────────────────────────────────────────────────────────────
    # CHECK: No EMERGENCY-STOP file
    # ─────────────────────────────────────────────────────────────────────────
    log_check "Emergency stop check"
    if [ -f "$project_root/.claude/EMERGENCY-STOP" ]; then
        log_fail "EMERGENCY-STOP file exists - halted"
        checks_json=$(echo "$checks_json" | jq '.emergency_stop = {"status": "FAIL"}')
        all_passed=false
    else
        log_pass "No emergency stop"
        checks_json=$(echo "$checks_json" | jq '.emergency_stop = {"status": "PASS"}')
    fi

    # ─────────────────────────────────────────────────────────────────────────
    # CHECK: No active escalations
    # ─────────────────────────────────────────────────────────────────────────
    log_check "Active escalations"
    local escalation_file="$project_root/.claude/signal-wave${wave}-ESCALATION.json"
    if [ -f "$escalation_file" ]; then
        local resolved=$(jq -r '.resolved // false' "$escalation_file" 2>/dev/null)
        if [ "$resolved" = "true" ]; then
            log_pass "Escalation resolved"
            checks_json=$(echo "$checks_json" | jq '.escalation = {"status": "PASS", "resolved": true}')
        else
            log_fail "Unresolved escalation exists"
            checks_json=$(echo "$checks_json" | jq '.escalation = {"status": "FAIL", "resolved": false}')
            all_passed=false
        fi
    else
        log_pass "No escalations"
        checks_json=$(echo "$checks_json" | jq '.escalation = {"status": "PASS"}')
    fi

    # ─────────────────────────────────────────────────────────────────────────
    # SUMMARY
    # ─────────────────────────────────────────────────────────────────────────
    echo ""
    echo -e "${CYAN}───────────────────────────────────────────────────────────────${NC}"

    checks_json=$(echo "$checks_json" | jq -c --argjson passed "$([[ "$all_passed" == "true" ]] && echo true || echo false)" '.all_passed = $passed')

    if [ "$all_passed" = "true" ]; then
        echo -e "${GREEN}${BOLD}  PHASE 3 VALIDATION: PASSED${NC}"
        echo "JSON_OUTPUT:$checks_json"
        return 0
    else
        echo -e "${RED}${BOLD}  PHASE 3 VALIDATION: FAILED${NC}"
        echo "JSON_OUTPUT:$checks_json"
        return 1
    fi
}

# ─────────────────────────────────────────────────────────────────────────────
# ARGUMENT PARSING
# ─────────────────────────────────────────────────────────────────────────────
PROJECT_ROOT=""
WAVE=""
DRY_RUN=false
SKIP_GIT=false
VERBOSE=false

while [[ $# -gt 0 ]]; do
    case $1 in
        -p|--project)
            PROJECT_ROOT="$2"
            shift 2
            ;;
        -w|--wave)
            WAVE="$2"
            shift 2
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --skip-git)
            SKIP_GIT=true
            shift
            ;;
        --verbose)
            VERBOSE=true
            shift
            ;;
        -h|--help)
            show_usage
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
done

# ─────────────────────────────────────────────────────────────────────────────
# VALIDATION
# ─────────────────────────────────────────────────────────────────────────────
if [ -z "$PROJECT_ROOT" ]; then
    log_error "--project is required"
    exit 1
fi

if [ ! -d "$PROJECT_ROOT" ]; then
    log_error "Project directory not found: $PROJECT_ROOT"
    exit 1
fi

PROJECT_ROOT="$(cd "$PROJECT_ROOT" && pwd)"

if [ -z "$WAVE" ]; then
    log_error "--wave is required"
    exit 1
fi

# ─────────────────────────────────────────────────────────────────────────────
# RUN VALIDATION
# ─────────────────────────────────────────────────────────────────────────────
checks_result=$(run_validation "$PROJECT_ROOT" "$WAVE" "$SKIP_GIT" "$VERBOSE")
validation_exit_code=$?

# Extract JSON from output
checks_json=$(echo "$checks_result" | grep "^JSON_OUTPUT:" | sed 's/^JSON_OUTPUT://')

# Show output without the JSON line
echo "$checks_result" | grep -v "^JSON_OUTPUT:"

if [ $validation_exit_code -eq 0 ]; then
    if [ "$DRY_RUN" = "true" ]; then
        echo ""
        log_info "Dry run - no lock file created"
    else
        # Create lock file
        echo ""
        "$SCRIPT_DIR/lock-manager.sh" create \
            --project "$PROJECT_ROOT" \
            --wave "$WAVE" \
            --phase 3 \
            --checks "$checks_json"
    fi
    exit 0
elif [ $validation_exit_code -eq 2 ]; then
    echo ""
    log_error "Prerequisites not met - Phase 2 must pass first"
    exit 2
else
    echo ""
    log_error "Phase 3 validation failed - cannot proceed to QA"
    log_info "Ensure all development signals are created"
    exit 1
fi
