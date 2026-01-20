#!/opt/homebrew/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# WAVE BUILDING BLOCKS: LOCK MANAGER
# ═══════════════════════════════════════════════════════════════════════════════
# Manages phase lock files for hard enforcement of the building block workflow.
# Locks MUST exist and be valid for a phase to proceed.
#
# USAGE:
#   ./lock-manager.sh create --project <path> --wave <N> --phase <N> --checks <json>
#   ./lock-manager.sh validate --project <path> --wave <N> --phase <N>
#   ./lock-manager.sh invalidate --project <path> --wave <N> --phase <N> [--reason <text>]
#   ./lock-manager.sh status --project <path> --wave <N>
#   ./lock-manager.sh checksum --project <path> --wave <N> --phase <N>
#
# ENFORCEMENT:
#   - Locks are REQUIRED to proceed between phases
#   - Checksums detect drift and auto-invalidate downstream locks
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
log_info() { echo -e "${BLUE}[LOCK]${NC} $1"; }
log_success() { echo -e "${GREEN}[LOCK]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[LOCK]${NC} $1"; }
log_error() { echo -e "${RED}[LOCK]${NC} $1"; }
log_block() { echo -e "${RED}${BOLD}[BLOCKED]${NC} $1"; }

# ─────────────────────────────────────────────────────────────────────────────
# USAGE
# ─────────────────────────────────────────────────────────────────────────────
show_usage() {
    cat << 'EOF'
WAVE Building Blocks: Lock Manager

Usage: lock-manager.sh <action> [options]

Actions:
  create      Create a new phase lock after validation passes
  validate    Check if a phase lock exists and is valid
  invalidate  Mark a lock as invalid (force re-run)
  status      Show status of all locks for a wave
  checksum    Calculate checksum for a phase

Required Options:
  -p, --project <path>    Path to project directory
  -w, --wave <number>     Wave number

Options for create/validate/invalidate/checksum:
  --phase <number>        Phase number (0-4)

Options for create:
  --checks <json>         JSON object with validation check results

Options for invalidate:
  --reason <text>         Reason for invalidation
  --cascade               Also invalidate all downstream locks

Examples:
  # Create lock after phase 0 validation
  ./lock-manager.sh create -p /path/to/project -w 3 --phase 0 \
      --checks '{"stories_count": 5, "all_valid": true}'

  # Validate phase 2 lock exists and is valid
  ./lock-manager.sh validate -p /path/to/project -w 3 --phase 2

  # Show all lock statuses
  ./lock-manager.sh status -p /path/to/project -w 3

  # Invalidate phase 0 and all downstream
  ./lock-manager.sh invalidate -p /path/to/project -w 3 --phase 0 --cascade

EOF
}

# ─────────────────────────────────────────────────────────────────────────────
# CHECKSUM CALCULATION
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
                # Try flat structure
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
# LOCK FILE OPERATIONS
# ─────────────────────────────────────────────────────────────────────────────
get_lock_path() {
    local project_root=$1
    local wave=$2
    local phase=$3
    echo "${project_root}/.claude/locks/PHASE${phase}-wave${wave}.lock"
}

ensure_lock_dir() {
    local project_root=$1
    mkdir -p "${project_root}/.claude/locks"
}

create_lock() {
    local project_root=$1
    local wave=$2
    local phase=$3
    local checks=$4

    ensure_lock_dir "$project_root"

    local lock_file=$(get_lock_path "$project_root" "$wave" "$phase")
    local checksum=$(calculate_checksum "$project_root" "$wave" "$phase")
    local timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ)

    # Get previous phase checksum if exists
    local prev_phase=${PHASE_DEPENDENCIES[$phase]}
    local prev_checksum=""
    if [ -n "$prev_phase" ]; then
        local prev_lock=$(get_lock_path "$project_root" "$wave" "$prev_phase")
        if [ -f "$prev_lock" ]; then
            prev_checksum=$(jq -r '.checksum // ""' "$prev_lock")
        fi
    fi

    # Create lock file
    cat > "$lock_file" << EOF
{
    "phase": $phase,
    "phase_name": "${PHASE_NAMES[$phase]}",
    "wave": $wave,
    "status": "PASSED",
    "validator": "phase${phase}-validator.sh",
    "validator_version": "$SCRIPT_VERSION",
    "checks": $checks,
    "checksum": "$checksum",
    "previous_phase_checksum": "$prev_checksum",
    "timestamp": "$timestamp",
    "created_by": "lock-manager.sh"
}
EOF

    chmod 600 "$lock_file"
    log_success "Lock created: PHASE${phase}-wave${wave}.lock"
    log_info "  Checksum: $checksum"
}

validate_lock() {
    local project_root=$1
    local wave=$2
    local phase=$3
    local silent=${4:-false}

    local lock_file=$(get_lock_path "$project_root" "$wave" "$phase")

    # Check 1: Lock file must exist
    if [ ! -f "$lock_file" ]; then
        [ "$silent" = "false" ] && log_block "Phase $phase (${PHASE_NAMES[$phase]}) lock not found"
        return 1
    fi

    # Check 2: Lock must have PASSED status
    local status=$(jq -r '.status' "$lock_file")
    if [ "$status" != "PASSED" ]; then
        [ "$silent" = "false" ] && log_block "Phase $phase lock status is '$status' (not PASSED)"
        return 1
    fi

    # Check 3: Checksum must match current state
    local stored_checksum=$(jq -r '.checksum' "$lock_file")
    local current_checksum=$(calculate_checksum "$project_root" "$wave" "$phase")

    if [ "$stored_checksum" != "$current_checksum" ]; then
        [ "$silent" = "false" ] && log_block "Phase $phase (${PHASE_NAMES[$phase]}) - DRIFT DETECTED"
        [ "$silent" = "false" ] && log_error "  Stored checksum:  $stored_checksum"
        [ "$silent" = "false" ] && log_error "  Current checksum: $current_checksum"
        return 1
    fi

    # Check 4: Previous phase must be valid (if has dependency)
    local prev_phase=${PHASE_DEPENDENCIES[$phase]}
    if [ -n "$prev_phase" ]; then
        if ! validate_lock "$project_root" "$wave" "$prev_phase" "true"; then
            [ "$silent" = "false" ] && log_block "Phase $phase depends on Phase $prev_phase which is invalid"
            return 1
        fi
    fi

    [ "$silent" = "false" ] && log_success "Phase $phase (${PHASE_NAMES[$phase]}) lock is VALID"
    return 0
}

invalidate_lock() {
    local project_root=$1
    local wave=$2
    local phase=$3
    local reason=${4:-"manual_invalidation"}
    local cascade=${5:-false}

    local lock_file=$(get_lock_path "$project_root" "$wave" "$phase")

    if [ -f "$lock_file" ]; then
        local timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ)

        # Update lock to INVALIDATED status (keep for audit)
        jq --arg reason "$reason" --arg ts "$timestamp" \
            '.status = "INVALIDATED" | .invalidated_at = $ts | .invalidated_reason = $reason' \
            "$lock_file" > "${lock_file}.tmp" && mv "${lock_file}.tmp" "$lock_file"

        log_warn "Phase $phase (${PHASE_NAMES[$phase]}) lock INVALIDATED"
        log_info "  Reason: $reason"
    fi

    # Cascade to downstream phases if requested
    if [ "$cascade" = "true" ]; then
        for downstream in $(seq $((phase + 1)) 4); do
            local downstream_lock=$(get_lock_path "$project_root" "$wave" "$downstream")
            if [ -f "$downstream_lock" ]; then
                local ds_status=$(jq -r '.status' "$downstream_lock")
                if [ "$ds_status" = "PASSED" ]; then
                    invalidate_lock "$project_root" "$wave" "$downstream" "upstream_drift" "false"
                fi
            fi
        done
    fi
}

show_status() {
    local project_root=$1
    local wave=$2

    echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${CYAN} WAVE $wave - BUILDING BLOCK LOCK STATUS${NC}"
    echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
    echo ""

    for phase in 0 1 2 3 4; do
        local lock_file=$(get_lock_path "$project_root" "$wave" "$phase")
        local phase_name="${PHASE_NAMES[$phase]}"

        printf "  Phase %d (%-12s): " "$phase" "$phase_name"

        if [ ! -f "$lock_file" ]; then
            echo -e "${RED}❌ NOT LOCKED${NC}"
        else
            local status=$(jq -r '.status' "$lock_file")
            local timestamp=$(jq -r '.timestamp' "$lock_file")

            if [ "$status" = "PASSED" ]; then
                # Verify checksum still valid
                local stored=$(jq -r '.checksum' "$lock_file")
                local current=$(calculate_checksum "$project_root" "$wave" "$phase")

                if [ "$stored" = "$current" ]; then
                    echo -e "${GREEN}🔒 LOCKED${NC} (valid) - $timestamp"
                else
                    echo -e "${YELLOW}⚠️ DRIFT${NC} - checksum mismatch"
                fi
            elif [ "$status" = "INVALIDATED" ]; then
                local reason=$(jq -r '.invalidated_reason // "unknown"' "$lock_file")
                echo -e "${YELLOW}⛔ INVALIDATED${NC} - $reason"
            else
                echo -e "${RED}❓ UNKNOWN STATUS: $status${NC}"
            fi
        fi
    done

    echo ""
    echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
}

# ─────────────────────────────────────────────────────────────────────────────
# ARGUMENT PARSING
# ─────────────────────────────────────────────────────────────────────────────
ACTION=""
PROJECT_ROOT=""
WAVE=""
PHASE=""
CHECKS="{}"
REASON=""
CASCADE=false

while [[ $# -gt 0 ]]; do
    case $1 in
        create|validate|invalidate|status|checksum)
            ACTION="$1"
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
        --checks)
            CHECKS="$2"
            shift 2
            ;;
        --reason)
            REASON="$2"
            shift 2
            ;;
        --cascade)
            CASCADE=true
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
if [ -z "$ACTION" ]; then
    log_error "Action required"
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

# Convert to absolute path
PROJECT_ROOT="$(cd "$PROJECT_ROOT" && pwd)"

if [ -z "$WAVE" ]; then
    log_error "--wave is required"
    exit 1
fi

if [[ "$ACTION" =~ ^(create|validate|invalidate|checksum)$ ]] && [ -z "$PHASE" ]; then
    log_error "--phase is required for $ACTION"
    exit 1
fi

# ─────────────────────────────────────────────────────────────────────────────
# EXECUTE ACTION
# ─────────────────────────────────────────────────────────────────────────────
case $ACTION in
    create)
        create_lock "$PROJECT_ROOT" "$WAVE" "$PHASE" "$CHECKS"
        ;;
    validate)
        if validate_lock "$PROJECT_ROOT" "$WAVE" "$PHASE"; then
            exit 0
        else
            exit 1
        fi
        ;;
    invalidate)
        invalidate_lock "$PROJECT_ROOT" "$WAVE" "$PHASE" "$REASON" "$CASCADE"
        ;;
    status)
        show_status "$PROJECT_ROOT" "$WAVE"
        ;;
    checksum)
        checksum=$(calculate_checksum "$PROJECT_ROOT" "$WAVE" "$PHASE")
        echo "$checksum"
        ;;
    *)
        log_error "Unknown action: $ACTION"
        exit 1
        ;;
esac
