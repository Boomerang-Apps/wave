#!/opt/homebrew/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# WAVE BUILDING BLOCKS: PHASE ORCHESTRATOR
# ═══════════════════════════════════════════════════════════════════════════════
# Master orchestrator that runs phase validators in sequence and enforces
# the building block workflow.
#
# PHASES:
#   0 - Stories      (phase0-validator.sh)
#   1 - Environment  (SKIPPED for now)
#   2 - Smoke Test   (phase2-validator.sh)
#   3 - Development  (phase3-validator.sh)
#   4 - QA/Merge     (phase4-validator.sh)
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
    [0]="Stories"
    [1]="Environment"
    [2]="Smoke Test"
    [3]="Development"
    [4]="QA/Merge"
)

declare -A PHASE_VALIDATORS=(
    [0]="phase0-validator.sh"
    [1]=""  # Skipped for now
    [2]="phase2-validator.sh"
    [3]="phase3-validator.sh"
    [4]="phase4-validator.sh"
)

# Active phases (skipping phase 1)
ACTIVE_PHASES=(0 2 3 4)

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

Master orchestrator that runs phase validators in sequence.

Usage: phase-orchestrator.sh [options]

Required Options:
  -p, --project <path>    Path to project directory
  -w, --wave <number>     Wave number to validate

Run Mode Options (pick one):
  --run-all               Run all phases (0 → 2 → 3 → 4)
  --up-to <phase>         Run phases up to and including <phase>
  --from <phase>          Run from <phase> to phase 4
  --phase <phase>         Run only specific phase
  --status                Show current lock status only

Optional:
  --dry-run               Check without creating lock files
  --force                 Invalidate existing locks and re-run
  --verbose               Show detailed output from validators
  --skip-install          Pass to phase 2 (skip pnpm install)
  --skip-test             Pass to phase 2 (skip test execution)
  --code-dir <path>       Path to code directory

Exit Codes:
  0  - All requested phases passed
  1  - One or more phases failed
  2  - Invalid arguments or configuration

Examples:
  # Run all phases for wave 3
  ./phase-orchestrator.sh -p /path/to/project -w 3 --run-all

  # Run phases 0 and 2 only
  ./phase-orchestrator.sh -p /path/to/project -w 3 --up-to 2

  # Run from phase 2 onwards (assumes 0 is done)
  ./phase-orchestrator.sh -p /path/to/project -w 3 --from 2

  # Run only phase 0
  ./phase-orchestrator.sh -p /path/to/project -w 3 --phase 0

  # Check status
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
        exit 0
        ;;
    all)
        run_phases "$PROJECT_ROOT" "$WAVE" 0 4 "$DRY_RUN" "$VERBOSE" "$EXTRA_ARGS"
        ;;
    up-to)
        run_phases "$PROJECT_ROOT" "$WAVE" 0 "$TARGET_PHASE" "$DRY_RUN" "$VERBOSE" "$EXTRA_ARGS"
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
