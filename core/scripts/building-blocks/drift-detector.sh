#!/opt/homebrew/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# WAVE BUILDING BLOCKS: DRIFT DETECTOR
# ═══════════════════════════════════════════════════════════════════════════════
# Detects state drift by comparing current checksums against stored lock checksums.
# Auto-invalidates downstream locks when drift is detected.
#
# USAGE:
#   ./drift-detector.sh check --project <path> --wave <N>
#   ./drift-detector.sh check --project <path> --wave <N> --phase <N>
#   ./drift-detector.sh auto-fix --project <path> --wave <N>
#
# MODES:
#   check    - Report drift status (no changes)
#   auto-fix - Detect and auto-invalidate drifted locks
#
# ═══════════════════════════════════════════════════════════════════════════════

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

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
# PHASE DEFINITIONS
# ─────────────────────────────────────────────────────────────────────────────
declare -A PHASE_NAMES=(
    [0]="Stories"
    [1]="Environment"
    [2]="Smoke Test"
    [3]="Development"
    [4]="QA/Merge"
)

declare -A PHASE_DEPENDENCIES=(
    [0]=""
    [1]="0"
    [2]="0"
    [3]="2"
    [4]="3"
)

# ─────────────────────────────────────────────────────────────────────────────
# LOGGING
# ─────────────────────────────────────────────────────────────────────────────
log_info() { echo -e "${BLUE}[DRIFT]${NC} $1"; }
log_success() { echo -e "${GREEN}[DRIFT]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[DRIFT]${NC} $1"; }
log_error() { echo -e "${RED}[DRIFT]${NC} $1"; }
log_drift() { echo -e "${YELLOW}${BOLD}[DRIFT DETECTED]${NC} $1"; }

# ─────────────────────────────────────────────────────────────────────────────
# USAGE
# ─────────────────────────────────────────────────────────────────────────────
show_usage() {
    cat << 'EOF'
WAVE Building Blocks: Drift Detector

Usage: drift-detector.sh <mode> [options]

Modes:
  check     Check for drift without making changes
  auto-fix  Detect drift and auto-invalidate affected locks

Required Options:
  -p, --project <path>    Path to project directory
  -w, --wave <number>     Wave number

Optional:
  --phase <number>        Check only specific phase (0-4)
  --verbose               Show detailed diff information
  --json                  Output as JSON

Examples:
  # Check all phases for drift
  ./drift-detector.sh check -p /path/to/project -w 3

  # Check specific phase
  ./drift-detector.sh check -p /path/to/project -w 3 --phase 2

  # Auto-fix (invalidate drifted locks)
  ./drift-detector.sh auto-fix -p /path/to/project -w 3

  # JSON output for automation
  ./drift-detector.sh check -p /path/to/project -w 3 --json

EOF
}

# ─────────────────────────────────────────────────────────────────────────────
# CHECKSUM CALCULATION (must match lock-manager.sh)
# ─────────────────────────────────────────────────────────────────────────────
calculate_checksum() {
    local project_root=$1
    local wave=$2
    local phase=$3

    cd "$project_root"

    case $phase in
        0)
            # Phase 0: Hash of all story files for this wave
            if [ -d "stories/wave${wave}" ]; then
                find "stories/wave${wave}" -name "*.json" -type f 2>/dev/null | \
                    sort | xargs cat 2>/dev/null | shasum -a 256 | cut -d' ' -f1
            elif [ -d "stories" ]; then
                find "stories" -name "WAVE${wave}*.json" -type f 2>/dev/null | \
                    sort | xargs cat 2>/dev/null | shasum -a 256 | cut -d' ' -f1
            else
                echo "no-stories"
            fi
            ;;
        1)
            # Phase 1: Hash of worktree structure
            if [ -d "worktrees" ]; then
                ls -la worktrees/ 2>/dev/null | shasum -a 256 | cut -d' ' -f1
            else
                echo "no-worktrees"
            fi
            ;;
        2)
            # Phase 2: Hash of package files + config
            {
                cat package.json 2>/dev/null || echo "no-package"
                cat pnpm-lock.yaml 2>/dev/null || cat package-lock.json 2>/dev/null || echo "no-lock"
                cat tsconfig.json 2>/dev/null || echo "no-tsconfig"
            } | shasum -a 256 | cut -d' ' -f1
            ;;
        3)
            # Phase 3: Hash of source files + completion signals
            {
                find src -type f \( -name "*.ts" -o -name "*.tsx" \) 2>/dev/null | \
                    sort | head -100 | xargs cat 2>/dev/null || echo "no-src"
                cat ".claude/signal-wave${wave}-gate3-fe-complete.json" 2>/dev/null || echo "no-fe-signal"
                cat ".claude/signal-wave${wave}-gate3-be-complete.json" 2>/dev/null || echo "no-be-signal"
            } | shasum -a 256 | cut -d' ' -f1
            ;;
        4)
            # Phase 4: Hash of QA approval signal
            cat ".claude/signal-wave${wave}-gate4-approved.json" 2>/dev/null | \
                shasum -a 256 | cut -d' ' -f1 || echo "no-qa-approval"
            ;;
        *)
            echo "invalid-phase"
            ;;
    esac
}

# ─────────────────────────────────────────────────────────────────────────────
# LOCK FILE PATH
# ─────────────────────────────────────────────────────────────────────────────
get_lock_path() {
    local project_root=$1
    local wave=$2
    local phase=$3
    echo "${project_root}/.claude/locks/PHASE${phase}-wave${wave}.lock"
}

# ─────────────────────────────────────────────────────────────────────────────
# CHECK SINGLE PHASE FOR DRIFT
# ─────────────────────────────────────────────────────────────────────────────
check_phase_drift() {
    local project_root=$1
    local wave=$2
    local phase=$3
    local verbose=${4:-false}

    local lock_file=$(get_lock_path "$project_root" "$wave" "$phase")
    local phase_name="${PHASE_NAMES[$phase]}"

    # No lock file = no drift (nothing to compare)
    if [ ! -f "$lock_file" ]; then
        if [ "$verbose" = "true" ]; then
            log_info "Phase $phase ($phase_name): No lock file"
        fi
        echo "NO_LOCK"
        return 0
    fi

    # Check if lock is already invalidated
    local status=$(jq -r '.status' "$lock_file")
    if [ "$status" = "INVALIDATED" ]; then
        if [ "$verbose" = "true" ]; then
            log_warn "Phase $phase ($phase_name): Already invalidated"
        fi
        echo "INVALIDATED"
        return 0
    fi

    # Compare checksums
    local stored_checksum=$(jq -r '.checksum' "$lock_file")
    local current_checksum=$(calculate_checksum "$project_root" "$wave" "$phase")

    if [ "$stored_checksum" = "$current_checksum" ]; then
        if [ "$verbose" = "true" ]; then
            log_success "Phase $phase ($phase_name): No drift"
        fi
        echo "OK"
        return 0
    else
        if [ "$verbose" = "true" ]; then
            log_drift "Phase $phase ($phase_name)"
            log_error "  Stored:  $stored_checksum"
            log_error "  Current: $current_checksum"
        fi
        echo "DRIFT"
        return 1
    fi
}

# ─────────────────────────────────────────────────────────────────────────────
# CHECK ALL PHASES
# ─────────────────────────────────────────────────────────────────────────────
check_all_phases() {
    local project_root=$1
    local wave=$2
    local verbose=${3:-false}
    local json_output=${4:-false}

    local drifted_phases=()
    local results=()

    echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${CYAN} WAVE $wave - DRIFT DETECTION REPORT${NC}"
    echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
    echo ""

    for phase in 0 1 2 3 4; do
        local lock_file=$(get_lock_path "$project_root" "$wave" "$phase")
        local phase_name="${PHASE_NAMES[$phase]}"

        printf "  Phase %d (%-12s): " "$phase" "$phase_name"

        if [ ! -f "$lock_file" ]; then
            echo -e "${BLUE}○ NO LOCK${NC}"
            results+=("{\"phase\":$phase,\"name\":\"$phase_name\",\"status\":\"no_lock\"}")
        else
            local status=$(jq -r '.status' "$lock_file")
            if [ "$status" = "INVALIDATED" ]; then
                echo -e "${YELLOW}⛔ INVALIDATED${NC}"
                results+=("{\"phase\":$phase,\"name\":\"$phase_name\",\"status\":\"invalidated\"}")
            else
                local stored=$(jq -r '.checksum' "$lock_file")
                local current=$(calculate_checksum "$project_root" "$wave" "$phase")

                if [ "$stored" = "$current" ]; then
                    echo -e "${GREEN}✓ NO DRIFT${NC}"
                    results+=("{\"phase\":$phase,\"name\":\"$phase_name\",\"status\":\"ok\"}")
                else
                    echo -e "${RED}${BOLD}⚠ DRIFT DETECTED${NC}"
                    drifted_phases+=($phase)
                    results+=("{\"phase\":$phase,\"name\":\"$phase_name\",\"status\":\"drift\",\"stored\":\"$stored\",\"current\":\"$current\"}")

                    if [ "$verbose" = "true" ]; then
                        echo -e "           ${RED}Stored:  ${stored:0:16}...${NC}"
                        echo -e "           ${RED}Current: ${current:0:16}...${NC}"
                    fi
                fi
            fi
        fi
    done

    echo ""
    echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"

    if [ ${#drifted_phases[@]} -gt 0 ]; then
        echo ""
        log_warn "Drift detected in phases: ${drifted_phases[*]}"
        log_info "Run with 'auto-fix' to invalidate affected locks"
        return 1
    else
        echo ""
        log_success "No drift detected"
        return 0
    fi
}

# ─────────────────────────────────────────────────────────────────────────────
# AUTO-FIX DRIFTED LOCKS
# ─────────────────────────────────────────────────────────────────────────────
auto_fix_drift() {
    local project_root=$1
    local wave=$2

    echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${CYAN} WAVE $wave - AUTO-FIX DRIFT${NC}"
    echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
    echo ""

    local fixed_count=0

    for phase in 0 1 2 3 4; do
        local result=$(check_phase_drift "$project_root" "$wave" "$phase" "false")

        if [ "$result" = "DRIFT" ]; then
            local phase_name="${PHASE_NAMES[$phase]}"
            log_drift "Phase $phase ($phase_name)"

            # Invalidate this lock
            "$SCRIPT_DIR/lock-manager.sh" invalidate \
                --project "$project_root" \
                --wave "$wave" \
                --phase "$phase" \
                --reason "auto_drift_detected" \
                --cascade

            ((fixed_count++))
            log_info "Invalidated Phase $phase and downstream locks"

            # Skip remaining phases (cascade already handled them)
            break
        fi
    done

    echo ""
    echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"

    if [ $fixed_count -gt 0 ]; then
        log_warn "Fixed $fixed_count drifted lock(s)"
        log_info "Re-run phase validators to create new locks"
    else
        log_success "No drift to fix"
    fi
}

# ─────────────────────────────────────────────────────────────────────────────
# GET DOWNSTREAM PHASES
# ─────────────────────────────────────────────────────────────────────────────
get_downstream_phases() {
    local from_phase=$1
    local downstream=()

    # Build dependency graph
    for phase in 0 1 2 3 4; do
        local dep="${PHASE_DEPENDENCIES[$phase]}"
        if [ -n "$dep" ] && [ "$dep" -ge "$from_phase" ]; then
            downstream+=($phase)
        fi
    done

    # Also include all phases after the drifted one
    for phase in $(seq $((from_phase + 1)) 4); do
        if [[ ! " ${downstream[*]} " =~ " ${phase} " ]]; then
            downstream+=($phase)
        fi
    done

    echo "${downstream[*]}"
}

# ─────────────────────────────────────────────────────────────────────────────
# ARGUMENT PARSING
# ─────────────────────────────────────────────────────────────────────────────
MODE=""
PROJECT_ROOT=""
WAVE=""
PHASE=""
VERBOSE=false
JSON_OUTPUT=false

while [[ $# -gt 0 ]]; do
    case $1 in
        check|auto-fix)
            MODE="$1"
            shift
            ;;
        -p|--project)
            PROJECT_ROOT="$2"
            shift 2
            ;;
        -w|--wave)
            WAVE="$2"
            shift 2
            ;;
        --phase)
            PHASE="$2"
            shift 2
            ;;
        --verbose)
            VERBOSE=true
            shift
            ;;
        --json)
            JSON_OUTPUT=true
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
if [ -z "$MODE" ]; then
    log_error "Mode required (check or auto-fix)"
    show_usage
    exit 1
fi

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
# EXECUTE
# ─────────────────────────────────────────────────────────────────────────────
case $MODE in
    check)
        if [ -n "$PHASE" ]; then
            result=$(check_phase_drift "$PROJECT_ROOT" "$WAVE" "$PHASE" "true")
            case $result in
                OK) exit 0 ;;
                NO_LOCK) exit 0 ;;
                INVALIDATED) exit 0 ;;
                DRIFT) exit 1 ;;
            esac
        else
            check_all_phases "$PROJECT_ROOT" "$WAVE" "$VERBOSE" "$JSON_OUTPUT"
        fi
        ;;
    auto-fix)
        auto_fix_drift "$PROJECT_ROOT" "$WAVE"
        ;;
    *)
        log_error "Unknown mode: $MODE"
        exit 1
        ;;
esac
