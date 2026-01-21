#!/opt/homebrew/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# WAVE BUILDING BLOCKS: STATUS DASHBOARD
# ═══════════════════════════════════════════════════════════════════════════════
# Pre-Launch Status Dashboard showing all validation steps and their status.
# This is the "index page" for wave validation - a flight checklist before launch.
#
# USAGE:
#   ./status-dashboard.sh --project <path> --wave <N>
#   ./status-dashboard.sh --project <path> --wave <N> --format html > status.html
#   ./status-dashboard.sh --project <path> --wave <N> --format json
#
# OUTPUT FORMATS:
#   terminal  - Colored terminal output (default)
#   html      - HTML page for browser viewing
#   json      - JSON for programmatic access
#
# ═══════════════════════════════════════════════════════════════════════════════

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCRIPT_VERSION="1.0.0"

# ─────────────────────────────────────────────────────────────────────────────
# COLORS (for terminal output)
# ─────────────────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
BOLD='\033[1m'
DIM='\033[2m'
NC='\033[0m'

# ─────────────────────────────────────────────────────────────────────────────
# STATUS SYMBOLS
# ─────────────────────────────────────────────────────────────────────────────
SYM_PASS="✓"
SYM_FAIL="✗"
SYM_BLOCKED="⊘"
SYM_PENDING="○"
SYM_DRIFT="⚠"

# ─────────────────────────────────────────────────────────────────────────────
# GLOBAL STATE
# ─────────────────────────────────────────────────────────────────────────────
declare -A GATE_STATUS
declare -A PHASE_STATUS
declare -A CHECK_RESULTS
OVERALL_STATUS="PENDING"
READY_TO_LAUNCH="NO"
BLOCKED_AT=""

# ─────────────────────────────────────────────────────────────────────────────
# USAGE
# ─────────────────────────────────────────────────────────────────────────────
show_usage() {
    cat << 'EOF'
WAVE Status Dashboard - Pre-Launch Checklist

Usage: status-dashboard.sh [options]

Required:
  -p, --project <path>     Path to project directory
  -w, --wave <number>      Wave number to check

Optional:
  -f, --format <format>    Output format: terminal (default), html, json
  -o, --output <file>      Write output to file (instead of stdout)
  --no-color               Disable colored output (terminal format)

Examples:
  # Terminal output (default)
  ./status-dashboard.sh -p /path/to/project -w 3

  # HTML output
  ./status-dashboard.sh -p /path/to/project -w 3 --format html > status.html

  # JSON output
  ./status-dashboard.sh -p /path/to/project -w 3 --format json

  # Save to file
  ./status-dashboard.sh -p /path/to/project -w 3 -o dashboard.txt

EOF
}

# ─────────────────────────────────────────────────────────────────────────────
# LOAD LOCK FILE DATA
# ─────────────────────────────────────────────────────────────────────────────
load_lock_data() {
    local lock_file=$1

    if [ -f "$lock_file" ]; then
        cat "$lock_file"
    else
        echo "{}"
    fi
}

# ─────────────────────────────────────────────────────────────────────────────
# CHECK GATE -1 (PRE-VALIDATION)
# ─────────────────────────────────────────────────────────────────────────────
check_gate_minus1() {
    local lock_file="$PROJECT_PATH/.claude/locks/GATE-1-wave${WAVE_NUMBER}.lock"

    if [ -f "$lock_file" ]; then
        local status
        status=$(jq -r '.status // "UNKNOWN"' "$lock_file" 2>/dev/null || echo "UNKNOWN")

        if [ "$status" = "PASSED" ]; then
            GATE_STATUS[-1]="PASS"

            # Load individual check results
            CHECK_RESULTS["gate-1_prompt_files"]=$(jq -r '.checks.prompt_files // "UNKNOWN"' "$lock_file" 2>/dev/null || echo "UNKNOWN")
            CHECK_RESULTS["gate-1_budget"]=$(jq -r '.checks.budget // "UNKNOWN"' "$lock_file" 2>/dev/null || echo "UNKNOWN")
            CHECK_RESULTS["gate-1_worktrees"]=$(jq -r '.checks.worktrees // "UNKNOWN"' "$lock_file" 2>/dev/null || echo "UNKNOWN")
            CHECK_RESULTS["gate-1_emergency_stop"]=$(jq -r '.checks.emergency_stop // "UNKNOWN"' "$lock_file" 2>/dev/null || echo "UNKNOWN")
            CHECK_RESULTS["gate-1_previous_wave"]=$(jq -r '.checks.previous_wave // "UNKNOWN"' "$lock_file" 2>/dev/null || echo "UNKNOWN")
            CHECK_RESULTS["gate-1_api_quotas"]=$(jq -r '.checks.api_quotas // "UNKNOWN"' "$lock_file" 2>/dev/null || echo "UNKNOWN")
            CHECK_RESULTS["gate-1_environment"]=$(jq -r '.checks.environment // "UNKNOWN"' "$lock_file" 2>/dev/null || echo "UNKNOWN")
            CHECK_RESULTS["gate-1_docker"]=$(jq -r '.checks.docker // "UNKNOWN"' "$lock_file" 2>/dev/null || echo "UNKNOWN")
            CHECK_RESULTS["gate-1_budget_available"]=$(jq -r '.budget_available // "0.00"' "$lock_file" 2>/dev/null || echo "0.00")
        else
            GATE_STATUS[-1]="FAIL"
        fi
    else
        GATE_STATUS[-1]="PENDING"
    fi
}

# ─────────────────────────────────────────────────────────────────────────────
# CHECK PHASE 0 (PRE-FLIGHT)
# ─────────────────────────────────────────────────────────────────────────────
check_phase0() {
    local lock_file="$PROJECT_PATH/.claude/locks/PHASE0-wave${WAVE_NUMBER}.lock"

    # Check if blocked by Gate -1
    if [ "${GATE_STATUS[-1]}" != "PASS" ]; then
        PHASE_STATUS[0]="BLOCKED"
        return
    fi

    if [ -f "$lock_file" ]; then
        local status
        status=$(jq -r '.status // "UNKNOWN"' "$lock_file" 2>/dev/null || echo "UNKNOWN")

        if [ "$status" = "PASSED" ] || [ "$status" = "GO" ]; then
            # Check for drift
            local stored_checksum current_checksum
            stored_checksum=$(jq -r '.checksum // ""' "$lock_file" 2>/dev/null || echo "")

            # Simple drift check - compare story file count
            local story_dir="$PROJECT_PATH/stories/wave${WAVE_NUMBER}"
            [ ! -d "$story_dir" ] && story_dir="$PROJECT_PATH/.claude/stories/wave${WAVE_NUMBER}"

            local current_checksum=""
            if [ -d "$story_dir" ]; then
                current_checksum=$(find "$story_dir" -name "*.json" -type f 2>/dev/null | sort | xargs cat 2>/dev/null | shasum -a 256 | cut -d' ' -f1)
            fi

            if [ -n "$stored_checksum" ] && [ -n "$current_checksum" ] && [ "$stored_checksum" != "$current_checksum" ]; then
                PHASE_STATUS[0]="DRIFT"
            else
                PHASE_STATUS[0]="PASS"
            fi

            # Load check results
            CHECK_RESULTS["phase0_stories"]=$(jq -r '.checks.stories.status // "UNKNOWN"' "$lock_file" 2>/dev/null || echo "UNKNOWN")
            CHECK_RESULTS["phase0_stories_total"]=$(jq -r '.checks.stories.total // 0' "$lock_file" 2>/dev/null || echo "0")
            CHECK_RESULTS["phase0_stories_valid"]=$(jq -r '.checks.stories.valid // 0' "$lock_file" 2>/dev/null || echo "0")
            CHECK_RESULTS["phase0_gaps"]=$(jq -r '.checks.gaps.status // "UNKNOWN"' "$lock_file" 2>/dev/null || echo "UNKNOWN")
            CHECK_RESULTS["phase0_planning"]=$(jq -r '.checks.planning.status // "UNKNOWN"' "$lock_file" 2>/dev/null || echo "UNKNOWN")
            CHECK_RESULTS["phase0_planning_waves"]=$(jq -r '.checks.planning.waves // 0' "$lock_file" 2>/dev/null || echo "0")
            CHECK_RESULTS["phase0_planning_cost"]=$(jq -r '.checks.planning.estimated_cost // "0.00"' "$lock_file" 2>/dev/null || echo "0.00")
            CHECK_RESULTS["phase0_greenlight"]=$(jq -r '.checks.greenlight.status // "UNKNOWN"' "$lock_file" 2>/dev/null || echo "UNKNOWN")
        else
            PHASE_STATUS[0]="FAIL"
        fi
    else
        PHASE_STATUS[0]="PENDING"
    fi
}

# ─────────────────────────────────────────────────────────────────────────────
# CHECK PHASE 1 (INFRASTRUCTURE)
# ─────────────────────────────────────────────────────────────────────────────
check_phase1() {
    local lock_file="$PROJECT_PATH/.claude/locks/PHASE1-wave${WAVE_NUMBER}.lock"

    # Check if blocked by Phase 0
    if [ "${PHASE_STATUS[0]}" != "PASS" ]; then
        PHASE_STATUS[1]="BLOCKED"
        return
    fi

    if [ -f "$lock_file" ]; then
        local status
        status=$(jq -r '.status // "UNKNOWN"' "$lock_file" 2>/dev/null || echo "UNKNOWN")

        if [ "$status" = "PASSED" ]; then
            PHASE_STATUS[1]="PASS"

            # Load test results
            local tests=("slack" "supabase" "docker" "dozzle" "worktree" "github" "vercel" "neon" "claude" "nano_banana")
            for test in "${tests[@]}"; do
                local test_status
                test_status=$(jq -r ".test_results.${test}.status // \"UNKNOWN\"" "$lock_file" 2>/dev/null || echo "UNKNOWN")
                local test_latency
                test_latency=$(jq -r ".test_results.${test}.latency // 0" "$lock_file" 2>/dev/null || echo "0")
                CHECK_RESULTS["phase1_${test}"]="$test_status"
                CHECK_RESULTS["phase1_${test}_latency"]="$test_latency"
            done
        else
            PHASE_STATUS[1]="FAIL"
        fi
    else
        PHASE_STATUS[1]="PENDING"
    fi
}

# ─────────────────────────────────────────────────────────────────────────────
# CHECK PHASE 2 (SMOKE TEST)
# ─────────────────────────────────────────────────────────────────────────────
check_phase2() {
    local lock_file="$PROJECT_PATH/.claude/locks/PHASE2-wave${WAVE_NUMBER}.lock"

    # Check if blocked by Phase 1
    if [ "${PHASE_STATUS[1]}" != "PASS" ]; then
        PHASE_STATUS[2]="BLOCKED"
        return
    fi

    if [ -f "$lock_file" ]; then
        local status
        status=$(jq -r '.status // "UNKNOWN"' "$lock_file" 2>/dev/null || echo "UNKNOWN")

        if [ "$status" = "PASSED" ]; then
            PHASE_STATUS[2]="PASS"

            CHECK_RESULTS["phase2_build"]=$(jq -r '.checks.build.status // "UNKNOWN"' "$lock_file" 2>/dev/null || echo "UNKNOWN")
            CHECK_RESULTS["phase2_typecheck"]=$(jq -r '.checks.typecheck.status // "UNKNOWN"' "$lock_file" 2>/dev/null || echo "UNKNOWN")
            CHECK_RESULTS["phase2_lint"]=$(jq -r '.checks.lint.status // "UNKNOWN"' "$lock_file" 2>/dev/null || echo "UNKNOWN")
            CHECK_RESULTS["phase2_test"]=$(jq -r '.checks.test.status // "UNKNOWN"' "$lock_file" 2>/dev/null || echo "UNKNOWN")
        else
            PHASE_STATUS[2]="FAIL"
        fi
    else
        PHASE_STATUS[2]="PENDING"
    fi
}

# ─────────────────────────────────────────────────────────────────────────────
# CHECK PHASE 3 (DEVELOPMENT)
# ─────────────────────────────────────────────────────────────────────────────
check_phase3() {
    local lock_file="$PROJECT_PATH/.claude/locks/PHASE3-wave${WAVE_NUMBER}.lock"

    # Check if blocked by Phase 2
    if [ "${PHASE_STATUS[2]}" != "PASS" ]; then
        PHASE_STATUS[3]="BLOCKED"
        return
    fi

    if [ -f "$lock_file" ]; then
        local status
        status=$(jq -r '.status // "UNKNOWN"' "$lock_file" 2>/dev/null || echo "UNKNOWN")

        if [ "$status" = "PASSED" ]; then
            PHASE_STATUS[3]="PASS"

            CHECK_RESULTS["phase3_fe_signal"]=$(jq -r '.checks.fe_signal // "UNKNOWN"' "$lock_file" 2>/dev/null || echo "UNKNOWN")
            CHECK_RESULTS["phase3_be_signal"]=$(jq -r '.checks.be_signal // "UNKNOWN"' "$lock_file" 2>/dev/null || echo "UNKNOWN")
        else
            PHASE_STATUS[3]="FAIL"
        fi
    else
        PHASE_STATUS[3]="PENDING"
    fi
}

# ─────────────────────────────────────────────────────────────────────────────
# CHECK PHASE 4 (QA/MERGE)
# ─────────────────────────────────────────────────────────────────────────────
check_phase4() {
    local lock_file="$PROJECT_PATH/.claude/locks/PHASE4-wave${WAVE_NUMBER}.lock"

    # Check if blocked by Phase 3
    if [ "${PHASE_STATUS[3]}" != "PASS" ]; then
        PHASE_STATUS[4]="BLOCKED"
        return
    fi

    if [ -f "$lock_file" ]; then
        local status
        status=$(jq -r '.status // "UNKNOWN"' "$lock_file" 2>/dev/null || echo "UNKNOWN")

        if [ "$status" = "PASSED" ]; then
            PHASE_STATUS[4]="PASS"

            CHECK_RESULTS["phase4_qa_approval"]=$(jq -r '.checks.qa_approval // "UNKNOWN"' "$lock_file" 2>/dev/null || echo "UNKNOWN")
            CHECK_RESULTS["phase4_merge"]=$(jq -r '.checks.merge // "UNKNOWN"' "$lock_file" 2>/dev/null || echo "UNKNOWN")
        else
            PHASE_STATUS[4]="FAIL"
        fi
    else
        PHASE_STATUS[4]="PENDING"
    fi
}

# ─────────────────────────────────────────────────────────────────────────────
# CHECK CIRCUIT BREAKER
# ─────────────────────────────────────────────────────────────────────────────
check_circuit_breaker() {
    local circuit_file="$PROJECT_PATH/.claude/circuit-breaker-wave${WAVE_NUMBER}.json"

    if [ -f "$circuit_file" ]; then
        local status
        status=$(jq -r '.status // "CLOSED"' "$circuit_file" 2>/dev/null || echo "CLOSED")

        if [ "$status" = "OPEN" ]; then
            CHECK_RESULTS["circuit_breaker"]="OPEN"
            CHECK_RESULTS["circuit_breaker_reason"]=$(jq -r '.reason // "Unknown"' "$circuit_file" 2>/dev/null || echo "Unknown")
        else
            CHECK_RESULTS["circuit_breaker"]="CLOSED"
        fi
    else
        CHECK_RESULTS["circuit_breaker"]="CLOSED"
    fi

    # Also check for EMERGENCY-STOP
    if [ -f "$PROJECT_PATH/.claude/EMERGENCY-STOP" ]; then
        CHECK_RESULTS["emergency_stop"]="ACTIVE"
        CHECK_RESULTS["emergency_stop_reason"]=$(cat "$PROJECT_PATH/.claude/EMERGENCY-STOP" 2>/dev/null | head -1 || echo "Unknown")
    else
        CHECK_RESULTS["emergency_stop"]="CLEAR"
    fi
}

# ─────────────────────────────────────────────────────────────────────────────
# CHECK CREDENTIALS & API KEYS
# ─────────────────────────────────────────────────────────────────────────────
check_credentials() {
    # Load environment variables from project .env
    if [ -f "$PROJECT_PATH/.env" ]; then
        set -a
        source "$PROJECT_PATH/.env" 2>/dev/null || true
        set +a
        CHECK_RESULTS["cred_env_file"]="PASS"
    else
        CHECK_RESULTS["cred_env_file"]="FAIL"
    fi

    # Also try WAVE .env
    local wave_env="/Volumes/SSD-01/Projects/WAVE/.env"
    if [ -f "$wave_env" ]; then
        set -a
        source "$wave_env" 2>/dev/null || true
        set +a
    fi

    # Check each credential
    # ANTHROPIC_API_KEY
    if [ -n "${ANTHROPIC_API_KEY:-}" ]; then
        if [[ "${ANTHROPIC_API_KEY}" == sk-ant-* ]]; then
            CHECK_RESULTS["cred_anthropic"]="PASS"
        else
            CHECK_RESULTS["cred_anthropic"]="FAIL"
        fi
    else
        CHECK_RESULTS["cred_anthropic"]="FAIL"
    fi

    # SLACK_WEBHOOK_URL
    if [ -n "${SLACK_WEBHOOK_URL:-}" ]; then
        if [[ "${SLACK_WEBHOOK_URL}" == https://hooks.slack.com/* ]]; then
            CHECK_RESULTS["cred_slack"]="PASS"
        else
            CHECK_RESULTS["cred_slack"]="FAIL"
        fi
    else
        CHECK_RESULTS["cred_slack"]="FAIL"
    fi

    # GITHUB_TOKEN
    if [ -n "${GITHUB_TOKEN:-}" ]; then
        CHECK_RESULTS["cred_github"]="PASS"
    else
        CHECK_RESULTS["cred_github"]="WARN"
    fi

    # SUPABASE_URL
    if [ -n "${SUPABASE_URL:-}" ]; then
        CHECK_RESULTS["cred_supabase_url"]="PASS"
    else
        CHECK_RESULTS["cred_supabase_url"]="WARN"
    fi

    # SUPABASE_ANON_KEY
    if [ -n "${SUPABASE_ANON_KEY:-}" ]; then
        CHECK_RESULTS["cred_supabase_key"]="PASS"
    else
        CHECK_RESULTS["cred_supabase_key"]="WARN"
    fi

    # VERCEL_TOKEN
    if [ -n "${VERCEL_TOKEN:-}" ]; then
        CHECK_RESULTS["cred_vercel"]="PASS"
    else
        CHECK_RESULTS["cred_vercel"]="WARN"
    fi

    # NEON credentials
    if [ -n "${NEON_API_KEY:-}" ] || [ -n "${DATABASE_URL:-}" ]; then
        CHECK_RESULTS["cred_neon"]="PASS"
    else
        CHECK_RESULTS["cred_neon"]="WARN"
    fi

    # Google AI (Nano Banana)
    if [ -n "${GOOGLE_AI_API_KEY:-}" ] || [ -n "${GEMINI_API_KEY:-}" ]; then
        CHECK_RESULTS["cred_google_ai"]="PASS"
    else
        CHECK_RESULTS["cred_google_ai"]="WARN"
    fi
}

# ─────────────────────────────────────────────────────────────────────────────
# CHECK SYSTEM REQUIREMENTS
# ─────────────────────────────────────────────────────────────────────────────
check_system() {
    # Node.js version
    if command -v node &> /dev/null; then
        local node_version
        node_version=$(node --version 2>/dev/null | sed 's/v//')
        local node_major
        node_major=$(echo "$node_version" | cut -d. -f1)
        if [ "$node_major" -ge 18 ]; then
            CHECK_RESULTS["sys_node"]="PASS"
            CHECK_RESULTS["sys_node_version"]="$node_version"
        else
            CHECK_RESULTS["sys_node"]="FAIL"
            CHECK_RESULTS["sys_node_version"]="$node_version (requires 18+)"
        fi
    else
        CHECK_RESULTS["sys_node"]="FAIL"
        CHECK_RESULTS["sys_node_version"]="Not installed"
    fi

    # pnpm
    if command -v pnpm &> /dev/null; then
        CHECK_RESULTS["sys_pnpm"]="PASS"
        CHECK_RESULTS["sys_pnpm_version"]=$(pnpm --version 2>/dev/null || echo "unknown")
    else
        CHECK_RESULTS["sys_pnpm"]="FAIL"
        CHECK_RESULTS["sys_pnpm_version"]="Not installed"
    fi

    # Git
    if command -v git &> /dev/null; then
        CHECK_RESULTS["sys_git"]="PASS"
        CHECK_RESULTS["sys_git_version"]=$(git --version 2>/dev/null | sed 's/git version //')
    else
        CHECK_RESULTS["sys_git"]="FAIL"
    fi

    # Docker
    if command -v docker &> /dev/null; then
        if docker info &> /dev/null; then
            CHECK_RESULTS["sys_docker"]="PASS"
        else
            CHECK_RESULTS["sys_docker"]="FAIL"
            CHECK_RESULTS["sys_docker_note"]="Daemon not running"
        fi
    else
        CHECK_RESULTS["sys_docker"]="WARN"
    fi

    # jq (required for JSON parsing)
    if command -v jq &> /dev/null; then
        CHECK_RESULTS["sys_jq"]="PASS"
    else
        CHECK_RESULTS["sys_jq"]="FAIL"
    fi

    # Disk space (check if < 1GB free)
    local free_space
    if [[ "$OSTYPE" == "darwin"* ]]; then
        free_space=$(df -g "$PROJECT_PATH" 2>/dev/null | tail -1 | awk '{print $4}')
    else
        free_space=$(df -BG "$PROJECT_PATH" 2>/dev/null | tail -1 | awk '{print $4}' | sed 's/G//')
    fi
    if [ -n "$free_space" ] && [ "$free_space" -ge 1 ]; then
        CHECK_RESULTS["sys_disk"]="PASS"
        CHECK_RESULTS["sys_disk_free"]="${free_space}GB"
    else
        CHECK_RESULTS["sys_disk"]="WARN"
        CHECK_RESULTS["sys_disk_free"]="${free_space:-unknown}GB"
    fi
}

# ─────────────────────────────────────────────────────────────────────────────
# CHECK PROJECT FILES
# ─────────────────────────────────────────────────────────────────────────────
check_project_files() {
    # package.json
    if [ -f "$PROJECT_PATH/package.json" ]; then
        if jq empty "$PROJECT_PATH/package.json" 2>/dev/null; then
            CHECK_RESULTS["proj_package_json"]="PASS"
        else
            CHECK_RESULTS["proj_package_json"]="FAIL"
        fi
    else
        CHECK_RESULTS["proj_package_json"]="FAIL"
    fi

    # tsconfig.json
    if [ -f "$PROJECT_PATH/tsconfig.json" ]; then
        CHECK_RESULTS["proj_tsconfig"]="PASS"
    else
        CHECK_RESULTS["proj_tsconfig"]="WARN"
    fi

    # CLAUDE.md
    if [ -f "$PROJECT_PATH/CLAUDE.md" ] || [ -f "$PROJECT_PATH/.claude/CLAUDE.md" ]; then
        CHECK_RESULTS["proj_claude_md"]="PASS"
    else
        CHECK_RESULTS["proj_claude_md"]="FAIL"
    fi

    # .claude directory
    if [ -d "$PROJECT_PATH/.claude" ]; then
        CHECK_RESULTS["proj_claude_dir"]="PASS"
    else
        CHECK_RESULTS["proj_claude_dir"]="FAIL"
    fi

    # stories directory
    local story_dir="$PROJECT_PATH/stories/wave${WAVE_NUMBER}"
    [ ! -d "$story_dir" ] && story_dir="$PROJECT_PATH/.claude/stories/wave${WAVE_NUMBER}"
    if [ -d "$story_dir" ]; then
        local story_count
        story_count=$(find "$story_dir" -name "*.json" -type f 2>/dev/null | wc -l | tr -d ' ')
        CHECK_RESULTS["proj_stories"]="PASS"
        CHECK_RESULTS["proj_stories_count"]="$story_count"
    else
        CHECK_RESULTS["proj_stories"]="FAIL"
        CHECK_RESULTS["proj_stories_count"]="0"
    fi

    # node_modules
    if [ -d "$PROJECT_PATH/node_modules" ]; then
        CHECK_RESULTS["proj_node_modules"]="PASS"
    else
        CHECK_RESULTS["proj_node_modules"]="FAIL"
    fi

    # Git repo
    if [ -d "$PROJECT_PATH/.git" ]; then
        CHECK_RESULTS["proj_git_repo"]="PASS"

        # Check for uncommitted changes
        local git_status
        git_status=$(cd "$PROJECT_PATH" && git status --porcelain 2>/dev/null | wc -l | tr -d ' ')
        if [ "$git_status" -eq 0 ]; then
            CHECK_RESULTS["proj_git_clean"]="PASS"
        else
            CHECK_RESULTS["proj_git_clean"]="WARN"
            CHECK_RESULTS["proj_git_changes"]="$git_status files"
        fi

        # Check current branch
        local current_branch
        current_branch=$(cd "$PROJECT_PATH" && git branch --show-current 2>/dev/null)
        CHECK_RESULTS["proj_git_branch"]="$current_branch"
    else
        CHECK_RESULTS["proj_git_repo"]="FAIL"
    fi

    # pnpm-lock.yaml
    if [ -f "$PROJECT_PATH/pnpm-lock.yaml" ]; then
        CHECK_RESULTS["proj_lock_file"]="PASS"
    elif [ -f "$PROJECT_PATH/package-lock.json" ]; then
        CHECK_RESULTS["proj_lock_file"]="PASS"
    else
        CHECK_RESULTS["proj_lock_file"]="WARN"
    fi
}

# ─────────────────────────────────────────────────────────────────────────────
# CHECK NETWORK CONNECTIVITY
# ─────────────────────────────────────────────────────────────────────────────
check_network() {
    # Quick ping tests (with timeout)

    # Anthropic API
    if curl -s -m 5 -o /dev/null -w "%{http_code}" "https://api.anthropic.com" 2>/dev/null | grep -q "^[23]"; then
        CHECK_RESULTS["net_anthropic"]="PASS"
    else
        CHECK_RESULTS["net_anthropic"]="FAIL"
    fi

    # GitHub
    if curl -s -m 5 -o /dev/null -w "%{http_code}" "https://api.github.com" 2>/dev/null | grep -q "^[23]"; then
        CHECK_RESULTS["net_github"]="PASS"
    else
        CHECK_RESULTS["net_github"]="FAIL"
    fi

    # npm registry
    if curl -s -m 5 -o /dev/null -w "%{http_code}" "https://registry.npmjs.org" 2>/dev/null | grep -q "^[23]"; then
        CHECK_RESULTS["net_npm"]="PASS"
    else
        CHECK_RESULTS["net_npm"]="FAIL"
    fi
}

# ─────────────────────────────────────────────────────────────────────────────
# CALCULATE OVERALL STATUS
# ─────────────────────────────────────────────────────────────────────────────
calculate_overall_status() {
    # Check circuit breaker first
    if [ "${CHECK_RESULTS["circuit_breaker"]}" = "OPEN" ]; then
        OVERALL_STATUS="HALTED"
        READY_TO_LAUNCH="NO"
        BLOCKED_AT="CIRCUIT BREAKER"
        return
    fi

    if [ "${CHECK_RESULTS["emergency_stop"]}" = "ACTIVE" ]; then
        OVERALL_STATUS="HALTED"
        READY_TO_LAUNCH="NO"
        BLOCKED_AT="EMERGENCY STOP"
        return
    fi

    # Check each phase in order
    local phases=(-1 0 1 2 3 4)
    for phase in "${phases[@]}"; do
        local status
        if [ "$phase" -eq -1 ]; then
            status="${GATE_STATUS[-1]}"
        else
            status="${PHASE_STATUS[$phase]}"
        fi

        case "$status" in
            PASS)
                continue
                ;;
            FAIL)
                OVERALL_STATUS="FAILED"
                READY_TO_LAUNCH="NO"
                if [ "$phase" -eq -1 ]; then
                    BLOCKED_AT="GATE -1"
                else
                    BLOCKED_AT="PHASE $phase"
                fi
                return
                ;;
            DRIFT)
                OVERALL_STATUS="DRIFT"
                READY_TO_LAUNCH="NO"
                BLOCKED_AT="PHASE $phase (drift detected)"
                return
                ;;
            BLOCKED)
                OVERALL_STATUS="BLOCKED"
                READY_TO_LAUNCH="NO"
                BLOCKED_AT="PHASE $phase"
                return
                ;;
            PENDING)
                OVERALL_STATUS="PENDING"
                READY_TO_LAUNCH="NO"
                if [ "$phase" -eq -1 ]; then
                    BLOCKED_AT="GATE -1 (not run)"
                else
                    BLOCKED_AT="PHASE $phase (not run)"
                fi
                return
                ;;
        esac
    done

    # All phases passed
    OVERALL_STATUS="READY"
    READY_TO_LAUNCH="YES"
    BLOCKED_AT=""
}

# ─────────────────────────────────────────────────────────────────────────────
# RENDER TERMINAL OUTPUT
# ─────────────────────────────────────────────────────────────────────────────
render_terminal() {
    local project_name
    project_name=$(basename "$PROJECT_PATH")

    echo ""
    echo -e "${CYAN}${BOLD}╔═══════════════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}${BOLD}║                     WAVE PRE-LAUNCH STATUS DASHBOARD                      ║${NC}"
    echo -e "${CYAN}${BOLD}╠═══════════════════════════════════════════════════════════════════════════╣${NC}"
    echo -e "${CYAN}${BOLD}║${NC}  PROJECT: ${BOLD}${project_name}${NC}"
    echo -e "${CYAN}${BOLD}║${NC}  WAVE:    ${BOLD}${WAVE_NUMBER}${NC}"
    echo -e "${CYAN}${BOLD}║${NC}  TIME:    $(date '+%Y-%m-%d %H:%M:%S')"
    echo -e "${CYAN}${BOLD}╠═══════════════════════════════════════════════════════════════════════════╣${NC}"
    echo ""

    # ═══════════════════════════════════════════════════════════════════════════
    # SECTION 1: CREDENTIALS & API KEYS
    # ═══════════════════════════════════════════════════════════════════════════
    local cred_status="PASS"
    [ "${CHECK_RESULTS["cred_anthropic"]}" = "FAIL" ] && cred_status="FAIL"
    [ "${CHECK_RESULTS["cred_slack"]}" = "FAIL" ] && cred_status="FAIL"

    render_terminal_section "CREDENTIALS & API KEYS" "$cred_status"
    render_terminal_check ".env file exists" "${CHECK_RESULTS["cred_env_file"]:-PENDING}"
    render_terminal_check "ANTHROPIC_API_KEY" "${CHECK_RESULTS["cred_anthropic"]:-PENDING}"
    render_terminal_check "SLACK_WEBHOOK_URL" "${CHECK_RESULTS["cred_slack"]:-PENDING}"
    render_terminal_check "GITHUB_TOKEN" "${CHECK_RESULTS["cred_github"]:-PENDING}"
    render_terminal_check "SUPABASE_URL" "${CHECK_RESULTS["cred_supabase_url"]:-PENDING}"
    render_terminal_check "SUPABASE_ANON_KEY" "${CHECK_RESULTS["cred_supabase_key"]:-PENDING}"
    render_terminal_check "VERCEL_TOKEN" "${CHECK_RESULTS["cred_vercel"]:-PENDING}"
    render_terminal_check "NEON/DATABASE_URL" "${CHECK_RESULTS["cred_neon"]:-PENDING}"
    render_terminal_check "GOOGLE_AI_API_KEY" "${CHECK_RESULTS["cred_google_ai"]:-PENDING}"
    render_terminal_status "$cred_status"
    echo ""

    # ═══════════════════════════════════════════════════════════════════════════
    # SECTION 2: SYSTEM REQUIREMENTS
    # ═══════════════════════════════════════════════════════════════════════════
    local sys_status="PASS"
    [ "${CHECK_RESULTS["sys_node"]}" = "FAIL" ] && sys_status="FAIL"
    [ "${CHECK_RESULTS["sys_pnpm"]}" = "FAIL" ] && sys_status="FAIL"

    render_terminal_section "SYSTEM REQUIREMENTS" "$sys_status"
    render_terminal_check "Node.js (${CHECK_RESULTS["sys_node_version"]:-unknown})" "${CHECK_RESULTS["sys_node"]:-PENDING}"
    render_terminal_check "pnpm (${CHECK_RESULTS["sys_pnpm_version"]:-unknown})" "${CHECK_RESULTS["sys_pnpm"]:-PENDING}"
    render_terminal_check "Git (${CHECK_RESULTS["sys_git_version"]:-unknown})" "${CHECK_RESULTS["sys_git"]:-PENDING}"
    render_terminal_check "Docker daemon" "${CHECK_RESULTS["sys_docker"]:-PENDING}"
    render_terminal_check "jq (JSON parser)" "${CHECK_RESULTS["sys_jq"]:-PENDING}"
    render_terminal_check "Disk space (${CHECK_RESULTS["sys_disk_free"]:-unknown})" "${CHECK_RESULTS["sys_disk"]:-PENDING}"
    render_terminal_status "$sys_status"
    echo ""

    # ═══════════════════════════════════════════════════════════════════════════
    # SECTION 3: PROJECT FILES
    # ═══════════════════════════════════════════════════════════════════════════
    local proj_status="PASS"
    [ "${CHECK_RESULTS["proj_package_json"]}" = "FAIL" ] && proj_status="FAIL"
    [ "${CHECK_RESULTS["proj_claude_md"]}" = "FAIL" ] && proj_status="FAIL"

    render_terminal_section "PROJECT FILES" "$proj_status"
    render_terminal_check "package.json (valid JSON)" "${CHECK_RESULTS["proj_package_json"]:-PENDING}"
    render_terminal_check "tsconfig.json" "${CHECK_RESULTS["proj_tsconfig"]:-PENDING}"
    render_terminal_check "CLAUDE.md" "${CHECK_RESULTS["proj_claude_md"]:-PENDING}"
    render_terminal_check ".claude/ directory" "${CHECK_RESULTS["proj_claude_dir"]:-PENDING}"
    render_terminal_check "Stories (${CHECK_RESULTS["proj_stories_count"]:-0} files)" "${CHECK_RESULTS["proj_stories"]:-PENDING}"
    render_terminal_check "node_modules/" "${CHECK_RESULTS["proj_node_modules"]:-PENDING}"
    render_terminal_check "Git repository" "${CHECK_RESULTS["proj_git_repo"]:-PENDING}"
    local git_info=""
    [ -n "${CHECK_RESULTS["proj_git_branch"]:-}" ] && git_info=" (${CHECK_RESULTS["proj_git_branch"]})"
    render_terminal_check "Git clean${git_info}" "${CHECK_RESULTS["proj_git_clean"]:-PENDING}"
    render_terminal_check "Lock file (pnpm/npm)" "${CHECK_RESULTS["proj_lock_file"]:-PENDING}"
    render_terminal_status "$proj_status"
    echo ""

    # ═══════════════════════════════════════════════════════════════════════════
    # SECTION 4: NETWORK CONNECTIVITY
    # ═══════════════════════════════════════════════════════════════════════════
    local net_status="PASS"
    [ "${CHECK_RESULTS["net_anthropic"]}" = "FAIL" ] && net_status="FAIL"

    render_terminal_section "NETWORK CONNECTIVITY" "$net_status"
    render_terminal_check "Anthropic API" "${CHECK_RESULTS["net_anthropic"]:-PENDING}"
    render_terminal_check "GitHub API" "${CHECK_RESULTS["net_github"]:-PENDING}"
    render_terminal_check "NPM Registry" "${CHECK_RESULTS["net_npm"]:-PENDING}"
    render_terminal_status "$net_status"
    echo ""

    echo -e "${CYAN}${BOLD}╠═══════════════════════════════════════════════════════════════════════════╣${NC}"
    echo -e "${CYAN}${BOLD}║${NC}                         ${BOLD}BUILDING BLOCK PHASES${NC}"
    echo -e "${CYAN}${BOLD}╠═══════════════════════════════════════════════════════════════════════════╣${NC}"
    echo ""

    # Gate -1: Pre-Validation
    render_terminal_section "GATE -1: PRE-VALIDATION (Zero Error Launch Protocol)" "${GATE_STATUS[-1]}"
    render_terminal_check "Prompt files exist" "${CHECK_RESULTS["gate-1_prompt_files"]:-PENDING}"
    render_terminal_check "Budget sufficient (\$${CHECK_RESULTS["gate-1_budget_available"]:-0.00})" "${CHECK_RESULTS["gate-1_budget"]:-PENDING}"
    render_terminal_check "Worktrees clean" "${CHECK_RESULTS["gate-1_worktrees"]:-PENDING}"
    render_terminal_check "No emergency stop" "${CHECK_RESULTS["gate-1_emergency_stop"]:-PENDING}"
    render_terminal_check "Previous wave complete" "${CHECK_RESULTS["gate-1_previous_wave"]:-PENDING}"
    render_terminal_check "API quotas available" "${CHECK_RESULTS["gate-1_api_quotas"]:-PENDING}"
    render_terminal_check "Environment variables set" "${CHECK_RESULTS["gate-1_environment"]:-PENDING}"
    render_terminal_check "Docker ready" "${CHECK_RESULTS["gate-1_docker"]:-PENDING}"
    render_terminal_status "${GATE_STATUS[-1]}"
    echo ""

    # Phase 0: Pre-Flight
    render_terminal_section "PHASE 0: PRE-FLIGHT (Stories & Planning)" "${PHASE_STATUS[0]}"
    render_terminal_check "Stories validated (${CHECK_RESULTS["phase0_stories_valid"]:-0}/${CHECK_RESULTS["phase0_stories_total"]:-0})" "${CHECK_RESULTS["phase0_stories"]:-PENDING}"
    render_terminal_check "Gap analysis" "${CHECK_RESULTS["phase0_gaps"]:-PENDING}"
    render_terminal_check "Wave planning (${CHECK_RESULTS["phase0_planning_waves"]:-0} waves, \$${CHECK_RESULTS["phase0_planning_cost"]:-0.00})" "${CHECK_RESULTS["phase0_planning"]:-PENDING}"
    render_terminal_check "Green light" "${CHECK_RESULTS["phase0_greenlight"]:-PENDING}"
    render_terminal_status "${PHASE_STATUS[0]}"
    echo ""

    # Phase 1: Infrastructure
    render_terminal_section "PHASE 1: INFRASTRUCTURE (10 Ping Tests)" "${PHASE_STATUS[1]}"
    local infra_tests=("slack:Slack" "supabase:Supabase" "docker:Docker" "dozzle:Dozzle" "worktree:Worktree" "github:GitHub" "vercel:Vercel" "neon:Neon" "claude:Claude API" "nano_banana:Nano Banana")
    for test_pair in "${infra_tests[@]}"; do
        local key="${test_pair%%:*}"
        local label="${test_pair#*:}"
        local latency="${CHECK_RESULTS["phase1_${key}_latency"]:-0}"
        local latency_str=""
        [ "$latency" != "0" ] && latency_str=" (${latency}ms)"
        render_terminal_check "${label}${latency_str}" "${CHECK_RESULTS["phase1_${key}"]:-PENDING}"
    done
    render_terminal_status "${PHASE_STATUS[1]}"
    echo ""

    # Phase 2: Smoke Test
    render_terminal_section "PHASE 2: SMOKE TEST (Build & Quality)" "${PHASE_STATUS[2]}"
    render_terminal_check "Build (pnpm build)" "${CHECK_RESULTS["phase2_build"]:-PENDING}"
    render_terminal_check "TypeCheck (pnpm typecheck)" "${CHECK_RESULTS["phase2_typecheck"]:-PENDING}"
    render_terminal_check "Lint (pnpm lint)" "${CHECK_RESULTS["phase2_lint"]:-PENDING}"
    render_terminal_check "Test (pnpm test)" "${CHECK_RESULTS["phase2_test"]:-PENDING}"
    render_terminal_status "${PHASE_STATUS[2]}"
    echo ""

    # Phase 3: Development
    render_terminal_section "PHASE 3: DEVELOPMENT (Agent Completion)" "${PHASE_STATUS[3]}"
    render_terminal_check "FE-Dev completion signal" "${CHECK_RESULTS["phase3_fe_signal"]:-PENDING}"
    render_terminal_check "BE-Dev completion signal" "${CHECK_RESULTS["phase3_be_signal"]:-PENDING}"
    render_terminal_status "${PHASE_STATUS[3]}"
    echo ""

    # Phase 4: QA/Merge
    render_terminal_section "PHASE 4: QA/MERGE (Final Validation)" "${PHASE_STATUS[4]}"
    render_terminal_check "QA approval" "${CHECK_RESULTS["phase4_qa_approval"]:-PENDING}"
    render_terminal_check "Merge to main" "${CHECK_RESULTS["phase4_merge"]:-PENDING}"
    render_terminal_status "${PHASE_STATUS[4]}"
    echo ""

    # Circuit Breaker
    echo -e "${CYAN}${BOLD}╠═══════════════════════════════════════════════════════════════════════════╣${NC}"
    local cb_status="${CHECK_RESULTS["circuit_breaker"]}"
    if [ "$cb_status" = "OPEN" ]; then
        echo -e "${CYAN}${BOLD}║${NC}  CIRCUIT BREAKER: ${RED}${BOLD}OPEN (HALTED)${NC}"
        echo -e "${CYAN}${BOLD}║${NC}  Reason: ${CHECK_RESULTS["circuit_breaker_reason"]:-Unknown}"
    else
        echo -e "${CYAN}${BOLD}║${NC}  CIRCUIT BREAKER: ${GREEN}${BOLD}CLOSED (OK)${NC}"
    fi

    if [ "${CHECK_RESULTS["emergency_stop"]}" = "ACTIVE" ]; then
        echo -e "${CYAN}${BOLD}║${NC}  EMERGENCY STOP:  ${RED}${BOLD}ACTIVE${NC}"
        echo -e "${CYAN}${BOLD}║${NC}  Reason: ${CHECK_RESULTS["emergency_stop_reason"]:-Unknown}"
    fi
    echo ""

    # Overall Status
    echo -e "${CYAN}${BOLD}╠═══════════════════════════════════════════════════════════════════════════╣${NC}"

    local overall_color
    local overall_icon
    case "$OVERALL_STATUS" in
        READY)   overall_color="${GREEN}"; overall_icon="🟢" ;;
        PENDING) overall_color="${YELLOW}"; overall_icon="🟡" ;;
        BLOCKED) overall_color="${YELLOW}"; overall_icon="🟡" ;;
        DRIFT)   overall_color="${YELLOW}"; overall_icon="🟠" ;;
        FAILED)  overall_color="${RED}"; overall_icon="🔴" ;;
        HALTED)  overall_color="${RED}"; overall_icon="⛔" ;;
        *)       overall_color="${DIM}"; overall_icon="⚪" ;;
    esac

    echo -e "${CYAN}${BOLD}║${NC}"
    echo -e "${CYAN}${BOLD}║${NC}  OVERALL STATUS:   ${overall_icon} ${overall_color}${BOLD}${OVERALL_STATUS}${NC}"
    if [ -n "$BLOCKED_AT" ]; then
        echo -e "${CYAN}${BOLD}║${NC}  BLOCKED AT:       ${BLOCKED_AT}"
    fi
    echo -e "${CYAN}${BOLD}║${NC}"

    if [ "$READY_TO_LAUNCH" = "YES" ]; then
        echo -e "${CYAN}${BOLD}║${NC}  ${GREEN}${BOLD}✓ READY TO LAUNCH${NC}"
    else
        echo -e "${CYAN}${BOLD}║${NC}  ${RED}${BOLD}✗ NOT READY TO LAUNCH${NC}"
    fi
    echo -e "${CYAN}${BOLD}║${NC}"
    echo -e "${CYAN}${BOLD}╚═══════════════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

render_terminal_section() {
    local title=$1
    local status=$2

    local status_color
    case "$status" in
        PASS)    status_color="${GREEN}" ;;
        FAIL)    status_color="${RED}" ;;
        BLOCKED) status_color="${YELLOW}" ;;
        DRIFT)   status_color="${YELLOW}" ;;
        PENDING) status_color="${DIM}" ;;
        *)       status_color="${DIM}" ;;
    esac

    echo -e "${CYAN}${BOLD}║${NC}"
    echo -e "${CYAN}${BOLD}║${NC}  ${BOLD}${title}${NC}"
    echo -e "${CYAN}${BOLD}║${NC}  ${DIM}$(printf '─%.0s' {1..60})${NC}"
}

render_terminal_check() {
    local label=$1
    local status=$2

    local symbol color
    case "$status" in
        PASS)    symbol="${SYM_PASS}"; color="${GREEN}" ;;
        FAIL)    symbol="${SYM_FAIL}"; color="${RED}" ;;
        WARN)    symbol="${SYM_DRIFT}"; color="${YELLOW}" ;;
        BLOCKED) symbol="${SYM_BLOCKED}"; color="${YELLOW}" ;;
        DRIFT)   symbol="${SYM_DRIFT}"; color="${YELLOW}" ;;
        PENDING) symbol="${SYM_PENDING}"; color="${DIM}" ;;
        GO)      symbol="${SYM_PASS}"; color="${GREEN}" ;;
        *)       symbol="${SYM_PENDING}"; color="${DIM}" ;;
    esac

    echo -e "${CYAN}${BOLD}║${NC}  ${color}[ ${symbol} ]${NC} ${label}"
}

render_terminal_status() {
    local status=$1

    local status_text color
    case "$status" in
        PASS)    status_text="PASSED"; color="${GREEN}" ;;
        FAIL)    status_text="FAILED"; color="${RED}" ;;
        BLOCKED) status_text="BLOCKED"; color="${YELLOW}" ;;
        DRIFT)   status_text="DRIFT DETECTED"; color="${YELLOW}" ;;
        PENDING) status_text="PENDING"; color="${DIM}" ;;
        *)       status_text="UNKNOWN"; color="${DIM}" ;;
    esac

    echo -e "${CYAN}${BOLD}║${NC}                                                    ${color}${BOLD}${status_text}${NC}"
}

# ─────────────────────────────────────────────────────────────────────────────
# RENDER HTML OUTPUT
# ─────────────────────────────────────────────────────────────────────────────
render_html() {
    local project_name
    project_name=$(basename "$PROJECT_PATH")
    local timestamp
    timestamp=$(date '+%Y-%m-%d %H:%M:%S')

    cat << EOF
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>WAVE Status Dashboard - ${project_name} Wave ${WAVE_NUMBER}</title>
    <style>
        :root {
            --bg-color: #1a1a2e;
            --card-bg: #16213e;
            --border-color: #0f3460;
            --text-color: #eee;
            --text-muted: #888;
            --pass-color: #00d26a;
            --fail-color: #ff6b6b;
            --blocked-color: #feca57;
            --pending-color: #576574;
            --drift-color: #ff9f43;
        }

        * { box-sizing: border-box; margin: 0; padding: 0; }

        body {
            font-family: 'SF Mono', 'Monaco', 'Consolas', monospace;
            background: var(--bg-color);
            color: var(--text-color);
            padding: 20px;
            min-height: 100vh;
        }

        .dashboard {
            max-width: 900px;
            margin: 0 auto;
        }

        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 12px;
            padding: 24px;
            margin-bottom: 24px;
            text-align: center;
        }

        .header h1 {
            font-size: 24px;
            margin-bottom: 8px;
        }

        .header .meta {
            display: flex;
            justify-content: center;
            gap: 24px;
            margin-top: 12px;
            font-size: 14px;
            opacity: 0.9;
        }

        .phase-card {
            background: var(--card-bg);
            border: 1px solid var(--border-color);
            border-radius: 8px;
            margin-bottom: 16px;
            overflow: hidden;
        }

        .phase-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 16px 20px;
            border-bottom: 1px solid var(--border-color);
        }

        .phase-title {
            font-weight: bold;
            font-size: 14px;
        }

        .phase-status {
            padding: 4px 12px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: bold;
        }

        .status-pass { background: var(--pass-color); color: #000; }
        .status-fail { background: var(--fail-color); color: #fff; }
        .status-blocked { background: var(--blocked-color); color: #000; }
        .status-pending { background: var(--pending-color); color: #fff; }
        .status-drift { background: var(--drift-color); color: #000; }

        .checks-list {
            padding: 12px 20px;
        }

        .check-item {
            display: flex;
            align-items: center;
            padding: 8px 0;
            border-bottom: 1px solid rgba(255,255,255,0.05);
        }

        .check-item:last-child {
            border-bottom: none;
        }

        .check-icon {
            width: 24px;
            height: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-right: 12px;
            font-size: 14px;
        }

        .check-icon.pass { color: var(--pass-color); }
        .check-icon.fail { color: var(--fail-color); }
        .check-icon.blocked { color: var(--blocked-color); }
        .check-icon.pending { color: var(--pending-color); }

        .check-label {
            flex: 1;
            font-size: 13px;
        }

        .overall-status {
            background: var(--card-bg);
            border: 2px solid var(--border-color);
            border-radius: 12px;
            padding: 24px;
            text-align: center;
            margin-top: 24px;
        }

        .overall-status h2 {
            font-size: 18px;
            margin-bottom: 16px;
        }

        .overall-badge {
            display: inline-block;
            padding: 12px 32px;
            border-radius: 8px;
            font-size: 18px;
            font-weight: bold;
        }

        .ready-yes { background: var(--pass-color); color: #000; }
        .ready-no { background: var(--fail-color); color: #fff; }

        .blocked-info {
            margin-top: 12px;
            font-size: 14px;
            color: var(--text-muted);
        }

        .circuit-breaker {
            display: flex;
            justify-content: center;
            gap: 24px;
            margin-top: 16px;
            font-size: 13px;
        }

        .cb-item {
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .cb-dot {
            width: 10px;
            height: 10px;
            border-radius: 50%;
        }

        .cb-dot.ok { background: var(--pass-color); }
        .cb-dot.alert { background: var(--fail-color); }

        .timestamp {
            text-align: center;
            margin-top: 24px;
            font-size: 12px;
            color: var(--text-muted);
        }
    </style>
</head>
<body>
    <div class="dashboard">
        <div class="header">
            <h1>WAVE PRE-LAUNCH STATUS DASHBOARD</h1>
            <div class="meta">
                <span>PROJECT: <strong>${project_name}</strong></span>
                <span>WAVE: <strong>${WAVE_NUMBER}</strong></span>
            </div>
        </div>
EOF

    # Gate -1
    render_html_phase "GATE -1: PRE-VALIDATION" "${GATE_STATUS[-1]}" \
        "Prompt files exist|${CHECK_RESULTS["gate-1_prompt_files"]:-PENDING}" \
        "Budget sufficient (\$${CHECK_RESULTS["gate-1_budget_available"]:-0.00})|${CHECK_RESULTS["gate-1_budget"]:-PENDING}" \
        "Worktrees clean|${CHECK_RESULTS["gate-1_worktrees"]:-PENDING}" \
        "No emergency stop|${CHECK_RESULTS["gate-1_emergency_stop"]:-PENDING}" \
        "Previous wave complete|${CHECK_RESULTS["gate-1_previous_wave"]:-PENDING}" \
        "API quotas available|${CHECK_RESULTS["gate-1_api_quotas"]:-PENDING}" \
        "Environment variables set|${CHECK_RESULTS["gate-1_environment"]:-PENDING}" \
        "Docker ready|${CHECK_RESULTS["gate-1_docker"]:-PENDING}"

    # Phase 0
    render_html_phase "PHASE 0: PRE-FLIGHT" "${PHASE_STATUS[0]}" \
        "Stories validated (${CHECK_RESULTS["phase0_stories_valid"]:-0}/${CHECK_RESULTS["phase0_stories_total"]:-0})|${CHECK_RESULTS["phase0_stories"]:-PENDING}" \
        "Gap analysis|${CHECK_RESULTS["phase0_gaps"]:-PENDING}" \
        "Wave planning|${CHECK_RESULTS["phase0_planning"]:-PENDING}" \
        "Green light|${CHECK_RESULTS["phase0_greenlight"]:-PENDING}"

    # Phase 1
    render_html_phase "PHASE 1: INFRASTRUCTURE" "${PHASE_STATUS[1]}" \
        "Slack|${CHECK_RESULTS["phase1_slack"]:-PENDING}" \
        "Supabase|${CHECK_RESULTS["phase1_supabase"]:-PENDING}" \
        "Docker|${CHECK_RESULTS["phase1_docker"]:-PENDING}" \
        "Dozzle|${CHECK_RESULTS["phase1_dozzle"]:-PENDING}" \
        "Worktree|${CHECK_RESULTS["phase1_worktree"]:-PENDING}" \
        "GitHub|${CHECK_RESULTS["phase1_github"]:-PENDING}" \
        "Vercel|${CHECK_RESULTS["phase1_vercel"]:-PENDING}" \
        "Neon|${CHECK_RESULTS["phase1_neon"]:-PENDING}" \
        "Claude API|${CHECK_RESULTS["phase1_claude"]:-PENDING}" \
        "Nano Banana|${CHECK_RESULTS["phase1_nano_banana"]:-PENDING}"

    # Phase 2
    render_html_phase "PHASE 2: SMOKE TEST" "${PHASE_STATUS[2]}" \
        "Build|${CHECK_RESULTS["phase2_build"]:-PENDING}" \
        "TypeCheck|${CHECK_RESULTS["phase2_typecheck"]:-PENDING}" \
        "Lint|${CHECK_RESULTS["phase2_lint"]:-PENDING}" \
        "Test|${CHECK_RESULTS["phase2_test"]:-PENDING}"

    # Phase 3
    render_html_phase "PHASE 3: DEVELOPMENT" "${PHASE_STATUS[3]}" \
        "FE-Dev signal|${CHECK_RESULTS["phase3_fe_signal"]:-PENDING}" \
        "BE-Dev signal|${CHECK_RESULTS["phase3_be_signal"]:-PENDING}"

    # Phase 4
    render_html_phase "PHASE 4: QA/MERGE" "${PHASE_STATUS[4]}" \
        "QA approval|${CHECK_RESULTS["phase4_qa_approval"]:-PENDING}" \
        "Merge to main|${CHECK_RESULTS["phase4_merge"]:-PENDING}"

    # Overall Status
    local ready_class
    [ "$READY_TO_LAUNCH" = "YES" ] && ready_class="ready-yes" || ready_class="ready-no"

    local cb_class
    [ "${CHECK_RESULTS["circuit_breaker"]}" = "CLOSED" ] && cb_class="ok" || cb_class="alert"

    local es_class
    [ "${CHECK_RESULTS["emergency_stop"]}" = "CLEAR" ] && es_class="ok" || es_class="alert"

    cat << EOF
        <div class="overall-status">
            <h2>LAUNCH STATUS</h2>
            <div class="overall-badge ${ready_class}">
                $([ "$READY_TO_LAUNCH" = "YES" ] && echo "✓ READY TO LAUNCH" || echo "✗ NOT READY")
            </div>
            $([ -n "$BLOCKED_AT" ] && echo "<div class=\"blocked-info\">Blocked at: ${BLOCKED_AT}</div>")
            <div class="circuit-breaker">
                <div class="cb-item">
                    <span class="cb-dot ${cb_class}"></span>
                    Circuit Breaker: ${CHECK_RESULTS["circuit_breaker"]}
                </div>
                <div class="cb-item">
                    <span class="cb-dot ${es_class}"></span>
                    Emergency Stop: ${CHECK_RESULTS["emergency_stop"]}
                </div>
            </div>
        </div>

        <div class="timestamp">
            Generated: ${timestamp} | Dashboard v${SCRIPT_VERSION}
        </div>
    </div>
</body>
</html>
EOF
}

render_html_phase() {
    local title=$1
    local status=$2
    shift 2

    local status_class
    case "$status" in
        PASS)    status_class="status-pass" ;;
        FAIL)    status_class="status-fail" ;;
        BLOCKED) status_class="status-blocked" ;;
        DRIFT)   status_class="status-drift" ;;
        *)       status_class="status-pending" ;;
    esac

    cat << EOF
        <div class="phase-card">
            <div class="phase-header">
                <span class="phase-title">${title}</span>
                <span class="phase-status ${status_class}">${status}</span>
            </div>
            <div class="checks-list">
EOF

    for check in "$@"; do
        local label="${check%%|*}"
        local check_status="${check#*|}"

        local icon_class icon_char
        case "$check_status" in
            PASS|GO)  icon_class="pass"; icon_char="✓" ;;
            FAIL)     icon_class="fail"; icon_char="✗" ;;
            BLOCKED)  icon_class="blocked"; icon_char="⊘" ;;
            *)        icon_class="pending"; icon_char="○" ;;
        esac

        cat << EOF
                <div class="check-item">
                    <span class="check-icon ${icon_class}">${icon_char}</span>
                    <span class="check-label">${label}</span>
                </div>
EOF
    done

    cat << EOF
            </div>
        </div>
EOF
}

# ─────────────────────────────────────────────────────────────────────────────
# RENDER JSON OUTPUT
# ─────────────────────────────────────────────────────────────────────────────
render_json() {
    local project_name
    project_name=$(basename "$PROJECT_PATH")
    local timestamp
    timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

    cat << EOF
{
    "dashboard_version": "$SCRIPT_VERSION",
    "generated_at": "$timestamp",
    "project": {
        "name": "$project_name",
        "path": "$PROJECT_PATH",
        "wave": $WAVE_NUMBER
    },
    "overall": {
        "status": "$OVERALL_STATUS",
        "ready_to_launch": $([ "$READY_TO_LAUNCH" = "YES" ] && echo "true" || echo "false"),
        "blocked_at": $([ -n "$BLOCKED_AT" ] && echo "\"$BLOCKED_AT\"" || echo "null")
    },
    "circuit_breaker": {
        "status": "${CHECK_RESULTS["circuit_breaker"]}",
        "reason": $([ -n "${CHECK_RESULTS["circuit_breaker_reason"]:-}" ] && echo "\"${CHECK_RESULTS["circuit_breaker_reason"]}\"" || echo "null")
    },
    "emergency_stop": {
        "status": "${CHECK_RESULTS["emergency_stop"]}",
        "reason": $([ -n "${CHECK_RESULTS["emergency_stop_reason"]:-}" ] && echo "\"${CHECK_RESULTS["emergency_stop_reason"]}\"" || echo "null")
    },
    "phases": {
        "gate_minus_1": {
            "name": "Pre-Validation",
            "status": "${GATE_STATUS[-1]}",
            "checks": {
                "prompt_files": "${CHECK_RESULTS["gate-1_prompt_files"]:-PENDING}",
                "budget": "${CHECK_RESULTS["gate-1_budget"]:-PENDING}",
                "budget_available": "${CHECK_RESULTS["gate-1_budget_available"]:-0.00}",
                "worktrees": "${CHECK_RESULTS["gate-1_worktrees"]:-PENDING}",
                "emergency_stop": "${CHECK_RESULTS["gate-1_emergency_stop"]:-PENDING}",
                "previous_wave": "${CHECK_RESULTS["gate-1_previous_wave"]:-PENDING}",
                "api_quotas": "${CHECK_RESULTS["gate-1_api_quotas"]:-PENDING}",
                "environment": "${CHECK_RESULTS["gate-1_environment"]:-PENDING}",
                "docker": "${CHECK_RESULTS["gate-1_docker"]:-PENDING}"
            }
        },
        "phase_0": {
            "name": "Pre-Flight",
            "status": "${PHASE_STATUS[0]}",
            "checks": {
                "stories": "${CHECK_RESULTS["phase0_stories"]:-PENDING}",
                "stories_total": ${CHECK_RESULTS["phase0_stories_total"]:-0},
                "stories_valid": ${CHECK_RESULTS["phase0_stories_valid"]:-0},
                "gaps": "${CHECK_RESULTS["phase0_gaps"]:-PENDING}",
                "planning": "${CHECK_RESULTS["phase0_planning"]:-PENDING}",
                "greenlight": "${CHECK_RESULTS["phase0_greenlight"]:-PENDING}"
            }
        },
        "phase_1": {
            "name": "Infrastructure",
            "status": "${PHASE_STATUS[1]}",
            "checks": {
                "slack": "${CHECK_RESULTS["phase1_slack"]:-PENDING}",
                "supabase": "${CHECK_RESULTS["phase1_supabase"]:-PENDING}",
                "docker": "${CHECK_RESULTS["phase1_docker"]:-PENDING}",
                "dozzle": "${CHECK_RESULTS["phase1_dozzle"]:-PENDING}",
                "worktree": "${CHECK_RESULTS["phase1_worktree"]:-PENDING}",
                "github": "${CHECK_RESULTS["phase1_github"]:-PENDING}",
                "vercel": "${CHECK_RESULTS["phase1_vercel"]:-PENDING}",
                "neon": "${CHECK_RESULTS["phase1_neon"]:-PENDING}",
                "claude": "${CHECK_RESULTS["phase1_claude"]:-PENDING}",
                "nano_banana": "${CHECK_RESULTS["phase1_nano_banana"]:-PENDING}"
            }
        },
        "phase_2": {
            "name": "Smoke Test",
            "status": "${PHASE_STATUS[2]}",
            "checks": {
                "build": "${CHECK_RESULTS["phase2_build"]:-PENDING}",
                "typecheck": "${CHECK_RESULTS["phase2_typecheck"]:-PENDING}",
                "lint": "${CHECK_RESULTS["phase2_lint"]:-PENDING}",
                "test": "${CHECK_RESULTS["phase2_test"]:-PENDING}"
            }
        },
        "phase_3": {
            "name": "Development",
            "status": "${PHASE_STATUS[3]}",
            "checks": {
                "fe_signal": "${CHECK_RESULTS["phase3_fe_signal"]:-PENDING}",
                "be_signal": "${CHECK_RESULTS["phase3_be_signal"]:-PENDING}"
            }
        },
        "phase_4": {
            "name": "QA/Merge",
            "status": "${PHASE_STATUS[4]}",
            "checks": {
                "qa_approval": "${CHECK_RESULTS["phase4_qa_approval"]:-PENDING}",
                "merge": "${CHECK_RESULTS["phase4_merge"]:-PENDING}"
            }
        }
    }
}
EOF
}

# ─────────────────────────────────────────────────────────────────────────────
# ARGUMENT PARSING
# ─────────────────────────────────────────────────────────────────────────────
PROJECT_PATH=""
WAVE_NUMBER=""
OUTPUT_FORMAT="terminal"
OUTPUT_FILE=""
NO_COLOR=false

while [[ $# -gt 0 ]]; do
    case $1 in
        -p|--project)
            PROJECT_PATH="$2"
            shift 2
            ;;
        -w|--wave)
            WAVE_NUMBER="$2"
            shift 2
            ;;
        -f|--format)
            OUTPUT_FORMAT="$2"
            shift 2
            ;;
        -o|--output)
            OUTPUT_FILE="$2"
            shift 2
            ;;
        --no-color)
            NO_COLOR=true
            shift
            ;;
        -h|--help)
            show_usage
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            show_usage
            exit 2
            ;;
    esac
done

# ─────────────────────────────────────────────────────────────────────────────
# VALIDATION
# ─────────────────────────────────────────────────────────────────────────────
if [ -z "$PROJECT_PATH" ] || [ -z "$WAVE_NUMBER" ]; then
    echo "Error: --project and --wave are required"
    show_usage
    exit 2
fi

if [ ! -d "$PROJECT_PATH" ]; then
    echo "Error: Project directory not found: $PROJECT_PATH"
    exit 2
fi

PROJECT_PATH="$(cd "$PROJECT_PATH" && pwd)"

if [ "$NO_COLOR" = "true" ]; then
    RED=''
    GREEN=''
    YELLOW=''
    BLUE=''
    CYAN=''
    MAGENTA=''
    BOLD=''
    DIM=''
    NC=''
fi

# ─────────────────────────────────────────────────────────────────────────────
# MAIN EXECUTION
# ─────────────────────────────────────────────────────────────────────────────

# Run all checks (in order of importance)
check_credentials      # API keys and .env
check_system           # Node, pnpm, git, docker
check_project_files    # package.json, CLAUDE.md, stories
check_network          # Connectivity to APIs
check_circuit_breaker  # Emergency stop, circuit breaker
check_gate_minus1      # Pre-validation lock
check_phase0           # Pre-flight lock
check_phase1           # Infrastructure lock
check_phase2           # Smoke test lock
check_phase3           # Development lock
check_phase4           # QA/Merge lock
calculate_overall_status

# Render output
output=""
case "$OUTPUT_FORMAT" in
    terminal)
        output=$(render_terminal)
        ;;
    html)
        output=$(render_html)
        ;;
    json)
        output=$(render_json)
        ;;
    *)
        echo "Error: Unknown format: $OUTPUT_FORMAT"
        exit 2
        ;;
esac

# Write output
if [ -n "$OUTPUT_FILE" ]; then
    echo "$output" > "$OUTPUT_FILE"
    echo "Dashboard written to: $OUTPUT_FILE"
else
    echo "$output"
fi

# Exit with status based on readiness
if [ "$READY_TO_LAUNCH" = "YES" ]; then
    exit 0
else
    exit 1
fi
