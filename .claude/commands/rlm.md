# /rlm - Token Budget & Learning Monitor

**Priority:** P1 (HIGH)
**Recommended Model:** Haiku
**Aliases:** /budget, /tokens

## Purpose

Monitor token usage against budget limits, track costs, and log mistakes for reinforcement learning (RLM = Reinforcement Learning from Mistakes). Critical for cost control in multi-agent operations.

## When to Run

- Continuous monitoring during story work
- Before expensive operations (transforms, complex refactors)
- End of session for reporting
- When budget alerts triggered

## Arguments

| Argument | Description |
|----------|-------------|
| (none) | Show current budget status |
| `--report` | Generate detailed usage report |
| `--reset` | Reset counters (admin only) |
| `--budget <tokens>` | Set budget for current story |
| `--log <mistake>` | Log a mistake for learning |

## Budget Limits (from SKILL.md)

```yaml
max_tokens_per_story: 100000
max_iterations_per_story: 20
max_file_changes_per_commit: 15
alert_threshold: 0.8  # 80% warning
hard_stop: 1.0        # 100% halt
```

## Execution

### /rlm (default - status)
```bash
python scripts/rlm_auditor.py --project /Volumes/SSD-01/Projects/Footprint/footprint --status
```

Or inline calculation:
1. Read `.claude/P.json` for current story context
2. Estimate tokens used in session
3. Calculate cost based on model usage

### /rlm --report
```bash
python scripts/rlm_auditor.py --project /Volumes/SSD-01/Projects/Footprint/footprint --report
```

## Output Format

### Status (default)
```
RLM Token Budget Monitor
========================
Current Story: WAVE1-FE-001
Budget: 100,000 tokens
Used: 45,230 tokens (45.2%)
Remaining: 54,770 tokens

Session Stats:
- Prompts: 23
- Completions: 21
- Avg tokens/prompt: 1,967

Cost Estimate: $0.68
- Opus: $0.45 (5 calls)
- Sonnet: $0.15 (8 calls)
- Haiku: $0.08 (10 calls)

Mistakes Logged: 2
- [M001] Forgot pre-flight check
- [M002] Committed to wrong branch

Budget Status: OK (under 80% threshold)
```

### Warning State (80%+)
```
RLM Token Budget Monitor
========================
Current Story: WAVE1-FE-001
Budget: 100,000 tokens
Used: 82,500 tokens (82.5%)
Remaining: 17,500 tokens

[WARNING] Budget at 82.5% - consider wrapping up

RECOMMENDATIONS:
1. Complete current task only
2. Avoid new exploratory work
3. Use Haiku for remaining operations
4. Consider /escalate if blocked

Budget Status: WARNING
```

### Critical State (100%+)
```
RLM Token Budget Monitor
========================
[CRITICAL] BUDGET EXCEEDED

Current Story: WAVE1-FE-001
Budget: 100,000 tokens
Used: 105,230 tokens (105.2%)
Over budget by: 5,230 tokens

ACTION REQUIRED:
1. STOP all non-essential work
2. Save current progress
3. Run /escalate to notify human
4. Request budget increase if needed

Budget Status: HALT RECOMMENDED
```

## Mistake Logging

### /rlm --log "description"
```
Mistake logged: M003
Description: Pushed to main instead of feature branch
Timestamp: 2026-01-29T14:30:00Z
Story: WAVE1-FE-001

Total mistakes this session: 3
Learning integration: Active
```

### Common Mistakes to Track
- Forgot pre-flight check
- Committed to wrong branch
- Pushed without tests
- Exceeded file change limit
- Used Opus for simple task
- Ignored lint warnings
- Skipped code review

## Cost Calculation

### Model Pricing (per 1K tokens)
```yaml
opus:
  input: $0.015
  output: $0.075
sonnet:
  input: $0.003
  output: $0.015
haiku:
  input: $0.00025
  output: $0.00125
```

### Estimation Formula
```
cost = (input_tokens * input_price + output_tokens * output_price) / 1000
```

## Alerts

| Threshold | Action |
|-----------|--------|
| 50% | Info: "Halfway through budget" |
| 80% | Warning: "Consider wrapping up" |
| 95% | Critical: "Complete current task only" |
| 100% | HALT: "Stop and escalate" |

## Integration

- Script: `scripts/rlm_auditor.py`
- Config: `.claude/P.json` (rlm_config section)
- Output: Console + optional file report
- Triggers: `/escalate` at 100%

## Evidence Sources

- Script: `/Volumes/SSD-01/Projects/Footprint/footprint/scripts/rlm_auditor.py`
- Spec: `/Volumes/SSD-01/Projects/Footprint/footprint/.claude/SKILLS-RECOMMENDATION.md` (Section 3.10)
- Budget Config: SKILL.md constraints
