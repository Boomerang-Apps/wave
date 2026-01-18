#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# WAVE FRAMEWORK - Stuck Agent Detector
# ═══════════════════════════════════════════════════════════════════════════════
#
# Monitors agents for stuck conditions:
# - No signal file created within timeout
# - Same error repeated multiple times
# - No progress in logs for extended period
#
# Usage:
#   ./stuck-detector.sh --project /path/to/project [--timeout 300] [--continuous]
#   ./stuck-detector.sh --check-agent fe-dev-1 --project /path/to/project
#
# Exit codes:
#   0 = All agents healthy
#   1 = Stuck agent detected
#   2 = Error/invalid arguments
#
# ═══════════════════════════════════════════════════════════════════════════════

set -e

# ─────────────────────────────────────────────────────────────────────────────
# CONFIGURATION
# ─────────────────────────────────────────────────────────────────────────────
PROJECT_ROOT=""
TIMEOUT_SECONDS=300  # 5 minutes default
CONTINUOUS=false
CHECK_AGENT=""
POLL_INTERVAL=30
ERROR_THRESHOLD=3  # Same error 3 times = stuck

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -p|--project)
            PROJECT_ROOT="$2"
            shift 2
            ;;
        -t|--timeout)
            TIMEOUT_SECONDS="$2"
            shift 2
            ;;
        --continuous)
            CONTINUOUS=true
            shift
            ;;
        --check-agent)
            CHECK_AGENT="$2"
            shift 2
            ;;
        --poll-interval)
            POLL_INTERVAL="$2"
            shift 2
            ;;
        *)
            echo "Unknown option: $1"
            exit 2
            ;;
    esac
done

# Validate arguments
if [ -z "$PROJECT_ROOT" ]; then
    echo "Error: --project is required"
    echo "Usage: ./stuck-detector.sh --project /path/to/project [--timeout 300]"
    exit 2
fi

if [ ! -d "$PROJECT_ROOT" ]; then
    echo "Error: Project directory not found: $PROJECT_ROOT"
    exit 2
fi

CLAUDE_DIR="$PROJECT_ROOT/.claude"
STUCK_LOG="$CLAUDE_DIR/stuck-detection.log"
AGENTS=("fe-dev-1" "fe-dev-2" "be-dev-1" "be-dev-2" "qa" "dev-fix")

# Track last activity per agent
declare -A LAST_ACTIVITY
declare -A ERROR_COUNT
declare -A LAST_ERROR

# ─────────────────────────────────────────────────────────────────────────────
# FUNCTIONS
# ─────────────────────────────────────────────────────────────────────────────

log_message() {
    local level="$1"
    local message="$2"
    local timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ)
    echo "[$timestamp] [$level] $message"
    echo "[$timestamp] [$level] $message" >> "$STUCK_LOG"
}

get_latest_signal_time() {
    local agent="$1"
    local latest_signal=$(ls -t "$CLAUDE_DIR"/signal-*-"$agent"-*.json 2>/dev/null | head -1)

    if [ -n "$latest_signal" ] && [ -f "$latest_signal" ]; then
        stat -f %m "$latest_signal" 2>/dev/null || stat -c %Y "$latest_signal" 2>/dev/null
    else
        echo "0"
    fi
}

get_container_status() {
    local agent="$1"
    docker inspect --format='{{.State.Status}}' "wave-$agent" 2>/dev/null || echo "not_found"
}

check_error_loop() {
    local agent="$1"
    local container="wave-$agent"

    # Get recent logs
    local recent_errors=$(docker logs --tail=50 "$container" 2>&1 | grep -i "error\|exception\|failed" | tail -5)

    if [ -z "$recent_errors" ]; then
        ERROR_COUNT[$agent]=0
        return 0
    fi

    # Check if same error repeated
    local unique_errors=$(echo "$recent_errors" | sort -u | wc -l | tr -d ' ')
    local total_errors=$(echo "$recent_errors" | wc -l | tr -d ' ')

    # If mostly same error, likely stuck in loop
    if [ "$total_errors" -gt 3 ] && [ "$unique_errors" -le 2 ]; then
        local current_error=$(echo "$recent_errors" | tail -1)

        if [ "${LAST_ERROR[$agent]}" = "$current_error" ]; then
            ERROR_COUNT[$agent]=$((${ERROR_COUNT[$agent]:-0} + 1))
        else
            ERROR_COUNT[$agent]=1
            LAST_ERROR[$agent]="$current_error"
        fi

        if [ "${ERROR_COUNT[$agent]}" -ge "$ERROR_THRESHOLD" ]; then
            return 1  # Stuck in error loop
        fi
    fi

    return 0
}

check_agent_stuck() {
    local agent="$1"
    local current_time=$(date +%s)
    local stuck_reason=""

    # Check 1: Container status
    local status=$(get_container_status "$agent")
    if [ "$status" = "not_found" ]; then
        # Container doesn't exist - might be fine if not started yet
        return 0
    elif [ "$status" = "exited" ]; then
        stuck_reason="Container exited unexpectedly"
    elif [ "$status" != "running" ]; then
        stuck_reason="Container in unexpected state: $status"
    fi

    # Check 2: Signal file timeout
    if [ -z "$stuck_reason" ]; then
        local last_signal_time=$(get_latest_signal_time "$agent")
        local time_since_signal=$((current_time - last_signal_time))

        if [ "$last_signal_time" -gt 0 ] && [ "$time_since_signal" -gt "$TIMEOUT_SECONDS" ]; then
            stuck_reason="No signal for ${time_since_signal}s (timeout: ${TIMEOUT_SECONDS}s)"
        fi
    fi

    # Check 3: Error loop detection
    if [ -z "$stuck_reason" ] && [ "$status" = "running" ]; then
        if ! check_error_loop "$agent"; then
            stuck_reason="Stuck in error loop (same error ${ERROR_COUNT[$agent]} times)"
        fi
    fi

    # Check 4: Log activity timeout
    if [ -z "$stuck_reason" ] && [ "$status" = "running" ]; then
        # Check if there's been any log output recently
        local recent_output=$(docker logs --since "${TIMEOUT_SECONDS}s" "wave-$agent" 2>&1 | wc -l | tr -d ' ')
        if [ "$recent_output" -lt 5 ]; then
            stuck_reason="Minimal log activity (only $recent_output lines in ${TIMEOUT_SECONDS}s)"
        fi
    fi

    # Report result
    if [ -n "$stuck_reason" ]; then
        echo "$stuck_reason"
        return 1
    fi

    return 0
}

handle_stuck_agent() {
    local agent="$1"
    local reason="$2"
    local timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ)

    log_message "ALERT" "Agent $agent is stuck: $reason"

    # Create stuck signal
    mkdir -p "$CLAUDE_DIR"
    cat > "$CLAUDE_DIR/signal-$agent-STUCK.json" << EOF
{
    "signal_type": "agent-stuck",
    "agent": "$agent",
    "reason": "$reason",
    "emergency_level": "E1",
    "timestamp": "$timestamp",
    "action_required": "restart_or_escalate"
}
EOF

    # Send Slack notification if configured
    if [ -n "$SLACK_WEBHOOK_URL" ]; then
        curl -s -X POST "$SLACK_WEBHOOK_URL" \
            -H "Content-Type: application/json" \
            -d "{\"text\":\"⚠️ STUCK AGENT DETECTED: $agent - $reason\"}" \
            > /dev/null 2>&1 || true
    fi

    # Log to Supabase if configured
    if [ -n "$SUPABASE_URL" ] && [ -n "$SUPABASE_SERVICE_KEY" ]; then
        curl -s -X POST "$SUPABASE_URL/rest/v1/maf_events" \
            -H "apikey: $SUPABASE_SERVICE_KEY" \
            -H "Authorization: Bearer $SUPABASE_SERVICE_KEY" \
            -H "Content-Type: application/json" \
            -d "{\"type\":\"STUCK_DETECTED\",\"agent\":\"$agent\",\"message\":\"$reason\"}" \
            > /dev/null 2>&1 || true
    fi
}

# ─────────────────────────────────────────────────────────────────────────────
# MAIN EXECUTION
# ─────────────────────────────────────────────────────────────────────────────

echo "═══════════════════════════════════════════════════════════════════════════════"
echo "  WAVE Stuck Agent Detector"
echo "═══════════════════════════════════════════════════════════════════════════════"
echo ""
echo "  Project:  $PROJECT_ROOT"
echo "  Timeout:  ${TIMEOUT_SECONDS}s"
echo "  Mode:     $([ "$CONTINUOUS" = true ] && echo "Continuous" || echo "Single check")"
echo ""

mkdir -p "$CLAUDE_DIR"

# Single agent check
if [ -n "$CHECK_AGENT" ]; then
    echo "  Checking agent: $CHECK_AGENT"
    echo ""

    reason=$(check_agent_stuck "$CHECK_AGENT")
    if [ $? -ne 0 ]; then
        echo "  ❌ Agent $CHECK_AGENT is STUCK: $reason"
        handle_stuck_agent "$CHECK_AGENT" "$reason"
        exit 1
    else
        echo "  ✅ Agent $CHECK_AGENT is healthy"
        exit 0
    fi
fi

# Check all agents
check_all_agents() {
    local stuck_count=0

    for agent in "${AGENTS[@]}"; do
        local status=$(get_container_status "$agent")

        if [ "$status" = "not_found" ]; then
            echo "  ⚪ $agent: not started"
            continue
        fi

        reason=$(check_agent_stuck "$agent")
        if [ $? -ne 0 ]; then
            echo "  ❌ $agent: STUCK - $reason"
            handle_stuck_agent "$agent" "$reason"
            ((stuck_count++))
        else
            echo "  ✅ $agent: healthy (${status})"
        fi
    done

    return $stuck_count
}

if [ "$CONTINUOUS" = true ]; then
    echo "  Starting continuous monitoring (Ctrl+C to stop)..."
    echo "  Poll interval: ${POLL_INTERVAL}s"
    echo ""
    echo "───────────────────────────────────────────────────────────────────────────────"

    while true; do
        echo ""
        echo "[$(date '+%H:%M:%S')] Checking agents..."

        check_all_agents
        stuck=$?

        if [ $stuck -gt 0 ]; then
            echo ""
            echo "  ⚠️  $stuck stuck agent(s) detected"
        fi

        sleep "$POLL_INTERVAL"
    done
else
    # Single check
    echo "  Checking all agents..."
    echo ""

    check_all_agents
    stuck=$?

    echo ""
    echo "───────────────────────────────────────────────────────────────────────────────"

    if [ $stuck -gt 0 ]; then
        echo ""
        echo "  ❌ RESULT: $stuck stuck agent(s) detected"
        echo ""
        exit 1
    else
        echo ""
        echo "  ✅ RESULT: All agents healthy"
        echo ""
        exit 0
    fi
fi
