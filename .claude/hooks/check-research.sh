#!/bin/bash
# Wave V2 Hook: Research Validation Check (Project-Agnostic)
# Ensures research is validated before Gate 0

set -e

# Load configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/config.sh"

STORY_ID="$1"

# If no story ID, try to get from current context
if [ -z "$STORY_ID" ]; then
    echo "No story ID provided"
    exit 0
fi

# Find story file in configured stories directory
STORY_FILE=$(find "$STORIES_DIR" -name "${STORY_ID}.json" 2>/dev/null | head -1)

if [ -z "$STORY_FILE" ] || [ ! -f "$STORY_FILE" ]; then
    echo "Story file not found: $STORY_ID in $STORIES_DIR"
    exit 0
fi

echo "Checking research validation for: $STORY_ID"

# Check if researchValidation exists
if ! grep -q '"researchValidation"' "$STORY_FILE"; then
    echo ""
    echo "=============================================="
    echo "  RESEARCH VALIDATION: Missing"
    echo "=============================================="
    echo ""
    echo "  Story: $STORY_ID"
    echo "  File: $STORY_FILE"
    echo ""
    echo "  Schema V4.1 requires researchValidation field"
    echo ""
    echo "  Run: /research story $STORY_ID"
    echo ""
    echo "=============================================="
    exit 1
fi

# Check research status
STATUS=$(grep -oE '"status":\s*"[^"]*"' "$STORY_FILE" | head -1 | grep -oE '"[^"]*"$' | tr -d '"')

if [ "$STATUS" = "pending" ] || [ -z "$STATUS" ]; then
    echo ""
    echo "=============================================="
    echo "  RESEARCH VALIDATION: Pending"
    echo "=============================================="
    echo ""
    echo "  Story: $STORY_ID"
    echo "  Status: ${STATUS:-not set}"
    echo ""
    echo "  Research must be validated before Gate 0"
    echo ""
    echo "  Run: /research story $STORY_ID"
    echo ""
    echo "=============================================="
    exit 1
fi

# Check for high-credibility sources
if ! grep -q '"credibility":\s*"high"' "$STORY_FILE"; then
    echo ""
    echo "=============================================="
    echo "  RESEARCH VALIDATION: Warning"
    echo "=============================================="
    echo ""
    echo "  Story: $STORY_ID"
    echo "  Warning: No high-credibility sources found"
    echo ""
    echo "  Recommended: At least 1 high-credibility source"
    echo "  Types: official-documentation, industry-standard"
    echo ""
    echo "=============================================="
fi

echo "Research validation passed for $STORY_ID"
exit 0
