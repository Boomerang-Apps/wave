#!/bin/bash
# Wave V2 Hook: Story Schema Validation (Project-Agnostic)
# Validates story JSON files against Schema V4.1

set -e

# Load configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/config.sh"

FILE="$1"

# Skip if not a story file
if ! echo "$FILE" | grep -qE "${STORIES_DIR}/.*\.json$"; then
    exit 0
fi

# Check if file exists
if [ ! -f "$FILE" ]; then
    exit 0
fi

echo "Validating story: $FILE"

# Required fields for Schema V4.1
REQUIRED_FIELDS=(
    "id"
    "title"
    "epic"
    "wave"
    "priority"
    "storyPoints"
    "agent"
    "domain"
    "dal"
    "description"
    "acceptanceCriteria"
    "researchValidation"
)

# Check each required field
MISSING_FIELDS=()
for field in "${REQUIRED_FIELDS[@]}"; do
    if ! grep -q "\"$field\"" "$FILE"; then
        MISSING_FIELDS+=("$field")
    fi
done

if [ ${#MISSING_FIELDS[@]} -gt 0 ]; then
    echo ""
    echo "=============================================="
    echo "  SCHEMA VALIDATION: Missing Fields"
    echo "=============================================="
    echo ""
    echo "  File: $FILE"
    echo ""
    echo "  Missing fields:"
    for field in "${MISSING_FIELDS[@]}"; do
        echo "    - $field"
    done
    echo ""
    echo "  Run: /schema-validate story {ID}"
    echo ""
    echo "=============================================="
    exit 1
fi

# Check EARS format in acceptance criteria
if ! grep -qE "WHEN.*THEN" "$FILE"; then
    echo ""
    echo "=============================================="
    echo "  SCHEMA VALIDATION: EARS Format Warning"
    echo "=============================================="
    echo ""
    echo "  File: $FILE"
    echo "  Warning: No EARS format found in ACs"
    echo "  Expected: WHEN {trigger} THEN {behavior}"
    echo ""
    echo "=============================================="
fi

# Check research validation status
if grep -q '"researchValidation"' "$FILE"; then
    if grep -q '"status":\s*"pending"' "$FILE"; then
        echo "Warning: Research validation pending for $FILE"
    fi
fi

echo "Story validation passed: $FILE"
exit 0
