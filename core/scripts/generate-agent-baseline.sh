#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# WAVE AGENT BASELINE GENERATOR
# ═══════════════════════════════════════════════════════════════════════════════
# Generates behavioral baselines for agents to detect drift over time.
# Baselines capture expected responses to safety probes, memory stats, and
# behavioral fingerprints.
#
# Usage:
#   ./generate-agent-baseline.sh [PROJECT_PATH] [OPTIONS]
#
# Options:
#   --agent=AGENT_TYPE    Generate baseline for specific agent (default: all)
#   --force               Overwrite existing baselines
#   --json                Output as JSON
#
# Exit codes:
#   0 = SUCCESS
#   1 = ERROR
#
# ═══════════════════════════════════════════════════════════════════════════════

set -o pipefail

# ─────────────────────────────────────────────────────────────────────────────
# CONFIGURATION
# ─────────────────────────────────────────────────────────────────────────────

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="${1:-.}"

# Parse PROJECT_ROOT if it's a flag
if [[ "$PROJECT_ROOT" == --* ]]; then
    PROJECT_ROOT="."
fi

PROJECT_ROOT=$(cd "$PROJECT_ROOT" 2>/dev/null && pwd || echo "$PROJECT_ROOT")
CLAUDE_DIR="$PROJECT_ROOT/.claude"
BASELINES_DIR="$CLAUDE_DIR/agent-baselines"
MEMORY_DIR="$CLAUDE_DIR/agent-memory"
PROBES_FILE="$SCRIPT_DIR/../safety/behavioral-probes.json"
TIMESTAMP=$(date -u +%Y-%m-%dT%H:%M:%SZ)

# Defaults
AGENT_TYPE=""
FORCE=false
JSON_OUTPUT=false

# WAVE Agents
AGENTS=("cto" "pm" "fe-dev-1" "fe-dev-2" "be-dev-1" "be-dev-2" "qa" "dev-fix")

# Parse flags
for arg in "$@"; do
    case $arg in
        --agent=*) AGENT_TYPE="${arg#*=}" ;;
        --force) FORCE=true ;;
        --json) JSON_OUTPUT=true ;;
        --help|-h)
            echo "Usage: $0 [PROJECT_PATH] [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --agent=TYPE    Generate for specific agent (cto, pm, fe-dev-1, etc.)"
            echo "  --force         Overwrite existing baselines"
            echo "  --json          Output as JSON"
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
    [ "$JSON_OUTPUT" = false ] && echo -e "$1"
}

check_dependencies() {
    if ! command -v jq &>/dev/null; then
        echo "ERROR: jq is required but not installed" >&2
        exit 1
    fi
}

# Get agent model from agent definition files
get_agent_model() {
    local agent="$1"
    local agent_file="$PROJECT_ROOT/.claudecode/agents/${agent}-agent.md"

    if [ -f "$agent_file" ]; then
        # Try to extract model from agent definition
        local model=$(grep -i "model:" "$agent_file" 2>/dev/null | head -1 | sed 's/.*model:\s*//' | tr -d '[:space:]')
        if [ -n "$model" ]; then
            echo "$model"
            return
        fi
    fi

    # Default models based on agent type
    case "$agent" in
        cto|pm) echo "claude-opus-4-5-20251101" ;;
        qa) echo "claude-3-5-haiku-20241022" ;;
        *) echo "claude-sonnet-4-20250514" ;;
    esac
}

# Get memory stats for an agent
get_memory_stats() {
    local agent="$1"
    local memory_file="$MEMORY_DIR/${agent}-memory.json"

    if [ -f "$memory_file" ]; then
        local size_kb=$(du -k "$memory_file" 2>/dev/null | cut -f1 || echo "0")
        local mtime=$(stat -f "%Sm" -t "%Y-%m-%dT%H:%M:%SZ" "$memory_file" 2>/dev/null || stat -c "%y" "$memory_file" 2>/dev/null | cut -d'.' -f1 | tr ' ' 'T')
        local decisions=$(jq 'if type == "array" then length else (if .decisions then .decisions | length else 0 end) end' "$memory_file" 2>/dev/null || echo "0")

        echo "{\"exists\":true,\"size_kb\":$size_kb,\"total_decisions\":$decisions,\"last_modified\":\"$mtime\"}"
    else
        echo "{\"exists\":false,\"size_kb\":0,\"total_decisions\":0,\"last_modified\":null}"
    fi
}

# Get applicable probes for an agent
get_applicable_probes() {
    local agent="$1"

    if [ ! -f "$PROBES_FILE" ]; then
        echo "[]"
        return
    fi

    # Get probes that either have no applicable_agents restriction or include this agent
    jq --arg agent "$agent" '[.probes[] | select(
        (.applicable_agents == null) or
        (.applicable_agents | length == 0) or
        (.applicable_agents | index($agent) != null)
    ) | {id: .id, name: .name, category: .category, severity: .severity, expected_behavior: .expected_behavior}]' "$PROBES_FILE" 2>/dev/null || echo "[]"
}

# Calculate a simple hash of expected behaviors (for drift detection)
get_behavioral_fingerprint() {
    local agent="$1"
    local probes=$(get_applicable_probes "$agent")

    # Create fingerprint from expected behaviors
    local probe_count=$(echo "$probes" | jq 'length')
    local refuse_count=$(echo "$probes" | jq '[.[] | select(.expected_behavior == "refuse")] | length')
    local ignore_count=$(echo "$probes" | jq '[.[] | select(.expected_behavior == "ignore")] | length')

    echo "{\"total_applicable_probes\":$probe_count,\"expected_refuse\":$refuse_count,\"expected_ignore\":$ignore_count,\"safety_refusal_rate\":1.0,\"domain_compliance_rate\":1.0}"
}

# ─────────────────────────────────────────────────────────────────────────────
# BASELINE GENERATION
# ─────────────────────────────────────────────────────────────────────────────

generate_baseline() {
    local agent="$1"
    local baseline_file="$BASELINES_DIR/${agent}-baseline.json"

    # Check if baseline exists
    if [ -f "$baseline_file" ] && [ "$FORCE" = false ]; then
        log "${YELLOW}[SKIP]${NC} Baseline exists for $agent (use --force to overwrite)"
        return 0
    fi

    log "${BLUE}[GEN]${NC} Generating baseline for $agent..."

    # Get agent details
    local model=$(get_agent_model "$agent")
    local memory_stats=$(get_memory_stats "$agent")
    local behavioral_fingerprint=$(get_behavioral_fingerprint "$agent")
    local applicable_probes=$(get_applicable_probes "$agent")

    # Create baseline
    local baseline=$(cat <<EOF
{
  "agent": "$agent",
  "version": "1.0.0",
  "created_at": "$TIMESTAMP",
  "model": "$model",
  "behavioral_fingerprint": $behavioral_fingerprint,
  "memory_snapshot": $memory_stats,
  "applicable_probes": $applicable_probes,
  "probe_baselines": [],
  "drift_config": {
    "check_interval_hours": 24,
    "max_drift_score": 0.3,
    "memory_ttl_days": 7,
    "alert_on_drift": true
  },
  "metadata": {
    "generator_version": "1.0.0",
    "project_path": "$PROJECT_ROOT",
    "probes_file": "$PROBES_FILE"
  }
}
EOF
)

    # Save baseline
    echo "$baseline" | jq '.' > "$baseline_file"
    log "${GREEN}[DONE]${NC} Baseline saved: $baseline_file"
}

# ─────────────────────────────────────────────────────────────────────────────
# MAIN EXECUTION
# ─────────────────────────────────────────────────────────────────────────────

main() {
    check_dependencies

    # Create baselines directory
    mkdir -p "$BASELINES_DIR"

    if [ "$JSON_OUTPUT" = false ]; then
        echo ""
        echo "╔═══════════════════════════════════════════════════════════════════════════════╗"
        echo "║                    WAVE AGENT BASELINE GENERATOR                              ║"
        echo "╚═══════════════════════════════════════════════════════════════════════════════╝"
        echo ""
        echo "  Project:    $PROJECT_ROOT"
        echo "  Output:     $BASELINES_DIR"
        echo "  Timestamp:  $TIMESTAMP"
        echo ""
    fi

    local generated=0
    local skipped=0
    local results=()

    # Generate for specific agent or all
    if [ -n "$AGENT_TYPE" ]; then
        AGENTS=("$AGENT_TYPE")
    fi

    for agent in "${AGENTS[@]}"; do
        generate_baseline "$agent"
        if [ -f "$BASELINES_DIR/${agent}-baseline.json" ]; then
            ((generated++))
            results+=("{\"agent\":\"$agent\",\"status\":\"generated\",\"file\":\"$BASELINES_DIR/${agent}-baseline.json\"}")
        else
            ((skipped++))
            results+=("{\"agent\":\"$agent\",\"status\":\"skipped\"}")
        fi
    done

    if [ "$JSON_OUTPUT" = true ]; then
        echo "{\"timestamp\":\"$TIMESTAMP\",\"baselines_generated\":$generated,\"skipped\":$skipped,\"results\":[$(IFS=,; echo "${results[*]}")]}" | jq '.'
    else
        echo ""
        log "═══════════════════════════════════════════════════════════════════════════════"
        log "SUMMARY"
        log "═══════════════════════════════════════════════════════════════════════════════"
        log ""
        log "  Generated: ${GREEN}$generated${NC} baselines"
        log "  Skipped:   ${YELLOW}$skipped${NC}"
        log "  Location:  $BASELINES_DIR"
        log ""
        log "${GREEN}Baselines can be used for drift detection.${NC}"
        log "Run ${BLUE}drift-detector.sh${NC} to compare current behavior to baselines."
    fi
}

main "$@"
