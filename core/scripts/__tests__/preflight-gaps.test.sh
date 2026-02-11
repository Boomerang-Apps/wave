#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# TDD TESTS: Pre-Flight Gap Fixes
# ═══════════════════════════════════════════════════════════════════════════════
# Phase: RED (Tests should FAIL until implementation)
# Date: 2026-01-28
# Author: Claude Code (TDD compliance)
#
# Run: ./preflight-gaps.test.sh
# Expected: ALL TESTS FAIL (RED) until fixes implemented
# ═══════════════════════════════════════════════════════════════════════════════

# Don't exit on error - we want to see all test results
set +e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

PASS_COUNT=0
FAIL_COUNT=0
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PREFLIGHT_SCRIPT="${SCRIPT_DIR}/../pre-flight-validator.sh"

# Test helper
assert_check_exists() {
    local check_name="$1"
    local description="$2"

    if grep -q "$check_name" "$PREFLIGHT_SCRIPT" 2>/dev/null; then
        echo -e "${GREEN}✅ PASS:${NC} $description"
        ((PASS_COUNT++))
    else
        echo -e "${RED}❌ FAIL:${NC} $description"
        ((FAIL_COUNT++))
    fi
}

assert_pattern_exists() {
    local pattern="$1"
    local description="$2"

    if grep -qE "$pattern" "$PREFLIGHT_SCRIPT" 2>/dev/null; then
        echo -e "${GREEN}✅ PASS:${NC} $description"
        ((PASS_COUNT++))
    else
        echo -e "${RED}❌ FAIL:${NC} $description"
        ((FAIL_COUNT++))
    fi
}

echo "═══════════════════════════════════════════════════════════════════════════════"
echo "  TDD TESTS: Pre-Flight Gap Fixes (RED Phase)"
echo "  Expected: ALL FAIL until implementation"
echo "═══════════════════════════════════════════════════════════════════════════════"
echo ""

# ─────────────────────────────────────────────────────────────────────────────
# TEST SUITE 1: Slack Channel Validation (Section K-EXT)
# ─────────────────────────────────────────────────────────────────────────────
echo "▶ TEST SUITE 1: Slack Channel Validation"
echo "───────────────────────────────────────────────────────────────────────────────"

# Test K4: slack_channel field validation
assert_check_exists "K4:" "K4 check exists in pre-flight"
assert_pattern_exists "slack_channel" "Pre-flight validates slack_channel in P.json"

# Test K5: Slack webhook destination test
assert_check_exists "K5:" "K5 check exists in pre-flight"
assert_pattern_exists "SLACK.*channel|channel.*SLACK" "Pre-flight validates Slack channel destination"

echo ""

# ─────────────────────────────────────────────────────────────────────────────
# TEST SUITE 2: LangSmith Propagation (Section L-EXT)
# ─────────────────────────────────────────────────────────────────────────────
echo "▶ TEST SUITE 2: LangSmith Propagation"
echo "───────────────────────────────────────────────────────────────────────────────"

# Test L5: LANGSMITH count in docker-compose
assert_check_exists "L5:" "L5 check exists in pre-flight"
assert_pattern_exists "LANGSMITH.*docker-compose|docker-compose.*LANGSMITH" "Pre-flight validates LANGSMITH in docker-compose"

# Test L6: LANGSMITH propagation verification
assert_check_exists "L6:" "L6 check exists in pre-flight"
assert_pattern_exists "LANGSMITH.*propagat|agent.*LANGSMITH" "Pre-flight validates LANGSMITH propagation to agents"

echo ""

# ─────────────────────────────────────────────────────────────────────────────
# TEST SUITE 3: Container Management (Section M)
# ─────────────────────────────────────────────────────────────────────────────
echo "▶ TEST SUITE 3: Container Management"
echo "───────────────────────────────────────────────────────────────────────────────"

# Test M1: Stale container check
assert_check_exists "M1:" "M1 check exists in pre-flight"
assert_pattern_exists "stale|exited.*container|container.*cleanup" "Pre-flight checks for stale containers"

# Test M2: Container count validation
assert_check_exists "M2:" "M2 check exists in pre-flight"
assert_pattern_exists "container.*count|expected.*container" "Pre-flight validates expected container count"

echo ""

# ─────────────────────────────────────────────────────────────────────────────
# TEST SUITE 4: Docker-Compose LANGSMITH Coverage
# ─────────────────────────────────────────────────────────────────────────────
echo "▶ TEST SUITE 4: Docker-Compose LANGSMITH Coverage"
echo "───────────────────────────────────────────────────────────────────────────────"

DOCKER_COMPOSE="/Volumes/SSD-01/Projects/WAVE/docker-compose.yml"
LANGSMITH_COUNT=$(grep -c "LANGSMITH" "$DOCKER_COMPOSE" 2>/dev/null || echo "0")

if [ "$LANGSMITH_COUNT" -ge 27 ]; then  # 3 vars * 9 services = 27
    echo -e "${GREEN}✅ PASS:${NC} docker-compose has LANGSMITH in >=9 services ($LANGSMITH_COUNT refs)"
    ((PASS_COUNT++))
else
    echo -e "${RED}❌ FAIL:${NC} docker-compose missing LANGSMITH (found $LANGSMITH_COUNT, need >=27)"
    ((FAIL_COUNT++))
fi

# Check specific services
for svc in cto fe-dev-1 fe-dev-2 be-dev-1 be-dev-2 qa dev-fix; do
    if grep -A30 "container_name: wave-${svc}" "$DOCKER_COMPOSE" | grep -q "LANGSMITH" 2>/dev/null; then
        echo -e "${GREEN}✅ PASS:${NC} $svc service has LANGSMITH"
        ((PASS_COUNT++))
    else
        echo -e "${RED}❌ FAIL:${NC} $svc service missing LANGSMITH"
        ((FAIL_COUNT++))
    fi
done

echo ""

# ─────────────────────────────────────────────────────────────────────────────
# SUMMARY
# ─────────────────────────────────────────────────────────────────────────────
echo "═══════════════════════════════════════════════════════════════════════════════"
echo "  TDD TEST RESULTS"
echo "═══════════════════════════════════════════════════════════════════════════════"
echo ""
echo -e "  ${GREEN}Passed:${NC} $PASS_COUNT"
echo -e "  ${RED}Failed:${NC} $FAIL_COUNT"
echo ""

TOTAL=$((PASS_COUNT + FAIL_COUNT))
if [ "$FAIL_COUNT" -eq 0 ]; then
    echo -e "${GREEN}═══════════════════════════════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}  ALL TESTS PASS - GREEN PHASE COMPLETE${NC}"
    echo -e "${GREEN}═══════════════════════════════════════════════════════════════════════════════${NC}"
    exit 0
else
    echo -e "${RED}═══════════════════════════════════════════════════════════════════════════════${NC}"
    echo -e "${RED}  $FAIL_COUNT TESTS FAILING - RED PHASE (Expected before implementation)${NC}"
    echo -e "${RED}═══════════════════════════════════════════════════════════════════════════════${NC}"
    exit 1
fi
