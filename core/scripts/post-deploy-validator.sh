#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# WAVE FRAMEWORK - Post-Deploy Validator
# ═══════════════════════════════════════════════════════════════════════════════
#
# Version: 1.0.0
# Date: 2026-01-17
#
# Purpose: Validate deployment success AFTER pipeline completion
# Naming: "Post-deploy" = validation after landing (deployment verification)
#
# Usage: ./post-deploy-validator.sh --url <deploy-url> [OPTIONS]
#
# Options:
#   --url <url>       Deployed application URL (required)
#   --endpoints <f>   JSON file with custom endpoints to test
#   --timeout <sec>   Request timeout in seconds (default: 15)
#   --json            Output results as JSON
#   --verbose, -v     Show detailed output
#   -h, --help        Show this help
#
# Exit codes:
#   0 = VERIFIED (deployment successful)
#   1 = FAILED (deployment has issues)
#
# ═══════════════════════════════════════════════════════════════════════════════

VERSION="1.0.0"
DEPLOY_URL=""
ENDPOINTS_FILE=""
TIMEOUT=15
OUTPUT_JSON=false
VERBOSE=false

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Counters
PASS=0
FAIL=0
WARN=0
TOTAL=0

# Results array for JSON
declare -a RESULTS=()

# ─────────────────────────────────────────────────────────────────────────────
# ARGUMENT PARSING
# ─────────────────────────────────────────────────────────────────────────────
show_usage() {
    cat << EOF
WAVE Post-Deploy Validator v${VERSION}

Usage: $0 --url <deploy-url> [OPTIONS]

Options:
  --url <url>       Deployed application URL (required)
  --endpoints <f>   JSON file with custom endpoints to test
  --timeout <sec>   Request timeout in seconds (default: 15)
  --json            Output results as JSON
  --verbose, -v     Show detailed output
  -h, --help        Show this help

Examples:
  $0 --url https://my-app.vercel.app
  $0 --url https://my-app.vercel.app --endpoints custom-tests.json
  $0 --url https://my-app.vercel.app --json > results.json

Default Endpoints Tested:
  - / (Homepage)
  - /api/health (Health check)
  - /about (About page)

EOF
    exit 0
}

while [[ $# -gt 0 ]]; do
    case $1 in
        --url)
            DEPLOY_URL="$2"
            shift 2
            ;;
        --endpoints)
            ENDPOINTS_FILE="$2"
            shift 2
            ;;
        --timeout)
            TIMEOUT="$2"
            shift 2
            ;;
        --json)
            OUTPUT_JSON=true
            shift
            ;;
        --verbose|-v)
            VERBOSE=true
            shift
            ;;
        -h|--help)
            show_usage
            ;;
        *)
            if [[ "$1" == http* ]]; then
                DEPLOY_URL="$1"
            fi
            shift
            ;;
    esac
done

# Validate URL
if [ -z "$DEPLOY_URL" ]; then
    echo "❌ Error: --url is required"
    echo ""
    show_usage
fi

# Remove trailing slash
DEPLOY_URL="${DEPLOY_URL%/}"

# ─────────────────────────────────────────────────────────────────────────────
# HELPER FUNCTIONS
# ─────────────────────────────────────────────────────────────────────────────
check() {
    local name=$1
    local result=$2
    local required=${3:-true}

    ((TOTAL++)) || true

    local status=""
    if [ "$result" = "true" ]; then
        if [ "$OUTPUT_JSON" != "true" ]; then
            echo -e "${GREEN}✅ $name${NC}"
        fi
        ((PASS++)) || true
        status="pass"
    elif [ "$required" = "true" ]; then
        if [ "$OUTPUT_JSON" != "true" ]; then
            echo -e "${RED}❌ $name${NC}"
        fi
        ((FAIL++)) || true
        status="fail"
    else
        if [ "$OUTPUT_JSON" != "true" ]; then
            echo -e "${YELLOW}⚠️  $name (optional)${NC}"
        fi
        ((WARN++)) || true
        status="warn"
    fi

    RESULTS+=("{\"check\":\"$name\",\"status\":\"$status\",\"required\":$required}")
}

section() {
    if [ "$OUTPUT_JSON" != "true" ]; then
        echo ""
        echo -e "${BLUE}═══ $1 ═══${NC}"
    fi
}

verbose() {
    if [ "$VERBOSE" = "true" ] && [ "$OUTPUT_JSON" != "true" ]; then
        echo -e "${CYAN}     └─ $1${NC}"
    fi
}

test_endpoint() {
    local path="$1"
    local name="$2"
    local expected_status="${3:-200}"
    local required="${4:-true}"

    local full_url="${DEPLOY_URL}${path}"
    local response=$(curl -s -o /dev/null -w "%{http_code}|%{time_total}" --max-time "$TIMEOUT" "$full_url" 2>/dev/null)
    local status_code=$(echo "$response" | cut -d'|' -f1)
    local response_time=$(echo "$response" | cut -d'|' -f2)

    if [ "$status_code" = "$expected_status" ]; then
        check "$name (${status_code}, ${response_time}s)" "true" "$required"
    else
        check "$name (got ${status_code}, expected ${expected_status})" "false" "$required"
        verbose "URL: $full_url"
    fi
}

# ─────────────────────────────────────────────────────────────────────────────
# HEADER
# ─────────────────────────────────────────────────────────────────────────────
if [ "$OUTPUT_JSON" != "true" ]; then
    echo "═══════════════════════════════════════════════════════════════════════════════"
    echo "  🚀 WAVE POST-DEPLOY VALIDATOR v${VERSION}"
    echo "═══════════════════════════════════════════════════════════════════════════════"
    echo "  URL: $DEPLOY_URL"
    echo "  Date: $(date)"
    echo "  Timeout: ${TIMEOUT}s per request"
    echo ""
fi

# ─────────────────────────────────────────────────────────────────────────────
# SECTION A: CONNECTIVITY
# ─────────────────────────────────────────────────────────────────────────────
section "SECTION A: CONNECTIVITY"

# Test if URL is reachable
PING_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$DEPLOY_URL" 2>/dev/null || echo "000")
if [ "$PING_STATUS" != "000" ]; then
    check "A1: URL is reachable" "true"
else
    check "A1: URL is reachable" "false"
    verbose "Could not connect to $DEPLOY_URL"

    # If URL not reachable, exit early
    if [ "$OUTPUT_JSON" != "true" ]; then
        echo ""
        echo -e "${RED}Cannot reach deployment URL. Aborting.${NC}"
    fi
    exit 1
fi

# Test SSL certificate (if https)
if [[ "$DEPLOY_URL" == https://* ]]; then
    SSL_CHECK=$(curl -s -o /dev/null -w "%{ssl_verify_result}" --max-time 10 "$DEPLOY_URL" 2>/dev/null || echo "1")
    if [ "$SSL_CHECK" = "0" ]; then
        check "A2: SSL certificate valid" "true"
    else
        check "A2: SSL certificate valid" "false" false
        verbose "SSL verification failed (code: $SSL_CHECK)"
    fi
else
    check "A2: SSL certificate valid" "true" false
    verbose "Not HTTPS, skipping SSL check"
fi

# ─────────────────────────────────────────────────────────────────────────────
# SECTION B: CORE PAGES
# ─────────────────────────────────────────────────────────────────────────────
section "SECTION B: CORE PAGES"

test_endpoint "/" "B1: Homepage" "200" true
test_endpoint "/about" "B2: About page" "200" false
test_endpoint "/contact" "B3: Contact page" "200" false

# ─────────────────────────────────────────────────────────────────────────────
# SECTION C: API ENDPOINTS
# ─────────────────────────────────────────────────────────────────────────────
section "SECTION C: API ENDPOINTS"

test_endpoint "/api/health" "C1: Health endpoint" "200" false
test_endpoint "/api/status" "C2: Status endpoint" "200" false

# ─────────────────────────────────────────────────────────────────────────────
# SECTION D: RESPONSE QUALITY
# ─────────────────────────────────────────────────────────────────────────────
section "SECTION D: RESPONSE QUALITY"

# Check response time
RESPONSE=$(curl -s -o /dev/null -w "%{time_total}" --max-time "$TIMEOUT" "$DEPLOY_URL" 2>/dev/null)
if (( $(echo "$RESPONSE < 3" | bc -l 2>/dev/null || echo "0") )); then
    check "D1: Response time < 3s (${RESPONSE}s)" "true"
elif (( $(echo "$RESPONSE < 5" | bc -l 2>/dev/null || echo "0") )); then
    check "D1: Response time < 3s (${RESPONSE}s)" "false" false
else
    check "D1: Response time < 3s (${RESPONSE}s)" "false" false
fi

# Check for proper content-type
CONTENT_TYPE=$(curl -s -I --max-time "$TIMEOUT" "$DEPLOY_URL" 2>/dev/null | grep -i "content-type" | head -1)
if echo "$CONTENT_TYPE" | grep -qi "text/html"; then
    check "D2: Content-Type is HTML" "true"
else
    check "D2: Content-Type is HTML" "false" false
    verbose "Got: $CONTENT_TYPE"
fi

# Check for no server errors in homepage content
HOMEPAGE_CONTENT=$(curl -s --max-time "$TIMEOUT" "$DEPLOY_URL" 2>/dev/null)
if echo "$HOMEPAGE_CONTENT" | grep -qi "500\|error\|exception\|traceback"; then
    check "D3: No error messages in content" "false" false
    verbose "Found error-like content in page"
else
    check "D3: No error messages in content" "true"
fi

# ─────────────────────────────────────────────────────────────────────────────
# SECTION E: CUSTOM ENDPOINTS (if provided)
# ─────────────────────────────────────────────────────────────────────────────
if [ -n "$ENDPOINTS_FILE" ] && [ -f "$ENDPOINTS_FILE" ]; then
    section "SECTION E: CUSTOM ENDPOINTS"

    if command -v jq &> /dev/null; then
        ENDPOINT_COUNT=$(jq 'length' "$ENDPOINTS_FILE" 2>/dev/null || echo "0")
        verbose "Testing $ENDPOINT_COUNT custom endpoints from $ENDPOINTS_FILE"

        for i in $(seq 0 $((ENDPOINT_COUNT - 1))); do
            PATH_VAL=$(jq -r ".[$i].path" "$ENDPOINTS_FILE" 2>/dev/null)
            NAME_VAL=$(jq -r ".[$i].name // \"E$((i+1)): $PATH_VAL\"" "$ENDPOINTS_FILE" 2>/dev/null)
            EXPECTED=$(jq -r ".[$i].expected // 200" "$ENDPOINTS_FILE" 2>/dev/null)
            REQUIRED=$(jq -r ".[$i].required // true" "$ENDPOINTS_FILE" 2>/dev/null)

            test_endpoint "$PATH_VAL" "$NAME_VAL" "$EXPECTED" "$REQUIRED"
        done
    else
        check "E1: Custom endpoints" "false" false
        verbose "jq not available, skipping custom endpoints"
    fi
fi

# ─────────────────────────────────────────────────────────────────────────────
# SECTION F: SECURITY HEADERS
# ─────────────────────────────────────────────────────────────────────────────
section "SECTION F: SECURITY HEADERS"

HEADERS=$(curl -s -I --max-time "$TIMEOUT" "$DEPLOY_URL" 2>/dev/null)

# Check for common security headers (optional)
if echo "$HEADERS" | grep -qi "x-frame-options"; then
    check "F1: X-Frame-Options header" "true" false
else
    check "F1: X-Frame-Options header" "false" false
fi

if echo "$HEADERS" | grep -qi "x-content-type-options"; then
    check "F2: X-Content-Type-Options header" "true" false
else
    check "F2: X-Content-Type-Options header" "false" false
fi

if echo "$HEADERS" | grep -qi "strict-transport-security"; then
    check "F3: HSTS header" "true" false
else
    check "F3: HSTS header" "false" false
fi

# ─────────────────────────────────────────────────────────────────────────────
# FINAL REPORT
# ─────────────────────────────────────────────────────────────────────────────
if [ "$OUTPUT_JSON" = "true" ]; then
    RESULTS_JSON=$(printf '%s\n' "${RESULTS[@]}" | paste -sd ',' -)
    cat << EOF
{
    "validator": "post-deploy-validator",
    "version": "$VERSION",
    "url": "$DEPLOY_URL",
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "summary": {
        "total": $TOTAL,
        "passed": $PASS,
        "failed": $FAIL,
        "warnings": $WARN
    },
    "verdict": "$([ $FAIL -eq 0 ] && echo "VERIFIED" || echo "FAILED")",
    "results": [$RESULTS_JSON]
}
EOF
else
    echo ""
    echo "═══════════════════════════════════════════════════════════════════════════════"
    echo "  📊 POST-DEPLOY VALIDATION RESULTS"
    echo "═══════════════════════════════════════════════════════════════════════════════"
    echo ""
    echo -e "  ${GREEN}✅ Passed:   $PASS${NC}"
    echo -e "  ${YELLOW}⚠️  Warnings: $WARN${NC}"
    echo -e "  ${RED}❌ Failed:   $FAIL${NC}"
    echo ""

    if [ $FAIL -eq 0 ]; then
        echo -e "${GREEN}╔═══════════════════════════════════════════════════════════════════════════════╗"
        echo "║                                                                               ║"
        echo "║      🟢 VERIFIED - Deployment successful!                                    ║"
        echo "║                                                                               ║"
        echo "╚═══════════════════════════════════════════════════════════════════════════════╝${NC}"
        echo ""
        echo "  Deployment URL: $DEPLOY_URL"
        echo ""
    else
        echo -e "${RED}╔═══════════════════════════════════════════════════════════════════════════════╗"
        echo "║                                                                               ║"
        echo "║      🔴 FAILED - Deployment has issues. Review failed checks.                ║"
        echo "║                                                                               ║"
        echo "╚═══════════════════════════════════════════════════════════════════════════════╝${NC}"
        echo ""
    fi
fi

# Create deployment verification signal
if [ $FAIL -eq 0 ]; then
    SIGNAL_DIR=".claude"
    if [ -d "$SIGNAL_DIR" ]; then
        cat > "${SIGNAL_DIR}/signal-deployment-verified.json" << EOF
{
    "signal_type": "deployment-verified",
    "url": "$DEPLOY_URL",
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "checks_passed": $PASS,
    "checks_total": $TOTAL
}
EOF
        if [ "$OUTPUT_JSON" != "true" ]; then
            verbose "Created signal: ${SIGNAL_DIR}/signal-deployment-verified.json"
        fi
    fi
fi

# Exit with appropriate code
[ $FAIL -eq 0 ] && exit 0 || exit 1
