#!/bin/bash

# =============================================================================
# WAVE Framework - Safe Termination Script
# =============================================================================
# Version: 1.0.0
# Purpose: Safe shutdown procedures for agents and pipeline
# Usage: ./safe-termination.sh [level] [target] [options]
#
# Levels:
#   E1 - Agent Stop (one agent)
#   E2 - Domain Stop (all agents in domain)
#   E3 - Wave Stop (current wave)
#   E4 - System Stop (all agents)
#   E5 - Emergency Halt (immediate, security)
#
# =============================================================================

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="${PROJECT_ROOT:-$(pwd)}"
CLAUDE_DIR="${PROJECT_ROOT}/.claude"
SIGNAL_DIR="${CLAUDE_DIR}"
LOG_DIR="${PROJECT_ROOT}/logs"
WORKTREE_DIR="${PROJECT_ROOT}/worktrees"

# Colors for output
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

# Termination state file
TERMINATION_STATE="${CLAUDE_DIR}/termination-state.json"

# =============================================================================
# UTILITY FUNCTIONS
# =============================================================================

log_info() {
    echo -e "${BLUE}[INFO]${NC} $(date '+%Y-%m-%d %H:%M:%S') $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $(date '+%Y-%m-%d %H:%M:%S') $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $(date '+%Y-%m-%d %H:%M:%S') $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $(date '+%Y-%m-%d %H:%M:%S') $1"
}

show_usage() {
    cat << EOF
WAVE Safe Termination Script

Usage: $0 [level] [target] [options]

Levels:
  E1    Agent Stop - Stop a single agent gracefully
  E2    Domain Stop - Stop all agents in a domain
  E3    Wave Stop - Stop all agents in current wave
  E4    System Stop - Stop all agents in the system
  E5    Emergency Halt - Immediate stop, security incident

Targets:
  --agent <name>     Agent name (for E1)
  --domain <name>    Domain name (for E2)
  --wave <number>    Wave number (for E3)

Options:
  --reason <text>    Reason for termination
  --force            Force termination without grace period
  --no-backup        Skip state backup
  --timeout <sec>    Grace period in seconds (default: 30)
  --dry-run          Show what would happen without executing
  -h, --help         Show this help

Examples:
  $0 E1 --agent fe-dev-1 --reason "Task completed"
  $0 E2 --domain frontend --reason "Domain needs restart"
  $0 E3 --wave 1 --reason "Wave blocked by dependency"
  $0 E4 --reason "Pipeline maintenance"
  $0 E5 --reason "Security violation detected" --force

EOF
    exit 0
}

# =============================================================================
# STATE MANAGEMENT
# =============================================================================

init_termination_state() {
    local level="$1"
    local target="$2"
    local reason="$3"

    mkdir -p "${CLAUDE_DIR}"

    cat > "${TERMINATION_STATE}" << EOF
{
    "termination_id": "term-$(date +%Y%m%d-%H%M%S)",
    "level": "${level}",
    "target": "${target}",
    "reason": "${reason}",
    "initiated_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "status": "in_progress",
    "phases": {
        "signal_sent": false,
        "grace_period": false,
        "state_saved": false,
        "containers_stopped": false,
        "cleanup_done": false
    },
    "affected_agents": [],
    "errors": []
}
EOF
}

update_termination_phase() {
    local phase="$1"
    local status="$2"

    if command -v jq &> /dev/null && [ -f "${TERMINATION_STATE}" ]; then
        local tmp=$(mktemp)
        jq ".phases.${phase} = ${status}" "${TERMINATION_STATE}" > "$tmp" && mv "$tmp" "${TERMINATION_STATE}"
    fi
}

add_affected_agent() {
    local agent="$1"

    if command -v jq &> /dev/null && [ -f "${TERMINATION_STATE}" ]; then
        local tmp=$(mktemp)
        jq ".affected_agents += [\"${agent}\"]" "${TERMINATION_STATE}" > "$tmp" && mv "$tmp" "${TERMINATION_STATE}"
    fi
}

finalize_termination_state() {
    local status="$1"

    if command -v jq &> /dev/null && [ -f "${TERMINATION_STATE}" ]; then
        local tmp=$(mktemp)
        jq ".status = \"${status}\" | .completed_at = \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"" "${TERMINATION_STATE}" > "$tmp" && mv "$tmp" "${TERMINATION_STATE}"
    fi
}

# =============================================================================
# BACKUP FUNCTIONS
# =============================================================================

backup_agent_state() {
    local agent="$1"
    local backup_dir="${LOG_DIR}/backups/$(date +%Y%m%d-%H%M%S)"

    log_info "Backing up state for agent: ${agent}"

    mkdir -p "${backup_dir}/${agent}"

    # Backup signals
    if ls "${SIGNAL_DIR}"/signal-*-${agent}*.json 2>/dev/null; then
        cp "${SIGNAL_DIR}"/signal-*-${agent}*.json "${backup_dir}/${agent}/" 2>/dev/null || true
    fi

    # Backup worktree state
    local worktree="${WORKTREE_DIR}/${agent}"
    if [ -d "${worktree}" ]; then
        cd "${worktree}"
        git stash -m "Safe termination backup $(date +%Y%m%d-%H%M%S)" 2>/dev/null || true
        git log -5 --oneline > "${backup_dir}/${agent}/git-log.txt" 2>/dev/null || true
        git status > "${backup_dir}/${agent}/git-status.txt" 2>/dev/null || true
        cd - > /dev/null
    fi

    # Backup agent logs
    if [ -f "${LOG_DIR}/${agent}.log" ]; then
        cp "${LOG_DIR}/${agent}.log" "${backup_dir}/${agent}/" 2>/dev/null || true
    fi

    log_success "State backed up to: ${backup_dir}/${agent}"
}

# =============================================================================
# TERMINATION FUNCTIONS
# =============================================================================

send_stop_signal() {
    local agent="$1"
    local reason="$2"
    local level="$3"

    local signal_file="${SIGNAL_DIR}/signal-${agent}-stop.json"

    cat > "${signal_file}" << EOF
{
    "signal_type": "stop",
    "target_agent": "${agent}",
    "emergency_level": "${level}",
    "reason": "${reason}",
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "action_required": "graceful_shutdown"
}
EOF

    log_info "Stop signal sent to: ${agent}"
}

create_emergency_stop_file() {
    local level="$1"
    local reason="$2"

    # Create the kill switch file
    cat > "${CLAUDE_DIR}/EMERGENCY-STOP" << EOF
EMERGENCY STOP ACTIVATED
========================
Level: ${level}
Time: $(date -u +%Y-%m-%dT%H:%M:%SZ)
Reason: ${reason}

All agents must halt immediately.
Check for EMERGENCY-STOP file before any operation.
EOF

    log_warn "EMERGENCY-STOP file created"
}

remove_emergency_stop_file() {
    if [ -f "${CLAUDE_DIR}/EMERGENCY-STOP" ]; then
        rm "${CLAUDE_DIR}/EMERGENCY-STOP"
        log_info "EMERGENCY-STOP file removed"
    fi
}

stop_docker_container() {
    local container="$1"
    local force="${2:-false}"

    if docker ps -q -f name="${container}" 2>/dev/null | grep -q .; then
        if [ "${force}" = "true" ]; then
            log_info "Force stopping container: ${container}"
            docker kill "${container}" 2>/dev/null || true
        else
            log_info "Gracefully stopping container: ${container}"
            docker stop -t 30 "${container}" 2>/dev/null || {
                log_warn "Graceful stop failed, forcing: ${container}"
                docker kill "${container}" 2>/dev/null || true
            }
        fi
        log_success "Container stopped: ${container}"
    else
        log_info "Container not running: ${container}"
    fi
}

wait_grace_period() {
    local seconds="$1"
    local agent="$2"

    log_info "Waiting ${seconds}s grace period for ${agent} to complete current operation..."

    local elapsed=0
    while [ $elapsed -lt $seconds ]; do
        # Check if agent has already stopped
        if ! docker ps -q -f name="${agent}" 2>/dev/null | grep -q .; then
            log_info "Agent ${agent} stopped before grace period ended"
            return 0
        fi

        sleep 5
        elapsed=$((elapsed + 5))
        echo -n "."
    done
    echo ""

    log_info "Grace period complete"
}

# =============================================================================
# LEVEL-SPECIFIC TERMINATION
# =============================================================================

terminate_e1_agent() {
    local agent="$1"
    local reason="$2"
    local force="${3:-false}"
    local timeout="${4:-30}"
    local no_backup="${5:-false}"
    local dry_run="${6:-false}"

    log_info "=== E1: AGENT STOP - ${agent} ==="

    if [ "${dry_run}" = "true" ]; then
        log_info "[DRY RUN] Would stop agent: ${agent}"
        log_info "[DRY RUN] Reason: ${reason}"
        return 0
    fi

    init_termination_state "E1" "${agent}" "${reason}"
    add_affected_agent "${agent}"

    # Phase 1: Send stop signal
    send_stop_signal "${agent}" "${reason}" "E1"
    update_termination_phase "signal_sent" "true"

    # Phase 2: Grace period (unless forced)
    if [ "${force}" != "true" ]; then
        wait_grace_period "${timeout}" "${agent}"
        update_termination_phase "grace_period" "true"
    fi

    # Phase 3: Backup state (unless skipped)
    if [ "${no_backup}" != "true" ]; then
        backup_agent_state "${agent}"
        update_termination_phase "state_saved" "true"
    fi

    # Phase 4: Stop container
    stop_docker_container "${agent}" "${force}"
    update_termination_phase "containers_stopped" "true"

    # Phase 5: Cleanup
    # Remove stop signal (processed)
    rm -f "${SIGNAL_DIR}/signal-${agent}-stop.json"
    update_termination_phase "cleanup_done" "true"

    finalize_termination_state "completed"
    log_success "E1 termination complete for: ${agent}"
}

terminate_e2_domain() {
    local domain="$1"
    local reason="$2"
    local force="${3:-false}"
    local timeout="${4:-30}"
    local no_backup="${5:-false}"
    local dry_run="${6:-false}"

    log_info "=== E2: DOMAIN STOP - ${domain} ==="

    # Define agents per domain
    local -a agents
    case "${domain}" in
        frontend)
            agents=("fe-dev-1" "fe-dev-2")
            ;;
        backend)
            agents=("be-dev-1" "be-dev-2")
            ;;
        qa)
            agents=("qa")
            ;;
        devfix)
            agents=("dev-fix")
            ;;
        management)
            agents=("cto" "pm")
            ;;
        *)
            log_error "Unknown domain: ${domain}"
            return 1
            ;;
    esac

    if [ "${dry_run}" = "true" ]; then
        log_info "[DRY RUN] Would stop domain: ${domain}"
        log_info "[DRY RUN] Agents: ${agents[*]}"
        return 0
    fi

    init_termination_state "E2" "${domain}" "${reason}"

    # Stop each agent in domain
    for agent in "${agents[@]}"; do
        add_affected_agent "${agent}"
        send_stop_signal "${agent}" "Domain stop: ${reason}" "E2"
    done
    update_termination_phase "signal_sent" "true"

    # Grace period
    if [ "${force}" != "true" ]; then
        sleep "${timeout}"
        update_termination_phase "grace_period" "true"
    fi

    # Backup and stop each agent
    for agent in "${agents[@]}"; do
        if [ "${no_backup}" != "true" ]; then
            backup_agent_state "${agent}"
        fi
        stop_docker_container "${agent}" "${force}"
    done
    update_termination_phase "state_saved" "true"
    update_termination_phase "containers_stopped" "true"

    # Cleanup
    for agent in "${agents[@]}"; do
        rm -f "${SIGNAL_DIR}/signal-${agent}-stop.json"
    done
    update_termination_phase "cleanup_done" "true"

    finalize_termination_state "completed"
    log_success "E2 termination complete for domain: ${domain}"
}

terminate_e3_wave() {
    local wave="$1"
    local reason="$2"
    local force="${3:-false}"
    local timeout="${4:-30}"
    local no_backup="${5:-false}"
    local dry_run="${6:-false}"

    log_info "=== E3: WAVE STOP - Wave ${wave} ==="

    # Define agents per wave
    local -a agents
    case "${wave}" in
        1)
            agents=("fe-dev-1" "be-dev-1")
            ;;
        2)
            agents=("fe-dev-2" "be-dev-2")
            ;;
        *)
            log_error "Unknown wave: ${wave}"
            return 1
            ;;
    esac

    if [ "${dry_run}" = "true" ]; then
        log_info "[DRY RUN] Would stop wave: ${wave}"
        log_info "[DRY RUN] Agents: ${agents[*]}"
        return 0
    fi

    init_termination_state "E3" "wave-${wave}" "${reason}"

    # Create wave stop signal
    cat > "${SIGNAL_DIR}/signal-wave${wave}-stop.json" << EOF
{
    "signal_type": "wave-stop",
    "wave": ${wave},
    "reason": "${reason}",
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF

    # Stop each agent in wave
    for agent in "${agents[@]}"; do
        add_affected_agent "${agent}"
        send_stop_signal "${agent}" "Wave stop: ${reason}" "E3"
    done
    update_termination_phase "signal_sent" "true"

    # Grace period
    if [ "${force}" != "true" ]; then
        sleep "${timeout}"
        update_termination_phase "grace_period" "true"
    fi

    # Backup and stop each agent
    for agent in "${agents[@]}"; do
        if [ "${no_backup}" != "true" ]; then
            backup_agent_state "${agent}"
        fi
        stop_docker_container "${agent}" "${force}"
    done
    update_termination_phase "state_saved" "true"
    update_termination_phase "containers_stopped" "true"

    # Cleanup
    rm -f "${SIGNAL_DIR}/signal-wave${wave}-stop.json"
    for agent in "${agents[@]}"; do
        rm -f "${SIGNAL_DIR}/signal-${agent}-stop.json"
    done
    update_termination_phase "cleanup_done" "true"

    finalize_termination_state "completed"
    log_success "E3 termination complete for wave: ${wave}"
}

terminate_e4_system() {
    local reason="$1"
    local force="${2:-false}"
    local timeout="${3:-30}"
    local no_backup="${4:-false}"
    local dry_run="${5:-false}"

    log_info "=== E4: SYSTEM STOP ==="
    log_warn "Stopping ALL agents in the system"

    local all_agents=("cto" "pm" "fe-dev-1" "fe-dev-2" "be-dev-1" "be-dev-2" "qa" "dev-fix")

    if [ "${dry_run}" = "true" ]; then
        log_info "[DRY RUN] Would stop all agents: ${all_agents[*]}"
        return 0
    fi

    init_termination_state "E4" "system" "${reason}"

    # Create system stop signal
    create_emergency_stop_file "E4" "${reason}"

    # Send stop signals to all agents
    for agent in "${all_agents[@]}"; do
        add_affected_agent "${agent}"
        send_stop_signal "${agent}" "System stop: ${reason}" "E4"
    done
    update_termination_phase "signal_sent" "true"

    # Grace period
    if [ "${force}" != "true" ]; then
        log_info "Waiting ${timeout}s for agents to complete current operations..."
        sleep "${timeout}"
        update_termination_phase "grace_period" "true"
    fi

    # Backup all agent states
    if [ "${no_backup}" != "true" ]; then
        for agent in "${all_agents[@]}"; do
            backup_agent_state "${agent}"
        done
        update_termination_phase "state_saved" "true"
    fi

    # Stop all containers
    for agent in "${all_agents[@]}"; do
        stop_docker_container "${agent}" "${force}"
    done
    update_termination_phase "containers_stopped" "true"

    # Stop docker-compose if running
    if [ -f "${PROJECT_ROOT}/docker-compose.yml" ]; then
        log_info "Stopping docker-compose..."
        cd "${PROJECT_ROOT}"
        docker-compose down 2>/dev/null || true
        cd - > /dev/null
    fi

    # Cleanup
    rm -f "${SIGNAL_DIR}"/signal-*-stop.json
    update_termination_phase "cleanup_done" "true"

    finalize_termination_state "completed"
    log_success "E4 system termination complete"
}

terminate_e5_emergency() {
    local reason="$1"
    local dry_run="${2:-false}"

    log_error "=== E5: EMERGENCY HALT ==="
    log_error "IMMEDIATE TERMINATION - Security/Critical Event"
    log_error "Reason: ${reason}"

    local all_agents=("cto" "pm" "fe-dev-1" "fe-dev-2" "be-dev-1" "be-dev-2" "qa" "dev-fix")

    if [ "${dry_run}" = "true" ]; then
        log_info "[DRY RUN] Would emergency halt all agents"
        return 0
    fi

    init_termination_state "E5" "emergency" "${reason}"

    # IMMEDIATELY create emergency stop file
    create_emergency_stop_file "E5" "${reason}"
    update_termination_phase "signal_sent" "true"

    # NO grace period - kill immediately
    log_warn "FORCE KILLING all containers..."

    for agent in "${all_agents[@]}"; do
        add_affected_agent "${agent}"
        # Kill, don't stop
        docker kill "${agent}" 2>/dev/null || true
    done
    update_termination_phase "containers_stopped" "true"

    # Force stop docker-compose
    if [ -f "${PROJECT_ROOT}/docker-compose.yml" ]; then
        cd "${PROJECT_ROOT}"
        docker-compose kill 2>/dev/null || true
        docker-compose down -v 2>/dev/null || true
        cd - > /dev/null
    fi

    # Create security incident signal
    cat > "${SIGNAL_DIR}/signal-security-incident.json" << EOF
{
    "signal_type": "security-incident",
    "level": "E5",
    "reason": "${reason}",
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "action": "emergency_halt",
    "requires_human_review": true
}
EOF

    update_termination_phase "cleanup_done" "true"
    finalize_termination_state "completed"

    log_error "========================================"
    log_error "E5 EMERGENCY HALT COMPLETE"
    log_error "========================================"
    log_error "ALL AGENTS TERMINATED"
    log_error "Human review required before restart"
    log_error "Check: ${SIGNAL_DIR}/signal-security-incident.json"
    log_error "========================================"
}

# =============================================================================
# RESUME FUNCTION
# =============================================================================

resume_after_termination() {
    local level="$1"

    log_info "Resuming after ${level} termination..."

    # Remove emergency stop file
    remove_emergency_stop_file

    # Clear stop signals
    rm -f "${SIGNAL_DIR}"/signal-*-stop.json

    # If E5, require human acknowledgment
    if [ "${level}" = "E5" ]; then
        if [ -f "${SIGNAL_DIR}/signal-security-incident.json" ]; then
            log_error "Cannot resume after E5 without human acknowledgment"
            log_error "Human must:"
            log_error "  1. Review signal-security-incident.json"
            log_error "  2. Remove or archive the signal file"
            log_error "  3. Create signal-human-ack.json"
            return 1
        fi
    fi

    log_success "System ready to resume"
}

# =============================================================================
# MAIN
# =============================================================================

main() {
    local level=""
    local agent=""
    local domain=""
    local wave=""
    local reason="Manual termination"
    local force="false"
    local no_backup="false"
    local timeout=30
    local dry_run="false"

    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            E1|E2|E3|E4|E5)
                level="$1"
                shift
                ;;
            --agent)
                agent="$2"
                shift 2
                ;;
            --domain)
                domain="$2"
                shift 2
                ;;
            --wave)
                wave="$2"
                shift 2
                ;;
            --reason)
                reason="$2"
                shift 2
                ;;
            --force)
                force="true"
                shift
                ;;
            --no-backup)
                no_backup="true"
                shift
                ;;
            --timeout)
                timeout="$2"
                shift 2
                ;;
            --dry-run)
                dry_run="true"
                shift
                ;;
            --resume)
                resume_after_termination "$2"
                exit $?
                ;;
            -h|--help)
                show_usage
                ;;
            *)
                log_error "Unknown option: $1"
                show_usage
                ;;
        esac
    done

    # Validate arguments
    if [ -z "${level}" ]; then
        log_error "Emergency level required (E1-E5)"
        show_usage
    fi

    # Execute appropriate termination
    case "${level}" in
        E1)
            if [ -z "${agent}" ]; then
                log_error "E1 requires --agent <name>"
                exit 1
            fi
            terminate_e1_agent "${agent}" "${reason}" "${force}" "${timeout}" "${no_backup}" "${dry_run}"
            ;;
        E2)
            if [ -z "${domain}" ]; then
                log_error "E2 requires --domain <name>"
                exit 1
            fi
            terminate_e2_domain "${domain}" "${reason}" "${force}" "${timeout}" "${no_backup}" "${dry_run}"
            ;;
        E3)
            if [ -z "${wave}" ]; then
                log_error "E3 requires --wave <number>"
                exit 1
            fi
            terminate_e3_wave "${wave}" "${reason}" "${force}" "${timeout}" "${no_backup}" "${dry_run}"
            ;;
        E4)
            terminate_e4_system "${reason}" "${force}" "${timeout}" "${no_backup}" "${dry_run}"
            ;;
        E5)
            terminate_e5_emergency "${reason}" "${dry_run}"
            ;;
    esac
}

main "$@"
