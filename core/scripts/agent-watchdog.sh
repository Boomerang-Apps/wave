#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# WAVE AGENT WATCHDOG
# ═══════════════════════════════════════════════════════════════════════════════
# Monitors agent health through heartbeat signals and detects stuck agents.
# Creates heartbeat files and alerts when agents go silent.
#
# Usage:
#   ./agent-watchdog.sh [PROJECT_PATH] [OPTIONS]
#
# Options:
#   --agent=AGENT_TYPE    Monitor specific agent (default: all)
#   --timeout=SECONDS     Heartbeat timeout (default: 300 = 5 minutes)
#   --interval=SECONDS    Check interval (default: 30)
#   --daemon              Run as daemon (continuous monitoring)
#   --json                Output as JSON
#
# Exit codes:
#   0 = ALL AGENTS HEALTHY
#   1 = STUCK AGENT DETECTED
#   2 = ERROR
#
# ═══════════════════════════════════════════════════════════════════════════════

set -o pipefail

# ─────────────────────────────────────────────────────────────────────────────
# CONFIGURATION
# ─────────────────────────────────────────────────────────────────────────────

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="${1:-.}"

if [[ "$PROJECT_ROOT" == --* ]]; then
    PROJECT_ROOT="."
fi

PROJECT_ROOT=$(cd "$PROJECT_ROOT" 2>/dev/null && pwd || echo "$PROJECT_ROOT")
CLAUDE_DIR="$PROJECT_ROOT/.claude"
HEARTBEAT_DIR="$CLAUDE_DIR/heartbeats"
WATCHDOG_DIR="$CLAUDE_DIR/watchdog"
TIMESTAMP=$(date -u +%Y-%m-%dT%H:%M:%SZ)

# Defaults
AGENT_TYPE=""
HEARTBEAT_TIMEOUT=300  # 5 minutes
CHECK_INTERVAL=30
DAEMON_MODE=false
JSON_OUTPUT=false

# WAVE Agents
AGENTS=("cto" "pm" "fe-dev-1" "fe-dev-2" "be-dev-1" "be-dev-2" "qa" "dev-fix")

# Parse flags
for arg in "$@"; do
    case $arg in
        --agent=*) AGENT_TYPE="${arg#*=}" ;;
        --timeout=*) HEARTBEAT_TIMEOUT="${arg#*=}" ;;
        --interval=*) CHECK_INTERVAL="${arg#*=}" ;;
        --daemon) DAEMON_MODE=true ;;
        --json) JSON_OUTPUT=true ;;
        --help|-h)
            echo "Usage: $0 [PROJECT_PATH] [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --agent=TYPE      Monitor specific agent"
            echo "  --timeout=SEC     Heartbeat timeout (default: 300)"
            echo "  --interval=SEC    Check interval (default: 30)"
            echo "  --daemon          Run as daemon"
            echo "  --json            Output as JSON"
            exit 0
            ;;
    esac
done

# Colors
if [ "$JSON_OUTPUT" = false ]; then
    RED='\033[0;31m'
    GREEN='\033[0;32m'
    YELLOW='\033[1;33m'
    BLUE='\033[0;34m'
    NC='\033[0m'
else
    RED='' GREEN='' YELLOW='' BLUE='' NC=''
fi

# ─────────────────────────────────────────────────────────────────────────────
# HELPER FUNCTIONS
# ─────────────────────────────────────────────────────────────────────────────

log() {
    [ "$JSON_OUTPUT" = false ] && echo -e "[$(date '+%H:%M:%S')] $1"
}

# Write heartbeat signal for an agent
write_heartbeat() {
    local agent="$1"
    local status="${2:-active}"
    local task="${3:-}"
    local gate="${4:-}"

    mkdir -p "$HEARTBEAT_DIR"

    local heartbeat=$(cat <<EOF
{
  "agent": "$agent",
  "status": "$status",
  "current_task": "$task",
  "current_gate": $gate,
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "pid": $$,
  "project": "$PROJECT_ROOT"
}
EOF
)

    echo "$heartbeat" > "$HEARTBEAT_DIR/${agent}-heartbeat.json"
}

# Read agent's last heartbeat
get_last_heartbeat() {
    local agent="$1"
    local heartbeat_file="$HEARTBEAT_DIR/${agent}-heartbeat.json"

    if [ -f "$heartbeat_file" ]; then
        cat "$heartbeat_file"
    else
        echo "null"
    fi
}

# Calculate heartbeat age in seconds
get_heartbeat_age() {
    local agent="$1"
    local heartbeat_file="$HEARTBEAT_DIR/${agent}-heartbeat.json"

    if [ ! -f "$heartbeat_file" ]; then
        echo "-1"
        return
    fi

    # Get file modification time
    local file_mtime
    if [[ "$OSTYPE" == "darwin"* ]]; then
        file_mtime=$(stat -f %m "$heartbeat_file" 2>/dev/null || echo "0")
    else
        file_mtime=$(stat -c %Y "$heartbeat_file" 2>/dev/null || echo "0")
    fi

    local now=$(date +%s)
    local age=$((now - file_mtime))
    echo "$age"
}

# Check if agent is stuck
is_agent_stuck() {
    local agent="$1"
    local assignment_file="$CLAUDE_DIR/signal-${agent}-assignment.json"

    # If no assignment, agent is not stuck (just idle)
    if [ ! -f "$assignment_file" ]; then
        echo "false"
        return
    fi

    local heartbeat_age=$(get_heartbeat_age "$agent")

    # No heartbeat file and assigned = potentially stuck
    if [ "$heartbeat_age" = "-1" ]; then
        # Check if assignment is recent (within timeout)
        local assign_mtime
        if [[ "$OSTYPE" == "darwin"* ]]; then
            assign_mtime=$(stat -f %m "$assignment_file" 2>/dev/null || echo "0")
        else
            assign_mtime=$(stat -c %Y "$assignment_file" 2>/dev/null || echo "0")
        fi

        local now=$(date +%s)
        local assign_age=$((now - assign_mtime))

        if [ "$assign_age" -gt "$HEARTBEAT_TIMEOUT" ]; then
            echo "true"
        else
            echo "false"
        fi
        return
    fi

    # Heartbeat exists but is stale
    if [ "$heartbeat_age" -gt "$HEARTBEAT_TIMEOUT" ]; then
        echo "true"
    else
        echo "false"
    fi
}

# Get agent status
get_agent_status() {
    local agent="$1"
    local assignment_file="$CLAUDE_DIR/signal-${agent}-assignment.json"
    local stop_file="$CLAUDE_DIR/signal-${agent}-STOP.json"
    local heartbeat_age=$(get_heartbeat_age "$agent")

    # Check for stop signal
    if [ -f "$stop_file" ]; then
        echo "stopped"
        return
    fi

    # Check if assigned
    if [ ! -f "$assignment_file" ]; then
        echo "idle"
        return
    fi

    # Check if stuck
    if [ "$(is_agent_stuck "$agent")" = "true" ]; then
        echo "stuck"
        return
    fi

    # Check heartbeat health
    if [ "$heartbeat_age" = "-1" ]; then
        echo "starting"
    elif [ "$heartbeat_age" -lt 60 ]; then
        echo "active"
    elif [ "$heartbeat_age" -lt "$HEARTBEAT_TIMEOUT" ]; then
        echo "slow"
    else
        echo "unresponsive"
    fi
}

# ─────────────────────────────────────────────────────────────────────────────
# WATCHDOG CHECK
# ─────────────────────────────────────────────────────────────────────────────

check_agent() {
    local agent="$1"
    local status=$(get_agent_status "$agent")
    local heartbeat_age=$(get_heartbeat_age "$agent")
    local is_stuck=$(is_agent_stuck "$agent")
    local last_heartbeat=$(get_last_heartbeat "$agent")

    local alert=false
    local alert_level="info"

    if [ "$is_stuck" = "true" ]; then
        alert=true
        alert_level="critical"
        log "${RED}[STUCK]${NC} $agent - No activity for ${heartbeat_age}s (timeout: ${HEARTBEAT_TIMEOUT}s)"
    elif [ "$status" = "slow" ]; then
        alert=true
        alert_level="warn"
        log "${YELLOW}[SLOW]${NC} $agent - Last heartbeat ${heartbeat_age}s ago"
    elif [ "$status" = "unresponsive" ]; then
        alert=true
        alert_level="warn"
        log "${YELLOW}[UNRESPONSIVE]${NC} $agent - Last heartbeat ${heartbeat_age}s ago"
    elif [ "$status" = "active" ]; then
        log "${GREEN}[HEALTHY]${NC} $agent - Last heartbeat ${heartbeat_age}s ago"
    elif [ "$status" = "idle" ]; then
        log "${BLUE}[IDLE]${NC} $agent"
    else
        log "${BLUE}[$status]${NC} $agent"
    fi

    echo "{\"agent\":\"$agent\",\"status\":\"$status\",\"heartbeat_age_seconds\":$heartbeat_age,\"is_stuck\":$is_stuck,\"alert\":$alert,\"alert_level\":\"$alert_level\",\"timeout\":$HEARTBEAT_TIMEOUT}"
}

# ─────────────────────────────────────────────────────────────────────────────
# WATCHDOG REPORT
# ─────────────────────────────────────────────────────────────────────────────

generate_watchdog_report() {
    mkdir -p "$WATCHDOG_DIR"

    local results=()
    local stuck_count=0
    local healthy_count=0
    local slow_count=0
    local idle_count=0

    for agent in "${AGENTS[@]}"; do
        local result=$(check_agent "$agent")
        results+=("$result")

        local status=$(echo "$result" | jq -r '.status')
        case "$status" in
            "active"|"starting") ((healthy_count++)) ;;
            "stuck") ((stuck_count++)) ;;
            "slow"|"unresponsive") ((slow_count++)) ;;
            "idle"|"stopped") ((idle_count++)) ;;
        esac
    done

    local overall_status="healthy"
    [ $stuck_count -gt 0 ] && overall_status="critical"
    [ $slow_count -gt 0 ] && [ "$overall_status" = "healthy" ] && overall_status="warning"

    local report=$(cat <<EOF
{
  "watchdog_report": {
    "timestamp": "$TIMESTAMP",
    "project": "$PROJECT_ROOT",
    "heartbeat_timeout_seconds": $HEARTBEAT_TIMEOUT,
    "overall_status": "$overall_status",
    "summary": {
      "total_agents": ${#AGENTS[@]},
      "healthy": $healthy_count,
      "stuck": $stuck_count,
      "slow": $slow_count,
      "idle": $idle_count
    },
    "agents": [
      $(IFS=,; echo "${results[*]}")
    ]
  }
}
EOF
)

    echo "$report" | jq '.' > "$WATCHDOG_DIR/watchdog-report.json" 2>/dev/null

    if [ "$JSON_OUTPUT" = true ]; then
        echo "$report" | jq '.'
    fi

    return $stuck_count
}

# ─────────────────────────────────────────────────────────────────────────────
# MAIN EXECUTION
# ─────────────────────────────────────────────────────────────────────────────

main() {
    mkdir -p "$HEARTBEAT_DIR" "$WATCHDOG_DIR"

    if [ "$JSON_OUTPUT" = false ]; then
        echo ""
        echo "╔═══════════════════════════════════════════════════════════════════════════════╗"
        echo "║                          WAVE AGENT WATCHDOG                                  ║"
        echo "╚═══════════════════════════════════════════════════════════════════════════════╝"
        echo ""
        echo "  Project:    $PROJECT_ROOT"
        echo "  Timeout:    ${HEARTBEAT_TIMEOUT}s"
        echo "  Interval:   ${CHECK_INTERVAL}s"
        echo "  Timestamp:  $TIMESTAMP"
        echo ""
    fi

    if [ -n "$AGENT_TYPE" ]; then
        AGENTS=("$AGENT_TYPE")
    fi

    if [ "$DAEMON_MODE" = true ]; then
        log "${BLUE}Running in daemon mode...${NC}"
        while true; do
            generate_watchdog_report
            sleep "$CHECK_INTERVAL"
        done
    else
        generate_watchdog_report
        local stuck_count=$?

        if [ "$JSON_OUTPUT" = false ]; then
            echo ""
            if [ $stuck_count -gt 0 ]; then
                log "${RED}═══════════════════════════════════════════════════════════════════════════════${NC}"
                log "${RED} $stuck_count STUCK AGENT(S) DETECTED - Investigation required${NC}"
                log "${RED}═══════════════════════════════════════════════════════════════════════════════${NC}"
                exit 1
            else
                log "${GREEN}═══════════════════════════════════════════════════════════════════════════════${NC}"
                log "${GREEN} ALL AGENTS HEALTHY${NC}"
                log "${GREEN}═══════════════════════════════════════════════════════════════════════════════${NC}"
            fi
        fi

        exit $stuck_count
    fi
}

main "$@"
