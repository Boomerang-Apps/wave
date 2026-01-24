#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# WAVE FRAMEWORK - Agent Utilities
# ═══════════════════════════════════════════════════════════════════════════════
# Helper functions available inside the agent container
# ═══════════════════════════════════════════════════════════════════════════════

# Source this file in agent scripts:
#   source /usr/local/bin/agent-utils.sh

# ─────────────────────────────────────────────────────────────────────────────
# ENVIRONMENT
# ─────────────────────────────────────────────────────────────────────────────

export AGENT_TYPE="${AGENT_TYPE:-unknown}"
export WAVE_SIGNALS="${WAVE_SIGNALS:-/signals}"
export WAVE_PROJECT="${WAVE_PROJECT:-/workspace}"

# ─────────────────────────────────────────────────────────────────────────────
# SIGNAL FUNCTIONS
# ─────────────────────────────────────────────────────────────────────────────

# Create a signal file
# Usage: create_signal "event_type" '{"key": "value"}'
create_signal() {
    local event_type="$1"
    local extra_data="${2:-{}}"
    local signal_file="${WAVE_SIGNALS}/signal-${AGENT_TYPE}-${event_type}.json"

    jq -n \
        --arg agent "$AGENT_TYPE" \
        --arg event "$event_type" \
        --arg ts "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
        --argjson extra "$extra_data" \
        '{agent: $agent, event: $event, timestamp: $ts} + $extra' \
        > "$signal_file"

    echo "$signal_file"
}

# Check if a signal exists
# Usage: signal_exists "gate4-approved"
signal_exists() {
    local pattern="$1"
    ls "${WAVE_SIGNALS}/signal-"*"${pattern}"* 2>/dev/null | head -1
}

# Read a signal file
# Usage: read_signal "signal-wave1-gate3-complete.json"
read_signal() {
    local signal_file="$1"

    if [[ -f "${WAVE_SIGNALS}/${signal_file}" ]]; then
        cat "${WAVE_SIGNALS}/${signal_file}"
    elif [[ -f "$signal_file" ]]; then
        cat "$signal_file"
    else
        echo "{}"
    fi
}

# ─────────────────────────────────────────────────────────────────────────────
# KILL SWITCH FUNCTIONS
# ─────────────────────────────────────────────────────────────────────────────

# Check if kill switch is active
# Returns 0 if safe, 1 if kill switch is active
check_kill_switch() {
    [[ ! -f "${WAVE_SIGNALS}/EMERGENCY-STOP" ]]
}

# Check if agent-specific stop is requested
check_agent_stop() {
    [[ ! -f "${WAVE_SIGNALS}/signal-${AGENT_TYPE}-STOP.json" ]]
}

# Combined safety check
is_safe_to_proceed() {
    check_kill_switch && check_agent_stop
}

# ─────────────────────────────────────────────────────────────────────────────
# STORY FUNCTIONS
# ─────────────────────────────────────────────────────────────────────────────

# Get assigned stories from assignment signal
get_assigned_stories() {
    local assignment_file="${WAVE_SIGNALS}/signal-${AGENT_TYPE}-assignment.json"

    if [[ -f "$assignment_file" ]]; then
        jq -r '.stories[]?' "$assignment_file" 2>/dev/null
    fi
}

# Read a story file
# Usage: read_story "STORY-001.json"
read_story() {
    local story_file="$1"
    local stories_dir="${WAVE_STORIES:-/stories}"

    if [[ -f "${stories_dir}/${story_file}" ]]; then
        cat "${stories_dir}/${story_file}"
    elif [[ -f "$story_file" ]]; then
        cat "$story_file"
    else
        echo "{}"
    fi
}

# ─────────────────────────────────────────────────────────────────────────────
# PROGRESS REPORTING
# ─────────────────────────────────────────────────────────────────────────────

# Report progress on a story
# Usage: report_progress "STORY-001" 50 "Implementing login form"
report_progress() {
    local story_id="$1"
    local percent="$2"
    local message="${3:-}"

    create_signal "progress" "$(jq -n \
        --arg story "$story_id" \
        --arg pct "$percent" \
        --arg msg "$message" \
        '{story_id: $story, progress_percent: ($pct | tonumber), message: $msg}')"
}

# Report story completion
# Usage: report_complete "STORY-001" '["file1.ts", "file2.ts"]'
report_complete() {
    local story_id="$1"
    local files_created="${2:-[]}"

    create_signal "complete" "$(jq -n \
        --arg story "$story_id" \
        --argjson files "$files_created" \
        '{story_id: $story, status: "COMPLETE", files_created: $files}')"
}

# Report an error
# Usage: report_error "STORY-001" "Build failed" "error details..."
report_error() {
    local story_id="$1"
    local error_message="$2"
    local error_details="${3:-}"

    create_signal "error" "$(jq -n \
        --arg story "$story_id" \
        --arg msg "$error_message" \
        --arg details "$error_details" \
        '{story_id: $story, error: $msg, details: $details}')"
}

# ─────────────────────────────────────────────────────────────────────────────
# TOKEN TRACKING
# ─────────────────────────────────────────────────────────────────────────────

# Report token usage
# Usage: report_tokens 1500 500 0.0045
report_tokens() {
    local input_tokens="$1"
    local output_tokens="$2"
    local cost="${3:-0}"

    create_signal "tokens" "$(jq -n \
        --arg inp "$input_tokens" \
        --arg out "$output_tokens" \
        --arg cost "$cost" \
        '{token_usage: {input: ($inp | tonumber), output: ($out | tonumber), cost_usd: ($cost | tonumber)}}')"
}

# ─────────────────────────────────────────────────────────────────────────────
# UTILITY FUNCTIONS
# ─────────────────────────────────────────────────────────────────────────────

# Log with timestamp
log() {
    echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] [$AGENT_TYPE] $*"
}

# Wait for a signal file to appear
# Usage: wait_for_signal "gate4-approved" 300
wait_for_signal() {
    local pattern="$1"
    local timeout="${2:-300}"
    local elapsed=0

    while [[ $elapsed -lt $timeout ]]; do
        if signal_exists "$pattern"; then
            return 0
        fi

        # Check kill switch while waiting
        if ! is_safe_to_proceed; then
            return 1
        fi

        sleep 5
        ((elapsed += 5))
    done

    return 1  # Timeout
}

# ─────────────────────────────────────────────────────────────────────────────
# EXPORT ALL FUNCTIONS
# ─────────────────────────────────────────────────────────────────────────────

export -f create_signal signal_exists read_signal
export -f check_kill_switch check_agent_stop is_safe_to_proceed
export -f get_assigned_stories read_story
export -f report_progress report_complete report_error report_tokens
export -f log wait_for_signal
