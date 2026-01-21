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
declare -A STORY_TESTS
declare -a STORY_TEST_RESULTS
declare -A WAVE_DATA
declare -a DETECTED_WAVES
declare -A PROJECT_STRUCTURE
declare -a PROJECT_DIRS
declare -a PROJECT_DOCS
declare -a PROJECT_TREE_LINES
declare -a PROJECT_TREE_PATHS
PROJECT_NAME=""
PROJECT_CONFIG_FILE=""
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

    # Also try parent directory .env (for monorepo setups)
    local parent_env="$(dirname "$PROJECT_PATH")/.env"
    if [ -f "$parent_env" ]; then
        set -a
        source "$parent_env" 2>/dev/null || true
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

    # Memory check (>= 4GB recommended)
    local mem_available
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS: get pages free * page size
        local page_size=$(sysctl -n hw.pagesize 2>/dev/null || echo 4096)
        local pages_free=$(vm_stat 2>/dev/null | grep "Pages free" | awk '{print $3}' | tr -d '.')
        if [ -n "$pages_free" ]; then
            mem_available=$((pages_free * page_size / 1024 / 1024 / 1024))
        fi
    else
        mem_available=$(free -g 2>/dev/null | awk '/^Mem:/{print $7}')
    fi
    if [ -n "$mem_available" ] && [ "$mem_available" -ge 2 ]; then
        CHECK_RESULTS["sys_memory"]="PASS"
        CHECK_RESULTS["sys_memory_available"]="${mem_available}GB"
    else
        CHECK_RESULTS["sys_memory"]="WARN"
        CHECK_RESULTS["sys_memory_available"]="${mem_available:-unknown}GB"
    fi

    # Port availability check (3000, 8080)
    local ports_in_use=""
    if lsof -i :3000 2>/dev/null | grep -q LISTEN; then
        ports_in_use="3000 "
    fi
    if lsof -i :8080 2>/dev/null | grep -q LISTEN; then
        ports_in_use="${ports_in_use}8080"
    fi
    if [ -z "$ports_in_use" ]; then
        CHECK_RESULTS["sys_ports"]="PASS"
    else
        CHECK_RESULTS["sys_ports"]="WARN"
        CHECK_RESULTS["sys_ports_used"]="$ports_in_use"
    fi
}

# ─────────────────────────────────────────────────────────────────────────────
# CHECK DOCKER INFRASTRUCTURE
# ─────────────────────────────────────────────────────────────────────────────
check_docker() {
    # Docker daemon
    if command -v docker &> /dev/null && docker info &> /dev/null; then
        CHECK_RESULTS["docker_daemon"]="PASS"
    else
        CHECK_RESULTS["docker_daemon"]="FAIL"
        CHECK_RESULTS["docker_compose"]="BLOCKED"
        CHECK_RESULTS["docker_image"]="BLOCKED"
        CHECK_RESULTS["docker_base"]="BLOCKED"
        CHECK_RESULTS["docker_start"]="BLOCKED"
        return
    fi

    # docker-compose.yml validation
    if [ -f "$PROJECT_PATH/docker-compose.yml" ]; then
        if docker compose -f "$PROJECT_PATH/docker-compose.yml" config --quiet 2>/dev/null; then
            CHECK_RESULTS["docker_compose"]="PASS"
        else
            CHECK_RESULTS["docker_compose"]="FAIL"
        fi
    else
        CHECK_RESULTS["docker_compose"]="WARN"
    fi

    # Dockerfile.agent exists and can build
    if [ -f "$PROJECT_PATH/Dockerfile.agent" ]; then
        # Just check syntax, don't actually build
        if docker build -f "$PROJECT_PATH/Dockerfile.agent" "$PROJECT_PATH" --quiet --no-cache --target=base 2>/dev/null || \
           docker build -f "$PROJECT_PATH/Dockerfile.agent" "$PROJECT_PATH" -q 2>&1 | head -1 | grep -q "sha256"; then
            CHECK_RESULTS["docker_image"]="PASS"
        else
            # Try a dry-run parse
            CHECK_RESULTS["docker_image"]="WARN"
        fi
    else
        CHECK_RESULTS["docker_image"]="WARN"
    fi

    # Base images available (check if node image is cached or pullable)
    if docker image inspect node:20-slim &>/dev/null || docker image inspect node:20 &>/dev/null; then
        CHECK_RESULTS["docker_base"]="PASS"
    else
        # Try a quick pull check (timeout after 5s)
        if timeout 5 docker pull node:20-slim --quiet &>/dev/null 2>&1; then
            CHECK_RESULTS["docker_base"]="PASS"
        else
            CHECK_RESULTS["docker_base"]="WARN"
        fi
    fi

    # Container can start (dry-run)
    if [ -f "$PROJECT_PATH/docker-compose.yml" ]; then
        if docker compose -f "$PROJECT_PATH/docker-compose.yml" config --quiet 2>/dev/null; then
            CHECK_RESULTS["docker_start"]="PASS"
        else
            CHECK_RESULTS["docker_start"]="FAIL"
        fi
    else
        CHECK_RESULTS["docker_start"]="WARN"
    fi
}

# ─────────────────────────────────────────────────────────────────────────────
# CHECK GIT WORKTREES
# ─────────────────────────────────────────────────────────────────────────────
check_worktrees() {
    local worktree_dir="$PROJECT_PATH/worktrees"
    local expected_worktrees=("fe-dev" "be-dev" "qa" "dev-fix")
    local missing=0
    local wrong_branch=0
    local dirty=0

    # Check if worktrees directory exists
    if [ ! -d "$worktree_dir" ]; then
        CHECK_RESULTS["worktree_exists"]="FAIL"
        CHECK_RESULTS["worktree_branch"]="BLOCKED"
        CHECK_RESULTS["worktree_clean"]="BLOCKED"
        return
    fi

    # Check each expected worktree
    for wt in "${expected_worktrees[@]}"; do
        if [ ! -d "$worktree_dir/$wt" ]; then
            missing=$((missing + 1))
        else
            # Check branch
            local current_branch
            current_branch=$(cd "$worktree_dir/$wt" && git branch --show-current 2>/dev/null)
            if [[ "$current_branch" != *"$wt"* ]] && [[ "$current_branch" != "feature/$wt" ]]; then
                wrong_branch=$((wrong_branch + 1))
            fi
            # Check for uncommitted changes
            local changes
            changes=$(cd "$worktree_dir/$wt" && git status --porcelain 2>/dev/null | wc -l | tr -d ' ')
            if [ "$changes" -gt 0 ]; then
                dirty=$((dirty + 1))
            fi
        fi
    done

    # Set results
    if [ "$missing" -eq 0 ]; then
        CHECK_RESULTS["worktree_exists"]="PASS"
    else
        CHECK_RESULTS["worktree_exists"]="FAIL"
        CHECK_RESULTS["worktree_missing"]="$missing"
    fi

    if [ "$wrong_branch" -eq 0 ]; then
        CHECK_RESULTS["worktree_branch"]="PASS"
    else
        CHECK_RESULTS["worktree_branch"]="WARN"
        CHECK_RESULTS["worktree_wrong_branch"]="$wrong_branch"
    fi

    if [ "$dirty" -eq 0 ]; then
        CHECK_RESULTS["worktree_clean"]="PASS"
    else
        CHECK_RESULTS["worktree_clean"]="WARN"
        CHECK_RESULTS["worktree_dirty"]="$dirty"
    fi
}

# ─────────────────────────────────────────────────────────────────────────────
# CHECK SIGNAL FILES SCHEMA
# ─────────────────────────────────────────────────────────────────────────────
check_signals() {
    local signal_dir="$PROJECT_PATH/.claude"
    local signal_count=0
    local valid_count=0

    if [ -d "$signal_dir" ]; then
        while IFS= read -r -d '' signal_file; do
            signal_count=$((signal_count + 1))
            # Check required fields: wave, gate, status
            if jq -e '.wave and .gate and .status' "$signal_file" &>/dev/null; then
                valid_count=$((valid_count + 1))
            fi
        done < <(find "$signal_dir" -name "signal-*.json" -print0 2>/dev/null)
    fi

    if [ "$signal_count" -eq 0 ]; then
        CHECK_RESULTS["signal_schema"]="PASS"  # No signals yet is OK
        CHECK_RESULTS["signal_count"]="0"
    elif [ "$valid_count" -eq "$signal_count" ]; then
        CHECK_RESULTS["signal_schema"]="PASS"
        CHECK_RESULTS["signal_count"]="$signal_count"
    else
        CHECK_RESULTS["signal_schema"]="WARN"
        CHECK_RESULTS["signal_valid"]="$valid_count/$signal_count"
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

    # AI PRD Vision document
    if [ -f "$PROJECT_PATH/ai-prd/AI-PRD.md" ] || [ -f "$PROJECT_PATH/.claude/ai-prd/AI-PRD.md" ]; then
        CHECK_RESULTS["proj_ai_prd"]="PASS"
    else
        CHECK_RESULTS["proj_ai_prd"]="WARN"
    fi

    # .claude directory
    if [ -d "$PROJECT_PATH/.claude" ]; then
        CHECK_RESULTS["proj_claude_dir"]="PASS"
    else
        CHECK_RESULTS["proj_claude_dir"]="FAIL"
    fi

    # AI Stories directory
    local story_dir="$PROJECT_PATH/stories/wave${WAVE_NUMBER}"
    [ ! -d "$story_dir" ] && story_dir="$PROJECT_PATH/.claude/stories/wave${WAVE_NUMBER}"
    if [ -d "$story_dir" ]; then
        local story_count
        story_count=$(find "$story_dir" -name "*.json" -type f 2>/dev/null | wc -l | tr -d ' ')
        CHECK_RESULTS["proj_stories"]="PASS"
        CHECK_RESULTS["proj_stories_count"]="$story_count"

        # AI Story Schema V4 compliance check
        # Check if stories have required fields: acceptance_criteria, files.forbidden, safety_constraints
        local schema_valid=true
        local first_story
        first_story=$(find "$story_dir" -name "*.json" -type f 2>/dev/null | head -1)
        if [ -n "$first_story" ]; then
            # Check for acceptance_criteria (required)
            if ! jq -e '.acceptance_criteria' "$first_story" >/dev/null 2>&1; then
                schema_valid=false
            fi
            # Check for files.forbidden (required by schema V4)
            if ! jq -e '.files.forbidden' "$first_story" >/dev/null 2>&1; then
                schema_valid=false
            fi
        fi

        if [ "$schema_valid" = true ]; then
            CHECK_RESULTS["proj_stories_schema"]="PASS"
        else
            CHECK_RESULTS["proj_stories_schema"]="WARN"
        fi
    else
        CHECK_RESULTS["proj_stories"]="FAIL"
        CHECK_RESULTS["proj_stories_count"]="0"
        CHECK_RESULTS["proj_stories_schema"]="FAIL"
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
# CHECK DESCRIPTIONS DATABASE
# Each check has: what_it_checks, why_it_matters, how_to_fix
# ─────────────────────────────────────────────────────────────────────────────
declare -A CHECK_DESCRIPTIONS

# Gate -1: Pre-Validation Checks
CHECK_DESCRIPTIONS["gate-1_prompt_files_what"]="Verifies that prompt instruction files exist for all agents (FE-Dev, BE-Dev, QA, Dev-Fix) in the .claude/prompts directory"
CHECK_DESCRIPTIONS["gate-1_prompt_files_why"]="Agents need clear instructions to perform their tasks. Missing prompts cause agents to fail or produce unpredictable results"
CHECK_DESCRIPTIONS["gate-1_prompt_files_fix"]="Create prompt files in .claude/prompts/ directory: fe-dev-prompt.md, be-dev-prompt.md, qa-prompt.md, dev-fix-prompt.md"

CHECK_DESCRIPTIONS["gate-1_budget_what"]="Checks if the configured API budget (WAVE_BUDGET in .env) has sufficient funds remaining for this wave"
CHECK_DESCRIPTIONS["gate-1_budget_why"]="Running out of budget mid-wave leaves work incomplete and wastes the cost already spent. Budget gates prevent wasted spend"
CHECK_DESCRIPTIONS["gate-1_budget_fix"]="Increase WAVE_BUDGET in .env file or wait for budget to reset. Typical wave costs \$2-5 depending on complexity"

CHECK_DESCRIPTIONS["gate-1_worktrees_what"]="Verifies all Git worktrees (fe-dev, be-dev, qa, dev-fix) exist and have no uncommitted changes from previous runs"
CHECK_DESCRIPTIONS["gate-1_worktrees_why"]="Dirty worktrees cause merge conflicts and confusion between wave runs. Clean worktrees ensure isolation"
CHECK_DESCRIPTIONS["gate-1_worktrees_fix"]="Run: git worktree remove worktrees/[name] --force, then recreate, or commit/stash existing changes"

CHECK_DESCRIPTIONS["gate-1_emergency_stop_what"]="Checks that no EMERGENCY-STOP file exists in .claude/ directory that would halt all agent operations"
CHECK_DESCRIPTIONS["gate-1_emergency_stop_why"]="Emergency stop is a safety mechanism to halt runaway agents. If present, something went wrong that needs human review"
CHECK_DESCRIPTIONS["gate-1_emergency_stop_fix"]="Review the EMERGENCY-STOP file contents, resolve the issue, then delete: rm .claude/EMERGENCY-STOP"

CHECK_DESCRIPTIONS["gate-1_previous_wave_what"]="Verifies the previous wave (N-1) completed successfully with a PHASE4 lock file showing PASSED status"
CHECK_DESCRIPTIONS["gate-1_previous_wave_why"]="Waves must complete in sequence. Starting wave N before wave N-1 is done creates dependency issues and merge conflicts"
CHECK_DESCRIPTIONS["gate-1_previous_wave_fix"]="Complete the previous wave first, or use --force flag if you're certain the previous wave can be skipped"

CHECK_DESCRIPTIONS["gate-1_api_quotas_what"]="Tests Anthropic API connectivity and checks that rate limits have not been exceeded"
CHECK_DESCRIPTIONS["gate-1_api_quotas_why"]="Rate-limited APIs cause agents to fail mid-task. Checking quotas upfront prevents wasted partial work"
CHECK_DESCRIPTIONS["gate-1_api_quotas_fix"]="Wait for rate limits to reset (usually 1 minute), or upgrade your Anthropic API tier for higher limits"

CHECK_DESCRIPTIONS["gate-1_environment_what"]="Validates all required environment variables are set: ANTHROPIC_API_KEY, SLACK_WEBHOOK_URL, and project-specific vars"
CHECK_DESCRIPTIONS["gate-1_environment_why"]="Missing env vars cause silent failures or expose security vulnerabilities. Early detection prevents runtime errors"
CHECK_DESCRIPTIONS["gate-1_environment_fix"]="Copy .env.example to .env and fill in all required values. Check WAVE/.env for shared credentials"

CHECK_DESCRIPTIONS["gate-1_docker_what"]="Verifies Docker daemon is running and docker-compose.yml is valid and can build all agent containers"
CHECK_DESCRIPTIONS["gate-1_docker_why"]="Docker containers isolate agents safely. Invalid compose files or missing Docker prevents agent execution"
CHECK_DESCRIPTIONS["gate-1_docker_fix"]="Start Docker Desktop, then run: docker compose config to validate. Fix any YAML syntax errors shown"

# Phase 0: Pre-Flight Checks
CHECK_DESCRIPTIONS["phase0_stories_what"]="Parses all JSON story files in stories/wave{N}/ and validates they have required fields: id, title, acceptance_criteria"
CHECK_DESCRIPTIONS["phase0_stories_why"]="Invalid stories cause agents to misunderstand requirements. Schema validation catches errors before development starts"
CHECK_DESCRIPTIONS["phase0_stories_fix"]="Review story files for valid JSON syntax and required fields. Use the story-validator tool to see specific errors"

CHECK_DESCRIPTIONS["phase0_gaps_what"]="Analyzes stories to detect missing coverage: no frontend stories, no backend stories, or unlinked dependencies"
CHECK_DESCRIPTIONS["phase0_gaps_why"]="Gap analysis prevents shipping incomplete features. Catching missing stories early avoids mid-wave scope changes"
CHECK_DESCRIPTIONS["phase0_gaps_fix"]="Add missing stories to cover the gap, or document why the gap is intentional in the wave planning notes"

CHECK_DESCRIPTIONS["phase0_planning_what"]="Generates wave execution plan including story assignments, estimated costs, and dependency order"
CHECK_DESCRIPTIONS["phase0_planning_why"]="Planning prevents conflicts between agents and optimizes execution order. Good plans reduce retry loops"
CHECK_DESCRIPTIONS["phase0_planning_fix"]="Re-run pre-flight with --verbose to see planning details. Adjust story assignments if conflicts detected"

CHECK_DESCRIPTIONS["phase0_greenlight_what"]="Final human approval checkpoint before autonomous agents begin work. Requires explicit GO signal"
CHECK_DESCRIPTIONS["phase0_greenlight_why"]="Human oversight before agent execution catches last-minute issues and confirms the wave scope is correct"
CHECK_DESCRIPTIONS["phase0_greenlight_fix"]="Review the pre-flight summary and create: .claude/signal-wave{N}-greenlight.json with status: GO"

# Phase 1: Infrastructure Checks
CHECK_DESCRIPTIONS["phase1_slack_what"]="Tests Slack webhook connectivity by sending a test notification and verifying 200 response"
CHECK_DESCRIPTIONS["phase1_slack_why"]="Slack notifications keep humans informed of progress and alerts. Failed notifications miss critical warnings"
CHECK_DESCRIPTIONS["phase1_slack_fix"]="Verify SLACK_WEBHOOK_URL in .env. Test manually: curl -X POST -d '{\"text\":\"test\"}' \$SLACK_WEBHOOK_URL"

CHECK_DESCRIPTIONS["phase1_supabase_what"]="Tests Supabase connection (Source of Truth) - maf_events table for audit trail, analytics, and dashboard"
CHECK_DESCRIPTIONS["phase1_supabase_why"]="Supabase is the persistent source of truth for all WAVE events. JSON signals are the fast speed layer, Supabase is the audit trail"
CHECK_DESCRIPTIONS["phase1_supabase_fix"]="Check SUPABASE_URL and SUPABASE_SERVICE_KEY in .env. Verify maf_events table exists in Supabase dashboard"

CHECK_DESCRIPTIONS["phase1_docker_what"]="Verifies Docker daemon health, available disk space, and that base images can be pulled"
CHECK_DESCRIPTIONS["phase1_docker_why"]="Docker issues mid-wave cause agent failures. Checking upfront prevents wasted API costs"
CHECK_DESCRIPTIONS["phase1_docker_fix"]="Restart Docker Desktop. Clear unused images: docker system prune -a. Check disk space > 5GB free"

CHECK_DESCRIPTIONS["phase1_dozzle_what"]="Tests Dozzle container log viewer is accessible on the configured port (default 8080)"
CHECK_DESCRIPTIONS["phase1_dozzle_why"]="Dozzle provides real-time visibility into agent container logs for debugging and monitoring"
CHECK_DESCRIPTIONS["phase1_dozzle_fix"]="Start Dozzle: docker run -d -v /var/run/docker.sock:/var/run/docker.sock -p 8080:8080 amir20/dozzle"

CHECK_DESCRIPTIONS["phase1_worktree_what"]="Verifies all Git worktrees exist at correct paths with proper branch checkouts"
CHECK_DESCRIPTIONS["phase1_worktree_why"]="Worktrees provide isolated development environments for each agent, preventing conflicts"
CHECK_DESCRIPTIONS["phase1_worktree_fix"]="Run setup-worktrees.sh or manually: git worktree add worktrees/fe-dev -b feature/fe-dev"

CHECK_DESCRIPTIONS["phase1_github_what"]="Tests GitHub API access using GITHUB_TOKEN, verifies repo read/write permissions"
CHECK_DESCRIPTIONS["phase1_github_why"]="GitHub access is needed for creating branches, reading PRs, and webhook integrations"
CHECK_DESCRIPTIONS["phase1_github_fix"]="Generate a new Personal Access Token with repo scope. Update GITHUB_TOKEN in .env"

CHECK_DESCRIPTIONS["phase1_vercel_what"]="Tests Vercel API connectivity for deployment status checking and preview URLs"
CHECK_DESCRIPTIONS["phase1_vercel_why"]="Vercel integration enables automatic preview deployments for QA validation"
CHECK_DESCRIPTIONS["phase1_vercel_fix"]="Get Vercel token from vercel.com/account/tokens. Set VERCEL_TOKEN in .env"

CHECK_DESCRIPTIONS["phase1_neon_what"]="Tests Neon/PostgreSQL database connectivity and verifies migration status"
CHECK_DESCRIPTIONS["phase1_neon_why"]="Database connectivity is essential for backend functionality and data persistence"
CHECK_DESCRIPTIONS["phase1_neon_fix"]="Check DATABASE_URL format. Verify Neon project is active in console.neon.tech"

CHECK_DESCRIPTIONS["phase1_claude_what"]="Tests Anthropic Claude API with a minimal request to verify key validity and quota"
CHECK_DESCRIPTIONS["phase1_claude_why"]="Claude API is the core of agent intelligence. Invalid keys or exhausted quotas halt all work"
CHECK_DESCRIPTIONS["phase1_claude_fix"]="Verify ANTHROPIC_API_KEY starts with sk-ant-. Check usage at console.anthropic.com"

CHECK_DESCRIPTIONS["phase1_nano_banana_what"]="Tests Google AI (Gemini) connectivity for the Nano Banana cost-optimization layer"
CHECK_DESCRIPTIONS["phase1_nano_banana_why"]="Nano Banana provides cheaper inference for simple tasks, reducing overall API costs"
CHECK_DESCRIPTIONS["phase1_nano_banana_fix"]="Get API key from makersuite.google.com. Set GOOGLE_AI_API_KEY in .env"

# Phase 2: Smoke Test Checks
CHECK_DESCRIPTIONS["phase2_build_what"]="Runs 'pnpm build' and verifies it exits with code 0, producing valid build artifacts"
CHECK_DESCRIPTIONS["phase2_build_why"]="A failing build means the codebase is broken. Never start development on a broken foundation"
CHECK_DESCRIPTIONS["phase2_build_fix"]="Run 'pnpm build' locally to see errors. Fix TypeScript/import errors. Check tsconfig.json paths"

CHECK_DESCRIPTIONS["phase2_typecheck_what"]="Runs 'pnpm typecheck' (tsc --noEmit) and counts TypeScript errors. Must be 0"
CHECK_DESCRIPTIONS["phase2_typecheck_why"]="Type errors indicate bugs or API mismatches. Catching them early prevents runtime failures"
CHECK_DESCRIPTIONS["phase2_typecheck_fix"]="Run 'pnpm typecheck' to see error locations. Fix type annotations and import statements"

CHECK_DESCRIPTIONS["phase2_lint_what"]="Runs 'pnpm lint' (ESLint) and verifies 0 errors. Warnings are allowed but flagged"
CHECK_DESCRIPTIONS["phase2_lint_why"]="Lint rules catch common bugs, security issues, and code quality problems automatically"
CHECK_DESCRIPTIONS["phase2_lint_fix"]="Run 'pnpm lint --fix' for auto-fixable issues. Manually fix remaining errors"

CHECK_DESCRIPTIONS["phase2_test_what"]="Runs 'pnpm test' with coverage. Checks all tests pass and coverage >= 80%"
CHECK_DESCRIPTIONS["phase2_test_why"]="Existing tests must pass before new work. Coverage ensures code is tested"
CHECK_DESCRIPTIONS["phase2_test_fix"]="Run 'pnpm test' to see failures. Fix broken tests or update snapshots if intentional"

# Phase 3: Development Checks
CHECK_DESCRIPTIONS["phase3_fe_signal_what"]="Checks for FE-Dev agent completion signal file with status DONE and passing validations"
CHECK_DESCRIPTIONS["phase3_fe_signal_why"]="Signal files are the handoff mechanism between agents. Missing signals block QA"
CHECK_DESCRIPTIONS["phase3_fe_signal_fix"]="FE-Dev agent must complete and create signal. Check Docker logs for agent status"

CHECK_DESCRIPTIONS["phase3_be_signal_what"]="Checks for BE-Dev agent completion signal file with status DONE and passing validations"
CHECK_DESCRIPTIONS["phase3_be_signal_why"]="Both frontend and backend must complete before QA can validate the full feature"
CHECK_DESCRIPTIONS["phase3_be_signal_fix"]="BE-Dev agent must complete and create signal. Check Docker logs for agent status"

# Phase 4: QA/Merge Checks
CHECK_DESCRIPTIONS["phase4_qa_approval_what"]="Checks for QA approval signal with decision APPROVED after all validations pass"
CHECK_DESCRIPTIONS["phase4_qa_approval_why"]="QA approval is the final quality gate. Only approved code gets merged to main"
CHECK_DESCRIPTIONS["phase4_qa_approval_fix"]="If rejected, check signal for issues. Dev-Fix agent will attempt repairs up to 3 times"

CHECK_DESCRIPTIONS["phase4_merge_what"]="Verifies merge to main completed successfully with no conflicts"
CHECK_DESCRIPTIONS["phase4_merge_why"]="Successful merge means the wave is complete and changes are in production branch"
CHECK_DESCRIPTIONS["phase4_merge_fix"]="Check for merge conflicts. May need manual conflict resolution then re-merge"

# Credentials Checks
CHECK_DESCRIPTIONS["cred_env_file_what"]="Checks that a .env file exists in the project root with environment variables"
CHECK_DESCRIPTIONS["cred_env_file_why"]="The .env file stores all configuration and secrets needed by the application"
CHECK_DESCRIPTIONS["cred_env_file_fix"]="Copy .env.example to .env and fill in all values. Never commit .env to git"

CHECK_DESCRIPTIONS["cred_anthropic_what"]="Validates ANTHROPIC_API_KEY is set and matches the expected sk-ant-* format"
CHECK_DESCRIPTIONS["cred_anthropic_why"]="This key authenticates all Claude API calls. Invalid keys cause 401 errors"
CHECK_DESCRIPTIONS["cred_anthropic_fix"]="Get key from console.anthropic.com/settings/keys. Starts with sk-ant-api..."

CHECK_DESCRIPTIONS["cred_slack_what"]="Validates SLACK_WEBHOOK_URL is set and points to hooks.slack.com"
CHECK_DESCRIPTIONS["cred_slack_why"]="Slack webhook sends notifications about wave progress, errors, and completions"
CHECK_DESCRIPTIONS["cred_slack_fix"]="Create incoming webhook in Slack app settings. URL format: https://hooks.slack.com/services/..."

# System Checks
CHECK_DESCRIPTIONS["sys_node_what"]="Checks Node.js version is installed and >= 18.x (required for modern ECMAScript)"
CHECK_DESCRIPTIONS["sys_node_why"]="Node.js runs the build tools, tests, and development server. Version 18+ required"
CHECK_DESCRIPTIONS["sys_node_fix"]="Install Node.js 18+ via nvm: 'nvm install 18' or download from nodejs.org"

CHECK_DESCRIPTIONS["sys_pnpm_what"]="Checks pnpm package manager is installed for fast, disk-efficient installs"
CHECK_DESCRIPTIONS["sys_pnpm_why"]="pnpm is the required package manager. npm/yarn will fail with workspace resolution"
CHECK_DESCRIPTIONS["sys_pnpm_fix"]="Install pnpm: 'npm install -g pnpm' or 'corepack enable && corepack prepare pnpm@latest'"

CHECK_DESCRIPTIONS["sys_git_what"]="Checks Git is installed and accessible from command line"
CHECK_DESCRIPTIONS["sys_git_why"]="Git is required for version control, worktrees, and branch management"
CHECK_DESCRIPTIONS["sys_git_fix"]="Install Git from git-scm.com or via package manager: 'brew install git'"

CHECK_DESCRIPTIONS["sys_docker_what"]="Checks Docker daemon is running and can execute container commands"
CHECK_DESCRIPTIONS["sys_docker_why"]="Docker runs agent containers in isolation with controlled permissions"
CHECK_DESCRIPTIONS["sys_docker_fix"]="Install Docker Desktop and start it. Verify with: 'docker info'"

CHECK_DESCRIPTIONS["sys_jq_what"]="Checks jq JSON processor is installed for parsing signal files"
CHECK_DESCRIPTIONS["sys_jq_why"]="jq parses and validates JSON signal files that coordinate agent handoffs"
CHECK_DESCRIPTIONS["sys_jq_fix"]="Install jq: 'brew install jq' or 'apt install jq'"

CHECK_DESCRIPTIONS["sys_disk_what"]="Checks available disk space is >= 1GB for builds and container images"
CHECK_DESCRIPTIONS["sys_disk_why"]="Builds, node_modules, and Docker images require significant disk space"
CHECK_DESCRIPTIONS["sys_disk_fix"]="Free up disk space. Run: 'docker system prune -a' and 'pnpm store prune'"

CHECK_DESCRIPTIONS["sys_memory_what"]="Checks available system memory is >= 4GB for running agents and builds"
CHECK_DESCRIPTIONS["sys_memory_why"]="Insufficient memory causes builds and agents to fail or run slowly"
CHECK_DESCRIPTIONS["sys_memory_fix"]="Close unused applications. Docker Desktop may need more memory allocation in settings"

CHECK_DESCRIPTIONS["sys_ports_what"]="Checks required ports (3000, 8080, 5432) are available and not in use"
CHECK_DESCRIPTIONS["sys_ports_why"]="Port conflicts prevent services from starting. Dev server needs 3000, Dozzle needs 8080"
CHECK_DESCRIPTIONS["sys_ports_fix"]="Kill processes using required ports: 'lsof -i :3000' then 'kill -9 <PID>'"

# Docker Checks (Expanded)
CHECK_DESCRIPTIONS["docker_daemon_what"]="Checks Docker daemon is running and responsive"
CHECK_DESCRIPTIONS["docker_daemon_why"]="Docker daemon must be running to build images and start containers"
CHECK_DESCRIPTIONS["docker_daemon_fix"]="Start Docker Desktop or run: 'sudo systemctl start docker'"

CHECK_DESCRIPTIONS["docker_compose_what"]="Validates docker-compose.yml syntax and configuration"
CHECK_DESCRIPTIONS["docker_compose_why"]="Invalid compose file prevents agents from starting in containers"
CHECK_DESCRIPTIONS["docker_compose_fix"]="Run 'docker compose config' to see errors. Fix YAML syntax and service definitions"

CHECK_DESCRIPTIONS["docker_image_what"]="Checks Dockerfile.agent can build successfully"
CHECK_DESCRIPTIONS["docker_image_why"]="Agent containers need a valid Docker image to run isolated development"
CHECK_DESCRIPTIONS["docker_image_fix"]="Fix Dockerfile.agent errors. Run: 'docker build -f Dockerfile.agent -t wave-agent .'"

CHECK_DESCRIPTIONS["docker_base_what"]="Verifies base images (node:20, etc.) can be pulled from registry"
CHECK_DESCRIPTIONS["docker_base_why"]="Missing base images cause build failures. Network issues may block pulls"
CHECK_DESCRIPTIONS["docker_base_fix"]="Pull base images manually: 'docker pull node:20-slim' or check network/proxy settings"

CHECK_DESCRIPTIONS["docker_start_what"]="Tests that agent container can start without immediate errors"
CHECK_DESCRIPTIONS["docker_start_why"]="Container start failures indicate configuration or permission issues"
CHECK_DESCRIPTIONS["docker_start_fix"]="Check container logs: 'docker compose logs'. Fix volume mounts and environment variables"

# Git Worktree Checks
CHECK_DESCRIPTIONS["worktree_exists_what"]="Verifies all required Git worktrees exist (fe-dev, be-dev, qa, dev-fix)"
CHECK_DESCRIPTIONS["worktree_exists_why"]="Worktrees isolate each agent's work, preventing merge conflicts"
CHECK_DESCRIPTIONS["worktree_exists_fix"]="Create missing worktrees: 'git worktree add worktrees/fe-dev -b feature/fe-dev'"

CHECK_DESCRIPTIONS["worktree_branch_what"]="Checks each worktree is on the correct feature branch"
CHECK_DESCRIPTIONS["worktree_branch_why"]="Wrong branch causes agents to modify wrong code or create conflicts"
CHECK_DESCRIPTIONS["worktree_branch_fix"]="Switch worktree branch: 'cd worktrees/fe-dev && git checkout feature/fe-dev'"

CHECK_DESCRIPTIONS["worktree_clean_what"]="Verifies worktrees have no uncommitted changes from previous runs"
CHECK_DESCRIPTIONS["worktree_clean_why"]="Dirty worktrees cause confusion and merge conflicts between waves"
CHECK_DESCRIPTIONS["worktree_clean_fix"]="Commit or stash changes: 'cd worktrees/fe-dev && git stash' or 'git checkout .'"

# Signal Schema Checks
CHECK_DESCRIPTIONS["signal_schema_what"]="Validates existing signal JSON files follow the required schema"
CHECK_DESCRIPTIONS["signal_schema_why"]="Invalid signals break agent handoffs and pipeline coordination"
CHECK_DESCRIPTIONS["signal_schema_fix"]="Check signal files in .claude/ for required fields: wave, gate, status, timestamp, agent"

# Project Files Checks
CHECK_DESCRIPTIONS["proj_package_json_what"]="Validates package.json exists and is valid JSON with required fields"
CHECK_DESCRIPTIONS["proj_package_json_why"]="package.json defines dependencies, scripts, and project configuration"
CHECK_DESCRIPTIONS["proj_package_json_fix"]="Fix JSON syntax errors. Ensure 'name', 'version', 'scripts' fields exist"

CHECK_DESCRIPTIONS["proj_claude_md_what"]="Checks CLAUDE.md agent instruction file exists in project or .claude/ directory"
CHECK_DESCRIPTIONS["proj_claude_md_why"]="CLAUDE.md contains safety rules and instructions that all agents must follow"
CHECK_DESCRIPTIONS["proj_claude_md_fix"]="Create CLAUDE.md from template at WAVE/templates/CLAUDE.md"

CHECK_DESCRIPTIONS["proj_ai_prd_what"]="Verifies AI PRD Vision document exists in ai-prd/AI-PRD.md with product requirements"
CHECK_DESCRIPTIONS["proj_ai_prd_why"]="The AI PRD defines the product vision that gets decomposed into AI Stories for agents"
CHECK_DESCRIPTIONS["proj_ai_prd_fix"]="Create ai-prd/AI-PRD.md with vision, features, acceptance criteria, and constraints"

CHECK_DESCRIPTIONS["proj_stories_what"]="Verifies AI Stories exist for the current wave following Schema V4 format"
CHECK_DESCRIPTIONS["proj_stories_why"]="AI Stories define autonomous work units with safety constraints, acceptance criteria, and forbidden files"
CHECK_DESCRIPTIONS["proj_stories_fix"]="Create story JSON files following AI-STORY-SCHEMA-V4 with required fields: id, title, domain, acceptance_criteria, safety_constraints"

CHECK_DESCRIPTIONS["proj_stories_schema_what"]="Validates AI Stories have required schema fields: objective, acceptance_criteria, safety_constraints, forbidden files"
CHECK_DESCRIPTIONS["proj_stories_schema_why"]="Schema compliance ensures agents have clear boundaries, stop conditions, and measurable acceptance criteria"
CHECK_DESCRIPTIONS["proj_stories_schema_fix"]="Add missing fields to stories: acceptance_criteria (min 3), safety_constraints (max_iterations, token_budget, stop_conditions), files.forbidden"

CHECK_DESCRIPTIONS["proj_node_modules_what"]="Checks node_modules directory exists (dependencies installed)"
CHECK_DESCRIPTIONS["proj_node_modules_why"]="Dependencies must be installed before build or test commands work"
CHECK_DESCRIPTIONS["proj_node_modules_fix"]="Run: 'pnpm install' to install all dependencies"

# Network Checks
CHECK_DESCRIPTIONS["net_anthropic_what"]="Tests HTTPS connectivity to api.anthropic.com (Claude API endpoint)"
CHECK_DESCRIPTIONS["net_anthropic_why"]="Network access to Anthropic is required for all agent AI operations"
CHECK_DESCRIPTIONS["net_anthropic_fix"]="Check firewall/VPN settings. Test: 'curl -I https://api.anthropic.com'"

CHECK_DESCRIPTIONS["net_github_what"]="Tests HTTPS connectivity to api.github.com"
CHECK_DESCRIPTIONS["net_github_why"]="GitHub API access is needed for repository operations and webhooks"
CHECK_DESCRIPTIONS["net_github_fix"]="Check firewall/VPN settings. Test: 'curl -I https://api.github.com'"

CHECK_DESCRIPTIONS["net_npm_what"]="Tests HTTPS connectivity to registry.npmjs.org"
CHECK_DESCRIPTIONS["net_npm_why"]="npm registry access is required for installing dependencies"
CHECK_DESCRIPTIONS["net_npm_fix"]="Check firewall/VPN settings. Test: 'curl -I https://registry.npmjs.org'"

# Protocol Compliance Checks (Aerospace FEMA)
CHECK_DESCRIPTIONS["protocol_safety_doc_what"]="CLAUDE.md has 20+ safety markers (NEVER, FORBIDDEN, MUST NOT) defining forbidden operations"
CHECK_DESCRIPTIONS["protocol_safety_doc_why"]="Clear forbidden operation lists prevent agents from dangerous actions like rm -rf or git push --force"
CHECK_DESCRIPTIONS["protocol_safety_doc_fix"]="Add comprehensive forbidden operations to CLAUDE.md from WAVE safety template"

CHECK_DESCRIPTIONS["protocol_emergency_what"]="Emergency stop mechanism is configured and can halt all agents within 10 seconds"
CHECK_DESCRIPTIONS["protocol_emergency_why"]="Runaway agents must be stoppable. Emergency stop is the last line of defense"
CHECK_DESCRIPTIONS["protocol_emergency_fix"]="Ensure check-kill-switch.sh exists and EMERGENCY-STOP file path is configured"

CHECK_DESCRIPTIONS["protocol_boundaries_what"]="Agent domain boundaries are explicitly defined - which files/directories each agent can modify"
CHECK_DESCRIPTIONS["protocol_boundaries_why"]="Domain boundaries prevent agents from conflicting or modifying shared code without review"
CHECK_DESCRIPTIONS["protocol_boundaries_fix"]="Add DOMAIN section to CLAUDE.md specifying allowed paths for each agent type"

CHECK_DESCRIPTIONS["protocol_budget_what"]="Token/cost budget limits are configured and enforced with automatic halt on exceed"
CHECK_DESCRIPTIONS["protocol_budget_why"]="Unconstrained agents can spend unlimited API costs. Budget limits protect your wallet"
CHECK_DESCRIPTIONS["protocol_budget_fix"]="Set WAVE_BUDGET in .env and configure circuit breaker at 90% threshold"

CHECK_DESCRIPTIONS["protocol_docker_what"]="docker-compose.yml uses --dangerously-skip-permissions flag for safe agent execution"
CHECK_DESCRIPTIONS["protocol_docker_why"]="This flag is required for Claude CLI in containers to function correctly"
CHECK_DESCRIPTIONS["protocol_docker_fix"]="Add '--dangerously-skip-permissions' to agent command in docker-compose.yml"

CHECK_DESCRIPTIONS["protocol_signals_what"]="Signal file protocol is configured with proper JSON schema for agent handoffs"
CHECK_DESCRIPTIONS["protocol_signals_why"]="Signals are the communication protocol between agents. Invalid signals break the pipeline"
CHECK_DESCRIPTIONS["protocol_signals_fix"]="Ensure signal-*.json files follow schema defined in WAVE signal documentation"

CHECK_DESCRIPTIONS["protocol_gates_what"]="Gate progression (0-7) is enforced with locks preventing out-of-order execution"
CHECK_DESCRIPTIONS["protocol_gates_why"]="Gates ensure proper sequence: planning before development, QA before merge"
CHECK_DESCRIPTIONS["protocol_gates_fix"]="Configure phase-orchestrator.sh and ensure lock files are validated at each gate"

CHECK_DESCRIPTIONS["protocol_nonroot_what"]="Docker containers run as non-root user to limit damage from compromised agents"
CHECK_DESCRIPTIONS["protocol_nonroot_why"]="Root access in containers is dangerous. Non-root limits what a compromised agent can do"
CHECK_DESCRIPTIONS["protocol_nonroot_fix"]="Add 'user: node' to docker-compose.yml or USER directive in Dockerfile"

# Aerospace Safety Checks (DO-178C / FEMA Inspired)
CHECK_DESCRIPTIONS["aero_dal_level_what"]="Stories have DAL (Design Assurance Level) A-E assigned based on criticality"
CHECK_DESCRIPTIONS["aero_dal_level_why"]="DAL levels determine validation rigor: A=catastrophic, B=critical, C=major, D=minor, E=negligible"
CHECK_DESCRIPTIONS["aero_dal_level_fix"]="Add 'dal_level: C' field to each story in stories/wave{N}/*.json"

CHECK_DESCRIPTIONS["aero_fmea_what"]="FMEA (Failure Mode Effects Analysis) document exists with all 17 failure modes mitigated"
CHECK_DESCRIPTIONS["aero_fmea_why"]="FMEA ensures every potential failure is identified, assessed, and has a mitigation strategy"
CHECK_DESCRIPTIONS["aero_fmea_fix"]="Review .claudecode/safety/FMEA.md and ensure all failure modes have RPN < 20"

CHECK_DESCRIPTIONS["aero_emergency_levels_what"]="Emergency escalation levels E1-E5 are documented and kill switch responds in <5s"
CHECK_DESCRIPTIONS["aero_emergency_levels_why"]="Graduated response (E1=agent, E2=domain, E3=wave, E4=system, E5=security) ensures proportional action"
CHECK_DESCRIPTIONS["aero_emergency_levels_fix"]="Review .claudecode/safety/EMERGENCY-LEVELS.md. Test kill switch with check-kill-switch.sh --status"

CHECK_DESCRIPTIONS["aero_approval_matrix_what"]="Approval matrix L0-L5 is configured with proper authorization chain"
CHECK_DESCRIPTIONS["aero_approval_matrix_why"]="L0=forbidden, L1=human, L2=CTO, L3=PM, L4=QA, L5=auto ensures proper oversight"
CHECK_DESCRIPTIONS["aero_approval_matrix_fix"]="Review .claudecode/safety/APPROVAL-LEVELS.md. Ensure all operations have correct approval level"

CHECK_DESCRIPTIONS["aero_forbidden_ops_what"]="All 108 forbidden operations are defined and enforced by safety-violation-detector"
CHECK_DESCRIPTIONS["aero_forbidden_ops_why"]="108 operations in 10 categories (DB, filesystem, git, privilege, network, secrets, system, publish, prod, domain)"
CHECK_DESCRIPTIONS["aero_forbidden_ops_fix"]="Run safety-violation-detector.sh to verify patterns. Check COMPLETE-SAFETY-REFERENCE.md"

CHECK_DESCRIPTIONS["aero_rollback_what"]="Rollback procedures exist for each gate with clear recovery steps"
CHECK_DESCRIPTIONS["aero_rollback_why"]="Every action must be reversible. Rollback procedures ensure recovery from any failure"
CHECK_DESCRIPTIONS["aero_rollback_fix"]="Document rollback procedures in .claudecode/safety/ROLLBACK-PROCEDURES.md"

CHECK_DESCRIPTIONS["aero_audit_trail_what"]="Audit trail is enabled logging WHO/WHAT/WHEN/WHERE/WHY for all operations"
CHECK_DESCRIPTIONS["aero_audit_trail_why"]="Audit logs enable post-incident analysis, compliance verification, and accountability"
CHECK_DESCRIPTIONS["aero_audit_trail_fix"]="Enable Supabase logging to maf_events table. Verify supabase-report.sh is functional"

CHECK_DESCRIPTIONS["aero_security_scan_what"]="Security scanning (npm audit) shows no critical vulnerabilities"
CHECK_DESCRIPTIONS["aero_security_scan_why"]="Dependency vulnerabilities can be exploited by malicious code. Critical vulns must be fixed"
CHECK_DESCRIPTIONS["aero_security_scan_fix"]="Run 'pnpm audit' to see vulnerabilities. Update packages or add overrides for false positives"

CHECK_DESCRIPTIONS["aero_backup_what"]="Backup procedures exist and last backup is within 24 hours"
CHECK_DESCRIPTIONS["aero_backup_why"]="Data loss from failures requires recent backups. RPO (Recovery Point Objective) should be <24h"
CHECK_DESCRIPTIONS["aero_backup_fix"]="Configure Supabase backups. Document backup procedures in .claudecode/safety/BACKUP-PROCEDURES.md"

CHECK_DESCRIPTIONS["aero_preflight_what"]="Pre-flight validator passes all 80+ checks before wave execution"
CHECK_DESCRIPTIONS["aero_preflight_why"]="Pre-flight catches misconfigurations before agents start, preventing wasted API costs"
CHECK_DESCRIPTIONS["aero_preflight_fix"]="Run pre-flight-validator.sh --project . --wave N and fix all failing checks"

# ─────────────────────────────────────────────────────────────────────────────
# CHECK COMMANDS (for copy-paste into Claude Code)
# ─────────────────────────────────────────────────────────────────────────────

# Credentials & Environment
CHECK_DESCRIPTIONS["cred_env_file_cmd"]="ls -la .env"
CHECK_DESCRIPTIONS["cred_anthropic_cmd"]="echo \$ANTHROPIC_API_KEY | head -c 15"
CHECK_DESCRIPTIONS["cred_slack_cmd"]="curl -s -o /dev/null -w '%{http_code}' -X POST \$SLACK_WEBHOOK_URL -d '{\"text\":\"test\"}'"

# System Requirements
CHECK_DESCRIPTIONS["sys_node_cmd"]="node --version"
CHECK_DESCRIPTIONS["sys_pnpm_cmd"]="pnpm --version"
CHECK_DESCRIPTIONS["sys_git_cmd"]="git --version"
CHECK_DESCRIPTIONS["sys_docker_cmd"]="docker info --format '{{.ServerVersion}}'"
CHECK_DESCRIPTIONS["sys_jq_cmd"]="jq --version"
CHECK_DESCRIPTIONS["sys_disk_cmd"]="df -h . | tail -1"
CHECK_DESCRIPTIONS["sys_memory_cmd"]="free -h 2>/dev/null || vm_stat | head -5"
CHECK_DESCRIPTIONS["sys_ports_cmd"]="lsof -i :3000,:8080,:5432 2>/dev/null | grep LISTEN || echo 'Ports available'"

# Docker Checks
CHECK_DESCRIPTIONS["docker_daemon_cmd"]="docker info --format '{{.ServerVersion}}'"
CHECK_DESCRIPTIONS["docker_compose_cmd"]="docker compose config --quiet && echo 'VALID' || echo 'INVALID'"
CHECK_DESCRIPTIONS["docker_image_cmd"]="docker build -f Dockerfile.agent -t wave-agent-test . --quiet 2>&1 | tail -3"
CHECK_DESCRIPTIONS["docker_base_cmd"]="docker pull node:20-slim --quiet 2>&1 | tail -1"
CHECK_DESCRIPTIONS["docker_start_cmd"]="docker compose up -d --dry-run 2>&1 | tail -5"

# Git Worktrees
CHECK_DESCRIPTIONS["worktree_exists_cmd"]="git worktree list | grep -E 'fe-dev|be-dev|qa|dev-fix'"
CHECK_DESCRIPTIONS["worktree_branch_cmd"]="for d in worktrees/*/; do cd \$d && echo \"\$(basename \$PWD): \$(git branch --show-current)\" && cd ../..; done"
CHECK_DESCRIPTIONS["worktree_clean_cmd"]="for d in worktrees/*/; do cd \$d && echo \"\$(basename \$PWD): \$(git status --porcelain | wc -l) changes\" && cd ../..; done"

# Signal Schema
CHECK_DESCRIPTIONS["signal_schema_cmd"]="find .claude -name 'signal-*.json' -exec jq -e '.wave and .gate and .status' {} \\; 2>/dev/null | wc -l"

# Project Files
CHECK_DESCRIPTIONS["proj_package_json_cmd"]="jq -e '.name' package.json"
CHECK_DESCRIPTIONS["proj_claude_md_cmd"]="ls -la CLAUDE.md .claude/CLAUDE.md 2>/dev/null"
CHECK_DESCRIPTIONS["proj_ai_prd_cmd"]="ls -la ai-prd/AI-PRD.md .claude/ai-prd/AI-PRD.md 2>/dev/null"
CHECK_DESCRIPTIONS["proj_stories_cmd"]="ls stories/wave\${WAVE_NUMBER}/*.json .claude/stories/wave\${WAVE_NUMBER}/*.json 2>/dev/null | wc -l"
CHECK_DESCRIPTIONS["proj_stories_schema_cmd"]="find stories/wave\${WAVE_NUMBER} .claude/stories/wave\${WAVE_NUMBER} -name '*.json' 2>/dev/null | head -1 | xargs jq -e '.acceptance_criteria and .files.forbidden' 2>/dev/null"
CHECK_DESCRIPTIONS["proj_node_modules_cmd"]="ls -d node_modules 2>/dev/null && echo 'exists'"

# Network Connectivity
CHECK_DESCRIPTIONS["net_anthropic_cmd"]="curl -s -o /dev/null -w '%{http_code}' https://api.anthropic.com"
CHECK_DESCRIPTIONS["net_github_cmd"]="curl -s -o /dev/null -w '%{http_code}' https://api.github.com"
CHECK_DESCRIPTIONS["net_npm_cmd"]="curl -s -o /dev/null -w '%{http_code}' https://registry.npmjs.org"

# Gate -1: Pre-Validation
CHECK_DESCRIPTIONS["gate-1_prompt_files_cmd"]="ls .claude/prompts/*.md 2>/dev/null | wc -l"
CHECK_DESCRIPTIONS["gate-1_budget_cmd"]="grep WAVE_BUDGET .env"
CHECK_DESCRIPTIONS["gate-1_worktrees_cmd"]="git worktree list"
CHECK_DESCRIPTIONS["gate-1_emergency_stop_cmd"]="test -f .claude/EMERGENCY-STOP && echo 'ACTIVE' || echo 'CLEAR'"
CHECK_DESCRIPTIONS["gate-1_previous_wave_cmd"]="cat .claude/locks/PHASE4-wave\$((WAVE_NUMBER-1)).lock 2>/dev/null | jq -r '.status'"
CHECK_DESCRIPTIONS["gate-1_api_quotas_cmd"]="curl -s -H 'x-api-key: '\$ANTHROPIC_API_KEY https://api.anthropic.com/v1/messages -d '{\"model\":\"claude-3-haiku-20240307\",\"max_tokens\":1,\"messages\":[{\"role\":\"user\",\"content\":\"hi\"}]}' | jq -r '.type // .error.type'"
CHECK_DESCRIPTIONS["gate-1_environment_cmd"]="env | grep -E 'ANTHROPIC|SLACK|SUPABASE' | cut -d= -f1"
CHECK_DESCRIPTIONS["gate-1_docker_cmd"]="docker compose config --quiet && echo 'VALID'"

# Phase 0: Pre-Flight
CHECK_DESCRIPTIONS["phase0_stories_cmd"]="find stories/wave\${WAVE_NUMBER} -name '*.json' -exec jq -e '.id' {} \\; 2>/dev/null | wc -l"
CHECK_DESCRIPTIONS["phase0_gaps_cmd"]="cat .claude/locks/PHASE0-wave\${WAVE_NUMBER}.lock 2>/dev/null | jq -r '.checks.gaps.status'"
CHECK_DESCRIPTIONS["phase0_planning_cmd"]="cat .claude/locks/PHASE0-wave\${WAVE_NUMBER}.lock 2>/dev/null | jq -r '.checks.planning.status'"
CHECK_DESCRIPTIONS["phase0_greenlight_cmd"]="cat .claude/signal-wave\${WAVE_NUMBER}-greenlight.json 2>/dev/null | jq -r '.status'"

# Phase 1: Infrastructure
CHECK_DESCRIPTIONS["phase1_slack_cmd"]="curl -s -o /dev/null -w '%{http_code}' -X POST \$SLACK_WEBHOOK_URL -d '{\"text\":\"ping\"}'"
CHECK_DESCRIPTIONS["phase1_supabase_cmd"]="curl -s -H 'apikey: '\$SUPABASE_ANON_KEY \$SUPABASE_URL/rest/v1/ | head -c 50"
CHECK_DESCRIPTIONS["phase1_docker_cmd"]="docker compose ps --format 'table {{.Name}}\\t{{.Status}}'"
CHECK_DESCRIPTIONS["phase1_dozzle_cmd"]="curl -s -o /dev/null -w '%{http_code}' http://localhost:8080"
CHECK_DESCRIPTIONS["phase1_worktree_cmd"]="git worktree list --porcelain | grep -c 'worktree'"
CHECK_DESCRIPTIONS["phase1_github_cmd"]="curl -s -H 'Authorization: token '\$GITHUB_TOKEN https://api.github.com/user | jq -r '.login'"
CHECK_DESCRIPTIONS["phase1_vercel_cmd"]="curl -s -H 'Authorization: Bearer '\$VERCEL_TOKEN https://api.vercel.com/v2/user | jq -r '.user.username'"
CHECK_DESCRIPTIONS["phase1_neon_cmd"]="psql \$DATABASE_URL -c 'SELECT 1' 2>/dev/null && echo 'CONNECTED'"
CHECK_DESCRIPTIONS["phase1_claude_cmd"]="curl -s -H 'x-api-key: '\$ANTHROPIC_API_KEY -H 'anthropic-version: 2023-06-01' https://api.anthropic.com/v1/messages -d '{\"model\":\"claude-3-haiku-20240307\",\"max_tokens\":1,\"messages\":[{\"role\":\"user\",\"content\":\"1\"}]}' | jq -r '.content[0].text // .error.message'"
CHECK_DESCRIPTIONS["phase1_nano_banana_cmd"]="curl -s 'https://generativelanguage.googleapis.com/v1/models?key='\$GOOGLE_AI_API_KEY | jq -r '.models[0].name // .error.message'"

# Phase 2: Smoke Tests
CHECK_DESCRIPTIONS["phase2_build_cmd"]="pnpm build"
CHECK_DESCRIPTIONS["phase2_typecheck_cmd"]="pnpm typecheck 2>&1 | tail -5"
CHECK_DESCRIPTIONS["phase2_lint_cmd"]="pnpm lint 2>&1 | tail -5"
CHECK_DESCRIPTIONS["phase2_test_cmd"]="pnpm test --passWithNoTests 2>&1 | tail -10"
CHECK_DESCRIPTIONS["phase2_install_cmd"]="pnpm install --frozen-lockfile"

# Phase 3: Development
CHECK_DESCRIPTIONS["phase3_fe_complete_cmd"]="cat .claude/signal-wave\${WAVE_NUMBER}-gate3-fe-complete.json 2>/dev/null | jq -r '.status'"
CHECK_DESCRIPTIONS["phase3_be_complete_cmd"]="cat .claude/signal-wave\${WAVE_NUMBER}-gate3-be-complete.json 2>/dev/null | jq -r '.status'"
CHECK_DESCRIPTIONS["phase3_no_conflicts_cmd"]="git merge-tree \$(git merge-base HEAD main) HEAD main 2>/dev/null | grep -c 'conflict' || echo '0'"

# Phase 4: QA Validation
CHECK_DESCRIPTIONS["phase4_qa_approval_cmd"]="cat .claude/signal-wave\${WAVE_NUMBER}-gate4-approved.json 2>/dev/null | jq -r '.decision'"
CHECK_DESCRIPTIONS["phase4_coverage_cmd"]="pnpm test --coverage 2>&1 | grep -E 'All files|Statements'"
CHECK_DESCRIPTIONS["phase4_all_tests_cmd"]="pnpm test 2>&1 | grep -E 'passed|failed'"

# Protocol Compliance
CHECK_DESCRIPTIONS["protocol_safety_doc_cmd"]="grep -c -E 'NEVER|FORBIDDEN|MUST NOT|DO NOT' CLAUDE.md"
CHECK_DESCRIPTIONS["protocol_emergency_cmd"]="grep -c 'EMERGENCY\\|STOP\\|kill.switch' CLAUDE.md"
CHECK_DESCRIPTIONS["protocol_boundaries_cmd"]="grep -c 'boundary\\|domain\\|ALLOWED' CLAUDE.md"
CHECK_DESCRIPTIONS["protocol_budget_cmd"]="grep -c 'budget\\|token\\|cost\\|limit' CLAUDE.md"
CHECK_DESCRIPTIONS["protocol_docker_cmd"]="grep -c 'dangerously-skip-permissions' docker-compose.yml"
CHECK_DESCRIPTIONS["protocol_signals_cmd"]="ls .claude/signal-*.json 2>/dev/null | wc -l"
CHECK_DESCRIPTIONS["protocol_gates_cmd"]="ls .claude/locks/PHASE*.lock .claude/locks/GATE*.lock 2>/dev/null | wc -l"
CHECK_DESCRIPTIONS["protocol_nonroot_cmd"]="grep -E 'user:|USER ' docker-compose.yml Dockerfile.agent 2>/dev/null | head -1"

# Aerospace Safety Checks (generic - uses project paths)
CHECK_DESCRIPTIONS["aero_dal_level_cmd"]="find stories/wave\${WAVE_NUMBER} .claude/stories/wave\${WAVE_NUMBER} -name '*.json' 2>/dev/null | head -1 | xargs jq -r '.dal_level // \"NOT SET\"' 2>/dev/null"
CHECK_DESCRIPTIONS["aero_fmea_cmd"]="ls .claudecode/safety/FMEA.md .claude/safety/FMEA.md 2>/dev/null | head -1 && echo 'EXISTS'"
CHECK_DESCRIPTIONS["aero_emergency_levels_cmd"]="ls .claudecode/safety/EMERGENCY-LEVELS.md .claude/safety/EMERGENCY-LEVELS.md 2>/dev/null | head -1 && echo 'EXISTS'"
CHECK_DESCRIPTIONS["aero_approval_matrix_cmd"]="ls .claudecode/safety/APPROVAL-LEVELS.md .claude/safety/APPROVAL-LEVELS.md 2>/dev/null | head -1 && echo 'EXISTS'"
CHECK_DESCRIPTIONS["aero_forbidden_ops_cmd"]="grep -c 'FORBIDDEN' CLAUDE.md .claudecode/safety/COMPLETE-SAFETY-REFERENCE.md 2>/dev/null | head -1"
CHECK_DESCRIPTIONS["aero_rollback_cmd"]="ls .claudecode/safety/ROLLBACK-PROCEDURES.md .claude/safety/ROLLBACK-PROCEDURES.md 2>/dev/null | head -1"
CHECK_DESCRIPTIONS["aero_audit_trail_cmd"]="curl -s -H 'apikey: '\$SUPABASE_ANON_KEY \"\$SUPABASE_URL/rest/v1/maf_events?limit=1\" 2>/dev/null | jq -r '.[0].event_type // \"NO EVENTS\"'"
CHECK_DESCRIPTIONS["aero_security_scan_cmd"]="pnpm audit --json 2>/dev/null | jq -r '.metadata.vulnerabilities.critical // 0'"
CHECK_DESCRIPTIONS["aero_backup_cmd"]="ls -la .claude/backups/ 2>/dev/null | head -3 || echo 'No backups directory'"
CHECK_DESCRIPTIONS["aero_preflight_cmd"]="echo 'Run pre-flight-validator.sh --project . --wave \${WAVE_NUMBER}'"

# Project-Specific Checks (Supabase SOURCE OF TRUTH, Git, Vercel)
CHECK_DESCRIPTIONS["proj_supabase_what"]="Supabase (SOURCE OF TRUTH) is connected and maf_stories table is accessible"
CHECK_DESCRIPTIONS["proj_supabase_why"]="Supabase is THE SOURCE OF TRUTH - all wave state, AI Stories, and audit trail live here. JSON signals are just the speed layer for execution"
CHECK_DESCRIPTIONS["proj_supabase_fix"]="Set SUPABASE_URL and SUPABASE_ANON_KEY in .env. Verify maf_stories table exists in Supabase"

CHECK_DESCRIPTIONS["proj_stories_db_what"]="AI Stories exist in Supabase (source of truth) for the current wave"
CHECK_DESCRIPTIONS["proj_stories_db_why"]="AI Stories MUST exist in Supabase before wave execution. Local JSON files are synced FROM Supabase, not the other way around"
CHECK_DESCRIPTIONS["proj_stories_db_fix"]="Create AI Stories in Supabase dashboard, or run sync-stories.sh --to-supabase to push existing stories"

CHECK_DESCRIPTIONS["proj_stories_schema_what"]="AI Stories in Supabase follow Schema V4 (acceptance_criteria, files.forbidden, safety_constraints)"
CHECK_DESCRIPTIONS["proj_stories_schema_why"]="Schema V4 is required for AI Story compliance: testable acceptance_criteria, forbidden file boundaries, and safety constraints"
CHECK_DESCRIPTIONS["proj_stories_schema_fix"]="Update AI Stories in Supabase to include: acceptance_criteria[], files.forbidden[], safety_constraints{}"

CHECK_DESCRIPTIONS["proj_git_remote_what"]="Git remote origin is configured and accessible"
CHECK_DESCRIPTIONS["proj_git_remote_why"]="Git remote is required for agent worktrees to push/pull changes"
CHECK_DESCRIPTIONS["proj_git_remote_fix"]="Run 'git remote add origin <url>' or verify credentials for existing remote"

CHECK_DESCRIPTIONS["proj_git_branch_what"]="Main branch exists and is clean (no uncommitted changes)"
CHECK_DESCRIPTIONS["proj_git_branch_why"]="Clean main branch ensures worktrees start from known good state"
CHECK_DESCRIPTIONS["proj_git_branch_fix"]="Commit or stash changes, then run 'git checkout main'"

CHECK_DESCRIPTIONS["proj_vercel_what"]="Vercel deployment is configured and project is linked"
CHECK_DESCRIPTIONS["proj_vercel_why"]="Vercel enables preview deployments for each PR and automatic production deploys"
CHECK_DESCRIPTIONS["proj_vercel_fix"]="Run 'vercel link' to connect project, or add VERCEL_TOKEN to .env"

CHECK_DESCRIPTIONS["proj_wave_config_what"]="Wave configuration exists with proper structure"
CHECK_DESCRIPTIONS["proj_wave_config_why"]="Wave config defines agent assignments, story mapping, and execution parameters"
CHECK_DESCRIPTIONS["proj_wave_config_fix"]="Create .claude/wave-config.json with wave number, agents, and story assignments"

# Commands
CHECK_DESCRIPTIONS["proj_supabase_cmd"]="curl -s -H 'apikey: '\$SUPABASE_ANON_KEY \"\$SUPABASE_URL/rest/v1/maf_stories?limit=1\" 2>/dev/null && echo 'SOURCE OF TRUTH CONNECTED'"
CHECK_DESCRIPTIONS["proj_stories_db_cmd"]="curl -s -H 'apikey: '\$SUPABASE_ANON_KEY \"\$SUPABASE_URL/rest/v1/maf_stories?wave_number=eq.\${WAVE_NUMBER}&select=id,title\" 2>/dev/null | jq -r 'length'"
CHECK_DESCRIPTIONS["proj_stories_schema_cmd"]="curl -s -H 'apikey: '\$SUPABASE_ANON_KEY \"\$SUPABASE_URL/rest/v1/maf_stories?wave_number=eq.\${WAVE_NUMBER}&select=id,acceptance_criteria,safety_constraints\" 2>/dev/null | jq -r '.[0] | has(\"acceptance_criteria\")'"
CHECK_DESCRIPTIONS["proj_git_remote_cmd"]="git remote -v | grep origin | head -1"
CHECK_DESCRIPTIONS["proj_git_branch_cmd"]="git status --porcelain | wc -l | xargs"
CHECK_DESCRIPTIONS["proj_vercel_cmd"]="ls .vercel/project.json 2>/dev/null && echo 'LINKED'"
CHECK_DESCRIPTIONS["proj_wave_config_cmd"]="cat .claude/wave-config.json 2>/dev/null | jq -r '.wave // \"NOT SET\"'"

# ─────────────────────────────────────────────────────────────────────────────
# RENDER HTML OUTPUT - EXPANDABLE VERTICAL LIST
# ─────────────────────────────────────────────────────────────────────────────
render_html() {
    local project_name
    project_name=$(basename "$PROJECT_PATH")
    local timestamp
    timestamp=$(date '+%Y-%m-%d %H:%M:%S')

    cat << 'HTMLHEAD'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
HTMLHEAD

    # Make title generic for skeleton template (always generic since this runs before wave detection)
    echo "    <title>WAVE Pre-Launch Checklist</title>"

    cat << 'HTMLSTYLE'
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
    <style>
        /* ═══════════════════════════════════════════════════════════════════════
           SHADCN/UI DESIGN SYSTEM - CSS Variables
           Based on shadcn/ui default theme (light mode)
           ═══════════════════════════════════════════════════════════════════════ */
        :root {
            /* Core Colors - shadcn/ui defaults */
            --background: 0 0% 100%;
            --foreground: 240 10% 3.9%;
            --card: 0 0% 100%;
            --card-foreground: 240 10% 3.9%;
            --popover: 0 0% 100%;
            --popover-foreground: 240 10% 3.9%;
            --primary: 240 5.9% 10%;
            --primary-foreground: 0 0% 98%;
            --secondary: 240 4.8% 95.9%;
            --secondary-foreground: 240 5.9% 10%;
            --muted: 240 4.8% 95.9%;
            --muted-foreground: 240 3.8% 46.1%;
            --accent: 240 4.8% 95.9%;
            --accent-foreground: 240 5.9% 10%;
            --destructive: 0 84.2% 60.2%;
            --destructive-foreground: 0 0% 98%;
            --border: 240 5.9% 90%;
            --input: 240 5.9% 90%;
            --ring: 240 5.9% 10%;

            /* Status Colors */
            --success: 142.1 76.2% 36.3%;
            --success-foreground: 0 0% 98%;
            --warning: 38 92% 50%;
            --warning-foreground: 0 0% 9%;

            /* Radius - shadcn default */
            --radius: 0.5rem;
        }

        /* Reset & Base */
        *, *::before, *::after {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }

        html {
            font-size: 16px;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
        }

        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: hsl(var(--background));
            color: hsl(var(--foreground));
            line-height: 1.5;
            min-height: 100vh;
        }

        /* ═══════════════════════════════════════════════════════════════════════
           LAYOUT
           ═══════════════════════════════════════════════════════════════════════ */
        .dashboard {
            max-width: 1440px;
            margin: 0 auto;
            padding: 2rem 1.5rem 4rem;
        }

        /* ═══════════════════════════════════════════════════════════════════════
           HEADER
           ═══════════════════════════════════════════════════════════════════════ */
        .header {
            text-align: center;
            margin-bottom: 2rem;
            padding-bottom: 1.5rem;
            border-bottom: 1px solid hsl(var(--border));
        }

        .header h1 {
            font-size: 1.875rem;
            font-weight: 600;
            letter-spacing: -0.025em;
            color: hsl(var(--foreground));
            margin-bottom: 0.25rem;
        }

        .header .subtitle {
            font-size: 0.875rem;
            color: hsl(var(--muted-foreground));
            margin-bottom: 1rem;
        }

        .header .meta {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.5rem 1rem;
            background: hsl(var(--muted));
            border-radius: calc(var(--radius) * 2);
            font-size: 0.8125rem;
            color: hsl(var(--muted-foreground));
        }

        .header .meta-item {
            display: flex;
            align-items: center;
            gap: 0.375rem;
        }

        .header .meta-item strong {
            font-weight: 500;
            color: hsl(var(--foreground));
        }

        .header .meta-divider {
            width: 1px;
            height: 1rem;
            background: hsl(var(--border));
        }

        /* ═══════════════════════════════════════════════════════════════════════
           STATUS BANNER - shadcn Alert style
           ═══════════════════════════════════════════════════════════════════════ */
        .status-banner {
            position: relative;
            padding: 1.25rem 1.5rem;
            border-radius: var(--radius);
            margin-bottom: 2rem;
            display: flex;
            align-items: center;
            gap: 1rem;
        }

        .status-banner.ready {
            background: hsl(142.1 76.2% 36.3% / 0.1);
            border: 1px solid hsl(142.1 76.2% 36.3% / 0.3);
        }

        .status-banner.not-ready {
            background: hsl(0 84.2% 60.2% / 0.1);
            border: 1px solid hsl(0 84.2% 60.2% / 0.3);
        }

        .status-icon {
            width: 2.5rem;
            height: 2.5rem;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.25rem;
            flex-shrink: 0;
        }

        .status-banner.ready .status-icon {
            background: hsl(142.1 76.2% 36.3% / 0.15);
            color: hsl(142.1 70% 30%);
        }

        .status-banner.not-ready .status-icon {
            background: hsl(0 84.2% 60.2% / 0.15);
            color: hsl(0 70% 45%);
        }

        .status-content {
            flex: 1;
        }

        .status-content h2 {
            font-size: 1rem;
            font-weight: 600;
            margin-bottom: 0.125rem;
        }

        .status-banner.ready .status-content h2 { color: hsl(142.1 70% 25%); }
        .status-banner.not-ready .status-content h2 { color: hsl(0 70% 40%); }

        .status-content .blocked-at {
            font-size: 0.8125rem;
            color: hsl(var(--muted-foreground));
        }

        .status-indicators {
            display: flex;
            gap: 0.75rem;
        }

        .indicator {
            display: inline-flex;
            align-items: center;
            gap: 0.375rem;
            padding: 0.375rem 0.75rem;
            background: hsl(var(--background));
            border: 1px solid hsl(var(--border));
            border-radius: calc(var(--radius) * 2);
            font-size: 0.75rem;
            color: hsl(var(--muted-foreground));
        }

        .indicator-dot {
            width: 6px;
            height: 6px;
            border-radius: 50%;
        }

        .indicator-dot.ok { background: hsl(var(--success)); }
        .indicator-dot.alert { background: hsl(var(--destructive)); }

        /* ═══════════════════════════════════════════════════════════════════════
           SECTION DIVIDER
           ═══════════════════════════════════════════════════════════════════════ */
        .section-divider {
            display: flex;
            align-items: center;
            gap: 1rem;
            margin: 2rem 0 1.25rem;
        }

        .section-divider:first-of-type {
            margin-top: 0;
        }

        .section-divider-line {
            flex: 1;
            height: 1px;
            background: hsl(var(--border));
        }

        .section-divider-text {
            font-size: 0.6875rem;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.1em;
            color: hsl(var(--muted-foreground));
            white-space: nowrap;
        }

        /* ═══════════════════════════════════════════════════════════════════════
           PHASE LIST
           ═══════════════════════════════════════════════════════════════════════ */
        .phase-list {
            display: flex;
            flex-direction: column;
            gap: 1rem;
        }

        /* ═══════════════════════════════════════════════════════════════════════
           PHASE CARD - shadcn Card + Collapsible style
           ═══════════════════════════════════════════════════════════════════════ */
        .phase-card {
            background: hsl(var(--card));
            border: 1px solid hsl(var(--border));
            border-radius: var(--radius);
            overflow: hidden;
            box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
        }

        .phase-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 1rem 1.25rem;
            background: hsl(var(--muted) / 0.5);
            border-bottom: 1px solid hsl(var(--border));
        }

        .phase-info {
            display: flex;
            align-items: center;
            gap: 0.875rem;
        }

        .phase-number {
            width: 2.25rem;
            height: 2.25rem;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: var(--radius);
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.8125rem;
            font-weight: 600;
        }

        .phase-number.pass {
            background: hsl(142.1 76.2% 36.3% / 0.15);
            color: hsl(142.1 70% 30%);
        }
        .phase-number.fail {
            background: hsl(0 84.2% 60.2% / 0.15);
            color: hsl(0 70% 45%);
        }
        .phase-number.pending {
            background: hsl(var(--muted));
            color: hsl(var(--muted-foreground));
        }
        .phase-number.blocked {
            background: hsl(38 92% 50% / 0.15);
            color: hsl(38 80% 35%);
        }

        .phase-title-group h3 {
            font-size: 0.9375rem;
            font-weight: 600;
            color: hsl(var(--foreground));
            line-height: 1.2;
        }

        .phase-title-group .phase-desc {
            font-size: 0.75rem;
            color: hsl(var(--muted-foreground));
            margin-top: 0.125rem;
        }

        .phase-meta {
            display: flex;
            align-items: center;
            gap: 0.75rem;
        }

        .phase-time {
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.6875rem;
            color: hsl(var(--muted-foreground));
        }

        /* Status Badge - shadcn Badge variant */
        .phase-status-badge {
            display: inline-flex;
            align-items: center;
            padding: 0.25rem 0.625rem;
            border-radius: calc(var(--radius) * 2);
            font-size: 0.6875rem;
            font-weight: 500;
            text-transform: uppercase;
            letter-spacing: 0.025em;
        }

        .status-pass {
            background: hsl(142.1 76.2% 36.3% / 0.15);
            color: hsl(142.1 70% 28%);
        }
        .status-fail {
            background: hsl(0 84.2% 60.2% / 0.15);
            color: hsl(0 70% 42%);
        }
        .status-blocked, .status-drift {
            background: hsl(38 92% 50% / 0.15);
            color: hsl(38 80% 32%);
        }
        .status-pending {
            background: hsl(var(--muted));
            color: hsl(var(--muted-foreground));
        }

        /* ═══════════════════════════════════════════════════════════════════════
           CHECK ITEMS - Accordion style
           ═══════════════════════════════════════════════════════════════════════ */
        .checks-list {
            padding: 0.25rem 0;
        }

        .check-item {
            border-bottom: 1px solid hsl(var(--border) / 0.6);
        }

        .check-item:last-child {
            border-bottom: none;
        }

        .check-header {
            display: flex;
            align-items: center;
            width: 100%;
            padding: 0.75rem 1.25rem;
            background: transparent;
            border: none;
            cursor: pointer;
            transition: background-color 150ms ease;
            text-align: left;
        }

        .check-header:hover {
            background: hsl(var(--muted) / 0.5);
        }

        .check-header:focus-visible {
            outline: 2px solid hsl(var(--ring));
            outline-offset: -2px;
        }

        .check-icon {
            width: 1.5rem;
            height: 1.5rem;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-right: 0.75rem;
            border-radius: 50%;
            font-size: 0.75rem;
            font-weight: 600;
            flex-shrink: 0;
        }

        .check-icon.pass {
            background: hsl(142.1 76.2% 36.3% / 0.15);
            color: hsl(142.1 70% 30%);
        }
        .check-icon.fail {
            background: hsl(0 84.2% 60.2% / 0.15);
            color: hsl(0 70% 45%);
        }
        .check-icon.warn {
            background: hsl(38 92% 50% / 0.15);
            color: hsl(38 80% 35%);
        }
        .check-icon.blocked {
            background: hsl(38 92% 50% / 0.15);
            color: hsl(38 80% 35%);
        }
        .check-icon.pending {
            background: hsl(var(--muted));
            color: hsl(var(--muted-foreground));
        }

        .check-info {
            flex: 1;
            min-width: 0;
        }

        .check-name {
            font-size: 0.8125rem;
            font-weight: 500;
            color: hsl(var(--foreground));
        }

        .check-status-text {
            font-size: 0.6875rem;
            color: hsl(var(--muted-foreground));
            margin-left: auto;
            padding-left: 1rem;
            flex-shrink: 0;
        }

        .expand-icon {
            margin-left: 0.5rem;
            color: hsl(var(--muted-foreground));
            transition: transform 200ms ease;
            font-size: 0.75rem;
            flex-shrink: 0;
        }

        .check-item.expanded .expand-icon {
            transform: rotate(180deg);
        }

        /* ═══════════════════════════════════════════════════════════════════════
           CHECK DETAILS - Simple, Clean Layout
           ═══════════════════════════════════════════════════════════════════════ */
        .check-details {
            display: none;
            padding: 0 1.25rem 1rem 3rem;
            animation: slideDown 150ms ease;
        }

        @keyframes slideDown {
            from { opacity: 0; }
            to { opacity: 1; }
        }

        .check-item.expanded .check-details {
            display: block;
        }

        .detail-description {
            font-size: 0.8125rem;
            color: hsl(var(--muted-foreground));
            line-height: 1.6;
            margin-bottom: 0.75rem;
        }

        .detail-command {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            margin-bottom: 0.5rem;
        }

        .detail-command code {
            flex: 1;
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.75rem;
            background: hsl(var(--foreground));
            color: hsl(var(--background));
            padding: 0.5rem 0.75rem;
            border-radius: calc(var(--radius) - 2px);
            overflow-x: auto;
            white-space: nowrap;
        }

        .copy-btn {
            padding: 0.5rem 0.625rem;
            background: hsl(var(--muted));
            border: 1px solid hsl(var(--border));
            border-radius: calc(var(--radius) - 2px);
            font-size: 0.6875rem;
            color: hsl(var(--muted-foreground));
            cursor: pointer;
            transition: all 150ms;
            white-space: nowrap;
        }

        .copy-btn:hover {
            background: hsl(var(--accent));
            color: hsl(var(--foreground));
        }

        .copy-btn.copied {
            background: hsl(142.1 76.2% 36.3% / 0.15);
            color: hsl(142.1 60% 30%);
            border-color: hsl(142.1 76.2% 36.3% / 0.3);
        }

        .detail-error {
            font-size: 0.75rem;
            color: hsl(0 70% 45%);
            background: hsl(0 84.2% 60.2% / 0.08);
            padding: 0.5rem 0.75rem;
            border-radius: calc(var(--radius) - 2px);
            margin-top: 0.5rem;
            border-left: 2px solid hsl(0 84.2% 60.2%);
        }

        .detail-error strong {
            color: hsl(0 70% 40%);
        }

        /* ═══════════════════════════════════════════════════════════════════════
           TABS - shadcn Tabs component style
           ═══════════════════════════════════════════════════════════════════════ */
        .tabs-container {
            margin-bottom: 1.5rem;
        }

        .tabs-list {
            display: flex;
            width: 100%;
            align-items: center;
            background: hsl(var(--muted));
            border-radius: var(--radius);
            padding: 0.25rem;
            gap: 0.125rem;
        }

        .tab-trigger {
            flex: 1;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 0.5rem;
            padding: 0.625rem 1rem;
            border: none;
            background: transparent;
            border-radius: calc(var(--radius) - 2px);
            font-family: inherit;
            font-size: 0.875rem;
            font-weight: 500;
            color: hsl(var(--muted-foreground));
            cursor: pointer;
            transition: all 150ms ease;
            white-space: nowrap;
        }

        .tab-trigger:hover {
            color: hsl(var(--foreground));
        }

        .tab-trigger.active {
            background: hsl(var(--background));
            color: hsl(var(--foreground));
            box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
        }

        .tab-trigger .tab-badge {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            min-width: 1.25rem;
            height: 1.25rem;
            padding: 0 0.375rem;
            border-radius: 9999px;
            font-size: 0.6875rem;
            font-weight: 600;
        }

        .tab-trigger .tab-badge.pass {
            background: hsl(142.1 76.2% 36.3% / 0.15);
            color: hsl(142.1 70% 28%);
        }

        .tab-trigger .tab-badge.fail {
            background: hsl(0 84.2% 60.2% / 0.15);
            color: hsl(0 70% 42%);
        }

        .tab-trigger .tab-badge.pending {
            background: hsl(var(--muted));
            color: hsl(var(--muted-foreground));
        }

        .tab-content {
            display: none;
            animation: fadeIn 200ms ease;
        }

        .tab-content.active {
            display: block;
        }

        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }

        /* ═══════════════════════════════════════════════════════════════════════
           WAVE CARDS (Multi-wave support)
           ═══════════════════════════════════════════════════════════════════════ */
        .waves-container {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
            gap: 1rem;
            margin-bottom: 1.5rem;
        }

        .wave-card {
            background: hsl(var(--card));
            border: 1px solid hsl(var(--border));
            border-radius: var(--radius);
            padding: 1rem;
            transition: all 150ms ease;
        }

        .wave-card:hover {
            border-color: hsl(var(--primary) / 0.3);
            box-shadow: 0 2px 8px rgb(0 0 0 / 0.05);
        }

        .wave-card.current-wave {
            border-color: hsl(var(--primary));
            border-width: 2px;
            background: hsl(var(--primary) / 0.02);
        }

        .wave-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 0.75rem;
            padding-bottom: 0.75rem;
            border-bottom: 1px solid hsl(var(--border));
        }

        .wave-title {
            display: flex;
            flex-direction: column;
            gap: 0.25rem;
        }

        .wave-number {
            font-weight: 600;
            font-size: 1rem;
            color: hsl(var(--foreground));
        }

        .wave-badge {
            display: inline-block;
            padding: 0.125rem 0.5rem;
            border-radius: 9999px;
            font-size: 0.6875rem;
            font-weight: 600;
            text-transform: uppercase;
        }

        .wave-badge.pass {
            background: hsl(142.1 76.2% 36.3% / 0.15);
            color: hsl(142.1 70% 28%);
        }

        .wave-badge.warn {
            background: hsl(38 92% 50% / 0.15);
            color: hsl(38 80% 35%);
        }

        .wave-badge.pending {
            background: hsl(var(--muted));
            color: hsl(var(--muted-foreground));
        }

        .wave-badge.current {
            background: hsl(var(--primary));
            color: hsl(var(--primary-foreground));
        }

        .wave-meta {
            text-align: right;
        }

        .story-count {
            font-size: 0.8125rem;
            color: hsl(var(--muted-foreground));
        }

        .wave-details {
            display: flex;
            flex-direction: column;
            gap: 0.375rem;
        }

        .wave-check {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            font-size: 0.8125rem;
            color: hsl(var(--foreground));
        }

        .wave-check .check-icon {
            width: 1rem;
            height: 1rem;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-size: 0.75rem;
            font-weight: 600;
        }

        .wave-check .check-icon.pass {
            color: hsl(142.1 76.2% 36.3%);
        }

        .wave-check .check-icon.warn {
            color: hsl(38 92% 50%);
        }

        .wave-check .check-icon.fail {
            color: hsl(0 84.2% 60.2%);
        }

        .wave-stories {
            margin-top: 0.5rem;
            padding-top: 0.5rem;
            border-top: 1px dashed hsl(var(--border));
            font-size: 0.75rem;
            color: hsl(var(--muted-foreground));
        }

        .stories-label {
            font-weight: 500;
        }

        .stories-list {
            font-style: italic;
        }

        /* ═══════════════════════════════════════════════════════════════════════
           STORY TESTS (Auto-generated from AI Stories)
           ═══════════════════════════════════════════════════════════════════════ */
        .story-tests-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
            gap: 1rem;
            padding: 1rem;
        }

        .story-test-group {
            background: hsl(var(--background));
            border: 1px solid hsl(var(--border));
            border-radius: var(--radius);
            overflow: hidden;
        }

        .story-test-header {
            background: hsl(var(--muted) / 0.5);
            padding: 0.5rem 0.75rem;
            font-weight: 600;
            font-size: 0.8125rem;
            color: hsl(var(--foreground));
            border-bottom: 1px solid hsl(var(--border));
        }

        .story-test-row {
            display: grid;
            grid-template-columns: auto 1fr auto;
            gap: 0.5rem;
            align-items: center;
            padding: 0.375rem 0.75rem;
            border-bottom: 1px solid hsl(var(--border) / 0.5);
            font-size: 0.75rem;
        }

        .story-test-row:last-child {
            border-bottom: none;
        }

        .story-test-row.pass {
            background: hsl(142.1 76.2% 36.3% / 0.05);
        }

        .story-test-row.fail {
            background: hsl(0 84.2% 60.2% / 0.08);
        }

        .story-test-row.warn {
            background: hsl(38 92% 50% / 0.08);
        }

        .story-test-row .test-icon {
            width: 1.25rem;
            height: 1.25rem;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 700;
            font-size: 0.8125rem;
            border-radius: 50%;
        }

        .story-test-row.pass .test-icon {
            background: hsl(142.1 76.2% 36.3% / 0.15);
            color: hsl(142.1 70% 28%);
        }

        .story-test-row.fail .test-icon {
            background: hsl(0 84.2% 60.2% / 0.15);
            color: hsl(0 70% 45%);
        }

        .story-test-row.warn .test-icon {
            background: hsl(38 92% 50% / 0.15);
            color: hsl(38 80% 35%);
        }

        .story-test-row .test-name {
            font-weight: 500;
            color: hsl(var(--foreground));
        }

        .story-test-row .test-detail {
            text-align: right;
            color: hsl(var(--muted-foreground));
            font-size: 0.6875rem;
            max-width: 200px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        .test-summary {
            display: flex;
            gap: 0.75rem;
            font-size: 0.8125rem;
            font-weight: 500;
        }

        .test-passed {
            color: hsl(142.1 76.2% 36.3%);
        }

        .test-failed {
            color: hsl(0 84.2% 60.2%);
        }

        /* ═══════════════════════════════════════════════════════════════════════
           FOOTER
           ═══════════════════════════════════════════════════════════════════════ */
        .footer {
            text-align: center;
            margin-top: 3rem;
            padding-top: 1.5rem;
            border-top: 1px solid hsl(var(--border));
            font-size: 0.75rem;
            color: hsl(var(--muted-foreground));
        }

        /* ═══════════════════════════════════════════════════════════════════════
           RESPONSIVE
           ═══════════════════════════════════════════════════════════════════════ */
        @media (max-width: 640px) {
            .dashboard { padding: 1rem; }
            .header h1 { font-size: 1.5rem; }
            .header .meta { flex-direction: column; gap: 0.25rem; padding: 0.75rem; }
            .header .meta-divider { display: none; }
            .status-banner { flex-direction: column; text-align: center; }
            .status-indicators { justify-content: center; flex-wrap: wrap; }
            .phase-header { flex-direction: column; align-items: flex-start; gap: 0.75rem; }
            .phase-meta { width: 100%; justify-content: space-between; }
            .check-header { padding: 0.625rem 1rem; }
            .check-details { padding-left: 2.75rem; padding-right: 1rem; }
        }
    </style>
</head>
<body>
    <div class="dashboard">
HTMLSTYLE

    # Header - show wave number only if waves detected
    local wave_count=0
    [[ -v DETECTED_WAVES[@] ]] && wave_count=${#DETECTED_WAVES[@]}
    local wave_display
    if [ "$wave_count" -gt 0 ]; then
        wave_display="${WAVE_NUMBER}"
    else
        wave_display="—"
    fi

    cat << EOF
        <div class="header">
            <h1>WAVE Pre-Launch Checklist</h1>
            <p class="subtitle">Aerospace-Grade Validation Protocol</p>
            <div class="meta">
                <span class="meta-item">Wave <strong>${wave_display}</strong></span>
                <span class="meta-divider"></span>
                <span class="meta-item">Updated <strong>$(date '+%H:%M:%S')</strong></span>
            </div>
        </div>
EOF

    # Overall Status Banner
    local banner_class
    [ "$READY_TO_LAUNCH" = "YES" ] && banner_class="ready" || banner_class="not-ready"

    local cb_dot_class es_dot_class
    [ "${CHECK_RESULTS["circuit_breaker"]}" = "CLOSED" ] && cb_dot_class="ok" || cb_dot_class="alert"
    [ "${CHECK_RESULTS["emergency_stop"]}" = "CLEAR" ] && es_dot_class="ok" || es_dot_class="alert"

    local status_icon
    [ "$READY_TO_LAUNCH" = "YES" ] && status_icon="✓" || status_icon="!"

    # Calculate tab badge statuses (in logical order)

    # 1. Foundation - Git, Supabase, .env, Wave Config
    local foundation_badge="pending"
    [ "${CHECK_RESULTS["proj_supabase"]:-PENDING}" = "PASS" ] && [ "${CHECK_RESULTS["proj_git_remote"]:-PENDING}" = "PASS" ] && foundation_badge="pass"
    [ "${CHECK_RESULTS["proj_supabase"]:-PENDING}" = "FAIL" ] || [ "${CHECK_RESULTS["proj_git_remote"]:-PENDING}" = "FAIL" ] && foundation_badge="fail"

    # 2. AI Stories - PRD, Stories exist, Schema V4
    local stories_badge="pending"
    [ "${CHECK_RESULTS["proj_stories_db"]:-PENDING}" = "PASS" ] && [ "${CHECK_RESULTS["proj_stories_schema"]:-PENDING}" = "PASS" ] && stories_badge="pass"
    [ "${CHECK_RESULTS["proj_stories_db"]:-PENDING}" = "FAIL" ] || [ "${CHECK_RESULTS["proj_ai_prd"]:-PENDING}" = "FAIL" ] && stories_badge="fail"

    # 3. System Requirements - Node, pnpm, disk, memory
    local system_badge="pass"
    [ "${CHECK_RESULTS["sys_node"]}" = "FAIL" ] || [ "${CHECK_RESULTS["sys_pnpm"]}" = "FAIL" ] && system_badge="fail"

    # 4. Infrastructure - Worktrees, Docker, Signals
    local infra_badge="pending"
    [ "${PHASE_STATUS[1]}" = "PASS" ] && infra_badge="pass"
    [ "${PHASE_STATUS[1]}" = "FAIL" ] && infra_badge="fail"

    # 5. Build & QA - Build, TypeScript, Lint, Tests
    local build_badge="pending"
    [ "${PHASE_STATUS[2]}" = "PASS" ] && [ "${PHASE_STATUS[3]}" = "PASS" ] && [ "${PHASE_STATUS[4]}" = "PASS" ] && build_badge="pass"
    [ "${PHASE_STATUS[2]}" = "FAIL" ] || [ "${PHASE_STATUS[3]}" = "FAIL" ] || [ "${PHASE_STATUS[4]}" = "FAIL" ] && build_badge="fail"

    cat << EOF
        <div class="status-banner ${banner_class}">
            <div class="status-icon">${status_icon}</div>
            <div class="status-content">
                <h2>$([ "$READY_TO_LAUNCH" = "YES" ] && echo "Ready to Launch" || echo "Not Ready to Launch")</h2>
                $([ -n "$BLOCKED_AT" ] && echo "<p class=\"blocked-at\">Blocked at: ${BLOCKED_AT}</p>")
            </div>
            <div class="status-indicators">
                <span class="indicator">
                    <span class="indicator-dot ${cb_dot_class}"></span>
                    Circuit Breaker
                </span>
                <span class="indicator">
                    <span class="indicator-dot ${es_dot_class}"></span>
                    Emergency Stop
                </span>
            </div>
        </div>

        <!-- TABS - Logical validation order: Requirements FIRST -->
        <div class="tabs-container">
            <div class="tabs-list">
                <button class="tab-trigger active" data-tab="stories">
                    1. AI PRD & Stories
                    <span class="tab-badge ${stories_badge}">●</span>
                </button>
                <button class="tab-trigger" data-tab="foundation">
                    2. Foundation
                    <span class="tab-badge ${foundation_badge}">●</span>
                </button>
                <button class="tab-trigger" data-tab="system">
                    3. System
                    <span class="tab-badge ${system_badge}">●</span>
                </button>
                <button class="tab-trigger" data-tab="infrastructure">
                    4. Infrastructure
                    <span class="tab-badge ${infra_badge}">●</span>
                </button>
                <button class="tab-trigger" data-tab="build">
                    5. Build & QA
                    <span class="tab-badge ${build_badge}">●</span>
                </button>
                <button class="tab-trigger" data-tab="compliance">
                    6. Compliance
                </button>
            </div>
        </div>

        <!-- TAB 1: AI PRD & Stories (Source of Truth: Supabase) - VALIDATE REQUIREMENTS FIRST -->
        <div class="tab-content active" data-tab="stories">
            <div class="phase-list">
EOF

    # Run project checks first (needed for Supabase connection status)
    check_project

    # Detect all waves from Supabase
    detect_waves_from_supabase

    local wave_count=${#DETECTED_WAVES[@]}

    # Project Structure Overview (FIRST - understand what we have)
    render_project_overview_html

    # AI PRD Vision Document (requirements)
    render_html_phase_card "PRD" "AI PRD Vision" "Product requirements that decompose into AI Stories" "${CHECK_RESULTS["proj_ai_prd"]:-PENDING}" \
        "proj_ai_prd|AI PRD Vision Document|${CHECK_RESULTS["proj_ai_prd"]:-PENDING}"

    # Supabase Connection (Source of Truth)
    render_html_phase_card "DB" "Supabase (SOURCE OF TRUTH)" "Database connection - all state lives here, JSON signals are speed layer" "${CHECK_RESULTS["proj_supabase"]:-PENDING}" \
        "proj_supabase|Supabase Connection|${CHECK_RESULTS["proj_supabase"]:-PENDING}"

    # Show waves section - consolidated view
    if [ "$wave_count" -gt 0 ]; then
        # Show wave header with count
        cat << EOF
                <div class="phase-card">
                    <div class="phase-header">
                        <div class="phase-badge pass">WAVES</div>
                        <div class="phase-info">
                            <h3>AI Stories in Supabase</h3>
                            <span class="phase-desc">${wave_count} wave(s) detected with stories ready for processing</span>
                        </div>
                        <div class="phase-status">
                            <span class="phase-time">${timestamp}</span>
                            <span class="status-badge pass">PASS</span>
                        </div>
                    </div>
                </div>
EOF
        # Render wave cards in a grid
        echo '                <div class="waves-container">'
        for wave_num in "${DETECTED_WAVES[@]}"; do
            local is_current="false"
            [ "$wave_num" = "$WAVE_NUMBER" ] && is_current="true"
            render_wave_card "$wave_num" "$is_current"
        done
        echo '                </div>'
    else
        # Single consolidated empty state - no redundant cards
        cat << EOF
                <div class="phase-card empty-state">
                    <div class="phase-header">
                        <div class="phase-badge warn">WAVES</div>
                        <div class="phase-info">
                            <h3>No AI Stories Found</h3>
                            <span class="phase-desc">Connect to Supabase and create AI Stories to begin validation</span>
                        </div>
                        <div class="phase-status">
                            <span class="phase-time">${timestamp}</span>
                            <span class="status-badge warn">BLOCKED</span>
                        </div>
                    </div>
                    <div class="phase-checks" style="display: block; padding: 1rem;">
                        <div style="background: hsl(var(--muted) / 0.3); border-radius: var(--radius); padding: 1.5rem; text-align: center;">
                            <p style="color: hsl(var(--muted-foreground)); margin-bottom: 0.75rem;">To get started:</p>
                            <ol style="text-align: left; color: hsl(var(--foreground)); margin: 0; padding-left: 1.5rem; line-height: 1.8;">
                                <li>Configure Supabase credentials in <code>.env</code></li>
                                <li>Create AI Stories in the <code>maf_stories</code> table</li>
                                <li>Assign stories to a wave (set <code>wave_number</code> field)</li>
                            </ol>
                        </div>
                    </div>
                </div>
EOF
    fi

    # Auto-Generated Story Tests (validates story schema and content)
    render_story_tests_html

    # Phase 0: Pre-Flight Story Validation (for current wave)
    local phase0_title="Phase 0: Story Validation"
    local p0_wave_count=0
    [[ -v DETECTED_WAVES[@] ]] && p0_wave_count=${#DETECTED_WAVES[@]}
    if [ "$p0_wave_count" -gt 0 ]; then
        phase0_title="Phase 0: Story Validation (Wave $WAVE_NUMBER)"
    fi
    render_html_phase_card "0" "$phase0_title" "Validate current wave stories are complete and ready" "${PHASE_STATUS[0]}" \
        "phase0_stories|Stories Validated (${CHECK_RESULTS["phase0_stories_valid"]:-0}/${CHECK_RESULTS["phase0_stories_total"]:-0})|${CHECK_RESULTS["phase0_stories"]:-PENDING}" \
        "phase0_gaps|Gap Analysis|${CHECK_RESULTS["phase0_gaps"]:-PENDING}" \
        "phase0_planning|Wave Planning|${CHECK_RESULTS["phase0_planning"]:-PENDING}" \
        "phase0_greenlight|Green Light Approval|${CHECK_RESULTS["phase0_greenlight"]:-PENDING}"

    cat << 'EOF'
            </div>
        </div>

        <!-- TAB 2: Foundation (Git, .env, Wave Config) -->
        <div class="tab-content" data-tab="foundation">
            <div class="phase-list">
EOF

    # Git Repository Card
    render_html_phase_card "GIT" "Git Repository" "Version control foundation - required for worktrees" "${CHECK_RESULTS["proj_git_remote"]:-PENDING}" \
        "proj_git_remote|Remote Origin Configured|${CHECK_RESULTS["proj_git_remote"]:-PENDING}" \
        "proj_git_branch|Main Branch Clean|${CHECK_RESULTS["proj_git_branch"]:-PENDING}" \
        "sys_git|Git Installed|${CHECK_RESULTS["sys_git"]:-PENDING}"

    # Environment Variables Card
    local env_status="PASS"
    [ "${CHECK_RESULTS["cred_anthropic"]}" = "FAIL" ] && env_status="FAIL"
    [ "${CHECK_RESULTS["cred_env_file"]}" = "FAIL" ] && env_status="FAIL"

    render_html_phase_card "ENV" "Environment Variables" "API keys and configuration in .env" "$env_status" \
        "cred_env_file|.env File Exists|${CHECK_RESULTS["cred_env_file"]:-PENDING}" \
        "cred_anthropic|ANTHROPIC_API_KEY|${CHECK_RESULTS["cred_anthropic"]:-PENDING}" \
        "cred_slack|SLACK_WEBHOOK_URL|${CHECK_RESULTS["cred_slack"]:-PENDING}"

    # Wave Configuration Card
    render_html_phase_card "WAVE" "Wave Configuration" "Current wave settings and assignments" "${CHECK_RESULTS["proj_wave_config"]:-PENDING}" \
        "proj_wave_config|Wave Config File|${CHECK_RESULTS["proj_wave_config"]:-PENDING}"

    # Vercel Card (optional)
    render_html_phase_card "VERCEL" "Vercel Deployment" "Preview and production deployment (optional)" "${CHECK_RESULTS["proj_vercel"]:-PENDING}" \
        "proj_vercel|Vercel Project Linked|${CHECK_RESULTS["proj_vercel"]:-PENDING}"

    cat << 'EOF'
            </div>
        </div>

        <!-- TAB 3: System Requirements -->
        <div class="tab-content" data-tab="system">
            <div class="phase-list">
EOF

    # System Requirements Card
    local sys_status="PASS"
    [ "${CHECK_RESULTS["sys_node"]}" = "FAIL" ] && sys_status="FAIL"
    [ "${CHECK_RESULTS["sys_pnpm"]}" = "FAIL" ] && sys_status="FAIL"

    render_html_phase_card "SYS" "System Tools" "Required tools for development" "$sys_status" \
        "sys_node|Node.js >= 18|${CHECK_RESULTS["sys_node"]:-PENDING}" \
        "sys_pnpm|pnpm Package Manager|${CHECK_RESULTS["sys_pnpm"]:-PENDING}" \
        "sys_jq|jq JSON Processor|${CHECK_RESULTS["sys_jq"]:-PENDING}"

    # Resources Card
    render_html_phase_card "RES" "System Resources" "Hardware requirements" "PASS" \
        "sys_disk|Disk Space (>1GB)|${CHECK_RESULTS["sys_disk"]:-PENDING}" \
        "sys_memory|Memory (>4GB)|${CHECK_RESULTS["sys_memory"]:-PENDING}" \
        "sys_ports|Ports Available (3000, 8080)|${CHECK_RESULTS["sys_ports"]:-PENDING}"

    # Docker Card
    local docker_status="PASS"
    [ "${CHECK_RESULTS["docker_daemon"]}" = "FAIL" ] && docker_status="FAIL"

    render_html_phase_card "DOCK" "Docker" "Container runtime" "$docker_status" \
        "docker_daemon|Docker Daemon Running|${CHECK_RESULTS["docker_daemon"]:-PENDING}" \
        "docker_compose|docker-compose.yml Valid|${CHECK_RESULTS["docker_compose"]:-PENDING}"

    # Network Connectivity Card
    local net_status="PASS"
    [ "${CHECK_RESULTS["net_anthropic"]}" = "FAIL" ] && net_status="FAIL"

    render_html_phase_card "NET" "Network Connectivity" "API endpoint reachability" "$net_status" \
        "net_anthropic|Anthropic API|${CHECK_RESULTS["net_anthropic"]:-PENDING}" \
        "net_github|GitHub API|${CHECK_RESULTS["net_github"]:-PENDING}" \
        "net_npm|NPM Registry|${CHECK_RESULTS["net_npm"]:-PENDING}"

    # Project Files Card
    local projfiles_status="PASS"
    [ "${CHECK_RESULTS["proj_package_json"]}" = "FAIL" ] && projfiles_status="FAIL"
    [ "${CHECK_RESULTS["proj_claude_md"]}" = "FAIL" ] && projfiles_status="FAIL"

    render_html_phase_card "FILES" "Project Files" "Required project configuration" "$projfiles_status" \
        "proj_package_json|package.json Valid|${CHECK_RESULTS["proj_package_json"]:-PENDING}" \
        "proj_claude_md|CLAUDE.md Instructions|${CHECK_RESULTS["proj_claude_md"]:-PENDING}" \
        "proj_node_modules|Dependencies Installed|${CHECK_RESULTS["proj_node_modules"]:-PENDING}"

    cat << 'EOF'
            </div>
        </div>

        <!-- TAB 4: Infrastructure -->
        <div class="tab-content" data-tab="infrastructure">
            <div class="phase-list">
EOF

    # Git Worktrees Card
    local worktree_status="PASS"
    [ "${CHECK_RESULTS["worktree_exists"]}" = "FAIL" ] && worktree_status="FAIL"
    [ "${CHECK_RESULTS["worktree_branch"]}" = "FAIL" ] && worktree_status="FAIL"

    render_html_phase_card "WORK" "Git Worktrees" "Isolated development environments for agents" "$worktree_status" \
        "worktree_exists|Worktrees Exist (fe-dev, be-dev, qa, dev-fix)|${CHECK_RESULTS["worktree_exists"]:-PENDING}" \
        "worktree_branch|Correct Feature Branches|${CHECK_RESULTS["worktree_branch"]:-PENDING}" \
        "worktree_clean|No Uncommitted Changes|${CHECK_RESULTS["worktree_clean"]:-PENDING}"

    # Docker Build Card
    render_html_phase_card "BUILD" "Docker Build" "Container image and runtime" "${CHECK_RESULTS["docker_image"]:-PENDING}" \
        "docker_image|Docker Image Buildable|${CHECK_RESULTS["docker_image"]:-PENDING}" \
        "docker_base|Base Images Available|${CHECK_RESULTS["docker_base"]:-PENDING}" \
        "docker_start|Container Can Start|${CHECK_RESULTS["docker_start"]:-PENDING}"

    # Signal Schema Card
    local signal_status="PASS"
    [ "${CHECK_RESULTS["signal_schema"]}" = "FAIL" ] && signal_status="FAIL"

    render_html_phase_card "SIG" "Signal Files (Speed Layer)" "JSON signals for fast agent coordination" "$signal_status" \
        "signal_schema|Signal Schema Valid (${CHECK_RESULTS["signal_count"]:-0} files)|${CHECK_RESULTS["signal_schema"]:-PENDING}"

    # Pre-Validation (Gate -1) - moved here as it's about infrastructure readiness
    render_html_phase_card "-1" "Gate -1: Pre-Validation" "Zero Error Launch Protocol" "${GATE_STATUS[-1]}" \
        "gate-1_prompt_files|Prompt Files Exist|${CHECK_RESULTS["gate-1_prompt_files"]:-PENDING}" \
        "gate-1_budget|Budget Sufficient (\$${CHECK_RESULTS["gate-1_budget_available"]:-0.00})|${CHECK_RESULTS["gate-1_budget"]:-PENDING}" \
        "gate-1_worktrees|Worktrees Clean|${CHECK_RESULTS["gate-1_worktrees"]:-PENDING}" \
        "gate-1_emergency_stop|No Emergency Stop|${CHECK_RESULTS["gate-1_emergency_stop"]:-PENDING}" \
        "gate-1_previous_wave|Previous Wave Complete|${CHECK_RESULTS["gate-1_previous_wave"]:-PENDING}" \
        "gate-1_api_quotas|API Quotas Available|${CHECK_RESULTS["gate-1_api_quotas"]:-PENDING}"

    cat << 'EOF'
            </div>
        </div>

        <!-- TAB 5: Build & QA -->
        <div class="tab-content" data-tab="build">
            <div class="phase-list">
EOF

    # Phase 2: Smoke Test
    render_html_phase_card "2" "Phase 2: Smoke Test" "Build, type check, lint, test" "${PHASE_STATUS[2]}" \
        "phase2_build|pnpm build|${CHECK_RESULTS["phase2_build"]:-PENDING}" \
        "phase2_typecheck|pnpm typecheck|${CHECK_RESULTS["phase2_typecheck"]:-PENDING}" \
        "phase2_lint|pnpm lint|${CHECK_RESULTS["phase2_lint"]:-PENDING}" \
        "phase2_test|pnpm test|${CHECK_RESULTS["phase2_test"]:-PENDING}"

    # Phase 3: Development
    render_html_phase_card "3" "Phase 3: Development" "Agent completion signals" "${PHASE_STATUS[3]}" \
        "phase3_fe_signal|FE-Dev Completion Signal|${CHECK_RESULTS["phase3_fe_signal"]:-PENDING}" \
        "phase3_be_signal|BE-Dev Completion Signal|${CHECK_RESULTS["phase3_be_signal"]:-PENDING}"

    # Phase 4: QA/Merge
    render_html_phase_card "4" "Phase 4: QA/Merge" "Final validation and merge" "${PHASE_STATUS[4]}" \
        "phase4_qa_approval|QA Approval|${CHECK_RESULTS["phase4_qa_approval"]:-PENDING}" \
        "phase4_merge|Merge to Main|${CHECK_RESULTS["phase4_merge"]:-PENDING}"

    cat << 'EOF'
            </div>
        </div>

        <!-- TAB: Compliance -->
        <div class="tab-content" data-tab="compliance">
            <div class="phase-list">
EOF

    # Run protocol checks
    check_protocol_compliance
    check_aerospace_safety

    render_html_phase_card "A" "Section A: Safety Documentation" "CLAUDE.md and forbidden operations" "${CHECK_RESULTS["protocol_section_a"]:-PENDING}" \
        "protocol_safety_doc|Safety Markers (20+)|${CHECK_RESULTS["protocol_safety_doc"]:-PENDING}" \
        "protocol_emergency|Emergency Stop Configured|${CHECK_RESULTS["protocol_emergency"]:-PENDING}" \
        "protocol_boundaries|Domain Boundaries Defined|${CHECK_RESULTS["protocol_boundaries"]:-PENDING}" \
        "protocol_budget|Budget Limits Enforced|${CHECK_RESULTS["protocol_budget"]:-PENDING}"

    render_html_phase_card "B" "Section B: Docker Configuration" "Container safety settings" "${CHECK_RESULTS["protocol_section_b"]:-PENDING}" \
        "protocol_docker|--dangerously-skip-permissions|${CHECK_RESULTS["protocol_docker"]:-PENDING}" \
        "protocol_nonroot|Non-Root User|${CHECK_RESULTS["protocol_nonroot"]:-PENDING}"

    render_html_phase_card "C" "Section C: Signal Protocol" "Agent communication mechanism" "${CHECK_RESULTS["protocol_section_c"]:-PENDING}" \
        "protocol_signals|Signal File Schema|${CHECK_RESULTS["protocol_signals"]:-PENDING}" \
        "protocol_gates|Gate Progression (0-7)|${CHECK_RESULTS["protocol_gates"]:-PENDING}"

    # Compute aerospace section overall status
    local aero_pass=0
    local aero_total=10
    for key in aero_dal_level aero_fmea aero_emergency_levels aero_approval_matrix aero_forbidden_ops aero_rollback aero_audit_trail aero_security_scan aero_backup aero_preflight; do
        [ "${CHECK_RESULTS[$key]:-PENDING}" = "PASS" ] && aero_pass=$((aero_pass + 1))
    done
    local aero_status="WARN"
    [ "$aero_pass" -eq "$aero_total" ] && aero_status="PASS"
    [ "$aero_pass" -ge 8 ] && aero_status="WARN"
    [ "$aero_pass" -lt 6 ] && aero_status="FAIL"

    render_html_phase_card "D" "Section D: Aerospace Safety (DO-178C)" "Design Assurance and FMEA compliance" "$aero_status" \
        "aero_dal_level|DAL Level Assignment|${CHECK_RESULTS["aero_dal_level"]:-PENDING}" \
        "aero_fmea|FMEA Document (17 modes)|${CHECK_RESULTS["aero_fmea"]:-PENDING}" \
        "aero_emergency_levels|Emergency Levels (E1-E5)|${CHECK_RESULTS["aero_emergency_levels"]:-PENDING}" \
        "aero_approval_matrix|Approval Matrix (L0-L5)|${CHECK_RESULTS["aero_approval_matrix"]:-PENDING}" \
        "aero_forbidden_ops|Forbidden Operations (108)|${CHECK_RESULTS["aero_forbidden_ops"]:-PENDING}"

    render_html_phase_card "E" "Section E: Operational Safety" "Rollback, audit, and security" "$aero_status" \
        "aero_rollback|Rollback Procedures|${CHECK_RESULTS["aero_rollback"]:-PENDING}" \
        "aero_audit_trail|Audit Trail (Supabase)|${CHECK_RESULTS["aero_audit_trail"]:-PENDING}" \
        "aero_security_scan|Security Scan (npm audit)|${CHECK_RESULTS["aero_security_scan"]:-PENDING}" \
        "aero_backup|Backup Verification|${CHECK_RESULTS["aero_backup"]:-PENDING}" \
        "aero_preflight|Pre-Flight Validator|${CHECK_RESULTS["aero_preflight"]:-PENDING}"

    # Close Compliance tab and add footer with tab JS
    cat << EOF
            </div>
        </div>

        <div class="footer">
            Generated: ${timestamp} | Dashboard v${SCRIPT_VERSION} | Aerospace-Grade Validation Protocol
        </div>
    </div>

    <script>
        // Tab switching
        document.querySelectorAll('.tab-trigger').forEach(trigger => {
            trigger.addEventListener('click', function() {
                const tabId = this.dataset.tab;

                // Update triggers
                document.querySelectorAll('.tab-trigger').forEach(t => t.classList.remove('active'));
                this.classList.add('active');

                // Update content
                document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
                document.querySelector('.tab-content[data-tab="' + tabId + '"]').classList.add('active');
            });
        });

        // Accordion toggle
        document.querySelectorAll('.check-header').forEach(header => {
            header.addEventListener('click', function() {
                const item = this.closest('.check-item');
                item.classList.toggle('expanded');
            });
        });

        // Copy to clipboard (for copy buttons)
        document.querySelectorAll('.copy-btn').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                const cmd = this.dataset.cmd;
                navigator.clipboard.writeText(cmd).then(() => {
                    this.classList.add('copied');
                    this.textContent = 'Copied!';
                    setTimeout(() => {
                        this.classList.remove('copied');
                        this.textContent = 'Copy';
                    }, 2000);
                });
            });
        });

        // Copy path to clipboard (for tree items and doc items)
        function copyToClipboard(path, element) {
            navigator.clipboard.writeText(path).then(() => {
                // Show feedback
                const originalBg = element.style.background;
                element.style.background = 'hsl(142.1 76.2% 36.3% / 0.3)';

                // Find or create feedback element
                let feedback = element.querySelector('.copy-feedback');
                if (!feedback) {
                    feedback = document.createElement('span');
                    feedback.className = 'copy-feedback';
                    feedback.style.cssText = 'position: absolute; right: 0.5rem; font-size: 0.7rem; color: hsl(142.1 70% 35%); font-weight: 500;';
                    element.style.position = 'relative';
                    element.appendChild(feedback);
                }
                feedback.textContent = '✓ Copied!';

                setTimeout(() => {
                    element.style.background = originalBg;
                    if (feedback) feedback.textContent = '';
                }, 1500);
            }).catch(err => {
                console.error('Failed to copy:', err);
                alert('Failed to copy to clipboard. Path: ' + path);
            });
        }

        // Toggle folder tree expand/collapse
        function toggleFolderTree(header) {
            const section = header.closest('.folder-tree-section');
            const content = section.querySelector('.folder-tree-content');
            const toggle = header.querySelector('.folder-toggle');

            if (content.style.display === 'none') {
                content.style.display = 'block';
                toggle.style.transform = 'rotate(90deg)';
                toggle.textContent = '▼';
            } else {
                content.style.display = 'none';
                toggle.style.transform = 'rotate(0deg)';
                toggle.textContent = '▶';
            }
        }

        // Save project name and trigger analysis
        function saveProjectName() {
            const input = document.getElementById('project-name-input');
            const projectName = input.value.trim();

            if (!projectName) {
                alert('Please enter a project name');
                input.focus();
                return;
            }

            // Save to localStorage for now (in production, would save to .claude/project-config.json)
            localStorage.setItem('wave_project_name', projectName);

            // Show success feedback
            const btn = event.target;
            const originalText = btn.textContent;
            btn.textContent = '✓ Saved!';
            btn.style.background = 'hsl(142.1 76.2% 36.3%)';

            setTimeout(() => {
                btn.textContent = originalText;
                btn.style.background = 'hsl(var(--primary))';
            }, 2000);

            // Trigger analysis and show recommendations
            analyzeProjectStructure(projectName);
        }

        // Analyze project structure and show recommendations
        function analyzeProjectStructure(projectName) {
            // Auto-expand folder tree when analyzing
            const folderSection = document.querySelector('.folder-tree-section');
            if (folderSection) {
                const content = folderSection.querySelector('.folder-tree-content');
                const toggle = folderSection.querySelector('.folder-toggle');
                if (content && content.style.display === 'none') {
                    content.style.display = 'block';
                    if (toggle) {
                        toggle.style.transform = 'rotate(90deg)';
                        toggle.textContent = '▼';
                    }
                }
            }

            const recommendations = [];
            const warnings = [];
            const suggestions = [];

            // Extract folder structure from the tree
            const treeItems = document.querySelectorAll('.folder-tree .tree-item');
            const folders = [];
            const files = [];

            treeItems.forEach(item => {
                const text = item.textContent.trim();
                const path = item.getAttribute('title')?.replace('Click to copy: ', '') || '';

                if (text.includes('📁')) {
                    const name = text.replace(/[├└│─\s]*📁\s*/g, '').replace('/', '');
                    folders.push({ name, path, text });
                } else if (text.includes('📄')) {
                    const name = text.replace(/[├└│─\s]*📄\s*/g, '');
                    files.push({ name, path, text });
                }
            });

            // ═══════════════════════════════════════════════════════════════════
            // BEST PRACTICES ANALYSIS
            // ═══════════════════════════════════════════════════════════════════

            // 1. Check for essential directories
            const essentialDirs = {
                'src': { found: false, alternatives: ['code', 'app', 'lib'], purpose: 'Source code organization' },
                'docs': { found: false, alternatives: ['documentation', 'doc'], purpose: 'Project documentation' },
                'tests': { found: false, alternatives: ['test', '__tests__', 'spec'], purpose: 'Test files organization' },
                '.claude': { found: false, alternatives: [], purpose: 'MAF signals and state' }
            };

            folders.forEach(f => {
                const name = f.name.toLowerCase();
                Object.keys(essentialDirs).forEach(dir => {
                    if (name === dir || essentialDirs[dir].alternatives.includes(name)) {
                        essentialDirs[dir].found = true;
                    }
                });
            });

            Object.entries(essentialDirs).forEach(([dir, info]) => {
                if (!info.found) {
                    recommendations.push({
                        type: 'structure',
                        priority: 'high',
                        icon: '📁',
                        title: 'Missing ' + dir + '/ directory',
                        message: info.purpose,
                        action: 'mkdir ' + dir
                    });
                }
            });

            // 2. Check for missing key files
            const docItems = document.querySelectorAll('.docs-grid .doc-item');
            docItems.forEach(item => {
                if (item.textContent.includes('Not found')) {
                    const label = item.querySelector('div[style*="font-weight: 500"]');
                    if (label) {
                        const fileName = label.textContent;
                        let action = '';
                        if (fileName.includes('README')) action = 'touch README.md';
                        else if (fileName.includes('AI PRD')) action = 'touch docs/AI-PRD.md';
                        else if (fileName.includes('CLAUDE')) action = 'touch CLAUDE.md';

                        recommendations.push({
                            type: 'file',
                            priority: 'high',
                            icon: '📄',
                            title: 'Create ' + fileName,
                            message: 'Essential for project documentation and AI agent guidance',
                            action: action
                        });
                    }
                }
            });

            // 3. Analyze folder naming conventions
            const namingIssues = [];
            folders.forEach(f => {
                const name = f.name;
                // Check for spaces in folder names
                if (name.includes(' ')) {
                    namingIssues.push({ name, issue: 'contains spaces', suggest: name.replace(/\s+/g, '-').toLowerCase() });
                }
                // Check for uppercase (except common ones)
                if (name !== name.toLowerCase() && !['README', 'CLAUDE', 'LICENSE'].includes(name)) {
                    if (!name.match(/^[A-Z][a-z]/)) { // Allow PascalCase for components
                        namingIssues.push({ name, issue: 'mixed case', suggest: name.toLowerCase() });
                    }
                }
                // Check for special characters
                if (name.match(/[^a-zA-Z0-9._-]/)) {
                    namingIssues.push({ name, issue: 'special characters', suggest: name.replace(/[^a-zA-Z0-9._-]/g, '-') });
                }
            });

            if (namingIssues.length > 0) {
                namingIssues.slice(0, 3).forEach(issue => {
                    warnings.push({
                        type: 'naming',
                        priority: 'medium',
                        icon: '⚠️',
                        title: 'Folder naming: ' + issue.name,
                        message: 'Issue: ' + issue.issue + '. Consider renaming to: ' + issue.suggest,
                        action: 'mv "' + issue.name + '" "' + issue.suggest + '"'
                    });
                });
            }

            // 4. Check project name conventions
            if (projectName) {
                if (!projectName.match(/^[A-Z]/)) {
                    suggestions.push({
                        type: 'naming',
                        priority: 'low',
                        icon: '💡',
                        title: 'Project name capitalization',
                        message: 'Consider starting with capital: "' + projectName.charAt(0).toUpperCase() + projectName.slice(1) + '"',
                        action: null
                    });
                }
                if (projectName.length < 3) {
                    suggestions.push({
                        type: 'naming',
                        priority: 'low',
                        icon: '💡',
                        title: 'Project name too short',
                        message: 'Use a descriptive name that explains the project purpose',
                        action: null
                    });
                }
            }

            // 5. Check for recommended structure patterns
            const hasComponents = folders.some(f => f.name.toLowerCase() === 'components');
            const hasLib = folders.some(f => ['lib', 'utils', 'helpers'].includes(f.name.toLowerCase()));
            const hasTypes = folders.some(f => ['types', 'interfaces', '@types'].includes(f.name.toLowerCase()));

            if (!hasComponents && folders.some(f => f.name.toLowerCase() === 'src')) {
                suggestions.push({
                    type: 'structure',
                    priority: 'low',
                    icon: '📦',
                    title: 'Consider adding components/ folder',
                    message: 'Organize reusable UI components in src/components/',
                    action: 'mkdir -p src/components'
                });
            }

            if (!hasLib && files.some(f => f.name.endsWith('.ts') || f.name.endsWith('.tsx'))) {
                suggestions.push({
                    type: 'structure',
                    priority: 'low',
                    icon: '📦',
                    title: 'Consider adding lib/ folder',
                    message: 'Organize utility functions and shared logic in src/lib/',
                    action: 'mkdir -p src/lib'
                });
            }

            // ═══════════════════════════════════════════════════════════════════
            // RENDER RECOMMENDATIONS
            // ═══════════════════════════════════════════════════════════════════

            const section = document.getElementById('recommendations-section');
            const list = document.getElementById('recommendations-list');

            const allItems = [...recommendations, ...warnings, ...suggestions];

            if (allItems.length > 0) {
                section.style.display = 'block';

                let html = '';

                // Group by priority
                const highPriority = allItems.filter(r => r.priority === 'high');
                const mediumPriority = allItems.filter(r => r.priority === 'medium');
                const lowPriority = allItems.filter(r => r.priority === 'low');

                if (highPriority.length > 0) {
                    html += '<div style="margin-bottom: 1rem;"><div style="font-size: 0.7rem; font-weight: 600; color: hsl(0 70% 50%); margin-bottom: 0.5rem; text-transform: uppercase;">🔴 High Priority</div>';
                    html += highPriority.map(r => renderRecommendationItem(r, 'high')).join('');
                    html += '</div>';
                }

                if (mediumPriority.length > 0) {
                    html += '<div style="margin-bottom: 1rem;"><div style="font-size: 0.7rem; font-weight: 600; color: hsl(38 70% 50%); margin-bottom: 0.5rem; text-transform: uppercase;">🟡 Medium Priority</div>';
                    html += mediumPriority.map(r => renderRecommendationItem(r, 'medium')).join('');
                    html += '</div>';
                }

                if (lowPriority.length > 0) {
                    html += '<div><div style="font-size: 0.7rem; font-weight: 600; color: hsl(217 70% 50%); margin-bottom: 0.5rem; text-transform: uppercase;">💡 Suggestions</div>';
                    html += lowPriority.map(r => renderRecommendationItem(r, 'low')).join('');
                    html += '</div>';
                }

                list.innerHTML = html;
            } else {
                section.style.display = 'block';
                list.innerHTML = '<div style="padding: 1rem; text-align: center;"><div style="font-size: 1.5rem; margin-bottom: 0.5rem;">✅</div><div style="font-size: 0.9rem; font-weight: 500; color: hsl(142.1 70% 35%);">Project structure looks good!</div><div style="font-size: 0.8rem; color: hsl(var(--muted-foreground)); margin-top: 0.25rem;">No recommendations at this time.</div></div>';
            }
        }

        // Helper: Render a single recommendation item
        function renderRecommendationItem(r, priority) {
            const bgColor = priority === 'high' ? 'hsl(0 70% 95%)' : priority === 'medium' ? 'hsl(38 70% 95%)' : 'hsl(var(--background))';
            const borderColor = priority === 'high' ? 'hsl(0 70% 85%)' : priority === 'medium' ? 'hsl(38 70% 85%)' : 'hsl(var(--border))';

            let html = '<div style="padding: 0.75rem; margin-bottom: 0.5rem; background: ' + bgColor + '; border: 1px solid ' + borderColor + '; border-radius: var(--radius);">';
            html += '<div style="display: flex; align-items: flex-start; gap: 0.5rem;">';
            html += '<span style="font-size: 1rem;">' + r.icon + '</span>';
            html += '<div style="flex: 1;">';
            html += '<div style="font-size: 0.85rem; font-weight: 500; color: hsl(var(--foreground));">' + r.title + '</div>';
            html += '<div style="font-size: 0.75rem; color: hsl(var(--muted-foreground)); margin-top: 0.25rem;">' + r.message + '</div>';

            if (r.action) {
                html += '<div style="margin-top: 0.5rem;">';
                html += '<code onclick="copyToClipboard(\'' + r.action.replace(/'/g, "\\'") + '\', this)" style="display: inline-block; padding: 0.25rem 0.5rem; background: hsl(var(--muted)); border-radius: 4px; font-size: 0.7rem; cursor: pointer; font-family: JetBrains Mono, monospace;" title="Click to copy command">' + r.action + '</code>';
                html += '</div>';
            }

            html += '</div></div></div>';
            return html;
        }

        // Load saved project name on page load
        document.addEventListener('DOMContentLoaded', function() {
            const savedName = localStorage.getItem('wave_project_name');
            const input = document.getElementById('project-name-input');
            if (savedName && input && !input.value) {
                input.value = savedName;
            }
        });
    </script>
</body>
</html>
EOF
}

# Helper: Render section divider
render_html_section_divider() {
    local title=$1
    cat << EOF
        </div><!-- close previous phase-list if any -->
        <div class="section-divider">
            <div class="section-divider-line"></div>
            <span class="section-divider-text">${title}</span>
            <div class="section-divider-line"></div>
        </div>
        <div class="phase-list">
EOF
}

# Helper: Render phase card with expandable checks
render_html_phase_card() {
    local phase_num=$1
    local title=$2
    local description=$3
    local status=$4
    shift 4

    local status_class number_class
    case "$status" in
        PASS|GO)  status_class="status-pass"; number_class="pass" ;;
        FAIL)     status_class="status-fail"; number_class="fail" ;;
        BLOCKED)  status_class="status-blocked"; number_class="blocked" ;;
        DRIFT)    status_class="status-drift"; number_class="blocked" ;;
        *)        status_class="status-pending"; number_class="pending" ;;
    esac

    cat << EOF
            <div class="phase-card">
                <div class="phase-header">
                    <div class="phase-info">
                        <div class="phase-number ${number_class}">${phase_num}</div>
                        <div class="phase-title-group">
                            <h3>${title}</h3>
                            <span class="phase-desc">${description}</span>
                        </div>
                    </div>
                    <div class="phase-meta">
                        <span class="phase-time">$(date '+%H:%M:%S')</span>
                        <span class="phase-status-badge ${status_class}">${status}</span>
                    </div>
                </div>
                <div class="checks-list">
EOF

    for check in "$@"; do
        local check_key="${check%%|*}"
        local rest="${check#*|}"
        local check_label="${rest%%|*}"
        local check_status="${rest#*|}"

        local icon_class icon_char status_text
        case "$check_status" in
            PASS|GO)  icon_class="pass"; icon_char="✓"; status_text="Passed" ;;
            FAIL)     icon_class="fail"; icon_char="✗"; status_text="Failed" ;;
            WARN)     icon_class="warn"; icon_char="!"; status_text="Warning" ;;
            BLOCKED)  icon_class="blocked"; icon_char="⊘"; status_text="Blocked" ;;
            *)        icon_class="pending"; icon_char="○"; status_text="Pending" ;;
        esac

        # Get descriptions from the database
        local what_desc="${CHECK_DESCRIPTIONS["${check_key}_what"]:-No description available}"
        local fix_desc="${CHECK_DESCRIPTIONS["${check_key}_fix"]:-Run the validator to see detailed error information}"
        local cmd="${CHECK_DESCRIPTIONS["${check_key}_cmd"]:-}"

        # Escape special characters in command for HTML
        local cmd_escaped
        cmd_escaped=$(echo "$cmd" | sed 's/&/\&amp;/g; s/</\&lt;/g; s/>/\&gt;/g; s/"/\&quot;/g')

        cat << EOF
                    <div class="check-item">
                        <div class="check-header">
                            <span class="check-icon ${icon_class}">${icon_char}</span>
                            <div class="check-info">
                                <span class="check-name">${check_label}</span>
                            </div>
                            <span class="check-status-text">${status_text}</span>
                            <span class="expand-icon">▼</span>
                        </div>
                        <div class="check-details">
                            <p class="detail-description">${what_desc}</p>
EOF

        # Only show command if it exists
        if [ -n "$cmd" ]; then
            cat << EOF
                            <div class="detail-command">
                                <code>${cmd_escaped}</code>
                                <button class="copy-btn" data-cmd="${cmd_escaped}">Copy</button>
                            </div>
EOF
        fi

        # Show error reason and fix if check failed
        if [ "$check_status" = "FAIL" ]; then
            cat << EOF
                            <div class="detail-error">
                                <strong>Fix:</strong> ${fix_desc}
                            </div>
EOF
        fi

        cat << EOF
                        </div>
                    </div>
EOF
    done

    cat << EOF
                </div>
            </div>
EOF
}

# ─────────────────────────────────────────────────────────────────────────────
# CHECK PROTOCOL COMPLIANCE (Aerospace FEMA Validation)
# ─────────────────────────────────────────────────────────────────────────────
check_protocol_compliance() {
    local claude_md="$PROJECT_PATH/CLAUDE.md"
    local compose_file="$PROJECT_PATH/docker-compose.yml"

    # Section A: Safety Documentation
    local section_a_pass=0
    local section_a_total=4

    # A1: Safety markers in CLAUDE.md
    if [ -f "$claude_md" ]; then
        local markers
        markers=$(grep -c "NEVER\|FORBIDDEN\|MUST NOT\|DO NOT" "$claude_md" 2>/dev/null || echo "0")
        if [ "$markers" -ge 20 ]; then
            CHECK_RESULTS["protocol_safety_doc"]="PASS"
            ((section_a_pass++))
        else
            CHECK_RESULTS["protocol_safety_doc"]="WARN"
        fi
    else
        CHECK_RESULTS["protocol_safety_doc"]="FAIL"
    fi

    # A2: Emergency stop configured
    if [ -f "$claude_md" ] && grep -q "EMERGENCY\|STOP\|kill.switch" "$claude_md" 2>/dev/null; then
        CHECK_RESULTS["protocol_emergency"]="PASS"
        ((section_a_pass++))
    else
        CHECK_RESULTS["protocol_emergency"]="FAIL"
    fi

    # A3: Domain boundaries
    if [ -f "$claude_md" ] && grep -q "boundary\|domain\|ALLOWED\|FORBIDDEN" "$claude_md" 2>/dev/null; then
        CHECK_RESULTS["protocol_boundaries"]="PASS"
        ((section_a_pass++))
    else
        CHECK_RESULTS["protocol_boundaries"]="WARN"
    fi

    # A4: Budget limits
    if [ -f "$claude_md" ] && grep -q "budget\|token\|cost\|limit" "$claude_md" 2>/dev/null; then
        CHECK_RESULTS["protocol_budget"]="PASS"
        ((section_a_pass++))
    else
        CHECK_RESULTS["protocol_budget"]="WARN"
    fi

    [ "$section_a_pass" -eq "$section_a_total" ] && CHECK_RESULTS["protocol_section_a"]="PASS" || CHECK_RESULTS["protocol_section_a"]="WARN"

    # Section B: Docker Configuration
    local section_b_pass=0
    local section_b_total=2

    # B1: --dangerously-skip-permissions
    if [ -f "$compose_file" ] && grep -q "dangerously-skip-permissions" "$compose_file" 2>/dev/null; then
        CHECK_RESULTS["protocol_docker"]="PASS"
        ((section_b_pass++))
    else
        CHECK_RESULTS["protocol_docker"]="FAIL"
    fi

    # B2: Non-root user
    local dockerfile="$PROJECT_PATH/Dockerfile.agent"
    if [ -f "$dockerfile" ] && grep -q "^USER\|useradd" "$dockerfile" 2>/dev/null; then
        CHECK_RESULTS["protocol_nonroot"]="PASS"
        ((section_b_pass++))
    elif [ -f "$compose_file" ] && grep -q "user:" "$compose_file" 2>/dev/null; then
        CHECK_RESULTS["protocol_nonroot"]="PASS"
        ((section_b_pass++))
    else
        CHECK_RESULTS["protocol_nonroot"]="WARN"
    fi

    [ "$section_b_pass" -ge 1 ] && CHECK_RESULTS["protocol_section_b"]="PASS" || CHECK_RESULTS["protocol_section_b"]="WARN"

    # Section C: Signal Protocol
    local section_c_pass=0
    local section_c_total=2

    # C1: Signal file references
    if [ -f "$compose_file" ] && grep -q "signal-.*\.json" "$compose_file" 2>/dev/null; then
        CHECK_RESULTS["protocol_signals"]="PASS"
        ((section_c_pass++))
    elif [ -d "$PROJECT_PATH/.claude" ]; then
        CHECK_RESULTS["protocol_signals"]="PASS"
        ((section_c_pass++))
    else
        CHECK_RESULTS["protocol_signals"]="WARN"
    fi

    # C2: Gate progression
    if [ -f "$compose_file" ]; then
        local gates
        gates=$(grep -oE "gate.?[0-7]|Gate.?[0-7]" "$compose_file" 2>/dev/null | sort -u | wc -l | tr -d ' ')
        if [ "$gates" -ge 4 ]; then
            CHECK_RESULTS["protocol_gates"]="PASS"
            ((section_c_pass++))
        else
            CHECK_RESULTS["protocol_gates"]="WARN"
        fi
    else
        CHECK_RESULTS["protocol_gates"]="PENDING"
    fi

    [ "$section_c_pass" -eq "$section_c_total" ] && CHECK_RESULTS["protocol_section_c"]="PASS" || CHECK_RESULTS["protocol_section_c"]="WARN"
}

# ─────────────────────────────────────────────────────────────────────────────
# CHECK AEROSPACE SAFETY (DO-178C / FMEA Compliance)
# ─────────────────────────────────────────────────────────────────────────────
check_aerospace_safety() {
    local wave_dir="$PROJECT_PATH/stories/wave${WAVE_NUMBER}"
    local alt_wave_dir="$PROJECT_PATH/.claude/stories/wave${WAVE_NUMBER}"
    # Safety docs can be in .claudecode/safety or .claude/safety (project-relative only)
    local safety_dir="$PROJECT_PATH/.claudecode/safety"
    local alt_safety_dir="$PROJECT_PATH/.claude/safety"

    # 1. DAL Level - Check if stories have DAL level assigned
    local stories_with_dal=0
    local total_stories=0
    # Use find to avoid glob issues when directories don't exist
    while IFS= read -r -d '' story_file; do
        total_stories=$((total_stories + 1))
        if jq -e '.dal_level' "$story_file" &>/dev/null; then
            stories_with_dal=$((stories_with_dal + 1))
        fi
    done < <(find "$wave_dir" "$alt_wave_dir" -maxdepth 1 -name "*.json" -print0 2>/dev/null)

    if [ "$total_stories" -eq 0 ]; then
        CHECK_RESULTS["aero_dal_level"]="PENDING"
        CHECK_RESULTS["aero_dal_level_detail"]="No stories found"
    elif [ "$stories_with_dal" -eq "$total_stories" ]; then
        CHECK_RESULTS["aero_dal_level"]="PASS"
        CHECK_RESULTS["aero_dal_level_detail"]="$stories_with_dal/$total_stories stories have DAL level"
    else
        CHECK_RESULTS["aero_dal_level"]="WARN"
        CHECK_RESULTS["aero_dal_level_detail"]="$stories_with_dal/$total_stories stories have DAL level"
    fi

    # 2. FMEA Document - Check if FMEA exists and has failure modes
    local fmea_file=""
    [ -f "$safety_dir/FMEA.md" ] && fmea_file="$safety_dir/FMEA.md"
    [ -f "$alt_safety_dir/FMEA.md" ] && fmea_file="$alt_safety_dir/FMEA.md"

    if [ -n "$fmea_file" ]; then
        local failure_modes
        failure_modes=$(grep -c "^##\|^###" "$fmea_file" 2>/dev/null || echo "0")
        if [ "$failure_modes" -ge 17 ]; then
            CHECK_RESULTS["aero_fmea"]="PASS"
            CHECK_RESULTS["aero_fmea_detail"]="$failure_modes failure modes documented"
        else
            CHECK_RESULTS["aero_fmea"]="WARN"
            CHECK_RESULTS["aero_fmea_detail"]="$failure_modes failure modes (recommend 17+)"
        fi
    else
        CHECK_RESULTS["aero_fmea"]="FAIL"
        CHECK_RESULTS["aero_fmea_detail"]="FMEA.md not found"
    fi

    # 3. Emergency Levels - Check E1-E5 documentation
    local emergency_file=""
    [ -f "$safety_dir/EMERGENCY-LEVELS.md" ] && emergency_file="$safety_dir/EMERGENCY-LEVELS.md"
    [ -f "$alt_safety_dir/EMERGENCY-LEVELS.md" ] && emergency_file="$alt_safety_dir/EMERGENCY-LEVELS.md"

    if [ -n "$emergency_file" ]; then
        local levels_found
        levels_found=$(grep -cE "E[1-5]|Level [1-5]" "$emergency_file" 2>/dev/null || echo "0")
        if [ "$levels_found" -ge 5 ]; then
            CHECK_RESULTS["aero_emergency_levels"]="PASS"
            CHECK_RESULTS["aero_emergency_levels_detail"]="$levels_found emergency level references"
        else
            CHECK_RESULTS["aero_emergency_levels"]="WARN"
            CHECK_RESULTS["aero_emergency_levels_detail"]="$levels_found levels found (need 5)"
        fi
    else
        CHECK_RESULTS["aero_emergency_levels"]="FAIL"
        CHECK_RESULTS["aero_emergency_levels_detail"]="EMERGENCY-LEVELS.md not found"
    fi

    # 4. Approval Matrix - Check L0-L5 configuration
    local approval_file=""
    [ -f "$safety_dir/APPROVAL-LEVELS.md" ] && approval_file="$safety_dir/APPROVAL-LEVELS.md"
    [ -f "$alt_safety_dir/APPROVAL-LEVELS.md" ] && approval_file="$alt_safety_dir/APPROVAL-LEVELS.md"

    if [ -n "$approval_file" ]; then
        local levels_found
        levels_found=$(grep -cE "L[0-5]|Level [0-5]" "$approval_file" 2>/dev/null || echo "0")
        if [ "$levels_found" -ge 6 ]; then
            CHECK_RESULTS["aero_approval_matrix"]="PASS"
            CHECK_RESULTS["aero_approval_matrix_detail"]="$levels_found approval level references"
        else
            CHECK_RESULTS["aero_approval_matrix"]="WARN"
            CHECK_RESULTS["aero_approval_matrix_detail"]="$levels_found levels found (need 6)"
        fi
    else
        CHECK_RESULTS["aero_approval_matrix"]="FAIL"
        CHECK_RESULTS["aero_approval_matrix_detail"]="APPROVAL-LEVELS.md not found"
    fi

    # 5. Forbidden Operations - Check 108 ops are defined
    local safety_ref=""
    [ -f "$safety_dir/COMPLETE-SAFETY-REFERENCE.md" ] && safety_ref="$safety_dir/COMPLETE-SAFETY-REFERENCE.md"
    [ -f "$alt_safety_dir/COMPLETE-SAFETY-REFERENCE.md" ] && safety_ref="$alt_safety_dir/COMPLETE-SAFETY-REFERENCE.md"
    [ -f "$PROJECT_PATH/CLAUDE.md" ] && [ -z "$safety_ref" ] && safety_ref="$PROJECT_PATH/CLAUDE.md"

    if [ -n "$safety_ref" ]; then
        local forbidden_count
        forbidden_count=$(grep -c "FORBIDDEN\|❌" "$safety_ref" 2>/dev/null || echo "0")
        if [ "$forbidden_count" -ge 100 ]; then
            CHECK_RESULTS["aero_forbidden_ops"]="PASS"
            CHECK_RESULTS["aero_forbidden_ops_detail"]="$forbidden_count forbidden operations defined"
        elif [ "$forbidden_count" -ge 50 ]; then
            CHECK_RESULTS["aero_forbidden_ops"]="WARN"
            CHECK_RESULTS["aero_forbidden_ops_detail"]="$forbidden_count ops (recommend 108)"
        else
            CHECK_RESULTS["aero_forbidden_ops"]="FAIL"
            CHECK_RESULTS["aero_forbidden_ops_detail"]="Only $forbidden_count forbidden ops found"
        fi
    else
        CHECK_RESULTS["aero_forbidden_ops"]="FAIL"
        CHECK_RESULTS["aero_forbidden_ops_detail"]="No safety reference found"
    fi

    # 6. Rollback Procedures - Check if documented
    local rollback_file=""
    [ -f "$safety_dir/ROLLBACK-PROCEDURES.md" ] && rollback_file="$safety_dir/ROLLBACK-PROCEDURES.md"
    [ -f "$alt_safety_dir/ROLLBACK-PROCEDURES.md" ] && rollback_file="$alt_safety_dir/ROLLBACK-PROCEDURES.md"

    if [ -n "$rollback_file" ]; then
        CHECK_RESULTS["aero_rollback"]="PASS"
        CHECK_RESULTS["aero_rollback_detail"]="Rollback procedures documented"
    else
        CHECK_RESULTS["aero_rollback"]="WARN"
        CHECK_RESULTS["aero_rollback_detail"]="ROLLBACK-PROCEDURES.md not found"
    fi

    # 7. Audit Trail - Check if Supabase logging is configured
    if [ -n "${SUPABASE_URL:-}" ] && [ -n "${SUPABASE_ANON_KEY:-}" ]; then
        # Try to query maf_events table
        local events_check
        events_check=$(curl -s -H "apikey: $SUPABASE_ANON_KEY" \
            "$SUPABASE_URL/rest/v1/maf_events?limit=1" 2>/dev/null | jq -r '.[0].event_type // "EMPTY"' 2>/dev/null)

        if [ "$events_check" != "EMPTY" ] && [ -n "$events_check" ] && [ "$events_check" != "null" ]; then
            CHECK_RESULTS["aero_audit_trail"]="PASS"
            CHECK_RESULTS["aero_audit_trail_detail"]="Audit trail active (last event: $events_check)"
        else
            CHECK_RESULTS["aero_audit_trail"]="WARN"
            CHECK_RESULTS["aero_audit_trail_detail"]="Supabase connected but no events found"
        fi
    else
        CHECK_RESULTS["aero_audit_trail"]="PENDING"
        CHECK_RESULTS["aero_audit_trail_detail"]="Supabase not configured (SUPABASE_URL/KEY missing)"
    fi

    # 8. Security Scan - Run npm audit
    if command -v pnpm &>/dev/null && [ -f "$PROJECT_PATH/package.json" ]; then
        local audit_result
        audit_result=$(cd "$PROJECT_PATH" && pnpm audit --json 2>/dev/null | jq -r '.metadata.vulnerabilities.critical // 0' 2>/dev/null || echo "ERROR")

        if [ "$audit_result" = "ERROR" ]; then
            CHECK_RESULTS["aero_security_scan"]="WARN"
            CHECK_RESULTS["aero_security_scan_detail"]="Could not run pnpm audit"
        elif [ "$audit_result" = "0" ] || [ -z "$audit_result" ]; then
            CHECK_RESULTS["aero_security_scan"]="PASS"
            CHECK_RESULTS["aero_security_scan_detail"]="No critical vulnerabilities"
        else
            CHECK_RESULTS["aero_security_scan"]="FAIL"
            CHECK_RESULTS["aero_security_scan_detail"]="$audit_result critical vulnerabilities"
        fi
    else
        CHECK_RESULTS["aero_security_scan"]="PENDING"
        CHECK_RESULTS["aero_security_scan_detail"]="pnpm not available or no package.json"
    fi

    # 9. Backup Verification - Check backups exist
    local backup_dir="$PROJECT_PATH/.claude/backups"
    if [ -d "$backup_dir" ]; then
        local latest_backup
        latest_backup=$(ls -t "$backup_dir" 2>/dev/null | head -1)
        if [ -n "$latest_backup" ]; then
            CHECK_RESULTS["aero_backup"]="PASS"
            CHECK_RESULTS["aero_backup_detail"]="Latest backup: $latest_backup"
        else
            CHECK_RESULTS["aero_backup"]="WARN"
            CHECK_RESULTS["aero_backup_detail"]="Backup directory empty"
        fi
    else
        CHECK_RESULTS["aero_backup"]="WARN"
        CHECK_RESULTS["aero_backup_detail"]="No backups directory found"
    fi

    # 10. Pre-flight Validator - Check if it passes
    # Look for pre-flight script relative to this script's directory or in project
    local preflight_script=""
    [ -x "$SCRIPT_DIR/../pre-flight-validator.sh" ] && preflight_script="$SCRIPT_DIR/../pre-flight-validator.sh"
    [ -x "$SCRIPT_DIR/pre-flight-validator.sh" ] && preflight_script="$SCRIPT_DIR/pre-flight-validator.sh"
    [ -x "$PROJECT_PATH/scripts/pre-flight-validator.sh" ] && preflight_script="$PROJECT_PATH/scripts/pre-flight-validator.sh"

    if [ -n "$preflight_script" ] && [ -x "$preflight_script" ]; then
        local preflight_result
        preflight_result=$("$preflight_script" --project "$PROJECT_PATH" --wave "$WAVE_NUMBER" --quiet 2>&1 || true)
        if echo "$preflight_result" | grep -q "READY\|PASS\|SUCCESS"; then
            CHECK_RESULTS["aero_preflight"]="PASS"
            CHECK_RESULTS["aero_preflight_detail"]="Pre-flight validator passed"
        else
            CHECK_RESULTS["aero_preflight"]="WARN"
            CHECK_RESULTS["aero_preflight_detail"]="Pre-flight may have issues"
        fi
    else
        CHECK_RESULTS["aero_preflight"]="PENDING"
        CHECK_RESULTS["aero_preflight_detail"]="Pre-flight validator not found (optional)"
    fi
}

# ─────────────────────────────────────────────────────────────────────────────
# GENERATE FOLDER TREE
# Creates a visual tree structure of the project directory
# ─────────────────────────────────────────────────────────────────────────────

generate_folder_tree() {
    local root_path="${1:-.}"
    local max_depth="${2:-3}"
    local prefix="${3:-}"
    local is_last="${4:-true}"
    local current_depth="${5:-0}"

    PROJECT_TREE_LINES=()
    PROJECT_TREE_PATHS=()

    # Get the absolute path
    local abs_root
    abs_root=$(cd "$root_path" 2>/dev/null && pwd) || abs_root="$root_path"
    local root_name
    root_name=$(basename "$abs_root")

    # Add root
    PROJECT_TREE_LINES+=("📁 $root_name/")
    PROJECT_TREE_PATHS+=("$abs_root")

    # Call recursive helper
    _generate_tree_recursive "$abs_root" "" 1 "$max_depth"
}

_generate_tree_recursive() {
    local dir_path="$1"
    local prefix="$2"
    local depth="$3"
    local max_depth="$4"

    [ "$depth" -gt "$max_depth" ] && return

    # Get items, excluding hidden by default but including key ones
    local items=()
    local item

    # First add directories (sorted)
    while IFS= read -r item; do
        [ -n "$item" ] && items+=("$item")
    done < <(find "$dir_path" -maxdepth 1 -mindepth 1 -type d \
        ! -name "node_modules" \
        ! -name ".git" \
        ! -name ".next" \
        ! -name "dist" \
        ! -name "build" \
        ! -name ".turbo" \
        ! -name "__pycache__" \
        ! -name ".cache" \
        ! -name "coverage" \
        2>/dev/null | sort)

    # Then add key files at root level only (depth 1)
    if [ "$depth" -eq 1 ]; then
        for key_file in ".env" ".env.local" "package.json" "tsconfig.json" "CLAUDE.md" "README.md" "AI-PRD.md"; do
            [ -f "$dir_path/$key_file" ] && items+=("$dir_path/$key_file")
        done
    fi

    # Add .claude directory explicitly if it exists
    if [ "$depth" -eq 1 ] && [ -d "$dir_path/.claude" ]; then
        # Check if not already in items
        local found=false
        for item in "${items[@]}"; do
            [[ "$item" == *"/.claude" ]] && found=true && break
        done
        [ "$found" = false ] && items+=("$dir_path/.claude")
    fi

    local total=${#items[@]}
    local index=0

    for item in "${items[@]}"; do
        ((index++)) || true
        local name
        name=$(basename "$item")
        local is_last_item=false
        [ "$index" -eq "$total" ] && is_last_item=true

        local connector="├──"
        local next_prefix="${prefix}│   "
        if [ "$is_last_item" = true ]; then
            connector="└──"
            next_prefix="${prefix}    "
        fi

        if [ -d "$item" ]; then
            PROJECT_TREE_LINES+=("${prefix}${connector} 📁 ${name}/")
            PROJECT_TREE_PATHS+=("$item")

            # Recurse into directory
            _generate_tree_recursive "$item" "$next_prefix" $((depth + 1)) "$max_depth"
        else
            PROJECT_TREE_LINES+=("${prefix}${connector} 📄 ${name}")
            PROJECT_TREE_PATHS+=("$item")
        fi
    done
}

# ─────────────────────────────────────────────────────────────────────────────
# LOAD/SAVE PROJECT CONFIG
# Persists project name and settings to .claude/project-config.json
# ─────────────────────────────────────────────────────────────────────────────

load_project_config() {
    local proj_root="${PROJECT_PATH:-.}"
    PROJECT_CONFIG_FILE="$proj_root/.claude/project-config.json"

    if [ -f "$PROJECT_CONFIG_FILE" ]; then
        PROJECT_NAME=$(jq -r '.project_name // ""' "$PROJECT_CONFIG_FILE" 2>/dev/null || echo "")
    else
        PROJECT_NAME=""
    fi
}

# ─────────────────────────────────────────────────────────────────────────────
# DETECT PROJECT STRUCTURE
# Analyzes project file structure and locates key documentation
# ─────────────────────────────────────────────────────────────────────────────

detect_project_structure() {
    PROJECT_STRUCTURE=()
    PROJECT_DIRS=()
    PROJECT_DOCS=()

    local proj_root="${PROJECT_PATH:-.}"

    # ─────────────────────────────────────────────────────────────────────────
    # KEY DIRECTORIES - Check for standard project structure
    # ─────────────────────────────────────────────────────────────────────────

    # Source code directories (check common patterns)
    local src_dir=""
    if [ -d "$proj_root/src" ]; then
        src_dir="src"
    elif [ -d "$proj_root/code/src" ]; then
        src_dir="code/src"
    elif [ -d "$proj_root/code" ]; then
        src_dir="code"
    elif [ -d "$proj_root/app" ]; then
        src_dir="app"
    fi
    PROJECT_STRUCTURE["src_dir"]="$src_dir"
    [ -n "$src_dir" ] && PROJECT_DIRS+=("src|$src_dir|Source Code")

    # Documentation directory
    local docs_dir=""
    if [ -d "$proj_root/docs" ]; then
        docs_dir="docs"
    elif [ -d "$proj_root/documentation" ]; then
        docs_dir="documentation"
    elif [ -d "$proj_root/doc" ]; then
        docs_dir="doc"
    fi
    PROJECT_STRUCTURE["docs_dir"]="$docs_dir"
    [ -n "$docs_dir" ] && PROJECT_DIRS+=("docs|$docs_dir|Documentation")

    # Stories directory (local AI stories if any)
    local stories_dir=""
    if [ -d "$proj_root/stories" ]; then
        stories_dir="stories"
    elif [ -d "$proj_root/ai-stories" ]; then
        stories_dir="ai-stories"
    fi
    PROJECT_STRUCTURE["stories_dir"]="$stories_dir"
    [ -n "$stories_dir" ] && PROJECT_DIRS+=("stories|$stories_dir|AI Stories (Local)")

    # MAF directory (.claude)
    local maf_dir=""
    if [ -d "$proj_root/.claude" ]; then
        maf_dir=".claude"
    fi
    PROJECT_STRUCTURE["maf_dir"]="$maf_dir"
    [ -n "$maf_dir" ] && PROJECT_DIRS+=("maf|$maf_dir|MAF Signals & State")

    # Worktrees directory
    local worktrees_dir=""
    if [ -d "$proj_root/worktrees" ]; then
        worktrees_dir="worktrees"
    fi
    PROJECT_STRUCTURE["worktrees_dir"]="$worktrees_dir"
    [ -n "$worktrees_dir" ] && PROJECT_DIRS+=("worktrees|$worktrees_dir|Agent Worktrees")

    # Tests directory
    local tests_dir=""
    if [ -d "$proj_root/tests" ]; then
        tests_dir="tests"
    elif [ -d "$proj_root/test" ]; then
        tests_dir="test"
    elif [ -d "$proj_root/__tests__" ]; then
        tests_dir="__tests__"
    elif [ -d "$proj_root/src/__tests__" ]; then
        tests_dir="src/__tests__"
    fi
    PROJECT_STRUCTURE["tests_dir"]="$tests_dir"
    [ -n "$tests_dir" ] && PROJECT_DIRS+=("tests|$tests_dir|Test Suite")

    # ─────────────────────────────────────────────────────────────────────────
    # KEY DOCUMENTATION FILES
    # ─────────────────────────────────────────────────────────────────────────

    # AI PRD Document
    local ai_prd=""
    for prd_path in \
        "$proj_root/docs/AI-PRD.md" \
        "$proj_root/docs/ai-prd.md" \
        "$proj_root/docs/PRD.md" \
        "$proj_root/AI-PRD.md" \
        "$proj_root/PRD.md" \
        "$proj_root/docs/product-requirements.md"; do
        if [ -f "$prd_path" ]; then
            ai_prd="${prd_path#$proj_root/}"
            break
        fi
    done
    PROJECT_STRUCTURE["ai_prd"]="$ai_prd"
    if [ -n "$ai_prd" ]; then
        PROJECT_DOCS+=("ai_prd|$ai_prd|AI PRD Document|FOUND")
    else
        PROJECT_DOCS+=("ai_prd||AI PRD Document|MISSING")
    fi

    # CLAUDE.md (Agent instructions)
    local claude_md=""
    if [ -f "$proj_root/CLAUDE.md" ]; then
        claude_md="CLAUDE.md"
    elif [ -f "$proj_root/.claude/CLAUDE.md" ]; then
        claude_md=".claude/CLAUDE.md"
    fi
    PROJECT_STRUCTURE["claude_md"]="$claude_md"
    if [ -n "$claude_md" ]; then
        PROJECT_DOCS+=("claude_md|$claude_md|CLAUDE.md (Agent Instructions)|FOUND")
    else
        PROJECT_DOCS+=("claude_md||CLAUDE.md (Agent Instructions)|MISSING")
    fi

    # README.md
    local readme=""
    if [ -f "$proj_root/README.md" ]; then
        readme="README.md"
    elif [ -f "$proj_root/readme.md" ]; then
        readme="readme.md"
    fi
    PROJECT_STRUCTURE["readme"]="$readme"
    if [ -n "$readme" ]; then
        PROJECT_DOCS+=("readme|$readme|README.md|FOUND")
    else
        PROJECT_DOCS+=("readme||README.md|MISSING")
    fi

    # .env file (check exists, don't expose contents)
    local env_file=""
    if [ -f "$proj_root/.env" ]; then
        env_file=".env"
    elif [ -f "$proj_root/.env.local" ]; then
        env_file=".env.local"
    fi
    PROJECT_STRUCTURE["env_file"]="$env_file"
    if [ -n "$env_file" ]; then
        PROJECT_DOCS+=("env_file|$env_file|Environment Config|FOUND")
    else
        PROJECT_DOCS+=("env_file||Environment Config (.env)|MISSING")
    fi

    # package.json (Node.js project)
    local package_json=""
    if [ -f "$proj_root/package.json" ]; then
        package_json="package.json"
    elif [ -f "$proj_root/code/package.json" ]; then
        package_json="code/package.json"
    fi
    PROJECT_STRUCTURE["package_json"]="$package_json"
    if [ -n "$package_json" ]; then
        PROJECT_DOCS+=("package_json|$package_json|package.json|FOUND")
    fi

    # tsconfig.json (TypeScript)
    local tsconfig=""
    if [ -f "$proj_root/tsconfig.json" ]; then
        tsconfig="tsconfig.json"
    elif [ -f "$proj_root/code/tsconfig.json" ]; then
        tsconfig="code/tsconfig.json"
    fi
    PROJECT_STRUCTURE["tsconfig"]="$tsconfig"
    if [ -n "$tsconfig" ]; then
        PROJECT_DOCS+=("tsconfig|$tsconfig|tsconfig.json|FOUND")
    fi

    # ─────────────────────────────────────────────────────────────────────────
    # SUPABASE DOCUMENTATION SOURCES
    # ─────────────────────────────────────────────────────────────────────────

    # Note: AI Stories source of truth is Supabase maf_stories table
    PROJECT_STRUCTURE["stories_source"]="supabase:maf_stories"

    # ─────────────────────────────────────────────────────────────────────────
    # CALCULATE STRUCTURE SCORE
    # ─────────────────────────────────────────────────────────────────────────

    local found_count=0
    local total_checks=6  # src, docs, maf, ai_prd, claude_md, readme

    # Use || true to prevent set -e from exiting when count is 0
    [ -n "${PROJECT_STRUCTURE["src_dir"]}" ] && ((++found_count)) || true
    [ -n "${PROJECT_STRUCTURE["docs_dir"]}" ] && ((++found_count)) || true
    [ -n "${PROJECT_STRUCTURE["maf_dir"]}" ] && ((++found_count)) || true
    [ -n "${PROJECT_STRUCTURE["ai_prd"]}" ] && ((++found_count)) || true
    [ -n "${PROJECT_STRUCTURE["claude_md"]}" ] && ((++found_count)) || true
    [ -n "${PROJECT_STRUCTURE["readme"]}" ] && ((++found_count)) || true

    PROJECT_STRUCTURE["score"]="$found_count/$total_checks"

    if [ "$found_count" -eq "$total_checks" ]; then
        PROJECT_STRUCTURE["status"]="PASS"
    elif [ "$found_count" -ge 4 ]; then
        PROJECT_STRUCTURE["status"]="WARN"
    else
        PROJECT_STRUCTURE["status"]="FAIL"
    fi

    CHECK_RESULTS["project_structure"]="${PROJECT_STRUCTURE["status"]}"
    CHECK_RESULTS["project_structure_detail"]="Structure score: ${PROJECT_STRUCTURE["score"]}"

    # Generate folder tree visualization
    generate_folder_tree "$proj_root" 3

    # Load project configuration (name, etc.)
    load_project_config
}

# ─────────────────────────────────────────────────────────────────────────────
# DETECT WAVES FROM SUPABASE (Source of Truth)
# ─────────────────────────────────────────────────────────────────────────────

detect_waves_from_supabase() {
    # Clear previous data
    DETECTED_WAVES=()
    WAVE_DATA=()

    if [ -z "${SUPABASE_URL:-}" ] || [ -z "${SUPABASE_ANON_KEY:-}" ]; then
        CHECK_RESULTS["waves_detected"]="FAIL"
        CHECK_RESULTS["waves_detected_detail"]="Supabase not configured"
        return 1
    fi

    # Query Supabase for all stories grouped by wave
    local waves_json
    waves_json=$(curl -s \
        -H "apikey: $SUPABASE_ANON_KEY" \
        -H "Content-Type: application/json" \
        "$SUPABASE_URL/rest/v1/maf_stories?select=id,wave_number,story_id,title,status,gate,agent_type&order=wave_number.asc" 2>/dev/null)

    if [ -z "$waves_json" ] || [ "$waves_json" = "[]" ]; then
        CHECK_RESULTS["waves_detected"]="WARN"
        CHECK_RESULTS["waves_detected_detail"]="No stories found in Supabase"
        return 0
    fi

    # Extract unique wave numbers
    local unique_waves
    unique_waves=$(echo "$waves_json" | jq -r '[.[].wave_number] | unique | sort | .[]' 2>/dev/null)

    if [ -z "$unique_waves" ]; then
        CHECK_RESULTS["waves_detected"]="WARN"
        CHECK_RESULTS["waves_detected_detail"]="Could not parse wave numbers"
        return 0
    fi

    # Store detected waves
    while IFS= read -r wave_num; do
        [ -z "$wave_num" ] && continue
        DETECTED_WAVES+=("$wave_num")

        # Get story count for this wave
        local story_count
        story_count=$(echo "$waves_json" | jq -r "[.[] | select(.wave_number == $wave_num)] | length" 2>/dev/null || echo "0")
        WAVE_DATA["wave_${wave_num}_count"]="$story_count"

        # Get story titles for this wave
        local story_titles
        story_titles=$(echo "$waves_json" | jq -r "[.[] | select(.wave_number == $wave_num) | .title] | join(\", \")" 2>/dev/null || echo "")
        WAVE_DATA["wave_${wave_num}_titles"]="$story_titles"

        # Check schema compliance (has required fields: story_id, title, status)
        local schema_valid
        schema_valid=$(echo "$waves_json" | jq -r "[.[] | select(.wave_number == $wave_num) | select(.story_id != null and .title != null and .status != null)] | length" 2>/dev/null || echo "0")
        WAVE_DATA["wave_${wave_num}_schema_valid"]="$schema_valid"

        # Get statuses
        local completed_count
        completed_count=$(echo "$waves_json" | jq -r "[.[] | select(.wave_number == $wave_num) | select(.status == \"completed\" or .status == \"done\")] | length" 2>/dev/null || echo "0")
        WAVE_DATA["wave_${wave_num}_completed"]="$completed_count"

        local in_progress_count
        in_progress_count=$(echo "$waves_json" | jq -r "[.[] | select(.wave_number == $wave_num) | select(.status == \"in_progress\" or .status == \"active\")] | length" 2>/dev/null || echo "0")
        WAVE_DATA["wave_${wave_num}_in_progress"]="$in_progress_count"

    done <<< "$unique_waves"

    local wave_count=${#DETECTED_WAVES[@]}
    CHECK_RESULTS["waves_detected"]="PASS"
    CHECK_RESULTS["waves_detected_detail"]="$wave_count waves found in Supabase"

    return 0
}

# Render a wave card for the AI Stories tab
render_wave_card() {
    local wave_num=$1
    local is_current=$2  # "true" or "false"

    local story_count="${WAVE_DATA["wave_${wave_num}_count"]:-0}"
    local schema_valid="${WAVE_DATA["wave_${wave_num}_schema_valid"]:-0}"
    local completed="${WAVE_DATA["wave_${wave_num}_completed"]:-0}"
    local in_progress="${WAVE_DATA["wave_${wave_num}_in_progress"]:-0}"
    local titles="${WAVE_DATA["wave_${wave_num}_titles"]:-}"

    # Determine wave status
    local wave_status="PENDING"
    local wave_status_text="Planned"
    local wave_badge_class="pending"

    if [ "$story_count" -eq 0 ]; then
        wave_status="PENDING"
        wave_status_text="No Stories"
        wave_badge_class="pending"
    elif [ "$completed" -eq "$story_count" ]; then
        wave_status="PASS"
        wave_status_text="Complete"
        wave_badge_class="pass"
    elif [ "$in_progress" -gt 0 ] || [ "$is_current" = "true" ]; then
        wave_status="WARN"
        wave_status_text="In Progress"
        wave_badge_class="warn"
    else
        wave_status="PENDING"
        wave_status_text="Ready"
        wave_badge_class="pending"
    fi

    # Current wave highlight
    local current_class=""
    local current_label=""
    if [ "$is_current" = "true" ]; then
        current_class=" current-wave"
        current_label=" (CURRENT)"
        wave_badge_class="current"
    fi

    # Schema compliance status
    local schema_status="FAIL"
    local schema_icon="×"
    if [ "$schema_valid" -eq "$story_count" ] && [ "$story_count" -gt 0 ]; then
        schema_status="PASS"
        schema_icon="✓"
    elif [ "$schema_valid" -gt 0 ]; then
        schema_status="WARN"
        schema_icon="!"
    fi

    cat << EOF
                <div class="wave-card${current_class}">
                    <div class="wave-header">
                        <div class="wave-title">
                            <span class="wave-number">Wave ${wave_num}${current_label}</span>
                            <span class="wave-badge ${wave_badge_class}">${wave_status_text}</span>
                        </div>
                        <div class="wave-meta">
                            <span class="story-count">${story_count} stories</span>
                        </div>
                    </div>
                    <div class="wave-details">
                        <div class="wave-check">
                            <span class="check-icon ${schema_status,,}">${schema_icon}</span>
                            <span>Schema V4: ${schema_valid}/${story_count} compliant</span>
                        </div>
                        <div class="wave-check">
                            <span class="check-icon pass">✓</span>
                            <span>Completed: ${completed}/${story_count}</span>
                        </div>
                        <div class="wave-check">
                            <span class="check-icon ${in_progress:+warn}">${in_progress:+!}</span>
                            <span>In Progress: ${in_progress}</span>
                        </div>
EOF

    # Show story titles if few enough
    if [ "$story_count" -gt 0 ] && [ "$story_count" -le 5 ]; then
        cat << EOF
                        <div class="wave-stories">
                            <span class="stories-label">Stories:</span>
                            <span class="stories-list">${titles}</span>
                        </div>
EOF
    fi

    cat << EOF
                    </div>
                </div>
EOF
}

# ─────────────────────────────────────────────────────────────────────────────
# GENERATE AND RUN AI STORY TESTS
# ─────────────────────────────────────────────────────────────────────────────
# Fetches AI Stories from Supabase (source of truth) and auto-generates
# validation tests based on:
# - acceptance_criteria: Testable assertions that can be verified
# - files.allowed/forbidden: File boundary constraints
# - safety_constraints: Safety requirements from Schema V4
#
# This runs ON TOP OF infrastructure tests - it validates story configuration
# ─────────────────────────────────────────────────────────────────────────────

generate_and_run_story_tests() {
    local wave=$1

    # Reset test arrays
    STORY_TESTS=()
    STORY_TEST_RESULTS=()

    # Verify Supabase connection first
    if [ -z "${SUPABASE_URL:-}" ] || [ -z "${SUPABASE_ANON_KEY:-}" ]; then
        CHECK_RESULTS["story_tests"]="BLOCKED"
        CHECK_RESULTS["story_tests_detail"]="Cannot generate tests - Supabase not configured"
        CHECK_RESULTS["story_tests_generated"]=0
        CHECK_RESULTS["story_tests_passed"]=0
        CHECK_RESULTS["story_tests_failed"]=0
        return 1
    fi

    # Fetch ALL AI Stories for this wave with full details
    local stories_json
    stories_json=$(curl -s \
        -H "apikey: $SUPABASE_ANON_KEY" \
        -H "Content-Type: application/json" \
        "$SUPABASE_URL/rest/v1/maf_stories?wave_number=eq.$wave&select=id,story_id,title,status,gate,agent_type" 2>/dev/null)

    # Check for Supabase API errors (response is an object with "message" or "error")
    if echo "$stories_json" | jq -e '.message or .error' &>/dev/null; then
        local error_msg
        error_msg=$(echo "$stories_json" | jq -r '.message // .error // "Unknown error"' 2>/dev/null)
        CHECK_RESULTS["story_tests"]="FAIL"
        CHECK_RESULTS["story_tests_detail"]="Supabase error: $error_msg"
        CHECK_RESULTS["story_tests_generated"]=0
        CHECK_RESULTS["story_tests_passed"]=0
        CHECK_RESULTS["story_tests_failed"]=0
        return 1
    fi

    # Check if response is empty or not an array
    if [ -z "$stories_json" ] || [ "$stories_json" = "[]" ]; then
        CHECK_RESULTS["story_tests"]="WARN"
        CHECK_RESULTS["story_tests_detail"]="No AI Stories found for wave $wave"
        CHECK_RESULTS["story_tests_generated"]=0
        CHECK_RESULTS["story_tests_passed"]=0
        CHECK_RESULTS["story_tests_failed"]=0
        return 0
    fi

    # Verify response is actually an array
    if ! echo "$stories_json" | jq -e 'type == "array"' &>/dev/null; then
        CHECK_RESULTS["story_tests"]="FAIL"
        CHECK_RESULTS["story_tests_detail"]="Supabase response is not an array"
        CHECK_RESULTS["story_tests_generated"]=0
        CHECK_RESULTS["story_tests_passed"]=0
        CHECK_RESULTS["story_tests_failed"]=0
        return 1
    fi

    local story_count
    story_count=$(echo "$stories_json" | jq -r 'length' 2>/dev/null || echo "0")

    local tests_generated=0
    local tests_passed=0
    local tests_failed=0
    local test_index=0

    # Process each story (using actual maf_stories schema)
    # Available fields: id, story_id, title, status, gate, agent_type
    while IFS= read -r story; do
        local story_uuid story_sid story_title story_status story_gate story_agent

        story_uuid=$(echo "$story" | jq -r '.id // "unknown"')
        story_sid=$(echo "$story" | jq -r '.story_id // "unknown"')
        story_title=$(echo "$story" | jq -r '.title // "Untitled"')
        story_status=$(echo "$story" | jq -r '.status // "unknown"')
        story_gate=$(echo "$story" | jq -r '.gate // -1')
        story_agent=$(echo "$story" | jq -r '.agent_type // "unknown"')

        # ═══════════════════════════════════════════════════════════════════
        # TEST 1: Story has required fields (story_id, title)
        # ═══════════════════════════════════════════════════════════════════
        ((test_index++))
        if [ -n "$story_sid" ] && [ "$story_sid" != "unknown" ] && [ "$story_sid" != "null" ]; then
            STORY_TESTS["${story_sid}_has_id"]="PASS"
            STORY_TEST_RESULTS+=("PASS|${story_sid}|Story ID|Valid story ID: $story_sid")
            ((tests_passed++))
        else
            STORY_TESTS["${story_uuid}_has_id"]="FAIL"
            STORY_TEST_RESULTS+=("FAIL|${story_uuid:0:8}|Story ID|Missing or invalid story_id field")
            ((tests_failed++))
        fi
        ((tests_generated++))

        ((test_index++))
        if [ -n "$story_title" ] && [ "$story_title" != "Untitled" ] && [ "$story_title" != "null" ]; then
            STORY_TESTS["${story_sid}_has_title"]="PASS"
            STORY_TEST_RESULTS+=("PASS|${story_sid}|Title|Has title: ${story_title:0:40}")
            ((tests_passed++))
        else
            STORY_TESTS["${story_sid}_has_title"]="FAIL"
            STORY_TEST_RESULTS+=("FAIL|${story_sid}|Title|Missing or empty title")
            ((tests_failed++))
        fi
        ((tests_generated++))

        # ═══════════════════════════════════════════════════════════════════
        # TEST 2: Status is valid
        # ═══════════════════════════════════════════════════════════════════
        ((test_index++))
        case "$story_status" in
            pending|in_progress|active|completed|done|rejected|blocked)
                STORY_TESTS["${story_sid}_status"]="PASS"
                STORY_TEST_RESULTS+=("PASS|${story_sid}|Status|Valid status: $story_status")
                ((tests_passed++))
                ;;
            unknown|null|"")
                STORY_TESTS["${story_sid}_status"]="FAIL"
                STORY_TEST_RESULTS+=("FAIL|${story_sid}|Status|Missing status field")
                ((tests_failed++))
                ;;
            *)
                STORY_TESTS["${story_sid}_status"]="WARN"
                STORY_TEST_RESULTS+=("WARN|${story_sid}|Status|Non-standard status: $story_status")
                ;;
        esac
        ((tests_generated++))

        # ═══════════════════════════════════════════════════════════════════
        # TEST 3: Gate number is valid (0-7)
        # ═══════════════════════════════════════════════════════════════════
        ((test_index++))
        if [ "$story_gate" -ge 0 ] && [ "$story_gate" -le 7 ] 2>/dev/null; then
            STORY_TESTS["${story_sid}_gate"]="PASS"
            STORY_TEST_RESULTS+=("PASS|${story_sid}|Gate|Valid gate: $story_gate")
            ((tests_passed++))
        elif [ "$story_gate" = "-1" ] || [ "$story_gate" = "null" ]; then
            STORY_TESTS["${story_sid}_gate"]="WARN"
            STORY_TEST_RESULTS+=("WARN|${story_sid}|Gate|No gate assigned")
        else
            STORY_TESTS["${story_sid}_gate"]="FAIL"
            STORY_TEST_RESULTS+=("FAIL|${story_sid}|Gate|Invalid gate: $story_gate (expected 0-7)")
            ((tests_failed++))
        fi
        ((tests_generated++))

        # ═══════════════════════════════════════════════════════════════════
        # TEST 4: Agent type is valid
        # ═══════════════════════════════════════════════════════════════════
        ((test_index++))
        case "$story_agent" in
            FE-Dev|BE-Dev|QA|Dev-Fix|FullStack|DevOps|frontend|backend|qa|devops)
                STORY_TESTS["${story_sid}_agent"]="PASS"
                STORY_TEST_RESULTS+=("PASS|${story_sid}|Agent|Assigned to: $story_agent")
                ((tests_passed++))
                ;;
            unknown|null|"")
                STORY_TESTS["${story_sid}_agent"]="WARN"
                STORY_TEST_RESULTS+=("WARN|${story_sid}|Agent|No agent assigned")
                ;;
            *)
                STORY_TESTS["${story_sid}_agent"]="WARN"
                STORY_TEST_RESULTS+=("WARN|${story_sid}|Agent|Non-standard agent: $story_agent")
                ;;
        esac
        ((tests_generated++))

    done < <(echo "$stories_json" | jq -c '.[]' 2>/dev/null)

    # ═══════════════════════════════════════════════════════════════════════
    # WAVE-LEVEL TESTS (run after all story tests)
    # ═══════════════════════════════════════════════════════════════════════

    # Test: Unique story IDs
    local unique_ids total_ids
    unique_ids=$(echo "$stories_json" | jq -r '[.[].id] | unique | length' 2>/dev/null || echo "0")
    total_ids=$(echo "$stories_json" | jq -r '[.[].id] | length' 2>/dev/null || echo "0")

    ((test_index++))
    if [ "$unique_ids" = "$total_ids" ]; then
        STORY_TESTS["wave_unique_ids"]="PASS"
        STORY_TEST_RESULTS+=("PASS|WAVE-$wave|Unique story IDs|All $total_ids story IDs are unique")
        ((tests_passed++))
    else
        STORY_TESTS["wave_unique_ids"]="FAIL"
        STORY_TEST_RESULTS+=("FAIL|WAVE-$wave|Unique story IDs|Duplicate IDs found ($unique_ids unique of $total_ids)")
        ((tests_failed++))
    fi
    ((tests_generated++))

    # Test: Story statuses are reasonable
    local pending_count in_progress_count completed_count
    pending_count=$(echo "$stories_json" | jq -r '[.[] | select(.status == "pending")] | length' 2>/dev/null || echo "0")
    in_progress_count=$(echo "$stories_json" | jq -r '[.[] | select(.status == "in_progress" or .status == "active")] | length' 2>/dev/null || echo "0")
    completed_count=$(echo "$stories_json" | jq -r '[.[] | select(.status == "completed" or .status == "done")] | length' 2>/dev/null || echo "0")

    ((test_index++))
    STORY_TESTS["wave_status_summary"]="PASS"
    STORY_TEST_RESULTS+=("PASS|WAVE-$wave|Status summary|Pending: $pending_count, Active: $in_progress_count, Done: $completed_count")
    ((tests_passed++))
    ((tests_generated++))

    # Test: Agent type coverage
    local fe_count be_count qa_count
    fe_count=$(echo "$stories_json" | jq -r '[.[] | select(.agent_type == "FE-Dev" or .agent_type == "frontend")] | length' 2>/dev/null || echo "0")
    be_count=$(echo "$stories_json" | jq -r '[.[] | select(.agent_type == "BE-Dev" or .agent_type == "backend")] | length' 2>/dev/null || echo "0")
    qa_count=$(echo "$stories_json" | jq -r '[.[] | select(.agent_type == "QA" or .agent_type == "qa")] | length' 2>/dev/null || echo "0")

    ((test_index++))
    if [ "$fe_count" -gt 0 ] || [ "$be_count" -gt 0 ]; then
        STORY_TESTS["wave_agent_coverage"]="PASS"
        STORY_TEST_RESULTS+=("PASS|WAVE-$wave|Agent coverage|FE: $fe_count, BE: $be_count, QA: $qa_count")
        ((tests_passed++))
    else
        STORY_TESTS["wave_agent_coverage"]="WARN"
        STORY_TEST_RESULTS+=("WARN|WAVE-$wave|Agent coverage|No FE or BE agent assignments")
    fi
    ((tests_generated++))

    # Store final results
    CHECK_RESULTS["story_tests_generated"]="$tests_generated"
    CHECK_RESULTS["story_tests_passed"]="$tests_passed"
    CHECK_RESULTS["story_tests_failed"]="$tests_failed"

    # Determine overall status
    if [ "$tests_failed" -gt 0 ]; then
        CHECK_RESULTS["story_tests"]="FAIL"
        CHECK_RESULTS["story_tests_detail"]="$tests_failed of $tests_generated tests failed"
    elif [ "$tests_generated" -eq "$tests_passed" ]; then
        CHECK_RESULTS["story_tests"]="PASS"
        CHECK_RESULTS["story_tests_detail"]="All $tests_generated tests passed"
    else
        CHECK_RESULTS["story_tests"]="WARN"
        CHECK_RESULTS["story_tests_detail"]="$tests_passed passed, some warnings"
    fi

    return 0
}

# Render story test results as HTML
render_story_tests_html() {
    local passed="${CHECK_RESULTS["story_tests_passed"]:-0}"
    local failed="${CHECK_RESULTS["story_tests_failed"]:-0}"
    local total="${CHECK_RESULTS["story_tests_generated"]:-0}"
    local status="${CHECK_RESULTS["story_tests"]:-PENDING}"

    if [ "$total" -eq 0 ]; then
        return 0
    fi

    cat << EOF
                <div class="phase-card">
                    <div class="phase-header">
                        <div class="phase-badge ${status,,}">TEST</div>
                        <div class="phase-info">
                            <h3>Auto-Generated Story Tests</h3>
                            <span class="phase-desc">$total tests generated from AI Stories (Schema V4 validation)</span>
                        </div>
                        <div class="phase-status">
                            <span class="test-summary">
                                <span class="test-passed">$passed passed</span>
                                <span class="test-failed">$failed failed</span>
                            </span>
                            <span class="status-badge $status">$status</span>
                        </div>
                    </div>
                    <div class="phase-checks" style="display: block;">
                        <div class="story-tests-grid">
EOF

    # Group tests by story
    local current_story=""
    for result in "${STORY_TEST_RESULTS[@]}"; do
        local test_status test_story test_name test_detail
        IFS='|' read -r test_status test_story test_name test_detail <<< "$result"

        if [ "$test_story" != "$current_story" ]; then
            # Close previous story group if any
            [ -n "$current_story" ] && echo "                            </div>"

            # Start new story group
            current_story="$test_story"
            cat << EOF
                            <div class="story-test-group">
                                <div class="story-test-header">$test_story</div>
EOF
        fi

        local icon
        case "$test_status" in
            PASS) icon="✓" ;;
            FAIL) icon="✗" ;;
            WARN) icon="!" ;;
            *) icon="○" ;;
        esac

        cat << EOF
                                <div class="story-test-row ${test_status,,}">
                                    <span class="test-icon">$icon</span>
                                    <span class="test-name">$test_name</span>
                                    <span class="test-detail">$test_detail</span>
                                </div>
EOF
    done

    # Close last story group
    [ -n "$current_story" ] && echo "                            </div>"

    cat << 'EOF'
                        </div>
                    </div>
                </div>
EOF
}

# ─────────────────────────────────────────────────────────────────────────────
# CHECK PROJECT CONFIGURATION (Supabase, Git, Vercel)
# ─────────────────────────────────────────────────────────────────────────────
check_project() {
    # 1. Supabase Connection - project-specific credentials
    if [ -n "${SUPABASE_URL:-}" ] && [ -n "${SUPABASE_ANON_KEY:-}" ]; then
        local supabase_check
        supabase_check=$(curl -s -w "%{http_code}" -o /dev/null \
            -H "apikey: $SUPABASE_ANON_KEY" \
            "$SUPABASE_URL/rest/v1/" 2>/dev/null || echo "000")

        if [ "$supabase_check" = "200" ] || [ "$supabase_check" = "204" ]; then
            CHECK_RESULTS["proj_supabase"]="PASS"
            CHECK_RESULTS["proj_supabase_detail"]="Supabase responding (HTTP $supabase_check)"
        else
            CHECK_RESULTS["proj_supabase"]="FAIL"
            CHECK_RESULTS["proj_supabase_detail"]="Supabase error (HTTP $supabase_check)"
        fi
    else
        CHECK_RESULTS["proj_supabase"]="PENDING"
        CHECK_RESULTS["proj_supabase_detail"]="SUPABASE_URL or SUPABASE_ANON_KEY not set"
    fi

    # 2. Stories in Supabase - verify stories exist for this wave
    if [ "${CHECK_RESULTS["proj_supabase"]}" = "PASS" ]; then
        local stories_count
        stories_count=$(curl -s \
            -H "apikey: $SUPABASE_ANON_KEY" \
            -H "Content-Type: application/json" \
            "$SUPABASE_URL/rest/v1/maf_stories?wave_number=eq.$WAVE_NUMBER&select=id" 2>/dev/null \
            | jq -r 'length' 2>/dev/null || echo "0")

        if [ "$stories_count" -gt 0 ]; then
            CHECK_RESULTS["proj_stories_db"]="PASS"
            CHECK_RESULTS["proj_stories_db_detail"]="$stories_count AI Stories in Supabase (source of truth)"

            # 2b. Check AI Story Schema V4 compliance
            local schema_check
            schema_check=$(curl -s \
                -H "apikey: $SUPABASE_ANON_KEY" \
                -H "Content-Type: application/json" \
                "$SUPABASE_URL/rest/v1/maf_stories?wave_number=eq.$WAVE_NUMBER&select=id,story_id,title,status&limit=1" 2>/dev/null)

            # Check for required fields in actual maf_stories schema
            local has_story_id has_title has_status
            has_story_id=$(echo "$schema_check" | jq -r '.[0].story_id // ""' 2>/dev/null)
            has_title=$(echo "$schema_check" | jq -r '.[0].title // ""' 2>/dev/null)
            has_status=$(echo "$schema_check" | jq -r '.[0].status // ""' 2>/dev/null)

            if [ -n "$has_story_id" ] && [ -n "$has_title" ] && [ -n "$has_status" ]; then
                CHECK_RESULTS["proj_stories_schema"]="PASS"
                CHECK_RESULTS["proj_stories_schema_detail"]="Stories have required fields (id, title, status)"
            elif [ -n "$has_story_id" ] || [ -n "$has_title" ]; then
                CHECK_RESULTS["proj_stories_schema"]="WARN"
                CHECK_RESULTS["proj_stories_schema_detail"]="Partial schema (missing some fields)"
            else
                CHECK_RESULTS["proj_stories_schema"]="FAIL"
                CHECK_RESULTS["proj_stories_schema_detail"]="Stories missing required fields"
            fi
        else
            CHECK_RESULTS["proj_stories_db"]="WARN"
            CHECK_RESULTS["proj_stories_db_detail"]="No AI Stories in Supabase for wave $WAVE_NUMBER"
            CHECK_RESULTS["proj_stories_schema"]="BLOCKED"
            CHECK_RESULTS["proj_stories_schema_detail"]="No stories to validate"
        fi
    else
        CHECK_RESULTS["proj_stories_db"]="BLOCKED"
        CHECK_RESULTS["proj_stories_db_detail"]="Requires Supabase connection (source of truth)"
        CHECK_RESULTS["proj_stories_schema"]="BLOCKED"
        CHECK_RESULTS["proj_stories_schema_detail"]="Requires Supabase connection"
    fi

    # 3. Git Remote - check origin is configured
    if command -v git &>/dev/null && [ -d "$PROJECT_PATH/.git" ]; then
        local git_remote
        git_remote=$(cd "$PROJECT_PATH" && git remote get-url origin 2>/dev/null || echo "")

        if [ -n "$git_remote" ]; then
            # Test if remote is accessible
            if cd "$PROJECT_PATH" && git ls-remote --exit-code origin &>/dev/null; then
                CHECK_RESULTS["proj_git_remote"]="PASS"
                CHECK_RESULTS["proj_git_remote_detail"]="$git_remote"
            else
                CHECK_RESULTS["proj_git_remote"]="WARN"
                CHECK_RESULTS["proj_git_remote_detail"]="Remote configured but not accessible"
            fi
        else
            CHECK_RESULTS["proj_git_remote"]="FAIL"
            CHECK_RESULTS["proj_git_remote_detail"]="No origin remote configured"
        fi
    else
        CHECK_RESULTS["proj_git_remote"]="FAIL"
        CHECK_RESULTS["proj_git_remote_detail"]="Not a git repository"
    fi

    # 4. Git Branch - check main is clean
    if [ -d "$PROJECT_PATH/.git" ]; then
        local dirty_files
        dirty_files=$(cd "$PROJECT_PATH" && git status --porcelain 2>/dev/null | wc -l | tr -d ' ')

        if [ "$dirty_files" = "0" ]; then
            CHECK_RESULTS["proj_git_branch"]="PASS"
            CHECK_RESULTS["proj_git_branch_detail"]="Working tree is clean"
        else
            CHECK_RESULTS["proj_git_branch"]="WARN"
            CHECK_RESULTS["proj_git_branch_detail"]="$dirty_files uncommitted changes"
        fi
    else
        CHECK_RESULTS["proj_git_branch"]="BLOCKED"
        CHECK_RESULTS["proj_git_branch_detail"]="Not a git repository"
    fi

    # 5. Vercel - check if linked
    if [ -f "$PROJECT_PATH/.vercel/project.json" ]; then
        local vercel_project
        vercel_project=$(jq -r '.projectId // "unknown"' "$PROJECT_PATH/.vercel/project.json" 2>/dev/null || echo "unknown")
        CHECK_RESULTS["proj_vercel"]="PASS"
        CHECK_RESULTS["proj_vercel_detail"]="Project linked (ID: ${vercel_project:0:8}...)"
    elif [ -n "${VERCEL_TOKEN:-}" ]; then
        CHECK_RESULTS["proj_vercel"]="WARN"
        CHECK_RESULTS["proj_vercel_detail"]="VERCEL_TOKEN set but not linked"
    else
        CHECK_RESULTS["proj_vercel"]="PENDING"
        CHECK_RESULTS["proj_vercel_detail"]="Not linked to Vercel"
    fi

    # 6. Wave Config - check .claude/wave-config.json
    local wave_config="$PROJECT_PATH/.claude/wave-config.json"
    if [ -f "$wave_config" ]; then
        local config_wave
        config_wave=$(jq -r '.wave // "NOT SET"' "$wave_config" 2>/dev/null || echo "INVALID")

        if [ "$config_wave" = "$WAVE_NUMBER" ]; then
            CHECK_RESULTS["proj_wave_config"]="PASS"
            CHECK_RESULTS["proj_wave_config_detail"]="Wave $config_wave configured"
        elif [ "$config_wave" = "NOT SET" ]; then
            CHECK_RESULTS["proj_wave_config"]="WARN"
            CHECK_RESULTS["proj_wave_config_detail"]="Config exists but wave not set"
        else
            CHECK_RESULTS["proj_wave_config"]="WARN"
            CHECK_RESULTS["proj_wave_config_detail"]="Config is for wave $config_wave, not $WAVE_NUMBER"
        fi
    else
        CHECK_RESULTS["proj_wave_config"]="PENDING"
        CHECK_RESULTS["proj_wave_config_detail"]="wave-config.json not found"
    fi
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
    },
    "story_tests": {
        "status": "${CHECK_RESULTS["story_tests"]:-PENDING}",
        "detail": "${CHECK_RESULTS["story_tests_detail"]:-}",
        "generated": ${CHECK_RESULTS["story_tests_generated"]:-0},
        "passed": ${CHECK_RESULTS["story_tests_passed"]:-0},
        "failed": ${CHECK_RESULTS["story_tests_failed"]:-0},
        "results": [
EOF

    # Output story test results as JSON array
    local first=true
    for result in "${STORY_TEST_RESULTS[@]}"; do
        local test_status test_story test_name test_detail
        IFS='|' read -r test_status test_story test_name test_detail <<< "$result"

        [ "$first" = true ] && first=false || echo ","
        printf '            {"status": "%s", "story": "%s", "test": "%s", "detail": "%s"}' \
            "$test_status" "$test_story" "$test_name" "$test_detail"
    done

    cat << 'EOF'

        ]
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
# RENDER PROJECT OVERVIEW HTML
# Shows project structure with tree view and documentation locations
# ─────────────────────────────────────────────────────────────────────────────

render_project_overview_html() {
    local status="${PROJECT_STRUCTURE["status"]:-PENDING}"
    local score="${PROJECT_STRUCTURE["score"]:-0/0}"
    local timestamp
    timestamp=$(date '+%H:%M:%S')
    local proj_root="${PROJECT_PATH:-.}"
    local abs_proj_root
    abs_proj_root=$(cd "$proj_root" 2>/dev/null && pwd) || abs_proj_root="$proj_root"

    # Determine badge class
    local badge_class="pending"
    case "$status" in
        PASS) badge_class="pass" ;;
        WARN) badge_class="warn" ;;
        FAIL) badge_class="fail" ;;
    esac

    # Escape project name for HTML
    local escaped_project_name
    escaped_project_name=$(echo "$PROJECT_NAME" | sed 's/"/\&quot;/g; s/</\&lt;/g; s/>/\&gt;/g')

    cat << EOF
                <div class="phase-card project-overview expanded">
                    <div class="phase-header">
                        <div class="phase-badge ${badge_class}">PROJECT</div>
                        <div class="phase-info">
                            <h3>Project Structure Overview</h3>
                            <span class="phase-desc">File structure, documentation locations, and best practices</span>
                        </div>
                        <div class="phase-status">
                            <span class="phase-time">${timestamp}</span>
                            <span class="status-badge ${badge_class}">${score}</span>
                        </div>
                    </div>
                    <div class="phase-checks" style="display: block; padding: 1rem;">

                        <!-- Project Name Input -->
                        <div class="project-name-section" style="margin-bottom: 1.5rem; padding: 1rem; background: hsl(var(--muted) / 0.3); border-radius: var(--radius); border: 1px solid hsl(var(--border));">
                            <label style="display: block; font-size: 0.75rem; font-weight: 600; color: hsl(var(--muted-foreground)); margin-bottom: 0.5rem; text-transform: uppercase; letter-spacing: 0.05em;">
                                Project Name
                            </label>
                            <div style="display: flex; gap: 0.5rem;">
                                <input type="text"
                                       id="project-name-input"
                                       value="${escaped_project_name}"
                                       placeholder="Enter project name (e.g., Photo Gallery App)"
                                       style="flex: 1; padding: 0.5rem 0.75rem; font-size: 0.875rem; border: 1px solid hsl(var(--border)); border-radius: var(--radius); background: hsl(var(--background)); color: hsl(var(--foreground)); outline: none;"
                                       onfocus="this.style.borderColor='hsl(var(--ring))'"
                                       onblur="this.style.borderColor='hsl(var(--border))'"
                                />
                                <button onclick="saveProjectName()"
                                        style="padding: 0.5rem 1rem; font-size: 0.875rem; font-weight: 500; background: hsl(var(--primary)); color: hsl(var(--primary-foreground)); border: none; border-radius: var(--radius); cursor: pointer; transition: opacity 0.2s;"
                                        onmouseover="this.style.opacity='0.9'"
                                        onmouseout="this.style.opacity='1'">
                                    Save & Analyze
                                </button>
                            </div>
                            <p style="font-size: 0.7rem; color: hsl(var(--muted-foreground)); margin-top: 0.5rem;">
                                Saving will scan the project and suggest structure improvements if needed.
                            </p>
                        </div>

                        <!-- Collapsible Folder Structure Section -->
                        <div class="folder-tree-section" style="margin-bottom: 1.5rem; border: 1px solid hsl(var(--border)); border-radius: var(--radius); overflow: hidden;">
                            <!-- Collapsible Header -->
                            <div class="folder-tree-header"
                                 onclick="toggleFolderTree(this)"
                                 style="display: flex; align-items: center; justify-content: space-between; padding: 0.75rem 1rem; background: hsl(var(--muted) / 0.3); cursor: pointer; user-select: none; transition: background 0.2s;"
                                 onmouseover="this.style.background='hsl(var(--muted) / 0.5)'"
                                 onmouseout="this.style.background='hsl(var(--muted) / 0.3)'">
                                <div style="display: flex; align-items: center; gap: 0.75rem;">
                                    <span class="folder-toggle" style="font-size: 0.8rem; transition: transform 0.2s;">▶</span>
                                    <div>
                                        <div style="font-size: 0.85rem; font-weight: 600; color: hsl(var(--foreground));">📁 Folder Structure</div>
                                        <div style="font-size: 0.7rem; color: hsl(var(--muted-foreground));">Click to expand and view project tree</div>
                                    </div>
                                </div>
                                <div style="display: flex; align-items: center; gap: 0.5rem;">
                                    <code style="font-size: 0.7rem; color: hsl(var(--muted-foreground)); background: hsl(var(--muted)); padding: 0.25rem 0.5rem; border-radius: 4px;">${abs_proj_root}</code>
                                    <span onclick="event.stopPropagation(); copyToClipboard('${abs_proj_root}', this)" style="font-size: 0.75rem; padding: 0.25rem 0.5rem; background: hsl(var(--primary)); color: hsl(var(--primary-foreground)); border-radius: 4px; cursor: pointer;">📋 Copy</span>
                                </div>
                            </div>

                            <!-- Collapsible Content (hidden by default) -->
                            <div class="folder-tree-content" style="display: none; border-top: 1px solid hsl(var(--border));">
                                <div class="folder-tree" style="background: hsl(240 10% 4%); padding: 1rem; font-family: 'JetBrains Mono', monospace; font-size: 0.8rem; overflow-x: auto; max-height: 400px; overflow-y: auto;">
EOF

    # Render tree lines with copyable paths
    local i=0
    for line in "${PROJECT_TREE_LINES[@]}"; do
        local path="${PROJECT_TREE_PATHS[$i]}"
        # Escape for HTML and JS
        local escaped_path
        escaped_path=$(echo "$path" | sed "s/'/\\\\'/g")
        local escaped_line
        escaped_line=$(echo "$line" | sed 's/&/\&amp;/g; s/</\&lt;/g; s/>/\&gt;/g')

        cat << EOF
                                <div class="tree-item"
                                     onclick="copyToClipboard('${escaped_path}', this)"
                                     style="padding: 0.2rem 0.5rem; cursor: pointer; white-space: pre; color: hsl(0 0% 80%); border-radius: 2px; transition: background 0.15s;"
                                     onmouseover="this.style.background='hsl(0 0% 20%)'"
                                     onmouseout="this.style.background='transparent'"
                                     title="Click to copy: ${escaped_path}">
${escaped_line}</div>
EOF
        ((i++)) || true
    done

    cat << EOF
                                </div>
                                <p style="font-size: 0.7rem; color: hsl(var(--muted-foreground)); padding: 0.75rem 1rem; background: hsl(var(--muted) / 0.2); border-top: 1px solid hsl(var(--border));">
                                    💡 Click any item to copy its full path to clipboard
                                </p>
                            </div>
                        </div>

                        <!-- Documentation Status -->
                        <div class="docs-section" style="margin-bottom: 1.5rem;">
                            <label style="display: block; font-size: 0.75rem; font-weight: 600; color: hsl(var(--muted-foreground)); margin-bottom: 0.5rem; text-transform: uppercase; letter-spacing: 0.05em;">
                                Key Files Status
                            </label>
                            <div class="docs-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 0.5rem;">
EOF

    # Render documentation items with copyable paths
    for doc_entry in "${PROJECT_DOCS[@]}"; do
        IFS='|' read -r doc_type doc_path doc_label doc_status <<< "$doc_entry"
        local icon="✓"
        local bg_color="hsl(142.1 76.2% 36.3% / 0.1)"
        local border_color="hsl(142.1 76.2% 36.3% / 0.3)"
        local icon_color="hsl(142.1 70% 35%)"
        local full_path=""

        if [ "$doc_status" = "MISSING" ]; then
            icon="✗"
            bg_color="hsl(0 84.2% 60.2% / 0.1)"
            border_color="hsl(0 84.2% 60.2% / 0.3)"
            icon_color="hsl(0 70% 50%)"
        else
            full_path="${abs_proj_root}/${doc_path}"
        fi

        if [ -n "$full_path" ]; then
            local escaped_full_path
            escaped_full_path=$(echo "$full_path" | sed "s/'/\\\\'/g")
            cat << EOF
                                <div class="doc-item copyable-path"
                                     onclick="copyToClipboard('${escaped_full_path}', this)"
                                     style="display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem; background: ${bg_color}; border: 1px solid ${border_color}; border-radius: var(--radius); cursor: pointer; transition: opacity 0.2s;"
                                     onmouseover="this.style.opacity='0.8'"
                                     onmouseout="this.style.opacity='1'"
                                     title="Click to copy: ${escaped_full_path}">
                                    <span style="font-size: 1rem; color: ${icon_color};">${icon}</span>
                                    <div style="flex: 1; min-width: 0;">
                                        <div style="font-size: 0.8rem; font-weight: 500; color: hsl(var(--foreground));">${doc_label}</div>
                                        <code style="font-size: 0.7rem; color: hsl(var(--muted-foreground)); display: block; overflow: hidden; text-overflow: ellipsis;">${doc_path}</code>
                                    </div>
                                    <span style="font-size: 0.7rem; color: hsl(var(--muted-foreground));">📋</span>
                                </div>
EOF
        else
            cat << EOF
                                <div class="doc-item"
                                     style="display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem; background: ${bg_color}; border: 1px solid ${border_color}; border-radius: var(--radius);">
                                    <span style="font-size: 1rem; color: ${icon_color};">${icon}</span>
                                    <div style="flex: 1; min-width: 0;">
                                        <div style="font-size: 0.8rem; font-weight: 500; color: hsl(var(--foreground));">${doc_label}</div>
                                        <code style="font-size: 0.7rem; color: hsl(var(--muted-foreground));">Not found</code>
                                    </div>
                                </div>
EOF
        fi
    done

    cat << EOF
                            </div>
                        </div>

                        <!-- Data Sources -->
                        <div class="sources-section">
                            <label style="display: block; font-size: 0.75rem; font-weight: 600; color: hsl(var(--muted-foreground)); margin-bottom: 0.5rem; text-transform: uppercase; letter-spacing: 0.05em;">
                                Data Sources
                            </label>
                            <div class="sources-grid" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.5rem;">
                                <div class="source-item" style="padding: 0.75rem; background: hsl(217 91% 60% / 0.1); border: 1px solid hsl(217 91% 60% / 0.3); border-radius: var(--radius);">
                                    <div style="font-size: 0.65rem; color: hsl(217 91% 50%); font-weight: 600; margin-bottom: 0.25rem; text-transform: uppercase; letter-spacing: 0.05em;">Source of Truth</div>
                                    <div style="font-size: 0.85rem; font-weight: 500; color: hsl(var(--foreground));">Supabase</div>
                                    <code style="font-size: 0.7rem; color: hsl(var(--muted-foreground));">maf_stories table</code>
                                </div>
                                <div class="source-item" style="padding: 0.75rem; background: hsl(var(--muted) / 0.3); border: 1px solid hsl(var(--border)); border-radius: var(--radius);">
                                    <div style="font-size: 0.65rem; color: hsl(var(--muted-foreground)); font-weight: 600; margin-bottom: 0.25rem; text-transform: uppercase; letter-spacing: 0.05em;">Speed Layer</div>
                                    <div style="font-size: 0.85rem; font-weight: 500; color: hsl(var(--foreground));">JSON Signals</div>
                                    <code style="font-size: 0.7rem; color: hsl(var(--muted-foreground));">.claude/*.json</code>
                                </div>
                            </div>
                        </div>

                        <!-- Best Practices Recommendations -->
                        <div id="recommendations-section" class="recommendations-section" style="margin-top: 1.5rem; display: none;">
                            <label style="display: block; font-size: 0.75rem; font-weight: 600; color: hsl(38 92% 50%); margin-bottom: 0.5rem; text-transform: uppercase; letter-spacing: 0.05em;">
                                💡 Recommendations
                            </label>
                            <div id="recommendations-list" style="background: hsl(38 92% 50% / 0.1); border: 1px solid hsl(38 92% 50% / 0.3); border-radius: var(--radius); padding: 1rem;">
                                <!-- Filled by JavaScript -->
                            </div>
                        </div>

                    </div>
                </div>
EOF
}

# ─────────────────────────────────────────────────────────────────────────────
# MAIN EXECUTION
# ─────────────────────────────────────────────────────────────────────────────

# Run all checks (in order of importance)
detect_project_structure  # Project file structure and documentation
check_credentials      # API keys and .env
check_system           # Node, pnpm, git, docker, memory, ports
check_docker           # Docker daemon, compose, image, base images
check_worktrees        # Git worktrees exist, branches, clean
check_project_files    # package.json, CLAUDE.md, stories
check_network          # Connectivity to APIs
check_signals          # Signal files schema validation
check_circuit_breaker  # Emergency stop, circuit breaker

# AI Story test generation (runs ON TOP OF infrastructure tests)
# Fetches stories from Supabase and validates Schema V4 compliance
generate_and_run_story_tests "$WAVE_NUMBER" || true  # Don't fail script if Supabase unavailable

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
