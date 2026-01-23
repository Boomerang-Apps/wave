#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# WAVE FRAMEWORK - Signal File Watcher
# ═══════════════════════════════════════════════════════════════════════════════
# Monitors the .claude directory for signal file changes and triggers actions.
# Integrates with the WAVE orchestration system for real-time event handling.
#
# Usage:
#   ./signal-watcher.sh [PROJECT_PATH] [options]
#
# Options:
#   --slack                 Send notifications to Slack
#   --callback=SCRIPT       Custom callback script for events
#   --log-file=PATH         Log events to file
#   --json                  Output events as JSON
#   --daemon                Run as background daemon
#
# Signal Types Monitored:
#   - Agent ready signals (signal-*-ready.json)
#   - Agent completion signals (signal-*-complete.json)
#   - Agent error signals (signal-*-error.json)
#   - Gate transition signals (signal-*-gate*.json)
#   - Kill switch (EMERGENCY-STOP)
#   - Heartbeats (heartbeats/*.json)
#
# ═══════════════════════════════════════════════════════════════════════════════

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ─────────────────────────────────────────────────────────────────────────────
# CONFIGURATION
# ─────────────────────────────────────────────────────────────────────────────

PROJECT_PATH="${1:-.}"
[[ "$PROJECT_PATH" == --* ]] && PROJECT_PATH="."
PROJECT_PATH="$(cd "$PROJECT_PATH" 2>/dev/null && pwd)" || PROJECT_PATH="$1"

CLAUDE_DIR="$PROJECT_PATH/.claude"
HEARTBEAT_DIR="$CLAUDE_DIR/heartbeats"

# Options
SLACK_ENABLED=false
CALLBACK_SCRIPT=""
LOG_FILE=""
JSON_OUTPUT=false
DAEMON_MODE=false

# Parse arguments
shift 2>/dev/null || true
while [[ $# -gt 0 ]]; do
    case "$1" in
        --slack) SLACK_ENABLED=true ;;
        --callback=*) CALLBACK_SCRIPT="${1#*=}" ;;
        --log-file=*) LOG_FILE="${1#*=}" ;;
        --json) JSON_OUTPUT=true ;;
        --daemon) DAEMON_MODE=true ;;
        --help|-h)
            echo "Usage: $0 [PROJECT_PATH] [options]"
            echo ""
            echo "Options:"
            echo "  --slack             Send Slack notifications"
            echo "  --callback=SCRIPT   Custom callback script"
            echo "  --log-file=PATH     Log to file"
            echo "  --json              JSON output"
            echo "  --daemon            Run as daemon"
            exit 0
            ;;
    esac
    shift
done

# Colors
if [[ "$JSON_OUTPUT" == false ]]; then
    RED='\033[0;31m'
    GREEN='\033[0;32m'
    YELLOW='\033[1;33m'
    BLUE='\033[0;34m'
    MAGENTA='\033[0;35m'
    CYAN='\033[0;36m'
    NC='\033[0m'
else
    RED='' GREEN='' YELLOW='' BLUE='' MAGENTA='' CYAN='' NC=''
fi

# ─────────────────────────────────────────────────────────────────────────────
# LOGGING
# ─────────────────────────────────────────────────────────────────────────────

log() {
    local level="$1"
    local message="$2"
    local timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ)

    local output="[$timestamp] [$level] $message"

    if [[ -n "$LOG_FILE" ]]; then
        echo "$output" >> "$LOG_FILE"
    fi

    if [[ "$JSON_OUTPUT" == false ]]; then
        local color=""
        case "$level" in
            INFO) color="$BLUE" ;;
            WARN) color="$YELLOW" ;;
            ERROR) color="$RED" ;;
            SUCCESS) color="$GREEN" ;;
            EVENT) color="$CYAN" ;;
        esac
        echo -e "${color}${output}${NC}"
    fi
}

log_json() {
    local event_type="$1"
    local signal_type="$2"
    local agent="$3"
    local file_path="$4"
    local details="$5"

    if [[ "$JSON_OUTPUT" == true ]]; then
        cat << EOF
{"timestamp":"$(date -u +%Y-%m-%dT%H:%M:%SZ)","event":"$event_type","signal_type":"$signal_type","agent":"$agent","file":"$file_path","details":$details}
EOF
    fi
}

# ─────────────────────────────────────────────────────────────────────────────
# SIGNAL PARSING
# ─────────────────────────────────────────────────────────────────────────────

# Extract agent name from signal filename
# signal-fe-dev-1-ready.json -> fe-dev-1
extract_agent() {
    local filename="$1"
    local basename=$(basename "$filename" .json)

    # Remove "signal-" prefix
    basename="${basename#signal-}"

    # Common suffixes to remove
    for suffix in ready complete error progress assignment processing shutdown exit emergency-halt gate gate1 gate2 gate3 gate4 gate5 gate6 gate7; do
        basename="${basename%-$suffix}"
    done

    echo "$basename"
}

# Detect signal type from filename
detect_signal_type() {
    local filename="$1"
    local basename=$(basename "$filename")

    case "$basename" in
        *-ready.json) echo "agent_ready" ;;
        *-complete.json) echo "agent_complete" ;;
        *-error.json) echo "agent_error" ;;
        *-progress.json) echo "agent_progress" ;;
        *-assignment.json) echo "agent_assignment" ;;
        *-processing.json) echo "agent_processing" ;;
        *-shutdown.json) echo "agent_shutdown" ;;
        *-exit.json) echo "agent_exit" ;;
        *-emergency-halt.json) echo "emergency_halt" ;;
        *-gate*.json) echo "gate_transition" ;;
        *-heartbeat.json) echo "heartbeat" ;;
        EMERGENCY-STOP) echo "kill_switch" ;;
        *-STOP.json) echo "agent_stop" ;;
        *) echo "unknown" ;;
    esac
}

# ─────────────────────────────────────────────────────────────────────────────
# EVENT HANDLERS
# ─────────────────────────────────────────────────────────────────────────────

handle_agent_ready() {
    local file_path="$1"
    local agent=$(extract_agent "$file_path")
    local content=$(cat "$file_path" 2>/dev/null || echo "{}")

    log "SUCCESS" "Agent $agent is READY"
    log_json "signal_created" "agent_ready" "$agent" "$file_path" "$content"

    if [[ "$SLACK_ENABLED" == true ]]; then
        notify_slack ":white_check_mark: Agent \`$agent\` is ready" "info"
    fi
}

handle_agent_complete() {
    local file_path="$1"
    local agent=$(extract_agent "$file_path")
    local content=$(cat "$file_path" 2>/dev/null || echo "{}")

    local story_id=$(echo "$content" | jq -r '.story_id // "unknown"' 2>/dev/null)

    log "SUCCESS" "Agent $agent COMPLETED story: $story_id"
    log_json "signal_created" "agent_complete" "$agent" "$file_path" "$content"

    if [[ "$SLACK_ENABLED" == true ]]; then
        notify_slack ":tada: Agent \`$agent\` completed \`$story_id\`" "success"
    fi
}

handle_agent_error() {
    local file_path="$1"
    local agent=$(extract_agent "$file_path")
    local content=$(cat "$file_path" 2>/dev/null || echo "{}")

    local error_msg=$(echo "$content" | jq -r '.error // .message // "Unknown error"' 2>/dev/null)

    log "ERROR" "Agent $agent ERROR: $error_msg"
    log_json "signal_created" "agent_error" "$agent" "$file_path" "$content"

    if [[ "$SLACK_ENABLED" == true ]]; then
        notify_slack ":x: Agent \`$agent\` error: $error_msg" "error"
    fi
}

handle_gate_transition() {
    local file_path="$1"
    local agent=$(extract_agent "$file_path")
    local content=$(cat "$file_path" 2>/dev/null || echo "{}")

    local gate=$(echo "$content" | jq -r '.gate // "unknown"' 2>/dev/null)
    local status=$(echo "$content" | jq -r '.status // "unknown"' 2>/dev/null)

    log "EVENT" "Gate transition: $agent -> Gate $gate ($status)"
    log_json "signal_created" "gate_transition" "$agent" "$file_path" "$content"

    if [[ "$SLACK_ENABLED" == true ]]; then
        notify_slack ":gate: \`$agent\` Gate $gate: $status" "info"
    fi
}

handle_kill_switch() {
    local file_path="$1"

    log "ERROR" "!!! EMERGENCY KILL SWITCH ACTIVATED !!!"
    log_json "signal_created" "kill_switch" "system" "$file_path" '{"activated":true}'

    if [[ "$SLACK_ENABLED" == true ]]; then
        notify_slack ":rotating_light: EMERGENCY KILL SWITCH ACTIVATED" "critical"
    fi

    # Trigger safe termination
    if [[ -x "$SCRIPT_DIR/safe-termination.sh" ]]; then
        log "WARN" "Triggering safe termination..."
        "$SCRIPT_DIR/safe-termination.sh" "$PROJECT_PATH" --immediate &
    fi
}

handle_heartbeat() {
    local file_path="$1"
    local agent=$(basename "$file_path" -heartbeat.json)
    local content=$(cat "$file_path" 2>/dev/null || echo "{}")

    # Heartbeats are frequent - only log in JSON mode or debug
    log_json "signal_modified" "heartbeat" "$agent" "$file_path" "$content"
}

handle_agent_progress() {
    local file_path="$1"
    local agent=$(extract_agent "$file_path")
    local content=$(cat "$file_path" 2>/dev/null || echo "{}")

    local story_id=$(echo "$content" | jq -r '.story_id // "unknown"' 2>/dev/null)
    local progress=$(echo "$content" | jq -r '.progress_percent // 0' 2>/dev/null)

    log "INFO" "Agent $agent progress: $story_id at ${progress}%"
    log_json "signal_modified" "agent_progress" "$agent" "$file_path" "$content"
}

# ─────────────────────────────────────────────────────────────────────────────
# SLACK NOTIFICATIONS
# ─────────────────────────────────────────────────────────────────────────────

notify_slack() {
    local message="$1"
    local severity="${2:-info}"

    # Use existing slack-notify.sh if available
    if [[ -x "$SCRIPT_DIR/slack-notify.sh" ]]; then
        "$SCRIPT_DIR/slack-notify.sh" "$severity" "$message" 2>/dev/null &
    elif [[ -x "$SCRIPT_DIR/lib/slack-notify.sh" ]]; then
        source "$SCRIPT_DIR/lib/slack-notify.sh"
        slack_send "$message" "$severity" 2>/dev/null &
    fi
}

# ─────────────────────────────────────────────────────────────────────────────
# CALLBACK EXECUTION
# ─────────────────────────────────────────────────────────────────────────────

run_callback() {
    local event_type="$1"
    local signal_type="$2"
    local agent="$3"
    local file_path="$4"

    if [[ -n "$CALLBACK_SCRIPT" && -x "$CALLBACK_SCRIPT" ]]; then
        "$CALLBACK_SCRIPT" "$event_type" "$signal_type" "$agent" "$file_path" &
    fi
}

# ─────────────────────────────────────────────────────────────────────────────
# MAIN EVENT PROCESSOR
# ─────────────────────────────────────────────────────────────────────────────

process_event() {
    local event_type="$1"  # create, modify, delete
    local file_path="$2"
    local timestamp="$3"

    local signal_type=$(detect_signal_type "$file_path")
    local agent=$(extract_agent "$file_path")

    # Skip unknown signals
    [[ "$signal_type" == "unknown" ]] && return 0

    # Route to appropriate handler
    case "$signal_type" in
        agent_ready)
            [[ "$event_type" == "create" ]] && handle_agent_ready "$file_path"
            ;;
        agent_complete)
            [[ "$event_type" == "create" ]] && handle_agent_complete "$file_path"
            ;;
        agent_error)
            [[ "$event_type" == "create" ]] && handle_agent_error "$file_path"
            ;;
        agent_progress)
            handle_agent_progress "$file_path"
            ;;
        gate_transition)
            [[ "$event_type" == "create" ]] && handle_gate_transition "$file_path"
            ;;
        kill_switch)
            [[ "$event_type" == "create" ]] && handle_kill_switch "$file_path"
            ;;
        heartbeat)
            handle_heartbeat "$file_path"
            ;;
        agent_shutdown|agent_exit)
            log "INFO" "Agent $agent shutting down"
            log_json "signal_created" "$signal_type" "$agent" "$file_path" "{}"
            ;;
        emergency_halt)
            log "ERROR" "Agent $agent emergency halt"
            log_json "signal_created" "$signal_type" "$agent" "$file_path" "{}"
            ;;
    esac

    # Run custom callback
    run_callback "$event_type" "$signal_type" "$agent" "$file_path"
}

# ─────────────────────────────────────────────────────────────────────────────
# WATCHER INTEGRATION
# ─────────────────────────────────────────────────────────────────────────────

start_watcher() {
    # Ensure .claude directory exists
    mkdir -p "$CLAUDE_DIR" "$HEARTBEAT_DIR"

    if [[ "$JSON_OUTPUT" == false ]]; then
        echo ""
        echo "╔═══════════════════════════════════════════════════════════════════════════════╗"
        echo "║                      WAVE SIGNAL FILE WATCHER                                 ║"
        echo "╚═══════════════════════════════════════════════════════════════════════════════╝"
        echo ""
        echo "  Project:  $PROJECT_PATH"
        echo "  Watching: $CLAUDE_DIR"
        echo "  Slack:    $SLACK_ENABLED"
        [[ -n "$CALLBACK_SCRIPT" ]] && echo "  Callback: $CALLBACK_SCRIPT"
        [[ -n "$LOG_FILE" ]] && echo "  Log file: $LOG_FILE"
        echo ""
        log "INFO" "Starting filesystem watcher..."
        echo ""
    fi

    # Check if native filesystem watcher is available
    local use_native=false
    if command -v fswatch &> /dev/null || command -v inotifywait &> /dev/null; then
        use_native=true
    fi

    if [[ "$use_native" == true && -x "$SCRIPT_DIR/fs-watcher.sh" ]]; then
        # Use native filesystem watching
        "$SCRIPT_DIR/fs-watcher.sh" "$CLAUDE_DIR" \
            --pattern="*.json" \
            --events="create,modify" \
            --json \
            --recursive | while read -r line; do
                # Parse JSON event from fs-watcher
                local event=$(echo "$line" | jq -r '.event' 2>/dev/null)
                local path=$(echo "$line" | jq -r '.path' 2>/dev/null)
                local ts=$(echo "$line" | jq -r '.timestamp' 2>/dev/null)

                [[ -n "$event" && -n "$path" ]] && process_event "$event" "$path" "$ts"
            done
    else
        # Fallback to polling mode
        log "WARN" "Native watcher not available, using polling mode (install fswatch or inotify-tools for better performance)"
        poll_mode
    fi
}

# Polling fallback for systems without fswatch/inotify
poll_mode() {
    local poll_interval=2
    local state_file="/tmp/wave-signal-watcher-state-$$.txt"

    # Initialize state file
    : > "$state_file"

    # Track kill switch state
    local kill_switch_seen=false

    while true; do
        # Scan for signal files
        for file in "$CLAUDE_DIR"/signal-*.json "$HEARTBEAT_DIR"/*-heartbeat.json; do
            [[ ! -f "$file" ]] && continue

            local mtime
            if [[ "$OSTYPE" == "darwin"* ]]; then
                mtime=$(stat -f %m "$file" 2>/dev/null || echo "0")
            else
                mtime=$(stat -c %Y "$file" 2>/dev/null || echo "0")
            fi

            # Use file to track state (compatible with bash 3.x)
            local key_hash=$(echo "$file" | md5 2>/dev/null || echo "$file" | md5sum 2>/dev/null | cut -d' ' -f1)
            local prev_mtime=$(grep "^${key_hash}:" "$state_file" 2>/dev/null | cut -d: -f2)

            if [[ -z "$prev_mtime" ]]; then
                # New file
                echo "${key_hash}:${mtime}" >> "$state_file"
                process_event "create" "$file" "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
            elif [[ "$mtime" != "$prev_mtime" ]]; then
                # Modified file - update state
                sed -i.bak "s/^${key_hash}:.*/${key_hash}:${mtime}/" "$state_file" 2>/dev/null || \
                    sed -i '' "s/^${key_hash}:.*/${key_hash}:${mtime}/" "$state_file" 2>/dev/null
                process_event "modify" "$file" "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
            fi
        done

        # Check for kill switch
        if [[ -f "$CLAUDE_DIR/EMERGENCY-STOP" && "$kill_switch_seen" == false ]]; then
            kill_switch_seen=true
            process_event "create" "$CLAUDE_DIR/EMERGENCY-STOP" "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
        elif [[ ! -f "$CLAUDE_DIR/EMERGENCY-STOP" ]]; then
            kill_switch_seen=false
        fi

        sleep "$poll_interval"
    done

    # Cleanup
    rm -f "$state_file" "$state_file.bak"
}

# ─────────────────────────────────────────────────────────────────────────────
# DAEMON MODE
# ─────────────────────────────────────────────────────────────────────────────

run_daemon() {
    local pid_file="$CLAUDE_DIR/signal-watcher.pid"

    # Check if already running
    if [[ -f "$pid_file" ]]; then
        local existing_pid=$(cat "$pid_file")
        if kill -0 "$existing_pid" 2>/dev/null; then
            echo "Signal watcher already running (PID: $existing_pid)" >&2
            exit 1
        fi
    fi

    # Write PID file
    echo $$ > "$pid_file"

    # Trap for cleanup
    trap 'rm -f "$pid_file"; exit 0' SIGINT SIGTERM

    log "INFO" "Daemon started (PID: $$)"
    start_watcher
}

# ─────────────────────────────────────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────────────────────────────────────

main() {
    # Validate project path
    if [[ ! -d "$PROJECT_PATH" ]]; then
        echo "Error: Project path does not exist: $PROJECT_PATH" >&2
        exit 1
    fi

    # Trap for graceful shutdown
    trap 'log "INFO" "Shutting down signal watcher..."; exit 0' SIGINT SIGTERM

    if [[ "$DAEMON_MODE" == true ]]; then
        run_daemon
    else
        start_watcher
    fi
}

main "$@"
