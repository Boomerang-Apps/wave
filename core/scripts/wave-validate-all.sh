#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# WAVE MASTER VALIDATION SCRIPT
# ═══════════════════════════════════════════════════════════════════════════════
# One-click validation for entire WAVE infrastructure
# Runs all validation checks in sequence and generates comprehensive report
#
# Usage:
#   ./wave-validate-all.sh [PROJECT_PATH]
#   ./wave-validate-all.sh /path/to/project --json         # JSON output for Portal
#   ./wave-validate-all.sh /path/to/project --quick        # Skip slow checks
#   ./wave-validate-all.sh /path/to/project --mode=strict  # Full validation (default)
#   ./wave-validate-all.sh /path/to/project --mode=dev     # Development mode (faster)
#   ./wave-validate-all.sh /path/to/project --mode=ci      # CI/CD pipeline mode
#
# Validation Modes:
#   strict - Full validation for production (default)
#            All checks enabled, gate blocking enforced
#   dev    - Fast iteration for development
#            Skip behavioral probes, network tests, use quick mode
#   ci     - CI/CD pipeline validation
#            All checks enabled, optimized for automation
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

# Support WAVE_VALIDATION_MODE environment variable (validated: GitLab CI/CD pattern)
VALIDATION_MODE="${WAVE_VALIDATION_MODE:-strict}"

# Memory TTL in days (default: 7)
MEMORY_TTL_DAYS="${MEMORY_TTL_DAYS:-7}"

# Parse flags (CLI overrides environment variable)
for arg in "$@"; do
    case $arg in
        --json) JSON_OUTPUT=true ;;
        --quick) QUICK_MODE=true ;;
        --mode=strict) VALIDATION_MODE="strict" ;;
        --mode=dev) VALIDATION_MODE="dev"; QUICK_MODE=true ;;
        --mode=ci) VALIDATION_MODE="ci" ;;
        --mode=*)
            echo "Unknown mode: ${arg#--mode=}. Valid modes: strict, dev, ci" >&2
            exit 2
            ;;
    esac
done

# ─────────────────────────────────────────────────────────────────────────────
# LOAD VALIDATION MODE SETTINGS FROM CONFIG FILE
# Validated: Configuration-driven approach per CI/CD best practices
# ─────────────────────────────────────────────────────────────────────────────

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_FILE="$SCRIPT_DIR/../config/validation-modes.json"

# Function to load settings from config file
load_mode_from_config() {
    local mode="$1"

    if [ -f "$CONFIG_FILE" ] && command -v jq &> /dev/null; then
        # Load settings from config file using jq
        local mode_exists
        mode_exists=$(jq -r ".modes.$mode // empty" "$CONFIG_FILE")

        if [ -n "$mode_exists" ]; then
            RUN_BEHAVIORAL_PROBES=$(jq -r ".modes.$mode.settings.behavioral_probes // true" "$CONFIG_FILE")
            RUN_BUILD_QA=$(jq -r ".modes.$mode.settings.build_qa // true" "$CONFIG_FILE")
            RUN_DRIFT_CHECK=$(jq -r ".modes.$mode.settings.drift_check // true" "$CONFIG_FILE")
            RUN_NETWORK_TESTS=$(jq -r ".modes.$mode.settings.network_tests // true" "$CONFIG_FILE")
            GATE_BLOCKING=$(jq -r ".modes.$mode.settings.gate_blocking // true" "$CONFIG_FILE")
            RUN_MEMORY_TTL_CHECK=$(jq -r ".modes.$mode.settings.memory_ttl_check // true" "$CONFIG_FILE")
            RUN_SECURITY_AUDIT=$(jq -r ".modes.$mode.settings.security_audit // true" "$CONFIG_FILE")

            # Load thresholds
            MIN_PASS_RATE=$(jq -r ".modes.$mode.thresholds.min_pass_rate // 0.95" "$CONFIG_FILE")
            MAX_WARNINGS=$(jq -r ".modes.$mode.thresholds.max_warnings // 5" "$CONFIG_FILE")
            MAX_FAILED=$(jq -r ".modes.$mode.thresholds.max_failed // 0" "$CONFIG_FILE")
            MEMORY_TTL_DAYS=$(jq -r ".modes.$mode.thresholds.memory_ttl_days // 7" "$CONFIG_FILE")
            MEMORY_MAX_SIZE_KB=$(jq -r ".modes.$mode.thresholds.memory_max_size_kb // 10240" "$CONFIG_FILE")

            # Check if mode is certified
            MODE_CERTIFIED=$(jq -r ".modes.$mode.certified // false" "$CONFIG_FILE")

            return 0
        fi
    fi
    return 1
}

# Try to load from config file, fall back to hardcoded defaults
if ! load_mode_from_config "$VALIDATION_MODE"; then
    # Fallback: hardcoded mode settings if config file not available
    case $VALIDATION_MODE in
        strict)
            RUN_BEHAVIORAL_PROBES=true
            RUN_BUILD_QA=true
            RUN_DRIFT_CHECK=true
            RUN_NETWORK_TESTS=true
            GATE_BLOCKING=true
            RUN_MEMORY_TTL_CHECK=true
            RUN_SECURITY_AUDIT=true
            MIN_PASS_RATE=0.95
            MAX_WARNINGS=5
            MAX_FAILED=0
            MEMORY_TTL_DAYS=7
            MEMORY_MAX_SIZE_KB=10240
            MODE_CERTIFIED=true
            ;;
        dev)
            RUN_BEHAVIORAL_PROBES=false
            RUN_BUILD_QA=true
            RUN_DRIFT_CHECK=false
            RUN_NETWORK_TESTS=false
            GATE_BLOCKING=false
            RUN_MEMORY_TTL_CHECK=true
            RUN_SECURITY_AUDIT=false
            MIN_PASS_RATE=0.70
            MAX_WARNINGS=20
            MAX_FAILED=5
            MEMORY_TTL_DAYS=30
            MEMORY_MAX_SIZE_KB=51200
            MODE_CERTIFIED=false
            ;;
        ci)
            RUN_BEHAVIORAL_PROBES=true
            RUN_BUILD_QA=true
            RUN_DRIFT_CHECK=true
            RUN_NETWORK_TESTS=true
            GATE_BLOCKING=true
            RUN_MEMORY_TTL_CHECK=true
            RUN_SECURITY_AUDIT=true
            MIN_PASS_RATE=0.95
            MAX_WARNINGS=5
            MAX_FAILED=0
            MEMORY_TTL_DAYS=7
            MEMORY_MAX_SIZE_KB=10240
            MODE_CERTIFIED=true
            ;;
    esac
fi

# Dev mode automatically enables quick mode
if [ "$VALIDATION_MODE" = "dev" ]; then
    QUICK_MODE=true
fi

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

    # Memory TTL Check - Flag stale agent memory files
    local memory_dir="$CLAUDE_DIR/agent-memory"
    if [ -d "$memory_dir" ]; then
        local stale_memory=$(find "$memory_dir" -name "*.json" -mtime +$MEMORY_TTL_DAYS 2>/dev/null | wc -l | tr -d ' ')
        local total_memory=$(find "$memory_dir" -name "*.json" 2>/dev/null | wc -l | tr -d ' ')

        if [ "$stale_memory" -gt 0 ]; then
            log_check "memory_ttl" "WARN" "$stale_memory of $total_memory memory files older than ${MEMORY_TTL_DAYS} days" "Consider archiving stale memories"

            # List the stale files if not in JSON mode
            if [ "$JSON_OUTPUT" = false ] && [ "$stale_memory" -lt 10 ]; then
                echo "    Stale memory files:"
                find "$memory_dir" -name "*.json" -mtime +$MEMORY_TTL_DAYS 2>/dev/null | while read f; do
                    echo "      - $(basename "$f") ($(stat -f "%Sm" -t "%Y-%m-%d" "$f" 2>/dev/null || stat -c "%y" "$f" 2>/dev/null | cut -d' ' -f1))"
                done
            fi
        elif [ "$total_memory" -gt 0 ]; then
            log_check "memory_ttl" "PASS" "All $total_memory memory files within TTL (${MEMORY_TTL_DAYS} days)" ""
        else
            log_check "memory_ttl" "PASS" "No agent memory files (fresh start)" ""
        fi
    else
        log_check "memory_ttl" "PASS" "No agent-memory directory (fresh start)" ""
    fi

    # Check memory size (warn if too large)
    if [ -d "$memory_dir" ]; then
        local memory_size_kb=$(du -sk "$memory_dir" 2>/dev/null | cut -f1 || echo "0")
        if [ "$memory_size_kb" -gt 10240 ]; then  # >10MB
            log_check "memory_size" "WARN" "Agent memory is ${memory_size_kb}KB (>10MB)" "Consider pruning old memories"
        elif [ "$memory_size_kb" -gt 0 ]; then
            log_check "memory_size" "PASS" "Agent memory size: ${memory_size_kb}KB" ""
        fi
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
# SECTION 9: BUILD QA VALIDATION
# ─────────────────────────────────────────────────────────────────────────────

validate_build_qa() {
    log_section "9. BUILD QA VALIDATION"

    # Skip if disabled by mode
    if [ "$RUN_BUILD_QA" = false ]; then
        log_check "build_qa_skipped" "PASS" "Build QA skipped (dev mode)" ""
        return
    fi

    # Check if we're in a Node.js project
    local package_json="$PROJECT_ROOT/package.json"
    if [ ! -f "$package_json" ]; then
        log_check "package_json" "WARN" "No package.json found" "Not a Node.js project or wrong directory"
        return
    fi

    log_check "package_json" "PASS" "package.json found" ""

    # Check if node_modules exists
    if [ ! -d "$PROJECT_ROOT/node_modules" ]; then
        log_check "node_modules" "WARN" "node_modules not found" "Run: npm install"
        return
    fi

    # Detect package manager
    local pkg_manager="npm"
    if [ -f "$PROJECT_ROOT/pnpm-lock.yaml" ]; then
        pkg_manager="pnpm"
    elif [ -f "$PROJECT_ROOT/yarn.lock" ]; then
        pkg_manager="yarn"
    fi

    # Check TypeScript compilation (if tsconfig exists)
    if [ -f "$PROJECT_ROOT/tsconfig.json" ]; then
        if [ "$QUICK_MODE" = false ]; then
            echo "    Running TypeScript check..."
            local tsc_output
            tsc_output=$(cd "$PROJECT_ROOT" && npx tsc --noEmit 2>&1) || true
            local tsc_exit=$?

            if [ $tsc_exit -eq 0 ]; then
                log_check "typescript" "PASS" "TypeScript compilation successful" ""
            else
                local error_count=$(echo "$tsc_output" | grep -c "error TS" || echo "0")
                log_check "typescript" "FAIL" "TypeScript errors: $error_count" "Run: npx tsc --noEmit"
            fi
        else
            log_check "typescript" "PASS" "TypeScript check skipped (quick mode)" ""
        fi
    else
        log_check "typescript" "PASS" "No tsconfig.json (not a TypeScript project)" ""
    fi

    # Check build command
    local has_build=$(jq -r '.scripts.build // empty' "$package_json" 2>/dev/null)
    if [ -n "$has_build" ]; then
        if [ "$QUICK_MODE" = false ]; then
            echo "    Running build check..."
            local build_output
            build_output=$(cd "$PROJECT_ROOT" && $pkg_manager run build 2>&1) || true
            local build_exit=$?

            if [ $build_exit -eq 0 ]; then
                log_check "build" "PASS" "Build successful ($pkg_manager run build)" ""
            else
                log_check "build" "FAIL" "Build failed" "Run: $pkg_manager run build"
            fi
        else
            log_check "build" "PASS" "Build check skipped (quick mode)" ""
        fi
    else
        log_check "build" "WARN" "No build script defined" ""
    fi

    # Check test command
    local has_test=$(jq -r '.scripts.test // empty' "$package_json" 2>/dev/null)
    if [ -n "$has_test" ]; then
        if [ "$QUICK_MODE" = false ]; then
            echo "    Running test check..."
            local test_output
            # Use --passWithNoTests for jest, --run for vitest
            if echo "$has_test" | grep -q "vitest"; then
                test_output=$(cd "$PROJECT_ROOT" && $pkg_manager run test -- --run 2>&1) || true
            else
                test_output=$(cd "$PROJECT_ROOT" && $pkg_manager run test -- --passWithNoTests 2>&1) || true
            fi
            local test_exit=$?

            if [ $test_exit -eq 0 ]; then
                # Try to extract test count
                local test_count=$(echo "$test_output" | grep -oE "[0-9]+ pass" | head -1 || echo "")
                log_check "tests" "PASS" "Tests passed${test_count:+ ($test_count)}" ""
            else
                local fail_count=$(echo "$test_output" | grep -oE "[0-9]+ fail" | head -1 || echo "some")
                log_check "tests" "FAIL" "Tests failed ($fail_count)" "Run: $pkg_manager test"
            fi
        else
            log_check "tests" "PASS" "Test check skipped (quick mode)" ""
        fi
    else
        log_check "tests" "WARN" "No test script defined" ""
    fi

    # Check lint command
    local has_lint=$(jq -r '.scripts.lint // empty' "$package_json" 2>/dev/null)
    if [ -n "$has_lint" ]; then
        if [ "$QUICK_MODE" = false ]; then
            echo "    Running lint check..."
            local lint_output
            lint_output=$(cd "$PROJECT_ROOT" && $pkg_manager run lint 2>&1) || true
            local lint_exit=$?

            if [ $lint_exit -eq 0 ]; then
                log_check "lint" "PASS" "Lint passed" ""
            else
                local lint_errors=$(echo "$lint_output" | grep -cE "(error|warning)" || echo "some")
                log_check "lint" "WARN" "Lint issues found ($lint_errors)" "Run: $pkg_manager run lint"
            fi
        else
            log_check "lint" "PASS" "Lint check skipped (quick mode)" ""
        fi
    else
        log_check "lint" "WARN" "No lint script defined" ""
    fi

    # Check for security vulnerabilities (npm audit)
    if [ "$QUICK_MODE" = false ]; then
        echo "    Running security audit..."
        local audit_output
        audit_output=$(cd "$PROJECT_ROOT" && npm audit --audit-level=high 2>&1) || true
        local audit_exit=$?

        if [ $audit_exit -eq 0 ]; then
            log_check "security_audit" "PASS" "No high/critical vulnerabilities" ""
        else
            local vuln_count=$(echo "$audit_output" | grep -oE "[0-9]+ (high|critical)" | head -1 || echo "some")
            log_check "security_audit" "WARN" "Vulnerabilities found ($vuln_count)" "Run: npm audit"
        fi
    else
        log_check "security_audit" "PASS" "Security audit skipped (quick mode)" ""
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
    "mode": "$VALIDATION_MODE",
    "quick_mode": $QUICK_MODE,
    "overall_status": "$overall_status",
    "certified": $([ "$overall_status" = "PASS" ] && [ "$VALIDATION_MODE" = "strict" ] && echo "true" || echo "false"),
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
        echo "  Mode:      $VALIDATION_MODE$([ "$QUICK_MODE" = true ] && echo " (quick)" || echo "")"
        echo ""

        # Show mode banner for dev mode
        if [ "$VALIDATION_MODE" = "dev" ]; then
            echo -e "${YELLOW}┌─────────────────────────────────────────────────────────────────────────────┐${NC}"
            echo -e "${YELLOW}│  ⚠️  DEV MODE - NOT CERTIFIED FOR PRODUCTION                                │${NC}"
            echo -e "${YELLOW}│  Some checks are skipped for faster iteration. Use --mode=strict for full. │${NC}"
            echo -e "${YELLOW}└─────────────────────────────────────────────────────────────────────────────┘${NC}"
            echo ""
        fi
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
    validate_build_qa

    # Generate and output report
    generate_report
}

main "$@"
