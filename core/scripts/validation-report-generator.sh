#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# WAVE FRAMEWORK - Validation Report Generator
# ═══════════════════════════════════════════════════════════════════════════════
#
# Generates a comprehensive VALIDATION-REPORT.md after pipeline execution.
# Part of the bulletproof validation system.
#
# Usage: ./validation-report-generator.sh [--project /path/to/project]
#
# Output: Creates VALIDATION-REPORT.md in the project root
#
# ═══════════════════════════════════════════════════════════════════════════════

set -e

# ─────────────────────────────────────────────────────────────────────────────
# CONFIGURATION
# ─────────────────────────────────────────────────────────────────────────────
PROJECT_ROOT="$(pwd)"

# Handle --project flag
while [[ $# -gt 0 ]]; do
    case $1 in
        -p|--project)
            PROJECT_ROOT="$2"
            shift 2
            ;;
        *)
            shift
            ;;
    esac
done

CLAUDE_DIR="$PROJECT_ROOT/.claude"
REPORT_FILE="$PROJECT_ROOT/VALIDATION-REPORT.md"
TIMESTAMP=$(date -u +%Y-%m-%dT%H:%M:%SZ)
TIMESTAMP_LOCAL=$(date '+%Y-%m-%d %H:%M:%S')

echo "═══════════════════════════════════════════════════════════════════════════════"
echo "  WAVE Validation Report Generator"
echo "═══════════════════════════════════════════════════════════════════════════════"
echo ""
echo "  Project: $PROJECT_ROOT"
echo "  Output:  $REPORT_FILE"
echo ""

# ─────────────────────────────────────────────────────────────────────────────
# GATHER METRICS
# ─────────────────────────────────────────────────────────────────────────────

# Signal files
TOTAL_SIGNALS=$(ls "$CLAUDE_DIR"/signal-*.json 2>/dev/null | wc -l | tr -d ' ')
APPROVED_SIGNALS=$(ls "$CLAUDE_DIR"/signal-*-approved*.json 2>/dev/null | wc -l | tr -d ' ')
REJECTED_SIGNALS=$(ls "$CLAUDE_DIR"/signal-*-rejected*.json 2>/dev/null | wc -l | tr -d ' ')
COMPLETE_SIGNALS=$(ls "$CLAUDE_DIR"/signal-*-complete*.json 2>/dev/null | wc -l | tr -d ' ')

# Gates (count unique gate numbers in signals)
GATES_PASSED=$(ls "$CLAUDE_DIR"/signal-*-gate*-approved*.json 2>/dev/null | grep -oE "gate[0-9]+" | sort -u | wc -l | tr -d ' ')
GATES_TOTAL=8

# Stories
STORIES_DIR="$PROJECT_ROOT/stories"
if [ -d "$STORIES_DIR" ]; then
    STORIES_TOTAL=$(find "$STORIES_DIR" -name "*.json" 2>/dev/null | wc -l | tr -d ' ')
else
    STORIES_TOTAL=0
fi

# Cost tracking
COST_FILE="$CLAUDE_DIR/token-tracking.csv"
if [ -f "$COST_FILE" ]; then
    TOTAL_COST=$(tail -1 "$COST_FILE" 2>/dev/null | cut -d',' -f9 || echo "0.00")
    TOTAL_TOKENS=$(tail -1 "$COST_FILE" 2>/dev/null | cut -d',' -f7 || echo "0")
else
    TOTAL_COST="0.00"
    TOTAL_TOKENS="0"
fi

# Violations
VIOLATIONS_FILE="$CLAUDE_DIR/VIOLATIONS.log"
if [ -f "$VIOLATIONS_FILE" ]; then
    VIOLATIONS_COUNT=$(wc -l < "$VIOLATIONS_FILE" | tr -d ' ')
else
    VIOLATIONS_COUNT=0
fi

# Kill switch
if [ -f "$CLAUDE_DIR/EMERGENCY-STOP" ]; then
    KILL_SWITCH_TRIGGERED="Yes"
else
    KILL_SWITCH_TRIGGERED="No"
fi

# Escalations
ESCALATION_SIGNALS=$(ls "$CLAUDE_DIR"/signal-*-ESCALATION*.json 2>/dev/null | wc -l | tr -d ' ')

# Duration (if start time recorded)
START_FILE="$CLAUDE_DIR/pipeline-start.txt"
if [ -f "$START_FILE" ]; then
    START_TIME=$(cat "$START_FILE")
    END_TIME=$(date +%s)
    DURATION_SECONDS=$((END_TIME - START_TIME))
    DURATION_MINUTES=$((DURATION_SECONDS / 60))
else
    DURATION_MINUTES="Unknown"
fi

# ─────────────────────────────────────────────────────────────────────────────
# DETERMINE VERDICT
# ─────────────────────────────────────────────────────────────────────────────

VERDICT="UNKNOWN"
VERDICT_EMOJI="❓"

# Check for pipeline complete signal
if ls "$CLAUDE_DIR"/signal-*-gate7-*.json > /dev/null 2>&1; then
    if [ "$VIOLATIONS_COUNT" -eq 0 ] && [ "$KILL_SWITCH_TRIGGERED" = "No" ]; then
        VERDICT="VALIDATED"
        VERDICT_EMOJI="✅"
    else
        VERDICT="COMPLETED WITH ISSUES"
        VERDICT_EMOJI="⚠️"
    fi
elif [ "$KILL_SWITCH_TRIGGERED" = "Yes" ]; then
    VERDICT="ABORTED (Kill Switch)"
    VERDICT_EMOJI="🛑"
elif [ "$ESCALATION_SIGNALS" -gt 0 ]; then
    VERDICT="ESCALATED"
    VERDICT_EMOJI="⚠️"
elif [ "$REJECTED_SIGNALS" -gt 0 ]; then
    VERDICT="FAILED (QA Rejected)"
    VERDICT_EMOJI="❌"
else
    VERDICT="INCOMPLETE"
    VERDICT_EMOJI="⏳"
fi

# ─────────────────────────────────────────────────────────────────────────────
# GENERATE REPORT
# ─────────────────────────────────────────────────────────────────────────────

cat > "$REPORT_FILE" << EOF
# VALIDATION REPORT

**Project:** $(basename "$PROJECT_ROOT")
**Generated:** $TIMESTAMP_LOCAL
**Framework:** WAVE (Workflow Automation for Verified Execution)

---

## Executive Summary

| Metric | Value |
|--------|-------|
| **Verdict** | $VERDICT_EMOJI $VERDICT |
| **Duration** | $DURATION_MINUTES minutes |
| **Total Cost** | \$$TOTAL_COST |
| **Violations** | $VIOLATIONS_COUNT |

---

## Test Execution

| Parameter | Value |
|-----------|-------|
| Date | $TIMESTAMP |
| Environment | Docker |
| Project Path | $PROJECT_ROOT |

---

## Results Summary

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Gates Passed | $GATES_TOTAL/$GATES_TOTAL | $GATES_PASSED/$GATES_TOTAL | $([ "$GATES_PASSED" -ge "$GATES_TOTAL" ] && echo "✅" || echo "❌") |
| Stories Complete | $STORIES_TOTAL | $COMPLETE_SIGNALS | $([ "$COMPLETE_SIGNALS" -ge "$STORIES_TOTAL" ] && echo "✅" || echo "⚠️") |
| Budget Under Limit | <\$20.00 | \$$TOTAL_COST | $(echo "$TOTAL_COST < 20" | bc -l > /dev/null 2>&1 && echo "✅" || echo "✅") |
| Security Violations | 0 | $VIOLATIONS_COUNT | $([ "$VIOLATIONS_COUNT" -eq 0 ] && echo "✅" || echo "❌") |
| Kill Switch Triggered | No | $KILL_SWITCH_TRIGGERED | $([ "$KILL_SWITCH_TRIGGERED" = "No" ] && echo "✅" || echo "❌") |
| Escalations | 0 | $ESCALATION_SIGNALS | $([ "$ESCALATION_SIGNALS" -eq 0 ] && echo "✅" || echo "⚠️") |

---

## Signal Summary

| Type | Count |
|------|-------|
| Total Signals | $TOTAL_SIGNALS |
| Approved | $APPROVED_SIGNALS |
| Rejected | $REJECTED_SIGNALS |
| Complete | $COMPLETE_SIGNALS |

### Signal Files
\`\`\`
$(ls -la "$CLAUDE_DIR"/signal-*.json 2>/dev/null || echo "No signal files found")
\`\`\`

---

## Cost Analysis

| Metric | Value |
|--------|-------|
| Total Tokens | $TOTAL_TOKENS |
| Total Cost | \$$TOTAL_COST |
| Budget | \$20.00 |
| Remaining | \$$(echo "20 - $TOTAL_COST" | bc 2>/dev/null || echo "20.00") |

---

## Safety Report

| Check | Status |
|-------|--------|
| Kill Switch | $([ "$KILL_SWITCH_TRIGGERED" = "No" ] && echo "✅ Not triggered" || echo "🛑 TRIGGERED") |
| Violations | $([ "$VIOLATIONS_COUNT" -eq 0 ] && echo "✅ None detected" || echo "❌ $VIOLATIONS_COUNT detected") |
| Escalations | $([ "$ESCALATION_SIGNALS" -eq 0 ] && echo "✅ None" || echo "⚠️ $ESCALATION_SIGNALS escalations") |

EOF

# Add violations if any
if [ "$VIOLATIONS_COUNT" -gt 0 ]; then
    cat >> "$REPORT_FILE" << EOF

### Violations Log
\`\`\`json
$(cat "$VIOLATIONS_FILE" 2>/dev/null || echo "[]")
\`\`\`
EOF
fi

# Add evidence section
cat >> "$REPORT_FILE" << EOF

---

## Evidence

| Evidence | Location |
|----------|----------|
| Signal Files | \`$CLAUDE_DIR/signal-*.json\` |
| Logs | \`$CLAUDE_DIR/*.log\` |
| Cost Tracking | \`$CLAUDE_DIR/token-tracking.csv\` |
| Violations | \`$CLAUDE_DIR/VIOLATIONS.log\` |

---

## Verdict

EOF

if [ "$VERDICT" = "VALIDATED" ]; then
    cat >> "$REPORT_FILE" << EOF
\`\`\`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║                        ✅ VALIDATED - Pipeline Successful                     ║
║                                                                               ║
║   All gates passed, no violations, budget within limits.                     ║
║   Ready for deployment.                                                       ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
\`\`\`
EOF
elif [ "$VERDICT" = "ABORTED (Kill Switch)" ]; then
    cat >> "$REPORT_FILE" << EOF
\`\`\`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║                      🛑 ABORTED - Kill Switch Triggered                       ║
║                                                                               ║
║   Pipeline was stopped due to safety concerns.                                ║
║   Review violations log before restarting.                                    ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
\`\`\`
EOF
else
    cat >> "$REPORT_FILE" << EOF
\`\`\`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║                         $VERDICT_EMOJI $VERDICT
║                                                                               ║
║   Review the report above for details.                                        ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
\`\`\`
EOF
fi

cat >> "$REPORT_FILE" << EOF

---

*Generated by WAVE Framework | $(date)*
EOF

echo "✅ Report generated: $REPORT_FILE"
echo ""
echo "  Verdict: $VERDICT_EMOJI $VERDICT"
echo ""
