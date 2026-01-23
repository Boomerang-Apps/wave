#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# WAVE TERMINAL SETUP
# ═══════════════════════════════════════════════════════════════════════════════
# Sets up a tmux session with organized panes for WAVE development
#
# USAGE:
#   ./wave-terminal.sh --project /path/to/project [--wave 1]
#   ./wave-terminal.sh -p /path/to/project -w 2
#
# LAYOUT:
#   ┌─────────────────────┬─────────────────────┐
#   │                     │                     │
#   │   MERGE WATCHER     │   FE-DEV AGENT      │
#   │   (auto-starts)     │   (ready)           │
#   │                     │                     │
#   ├─────────────────────┼─────────────────────┤
#   │                     │                     │
#   │   PORTAL SERVER     │   BE-DEV AGENT      │
#   │   (auto-starts)     │   (ready)           │
#   │                     │                     │
#   └─────────────────────┴─────────────────────┘
#
# KEYBINDINGS (Ctrl+b prefix):
#   Ctrl+b arrow  - Navigate between panes
#   Ctrl+b d      - Detach (session keeps running)
#   Ctrl+b z      - Zoom current pane (toggle fullscreen)
#   Ctrl+b x      - Kill current pane
#
# REATTACH:
#   tmux attach -t wave
#
# ═══════════════════════════════════════════════════════════════════════════════

set -euo pipefail

# ─────────────────────────────────────────────────────────────────────────────
# ARGUMENT PARSING
# ─────────────────────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WAVE_ROOT="${WAVE_ROOT:-$(dirname $(dirname "$SCRIPT_DIR"))}"

show_usage() {
    echo "WAVE Terminal Setup"
    echo ""
    echo "Usage: $0 --project <path> [options]"
    echo ""
    echo "Required:"
    echo "  -p, --project <path>    Path to the project"
    echo ""
    echo "Options:"
    echo "  -w, --wave <number>     Wave number (default: 1)"
    echo "  -n, --name <name>       Session name (default: wave)"
    echo "  --no-watcher            Don't auto-start merge-watcher"
    echo "  --no-portal             Don't auto-start portal"
    echo "  -h, --help              Show this help"
    echo ""
    echo "Examples:"
    echo "  $0 -p /path/to/my-app"
    echo "  $0 -p /path/to/my-app -w 3"
    echo "  $0 -p /path/to/my-app --no-portal"
}

PROJECT_ROOT=""
WAVE="${WAVE:-1}"
SESSION_NAME="wave"
START_WATCHER=true
START_PORTAL=true

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
        -n|--name)
            SESSION_NAME="$2"
            shift 2
            ;;
        --no-watcher)
            START_WATCHER=false
            shift
            ;;
        --no-portal)
            START_PORTAL=false
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

if [ -z "$PROJECT_ROOT" ]; then
    echo "Error: --project is required"
    show_usage
    exit 1
fi

if [ ! -d "$PROJECT_ROOT" ]; then
    echo "Error: Project directory not found: $PROJECT_ROOT"
    exit 1
fi

# Convert to absolute path
PROJECT_ROOT="$(cd "$PROJECT_ROOT" && pwd)"
PROJECT_NAME=$(basename "$PROJECT_ROOT")

# ─────────────────────────────────────────────────────────────────────────────
# CHECK DEPENDENCIES
# ─────────────────────────────────────────────────────────────────────────────
if ! command -v tmux &> /dev/null; then
    echo "Error: tmux is not installed"
    echo ""
    echo "Install with:"
    echo "  macOS:  brew install tmux"
    echo "  Ubuntu: sudo apt install tmux"
    exit 1
fi

# ─────────────────────────────────────────────────────────────────────────────
# CHECK FOR EXISTING SESSION
# ─────────────────────────────────────────────────────────────────────────────
if tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
    echo "Session '$SESSION_NAME' already exists."
    echo ""
    read -p "Attach to existing session? [Y/n] " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Nn]$ ]]; then
        read -p "Kill existing session and create new? [y/N] " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            tmux kill-session -t "$SESSION_NAME"
        else
            exit 0
        fi
    else
        tmux attach -t "$SESSION_NAME"
        exit 0
    fi
fi

# ─────────────────────────────────────────────────────────────────────────────
# CREATE SESSION
# ─────────────────────────────────────────────────────────────────────────────
echo "Creating WAVE terminal session..."
echo "  Project: $PROJECT_ROOT"
echo "  Wave: $WAVE"
echo "  Session: $SESSION_NAME"
echo ""

# Create session with first window (merge-watcher)
tmux new-session -d -s "$SESSION_NAME" -n "wave$WAVE" -c "$PROJECT_ROOT"

# Split into 4 panes
# Start with one pane, split right, then split each horizontally
tmux split-window -h -t "$SESSION_NAME:0" -c "$PROJECT_ROOT"
tmux split-window -v -t "$SESSION_NAME:0.0" -c "$PROJECT_ROOT"
tmux split-window -v -t "$SESSION_NAME:0.2" -c "$PROJECT_ROOT"

# ─────────────────────────────────────────────────────────────────────────────
# CONFIGURE PANES
# ─────────────────────────────────────────────────────────────────────────────

# Pane 0 (top-left): Merge Watcher
tmux select-pane -t "$SESSION_NAME:0.0"
tmux send-keys -t "$SESSION_NAME:0.0" "# MERGE WATCHER - Wave $WAVE" Enter
tmux send-keys -t "$SESSION_NAME:0.0" "cd '$PROJECT_ROOT'" Enter
if [ "$START_WATCHER" = true ]; then
    tmux send-keys -t "$SESSION_NAME:0.0" "'$WAVE_ROOT/core/scripts/merge-watcher-v12.sh' --project '$PROJECT_ROOT' --wave $WAVE" Enter
else
    tmux send-keys -t "$SESSION_NAME:0.0" "# Run: $WAVE_ROOT/core/scripts/merge-watcher-v12.sh --project '$PROJECT_ROOT' --wave $WAVE"
fi

# Pane 1 (bottom-left): Portal Server
tmux select-pane -t "$SESSION_NAME:0.1"
tmux send-keys -t "$SESSION_NAME:0.1" "# PORTAL SERVER" Enter
tmux send-keys -t "$SESSION_NAME:0.1" "cd '$WAVE_ROOT/portal'" Enter
if [ "$START_PORTAL" = true ]; then
    tmux send-keys -t "$SESSION_NAME:0.1" "npm run dev" Enter
else
    tmux send-keys -t "$SESSION_NAME:0.1" "# Run: npm run dev"
fi

# Pane 2 (top-right): FE-Dev Agent
FE_WORKTREE="$PROJECT_ROOT/worktrees/fe-dev"
tmux select-pane -t "$SESSION_NAME:0.2"
tmux send-keys -t "$SESSION_NAME:0.2" "# FE-DEV AGENT - Ready for Claude" Enter
if [ -d "$FE_WORKTREE" ]; then
    tmux send-keys -t "$SESSION_NAME:0.2" "cd '$FE_WORKTREE'" Enter
else
    tmux send-keys -t "$SESSION_NAME:0.2" "cd '$PROJECT_ROOT'" Enter
    tmux send-keys -t "$SESSION_NAME:0.2" "# Worktree not found: $FE_WORKTREE"
fi
tmux send-keys -t "$SESSION_NAME:0.2" "# Run: claude --dangerously-skip-permissions"

# Pane 3 (bottom-right): BE-Dev Agent
BE_WORKTREE="$PROJECT_ROOT/worktrees/be-dev"
tmux select-pane -t "$SESSION_NAME:0.3"
tmux send-keys -t "$SESSION_NAME:0.3" "# BE-DEV AGENT - Ready for Claude" Enter
if [ -d "$BE_WORKTREE" ]; then
    tmux send-keys -t "$SESSION_NAME:0.3" "cd '$BE_WORKTREE'" Enter
else
    tmux send-keys -t "$SESSION_NAME:0.3" "cd '$PROJECT_ROOT'" Enter
    tmux send-keys -t "$SESSION_NAME:0.3" "# Worktree not found: $BE_WORKTREE"
fi
tmux send-keys -t "$SESSION_NAME:0.3" "# Run: claude --dangerously-skip-permissions"

# ─────────────────────────────────────────────────────────────────────────────
# SELECT STARTING PANE AND ATTACH
# ─────────────────────────────────────────────────────────────────────────────
tmux select-pane -t "$SESSION_NAME:0.0"

echo "Session created! Attaching..."
echo ""
echo "Quick reference:"
echo "  Ctrl+b arrow  - Navigate panes"
echo "  Ctrl+b d      - Detach (keeps running)"
echo "  Ctrl+b z      - Zoom pane"
echo "  tmux attach -t $SESSION_NAME  - Reattach"
echo ""

tmux attach -t "$SESSION_NAME"
