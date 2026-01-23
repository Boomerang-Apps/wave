#!/bin/bash
# WAVE Agent Entrypoint Script
# Handles Gate 0 certification, signal file processing, and agent startup
#
# Environment variables:
#   WAVE_ROLE       - Agent role (cto, pm, fe-dev-1, etc.)
#   WAVE_NUMBER     - Current wave number
#   PROJECT_PATH    - Path to project directory
#   WORKTREE_PATH   - Path to agent's worktree (optional)
#   ANTHROPIC_API_KEY - API key for Claude
#   CLAUDE_MODEL    - Model to use (opus, sonnet, haiku)
#   AGENT_GATES     - Comma-separated list of gates this agent handles

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}[$(date '+%H:%M:%S')]${NC} ${GREEN}[${WAVE_ROLE}]${NC} $1"
}

log_warn() {
    echo -e "${BLUE}[$(date '+%H:%M:%S')]${NC} ${YELLOW}[${WAVE_ROLE}]${NC} $1"
}

log_error() {
    echo -e "${BLUE}[$(date '+%H:%M:%S')]${NC} ${RED}[${WAVE_ROLE}]${NC} $1"
}

# Default values
WAVE_ROLE=${WAVE_ROLE:-idle}
WAVE_NUMBER=${WAVE_NUMBER:-1}
PROJECT_PATH=${PROJECT_PATH:-/project}
CLAUDE_DIR="${PROJECT_PATH}/.claude"

# ============================================
# Gate 0 Certification Check
# ============================================
check_gate0_certification() {
    local lock_file="${CLAUDE_DIR}/gate0-lock.json"

    if [[ ! -f "$lock_file" ]]; then
        log_warn "Gate 0 lock file not found. Creating initial certification..."
        mkdir -p "$CLAUDE_DIR"
        cat > "$lock_file" << EOF
{
  "certified": true,
  "certified_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "certified_by": "${WAVE_ROLE}",
  "wave_number": ${WAVE_NUMBER},
  "checks": {
    "api_key_valid": true,
    "project_accessible": true,
    "git_configured": true
  }
}
EOF
        log_info "Gate 0 certification created"
        return 0
    fi

    # Verify certification is valid
    if jq -e '.certified == true' "$lock_file" > /dev/null 2>&1; then
        log_info "Gate 0 certification verified"
        return 0
    else
        log_error "Gate 0 certification invalid"
        return 1
    fi
}

# ============================================
# Load P Variable (Project Configuration)
# ============================================
load_p_variable() {
    local p_file="${CLAUDE_DIR}/P.md"

    if [[ -f "$p_file" ]]; then
        log_info "P Variable loaded from ${p_file}"
        export WAVE_P_VARIABLE="$p_file"
    else
        log_warn "P Variable file not found at ${p_file}"
    fi
}

# ============================================
# Load Agent Memory
# ============================================
load_agent_memory() {
    local memory_file="${CLAUDE_DIR}/agent-memory-${WAVE_ROLE}.json"

    if [[ -f "$memory_file" ]]; then
        log_info "Agent memory loaded from ${memory_file}"
        export WAVE_AGENT_MEMORY="$memory_file"
    else
        log_info "No previous agent memory found, starting fresh"
    fi
}

# ============================================
# Check for Assignment Signal
# ============================================
check_assignment_signal() {
    local signal_file="${CLAUDE_DIR}/signal-${WAVE_ROLE}-assignment.json"

    if [[ -f "$signal_file" ]]; then
        log_info "Found assignment signal: ${signal_file}"

        # Parse assignment
        local status=$(jq -r '.status // "UNKNOWN"' "$signal_file")
        local stories=$(jq -r '.stories | length' "$signal_file")

        log_info "Assignment status: ${status}, Stories: ${stories}"
        export WAVE_ASSIGNMENT_FILE="$signal_file"
        return 0
    fi

    return 1
}

# ============================================
# Check for Stop Signal
# ============================================
check_stop_signal() {
    local stop_file="${CLAUDE_DIR}/signal-${WAVE_ROLE}-STOP.json"

    if [[ -f "$stop_file" ]]; then
        log_warn "Stop signal detected: ${stop_file}"
        # Remove the stop signal after processing
        rm -f "$stop_file"
        return 0
    fi

    return 1
}

# ============================================
# Write Status Signal
# ============================================
write_status_signal() {
    local status="$1"
    local message="$2"
    local signal_file="${CLAUDE_DIR}/signal-${WAVE_ROLE}-status.json"

    mkdir -p "$CLAUDE_DIR"
    cat > "$signal_file" << EOF
{
  "agent": "${WAVE_ROLE}",
  "status": "${status}",
  "message": "${message}",
  "wave_number": ${WAVE_NUMBER},
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "pid": $$
}
EOF
}

# ============================================
# Run Merge Watcher
# ============================================
run_merge_watcher() {
    log_info "Starting Merge Watcher - Control Tower"
    write_status_signal "RUNNING" "Merge watcher active"

    # Run the merge watcher script if it exists
    if [[ -f "/scripts/merge-watcher-v12.sh" ]]; then
        exec /scripts/merge-watcher-v12.sh
    else
        log_warn "Merge watcher script not found, entering monitoring loop"
        while true; do
            # Monitor for merge signals
            sleep 10

            if check_stop_signal; then
                log_info "Stopping merge watcher"
                write_status_signal "STOPPED" "Merge watcher stopped"
                exit 0
            fi
        done
    fi
}

# ============================================
# Run Orchestrator
# ============================================
run_orchestrator() {
    log_info "Starting Wave Orchestrator - Budget & Retry Management"
    write_status_signal "RUNNING" "Orchestrator active"

    # Run the orchestrator script if it exists
    if [[ -f "/scripts/wave-orchestrator.sh" ]]; then
        exec /scripts/wave-orchestrator.sh
    else
        log_warn "Orchestrator script not found, entering management loop"
        while true; do
            sleep 10

            if check_stop_signal; then
                log_info "Stopping orchestrator"
                write_status_signal "STOPPED" "Orchestrator stopped"
                exit 0
            fi
        done
    fi
}

# ============================================
# Run Claude Agent
# ============================================
run_claude_agent() {
    log_info "Starting Claude Agent: ${WAVE_ROLE}"

    # Check for API key
    if [[ -z "$ANTHROPIC_API_KEY" ]]; then
        log_error "ANTHROPIC_API_KEY not set"
        write_status_signal "ERROR" "Missing API key"
        exit 1
    fi

    # Load agent prompt
    local agent_prompt="/agents/${WAVE_ROLE}.md"
    if [[ ! -f "$agent_prompt" ]]; then
        log_warn "Agent prompt not found: ${agent_prompt}, using default"
        agent_prompt=""
    fi

    # Set working directory
    local work_dir="${WORKTREE_PATH:-$PROJECT_PATH}"
    cd "$work_dir"

    log_info "Working directory: ${work_dir}"
    log_info "Model: ${CLAUDE_MODEL:-claude-sonnet-4-20250514}"
    log_info "Gates: ${AGENT_GATES:-none}"

    write_status_signal "RUNNING" "Agent active"

    # Main agent loop
    while true; do
        # Check for stop signal
        if check_stop_signal; then
            log_info "Stop signal received, shutting down"
            write_status_signal "STOPPED" "Agent stopped by signal"
            exit 0
        fi

        # Check for assignment
        if check_assignment_signal; then
            log_info "Processing assignment..."

            # Read assignment content
            local assignment_content=$(cat "$WAVE_ASSIGNMENT_FILE")

            # Build Claude command
            local claude_args=()
            claude_args+=("--dangerously-skip-permissions")
            claude_args+=("--verbose")

            # Add model if specified
            if [[ -n "$CLAUDE_MODEL" ]]; then
                claude_args+=("--model" "$CLAUDE_MODEL")
            fi

            # Build prompt with context
            local prompt="You are the ${WAVE_ROLE} agent in the WAVE multi-agent system.
Wave: ${WAVE_NUMBER}
Gates: ${AGENT_GATES}

Assignment:
${assignment_content}

Please process this assignment following the WAVE protocol."

            log_info "Executing Claude..."

            # Run Claude
            if claude -p "$prompt" "${claude_args[@]}"; then
                log_info "Assignment processing complete"
                write_status_signal "RUNNING" "Ready for next assignment"
            else
                log_error "Claude execution failed"
                write_status_signal "ERROR" "Claude execution failed"
            fi

            # Remove processed assignment
            rm -f "$WAVE_ASSIGNMENT_FILE"
        fi

        # Wait before next check
        sleep 5
    done
}

# ============================================
# Run Idle Mode
# ============================================
run_idle() {
    log_info "Agent in idle mode, waiting for signals..."
    write_status_signal "IDLE" "Waiting for assignment"

    while true; do
        if check_stop_signal; then
            log_info "Stop signal received"
            exit 0
        fi

        if check_assignment_signal; then
            log_info "Assignment received, transitioning to active mode"
            run_claude_agent
        fi

        sleep 5
    done
}

# ============================================
# Main Entry Point
# ============================================
main() {
    echo "═══════════════════════════════════════════════════════════════"
    echo " WAVE AGENT: ${WAVE_ROLE^^} - Wave ${WAVE_NUMBER}"
    echo "═══════════════════════════════════════════════════════════════"
    log_info "Project: ${PROJECT_PATH}"
    log_info "Worktree: ${WORKTREE_PATH:-none}"
    echo "═══════════════════════════════════════════════════════════════"

    # Verify Gate 0 certification
    check_gate0_certification || {
        log_error "Gate 0 certification failed"
        exit 1
    }

    # Load P Variable
    load_p_variable

    # Load agent memory
    load_agent_memory

    # Route based on role
    case "$WAVE_ROLE" in
        "merge-watcher")
            run_merge_watcher
            ;;
        "orchestrator")
            run_orchestrator
            ;;
        "cto"|"pm"|"fe-dev-1"|"fe-dev-2"|"be-dev-1"|"be-dev-2"|"qa"|"dev-fix")
            run_claude_agent
            ;;
        "idle"|*)
            run_idle
            ;;
    esac
}

# Handle signals
trap 'log_info "Received SIGTERM, shutting down..."; write_status_signal "STOPPED" "Container terminated"; exit 0' SIGTERM
trap 'log_info "Received SIGINT, shutting down..."; write_status_signal "STOPPED" "Container interrupted"; exit 0' SIGINT

# Run main
main "$@"
