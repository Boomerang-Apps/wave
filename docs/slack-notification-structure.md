# WAVE Slack Notification Structure

## Overview
Comprehensive notification schema for WAVE pipeline events with token cost and time tracking.

---

## 1. WAVE START Notification

**Trigger:** When a new wave begins execution

```json
{
  "blocks": [
    {
      "type": "header",
      "text": {"type": "plain_text", "text": "WAVE {N} STARTING", "emoji": true}
    },
    {
      "type": "section",
      "fields": [
        {"type": "mrkdwn", "text": "*Project:*\n{project_name}"},
        {"type": "mrkdwn", "text": "*Wave Type:*\n{FE_ONLY|BE_ONLY|FULL}"}
      ]
    },
    {
      "type": "section",
      "fields": [
        {"type": "mrkdwn", "text": "*Stories:*\n{count} stories"},
        {"type": "mrkdwn", "text": "*Budget:*\n${budget}"}
      ]
    },
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": "*Agent → LLM Assignments:*\n:brain: PM/CTO: `Opus 4.5`\n:zap: FE-1/FE-2/BE-1/BE-2: `Sonnet 4`\n:rabbit2: QA/Dev-Fix: `Haiku 4`"
      }
    },
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": "*8 Gate Pipeline:*\n0-Research → 1-Plan → 2-TDD → 3-Branch → 4-Develop → 5-Refactor → 6-Safety → 7-QA → 8-Deploy"
      }
    },
    {
      "type": "context",
      "elements": [
        {"type": "mrkdwn", "text": ":rocket: Wave initiated | {HH:MM:SS} IST"}
      ]
    }
  ]
}
```

**Required Fields:**
| Field | Source | Description |
|-------|--------|-------------|
| `project_name` | P.json → meta.project_name | Project identifier |
| `wave_type` | P.json → wave_state.wave_type | FE_ONLY, BE_ONLY, or FULL |
| `count` | len(wave_state.stories) | Number of stories in wave |
| `budget` | .env → WAVE_BUDGET | Budget limit for wave |

---

## 2. STORY START Notification

**Trigger:** When an agent begins working on a story

```json
{
  "blocks": [
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": ":gear: *Story Started*\n*{story_id}*: {story_title}"
      }
    },
    {
      "type": "section",
      "fields": [
        {"type": "mrkdwn", "text": "*Agent:*\n{agent_name}"},
        {"type": "mrkdwn", "text": "*LLM:*\n{model_name}"}
      ]
    },
    {
      "type": "section",
      "fields": [
        {"type": "mrkdwn", "text": "*Gate:*\n{gate_number}-{gate_name}"},
        {"type": "mrkdwn", "text": "*Wave:*\n{wave_number}"}
      ]
    },
    {
      "type": "context",
      "elements": [
        {"type": "mrkdwn", "text": "Started: {HH:MM:SS} IST"}
      ]
    }
  ]
}
```

**Required Fields:**
| Field | Source | Description |
|-------|--------|-------------|
| `story_id` | Story file name (e.g., WAVE1-FE-001) | Unique story identifier |
| `story_title` | Story JSON → title | Story description |
| `agent_name` | Container name (fe-dev-1, qa, etc.) | Agent working on story |
| `model_name` | Agent config → LLM assignment | Claude model being used |
| `gate_number` | Current gate (0-8) | Pipeline stage |
| `gate_name` | Gate name (Research, Plan, etc.) | Pipeline stage name |

---

## 3. GATE TRANSITION Notification

**Trigger:** When a story moves between gates

```json
{
  "blocks": [
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": "{emoji} *Gate Transition*\n*{story_id}*: Gate {from} → Gate {to}"
      }
    },
    {
      "type": "section",
      "fields": [
        {"type": "mrkdwn", "text": "*Status:*\n{PASSED|REJECTED}"},
        {"type": "mrkdwn", "text": "*Duration:*\n{mm:ss}"}
      ]
    },
    {
      "type": "context",
      "elements": [
        {"type": "mrkdwn", "text": "Tokens: {input_tokens} in / {output_tokens} out | Cost: ${cost} | {HH:MM:SS} IST"}
      ]
    }
  ]
}
```

**Emoji Logic:**
- `:white_check_mark:` - Gate passed
- `:x:` - Gate rejected/failed
- `:arrow_right:` - Transition in progress

---

## 4. PROGRESS UPDATE Notification

**Trigger:** Periodic updates during wave execution (every 5 minutes or per story)

```json
{
  "blocks": [
    {
      "type": "header",
      "text": {"type": "plain_text", "text": "WAVE {N} IN PROGRESS", "emoji": true}
    },
    {
      "type": "section",
      "fields": [
        {"type": "mrkdwn", "text": "*Current Gate:*\n{gate_number}-{gate_name}"},
        {"type": "mrkdwn", "text": "*Stories:*\n{completed}/{total} complete"}
      ]
    },
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": "*Active Agents:*\n:gear: FE-1: {story_id} (Gate {n})\n:gear: BE-1: {story_id} (Gate {n})"
      }
    },
    {
      "type": "section",
      "fields": [
        {"type": "mrkdwn", "text": "*Tokens Used:*\n{total_tokens:,}"},
        {"type": "mrkdwn", "text": "*Cost So Far:*\n${running_cost}"}
      ]
    },
    {
      "type": "section",
      "fields": [
        {"type": "mrkdwn", "text": "*Elapsed:*\n{elapsed_time}"},
        {"type": "mrkdwn", "text": "*Budget:*\n${spent}/${budget} ({percent}%)"}
      ]
    },
    {
      "type": "context",
      "elements": [
        {"type": "mrkdwn", "text": ":hourglass: Last update: {HH:MM:SS} IST"}
      ]
    }
  ]
}
```

---

## 5. STORY COMPLETE Notification

**Trigger:** When an agent completes a story

```json
{
  "blocks": [
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": ":white_check_mark: *Story Complete*\n*{story_id}*: {story_title}"
      }
    },
    {
      "type": "section",
      "fields": [
        {"type": "mrkdwn", "text": "*Agent:*\n{agent_name}"},
        {"type": "mrkdwn", "text": "*LLM:*\n{model_name}"}
      ]
    },
    {
      "type": "section",
      "fields": [
        {"type": "mrkdwn", "text": "*Files Created:*\n{file_count}"},
        {"type": "mrkdwn", "text": "*Lines Added:*\n{line_count}"}
      ]
    },
    {
      "type": "section",
      "fields": [
        {"type": "mrkdwn", "text": "*Tokens:*\n{input} in / {output} out"},
        {"type": "mrkdwn", "text": "*Cost:*\n${cost}"}
      ]
    },
    {
      "type": "section",
      "fields": [
        {"type": "mrkdwn", "text": "*Duration:*\n{duration}"},
        {"type": "mrkdwn", "text": "*Gates Passed:*\n{gates_passed}/8"}
      ]
    },
    {
      "type": "context",
      "elements": [
        {"type": "mrkdwn", "text": "Completed: {HH:MM:SS} IST"}
      ]
    }
  ]
}
```

---

## 6. QA RESULT Notification

**Trigger:** After QA validation completes

```json
{
  "blocks": [
    {
      "type": "header",
      "text": {"type": "plain_text", "text": "QA {APPROVED|REJECTED} - Wave {N}", "emoji": true}
    },
    {
      "type": "section",
      "fields": [
        {"type": "mrkdwn", "text": "*Tests:*\n{emoji} {passed}/{total} passed"},
        {"type": "mrkdwn", "text": "*Build:*\n{emoji} {status}"}
      ]
    },
    {
      "type": "section",
      "fields": [
        {"type": "mrkdwn", "text": "*Lint:*\n{emoji} {status}"},
        {"type": "mrkdwn", "text": "*TypeCheck:*\n{emoji} {status}"}
      ]
    },
    {
      "type": "section",
      "fields": [
        {"type": "mrkdwn", "text": "*QA Tokens:*\n{tokens:,}"},
        {"type": "mrkdwn", "text": "*QA Cost:*\n${cost}"}
      ]
    },
    {
      "type": "context",
      "elements": [
        {"type": "mrkdwn", "text": "{emoji} Attempt {n}/{max} | {HH:MM:SS} IST"}
      ]
    }
  ]
}
```

---

## 7. WAVE COMPLETE SUMMARY Notification

**Trigger:** When entire wave completes successfully

```json
{
  "blocks": [
    {
      "type": "header",
      "text": {"type": "plain_text", "text": "WAVE {N} COMPLETE!", "emoji": true}
    },
    {
      "type": "section",
      "fields": [
        {"type": "mrkdwn", "text": "*Project:*\n{project_name}"},
        {"type": "mrkdwn", "text": "*Stories:*\n{completed} completed"}
      ]
    },
    {
      "type": "divider"
    },
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": "*TOKEN COSTS BY AGENT:*"
      }
    },
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": "```\nAgent      | Model     | Tokens    | Cost    | Time\n-----------|-----------|-----------|---------|--------\nPM         | Opus 4.5  | {tokens}  | ${cost} | {time}\nCTO        | Opus 4.5  | {tokens}  | ${cost} | {time}\nFE-Dev-1   | Sonnet 4  | {tokens}  | ${cost} | {time}\nFE-Dev-2   | Sonnet 4  | {tokens}  | ${cost} | {time}\nBE-Dev-1   | Sonnet 4  | {tokens}  | ${cost} | {time}\nBE-Dev-2   | Sonnet 4  | {tokens}  | ${cost} | {time}\nQA         | Haiku 4   | {tokens}  | ${cost} | {time}\nDev-Fix    | Haiku 4   | {tokens}  | ${cost} | {time}\n-----------|-----------|-----------|---------|--------\nTOTAL      |           | {total}   | ${cost} | {time}\n```"
      }
    },
    {
      "type": "divider"
    },
    {
      "type": "section",
      "fields": [
        {"type": "mrkdwn", "text": "*Total Duration:*\n{duration}"},
        {"type": "mrkdwn", "text": "*Budget Used:*\n${spent}/${budget} ({percent}%)"}
      ]
    },
    {
      "type": "section",
      "fields": [
        {"type": "mrkdwn", "text": "*Files Created:*\n{file_count}"},
        {"type": "mrkdwn", "text": "*Lines of Code:*\n{line_count}"}
      ]
    },
    {
      "type": "context",
      "elements": [
        {"type": "mrkdwn", "text": ":trophy: Wave {N} deployed successfully | {HH:MM:SS} IST"}
      ]
    }
  ]
}
```

---

## 8. ERROR/ESCALATION Notification

**Trigger:** On pipeline errors or human intervention needed

```json
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
        "text": ":rotating_light: *Human intervention needed*\n\n*Wave:* {wave}\n*Story:* {story_id}\n*Gate:* {gate_number}-{gate_name}\n*Agent:* {agent_name}"
      }
    },
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": "*Reason:*\n{error_message}"
      }
    },
    {
      "type": "section",
      "fields": [
        {"type": "mrkdwn", "text": "*Attempts:*\n{n}/{max_retries}"},
        {"type": "mrkdwn", "text": "*Cost So Far:*\n${cost}"}
      ]
    },
    {
      "type": "context",
      "elements": [
        {"type": "mrkdwn", "text": ":sos: Pipeline halted | {HH:MM:SS} IST"}
      ]
    }
  ]
}
```

---

## Pre-Flight Validation Checklist

Add to `pre-flight-validator.sh`:

```bash
# ─────────────────────────────────────────────────────────────────────────────
# SECTION N: SLACK NOTIFICATION STRUCTURE
# ─────────────────────────────────────────────────────────────────────────────

# N1: Slack notification library exists
check "N1:" "Slack notify lib exists" \
    "test -f \"$WAVE_ROOT/core/scripts/lib/slack-notify.sh\""

# N2: All required notification functions exist
check "N2:" "All notification functions defined" \
    "grep -q 'slack_wave_start\|slack_story_start\|slack_story_complete\|slack_wave_complete' \
     \"$WAVE_ROOT/core/scripts/lib/slack-notify.sh\""

# N3: Token cost tracking in notifications
check "N3:" "Token cost fields in notification payloads" \
    "grep -qE 'token|cost|Token|Cost' \"$WAVE_ROOT/core/scripts/lib/slack-notify.sh\""

# N4: IST timezone configured
check "N4:" "IST timezone in notifications" \
    "grep -q 'Asia/Jerusalem' \"$WAVE_ROOT/core/scripts/lib/slack-notify.sh\""

# N5: 8-gate pipeline referenced
check "N5:" "8 gates referenced in notifications" \
    "grep -qE 'Research.*Plan.*TDD|8.*gate|Gate.*[0-8]' \
     \"$WAVE_ROOT/core/scripts/lib/slack-notify.sh\""
```

---

## Data Sources

| Data Point | Source Location | Update Frequency |
|------------|-----------------|------------------|
| Project name | `P.json → meta.project_name` | Static |
| Wave number | `.env → WAVE_NUMBER` | Per wave |
| Story list | `P.json → wave_state.stories` | Per wave |
| Token counts | LangSmith API / Local tracking | Per API call |
| Costs | Calculated from tokens × model rates | Per API call |
| Gate status | Signal files in `.claude/` | Per transition |
| Agent status | Container health + Redis queues | Real-time |

---

## Model Pricing Reference (for cost calculation)

| Model | Input (per 1M tokens) | Output (per 1M tokens) |
|-------|----------------------|------------------------|
| Opus 4.5 | $15.00 | $75.00 |
| Sonnet 4 | $3.00 | $15.00 |
| Haiku 4 | $0.25 | $1.25 |

---

## Implementation Notes

1. **Timezone**: Always use `TZ=Asia/Jerusalem date '+%H:%M:%S'` for IST
2. **Token Tracking**: Integrate with LangSmith or local accumulator
3. **Rate Limiting**: Max 1 notification per 10 seconds to avoid Slack limits
4. **Error Handling**: Always check webhook response, log failures
5. **Channel**: Use `#wave-notifications` (configured in `.env`)
