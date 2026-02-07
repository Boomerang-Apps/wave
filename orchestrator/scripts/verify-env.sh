#!/usr/bin/env bash
# WAVE Environment Verification Script
# Story: WAVE-P0-001
# Purpose: Verify all required services are running and accessible

set -uo pipefail  # Removed -e to allow continuing after failed checks

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
POSTGRES_HOST="${POSTGRES_HOST:-localhost}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
POSTGRES_DB="${POSTGRES_DB:-wave}"
POSTGRES_USER="${POSTGRES_USER:-wave}"
REDIS_HOST="${REDIS_HOST:-localhost}"
REDIS_PORT="${REDIS_PORT:-6379}"
MAX_WAIT_TIME=60

# Counters
PASSED=0
FAILED=0

# Helper functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

check_command() {
    local cmd=$1
    if command -v "$cmd" &> /dev/null; then
        log_info "✓ $cmd is installed"
        ((PASSED++))
        return 0
    else
        log_error "✗ $cmd is not installed"
        ((FAILED++))
        return 1
    fi
}

wait_for_service() {
    local service=$1
    local host=$2
    local port=$3
    local max_wait=$4

    log_info "Waiting for $service to be ready at $host:$port..."

    local elapsed=0
    while [ $elapsed -lt $max_wait ]; do
        if nc -z "$host" "$port" 2>/dev/null; then
            log_info "✓ $service is ready"
            ((PASSED++))
            return 0
        fi
        sleep 1
        ((elapsed++))
    done

    log_error "✗ $service failed to start within ${max_wait}s"
    ((FAILED++))
    return 1
}

# ============================================================================
# VERIFICATION TESTS
# ============================================================================

echo "=================================================="
echo "WAVE Environment Verification"
echo "=================================================="
echo ""

# 1. Check required commands
echo "1. Checking required commands..."
check_command "docker"
check_command "docker-compose"

# psql and redis-cli are optional - we can use docker exec if they're not available
USE_HOST_PSQL=false
USE_HOST_REDIS_CLI=false

if command -v psql &> /dev/null; then
    log_info "✓ psql is installed (host)"
    USE_HOST_PSQL=true
    ((PASSED++))
else
    log_warning "⚠ psql not installed on host, will use docker exec"
fi

if command -v redis-cli &> /dev/null; then
    log_info "✓ redis-cli is installed (host)"
    USE_HOST_REDIS_CLI=true
    ((PASSED++))
else
    log_warning "⚠ redis-cli not installed on host, will use docker exec"
fi

check_command "nc" || check_command "netcat"
echo ""

# 2. Check Docker daemon
echo "2. Checking Docker daemon..."
if docker info &> /dev/null; then
    log_info "✓ Docker daemon is running"
    ((PASSED++))
else
    log_error "✗ Docker daemon is not running"
    log_error "  Please start Docker and try again"
    ((FAILED++))
fi
echo ""

# 3. Check Docker Compose version
echo "3. Checking Docker Compose version..."
COMPOSE_VERSION=$(docker-compose --version | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -n1)
log_info "Docker Compose version: $COMPOSE_VERSION"
((PASSED++))
echo ""

# 4. Wait for PostgreSQL
echo "4. Checking PostgreSQL..."
if wait_for_service "PostgreSQL" "$POSTGRES_HOST" "$POSTGRES_PORT" "$MAX_WAIT_TIME"; then
    # Test connection
    if [ "$USE_HOST_PSQL" = true ]; then
        if PGPASSWORD="${POSTGRES_PASSWORD:-wave}" psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT version();" &> /dev/null; then
            log_info "✓ PostgreSQL connection successful (host psql)"
            ((PASSED++))
            POSTGRES_VERSION=$(PGPASSWORD="${POSTGRES_PASSWORD:-wave}" psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -t -c "SELECT version();" 2>/dev/null | head -n1)
            log_info "  Version: ${POSTGRES_VERSION// /}"
        else
            log_error "✗ PostgreSQL connection failed"
            ((FAILED++))
        fi
    else
        if docker exec wave-postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT version();" &> /dev/null; then
            log_info "✓ PostgreSQL connection successful (docker exec)"
            ((PASSED++))
            POSTGRES_VERSION=$(docker exec wave-postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -t -c "SELECT version();" 2>/dev/null | head -n1)
            log_info "  Version: ${POSTGRES_VERSION// /}"
        else
            log_error "✗ PostgreSQL connection failed"
            log_error "  Container: wave-postgres"
            ((FAILED++))
        fi
    fi
fi
echo ""

# 5. Verify database tables exist
echo "5. Checking database tables..."
if [ "$USE_HOST_PSQL" = true ]; then
    TABLES=$(PGPASSWORD="${POSTGRES_PASSWORD:-wave}" psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -t -c "SELECT tablename FROM pg_tables WHERE schemaname = 'public';" 2>/dev/null || echo "")
else
    TABLES=$(docker exec wave-postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -t -c "SELECT tablename FROM pg_tables WHERE schemaname = 'public';" 2>/dev/null || echo "")
fi

if echo "$TABLES" | grep -q "wave_sessions"; then
    log_info "✓ wave_sessions table exists"
    ((PASSED++))
else
    log_error "✗ wave_sessions table does not exist"
    log_error "  Run migrations: psql -h $POSTGRES_HOST -U $POSTGRES_USER -d $POSTGRES_DB -f orchestrator/migrations/001_initial_schema.sql"
    ((FAILED++))
fi

if echo "$TABLES" | grep -q "wave_checkpoints"; then
    log_info "✓ wave_checkpoints table exists"
    ((PASSED++))
else
    log_error "✗ wave_checkpoints table does not exist"
    ((FAILED++))
fi

if echo "$TABLES" | grep -q "wave_story_executions"; then
    log_info "✓ wave_story_executions table exists"
    ((PASSED++))
else
    log_error "✗ wave_story_executions table does not exist"
    ((FAILED++))
fi
echo ""

# 6. Wait for Redis
echo "6. Checking Redis..."
if wait_for_service "Redis" "$REDIS_HOST" "$REDIS_PORT" "$MAX_WAIT_TIME"; then
    # Test Redis connection
    if [ "$USE_HOST_REDIS_CLI" = true ]; then
        if redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" PING &> /dev/null; then
            log_info "✓ Redis PING successful (host redis-cli)"
            ((PASSED++))
            REDIS_VERSION=$(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" INFO server | grep "redis_version" | cut -d: -f2 | tr -d '\r')
            log_info "  Version: $REDIS_VERSION"
        else
            log_error "✗ Redis PING failed"
            ((FAILED++))
        fi
    else
        if docker exec wave-redis redis-cli PING &> /dev/null; then
            log_info "✓ Redis PING successful (docker exec)"
            ((PASSED++))
            REDIS_VERSION=$(docker exec wave-redis redis-cli INFO server | grep "redis_version" | cut -d: -f2 | tr -d '\r')
            log_info "  Version: $REDIS_VERSION"
        else
            log_error "✗ Redis PING failed"
            log_error "  Container: wave-redis"
            ((FAILED++))
        fi
    fi
fi
echo ""

# 7. Check environment variables
echo "7. Checking environment variables..."
required_vars=(
    "ANTHROPIC_API_KEY"
)

for var in "${required_vars[@]}"; do
    if [ -n "${!var:-}" ]; then
        log_info "✓ $var is set"
        ((PASSED++))
    else
        log_warning "⚠ $var is not set"
        log_warning "  This may be required for full functionality"
    fi
done
echo ""

# 8. Check disk space
echo "8. Checking disk space..."
DISK_USAGE=$(df -h . | awk 'NR==2 {print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -lt 90 ]; then
    log_info "✓ Sufficient disk space (${DISK_USAGE}% used)"
    ((PASSED++))
else
    log_warning "⚠ Low disk space (${DISK_USAGE}% used)"
    log_warning "  Consider freeing up space"
fi
echo ""

# ============================================================================
# SUMMARY
# ============================================================================

echo "=================================================="
echo "Verification Summary"
echo "=================================================="
echo -e "Passed:  ${GREEN}$PASSED${NC}"
echo -e "Failed:  ${RED}$FAILED${NC}"
echo "=================================================="
echo ""

if [ $FAILED -eq 0 ]; then
    log_info "✓ All checks passed! Environment is ready for WAVE."
    exit 0
else
    log_error "✗ Some checks failed. Please fix the issues above."
    echo ""
    echo "Common fixes:"
    echo "  - Start Docker: sudo systemctl start docker (Linux) or open Docker Desktop"
    echo "  - Start services: docker-compose -f docker-compose.wave.yml up -d"
    echo "  - Run migrations: psql -h localhost -U wave -d wave -f orchestrator/migrations/001_initial_schema.sql"
    echo "  - Set API key: export ANTHROPIC_API_KEY=sk-ant-..."
    exit 1
fi
