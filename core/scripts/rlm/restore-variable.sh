#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# WAVE RLM: RESTORE VARIABLE
# ═══════════════════════════════════════════════════════════════════════════════
# Restores P variable from a snapshot for recovery purposes.
#
# USAGE:
#   # Restore from latest snapshot
#   ./restore-variable.sh --project /path --wave $N --latest
#
#   # Restore from specific checkpoint
#   ./restore-variable.sh --project /path --wave $N --checkpoint pre-sync
#
#   # Restore from specific file
#   ./restore-variable.sh --project /path --wave $N --file P-waveN-pre-sync-20260118-153000.json
#
#   # Dry run (show what would be restored)
#   ./restore-variable.sh --project /path --wave $N --latest --dry-run
#
# ═══════════════════════════════════════════════════════════════════════════════

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ─────────────────────────────────────────────────────────────────────────────
# ARGUMENT PARSING
# ─────────────────────────────────────────────────────────────────────────────
show_usage() {
    echo "WAVE RLM: Restore Variable"
    echo ""
    echo "Usage: $0 --project <path> --wave <N> [restore-option]"
    echo ""
    echo "Required:"
    echo "  -p, --project <path>     Path to WAVE project"
    echo "  -w, --wave <number>      Wave number"
    echo ""
    echo "Restore options (one required):"
    echo "  --latest                 Restore from most recent snapshot"
    echo "  -c, --checkpoint <name>  Restore from latest snapshot with this checkpoint"
    echo "  -f, --file <filename>    Restore from specific snapshot file"
    echo ""
    echo "Options:"
    echo "  --dry-run                Show what would be restored without doing it"
    echo "  --backup                 Backup current P.json before restore"
    echo "  -h, --help               Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 --project /path/to/project --wave \$N --latest"
    echo "  $0 --project /path/to/project --wave \$N --checkpoint pre-sync"
    echo "  $0 --project /path/to/project --wave \$N --latest --dry-run"
}

PROJECT_ROOT=""
WAVE=""
RESTORE_LATEST=false
CHECKPOINT=""
SNAPSHOT_FILE=""
DRY_RUN=false
BACKUP=false

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
        --latest)
            RESTORE_LATEST=true
            shift
            ;;
        -c|--checkpoint)
            CHECKPOINT="$2"
            shift 2
            ;;
        -f|--file)
            SNAPSHOT_FILE="$2"
            shift 2
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --backup)
            BACKUP=true
            shift
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
# HELPER FUNCTIONS
# ─────────────────────────────────────────────────────────────────────────────

# Find snapshot to restore
find_snapshot() {
    if [[ ! -d "$SNAPSHOT_DIR" ]]; then
        echo ""
        return
    fi

    if [[ -n "$SNAPSHOT_FILE" ]]; then
        # Specific file requested
        local full_path="${SNAPSHOT_DIR}/${SNAPSHOT_FILE}"
        if [[ -f "$full_path" ]]; then
            echo "$full_path"
        else
            echo ""
        fi
    elif [[ "$RESTORE_LATEST" == "true" ]]; then
        # Latest snapshot for this wave
        ls -1t "$SNAPSHOT_DIR"/P-wave${WAVE}-*.json 2>/dev/null | head -1
    elif [[ -n "$CHECKPOINT" ]]; then
        # Latest snapshot with specific checkpoint
        ls -1t "$SNAPSHOT_DIR"/P-wave${WAVE}-${CHECKPOINT}-*.json 2>/dev/null | head -1
    else
        echo ""
    fi
}

# Display snapshot info
show_snapshot_info() {
    local snapshot="$1"
    local filename=$(basename "$snapshot")
    local size=$(ls -lh "$snapshot" | awk '{print $5}')
    local modified=$(stat -f '%Sm' -t '%Y-%m-%d %H:%M:%S' "$snapshot" 2>/dev/null || stat -c '%y' "$snapshot" 2>/dev/null | cut -d. -f1)

    echo -e "  ${BLUE}File:${NC}     $filename"
    echo -e "  ${BLUE}Size:${NC}     $size"
    echo -e "  ${BLUE}Modified:${NC} $modified"

    # Extract metadata if available
    if command -v python3 &>/dev/null; then
        python3 - "$snapshot" <<'PYTHON' 2>/dev/null || true
import json
import sys

try:
    with open(sys.argv[1], 'r') as f:
        data = json.load(f)

    if '_snapshot' in data:
        snap = data['_snapshot']
        print(f"  \033[0;34mCheckpoint:\033[0m {snap.get('checkpoint', 'unknown')}")
        print(f"  \033[0;34mWave:\033[0m       {snap.get('wave', 'unknown')}")
except:
    pass
PYTHON
    fi
}

# ─────────────────────────────────────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────────────────────────────────────

# Check that a restore option was specified
if [[ "$RESTORE_LATEST" != "true" && -z "$CHECKPOINT" && -z "$SNAPSHOT_FILE" ]]; then
    echo "Error: Must specify --latest, --checkpoint, or --file"
    show_usage
    exit 1
fi

# Find the snapshot to restore
snapshot=$(find_snapshot)

if [[ -z "$snapshot" || ! -f "$snapshot" ]]; then
    echo -e "${RED}[RESTORE]${NC} Error: No matching snapshot found"

    if [[ -n "$CHECKPOINT" ]]; then
        echo -e "${YELLOW}[RESTORE]${NC} No snapshots found for checkpoint: $CHECKPOINT"
    elif [[ -n "$SNAPSHOT_FILE" ]]; then
        echo -e "${YELLOW}[RESTORE]${NC} File not found: $SNAPSHOT_FILE"
    else
        echo -e "${YELLOW}[RESTORE]${NC} No snapshots found for wave $WAVE"
    fi

    # List available snapshots
    if [[ -d "$SNAPSHOT_DIR" ]]; then
        local available=$(ls -1 "$SNAPSHOT_DIR"/P-wave${WAVE}-*.json 2>/dev/null | wc -l | tr -d ' ')
        if [[ $available -gt 0 ]]; then
            echo ""
            echo -e "${YELLOW}[RESTORE]${NC} Available snapshots for wave $WAVE:"
            ls -1t "$SNAPSHOT_DIR"/P-wave${WAVE}-*.json 2>/dev/null | head -5 | while read f; do
                echo "  - $(basename "$f")"
            done
        fi
    fi

    exit 1
fi

# Show what will be restored
echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN} RESTORE SNAPSHOT${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${BLUE}Snapshot to restore:${NC}"
show_snapshot_info "$snapshot"
echo ""

# Dry run mode
if [[ "$DRY_RUN" == "true" ]]; then
    echo -e "${YELLOW}[DRY RUN]${NC} Would restore: $(basename "$snapshot")"
    echo -e "${YELLOW}[DRY RUN]${NC} To: $P_FILE"

    if [[ -f "$P_FILE" ]]; then
        echo -e "${YELLOW}[DRY RUN]${NC} Current P.json would be overwritten"
    else
        echo -e "${YELLOW}[DRY RUN]${NC} P.json does not exist, would be created"
    fi

    exit 0
fi

# Backup current P.json if requested
if [[ "$BACKUP" == "true" && -f "$P_FILE" ]]; then
    local backup_file="${P_FILE}.backup-$(date +%Y%m%d-%H%M%S)"
    cp "$P_FILE" "$backup_file"
    echo -e "${GREEN}[RESTORE]${NC} Backed up current P.json to: $(basename "$backup_file")"
fi

# Ensure .claude directory exists
mkdir -p "${PROJECT_ROOT}/.claude"

# Perform restore
cp "$snapshot" "$P_FILE"

# Remove snapshot metadata from restored file
if command -v python3 &>/dev/null; then
    local tmp_file=$(mktemp)
    python3 - "$P_FILE" "$tmp_file" <<'PYTHON'
import json
import sys

with open(sys.argv[1], 'r') as f:
    data = json.load(f)

# Remove snapshot metadata
if '_snapshot' in data:
    del data['_snapshot']

# Update timestamp
from datetime import datetime
data['meta']['generated_at'] = datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%SZ') + ' (restored)'

with open(sys.argv[2], 'w') as f:
    json.dump(data, f, indent=4)
PYTHON
    mv "$tmp_file" "$P_FILE"
fi

echo -e "${GREEN}[RESTORE]${NC} Successfully restored P.json from snapshot"
echo -e "  ${BLUE}Source:${NC} $(basename "$snapshot")"
echo -e "  ${BLUE}Target:${NC} $P_FILE"
echo ""
echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
