#!/bin/bash
# Wave V2 Hook: Slack Notifications
# Sends notifications to Slack on key events

set -e

EVENT="$1"
STORY_ID="$2"
DETAILS="$3"

# Slack webhook URL (set via environment or .env file)
SLACK_WEBHOOK_URL="${SLACK_WEBHOOK_URL:-}"

# If no webhook, try to read from .env
if [ -z "$SLACK_WEBHOOK_URL" ] && [ -f ".env" ]; then
    SLACK_WEBHOOK_URL=$(grep "SLACK_WEBHOOK_URL" .env | cut -d '=' -f2)
fi

# Skip if no webhook configured
if [ -z "$SLACK_WEBHOOK_URL" ]; then
    echo "Slack webhook not configured. Skipping notification."
    exit 0
fi

# Build message based on event type
case "$EVENT" in
    "gate-passed")
        EMOJI=":white_check_mark:"
        MESSAGE="$EMOJI *Gate Passed*\n\nStory: \`$STORY_ID\`\nGate: $DETAILS\nTime: $(date '+%Y-%m-%d %H:%M:%S')"
        ;;
    "gate-failed")
        EMOJI=":x:"
        MESSAGE="$EMOJI *Gate Failed*\n\nStory: \`$STORY_ID\`\nGate: $DETAILS\nTime: $(date '+%Y-%m-%d %H:%M:%S')"
        ;;
    "story-complete")
        EMOJI=":tada:"
        MESSAGE="$EMOJI *Story Complete*\n\nStory: \`$STORY_ID\`\nAll gates passed!\nTime: $(date '+%Y-%m-%d %H:%M:%S')"
        ;;
    "wave-launched")
        EMOJI=":rocket:"
        MESSAGE="$EMOJI *Wave Launched*\n\nWave: $STORY_ID\n$DETAILS\nTime: $(date '+%Y-%m-%d %H:%M:%S')"
        ;;
    "anomaly")
        EMOJI=":warning:"
        MESSAGE="$EMOJI *Anomaly Detected*\n\nStory: \`$STORY_ID\`\nDetails: $DETAILS\nTime: $(date '+%Y-%m-%d %H:%M:%S')"
        ;;
    *)
        MESSAGE="Wave V2 Event: $EVENT\nStory: $STORY_ID\nDetails: $DETAILS"
        ;;
esac

# Send to Slack
curl -s -X POST -H 'Content-type: application/json' \
    --data "{\"text\": \"$MESSAGE\"}" \
    "$SLACK_WEBHOOK_URL" > /dev/null 2>&1

echo "Slack notification sent: $EVENT for $STORY_ID"
exit 0
