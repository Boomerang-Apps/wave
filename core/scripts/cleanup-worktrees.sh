#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# WAVE WORKTREE CLEANUP
# ═══════════════════════════════════════════════════════════════════════════════
#
# Remove Git worktrees for a project
#
# USAGE:
#   ./cleanup-worktrees.sh [--project /path/to/project] [--delete-branches]
#
# ═══════════════════════════════════════════════════════════════════════════════

set -e

PROJECT_ROOT="${1:-$(pwd)}"
DELETE_BRANCHES=false

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --project)
            PROJECT_ROOT="$2"
            shift 2
            ;;
        --delete-branches)
            DELETE_BRANCHES=true
            shift
            ;;
        *)
            shift
            ;;
    esac
done

# Check if in a git repo
if [ ! -d "$PROJECT_ROOT/.git" ]; then
    echo "Error: Not a git repository: $PROJECT_ROOT"
    exit 1
fi

cd "$PROJECT_ROOT"

echo "Cleaning up worktrees in: $PROJECT_ROOT"

# Agents to clean up
AGENTS=("fe-dev" "be-dev" "qa" "dev-fix")

for agent in "${AGENTS[@]}"; do
    WORKTREE_PATH="$PROJECT_ROOT/worktrees/$agent"
    BRANCH_NAME="feature/$agent"

    echo ""
    echo "Cleaning: $agent"

    # Remove worktree if it exists
    if [ -d "$WORKTREE_PATH" ]; then
        echo "  Removing worktree: $WORKTREE_PATH"
        git worktree remove "$WORKTREE_PATH" --force 2>/dev/null || rm -rf "$WORKTREE_PATH"
    fi

    # Delete branch if requested
    if [ "$DELETE_BRANCHES" = true ]; then
        if git show-ref --verify --quiet "refs/heads/$BRANCH_NAME"; then
            echo "  Deleting branch: $BRANCH_NAME"
            git branch -D "$BRANCH_NAME" 2>/dev/null || true
        fi
    fi

    echo "  Done: $agent"
done

# Prune worktree references
git worktree prune

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "Cleanup complete"
git worktree list
echo "════════════════════════════════════════════════════════════════"
