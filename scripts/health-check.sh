#!/bin/bash
# WAVE V2.1 - Health Check Script
# Verifies all services are healthy

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
ORCHESTRATOR_URL="${ORCHESTRATOR_URL:-http://localhost:8000}"
PROMETHEUS_URL="${PROMETHEUS_URL:-http://localhost:9090}"
GRAFANA_URL="${GRAFANA_URL:-http://localhost:3000}"

echo "======================================================================"
echo "WAVE V2.1 - Health Check"
echo "======================================================================"
echo ""

# Track failures
FAILED=0

# Function to check service
check_service() {
    local service_name=$1
    local expected_state=$2

    echo -n "Checking $service_name... "

    STATE=$(docker-compose -f "$COMPOSE_FILE" ps "$service_name" --format json 2>/dev/null | jq -r '.[0].State' 2>/dev/null || echo "not found")

    if [ "$STATE" = "$expected_state" ]; then
        echo -e "${GREEN}✓ $STATE${NC}"
        return 0
    else
        echo -e "${RED}✗ $STATE (expected: $expected_state)${NC}"
        FAILED=$((FAILED + 1))
        return 1
    fi
}

# Function to check HTTP endpoint
check_http() {
    local name=$1
    local url=$2
    local expected_code=${3:-200}

    echo -n "Checking $name API... "

    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null || echo "000")

    if [ "$HTTP_CODE" = "$expected_code" ]; then
        echo -e "${GREEN}✓ HTTP $HTTP_CODE${NC}"
        return 0
    else
        echo -e "${RED}✗ HTTP $HTTP_CODE (expected: $expected_code)${NC}"
        FAILED=$((FAILED + 1))
        return 1
    fi
}

# Check Docker
echo "1. Docker Services"
echo "─────────────────"
check_service "redis" "running"
check_service "postgres" "running"
check_service "orchestrator" "running"
check_service "prometheus" "running"
check_service "grafana" "running"
check_service "dozzle" "running"
check_service "merge-watcher" "running"
echo ""

# Check Health Endpoints
echo "2. Health Endpoints"
echo "──────────────────"
check_http "Orchestrator" "$ORCHESTRATOR_URL/health"
check_http "Prometheus" "$PROMETHEUS_URL/-/healthy"
check_http "Grafana" "$GRAFANA_URL/api/health"
echo ""

# Check Redis
echo "3. Redis Connectivity"
echo "────────────────────"
echo -n "Checking Redis ping... "
if docker exec wave-redis redis-cli -a "${REDIS_PASSWORD}" ping 2>/dev/null | grep -q "PONG"; then
    echo -e "${GREEN}✓ PONG${NC}"
else
    echo -e "${RED}✗ No response${NC}"
    FAILED=$((FAILED + 1))
fi
echo ""

# Check PostgreSQL
echo "4. PostgreSQL Connectivity"
echo "─────────────────────────"
echo -n "Checking PostgreSQL... "
if docker exec wave-postgres pg_isready -U wave 2>/dev/null | grep -q "accepting connections"; then
    echo -e "${GREEN}✓ Accepting connections${NC}"
else
    echo -e "${RED}✗ Not ready${NC}"
    FAILED=$((FAILED + 1))
fi
echo ""

# Check Disk Space
echo "5. Disk Space"
echo "────────────"
DISK_USAGE=$(df -h /opt/wave 2>/dev/null | awk 'NR==2 {print $5}' | sed 's/%//')
echo -n "Checking disk usage... "
if [ "$DISK_USAGE" -lt 80 ]; then
    echo -e "${GREEN}✓ ${DISK_USAGE}% used${NC}"
elif [ "$DISK_USAGE" -lt 90 ]; then
    echo -e "${YELLOW}⚠ ${DISK_USAGE}% used${NC}"
else
    echo -e "${RED}✗ ${DISK_USAGE}% used (critical)${NC}"
    FAILED=$((FAILED + 1))
fi
echo ""

# Check Memory
echo "6. Memory Usage"
echo "──────────────"
MEMORY_USAGE=$(free | grep Mem | awk '{printf "%.0f", $3/$2 * 100}')
echo -n "Checking memory usage... "
if [ "$MEMORY_USAGE" -lt 80 ]; then
    echo -e "${GREEN}✓ ${MEMORY_USAGE}% used${NC}"
elif [ "$MEMORY_USAGE" -lt 90 ]; then
    echo -e "${YELLOW}⚠ ${MEMORY_USAGE}% used${NC}"
else
    echo -e "${RED}✗ ${MEMORY_USAGE}% used (critical)${NC}"
    FAILED=$((FAILED + 1))
fi
echo ""

# Summary
echo "======================================================================"
if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All health checks passed${NC}"
    echo "======================================================================"
    exit 0
else
    echo -e "${RED}✗ $FAILED health check(s) failed${NC}"
    echo "======================================================================"
    echo ""
    echo "Troubleshooting:"
    echo "1. Check logs: docker-compose -f $COMPOSE_FILE logs"
    echo "2. Review docs/OPERATOR-RUNBOOK.md"
    echo "3. Contact on-call engineer"
    exit 1
fi
