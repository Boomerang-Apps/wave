#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# WAVE FRAMEWORK - Heartbeat Monitor
# ═══════════════════════════════════════════════════════════════════════════════
# Real-time monitoring of agent heartbeats with automatic alerts.
# Combines event-driven watching with periodic health checks.
#
# Usage:
#   ./heartbeat-monitor.sh [PROJECT_PATH] [options]
#
# Options:
#   --timeout=SECONDS     Heartbeat timeout (default: 120)
#   --warning=SECONDS     Warning threshold (default: 60)
#   --check-interval=SEC  Health check interval (default: 30)
#   --slack               Enable Slack alerts
#   --json                Output as JSON
#   --auto-restart        Auto-restart stuck agents (requires docker)
#   --agents=LIST         Comma-separated list of agents to monitor
#
# Exit codes:
#   0 = All agents healthy
#   1 = Stuck agent detected
#   2 = Configuration error
#
# ═══════════════════════════════════════════════════════════════════════════════

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ─────────────────────────────────────────────────────────────────────────────
# CONFIGURATION
# ─────────────────────────────────────────────────────────────────────────────

PROJECT_PATH="${1:-.}"
[[ "$PROJECT_PATH" == --* ]] && PROJECT_PATH="."
PROJECT_PATH="$(cd "$PROJECT_PATH" 2>/dev/null && pwd)" || {
    echo "Error: Invalid project path: $PROJECT_PATH" >&2
    exit 2
}

CLAUDE_DIR="$PROJECT_PATH/.claude"
HEARTBEAT_DIR="$CLAUDE_DIR/heartbeats"
MONITOR_STATE_FILE="$CLAUDE_DIR/heartbeat-monitor-state.json"

# Defaults
TIMEOUT_SECONDS=120
WARNING_SECONDS=60
CHECK_INTERVAL=30
SLACK_ENABLED=false
JSON_OUTPUT=false
AUTO_RESTART=false
AGENT_LIST=""

# All WAVE agents
DEFAULT_AGENTS=("cto" "pm" "fe-dev-1" "fe-dev-2" "be-dev-1" "be-dev-2" "qa" "dev-fix")

# Parse options
shift 2>/dev/null || true
while [[ $# -gt 0 ]]; do
    case "$1" in
        --timeout=*) TIMEOUT_SECONDS="${1#*=}" ;;
        --warning=*) WARNING_SECONDS="${1#*=}" ;;
        --check-interval=*) CHECK_INTERVAL="${1#*=}" ;;
        --slack) SLACK_ENABLED=true ;;
        --json) JSON_OUTPUT=true ;;
        --auto-restart) AUTO_RESTART=true ;;
        --agents=*) AGENT_LIST="${1#*=}" ;;
        --help|-h)
            echo "Usage: $0 [PROJECT_PATH] [options]"
            echo ""
            echo "Options:"
            echo "  --timeout=SEC       Stuck threshold (default: 120)"
            echo "  --warning=SEC       Warning threshold (default: 60)"
            echo "  --check-interval=SEC Check interval (default: 30)"
            echo "  --slack             Enable Slack alerts"
            echo "  --json              JSON output"
            echo "  --auto-restart      Auto-restart stuck agents"
            echo "  --agents=LIST       Agents to monitor (comma-separated)"
            exit 0
            ;;
    esac
    shift
done

# Set agent list
if [[ -n "$AGENT_LIST" ]]; then
    IFS=',' read -ra AGENTS <<< "$AGENT_LIST"
else
    AGENTS=("${DEFAULT_AGENTS[@]}")
fi

# Colors
if [[ "$JSON_OUTPUT" == false ]]; then
    RED='\033[0;31m'
    GREEN='\033[0;32m'
    YELLOW='\033[1;33m'
    BLUE='\033[0;34m'
    CYAN='\033[0;36m'
    NC='\033[0m'
    BOLD='\033[1m'
else
    RED='' GREEN='' YELLOW='' BLUE='' CYAN='' NC='' BOLD=''
fi

# ─────────────────────────────────────────────────────────────────────────────
# STATE TRACKING (bash 3.x compatible - uses file-based state)
# ─────────────────────────────────────────────────────────────────────────────

# State files for tracking (avoids bash 4.x associative arrays)
ALERT_STATE_FILE="/tmp/wave-hb-alert-state-$$.txt"
BEAT_TIME_FILE="/tmp/wave-hb-beat-time-$$.txt"

# Initialize state files
init_state_files() {
    : > "$ALERT_STATE_FILE"
    : > "$BEAT_TIME_FILE"
}

# Get alert state for a key
get_alert_state() {
    local key="$1"
    grep "^${key}=" "$ALERT_STATE_FILE" 2>/dev/null | cut -d= -f2
}

# Set alert state for a key
set_alert_state() {
    local key="$1"
    local value="$2"
    # Remove existing and add new
    grep -v "^${key}=" "$ALERT_STATE_FILE" > "${ALERT_STATE_FILE}.tmp" 2>/dev/null || true
    echo "${key}=${value}" >> "${ALERT_STATE_FILE}.tmp"
    mv "${ALERT_STATE_FILE}.tmp" "$ALERT_STATE_FILE"
}

# Clear alert state for a key
clear_alert_state() {
    local key="$1"
    grep -v "^${key}=" "$ALERT_STATE_FILE" > "${ALERT_STATE_FILE}.tmp" 2>/dev/null || true
    mv "${ALERT_STATE_FILE}.tmp" "$ALERT_STATE_FILE"
}

# Get last beat time for an agent
get_last_beat_time() {
    local agent="$1"
    grep "^${agent}=" "$BEAT_TIME_FILE" 2>/dev/null | cut -d= -f2 || echo "0"
}

# Set last beat time for an agent
set_last_beat_time() {
    local agent="$1"
    local time="$2"
    grep -v "^${agent}=" "$BEAT_TIME_FILE" > "${BEAT_TIME_FILE}.tmp" 2>/dev/null || true
    echo "${agent}=${time}" >> "${BEAT_TIME_FILE}.tmp"
    mv "${BEAT_TIME_FILE}.tmp" "$BEAT_TIME_FILE"
}

load_state() {
    init_state_files
    if [[ -f "$MONITOR_STATE_FILE" ]]; then
        jq -r 'to_entries[] | "\(.key)=\(.value)"' "$MONITOR_STATE_FILE" 2>/dev/null >> "$ALERT_STATE_FILE" || true
    fi
}

save_state() {
    # Convert state file to JSON
    echo "{" > "${MONITOR_STATE_FILE}.tmp"
    local first=true
    while IFS="=" read -r key value; do
        [[ -z "$key" ]] && continue
        if [[ "$first" == true ]]; then
            first=false
        else
            echo "," >> "${MONITOR_STATE_FILE}.tmp"
        fi
        printf '"%s":"%s"' "$key" "$value" >> "${MONITOR_STATE_FILE}.tmp"
    done < "$ALERT_STATE_FILE"
    echo "}" >> "${MONITOR_STATE_FILE}.tmp"
    mv "${MONITOR_STATE_FILE}.tmp" "$MONITOR_STATE_FILE"
}

# ─────────────────────────────────────────────────────────────────────────────
# LOGGING
# ─────────────────────────────────────────────────────────────────────────────

log() {
    local level="$1"
    local message="$2"
    local timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ)

    if [[ "$JSON_OUTPUT" == false ]]; then
        local color=""
        case "$level" in
            INFO) color="$BLUE" ;;
            WARN) color="$YELLOW" ;;
            ERROR) color="$RED" ;;
            SUCCESS) color="$GREEN" ;;
            HEARTBEAT) color="$CYAN" ;;
        esac
        echo -e "[$timestamp] ${color}[$level]${NC} $message"
    fi
}

emit_json() {
    local event="$1"
    local agent="$2"
    local status="$3"
    local details="$4"

    if [[ "$JSON_OUTPUT" == true ]]; then
        cat << EOF
{"timestamp":"$(date -u +%Y-%m-%dT%H:%M:%SZ)","event":"$event","agent":"$agent","status":"$status","details":$details}
EOF
    fi
}

# ─────────────────────────────────────────────────────────────────────────────
# HEARTBEAT ANALYSIS
# ─────────────────────────────────────────────────────────────────────────────

get_heartbeat_age() {
    local agent="$1"
    local heartbeat_file="$HEARTBEAT_DIR/${agent}-heartbeat.json"

    if [[ ! -f "$heartbeat_file" ]]; then
        echo "-1"
        return
    fi

    local file_mtime
    if [[ "$OSTYPE" == "darwin"* ]]; then
        file_mtime=$(stat -f %m "$heartbeat_file" 2>/dev/null || echo "0")
    else
        file_mtime=$(stat -c %Y "$heartbeat_file" 2>/dev/null || echo "0")
    fi

    local now=$(date +%s)
    echo $((now - file_mtime))
}

get_heartbeat_data() {
    local agent="$1"
    local heartbeat_file="$HEARTBEAT_DIR/${agent}-heartbeat.json"

    if [[ -f "$heartbeat_file" ]]; then
        cat "$heartbeat_file" 2>/dev/null || echo "{}"
    else
        echo "{}"
    fi
}

is_agent_active() {
    local agent="$1"

    # Check for ready signal
    [[ -f "$CLAUDE_DIR/signal-${agent}-ready.json" ]] && return 0

    # Check for assignment signal
    [[ -f "$CLAUDE_DIR/signal-${agent}-assignment.json" ]] && return 0

    # Check for recent heartbeat
    local age=$(get_heartbeat_age "$agent")
    [[ "$age" != "-1" && "$age" -lt "$TIMEOUT_SECONDS" ]] && return 0

    return 1
}

analyze_agent_health() {
    local agent="$1"
    local age=$(get_heartbeat_age "$agent")
    local data=$(get_heartbeat_data "$agent")

    local status="unknown"
    local severity="info"

    if [[ "$age" == "-1" ]]; then
        if is_agent_active "$agent"; then
            status="starting"
            severity="info"
        else
            status="idle"
            severity="info"
        fi
    elif [[ "$age" -lt "$WARNING_SECONDS" ]]; then
        status="healthy"
        severity="info"
    elif [[ "$age" -lt "$TIMEOUT_SECONDS" ]]; then
        status="warning"
        severity="warning"
    else
        status="stuck"
        severity="critical"
    fi

    echo "$status|$severity|$age"
}

# ─────────────────────────────────────────────────────────────────────────────
# ALERTING
# ─────────────────────────────────────────────────────────────────────────────

send_alert() {
    local agent="$1"
    local status="$2"
    local severity="$3"
    local age="$4"

    local alert_key="${agent}_${status}"

    # Check if we already alerted for this state
    if [[ "$(get_alert_state "$alert_key")" == "sent" ]]; then
        return
    fi

    set_alert_state "$alert_key" "sent"
    save_state

    local message=""
    case "$status" in
        stuck)
            message=":rotating_light: Agent \`$agent\` is STUCK (no heartbeat for ${age}s)"
            ;;
        warning)
            message=":warning: Agent \`$agent\` heartbeat delayed (${age}s ago)"
            ;;
        healthy)
            # Clear previous alerts
            clear_alert_state "${agent}_stuck"
            clear_alert_state "${agent}_warning"
            save_state
            message=":white_check_mark: Agent \`$agent\` recovered"
            ;;
    esac

    if [[ "$SLACK_ENABLED" == true && -n "$message" ]]; then
        notify_slack "$message" "$severity"
    fi

    log "WARN" "Alert: $agent is $status (age: ${age}s)"
}

notify_slack() {
    local message="$1"
    local severity="${2:-info}"

    if [[ -x "$SCRIPT_DIR/slack-notify.sh" ]]; then
        "$SCRIPT_DIR/slack-notify.sh" "$severity" "$message" 2>/dev/null &
    elif [[ -x "$SCRIPT_DIR/lib/slack-notify.sh" ]]; then
        source "$SCRIPT_DIR/lib/slack-notify.sh"
        slack_send "$message" "$severity" 2>/dev/null &
    fi
}

# ─────────────────────────────────────────────────────────────────────────────
# AUTO RESTART
# ─────────────────────────────────────────────────────────────────────────────

restart_agent() {
    local agent="$1"

    log "WARN" "Attempting to restart agent: $agent"

    # Try Docker restart first
    if command -v docker &> /dev/null; then
        local container_name="wave-${agent}"
        if docker ps -a --format '{{.Names}}' | grep -q "^${container_name}$"; then
            log "INFO" "Restarting Docker container: $container_name"
            docker restart "$container_name" 2>/dev/null && return 0
        fi
    fi

    # Try using docker-run-agent.sh
    if [[ -x "$SCRIPT_DIR/docker-run-agent.sh" ]]; then
        log "INFO" "Starting agent via docker-run-agent.sh: $agent"
        "$SCRIPT_DIR/docker-run-agent.sh" "$agent" "$PROJECT_PATH" &
        return 0
    fi

    log "ERROR" "Cannot restart agent: $agent (no restart mechanism available)"
    return 1
}

# ─────────────────────────────────────────────────────────────────────────────
# HEALTH CHECK
# ─────────────────────────────────────────────────────────────────────────────

run_health_check() {
    local stuck_count=0
    local warning_count=0
    local healthy_count=0
    local idle_count=0

    local results=()

    for agent in "${AGENTS[@]}"; do
        local analysis=$(analyze_agent_health "$agent")
        IFS='|' read -r status severity age <<< "$analysis"

        local data=$(get_heartbeat_data "$agent")

        # Build result object
        local result="{\"agent\":\"$agent\",\"status\":\"$status\",\"age_seconds\":$age,\"severity\":\"$severity\"}"
        results+=("$result")

        # Update counters
        case "$status" in
            healthy|starting) ((healthy_count++)) ;;
            warning) ((warning_count++)) ;;
            stuck) ((stuck_count++)) ;;
            idle) ((idle_count++)) ;;
        esac

        # Handle alerts
        if [[ "$status" == "stuck" ]]; then
            send_alert "$agent" "$status" "$severity" "$age"

            if [[ "$AUTO_RESTART" == true ]]; then
                restart_agent "$agent"
            fi
        elif [[ "$status" == "warning" ]]; then
            send_alert "$agent" "$status" "$severity" "$age"
        elif [[ "$status" == "healthy" && "$(get_alert_state "${agent}_stuck")" == "sent" ]]; then
            send_alert "$agent" "$status" "info" "$age"
        fi

        # Log status
        if [[ "$JSON_OUTPUT" == false ]]; then
            local status_icon=""
            case "$status" in
                healthy) status_icon="${GREEN}●${NC}" ;;
                starting) status_icon="${BLUE}◐${NC}" ;;
                warning) status_icon="${YELLOW}●${NC}" ;;
                stuck) status_icon="${RED}●${NC}" ;;
                idle) status_icon="${BLUE}○${NC}" ;;
            esac
            printf "  %b %-12s %s (age: %ss)\n" "$status_icon" "$agent" "$status" "$age"
        fi

        emit_json "health_check" "$agent" "$status" "{\"age\":$age,\"severity\":\"$severity\"}"
    done

    # Summary
    if [[ "$JSON_OUTPUT" == false ]]; then
        echo ""
        echo -e "  ${BOLD}Summary:${NC} healthy=$healthy_count warning=$warning_count stuck=$stuck_count idle=$idle_count"
    fi

    return $stuck_count
}

# ─────────────────────────────────────────────────────────────────────────────
# REAL-TIME MONITORING
# ─────────────────────────────────────────────────────────────────────────────

process_heartbeat_event() {
    local event_type="$1"
    local file_path="$2"

    local agent=$(basename "$file_path" -heartbeat.json)

    # Skip if not monitoring this agent
    local found=false
    for a in "${AGENTS[@]}"; do
        [[ "$a" == "$agent" ]] && found=true && break
    done
    [[ "$found" == false ]] && return

    local now=$(date +%s)
    local prev_time=$(get_last_beat_time "$agent")
    local interval=$((now - prev_time))

    set_last_beat_time "$agent" "$now"

    # Clear any stuck/warning alerts
    if [[ "$(get_alert_state "${agent}_stuck")" == "sent" || "$(get_alert_state "${agent}_warning")" == "sent" ]]; then
        clear_alert_state "${agent}_stuck"
        clear_alert_state "${agent}_warning"
        save_state

        log "SUCCESS" "Agent $agent heartbeat received (recovered, interval: ${interval}s)"

        if [[ "$SLACK_ENABLED" == true ]]; then
            notify_slack ":white_check_mark: Agent \`$agent\` recovered (heartbeat received)" "info"
        fi
    else
        log "HEARTBEAT" "Agent $agent heartbeat (interval: ${interval}s)"
    fi

    emit_json "heartbeat" "$agent" "received" "{\"interval\":$interval}"
}

start_realtime_monitor() {
    mkdir -p "$HEARTBEAT_DIR"

    if [[ "$JSON_OUTPUT" == false ]]; then
        echo ""
        echo "╔═══════════════════════════════════════════════════════════════════════════════╗"
        echo "║                      WAVE HEARTBEAT MONITOR                                   ║"
        echo "╚═══════════════════════════════════════════════════════════════════════════════╝"
        echo ""
        echo "  Project:        $PROJECT_PATH"
        echo "  Agents:         ${AGENTS[*]}"
        echo "  Timeout:        ${TIMEOUT_SECONDS}s"
        echo "  Warning:        ${WARNING_SECONDS}s"
        echo "  Check Interval: ${CHECK_INTERVAL}s"
        echo "  Slack:          $SLACK_ENABLED"
        echo "  Auto-restart:   $AUTO_RESTART"
        echo ""
    fi

    load_state

    # Initial health check
    if [[ "$JSON_OUTPUT" == false ]]; then
        echo -e "${BOLD}Initial Health Check:${NC}"
    fi
    run_health_check
    echo ""

    # Start filesystem watcher in background for real-time heartbeat events
    local use_native=false
    if command -v fswatch &> /dev/null || command -v inotifywait &> /dev/null; then
        use_native=true
    fi

    if [[ "$use_native" == true && -x "$SCRIPT_DIR/fs-watcher.sh" ]]; then
        log "INFO" "Starting real-time heartbeat watcher..."

        "$SCRIPT_DIR/fs-watcher.sh" "$HEARTBEAT_DIR" \
            --pattern="*-heartbeat.json" \
            --events="create,modify" \
            --json | while read -r line; do
                local event=$(echo "$line" | jq -r '.event' 2>/dev/null)
                local path=$(echo "$line" | jq -r '.path' 2>/dev/null)
                [[ -n "$event" && -n "$path" ]] && process_heartbeat_event "$event" "$path"
            done &

        WATCHER_PID=$!
    else
        log "INFO" "Using polling mode for heartbeat monitoring (install fswatch for real-time)"
    fi

    # Periodic health checks
    while true; do
        sleep "$CHECK_INTERVAL"

        if [[ "$JSON_OUTPUT" == false ]]; then
            echo ""
            echo -e "${BOLD}Periodic Health Check ($(date '+%H:%M:%S')):${NC}"
        fi

        run_health_check
    done
}

# ─────────────────────────────────────────────────────────────────────────────
# CLEANUP
# ─────────────────────────────────────────────────────────────────────────────

cleanup() {
    [[ -n "$WATCHER_PID" ]] && kill "$WATCHER_PID" 2>/dev/null || true
    save_state
    # Cleanup temporary state files
    rm -f "$ALERT_STATE_FILE" "${ALERT_STATE_FILE}.tmp" "$BEAT_TIME_FILE" "${BEAT_TIME_FILE}.tmp" 2>/dev/null
    log "INFO" "Heartbeat monitor stopped"
    exit 0
}

trap cleanup SIGINT SIGTERM

# ─────────────────────────────────────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────────────────────────────────────

main() {
    # Validate configuration
    if [[ ! -d "$PROJECT_PATH" ]]; then
        echo "Error: Project path does not exist: $PROJECT_PATH" >&2
        exit 2
    fi

    mkdir -p "$CLAUDE_DIR" "$HEARTBEAT_DIR"

    start_realtime_monitor
}

main "$@"
