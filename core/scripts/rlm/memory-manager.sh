#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# WAVE RLM: AGENT MEMORY MANAGER
# ═══════════════════════════════════════════════════════════════════════════════
# Manages persistent memory for WAVE agents across context resets.
# Decisions, constraints, and patterns survive between sessions.
#
# USAGE:
#   # Save a decision
#   ./memory-manager.sh --project /path --agent fe-dev --wave $N \
#       --action save --decision "Use React Query" --reason "Better caching"
#
#   # Add a constraint
#   ./memory-manager.sh --project /path --agent fe-dev --wave $N \
#       --action add-constraint --constraint "No inline styles"
#
#   # Load memory
#   ./memory-manager.sh --project /path --agent fe-dev --wave $N --action load
#
#   # Show summary
#   ./memory-manager.sh --project /path --agent fe-dev --wave $N --action summary
#
# BASED ON: MIT CSAIL RLM Research (arXiv:2512.24601)
# ═══════════════════════════════════════════════════════════════════════════════

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ─────────────────────────────────────────────────────────────────────────────
# ARGUMENT PARSING
# ─────────────────────────────────────────────────────────────────────────────
show_usage() {
    echo "WAVE RLM: Agent Memory Manager"
    echo ""
    echo "Usage: $0 --project <path> --agent <name> --wave <N> --action <action> [options]"
    echo ""
    echo "Required:"
    echo "  -p, --project <path>     Path to WAVE project"
    echo "  -a, --agent <name>       Agent name (fe-dev, be-dev, qa, dev-fix, etc.)"
    echo "  -w, --wave <number>      Wave number"
    echo "  --action <action>        Action to perform"
    echo ""
    echo "Actions:"
    echo "  save                     Save a decision (requires --decision, --reason)"
    echo "  add-constraint           Add a constraint (requires --constraint)"
    echo "  add-pattern              Add a code pattern (requires --pattern, --file)"
    echo "  load                     Load and display memory"
    echo "  summary                  Show memory summary"
    echo "  clear                    Clear memory for this wave"
    echo "  export                   Export memory as JSON"
    echo ""
    echo "Options for 'save':"
    echo "  -d, --decision <text>    The decision made"
    echo "  -r, --reason <text>      Reason for the decision"
    echo ""
    echo "Options for 'add-constraint':"
    echo "  -c, --constraint <text>  Constraint to add"
    echo ""
    echo "Options for 'add-pattern':"
    echo "  --pattern <name>         Pattern name"
    echo "  --file <path>            File where pattern is used"
    echo ""
    echo "Examples:"
    echo "  $0 -p /path/to/project -a fe-dev -w 3 --action save \\"
    echo "      -d \"Use React Query for data fetching\" -r \"Better caching\""
    echo ""
    echo "  $0 -p /path/to/project -a fe-dev -w 3 --action add-constraint \\"
    echo "      -c \"No inline styles - use Tailwind\""
    echo ""
    echo "  $0 -p /path/to/project -a fe-dev -w 3 --action summary"
}

PROJECT_ROOT=""
AGENT=""
WAVE=""
ACTION=""
DECISION=""
REASON=""
CONSTRAINT=""
PATTERN_NAME=""
PATTERN_FILE=""

while [[ $# -gt 0 ]]; do
    case $1 in
        -p|--project)
            PROJECT_ROOT="$2"
            shift 2
            ;;
        -a|--agent)
            AGENT="$2"
            shift 2
            ;;
        -w|--wave)
            WAVE="$2"
            shift 2
            ;;
        --action)
            ACTION="$2"
            shift 2
            ;;
        -d|--decision)
            DECISION="$2"
            shift 2
            ;;
        -r|--reason)
            REASON="$2"
            shift 2
            ;;
        -c|--constraint)
            CONSTRAINT="$2"
            shift 2
            ;;
        --pattern)
            PATTERN_NAME="$2"
            shift 2
            ;;
        --file)
            PATTERN_FILE="$2"
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

if [[ -z "$AGENT" ]]; then
    echo "Error: --agent is required"
    show_usage
    exit 1
fi

if [[ -z "$WAVE" ]]; then
    echo "Error: --wave is required"
    show_usage
    exit 1
fi

if [[ -z "$ACTION" ]]; then
    echo "Error: --action is required"
    show_usage
    exit 1
fi

# Convert to absolute path
PROJECT_ROOT="$(cd "$PROJECT_ROOT" && pwd)"
MEMORY_DIR="${PROJECT_ROOT}/.claude/agent-memory"
MEMORY_FILE="${MEMORY_DIR}/${AGENT}-wave${WAVE}.json"

# ─────────────────────────────────────────────────────────────────────────────
# COLORS
# ─────────────────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# ─────────────────────────────────────────────────────────────────────────────
# HELPER FUNCTIONS
# ─────────────────────────────────────────────────────────────────────────────

# Ensure memory directory exists
ensure_memory_dir() {
    mkdir -p "$MEMORY_DIR"
}

# Initialize empty memory file if not exists
init_memory_file() {
    if [[ ! -f "$MEMORY_FILE" ]]; then
        cat > "$MEMORY_FILE" <<EOF
{
    "agent": "${AGENT}",
    "wave": ${WAVE},
    "created_at": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
    "updated_at": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
    "decisions": [],
    "constraints": [],
    "patterns_used": [],
    "context_hashes": []
}
EOF
        echo -e "${GREEN}[MEMORY]${NC} Initialized memory file: $(basename "$MEMORY_FILE")"
    fi
}

# Get current timestamp
get_timestamp() {
    date -u +"%Y-%m-%dT%H:%M:%SZ"
}

# Update the updated_at field
update_timestamp() {
    local tmp_file=$(mktemp)
    local timestamp=$(get_timestamp)

    # Use Python for reliable JSON manipulation
    python3 - "$MEMORY_FILE" "$timestamp" "$tmp_file" <<'PYTHON'
import json
import sys

with open(sys.argv[1], 'r') as f:
    data = json.load(f)

data['updated_at'] = sys.argv[2]

with open(sys.argv[3], 'w') as f:
    json.dump(data, f, indent=4)
PYTHON

    mv "$tmp_file" "$MEMORY_FILE"
}

# ─────────────────────────────────────────────────────────────────────────────
# ACTION: SAVE DECISION
# ─────────────────────────────────────────────────────────────────────────────
action_save() {
    if [[ -z "$DECISION" ]]; then
        echo "Error: --decision is required for 'save' action"
        exit 1
    fi

    if [[ -z "$REASON" ]]; then
        REASON="No reason provided"
    fi

    ensure_memory_dir
    init_memory_file

    local timestamp=$(get_timestamp)
    local tmp_file=$(mktemp)

    # Add decision using Python
    python3 - "$MEMORY_FILE" "$DECISION" "$REASON" "$timestamp" "$tmp_file" <<'PYTHON'
import json
import sys

with open(sys.argv[1], 'r') as f:
    data = json.load(f)

new_decision = {
    "id": f"DEC-{len(data['decisions']) + 1:03d}",
    "timestamp": sys.argv[4],
    "decision": sys.argv[2],
    "reason": sys.argv[3]
}

data['decisions'].append(new_decision)
data['updated_at'] = sys.argv[4]

with open(sys.argv[5], 'w') as f:
    json.dump(data, f, indent=4)
PYTHON

    mv "$tmp_file" "$MEMORY_FILE"

    echo -e "${GREEN}[MEMORY]${NC} Decision saved:"
    echo -e "  ${BLUE}Decision:${NC} $DECISION"
    echo -e "  ${BLUE}Reason:${NC} $REASON"
    echo -e "  ${BLUE}File:${NC} $(basename "$MEMORY_FILE")"
}

# ─────────────────────────────────────────────────────────────────────────────
# ACTION: ADD CONSTRAINT
# ─────────────────────────────────────────────────────────────────────────────
action_add_constraint() {
    if [[ -z "$CONSTRAINT" ]]; then
        echo "Error: --constraint is required for 'add-constraint' action"
        exit 1
    fi

    ensure_memory_dir
    init_memory_file

    local timestamp=$(get_timestamp)
    local tmp_file=$(mktemp)

    # Add constraint using Python
    python3 - "$MEMORY_FILE" "$CONSTRAINT" "$timestamp" "$tmp_file" <<'PYTHON'
import json
import sys

with open(sys.argv[1], 'r') as f:
    data = json.load(f)

# Check if constraint already exists
if sys.argv[2] not in data['constraints']:
    data['constraints'].append(sys.argv[2])
    data['updated_at'] = sys.argv[3]

with open(sys.argv[4], 'w') as f:
    json.dump(data, f, indent=4)
PYTHON

    mv "$tmp_file" "$MEMORY_FILE"

    echo -e "${GREEN}[MEMORY]${NC} Constraint added: $CONSTRAINT"
}

# ─────────────────────────────────────────────────────────────────────────────
# ACTION: ADD PATTERN
# ─────────────────────────────────────────────────────────────────────────────
action_add_pattern() {
    if [[ -z "$PATTERN_NAME" ]]; then
        echo "Error: --pattern is required for 'add-pattern' action"
        exit 1
    fi

    if [[ -z "$PATTERN_FILE" ]]; then
        echo "Error: --file is required for 'add-pattern' action"
        exit 1
    fi

    ensure_memory_dir
    init_memory_file

    local timestamp=$(get_timestamp)
    local tmp_file=$(mktemp)

    # Add pattern using Python
    python3 - "$MEMORY_FILE" "$PATTERN_NAME" "$PATTERN_FILE" "$timestamp" "$tmp_file" <<'PYTHON'
import json
import sys

with open(sys.argv[1], 'r') as f:
    data = json.load(f)

new_pattern = {
    "name": sys.argv[2],
    "file": sys.argv[3],
    "added_at": sys.argv[4]
}

# Check if pattern already exists
existing = [p for p in data['patterns_used'] if p['name'] == sys.argv[2]]
if not existing:
    data['patterns_used'].append(new_pattern)
    data['updated_at'] = sys.argv[4]

with open(sys.argv[5], 'w') as f:
    json.dump(data, f, indent=4)
PYTHON

    mv "$tmp_file" "$MEMORY_FILE"

    echo -e "${GREEN}[MEMORY]${NC} Pattern added:"
    echo -e "  ${BLUE}Name:${NC} $PATTERN_NAME"
    echo -e "  ${BLUE}File:${NC} $PATTERN_FILE"
}

# ─────────────────────────────────────────────────────────────────────────────
# ACTION: LOAD MEMORY
# ─────────────────────────────────────────────────────────────────────────────
action_load() {
    if [[ ! -f "$MEMORY_FILE" ]]; then
        echo -e "${YELLOW}[MEMORY]${NC} No memory file found for ${AGENT} wave ${WAVE}"
        exit 0
    fi

    cat "$MEMORY_FILE"
}

# ─────────────────────────────────────────────────────────────────────────────
# ACTION: SUMMARY
# ─────────────────────────────────────────────────────────────────────────────
action_summary() {
    if [[ ! -f "$MEMORY_FILE" ]]; then
        echo -e "${YELLOW}[MEMORY]${NC} No memory file found for ${AGENT} wave ${WAVE}"
        exit 0
    fi

    echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${CYAN} AGENT MEMORY SUMMARY${NC}"
    echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
    echo ""

    # Parse and display using Python
    python3 - "$MEMORY_FILE" <<'PYTHON'
import json
import sys

with open(sys.argv[1], 'r') as f:
    data = json.load(f)

print(f"  Agent:      {data['agent']}")
print(f"  Wave:       {data['wave']}")
print(f"  Created:    {data['created_at']}")
print(f"  Updated:    {data['updated_at']}")
print("")

print("  DECISIONS:")
if data['decisions']:
    for d in data['decisions']:
        print(f"    [{d['id']}] {d['decision']}")
        print(f"           Reason: {d['reason']}")
else:
    print("    (none)")
print("")

print("  CONSTRAINTS:")
if data['constraints']:
    for c in data['constraints']:
        print(f"    - {c}")
else:
    print("    (none)")
print("")

print("  PATTERNS USED:")
if data['patterns_used']:
    for p in data['patterns_used']:
        print(f"    - {p['name']} ({p['file']})")
else:
    print("    (none)")
PYTHON

    echo ""
    echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
}

# ─────────────────────────────────────────────────────────────────────────────
# ACTION: CLEAR
# ─────────────────────────────────────────────────────────────────────────────
action_clear() {
    if [[ -f "$MEMORY_FILE" ]]; then
        rm "$MEMORY_FILE"
        echo -e "${YELLOW}[MEMORY]${NC} Cleared memory for ${AGENT} wave ${WAVE}"
    else
        echo -e "${YELLOW}[MEMORY]${NC} No memory file to clear"
    fi
}

# ─────────────────────────────────────────────────────────────────────────────
# ACTION: EXPORT
# ─────────────────────────────────────────────────────────────────────────────
action_export() {
    if [[ ! -f "$MEMORY_FILE" ]]; then
        echo "{}"
        exit 0
    fi

    cat "$MEMORY_FILE"
}

# ─────────────────────────────────────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────────────────────────────────────
case "$ACTION" in
    save)
        action_save
        ;;
    add-constraint)
        action_add_constraint
        ;;
    add-pattern)
        action_add_pattern
        ;;
    load)
        action_load
        ;;
    summary)
        action_summary
        ;;
    clear)
        action_clear
        ;;
    export)
        action_export
        ;;
    *)
        echo "Error: Unknown action: $ACTION"
        show_usage
        exit 1
        ;;
esac
