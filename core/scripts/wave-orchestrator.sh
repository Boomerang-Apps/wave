#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# WAVE ORCHESTRATOR V1.0 - PROJECT-AGNOSTIC
# ═══════════════════════════════════════════════════════════════════════════════
#
# Based on: MAF V11.2 merge-watcher
#
# USAGE:
#   ./wave-orchestrator.sh --project /path/to/your-project
#   ./wave-orchestrator.sh -p /path/to/your-project
#
# FEATURES:
#   - QA rejection detection (signal-wave*-gate4-rejected.json)
#   - Automatic retry triggering (Gate 4.5)
#   - Retry counter with max limit (default: 3)
#   - Escalation when max retries exceeded
#   - Token cost tracking per wave
#   - Budget threshold alerts
#   - Black box recording
#   - Emergency stop detection
#
# ═══════════════════════════════════════════════════════════════════════════════

set -o pipefail

# ─────────────────────────────────────────────────────────────────────────────
# ARGUMENT PARSING
# ─────────────────────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WAVE_ROOT="${WAVE_ROOT:-$(dirname $(dirname "$SCRIPT_DIR"))}"

show_usage() {
    echo "WAVE Orchestrator V1.0"
    echo ""
    echo "Usage: $0 --project <path>"
    echo ""
    echo "Options:"
    echo "  -p, --project   Path to the project to orchestrate (required)"
    echo "  -h, --help      Show this help message"
    echo ""
    echo "Example:"
    echo "  $0 --project /path/to/my-project"
}

PROJECT_ROOT=""
while [[ $# -gt 0 ]]; do
    case $1 in
        -p|--project)
            PROJECT_ROOT="$2"
            shift 2
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

# Load project .env if it exists
if [ -f "$PROJECT_ROOT/.env" ]; then
    source "$PROJECT_ROOT/.env"
fi

# ─────────────────────────────────────────────────────────────────────────────
# CONFIGURATION
# ─────────────────────────────────────────────────────────────────────────────
SIGNAL_CLAUDE_DIR="${SIGNAL_CLAUDE_DIR:-$PROJECT_ROOT/.claude}"
ARCHIVE_DIR="${ARCHIVE_DIR:-$SIGNAL_CLAUDE_DIR/archive}"
BLACK_BOX_DIR="${BLACK_BOX_DIR:-$SIGNAL_CLAUDE_DIR/black-box}"

# Retry configuration
MAX_RETRIES="${MAX_RETRIES:-3}"
POLL_INTERVAL="${POLL_INTERVAL:-10}"

# Budget configuration
WAVE_BUDGET="${WAVE_BUDGET:-2.00}"
STORY_BUDGET="${STORY_BUDGET:-0.50}"
BUDGET_WARNING_THRESHOLD="${BUDGET_WARNING_THRESHOLD:-75}"
BUDGET_CRITICAL_THRESHOLD="${BUDGET_CRITICAL_THRESHOLD:-90}"

# Cost tracking
WAVE1_TOTAL_COST=0
WAVE2_TOTAL_COST=0

# External services
SLACK_WEBHOOK_URL="${SLACK_WEBHOOK_URL:-}"

# Wave tracking (bash 3.x compatible)
WAVE1_STATUS="PENDING"
WAVE2_STATUS="PENDING"
WAVE1_RETRIES=0
WAVE2_RETRIES=0

# ─────────────────────────────────────────────────────────────────────────────
# COLORS
# ─────────────────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# ─────────────────────────────────────────────────────────────────────────────
# LOGGING
# ─────────────────────────────────────────────────────────────────────────────
log() {
    echo -e "[$(date '+%H:%M:%S')] $1"
}

log_black_box() {
    local event_type="$1"
    local details="$2"
    mkdir -p "$BLACK_BOX_DIR"
    echo "{\"timestamp\":\"$(date -Iseconds)\",\"event\":\"$event_type\",\"details\":\"$details\",\"project\":\"$PROJECT_ROOT\"}" >> "$BLACK_BOX_DIR/flight-recorder.jsonl"
}

# ─────────────────────────────────────────────────────────────────────────────
# SLACK NOTIFICATIONS
# ─────────────────────────────────────────────────────────────────────────────
notify_slack() {
    local message="$1"
    local color="${2:-#36a64f}"
    local title="${3:-WAVE Orchestrator}"

    if [ -z "$SLACK_WEBHOOK_URL" ]; then
        log "${CYAN}[SLACK]${NC} $message"
        return 0
    fi

    # Use slack-notify.sh if available
    if [ -f "$WAVE_ROOT/core/scripts/slack-notify.sh" ]; then
        "$WAVE_ROOT/core/scripts/slack-notify.sh" "$@" 2>/dev/null || true
    else
        curl -s -X POST -H 'Content-type: application/json' \
            --data "{\"attachments\":[{\"color\":\"$color\",\"title\":\"$title\",\"text\":\"$message\",\"footer\":\"WAVE | $(date '+%H:%M:%S')\"}]}" \
            "$SLACK_WEBHOOK_URL" > /dev/null 2>&1 || true
    fi
}

# ─────────────────────────────────────────────────────────────────────────────
# COST TRACKING
# ─────────────────────────────────────────────────────────────────────────────
extract_cost_from_signal() {
    local signal_file="$1"
    local cost=0

    if [ -f "$signal_file" ] && command -v jq &> /dev/null; then
        cost=$(jq -r '.token_usage.estimated_cost_usd // 0' "$signal_file" 2>/dev/null || echo "0")
    fi

    echo "$cost"
}

update_wave_cost() {
    local wave="$1"
    local new_cost="$2"

    if [ "$wave" = "1" ]; then
        WAVE1_TOTAL_COST=$(echo "$WAVE1_TOTAL_COST + $new_cost" | bc 2>/dev/null || echo "$WAVE1_TOTAL_COST")
    else
        WAVE2_TOTAL_COST=$(echo "$WAVE2_TOTAL_COST + $new_cost" | bc 2>/dev/null || echo "$WAVE2_TOTAL_COST")
    fi
}

get_wave_cost() {
    local wave="$1"
    if [ "$wave" = "1" ]; then
        echo "$WAVE1_TOTAL_COST"
    else
        echo "$WAVE2_TOTAL_COST"
    fi
}

check_budget_threshold() {
    local wave="$1"
    local current_cost=$(get_wave_cost "$wave")

    if command -v bc &> /dev/null; then
        local percentage=$(echo "scale=0; ($current_cost / $WAVE_BUDGET) * 100" | bc 2>/dev/null || echo "0")

        if [ "$percentage" -ge "$BUDGET_CRITICAL_THRESHOLD" ]; then
            log "${RED}[BUDGET] Wave $wave at ${percentage}% of budget (\$${current_cost}/\$${WAVE_BUDGET})${NC}"
            notify_slack "BUDGET CRITICAL - Wave $wave at ${percentage}%" "#F44336" "Budget"
            return 2
        elif [ "$percentage" -ge "$BUDGET_WARNING_THRESHOLD" ]; then
            log "${YELLOW}[BUDGET] Wave $wave at ${percentage}% of budget (\$${current_cost}/\$${WAVE_BUDGET})${NC}"
            notify_slack "Budget Warning - Wave $wave at ${percentage}%" "#FFC107" "Budget"
            return 1
        fi
    fi

    return 0
}

format_cost_summary() {
    local wave="$1"
    local cost=$(get_wave_cost "$wave")
    echo "\$${cost} / \$${WAVE_BUDGET}"
}

# ─────────────────────────────────────────────────────────────────────────────
# SIGNAL FILE HELPERS
# ─────────────────────────────────────────────────────────────────────────────
check_qa_approved() {
    local wave="$1"
    [ -f "$SIGNAL_CLAUDE_DIR/signal-wave${wave}-gate4-approved.json" ]
}

check_qa_rejected() {
    local wave="$1"
    [ -f "$SIGNAL_CLAUDE_DIR/signal-wave${wave}-gate4-rejected.json" ]
}

check_gate7_approved() {
    local wave="$1"
    [ -f "$SIGNAL_CLAUDE_DIR/signal-wave${wave}-gate7-merge-approved.json" ]
}

check_dev_fix_complete() {
    local wave="$1"
    [ -f "$SIGNAL_CLAUDE_DIR/signal-wave${wave}-gate4.5-fixed.json" ]
}

check_kill_switch() {
    if [ -f "$SIGNAL_CLAUDE_DIR/EMERGENCY-STOP" ]; then
        log "${RED}KILL SWITCH ACTIVE${NC}"
        notify_slack "KILL SWITCH ACTIVATED - Pipeline halted" "#F44336" "STOP"
        log_black_box "KILL_SWITCH" "Pipeline halted"
        exit 1
    fi
}

get_wave_status() {
    local wave="$1"
    if [ "$wave" = "1" ]; then
        echo "$WAVE1_STATUS"
    else
        echo "$WAVE2_STATUS"
    fi
}

set_wave_status() {
    local wave="$1"
    local status="$2"
    if [ "$wave" = "1" ]; then
        WAVE1_STATUS="$status"
    else
        WAVE2_STATUS="$status"
    fi
}

get_wave_retries() {
    local wave="$1"
    if [ "$wave" = "1" ]; then
        echo "$WAVE1_RETRIES"
    else
        echo "$WAVE2_RETRIES"
    fi
}

set_wave_retries() {
    local wave="$1"
    local retries="$2"
    if [ "$wave" = "1" ]; then
        WAVE1_RETRIES="$retries"
    else
        WAVE2_RETRIES="$retries"
    fi
}

# ─────────────────────────────────────────────────────────────────────────────
# QA REJECTION HANDLING
# ─────────────────────────────────────────────────────────────────────────────
handle_qa_rejection() {
    local wave="$1"
    local reject_file="$SIGNAL_CLAUDE_DIR/signal-wave${wave}-gate4-rejected.json"

    # Get current rejection count from file
    local current_count=0
    if command -v jq &> /dev/null; then
        current_count=$(jq -r '.rejection_count // 0' "$reject_file" 2>/dev/null || echo "0")
    fi
    local new_count=$((current_count + 1))

    log "${YELLOW}[QA] Wave $wave REJECTED (attempt $new_count/$MAX_RETRIES)${NC}"
    log_black_box "QA_REJECTION" "wave=$wave retry=$new_count"

    # Archive this rejection
    mkdir -p "$ARCHIVE_DIR"
    cp "$reject_file" "$ARCHIVE_DIR/rejection-wave${wave}-attempt${new_count}-$(date +%Y%m%d-%H%M%S).json"
    log "[ARCHIVE] Rejection archived"

    if [ "$new_count" -ge "$MAX_RETRIES" ]; then
        # ═══════════════════════════════════════════════════════════════════
        # ESCALATION - Max retries reached
        # ═══════════════════════════════════════════════════════════════════
        log "${RED}[ESCALATE] Max retries ($MAX_RETRIES) reached - escalating to human${NC}"
        log_black_box "ESCALATION" "wave=$wave reason=max_retries"

        notify_slack "ESCALATION REQUIRED - Wave $wave exceeded max retries" "#F44336" "ESCALATE"

        # Create escalation signal
        cat > "$SIGNAL_CLAUDE_DIR/signal-wave${wave}-ESCALATION.json" << EOF
{
    "wave": $wave,
    "type": "ESCALATION",
    "reason": "Max retries exceeded",
    "rejection_count": $new_count,
    "max_retries": $MAX_RETRIES,
    "requires": "HUMAN_INTERVENTION",
    "original_issues_file": "signal-wave${wave}-gate4-rejected.json",
    "project": "$PROJECT_ROOT",
    "timestamp": "$(date -Iseconds)"
}
EOF

        set_wave_status "$wave" "ESCALATED"
        return 1
    fi

    # ═══════════════════════════════════════════════════════════════════════
    # RETRY - Trigger Gate 4.5 (Dev Fix)
    # ═══════════════════════════════════════════════════════════════════════
    log "${BLUE}[RETRY] Triggering Gate 4.5 (Dev Fix) - attempt $new_count/$MAX_RETRIES${NC}"
    log_black_box "RETRY_TRIGGERED" "wave=$wave attempt=$new_count"

    # Extract and track cost from rejection signal
    local signal_cost=$(extract_cost_from_signal "$reject_file")
    update_wave_cost "$wave" "$signal_cost"
    local cost_summary=$(format_cost_summary "$wave")

    notify_slack "Retry $new_count/$MAX_RETRIES - Wave $wave - Cost: $cost_summary" "#FFC107" "Retry"

    # Update rejection count in file (if jq available)
    if command -v jq &> /dev/null; then
        local tmp_file=$(mktemp)
        jq ".rejection_count = $new_count" "$reject_file" > "$tmp_file"
        mv "$tmp_file" "$reject_file"
    fi

    # Create retry trigger signal for Dev Fix agent
    cat > "$SIGNAL_CLAUDE_DIR/signal-wave${wave}-gate4.5-retry.json" << EOF
{
    "wave": $wave,
    "gate": "4.5",
    "action": "DEV_FIX",
    "retry_count": $new_count,
    "max_retries": $MAX_RETRIES,
    "issues_file": "signal-wave${wave}-gate4-rejected.json",
    "trigger": "qa_rejection",
    "timestamp": "$(date -Iseconds)"
}
EOF

    log "[SIGNAL] Created signal-wave${wave}-gate4.5-retry.json"

    # Clear previous gate signals to allow re-run
    rm -f "$SIGNAL_CLAUDE_DIR/signal-wave${wave}-gate3-"*.json 2>/dev/null
    rm -f "$SIGNAL_CLAUDE_DIR/signal-wave${wave}-gate4-approved.json" 2>/dev/null
    rm -f "$SIGNAL_CLAUDE_DIR/signal-wave${wave}-gate4.5-fixed.json" 2>/dev/null

    set_wave_status "$wave" "RETRY_$new_count"
    set_wave_retries "$wave" "$new_count"
    return 0
}

# ─────────────────────────────────────────────────────────────────────────────
# HANDLE DEV FIX COMPLETION
# ─────────────────────────────────────────────────────────────────────────────
handle_dev_fix_complete() {
    local wave="$1"

    log "${GREEN}[DEV-FIX] Wave $wave fixes complete - triggering QA re-run${NC}"
    log_black_box "DEV_FIX_COMPLETE" "wave=$wave"

    # Extract and track cost from fixed signal
    local fixed_file="$SIGNAL_CLAUDE_DIR/signal-wave${wave}-gate4.5-fixed.json"
    local signal_cost=$(extract_cost_from_signal "$fixed_file")
    update_wave_cost "$wave" "$signal_cost"
    local cost_summary=$(format_cost_summary "$wave")

    # Remove the rejected signal to allow fresh QA run
    rm -f "$SIGNAL_CLAUDE_DIR/signal-wave${wave}-gate4-rejected.json"
    rm -f "$SIGNAL_CLAUDE_DIR/signal-wave${wave}-gate4.5-retry.json"

    notify_slack "Dev Fix Complete - Wave $wave - Cost: $cost_summary" "#4CAF50" "Fixed"

    # Check budget after fix
    check_budget_threshold "$wave"

    set_wave_status "$wave" "QA_RERUN"
}

# ─────────────────────────────────────────────────────────────────────────────
# PRINT STATUS
# ─────────────────────────────────────────────────────────────────────────────
print_status() {
    echo ""
    echo "┌─────────────────────────────────────────────────────────────────┐"
    echo "│                    WAVE STATUS                                  │"
    echo "├─────────────────────────────────────────────────────────────────┤"
    printf "│  Project: %-52s │\n" "$(basename $PROJECT_ROOT)"
    echo "├─────────────────────────────────────────────────────────────────┤"
    printf "│  Wave 1: %-12s (retries: %d/%d) Cost: \$%-6s          │\n" "$WAVE1_STATUS" "$WAVE1_RETRIES" "$MAX_RETRIES" "$WAVE1_TOTAL_COST"
    printf "│  Wave 2: %-12s (retries: %d/%d) Cost: \$%-6s          │\n" "$WAVE2_STATUS" "$WAVE2_RETRIES" "$MAX_RETRIES" "$WAVE2_TOTAL_COST"
    echo "├─────────────────────────────────────────────────────────────────┤"
    local total=$(echo "$WAVE1_TOTAL_COST + $WAVE2_TOTAL_COST" | bc 2>/dev/null || echo "0")
    printf "│  Budget: \$%-5s/wave  │  Total Spent: \$%-8s              │\n" "$WAVE_BUDGET" "$total"
    echo "└─────────────────────────────────────────────────────────────────┘"
}

# ─────────────────────────────────────────────────────────────────────────────
# PROCESS WAVE
# ─────────────────────────────────────────────────────────────────────────────
process_wave() {
    local wave="$1"
    local status=$(get_wave_status "$wave")

    # Skip if already complete or escalated
    if [ "$status" = "DEPLOYED" ] || [ "$status" = "ESCALATED" ]; then
        return 0
    fi

    # Priority 1: Check for dev-fix completion (triggers QA re-run)
    if check_dev_fix_complete "$wave"; then
        handle_dev_fix_complete "$wave"
        return 0
    fi

    # Priority 2: Check for QA rejection (triggers retry)
    if check_qa_rejected "$wave"; then
        # Only handle if not already in retry state for this rejection
        local retry_file="$SIGNAL_CLAUDE_DIR/signal-wave${wave}-gate4.5-retry.json"
        if [[ "$status" != RETRY_* ]] || [ ! -f "$retry_file" ]; then
            handle_qa_rejection "$wave" || :
        fi
        return 0
    fi

    # Priority 3: Check for QA approval → proceed to Gate 7
    if check_qa_approved "$wave"; then
        if [ "$status" != "QA_APPROVED" ]; then
            log "${GREEN}[WAVE $wave] QA Approved - waiting for Gate 7${NC}"
            set_wave_status "$wave" "QA_APPROVED"

            # Extract and track cost from approval signal
            local approval_file="$SIGNAL_CLAUDE_DIR/signal-wave${wave}-gate4-approved.json"
            local signal_cost=$(extract_cost_from_signal "$approval_file")
            update_wave_cost "$wave" "$signal_cost"
            local cost_summary=$(format_cost_summary "$wave")

            notify_slack "Wave $wave QA Approved - Cost: $cost_summary" "#4CAF50" "QA Pass"

            # Check budget threshold
            check_budget_threshold "$wave"
        fi

        # Check for Gate 7 (final approval)
        if check_gate7_approved "$wave"; then
            log "${GREEN}[WAVE $wave] Gate 7 Approved - ready for deploy${NC}"
            set_wave_status "$wave" "DEPLOYED"
            log_black_box "WAVE_DEPLOYED" "wave=$wave"

            local final_cost=$(get_wave_cost "$wave")
            notify_slack "Wave $wave Deployed - Total Cost: \$${final_cost}" "#4CAF50" "Deploy"
        fi
    fi
}

# ─────────────────────────────────────────────────────────────────────────────
# MAIN POLLING LOOP
# ─────────────────────────────────────────────────────────────────────────────
main() {
    echo "════════════════════════════════════════════════════════════════"
    echo "  WAVE ORCHESTRATOR V1.0"
    echo "  Project-Agnostic Multi-Agent Framework"
    echo "════════════════════════════════════════════════════════════════"
    echo "[PROJECT] $PROJECT_ROOT"
    echo "[CONFIG] Signal directory: $SIGNAL_CLAUDE_DIR"
    echo "[CONFIG] Max retries: $MAX_RETRIES"
    echo "[CONFIG] Poll interval: ${POLL_INTERVAL}s"
    echo "[CONFIG] Wave budget: \$${WAVE_BUDGET}"
    echo "════════════════════════════════════════════════════════════════"

    # Initialize
    mkdir -p "$SIGNAL_CLAUDE_DIR"
    mkdir -p "$ARCHIVE_DIR"
    mkdir -p "$BLACK_BOX_DIR"

    log_black_box "PIPELINE_START" "version=WAVE-1.0"
    notify_slack "Pipeline Started - $(basename $PROJECT_ROOT)" "#2196F3" "Start"

    log "[LOOP] Entering main polling loop..."

    local loop_count=0

    while true; do
        loop_count=$((loop_count + 1))

        # Check kill switch first
        check_kill_switch

        # Print status every 6 iterations (60 seconds)
        if [ $((loop_count % 6)) -eq 0 ]; then
            print_status
        fi

        # Process both waves
        process_wave 1
        process_wave 2

        # ─────────────────────────────────────────────────────────────────
        # Completion Checks
        # ─────────────────────────────────────────────────────────────────

        # All waves deployed successfully
        if [ "$WAVE1_STATUS" = "DEPLOYED" ] && [ "$WAVE2_STATUS" = "DEPLOYED" ]; then
            log "${GREEN}ALL WAVES DEPLOYED SUCCESSFULLY${NC}"
            log_black_box "PIPELINE_COMPLETE" "status=success"

            local total_cost=$(echo "$WAVE1_TOTAL_COST + $WAVE2_TOTAL_COST" | bc 2>/dev/null || echo "0")
            notify_slack "PIPELINE COMPLETE - Total Cost: \$${total_cost}" "#4CAF50" "Complete"
            print_status
            exit 0
        fi

        # All active waves either deployed or escalated
        local all_done=true
        if [ "$WAVE1_STATUS" != "DEPLOYED" ] && [ "$WAVE1_STATUS" != "ESCALATED" ]; then
            all_done=false
        fi
        if [ "$WAVE2_STATUS" != "DEPLOYED" ] && [ "$WAVE2_STATUS" != "ESCALATED" ]; then
            all_done=false
        fi

        if [ "$all_done" = true ]; then
            log "[COMPLETE] All waves processed (some may have escalated)"
            log_black_box "PIPELINE_END" "status=partial"
            print_status
            exit 0
        fi

        # Poll interval
        sleep "$POLL_INTERVAL"
    done
}

# ─────────────────────────────────────────────────────────────────────────────
# ENTRY POINT
# ─────────────────────────────────────────────────────────────────────────────
main "$@"
