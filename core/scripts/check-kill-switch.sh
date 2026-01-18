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
#
# Exit codes:
#   0 = Safe to proceed
#   1 = Kill switch ACTIVE - stop immediately
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
