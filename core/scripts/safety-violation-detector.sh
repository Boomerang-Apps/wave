#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# WAVE FRAMEWORK - Safety Violation Detector
# ═══════════════════════════════════════════════════════════════════════════════
#
# Real-time monitoring for forbidden operations in agent logs.
# Part of the bulletproof safety system.
#
# Usage:
#   ./safety-violation-detector.sh [--project /path/to/project]
#   ./safety-violation-detector.sh --check-file <file>
#   ./safety-violation-detector.sh --list-patterns
#
# When a violation is detected:
#   1. Logs violation to VIOLATIONS.log
#   2. Activates kill switch (EMERGENCY-STOP)
#   3. Sends Slack notification (if configured)
#
# ═══════════════════════════════════════════════════════════════════════════════

set -e

# ─────────────────────────────────────────────────────────────────────────────
# CONFIGURATION
# ─────────────────────────────────────────────────────────────────────────────
PROJECT_ROOT="$(pwd)"
MODE="monitor"
CHECK_FILE=""

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -p|--project)
            PROJECT_ROOT="$2"
            shift 2
            ;;
        --check-file)
            MODE="check"
            CHECK_FILE="$2"
            shift 2
            ;;
        --list-patterns)
            MODE="list"
            shift
            ;;
        *)
            shift
            ;;
    esac
done

CLAUDE_DIR="$PROJECT_ROOT/.claude"
VIOLATIONS_LOG="$CLAUDE_DIR/VIOLATIONS.log"
KILL_SWITCH_FILE="$CLAUDE_DIR/EMERGENCY-STOP"

# ─────────────────────────────────────────────────────────────────────────────
# FORBIDDEN PATTERNS (108 operations from Aerospace Protocol)
# Reference: COMPLETE-SAFETY-REFERENCE.md
# ─────────────────────────────────────────────────────────────────────────────
FORBIDDEN_PATTERNS=(
    # ═══════════════════════════════════════════════════════════════════════════
    # CATEGORY A: DATABASE DESTRUCTION (12 patterns)
    # ═══════════════════════════════════════════════════════════════════════════
    "DROP DATABASE"
    "DROP TABLE"
    "DROP SCHEMA"
    "DROP INDEX"
    "TRUNCATE TABLE"
    "TRUNCATE [a-z_]+"
    "DELETE FROM [a-z_]+\\s*$"
    "DELETE FROM.*WHERE 1\\s*=\\s*1"
    "DELETE FROM.*WHERE true"
    "UPDATE [a-z_]+ SET.*WHERE 1\\s*=\\s*1"
    "ALTER TABLE.*DROP COLUMN"
    "ALTER TABLE.*DROP CONSTRAINT"

    # ═══════════════════════════════════════════════════════════════════════════
    # CATEGORY B: FILE SYSTEM DESTRUCTION (14 patterns)
    # ═══════════════════════════════════════════════════════════════════════════
    "rm -rf /"
    "rm -rf ~"
    "rm -rf \\."
    "rm -rf \\*"
    "rm -rf /\\*"
    "rm -r /"
    "rm -rf /home"
    "rm -rf /var"
    "rm -rf /etc"
    "rm -rf node_modules"
    "rm -rf \\.git"
    "rm -rf \\.env"
    "rmdir.*--ignore-fail-on-non-empty"
    "find.*-delete"
    "unlink /"

    # ═══════════════════════════════════════════════════════════════════════════
    # CATEGORY C: GIT DESTRUCTION (11 patterns)
    # ═══════════════════════════════════════════════════════════════════════════
    "git push --force"
    "git push -f"
    "git push.*origin (main|master).*--force"
    "git push --force-with-lease.*(main|master)"
    "git reset --hard.*origin"
    "git clean -fdx"
    "git branch -D (main|master)"
    "git branch -D (develop|production|staging)"
    "git branch.*--delete.*--force"
    "git rebase -i"
    "git filter-branch"
    "git checkout -- \\."

    # ═══════════════════════════════════════════════════════════════════════════
    # CATEGORY D: PRIVILEGE ESCALATION (10 patterns)
    # ═══════════════════════════════════════════════════════════════════════════
    "sudo "
    "su (root|-)"
    "su -c"
    "chmod 777"
    "chmod -R 777"
    "chown root"
    "chown -R.*/"
    "passwd"
    "usermod"
    "useradd"
    "visudo"

    # ═══════════════════════════════════════════════════════════════════════════
    # CATEGORY E: NETWORK & EXTERNAL (10 patterns)
    # ═══════════════════════════════════════════════════════════════════════════
    "curl.*\\|.*bash"
    "wget.*\\|.*sh"
    "curl -o-.*\\|.*bash"
    "nc -l"
    "netcat"
    "nmap"
    "ssh [^@]*@[^l]"
    "scp.*@.*:"
    "rsync.*@.*:"
    "curl.*--data.*password"

    # ═══════════════════════════════════════════════════════════════════════════
    # CATEGORY F: SECRETS & CREDENTIALS (13 patterns)
    # ═══════════════════════════════════════════════════════════════════════════
    "cat ~/.ssh"
    "cat \\.env"
    "cat.*/secrets/"
    "cat.*/credentials/"
    "cat.*/.aws/"
    "echo \\$[A-Z_]*KEY"
    "echo \\$[A-Z_]*SECRET"
    "echo \\$[A-Z_]*PASSWORD"
    "echo \\$[A-Z_]*TOKEN"
    "echo \\$ANTHROPIC"
    "echo \\$SUPABASE"
    "printenv.*\\|.*grep.*(key|secret|password|token)"
    "env.*\\|.*grep.*(key|secret|password|token)"
    "console\\.log.*KEY"
    "console\\.log.*SECRET"
    "print.*API.?KEY"

    # ═══════════════════════════════════════════════════════════════════════════
    # CATEGORY G: SYSTEM DAMAGE (10 patterns)
    # ═══════════════════════════════════════════════════════════════════════════
    "shutdown"
    "reboot"
    "halt"
    "init [06]"
    "kill -9 -1"
    "killall"
    "pkill -9"
    "systemctl stop"
    "service.*stop"
    "poweroff"

    # ═══════════════════════════════════════════════════════════════════════════
    # CATEGORY H: PACKAGE PUBLISHING (6 patterns)
    # ═══════════════════════════════════════════════════════════════════════════
    "npm publish"
    "yarn publish"
    "pip upload"
    "twine upload"
    "gem push"
    "cargo publish"

    # ═══════════════════════════════════════════════════════════════════════════
    # CATEGORY I: PRODUCTION OPERATIONS (8 patterns)
    # ═══════════════════════════════════════════════════════════════════════════
    "deploy.*prod"
    "production.*deploy"
    "prod.*config.*change"
    "UPDATE.*prod.*SET"
    "DELETE.*prod.*WHERE"
    "vercel.*--prod"
    "netlify.*deploy.*--prod"
    "heroku.*promote"

    # ═══════════════════════════════════════════════════════════════════════════
    # CATEGORY J: DOMAIN BOUNDARY / CODE INJECTION (14 patterns)
    # ═══════════════════════════════════════════════════════════════════════════
    "eval\\("
    "exec\\("
    "Function\\("
    "__import__"
    "os\\.system"
    "subprocess\\.call.*shell=True"
    "subprocess\\.Popen.*shell=True"
    "child_process\\.exec"
    "require\\(['\"]child_process['\"]\\)"
    "spawn.*shell.*true"

    # Crypto/mining
    "bitcoin"
    "monero"
    "crypto.*mine"
    "xmrig"
    "coinhive"

    # Data exfiltration
    "curl.*\\|.*base64"
    "wget.*>.*\\.sh.*&&.*bash"
    "curl -X POST.*\\$"
)

# ─────────────────────────────────────────────────────────────────────────────
# FUNCTION: Check for violations
# ─────────────────────────────────────────────────────────────────────────────
check_violations() {
    local input="$1"
    local source="$2"
    local violations_found=0

    for pattern in "${FORBIDDEN_PATTERNS[@]}"; do
        if echo "$input" | grep -iE "$pattern" > /dev/null 2>&1; then
            violations_found=1
            local timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ)
            local message="VIOLATION: Pattern '$pattern' matched"

            echo ""
            echo "╔═══════════════════════════════════════════════════════════════════════════════╗"
            echo "║  🚨 SAFETY VIOLATION DETECTED                                                 ║"
            echo "╚═══════════════════════════════════════════════════════════════════════════════╝"
            echo "  Pattern: $pattern"
            echo "  Source:  $source"
            echo "  Time:    $timestamp"
            echo ""

            # Log violation
            mkdir -p "$CLAUDE_DIR"
            echo "{\"timestamp\":\"$timestamp\",\"pattern\":\"$pattern\",\"source\":\"$source\"}" >> "$VIOLATIONS_LOG"

            # Activate kill switch
            echo "SAFETY VIOLATION: $pattern detected at $timestamp" > "$KILL_SWITCH_FILE"
            echo "  ⚠️  Kill switch activated: $KILL_SWITCH_FILE"

            # Send Slack notification if configured
            if [ -n "$SLACK_WEBHOOK_URL" ]; then
                curl -s -X POST "$SLACK_WEBHOOK_URL" \
                    -H "Content-Type: application/json" \
                    -d "{\"text\":\"🚨 SAFETY VIOLATION: Pattern '$pattern' detected in $source\"}" \
                    > /dev/null 2>&1 || true
                echo "  📢 Slack notification sent"
            fi
        fi
    done

    return $violations_found
}

# ─────────────────────────────────────────────────────────────────────────────
# MODE: List Patterns
# ─────────────────────────────────────────────────────────────────────────────
if [ "$MODE" = "list" ]; then
    echo "═══════════════════════════════════════════════════════════════════════════════"
    echo "  WAVE Safety Violation Detector - Forbidden Patterns"
    echo "═══════════════════════════════════════════════════════════════════════════════"
    echo ""
    echo "  Total patterns: ${#FORBIDDEN_PATTERNS[@]}"
    echo ""

    count=1
    for pattern in "${FORBIDDEN_PATTERNS[@]}"; do
        printf "  %3d. %s\n" "$count" "$pattern"
        ((count++))
    done

    echo ""
    exit 0
fi

# ─────────────────────────────────────────────────────────────────────────────
# MODE: Check File
# ─────────────────────────────────────────────────────────────────────────────
if [ "$MODE" = "check" ]; then
    if [ -z "$CHECK_FILE" ] || [ ! -f "$CHECK_FILE" ]; then
        echo "❌ File not found: $CHECK_FILE"
        exit 1
    fi

    echo "═══════════════════════════════════════════════════════════════════════════════"
    echo "  WAVE Safety Violation Detector - File Check"
    echo "═══════════════════════════════════════════════════════════════════════════════"
    echo ""
    echo "  Checking: $CHECK_FILE"
    echo ""

    content=$(cat "$CHECK_FILE")
    if check_violations "$content" "$CHECK_FILE"; then
        echo "❌ Violations found!"
        exit 1
    else
        echo "✅ No violations detected"
        exit 0
    fi
fi

# ─────────────────────────────────────────────────────────────────────────────
# MODE: Monitor (Real-time)
# ─────────────────────────────────────────────────────────────────────────────
echo "═══════════════════════════════════════════════════════════════════════════════"
echo "  WAVE Safety Violation Detector - Real-time Monitor"
echo "═══════════════════════════════════════════════════════════════════════════════"
echo ""
echo "  Project:  $PROJECT_ROOT"
echo "  Patterns: ${#FORBIDDEN_PATTERNS[@]}"
echo "  Log:      $VIOLATIONS_LOG"
echo ""
echo "  Monitoring for forbidden operations..."
echo "  Press Ctrl+C to stop"
echo ""
echo "───────────────────────────────────────────────────────────────────────────────"

# Create claude directory if needed
mkdir -p "$CLAUDE_DIR"

# Monitor log files in real-time
LOG_PATTERN="$CLAUDE_DIR/*.log"

# Check if any log files exist
if ! ls $LOG_PATTERN > /dev/null 2>&1; then
    echo "  No log files found yet. Waiting..."
fi

# Use tail to follow logs
tail -F $LOG_PATTERN 2>/dev/null | while read -r line; do
    # Check each line for violations
    for pattern in "${FORBIDDEN_PATTERNS[@]}"; do
        if echo "$line" | grep -iE "$pattern" > /dev/null 2>&1; then
            timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ)

            echo ""
            echo "🚨 VIOLATION DETECTED at $timestamp"
            echo "   Pattern: $pattern"
            echo "   Line: ${line:0:100}..."

            # Log it
            echo "{\"timestamp\":\"$timestamp\",\"pattern\":\"$pattern\",\"line\":\"${line:0:200}\"}" >> "$VIOLATIONS_LOG"

            # Activate kill switch
            echo "SAFETY VIOLATION: $pattern at $timestamp" > "$KILL_SWITCH_FILE"
            echo "   ⚠️  Kill switch activated!"

            # Slack notification
            if [ -n "$SLACK_WEBHOOK_URL" ]; then
                curl -s -X POST "$SLACK_WEBHOOK_URL" \
                    -H "Content-Type: application/json" \
                    -d "{\"text\":\"🚨 SAFETY VIOLATION: $pattern detected\"}" \
                    > /dev/null 2>&1 || true
            fi
        fi
    done
done
