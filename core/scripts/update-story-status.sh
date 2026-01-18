#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# WAVE FRAMEWORK - Update Story Status Script
# ═══════════════════════════════════════════════════════════════════════════════
#
# Updates story status in Supabase maf_stories table.
#
# Usage: ./update-story-status.sh <story_id> <new_status> [agent_id]
# Example: ./update-story-status.sh WAVE1-FE-001 in_progress fe-dev-1
#
# Valid statuses:
#   - backlog      : Story not yet started
#   - ready        : Story ready for execution
#   - in_progress  : Agent working on story
#   - dev_complete : Development finished
#   - qa_review    : QA validation in progress
#   - completed    : Story fully complete
#   - failed       : Story failed
#   - blocked      : Story blocked
#
# ═══════════════════════════════════════════════════════════════════════════════

set -e

# ─────────────────────────────────────────────────────────────────────────────
# ARGUMENTS
# ─────────────────────────────────────────────────────────────────────────────
STORY_ID="${1:-}"
NEW_STATUS="${2:-}"
AGENT_ID="${3:-}"

# ─────────────────────────────────────────────────────────────────────────────
# VALIDATION
# ─────────────────────────────────────────────────────────────────────────────
if [ -z "$STORY_ID" ] || [ -z "$NEW_STATUS" ]; then
    echo "❌ Usage: $0 <story_id> <new_status> [agent_id]"
    echo ""
    echo "   Valid statuses:"
    echo "     backlog, ready, in_progress, dev_complete,"
    echo "     qa_review, completed, failed, blocked"
    echo ""
    echo "   Example:"
    echo "     $0 WAVE1-FE-001 in_progress fe-dev-1"
    exit 1
fi

# Validate status
VALID_STATUSES="backlog ready in_progress dev_complete qa_review completed failed blocked"
if ! echo "$VALID_STATUSES" | grep -qw "$NEW_STATUS"; then
    echo "❌ Invalid status: $NEW_STATUS"
    echo "   Valid statuses: $VALID_STATUSES"
    exit 1
fi

# Validate environment
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_KEY" ]; then
    echo "❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY"
    echo "   Please set these environment variables or source .env"
    exit 1
fi

# ─────────────────────────────────────────────────────────────────────────────
# BUILD PAYLOAD
# ─────────────────────────────────────────────────────────────────────────────
TIMESTAMP=$(date -u +%Y-%m-%dT%H:%M:%SZ)

if [ -n "$AGENT_ID" ]; then
    PAYLOAD=$(cat <<EOF
{
  "status": "$NEW_STATUS",
  "assigned_agent": "$AGENT_ID",
  "updated_at": "$TIMESTAMP"
}
EOF
)
else
    PAYLOAD=$(cat <<EOF
{
  "status": "$NEW_STATUS",
  "updated_at": "$TIMESTAMP"
}
EOF
)
fi

# ─────────────────────────────────────────────────────────────────────────────
# UPDATE STORY
# ─────────────────────────────────────────────────────────────────────────────
echo "📝 Updating story $STORY_ID to '$NEW_STATUS'..."

RESPONSE=$(curl -s -w "\n%{http_code}" -X PATCH \
    "${SUPABASE_URL}/rest/v1/maf_stories?story_id=eq.${STORY_ID}" \
    -H "apikey: ${SUPABASE_SERVICE_KEY}" \
    -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}" \
    -H "Content-Type: application/json" \
    -H "Prefer: return=representation" \
    -d "$PAYLOAD")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ Story $STORY_ID updated to '$NEW_STATUS'"
    if [ -n "$AGENT_ID" ]; then
        echo "   Assigned to: $AGENT_ID"
    fi
else
    echo "❌ Failed to update story (HTTP $HTTP_CODE)"
    echo "   Response: $BODY"
    exit 1
fi
