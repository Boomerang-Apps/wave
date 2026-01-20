#!/opt/homebrew/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# WAVE BUILDING BLOCKS: PHASE 2 VALIDATOR (Smoke Test)
# ═══════════════════════════════════════════════════════════════════════════════
# Validates that the project builds and passes basic quality checks before
# development begins. Creates PHASE2 lock file upon successful validation.
#
# PREREQUISITES:
#   - Phase 0 lock must exist and be valid
#
# VALIDATION CHECKS:
#   1. Phase 0 lock exists and is valid
#   2. pnpm install succeeds
#   3. pnpm build exits 0
#   4. pnpm typecheck exits 0 with 0 errors
#   5. pnpm lint exits 0 with 0 errors
#   6. pnpm test passes (existing tests)
#
# USAGE:
#   ./phase2-validator.sh --project <path> --wave <N>
#   ./phase2-validator.sh --project <path> --wave <N> --dry-run
#   ./phase2-validator.sh --project <path> --wave <N> --skip-install
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
log_info() { echo -e "${BLUE}[P2]${NC} $1"; }
log_success() { echo -e "${GREEN}[P2]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[P2]${NC} $1"; }
log_error() { echo -e "${RED}[P2]${NC} $1"; }
log_check() { echo -e "${CYAN}[CHECK]${NC} $1"; }
log_pass() { echo -e "  ${GREEN}✓${NC} $1"; }
log_fail() { echo -e "  ${RED}✗${NC} $1"; }

# ─────────────────────────────────────────────────────────────────────────────
# USAGE
# ─────────────────────────────────────────────────────────────────────────────
show_usage() {
    cat << 'EOF'
WAVE Building Blocks: Phase 2 Validator (Smoke Test)

Validates project builds and passes quality checks before development.

Usage: phase2-validator.sh [options]

Required Options:
  -p, --project <path>    Path to project directory
  -w, --wave <number>     Wave number to validate

Optional:
  --dry-run               Check without creating lock file
  --skip-install          Skip pnpm install step
  --skip-test             Skip test execution (use if tests are slow)
  --verbose               Show detailed command output
  --code-dir <path>       Path to code directory (default: . or ./code)

Exit Codes:
  0  - All checks passed, lock created
  1  - Validation failed
  2  - Prerequisites not met (Phase 0 lock missing)

Examples:
  # Validate wave 3 smoke test
  ./phase2-validator.sh -p /path/to/project -w 3

  # Skip install if already done
  ./phase2-validator.sh -p /path/to/project -w 3 --skip-install

  # Dry run
  ./phase2-validator.sh -p /path/to/project -w 3 --dry-run

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
        echo "pnpm"  # Default
    fi
}

# ─────────────────────────────────────────────────────────────────────────────
# RUN COMMAND WITH OUTPUT CAPTURE
# ─────────────────────────────────────────────────────────────────────────────
run_command() {
    local cmd=$1
    local verbose=$2
    local description=$3

    if [ "$verbose" = "true" ]; then
        log_info "Running: $cmd"
        eval "$cmd" 2>&1
        return $?
    else
        local output
        output=$(eval "$cmd" 2>&1)
        local exit_code=$?
        if [ $exit_code -ne 0 ]; then
            echo "$output"
        fi
        return $exit_code
    fi
}

# ─────────────────────────────────────────────────────────────────────────────
# CHECK SCRIPT EXISTS
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
    local skip_install=$4
    local skip_test=$5
    local verbose=$6

    local all_passed=true
    local checks_json="{}"

    echo ""
    echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${CYAN} PHASE 2 VALIDATION: SMOKE TEST (Wave $wave)${NC}"
    echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
    echo ""

    # ─────────────────────────────────────────────────────────────────────────
    # PREREQUISITE: Phase 0 lock must exist
    # ─────────────────────────────────────────────────────────────────────────
    log_check "Phase 0 lock exists and is valid"
    if "$SCRIPT_DIR/lock-manager.sh" validate --project "$project_root" --wave "$wave" --phase 0 >/dev/null 2>&1; then
        log_pass "Phase 0 (Stories) lock is valid"
        checks_json=$(echo "$checks_json" | jq '.phase0_valid = true')
    else
        log_fail "Phase 0 (Stories) lock is invalid or missing"
        log_error "Run phase0-validator.sh first"
        checks_json=$(echo "$checks_json" | jq '.phase0_valid = false')
        echo "JSON_OUTPUT:$(echo "$checks_json" | jq -c '.all_passed = false')"
        return 2
    fi

    # Change to code directory
    cd "$code_dir"
    log_info "Working in: $code_dir"

    # Detect package manager
    local pm=$(detect_package_manager "$code_dir")
    log_info "Package manager: $pm"

    # ─────────────────────────────────────────────────────────────────────────
    # CHECK 1: Install dependencies
    # ─────────────────────────────────────────────────────────────────────────
    if [ "$skip_install" = "true" ]; then
        log_check "Dependencies install (SKIPPED)"
        log_pass "Skipped by user request"
        checks_json=$(echo "$checks_json" | jq '.install = {"status": "SKIPPED"}')
    else
        log_check "Dependencies install ($pm install)"
        if run_command "$pm install" "$verbose" "Installing dependencies"; then
            log_pass "$pm install succeeded"
            checks_json=$(echo "$checks_json" | jq '.install = {"status": "PASS", "exit_code": 0}')
        else
            log_fail "$pm install failed"
            checks_json=$(echo "$checks_json" | jq '.install = {"status": "FAIL", "exit_code": 1}')
            all_passed=false
        fi
    fi

    # ─────────────────────────────────────────────────────────────────────────
    # CHECK 2: Build
    # ─────────────────────────────────────────────────────────────────────────
    log_check "Build ($pm run build)"
    if check_npm_script "$code_dir" "build"; then
        if run_command "$pm run build" "$verbose" "Building project"; then
            log_pass "Build succeeded"
            checks_json=$(echo "$checks_json" | jq '.build = {"status": "PASS", "exit_code": 0}')
        else
            log_fail "Build failed"
            checks_json=$(echo "$checks_json" | jq '.build = {"status": "FAIL", "exit_code": 1}')
            all_passed=false
        fi
    else
        log_warn "No 'build' script in package.json - skipping"
        checks_json=$(echo "$checks_json" | jq '.build = {"status": "SKIPPED", "reason": "no script"}')
    fi

    # ─────────────────────────────────────────────────────────────────────────
    # CHECK 3: TypeScript check
    # ─────────────────────────────────────────────────────────────────────────
    log_check "TypeScript check"

    # Try different script names
    local ts_script=""
    for script in "typecheck" "type-check" "tsc" "check-types"; do
        if check_npm_script "$code_dir" "$script"; then
            ts_script="$script"
            break
        fi
    done

    if [ -n "$ts_script" ]; then
        local ts_output
        ts_output=$(eval "$pm run $ts_script 2>&1") || true
        local ts_exit=$?

        if [ "$ts_exit" -eq 0 ]; then
            log_pass "TypeScript: passed"
            checks_json=$(echo "$checks_json" | jq '.typecheck = {"status": "PASS"}')
        else
            log_fail "TypeScript: errors detected"
            [ "$verbose" = "true" ] && echo "$ts_output"
            checks_json=$(echo "$checks_json" | jq '.typecheck = {"status": "FAIL"}')
            all_passed=false
        fi
    elif [ -f "$code_dir/tsconfig.json" ]; then
        # Try direct tsc
        local ts_output
        ts_output=$(npx tsc --noEmit 2>&1) || true
        local ts_exit=$?

        if [ "$ts_exit" -eq 0 ]; then
            log_pass "TypeScript (tsc --noEmit): passed"
            checks_json=$(echo "$checks_json" | jq '.typecheck = {"status": "PASS"}')
        else
            log_fail "TypeScript: errors detected"
            [ "$verbose" = "true" ] && echo "$ts_output"
            checks_json=$(echo "$checks_json" | jq '.typecheck = {"status": "FAIL"}')
            all_passed=false
        fi
    else
        log_warn "No TypeScript configuration found - skipping"
        checks_json=$(echo "$checks_json" | jq '.typecheck = {"status": "SKIPPED", "reason": "no tsconfig"}')
    fi

    # ─────────────────────────────────────────────────────────────────────────
    # CHECK 4: Lint
    # ─────────────────────────────────────────────────────────────────────────
    log_check "Lint check"

    local lint_script=""
    for script in "lint" "eslint" "check:lint"; do
        if check_npm_script "$code_dir" "$script"; then
            lint_script="$script"
            break
        fi
    done

    if [ -n "$lint_script" ]; then
        local lint_output
        lint_output=$(eval "$pm run $lint_script 2>&1") || true
        local lint_exit=$?

        if [ "$lint_exit" -eq 0 ]; then
            log_pass "Lint: passed"
            checks_json=$(echo "$checks_json" | jq '.lint = {"status": "PASS", "errors": 0}')
        else
            log_fail "Lint: errors detected"
            [ "$verbose" = "true" ] && echo "$lint_output"
            checks_json=$(echo "$checks_json" | jq '.lint = {"status": "FAIL"}')
            all_passed=false
        fi
    else
        log_warn "No 'lint' script in package.json - skipping"
        checks_json=$(echo "$checks_json" | jq '.lint = {"status": "SKIPPED", "reason": "no script"}')
    fi

    # ─────────────────────────────────────────────────────────────────────────
    # CHECK 5: Tests
    # ─────────────────────────────────────────────────────────────────────────
    if [ "$skip_test" = "true" ]; then
        log_check "Tests (SKIPPED)"
        log_pass "Skipped by user request"
        checks_json=$(echo "$checks_json" | jq '.test = {"status": "SKIPPED"}')
    else
        log_check "Test execution"

        if check_npm_script "$code_dir" "test"; then
            local test_output
            test_output=$(eval "$pm test 2>&1") || true
            local test_exit=$?

            if [ "$test_exit" -eq 0 ]; then
                log_pass "Tests: passed"
                checks_json=$(echo "$checks_json" | jq '.test = {"status": "PASS"}')
            else
                log_fail "Tests: failed"
                [ "$verbose" = "true" ] && echo "$test_output"
                checks_json=$(echo "$checks_json" | jq '.test = {"status": "FAIL"}')
                all_passed=false
            fi
        else
            log_warn "No 'test' script in package.json - skipping"
            checks_json=$(echo "$checks_json" | jq '.test = {"status": "SKIPPED", "reason": "no script"}')
        fi
    fi

    # ─────────────────────────────────────────────────────────────────────────
    # SUMMARY
    # ─────────────────────────────────────────────────────────────────────────
    echo ""
    echo -e "${CYAN}───────────────────────────────────────────────────────────────${NC}"

    checks_json=$(echo "$checks_json" | jq -c --argjson passed "$([[ "$all_passed" == "true" ]] && echo true || echo false)" '.all_passed = $passed')

    if [ "$all_passed" = "true" ]; then
        echo -e "${GREEN}${BOLD}  PHASE 2 VALIDATION: PASSED${NC}"
        echo "JSON_OUTPUT:$checks_json"
        return 0
    else
        echo -e "${RED}${BOLD}  PHASE 2 VALIDATION: FAILED${NC}"
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
SKIP_INSTALL=false
SKIP_TEST=false
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
        --code-dir)
            CODE_DIR="$2"
            shift 2
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --skip-install)
            SKIP_INSTALL=true
            shift
            ;;
        --skip-test)
            SKIP_TEST=true
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

# Determine code directory
if [ -n "$CODE_DIR" ]; then
    CODE_DIR="$PROJECT_ROOT/$CODE_DIR"
elif [ -d "$PROJECT_ROOT/code" ]; then
    CODE_DIR="$PROJECT_ROOT/code"
elif [ -f "$PROJECT_ROOT/package.json" ]; then
    CODE_DIR="$PROJECT_ROOT"
else
    log_error "Cannot find code directory. Use --code-dir to specify."
    exit 1
fi

if [ ! -f "$CODE_DIR/package.json" ]; then
    log_error "No package.json found in: $CODE_DIR"
    exit 1
fi

# ─────────────────────────────────────────────────────────────────────────────
# RUN VALIDATION
# ─────────────────────────────────────────────────────────────────────────────
checks_result=$(run_validation "$PROJECT_ROOT" "$WAVE" "$CODE_DIR" "$SKIP_INSTALL" "$SKIP_TEST" "$VERBOSE")
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
            --phase 2 \
            --checks "$checks_json"
    fi
    exit 0
elif [ $validation_exit_code -eq 2 ]; then
    echo ""
    log_error "Prerequisites not met - Phase 0 must pass first"
    exit 2
else
    echo ""
    log_error "Phase 2 validation failed - cannot proceed"
    log_info "Fix the above errors and re-run validation"
    exit 1
fi
