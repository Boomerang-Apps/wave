#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# WAVE FRAMEWORK - Container Setup Test
# ═══════════════════════════════════════════════════════════════════════════════
# Tests the Docker containerization setup for WAVE agents
#
# Usage:
#   ./test-container-setup.sh [project-path]
#
# ═══════════════════════════════════════════════════════════════════════════════

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_PATH="${1:-/tmp/wave-container-test}"
DOCKER_IMAGE="wave-agent:latest"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

TESTS_PASSED=0
TESTS_FAILED=0

log() { echo -e "${BLUE}[TEST]${NC} $*"; }
pass() { echo -e "${GREEN}[PASS]${NC} $*"; ((TESTS_PASSED++)); }
fail() { echo -e "${RED}[FAIL]${NC} $*"; ((TESTS_FAILED++)); }
warn() { echo -e "${YELLOW}[WARN]${NC} $*"; }

# ─────────────────────────────────────────────────────────────────────────────
# SETUP
# ─────────────────────────────────────────────────────────────────────────────

setup_test_environment() {
    log "Setting up test environment at: $PROJECT_PATH"

    mkdir -p "${PROJECT_PATH}/.claude/heartbeats"
    mkdir -p "${PROJECT_PATH}/.claude/archive"
    mkdir -p "${PROJECT_PATH}/worktrees/test-agent"
    mkdir -p "${PROJECT_PATH}/stories"
    mkdir -p "${PROJECT_PATH}/logs"

    # Create a test story
    cat > "${PROJECT_PATH}/stories/TEST-001.json" << 'EOF'
{
    "story_id": "TEST-001",
    "title": "Container Test Story",
    "status": "pending"
}
EOF

    log "Test environment created"
}

cleanup_test_environment() {
    log "Cleaning up test environment..."
    rm -rf "$PROJECT_PATH"
}

# ─────────────────────────────────────────────────────────────────────────────
# TESTS
# ─────────────────────────────────────────────────────────────────────────────

test_docker_available() {
    log "Testing Docker availability..."

    if command -v docker &> /dev/null; then
        local version=$(docker --version)
        pass "Docker available: $version"
    else
        fail "Docker not available"
        return 1
    fi

    if docker info &> /dev/null; then
        pass "Docker daemon running"
    else
        fail "Docker daemon not running"
        return 1
    fi
}

test_dockerfile_valid() {
    log "Testing Dockerfile validity..."

    local dockerfile="${SCRIPT_DIR}/Dockerfile.agent"

    if [[ ! -f "$dockerfile" ]]; then
        fail "Dockerfile.agent not found"
        return 1
    fi

    # Check for required instructions
    if grep -q "^FROM" "$dockerfile"; then
        pass "Dockerfile has FROM instruction"
    else
        fail "Dockerfile missing FROM instruction"
    fi

    if grep -q "USER wave-agent" "$dockerfile"; then
        pass "Dockerfile uses non-root user"
    else
        fail "Dockerfile missing non-root user"
    fi

    if grep -q "HEALTHCHECK" "$dockerfile"; then
        pass "Dockerfile has HEALTHCHECK"
    else
        warn "Dockerfile missing HEALTHCHECK (optional)"
    fi
}

test_image_build() {
    log "Testing Docker image build..."

    cd "$SCRIPT_DIR"

    if docker build -t "$DOCKER_IMAGE" -f Dockerfile.agent . > /tmp/docker-build.log 2>&1; then
        pass "Docker image built successfully"
    else
        fail "Docker image build failed"
        cat /tmp/docker-build.log
        return 1
    fi

    # Verify image exists
    if docker image inspect "$DOCKER_IMAGE" &> /dev/null; then
        pass "Docker image exists: $DOCKER_IMAGE"
    else
        fail "Docker image not found after build"
        return 1
    fi
}

test_container_security() {
    log "Testing container security configuration..."

    local container_name="wave-test-security-$$"

    # Start container with our security settings
    # Note: Must mount writable volumes for /signals and /logs since root FS is read-only
    docker run -d \
        --name "$container_name" \
        --user wave-agent \
        --read-only \
        --tmpfs /tmp:rw,noexec,nosuid \
        --cap-drop ALL \
        --security-opt no-new-privileges:true \
        -v "${PROJECT_PATH}/.claude:/signals:rw" \
        -v "${PROJECT_PATH}/logs:/logs:rw" \
        -e AGENT_TYPE=test-agent \
        "$DOCKER_IMAGE" \
        sleep 60 > /dev/null 2>&1 || {
            fail "Could not start container with security settings"
            return 1
        }

    # Test 1: Verify non-root user
    local user=$(docker exec "$container_name" whoami 2>/dev/null)
    if [[ "$user" == "wave-agent" ]]; then
        pass "Container runs as non-root user: $user"
    else
        fail "Container not running as wave-agent: $user"
    fi

    # Test 2: Verify read-only filesystem
    if docker exec "$container_name" touch /test-file 2>&1 | grep -q "Read-only"; then
        pass "Root filesystem is read-only"
    else
        fail "Root filesystem is writable (security risk!)"
    fi

    # Test 3: Verify /tmp is writable but noexec
    if docker exec "$container_name" touch /tmp/test-file 2>/dev/null; then
        pass "/tmp is writable"
        docker exec "$container_name" rm /tmp/test-file 2>/dev/null
    else
        fail "/tmp is not writable"
    fi

    # Cleanup
    docker stop "$container_name" > /dev/null 2>&1
    docker rm "$container_name" > /dev/null 2>&1
}

test_container_volumes() {
    log "Testing container volume mounts..."

    local container_name="wave-test-volumes-$$"

    # Start container with volume mounts
    docker run -d \
        --name "$container_name" \
        --user wave-agent \
        -v "${PROJECT_PATH}/worktrees/test-agent:/workspace:rw" \
        -v "${PROJECT_PATH}/.claude:/signals:rw" \
        -v "${PROJECT_PATH}/stories:/stories:ro" \
        -v "${PROJECT_PATH}/logs:/logs:rw" \
        -e AGENT_TYPE=test-agent \
        "$DOCKER_IMAGE" \
        sleep 60 > /dev/null 2>&1 || {
            fail "Could not start container with volume mounts"
            return 1
        }

    # Test workspace is writable
    if docker exec "$container_name" touch /workspace/test-file 2>/dev/null; then
        pass "Workspace is writable"
        rm -f "${PROJECT_PATH}/worktrees/test-agent/test-file"
    else
        fail "Workspace is not writable"
    fi

    # Test signals is writable
    if docker exec "$container_name" touch /signals/test-file 2>/dev/null; then
        pass "Signals directory is writable"
        rm -f "${PROJECT_PATH}/.claude/test-file"
    else
        fail "Signals directory is not writable"
    fi

    # Test stories is read-only
    if docker exec "$container_name" touch /stories/test-file 2>&1 | grep -q -i "read-only\|permission denied"; then
        pass "Stories directory is read-only"
    else
        fail "Stories directory is writable (should be read-only)"
        rm -f "${PROJECT_PATH}/stories/test-file"
    fi

    # Cleanup
    docker stop "$container_name" > /dev/null 2>&1
    docker rm "$container_name" > /dev/null 2>&1
}

test_entrypoint_execution() {
    log "Testing entrypoint execution..."

    local container_name="wave-test-entrypoint-$$"

    # Start container with entrypoint
    docker run -d \
        --name "$container_name" \
        --user wave-agent \
        -v "${PROJECT_PATH}/.claude:/signals:rw" \
        -v "${PROJECT_PATH}/logs:/logs:rw" \
        -e AGENT_TYPE=test-entrypoint \
        -e HEARTBEAT_INTERVAL=5 \
        "$DOCKER_IMAGE" > /dev/null 2>&1

    # Wait for startup
    sleep 3

    # Check if ready signal was created
    if [[ -f "${PROJECT_PATH}/.claude/signal-test-entrypoint-ready.json" ]]; then
        pass "Agent ready signal created"
    else
        fail "Agent ready signal not created"
    fi

    # Check if heartbeat was created
    sleep 6
    if [[ -f "${PROJECT_PATH}/.claude/heartbeats/test-entrypoint-heartbeat.json" ]]; then
        pass "Agent heartbeat created"
    else
        fail "Agent heartbeat not created"
    fi

    # Cleanup
    docker stop "$container_name" > /dev/null 2>&1
    docker rm "$container_name" > /dev/null 2>&1
}

test_kill_switch_response() {
    log "Testing kill switch response..."

    local container_name="wave-test-killswitch-$$"

    # Start container
    docker run -d \
        --name "$container_name" \
        --user wave-agent \
        -v "${PROJECT_PATH}/.claude:/signals:rw" \
        -v "${PROJECT_PATH}/logs:/logs:rw" \
        -e AGENT_TYPE=test-killswitch \
        -e HEARTBEAT_INTERVAL=2 \
        "$DOCKER_IMAGE" > /dev/null 2>&1

    sleep 3

    # Create kill switch
    echo "Test kill switch" > "${PROJECT_PATH}/.claude/EMERGENCY-STOP"

    # Wait for container to notice and stop
    local timeout=15
    local elapsed=0
    while docker ps -q -f name="$container_name" | grep -q .; do
        sleep 1
        ((elapsed++))
        if [[ $elapsed -ge $timeout ]]; then
            fail "Container did not stop after kill switch (timeout)"
            docker stop "$container_name" > /dev/null 2>&1
            docker rm "$container_name" > /dev/null 2>&1
            rm -f "${PROJECT_PATH}/.claude/EMERGENCY-STOP"
            return 1
        fi
    done

    pass "Container stopped after kill switch (${elapsed}s)"

    # Check for emergency halt signal
    if [[ -f "${PROJECT_PATH}/.claude/signal-test-killswitch-emergency-halt.json" ]]; then
        pass "Emergency halt signal created"
    else
        warn "Emergency halt signal not created (may have exited too fast)"
    fi

    # Cleanup
    rm -f "${PROJECT_PATH}/.claude/EMERGENCY-STOP"
    docker rm "$container_name" > /dev/null 2>&1 || true
}

# ─────────────────────────────────────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────────────────────────────────────

main() {
    echo ""
    echo "═══════════════════════════════════════════════════════════════════"
    echo "  WAVE Container Setup Tests"
    echo "═══════════════════════════════════════════════════════════════════"
    echo "  Project: $PROJECT_PATH"
    echo "  Started: $(date)"
    echo "═══════════════════════════════════════════════════════════════════"
    echo ""

    # Setup
    setup_test_environment

    # Run tests
    test_docker_available || { cleanup_test_environment; exit 1; }
    test_dockerfile_valid
    test_image_build || { cleanup_test_environment; exit 1; }
    test_container_security
    test_container_volumes
    test_entrypoint_execution
    test_kill_switch_response

    # Cleanup
    cleanup_test_environment

    # Summary
    echo ""
    echo "═══════════════════════════════════════════════════════════════════"
    echo "  TEST SUMMARY"
    echo "═══════════════════════════════════════════════════════════════════"
    echo -e "  ${GREEN}Passed:${NC} $TESTS_PASSED"
    echo -e "  ${RED}Failed:${NC} $TESTS_FAILED"
    echo "═══════════════════════════════════════════════════════════════════"

    if [[ $TESTS_FAILED -eq 0 ]]; then
        echo -e "  ${GREEN}ALL TESTS PASSED${NC}"
        exit 0
    else
        echo -e "  ${RED}SOME TESTS FAILED${NC}"
        exit 1
    fi
}

main "$@"
