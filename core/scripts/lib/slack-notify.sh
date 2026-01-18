#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# WAVE SLACK NOTIFICATION LIBRARY
# ═══════════════════════════════════════════════════════════════════════════════
# Provides standardized Slack notifications for all pipeline events
# Source this file in other scripts: source lib/slack-notify.sh
# ═══════════════════════════════════════════════════════════════════════════════

# Ensure SLACK_WEBHOOK_URL is set
if [ -z "${SLACK_WEBHOOK_URL:-}" ]; then
    echo "[WARN] SLACK_WEBHOOK_URL not set - notifications disabled"
fi

# ─────────────────────────────────────────────────────────────────────────────
# CORE SEND FUNCTION
# ─────────────────────────────────────────────────────────────────────────────

slack_send() {
    local payload="$1"

    if [ -z "${SLACK_WEBHOOK_URL:-}" ]; then
        return 1
    fi

    local response=$(curl -s -o /dev/null -w "%{http_code}" \
        -X POST "$SLACK_WEBHOOK_URL" \
        -H "Content-Type: application/json" \
        -d "$payload" 2>/dev/null || echo "000")

    if [ "$response" = "200" ]; then
        return 0
    else
        echo "[ERROR] Slack notification failed (HTTP $response)"
        return 1
    fi
}

# ─────────────────────────────────────────────────────────────────────────────
# WAVE START
# ─────────────────────────────────────────────────────────────────────────────

slack_wave_start() {
    local wave="$1"
    local story_count="$2"
    local budget="$3"
    local project="${4:-Unknown}"

    local payload=$(cat <<EOF
{
  "blocks": [
    {
      "type": "header",
      "text": {"type": "plain_text", "text": "Wave $wave Starting", "emoji": true}
    },
    {
      "type": "section",
      "fields": [
        {"type": "mrkdwn", "text": "*Project:*\n$project"},
        {"type": "mrkdwn", "text": "*Wave:*\n$wave"}
      ]
    },
    {
      "type": "section",
      "fields": [
        {"type": "mrkdwn", "text": "*Stories:*\n$story_count"},
        {"type": "mrkdwn", "text": "*Budget:*\n\$$budget"}
      ]
    },
    {
      "type": "context",
      "elements": [
        {"type": "mrkdwn", "text": ":rocket: Wave $wave initiated | $(date '+%H:%M:%S')"}
      ]
    }
  ]
}
EOF
)

    slack_send "$payload"
}

# ─────────────────────────────────────────────────────────────────────────────
# STORY START
# ─────────────────────────────────────────────────────────────────────────────

slack_story_start() {
    local story_id="$1"
    local story_title="$2"
    local agent="$3"
    local wave="$4"

    local payload=$(cat <<EOF
{
  "blocks": [
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": ":gear: *Story Started*\n*$story_id*: $story_title"
      }
    },
    {
      "type": "context",
      "elements": [
        {"type": "mrkdwn", "text": "Agent: \`$agent\` | Wave: $wave | $(date '+%H:%M:%S')"}
      ]
    }
  ]
}
EOF
)

    slack_send "$payload"
}

# ─────────────────────────────────────────────────────────────────────────────
# STORY COMPLETE
# ─────────────────────────────────────────────────────────────────────────────

slack_story_complete() {
    local story_id="$1"
    local story_title="$2"
    local files_created="$3"
    local lines_added="$4"
    local cost="$5"
    local agent="$6"

    local payload=$(cat <<EOF
{
  "blocks": [
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": ":white_check_mark: *Story Complete*\n*$story_id*: $story_title"
      }
    },
    {
      "type": "section",
      "fields": [
        {"type": "mrkdwn", "text": "*Files:*\n$files_created"},
        {"type": "mrkdwn", "text": "*Lines:*\n$lines_added"}
      ]
    },
    {
      "type": "context",
      "elements": [
        {"type": "mrkdwn", "text": "Agent: \`$agent\` | Cost: \$$cost | $(date '+%H:%M:%S')"}
      ]
    }
  ]
}
EOF
)

    slack_send "$payload"
}

# ─────────────────────────────────────────────────────────────────────────────
# GATE TRANSITION
# ─────────────────────────────────────────────────────────────────────────────

slack_gate_transition() {
    local wave="$1"
    local from_gate="$2"
    local to_gate="$3"
    local status="$4"

    local emoji=":arrow_right:"
    if [ "$status" = "COMPLETE" ]; then
        emoji=":white_check_mark:"
    elif [ "$status" = "REJECTED" ]; then
        emoji=":x:"
    fi

    local payload=$(cat <<EOF
{
  "blocks": [
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": "$emoji *Gate Transition*\nWave $wave: Gate $from_gate → Gate $to_gate"
      }
    },
    {
      "type": "context",
      "elements": [
        {"type": "mrkdwn", "text": "Status: $status | $(date '+%H:%M:%S')"}
      ]
    }
  ]
}
EOF
)

    slack_send "$payload"
}

# ─────────────────────────────────────────────────────────────────────────────
# QA APPROVED
# ─────────────────────────────────────────────────────────────────────────────

slack_qa_approved() {
    local wave="$1"
    local tests_passed="$2"
    local build_status="$3"

    local payload=$(cat <<EOF
{
  "blocks": [
    {
      "type": "header",
      "text": {"type": "plain_text", "text": "QA Approved - Wave $wave", "emoji": true}
    },
    {
      "type": "section",
      "fields": [
        {"type": "mrkdwn", "text": "*Tests:*\n:white_check_mark: $tests_passed passed"},
        {"type": "mrkdwn", "text": "*Build:*\n:white_check_mark: $build_status"}
      ]
    },
    {
      "type": "context",
      "elements": [
        {"type": "mrkdwn", "text": ":tada: Ready for merge | $(date '+%H:%M:%S')"}
      ]
    }
  ]
}
EOF
)

    slack_send "$payload"
}

# ─────────────────────────────────────────────────────────────────────────────
# QA REJECTED
# ─────────────────────────────────────────────────────────────────────────────

slack_qa_rejected() {
    local wave="$1"
    local attempt="$2"
    local max_retries="$3"
    local issues="$4"

    local payload=$(cat <<EOF
{
  "blocks": [
    {
      "type": "header",
      "text": {"type": "plain_text", "text": "QA Rejected - Wave $wave", "emoji": true}
    },
    {
      "type": "section",
      "fields": [
        {"type": "mrkdwn", "text": "*Attempt:*\n$attempt / $max_retries"},
        {"type": "mrkdwn", "text": "*Status:*\n:x: REJECTED"}
      ]
    },
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": "*Issues:*\n$issues"
      }
    },
    {
      "type": "context",
      "elements": [
        {"type": "mrkdwn", "text": ":warning: Retry triggered | $(date '+%H:%M:%S')"}
      ]
    }
  ]
}
EOF
)

    slack_send "$payload"
}

# ─────────────────────────────────────────────────────────────────────────────
# BUDGET WARNING
# ─────────────────────────────────────────────────────────────────────────────

slack_budget_warning() {
    local wave="$1"
    local spent="$2"
    local limit="$3"
    local percentage="$4"

    local emoji=":warning:"
    if [ "$percentage" -ge 90 ]; then
        emoji=":rotating_light:"
    fi

    local payload=$(cat <<EOF
{
  "blocks": [
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": "$emoji *Budget Alert - Wave $wave*\nSpent \$$spent of \$$limit ($percentage%)"
      }
    },
    {
      "type": "context",
      "elements": [
        {"type": "mrkdwn", "text": "Remaining: \$$(echo "$limit - $spent" | bc) | $(date '+%H:%M:%S')"}
      ]
    }
  ]
}
EOF
)

    slack_send "$payload"
}

# ─────────────────────────────────────────────────────────────────────────────
# WAVE COMPLETE
# ─────────────────────────────────────────────────────────────────────────────

slack_wave_complete() {
    local wave="$1"
    local stories_completed="$2"
    local total_cost="$3"
    local duration="$4"
    local files_created="$5"

    local payload=$(cat <<EOF
{
  "blocks": [
    {
      "type": "header",
      "text": {"type": "plain_text", "text": "Wave $wave Complete!", "emoji": true}
    },
    {
      "type": "section",
      "fields": [
        {"type": "mrkdwn", "text": "*Stories:*\n$stories_completed completed"},
        {"type": "mrkdwn", "text": "*Duration:*\n$duration"}
      ]
    },
    {
      "type": "section",
      "fields": [
        {"type": "mrkdwn", "text": "*Total Cost:*\n\$$total_cost"},
        {"type": "mrkdwn", "text": "*Files Created:*\n$files_created"}
      ]
    },
    {
      "type": "context",
      "elements": [
        {"type": "mrkdwn", "text": ":trophy: Wave $wave deployed successfully | $(date '+%H:%M:%S')"}
      ]
    }
  ]
}
EOF
)

    slack_send "$payload"
}

# ─────────────────────────────────────────────────────────────────────────────
# ESCALATION
# ─────────────────────────────────────────────────────────────────────────────

slack_escalation() {
    local wave="$1"
    local reason="$2"
    local story_id="${3:-N/A}"

    local payload=$(cat <<EOF
{
  "blocks": [
    {
      "type": "header",
      "text": {"type": "plain_text", "text": "ESCALATION REQUIRED", "emoji": true}
    },
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": ":rotating_light: *Human intervention needed*\n\n*Wave:* $wave\n*Story:* $story_id\n*Reason:* $reason"
      }
    },
    {
      "type": "context",
      "elements": [
        {"type": "mrkdwn", "text": ":sos: Pipeline halted | $(date '+%H:%M:%S')"}
      ]
    }
  ]
}
EOF
)

    slack_send "$payload"
}

# ─────────────────────────────────────────────────────────────────────────────
# ERROR
# ─────────────────────────────────────────────────────────────────────────────

slack_error() {
    local component="$1"
    local message="$2"
    local wave="${3:-N/A}"

    local payload=$(cat <<EOF
{
  "blocks": [
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": ":x: *Error in $component*\n$message"
      }
    },
    {
      "type": "context",
      "elements": [
        {"type": "mrkdwn", "text": "Wave: $wave | $(date '+%H:%M:%S')"}
      ]
    }
  ]
}
EOF
)

    slack_send "$payload"
}

# ─────────────────────────────────────────────────────────────────────────────
# WORKTREE SYNC
# ─────────────────────────────────────────────────────────────────────────────

slack_worktree_sync() {
    local wave="$1"
    local status="$2"
    local details="${3:-}"

    local emoji=":white_check_mark:"
    if [ "$status" != "SUCCESS" ]; then
        emoji=":x:"
    fi

    local payload=$(cat <<EOF
{
  "blocks": [
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": "$emoji *Worktree Sync - Wave $wave*\nStatus: $status"
      }
    },
    {
      "type": "context",
      "elements": [
        {"type": "mrkdwn", "text": "$details | $(date '+%H:%M:%S')"}
      ]
    }
  ]
}
EOF
)

    slack_send "$payload"
}

# ─────────────────────────────────────────────────────────────────────────────
# DEPLOY STATUS
# ─────────────────────────────────────────────────────────────────────────────

slack_deploy() {
    local wave="$1"
    local status="$2"
    local url="${3:-}"

    local emoji=":rocket:"
    if [ "$status" = "SUCCESS" ]; then
        emoji=":white_check_mark:"
    elif [ "$status" = "FAILED" ]; then
        emoji=":x:"
    fi

    local payload=$(cat <<EOF
{
  "blocks": [
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": "$emoji *Deploy - Wave $wave*\nStatus: $status"
      }
    },
    {
      "type": "context",
      "elements": [
        {"type": "mrkdwn", "text": "URL: $url | $(date '+%H:%M:%S')"}
      ]
    }
  ]
}
EOF
)

    slack_send "$payload"
}

# ─────────────────────────────────────────────────────────────────────────────
# TEST MESSAGE
# ─────────────────────────────────────────────────────────────────────────────

slack_test() {
    local message="${1:-Test message from WAVE pipeline}"

    local payload=$(cat <<EOF
{
  "blocks": [
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": ":test_tube: *Test Notification*\n$message"
      }
    },
    {
      "type": "context",
      "elements": [
        {"type": "mrkdwn", "text": "Slack integration test | $(date '+%H:%M:%S')"}
      ]
    }
  ]
}
EOF
)

    slack_send "$payload"
}

# Export all functions
export -f slack_send
export -f slack_wave_start
export -f slack_story_start
export -f slack_story_complete
export -f slack_gate_transition
export -f slack_qa_approved
export -f slack_qa_rejected
export -f slack_budget_warning
export -f slack_wave_complete
export -f slack_escalation
export -f slack_error
export -f slack_worktree_sync
export -f slack_deploy
export -f slack_test
