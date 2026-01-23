#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# WAVE AGENT DRIFT DETECTOR
# ═══════════════════════════════════════════════════════════════════════════════
# Compares current agent state against baselines to detect behavioral drift.
# Drift can indicate:
#   - Memory pollution from accumulated decisions
#   - Model upgrade changes
#   - Configuration drift
#   - Safety regression
#
# Usage:
#   ./drift-detector.sh [PROJECT_PATH] [OPTIONS]
#
# Options:
#   --agent=AGENT_TYPE    Check specific agent (default: all)
#   --threshold=N         Drift score threshold (default: 0.3)
#   --json                Output as JSON
#
# Exit codes:
#   0 = NO DRIFT DETECTED
#   1 = DRIFT DETECTED
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
BASELINES_DIR="$CLAUDE_DIR/agent-baselines"
MEMORY_DIR="$CLAUDE_DIR/agent-memory"
REPORTS_DIR="$CLAUDE_DIR/reports"
TIMESTAMP=$(date -u +%Y-%m-%dT%H:%M:%SZ)

# Defaults
AGENT_TYPE=""
DRIFT_THRESHOLD=0.3
JSON_OUTPUT=false

# Parse flags
for arg in "$@"; do
    case $arg in
        --agent=*) AGENT_TYPE="${arg#*=}" ;;
        --threshold=*) DRIFT_THRESHOLD="${arg#*=}" ;;
        --json) JSON_OUTPUT=true ;;
        --help|-h)
            echo "Usage: $0 [PROJECT_PATH] [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --agent=TYPE      Check specific agent"
            echo "  --threshold=N     Drift threshold (default: 0.3)"
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
    [ "$JSON_OUTPUT" = false ] && echo -e "$1"
}

check_dependencies() {
    if ! command -v jq &>/dev/null; then
        echo "ERROR: jq is required" >&2
        exit 2
    fi
}

# Calculate memory drift
calculate_memory_drift() {
    local agent="$1"
    local baseline_file="$BASELINES_DIR/${agent}-baseline.json"
    local memory_file="$MEMORY_DIR/${agent}-memory.json"

    local baseline_size=0
    local baseline_decisions=0
    local current_size=0
    local current_decisions=0

    if [ -f "$baseline_file" ]; then
        baseline_size=$(jq -r '.memory_snapshot.size_kb // 0' "$baseline_file")
        baseline_decisions=$(jq -r '.memory_snapshot.total_decisions // 0' "$baseline_file")
    fi

    if [ -f "$memory_file" ]; then
        current_size=$(du -k "$memory_file" 2>/dev/null | cut -f1 || echo "0")
        current_decisions=$(jq 'if type == "array" then length else (if .decisions then .decisions | length else 0 end) end' "$memory_file" 2>/dev/null || echo "0")
    fi

    # Calculate growth rates
    local size_growth=0
    local decision_growth=0

    if [ "$baseline_size" -gt 0 ]; then
        size_growth=$(echo "scale=2; ($current_size - $baseline_size) / $baseline_size" | bc 2>/dev/null || echo "0")
    fi

    if [ "$baseline_decisions" -gt 0 ]; then
        decision_growth=$(echo "scale=2; ($current_decisions - $baseline_decisions) / $baseline_decisions" | bc 2>/dev/null || echo "0")
    fi

    echo "{\"baseline_size_kb\":$baseline_size,\"current_size_kb\":$current_size,\"size_growth_rate\":$size_growth,\"baseline_decisions\":$baseline_decisions,\"current_decisions\":$current_decisions,\"decision_growth_rate\":$decision_growth}"
}

# Check memory TTL
check_memory_ttl() {
    local agent="$1"
    local memory_file="$MEMORY_DIR/${agent}-memory.json"
    local ttl_days=7

    if [ -f "$BASELINES_DIR/${agent}-baseline.json" ]; then
        ttl_days=$(jq -r '.drift_config.memory_ttl_days // 7' "$BASELINES_DIR/${agent}-baseline.json")
    fi

    if [ -f "$memory_file" ]; then
        # Check if file is older than TTL
        local file_age_days=$(( ($(date +%s) - $(stat -f %m "$memory_file" 2>/dev/null || stat -c %Y "$memory_file" 2>/dev/null || echo "0")) / 86400 ))

        if [ "$file_age_days" -gt "$ttl_days" ]; then
            echo "{\"exceeded\":true,\"age_days\":$file_age_days,\"ttl_days\":$ttl_days}"
            return
        fi
    fi

    echo "{\"exceeded\":false,\"age_days\":0,\"ttl_days\":$ttl_days}"
}

# Calculate overall drift score
calculate_drift_score() {
    local agent="$1"
    local baseline_file="$BASELINES_DIR/${agent}-baseline.json"

    if [ ! -f "$baseline_file" ]; then
        echo "null"
        return
    fi

    local memory_drift=$(calculate_memory_drift "$agent")
    local ttl_status=$(check_memory_ttl "$agent")

    # Drift factors (weighted)
    local size_growth=$(echo "$memory_drift" | jq -r '.size_growth_rate // 0')
    local decision_growth=$(echo "$memory_drift" | jq -r '.decision_growth_rate // 0')
    local ttl_exceeded=$(echo "$ttl_status" | jq -r '.exceeded')

    # Simple drift score calculation
    # Weight: size_growth (0.3) + decision_growth (0.3) + ttl_exceeded (0.4)
    local drift_score=0

    # Normalize growth rates to 0-1 scale (cap at 100% growth = 1.0)
    local size_factor=$(echo "scale=2; if ($size_growth > 1) 1 else if ($size_growth < 0) 0 else $size_growth fi" | bc 2>/dev/null || echo "0")
    local decision_factor=$(echo "scale=2; if ($decision_growth > 1) 1 else if ($decision_growth < 0) 0 else $decision_growth fi" | bc 2>/dev/null || echo "0")
    local ttl_factor=0
    [ "$ttl_exceeded" = "true" ] && ttl_factor=1

    drift_score=$(echo "scale=3; ($size_factor * 0.3) + ($decision_factor * 0.3) + ($ttl_factor * 0.4)" | bc 2>/dev/null || echo "0")

    echo "$drift_score"
}

# ─────────────────────────────────────────────────────────────────────────────
# DRIFT ANALYSIS
# ─────────────────────────────────────────────────────────────────────────────

analyze_agent() {
    local agent="$1"
    local baseline_file="$BASELINES_DIR/${agent}-baseline.json"

    if [ ! -f "$baseline_file" ]; then
        log "${YELLOW}[SKIP]${NC} No baseline for $agent"
        echo "{\"agent\":\"$agent\",\"status\":\"no_baseline\",\"drift_score\":null}"
        return
    fi

    local drift_score=$(calculate_drift_score "$agent")
    local memory_drift=$(calculate_memory_drift "$agent")
    local ttl_status=$(check_memory_ttl "$agent")
    local baseline_date=$(jq -r '.created_at' "$baseline_file")

    # Determine status
    local status="healthy"
    local alert=false

    if [ "$drift_score" != "null" ]; then
        local is_drifted=$(echo "$drift_score > $DRIFT_THRESHOLD" | bc 2>/dev/null || echo "0")
        if [ "$is_drifted" = "1" ]; then
            status="drifted"
            alert=true
        fi
    fi

    # Check TTL separately
    if [ "$(echo "$ttl_status" | jq -r '.exceeded')" = "true" ]; then
        status="stale"
        alert=true
    fi

    if [ "$status" = "healthy" ]; then
        log "${GREEN}[OK]${NC} $agent - drift score: $drift_score"
    elif [ "$status" = "stale" ]; then
        log "${YELLOW}[STALE]${NC} $agent - memory exceeded TTL"
    else
        log "${RED}[DRIFT]${NC} $agent - drift score: $drift_score (threshold: $DRIFT_THRESHOLD)"
    fi

    echo "{\"agent\":\"$agent\",\"status\":\"$status\",\"drift_score\":$drift_score,\"threshold\":$DRIFT_THRESHOLD,\"alert\":$alert,\"baseline_date\":\"$baseline_date\",\"memory_drift\":$memory_drift,\"ttl_status\":$ttl_status}"
}

# ─────────────────────────────────────────────────────────────────────────────
# MAIN EXECUTION
# ─────────────────────────────────────────────────────────────────────────────

main() {
    check_dependencies

    mkdir -p "$REPORTS_DIR"

    if [ "$JSON_OUTPUT" = false ]; then
        echo ""
        echo "╔═══════════════════════════════════════════════════════════════════════════════╗"
        echo "║                       WAVE AGENT DRIFT DETECTOR                               ║"
        echo "╚═══════════════════════════════════════════════════════════════════════════════╝"
        echo ""
        echo "  Project:    $PROJECT_ROOT"
        echo "  Threshold:  $DRIFT_THRESHOLD"
        echo "  Timestamp:  $TIMESTAMP"
        echo ""
    fi

    # Get list of agents with baselines
    local agents=()
    if [ -n "$AGENT_TYPE" ]; then
        agents=("$AGENT_TYPE")
    else
        for f in "$BASELINES_DIR"/*-baseline.json; do
            if [ -f "$f" ]; then
                local agent=$(basename "$f" | sed 's/-baseline.json//')
                agents+=("$agent")
            fi
        done
    fi

    if [ ${#agents[@]} -eq 0 ]; then
        log "${YELLOW}No baselines found. Run generate-agent-baseline.sh first.${NC}"
        [ "$JSON_OUTPUT" = true ] && echo '{"error":"no_baselines","message":"No agent baselines found"}'
        exit 0
    fi

    local results=()
    local drifted_count=0
    local healthy_count=0
    local stale_count=0
    local no_baseline_count=0

    for agent in "${agents[@]}"; do
        local result=$(analyze_agent "$agent")
        results+=("$result")

        local status=$(echo "$result" | jq -r '.status')
        case "$status" in
            "healthy") ((healthy_count++)) ;;
            "drifted") ((drifted_count++)) ;;
            "stale") ((stale_count++)) ;;
            "no_baseline") ((no_baseline_count++)) ;;
        esac
    done

    # Generate report
    local overall_status="healthy"
    [ $drifted_count -gt 0 ] && overall_status="drifted"
    [ $stale_count -gt 0 ] && [ "$overall_status" = "healthy" ] && overall_status="stale"

    local report=$(cat <<EOF
{
  "drift_report": {
    "timestamp": "$TIMESTAMP",
    "project": "$PROJECT_ROOT",
    "threshold": $DRIFT_THRESHOLD,
    "overall_status": "$overall_status",
    "summary": {
      "total_agents": ${#agents[@]},
      "healthy": $healthy_count,
      "drifted": $drifted_count,
      "stale": $stale_count,
      "no_baseline": $no_baseline_count
    },
    "agents": [
      $(IFS=,; echo "${results[*]}")
    ]
  }
}
EOF
)

    # Save report
    echo "$report" | jq '.' > "$REPORTS_DIR/drift-report.json" 2>/dev/null

    if [ "$JSON_OUTPUT" = true ]; then
        echo "$report" | jq '.'
    else
        echo ""
        log "═══════════════════════════════════════════════════════════════════════════════"
        log "SUMMARY"
        log "═══════════════════════════════════════════════════════════════════════════════"
        echo ""
        log "  ${GREEN}Healthy:${NC}     $healthy_count"
        log "  ${RED}Drifted:${NC}     $drifted_count"
        log "  ${YELLOW}Stale:${NC}       $stale_count"
        log "  No Baseline: $no_baseline_count"
        echo ""
        log "  Report:      $REPORTS_DIR/drift-report.json"
        echo ""

        if [ $drifted_count -gt 0 ]; then
            log "${RED}═══════════════════════════════════════════════════════════════════════════════${NC}"
            log "${RED} DRIFT DETECTED - Consider regenerating baselines or investigating changes${NC}"
            log "${RED}═══════════════════════════════════════════════════════════════════════════════${NC}"
            exit 1
        else
            log "${GREEN}═══════════════════════════════════════════════════════════════════════════════${NC}"
            log "${GREEN} NO SIGNIFICANT DRIFT DETECTED${NC}"
            log "${GREEN}═══════════════════════════════════════════════════════════════════════════════${NC}"
        fi
    fi
}

main "$@"
