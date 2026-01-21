#!/opt/homebrew/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# WAVE BUILDING BLOCKS: PHASE ORCHESTRATOR
# ═══════════════════════════════════════════════════════════════════════════════
# Master orchestrator that runs phase validators in sequence and enforces
# the building block workflow with circuit breaker protection.
#
# PHASES:
#  -1 - Pre-Validation (pre-validate.sh) - Zero Error Launch Protocol (Gate -1)
#   0 - Pre-Flight     (pre-flight.sh) - Stories, Gap Analysis, Wave Planning, Green Light
#   1 - Infrastructure (phase1-validator.sh) - 10 Ping tests (Slack, Docker, APIs, etc.)
#   2 - Smoke Test     (phase2-validator.sh) - Build, Lint, Test, TypeCheck
#   3 - Development    (phase3-validator.sh) - Agent completion signals
#   4 - QA/Merge       (phase4-validator.sh) - QA approval, merge to main
#
# USAGE:
#   ./phase-orchestrator.sh --project <path> --wave <N> --run-all
#   ./phase-orchestrator.sh --project <path> --wave <N> --up-to <phase>
#   ./phase-orchestrator.sh --project <path> --wave <N> --from <phase>
#   ./phase-orchestrator.sh --project <path> --wave <N> --phase <N>
#
# ENFORCEMENT:
#   - Each phase MUST pass before proceeding
#   - Lock files track completed phases
#   - Drift detection invalidates downstream locks
#   - Circuit breaker halts on repeated failures
#   - NO WARNINGS - only PASS or FAIL
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
# PHASE DEFINITIONS
# ─────────────────────────────────────────────────────────────────────────────
declare -A PHASE_NAMES=(
    [-1]="Pre-Validation"
    [0]="Pre-Flight"
    [1]="Infrastructure"
    [2]="Smoke Test"
    [3]="Development"
    [4]="QA/Merge"
)

declare -A PHASE_VALIDATORS=(
    [-1]="pre-validate.sh"
    [0]="../pre-flight.sh"
    [1]="phase1-validator.sh"
    [2]="phase2-validator.sh"
    [3]="phase3-validator.sh"
    [4]="phase4-validator.sh"
)

# Active phases (Gate -1 through Phase 4)
ACTIVE_PHASES=(-1 0 1 2 3 4)

# ─────────────────────────────────────────────────────────────────────────────
# LOGGING
# ─────────────────────────────────────────────────────────────────────────────
log_info() { echo -e "${BLUE}[ORCHESTRATOR]${NC} $1"; }
log_success() { echo -e "${GREEN}[ORCHESTRATOR]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[ORCHESTRATOR]${NC} $1"; }
log_error() { echo -e "${RED}[ORCHESTRATOR]${NC} $1"; }
log_phase() { echo -e "${MAGENTA}[PHASE $1]${NC} $2"; }

# ─────────────────────────────────────────────────────────────────────────────
# USAGE
# ─────────────────────────────────────────────────────────────────────────────
show_usage() {
    cat << 'EOF'
WAVE Building Blocks: Phase Orchestrator

Master orchestrator that runs phase validators in sequence with circuit breaker protection.

PHASES:
  -1  Pre-Validation  (Gate -1) - Zero Error Launch Protocol
   0  Pre-Flight      (Phase 0) - Stories, Gap Analysis, Wave Planning
   1  Infrastructure  (Phase 1) - 10 Ping Tests (Slack, Docker, APIs)
   2  Smoke Test      (Phase 2) - Build, Lint, Test, TypeCheck
   3  Development     (Phase 3) - Agent completion signals
   4  QA/Merge        (Phase 4) - QA approval, merge to main

Usage: phase-orchestrator.sh [options]

Required Options:
  -p, --project <path>    Path to project directory
  -w, --wave <number>     Wave number to validate

Run Mode Options (pick one):
  --run-all               Run all phases (-1 → 0 → 1 → 2 → 3 → 4)
  --up-to <phase>         Run phases from -1 up to and including <phase>
  --from <phase>          Run from <phase> to phase 4
  --phase <phase>         Run only specific phase (use -1 for Pre-Validation)
  --status                Show current lock and circuit breaker status

Optional:
  --dry-run               Check without creating lock files
  --force                 Invalidate existing locks and re-run
  --verbose               Show detailed output from validators
  --skip-install          Pass to phase 2 (skip pnpm install)
  --skip-test             Pass to phase 2 (skip test execution)
  --code-dir <path>       Path to code directory

Exit Codes:
  0  - All requested phases passed
  1  - One or more phases failed (or circuit breaker tripped)
  2  - Invalid arguments or configuration

Examples:
  # Run all phases for wave 3 (includes Gate -1 Pre-Validation)
  ./phase-orchestrator.sh -p /path/to/project -w 3 --run-all

  # Run only Gate -1 Pre-Validation
  ./phase-orchestrator.sh -p /path/to/project -w 3 --phase -1

  # Run phases up to Infrastructure (Gate -1, Phase 0, Phase 1)
  ./phase-orchestrator.sh -p /path/to/project -w 3 --up-to 1

  # Run from phase 2 onwards (assumes -1, 0, 1 done)
  ./phase-orchestrator.sh -p /path/to/project -w 3 --from 2

  # Check status (includes circuit breaker)
  ./phase-orchestrator.sh -p /path/to/project -w 3 --status

  # Force re-run all phases
  ./phase-orchestrator.sh -p /path/to/project -w 3 --run-all --force

EOF
}

# ─────────────────────────────────────────────────────────────────────────────
# PRINT BANNER
# ─────────────────────────────────────────────────────────────────────────────
print_banner() {
    local wave=$1
    echo ""
    echo -e "${CYAN}╔═══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║                                                               ║${NC}"
    echo -e "${CYAN}║     ${BOLD}WAVE BUILDING BLOCKS - PHASE ORCHESTRATOR${NC}${CYAN}               ║${NC}"
    echo -e "${CYAN}║                                                               ║${NC}"
    echo -e "${CYAN}║     Wave: ${BOLD}$wave${NC}${CYAN}                                                   ║${NC}"
    echo -e "${CYAN}║     Version: $SCRIPT_VERSION                                         ║${NC}"
    echo -e "${CYAN}║                                                               ║${NC}"
    echo -e "${CYAN}╚═══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

# ─────────────────────────────────────────────────────────────────────────────
# CHECK CIRCUIT BREAKER
# ─────────────────────────────────────────────────────────────────────────────
check_circuit_breaker() {
    local project_root=$1
    local wave=$2

    local circuit_breaker="$SCRIPT_DIR/circuit-breaker.sh"
    if [ -x "$circuit_breaker" ]; then
        if ! "$circuit_breaker" check --project "$project_root" --wave "$wave" 2>/dev/null; then
            log_error "CIRCUIT BREAKER TRIPPED - Halting orchestration"
            return 1
        fi
    fi
    return 0
}

# ─────────────────────────────────────────────────────────────────────────────
# RUN SINGLE PHASE
# ─────────────────────────────────────────────────────────────────────────────
run_phase() {
    local project_root=$1
    local wave=$2
    local phase=$3
    local dry_run=$4
    local verbose=$5
    local extra_args=$6

    local validator="${PHASE_VALIDATORS[$phase]}"
    local phase_name="${PHASE_NAMES[$phase]}"

    echo ""
    echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${MAGENTA}  PHASE $phase: $phase_name${NC}"
    echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

    # Check circuit breaker before each phase
    if ! check_circuit_breaker "$project_root" "$wave"; then
        return 1
    fi

    if [ -z "$validator" ]; then
        log_warn "Phase $phase ($phase_name) - SKIPPED (no validator)"
        return 0
    fi

    local validator_path="$SCRIPT_DIR/$validator"
    if [ ! -x "$validator_path" ]; then
        log_error "Validator not found or not executable: $validator"
        return 1
    fi

    # Build command
    local cmd="$validator_path --project $project_root --wave $wave"
    [ "$dry_run" = "true" ] && cmd="$cmd --dry-run"
    [ "$verbose" = "true" ] && cmd="$cmd --verbose"
    [ -n "$extra_args" ] && cmd="$cmd $extra_args"

    # Run validator
    log_info "Running: $validator"

    if $cmd; then
        log_success "Phase $phase ($phase_name) - PASSED"
        return 0
    else
        local exit_code=$?
        log_error "Phase $phase ($phase_name) - FAILED (exit code: $exit_code)"
        return $exit_code
    fi
}

# ─────────────────────────────────────────────────────────────────────────────
# RUN MULTIPLE PHASES
# ─────────────────────────────────────────────────────────────────────────────
run_phases() {
    local project_root=$1
    local wave=$2
    local start_phase=$3
    local end_phase=$4
    local dry_run=$5
    local verbose=$6
    local extra_args=$7

    local phases_to_run=()

    # Determine which phases to run
    for phase in "${ACTIVE_PHASES[@]}"; do
        if [ "$phase" -ge "$start_phase" ] && [ "$phase" -le "$end_phase" ]; then
            phases_to_run+=($phase)
        fi
    done

    if [ ${#phases_to_run[@]} -eq 0 ]; then
        log_error "No phases to run in range $start_phase-$end_phase"
        return 1
    fi

    log_info "Running phases: ${phases_to_run[*]}"

    local failed_phase=""
    for phase in "${phases_to_run[@]}"; do
        if ! run_phase "$project_root" "$wave" "$phase" "$dry_run" "$verbose" "$extra_args"; then
            failed_phase=$phase
            break
        fi
    done

    # Summary
    echo ""
    echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${CYAN}  ORCHESTRATION SUMMARY${NC}"
    echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
    echo ""

    for phase in "${phases_to_run[@]}"; do
        local phase_name="${PHASE_NAMES[$phase]}"
        if [ -n "$failed_phase" ] && [ "$phase" -gt "$failed_phase" ]; then
            echo -e "  Phase $phase (${phase_name}): ${YELLOW}⏸ SKIPPED${NC}"
        elif [ -n "$failed_phase" ] && [ "$phase" -eq "$failed_phase" ]; then
            echo -e "  Phase $phase (${phase_name}): ${RED}✗ FAILED${NC}"
        else
            echo -e "  Phase $phase (${phase_name}): ${GREEN}✓ PASSED${NC}"
        fi
    done

    echo ""
    echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"

    if [ -n "$failed_phase" ]; then
        log_error "Orchestration stopped at Phase $failed_phase"
        return 1
    else
        log_success "All phases completed successfully!"
        return 0
    fi
}

# ─────────────────────────────────────────────────────────────────────────────
# INVALIDATE LOCKS
# ─────────────────────────────────────────────────────────────────────────────
invalidate_all_locks() {
    local project_root=$1
    local wave=$2

    log_warn "Invalidating all locks for wave $wave..."

    for phase in "${ACTIVE_PHASES[@]}"; do
        "$SCRIPT_DIR/lock-manager.sh" invalidate \
            --project "$project_root" \
            --wave "$wave" \
            --phase "$phase" \
            --reason "force_rerun" 2>/dev/null || true
    done

    log_info "All locks invalidated"
}

# ─────────────────────────────────────────────────────────────────────────────
# ARGUMENT PARSING
# ─────────────────────────────────────────────────────────────────────────────
PROJECT_ROOT=""
WAVE=""
RUN_MODE=""
TARGET_PHASE=""
DRY_RUN=false
FORCE=false
VERBOSE=false
EXTRA_ARGS=""

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
        --run-all)
            RUN_MODE="all"
            shift
            ;;
        --up-to)
            RUN_MODE="up-to"
            TARGET_PHASE="$2"
            shift 2
            ;;
        --from)
            RUN_MODE="from"
            TARGET_PHASE="$2"
            shift 2
            ;;
        --phase)
            RUN_MODE="single"
            TARGET_PHASE="$2"
            shift 2
            ;;
        --status)
            RUN_MODE="status"
            shift
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --force)
            FORCE=true
            shift
            ;;
        --verbose)
            VERBOSE=true
            shift
            ;;
        --skip-install)
            EXTRA_ARGS="$EXTRA_ARGS --skip-install"
            shift
            ;;
        --skip-test)
            EXTRA_ARGS="$EXTRA_ARGS --skip-test"
            shift
            ;;
        --code-dir)
            EXTRA_ARGS="$EXTRA_ARGS --code-dir $2"
            shift 2
            ;;
        -h|--help)
            show_usage
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            show_usage
            exit 2
            ;;
    esac
done

# ─────────────────────────────────────────────────────────────────────────────
# VALIDATION
# ─────────────────────────────────────────────────────────────────────────────
if [ -z "$PROJECT_ROOT" ]; then
    log_error "--project is required"
    exit 2
fi

if [ ! -d "$PROJECT_ROOT" ]; then
    log_error "Project directory not found: $PROJECT_ROOT"
    exit 2
fi

PROJECT_ROOT="$(cd "$PROJECT_ROOT" && pwd)"

if [ -z "$WAVE" ]; then
    log_error "--wave is required"
    exit 2
fi

if [ -z "$RUN_MODE" ]; then
    log_error "Run mode required (--run-all, --up-to, --from, --phase, or --status)"
    show_usage
    exit 2
fi

# ─────────────────────────────────────────────────────────────────────────────
# EXECUTE
# ─────────────────────────────────────────────────────────────────────────────
print_banner "$WAVE"

# Check for drift before running
log_info "Checking for drift..."
"$SCRIPT_DIR/drift-detector.sh" check --project "$PROJECT_ROOT" --wave "$WAVE" 2>/dev/null || true

# Force invalidate if requested
if [ "$FORCE" = "true" ]; then
    invalidate_all_locks "$PROJECT_ROOT" "$WAVE"
fi

case $RUN_MODE in
    status)
        "$SCRIPT_DIR/lock-manager.sh" status --project "$PROJECT_ROOT" --wave "$WAVE"
        # Also show circuit breaker status
        "$SCRIPT_DIR/circuit-breaker.sh" status --project "$PROJECT_ROOT" --wave "$WAVE" 2>/dev/null || true
        exit 0
        ;;
    all)
        # Run all phases from Gate -1 (Pre-Validation) through Phase 4
        run_phases "$PROJECT_ROOT" "$WAVE" -1 4 "$DRY_RUN" "$VERBOSE" "$EXTRA_ARGS"
        ;;
    up-to)
        # Start from Gate -1 (Pre-Validation) through the target phase
        run_phases "$PROJECT_ROOT" "$WAVE" -1 "$TARGET_PHASE" "$DRY_RUN" "$VERBOSE" "$EXTRA_ARGS"
        ;;
    from)
        run_phases "$PROJECT_ROOT" "$WAVE" "$TARGET_PHASE" 4 "$DRY_RUN" "$VERBOSE" "$EXTRA_ARGS"
        ;;
    single)
        run_phase "$PROJECT_ROOT" "$WAVE" "$TARGET_PHASE" "$DRY_RUN" "$VERBOSE" "$EXTRA_ARGS"
        ;;
    *)
        log_error "Unknown run mode: $RUN_MODE"
        exit 2
        ;;
esac
