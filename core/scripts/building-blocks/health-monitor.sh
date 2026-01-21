#!/opt/homebrew/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# WAVE BUILDING BLOCKS: HEALTH MONITOR
# ═══════════════════════════════════════════════════════════════════════════════
# Runtime health monitoring for autonomous agents. Runs alongside agents to:
#   - Send periodic heartbeats
#   - Track cost burn rate
#   - Monitor agent activity
#   - Create checkpoints for recovery
#
# USAGE:
#   ./health-monitor.sh start --project <path> --wave <N> --agent <name>
#   ./health-monitor.sh heartbeat --project <path> --wave <N> --agent <name>
#   ./health-monitor.sh checkpoint --project <path> --wave <N> --agent <name>
#   ./health-monitor.sh cost --project <path> --wave <N> --add <amount>
#   ./health-monitor.sh status --project <path> --wave <N>
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
NC='\033[0m'

# ─────────────────────────────────────────────────────────────────────────────
# CONFIGURATION
# ─────────────────────────────────────────────────────────────────────────────
HEARTBEAT_INTERVAL=60  # seconds
CHECKPOINT_INTERVAL=300  # 5 minutes

# ─────────────────────────────────────────────────────────────────────────────
# LOGGING
# ─────────────────────────────────────────────────────────────────────────────
log_info() { echo -e "${BLUE}[HEALTH]${NC} $1"; }
log_success() { echo -e "${GREEN}[HEALTH]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[HEALTH]${NC} $1"; }
log_error() { echo -e "${RED}[HEALTH]${NC} $1"; }

# ─────────────────────────────────────────────────────────────────────────────
# USAGE
# ─────────────────────────────────────────────────────────────────────────────
show_usage() {
    cat << 'EOF'
WAVE Health Monitor - Runtime health tracking

Usage: health-monitor.sh <command> [options]

Commands:
  start       Start continuous health monitoring
  heartbeat   Record a single heartbeat
  checkpoint  Create a recovery checkpoint
  cost        Track cost (--add <amount>)
  status      Show health status
  error       Log an error (--message <msg>)

Required:
  -p, --project <path>     Path to project directory
  -w, --wave <number>      Wave number

Optional:
  -a, --agent <name>       Agent name (fe-dev, be-dev, qa, dev-fix)
  --add <amount>           Cost amount to add
  --message <msg>          Error message to log
  --interval <seconds>     Heartbeat interval (default: 60)

Examples:
  # Start monitoring for fe-dev agent
  ./health-monitor.sh start -p /path/to/project -w 3 -a fe-dev

  # Record a heartbeat
  ./health-monitor.sh heartbeat -p /path/to/project -w 3 -a fe-dev

  # Add cost
  ./health-monitor.sh cost -p /path/to/project -w 3 --add 0.05

  # Create checkpoint
  ./health-monitor.sh checkpoint -p /path/to/project -w 3 -a fe-dev

  # Log an error
  ./health-monitor.sh error -p /path/to/project -w 3 --message "Build failed"

EOF
}

# ─────────────────────────────────────────────────────────────────────────────
# HEARTBEAT
# ─────────────────────────────────────────────────────────────────────────────
record_heartbeat() {
    local heartbeat_file="$PROJECT_PATH/.claude/heartbeat.json"
    local timestamp
    timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

    mkdir -p "$(dirname "$heartbeat_file")"

    # Read existing or create new
    local beat_count=0
    if [ -f "$heartbeat_file" ]; then
        beat_count=$(jq -r '.beat_count // 0' "$heartbeat_file" 2>/dev/null || echo "0")
    fi
    beat_count=$((beat_count + 1))

    cat > "$heartbeat_file" << EOF
{
    "wave": $WAVE_NUMBER,
    "agent": "${AGENT_NAME:-unknown}",
    "timestamp": "$timestamp",
    "beat_count": $beat_count,
    "status": "alive",
    "version": "$SCRIPT_VERSION"
}
EOF

    log_success "Heartbeat #$beat_count recorded for ${AGENT_NAME:-unknown}"
}

# ─────────────────────────────────────────────────────────────────────────────
# CHECKPOINT
# ─────────────────────────────────────────────────────────────────────────────
create_checkpoint() {
    local checkpoint_dir="$PROJECT_PATH/.claude/checkpoints"
    mkdir -p "$checkpoint_dir"

    local timestamp
    timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    local checkpoint_id
    checkpoint_id=$(date +%s)

    local checkpoint_file="$checkpoint_dir/checkpoint-wave${WAVE_NUMBER}-${checkpoint_id}.json"

    # Gather state information
    local worktree_status="{}"
    local worktree_dir="$PROJECT_PATH/worktrees"

    if [ -d "$worktree_dir" ]; then
        local wt_json="{"
        local first=true
        for wt in "$worktree_dir"/*; do
            if [ -d "$wt/.git" ] || [ -f "$wt/.git" ]; then
                local wt_name
                wt_name=$(basename "$wt")
                local uncommitted
                uncommitted=$(cd "$wt" && git status --porcelain 2>/dev/null | wc -l | tr -d ' ')
                local branch
                branch=$(cd "$wt" && git branch --show-current 2>/dev/null || echo "unknown")

                if [ "$first" = "false" ]; then
                    wt_json="$wt_json,"
                fi
                first=false
                wt_json="$wt_json\"$wt_name\":{\"branch\":\"$branch\",\"uncommitted\":$uncommitted}"
            fi
        done
        wt_json="$wt_json}"
        worktree_status="$wt_json"
    fi

    # Get cost tracker
    local current_cost="0.00"
    local cost_file="$PROJECT_PATH/.claude/cost-tracker-wave${WAVE_NUMBER}.json"
    if [ -f "$cost_file" ]; then
        current_cost=$(jq -r '.total_cost // "0.00"' "$cost_file" 2>/dev/null || echo "0.00")
    fi

    # Count signals
    local signal_count
    signal_count=$(find "$PROJECT_PATH/.claude" -name "signal-wave${WAVE_NUMBER}*.json" 2>/dev/null | wc -l | tr -d ' ')

    cat > "$checkpoint_file" << EOF
{
    "checkpoint_id": "$checkpoint_id",
    "wave": $WAVE_NUMBER,
    "agent": "${AGENT_NAME:-unknown}",
    "timestamp": "$timestamp",
    "state": {
        "cost_so_far": "$current_cost",
        "signals_created": $signal_count,
        "worktrees": $worktree_status
    },
    "version": "$SCRIPT_VERSION"
}
EOF

    log_success "Checkpoint created: checkpoint-wave${WAVE_NUMBER}-${checkpoint_id}.json"

    # Cleanup old checkpoints (keep last 10)
    local count
    count=$(ls -1 "$checkpoint_dir"/checkpoint-wave${WAVE_NUMBER}-*.json 2>/dev/null | wc -l | tr -d ' ')
    if [ "$count" -gt 10 ]; then
        ls -1t "$checkpoint_dir"/checkpoint-wave${WAVE_NUMBER}-*.json | tail -n +11 | xargs rm -f 2>/dev/null || true
        log_info "Cleaned up old checkpoints (kept last 10)"
    fi
}

# ─────────────────────────────────────────────────────────────────────────────
# COST TRACKING
# ─────────────────────────────────────────────────────────────────────────────
add_cost() {
    local amount=$1
    local cost_file="$PROJECT_PATH/.claude/cost-tracker-wave${WAVE_NUMBER}.json"
    local timestamp
    timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

    mkdir -p "$(dirname "$cost_file")"

    local current_cost="0.00"
    local transaction_count=0

    if [ -f "$cost_file" ]; then
        current_cost=$(jq -r '.total_cost // "0.00"' "$cost_file" 2>/dev/null || echo "0.00")
        transaction_count=$(jq -r '.transaction_count // 0' "$cost_file" 2>/dev/null || echo "0")
    fi

    local new_cost
    new_cost=$(echo "$current_cost + $amount" | bc 2>/dev/null || echo "$current_cost")
    transaction_count=$((transaction_count + 1))

    cat > "$cost_file" << EOF
{
    "wave": $WAVE_NUMBER,
    "total_cost": "$new_cost",
    "last_transaction": "$amount",
    "transaction_count": $transaction_count,
    "last_updated": "$timestamp",
    "agent": "${AGENT_NAME:-unknown}",
    "version": "$SCRIPT_VERSION"
}
EOF

    log_success "Cost updated: +\$$amount (total: \$$new_cost)"
}

# ─────────────────────────────────────────────────────────────────────────────
# ERROR LOGGING
# ─────────────────────────────────────────────────────────────────────────────
log_error_event() {
    local message=$1
    local error_log="$PROJECT_PATH/.claude/error-log-wave${WAVE_NUMBER}.json"
    local timestamp
    timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

    mkdir -p "$(dirname "$error_log")"

    # Read existing errors or create new array
    local errors="[]"
    if [ -f "$error_log" ]; then
        errors=$(jq -r '.errors // []' "$error_log" 2>/dev/null || echo "[]")
    fi

    # Add new error
    local new_error="{\"timestamp\":\"$timestamp\",\"agent\":\"${AGENT_NAME:-unknown}\",\"message\":\"$message\"}"
    errors=$(echo "$errors" | jq ". + [$new_error]" 2>/dev/null || echo "[$new_error]")

    cat > "$error_log" << EOF
{
    "wave": $WAVE_NUMBER,
    "errors": $errors,
    "last_error": "$timestamp",
    "version": "$SCRIPT_VERSION"
}
EOF

    log_warn "Error logged: $message"

    # Check if this error is repeated (trigger circuit breaker check)
    "$SCRIPT_DIR/circuit-breaker.sh" check --project "$PROJECT_PATH" --wave "$WAVE_NUMBER" 2>/dev/null || true
}

# ─────────────────────────────────────────────────────────────────────────────
# STATUS
# ─────────────────────────────────────────────────────────────────────────────
show_status() {
    echo ""
    echo -e "${CYAN}╔═══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║              HEALTH MONITOR STATUS                            ║${NC}"
    echo -e "${CYAN}╚═══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "  Project: ${CYAN}$(basename "$PROJECT_PATH")${NC}"
    echo -e "  Wave:    ${CYAN}$WAVE_NUMBER${NC}"
    echo ""

    # Heartbeat status
    local heartbeat_file="$PROJECT_PATH/.claude/heartbeat.json"
    if [ -f "$heartbeat_file" ]; then
        local last_beat agent beat_count
        last_beat=$(jq -r '.timestamp // "Never"' "$heartbeat_file" 2>/dev/null || echo "Never")
        agent=$(jq -r '.agent // "unknown"' "$heartbeat_file" 2>/dev/null || echo "unknown")
        beat_count=$(jq -r '.beat_count // 0' "$heartbeat_file" 2>/dev/null || echo "0")
        echo -e "  Last Heartbeat: ${GREEN}$last_beat${NC}"
        echo -e "  Active Agent:   $agent"
        echo -e "  Beat Count:     $beat_count"
    else
        echo -e "  Last Heartbeat: ${YELLOW}No heartbeats recorded${NC}"
    fi
    echo ""

    # Cost status
    local cost_file="$PROJECT_PATH/.claude/cost-tracker-wave${WAVE_NUMBER}.json"
    if [ -f "$cost_file" ]; then
        local total_cost transactions
        total_cost=$(jq -r '.total_cost // "0.00"' "$cost_file" 2>/dev/null || echo "0.00")
        transactions=$(jq -r '.transaction_count // 0' "$cost_file" 2>/dev/null || echo "0")
        echo -e "  Total Cost:     ${GREEN}\$$total_cost${NC}"
        echo -e "  Transactions:   $transactions"
    else
        echo -e "  Total Cost:     ${YELLOW}Not tracked${NC}"
    fi
    echo ""

    # Checkpoint status
    local checkpoint_dir="$PROJECT_PATH/.claude/checkpoints"
    if [ -d "$checkpoint_dir" ]; then
        local checkpoint_count
        checkpoint_count=$(ls -1 "$checkpoint_dir"/checkpoint-wave${WAVE_NUMBER}-*.json 2>/dev/null | wc -l | tr -d ' ')
        local last_checkpoint
        last_checkpoint=$(ls -1t "$checkpoint_dir"/checkpoint-wave${WAVE_NUMBER}-*.json 2>/dev/null | head -1)
        if [ -n "$last_checkpoint" ]; then
            local last_cp_time
            last_cp_time=$(jq -r '.timestamp // "Unknown"' "$last_checkpoint" 2>/dev/null || echo "Unknown")
            echo -e "  Checkpoints:    $checkpoint_count saved"
            echo -e "  Last Checkpoint: $last_cp_time"
        else
            echo -e "  Checkpoints:    ${YELLOW}None${NC}"
        fi
    else
        echo -e "  Checkpoints:    ${YELLOW}None${NC}"
    fi
    echo ""

    # Error status
    local error_log="$PROJECT_PATH/.claude/error-log-wave${WAVE_NUMBER}.json"
    if [ -f "$error_log" ]; then
        local error_count
        error_count=$(jq -r '.errors | length' "$error_log" 2>/dev/null || echo "0")
        if [ "$error_count" -gt 0 ]; then
            echo -e "  Errors Logged:  ${RED}$error_count${NC}"
        else
            echo -e "  Errors Logged:  ${GREEN}0${NC}"
        fi
    else
        echo -e "  Errors Logged:  ${GREEN}0${NC}"
    fi
    echo ""
}

# ─────────────────────────────────────────────────────────────────────────────
# CONTINUOUS MONITORING
# ─────────────────────────────────────────────────────────────────────────────
start_monitoring() {
    local interval=${HEARTBEAT_INTERVAL:-60}
    local checkpoint_counter=0
    local checkpoint_threshold=$((CHECKPOINT_INTERVAL / interval))

    log_info "Starting health monitor for ${AGENT_NAME:-unknown}"
    log_info "Heartbeat interval: ${interval}s"
    log_info "Checkpoint interval: ${CHECKPOINT_INTERVAL}s"
    log_info "Press Ctrl+C to stop"
    echo ""

    while true; do
        # Record heartbeat
        record_heartbeat

        # Check circuit breaker
        if ! "$SCRIPT_DIR/circuit-breaker.sh" check --project "$PROJECT_PATH" --wave "$WAVE_NUMBER" 2>/dev/null; then
            log_error "Circuit breaker is OPEN - stopping health monitor"
            exit 1
        fi

        # Periodic checkpoint
        checkpoint_counter=$((checkpoint_counter + 1))
        if [ "$checkpoint_counter" -ge "$checkpoint_threshold" ]; then
            create_checkpoint
            checkpoint_counter=0
        fi

        sleep "$interval"
    done
}

# ─────────────────────────────────────────────────────────────────────────────
# ARGUMENT PARSING
# ─────────────────────────────────────────────────────────────────────────────
COMMAND=""
PROJECT_PATH=""
WAVE_NUMBER=""
AGENT_NAME=""
COST_AMOUNT=""
ERROR_MESSAGE=""

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
        -a|--agent)
            AGENT_NAME="$2"
            shift 2
            ;;
        --add)
            COST_AMOUNT="$2"
            shift 2
            ;;
        --message)
            ERROR_MESSAGE="$2"
            shift 2
            ;;
        --interval)
            HEARTBEAT_INTERVAL="$2"
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
    echo "Error: Command required"
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
    start)
        start_monitoring
        ;;
    heartbeat)
        record_heartbeat
        ;;
    checkpoint)
        create_checkpoint
        ;;
    cost)
        if [ -z "$COST_AMOUNT" ]; then
            echo "Error: --add <amount> required for cost command"
            exit 2
        fi
        add_cost "$COST_AMOUNT"
        ;;
    error)
        if [ -z "$ERROR_MESSAGE" ]; then
            echo "Error: --message <msg> required for error command"
            exit 2
        fi
        log_error_event "$ERROR_MESSAGE"
        ;;
    status)
        show_status
        ;;
    *)
        echo "Unknown command: $COMMAND"
        show_usage
        exit 2
        ;;
esac
