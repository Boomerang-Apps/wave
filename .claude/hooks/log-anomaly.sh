#!/bin/bash
# Wave V2 Hook: Anomaly Logging
# Logs errors and failures for tracking

set -e

ANOMALY_TYPE="$1"
STORY_ID="$2"
DESCRIPTION="$3"
SEVERITY="${4:-medium}"

SIGNALS_DIR=".claude/signals"
ANOMALY_LOG="$SIGNALS_DIR/anomalies.jsonl"

mkdir -p "$SIGNALS_DIR"

TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
ANOMALY_ID="ANM-$(date +%s)"

# Create anomaly record
ANOMALY_JSON=$(cat << EOF
{"id":"$ANOMALY_ID","type":"$ANOMALY_TYPE","storyId":"$STORY_ID","description":"$DESCRIPTION","severity":"$SEVERITY","timestamp":"$TIMESTAMP","status":"open"}
EOF
)

# Append to log
echo "$ANOMALY_JSON" >> "$ANOMALY_LOG"

echo ""
echo "=============================================="
echo "  ANOMALY LOGGED"
echo "=============================================="
echo ""
echo "  ID: $ANOMALY_ID"
echo "  Type: $ANOMALY_TYPE"
echo "  Story: $STORY_ID"
echo "  Severity: $SEVERITY"
echo "  Description: $DESCRIPTION"
echo ""
echo "  Logged to: $ANOMALY_LOG"
echo ""
echo "  Run: /anomaly story $STORY_ID"
echo ""
echo "=============================================="

exit 0
