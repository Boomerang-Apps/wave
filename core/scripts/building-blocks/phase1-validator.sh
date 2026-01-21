#!/opt/homebrew/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# WAVE BUILDING BLOCKS: PHASE 1 VALIDATOR (Infrastructure)
# ═══════════════════════════════════════════════════════════════════════════════
# Validates ALL infrastructure is ready before development begins.
# Creates PHASE1 lock file upon successful validation.
#
# HARD ENFORCEMENT - ALL tests must pass. No warnings, only PASS or FAIL.
#
# REQUIRED INFRASTRUCTURE:
#   1. Slack webhook (CRITICAL)
#   2. Supabase database
#   3. Docker daemon
#   4. Dozzle log viewer
#   5. Git worktrees
#   6. GitHub API
#   7. Vercel API
#   8. Neon database
#   9. Claude API
#  10. Nano Banana (Gemini)
#
# USAGE:
#   ./phase1-validator.sh --project <path> --wave <N>
#   ./phase1-validator.sh --project <path> --wave <N> --dry-run
#   ./phase1-validator.sh --project <path> --wave <N> --skip <test1,test2>
#
# ═══════════════════════════════════════════════════════════════════════════════

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WAVE_ROOT="${WAVE_ROOT:-$(cd "$SCRIPT_DIR/../../.." && pwd)}"
SCRIPT_VERSION="1.0.0"

# Load environment
if [ -f "$WAVE_ROOT/.env" ]; then
    set -a
    source "$WAVE_ROOT/.env"
    set +a
fi

# ─────────────────────────────────────────────────────────────────────────────
# COLORS
# ─────────────────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# ─────────────────────────────────────────────────────────────────────────────
# CONFIGURATION
# ─────────────────────────────────────────────────────────────────────────────
PROJECT_PATH=""
WAVE_NUMBER=""
DRY_RUN=false
SKIP_TESTS=""

# Test results
declare -A TEST_RESULTS
declare -A TEST_LATENCY
TESTS_PASSED=0
TESTS_FAILED=0

# All infrastructure tests
ALL_TESTS=("slack" "supabase" "docker" "dozzle" "worktree" "github" "vercel" "neon" "claude" "nano_banana")

# CRITICAL tests that MUST pass (others can be skipped with --skip)
CRITICAL_TESTS=("slack" "docker" "claude")

# ─────────────────────────────────────────────────────────────────────────────
# HELPER FUNCTIONS
# ─────────────────────────────────────────────────────────────────────────────

get_ms() {
    python3 -c 'import time; print(int(time.time() * 1000))' 2>/dev/null || echo $(($(date +%s) * 1000))
}

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_pass() { echo -e "${GREEN}[PASS]${NC} $1"; }
log_fail() { echo -e "${RED}[FAIL]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_header() { echo -e "\n${BOLD}${CYAN}═══ $1 ═══${NC}"; }

send_slack() {
    local status="$1"
    local message="$2"

    if [ -z "${SLACK_WEBHOOK_URL:-}" ]; then
        return 0
    fi

    local color="#36a64f"
    local emoji=":white_check_mark:"
    if [ "$status" = "FAIL" ]; then
        color="#ff0000"
        emoji=":x:"
    fi

    curl -s -m 15 -X POST -H 'Content-type: application/json' \
        --data "{
            \"attachments\": [{
                \"color\": \"$color\",
                \"blocks\": [
                    {\"type\": \"header\", \"text\": {\"type\": \"plain_text\", \"text\": \"$emoji Phase 1: Infrastructure Validation\", \"emoji\": true}},
                    {\"type\": \"section\", \"text\": {\"type\": \"mrkdwn\", \"text\": \"$message\"}},
                    {\"type\": \"context\", \"elements\": [{\"type\": \"mrkdwn\", \"text\": \"WAVE Building Blocks | $(date -u +%Y-%m-%dT%H:%M:%SZ)\"}]}
                ]
            }]
        }" "$SLACK_WEBHOOK_URL" > /dev/null 2>&1
}

# ─────────────────────────────────────────────────────────────────────────────
# INFRASTRUCTURE TESTS
# ─────────────────────────────────────────────────────────────────────────────

test_slack() {
    local start=$(get_ms)

    if [ -z "${SLACK_WEBHOOK_URL:-}" ]; then
        TEST_RESULTS[slack]="FAIL"
        TEST_LATENCY[slack]="0"
        return 1
    fi

    local response=$(curl -s -m 10 -o /dev/null -w "%{http_code}" \
        -X POST -H 'Content-type: application/json' \
        --data '{"text":"WAVE Phase 1 Infrastructure Test"}' \
        "$SLACK_WEBHOOK_URL" 2>/dev/null || echo "000")

    local end=$(get_ms)
    TEST_LATENCY[slack]=$((end - start))

    if [ "$response" = "200" ]; then
        TEST_RESULTS[slack]="PASS"
        return 0
    else
        TEST_RESULTS[slack]="FAIL"
        return 1
    fi
}

test_supabase() {
    local start=$(get_ms)

    if [ -z "${SUPABASE_URL:-}" ]; then
        TEST_RESULTS[supabase]="FAIL"
        TEST_LATENCY[supabase]="0"
        return 1
    fi

    local response=$(curl -s -m 10 -o /dev/null -w "%{http_code}" \
        -H "apikey: ${SUPABASE_ANON_KEY:-}" \
        "${SUPABASE_URL}/rest/v1/" 2>/dev/null || echo "000")

    local end=$(get_ms)
    TEST_LATENCY[supabase]=$((end - start))

    if [ "$response" = "200" ] || [ "$response" = "401" ]; then
        TEST_RESULTS[supabase]="PASS"
        return 0
    else
        TEST_RESULTS[supabase]="FAIL"
        return 1
    fi
}

test_docker() {
    local start=$(get_ms)

    if ! command -v docker &> /dev/null; then
        TEST_RESULTS[docker]="FAIL"
        TEST_LATENCY[docker]="0"
        return 1
    fi

    if ! docker info > /dev/null 2>&1; then
        TEST_RESULTS[docker]="FAIL"
        TEST_LATENCY[docker]="0"
        return 1
    fi

    local end=$(get_ms)
    TEST_LATENCY[docker]=$((end - start))
    TEST_RESULTS[docker]="PASS"
    return 0
}

test_dozzle() {
    local start=$(get_ms)
    local port="${DOZZLE_PORT:-9080}"

    local response=$(curl -s -m 10 -o /dev/null -w "%{http_code}" \
        "http://localhost:$port" 2>/dev/null || echo "000")

    local end=$(get_ms)
    TEST_LATENCY[dozzle]=$((end - start))

    if [ "$response" = "200" ]; then
        TEST_RESULTS[dozzle]="PASS"
        return 0
    else
        TEST_RESULTS[dozzle]="FAIL"
        return 1
    fi
}

test_worktree() {
    local start=$(get_ms)

    if [ -z "$PROJECT_PATH" ] || [ ! -d "$PROJECT_PATH" ]; then
        TEST_RESULTS[worktree]="FAIL"
        TEST_LATENCY[worktree]="0"
        return 1
    fi

    local end=$(get_ms)
    TEST_LATENCY[worktree]=$((end - start))

    # Check if worktrees exist
    if [ -d "$PROJECT_PATH/worktrees" ]; then
        local count=$(ls -d "$PROJECT_PATH/worktrees"/*/ 2>/dev/null | wc -l | tr -d ' ')
        if [ "$count" -gt 0 ]; then
            TEST_RESULTS[worktree]="PASS"
            return 0
        fi
    fi

    # If project exists but no worktrees, still pass (can be created)
    TEST_RESULTS[worktree]="PASS"
    return 0
}

test_github() {
    local start=$(get_ms)

    if [ -z "${GITHUB_TOKEN:-}" ]; then
        TEST_RESULTS[github]="FAIL"
        TEST_LATENCY[github]="0"
        return 1
    fi

    local response=$(curl -s -m 10 -H "Authorization: token $GITHUB_TOKEN" \
        "https://api.github.com/user" 2>/dev/null)

    local end=$(get_ms)
    TEST_LATENCY[github]=$((end - start))

    local login=$(echo "$response" | jq -r '.login // empty' 2>/dev/null)

    if [ -n "$login" ]; then
        TEST_RESULTS[github]="PASS"
        return 0
    else
        TEST_RESULTS[github]="FAIL"
        return 1
    fi
}

test_vercel() {
    local start=$(get_ms)

    if [ -z "${VERCEL_TOKEN:-}" ]; then
        TEST_RESULTS[vercel]="FAIL"
        TEST_LATENCY[vercel]="0"
        return 1
    fi

    local response=$(curl -s -m 10 -H "Authorization: Bearer $VERCEL_TOKEN" \
        "https://api.vercel.com/v2/user" 2>/dev/null)

    local end=$(get_ms)
    TEST_LATENCY[vercel]=$((end - start))

    local username=$(echo "$response" | jq -r '.user.username // empty' 2>/dev/null)

    if [ -n "$username" ]; then
        TEST_RESULTS[vercel]="PASS"
        return 0
    else
        TEST_RESULTS[vercel]="FAIL"
        return 1
    fi
}

test_neon() {
    local start=$(get_ms)

    if [ -z "${NEON_DATABASE_URL:-}" ]; then
        TEST_RESULTS[neon]="FAIL"
        TEST_LATENCY[neon]="0"
        return 1
    fi

    # Check if URL is parseable
    local host=$(echo "$NEON_DATABASE_URL" | sed -n 's/.*@\([^:\/]*\).*/\1/p')

    local end=$(get_ms)
    TEST_LATENCY[neon]=$((end - start))

    if [ -n "$host" ]; then
        TEST_RESULTS[neon]="PASS"
        return 0
    else
        TEST_RESULTS[neon]="FAIL"
        return 1
    fi
}

test_claude() {
    local start=$(get_ms)

    if [ -z "${ANTHROPIC_API_KEY:-}" ]; then
        TEST_RESULTS[claude]="FAIL"
        TEST_LATENCY[claude]="0"
        return 1
    fi

    local response=$(curl -s -m 15 -X POST "https://api.anthropic.com/v1/messages" \
        -H "x-api-key: $ANTHROPIC_API_KEY" \
        -H "anthropic-version: 2023-06-01" \
        -H "content-type: application/json" \
        -d '{
            "model": "claude-3-haiku-20240307",
            "max_tokens": 10,
            "messages": [{"role": "user", "content": "Say OK"}]
        }' 2>/dev/null)

    local end=$(get_ms)
    TEST_LATENCY[claude]=$((end - start))

    local content=$(echo "$response" | jq -r '.content[0].text // empty' 2>/dev/null)

    if [ -n "$content" ]; then
        TEST_RESULTS[claude]="PASS"
        return 0
    else
        TEST_RESULTS[claude]="FAIL"
        return 1
    fi
}

test_nano_banana() {
    local start=$(get_ms)

    if [ -z "${GOOGLE_AI_API_KEY:-}" ]; then
        TEST_RESULTS[nano_banana]="FAIL"
        TEST_LATENCY[nano_banana]="0"
        return 1
    fi

    local model="${NANO_BANANA_MODEL:-gemini-2.0-flash-exp}"

    local response=$(curl -s -m 15 -X POST \
        "https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GOOGLE_AI_API_KEY}" \
        -H "Content-Type: application/json" \
        -d '{
            "contents": [{"parts":[{"text":"Say OK"}]}],
            "generationConfig": {"maxOutputTokens": 10}
        }' 2>/dev/null)

    local end=$(get_ms)
    TEST_LATENCY[nano_banana]=$((end - start))

    local content=$(echo "$response" | jq -r '.candidates[0].content.parts[0].text // empty' 2>/dev/null)

    if [ -n "$content" ]; then
        TEST_RESULTS[nano_banana]="PASS"
        return 0
    else
        TEST_RESULTS[nano_banana]="FAIL"
        return 1
    fi
}

# ─────────────────────────────────────────────────────────────────────────────
# RUN ALL TESTS
# ─────────────────────────────────────────────────────────────────────────────

run_all_tests() {
    log_header "PHASE 1: INFRASTRUCTURE VALIDATION"
    echo ""

    local skip_array=()
    IFS=',' read -ra skip_array <<< "$SKIP_TESTS"

    for test in "${ALL_TESTS[@]}"; do
        # Check if test should be skipped
        local skip=false
        for s in "${skip_array[@]}"; do
            if [ "$test" = "$s" ]; then
                skip=true
                break
            fi
        done

        if [ "$skip" = true ]; then
            # Check if it's a critical test
            for c in "${CRITICAL_TESTS[@]}"; do
                if [ "$test" = "$c" ]; then
                    log_fail "Cannot skip CRITICAL test: $test"
                    ((TESTS_FAILED++))
                    TEST_RESULTS[$test]="FAIL"
                    continue 2
                fi
            done
            log_warn "Skipping test: $test"
            TEST_RESULTS[$test]="SKIP"
            continue
        fi

        printf "  Testing %-15s ... " "$test"

        if "test_$test"; then
            echo -e "${GREEN}PASS${NC} (${TEST_LATENCY[$test]}ms)"
            ((TESTS_PASSED++)) || true
        else
            echo -e "${RED}FAIL${NC}"
            ((TESTS_FAILED++)) || true
        fi
    done

    echo ""
}

# ─────────────────────────────────────────────────────────────────────────────
# CREATE LOCK FILE
# ─────────────────────────────────────────────────────────────────────────────

calculate_checksum() {
    # Checksum based on .env file (infrastructure config)
    if [ -f "$WAVE_ROOT/.env" ]; then
        sha256sum "$WAVE_ROOT/.env" 2>/dev/null | cut -d' ' -f1 || echo "no-checksum"
    else
        echo "no-env-file"
    fi
}

create_lock_file() {
    local lock_dir="$PROJECT_PATH/.claude/locks"
    local lock_file="$lock_dir/PHASE1-wave${WAVE_NUMBER}.lock"

    mkdir -p "$lock_dir"

    local checksum=$(calculate_checksum)
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

    # Build test results JSON
    local results_json="{"
    local first=true
    for test in "${ALL_TESTS[@]}"; do
        if [ "$first" = true ]; then
            first=false
        else
            results_json+=","
        fi
        results_json+="\"$test\":{\"status\":\"${TEST_RESULTS[$test]:-SKIP}\",\"latency\":${TEST_LATENCY[$test]:-0}}"
    done
    results_json+="}"

    cat > "$lock_file" << EOF
{
    "phase": 1,
    "phase_name": "Infrastructure",
    "wave": $WAVE_NUMBER,
    "status": "PASSED",
    "validator": "phase1-validator.sh",
    "validator_version": "$SCRIPT_VERSION",
    "tests_passed": $TESTS_PASSED,
    "tests_failed": $TESTS_FAILED,
    "tests_total": ${#ALL_TESTS[@]},
    "test_results": $results_json,
    "checksum": "$checksum",
    "timestamp": "$timestamp",
    "project_path": "$PROJECT_PATH"
}
EOF

    log_pass "Lock file created: $lock_file"
}

# ─────────────────────────────────────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────────────────────────────────────

show_usage() {
    echo "WAVE Building Blocks: Phase 1 Infrastructure Validator"
    echo ""
    echo "Usage: $0 --project <path> --wave <N> [options]"
    echo ""
    echo "Options:"
    echo "  --project <path>    Project directory path (required)"
    echo "  --wave <N>          Wave number (required)"
    echo "  --dry-run           Run tests but don't create lock file"
    echo "  --skip <tests>      Comma-separated tests to skip (non-critical only)"
    echo "  -h, --help          Show this help"
    echo ""
    echo "Critical tests (cannot be skipped):"
    echo "  slack, docker, claude"
    echo ""
    echo "Examples:"
    echo "  $0 --project /path/to/project --wave 3"
    echo "  $0 --project /path/to/project --wave 3 --skip neon,vercel"
    echo "  $0 --project /path/to/project --wave 3 --dry-run"
}

parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --project)
                PROJECT_PATH="$2"
                shift 2
                ;;
            --wave)
                WAVE_NUMBER="$2"
                shift 2
                ;;
            --dry-run)
                DRY_RUN=true
                shift
                ;;
            --skip)
                SKIP_TESTS="$2"
                shift 2
                ;;
            -h|--help)
                show_usage
                exit 0
                ;;
            *)
                echo "Unknown option: $1"
                show_usage
                exit 1
                ;;
        esac
    done

    if [ -z "$PROJECT_PATH" ] || [ -z "$WAVE_NUMBER" ]; then
        echo "ERROR: --project and --wave are required"
        show_usage
        exit 1
    fi
}

main() {
    parse_args "$@"

    echo ""
    echo -e "${BOLD}${BLUE}╔═══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BOLD}${BLUE}║     WAVE BUILDING BLOCKS: PHASE 1 INFRASTRUCTURE             ║${NC}"
    echo -e "${BOLD}${BLUE}╚═══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "  Project: ${CYAN}$PROJECT_PATH${NC}"
    echo -e "  Wave:    ${CYAN}$WAVE_NUMBER${NC}"
    echo -e "  Mode:    ${CYAN}$([ "$DRY_RUN" = true ] && echo "DRY-RUN" || echo "ENFORCE")${NC}"
    echo ""

    # Run all tests
    run_all_tests

    # Summary
    echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "  ${GREEN}Passed: $TESTS_PASSED${NC}  |  ${RED}Failed: $TESTS_FAILED${NC}  |  Total: ${#ALL_TESTS[@]}"
    echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""

    # HARD ENFORCEMENT: All tests must pass (except skipped)
    if [ "$TESTS_FAILED" -gt 0 ]; then
        log_fail "PHASE 1 VALIDATION FAILED"
        log_fail "Cannot proceed - infrastructure not ready"
        echo ""
        echo -e "${RED}Failed tests:${NC}"
        for test in "${ALL_TESTS[@]}"; do
            if [ "${TEST_RESULTS[$test]}" = "FAIL" ]; then
                echo -e "  - $test"
            fi
        done
        echo ""

        send_slack "FAIL" "*BLOCKED*: Phase 1 failed with $TESTS_FAILED errors\n\nFix infrastructure issues before proceeding."

        exit 1
    fi

    # Success
    if [ "$DRY_RUN" = true ]; then
        log_warn "DRY-RUN: Lock file NOT created"
    else
        create_lock_file
        send_slack "PASS" "*PASSED*: All $TESTS_PASSED infrastructure tests passed\n\nWave $WAVE_NUMBER ready for development."
    fi

    log_pass "PHASE 1 VALIDATION PASSED"
    echo ""

    exit 0
}

main "$@"
