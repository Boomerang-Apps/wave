#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# WAVE FRAMEWORK - Update Wave Status Script
# ═══════════════════════════════════════════════════════════════════════════════
#
# Updates wave status in Supabase maf_waves table.
#
# Usage: ./update-wave-status.sh <wave_number> <status> <current_gate> [pipeline_id]
# Example: ./update-wave-status.sh 1 running 2 abc-123
#
# Valid statuses:
#   - pending   : Wave not yet started
#   - running   : Wave in progress
#   - completed : Wave finished successfully
#   - failed    : Wave failed
#
# Gates: 0-7 (with 4.5 represented as 4)
#
# ═══════════════════════════════════════════════════════════════════════════════

set -e

# ─────────────────────────────────────────────────────────────────────────────
# ARGUMENTS
# ─────────────────────────────────────────────────────────────────────────────
WAVE_NUMBER="${1:-}"
STATUS="${2:-}"
CURRENT_GATE="${3:-0}"
PIPELINE_ID="${4:-}"

# ─────────────────────────────────────────────────────────────────────────────
# VALIDATION
# ─────────────────────────────────────────────────────────────────────────────
if [ -z "$WAVE_NUMBER" ] || [ -z "$STATUS" ]; then
    echo "❌ Usage: $0 <wave_number> <status> <current_gate> [pipeline_id]"
    echo ""
    echo "   Valid statuses: pending, running, completed, failed"
    echo "   Gates: 0-7"
    echo ""
    echo "   Example:"
    echo "     $0 1 running 2 abc-123"
    exit 1
fi

# Validate status
VALID_STATUSES="pending running completed failed"
if ! echo "$VALID_STATUSES" | grep -qw "$STATUS"; then
    echo "❌ Invalid status: $STATUS"
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

PAYLOAD=$(cat <<EOF
{
  "status": "$STATUS",
  "current_gate": ${CURRENT_GATE:-0},
  "updated_at": "$TIMESTAMP"
}
EOF
)

# ─────────────────────────────────────────────────────────────────────────────
# BUILD FILTER
# ─────────────────────────────────────────────────────────────────────────────
if [ -n "$PIPELINE_ID" ]; then
    FILTER="pipeline_id=eq.${PIPELINE_ID}&wave_number=eq.${WAVE_NUMBER}"
else
    FILTER="wave_number=eq.${WAVE_NUMBER}"
fi

# ─────────────────────────────────────────────────────────────────────────────
# UPDATE WAVE
# ─────────────────────────────────────────────────────────────────────────────
echo "📊 Updating wave $WAVE_NUMBER to '$STATUS' at gate $CURRENT_GATE..."

RESPONSE=$(curl -s -w "\n%{http_code}" -X PATCH \
    "${SUPABASE_URL}/rest/v1/maf_waves?${FILTER}" \
    -H "apikey: ${SUPABASE_SERVICE_KEY}" \
    -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}" \
    -H "Content-Type: application/json" \
    -H "Prefer: return=representation" \
    -d "$PAYLOAD")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ Wave $WAVE_NUMBER updated: status=$STATUS, gate=$CURRENT_GATE"
else
    echo "❌ Failed to update wave (HTTP $HTTP_CODE)"
    echo "   Response: $BODY"
    exit 1
fi
