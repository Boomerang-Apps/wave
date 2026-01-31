#!/bin/bash
# Wave V2 Hook: Branch Naming Validation
# Enforces feature/EPIC-TYPE-NNN naming convention

set -e

BRANCH_NAME="$1"

# Skip if no branch name provided
if [ -z "$BRANCH_NAME" ]; then
    exit 0
fi

# Allowed patterns
# - feature/EPIC-TYPE-NNN (e.g., feature/AUTH-BE-001)
# - workspace/* (agent workspaces)
# - main, develop (protected branches)

if echo "$BRANCH_NAME" | grep -qE "^(feature/[A-Z]+-[A-Z]+-[0-9]{3}|workspace/[a-z-]+|main|develop)$"; then
    echo "Branch name valid: $BRANCH_NAME"
    exit 0
fi

echo ""
echo "=============================================="
echo "  BRANCH NAMING: Invalid Branch Name"
echo "=============================================="
echo ""
echo "  Provided: $BRANCH_NAME"
echo ""
echo "  Valid patterns:"
echo "    - feature/AUTH-BE-001"
echo "    - feature/PROF-FE-002"
echo "    - workspace/be-dev"
echo ""
echo "  Format: feature/{EPIC}-{TYPE}-{NNN}"
echo "    EPIC: AUTH, PROF, PROJ, PROP, PAY, MSG"
echo "    TYPE: BE, FE, INT"
echo "    NNN:  001-999"
echo ""
echo "=============================================="
exit 1
