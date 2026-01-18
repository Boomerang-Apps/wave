#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# WAVE FRAMEWORK - Protocol Compliance Checker
# ═══════════════════════════════════════════════════════════════════════════════
#
# Verifies that a project follows WAVE protocol requirements.
# Part of the bulletproof validation system.
#
# Usage: ./protocol-compliance-checker.sh [--project /path/to/project]
#
# Exit codes:
#   0 = COMPLIANT (score >= 90%)
#   1 = NON-COMPLIANT (score < 90%)
#
# ═══════════════════════════════════════════════════════════════════════════════

set -e

# ─────────────────────────────────────────────────────────────────────────────
# CONFIGURATION
# ─────────────────────────────────────────────────────────────────────────────
PROJECT_ROOT="${1:-$(pwd)}"

# Handle --project flag
if [ "$1" = "--project" ] || [ "$1" = "-p" ]; then
    PROJECT_ROOT="$2"
fi

SCORE=0
TOTAL=20
WARNINGS=0

echo "═══════════════════════════════════════════════════════════════════════════════"
echo "  WAVE Protocol Compliance Checker"
echo "═══════════════════════════════════════════════════════════════════════════════"
echo ""
echo "  Project: $PROJECT_ROOT"
echo "  Date:    $(date)"
echo ""

# ─────────────────────────────────────────────────────────────────────────────
# SECTION A: SAFETY DOCUMENTATION (5 checks)
# ─────────────────────────────────────────────────────────────────────────────
echo "┌─────────────────────────────────────────────────────────────────────────────┐"
echo "│ SECTION A: Safety Documentation                                            │"
echo "└─────────────────────────────────────────────────────────────────────────────┘"

# A1: CLAUDE.md present
if [ -f "$PROJECT_ROOT/CLAUDE.md" ]; then
    echo "✅ A1: CLAUDE.md present"
    ((SCORE++))
else
    echo "❌ A1: CLAUDE.md NOT found"
fi

# A2: CLAUDE.md has forbidden operations
if [ -f "$PROJECT_ROOT/CLAUDE.md" ]; then
    FORBIDDEN=$(grep -c "NEVER\|FORBIDDEN\|DO NOT\|MUST NOT" "$PROJECT_ROOT/CLAUDE.md" 2>/dev/null || echo "0")
    if [ "$FORBIDDEN" -ge 20 ]; then
        echo "✅ A2: $FORBIDDEN forbidden operation markers found"
        ((SCORE++))
    else
        echo "⚠️ A2: Only $FORBIDDEN forbidden markers (recommend 20+)"
        ((WARNINGS++))
    fi
else
    echo "❌ A2: Cannot check forbidden operations"
fi

# A3: Safety stop conditions defined
if grep -q "EMERGENCY\|STOP\|kill.switch\|stop.condition" "$PROJECT_ROOT/CLAUDE.md" 2>/dev/null; then
    echo "✅ A3: Safety stop conditions defined"
    ((SCORE++))
else
    echo "❌ A3: Safety stop conditions NOT defined"
fi

# A4: Agent domain boundaries defined
if grep -q "ALLOWED\|FORBIDDEN\|boundary\|domain" "$PROJECT_ROOT/CLAUDE.md" 2>/dev/null; then
    echo "✅ A4: Agent domain boundaries defined"
    ((SCORE++))
else
    echo "⚠️ A4: Agent domain boundaries not explicit"
    ((WARNINGS++))
fi

# A5: Token/budget limits mentioned
if grep -q "budget\|token\|cost\|limit" "$PROJECT_ROOT/CLAUDE.md" 2>/dev/null; then
    echo "✅ A5: Budget/token limits referenced"
    ((SCORE++))
else
    echo "⚠️ A5: Budget limits not mentioned in CLAUDE.md"
    ((WARNINGS++))
fi

echo ""

# ─────────────────────────────────────────────────────────────────────────────
# SECTION B: DOCKER CONFIGURATION (5 checks)
# ─────────────────────────────────────────────────────────────────────────────
echo "┌─────────────────────────────────────────────────────────────────────────────┐"
echo "│ SECTION B: Docker Configuration                                            │"
echo "└─────────────────────────────────────────────────────────────────────────────┘"

COMPOSE_FILE="$PROJECT_ROOT/docker-compose.yml"

# B1: docker-compose.yml exists
if [ -f "$COMPOSE_FILE" ]; then
    echo "✅ B1: docker-compose.yml present"
    ((SCORE++))
else
    echo "❌ B1: docker-compose.yml NOT found"
    COMPOSE_FILE=""
fi

# B2: --dangerously-skip-permissions flag
if [ -n "$COMPOSE_FILE" ]; then
    SKIP_PERMS=$(grep -c "dangerously-skip-permissions" "$COMPOSE_FILE" 2>/dev/null || echo "0")
    if [ "$SKIP_PERMS" -gt 0 ]; then
        echo "✅ B2: --dangerously-skip-permissions found ($SKIP_PERMS agents)"
        ((SCORE++))
    else
        echo "❌ B2: --dangerously-skip-permissions NOT found"
    fi
fi

# B3: depends_on with service_completed_successfully
if [ -n "$COMPOSE_FILE" ]; then
    DEPENDS=$(grep -c "service_completed_successfully\|service_healthy" "$COMPOSE_FILE" 2>/dev/null || echo "0")
    if [ "$DEPENDS" -gt 0 ]; then
        echo "✅ B3: depends_on with conditions found ($DEPENDS)"
        ((SCORE++))
    else
        echo "⚠️ B3: No conditional depends_on found"
        ((WARNINGS++))
    fi
fi

# B4: Timeout limits in commands
if [ -n "$COMPOSE_FILE" ]; then
    TIMEOUTS=$(grep -c "timeout" "$COMPOSE_FILE" 2>/dev/null || echo "0")
    if [ "$TIMEOUTS" -gt 0 ]; then
        echo "✅ B4: Timeout limits found ($TIMEOUTS)"
        ((SCORE++))
    else
        echo "⚠️ B4: No timeout limits found"
        ((WARNINGS++))
    fi
fi

# B5: Non-root user (Dockerfile or compose)
DOCKERFILE="$PROJECT_ROOT/Dockerfile.agent"
if [ -f "$DOCKERFILE" ]; then
    if grep -q "^USER\|useradd" "$DOCKERFILE" 2>/dev/null; then
        echo "✅ B5: Non-root user configured in Dockerfile"
        ((SCORE++))
    else
        echo "❌ B5: No non-root user in Dockerfile"
    fi
elif [ -n "$COMPOSE_FILE" ] && grep -q "user:" "$COMPOSE_FILE" 2>/dev/null; then
    echo "✅ B5: Non-root user configured in compose"
    ((SCORE++))
else
    echo "⚠️ B5: Non-root user not explicitly configured"
    ((WARNINGS++))
fi

echo ""

# ─────────────────────────────────────────────────────────────────────────────
# SECTION C: SIGNAL PROTOCOL (5 checks)
# ─────────────────────────────────────────────────────────────────────────────
echo "┌─────────────────────────────────────────────────────────────────────────────┐"
echo "│ SECTION C: Signal Protocol                                                 │"
echo "└─────────────────────────────────────────────────────────────────────────────┘"

CLAUDE_DIR="$PROJECT_ROOT/.claude"

# C1: .claude directory exists
if [ -d "$CLAUDE_DIR" ]; then
    echo "✅ C1: .claude/ directory exists"
    ((SCORE++))
else
    echo "⚠️ C1: .claude/ directory not found (will be created)"
    ((WARNINGS++))
fi

# C2: Signal file references in compose
if [ -n "$COMPOSE_FILE" ]; then
    SIGNALS=$(grep -c "signal-.*\.json" "$COMPOSE_FILE" 2>/dev/null || echo "0")
    if [ "$SIGNALS" -gt 0 ]; then
        echo "✅ C2: Signal file references found ($SIGNALS)"
        ((SCORE++))
    else
        echo "⚠️ C2: No signal file references in compose"
        ((WARNINGS++))
    fi
fi

# C3: Kill switch file path defined
if [ -n "$COMPOSE_FILE" ] && grep -q "EMERGENCY-STOP\|kill-switch\|kill_switch" "$COMPOSE_FILE" 2>/dev/null; then
    echo "✅ C3: Kill switch file referenced"
    ((SCORE++))
elif [ -f "$PROJECT_ROOT/scripts/check-kill-switch.sh" ]; then
    echo "✅ C3: Kill switch script exists"
    ((SCORE++))
else
    echo "❌ C3: Kill switch not configured"
fi

# C4: Signal verification in workflow
if [ -n "$COMPOSE_FILE" ] && grep -q '\[ -f.*signal\|test -f.*signal' "$COMPOSE_FILE" 2>/dev/null; then
    echo "✅ C4: Signal verification in workflow"
    ((SCORE++))
else
    echo "⚠️ C4: No explicit signal verification found"
    ((WARNINGS++))
fi

# C5: Gate progression (0-7)
if [ -n "$COMPOSE_FILE" ]; then
    GATES=$(grep -oE "gate.?[0-7]|Gate.?[0-7]" "$COMPOSE_FILE" 2>/dev/null | sort -u | wc -l | tr -d ' ')
    if [ "$GATES" -ge 4 ]; then
        echo "✅ C5: Multiple gates defined ($GATES unique gates)"
        ((SCORE++))
    else
        echo "⚠️ C5: Only $GATES gates found (expect 4+)"
        ((WARNINGS++))
    fi
fi

echo ""

# ─────────────────────────────────────────────────────────────────────────────
# SECTION D: SCRIPTS & TOOLING (5 checks)
# ─────────────────────────────────────────────────────────────────────────────
echo "┌─────────────────────────────────────────────────────────────────────────────┐"
echo "│ SECTION D: Scripts & Tooling                                               │"
echo "└─────────────────────────────────────────────────────────────────────────────┘"

SCRIPTS_DIR="$PROJECT_ROOT/scripts"

# D1: Scripts directory exists
if [ -d "$SCRIPTS_DIR" ]; then
    echo "✅ D1: scripts/ directory exists"
    ((SCORE++))
else
    echo "⚠️ D1: scripts/ directory not found"
    ((WARNINGS++))
    SCRIPTS_DIR=""
fi

# D2: Kill switch script
if [ -f "$SCRIPTS_DIR/check-kill-switch.sh" ]; then
    echo "✅ D2: check-kill-switch.sh exists"
    ((SCORE++))
else
    echo "❌ D2: check-kill-switch.sh NOT found"
fi

# D3: Supabase report script
if [ -f "$SCRIPTS_DIR/supabase-report.sh" ]; then
    echo "✅ D3: supabase-report.sh exists"
    ((SCORE++))
else
    echo "⚠️ D3: supabase-report.sh not found"
    ((WARNINGS++))
fi

# D4: Story status update script
if [ -f "$SCRIPTS_DIR/update-story-status.sh" ]; then
    echo "✅ D4: update-story-status.sh exists"
    ((SCORE++))
else
    echo "⚠️ D4: update-story-status.sh not found"
    ((WARNINGS++))
fi

# D5: .env file exists
if [ -f "$PROJECT_ROOT/.env" ]; then
    echo "✅ D5: .env file exists"
    ((SCORE++))
else
    echo "⚠️ D5: .env file not found"
    ((WARNINGS++))
fi

echo ""

# ─────────────────────────────────────────────────────────────────────────────
# FINAL SCORE
# ─────────────────────────────────────────────────────────────────────────────
echo "═══════════════════════════════════════════════════════════════════════════════"
echo "  COMPLIANCE SCORE"
echo "═══════════════════════════════════════════════════════════════════════════════"
echo ""

PERCENTAGE=$((SCORE * 100 / TOTAL))

echo "  Score:    $SCORE / $TOTAL ($PERCENTAGE%)"
echo "  Warnings: $WARNINGS"
echo ""

# Determine compliance level
if [ "$PERCENTAGE" -ge 95 ]; then
    LEVEL="AEROSPACE GRADE"
    COLOR="32"  # Green
    EXIT_CODE=0
elif [ "$PERCENTAGE" -ge 90 ]; then
    LEVEL="COMPLIANT"
    COLOR="32"  # Green
    EXIT_CODE=0
elif [ "$PERCENTAGE" -ge 75 ]; then
    LEVEL="PARTIALLY COMPLIANT"
    COLOR="33"  # Yellow
    EXIT_CODE=1
else
    LEVEL="NON-COMPLIANT"
    COLOR="31"  # Red
    EXIT_CODE=1
fi

echo -e "  Level:    \033[${COLOR}m$LEVEL\033[0m"
echo ""

if [ "$PERCENTAGE" -ge 90 ]; then
    echo "╔═══════════════════════════════════════════════════════════════════════════════╗"
    echo "║                                                                               ║"
    echo "║      ✅ PROTOCOL COMPLIANT - Safe to proceed with pipeline execution         ║"
    echo "║                                                                               ║"
    echo "╚═══════════════════════════════════════════════════════════════════════════════╝"
else
    echo "╔═══════════════════════════════════════════════════════════════════════════════╗"
    echo "║                                                                               ║"
    echo "║      ❌ NOT COMPLIANT - Fix issues before proceeding                         ║"
    echo "║                                                                               ║"
    echo "╚═══════════════════════════════════════════════════════════════════════════════╝"
fi

echo ""
exit $EXIT_CODE
