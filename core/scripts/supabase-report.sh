#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# WAVE FRAMEWORK - Supabase Report Script
# ═══════════════════════════════════════════════════════════════════════════════
#
# Logs events to Supabase and sends rich Slack notifications.
#
# This script:
# 1. Logs events to maf_events table
# 2. Sends rich Slack notifications with color-coded blocks
# 3. Updates wave status when appropriate
#
# Usage: ./supabase-report.sh <event_type> <message> [gate] [agent_id] [story_id]
# Example: ./supabase-report.sh GATE_START "Gate 2 Started" 2 fe-dev-1 WAVE1-FE-001
#
# Event Types:
#   PIPELINE_START   - Pipeline execution started
#   GATE_START       - Agent started gate execution
#   GATE_COMPLETE    - Agent completed gate
#   AGENT_ERROR      - Agent encountered error
#   PIPELINE_COMPLETE - All waves completed
#   KILL_SWITCH      - Kill switch activated
#   RETRY_TRIGGERED  - QA rejection triggered retry
#   ESCALATION       - Max retries exceeded
#
# ═══════════════════════════════════════════════════════════════════════════════

set -e

# ─────────────────────────────────────────────────────────────────────────────
# ARGUMENTS
# ─────────────────────────────────────────────────────────────────────────────
EVENT_TYPE="${1:-INFO}"
MESSAGE="${2:-No message}"
GATE="${3:-0}"
AGENT_ID="${4:-unknown}"
STORY_ID="${5:-}"

# ─────────────────────────────────────────────────────────────────────────────
# ENVIRONMENT
# ─────────────────────────────────────────────────────────────────────────────
PIPELINE_ID="${PIPELINE_ID:-}"
WAVE_NUMBER="${WAVE_NUMBER:-1}"
PROJECT_NAME="${PROJECT_NAME:-wave-project}"
BUDGET="${BUDGET:-\$20.00}"

TIMESTAMP=$(date -u +%Y-%m-%dT%H:%M:%SZ)
TIMESTAMP_LOCAL=$(date '+%Y-%m-%d %H:%M:%S')

# ═══════════════════════════════════════════════════════════════════════════════
# FUNCTION: Log to Supabase maf_events
# ═══════════════════════════════════════════════════════════════════════════════
log_to_supabase() {
    if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_KEY" ]; then
        echo "⚠️ Supabase not configured - skipping event log"
        return 0
    fi

    # Build JSON payload
    local story_id_json="null"
    if [ -n "$STORY_ID" ]; then
        story_id_json="\"$STORY_ID\""
    fi

    local pipeline_id_json="null"
    if [ -n "$PIPELINE_ID" ]; then
        pipeline_id_json="\"$PIPELINE_ID\""
    fi

    PAYLOAD=$(cat <<EOF
{
  "event_type": "$EVENT_TYPE",
  "message": "$MESSAGE",
  "gate": $GATE,
  "agent_id": "$AGENT_ID",
  "story_id": $story_id_json,
  "pipeline_id": $pipeline_id_json,
  "wave_number": $WAVE_NUMBER,
  "project_name": "$PROJECT_NAME",
  "created_at": "$TIMESTAMP"
}
EOF
)

    RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
        "${SUPABASE_URL}/rest/v1/maf_events" \
        -H "apikey: ${SUPABASE_SERVICE_KEY}" \
        -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}" \
        -H "Content-Type: application/json" \
        -H "Prefer: return=minimal" \
        -d "$PAYLOAD" 2>/dev/null || echo -e "\n500")

    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)

    if [ "$HTTP_CODE" = "201" ] || [ "$HTTP_CODE" = "200" ]; then
        echo "✅ Event logged to Supabase: $EVENT_TYPE"
    else
        echo "⚠️ Failed to log event to Supabase (HTTP $HTTP_CODE)"
    fi
}

# ═══════════════════════════════════════════════════════════════════════════════
# FUNCTION: Send Rich Slack Notification
# ═══════════════════════════════════════════════════════════════════════════════
send_slack_notification() {
    if [ -z "$SLACK_WEBHOOK_URL" ]; then
        echo "⚠️ Slack not configured - skipping notification"
        return 0
    fi

    # Select emoji and color based on event type
    local EMOJI COLOR
    case "$EVENT_TYPE" in
        PIPELINE_START)    EMOJI="🚀"; COLOR="#2196F3" ;;
        GATE_START)        EMOJI="➡️"; COLOR="#2196F3" ;;
        GATE_COMPLETE)     EMOJI="✅"; COLOR="#4CAF50" ;;
        AGENT_ERROR)       EMOJI="❌"; COLOR="#F44336" ;;
        PIPELINE_COMPLETE) EMOJI="🎉"; COLOR="#9C27B0" ;;
        KILL_SWITCH)       EMOJI="🛑"; COLOR="#F44336" ;;
        RETRY_TRIGGERED)   EMOJI="🔄"; COLOR="#FFC107" ;;
        ESCALATION)        EMOJI="⚠️"; COLOR="#F44336" ;;
        QA_APPROVED)       EMOJI="✅"; COLOR="#4CAF50" ;;
        QA_REJECTED)       EMOJI="❌"; COLOR="#F44336" ;;
        *)                 EMOJI="ℹ️"; COLOR="#607D8B" ;;
    esac

    # Build rich Slack payload with blocks
    SLACK_PAYLOAD=$(cat <<EOF
{
  "attachments": [
    {
      "color": "$COLOR",
      "blocks": [
        {
          "type": "header",
          "text": {
            "type": "plain_text",
            "text": "$EMOJI $EVENT_TYPE",
            "emoji": true
          }
        },
        {
          "type": "section",
          "fields": [
            {
              "type": "mrkdwn",
              "text": "*Message:*\n$MESSAGE"
            },
            {
              "type": "mrkdwn",
              "text": "*Gate:*\n$GATE"
            }
          ]
        },
        {
          "type": "section",
          "fields": [
            {
              "type": "mrkdwn",
              "text": "*Agent:*\n$AGENT_ID"
            },
            {
              "type": "mrkdwn",
              "text": "*Wave:*\n$WAVE_NUMBER"
            }
          ]
        },
        {
          "type": "context",
          "elements": [
            {
              "type": "mrkdwn",
              "text": "📁 *Project:* $PROJECT_NAME | 💰 *Budget:* $BUDGET | 🕐 $TIMESTAMP_LOCAL"
            }
          ]
        },
        {
          "type": "context",
          "elements": [
            {
              "type": "mrkdwn",
              "text": "WAVE Framework | $TIMESTAMP_LOCAL"
            }
          ]
        }
      ]
    }
  ]
}
EOF
)

    RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$SLACK_WEBHOOK_URL" \
        -H "Content-Type: application/json" \
        -d "$SLACK_PAYLOAD" 2>/dev/null || echo -e "\n500")

    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)

    if [ "$HTTP_CODE" = "200" ]; then
        echo "✅ Slack notification sent: $EVENT_TYPE"
    else
        echo "⚠️ Failed to send Slack notification (HTTP $HTTP_CODE)"
    fi
}

# ═══════════════════════════════════════════════════════════════════════════════
# FUNCTION: Update Wave Status (for GATE events)
# ═══════════════════════════════════════════════════════════════════════════════
update_wave_if_needed() {
    if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_KEY" ]; then
        return 0
    fi

    case "$EVENT_TYPE" in
        GATE_START)
            # Update wave to running with current gate
            curl -s -X PATCH \
                "${SUPABASE_URL}/rest/v1/maf_waves?wave_number=eq.${WAVE_NUMBER}" \
                -H "apikey: ${SUPABASE_SERVICE_KEY}" \
                -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}" \
                -H "Content-Type: application/json" \
                -d "{\"status\": \"running\", \"current_gate\": $GATE, \"updated_at\": \"$TIMESTAMP\"}" \
                >/dev/null 2>&1 || true
            echo "✅ Wave $WAVE_NUMBER updated: running, gate $GATE"
            ;;
        PIPELINE_COMPLETE)
            # Update wave to completed
            curl -s -X PATCH \
                "${SUPABASE_URL}/rest/v1/maf_waves?wave_number=eq.${WAVE_NUMBER}" \
                -H "apikey: ${SUPABASE_SERVICE_KEY}" \
                -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}" \
                -H "Content-Type: application/json" \
                -d "{\"status\": \"completed\", \"current_gate\": 7, \"updated_at\": \"$TIMESTAMP\"}" \
                >/dev/null 2>&1 || true
            echo "✅ Wave $WAVE_NUMBER updated: completed"
            ;;
        AGENT_ERROR|KILL_SWITCH)
            # Update wave to failed
            curl -s -X PATCH \
                "${SUPABASE_URL}/rest/v1/maf_waves?wave_number=eq.${WAVE_NUMBER}" \
                -H "apikey: ${SUPABASE_SERVICE_KEY}" \
                -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}" \
                -H "Content-Type: application/json" \
                -d "{\"status\": \"failed\", \"current_gate\": $GATE, \"updated_at\": \"$TIMESTAMP\"}" \
                >/dev/null 2>&1 || true
            echo "✅ Wave $WAVE_NUMBER updated: failed"
            ;;
    esac
}

# ═══════════════════════════════════════════════════════════════════════════════
# MAIN EXECUTION
# ═══════════════════════════════════════════════════════════════════════════════

echo "═══════════════════════════════════════════════════════════════════════════════"
echo "  WAVE Event Report"
echo "═══════════════════════════════════════════════════════════════════════════════"
echo "  Event Type: $EVENT_TYPE"
echo "  Message:    $MESSAGE"
echo "  Gate:       $GATE"
echo "  Agent:      $AGENT_ID"
echo "  Wave:       $WAVE_NUMBER"
echo "  Project:    $PROJECT_NAME"
echo "  Time:       $TIMESTAMP"
echo "═══════════════════════════════════════════════════════════════════════════════"

# Execute all reporting
log_to_supabase
send_slack_notification
update_wave_if_needed

echo "═══════════════════════════════════════════════════════════════════════════════"
echo "  Report complete"
echo "═══════════════════════════════════════════════════════════════════════════════"
