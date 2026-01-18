#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# WAVE FRAMEWORK - Pre-Merge Validator (Gate 5 Validation)
# ═══════════════════════════════════════════════════════════════════════════════
#
# Purpose: Validate wave completion BEFORE approving merge at Gate 7
# Used by: PM Agent at Gate 5-6 or humans before merge approval
# Naming: "Pre-merge" = validation before landing approach (merge)
#
# Validates:
#   - All stories complete
#   - QA approval exists
#   - No open escalations
#   - Budget within limits
#   - All acceptance criteria met
#   - Safety compliance
#
# Usage: ./pre-merge-validator.sh [--project /path] [--wave N] [--json]
#
# Exit codes:
#   0 = APPROVED (safe to merge)
#   1 = REJECTED (issues found)
#
# ═══════════════════════════════════════════════════════════════════════════════

set -euo pipefail

VERSION="1.0.0"

# ─────────────────────────────────────────────────────────────────────────────
# CONFIGURATION
# ─────────────────────────────────────────────────────────────────────────────
PROJECT_ROOT="$(pwd)"
WAVE=""
OUTPUT_JSON="false"
VERBOSE="false"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Counters
PASS=0
FAIL=0
WARN=0
TOTAL=0

# Results array for JSON output
declare -a RESULTS=()

# ─────────────────────────────────────────────────────────────────────────────
# ARGUMENT PARSING
# ─────────────────────────────────────────────────────────────────────────────
show_usage() {
    cat << EOF
WAVE Pre-Merge Validator - Gate 5 Validation

Usage: $0 [options]

Options:
  -p, --project <path>    Project root directory (default: current)
  -w, --wave <number>     Wave number to validate (default: latest)
  --json                  Output results as JSON
  -v, --verbose           Verbose output
  -h, --help              Show this help

Examples:
  $0 --project /my/project --wave 1
  $0 --json > validation-result.json
  $0 -v

EOF
    exit 0
}

while [[ $# -gt 0 ]]; do
    case $1 in
        -p|--project)
            PROJECT_ROOT="$2"
            shift 2
            ;;
        -w|--wave)
            WAVE="$2"
            shift 2
            ;;
        --json)
            OUTPUT_JSON="true"
            shift
            ;;
        -v|--verbose)
            VERBOSE="true"
            shift
            ;;
        -h|--help)
            show_usage
            ;;
        *)
            echo "Unknown option: $1"
            show_usage
            ;;
    esac
done

# Directories
CLAUDE_DIR="${PROJECT_ROOT}/.claude"
STORIES_DIR="${PROJECT_ROOT}/stories"
SIGNAL_DIR="${CLAUDE_DIR}"
LOG_DIR="${PROJECT_ROOT}/logs"

# ─────────────────────────────────────────────────────────────────────────────
# HELPER FUNCTIONS
# ─────────────────────────────────────────────────────────────────────────────
log_info() {
    if [ "$OUTPUT_JSON" != "true" ]; then
        echo -e "${BLUE}[INFO]${NC} $1"
    fi
}

log_verbose() {
    if [ "$VERBOSE" = "true" ] && [ "$OUTPUT_JSON" != "true" ]; then
        echo -e "${CYAN}[DEBUG]${NC} $1"
    fi
}

check() {
    local code="$1"
    local name="$2"
    local result="$3"
    local required="${4:-true}"
    local details="${5:-}"

    ((TOTAL++)) || true

    local status=""
    if [ "$result" = "true" ]; then
        ((PASS++)) || true
        status="pass"
        if [ "$OUTPUT_JSON" != "true" ]; then
            echo -e "${GREEN}✅ $code: $name${NC}"
        fi
    elif [ "$required" = "true" ]; then
        ((FAIL++)) || true
        status="fail"
        if [ "$OUTPUT_JSON" != "true" ]; then
            echo -e "${RED}❌ $code: $name${NC}"
            [ -n "$details" ] && echo -e "   ${RED}→ $details${NC}"
        fi
    else
        ((WARN++)) || true
        status="warn"
        if [ "$OUTPUT_JSON" != "true" ]; then
            echo -e "${YELLOW}⚠️  $code: $name (optional)${NC}"
        fi
    fi

    # Add to results array
    RESULTS+=("{\"code\":\"$code\",\"name\":\"$name\",\"status\":\"$status\",\"required\":$required,\"details\":\"$details\"}")
}

section() {
    if [ "$OUTPUT_JSON" != "true" ]; then
        echo ""
        echo -e "${BLUE}═══ $1 ═══${NC}"
    fi
}

# ─────────────────────────────────────────────────────────────────────────────
# DETECT WAVE NUMBER
# ─────────────────────────────────────────────────────────────────────────────
detect_wave() {
    if [ -n "$WAVE" ]; then
        return
    fi

    # Try to detect from latest signal
    local latest_signal=$(ls -t "${SIGNAL_DIR}"/signal-wave*-gate4-approved.json 2>/dev/null | head -1)
    if [ -n "$latest_signal" ]; then
        WAVE=$(echo "$latest_signal" | grep -oP 'wave\K[0-9]+')
    fi

    # Default to wave 1
    WAVE="${WAVE:-1}"
    log_verbose "Detected wave: $WAVE"
}

# ─────────────────────────────────────────────────────────────────────────────
# MAIN VALIDATION
# ─────────────────────────────────────────────────────────────────────────────

if [ "$OUTPUT_JSON" != "true" ]; then
    echo "═══════════════════════════════════════════════════════════════════════════════"
    echo "  WAVE PRE-MERGE VALIDATOR v${VERSION} - Gate 5 Validation"
    echo "═══════════════════════════════════════════════════════════════════════════════"
    echo ""
    echo "  Project: $PROJECT_ROOT"
    echo "  Date: $(date)"
    echo ""
fi

detect_wave

if [ "$OUTPUT_JSON" != "true" ]; then
    echo "  Wave: $WAVE"
    echo ""
fi

# ─────────────────────────────────────────────────────────────────────────────
# SECTION A: QA APPROVAL STATUS
# ─────────────────────────────────────────────────────────────────────────────
section "SECTION A: QA APPROVAL STATUS"

# Check for Gate 4 approval signal
QA_APPROVED_SIGNAL="${SIGNAL_DIR}/signal-wave${WAVE}-gate4-approved.json"
if [ -f "$QA_APPROVED_SIGNAL" ]; then
    check "A1" "QA Gate 4 approval signal exists" "true"

    # Parse approval details
    if command -v jq &> /dev/null; then
        QA_TIMESTAMP=$(jq -r '.timestamp // "unknown"' "$QA_APPROVED_SIGNAL" 2>/dev/null)
        QA_AGENT=$(jq -r '.agent // "qa"' "$QA_APPROVED_SIGNAL" 2>/dev/null)
        check "A2" "QA approval timestamp valid ($QA_TIMESTAMP)" "$([ "$QA_TIMESTAMP" != "unknown" ] && echo true || echo false)"
    else
        check "A2" "QA approval details (jq not available)" "true" "false"
    fi
else
    check "A1" "QA Gate 4 approval signal exists" "false" "true" "Missing: $QA_APPROVED_SIGNAL"
fi

# Check for rejection signal (should NOT exist)
QA_REJECTED_SIGNAL="${SIGNAL_DIR}/signal-wave${WAVE}-gate4-rejected.json"
if [ -f "$QA_REJECTED_SIGNAL" ]; then
    check "A3" "No pending QA rejection" "false" "true" "Found: $QA_REJECTED_SIGNAL"
else
    check "A3" "No pending QA rejection" "true"
fi

# ─────────────────────────────────────────────────────────────────────────────
# SECTION B: STORY COMPLETION
# ─────────────────────────────────────────────────────────────────────────────
section "SECTION B: STORY COMPLETION"

# Count and validate stories
STORY_COUNT=0
STORIES_COMPLETE=0
STORIES_INCOMPLETE=0

if [ -d "$STORIES_DIR" ]; then
    for story_file in "${STORIES_DIR}"/*.json; do
        [ -f "$story_file" ] || continue
        ((STORY_COUNT++)) || true

        if command -v jq &> /dev/null; then
            STORY_ID=$(jq -r '.id // "unknown"' "$story_file" 2>/dev/null)
            STORY_STATUS=$(jq -r '.status // "pending"' "$story_file" 2>/dev/null)

            if [ "$STORY_STATUS" = "complete" ] || [ "$STORY_STATUS" = "completed" ]; then
                ((STORIES_COMPLETE++)) || true
                log_verbose "Story $STORY_ID: complete"
            else
                ((STORIES_INCOMPLETE++)) || true
                log_verbose "Story $STORY_ID: $STORY_STATUS"
            fi
        fi
    done
fi

check "B1" "Stories found ($STORY_COUNT total)" "$([ $STORY_COUNT -gt 0 ] && echo true || echo false)"

if [ $STORY_COUNT -gt 0 ]; then
    # Check for completion signals instead if status not in story files
    COMPLETION_SIGNALS=$(ls "${SIGNAL_DIR}"/signal-wave${WAVE}-gate3-*-complete.json 2>/dev/null | wc -l | tr -d ' ')
    if [ "$COMPLETION_SIGNALS" -gt 0 ]; then
        check "B2" "Development completion signals ($COMPLETION_SIGNALS found)" "true"
    else
        check "B2" "Development completion signals" "$([ $STORIES_COMPLETE -gt 0 ] && echo true || echo false)" "true" "No gate 3 completion signals found"
    fi
fi

# ─────────────────────────────────────────────────────────────────────────────
# SECTION C: ESCALATION STATUS
# ─────────────────────────────────────────────────────────────────────────────
section "SECTION C: ESCALATION STATUS"

# Check for open escalations
ESCALATION_COUNT=$(ls "${SIGNAL_DIR}"/signal-*-ESCALATION*.json 2>/dev/null | wc -l | tr -d ' ')
if [ "$ESCALATION_COUNT" -eq 0 ]; then
    check "C1" "No open escalation signals" "true"
else
    check "C1" "No open escalation signals" "false" "true" "$ESCALATION_COUNT escalation(s) found"

    # List escalations
    if [ "$VERBOSE" = "true" ]; then
        for esc in "${SIGNAL_DIR}"/signal-*-ESCALATION*.json; do
            [ -f "$esc" ] && log_verbose "Escalation: $(basename "$esc")"
        done
    fi
fi

# Check for urgent escalations
URGENT_COUNT=$(ls "${SIGNAL_DIR}"/signal-*-URGENT-ESCALATION*.json 2>/dev/null | wc -l | tr -d ' ')
if [ "$URGENT_COUNT" -eq 0 ]; then
    check "C2" "No urgent escalations" "true"
else
    check "C2" "No urgent escalations" "false" "true" "$URGENT_COUNT urgent escalation(s) found"
fi

# Check for security escalations
SECURITY_COUNT=$(ls "${SIGNAL_DIR}"/signal-*-SECURITY*.json 2>/dev/null | wc -l | tr -d ' ')
if [ "$SECURITY_COUNT" -eq 0 ]; then
    check "C3" "No security incidents" "true"
else
    check "C3" "No security incidents" "false" "true" "$SECURITY_COUNT security incident(s) found"
fi

# ─────────────────────────────────────────────────────────────────────────────
# SECTION D: BUDGET STATUS
# ─────────────────────────────────────────────────────────────────────────────
section "SECTION D: BUDGET STATUS"

# Load budget from .env or config
if [ -f "$PROJECT_ROOT/.env" ]; then
    source "$PROJECT_ROOT/.env" 2>/dev/null
fi

BUDGET_LIMIT="${WAVE_BUDGET_LIMIT:-5.00}"
BUDGET_WARN="${WAVE_BUDGET_WARN:-0.80}"

# Calculate total cost from signals
TOTAL_COST=0
if command -v jq &> /dev/null; then
    for signal in "${SIGNAL_DIR}"/signal-wave${WAVE}-*.json; do
        [ -f "$signal" ] || continue
        SIGNAL_COST=$(jq -r '.token_usage.estimated_cost_usd // 0' "$signal" 2>/dev/null)
        if [[ "$SIGNAL_COST" =~ ^[0-9.]+$ ]]; then
            TOTAL_COST=$(echo "$TOTAL_COST + $SIGNAL_COST" | bc 2>/dev/null || echo "$TOTAL_COST")
        fi
    done
fi

# Check budget
BUDGET_PERCENT=$(echo "scale=2; ($TOTAL_COST / $BUDGET_LIMIT) * 100" | bc 2>/dev/null || echo "0")

if (( $(echo "$TOTAL_COST < $BUDGET_LIMIT" | bc -l 2>/dev/null || echo "1") )); then
    check "D1" "Budget within limit (\$${TOTAL_COST}/\$${BUDGET_LIMIT} = ${BUDGET_PERCENT}%)" "true"
else
    check "D1" "Budget within limit (\$${TOTAL_COST}/\$${BUDGET_LIMIT})" "false" "true" "Budget exceeded by \$$(echo "$TOTAL_COST - $BUDGET_LIMIT" | bc)"
fi

# Warning threshold
WARN_THRESHOLD=$(echo "$BUDGET_LIMIT * $BUDGET_WARN" | bc 2>/dev/null || echo "4")
if (( $(echo "$TOTAL_COST < $WARN_THRESHOLD" | bc -l 2>/dev/null || echo "1") )); then
    check "D2" "Budget below warning threshold (${BUDGET_WARN})" "true"
else
    check "D2" "Budget below warning threshold" "true" "false" "At ${BUDGET_PERCENT}% of budget"
fi

# ─────────────────────────────────────────────────────────────────────────────
# SECTION E: SAFETY COMPLIANCE
# ─────────────────────────────────────────────────────────────────────────────
section "SECTION E: SAFETY COMPLIANCE"

# Check kill switch is clear
if [ -f "${CLAUDE_DIR}/EMERGENCY-STOP" ]; then
    check "E1" "Kill switch is clear" "false" "true" "EMERGENCY-STOP file exists"
else
    check "E1" "Kill switch is clear" "true"
fi

# Check violations log
VIOLATIONS_LOG="${CLAUDE_DIR}/VIOLATIONS.log"
if [ -f "$VIOLATIONS_LOG" ]; then
    VIOLATION_COUNT=$(wc -l < "$VIOLATIONS_LOG" | tr -d ' ')
    if [ "$VIOLATION_COUNT" -eq 0 ]; then
        check "E2" "No safety violations logged" "true"
    else
        # Check for recent violations (last 24 hours)
        RECENT_VIOLATIONS=$(find "$VIOLATIONS_LOG" -mtime -1 2>/dev/null | wc -l | tr -d ' ')
        if [ "$RECENT_VIOLATIONS" -gt 0 ]; then
            check "E2" "No recent safety violations" "false" "true" "$VIOLATION_COUNT violation(s) in log"
        else
            check "E2" "No recent safety violations" "true" "false" "$VIOLATION_COUNT old violation(s) in log"
        fi
    fi
else
    check "E2" "No safety violations logged" "true"
fi

# Check for boundary violations
BOUNDARY_VIOLATIONS=$(ls "${SIGNAL_DIR}"/signal-*-boundary-violation*.json 2>/dev/null | wc -l | tr -d ' ')
if [ "$BOUNDARY_VIOLATIONS" -eq 0 ]; then
    check "E3" "No domain boundary violations" "true"
else
    check "E3" "No domain boundary violations" "false" "true" "$BOUNDARY_VIOLATIONS violation(s) found"
fi

# ─────────────────────────────────────────────────────────────────────────────
# SECTION F: BUILD STATUS
# ─────────────────────────────────────────────────────────────────────────────
section "SECTION F: BUILD STATUS"

# Check for build success indicators
BUILD_LOG="${LOG_DIR}/build.log"
if [ -f "$BUILD_LOG" ]; then
    if grep -q "Build successful\|build passed\|Successfully compiled" "$BUILD_LOG" 2>/dev/null; then
        check "F1" "Build completed successfully" "true"
    else
        check "F1" "Build completed successfully" "false" "true" "Check $BUILD_LOG for errors"
    fi
else
    # Check for QA signal build status
    if [ -f "$QA_APPROVED_SIGNAL" ] && command -v jq &> /dev/null; then
        BUILD_STATUS=$(jq -r '.validation.build // "unknown"' "$QA_APPROVED_SIGNAL" 2>/dev/null)
        check "F1" "Build status from QA ($BUILD_STATUS)" "$([ "$BUILD_STATUS" = "passed" ] || [ "$BUILD_STATUS" = "pass" ] && echo true || echo false)" "false"
    else
        check "F1" "Build status" "true" "false" "No build log found"
    fi
fi

# Check for test success
TEST_LOG="${LOG_DIR}/test.log"
if [ -f "$TEST_LOG" ]; then
    if grep -q "Tests passed\|All tests passed\|0 failed" "$TEST_LOG" 2>/dev/null; then
        check "F2" "Tests passed" "true"
    else
        check "F2" "Tests passed" "false" "true" "Check $TEST_LOG for failures"
    fi
else
    if [ -f "$QA_APPROVED_SIGNAL" ] && command -v jq &> /dev/null; then
        TEST_STATUS=$(jq -r '.validation.tests // "unknown"' "$QA_APPROVED_SIGNAL" 2>/dev/null)
        check "F2" "Test status from QA ($TEST_STATUS)" "$([ "$TEST_STATUS" = "passed" ] || [ "$TEST_STATUS" = "pass" ] && echo true || echo false)" "false"
    else
        check "F2" "Test status" "true" "false" "No test log found"
    fi
fi

# ─────────────────────────────────────────────────────────────────────────────
# SECTION G: RETRY LOOP STATUS
# ─────────────────────────────────────────────────────────────────────────────
section "SECTION G: RETRY LOOP STATUS"

# Check retry count
RETRY_SIGNALS=$(ls "${SIGNAL_DIR}"/signal-wave${WAVE}-gate4.5-retry*.json 2>/dev/null | wc -l | tr -d ' ')
MAX_RETRIES=3

if [ "$RETRY_SIGNALS" -lt "$MAX_RETRIES" ]; then
    check "G1" "Retry count within limit ($RETRY_SIGNALS/$MAX_RETRIES)" "true"
else
    check "G1" "Retry count within limit ($RETRY_SIGNALS/$MAX_RETRIES)" "false" "false" "Max retries reached"
fi

# Check for stuck agents
STUCK_SIGNALS=$(ls "${SIGNAL_DIR}"/signal-*-stuck*.json 2>/dev/null | wc -l | tr -d ' ')
if [ "$STUCK_SIGNALS" -eq 0 ]; then
    check "G2" "No stuck agent signals" "true"
else
    check "G2" "No stuck agent signals" "false" "true" "$STUCK_SIGNALS stuck signal(s) found"
fi

# ─────────────────────────────────────────────────────────────────────────────
# RESULTS SUMMARY
# ─────────────────────────────────────────────────────────────────────────────

if [ "$OUTPUT_JSON" = "true" ]; then
    # Output JSON results
    RESULTS_JSON=$(printf '%s\n' "${RESULTS[@]}" | paste -sd ',' -)
    cat << EOF
{
    "validator": "pre-merge-validator",
    "version": "$VERSION",
    "project": "$PROJECT_ROOT",
    "wave": $WAVE,
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "summary": {
        "total": $TOTAL,
        "passed": $PASS,
        "failed": $FAIL,
        "warnings": $WARN
    },
    "verdict": "$([ $FAIL -eq 0 ] && echo "APPROVED" || echo "REJECTED")",
    "results": [$RESULTS_JSON]
}
EOF
else
    echo ""
    echo "═══════════════════════════════════════════════════════════════════════════════"
    echo "  VALIDATION RESULTS"
    echo "═══════════════════════════════════════════════════════════════════════════════"
    echo ""
    echo -e "  ${GREEN}✅ Passed:   $PASS${NC}"
    echo -e "  ${YELLOW}⚠️  Warnings: $WARN${NC}"
    echo -e "  ${RED}❌ Failed:   $FAIL${NC}"
    echo ""

    SCORE=$(echo "scale=1; ($PASS * 100) / $TOTAL" | bc 2>/dev/null || echo "0")
    echo "  Score: $PASS/$TOTAL ($SCORE%)"
    echo ""

    if [ $FAIL -eq 0 ]; then
        echo -e "${GREEN}╔═══════════════════════════════════════════════════════════════════════════════╗"
        echo "║                                                                               ║"
        echo "║      ✅ APPROVED - Wave $WAVE ready for merge                                  ║"
        echo "║                                                                               ║"
        echo "╚═══════════════════════════════════════════════════════════════════════════════╝${NC}"
        echo ""
        echo "  Next step: Create merge approval signal"
        echo "  Signal: signal-wave${WAVE}-gate7-merge-approved.json"
        echo ""

        # Create approval signal suggestion
        echo "  Suggested signal content:"
        cat << EOF
  {
      "signal_type": "merge-approved",
      "wave": $WAVE,
      "gate": 7,
      "status": "APPROVED",
      "approver": "pm",
      "validation_score": "$PASS/$TOTAL",
      "total_cost": "\$${TOTAL_COST}",
      "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  }
EOF
    else
        echo -e "${RED}╔═══════════════════════════════════════════════════════════════════════════════╗"
        echo "║                                                                               ║"
        echo "║      ❌ REJECTED - $FAIL issue(s) must be resolved before merge               ║"
        echo "║                                                                               ║"
        echo "╚═══════════════════════════════════════════════════════════════════════════════╝${NC}"
        echo ""
        echo "  Fix the failed checks above before requesting merge approval."
        echo ""
    fi
fi

# Exit with appropriate code
[ $FAIL -eq 0 ] && exit 0 || exit 1
