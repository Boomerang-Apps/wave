#!/bin/bash
# Wave V2 Hook: Gate Enforcement (Project-Agnostic)
# Blocks merges/pushes to main without gate approval

set -e

# Load configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/config.sh"

STORY_ID="${STORY_ID:-}"

# Extract story ID from branch name if not set
if [ -z "$STORY_ID" ]; then
    BRANCH=$(git branch --show-current 2>/dev/null || echo "")
    STORY_ID=$(echo "$BRANCH" | grep -oE '[A-Z]+-[A-Z]+-[0-9]+' || echo "")
fi

# Check if pushing to main or develop
if echo "$@" | grep -qE "origin (main|develop|master)"; then
    if [ -z "$STORY_ID" ]; then
        echo "WARNING: Could not determine story ID. Ensure gates are passed."
        exit 0
    fi

    # Check for Gate 7 (merge authorization)
    GATE7_SIGNAL="$SIGNALS_DIR/signal-${STORY_ID}-gate7-passed.json"

    if [ ! -f "$GATE7_SIGNAL" ]; then
        echo ""
        echo "=============================================="
        echo "  GATE ENFORCEMENT: Push Blocked"
        echo "=============================================="
        echo ""
        echo "  Story: $STORY_ID"
        echo "  Required: Gate 7 (Merge Authorization)"
        echo "  Status: NOT PASSED"
        echo ""
        echo "  Signal expected: $GATE7_SIGNAL"
        echo ""
        echo "  Run: /gate-7 story $STORY_ID"
        echo ""
        echo "=============================================="
        exit 1
    fi

    echo "Gate 7 verified for $STORY_ID"
fi

exit 0
