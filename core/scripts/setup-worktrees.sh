#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# WAVE WORKTREE SETUP - 7 AGENTS
# ═══════════════════════════════════════════════════════════════════════════════
#
# Set up Git worktrees for isolated agent development
#
# WORKTREES:
#   fe-dev-1 → feature/fe-dev-1 (Wave 1 Frontend)
#   fe-dev-2 → feature/fe-dev-2 (Wave 2 Frontend)
#   be-dev-1 → feature/be-dev-1 (Wave 1 Backend)
#   be-dev-2 → feature/be-dev-2 (Wave 2 Backend)
#   qa       → feature/qa (QA Validation)
#   dev-fix  → feature/dev-fix (Bug Fixes)
#
# USAGE:
#   ./setup-worktrees.sh [--project /path/to/project]
#
# ═══════════════════════════════════════════════════════════════════════════════

set -e

PROJECT_ROOT="${1:-$(pwd)}"

# Parse --project argument
while [[ $# -gt 0 ]]; do
    case $1 in
        --project)
            PROJECT_ROOT="$2"
            shift 2
            ;;
        *)
            if [ -z "$PROJECT_ROOT" ] || [ "$PROJECT_ROOT" = "$(pwd)" ]; then
                PROJECT_ROOT="$1"
            fi
            shift
            ;;
    esac
done

# Check if in a git repo
if [ ! -d "$PROJECT_ROOT/.git" ]; then
    echo "Error: Not a git repository: $PROJECT_ROOT"
    echo "Run 'git init' first"
    exit 1
fi

cd "$PROJECT_ROOT"

echo "════════════════════════════════════════════════════════════════"
echo "  WAVE WORKTREE SETUP - 7 AGENTS"
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "  Project: $PROJECT_ROOT"
echo ""

# Get current branch
MAIN_BRANCH=$(git rev-parse --abbrev-ref HEAD)
echo "  Main branch: $MAIN_BRANCH"
echo ""

# Create worktrees directory
mkdir -p worktrees

# Agents to create worktrees for (7 agents)
AGENTS=("fe-dev-1" "fe-dev-2" "be-dev-1" "be-dev-2" "qa" "dev-fix")

for agent in "${AGENTS[@]}"; do
    WORKTREE_PATH="$PROJECT_ROOT/worktrees/$agent"
    BRANCH_NAME="feature/$agent"

    echo "Setting up: $agent"

    # Skip if worktree already exists
    if [ -d "$WORKTREE_PATH" ]; then
        echo "  Already exists: $WORKTREE_PATH"
        continue
    fi

    # Create branch if it doesn't exist
    if ! git show-ref --verify --quiet "refs/heads/$BRANCH_NAME"; then
        echo "  Creating branch: $BRANCH_NAME"
        git branch "$BRANCH_NAME"
    fi

    # Create worktree
    echo "  Creating worktree: $WORKTREE_PATH"
    git worktree add "$WORKTREE_PATH" "$BRANCH_NAME"

    echo "  Done: $agent -> $BRANCH_NAME"
    echo ""
done

echo "════════════════════════════════════════════════════════════════"
echo "  WORKTREES CREATED"
echo "════════════════════════════════════════════════════════════════"
git worktree list
echo ""
echo "  Wave 1: fe-dev-1, be-dev-1"
echo "  Wave 2: fe-dev-2, be-dev-2"
echo "  QA:     qa"
echo "  Retry:  dev-fix"
echo "════════════════════════════════════════════════════════════════"
