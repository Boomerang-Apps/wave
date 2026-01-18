#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# WAVE RLM: PROJECT VARIABLE LOADER
# ═══════════════════════════════════════════════════════════════════════════════
# Generates the external variable P from a WAVE project for RLM-style context
# management. This enables agents to query project state without loading
# full context into their prompt window.
#
# USAGE:
#   ./load-project-variable.sh --project /path/to/project
#   ./load-project-variable.sh --project /path/to/project --output /tmp/P.json
#   ./load-project-variable.sh --project /path/to/project --wave 3
#
# OUTPUT: JSON structure containing project state (P variable)
#
# BASED ON: MIT CSAIL RLM Research (arXiv:2512.24601)
# ═══════════════════════════════════════════════════════════════════════════════

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ─────────────────────────────────────────────────────────────────────────────
# ARGUMENT PARSING
# ─────────────────────────────────────────────────────────────────────────────
show_usage() {
    echo "WAVE RLM: Project Variable Loader"
    echo ""
    echo "Usage: $0 --project <path> [options]"
    echo ""
    echo "Required:"
    echo "  -p, --project <path>    Path to WAVE project"
    echo ""
    echo "Optional:"
    echo "  -o, --output <path>     Output file path (default: stdout)"
    echo "  -w, --wave <number>     Specific wave to focus on"
    echo "  --include-contents      Include file contents (expensive)"
    echo "  -h, --help              Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 --project /path/to/project"
    echo "  $0 --project /path/to/project --wave 3 --output /tmp/P.json"
}

PROJECT_ROOT=""
OUTPUT_FILE=""
WAVE=""
INCLUDE_CONTENTS=false

while [[ $# -gt 0 ]]; do
    case $1 in
        -p|--project)
            PROJECT_ROOT="$2"
            shift 2
            ;;
        -o|--output)
            OUTPUT_FILE="$2"
            shift 2
            ;;
        -w|--wave)
            WAVE="$2"
            shift 2
            ;;
        --include-contents)
            INCLUDE_CONTENTS=true
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

if [[ -z "$PROJECT_ROOT" ]]; then
    echo "Error: --project is required"
    show_usage
    exit 1
fi

if [[ ! -d "$PROJECT_ROOT" ]]; then
    echo "Error: Project directory not found: $PROJECT_ROOT"
    exit 1
fi

# Convert to absolute path
PROJECT_ROOT="$(cd "$PROJECT_ROOT" && pwd)"
PROJECT_NAME=$(basename "$PROJECT_ROOT")

# ─────────────────────────────────────────────────────────────────────────────
# HELPER FUNCTIONS
# ─────────────────────────────────────────────────────────────────────────────

# Get directory structure (lightweight)
get_directory_structure() {
    local dir="$1"
    local depth="${2:-3}"

    find "$dir" -maxdepth "$depth" -type d \
        ! -path "*/node_modules/*" \
        ! -path "*/.git/*" \
        ! -path "*/dist/*" \
        ! -path "*/build/*" \
        ! -path "*/__pycache__/*" \
        2>/dev/null | sort
}

# Get file index with metadata (no contents)
get_file_index() {
    local dir="$1"

    find "$dir" -type f \
        ! -path "*/node_modules/*" \
        ! -path "*/.git/*" \
        ! -path "*/dist/*" \
        ! -path "*/build/*" \
        ! -path "*/__pycache__/*" \
        ! -name "*.lock" \
        ! -name "package-lock.json" \
        -exec stat -f '{"path":"%N","size":%z,"modified":"%m"}' {} \; 2>/dev/null | head -500
}

# Get current wave state from signals
get_wave_state() {
    local project="$1"
    local signal_dir="${project}/.claude"

    if [[ -d "$signal_dir" ]]; then
        ls -t "$signal_dir"/signal-*.json 2>/dev/null | head -10
    fi
}

# Get stories for a wave
get_stories() {
    local project="$1"
    local wave="$2"
    local stories_dir="${project}/stories/wave${wave}"

    if [[ -d "$stories_dir" ]]; then
        for story in "$stories_dir"/*.json; do
            if [[ -f "$story" ]]; then
                echo "$(basename "$story")"
            fi
        done
    fi
}

# Get worktree status
get_worktree_status() {
    local project="$1"
    local worktree_dir="${project}/worktrees"

    if [[ -d "$worktree_dir" ]]; then
        for wt in "$worktree_dir"/*/; do
            if [[ -d "$wt" ]]; then
                local name=$(basename "$wt")
                local branch=$(cd "$wt" && git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")
                local changes=$(cd "$wt" && git status --porcelain 2>/dev/null | wc -l | tr -d ' ')
                echo "{\"name\":\"$name\",\"branch\":\"$branch\",\"uncommitted_changes\":$changes}"
            fi
        done
    fi
}

# Detect wave type from stories
detect_wave_type() {
    local project="$1"
    local wave="$2"
    local stories_dir="${project}/stories/wave${wave}"

    if [[ ! -d "$stories_dir" ]]; then
        echo "FULL"
        return
    fi

    local fe_count=$(ls -1 "$stories_dir"/*FE*.json 2>/dev/null | wc -l | tr -d ' ')
    local be_count=$(ls -1 "$stories_dir"/*BE*.json 2>/dev/null | wc -l | tr -d ' ')

    if [[ "$fe_count" -gt 0 && "$be_count" -gt 0 ]]; then
        echo "FULL"
    elif [[ "$fe_count" -gt 0 ]]; then
        echo "FE_ONLY"
    elif [[ "$be_count" -gt 0 ]]; then
        echo "BE_ONLY"
    else
        echo "FULL"
    fi
}

# Generate context hash
generate_context_hash() {
    local project="$1"

    # Hash key directories
    local hash=""
    for dir in src lib app components stories; do
        if [[ -d "${project}/${dir}" ]]; then
            local dir_hash=$(find "${project}/${dir}" -type f -exec stat -f '%m' {} \; 2>/dev/null | sort | md5 | head -c 8)
            hash="${hash}${dir}:${dir_hash},"
        fi
    done
    echo "${hash%,}"
}

# ─────────────────────────────────────────────────────────────────────────────
# MAIN: BUILD P VARIABLE
# ─────────────────────────────────────────────────────────────────────────────

timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
context_hash=$(generate_context_hash "$PROJECT_ROOT")

# Determine current wave from signals if not specified
if [[ -z "$WAVE" ]]; then
    latest_signal=$(ls -t "$PROJECT_ROOT/.claude"/signal-wave*.json 2>/dev/null | head -1)
    if [[ -n "$latest_signal" ]]; then
        WAVE=$(echo "$latest_signal" | grep -o 'wave[0-9]*' | grep -o '[0-9]*')
    fi
    WAVE=${WAVE:-1}
fi

wave_type=$(detect_wave_type "$PROJECT_ROOT" "$WAVE")

# Build the P variable as JSON
P_JSON=$(cat <<EOF
{
    "meta": {
        "project_name": "$PROJECT_NAME",
        "project_root": "$PROJECT_ROOT",
        "generated_at": "$timestamp",
        "context_hash": "$context_hash",
        "schema_version": "1.0"
    },
    "codebase": {
        "structure": [
$(get_directory_structure "$PROJECT_ROOT" | sed 's|'"$PROJECT_ROOT"'||g' | grep -v '^$' | head -50 | awk '{printf "            \"%s\",\n", $0}' | sed '$ s/,$//')
        ],
        "file_count": $(find "$PROJECT_ROOT" -type f ! -path "*/node_modules/*" ! -path "*/.git/*" 2>/dev/null | wc -l | tr -d ' '),
        "source_extensions": ["ts", "tsx", "js", "jsx", "py", "sh", "json", "md"]
    },
    "wave_state": {
        "current_wave": $WAVE,
        "wave_type": "$wave_type",
        "stories": [
$(get_stories "$PROJECT_ROOT" "$WAVE" | awk '{printf "            \"%s\",\n", $0}' | sed '$ s/,$//')
        ],
        "signals": [
$(get_wave_state "$PROJECT_ROOT" | xargs -I{} basename {} 2>/dev/null | awk '{printf "            \"%s\",\n", $0}' | sed '$ s/,$//')
        ]
    },
    "worktrees": [
$(get_worktree_status "$PROJECT_ROOT" | awk '{printf "        %s,\n", $0}' | sed '$ s/,$//')
    ],
    "agent_memory": {
        "memory_dir": "${PROJECT_ROOT}/.claude/agent-memory",
        "available_memories": []
    },
    "query_interface": {
        "peek_file": "peek(P, 'path/to/file.ts')",
        "search": "search(P, 'pattern')",
        "list_files": "list_files(P, '*.test.ts')",
        "get_story": "get_story(P, 'STORY-ID')",
        "get_signal": "get_signal(P, 'wave3-gate3')"
    }
}
EOF
)

# Output
if [[ -n "$OUTPUT_FILE" ]]; then
    echo "$P_JSON" > "$OUTPUT_FILE"
    echo "P variable written to: $OUTPUT_FILE" >&2
else
    echo "$P_JSON"
fi
