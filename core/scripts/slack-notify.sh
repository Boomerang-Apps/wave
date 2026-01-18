#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# WAVE SLACK NOTIFICATION HELPER
# ═══════════════════════════════════════════════════════════════════════════════
#
# Usage: ./slack-notify.sh <type> <args...>
#
# Types:
#   pipeline_start <project>
#   agent_start <agent> <wave> <story>
#   agent_complete <agent> <wave> <story> <duration> <token_cost>
#   gate_complete <gate> <wave> <status>
#   qa_result <wave> <status> <tests_passed> <coverage>
#   wave_complete <wave> <stories> <duration> <wave_cost>
#   pipeline_complete <duration> <total_cost> <stories_count> <wave1_cost> <wave2_cost>
#   error <message>
#
# ═══════════════════════════════════════════════════════════════════════════════

# Load .env if available
if [ -f ".env" ]; then
    source .env 2>/dev/null || true
fi

WEBHOOK_URL="${SLACK_WEBHOOK_URL:-}"

if [ -z "$WEBHOOK_URL" ]; then
    echo "No SLACK_WEBHOOK_URL set"
    exit 0
fi

send_blocks() {
    local blocks="$1"
    curl -s -X POST -H 'Content-type: application/json' \
        --data "{\"blocks\": $blocks}" \
        "$WEBHOOK_URL" > /dev/null 2>&1
}

case "$1" in
    pipeline_start)
        PROJECT="${2:-Unknown}"
        send_blocks '[
            {"type": "header", "text": {"type": "plain_text", "text": "Pipeline Started", "emoji": true}},
            {"type": "divider"},
            {"type": "section", "fields": [
                {"type": "mrkdwn", "text": "*Project:*\n'"$PROJECT"'"},
                {"type": "mrkdwn", "text": "*Mode:*\nAutonomous"},
                {"type": "mrkdwn", "text": "*Time:*\n'"$(date '+%H:%M:%S')"'"},
                {"type": "mrkdwn", "text": "*Framework:*\nWAVE"}
            ]},
            {"type": "divider"}
        ]'
        ;;

    agent_start)
        AGENT="$2"
        WAVE="$3"
        STORY="$4"
        send_blocks '[
            {"type": "section", "text": {"type": "mrkdwn", "text": "*Agent Starting*"}},
            {"type": "section", "fields": [
                {"type": "mrkdwn", "text": "*Agent:*\n'"$AGENT"'"},
                {"type": "mrkdwn", "text": "*Wave:*\n'"$WAVE"'"},
                {"type": "mrkdwn", "text": "*Story:*\n'"$STORY"'"},
                {"type": "mrkdwn", "text": "*Status:*\nStarted"}
            ]}
        ]'
        ;;

    agent_complete)
        AGENT="$2"
        WAVE="$3"
        STORY="$4"
        DURATION="$5"
        TOKEN_COST="$6"
        send_blocks '[
            {"type": "section", "text": {"type": "mrkdwn", "text": "*Agent Complete*"}},
            {"type": "section", "fields": [
                {"type": "mrkdwn", "text": "*Agent:*\n'"$AGENT"'"},
                {"type": "mrkdwn", "text": "*Wave:*\n'"$WAVE"'"},
                {"type": "mrkdwn", "text": "*Story:*\n'"$STORY"'"},
                {"type": "mrkdwn", "text": "*Status:*\nComplete"}
            ]},
            {"type": "context", "elements": [
                {"type": "mrkdwn", "text": "Duration: '"$DURATION"'  |  Token Cost: '"$TOKEN_COST"'"}
            ]},
            {"type": "divider"}
        ]'
        ;;

    gate_complete)
        GATE="$2"
        WAVE="$3"
        STATUS="$4"
        if [ "$STATUS" = "PASS" ] || [ "$STATUS" = "APPROVED" ]; then
            STATUS_TEXT="PASSED"
        else
            STATUS_TEXT="FAILED"
        fi
        send_blocks '[
            {"type": "header", "text": {"type": "plain_text", "text": "Gate '"$GATE"' - Wave '"$WAVE"'", "emoji": true}},
            {"type": "section", "text": {"type": "mrkdwn", "text": "*Status:* '"$STATUS_TEXT"'"}},
            {"type": "divider"}
        ]'
        ;;

    qa_result)
        WAVE="$2"
        STATUS="$3"
        TESTS="$4"
        COVERAGE="$5"
        send_blocks '[
            {"type": "header", "text": {"type": "plain_text", "text": "QA Result - Wave '"$WAVE"'", "emoji": true}},
            {"type": "divider"},
            {"type": "section", "fields": [
                {"type": "mrkdwn", "text": "*Status:*\n'"$STATUS"'"},
                {"type": "mrkdwn", "text": "*Tests:*\n'"$TESTS"' passed"},
                {"type": "mrkdwn", "text": "*Coverage:*\n'"$COVERAGE"'%"},
                {"type": "mrkdwn", "text": "*Gate:*\n4 (QA)"}
            ]},
            {"type": "divider"}
        ]'
        ;;

    wave_complete)
        WAVE="$2"
        STORIES="$3"
        DURATION="$4"
        WAVE_COST="$5"
        send_blocks '[
            {"type": "header", "text": {"type": "plain_text", "text": "Wave '"$WAVE"' Complete", "emoji": true}},
            {"type": "divider"},
            {"type": "section", "fields": [
                {"type": "mrkdwn", "text": "*Wave:*\n'"$WAVE"'"},
                {"type": "mrkdwn", "text": "*Stories:*\n'"$STORIES"'"},
                {"type": "mrkdwn", "text": "*Duration:*\n'"$DURATION"'"},
                {"type": "mrkdwn", "text": "*Wave Cost:*\n$'"$WAVE_COST"'"}
            ]},
            {"type": "divider"}
        ]'
        ;;

    pipeline_complete)
        DURATION="$2"
        TOTAL_COST="$3"
        STORIES="$4"
        WAVE1_COST="$5"
        WAVE2_COST="$6"
        send_blocks '[
            {"type": "header", "text": {"type": "plain_text", "text": "Pipeline Complete!", "emoji": true}},
            {"type": "divider"},
            {"type": "section", "text": {"type": "mrkdwn", "text": "*Stories Completed:* '"$STORIES"'\n*Total Duration:* '"$DURATION"'"}},
            {"type": "divider"},
            {"type": "section", "text": {"type": "mrkdwn", "text": "*Cost Summary*"}},
            {"type": "section", "fields": [
                {"type": "mrkdwn", "text": "*Wave 1:*\n$'"$WAVE1_COST"'"},
                {"type": "mrkdwn", "text": "*Wave 2:*\n$'"$WAVE2_COST"'"},
                {"type": "mrkdwn", "text": "*Total Cost:*\n$'"$TOTAL_COST"'"}
            ]},
            {"type": "divider"}
        ]'
        ;;

    error)
        MESSAGE="$2"
        send_blocks '[
            {"type": "header", "text": {"type": "plain_text", "text": "Pipeline Error", "emoji": true}},
            {"type": "divider"},
            {"type": "section", "text": {"type": "mrkdwn", "text": "*Error:* '"$MESSAGE"'"}},
            {"type": "context", "elements": [{"type": "mrkdwn", "text": "Time: '"$(date '+%H:%M:%S')"'"}]},
            {"type": "divider"}
        ]'
        ;;

    retry)
        WAVE="$2"
        ATTEMPT="$3"
        MAX="$4"
        send_blocks '[
            {"type": "section", "text": {"type": "mrkdwn", "text": "*Retry Triggered*"}},
            {"type": "section", "fields": [
                {"type": "mrkdwn", "text": "*Wave:*\n'"$WAVE"'"},
                {"type": "mrkdwn", "text": "*Attempt:*\n'"$ATTEMPT"'/'"$MAX"'"},
                {"type": "mrkdwn", "text": "*Action:*\nDev-Fix agent triggered"}
            ]},
            {"type": "divider"}
        ]'
        ;;

    escalation)
        WAVE="$2"
        REASON="$3"
        send_blocks '[
            {"type": "header", "text": {"type": "plain_text", "text": "ESCALATION REQUIRED", "emoji": true}},
            {"type": "divider"},
            {"type": "section", "text": {"type": "mrkdwn", "text": "*Wave:* '"$WAVE"'\n*Reason:* '"$REASON"'\n\n*Action Required:* Human review needed"}},
            {"type": "divider"}
        ]'
        ;;

    *)
        echo "Usage: $0 <type> <args...>"
        echo "Types: pipeline_start, agent_start, agent_complete, gate_complete, qa_result, wave_complete, pipeline_complete, error, retry, escalation"
        exit 1
        ;;
esac

echo "Notification sent: $1"
