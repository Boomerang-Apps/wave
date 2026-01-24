#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# WAVE FRAMEWORK - Container Entrypoint
# ═══════════════════════════════════════════════════════════════════════════════
# Main entry point for containerized agent execution
# Handles initialization, signal monitoring, and graceful shutdown
# ═══════════════════════════════════════════════════════════════════════════════

set -e

# ─────────────────────────────────────────────────────────────────────────────
# CONFIGURATION
# ─────────────────────────────────────────────────────────────────────────────

AGENT_TYPE="${AGENT_TYPE:-unknown}"
WAVE_SIGNALS="${WAVE_SIGNALS:-/signals}"
WAVE_PROJECT="${WAVE_PROJECT:-/workspace}"
WAVE_LOGS="${WAVE_LOGS:-/logs}"
HEARTBEAT_INTERVAL="${HEARTBEAT_INTERVAL:-60}"

# Log file for this agent
LOG_FILE="${WAVE_LOGS}/${AGENT_TYPE}-$(date +%Y%m%d).log"

# ─────────────────────────────────────────────────────────────────────────────
# LOGGING
# ─────────────────────────────────────────────────────────────────────────────

log() {
    local level="$1"
    shift
    local message="$*"
    local timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ)
    echo "[${timestamp}] [${level}] [${AGENT_TYPE}] ${message}" | tee -a "$LOG_FILE"
}

log_info() { log "INFO" "$@"; }
log_warn() { log "WARN" "$@"; }
log_error() { log "ERROR" "$@"; }

# ─────────────────────────────────────────────────────────────────────────────
# SIGNAL HANDLING
# ─────────────────────────────────────────────────────────────────────────────

SHUTDOWN_REQUESTED=false

handle_shutdown() {
    log_info "Shutdown signal received"
    SHUTDOWN_REQUESTED=true

    # Create shutdown signal file
    cat > "${WAVE_SIGNALS}/signal-${AGENT_TYPE}-shutdown.json" << EOF
{
    "agent": "${AGENT_TYPE}",
    "event": "shutdown_requested",
    "pid": $$,
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF

    # Give running processes time to complete
    sleep 2

    log_info "Agent shutdown complete"
    exit 0
}

# Trap termination signals
trap handle_shutdown SIGTERM SIGINT SIGHUP

# ─────────────────────────────────────────────────────────────────────────────
# KILL SWITCH CHECK
# ─────────────────────────────────────────────────────────────────────────────

check_kill_switch() {
    if [[ -f "${WAVE_SIGNALS}/EMERGENCY-STOP" ]]; then
        log_error "EMERGENCY-STOP detected! Halting immediately."

        cat > "${WAVE_SIGNALS}/signal-${AGENT_TYPE}-emergency-halt.json" << EOF
{
    "agent": "${AGENT_TYPE}",
    "event": "emergency_halt",
    "reason": "EMERGENCY-STOP file detected",
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF
        exit 1
    fi

    # Check for agent-specific stop signal
    if [[ -f "${WAVE_SIGNALS}/signal-${AGENT_TYPE}-STOP.json" ]]; then
        log_warn "Stop signal detected for ${AGENT_TYPE}"
        return 1
    fi

    return 0
}

# ─────────────────────────────────────────────────────────────────────────────
# HEARTBEAT
# ─────────────────────────────────────────────────────────────────────────────

HEARTBEAT_COUNT=0

send_heartbeat() {
    HEARTBEAT_COUNT=$((HEARTBEAT_COUNT + 1))
    local hb_file="${WAVE_SIGNALS}/heartbeats/${AGENT_TYPE}-heartbeat.json"
    log_info "Writing heartbeat #${HEARTBEAT_COUNT} to ${hb_file}"

    cat > "${hb_file}" << EOF
{
    "agent": "${AGENT_TYPE}",
    "status": "running",
    "beat": ${HEARTBEAT_COUNT},
    "pid": $$,
    "memory_mb": $(awk '/MemAvailable/ {print int($2/1024)}' /proc/meminfo 2>/dev/null || echo "0"),
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF
}

# Background heartbeat process
start_heartbeat() {
    mkdir -p "${WAVE_SIGNALS}/heartbeats"

    while [[ "$SHUTDOWN_REQUESTED" != true ]]; do
        send_heartbeat

        # Check kill switch during heartbeat
        if ! check_kill_switch; then
            log_warn "Stopping due to kill switch or stop signal"
            SHUTDOWN_REQUESTED=true
            break
        fi

        sleep "$HEARTBEAT_INTERVAL"
    done &

    HEARTBEAT_PID=$!
    log_info "Heartbeat started (PID: $HEARTBEAT_PID, interval: ${HEARTBEAT_INTERVAL}s)"
}

# ─────────────────────────────────────────────────────────────────────────────
# INITIALIZATION
# ─────────────────────────────────────────────────────────────────────────────

initialize() {
    log_info "═══════════════════════════════════════════════════════════════════"
    log_info "  WAVE Agent Container Starting"
    log_info "═══════════════════════════════════════════════════════════════════"
    log_info "  Agent:     ${AGENT_TYPE}"
    log_info "  Workspace: ${WAVE_PROJECT}"
    log_info "  Signals:   ${WAVE_SIGNALS}"
    log_info "  User:      $(whoami) ($(id -u):$(id -g))"
    log_info "  PID:       $$"
    log_info "═══════════════════════════════════════════════════════════════════"

    # Verify directories
    for dir in "$WAVE_PROJECT" "$WAVE_SIGNALS" "$WAVE_LOGS"; do
        if [[ ! -d "$dir" ]]; then
            log_error "Required directory missing: $dir"
            exit 1
        fi
    done

    # Check for kill switch before starting
    if ! check_kill_switch; then
        log_error "Cannot start - kill switch is active"
        exit 1
    fi

    # Create agent ready signal
    cat > "${WAVE_SIGNALS}/signal-${AGENT_TYPE}-ready.json" << EOF
{
    "agent": "${AGENT_TYPE}",
    "event": "agent_ready",
    "pid": $$,
    "container": true,
    "workspace": "${WAVE_PROJECT}",
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF

    log_info "Agent initialized and ready"
}

# ─────────────────────────────────────────────────────────────────────────────
# MAIN AGENT LOOP
# ─────────────────────────────────────────────────────────────────────────────

run_agent() {
    log_info "Agent main loop started"

    # Check for assignment signal
    local assignment_file="${WAVE_SIGNALS}/signal-${AGENT_TYPE}-assignment.json"

    while [[ "$SHUTDOWN_REQUESTED" != true ]]; do
        # Check kill switch
        if ! check_kill_switch; then
            break
        fi

        # Look for assignment
        if [[ -f "$assignment_file" ]]; then
            log_info "Assignment found - processing..."

            # Read assignment
            local assignment=$(cat "$assignment_file")
            local stories=$(echo "$assignment" | jq -r '.stories[]?' 2>/dev/null || echo "")

            if [[ -n "$stories" ]]; then
                log_info "Assigned stories: $stories"

                # Create processing signal
                cat > "${WAVE_SIGNALS}/signal-${AGENT_TYPE}-processing.json" << EOF
{
    "agent": "${AGENT_TYPE}",
    "event": "processing_started",
    "assignment": "$assignment_file",
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF

                # TODO: Actual agent work would happen here
                # For now, we're just the container infrastructure

                log_info "Processing complete (container shell mode)"
            fi

            # Archive processed assignment
            mv "$assignment_file" "${WAVE_SIGNALS}/archive/" 2>/dev/null || true
        fi

        # Wait before next check
        sleep 5
    done

    log_info "Agent main loop ended"
}

# ─────────────────────────────────────────────────────────────────────────────
# CLEANUP
# ─────────────────────────────────────────────────────────────────────────────

cleanup() {
    log_info "Cleaning up..."

    # Stop heartbeat
    if [[ -n "$HEARTBEAT_PID" ]]; then
        kill "$HEARTBEAT_PID" 2>/dev/null || true
    fi

    # Remove ready signal
    rm -f "${WAVE_SIGNALS}/signal-${AGENT_TYPE}-ready.json"

    # Create exit signal
    cat > "${WAVE_SIGNALS}/signal-${AGENT_TYPE}-exit.json" << EOF
{
    "agent": "${AGENT_TYPE}",
    "event": "container_exit",
    "exit_code": ${EXIT_CODE:-0},
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF

    log_info "Cleanup complete"
}

trap cleanup EXIT

# ─────────────────────────────────────────────────────────────────────────────
# MAIN EXECUTION
# ─────────────────────────────────────────────────────────────────────────────

main() {
    # Initialize
    initialize

    # Start heartbeat
    start_heartbeat

    # If running in shell mode (no arguments), just keep container alive
    if [[ $# -eq 0 ]]; then
        log_info "Running in container mode - waiting for signals..."
        run_agent
    else
        # Execute provided command
        log_info "Executing command: $*"
        "$@"
        EXIT_CODE=$?
        log_info "Command completed with exit code: $EXIT_CODE"
    fi
}

# Run main
main "$@"
