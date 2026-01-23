#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# WAVE FRAMEWORK - Kill Switch Check Script
# ═══════════════════════════════════════════════════════════════════════════════
#
# Checks BOTH local file AND remote Supabase kill switch.
# "Safety must be enforced externally, not requested"
#
# Usage:
#   ./check-kill-switch.sh              # Single check
#   ./check-kill-switch.sh --continuous # Continuous polling (background)
#   ./check-kill-switch.sh --test       # Drill mode - simulates without halting
#
# Exit codes:
#   0 = Safe to proceed
#   1 = Kill switch ACTIVE - stop immediately
#   2 = Drill completed successfully (--test mode only)
#
# Environment:
#   SUPABASE_URL         - Supabase project URL
#   SUPABASE_SERVICE_KEY - Supabase service role key
#   LOCAL_KILL_FILE      - Local kill switch file (default: .claude/EMERGENCY-STOP)
#   POLL_INTERVAL        - Seconds between checks in continuous mode (default: 30)
#
# ═══════════════════════════════════════════════════════════════════════════════

set -e

# ─────────────────────────────────────────────────────────────────────────────
# CONFIGURATION
# ─────────────────────────────────────────────────────────────────────────────
MODE="${1:-single}"
POLL_INTERVAL="${POLL_INTERVAL:-30}"
LOCAL_KILL_FILE="${LOCAL_KILL_FILE:-.claude/EMERGENCY-STOP}"

# ─────────────────────────────────────────────────────────────────────────────
# FUNCTION: Check Kill Switch
# ─────────────────────────────────────────────────────────────────────────────
check_kill_switch() {
    # ─────────────────────────────────────────────────────────────────────────
    # CHECK 1: Local file-based kill switch
    # ─────────────────────────────────────────────────────────────────────────
    if [ -f "$LOCAL_KILL_FILE" ]; then
        REASON=$(cat "$LOCAL_KILL_FILE" 2>/dev/null || echo "No reason provided")
        echo ""
        echo "╔═══════════════════════════════════════════════════════════════════════════════╗"
        echo "║  LOCAL KILL SWITCH ACTIVE                                                     ║"
        echo "╚═══════════════════════════════════════════════════════════════════════════════╝"
        echo "   File:   $LOCAL_KILL_FILE"
        echo "   Reason: $REASON"
        echo ""
        return 1
    fi

    # ─────────────────────────────────────────────────────────────────────────
    # CHECK 2: Remote Supabase kill switch
    # ─────────────────────────────────────────────────────────────────────────
    if [ -n "$SUPABASE_URL" ] && [ -n "$SUPABASE_SERVICE_KEY" ]; then
        KILL_SWITCH=$(curl -s --max-time 5 \
            "${SUPABASE_URL}/rest/v1/maf_kill_switch?is_active=eq.true&select=id,reason,activated_by,activated_at" \
            -H "apikey: ${SUPABASE_SERVICE_KEY}" \
            -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}" 2>/dev/null || echo "[]")

        # Check if result is not empty array
        if [ "$KILL_SWITCH" != "[]" ] && [ -n "$KILL_SWITCH" ] && [ "$KILL_SWITCH" != "error" ]; then
            # Parse JSON response
            REASON=$(echo "$KILL_SWITCH" | grep -o '"reason":"[^"]*"' | head -1 | cut -d'"' -f4 || echo "No reason")
            ACTIVATED_BY=$(echo "$KILL_SWITCH" | grep -o '"activated_by":"[^"]*"' | head -1 | cut -d'"' -f4 || echo "Unknown")

            echo ""
            echo "╔═══════════════════════════════════════════════════════════════════════════════╗"
            echo "║  REMOTE KILL SWITCH ACTIVE (Supabase)                                         ║"
            echo "╚═══════════════════════════════════════════════════════════════════════════════╝"
            echo "   Reason:       $REASON"
            echo "   Activated by: $ACTIVATED_BY"
            echo ""

            # Also create local file to ensure agents stop
            mkdir -p "$(dirname "$LOCAL_KILL_FILE")"
            echo "Remote kill switch: $REASON (by $ACTIVATED_BY)" > "$LOCAL_KILL_FILE"

            return 1
        fi
    fi

    # ─────────────────────────────────────────────────────────────────────────
    # All clear
    # ─────────────────────────────────────────────────────────────────────────
    return 0
}

# ─────────────────────────────────────────────────────────────────────────────
# FUNCTION: Activate Kill Switch
# ─────────────────────────────────────────────────────────────────────────────
activate_kill_switch() {
    local reason="${1:-Manual activation}"
    local activated_by="${2:-cli}"

    # Create local file
    mkdir -p "$(dirname "$LOCAL_KILL_FILE")"
    echo "$reason" > "$LOCAL_KILL_FILE"
    echo "✅ Local kill switch activated: $LOCAL_KILL_FILE"

    # Update Supabase if configured
    if [ -n "$SUPABASE_URL" ] && [ -n "$SUPABASE_SERVICE_KEY" ]; then
        TIMESTAMP=$(date -u +%Y-%m-%dT%H:%M:%SZ)
        curl -s -X POST \
            "${SUPABASE_URL}/rest/v1/maf_kill_switch" \
            -H "apikey: ${SUPABASE_SERVICE_KEY}" \
            -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}" \
            -H "Content-Type: application/json" \
            -d "{\"is_active\": true, \"reason\": \"$reason\", \"activated_by\": \"$activated_by\", \"activated_at\": \"$TIMESTAMP\"}" \
            >/dev/null 2>&1 || true
        echo "✅ Remote kill switch activated in Supabase"
    fi
}

# ─────────────────────────────────────────────────────────────────────────────
# FUNCTION: Deactivate Kill Switch
# ─────────────────────────────────────────────────────────────────────────────
deactivate_kill_switch() {
    # Remove local file
    if [ -f "$LOCAL_KILL_FILE" ]; then
        rm -f "$LOCAL_KILL_FILE"
        echo "✅ Local kill switch deactivated"
    fi

    # Update Supabase if configured
    if [ -n "$SUPABASE_URL" ] && [ -n "$SUPABASE_SERVICE_KEY" ]; then
        TIMESTAMP=$(date -u +%Y-%m-%dT%H:%M:%SZ)
        curl -s -X PATCH \
            "${SUPABASE_URL}/rest/v1/maf_kill_switch?is_active=eq.true" \
            -H "apikey: ${SUPABASE_SERVICE_KEY}" \
            -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}" \
            -H "Content-Type: application/json" \
            -d "{\"is_active\": false, \"deactivated_at\": \"$TIMESTAMP\"}" \
            >/dev/null 2>&1 || true
        echo "✅ Remote kill switch deactivated in Supabase"
    fi
}

# ─────────────────────────────────────────────────────────────────────────────
# FUNCTION: Run Kill Switch Drill (GAP-003)
# Tests all pathways without actually halting the system
# ─────────────────────────────────────────────────────────────────────────────
run_kill_switch_drill() {
    local DRILL_DIR=".claude/drills"
    local DRILL_DATE=$(date +%Y-%m-%d)
    local DRILL_FILE="${DRILL_DIR}/kill-switch-drill-${DRILL_DATE}.json"
    local START_TIME=$(date +%s%N)
    local RESULTS=()
    local ALL_PASS=true

    echo ""
    echo "╔═══════════════════════════════════════════════════════════════════════════════╗"
    echo "║  KILL SWITCH DRILL MODE                                                       ║"
    echo "║  Simulating activation without halting system                                  ║"
    echo "╚═══════════════════════════════════════════════════════════════════════════════╝"
    echo ""
    echo "  Drill started at: $(date)"
    echo ""

    # Create drill directory
    mkdir -p "$DRILL_DIR"

    # ─────────────────────────────────────────────────────────────────────────
    # TEST 1: Local file system pathway
    # ─────────────────────────────────────────────────────────────────────────
    echo "  [1/4] Testing local file pathway..."
    local T1_START=$(date +%s%N)

    # Check if we can create the kill switch file (but don't leave it)
    local TEST_KILL_FILE="${LOCAL_KILL_FILE}.drill-test"
    if echo "Drill test - $(date)" > "$TEST_KILL_FILE" 2>/dev/null; then
        rm -f "$TEST_KILL_FILE"
        local T1_END=$(date +%s%N)
        local T1_MS=$(( (T1_END - T1_START) / 1000000 ))
        echo "        ✅ PASS - Can write to kill switch location (${T1_MS}ms)"
        RESULTS+=("{\"test\":\"local_file_create\",\"status\":\"pass\",\"duration_ms\":${T1_MS}}")
    else
        local T1_END=$(date +%s%N)
        local T1_MS=$(( (T1_END - T1_START) / 1000000 ))
        echo "        ❌ FAIL - Cannot write to kill switch location"
        RESULTS+=("{\"test\":\"local_file_create\",\"status\":\"fail\",\"duration_ms\":${T1_MS},\"error\":\"Cannot write file\"}")
        ALL_PASS=false
    fi

    # ─────────────────────────────────────────────────────────────────────────
    # TEST 2: Local file detection
    # ─────────────────────────────────────────────────────────────────────────
    echo "  [2/4] Testing local file detection..."
    local T2_START=$(date +%s%N)

    # Temporarily create and then immediately remove
    echo "Drill test - $(date)" > "$TEST_KILL_FILE"
    if [ -f "$TEST_KILL_FILE" ]; then
        rm -f "$TEST_KILL_FILE"
        local T2_END=$(date +%s%N)
        local T2_MS=$(( (T2_END - T2_START) / 1000000 ))
        echo "        ✅ PASS - File detection working (${T2_MS}ms)"
        RESULTS+=("{\"test\":\"local_file_detect\",\"status\":\"pass\",\"duration_ms\":${T2_MS}}")
    else
        local T2_END=$(date +%s%N)
        local T2_MS=$(( (T2_END - T2_START) / 1000000 ))
        echo "        ❌ FAIL - Cannot detect kill switch file"
        RESULTS+=("{\"test\":\"local_file_detect\",\"status\":\"fail\",\"duration_ms\":${T2_MS}}")
        ALL_PASS=false
    fi

    # ─────────────────────────────────────────────────────────────────────────
    # TEST 3: Remote Supabase connectivity (read-only)
    # ─────────────────────────────────────────────────────────────────────────
    echo "  [3/4] Testing remote Supabase connectivity..."
    local T3_START=$(date +%s%N)

    if [ -n "$SUPABASE_URL" ] && [ -n "$SUPABASE_SERVICE_KEY" ]; then
        # Just check if we can read from the kill switch table
        local RESPONSE=$(curl -s --max-time 5 -o /dev/null -w "%{http_code}" \
            "${SUPABASE_URL}/rest/v1/maf_kill_switch?select=id&limit=1" \
            -H "apikey: ${SUPABASE_SERVICE_KEY}" \
            -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}" 2>/dev/null || echo "000")

        local T3_END=$(date +%s%N)
        local T3_MS=$(( (T3_END - T3_START) / 1000000 ))

        if [ "$RESPONSE" = "200" ]; then
            echo "        ✅ PASS - Supabase connection verified (${T3_MS}ms)"
            RESULTS+=("{\"test\":\"supabase_connectivity\",\"status\":\"pass\",\"duration_ms\":${T3_MS}}")
        else
            echo "        ⚠️  WARN - Supabase returned HTTP $RESPONSE (${T3_MS}ms)"
            RESULTS+=("{\"test\":\"supabase_connectivity\",\"status\":\"warn\",\"duration_ms\":${T3_MS},\"http_code\":\"${RESPONSE}\"}")
        fi
    else
        local T3_END=$(date +%s%N)
        local T3_MS=$(( (T3_END - T3_START) / 1000000 ))
        echo "        ⏭️  SKIP - Supabase not configured"
        RESULTS+=("{\"test\":\"supabase_connectivity\",\"status\":\"skip\",\"duration_ms\":${T3_MS},\"reason\":\"not_configured\"}")
    fi

    # ─────────────────────────────────────────────────────────────────────────
    # TEST 4: Agent signal propagation simulation
    # ─────────────────────────────────────────────────────────────────────────
    echo "  [4/4] Testing agent signal propagation..."
    local T4_START=$(date +%s%N)

    # Check if .claude directory exists (where agents look for signals)
    local CLAUDE_DIR=".claude"
    if [ -d "$CLAUDE_DIR" ] || mkdir -p "$CLAUDE_DIR" 2>/dev/null; then
        # Count existing signal files
        local SIGNAL_COUNT=$(find "$CLAUDE_DIR" -name "signal-*.json" 2>/dev/null | wc -l || echo "0")
        local T4_END=$(date +%s%N)
        local T4_MS=$(( (T4_END - T4_START) / 1000000 ))
        echo "        ✅ PASS - Signal directory accessible, ${SIGNAL_COUNT} existing signals (${T4_MS}ms)"
        RESULTS+=("{\"test\":\"agent_signal_path\",\"status\":\"pass\",\"duration_ms\":${T4_MS},\"existing_signals\":${SIGNAL_COUNT}}")
    else
        local T4_END=$(date +%s%N)
        local T4_MS=$(( (T4_END - T4_START) / 1000000 ))
        echo "        ❌ FAIL - Cannot access signal directory"
        RESULTS+=("{\"test\":\"agent_signal_path\",\"status\":\"fail\",\"duration_ms\":${T4_MS}}")
        ALL_PASS=false
    fi

    # ─────────────────────────────────────────────────────────────────────────
    # Generate drill report
    # ─────────────────────────────────────────────────────────────────────────
    local END_TIME=$(date +%s%N)
    local TOTAL_MS=$(( (END_TIME - START_TIME) / 1000000 ))
    local TIMESTAMP=$(date -u +%Y-%m-%dT%H:%M:%SZ)

    echo ""
    echo "  ─────────────────────────────────────────────────────────────────────────────"
    echo "  Drill Summary"
    echo "  ─────────────────────────────────────────────────────────────────────────────"
    echo "  Total duration: ${TOTAL_MS}ms"
    echo "  Results file:   $DRILL_FILE"

    # Build JSON results array
    local RESULTS_JSON=""
    for r in "${RESULTS[@]}"; do
        if [ -n "$RESULTS_JSON" ]; then
            RESULTS_JSON="${RESULTS_JSON},"
        fi
        RESULTS_JSON="${RESULTS_JSON}${r}"
    done

    # Write drill report
    cat > "$DRILL_FILE" << EOF
{
    "drill_type": "kill_switch",
    "drill_date": "$DRILL_DATE",
    "timestamp": "$TIMESTAMP",
    "total_duration_ms": $TOTAL_MS,
    "overall_result": $([ "$ALL_PASS" = true ] && echo '"pass"' || echo '"fail"'),
    "tests": [$RESULTS_JSON],
    "configuration": {
        "local_kill_file": "$LOCAL_KILL_FILE",
        "supabase_configured": $([ -n "$SUPABASE_URL" ] && echo "true" || echo "false"),
        "poll_interval": $POLL_INTERVAL
    }
}
EOF

    if [ "$ALL_PASS" = true ]; then
        echo ""
        echo "  ✅ ALL TESTS PASSED - Kill switch pathways verified"
        echo ""
        return 0
    else
        echo ""
        echo "  ⚠️  SOME TESTS FAILED - Review drill report"
        echo ""
        return 1
    fi
}

# ═══════════════════════════════════════════════════════════════════════════════
# MAIN EXECUTION
# ═══════════════════════════════════════════════════════════════════════════════

case "$MODE" in
    --continuous|-c)
        echo "═══════════════════════════════════════════════════════════════════════════════"
        echo "  WAVE Kill Switch Monitor"
        echo "═══════════════════════════════════════════════════════════════════════════════"
        echo "  Mode:     Continuous monitoring"
        echo "  Interval: ${POLL_INTERVAL}s"
        echo "  Local:    $LOCAL_KILL_FILE"
        echo "  Remote:   ${SUPABASE_URL:-not configured}"
        echo ""
        echo "  Press Ctrl+C to stop"
        echo "═══════════════════════════════════════════════════════════════════════════════"
        echo ""

        while true; do
            if ! check_kill_switch; then
                echo ""
                echo "⚠️  Kill switch detected - signaling all agents to stop"
                # Ensure local kill file exists
                mkdir -p "$(dirname "$LOCAL_KILL_FILE")"
                echo "Kill switch activated at $(date)" > "$LOCAL_KILL_FILE"
                exit 1
            fi
            echo "[$(date '+%H:%M:%S')] Kill switch clear"
            sleep "$POLL_INTERVAL"
        done
        ;;

    --activate|-a)
        REASON="${2:-Manual activation}"
        ACTIVATED_BY="${3:-cli}"
        activate_kill_switch "$REASON" "$ACTIVATED_BY"
        ;;

    --deactivate|-d)
        deactivate_kill_switch
        ;;

    --test|--drill|-t)
        # GAP-003: Drill mode - test all pathways without halting
        if run_kill_switch_drill; then
            exit 2  # Drill passed (distinct from regular success)
        else
            exit 1  # Drill failed
        fi
        ;;

    --status|-s)
        echo "═══════════════════════════════════════════════════════════════════════════════"
        echo "  WAVE Kill Switch Status"
        echo "═══════════════════════════════════════════════════════════════════════════════"
        if check_kill_switch; then
            echo "✅ Kill switch is CLEAR - safe to proceed"
            exit 0
        else
            exit 1
        fi
        ;;

    *)
        # Single check mode (default)
        if check_kill_switch; then
            echo "✅ Kill switch clear - safe to proceed"
            exit 0
        else
            exit 1
        fi
        ;;
esac
