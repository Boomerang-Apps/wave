#!/bin/bash
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# WAVE Infrastructure Ping Test System
# Version: 1.0.0
#
# Tests infrastructure and sends rich Slack notifications
# Usage: ./ping-test.sh <test-name>
#
# Available tests:
#   slack       - Test Slack webhook
#   supabase    - Test Supabase connection
#   docker      - Test Docker containers
#   dozzle      - Test Dozzle dashboard
#   worktree    - Test Git worktree
#   github      - Test GitHub API
#   vercel      - Test Vercel API
#   neon        - Test Neon database
#   claude      - Test Claude API
#   nano-banana - Test Google Gemini API
#   all         - Run all tests
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WAVE_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Load environment variables
if [ -f "$WAVE_ROOT/.env" ]; then
    set -a
    source "$WAVE_ROOT/.env"
    set +a
fi

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Cross-platform millisecond timestamp
get_ms() {
    python3 -c 'import time; print(int(time.time() * 1000))' 2>/dev/null || echo $(($(date +%s) * 1000))
}

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# SLACK NOTIFICATION FUNCTION
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

send_slack_notification() {
    local test_name="$1"
    local status="$2"  # success | failure
    local title="$3"
    local details="$4"
    local latency="${5:-N/A}"

    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    local color="#36a64f"  # green
    local emoji=":white_check_mark:"
    local status_upper="SUCCESS"

    if [ "$status" = "failure" ]; then
        color="#ff0000"
        emoji=":x:"
        status_upper="FAILURE"
    fi

    # Escape special characters in details for JSON
    local escaped_details=$(echo "$details" | sed 's/"/\\"/g' | sed 's/\n/\\n/g')

    local payload="{
        \"attachments\": [
            {
                \"color\": \"$color\",
                \"blocks\": [
                    {
                        \"type\": \"header\",
                        \"text\": {
                            \"type\": \"plain_text\",
                            \"text\": \"$emoji WAVE Ping Test: $test_name\",
                            \"emoji\": true
                        }
                    },
                    {
                        \"type\": \"section\",
                        \"fields\": [
                            {
                                \"type\": \"mrkdwn\",
                                \"text\": \"*Status:*\\n$status_upper\"
                            },
                            {
                                \"type\": \"mrkdwn\",
                                \"text\": \"*Latency:*\\n${latency}ms\"
                            }
                        ]
                    },
                    {
                        \"type\": \"section\",
                        \"text\": {
                            \"type\": \"mrkdwn\",
                            \"text\": \"*Details:*\\n$escaped_details\"
                        }
                    },
                    {
                        \"type\": \"context\",
                        \"elements\": [
                            {
                                \"type\": \"mrkdwn\",
                                \"text\": \"WAVE Infrastructure Test | $timestamp\"
                            }
                        ]
                    }
                ]
            }
        ]
    }"

    if [ -n "${SLACK_WEBHOOK_URL:-}" ]; then
        curl -s -X POST -H 'Content-type: application/json' \
            --data "$payload" \
            "$SLACK_WEBHOOK_URL" > /dev/null 2>&1
        echo -e "${GREEN}Slack notification sent${NC}"
    else
        echo -e "${YELLOW}SLACK_WEBHOOK_URL not set - skipping notification${NC}"
    fi
}

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# TEST FUNCTIONS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

test_slack() {
    echo -e "${CYAN}Testing Slack Webhook...${NC}"

    local start_time=$(get_ms)

    if [ -z "${SLACK_WEBHOOK_URL:-}" ]; then
        echo -e "${RED}FAIL: SLACK_WEBHOOK_URL not configured${NC}"
        return 1
    fi

    local response=$(curl -s -o /dev/null -w "%{http_code}" \
        -X POST -H 'Content-type: application/json' \
        --data '{"text":"WAVE Ping Test - Slack webhook is working!"}' \
        "$SLACK_WEBHOOK_URL")

    local end_time=$(get_ms)
    local latency=$((end_time - start_time))

    if [ "$response" = "200" ]; then
        echo -e "${GREEN}PASS: Slack webhook connected (${latency}ms)${NC}"
        send_slack_notification "Slack" "success" "Webhook Connected" \
            "Slack webhook is operational and ready for notifications." "$latency"
        return 0
    else
        echo -e "${RED}FAIL: Slack webhook returned $response${NC}"
        return 1
    fi
}

test_supabase() {
    echo -e "${CYAN}Testing Supabase Connection...${NC}"

    local start_time=$(get_ms)

    if [ -z "${SUPABASE_URL:-}" ]; then
        echo -e "${RED}FAIL: SUPABASE_URL not configured${NC}"
        send_slack_notification "Supabase" "failure" "Connection Failed" \
            "SUPABASE_URL not configured in environment"
        return 1
    fi

    # Test REST API health endpoint
    local response=$(curl -s -o /dev/null -w "%{http_code}" \
        -H "apikey: ${SUPABASE_ANON_KEY:-}" \
        "${SUPABASE_URL}/rest/v1/" 2>/dev/null || echo "000")

    local end_time=$(get_ms)
    local latency=$((end_time - start_time))

    if [ "$response" = "200" ] || [ "$response" = "401" ]; then
        echo -e "${GREEN}PASS: Supabase API reachable (${latency}ms)${NC}"
        send_slack_notification "Supabase" "success" "Database Connected" \
            "Supabase REST API responding at \`${SUPABASE_URL}\`" "$latency"
        return 0
    else
        echo -e "${RED}FAIL: Supabase returned $response${NC}"
        send_slack_notification "Supabase" "failure" "Connection Failed" \
            "Supabase REST API returned HTTP $response"
        return 1
    fi
}

test_docker() {
    echo -e "${CYAN}Testing Docker Containers...${NC}"

    local start_time=$(get_ms)

    if ! command -v docker &> /dev/null; then
        echo -e "${RED}FAIL: Docker not installed${NC}"
        send_slack_notification "Docker" "failure" "Not Installed" \
            "Docker command not found on system"
        return 1
    fi

    if ! docker info > /dev/null 2>&1; then
        echo -e "${RED}FAIL: Docker daemon not running${NC}"
        send_slack_notification "Docker" "failure" "Daemon Not Running" \
            "Docker daemon is not responding. Start Docker Desktop."
        return 1
    fi

    # Get WAVE container status
    local containers=$(docker ps --filter "name=wave-" --format "{{.Names}}: {{.Status}}" 2>/dev/null || echo "none")
    local container_count=$(docker ps --filter "name=wave-" -q 2>/dev/null | wc -l | tr -d ' ')

    local end_time=$(get_ms)
    local latency=$((end_time - start_time))

    if [ "$container_count" -gt 0 ]; then
        echo -e "${GREEN}PASS: $container_count WAVE container(s) running${NC}"
        echo "$containers"
        send_slack_notification "Docker" "success" "Containers Running" \
            "$container_count WAVE container(s) active:\n\`\`\`$containers\`\`\`" "$latency"
    else
        echo -e "${YELLOW}WARN: No WAVE containers running (Docker is healthy)${NC}"
        send_slack_notification "Docker" "success" "Docker Ready" \
            "Docker daemon healthy. No WAVE containers currently running." "$latency"
    fi
    return 0
}

test_dozzle() {
    echo -e "${CYAN}Testing Dozzle Dashboard...${NC}"

    local start_time=$(get_ms)
    local port="${DOZZLE_PORT:-9080}"

    local response=$(curl -s -o /dev/null -w "%{http_code}" \
        "http://localhost:$port" 2>/dev/null || echo "000")

    local end_time=$(get_ms)
    local latency=$((end_time - start_time))

    if [ "$response" = "200" ]; then
        echo -e "${GREEN}PASS: Dozzle dashboard accessible at http://localhost:$port${NC}"
        send_slack_notification "Dozzle" "success" "Dashboard Online" \
            "Log viewer accessible at http://localhost:$port" "$latency"
        return 0
    else
        echo -e "${RED}FAIL: Dozzle not responding (HTTP $response)${NC}"
        send_slack_notification "Dozzle" "failure" "Dashboard Offline" \
            "Dozzle returned HTTP $response. Run: \`docker compose up -d dozzle\`"
        return 1
    fi
}

test_worktree() {
    echo -e "${CYAN}Testing Git Worktree...${NC}"

    local start_time=$(get_ms)
    local project_path="${PROJECT_PATH:-}"

    if [ -z "$project_path" ]; then
        echo -e "${YELLOW}PROJECT_PATH not set - checking default locations${NC}"
        project_path="/Users/elizager/Downloads/Testing/test-v10.0.7-photo-gallery"
    fi

    if [ ! -d "$project_path" ]; then
        echo -e "${RED}FAIL: Project path does not exist: $project_path${NC}"
        send_slack_notification "Worktree" "failure" "Path Not Found" \
            "Project directory not found at \`$project_path\`"
        return 1
    fi

    local worktree_count=0
    local worktree_list=""

    if [ -d "$project_path/worktrees" ]; then
        worktree_count=$(ls -d "$project_path/worktrees"/*/ 2>/dev/null | wc -l | tr -d ' ')
        worktree_list=$(ls -d "$project_path/worktrees"/*/ 2>/dev/null | xargs -I {} basename {} | tr '\n' ', ' | sed 's/,$//')
    fi

    local end_time=$(get_ms)
    local latency=$((end_time - start_time))

    if [ "$worktree_count" -gt 0 ]; then
        echo -e "${GREEN}PASS: $worktree_count worktree(s) found: $worktree_list${NC}"
        send_slack_notification "Worktree" "success" "Worktrees Ready" \
            "$worktree_count worktree(s): \`$worktree_list\`" "$latency"
    else
        echo -e "${YELLOW}WARN: No worktrees found in $project_path/worktrees${NC}"
        send_slack_notification "Worktree" "success" "Project Found" \
            "Project exists but no worktrees configured yet." "$latency"
    fi
    return 0
}

test_github() {
    echo -e "${CYAN}Testing GitHub API...${NC}"

    local start_time=$(get_ms)

    if [ -z "${GITHUB_TOKEN:-}" ]; then
        echo -e "${RED}FAIL: GITHUB_TOKEN not configured${NC}"
        send_slack_notification "GitHub" "failure" "Token Missing" \
            "GITHUB_TOKEN not configured in environment"
        return 1
    fi

    local response=$(curl -s -H "Authorization: token $GITHUB_TOKEN" \
        -H "Accept: application/vnd.github.v3+json" \
        "https://api.github.com/user" 2>/dev/null)

    local end_time=$(get_ms)
    local latency=$((end_time - start_time))

    local login=$(echo "$response" | jq -r '.login // empty' 2>/dev/null)
    local rate_limit=$(curl -s -H "Authorization: token $GITHUB_TOKEN" \
        "https://api.github.com/rate_limit" 2>/dev/null | jq -r '.rate.remaining // "N/A"' 2>/dev/null)

    if [ -n "$login" ]; then
        echo -e "${GREEN}PASS: Authenticated as $login (rate limit: $rate_limit remaining)${NC}"
        send_slack_notification "GitHub" "success" "API Connected" \
            "Authenticated as \`$login\`\nRate limit: $rate_limit requests remaining" "$latency"
        return 0
    else
        echo -e "${RED}FAIL: GitHub authentication failed${NC}"
        send_slack_notification "GitHub" "failure" "Auth Failed" \
            "GitHub token invalid or expired"
        return 1
    fi
}

test_vercel() {
    echo -e "${CYAN}Testing Vercel API...${NC}"

    local start_time=$(get_ms)

    if [ -z "${VERCEL_TOKEN:-}" ]; then
        echo -e "${RED}FAIL: VERCEL_TOKEN not configured${NC}"
        send_slack_notification "Vercel" "failure" "Token Missing" \
            "VERCEL_TOKEN not configured in environment"
        return 1
    fi

    local response=$(curl -s -H "Authorization: Bearer $VERCEL_TOKEN" \
        "https://api.vercel.com/v2/user" 2>/dev/null)

    local end_time=$(get_ms)
    local latency=$((end_time - start_time))

    local username=$(echo "$response" | jq -r '.user.username // empty' 2>/dev/null)

    if [ -n "$username" ]; then
        # Get latest deployment
        local project_id="${VERCEL_PROJECT_ID:-}"
        local last_deploy="N/A"
        if [ -n "$project_id" ]; then
            last_deploy=$(curl -s -H "Authorization: Bearer $VERCEL_TOKEN" \
                "https://api.vercel.com/v6/deployments?projectId=$project_id&limit=1" 2>/dev/null | \
                jq -r '.deployments[0].created // "N/A"' 2>/dev/null)
        fi

        echo -e "${GREEN}PASS: Authenticated as $username${NC}"
        send_slack_notification "Vercel" "success" "API Connected" \
            "Authenticated as \`$username\`\nLast deployment: $last_deploy" "$latency"
        return 0
    else
        echo -e "${RED}FAIL: Vercel authentication failed${NC}"
        send_slack_notification "Vercel" "failure" "Auth Failed" \
            "Vercel token invalid or expired"
        return 1
    fi
}

test_neon() {
    echo -e "${CYAN}Testing Neon Database...${NC}"

    local start_time=$(get_ms)

    if [ -z "${NEON_DATABASE_URL:-}" ]; then
        echo -e "${RED}FAIL: NEON_DATABASE_URL not configured${NC}"
        send_slack_notification "Neon" "failure" "URL Missing" \
            "NEON_DATABASE_URL not configured in environment"
        return 1
    fi

    # Test connection with psql if available
    if command -v psql &> /dev/null; then
        local result=$(psql "$NEON_DATABASE_URL" -c "SELECT 1 as test;" 2>&1)
        local end_time=$(get_ms)
        local latency=$((end_time - start_time))

        if echo "$result" | grep -q "1 row"; then
            echo -e "${GREEN}PASS: Neon database connected (${latency}ms)${NC}"
            send_slack_notification "Neon" "success" "Database Connected" \
                "PostgreSQL connection successful\nQuery executed: \`SELECT 1\`" "$latency"
            return 0
        else
            echo -e "${RED}FAIL: Neon query failed${NC}"
            send_slack_notification "Neon" "failure" "Query Failed" \
                "Database connection or query failed"
            return 1
        fi
    else
        # Fallback: just check if URL is parseable
        local host=$(echo "$NEON_DATABASE_URL" | sed -n 's/.*@\([^:\/]*\).*/\1/p')
        local end_time=$(get_ms)
        local latency=$((end_time - start_time))

        if [ -n "$host" ]; then
            echo -e "${YELLOW}PASS: Neon URL configured (psql not available for live test)${NC}"
            echo -e "  Host: $host"
            send_slack_notification "Neon" "success" "URL Configured" \
                "Database URL configured for host: \`$host\`\n(Install psql for live connection test)" "$latency"
            return 0
        else
            echo -e "${RED}FAIL: Invalid NEON_DATABASE_URL format${NC}"
            send_slack_notification "Neon" "failure" "Invalid URL" \
                "NEON_DATABASE_URL format is invalid"
            return 1
        fi
    fi
}

test_claude() {
    echo -e "${CYAN}Testing Claude API...${NC}"

    local start_time=$(get_ms)

    if [ -z "${ANTHROPIC_API_KEY:-}" ]; then
        echo -e "${RED}FAIL: ANTHROPIC_API_KEY not configured${NC}"
        send_slack_notification "Claude API" "failure" "Key Missing" \
            "ANTHROPIC_API_KEY not configured in environment"
        return 1
    fi

    # Test API with minimal request
    local response=$(curl -s -X POST "https://api.anthropic.com/v1/messages" \
        -H "x-api-key: $ANTHROPIC_API_KEY" \
        -H "anthropic-version: 2023-06-01" \
        -H "content-type: application/json" \
        -d '{
            "model": "claude-3-haiku-20240307",
            "max_tokens": 10,
            "messages": [{"role": "user", "content": "Say PING"}]
        }' 2>/dev/null)

    local end_time=$(get_ms)
    local latency=$((end_time - start_time))

    local content=$(echo "$response" | jq -r '.content[0].text // empty' 2>/dev/null)
    local error=$(echo "$response" | jq -r '.error.message // empty' 2>/dev/null)

    if [ -n "$content" ]; then
        echo -e "${GREEN}PASS: Claude API responding (${latency}ms)${NC}"
        echo -e "  Response: $content"
        send_slack_notification "Claude API" "success" "API Ready" \
            "Claude API is operational\nModel: claude-3-haiku\nResponse: \`$content\`" "$latency"
        return 0
    elif [ -n "$error" ]; then
        echo -e "${RED}FAIL: Claude API error: $error${NC}"
        send_slack_notification "Claude API" "failure" "API Error" \
            "Claude API returned error: $error"
        return 1
    else
        echo -e "${RED}FAIL: Claude API no response${NC}"
        send_slack_notification "Claude API" "failure" "No Response" \
            "Claude API did not respond"
        return 1
    fi
}

test_nano_banana() {
    echo -e "${CYAN}Testing Nano Banana (Google Gemini)...${NC}"

    local start_time=$(get_ms)

    if [ -z "${GOOGLE_AI_API_KEY:-}" ]; then
        echo -e "${RED}FAIL: GOOGLE_AI_API_KEY not configured${NC}"
        send_slack_notification "Nano Banana" "failure" "Key Missing" \
            "GOOGLE_AI_API_KEY not configured in environment"
        return 1
    fi

    local model="${NANO_BANANA_MODEL:-gemini-2.0-flash-exp}"

    # Test Gemini API
    local response=$(curl -s -X POST \
        "https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GOOGLE_AI_API_KEY}" \
        -H "Content-Type: application/json" \
        -d '{
            "contents": [{"parts":[{"text":"Say PING"}]}],
            "generationConfig": {"maxOutputTokens": 10}
        }' 2>/dev/null)

    local end_time=$(get_ms)
    local latency=$((end_time - start_time))

    local content=$(echo "$response" | jq -r '.candidates[0].content.parts[0].text // empty' 2>/dev/null)
    local error=$(echo "$response" | jq -r '.error.message // empty' 2>/dev/null)

    if [ -n "$content" ]; then
        echo -e "${GREEN}PASS: Nano Banana (Gemini) responding (${latency}ms)${NC}"
        echo -e "  Model: $model"
        echo -e "  Response: $content"
        send_slack_notification "Nano Banana" "success" "Gemini Ready" \
            "Google Gemini API operational\nModel: \`$model\`\nResponse: \`$content\`" "$latency"
        return 0
    elif [ -n "$error" ]; then
        echo -e "${RED}FAIL: Gemini error: $error${NC}"
        send_slack_notification "Nano Banana" "failure" "API Error" \
            "Gemini API error: $error"
        return 1
    else
        echo -e "${RED}FAIL: Gemini no response${NC}"
        send_slack_notification "Nano Banana" "failure" "No Response" \
            "Gemini API did not respond"
        return 1
    fi
}

run_all_tests() {
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}  WAVE Infrastructure Ping Tests${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""

    local passed=0
    local failed=0
    local tests=("slack" "supabase" "docker" "dozzle" "worktree" "github" "vercel" "neon" "claude" "nano_banana")

    for test in "${tests[@]}"; do
        if "test_$test"; then
            ((passed++))
        else
            ((failed++))
        fi
        echo ""
    done

    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}Passed: $passed${NC} | ${RED}Failed: $failed${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

    # Send summary to Slack
    send_slack_notification "All Tests" \
        "$([ $failed -eq 0 ] && echo 'success' || echo 'failure')" \
        "Test Summary" \
        "Passed: $passed | Failed: $failed"
}

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# MAIN
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

show_help() {
    echo "WAVE Infrastructure Ping Test System"
    echo ""
    echo "Usage: $0 <test-name>"
    echo ""
    echo "Available tests:"
    echo "  slack        Test Slack webhook"
    echo "  supabase     Test Supabase connection"
    echo "  docker       Test Docker containers"
    echo "  dozzle       Test Dozzle dashboard"
    echo "  worktree     Test Git worktree"
    echo "  github       Test GitHub API"
    echo "  vercel       Test Vercel API"
    echo "  neon         Test Neon database"
    echo "  claude       Test Claude API"
    echo "  nano-banana  Test Google Gemini API"
    echo "  all          Run all tests"
    echo ""
    echo "Examples:"
    echo "  $0 slack"
    echo "  $0 claude"
    echo "  $0 all"
}

main() {
    local test_name="${1:-}"

    case "$test_name" in
        slack)          test_slack ;;
        supabase)       test_supabase ;;
        docker)         test_docker ;;
        dozzle)         test_dozzle ;;
        worktree)       test_worktree ;;
        github)         test_github ;;
        vercel)         test_vercel ;;
        neon)           test_neon ;;
        claude)         test_claude ;;
        nano-banana)    test_nano_banana ;;
        all)            run_all_tests ;;
        -h|--help|"")   show_help ;;
        *)
            echo -e "${RED}Unknown test: $test_name${NC}"
            echo ""
            show_help
            exit 1
            ;;
    esac
}

main "$@"
