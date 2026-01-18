#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# WAVE FRAMEWORK - Workspace Validator (Gate 0.5)
# ═══════════════════════════════════════════════════════════════════════════════
#
# Validates that agents have not violated domain boundaries.
# This is Gate 0.5 - runs AFTER agent work, BEFORE QA validation.
#
# Purpose: Domain boundary cleaning - ensures agents stayed within their
#          allowed file paths and didn't modify files outside their domain.
#
# Usage:
#   ./workspace-validator.sh --project /path/to/project --agent fe-dev-1
#   ./workspace-validator.sh --project /path/to/project --wave 1
#   ./workspace-validator.sh --project /path/to/project --all
#
# Exit codes:
#   0 = CLEAN (no violations)
#   1 = VIOLATIONS FOUND
#   2 = ERROR (invalid arguments)
#
# ═══════════════════════════════════════════════════════════════════════════════

set -e

# ─────────────────────────────────────────────────────────────────────────────
# CONFIGURATION
# ─────────────────────────────────────────────────────────────────────────────
PROJECT_ROOT=""
AGENT=""
WAVE=""
CHECK_ALL=false
VERBOSE=false

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -p|--project)
            PROJECT_ROOT="$2"
            shift 2
            ;;
        -a|--agent)
            AGENT="$2"
            shift 2
            ;;
        -w|--wave)
            WAVE="$2"
            shift 2
            ;;
        --all)
            CHECK_ALL=true
            shift
            ;;
        -v|--verbose)
            VERBOSE=true
            shift
            ;;
        *)
            echo "Unknown option: $1"
            exit 2
            ;;
    esac
done

# Validate arguments
if [ -z "$PROJECT_ROOT" ]; then
    echo "Error: --project is required"
    echo "Usage: ./workspace-validator.sh --project /path/to/project [--agent name | --wave N | --all]"
    exit 2
fi

if [ ! -d "$PROJECT_ROOT" ]; then
    echo "Error: Project directory not found: $PROJECT_ROOT"
    exit 2
fi

CLAUDE_DIR="$PROJECT_ROOT/.claude"
WORKTREES_DIR="$PROJECT_ROOT/worktrees"
VIOLATIONS_LOG="$CLAUDE_DIR/domain-violations.log"
TIMESTAMP=$(date -u +%Y-%m-%dT%H:%M:%SZ)

# ─────────────────────────────────────────────────────────────────────────────
# DOMAIN DEFINITIONS
# ─────────────────────────────────────────────────────────────────────────────

# Define allowed paths for each agent type
declare -A ALLOWED_PATHS
declare -A FORBIDDEN_PATHS

# Frontend agents
ALLOWED_PATHS["fe-dev-1"]="src/app src/components src/hooks src/styles src/lib/client public"
ALLOWED_PATHS["fe-dev-2"]="src/app src/components src/hooks src/styles src/lib/client public"
FORBIDDEN_PATHS["fe-dev-1"]="src/app/api src/lib/server prisma supabase migrations"
FORBIDDEN_PATHS["fe-dev-2"]="src/app/api src/lib/server prisma supabase migrations"

# Backend agents
ALLOWED_PATHS["be-dev-1"]="src/app/api src/lib/server src/lib/db prisma supabase"
ALLOWED_PATHS["be-dev-2"]="src/app/api src/lib/server src/lib/db prisma supabase"
FORBIDDEN_PATHS["be-dev-1"]="src/components src/hooks src/styles public"
FORBIDDEN_PATHS["be-dev-2"]="src/components src/hooks src/styles public"

# QA agent (read-only, should not modify anything significant)
ALLOWED_PATHS["qa"]="tests __tests__ *.test.* *.spec.*"
FORBIDDEN_PATHS["qa"]="src/app src/components src/lib prisma migrations"

# Dev-fix agent (targeted fixes only)
ALLOWED_PATHS["dev-fix"]="src tests __tests__"
FORBIDDEN_PATHS["dev-fix"]="prisma/migrations .env* package.json"

# Shared forbidden for ALL agents
SHARED_FORBIDDEN=".env .env.local .env.production secrets credentials .git/config"

# ─────────────────────────────────────────────────────────────────────────────
# FUNCTIONS
# ─────────────────────────────────────────────────────────────────────────────

echo_header() {
    echo "═══════════════════════════════════════════════════════════════════════════════"
    echo "  WAVE Workspace Validator (Gate 0.5)"
    echo "═══════════════════════════════════════════════════════════════════════════════"
    echo ""
    echo "  Project: $PROJECT_ROOT"
    echo "  Time:    $TIMESTAMP"
    echo ""
}

log_violation() {
    local agent="$1"
    local file="$2"
    local reason="$3"

    mkdir -p "$CLAUDE_DIR"
    echo "{\"timestamp\":\"$TIMESTAMP\",\"agent\":\"$agent\",\"file\":\"$file\",\"reason\":\"$reason\"}" >> "$VIOLATIONS_LOG"

    echo "  ❌ VIOLATION: $agent modified $file"
    echo "     Reason: $reason"
}

check_agent_worktree() {
    local agent="$1"
    local worktree="$WORKTREES_DIR/$agent"
    local violations=0

    if [ ! -d "$worktree" ]; then
        if [ "$VERBOSE" = true ]; then
            echo "  ⚠️  Worktree not found: $worktree"
        fi
        return 0
    fi

    echo "┌─────────────────────────────────────────────────────────────────────────────┐"
    echo "│ Checking: $agent"
    echo "└─────────────────────────────────────────────────────────────────────────────┘"

    # Get modified files in worktree (compared to main)
    cd "$worktree"

    # Get list of modified/added files
    local modified_files=$(git diff --name-only main 2>/dev/null || git diff --name-only HEAD~10 2>/dev/null || echo "")
    local added_files=$(git diff --name-only --diff-filter=A main 2>/dev/null || echo "")

    # Combine and deduplicate
    local all_changed=$(echo -e "$modified_files\n$added_files" | sort -u | grep -v "^$" || true)

    if [ -z "$all_changed" ]; then
        echo "  ✅ No modified files detected"
        return 0
    fi

    if [ "$VERBOSE" = true ]; then
        echo "  Modified files:"
        echo "$all_changed" | while read -r file; do
            echo "    - $file"
        done
        echo ""
    fi

    # Get forbidden paths for this agent
    local forbidden="${FORBIDDEN_PATHS[$agent]}"
    local allowed="${ALLOWED_PATHS[$agent]}"

    # Check each modified file
    while IFS= read -r file; do
        [ -z "$file" ] && continue

        local is_violation=false
        local violation_reason=""

        # Check shared forbidden paths
        for forbidden_path in $SHARED_FORBIDDEN; do
            if [[ "$file" == *"$forbidden_path"* ]]; then
                is_violation=true
                violation_reason="Shared forbidden path: $forbidden_path"
                break
            fi
        done

        # Check agent-specific forbidden paths
        if [ "$is_violation" = false ] && [ -n "$forbidden" ]; then
            for forbidden_path in $forbidden; do
                if [[ "$file" == "$forbidden_path"* ]] || [[ "$file" == *"/$forbidden_path"* ]]; then
                    is_violation=true
                    violation_reason="Agent forbidden path: $forbidden_path"
                    break
                fi
            done
        fi

        # Check if file is in allowed paths (if allowed paths defined)
        if [ "$is_violation" = false ] && [ -n "$allowed" ]; then
            local in_allowed=false
            for allowed_path in $allowed; do
                if [[ "$file" == "$allowed_path"* ]] || [[ "$file" == *"/$allowed_path"* ]] || [[ "$file" == $allowed_path ]]; then
                    in_allowed=true
                    break
                fi
            done

            # Special cases: always allow certain files
            if [[ "$file" == "package.json" ]] || [[ "$file" == "package-lock.json" ]] || \
               [[ "$file" == "tsconfig.json" ]] || [[ "$file" == "*.config.*" ]] || \
               [[ "$file" == ".gitignore" ]] || [[ "$file" == "README.md" ]]; then
                in_allowed=true
            fi

            if [ "$in_allowed" = false ]; then
                is_violation=true
                violation_reason="Outside allowed domain for $agent"
            fi
        fi

        if [ "$is_violation" = true ]; then
            log_violation "$agent" "$file" "$violation_reason"
            ((violations++))
        elif [ "$VERBOSE" = true ]; then
            echo "  ✅ $file (allowed)"
        fi

    done <<< "$all_changed"

    cd - > /dev/null

    if [ $violations -eq 0 ]; then
        echo "  ✅ No domain violations"
    else
        echo ""
        echo "  ❌ Found $violations violation(s)"
    fi

    return $violations
}

# ─────────────────────────────────────────────────────────────────────────────
# MAIN EXECUTION
# ─────────────────────────────────────────────────────────────────────────────

echo_header

TOTAL_VIOLATIONS=0

# Determine which agents to check
AGENTS_TO_CHECK=()

if [ -n "$AGENT" ]; then
    AGENTS_TO_CHECK=("$AGENT")
elif [ -n "$WAVE" ]; then
    if [ "$WAVE" = "1" ]; then
        AGENTS_TO_CHECK=("fe-dev-1" "be-dev-1")
    elif [ "$WAVE" = "2" ]; then
        AGENTS_TO_CHECK=("fe-dev-2" "be-dev-2")
    else
        echo "Error: Invalid wave number: $WAVE (use 1 or 2)"
        exit 2
    fi
elif [ "$CHECK_ALL" = true ]; then
    AGENTS_TO_CHECK=("fe-dev-1" "fe-dev-2" "be-dev-1" "be-dev-2" "qa" "dev-fix")
else
    echo "Error: Specify --agent, --wave, or --all"
    exit 2
fi

echo "  Checking agents: ${AGENTS_TO_CHECK[*]}"
echo ""

# Check each agent
for agent in "${AGENTS_TO_CHECK[@]}"; do
    check_agent_worktree "$agent" || violations=$?
    TOTAL_VIOLATIONS=$((TOTAL_VIOLATIONS + violations))
    echo ""
done

# ─────────────────────────────────────────────────────────────────────────────
# GENERATE RESULT
# ─────────────────────────────────────────────────────────────────────────────

echo "═══════════════════════════════════════════════════════════════════════════════"
echo "  GATE 0.5 RESULT"
echo "═══════════════════════════════════════════════════════════════════════════════"
echo ""

if [ $TOTAL_VIOLATIONS -eq 0 ]; then
    echo "╔═══════════════════════════════════════════════════════════════════════════════╗"
    echo "║                                                                               ║"
    echo "║      ✅ GATE 0.5 PASSED - No domain boundary violations                      ║"
    echo "║                                                                               ║"
    echo "╚═══════════════════════════════════════════════════════════════════════════════╝"

    # Create success signal
    mkdir -p "$CLAUDE_DIR"
    cat > "$CLAUDE_DIR/signal-gate0.5-passed.json" << EOF
{
    "signal_type": "gate0.5-passed",
    "timestamp": "$TIMESTAMP",
    "agents_checked": $(printf '%s\n' "${AGENTS_TO_CHECK[@]}" | jq -R . | jq -s .),
    "violations": 0,
    "status": "CLEAN"
}
EOF

    exit 0
else
    echo "╔═══════════════════════════════════════════════════════════════════════════════╗"
    echo "║                                                                               ║"
    echo "║      ❌ GATE 0.5 FAILED - $TOTAL_VIOLATIONS domain boundary violation(s)                   ║"
    echo "║                                                                               ║"
    echo "║   Agents must revert changes to files outside their domain before            ║"
    echo "║   proceeding to QA validation.                                               ║"
    echo "║                                                                               ║"
    echo "╚═══════════════════════════════════════════════════════════════════════════════╝"

    echo ""
    echo "  Violations logged to: $VIOLATIONS_LOG"

    # Create failure signal
    mkdir -p "$CLAUDE_DIR"
    cat > "$CLAUDE_DIR/signal-gate0.5-failed.json" << EOF
{
    "signal_type": "gate0.5-failed",
    "timestamp": "$TIMESTAMP",
    "agents_checked": $(printf '%s\n' "${AGENTS_TO_CHECK[@]}" | jq -R . | jq -s .),
    "violations": $TOTAL_VIOLATIONS,
    "status": "VIOLATIONS_FOUND",
    "violations_log": "$VIOLATIONS_LOG"
}
EOF

    exit 1
fi
