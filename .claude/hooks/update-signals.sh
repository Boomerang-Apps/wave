#!/bin/bash
# Wave V2 Hook: Signal File Updates (Project-Agnostic)
# Automatically creates/updates signal files for tracking

set -e

# Load configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/config.sh"

EVENT="$1"
STORY_ID="$2"
GATE="$3"
AGENT="${AGENT:-cto}"

mkdir -p "$SIGNALS_DIR"

TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

case "$EVENT" in
    "story-started")
        SIGNAL_FILE="$SIGNALS_DIR/signal-${STORY_ID}-started.json"
        cat > "$SIGNAL_FILE" << EOF
{
  "storyId": "$STORY_ID",
  "event": "started",
  "timestamp": "$TIMESTAMP",
  "agent": "$AGENT"
}
EOF
        echo "Signal created: $SIGNAL_FILE"
        ;;

    "gate-passed")
        SIGNAL_FILE="$SIGNALS_DIR/signal-${STORY_ID}-${GATE}-passed.json"
        cat > "$SIGNAL_FILE" << EOF
{
  "storyId": "$STORY_ID",
  "gate": "$GATE",
  "event": "passed",
  "timestamp": "$TIMESTAMP",
  "agent": "$AGENT"
}
EOF
        echo "Signal created: $SIGNAL_FILE"
        ;;

    "gate-failed")
        SIGNAL_FILE="$SIGNALS_DIR/signal-${STORY_ID}-${GATE}-failed.json"
        cat > "$SIGNAL_FILE" << EOF
{
  "storyId": "$STORY_ID",
  "gate": "$GATE",
  "event": "failed",
  "timestamp": "$TIMESTAMP",
  "agent": "$AGENT"
}
EOF
        echo "Signal created: $SIGNAL_FILE"
        ;;

    "story-complete")
        SIGNAL_FILE="$SIGNALS_DIR/signal-${STORY_ID}-complete.json"
        cat > "$SIGNAL_FILE" << EOF
{
  "storyId": "$STORY_ID",
  "event": "complete",
  "timestamp": "$TIMESTAMP",
  "agent": "$AGENT",
  "allGatesPassed": true
}
EOF
        echo "Signal created: $SIGNAL_FILE"
        ;;

    "wave-launched")
        WAVE_NUM="$STORY_ID"
        SIGNAL_FILE="$SIGNALS_DIR/signal-wave${WAVE_NUM}-launched.json"
        cat > "$SIGNAL_FILE" << EOF
{
  "wave": $WAVE_NUM,
  "event": "launched",
  "timestamp": "$TIMESTAMP",
  "agent": "$AGENT"
}
EOF
        echo "Signal created: $SIGNAL_FILE"
        ;;

    "wave-complete")
        WAVE_NUM="$STORY_ID"
        SIGNAL_FILE="$SIGNALS_DIR/signal-wave${WAVE_NUM}-complete.json"
        cat > "$SIGNAL_FILE" << EOF
{
  "wave": $WAVE_NUM,
  "event": "complete",
  "timestamp": "$TIMESTAMP",
  "agent": "$AGENT"
}
EOF
        echo "Signal created: $SIGNAL_FILE"
        ;;

    *)
        echo "Unknown event: $EVENT"
        exit 1
        ;;
esac

exit 0
