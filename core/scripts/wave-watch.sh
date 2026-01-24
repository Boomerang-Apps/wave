#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# WAVE FRAMEWORK - Unified Watch Command
# ═══════════════════════════════════════════════════════════════════════════════
# Central command for all WAVE monitoring capabilities.
#
# Usage:
#   wave-watch <command> [PROJECT_PATH] [options]
#
# Commands:
#   signals       Watch signal files (agent events, gate transitions)
#   heartbeats    Monitor agent heartbeats with health checks
#   files         Generic filesystem watcher
#   all           Combined monitoring (signals + heartbeats)
#   status        One-time status check of all agents
#
# Examples:
#   wave-watch signals /path/to/project --slack
#   wave-watch heartbeats --timeout=60 --auto-restart
#   wave-watch all . --json
#   wave-watch status
#
# ═══════════════════════════════════════════════════════════════════════════════

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VERSION="1.0.0"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# ─────────────────────────────────────────────────────────────────────────────
# HELP
# ─────────────────────────────────────────────────────────────────────────────

show_help() {
    cat << EOF
${BOLD}WAVE Watch${NC} - Unified monitoring for WAVE Framework
Version: $VERSION

${BOLD}Usage:${NC}
  wave-watch <command> [PROJECT_PATH] [options]

${BOLD}Commands:${NC}
  ${GREEN}signals${NC}      Watch signal files for agent events
  ${GREEN}heartbeats${NC}   Monitor agent heartbeats with health alerts
  ${GREEN}files${NC}        Generic filesystem watcher for any path
  ${GREEN}all${NC}          Combined signal and heartbeat monitoring
  ${GREEN}status${NC}       One-time health check of all agents

${BOLD}Common Options:${NC}
  --slack         Enable Slack notifications
  --json          Output events as JSON (for piping)
  --daemon        Run as background daemon

${BOLD}Signal Watcher Options:${NC}
  --callback=SCRIPT   Custom callback script for events
  --log-file=PATH     Log events to file

${BOLD}Heartbeat Monitor Options:${NC}
  --timeout=SEC       Stuck threshold (default: 120)
  --warning=SEC       Warning threshold (default: 60)
  --check-interval=SEC Health check interval (default: 30)
  --auto-restart      Automatically restart stuck agents
  --agents=LIST       Comma-separated agents to monitor

${BOLD}File Watcher Options:${NC}
  --pattern=GLOB      Filter files (e.g., "*.json")
  --events=TYPES      Event types: create,modify,delete
  --debounce=MS       Debounce interval (default: 100)

${BOLD}Examples:${NC}
  # Watch all signals with Slack alerts
  wave-watch signals /path/to/project --slack

  # Monitor heartbeats with auto-restart
  wave-watch heartbeats . --timeout=60 --auto-restart

  # Combined monitoring with JSON output
  wave-watch all . --json | tee events.jsonl

  # Quick status check
  wave-watch status

  # Watch custom directory for JSON changes
  wave-watch files /path/to/dir --pattern="*.json" --events=create,modify

EOF
}

# ─────────────────────────────────────────────────────────────────────────────
# HEADER
# ─────────────────────────────────────────────────────────────────────────────

show_header() {
    local mode="$1"
    echo ""
    echo -e "${CYAN}╔═══════════════════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║${NC}                        ${BOLD}WAVE Watch${NC} - $mode                              ${CYAN}║${NC}"
    echo -e "${CYAN}╚═══════════════════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

# ─────────────────────────────────────────────────────────────────────────────
# COMMANDS
# ─────────────────────────────────────────────────────────────────────────────

cmd_signals() {
    local project_path="${1:-.}"
    shift 2>/dev/null || true

    if [[ ! -x "$SCRIPT_DIR/signal-watcher.sh" ]]; then
        echo -e "${RED}Error: signal-watcher.sh not found${NC}" >&2
        exit 1
    fi

    exec "$SCRIPT_DIR/signal-watcher.sh" "$project_path" "$@"
}

cmd_heartbeats() {
    local project_path="${1:-.}"
    shift 2>/dev/null || true

    if [[ ! -x "$SCRIPT_DIR/heartbeat-monitor.sh" ]]; then
        echo -e "${RED}Error: heartbeat-monitor.sh not found${NC}" >&2
        exit 1
    fi

    exec "$SCRIPT_DIR/heartbeat-monitor.sh" "$project_path" "$@"
}

cmd_files() {
    local watch_path="${1:-.}"
    shift 2>/dev/null || true

    if [[ ! -x "$SCRIPT_DIR/fs-watcher.sh" ]]; then
        echo -e "${RED}Error: fs-watcher.sh not found${NC}" >&2
        exit 1
    fi

    exec "$SCRIPT_DIR/fs-watcher.sh" "$watch_path" "$@"
}

cmd_all() {
    local project_path="${1:-.}"
    shift 2>/dev/null || true

    project_path="$(cd "$project_path" 2>/dev/null && pwd)" || {
        echo -e "${RED}Error: Invalid project path${NC}" >&2
        exit 1
    }

    local claude_dir="$project_path/.claude"
    mkdir -p "$claude_dir/heartbeats"

    # Parse common options
    local slack_flag=""
    local json_flag=""
    local remaining_args=()

    for arg in "$@"; do
        case "$arg" in
            --slack) slack_flag="--slack" ;;
            --json) json_flag="--json" ;;
            *) remaining_args+=("$arg") ;;
        esac
    done

    # Check if JSON mode
    if [[ -n "$json_flag" ]]; then
        # In JSON mode, run both watchers and merge output
        {
            "$SCRIPT_DIR/signal-watcher.sh" "$project_path" --json $slack_flag "${remaining_args[@]}" 2>/dev/null &
            SIGNAL_PID=$!

            "$SCRIPT_DIR/heartbeat-monitor.sh" "$project_path" --json $slack_flag "${remaining_args[@]}" 2>/dev/null &
            HEARTBEAT_PID=$!

            trap "kill $SIGNAL_PID $HEARTBEAT_PID 2>/dev/null; exit 0" SIGINT SIGTERM
            wait
        }
    else
        # Terminal UI mode - use tmux if available, otherwise sequential
        if command -v tmux &> /dev/null && [[ -z "$TMUX" ]]; then
            show_header "Combined Mode (tmux)"
            echo "  Starting signal watcher and heartbeat monitor in split panes..."
            echo "  Press Ctrl+B then D to detach, Ctrl+C to stop"
            echo ""

            tmux new-session -d -s wave-watch \
                "$SCRIPT_DIR/signal-watcher.sh" "$project_path" $slack_flag "${remaining_args[@]}"
            tmux split-window -h \
                "$SCRIPT_DIR/heartbeat-monitor.sh" "$project_path" $slack_flag "${remaining_args[@]}"
            tmux attach-session -t wave-watch
        else
            show_header "Combined Mode"
            echo "  Running signal watcher and heartbeat monitor..."
            echo "  (For split view, install tmux: brew install tmux)"
            echo ""

            # Run both in background, forward output
            "$SCRIPT_DIR/signal-watcher.sh" "$project_path" $slack_flag "${remaining_args[@]}" 2>&1 | sed 's/^/[SIGNAL] /' &
            SIGNAL_PID=$!

            "$SCRIPT_DIR/heartbeat-monitor.sh" "$project_path" $slack_flag "${remaining_args[@]}" 2>&1 | sed 's/^/[HEARTBEAT] /' &
            HEARTBEAT_PID=$!

            trap "kill $SIGNAL_PID $HEARTBEAT_PID 2>/dev/null; exit 0" SIGINT SIGTERM
            wait
        fi
    fi
}

cmd_status() {
    local project_path="${1:-.}"
    shift 2>/dev/null || true

    project_path="$(cd "$project_path" 2>/dev/null && pwd)" || {
        echo -e "${RED}Error: Invalid project path${NC}" >&2
        exit 1
    }

    # Use agent-watchdog for one-time status check
    if [[ -x "$SCRIPT_DIR/agent-watchdog.sh" ]]; then
        exec "$SCRIPT_DIR/agent-watchdog.sh" "$project_path" "$@"
    else
        echo -e "${RED}Error: agent-watchdog.sh not found${NC}" >&2
        exit 1
    fi
}

# ─────────────────────────────────────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────────────────────────────────────

main() {
    local command="${1:-help}"

    case "$command" in
        signals|signal)
            shift
            cmd_signals "$@"
            ;;
        heartbeats|heartbeat|hb)
            shift
            cmd_heartbeats "$@"
            ;;
        files|file|fs)
            shift
            cmd_files "$@"
            ;;
        all|combined)
            shift
            cmd_all "$@"
            ;;
        status|check)
            shift
            cmd_status "$@"
            ;;
        help|--help|-h)
            show_help
            ;;
        version|--version|-v)
            echo "wave-watch version $VERSION"
            ;;
        *)
            echo -e "${RED}Unknown command: $command${NC}" >&2
            echo "Run 'wave-watch help' for usage information." >&2
            exit 1
            ;;
    esac
}

main "$@"
