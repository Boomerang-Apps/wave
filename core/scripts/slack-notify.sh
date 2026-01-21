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
#   story_rich <story_id> <title> <agent> <status> <input_tokens> <output_tokens> <cost> <duration> <files> <tests>
#   infra_test <test_name> <status> <latency_ms> <details>
#   gate_complete <gate> <wave> <status>
#   qa_result <wave> <status> <tests_passed> <coverage>
#   wave_complete <wave> <stories> <duration> <wave_cost>
#   pipeline_complete <duration> <total_cost> <stories_count> <wave1_cost> <wave2_cost>
#   error <message>
#   retry <wave> <attempt> <max>
#   escalation <wave> <reason>
#
# Pre-Flight Types (Phase 0 - Generic):
#   preflight_start <project> <total_checks>
#   preflight_check <check_num> <check_name> <status> <details> <count>
#   preflight_stories <status> <total> <valid> <invalid> <domains>
#   preflight_gaps <status> <gaps_found> <generated> <details>
#   preflight_waves <status> <total_waves> <breakdown> <est_cost>
#   preflight_greenlight <decision> <passed> <total> <blockers>
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

    story_rich)
        # Rich story notification with full details
        # Usage: story_rich <story_id> <title> <agent> <status> <input_tokens> <output_tokens> <cost> <duration> <files> <tests>
        STORY_ID="${2:-STORY-001}"
        TITLE="${3:-Story Title}"
        AGENT="${4:-fe-dev}"
        STATUS="${5:-SUCCESS}"
        INPUT_TOKENS="${6:-10000}"
        OUTPUT_TOKENS="${7:-5000}"
        COST="${8:-0.35}"
        DURATION="${9:-3m 15s}"
        FILES="${10:-4}"
        TESTS="${11:-8}"
        TOTAL_TOKENS=$((INPUT_TOKENS + OUTPUT_TOKENS))

        if [ "$STATUS" = "SUCCESS" ]; then
            EMOJI=":white_check_mark:"
            COLOR="good"
        else
            EMOJI=":x:"
            COLOR="danger"
        fi

        curl -s -X POST -H 'Content-type: application/json' \
            --data '{
                "attachments": [{
                    "color": "'"$COLOR"'",
                    "blocks": [
                        {"type": "header", "text": {"type": "plain_text", "text": "'"$EMOJI"' Story Complete: '"$STORY_ID"'", "emoji": true}},
                        {"type": "section", "text": {"type": "mrkdwn", "text": "*'"$TITLE"'*"}},
                        {"type": "divider"},
                        {"type": "section", "fields": [
                            {"type": "mrkdwn", "text": ":robot_face: *Agent:*\n`'"$AGENT"'`"},
                            {"type": "mrkdwn", "text": ":stopwatch: *Duration:*\n'"$DURATION"'"},
                            {"type": "mrkdwn", "text": ":page_facing_up: *Files Changed:*\n'"$FILES"'"},
                            {"type": "mrkdwn", "text": ":white_check_mark: *Tests Passed:*\n'"$TESTS"'"}
                        ]},
                        {"type": "divider"},
                        {"type": "section", "text": {"type": "mrkdwn", "text": ":moneybag: *Token Usage & Cost*"}},
                        {"type": "section", "fields": [
                            {"type": "mrkdwn", "text": ":inbox_tray: *Input:*\n`'"$INPUT_TOKENS"'`"},
                            {"type": "mrkdwn", "text": ":outbox_tray: *Output:*\n`'"$OUTPUT_TOKENS"'`"},
                            {"type": "mrkdwn", "text": ":bar_chart: *Total:*\n`'"$TOTAL_TOKENS"'`"},
                            {"type": "mrkdwn", "text": ":dollar: *Cost:*\n`$'"$COST"' USD`"}
                        ]},
                        {"type": "context", "elements": [{"type": "mrkdwn", "text": "WAVE Framework | '"$(date -u +%Y-%m-%dT%H:%M:%SZ)"'"}]}
                    ]
                }]
            }' "$WEBHOOK_URL" > /dev/null 2>&1
        ;;

    infra_test)
        # Infrastructure test result
        # Usage: infra_test <test_name> <status> <latency_ms> <details>
        TEST_NAME="${2:-Test}"
        STATUS="${3:-PASS}"
        LATENCY="${4:-100}"
        DETAILS="${5:-Test completed}"

        if [ "$STATUS" = "PASS" ] || [ "$STATUS" = "SUCCESS" ]; then
            EMOJI=":white_check_mark:"
            COLOR="good"
            STATUS_TEXT="SUCCESS"
        else
            EMOJI=":x:"
            COLOR="danger"
            STATUS_TEXT="FAILURE"
        fi

        curl -s -X POST -H 'Content-type: application/json' \
            --data '{
                "attachments": [{
                    "color": "'"$COLOR"'",
                    "blocks": [
                        {"type": "header", "text": {"type": "plain_text", "text": "'"$EMOJI"' Infra Test: '"$TEST_NAME"'", "emoji": true}},
                        {"type": "section", "fields": [
                            {"type": "mrkdwn", "text": "*Status:*\n'"$STATUS_TEXT"'"},
                            {"type": "mrkdwn", "text": "*Latency:*\n'"$LATENCY"'ms"}
                        ]},
                        {"type": "section", "text": {"type": "mrkdwn", "text": "*Details:*\n'"$DETAILS"'"}},
                        {"type": "context", "elements": [{"type": "mrkdwn", "text": "WAVE Infrastructure | '"$(date -u +%Y-%m-%dT%H:%M:%SZ)"'"}]}
                    ]
                }]
            }' "$WEBHOOK_URL" > /dev/null 2>&1
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

    # ═══════════════════════════════════════════════════════════════════════════════
    # PRE-FLIGHT NOTIFICATIONS (Phase 0 - Generic for all projects)
    # ═══════════════════════════════════════════════════════════════════════════════

    preflight_start)
        # Pre-Flight sequence starting
        # Usage: preflight_start <project> <total_checks>
        PROJECT="${2:-Project}"
        TOTAL_CHECKS="${3:-4}"
        curl -s -m 10 -X POST -H 'Content-type: application/json' \
            --data '{
                "attachments": [{
                    "color": "#0088ff",
                    "blocks": [
                        {"type": "header", "text": {"type": "plain_text", "text": ":rocket: PRE-FLIGHT SEQUENCE INITIATED", "emoji": true}},
                        {"type": "section", "text": {"type": "mrkdwn", "text": "*Project:* `'"$PROJECT"'`\n*Checks to run:* '"$TOTAL_CHECKS"'"}},
                        {"type": "section", "text": {"type": "mrkdwn", "text": ":one: Analyze Stories\n:two: Gap Analysis\n:three: Wave Planning\n:four: Green Light Check"}},
                        {"type": "context", "elements": [{"type": "mrkdwn", "text": "WAVE Pre-Flight | '"$(date -u +%Y-%m-%dT%H:%M:%SZ)"'"}]}
                    ]
                }]
            }' "$WEBHOOK_URL" > /dev/null 2>&1
        ;;

    preflight_check)
        # Individual pre-flight check result
        # Usage: preflight_check <check_number> <check_name> <status> <details> <count>
        CHECK_NUM="${2:-1}"
        CHECK_NAME="${3:-Check}"
        STATUS="${4:-PASS}"
        DETAILS="${5:-Check completed}"
        COUNT="${6:-0}"

        if [ "$STATUS" = "PASS" ] || [ "$STATUS" = "SUCCESS" ]; then
            EMOJI=":white_check_mark:"
            COLOR="good"
            STATUS_TEXT="PASSED"
        else
            EMOJI=":x:"
            COLOR="danger"
            STATUS_TEXT="FAILED"
        fi

        # Number emoji mapping
        case "$CHECK_NUM" in
            1) NUM_EMOJI=":one:" ;;
            2) NUM_EMOJI=":two:" ;;
            3) NUM_EMOJI=":three:" ;;
            4) NUM_EMOJI=":four:" ;;
            *) NUM_EMOJI=":hash:" ;;
        esac

        curl -s -m 10 -X POST -H 'Content-type: application/json' \
            --data '{
                "attachments": [{
                    "color": "'"$COLOR"'",
                    "blocks": [
                        {"type": "section", "text": {"type": "mrkdwn", "text": "'"$NUM_EMOJI"' *Pre-Flight Check '"$CHECK_NUM"':* '"$CHECK_NAME"'"}},
                        {"type": "section", "fields": [
                            {"type": "mrkdwn", "text": "*Status:*\n'"$EMOJI"' '"$STATUS_TEXT"'"},
                            {"type": "mrkdwn", "text": "*Count:*\n'"$COUNT"'"}
                        ]},
                        {"type": "section", "text": {"type": "mrkdwn", "text": "*Details:*\n'"$DETAILS"'"}},
                        {"type": "context", "elements": [{"type": "mrkdwn", "text": "WAVE Pre-Flight | '"$(date -u +%Y-%m-%dT%H:%M:%SZ)"'"}]}
                    ]
                }]
            }' "$WEBHOOK_URL" > /dev/null 2>&1
        ;;

    preflight_stories)
        # Story analysis result
        # Usage: preflight_stories <status> <total> <valid> <invalid> <domains>
        STATUS="${2:-PASS}"
        TOTAL="${3:-0}"
        VALID="${4:-0}"
        INVALID="${5:-0}"
        DOMAINS="${6:-FE, BE}"

        if [ "$STATUS" = "PASS" ]; then
            EMOJI=":white_check_mark:"
            COLOR="good"
        else
            EMOJI=":x:"
            COLOR="danger"
        fi

        curl -s -m 10 -X POST -H 'Content-type: application/json' \
            --data '{
                "attachments": [{
                    "color": "'"$COLOR"'",
                    "blocks": [
                        {"type": "header", "text": {"type": "plain_text", "text": "'"$EMOJI"' Pre-Flight: Story Analysis", "emoji": true}},
                        {"type": "section", "fields": [
                            {"type": "mrkdwn", "text": ":clipboard: *Total Stories:*\n'"$TOTAL"'"},
                            {"type": "mrkdwn", "text": ":white_check_mark: *Valid:*\n'"$VALID"'"},
                            {"type": "mrkdwn", "text": ":x: *Invalid:*\n'"$INVALID"'"},
                            {"type": "mrkdwn", "text": ":label: *Domains:*\n'"$DOMAINS"'"}
                        ]},
                        {"type": "context", "elements": [{"type": "mrkdwn", "text": "WAVE Pre-Flight | '"$(date -u +%Y-%m-%dT%H:%M:%SZ)"'"}]}
                    ]
                }]
            }' "$WEBHOOK_URL" > /dev/null 2>&1
        ;;

    preflight_gaps)
        # Gap analysis result
        # Usage: preflight_gaps <status> <gaps_found> <stories_generated> <details>
        STATUS="${2:-PASS}"
        GAPS="${3:-0}"
        GENERATED="${4:-0}"
        DETAILS="${5:-No gaps found}"

        if [ "$STATUS" = "PASS" ]; then
            EMOJI=":white_check_mark:"
            COLOR="good"
        else
            EMOJI=":warning:"
            COLOR="warning"
        fi

        curl -s -m 10 -X POST -H 'Content-type: application/json' \
            --data '{
                "attachments": [{
                    "color": "'"$COLOR"'",
                    "blocks": [
                        {"type": "header", "text": {"type": "plain_text", "text": "'"$EMOJI"' Pre-Flight: Gap Analysis", "emoji": true}},
                        {"type": "section", "fields": [
                            {"type": "mrkdwn", "text": ":mag: *Gaps Found:*\n'"$GAPS"'"},
                            {"type": "mrkdwn", "text": ":sparkles: *Stories Generated:*\n'"$GENERATED"'"}
                        ]},
                        {"type": "section", "text": {"type": "mrkdwn", "text": "*Details:*\n'"$DETAILS"'"}},
                        {"type": "context", "elements": [{"type": "mrkdwn", "text": "WAVE Pre-Flight | '"$(date -u +%Y-%m-%dT%H:%M:%SZ)"'"}]}
                    ]
                }]
            }' "$WEBHOOK_URL" > /dev/null 2>&1
        ;;

    preflight_waves)
        # Wave planning result
        # Usage: preflight_waves <status> <total_waves> <wave_breakdown> <estimated_cost>
        STATUS="${2:-PASS}"
        TOTAL_WAVES="${3:-1}"
        BREAKDOWN="${4:-Wave 1: 5 stories}"
        EST_COST="${5:-2.00}"

        if [ "$STATUS" = "PASS" ]; then
            EMOJI=":white_check_mark:"
            COLOR="good"
        else
            EMOJI=":x:"
            COLOR="danger"
        fi

        curl -s -m 10 -X POST -H 'Content-type: application/json' \
            --data '{
                "attachments": [{
                    "color": "'"$COLOR"'",
                    "blocks": [
                        {"type": "header", "text": {"type": "plain_text", "text": "'"$EMOJI"' Pre-Flight: Wave Planning", "emoji": true}},
                        {"type": "section", "fields": [
                            {"type": "mrkdwn", "text": ":ocean: *Total Waves:*\n'"$TOTAL_WAVES"'"},
                            {"type": "mrkdwn", "text": ":moneybag: *Est. Cost:*\n$'"$EST_COST"' USD"}
                        ]},
                        {"type": "section", "text": {"type": "mrkdwn", "text": "*Wave Breakdown:*\n'"$BREAKDOWN"'"}},
                        {"type": "context", "elements": [{"type": "mrkdwn", "text": "WAVE Pre-Flight | '"$(date -u +%Y-%m-%dT%H:%M:%SZ)"'"}]}
                    ]
                }]
            }' "$WEBHOOK_URL" > /dev/null 2>&1
        ;;

    preflight_greenlight)
        # Green light decision
        # Usage: preflight_greenlight <decision> <checks_passed> <total_checks> <blockers>
        DECISION="${2:-GO}"
        PASSED="${3:-4}"
        TOTAL="${4:-4}"
        BLOCKERS="${5:-None}"

        if [ "$DECISION" = "GO" ]; then
            EMOJI=":green_circle:"
            COLOR="good"
            TITLE="GREEN LIGHT - GO FOR LAUNCH"
        else
            EMOJI=":red_circle:"
            COLOR="danger"
            TITLE="RED LIGHT - LAUNCH BLOCKED"
        fi

        curl -s -m 10 -X POST -H 'Content-type: application/json' \
            --data '{
                "attachments": [{
                    "color": "'"$COLOR"'",
                    "blocks": [
                        {"type": "header", "text": {"type": "plain_text", "text": "'"$EMOJI"' '"$TITLE"'", "emoji": true}},
                        {"type": "section", "fields": [
                            {"type": "mrkdwn", "text": ":clipboard: *Checks Passed:*\n'"$PASSED"' / '"$TOTAL"'"},
                            {"type": "mrkdwn", "text": ":no_entry: *Blockers:*\n'"$BLOCKERS"'"}
                        ]},
                        {"type": "divider"},
                        {"type": "section", "text": {"type": "mrkdwn", "text": "_Pre-Flight sequence complete. Ready for Infrastructure validation._"}},
                        {"type": "context", "elements": [{"type": "mrkdwn", "text": "WAVE Pre-Flight | '"$(date -u +%Y-%m-%dT%H:%M:%SZ)"'"}]}
                    ]
                }]
            }' "$WEBHOOK_URL" > /dev/null 2>&1
        ;;

    *)
        echo "Usage: $0 <type> <args...>"
        echo ""
        echo "Types:"
        echo "  pipeline_start   <project>"
        echo "  agent_start      <agent> <wave> <story>"
        echo "  agent_complete   <agent> <wave> <story> <duration> <token_cost>"
        echo "  story_rich       <story_id> <title> <agent> <status> <input_tokens> <output_tokens> <cost> <duration> <files> <tests>"
        echo "  infra_test       <test_name> <status> <latency_ms> <details>"
        echo "  gate_complete    <gate> <wave> <status>"
        echo "  qa_result        <wave> <status> <tests_passed> <coverage>"
        echo "  wave_complete    <wave> <stories> <duration> <wave_cost>"
        echo "  pipeline_complete <duration> <total_cost> <stories_count> <wave1_cost> <wave2_cost>"
        echo "  error            <message>"
        echo "  retry            <wave> <attempt> <max>"
        echo "  escalation       <wave> <reason>"
        echo ""
        echo "Pre-Flight Types:"
        echo "  preflight_start      <project> <total_checks>"
        echo "  preflight_check      <check_num> <check_name> <status> <details> <count>"
        echo "  preflight_stories    <status> <total> <valid> <invalid> <domains>"
        echo "  preflight_gaps       <status> <gaps_found> <generated> <details>"
        echo "  preflight_waves      <status> <total_waves> <breakdown> <est_cost>"
        echo "  preflight_greenlight <decision> <passed> <total> <blockers>"
        exit 1
        ;;
esac

echo "Notification sent: $1"
