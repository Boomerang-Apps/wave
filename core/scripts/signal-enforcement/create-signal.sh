#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# WAVE SIGNAL CREATION ENFORCEMENT SCRIPT - PROJECT-AGNOSTIC
# ═══════════════════════════════════════════════════════════════════════════════
# HARD ENFORCEMENT: Signals MUST be created through this script
#
# USAGE:
#   ./create-signal.sh --project /path/to/project --wave 4 --gate 3 --agent fe-dev --status COMPLETE
#   ./create-signal.sh -p /path/to/project -w 4 -g 3 -a fe-dev -s COMPLETE
#
# ═══════════════════════════════════════════════════════════════════════════════

set -e

# ─────────────────────────────────────────────────────────────────────────────
# ARGUMENT PARSING
# ─────────────────────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

show_usage() {
    echo "WAVE Signal Creation Enforcement"
    echo ""
    echo "Usage: $0 --project <path> --wave <N> --gate <N> --agent <name> --status <status>"
    echo ""
    echo "Required:"
    echo "  -p, --project <path>    Path to the project"
    echo "  -w, --wave <number>     Wave number"
    echo "  -g, --gate <number>     Gate number (0, 1, 3, 4, 4.5, 7)"
    echo "  -a, --agent <name>      Agent name (cto, pm, fe-dev, be-dev, qa, dev-fix, merge)"
    echo "  -s, --status <status>   Status (APPROVED, REJECTED, COMPLETE, PLANNED, FIXED)"
    echo ""
    echo "Optional:"
    echo "  -e, --extra <json>      Extra JSON to include in signal"
    echo "  -h, --help              Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 -p /path/to/project -w 4 -g 3 -a fe-dev -s COMPLETE"
    echo "  $0 --project /path/to/project --wave 1 --gate 4 --agent qa --status APPROVED"
}

PROJECT_ROOT=""
WAVE=""
GATE=""
AGENT=""
STATUS=""
EXTRA_JSON=""

while [[ $# -gt 0 ]]; do
    case $1 in
        -p|--project)
            PROJECT_ROOT="$2"
            shift 2
            ;;
        -w|--wave)
            WAVE="$2"
            shift 2
            ;;
        -g|--gate)
            GATE="$2"
            shift 2
            ;;
        -a|--agent)
            AGENT="$2"
            shift 2
            ;;
        -s|--status)
            STATUS="$2"
            shift 2
            ;;
        -e|--extra)
            EXTRA_JSON="$2"
            shift 2
            ;;
        -h|--help)
            show_usage
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
done

# Validate required arguments
if [[ -z "$PROJECT_ROOT" ]]; then
    echo "Error: --project is required"
    show_usage
    exit 1
fi

if [[ ! -d "$PROJECT_ROOT" ]]; then
    echo "Error: Project directory not found: $PROJECT_ROOT"
    exit 1
fi

if [[ -z "$WAVE" || -z "$GATE" || -z "$AGENT" || -z "$STATUS" ]]; then
    echo "Error: --wave, --gate, --agent, and --status are all required"
    show_usage
    exit 1
fi

# Convert to absolute path
PROJECT_ROOT="$(cd "$PROJECT_ROOT" && pwd)"
SIGNAL_DIR="${PROJECT_ROOT}/.claude"

# ─────────────────────────────────────────────────────────────────────────────
# COLORS
# ─────────────────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# ─────────────────────────────────────────────────────────────────────────────
# VALIDATION FUNCTIONS
# ─────────────────────────────────────────────────────────────────────────────
validate_wave() {
    if [[ ! "$WAVE" =~ ^[0-9]+$ ]]; then
        echo -e "${RED}ERROR: Invalid wave number: $WAVE${NC}"
        exit 1
    fi
}

validate_gate() {
    local valid_gates=("0" "1" "3" "4" "4.5" "7")
    local found=false
    for g in "${valid_gates[@]}"; do
        if [[ "$GATE" == "$g" ]]; then found=true; break; fi
    done
    if ! $found; then
        echo -e "${RED}ERROR: Invalid gate: $GATE${NC}"
        echo "Valid gates: ${valid_gates[*]}"
        echo -e "${YELLOW}NOTE: Gate 2 is FORBIDDEN - use Gate 3 for development complete signals${NC}"
        exit 1
    fi
}

validate_agent() {
    local valid_agents=("cto" "pm" "fe-dev" "be-dev" "qa" "dev-fix" "merge")
    local found=false
    for a in "${valid_agents[@]}"; do
        if [[ "$AGENT" == "$a" ]]; then found=true; break; fi
    done
    if ! $found; then
        echo -e "${RED}ERROR: Invalid agent: $AGENT${NC}"
        echo "Valid agents: ${valid_agents[*]}"
        exit 1
    fi
}

validate_status() {
    local valid_statuses=("APPROVED" "REJECTED" "COMPLETE" "PLANNED" "FIXED")
    local found=false
    for s in "${valid_statuses[@]}"; do
        if [[ "$STATUS" == "$s" ]]; then found=true; break; fi
    done
    if ! $found; then
        echo -e "${RED}ERROR: Invalid status: $STATUS${NC}"
        echo "Valid statuses: ${valid_statuses[*]}"
        exit 1
    fi
}

# ─────────────────────────────────────────────────────────────────────────────
# SIGNAL NAME GENERATION (ENFORCED NAMING)
# ─────────────────────────────────────────────────────────────────────────────
get_signal_filename() {
    local wave="$1" gate="$2" agent="$3" status="$4"
    case "$gate" in
        "0") echo "signal-wave${wave}-gate0-approved.json" ;;
        "1") echo "signal-wave${wave}-gate1-planned.json" ;;
        "3")
            if [[ "$agent" == "fe-dev" ]]; then
                echo "signal-wave${wave}-gate3-fe-complete.json"
            elif [[ "$agent" == "be-dev" ]]; then
                echo "signal-wave${wave}-gate3-be-complete.json"
            else
                echo -e "${RED}ERROR: Gate 3 signals can only be created by fe-dev or be-dev${NC}" >&2
                exit 1
            fi
            ;;
        "4")
            if [[ "$status" == "APPROVED" ]]; then
                echo "signal-wave${wave}-gate4-approved.json"
            elif [[ "$status" == "REJECTED" ]]; then
                echo "signal-wave${wave}-gate4-rejected.json"
            else
                echo -e "${RED}ERROR: Gate 4 status must be APPROVED or REJECTED${NC}" >&2
                exit 1
            fi
            ;;
        "4.5") echo "signal-wave${wave}-gate4.5-fixed.json" ;;
        "7") echo "signal-wave${wave}-gate7-merge-approved.json" ;;
        *) echo -e "${RED}ERROR: No signal defined for gate $gate${NC}" >&2; exit 1 ;;
    esac
}

# ─────────────────────────────────────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────────────────────────────────────
main() {
    echo -e "${YELLOW}[ENFORCE]${NC} Project: $PROJECT_ROOT"
    echo -e "${YELLOW}[ENFORCE]${NC} Validating signal parameters..."

    validate_wave
    validate_gate
    validate_agent
    validate_status

    echo -e "${GREEN}[ENFORCE]${NC} Parameters valid"

    local filename
    filename=$(get_signal_filename "$WAVE" "$GATE" "$AGENT" "$STATUS")
    local filepath="${SIGNAL_DIR}/${filename}"

    echo -e "${YELLOW}[ENFORCE]${NC} Signal filename: $filename"

    local timestamp
    timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

    # Build extra JSON if provided
    local extra=""
    if [[ -n "$EXTRA_JSON" ]]; then
        extra=",
    $EXTRA_JSON"
    fi

    local content
    content=$(cat <<EOF
{
    "wave": ${WAVE},
    "gate": "${GATE}",
    "agent": "${AGENT}",
    "status": "${STATUS}",
    "timestamp": "${timestamp}",
    "enforced": true,
    "schema_version": "1.0"${extra}
}
EOF
)

    mkdir -p "$SIGNAL_DIR"
    echo "$content" > "$filepath"

    if [[ -f "$filepath" ]]; then
        echo -e "${GREEN}[ENFORCE]${NC} Signal created successfully: $filepath"
        echo -e "${GREEN}[ENFORCE]${NC} Content:"
        cat "$filepath"
        exit 0
    else
        echo -e "${RED}[ENFORCE]${NC} FAILED to create signal file"
        exit 1
    fi
}

main "$@"
