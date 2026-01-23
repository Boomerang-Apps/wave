#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# WAVE MASTER VALIDATION SCRIPT
# ═══════════════════════════════════════════════════════════════════════════════
# One-click validation for entire WAVE infrastructure
# Runs all validation checks in sequence and generates comprehensive report
#
# Usage:
#   ./wave-validate-all.sh [PROJECT_PATH]
#   ./wave-validate-all.sh /path/to/project --json    # JSON output for Portal
#   ./wave-validate-all.sh /path/to/project --quick   # Skip slow checks
#
# Exit codes:
#   0 = ALL PASSED
#   1 = FAILURES DETECTED
#   2 = CRITICAL FAILURES (cannot proceed)
#
# ═══════════════════════════════════════════════════════════════════════════════

set -o pipefail

# ─────────────────────────────────────────────────────────────────────────────
# CONFIGURATION
# ─────────────────────────────────────────────────────────────────────────────

PROJECT_ROOT="${1:-.}"
JSON_OUTPUT=false
QUICK_MODE=false

# Parse flags
for arg in "$@"; do
    case $arg in
        --json) JSON_OUTPUT=true ;;
        --quick) QUICK_MODE=true ;;
    esac
done

# Resolve absolute path
PROJECT_ROOT=$(cd "$PROJECT_ROOT" 2>/dev/null && pwd || echo "$PROJECT_ROOT")
CLAUDE_DIR="$PROJECT_ROOT/.claude"
WAVE_DIR="${WAVE_PATH:-/wave-framework}"
SCRIPTS_DIR="$WAVE_DIR/core/scripts"
REPORT_FILE="$CLAUDE_DIR/validation-report.json"
TIMESTAMP=$(date -u +%Y-%m-%dT%H:%M:%SZ)

# Colors (disabled for JSON output)
if [ "$JSON_OUTPUT" = false ]; then
    RED='\033[0;31m'
    GREEN='\033[0;32m'
    YELLOW='\033[1;33m'
    BLUE='\033[0;34m'
    CYAN='\033[0;36m'
    NC='\033[0m'
else
    RED='' GREEN='' YELLOW='' BLUE='' CYAN='' NC=''
fi

# ─────────────────────────────────────────────────────────────────────────────
# RESULT TRACKING
# ─────────────────────────────────────────────────────────────────────────────

declare -A RESULTS
declare -a PASSED_CHECKS=()
declare -a FAILED_CHECKS=()
declare -a WARNING_CHECKS=()
declare -a CHECK_DETAILS=()

TOTAL_CHECKS=0
PASS_COUNT=0
FAIL_COUNT=0
WARN_COUNT=0

# ─────────────────────────────────────────────────────────────────────────────
# HELPER FUNCTIONS
# ─────────────────────────────────────────────────────────────────────────────

log_section() {
    if [ "$JSON_OUTPUT" = false ]; then
        echo ""
        echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
        echo -e "${BLUE} $1${NC}"
        echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
    fi
}

log_check() {
    local name="$1"
    local status="$2"
    local message="$3"
    local details="$4"

    ((TOTAL_CHECKS++))

    case $status in
        "PASS")
            ((PASS_COUNT++))
            PASSED_CHECKS+=("$name")
            [ "$JSON_OUTPUT" = false ] && echo -e "${GREEN}[PASS]${NC} $name: $message"
            ;;
        "FAIL")
            ((FAIL_COUNT++))
            FAILED_CHECKS+=("$name")
            [ "$JSON_OUTPUT" = false ] && echo -e "${RED}[FAIL]${NC} $name: $message"
            ;;
        "WARN")
            ((WARN_COUNT++))
            WARNING_CHECKS+=("$name")
            [ "$JSON_OUTPUT" = false ] && echo -e "${YELLOW}[WARN]${NC} $name: $message"
            ;;
    esac

    # Store for JSON report
    CHECK_DETAILS+=("{\"name\":\"$name\",\"status\":\"$status\",\"message\":\"$message\",\"details\":\"${details//\"/\\\"}\"}")
}

# ─────────────────────────────────────────────────────────────────────────────
# SECTION 1: AI STORIES VALIDATION
# ─────────────────────────────────────────────────────────────────────────────

validate_ai_stories() {
    log_section "1. AI STORIES VALIDATION"

    local stories_dir="$PROJECT_ROOT/stories"
    local wave_stories_dir="$CLAUDE_DIR/stories"

    # Check stories directory exists
    if [ -d "$stories_dir" ]; then
        local story_count=$(find "$stories_dir" -name "*.json" 2>/dev/null | wc -l | tr -d ' ')
        if [ "$story_count" -gt 0 ]; then
            log_check "stories_directory" "PASS" "Found $story_count story files" "$stories_dir"
        else
            log_check "stories_directory" "WARN" "Stories directory exists but no .json files found" "$stories_dir"
        fi
    elif [ -d "$wave_stories_dir" ]; then
        local story_count=$(find "$wave_stories_dir" -name "*.json" 2>/dev/null | wc -l | tr -d ' ')
        log_check "stories_directory" "PASS" "Found $story_count story files in .claude/stories" "$wave_stories_dir"
    else
        log_check "stories_directory" "WARN" "No stories directory found" "Create stories/ or .claude/stories/"
    fi

    # Validate story structure
    local valid_stories=0
    local invalid_stories=0
    local story_errors=""

    for story_file in $(find "$stories_dir" "$wave_stories_dir" -name "*.json" 2>/dev/null | head -20); do
        if [ -f "$story_file" ]; then
            # Check if valid JSON
            if jq empty "$story_file" 2>/dev/null; then
                # Check required fields
                local has_id=$(jq -r '.id // .story_id // empty' "$story_file" 2>/dev/null)
                local has_title=$(jq -r '.title // .name // empty' "$story_file" 2>/dev/null)

                if [ -n "$has_id" ] || [ -n "$has_title" ]; then
                    ((valid_stories++))
                else
                    ((invalid_stories++))
                    story_errors="$story_errors Missing id/title in $(basename $story_file);"
                fi
            else
                ((invalid_stories++))
                story_errors="$story_errors Invalid JSON: $(basename $story_file);"
            fi
        fi
    done

    if [ $valid_stories -gt 0 ]; then
        log_check "story_structure" "PASS" "$valid_stories valid stories found" ""
    fi

    if [ $invalid_stories -gt 0 ]; then
        log_check "story_validation" "FAIL" "$invalid_stories invalid stories" "$story_errors"
    fi
}

# ─────────────────────────────────────────────────────────────────────────────
# SECTION 2: PLAN VALIDATION
# ─────────────────────────────────────────────────────────────────────────────

validate_plan() {
    log_section "2. PLAN VALIDATION"

    local plan_file="$CLAUDE_DIR/P.md"
    local claude_md="$PROJECT_ROOT/CLAUDE.md"

    # Check P.md exists
    if [ -f "$plan_file" ]; then
        local p_size=$(wc -c < "$plan_file" | tr -d ' ')
        if [ "$p_size" -gt 100 ]; then
            log_check "p_variable" "PASS" "P.md exists ($p_size bytes)" "$plan_file"

            # Check for required sections
            if grep -q "## " "$plan_file" 2>/dev/null; then
                log_check "p_sections" "PASS" "P.md contains structured sections" ""
            else
                log_check "p_sections" "WARN" "P.md may be missing section headers" "Add ## sections"
            fi
        else
            log_check "p_variable" "WARN" "P.md exists but is very small ($p_size bytes)" ""
        fi
    else
        log_check "p_variable" "FAIL" "P.md (P Variable) not found" "Create .claude/P.md"
    fi

    # Check CLAUDE.md exists
    if [ -f "$claude_md" ]; then
        log_check "claude_md" "PASS" "CLAUDE.md project guidelines exist" "$claude_md"
    else
        log_check "claude_md" "WARN" "CLAUDE.md not found" "Consider creating project guidelines"
    fi

    # Check wave configuration
    local wave_config="$CLAUDE_DIR/wave-config.json"
    if [ -f "$wave_config" ]; then
        if jq empty "$wave_config" 2>/dev/null; then
            local wave_num=$(jq -r '.wave_number // .current_wave // "unknown"' "$wave_config")
            log_check "wave_config" "PASS" "Wave config exists (Wave $wave_num)" "$wave_config"
        else
            log_check "wave_config" "FAIL" "wave-config.json is invalid JSON" ""
        fi
    else
        log_check "wave_config" "WARN" "No wave-config.json found" "Optional: configure wave settings"
    fi
}

# ─────────────────────────────────────────────────────────────────────────────
# SECTION 3: INFRASTRUCTURE VALIDATION
# ─────────────────────────────────────────────────────────────────────────────

validate_infrastructure() {
    log_section "3. INFRASTRUCTURE VALIDATION"

    # Load environment
    local env_file="$PROJECT_ROOT/.env"
    if [ -f "$env_file" ]; then
        set -a
        source "$env_file" 2>/dev/null || true
        set +a
        log_check "env_file" "PASS" "Environment file loaded" "$env_file"
    else
        log_check "env_file" "WARN" "No .env file found" "Some checks may be skipped"
    fi

    # Check Anthropic API Key
    if [ -n "${ANTHROPIC_API_KEY:-}" ]; then
        log_check "anthropic_api" "PASS" "ANTHROPIC_API_KEY is set" "Key starts with: ${ANTHROPIC_API_KEY:0:7}..."
    else
        log_check "anthropic_api" "FAIL" "ANTHROPIC_API_KEY not set" "Required for agent execution"
    fi

    # Check Supabase (if configured)
    if [ -n "${NEXT_PUBLIC_SUPABASE_URL:-}" ]; then
        if [ "$QUICK_MODE" = false ]; then
            local db_response=$(curl -s -o /dev/null -w "%{http_code}" \
                "${NEXT_PUBLIC_SUPABASE_URL}/rest/v1/" \
                -H "apikey: ${NEXT_PUBLIC_SUPABASE_ANON_KEY:-}" \
                --connect-timeout 5 2>/dev/null || echo "000")

            if [ "$db_response" = "200" ]; then
                log_check "supabase_db" "PASS" "Supabase database reachable" "HTTP $db_response"
            else
                log_check "supabase_db" "FAIL" "Supabase database unreachable" "HTTP $db_response"
            fi
        else
            log_check "supabase_db" "PASS" "Supabase URL configured (skipped ping)" ""
        fi
    else
        log_check "supabase_db" "WARN" "Supabase not configured" "Optional for persistence"
    fi

    # Check GitHub
    if [ -n "${GITHUB_TOKEN:-}" ]; then
        log_check "github_token" "PASS" "GITHUB_TOKEN is set" ""
    else
        log_check "github_token" "WARN" "GITHUB_TOKEN not set" "PR creation may fail"
    fi

    # Check git repository
    if git -C "$PROJECT_ROOT" rev-parse --git-dir &>/dev/null; then
        local branch=$(git -C "$PROJECT_ROOT" branch --show-current 2>/dev/null || echo "unknown")
        log_check "git_repo" "PASS" "Git repository valid (branch: $branch)" ""
    else
        log_check "git_repo" "FAIL" "Not a git repository" "Initialize with: git init"
    fi
}

# ─────────────────────────────────────────────────────────────────────────────
# SECTION 4: SECURITY VALIDATION
# ─────────────────────────────────────────────────────────────────────────────

validate_security() {
    log_section "4. SECURITY VALIDATION"

    # Check for exposed secrets in common files
    local secrets_found=false
    local secrets_files=""

    for file in "$PROJECT_ROOT"/*.env "$PROJECT_ROOT"/.env* "$PROJECT_ROOT"/secrets* "$PROJECT_ROOT"/*.pem "$PROJECT_ROOT"/*.key; do
        if [ -f "$file" ]; then
            local filename=$(basename "$file")
            # Check if file is in .gitignore
            if git -C "$PROJECT_ROOT" check-ignore -q "$file" 2>/dev/null; then
                log_check "secret_gitignore_$filename" "PASS" "$filename is gitignored" ""
            else
                if [[ "$filename" != ".env.example" ]] && [[ "$filename" != ".env.sample" ]]; then
                    secrets_found=true
                    secrets_files="$secrets_files $filename"
                fi
            fi
        fi
    done

    if [ "$secrets_found" = true ]; then
        log_check "secrets_exposure" "WARN" "Secret files may not be gitignored:$secrets_files" "Add to .gitignore"
    else
        log_check "secrets_exposure" "PASS" "No exposed secret files detected" ""
    fi

    # Check Dockerfile security
    local dockerfile="$PROJECT_ROOT/Dockerfile.agent"
    if [ -f "$dockerfile" ]; then
        if grep -q "USER" "$dockerfile" && ! grep -q "USER root" "$dockerfile"; then
            log_check "docker_user" "PASS" "Dockerfile uses non-root user" ""
        else
            log_check "docker_user" "WARN" "Dockerfile may run as root" "Add USER directive"
        fi
    fi

    # Check for hardcoded secrets in code
    if [ "$QUICK_MODE" = false ]; then
        local hardcoded=$(grep -r -l "sk-ant-" "$PROJECT_ROOT/src" "$PROJECT_ROOT/server" 2>/dev/null | head -3 || true)
        if [ -n "$hardcoded" ]; then
            log_check "hardcoded_secrets" "FAIL" "Potential hardcoded API keys found" "$hardcoded"
        else
            log_check "hardcoded_secrets" "PASS" "No hardcoded secrets detected" ""
        fi
    fi
}

# ─────────────────────────────────────────────────────────────────────────────
# SECTION 5: DOCKER VALIDATION
# ─────────────────────────────────────────────────────────────────────────────

validate_docker() {
    log_section "5. DOCKER VALIDATION"

    # Check Docker installed
    if command -v docker &>/dev/null; then
        local docker_version=$(docker --version 2>/dev/null | cut -d' ' -f3 | tr -d ',')
        log_check "docker_installed" "PASS" "Docker installed: $docker_version" ""
    else
        log_check "docker_installed" "FAIL" "Docker not installed" "Install Docker"
        return
    fi

    # Check Docker daemon running
    if docker info &>/dev/null; then
        log_check "docker_running" "PASS" "Docker daemon is running" ""
    else
        log_check "docker_running" "FAIL" "Docker daemon not running" "Start Docker"
        return
    fi

    # Check wave images exist
    local wave_images=$(docker images --format "{{.Repository}}" 2>/dev/null | grep -E "^wave-" | wc -l | tr -d ' ')
    if [ "$wave_images" -gt 0 ]; then
        log_check "wave_images" "PASS" "Found $wave_images WAVE Docker images" ""
    else
        log_check "wave_images" "WARN" "No WAVE Docker images found" "Run: docker compose build"
    fi

    # Check docker-compose.yml
    local compose_file="$PROJECT_ROOT/docker-compose.yml"
    if [ -f "$compose_file" ]; then
        if docker compose -f "$compose_file" config &>/dev/null; then
            local services=$(docker compose -f "$compose_file" config --services 2>/dev/null | wc -l | tr -d ' ')
            log_check "compose_valid" "PASS" "docker-compose.yml valid ($services services)" ""
        else
            log_check "compose_valid" "FAIL" "docker-compose.yml has errors" "Run: docker compose config"
        fi
    else
        log_check "compose_valid" "WARN" "docker-compose.yml not found" ""
    fi

    # Check running containers
    local running=$(docker ps --filter "name=wave-" --format "{{.Names}}" 2>/dev/null | wc -l | tr -d ' ')
    if [ "$running" -gt 0 ]; then
        log_check "containers_running" "PASS" "$running WAVE containers running" ""
    else
        log_check "containers_running" "WARN" "No WAVE containers running" "Start with: docker compose up -d"
    fi
}

# ─────────────────────────────────────────────────────────────────────────────
# SECTION 6: SLACK VALIDATION
# ─────────────────────────────────────────────────────────────────────────────

validate_slack() {
    log_section "6. SLACK INTEGRATION"

    if [ -n "${SLACK_WEBHOOK_URL:-}" ]; then
        log_check "slack_configured" "PASS" "Slack webhook URL is set" ""

        if [ "$QUICK_MODE" = false ]; then
            # Test Slack webhook (with validation test flag)
            local slack_response=$(curl -s -o /dev/null -w "%{http_code}" \
                -X POST "$SLACK_WEBHOOK_URL" \
                -H "Content-Type: application/json" \
                -d '{"text":"[WAVE Validation Test] Slack integration verified"}' \
                --connect-timeout 5 2>/dev/null || echo "000")

            if [ "$slack_response" = "200" ]; then
                log_check "slack_reachable" "PASS" "Slack webhook working" "HTTP $slack_response"
            else
                log_check "slack_reachable" "FAIL" "Slack webhook failed" "HTTP $slack_response"
            fi
        fi
    else
        log_check "slack_configured" "WARN" "Slack not configured" "Set SLACK_WEBHOOK_URL for notifications"
    fi
}

# ─────────────────────────────────────────────────────────────────────────────
# SECTION 7: SIGNAL FILES VALIDATION
# ─────────────────────────────────────────────────────────────────────────────

validate_signal_files() {
    log_section "7. SIGNAL FILES & GATE 0"

    # Check .claude directory exists
    if [ -d "$CLAUDE_DIR" ]; then
        log_check "claude_dir" "PASS" ".claude directory exists" "$CLAUDE_DIR"
    else
        log_check "claude_dir" "WARN" ".claude directory missing" "Will be created on first run"
        return
    fi

    # Check Gate 0 lock
    local gate0_lock="$CLAUDE_DIR/gate0-lock.json"
    if [ -f "$gate0_lock" ]; then
        if jq -e '.certified == true' "$gate0_lock" &>/dev/null; then
            local certified_at=$(jq -r '.certified_at // "unknown"' "$gate0_lock")
            log_check "gate0_certified" "PASS" "Gate 0 certified at $certified_at" ""
        else
            log_check "gate0_certified" "FAIL" "Gate 0 certification invalid" "Re-run certification"
        fi
    else
        log_check "gate0_certified" "WARN" "Gate 0 not yet certified" "Will be created on first agent start"
    fi

    # Check for stale signal files
    local stale_signals=$(find "$CLAUDE_DIR" -name "signal-*.json" -mmin +60 2>/dev/null | wc -l | tr -d ' ')
    if [ "$stale_signals" -gt 0 ]; then
        log_check "stale_signals" "WARN" "$stale_signals signal files older than 1 hour" "May indicate stuck agents"
    else
        log_check "stale_signals" "PASS" "No stale signal files" ""
    fi

    # Check for error signals
    local error_signals=$(find "$CLAUDE_DIR" -name "*-error.json" -o -name "*-STOP.json" 2>/dev/null | wc -l | tr -d ' ')
    if [ "$error_signals" -gt 0 ]; then
        log_check "error_signals" "WARN" "$error_signals error/stop signals present" "Review agent errors"
    fi
}

# ─────────────────────────────────────────────────────────────────────────────
# SECTION 8: AGENT DEFINITIONS VALIDATION
# ─────────────────────────────────────────────────────────────────────────────

validate_agents() {
    log_section "8. AGENT DEFINITIONS"

    local agents_dir="$PROJECT_ROOT/.claudecode/agents"
    local wave_agents_dir="$WAVE_DIR/.claudecode/agents"

    local agent_dir=""
    if [ -d "$agents_dir" ]; then
        agent_dir="$agents_dir"
    elif [ -d "$wave_agents_dir" ]; then
        agent_dir="$wave_agents_dir"
    fi

    if [ -n "$agent_dir" ]; then
        local agent_count=$(find "$agent_dir" -name "*.md" 2>/dev/null | wc -l | tr -d ' ')
        if [ "$agent_count" -gt 0 ]; then
            log_check "agent_definitions" "PASS" "Found $agent_count agent definitions" "$agent_dir"

            # Check for required agents
            for required in "cto" "pm" "fe-dev" "be-dev" "qa"; do
                if ls "$agent_dir"/${required}*.md &>/dev/null; then
                    log_check "agent_$required" "PASS" "$required agent definition exists" ""
                else
                    log_check "agent_$required" "WARN" "$required agent definition missing" ""
                fi
            done
        else
            log_check "agent_definitions" "FAIL" "No agent definitions found" "Create .claudecode/agents/*.md"
        fi
    else
        log_check "agent_definitions" "FAIL" "Agent definitions directory not found" "Create .claudecode/agents/"
    fi
}

# ─────────────────────────────────────────────────────────────────────────────
# GENERATE REPORT
# ─────────────────────────────────────────────────────────────────────────────

generate_report() {
    mkdir -p "$CLAUDE_DIR"

    # Determine overall status
    local overall_status="PASS"
    if [ $FAIL_COUNT -gt 0 ]; then
        overall_status="FAIL"
    elif [ $WARN_COUNT -gt 0 ]; then
        overall_status="WARN"
    fi

    # Generate JSON report
    cat > "$REPORT_FILE" << EOF
{
  "validation_report": {
    "timestamp": "$TIMESTAMP",
    "project": "$PROJECT_ROOT",
    "overall_status": "$overall_status",
    "summary": {
      "total_checks": $TOTAL_CHECKS,
      "passed": $PASS_COUNT,
      "failed": $FAIL_COUNT,
      "warnings": $WARN_COUNT
    },
    "checks": [
      $(IFS=,; echo "${CHECK_DETAILS[*]}")
    ],
    "passed_checks": $(printf '%s\n' "${PASSED_CHECKS[@]}" | jq -R . | jq -s . 2>/dev/null || echo '[]'),
    "failed_checks": $(printf '%s\n' "${FAILED_CHECKS[@]}" | jq -R . | jq -s . 2>/dev/null || echo '[]'),
    "warning_checks": $(printf '%s\n' "${WARNING_CHECKS[@]}" | jq -R . | jq -s . 2>/dev/null || echo '[]')
  }
}
EOF

    # Output JSON if requested
    if [ "$JSON_OUTPUT" = true ]; then
        cat "$REPORT_FILE"
        return
    fi

    # Print summary
    log_section "VALIDATION SUMMARY"

    echo ""
    echo "Results:"
    echo -e "  ${GREEN}PASSED:   $PASS_COUNT${NC}"
    echo -e "  ${RED}FAILED:   $FAIL_COUNT${NC}"
    echo -e "  ${YELLOW}WARNINGS: $WARN_COUNT${NC}"
    echo ""
    echo "Report saved to: $REPORT_FILE"
    echo ""

    if [ $FAIL_COUNT -gt 0 ]; then
        echo -e "${RED}═══════════════════════════════════════════════════════════════${NC}"
        echo -e "${RED} VALIDATION FAILED - Fix critical issues before proceeding${NC}"
        echo -e "${RED}═══════════════════════════════════════════════════════════════${NC}"
        echo ""
        echo "Failed checks:"
        for check in "${FAILED_CHECKS[@]}"; do
            echo -e "  ${RED}✗${NC} $check"
        done
        return 1
    elif [ $WARN_COUNT -gt 0 ]; then
        echo -e "${YELLOW}═══════════════════════════════════════════════════════════════${NC}"
        echo -e "${YELLOW} VALIDATION PASSED WITH WARNINGS${NC}"
        echo -e "${YELLOW}═══════════════════════════════════════════════════════════════${NC}"
        return 0
    else
        echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
        echo -e "${GREEN} ALL VALIDATION CHECKS PASSED${NC}"
        echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
        return 0
    fi
}

# ─────────────────────────────────────────────────────────────────────────────
# MAIN EXECUTION
# ─────────────────────────────────────────────────────────────────────────────

main() {
    if [ "$JSON_OUTPUT" = false ]; then
        echo ""
        echo "╔═══════════════════════════════════════════════════════════════════════════════╗"
        echo "║                     WAVE MASTER VALIDATION                                    ║"
        echo "╚═══════════════════════════════════════════════════════════════════════════════╝"
        echo ""
        echo "  Project:   $PROJECT_ROOT"
        echo "  Timestamp: $TIMESTAMP"
        echo "  Mode:      $([ "$QUICK_MODE" = true ] && echo "Quick" || echo "Full")"
        echo ""
    fi

    # Run all validations
    validate_ai_stories
    validate_plan
    validate_infrastructure
    validate_security
    validate_docker
    validate_slack
    validate_signal_files
    validate_agents

    # Generate and output report
    generate_report
}

main "$@"
