#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# WAVE MERGE WATCHER V12.1 - PROJECT-AGNOSTIC WITH RLM INTEGRATION
# ═══════════════════════════════════════════════════════════════════════════════
# Enhanced merge watcher with:
# - Dynamic wave support (--wave flag or WAVE env var)
# - Dynamic wave type detection (FE_ONLY, BE_ONLY, FULL)
# - Worktree sync before QA
# - Comprehensive Slack notifications
# - Token tracking integration
# - RLM (Recursive Language Model) integration for context management
#
# RLM FEATURES:
# - Generates P variable (project state) for agent queries
# - Updates P after worktree sync (codebase changed)
# - Snapshots P at wave completion for recovery
# - Tracks context hashes for change detection
#
# USAGE:
#   ./merge-watcher-v12.sh --project /path/to/project --wave 4
#   ./merge-watcher-v12.sh -p /path/to/project -w 4
#
# ═══════════════════════════════════════════════════════════════════════════════

set -euo pipefail

# ─────────────────────────────────────────────────────────────────────────────
# ARGUMENT PARSING
# ─────────────────────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WAVE_ROOT="${WAVE_ROOT:-$(dirname $(dirname "$SCRIPT_DIR"))}"

show_usage() {
    echo "WAVE Merge Watcher V12.1 (with RLM)"
    echo ""
    echo "Usage: $0 --project <path> [options]"
    echo ""
    echo "Required:"
    echo "  -p, --project <path>    Path to the project to watch (required)"
    echo ""
    echo "Options:"
    echo "  -w, --wave <number>     Wave number to watch (default: 1, or WAVE env var)"
    echo "  -t, --type <type>       Wave type: FE_ONLY, BE_ONLY, FULL (auto-detected if not set)"
    echo "  -i, --interval <secs>   Poll interval in seconds (default: 10)"
    echo "  --no-rlm                Disable RLM (Recursive Language Model) integration"
    echo "  -h, --help              Show this help message"
    echo ""
    echo "RLM Integration:"
    echo "  When enabled (default), merge-watcher generates a P variable containing"
    echo "  project state that agents can query without loading full context."
    echo "  P variable is stored at: <project>/.claude/P.json"
    echo ""
    echo "Examples:"
    echo "  $0 --project /path/to/my-app --wave 3"
    echo "  $0 -p /path/to/my-app -w 4 -t FE_ONLY"
    echo "  $0 -p /path/to/my-app -w 3 --no-rlm"
    echo ""
    echo "Environment variables (can override flags):"
    echo "  WAVE           Wave number"
    echo "  WAVE_TYPE      Wave type (FE_ONLY, BE_ONLY, FULL)"
    echo "  POLL_INTERVAL  Poll interval in seconds"
    echo "  MAX_RETRIES    Maximum QA retry attempts"
    echo "  RLM_ENABLED    Set to 'false' to disable RLM"
}

PROJECT_ROOT=""
WAVE="${WAVE:-1}"
WAVE_TYPE="${WAVE_TYPE:-}"
POLL_INTERVAL="${POLL_INTERVAL:-10}"
MAX_RETRIES="${MAX_RETRIES:-3}"
RLM_CLI_DISABLED=false

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
        -t|--type)
            WAVE_TYPE="$2"
            shift 2
            ;;
        -i|--interval)
            POLL_INTERVAL="$2"
            shift 2
            ;;
        --no-rlm)
            RLM_CLI_DISABLED=true
            shift
            ;;
        -h|--help)
            show_usage
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
done

if [ -z "$PROJECT_ROOT" ]; then
    echo "Error: --project is required"
    show_usage
    exit 1
fi

if [ ! -d "$PROJECT_ROOT" ]; then
    echo "Error: Project directory not found: $PROJECT_ROOT"
    exit 1
fi

# Convert to absolute path
PROJECT_ROOT="$(cd "$PROJECT_ROOT" && pwd)"
SIGNAL_DIR=".claude"

# ─────────────────────────────────────────────────────────────────────────────
# WAVE TYPE DETECTION (Generic - works for ANY wave)
# ─────────────────────────────────────────────────────────────────────────────
# Priority:
#   1. WAVE_TYPE environment variable (explicit override)
#   2. Auto-detect from stories directory
#   3. Default to FULL (both FE and BE required)

detect_wave_type() {
    local wave="$1"
    local project_root="$2"
    local stories_dir="${project_root}/stories/wave${wave}"

    # Count FE and BE stories
    local fe_count=0
    local be_count=0

    if [ -d "$stories_dir" ]; then
        fe_count=$(ls -1 "$stories_dir"/*FE*.json 2>/dev/null | wc -l | tr -d ' ')
        be_count=$(ls -1 "$stories_dir"/*BE*.json 2>/dev/null | wc -l | tr -d ' ')
    fi

    # Determine wave type based on stories
    if [ "$fe_count" -gt 0 ] && [ "$be_count" -gt 0 ]; then
        echo "FULL"
    elif [ "$fe_count" -gt 0 ]; then
        echo "FE_ONLY"
    elif [ "$be_count" -gt 0 ]; then
        echo "BE_ONLY"
    else
        # No stories found - check for signal files as fallback
        if [ -f "${project_root}/.claude/signal-wave${wave}-gate3-fe-complete.json" ] || \
           [ -f "${project_root}/.claude/signal-wave${wave}-gate3-be-complete.json" ]; then
            # Detect from existing signals
            local has_fe_signal=false
            local has_be_signal=false
            [ -f "${project_root}/.claude/signal-wave${wave}-gate3-fe-complete.json" ] && has_fe_signal=true
            [ -f "${project_root}/.claude/signal-wave${wave}-gate3-be-complete.json" ] && has_be_signal=true

            if $has_fe_signal && $has_be_signal; then echo "FULL"
            elif $has_fe_signal; then echo "FE_ONLY"
            elif $has_be_signal; then echo "BE_ONLY"
            else echo "FULL"
            fi
        else
            echo "FULL"  # Default
        fi
    fi
}

# Use environment variable if set, otherwise auto-detect
if [ -z "${WAVE_TYPE:-}" ]; then
    # Auto-detect from stories directory
    WAVE_TYPE=$(detect_wave_type "$WAVE" "$PROJECT_ROOT")
fi
# Note: Wave type is logged after log functions are defined

cd "$PROJECT_ROOT"

# Load environment
if [ -f ".env" ]; then
    source .env
fi

# Load Slack library (SCRIPT_DIR defined in argument parsing section)
if [ -f "$SCRIPT_DIR/lib/slack-notify.sh" ]; then
    source "$SCRIPT_DIR/lib/slack-notify.sh"
fi

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# State tracking
FE_COMPLETE=false
BE_COMPLETE=false
QA_TRIGGERED=false
WORKTREE_SYNCED=false
RETRY_COUNT=0

# ─────────────────────────────────────────────────────────────────────────────
# LOGGING
# ─────────────────────────────────────────────────────────────────────────────

log() {
    echo -e "[$(date '+%H:%M:%S')] $1"
}

log_info() {
    log "${BLUE}[INFO]${NC} $1"
}

log_success() {
    log "${GREEN}[SUCCESS]${NC} $1"
}

log_warn() {
    log "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    log "${RED}[ERROR]${NC} $1"
}

# ─────────────────────────────────────────────────────────────────────────────
# RLM (RECURSIVE LANGUAGE MODEL) INTEGRATION
# ─────────────────────────────────────────────────────────────────────────────
# RLM enables agents to query project state as external variable P
# instead of loading full codebase into context.
# Based on MIT CSAIL research (arXiv:2512.24601)

RLM_DIR="$SCRIPT_DIR/rlm"

# Determine RLM status (priority: CLI flag > env var > auto-detect)
if [ "$RLM_CLI_DISABLED" = "true" ]; then
    RLM_ENABLED=false
elif [ "${RLM_ENABLED:-}" = "false" ]; then
    RLM_ENABLED=false
else
    RLM_ENABLED=true
fi

# Check if RLM scripts exist
if [ "$RLM_ENABLED" = "true" ] && [ ! -f "$RLM_DIR/load-project-variable.sh" ]; then
    log_warn "RLM scripts not found at $RLM_DIR - RLM features disabled"
    RLM_ENABLED=false
fi

# Generate/update the P variable for this project
update_rlm_variable() {
    if [ "$RLM_ENABLED" != "true" ]; then
        return 0
    fi

    local output_file="${PROJECT_ROOT}/.claude/P.json"

    log_info "Updating RLM variable (P)..."

    # Ensure .claude and agent-memory directories exist
    mkdir -p "${PROJECT_ROOT}/.claude"
    mkdir -p "${PROJECT_ROOT}/.claude/agent-memory"
    mkdir -p "${PROJECT_ROOT}/.claude/rlm-snapshots"

    if "$RLM_DIR/load-project-variable.sh" \
        --project "$PROJECT_ROOT" \
        --wave "$WAVE" \
        --output "$output_file" 2>/dev/null; then
        log_success "RLM variable updated: $output_file"
        return 0
    else
        log_warn "Failed to update RLM variable"
        return 1
    fi
}

# Snapshot P variable at checkpoints (for recovery)
snapshot_rlm_variable() {
    if [ "$RLM_ENABLED" != "true" ]; then
        return 0
    fi

    local checkpoint_name="$1"
    local source_file="${PROJECT_ROOT}/.claude/P.json"
    local snapshot_dir="${PROJECT_ROOT}/.claude/rlm-snapshots"
    local snapshot_file="${snapshot_dir}/P-wave${WAVE}-${checkpoint_name}-$(date +%Y%m%d-%H%M%S).json"

    if [ ! -f "$source_file" ]; then
        log_warn "No P.json to snapshot"
        return 1
    fi

    mkdir -p "$snapshot_dir"
    cp "$source_file" "$snapshot_file"
    log_info "RLM snapshot created: $(basename "$snapshot_file")"
    return 0
}

# Get context hash for signal files
get_context_hash() {
    if [ "$RLM_ENABLED" != "true" ]; then
        echo "rlm-disabled"
        return
    fi

    local p_file="${PROJECT_ROOT}/.claude/P.json"

    if [ -f "$p_file" ]; then
        # Extract context_hash from P.json
        local hash=$(grep -o '"context_hash"[[:space:]]*:[[:space:]]*"[^"]*"' "$p_file" 2>/dev/null | head -1 | sed 's/.*"\([^"]*\)"$/\1/')
        if [ -n "$hash" ]; then
            echo "$hash"
            return
        fi
    fi

    # Fallback: generate quick hash from key directories
    local hash=""
    for dir in src lib app components stories; do
        if [ -d "${PROJECT_ROOT}/${dir}" ]; then
            local dir_hash=$(find "${PROJECT_ROOT}/${dir}" -type f -exec stat -f '%m' {} \; 2>/dev/null | sort | md5 | head -c 8)
            hash="${hash}${dir}:${dir_hash},"
        fi
    done
    echo "${hash%,}"
}

# ─────────────────────────────────────────────────────────────────────────────
# HEADER
# ─────────────────────────────────────────────────────────────────────────────

echo ""
echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN} MERGE WATCHER V12.1 - WITH WORKTREE SYNC + RLM${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "  ${BLUE}Project:${NC}        $(basename "$PROJECT_ROOT")"
echo -e "  ${BLUE}Wave:${NC}           $WAVE"
echo -e "  ${BLUE}Wave Type:${NC}      $WAVE_TYPE"
echo -e "  ${BLUE}Signal Dir:${NC}     $PROJECT_ROOT/$SIGNAL_DIR"
echo -e "  ${BLUE}Poll Interval:${NC}  ${POLL_INTERVAL}s"
echo -e "  ${BLUE}Max Retries:${NC}    $MAX_RETRIES"
echo -e "  ${BLUE}RLM Enabled:${NC}    $RLM_ENABLED"
echo ""
echo -e "${CYAN}───────────────────────────────────────────────────────────────${NC}"

# Send startup notification
if type slack_wave_start &>/dev/null; then
    STORY_COUNT=$(find "stories/wave${WAVE}" -name "*.json" 2>/dev/null | wc -l | tr -d ' ')
    slack_wave_start "$WAVE" "$STORY_COUNT" "${WAVE_BUDGET:-2.00}" "$(basename "$PROJECT_ROOT")"
fi

log_info "Watching for Wave $WAVE signals (Type: $WAVE_TYPE)..."
case "$WAVE_TYPE" in
    FE_ONLY) REQUIRED_SIGNALS="gate3-fe-complete" ;;
    BE_ONLY) REQUIRED_SIGNALS="gate3-be-complete" ;;
    *)       REQUIRED_SIGNALS="gate3-fe-complete + gate3-be-complete" ;;
esac
log_info "Required signals: $REQUIRED_SIGNALS"

# Initialize RLM variable at startup
if [ "$RLM_ENABLED" = "true" ]; then
    log_info "RLM integration enabled"
    update_rlm_variable
    CONTEXT_HASH=$(get_context_hash)
    log_info "Initial context hash: $CONTEXT_HASH"
fi

# ─────────────────────────────────────────────────────────────────────────────
# SIGNAL CHECKING FUNCTIONS
# ─────────────────────────────────────────────────────────────────────────────

check_fe_complete() {
    local signal="$SIGNAL_DIR/signal-wave${WAVE}-gate3-fe-complete.json"
    if [ -f "$signal" ]; then
        return 0
    fi
    return 1
}

check_be_complete() {
    local signal="$SIGNAL_DIR/signal-wave${WAVE}-gate3-be-complete.json"
    if [ -f "$signal" ]; then
        return 0
    fi
    return 1
}

check_qa_approved() {
    local signal="$SIGNAL_DIR/signal-wave${WAVE}-gate4-approved.json"
    if [ -f "$signal" ]; then
        return 0
    fi
    return 1
}

check_qa_rejected() {
    local signal="$SIGNAL_DIR/signal-wave${WAVE}-gate4-rejected.json"
    if [ -f "$signal" ]; then
        return 0
    fi
    return 1
}

check_emergency_stop() {
    if [ -f "$SIGNAL_DIR/EMERGENCY-STOP" ]; then
        return 0
    fi
    return 1
}

# ─────────────────────────────────────────────────────────────────────────────
# WORKTREE SYNC FUNCTION (CRITICAL FIX)
# ─────────────────────────────────────────────────────────────────────────────

sync_worktrees() {
    log_info "Starting worktree synchronization..."

    # 1. Commit FE-Dev changes
    log_info "Committing FE-Dev changes..."
    if [ -d "worktrees/fe-dev" ]; then
        cd "worktrees/fe-dev"
        git add -A 2>/dev/null || true
        git commit -m "Wave $WAVE FE: Gate 3 complete" 2>/dev/null || log_warn "No FE changes to commit"
        cd "$PROJECT_ROOT"
        log_success "FE-Dev changes committed"
    fi

    # 2. Commit BE-Dev changes
    log_info "Committing BE-Dev changes..."
    if [ -d "worktrees/be-dev" ]; then
        cd "worktrees/be-dev"
        git add -A 2>/dev/null || true
        git commit -m "Wave $WAVE BE: Gate 3 complete" 2>/dev/null || log_warn "No BE changes to commit"
        cd "$PROJECT_ROOT"
        log_success "BE-Dev changes committed"
    fi

    # 3. Merge FE branch to main
    log_info "Merging FE branch to main..."
    git fetch . feature/fe-dev:feature/fe-dev 2>/dev/null || true
    if git merge feature/fe-dev --no-edit -m "Merge Wave $WAVE FE changes" 2>/dev/null; then
        log_success "FE branch merged to main"
    else
        log_warn "FE merge may have conflicts - attempting resolution"
        git checkout --theirs . 2>/dev/null || true
        git add -A
        git commit --no-edit -m "Merge Wave $WAVE FE (auto-resolved)" 2>/dev/null || true
    fi

    # 4. Merge BE branch to main
    log_info "Merging BE branch to main..."
    git fetch . feature/be-dev:feature/be-dev 2>/dev/null || true
    if git merge feature/be-dev --no-edit -m "Merge Wave $WAVE BE changes" 2>/dev/null; then
        log_success "BE branch merged to main"
    else
        log_warn "BE merge may have conflicts - attempting resolution"
        git checkout --theirs . 2>/dev/null || true
        git add -A
        git commit --no-edit -m "Merge Wave $WAVE BE (auto-resolved)" 2>/dev/null || true
    fi

    # 5. Update QA worktree from main
    log_info "Updating QA worktree from main..."
    if [ -d "worktrees/qa" ]; then
        cd "worktrees/qa"
        git fetch origin main 2>/dev/null || git fetch . main:main 2>/dev/null || true
        git reset --hard origin/main 2>/dev/null || git reset --hard main 2>/dev/null || {
            # Fallback: checkout from main
            cd "$PROJECT_ROOT"
            cp -R src/ worktrees/qa/src/ 2>/dev/null || true
            cp -R migrations/ worktrees/qa/migrations/ 2>/dev/null || true
            log_warn "Used file copy fallback for QA sync"
        }
        cd "$PROJECT_ROOT"
        log_success "QA worktree updated"
    fi

    WORKTREE_SYNCED=true

    # Send Slack notification
    if type slack_worktree_sync &>/dev/null; then
        slack_worktree_sync "$WAVE" "SUCCESS" "FE+BE merged to main, QA updated"
    fi

    # RLM: Update P variable after sync (codebase has changed)
    if [ "$RLM_ENABLED" = "true" ]; then
        log_info "Updating RLM variable after worktree sync..."
        update_rlm_variable
        CONTEXT_HASH=$(get_context_hash)
        log_info "Post-sync context hash: $CONTEXT_HASH"
    fi

    log_success "Worktree synchronization complete!"
}

# ─────────────────────────────────────────────────────────────────────────────
# GATE HANDLERS
# ─────────────────────────────────────────────────────────────────────────────

handle_gate3_complete() {
    log_success "Gate 3 Complete - Both FE and BE finished"

    # Send notification
    if type slack_gate_transition &>/dev/null; then
        slack_gate_transition "$WAVE" "3" "3.5" "COMPLETE"
    fi

    # CRITICAL: Sync worktrees before QA
    log_info "Starting worktree sync (Gate 3.5)..."
    sync_worktrees

    log_info "QA agent can now validate merged code"
}

handle_qa_approved() {
    log_success "QA Approved! Wave $WAVE passed validation"

    # Send notification
    if type slack_qa_approved &>/dev/null; then
        slack_qa_approved "$WAVE" "All" "SUCCESS"
    fi

    # Send gate transition
    if type slack_gate_transition &>/dev/null; then
        slack_gate_transition "$WAVE" "4" "5" "APPROVED"
    fi

    # Push to remote (pull first to handle remote changes)
    log_info "Syncing with remote..."
    git fetch origin main 2>/dev/null || true
    if git pull --rebase origin main 2>/dev/null; then
        log_success "Pulled latest from remote"
    else
        log_warn "Pull had conflicts, attempting to continue"
        git rebase --continue 2>/dev/null || git rebase --abort 2>/dev/null || true
    fi

    log_info "Pushing to remote..."
    if git push origin main 2>/dev/null; then
        log_success "Pushed to origin/main"
    else
        log_warn "Push failed - may need manual intervention"
    fi

    # Wave complete notification
    if type slack_wave_complete &>/dev/null; then
        STORY_COUNT=$(find "stories/wave${WAVE}" -name "*.json" 2>/dev/null | wc -l | tr -d ' ')
        slack_wave_complete "$WAVE" "$STORY_COUNT" "N/A" "N/A" "N/A"
    fi

    # RLM: Snapshot P variable at wave completion (for recovery/history)
    if [ "$RLM_ENABLED" = "true" ]; then
        log_info "Creating RLM snapshot at wave completion..."
        snapshot_rlm_variable "complete"
        log_info "Final context hash: $(get_context_hash)"
    fi

    log_success "Wave $WAVE complete!"
    exit 0
}

handle_qa_rejected() {
    ((RETRY_COUNT++))
    log_error "QA Rejected - Attempt $RETRY_COUNT of $MAX_RETRIES"

    # Read rejection details
    local rejection_file="$SIGNAL_DIR/signal-wave${WAVE}-gate4-rejected.json"
    local issues=""
    if [ -f "$rejection_file" ]; then
        issues=$(jq -r '.issues[]?.description // "Unknown issue"' "$rejection_file" 2>/dev/null | head -5 | tr '\n' '; ')
    fi

    # Send notification
    if type slack_qa_rejected &>/dev/null; then
        slack_qa_rejected "$WAVE" "$RETRY_COUNT" "$MAX_RETRIES" "$issues"
    fi

    if [ $RETRY_COUNT -ge $MAX_RETRIES ]; then
        log_error "Max retries exceeded - escalating to human"

        if type slack_escalation &>/dev/null; then
            slack_escalation "$WAVE" "Max retries exceeded after $MAX_RETRIES attempts" "N/A"
        fi

        exit 1
    fi

    # Archive rejection and prepare for retry
    mv "$rejection_file" "$SIGNAL_DIR/archive/rejection-wave${WAVE}-attempt${RETRY_COUNT}-$(date +%Y%m%d-%H%M%S).json" 2>/dev/null || true

    # Create retry signal (with context hash for RLM tracking)
    local retry_context_hash=""
    if [ "$RLM_ENABLED" = "true" ]; then
        retry_context_hash=$(get_context_hash)
        # Update RLM variable before retry
        update_rlm_variable
    fi

    cat > "$SIGNAL_DIR/signal-wave${WAVE}-gate4.5-retry.json" <<EOF
{
  "signal": "gate4.5-retry",
  "wave": $WAVE,
  "attempt": $RETRY_COUNT,
  "max_retries": $MAX_RETRIES,
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "context_hash": "${retry_context_hash:-unknown}"
}
EOF

    log_info "Retry signal created - waiting for dev-fix agent"
}

# ─────────────────────────────────────────────────────────────────────────────
# MAIN LOOP
# ─────────────────────────────────────────────────────────────────────────────

log_info "Entering main polling loop..."

while true; do
    # Check for emergency stop
    if check_emergency_stop; then
        log_error "EMERGENCY STOP detected!"
        if type slack_error &>/dev/null; then
            slack_error "Merge Watcher" "Emergency stop triggered" "$WAVE"
        fi
        exit 1
    fi

    # Check FE completion (for FE_ONLY or FULL waves)
    if [[ "$WAVE_TYPE" == "FE_ONLY" || "$WAVE_TYPE" == "FULL" ]]; then
        if ! $FE_COMPLETE && check_fe_complete; then
            FE_COMPLETE=true
            log_success "FE-Dev Gate 3 complete"
            if type slack_gate_transition &>/dev/null; then
                slack_gate_transition "$WAVE" "3-FE" "3" "COMPLETE"
            fi
        fi
    else
        # BE_ONLY waves: mark FE as complete (not applicable)
        FE_COMPLETE=true
    fi

    # Check BE completion (for BE_ONLY or FULL waves)
    if [[ "$WAVE_TYPE" == "BE_ONLY" || "$WAVE_TYPE" == "FULL" ]]; then
        if ! $BE_COMPLETE && check_be_complete; then
            BE_COMPLETE=true
            log_success "BE-Dev Gate 3 complete"
            if type slack_gate_transition &>/dev/null; then
                slack_gate_transition "$WAVE" "3-BE" "3" "COMPLETE"
            fi
        fi
    else
        # FE_ONLY waves: mark BE as complete (not applicable)
        BE_COMPLETE=true
    fi

    # When required components complete, sync worktrees and allow QA
    if $FE_COMPLETE && $BE_COMPLETE && ! $WORKTREE_SYNCED; then
        handle_gate3_complete
    fi

    # Check QA result (only after sync)
    if $WORKTREE_SYNCED; then
        if check_qa_approved; then
            handle_qa_approved
        elif check_qa_rejected; then
            handle_qa_rejected
        fi
    fi

    # Display status based on wave type
    case "$WAVE_TYPE" in
        FE_ONLY)
            echo -ne "\r[$(date '+%H:%M:%S')] Wave $WAVE (FE) | FE: $([ "$FE_COMPLETE" = true ] && echo '✓' || echo '⋯') | Sync: $([ "$WORKTREE_SYNCED" = true ] && echo '✓' || echo '⋯') | Retries: $RETRY_COUNT/$MAX_RETRIES    "
            ;;
        BE_ONLY)
            echo -ne "\r[$(date '+%H:%M:%S')] Wave $WAVE (BE) | BE: $([ "$BE_COMPLETE" = true ] && echo '✓' || echo '⋯') | Sync: $([ "$WORKTREE_SYNCED" = true ] && echo '✓' || echo '⋯') | Retries: $RETRY_COUNT/$MAX_RETRIES    "
            ;;
        *)
            echo -ne "\r[$(date '+%H:%M:%S')] Wave $WAVE | FE: $([ "$FE_COMPLETE" = true ] && echo '✓' || echo '⋯') | BE: $([ "$BE_COMPLETE" = true ] && echo '✓' || echo '⋯') | Sync: $([ "$WORKTREE_SYNCED" = true ] && echo '✓' || echo '⋯') | Retries: $RETRY_COUNT/$MAX_RETRIES    "
            ;;
    esac

    sleep "$POLL_INTERVAL"
done
