#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# WAVE RLM: SNAPSHOT VARIABLE
# ═══════════════════════════════════════════════════════════════════════════════
# Creates named snapshots of the P variable for recovery purposes.
# Snapshots are stored in .claude/rlm-snapshots/ with timestamps.
#
# USAGE:
#   # Create a snapshot
#   ./snapshot-variable.sh --project /path --wave $N --checkpoint pre-qa
#
#   # List snapshots
#   ./snapshot-variable.sh --project /path --wave $N --list
#
#   # Cleanup old snapshots (keep last N)
#   ./snapshot-variable.sh --project /path --wave $N --cleanup --keep 5
#
# CHECKPOINT NAMES:
#   - startup     : Initial P at merge-watcher start
#   - pre-sync    : Before worktree sync
#   - post-sync   : After worktree sync
#   - pre-qa      : Before QA validation
#   - post-qa     : After QA approval
#   - pre-retry   : Before retry attempt
#   - complete    : Wave completion
#
# ═══════════════════════════════════════════════════════════════════════════════

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ─────────────────────────────────────────────────────────────────────────────
# ARGUMENT PARSING
# ─────────────────────────────────────────────────────────────────────────────
show_usage() {
    echo "WAVE RLM: Snapshot Variable"
    echo ""
    echo "Usage: $0 --project <path> --wave <N> [options]"
    echo ""
    echo "Required:"
    echo "  -p, --project <path>     Path to WAVE project"
    echo "  -w, --wave <number>      Wave number"
    echo ""
    echo "Actions (one required):"
    echo "  -c, --checkpoint <name>  Create snapshot with checkpoint name"
    echo "  -l, --list               List all snapshots for this wave"
    echo "  --cleanup                Remove old snapshots"
    echo ""
    echo "Options:"
    echo "  -k, --keep <number>      Keep last N snapshots (default: 10)"
    echo "  -h, --help               Show this help message"
    echo ""
    echo "Checkpoint names:"
    echo "  startup, pre-sync, post-sync, pre-qa, post-qa, pre-retry, complete"
    echo ""
    echo "Examples:"
    echo "  $0 --project /path/to/project --wave \$N --checkpoint pre-qa"
    echo "  $0 --project /path/to/project --wave \$N --list"
    echo "  $0 --project /path/to/project --wave \$N --cleanup --keep 5"
}

PROJECT_ROOT=""
WAVE=""
CHECKPOINT=""
LIST_MODE=false
CLEANUP_MODE=false
KEEP_COUNT=10

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
        -c|--checkpoint)
            CHECKPOINT="$2"
            shift 2
            ;;
        -l|--list)
            LIST_MODE=true
            shift
            ;;
        --cleanup)
            CLEANUP_MODE=true
            shift
            ;;
        -k|--keep)
            KEEP_COUNT="$2"
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

if [[ -z "$WAVE" ]]; then
    echo "Error: --wave is required"
    show_usage
    exit 1
fi

# Convert to absolute path
PROJECT_ROOT="$(cd "$PROJECT_ROOT" && pwd)"
SNAPSHOT_DIR="${PROJECT_ROOT}/.claude/rlm-snapshots"
P_FILE="${PROJECT_ROOT}/.claude/P.json"

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
# ACTION: CREATE SNAPSHOT
# ─────────────────────────────────────────────────────────────────────────────
action_snapshot() {
    local checkpoint="$1"

    # Validate checkpoint name
    local valid_checkpoints="startup pre-sync post-sync pre-qa post-qa pre-retry complete custom"
    if [[ ! " $valid_checkpoints " =~ " $checkpoint " ]]; then
        echo -e "${YELLOW}[SNAPSHOT]${NC} Warning: Non-standard checkpoint name: $checkpoint"
    fi

    # Check if P.json exists
    if [[ ! -f "$P_FILE" ]]; then
        echo -e "${RED}[SNAPSHOT]${NC} Error: P.json not found at $P_FILE"
        echo -e "${YELLOW}[SNAPSHOT]${NC} Run load-project-variable.sh first to generate P.json"
        exit 1
    fi

    # Ensure snapshot directory exists
    mkdir -p "$SNAPSHOT_DIR"

    # Generate snapshot filename
    local timestamp=$(date +%Y%m%d-%H%M%S)
    local snapshot_file="${SNAPSHOT_DIR}/P-wave${WAVE}-${checkpoint}-${timestamp}.json"

    # Copy P.json to snapshot
    cp "$P_FILE" "$snapshot_file"

    # Add snapshot metadata
    local tmp_file=$(mktemp)
    python3 - "$snapshot_file" "$checkpoint" "$timestamp" "$WAVE" "$tmp_file" <<'PYTHON'
import json
import sys

with open(sys.argv[1], 'r') as f:
    data = json.load(f)

# Add snapshot metadata
data['_snapshot'] = {
    'checkpoint': sys.argv[2],
    'timestamp': sys.argv[3],
    'wave': int(sys.argv[4]),
    'original_file': 'P.json'
}

with open(sys.argv[5], 'w') as f:
    json.dump(data, f, indent=4)
PYTHON

    mv "$tmp_file" "$snapshot_file"

    echo -e "${GREEN}[SNAPSHOT]${NC} Created: $(basename "$snapshot_file")"
    echo -e "  ${BLUE}Wave:${NC}       $WAVE"
    echo -e "  ${BLUE}Checkpoint:${NC} $checkpoint"
    echo -e "  ${BLUE}Timestamp:${NC}  $timestamp"
    echo -e "  ${BLUE}Location:${NC}   $snapshot_file"
}

# ─────────────────────────────────────────────────────────────────────────────
# ACTION: LIST SNAPSHOTS
# ─────────────────────────────────────────────────────────────────────────────
action_list() {
    if [[ ! -d "$SNAPSHOT_DIR" ]]; then
        echo -e "${YELLOW}[SNAPSHOT]${NC} No snapshots directory found"
        exit 0
    fi

    local snapshots=$(ls -1 "$SNAPSHOT_DIR"/P-wave${WAVE}-*.json 2>/dev/null | sort -r)

    if [[ -z "$snapshots" ]]; then
        echo -e "${YELLOW}[SNAPSHOT]${NC} No snapshots found for wave $WAVE"
        exit 0
    fi

    echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${CYAN} SNAPSHOTS FOR WAVE $WAVE${NC}"
    echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
    echo ""

    local count=0
    while IFS= read -r snapshot; do
        ((count++))
        local filename=$(basename "$snapshot")
        local size=$(ls -lh "$snapshot" | awk '{print $5}')

        # Extract checkpoint and timestamp from filename
        # Format: P-wave${WAVE}-${checkpoint}-${timestamp}.json
        local checkpoint=$(echo "$filename" | sed -E 's/P-wave[0-9]+-([^-]+(-[^-]+)?)-[0-9]{8}-[0-9]{6}\.json/\1/')
        local timestamp=$(echo "$filename" | grep -oE '[0-9]{8}-[0-9]{6}')

        echo -e "  ${BLUE}[$count]${NC} $filename"
        echo -e "      Checkpoint: $checkpoint | Size: $size"
    done <<< "$snapshots"

    echo ""
    echo -e "  ${BLUE}Total:${NC} $count snapshots"
    echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
}

# ─────────────────────────────────────────────────────────────────────────────
# ACTION: CLEANUP
# ─────────────────────────────────────────────────────────────────────────────
action_cleanup() {
    if [[ ! -d "$SNAPSHOT_DIR" ]]; then
        echo -e "${YELLOW}[SNAPSHOT]${NC} No snapshots directory found"
        exit 0
    fi

    local snapshots=$(ls -1t "$SNAPSHOT_DIR"/P-wave${WAVE}-*.json 2>/dev/null)
    local total=$(echo "$snapshots" | grep -c . || echo 0)

    if [[ $total -le $KEEP_COUNT ]]; then
        echo -e "${GREEN}[SNAPSHOT]${NC} No cleanup needed. Have $total snapshots, keeping $KEEP_COUNT"
        exit 0
    fi

    local to_delete=$((total - KEEP_COUNT))
    echo -e "${YELLOW}[SNAPSHOT]${NC} Cleaning up $to_delete old snapshots (keeping $KEEP_COUNT)"

    # Get files to delete (oldest ones)
    local delete_files=$(echo "$snapshots" | tail -n "$to_delete")

    while IFS= read -r file; do
        if [[ -f "$file" ]]; then
            rm "$file"
            echo -e "  ${RED}Deleted:${NC} $(basename "$file")"
        fi
    done <<< "$delete_files"

    echo -e "${GREEN}[SNAPSHOT]${NC} Cleanup complete. Removed $to_delete snapshots."
}

# ─────────────────────────────────────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────────────────────────────────────
if [[ "$LIST_MODE" == "true" ]]; then
    action_list
elif [[ "$CLEANUP_MODE" == "true" ]]; then
    action_cleanup
elif [[ -n "$CHECKPOINT" ]]; then
    action_snapshot "$CHECKPOINT"
else
    echo "Error: Must specify --checkpoint, --list, or --cleanup"
    show_usage
    exit 1
fi
