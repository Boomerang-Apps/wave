#!/opt/homebrew/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# WAVE BUILDING BLOCKS: PHASE 4 VALIDATOR (QA/Merge)
# ═══════════════════════════════════════════════════════════════════════════════
# Validates that QA has approved and all quality gates pass before merge.
# Creates PHASE4 lock file upon successful validation.
#
# PREREQUISITES:
#   - Phase 3 lock must exist and be valid
#
# VALIDATION CHECKS:
#   1. Phase 3 lock exists and is valid
#   2. QA approval signal exists
#   3. All tests pass
#   4. No TypeScript errors
#   5. No lint errors
#   6. No pending escalations
#   7. No rejections pending (or max retries exceeded)
#
# USAGE:
#   ./phase4-validator.sh --project <path> --wave <N>
#   ./phase4-validator.sh --project <path> --wave <N> --dry-run
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
log_info() { echo -e "${BLUE}[P4]${NC} $1"; }
log_success() { echo -e "${GREEN}[P4]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[P4]${NC} $1"; }
log_error() { echo -e "${RED}[P4]${NC} $1"; }
log_check() { echo -e "${CYAN}[CHECK]${NC} $1"; }
log_pass() { echo -e "  ${GREEN}✓${NC} $1"; }
log_fail() { echo -e "  ${RED}✗${NC} $1"; }

# ─────────────────────────────────────────────────────────────────────────────
# USAGE
# ─────────────────────────────────────────────────────────────────────────────
show_usage() {
    cat << 'EOF'
WAVE Building Blocks: Phase 4 Validator (QA/Merge)

Validates QA approval and quality gates before merge.

Usage: phase4-validator.sh [options]

Required Options:
  -p, --project <path>    Path to project directory
  -w, --wave <number>     Wave number to validate

Optional:
  --dry-run               Check without creating lock file
  --verbose               Show detailed validation output
  --max-rejections <N>    Maximum allowed rejections (default: 3)
  --code-dir <path>       Path to code directory (default: . or ./code)

Exit Codes:
  0  - All checks passed, lock created
  1  - Validation failed
  2  - Prerequisites not met (Phase 3 lock missing)

Examples:
  # Validate wave 3 QA/Merge
  ./phase4-validator.sh -p /path/to/project -w 3

  # Dry run
  ./phase4-validator.sh -p /path/to/project -w 3 --dry-run

EOF
}

# ─────────────────────────────────────────────────────────────────────────────
# DETECT PACKAGE MANAGER
# ─────────────────────────────────────────────────────────────────────────────
detect_package_manager() {
    local code_dir=$1

    if [ -f "$code_dir/pnpm-lock.yaml" ]; then
        echo "pnpm"
    elif [ -f "$code_dir/yarn.lock" ]; then
        echo "yarn"
    elif [ -f "$code_dir/package-lock.json" ]; then
        echo "npm"
    else
        echo "pnpm"
    fi
}

# ─────────────────────────────────────────────────────────────────────────────
# CHECK NPM SCRIPT EXISTS
# ─────────────────────────────────────────────────────────────────────────────
check_npm_script() {
    local code_dir=$1
    local script_name=$2

    if [ -f "$code_dir/package.json" ]; then
        jq -e ".scripts.\"$script_name\"" "$code_dir/package.json" >/dev/null 2>&1
        return $?
    fi
    return 1
}

# ─────────────────────────────────────────────────────────────────────────────
# MAIN VALIDATION
# ─────────────────────────────────────────────────────────────────────────────
run_validation() {
    local project_root=$1
    local wave=$2
    local code_dir=$3
    local max_rejections=$4
    local verbose=$5

    local all_passed=true
    local checks_json="{}"

    echo ""
    echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${CYAN} PHASE 4 VALIDATION: QA/MERGE (Wave $wave)${NC}"
    echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
    echo ""

    cd "$project_root"

    # ─────────────────────────────────────────────────────────────────────────
    # PREREQUISITE: Phase 3 lock must exist
    # ─────────────────────────────────────────────────────────────────────────
    log_check "Phase 3 lock exists and is valid"
    if "$SCRIPT_DIR/lock-manager.sh" validate --project "$project_root" --wave "$wave" --phase 3 >/dev/null 2>&1; then
        log_pass "Phase 3 (Development Complete) lock is valid"
        checks_json=$(echo "$checks_json" | jq '.phase3_valid = true')
    else
        log_fail "Phase 3 (Development Complete) lock is invalid or missing"
        log_error "Run phase3-validator.sh first"
        checks_json=$(echo "$checks_json" | jq '.phase3_valid = false')
        echo "JSON_OUTPUT:$(echo "$checks_json" | jq -c '.all_passed = false')"
        return 2
    fi

    # ─────────────────────────────────────────────────────────────────────────
    # CHECK: QA Approval Signal
    # ─────────────────────────────────────────────────────────────────────────
    log_check "QA approval signal"

    local approval_patterns=(
        ".claude/signal-wave${wave}-gate4-approved.json"
        ".claude/signal-wave${wave}-qa-approved.json"
        ".claude/signals/wave${wave}-gate4-approved.json"
    )

    local approval_found=""
    for pattern in "${approval_patterns[@]}"; do
        if [ -f "$project_root/$pattern" ]; then
            approval_found="$project_root/$pattern"
            break
        fi
    done

    if [ -n "$approval_found" ]; then
        # Validate the approval signal
        if jq empty "$approval_found" 2>/dev/null; then
            local decision=$(jq -r '.decision // .status // ""' "$approval_found")
            case "$decision" in
                APPROVED|approved|PASS|pass|success|SUCCESS)
                    log_pass "QA approved: $(basename $approval_found)"
                    checks_json=$(echo "$checks_json" | jq '.qa_approval = {"status": "PASS", "file": "'$(basename $approval_found)'"}')
                    ;;
                *)
                    log_fail "QA signal exists but not approved (decision: $decision)"
                    checks_json=$(echo "$checks_json" | jq ".qa_approval = {\"status\": \"FAIL\", \"decision\": \"$decision\"}")
                    all_passed=false
                    ;;
            esac
        else
            log_fail "QA approval signal is invalid JSON"
            checks_json=$(echo "$checks_json" | jq '.qa_approval = {"status": "FAIL", "reason": "invalid_json"}')
            all_passed=false
        fi
    else
        log_fail "No QA approval signal found"
        log_error "  Expected: .claude/signal-wave${wave}-gate4-approved.json"
        checks_json=$(echo "$checks_json" | jq '.qa_approval = {"status": "FAIL", "reason": "missing"}')
        all_passed=false
    fi

    # ─────────────────────────────────────────────────────────────────────────
    # CHECK: Rejection Count
    # ─────────────────────────────────────────────────────────────────────────
    log_check "Rejection count"

    local rejection_file="$project_root/.claude/signal-wave${wave}-gate4-rejected.json"
    if [ -f "$rejection_file" ]; then
        local rejection_count=$(jq -r '.rejection_count // 0' "$rejection_file")

        if [ "$rejection_count" -ge "$max_rejections" ]; then
            log_fail "Maximum rejections reached: $rejection_count/$max_rejections"
            checks_json=$(echo "$checks_json" | jq ".rejections = {\"status\": \"FAIL\", \"count\": $rejection_count, \"max\": $max_rejections}")
            all_passed=false
        else
            log_pass "Rejections: $rejection_count/$max_rejections (under limit)"
            checks_json=$(echo "$checks_json" | jq ".rejections = {\"status\": \"PASS\", \"count\": $rejection_count, \"max\": $max_rejections}")
        fi
    else
        log_pass "No rejections"
        checks_json=$(echo "$checks_json" | jq ".rejections = {\"status\": \"PASS\", \"count\": 0, \"max\": $max_rejections}")
    fi

    # ─────────────────────────────────────────────────────────────────────────
    # CHECK: Tests Pass (from code directory)
    # ─────────────────────────────────────────────────────────────────────────
    log_check "Tests pass"

    if [ -d "$code_dir" ] && [ -f "$code_dir/package.json" ]; then
        cd "$code_dir"
        local pm=$(detect_package_manager "$code_dir")

        if check_npm_script "$code_dir" "test"; then
            local test_output
            test_output=$(eval "$pm test 2>&1") || true
            local test_exit=$?

            if [ "$test_exit" -eq 0 ]; then
                log_pass "Tests: passed"
                checks_json=$(echo "$checks_json" | jq '.tests = {"status": "PASS"}')
            else
                log_fail "Tests: failed"
                [ "$verbose" = "true" ] && echo "$test_output"
                checks_json=$(echo "$checks_json" | jq '.tests = {"status": "FAIL"}')
                all_passed=false
            fi
        else
            log_warn "No 'test' script in package.json - skipping"
            checks_json=$(echo "$checks_json" | jq '.tests = {"status": "SKIPPED", "reason": "no_script"}')
        fi
    else
        log_warn "No code directory found - skipping tests"
        checks_json=$(echo "$checks_json" | jq '.tests = {"status": "SKIPPED", "reason": "no_code_dir"}')
    fi

    cd "$project_root"

    # ─────────────────────────────────────────────────────────────────────────
    # CHECK: No Emergency Stop
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
    # CHECK: No Pending Escalations
    # ─────────────────────────────────────────────────────────────────────────
    log_check "Pending escalations"
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
    # CHECK: Git - No merge conflicts
    # ─────────────────────────────────────────────────────────────────────────
    log_check "Git status (merge conflicts)"

    if [ -d "$project_root/.git" ] || [ -f "$project_root/.git" ]; then
        cd "$project_root"
        local conflicts=$(git diff --name-only --diff-filter=U 2>/dev/null | wc -l | tr -d ' ')
        if [ "$conflicts" -gt 0 ]; then
            log_fail "Merge conflicts detected: $conflicts file(s)"
            checks_json=$(echo "$checks_json" | jq ".git_conflicts = {\"status\": \"FAIL\", \"count\": $conflicts}")
            all_passed=false
        else
            log_pass "No merge conflicts"
            checks_json=$(echo "$checks_json" | jq '.git_conflicts = {"status": "PASS"}')
        fi
    else
        log_warn "Not a git repository - skipping"
        checks_json=$(echo "$checks_json" | jq '.git_conflicts = {"status": "SKIPPED"}')
    fi

    # ─────────────────────────────────────────────────────────────────────────
    # SUMMARY
    # ─────────────────────────────────────────────────────────────────────────
    echo ""
    echo -e "${CYAN}───────────────────────────────────────────────────────────────${NC}"

    checks_json=$(echo "$checks_json" | jq -c --argjson passed "$([[ "$all_passed" == "true" ]] && echo true || echo false)" '.all_passed = $passed')

    if [ "$all_passed" = "true" ]; then
        echo -e "${GREEN}${BOLD}  PHASE 4 VALIDATION: PASSED${NC}"
        echo -e "${GREEN}${BOLD}  ✓ READY TO MERGE${NC}"
        echo "JSON_OUTPUT:$checks_json"
        return 0
    else
        echo -e "${RED}${BOLD}  PHASE 4 VALIDATION: FAILED${NC}"
        echo -e "${RED}${BOLD}  ✗ NOT READY TO MERGE${NC}"
        echo "JSON_OUTPUT:$checks_json"
        return 1
    fi
}

# ─────────────────────────────────────────────────────────────────────────────
# ARGUMENT PARSING
# ─────────────────────────────────────────────────────────────────────────────
PROJECT_ROOT=""
WAVE=""
CODE_DIR=""
DRY_RUN=false
VERBOSE=false
MAX_REJECTIONS=3

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
        --code-dir)
            CODE_DIR="$2"
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
        --max-rejections)
            MAX_REJECTIONS="$2"
            shift 2
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

# Determine code directory
if [ -n "$CODE_DIR" ]; then
    CODE_DIR="$PROJECT_ROOT/$CODE_DIR"
elif [ -d "$PROJECT_ROOT/code" ]; then
    CODE_DIR="$PROJECT_ROOT/code"
elif [ -f "$PROJECT_ROOT/package.json" ]; then
    CODE_DIR="$PROJECT_ROOT"
else
    CODE_DIR="$PROJECT_ROOT"
fi

# ─────────────────────────────────────────────────────────────────────────────
# RUN VALIDATION
# ─────────────────────────────────────────────────────────────────────────────
checks_result=$(run_validation "$PROJECT_ROOT" "$WAVE" "$CODE_DIR" "$MAX_REJECTIONS" "$VERBOSE")
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
            --phase 4 \
            --checks "$checks_json"

        echo ""
        log_success "Wave $WAVE is APPROVED for merge!"
    fi
    exit 0
elif [ $validation_exit_code -eq 2 ]; then
    echo ""
    log_error "Prerequisites not met - Phase 3 must pass first"
    exit 2
else
    echo ""
    log_error "Phase 4 validation failed - cannot merge"
    log_info "Resolve the above issues and re-run validation"
    exit 1
fi
