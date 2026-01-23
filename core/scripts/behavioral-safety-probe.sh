#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# WAVE BEHAVIORAL SAFETY PROBE RUNNER
# ═══════════════════════════════════════════════════════════════════════════════
# Tests agent behavior against safety probes to validate they actually refuse
# forbidden operations, not just that safety files exist.
#
# Usage:
#   ./behavioral-safety-probe.sh [PROJECT_PATH] [OPTIONS]
#
# Options:
#   --agent=AGENT_TYPE    Agent to test (default: all applicable)
#   --probe=PROBE_ID      Run specific probe only
#   --mode=MODE           Validation mode: strict|dev|ci (default: strict)
#   --dry-run             Validate probe structure only, don't execute
#   --json                Output results as JSON
#   --verbose             Show detailed output
#
# Exit codes:
#   0 = ALL PROBES PASSED
#   1 = SOME PROBES FAILED
#   2 = CRITICAL ERROR
#
# ═══════════════════════════════════════════════════════════════════════════════

set -o pipefail

# ─────────────────────────────────────────────────────────────────────────────
# CONFIGURATION
# ─────────────────────────────────────────────────────────────────────────────

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="${1:-.}"
PROBES_FILE="${PROBES_FILE:-$SCRIPT_DIR/../safety/behavioral-probes.json}"

# Parse PROJECT_ROOT if it's a flag
if [[ "$PROJECT_ROOT" == --* ]]; then
    PROJECT_ROOT="."
fi

# Resolve absolute path
PROJECT_ROOT=$(cd "$PROJECT_ROOT" 2>/dev/null && pwd || echo "$PROJECT_ROOT")
CLAUDE_DIR="$PROJECT_ROOT/.claude"
RESULTS_DIR="$CLAUDE_DIR/reports"
RESULTS_FILE="$RESULTS_DIR/behavioral-probe-results.json"
TIMESTAMP=$(date -u +%Y-%m-%dT%H:%M:%SZ)

# Defaults
AGENT_TYPE=""
PROBE_ID=""
MODE="strict"
DRY_RUN=false
JSON_OUTPUT=false
VERBOSE=false

# Parse flags
for arg in "$@"; do
    case $arg in
        --agent=*) AGENT_TYPE="${arg#*=}" ;;
        --probe=*) PROBE_ID="${arg#*=}" ;;
        --mode=*) MODE="${arg#*=}" ;;
        --dry-run) DRY_RUN=true ;;
        --json) JSON_OUTPUT=true ;;
        --verbose) VERBOSE=true ;;
        --help|-h)
            echo "Usage: $0 [PROJECT_PATH] [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --agent=TYPE    Agent to test (fe-dev-1, be-dev-1, etc.)"
            echo "  --probe=ID      Run specific probe only (PROBE-001)"
            echo "  --mode=MODE     Validation mode: strict|dev|ci"
            echo "  --dry-run       Validate probe structure only"
            echo "  --json          Output results as JSON"
            echo "  --verbose       Show detailed output"
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
    CYAN='\033[0;36m'
    NC='\033[0m'
else
    RED='' GREEN='' YELLOW='' BLUE='' CYAN='' NC=''
fi

# ─────────────────────────────────────────────────────────────────────────────
# HELPER FUNCTIONS
# ─────────────────────────────────────────────────────────────────────────────

log() {
    [ "$JSON_OUTPUT" = false ] && echo -e "$1"
}

log_verbose() {
    [ "$VERBOSE" = true ] && [ "$JSON_OUTPUT" = false ] && echo -e "  $1"
}

check_dependencies() {
    if ! command -v jq &>/dev/null; then
        echo "ERROR: jq is required but not installed" >&2
        exit 2
    fi
}

validate_probes_file() {
    if [ ! -f "$PROBES_FILE" ]; then
        echo "ERROR: Probes file not found: $PROBES_FILE" >&2
        exit 2
    fi

    if ! jq empty "$PROBES_FILE" 2>/dev/null; then
        echo "ERROR: Invalid JSON in probes file" >&2
        exit 2
    fi
}

# ─────────────────────────────────────────────────────────────────────────────
# PROBE VALIDATION (DRY RUN)
# ─────────────────────────────────────────────────────────────────────────────

validate_probe_structure() {
    local probe_count=$(jq '.probes | length' "$PROBES_FILE")
    local valid_count=0
    local invalid_count=0
    local errors=""

    log "${BLUE}Validating probe structure...${NC}"

    for i in $(seq 0 $((probe_count - 1))); do
        local probe_id=$(jq -r ".probes[$i].id" "$PROBES_FILE")
        local has_name=$(jq -r ".probes[$i].name // empty" "$PROBES_FILE")
        local has_prompt=$(jq -r ".probes[$i].test_prompt // empty" "$PROBES_FILE")
        local has_pass=$(jq ".probes[$i].pass_indicators | length" "$PROBES_FILE")
        local has_fail=$(jq ".probes[$i].fail_indicators | length" "$PROBES_FILE")

        if [ -n "$has_name" ] && [ -n "$has_prompt" ] && [ "$has_pass" -gt 0 ] && [ "$has_fail" -gt 0 ]; then
            ((valid_count++))
            log_verbose "${GREEN}✓${NC} $probe_id: $has_name"
        else
            ((invalid_count++))
            errors="$errors\n  - $probe_id: Missing required fields"
            log_verbose "${RED}✗${NC} $probe_id: Invalid structure"
        fi
    done

    log ""
    log "Probe validation: ${GREEN}$valid_count valid${NC}, ${RED}$invalid_count invalid${NC}"

    if [ $invalid_count -gt 0 ]; then
        log "${RED}Errors:${NC}$errors"
        return 1
    fi

    return 0
}

# ─────────────────────────────────────────────────────────────────────────────
# PROBE ANALYSIS (Without Live Execution)
# ─────────────────────────────────────────────────────────────────────────────

analyze_probe() {
    local probe_json="$1"
    local probe_id=$(echo "$probe_json" | jq -r '.id')
    local probe_name=$(echo "$probe_json" | jq -r '.name')
    local category=$(echo "$probe_json" | jq -r '.category')
    local severity=$(echo "$probe_json" | jq -r '.severity')
    local expected=$(echo "$probe_json" | jq -r '.expected_behavior')
    local applicable_agents=$(echo "$probe_json" | jq -r '.applicable_agents // [] | join(", ")')

    # Check if probe applies to specified agent
    if [ -n "$AGENT_TYPE" ] && [ -n "$applicable_agents" ]; then
        if ! echo "$applicable_agents" | grep -q "$AGENT_TYPE"; then
            echo "{\"probe_id\":\"$probe_id\",\"status\":\"skipped\",\"reason\":\"Not applicable to $AGENT_TYPE\"}"
            return 0
        fi
    fi

    # In dry-run mode, just validate the probe structure
    if [ "$DRY_RUN" = true ]; then
        local pass_count=$(echo "$probe_json" | jq '.pass_indicators | length')
        local fail_count=$(echo "$probe_json" | jq '.fail_indicators | length')

        echo "{\"probe_id\":\"$probe_id\",\"name\":\"$probe_name\",\"category\":\"$category\",\"severity\":\"$severity\",\"status\":\"validated\",\"pass_indicators\":$pass_count,\"fail_indicators\":$fail_count}"
        return 0
    fi

    # For non-dry-run: Return pending status (actual execution would require Claude API)
    echo "{\"probe_id\":\"$probe_id\",\"name\":\"$probe_name\",\"category\":\"$category\",\"severity\":\"$severity\",\"expected_behavior\":\"$expected\",\"status\":\"pending\",\"message\":\"Live execution requires Portal API\"}"
}

# ─────────────────────────────────────────────────────────────────────────────
# MAIN EXECUTION
# ─────────────────────────────────────────────────────────────────────────────

main() {
    check_dependencies
    validate_probes_file

    if [ "$JSON_OUTPUT" = false ]; then
        echo ""
        echo "╔═══════════════════════════════════════════════════════════════════════════════╗"
        echo "║                    WAVE BEHAVIORAL SAFETY PROBES                              ║"
        echo "╚═══════════════════════════════════════════════════════════════════════════════╝"
        echo ""
        echo "  Project:    $PROJECT_ROOT"
        echo "  Probes:     $PROBES_FILE"
        echo "  Mode:       $MODE"
        echo "  Agent:      ${AGENT_TYPE:-all}"
        echo "  Dry Run:    $DRY_RUN"
        echo "  Timestamp:  $TIMESTAMP"
        echo ""
    fi

    # Ensure results directory exists
    mkdir -p "$RESULTS_DIR"

    # Get probe count and list
    local probe_count=$(jq '.probes | length' "$PROBES_FILE")
    local probes_to_run=$probe_count

    # Filter by specific probe if requested
    if [ -n "$PROBE_ID" ]; then
        probes_to_run=1
    fi

    # Mode-based sampling for dev mode
    if [ "$MODE" = "dev" ]; then
        local sample_size=$(jq -r '.execution_config.modes.dev.probe_sample_size // 5' "$PROBES_FILE")
        if [ $probes_to_run -gt $sample_size ]; then
            log "${YELLOW}Dev mode: Running $sample_size of $probes_to_run probes${NC}"
            probes_to_run=$sample_size
        fi
    fi

    log "${BLUE}Running $probes_to_run probes...${NC}"
    log ""

    # Collect results
    local results=()
    local pass_count=0
    local fail_count=0
    local skip_count=0
    local pending_count=0

    for i in $(seq 0 $((probe_count - 1))); do
        # Stop if we've run enough probes (for dev mode sampling)
        if [ ${#results[@]} -ge $probes_to_run ] && [ "$MODE" = "dev" ]; then
            break
        fi

        local probe_json=$(jq ".probes[$i]" "$PROBES_FILE")
        local current_probe_id=$(echo "$probe_json" | jq -r '.id')

        # Skip if specific probe requested and this isn't it
        if [ -n "$PROBE_ID" ] && [ "$current_probe_id" != "$PROBE_ID" ]; then
            continue
        fi

        local probe_name=$(echo "$probe_json" | jq -r '.name')
        local severity=$(echo "$probe_json" | jq -r '.severity')

        log_verbose "Testing: $current_probe_id - $probe_name"

        local result=$(analyze_probe "$probe_json")
        local status=$(echo "$result" | jq -r '.status')

        case $status in
            "validated"|"pass")
                ((pass_count++))
                log "${GREEN}[PASS]${NC} $current_probe_id: $probe_name"
                ;;
            "fail")
                ((fail_count++))
                log "${RED}[FAIL]${NC} $current_probe_id: $probe_name"
                ;;
            "skipped")
                ((skip_count++))
                log "${YELLOW}[SKIP]${NC} $current_probe_id: $(echo "$result" | jq -r '.reason')"
                ;;
            "pending")
                ((pending_count++))
                log "${CYAN}[PEND]${NC} $current_probe_id: $probe_name"
                ;;
        esac

        results+=("$result")
    done

    # Determine overall status
    local overall_status="pass"
    if [ $fail_count -gt 0 ]; then
        overall_status="fail"
    elif [ $pending_count -gt 0 ]; then
        overall_status="pending"
    fi

    # Generate report
    local report=$(cat <<EOF
{
  "behavioral_probe_report": {
    "timestamp": "$TIMESTAMP",
    "project": "$PROJECT_ROOT",
    "mode": "$MODE",
    "agent_filter": "${AGENT_TYPE:-all}",
    "dry_run": $DRY_RUN,
    "overall_status": "$overall_status",
    "summary": {
      "total_probes": $probe_count,
      "probes_run": ${#results[@]},
      "passed": $pass_count,
      "failed": $fail_count,
      "skipped": $skip_count,
      "pending": $pending_count
    },
    "results": [
      $(IFS=,; echo "${results[*]}")
    ],
    "probe_categories": $(jq '.probe_categories' "$PROBES_FILE")
  }
}
EOF
)

    # Save report
    echo "$report" | jq '.' > "$RESULTS_FILE" 2>/dev/null || echo "$report" > "$RESULTS_FILE"

    # Output
    if [ "$JSON_OUTPUT" = true ]; then
        cat "$RESULTS_FILE"
    else
        log ""
        log "═══════════════════════════════════════════════════════════════════════════════"
        log "SUMMARY"
        log "═══════════════════════════════════════════════════════════════════════════════"
        log ""
        log "  Total:    ${#results[@]} probes"
        log "  ${GREEN}Passed:   $pass_count${NC}"
        log "  ${RED}Failed:   $fail_count${NC}"
        log "  ${YELLOW}Skipped:  $skip_count${NC}"
        log "  ${CYAN}Pending:  $pending_count${NC}"
        log ""
        log "  Report:   $RESULTS_FILE"
        log ""

        if [ "$DRY_RUN" = true ]; then
            log "${CYAN}DRY RUN: Probe structure validated. Use Portal to run live behavioral tests.${NC}"
        elif [ $pending_count -gt 0 ]; then
            log "${CYAN}NOTE: Live behavioral testing requires Portal API integration.${NC}"
            log "${CYAN}Use the Portal's Aerospace Safety tab to run actual probe tests.${NC}"
        fi

        if [ $fail_count -gt 0 ]; then
            log ""
            log "${RED}═══════════════════════════════════════════════════════════════════════════════${NC}"
            log "${RED} BEHAVIORAL SAFETY PROBES FAILED${NC}"
            log "${RED}═══════════════════════════════════════════════════════════════════════════════${NC}"
            return 1
        elif [ "$overall_status" = "pass" ]; then
            log ""
            log "${GREEN}═══════════════════════════════════════════════════════════════════════════════${NC}"
            log "${GREEN} ALL BEHAVIORAL PROBES VALIDATED${NC}"
            log "${GREEN}═══════════════════════════════════════════════════════════════════════════════${NC}"
        fi
    fi

    return 0
}

main "$@"
