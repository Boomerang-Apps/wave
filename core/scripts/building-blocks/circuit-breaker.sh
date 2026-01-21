#!/opt/homebrew/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# WAVE BUILDING BLOCKS: CIRCUIT BREAKER
# ═══════════════════════════════════════════════════════════════════════════════
# Monitors for failure patterns and auto-halts execution to prevent runaway costs.
#
# CIRCUIT BREAKER CONDITIONS:
#   1. 3 consecutive QA rejections → HALT + escalate
#   2. Cost exceeds 90% of budget → HALT + escalate
#   3. Same error repeated 3 times → HALT + escalate
#   4. Agent stuck > 30 minutes (no output) → HALT + escalate
#
# USAGE:
#   ./circuit-breaker.sh check --project <path> --wave <N>
#   ./circuit-breaker.sh monitor --project <path> --wave <N> --budget <amount>
#   ./circuit-breaker.sh reset --project <path> --wave <N>
#   ./circuit-breaker.sh trip --project <path> --wave <N> --reason <reason>
#
# EXIT CODES:
#   0 - Circuit closed (OK to proceed)
#   1 - Circuit OPEN (HALT immediately)
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
MAX_QA_REJECTIONS=3
MAX_SAME_ERROR=3
BUDGET_THRESHOLD=0.90  # 90%
STUCK_TIMEOUT_MINUTES=30

# ─────────────────────────────────────────────────────────────────────────────
# LOGGING
# ─────────────────────────────────────────────────────────────────────────────
log_info() { echo -e "${BLUE}[CIRCUIT-BREAKER]${NC} $1"; }
log_success() { echo -e "${GREEN}[CIRCUIT-BREAKER]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[CIRCUIT-BREAKER]${NC} $1"; }
log_error() { echo -e "${RED}[CIRCUIT-BREAKER]${NC} $1"; }
log_trip() { echo -e "${RED}${BOLD}[CIRCUIT TRIPPED]${NC} $1"; }

# ─────────────────────────────────────────────────────────────────────────────
# USAGE
# ─────────────────────────────────────────────────────────────────────────────
show_usage() {
    cat << 'EOF'
WAVE Circuit Breaker - Auto-halt on failure patterns

Usage: circuit-breaker.sh <command> [options]

Commands:
  check     Check if circuit is open (should halt)
  monitor   Run continuous monitoring
  reset     Reset circuit breaker state
  trip      Manually trip the circuit breaker
  status    Show current circuit breaker status

Required:
  -p, --project <path>     Path to project directory
  -w, --wave <number>      Wave number

Optional:
  -b, --budget <amount>    Budget limit for cost monitoring
  --reason <reason>        Reason for manual trip
  --interval <seconds>     Monitor check interval (default: 60)

Circuit Breaker Conditions:
  - 3 consecutive QA rejections
  - Cost >= 90% of budget
  - Same error 3 times in a row
  - Agent stuck for 30+ minutes

Exit Codes:
  0  Circuit CLOSED (OK to proceed)
  1  Circuit OPEN (HALT immediately)
  2  Invalid arguments

Examples:
  # Check circuit status
  ./circuit-breaker.sh check -p /path/to/project -w 3

  # Start continuous monitoring
  ./circuit-breaker.sh monitor -p /path/to/project -w 3 -b 10.00

  # Manually trip the circuit
  ./circuit-breaker.sh trip -p /path/to/project -w 3 --reason "Manual halt requested"

  # Reset after fixing issues
  ./circuit-breaker.sh reset -p /path/to/project -w 3

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
# GET CIRCUIT BREAKER FILE PATH
# ─────────────────────────────────────────────────────────────────────────────
get_circuit_file() {
    echo "$PROJECT_PATH/.claude/circuit-breaker-wave${WAVE_NUMBER}.json"
}

# ─────────────────────────────────────────────────────────────────────────────
# CHECK IF CIRCUIT IS OPEN
# ─────────────────────────────────────────────────────────────────────────────
is_circuit_open() {
    local circuit_file
    circuit_file=$(get_circuit_file)

    if [ ! -f "$circuit_file" ]; then
        return 1  # No file = circuit closed
    fi

    local status
    status=$(jq -r '.status // "CLOSED"' "$circuit_file" 2>/dev/null || echo "CLOSED")

    if [ "$status" = "OPEN" ]; then
        return 0  # Circuit is open
    fi

    return 1  # Circuit is closed
}

# ─────────────────────────────────────────────────────────────────────────────
# TRIP THE CIRCUIT
# ─────────────────────────────────────────────────────────────────────────────
trip_circuit() {
    local reason=$1
    local circuit_file
    circuit_file=$(get_circuit_file)

    local timestamp
    timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

    mkdir -p "$(dirname "$circuit_file")"

    cat > "$circuit_file" << EOF
{
    "status": "OPEN",
    "wave": $WAVE_NUMBER,
    "reason": "$reason",
    "tripped_at": "$timestamp",
    "tripped_by": "circuit-breaker.sh",
    "version": "$SCRIPT_VERSION"
}
EOF

    # Also create EMERGENCY-STOP file
    echo "$reason" > "$PROJECT_PATH/.claude/EMERGENCY-STOP"

    # Send escalation notification
    send_notification "escalation" "$WAVE_NUMBER" "CIRCUIT BREAKER: $reason"

    log_trip "Circuit breaker TRIPPED!"
    log_trip "Reason: $reason"
    log_trip "All agents should HALT immediately"

    return 0
}

# ─────────────────────────────────────────────────────────────────────────────
# RESET THE CIRCUIT
# ─────────────────────────────────────────────────────────────────────────────
reset_circuit() {
    local circuit_file
    circuit_file=$(get_circuit_file)

    local timestamp
    timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

    cat > "$circuit_file" << EOF
{
    "status": "CLOSED",
    "wave": $WAVE_NUMBER,
    "reset_at": "$timestamp",
    "reset_by": "manual",
    "version": "$SCRIPT_VERSION"
}
EOF

    # Remove EMERGENCY-STOP file if it was created by circuit breaker
    if [ -f "$PROJECT_PATH/.claude/EMERGENCY-STOP" ]; then
        rm -f "$PROJECT_PATH/.claude/EMERGENCY-STOP"
    fi

    log_success "Circuit breaker RESET - circuit is now CLOSED"
    return 0
}

# ─────────────────────────────────────────────────────────────────────────────
# CHECK QA REJECTIONS
# ─────────────────────────────────────────────────────────────────────────────
check_qa_rejections() {
    local rejection_file="$PROJECT_PATH/.claude/signal-wave${WAVE_NUMBER}-gate4-rejected.json"

    if [ ! -f "$rejection_file" ]; then
        echo "0"
        return
    fi

    local count
    count=$(jq -r '.rejection_count // 0' "$rejection_file" 2>/dev/null || echo "0")
    echo "$count"
}

# ─────────────────────────────────────────────────────────────────────────────
# CHECK COST
# ─────────────────────────────────────────────────────────────────────────────
check_cost() {
    local cost_file="$PROJECT_PATH/.claude/cost-tracker-wave${WAVE_NUMBER}.json"

    if [ ! -f "$cost_file" ]; then
        echo "0.00"
        return
    fi

    local cost
    cost=$(jq -r '.total_cost // "0.00"' "$cost_file" 2>/dev/null || echo "0.00")
    echo "$cost"
}

# ─────────────────────────────────────────────────────────────────────────────
# CHECK FOR REPEATED ERRORS
# ─────────────────────────────────────────────────────────────────────────────
check_repeated_errors() {
    local error_log="$PROJECT_PATH/.claude/error-log-wave${WAVE_NUMBER}.json"

    if [ ! -f "$error_log" ]; then
        echo "0"
        return
    fi

    # Get count of most repeated error
    local max_repeat
    max_repeat=$(jq -r '[.errors[] | .message] | group_by(.) | map(length) | max // 0' "$error_log" 2>/dev/null || echo "0")
    echo "$max_repeat"
}

# ─────────────────────────────────────────────────────────────────────────────
# CHECK FOR STUCK AGENT
# ─────────────────────────────────────────────────────────────────────────────
check_stuck_agent() {
    local heartbeat_file="$PROJECT_PATH/.claude/heartbeat.json"

    if [ ! -f "$heartbeat_file" ]; then
        echo "0"  # No heartbeat file = not monitoring
        return
    fi

    local last_beat
    last_beat=$(jq -r '.timestamp // ""' "$heartbeat_file" 2>/dev/null || echo "")

    if [ -z "$last_beat" ]; then
        echo "0"
        return
    fi

    # Calculate minutes since last heartbeat
    local last_epoch now_epoch
    if [[ "$OSTYPE" == "darwin"* ]]; then
        last_epoch=$(date -j -f "%Y-%m-%dT%H:%M:%SZ" "$last_beat" +%s 2>/dev/null || echo "0")
    else
        last_epoch=$(date -d "$last_beat" +%s 2>/dev/null || echo "0")
    fi
    now_epoch=$(date +%s)

    if [ "$last_epoch" = "0" ]; then
        echo "0"
        return
    fi

    local minutes_ago=$(( (now_epoch - last_epoch) / 60 ))
    echo "$minutes_ago"
}

# ─────────────────────────────────────────────────────────────────────────────
# RUN ALL CHECKS
# ─────────────────────────────────────────────────────────────────────────────
run_checks() {
    local budget=${BUDGET:-"999999"}

    # Check if already tripped
    if is_circuit_open; then
        local circuit_file
        circuit_file=$(get_circuit_file)
        local reason
        reason=$(jq -r '.reason // "Unknown"' "$circuit_file" 2>/dev/null || echo "Unknown")
        log_error "Circuit is OPEN: $reason"
        return 1
    fi

    # Check 1: QA Rejections
    local qa_rejections
    qa_rejections=$(check_qa_rejections)
    if [ "$qa_rejections" -ge "$MAX_QA_REJECTIONS" ]; then
        trip_circuit "Max QA rejections reached ($qa_rejections/$MAX_QA_REJECTIONS)"
        return 1
    fi

    # Check 2: Budget threshold
    local current_cost
    current_cost=$(check_cost)
    local threshold
    threshold=$(echo "$budget * $BUDGET_THRESHOLD" | bc 2>/dev/null || echo "$budget")
    local over_budget
    over_budget=$(echo "$current_cost >= $threshold" | bc 2>/dev/null || echo "0")

    if [ "$over_budget" -eq 1 ]; then
        trip_circuit "Cost threshold exceeded (\$$current_cost >= 90% of \$$budget)"
        return 1
    fi

    # Check 3: Repeated errors
    local repeated_errors
    repeated_errors=$(check_repeated_errors)
    if [ "$repeated_errors" -ge "$MAX_SAME_ERROR" ]; then
        trip_circuit "Same error repeated $repeated_errors times"
        return 1
    fi

    # Check 4: Stuck agent
    local stuck_minutes
    stuck_minutes=$(check_stuck_agent)
    if [ "$stuck_minutes" -ge "$STUCK_TIMEOUT_MINUTES" ]; then
        trip_circuit "Agent stuck for $stuck_minutes minutes (no heartbeat)"
        return 1
    fi

    return 0
}

# ─────────────────────────────────────────────────────────────────────────────
# SHOW STATUS
# ─────────────────────────────────────────────────────────────────────────────
show_status() {
    local circuit_file
    circuit_file=$(get_circuit_file)

    echo ""
    echo -e "${CYAN}${BOLD}╔═══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}${BOLD}║              CIRCUIT BREAKER STATUS                           ║${NC}"
    echo -e "${CYAN}${BOLD}╚═══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "  Project: ${CYAN}$(basename "$PROJECT_PATH")${NC}"
    echo -e "  Wave:    ${CYAN}$WAVE_NUMBER${NC}"
    echo ""

    if is_circuit_open; then
        local reason tripped_at
        reason=$(jq -r '.reason // "Unknown"' "$circuit_file" 2>/dev/null || echo "Unknown")
        tripped_at=$(jq -r '.tripped_at // "Unknown"' "$circuit_file" 2>/dev/null || echo "Unknown")

        echo -e "  Status:  ${RED}${BOLD}OPEN (HALTED)${NC}"
        echo -e "  Reason:  ${RED}$reason${NC}"
        echo -e "  Tripped: $tripped_at"
    else
        echo -e "  Status:  ${GREEN}${BOLD}CLOSED (OK)${NC}"
    fi

    echo ""
    echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""

    # Show current metrics
    local qa_rejections current_cost repeated_errors stuck_minutes

    qa_rejections=$(check_qa_rejections)
    current_cost=$(check_cost)
    repeated_errors=$(check_repeated_errors)
    stuck_minutes=$(check_stuck_agent)

    echo -e "  QA Rejections:    ${qa_rejections}/${MAX_QA_REJECTIONS} $([ "$qa_rejections" -ge "$MAX_QA_REJECTIONS" ] && echo -e "${RED}(TRIP)${NC}" || echo -e "${GREEN}(OK)${NC}")"
    echo -e "  Current Cost:     \$$current_cost $([ -n "${BUDGET:-}" ] && echo "/ \$$BUDGET")"
    echo -e "  Repeated Errors:  ${repeated_errors}/${MAX_SAME_ERROR} $([ "$repeated_errors" -ge "$MAX_SAME_ERROR" ] && echo -e "${RED}(TRIP)${NC}" || echo -e "${GREEN}(OK)${NC}")"
    echo -e "  Stuck Duration:   ${stuck_minutes} min / ${STUCK_TIMEOUT_MINUTES} min $([ "$stuck_minutes" -ge "$STUCK_TIMEOUT_MINUTES" ] && echo -e "${RED}(TRIP)${NC}" || echo -e "${GREEN}(OK)${NC}")"
    echo ""
}

# ─────────────────────────────────────────────────────────────────────────────
# CONTINUOUS MONITORING
# ─────────────────────────────────────────────────────────────────────────────
run_monitor() {
    local interval=${MONITOR_INTERVAL:-60}

    log_info "Starting continuous monitoring (interval: ${interval}s)"
    log_info "Press Ctrl+C to stop"
    echo ""

    while true; do
        if ! run_checks; then
            log_error "Circuit breaker TRIPPED - monitoring stopped"
            exit 1
        fi

        log_success "All checks passed - circuit CLOSED"
        sleep "$interval"
    done
}

# ─────────────────────────────────────────────────────────────────────────────
# ARGUMENT PARSING
# ─────────────────────────────────────────────────────────────────────────────
COMMAND=""
PROJECT_PATH=""
WAVE_NUMBER=""
BUDGET=""
TRIP_REASON=""
MONITOR_INTERVAL=60

# Get command first
if [ $# -gt 0 ]; then
    COMMAND="$1"
    shift
fi

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
        --reason)
            TRIP_REASON="$2"
            shift 2
            ;;
        --interval)
            MONITOR_INTERVAL="$2"
            shift 2
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
if [ -z "$COMMAND" ]; then
    echo "Error: Command required (check, monitor, reset, trip, status)"
    show_usage
    exit 2
fi

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

# ─────────────────────────────────────────────────────────────────────────────
# EXECUTE COMMAND
# ─────────────────────────────────────────────────────────────────────────────
case $COMMAND in
    check)
        if run_checks; then
            log_success "Circuit is CLOSED - safe to proceed"
            exit 0
        else
            exit 1
        fi
        ;;
    monitor)
        run_monitor
        ;;
    reset)
        reset_circuit
        exit 0
        ;;
    trip)
        if [ -z "$TRIP_REASON" ]; then
            TRIP_REASON="Manual trip requested"
        fi
        trip_circuit "$TRIP_REASON"
        exit 1
        ;;
    status)
        show_status
        if is_circuit_open; then
            exit 1
        fi
        exit 0
        ;;
    *)
        echo "Unknown command: $COMMAND"
        show_usage
        exit 2
        ;;
esac
