#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# WAVE WORK DISPATCHER
# ═══════════════════════════════════════════════════════════════════════════════
# Dispatches work from wave-start signals to agent assignment signals
# This bridges the gap between "wave started" and "agents working"
#
# Usage: ./work-dispatcher.sh --wave <N> [--project <path>]
# ═══════════════════════════════════════════════════════════════════════════════

set -e

# ─────────────────────────────────────────────────────────────────────────────
# CONFIGURATION
# ─────────────────────────────────────────────────────────────────────────────
WAVE_NUMBER="${WAVE_NUMBER:-1}"
PROJECT_ROOT="${PROJECT_ROOT:-/project}"
PROJECT_SUBDIR="${PROJECT_SUBDIR:-}"
APP_ROOT="${PROJECT_ROOT}${PROJECT_SUBDIR:+/$PROJECT_SUBDIR}"
SIGNAL_DIR="${APP_ROOT}/.claude"
STORIES_DIR="${APP_ROOT}/stories/wave${WAVE_NUMBER}"

# Agent to model mapping (bash 3.x compatible)
get_model_for_agent() {
    local agent="$1"
    case "$agent" in
        pm|cto)       echo "claude-opus-4-5-20251101" ;;
        fe-dev-1|fe-dev-2|be-dev-1|be-dev-2) echo "claude-sonnet-4-20250514" ;;
        qa|dev-fix)   echo "claude-haiku-4-5-20251001" ;;
        *)            echo "claude-sonnet-4-20250514" ;;
    esac
}

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# ─────────────────────────────────────────────────────────────────────────────
# PARSE ARGUMENTS
# ─────────────────────────────────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
    case $1 in
        --wave)
            WAVE_NUMBER="$2"
            shift 2
            ;;
        --project)
            PROJECT_ROOT="$2"
            SIGNAL_DIR="${PROJECT_ROOT}/.claude"
            STORIES_DIR="${PROJECT_ROOT}/stories/wave${WAVE_NUMBER}"
            shift 2
            ;;
        --story)
            SPECIFIC_STORY="$2"
            shift 2
            ;;
        *)
            shift
            ;;
    esac
done

# ─────────────────────────────────────────────────────────────────────────────
# LOGGING
# ─────────────────────────────────────────────────────────────────────────────
log() {
    echo -e "[$(TZ=Asia/Jerusalem date '+%H:%M:%S')] ${CYAN}[DISPATCHER]${NC} $1"
}

log_success() {
    echo -e "[$(TZ=Asia/Jerusalem date '+%H:%M:%S')] ${GREEN}[DISPATCHER]${NC} $1"
}

log_error() {
    echo -e "[$(TZ=Asia/Jerusalem date '+%H:%M:%S')] ${RED}[DISPATCHER]${NC} $1"
}

# ─────────────────────────────────────────────────────────────────────────────
# LOAD STORIES
# ─────────────────────────────────────────────────────────────────────────────
load_stories() {
    local stories=()

    if [ -n "$SPECIFIC_STORY" ]; then
        # Load specific story
        stories+=("$SPECIFIC_STORY")
    elif [ -f "$SIGNAL_DIR/P.json" ]; then
        # Load from P.json wave_state
        if command -v jq &> /dev/null; then
            while IFS= read -r story; do
                stories+=("${story%.json}")
            done < <(jq -r '.wave_state.stories[]?' "$SIGNAL_DIR/P.json" 2>/dev/null)
        fi
    fi

    # Fallback: scan stories directory
    if [ ${#stories[@]} -eq 0 ] && [ -d "$STORIES_DIR" ]; then
        for story_file in "$STORIES_DIR"/WAVE*.json; do
            if [ -f "$story_file" ]; then
                stories+=("$(basename "${story_file%.json}")")
            fi
        done
    fi

    echo "${stories[@]}"
}

# ─────────────────────────────────────────────────────────────────────────────
# DETERMINE AGENT FOR STORY
# ─────────────────────────────────────────────────────────────────────────────
get_agent_for_story() {
    local story_id="$1"
    local story_file="$STORIES_DIR/${story_id}.json"
    local domain="fe"  # default

    if [ -f "$story_file" ] && command -v jq &> /dev/null; then
        domain=$(jq -r '.domain // "fe"' "$story_file" 2>/dev/null)
    fi

    case "$domain" in
        fe|frontend)
            # Round-robin FE agents
            if [ ! -f "/tmp/wave-fe-agent-toggle" ]; then
                echo "1" > /tmp/wave-fe-agent-toggle
                echo "fe-dev-1"
            else
                local toggle=$(cat /tmp/wave-fe-agent-toggle)
                if [ "$toggle" = "1" ]; then
                    echo "2" > /tmp/wave-fe-agent-toggle
                    echo "fe-dev-2"
                else
                    echo "1" > /tmp/wave-fe-agent-toggle
                    echo "fe-dev-1"
                fi
            fi
            ;;
        be|backend)
            # Round-robin BE agents
            if [ ! -f "/tmp/wave-be-agent-toggle" ]; then
                echo "1" > /tmp/wave-be-agent-toggle
                echo "be-dev-1"
            else
                local toggle=$(cat /tmp/wave-be-agent-toggle)
                if [ "$toggle" = "1" ]; then
                    echo "2" > /tmp/wave-be-agent-toggle
                    echo "be-dev-2"
                else
                    echo "1" > /tmp/wave-be-agent-toggle
                    echo "be-dev-1"
                fi
            fi
            ;;
        *)
            echo "fe-dev-1"
            ;;
    esac
}

# ─────────────────────────────────────────────────────────────────────────────
# CREATE ASSIGNMENT SIGNAL
# ─────────────────────────────────────────────────────────────────────────────
create_assignment() {
    local agent="$1"
    local story_id="$2"
    local story_file="$STORIES_DIR/${story_id}.json"
    local assignment_file="$SIGNAL_DIR/signal-${agent}-assignment.json"
    local model=$(get_model_for_agent "$agent")

    # Read story details
    local story_title="Unknown"
    local story_desc=""
    if [ -f "$story_file" ] && command -v jq &> /dev/null; then
        story_title=$(jq -r '.title // "Unknown"' "$story_file" 2>/dev/null)
        story_desc=$(jq -r '.description // ""' "$story_file" 2>/dev/null)
    fi

    # Create assignment signal
    cat > "$assignment_file" << EOF
{
    "agent": "$agent",
    "wave": $WAVE_NUMBER,
    "assignment_type": "story",
    "stories": ["$story_id"],
    "story_details": {
        "id": "$story_id",
        "title": "$story_title",
        "description": "$story_desc",
        "file": "$story_file"
    },
    "model": "$model",
    "gate": 4,
    "gate_name": "Develop",
    "project": "$PROJECT_ROOT",
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "dispatched_by": "work-dispatcher"
}
EOF

    log_success "Created assignment: $agent -> $story_id (Model: $model)"

    # Send Slack notification if available
    if [ -f "/Volumes/SSD-01/Projects/WAVE/core/scripts/lib/slack-notify.sh" ]; then
        source /Volumes/SSD-01/Projects/WAVE/core/scripts/lib/slack-notify.sh 2>/dev/null || true
        if type slack_story_start &>/dev/null; then
            local project_name="footprint"
            if [ -f "$SIGNAL_DIR/P.json" ] && command -v jq &>/dev/null; then
                project_name=$(jq -r '.meta.project_name // "project"' "$SIGNAL_DIR/P.json" 2>/dev/null)
            fi
            slack_story_start "$story_id" "$story_title" "$agent" "$WAVE_NUMBER" "$model" "$project_name" "4" "Develop" 2>/dev/null || true
        fi
    fi
}

# ─────────────────────────────────────────────────────────────────────────────
# DISPATCH WAVE
# ─────────────────────────────────────────────────────────────────────────────
dispatch_wave() {
    log "═══════════════════════════════════════════════════════════════════"
    log "  WAVE WORK DISPATCHER - Wave $WAVE_NUMBER"
    log "═══════════════════════════════════════════════════════════════════"
    log "Project: $PROJECT_ROOT"
    log "Stories: $STORIES_DIR"
    log "Signals: $SIGNAL_DIR"
    log "═══════════════════════════════════════════════════════════════════"

    # Check for wave-start signal
    local wave_start_signal="$SIGNAL_DIR/signal-wave${WAVE_NUMBER}-start.json"
    if [ ! -f "$wave_start_signal" ]; then
        log_error "No wave-start signal found: $wave_start_signal"
        log "Creating wave-start signal..."
        cat > "$wave_start_signal" << EOF
{
    "signal": "wave-start",
    "wave": $WAVE_NUMBER,
    "triggered_by": "work-dispatcher",
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF
    fi

    # Load stories
    local stories=$(load_stories)
    if [ -z "$stories" ]; then
        log_error "No stories found for Wave $WAVE_NUMBER"
        return 1
    fi

    log "Found stories: $stories"

    # Create dispatch tracking signal
    cat > "$SIGNAL_DIR/signal-wave${WAVE_NUMBER}-dispatch.json" << EOF
{
    "wave": $WAVE_NUMBER,
    "status": "DISPATCHING",
    "stories": [$(echo "$stories" | tr ' ' '\n' | sed 's/^/"/;s/$/"/' | tr '\n' ',' | sed 's/,$//')],
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF

    # Dispatch each story to appropriate agent
    local dispatched=0
    for story_id in $stories; do
        local agent=$(get_agent_for_story "$story_id")
        create_assignment "$agent" "$story_id"
        ((dispatched++))
    done

    # Update dispatch signal
    cat > "$SIGNAL_DIR/signal-wave${WAVE_NUMBER}-dispatch.json" << EOF
{
    "wave": $WAVE_NUMBER,
    "status": "DISPATCHED",
    "stories_count": $dispatched,
    "stories": [$(echo "$stories" | tr ' ' '\n' | sed 's/^/"/;s/$/"/' | tr '\n' ',' | sed 's/,$//')],
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF

    log_success "═══════════════════════════════════════════════════════════════════"
    log_success "  Dispatched $dispatched stories for Wave $WAVE_NUMBER"
    log_success "═══════════════════════════════════════════════════════════════════"

    return 0
}

# ─────────────────────────────────────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────────────────────────────────────
dispatch_wave
