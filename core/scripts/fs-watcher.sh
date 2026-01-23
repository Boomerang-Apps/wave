#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# WAVE FRAMEWORK - Filesystem Watcher
# ═══════════════════════════════════════════════════════════════════════════════
# Event-driven filesystem monitoring using native OS tools.
# Uses fswatch (macOS) or inotifywait (Linux) for efficient watching.
#
# Usage:
#   ./fs-watcher.sh <watch-path> [options]
#
# Options:
#   --pattern=GLOB        Filter by file pattern (e.g., "*.json")
#   --events=TYPES        Event types: create,modify,delete,move (default: all)
#   --callback=SCRIPT     Script to call on events
#   --json                Output events as JSON
#   --recursive           Watch subdirectories (default: true)
#   --debounce=MS         Debounce interval in ms (default: 100)
#
# Callback receives: $1=event_type $2=file_path $3=timestamp
#
# ═══════════════════════════════════════════════════════════════════════════════

set -e

# ─────────────────────────────────────────────────────────────────────────────
# CONFIGURATION
# ─────────────────────────────────────────────────────────────────────────────

WATCH_PATH="${1:?Error: Watch path required}"
shift

# Resolve to absolute path
WATCH_PATH="$(cd "$WATCH_PATH" 2>/dev/null && pwd)" || {
    echo "Error: Invalid watch path: $WATCH_PATH" >&2
    exit 1
}

# Defaults
PATTERN=""
EVENTS="create,modify,delete"
CALLBACK=""
JSON_OUTPUT=false
RECURSIVE=true
DEBOUNCE_MS=100

# Parse options
while [[ $# -gt 0 ]]; do
    case "$1" in
        --pattern=*) PATTERN="${1#*=}" ;;
        --events=*) EVENTS="${1#*=}" ;;
        --callback=*) CALLBACK="${1#*=}" ;;
        --json) JSON_OUTPUT=true ;;
        --recursive) RECURSIVE=true ;;
        --no-recursive) RECURSIVE=false ;;
        --debounce=*) DEBOUNCE_MS="${1#*=}" ;;
        --help|-h)
            echo "Usage: $0 <watch-path> [options]"
            echo ""
            echo "Options:"
            echo "  --pattern=GLOB      Filter files (e.g., '*.json')"
            echo "  --events=TYPES      create,modify,delete,move"
            echo "  --callback=SCRIPT   Script to call on events"
            echo "  --json              JSON output format"
            echo "  --no-recursive      Don't watch subdirectories"
            echo "  --debounce=MS       Debounce interval (default: 100)"
            exit 0
            ;;
        *)
            echo "Unknown option: $1" >&2
            exit 1
            ;;
    esac
    shift
done

# Colors (disabled for JSON output)
if [[ "$JSON_OUTPUT" == false ]]; then
    GREEN='\033[0;32m'
    YELLOW='\033[1;33m'
    BLUE='\033[0;34m'
    RED='\033[0;31m'
    NC='\033[0m'
else
    GREEN='' YELLOW='' BLUE='' RED='' NC=''
fi

# ─────────────────────────────────────────────────────────────────────────────
# PLATFORM DETECTION
# ─────────────────────────────────────────────────────────────────────────────

detect_watcher_tool() {
    if command -v fswatch &> /dev/null; then
        echo "fswatch"
    elif command -v inotifywait &> /dev/null; then
        echo "inotifywait"
    else
        echo "none"
    fi
}

WATCHER_TOOL=$(detect_watcher_tool)

if [[ "$WATCHER_TOOL" == "none" ]]; then
    echo "Error: No filesystem watcher found." >&2
    echo "Install fswatch (macOS: brew install fswatch) or inotify-tools (Linux: apt install inotify-tools)" >&2
    exit 1
fi

# ─────────────────────────────────────────────────────────────────────────────
# EVENT HANDLING
# ─────────────────────────────────────────────────────────────────────────────

# Debounce tracking
declare -A LAST_EVENT_TIME
DEBOUNCE_SEC=$(echo "scale=3; $DEBOUNCE_MS / 1000" | bc 2>/dev/null || echo "0.1")

should_debounce() {
    local file="$1"
    local now=$(date +%s.%N 2>/dev/null || date +%s)
    local last="${LAST_EVENT_TIME[$file]:-0}"

    local diff=$(echo "$now - $last" | bc 2>/dev/null || echo "1")
    if (( $(echo "$diff < $DEBOUNCE_SEC" | bc 2>/dev/null || echo "0") )); then
        return 0  # Should debounce (skip)
    fi

    LAST_EVENT_TIME[$file]="$now"
    return 1  # Should not debounce (process)
}

# Normalize event type across platforms
normalize_event() {
    local raw_event="$1"

    case "$raw_event" in
        Created|CREATE|created|IsFile|PlatformSpecific)
            echo "create"
            ;;
        Updated|MODIFY|modified|ContentModified|AttributeModified)
            echo "modify"
            ;;
        Removed|DELETE|deleted|Removed)
            echo "delete"
            ;;
        Renamed|MovedFrom|MovedTo|MOVED_FROM|MOVED_TO)
            echo "move"
            ;;
        *)
            echo "unknown"
            ;;
    esac
}

# Check if event type is wanted
is_wanted_event() {
    local event_type="$1"
    [[ ",$EVENTS," == *",$event_type,"* ]] || [[ "$EVENTS" == "all" ]]
}

# Check if file matches pattern
matches_pattern() {
    local file="$1"
    local basename=$(basename "$file")

    [[ -z "$PATTERN" ]] && return 0

    # Simple glob matching
    case "$basename" in
        $PATTERN) return 0 ;;
        *) return 1 ;;
    esac
}

# Process and emit event
emit_event() {
    local event_type="$1"
    local file_path="$2"
    local timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ)

    # Apply filters
    is_wanted_event "$event_type" || return 0
    matches_pattern "$file_path" || return 0

    # Debounce check
    should_debounce "$file_path" && return 0

    # Execute callback if provided
    if [[ -n "$CALLBACK" && -x "$CALLBACK" ]]; then
        "$CALLBACK" "$event_type" "$file_path" "$timestamp" &
    fi

    # Output event
    if [[ "$JSON_OUTPUT" == true ]]; then
        cat << EOF
{"event":"$event_type","path":"$file_path","timestamp":"$timestamp"}
EOF
    else
        local color=""
        case "$event_type" in
            create) color="$GREEN" ;;
            modify) color="$YELLOW" ;;
            delete) color="$RED" ;;
            move) color="$BLUE" ;;
        esac
        echo -e "[${timestamp}] ${color}[${event_type^^}]${NC} $file_path"
    fi
}

# ─────────────────────────────────────────────────────────────────────────────
# FSWATCH (macOS/cross-platform)
# ─────────────────────────────────────────────────────────────────────────────

run_fswatch() {
    local args=("--event-flags")

    [[ "$RECURSIVE" == true ]] && args+=("--recursive")

    # Add latency for debouncing
    args+=("--latency" "$(echo "scale=2; $DEBOUNCE_MS / 1000" | bc 2>/dev/null || echo "0.1")")

    if [[ "$JSON_OUTPUT" == false ]]; then
        echo -e "${BLUE}[WATCHER]${NC} Starting fswatch on: $WATCH_PATH"
        echo -e "${BLUE}[WATCHER]${NC} Events: $EVENTS"
        [[ -n "$PATTERN" ]] && echo -e "${BLUE}[WATCHER]${NC} Pattern: $PATTERN"
        echo ""
    fi

    fswatch "${args[@]}" "$WATCH_PATH" | while read -r line; do
        # fswatch output format: /path/to/file EventFlag1 EventFlag2 ...
        local file_path=$(echo "$line" | awk '{print $1}')
        local event_flags=$(echo "$line" | cut -d' ' -f2-)

        # Parse event flags
        for flag in $event_flags; do
            local event_type=$(normalize_event "$flag")
            if [[ "$event_type" != "unknown" ]]; then
                emit_event "$event_type" "$file_path"
                break  # Only emit once per file change
            fi
        done
    done
}

# ─────────────────────────────────────────────────────────────────────────────
# INOTIFYWAIT (Linux)
# ─────────────────────────────────────────────────────────────────────────────

run_inotifywait() {
    local args=("-m" "-q")  # Monitor mode, quiet

    [[ "$RECURSIVE" == true ]] && args+=("-r")

    # Map event types
    local inotify_events=""
    [[ "$EVENTS" == *"create"* ]] && inotify_events+=",create"
    [[ "$EVENTS" == *"modify"* ]] && inotify_events+=",modify,close_write"
    [[ "$EVENTS" == *"delete"* ]] && inotify_events+=",delete"
    [[ "$EVENTS" == *"move"* ]] && inotify_events+=",moved_to,moved_from"
    inotify_events="${inotify_events#,}"  # Remove leading comma

    [[ -n "$inotify_events" ]] && args+=("-e" "$inotify_events")
    args+=("--format" "%w%f %e")

    if [[ "$JSON_OUTPUT" == false ]]; then
        echo -e "${BLUE}[WATCHER]${NC} Starting inotifywait on: $WATCH_PATH"
        echo -e "${BLUE}[WATCHER]${NC} Events: $EVENTS"
        [[ -n "$PATTERN" ]] && echo -e "${BLUE}[WATCHER]${NC} Pattern: $PATTERN"
        echo ""
    fi

    inotifywait "${args[@]}" "$WATCH_PATH" | while read -r line; do
        local file_path=$(echo "$line" | awk '{print $1}')
        local event_flag=$(echo "$line" | awk '{print $2}')

        local event_type=$(normalize_event "$event_flag")
        emit_event "$event_type" "$file_path"
    done
}

# ─────────────────────────────────────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────────────────────────────────────

main() {
    # Ensure watch path exists
    if [[ ! -d "$WATCH_PATH" ]]; then
        echo "Error: Watch path does not exist: $WATCH_PATH" >&2
        exit 1
    fi

    # Trap for cleanup
    trap 'echo -e "\n${BLUE}[WATCHER]${NC} Stopping..."; exit 0' SIGINT SIGTERM

    case "$WATCHER_TOOL" in
        fswatch)
            run_fswatch
            ;;
        inotifywait)
            run_inotifywait
            ;;
    esac
}

main "$@"
