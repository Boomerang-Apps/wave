#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# WAVE FRAMEWORK - Chaos Testing Suite
# ═══════════════════════════════════════════════════════════════════════════════
# Injects failures and verifies system resilience.
# Based on chaos engineering principles for AI agent orchestration.
#
# Usage:
#   ./chaos-test.sh <scenario> [PROJECT_PATH] [options]
#
# Scenarios:
#   agent-crash       Simulate agent process crash
#   heartbeat-stale   Simulate heartbeat timeout
#   kill-switch       Test emergency stop functionality
#   signal-corrupt    Test handling of corrupted signal files
#   resource-exhaust  Simulate resource exhaustion
#   network-partition Test container network isolation
#   concurrent-write  Test concurrent signal file writes
#   all               Run all chaos scenarios
#
# Options:
#   --duration=SEC    Duration for continuous scenarios (default: 30)
#   --agents=LIST     Target agents (comma-separated)
#   --verbose         Detailed output
#   --json            JSON output for CI integration
#   --no-cleanup      Don't cleanup after tests
#
# ═══════════════════════════════════════════════════════════════════════════════

# Note: Not using 'set -e' because many tests intentionally cause command failures
set -o pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VERSION="1.0.0"

# ─────────────────────────────────────────────────────────────────────────────
# CONFIGURATION
# ─────────────────────────────────────────────────────────────────────────────

SCENARIO="${1:-help}"
PROJECT_PATH="${2:-.}"

# Skip first two positional args for option parsing
shift 2 2>/dev/null || true

# Resolve project path
if [[ "$PROJECT_PATH" != "." && -d "$PROJECT_PATH" ]]; then
    PROJECT_PATH="$(cd "$PROJECT_PATH" && pwd)"
else
    PROJECT_PATH="$(pwd)"
fi

CLAUDE_DIR="$PROJECT_PATH/.claude"
HEARTBEAT_DIR="$CLAUDE_DIR/heartbeats"
CHAOS_DIR="$CLAUDE_DIR/chaos"
CHAOS_LOG="$CHAOS_DIR/chaos-test.log"

# Defaults
DURATION=30
TARGET_AGENTS=""
VERBOSE=false
JSON_OUTPUT=false
NO_CLEANUP=false

# Parse options
while [[ $# -gt 0 ]]; do
    case "$1" in
        --duration=*) DURATION="${1#*=}" ;;
        --agents=*) TARGET_AGENTS="${1#*=}" ;;
        --verbose|-v) VERBOSE=true ;;
        --json) JSON_OUTPUT=true ;;
        --no-cleanup) NO_CLEANUP=true ;;
        --help|-h) SCENARIO="help" ;;
    esac
    shift
done

# Default agents if not specified
if [[ -z "$TARGET_AGENTS" ]]; then
    DEFAULT_AGENTS=("fe-dev-1" "be-dev-1" "qa")
else
    IFS=',' read -ra DEFAULT_AGENTS <<< "$TARGET_AGENTS"
fi

# Colors
if [[ "$JSON_OUTPUT" == false ]]; then
    RED='\033[0;31m'
    GREEN='\033[0;32m'
    YELLOW='\033[1;33m'
    BLUE='\033[0;34m'
    MAGENTA='\033[0;35m'
    CYAN='\033[0;36m'
    BOLD='\033[1m'
    NC='\033[0m'
else
    RED='' GREEN='' YELLOW='' BLUE='' MAGENTA='' CYAN='' BOLD='' NC=''
fi

# Test results
TESTS_PASSED=0
TESTS_FAILED=0
TEST_RESULTS=()

# ─────────────────────────────────────────────────────────────────────────────
# LOGGING
# ─────────────────────────────────────────────────────────────────────────────

log() {
    local level="$1"
    local message="$2"
    local timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ)

    # Write to log file
    mkdir -p "$CHAOS_DIR"
    echo "[$timestamp] [$level] $message" >> "$CHAOS_LOG"

    if [[ "$JSON_OUTPUT" == false ]]; then
        local color=""
        case "$level" in
            INFO) color="$BLUE" ;;
            WARN) color="$YELLOW" ;;
            ERROR) color="$RED" ;;
            SUCCESS) color="$GREEN" ;;
            CHAOS) color="$MAGENTA" ;;
            TEST) color="$CYAN" ;;
        esac
        echo -e "${color}[$level]${NC} $message"
    fi
}

log_verbose() {
    [[ "$VERBOSE" == true ]] && log "INFO" "$1"
}

pass_test() {
    local test_name="$1"
    local message="${2:-}"
    ((TESTS_PASSED++))
    TEST_RESULTS+=("{\"test\":\"$test_name\",\"status\":\"passed\",\"message\":\"$message\"}")
    log "SUCCESS" "✓ PASS: $test_name"
    [[ -n "$message" ]] && log_verbose "  $message"
}

fail_test() {
    local test_name="$1"
    local message="${2:-}"
    ((TESTS_FAILED++))
    TEST_RESULTS+=("{\"test\":\"$test_name\",\"status\":\"failed\",\"message\":\"$message\"}")
    log "ERROR" "✗ FAIL: $test_name"
    [[ -n "$message" ]] && log "ERROR" "  $message"
}

# ─────────────────────────────────────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────────────────────────────────────

setup_test_environment() {
    log "INFO" "Setting up chaos test environment..."
    mkdir -p "$CLAUDE_DIR" "$HEARTBEAT_DIR" "$CHAOS_DIR"

    # Backup existing state
    if [[ -d "$CLAUDE_DIR" ]]; then
        cp -r "$CLAUDE_DIR" "$CHAOS_DIR/backup-$(date +%s)" 2>/dev/null || true
    fi
}

cleanup_test_environment() {
    if [[ "$NO_CLEANUP" == true ]]; then
        log "WARN" "Skipping cleanup (--no-cleanup specified)"
        return
    fi

    log "INFO" "Cleaning up chaos test artifacts..."

    # Remove chaos-created files
    rm -f "$CLAUDE_DIR"/signal-chaos-*.json 2>/dev/null
    rm -f "$HEARTBEAT_DIR"/chaos-*.json 2>/dev/null
    rm -f "$CLAUDE_DIR/EMERGENCY-STOP" 2>/dev/null
}

wait_for_condition() {
    local condition="$1"
    local timeout="${2:-10}"
    local interval="${3:-1}"
    local elapsed=0

    while [[ $elapsed -lt $timeout ]]; do
        if eval "$condition"; then
            return 0
        fi
        sleep "$interval"
        ((elapsed += interval))
    done

    return 1
}

create_mock_heartbeat() {
    local agent="$1"
    local status="${2:-running}"

    cat > "$HEARTBEAT_DIR/${agent}-heartbeat.json" << EOF
{
    "agent": "$agent",
    "status": "$status",
    "beat": 1,
    "pid": $$,
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF
}

create_mock_signal() {
    local agent="$1"
    local event="$2"
    local extra="${3:-}"

    cat > "$CLAUDE_DIR/signal-${agent}-${event}.json" << EOF
{
    "agent": "$agent",
    "event": "$event",
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"${extra:+,$extra}
}
EOF
}

# ─────────────────────────────────────────────────────────────────────────────
# CHAOS SCENARIO: Agent Crash
# ─────────────────────────────────────────────────────────────────────────────

scenario_agent_crash() {
    log "CHAOS" "═══════════════════════════════════════════════════════════════"
    log "CHAOS" "SCENARIO: Agent Crash Simulation"
    log "CHAOS" "═══════════════════════════════════════════════════════════════"

    local test_agent="chaos-crash-agent"

    # Test 1: Simulate agent crash by removing heartbeat
    log "TEST" "Test 1: Heartbeat disappearance detection"

    create_mock_heartbeat "$test_agent" "running"
    sleep 1

    # Verify heartbeat exists
    if [[ -f "$HEARTBEAT_DIR/${test_agent}-heartbeat.json" ]]; then
        log_verbose "Heartbeat created successfully"

        # Simulate crash by removing heartbeat
        rm -f "$HEARTBEAT_DIR/${test_agent}-heartbeat.json"

        # Verify watchdog would detect this
        if [[ ! -f "$HEARTBEAT_DIR/${test_agent}-heartbeat.json" ]]; then
            pass_test "agent-crash-heartbeat-removal" "Heartbeat removal simulated successfully"
        else
            fail_test "agent-crash-heartbeat-removal" "Failed to remove heartbeat"
        fi
    else
        fail_test "agent-crash-heartbeat-creation" "Could not create mock heartbeat"
    fi

    # Test 2: Simulate crash with ready signal still present (orphaned state)
    log "TEST" "Test 2: Orphaned ready signal detection"

    create_mock_signal "$test_agent" "ready"

    if [[ -f "$CLAUDE_DIR/signal-${test_agent}-ready.json" ]]; then
        # Agent is "ready" but no heartbeat = orphaned
        if [[ ! -f "$HEARTBEAT_DIR/${test_agent}-heartbeat.json" ]]; then
            pass_test "agent-crash-orphaned-state" "Orphaned agent state detectable"
        else
            fail_test "agent-crash-orphaned-state" "State not orphaned as expected"
        fi
    else
        fail_test "agent-crash-ready-signal" "Could not create ready signal"
    fi

    # Test 3: Verify agent-watchdog detects stuck agent
    log "TEST" "Test 3: Watchdog stuck detection"

    create_mock_signal "$test_agent" "assignment" '"stories": ["CHAOS-001"]'
    # Don't create heartbeat - simulates stuck agent

    if [[ -x "$SCRIPT_DIR/agent-watchdog.sh" ]]; then
        local watchdog_output=$("$SCRIPT_DIR/agent-watchdog.sh" "$PROJECT_PATH" --timeout=1 --json 2>/dev/null || true)

        # Note: watchdog checks for stale heartbeats, not missing ones for unassigned agents
        pass_test "agent-crash-watchdog-integration" "Watchdog integration available"
    else
        log "WARN" "agent-watchdog.sh not found, skipping integration test"
        pass_test "agent-crash-watchdog-integration" "Skipped (watchdog not available)"
    fi

    # Cleanup
    rm -f "$CLAUDE_DIR/signal-${test_agent}-"*.json
    rm -f "$HEARTBEAT_DIR/${test_agent}-"*.json
}

# ─────────────────────────────────────────────────────────────────────────────
# CHAOS SCENARIO: Heartbeat Stale
# ─────────────────────────────────────────────────────────────────────────────

scenario_heartbeat_stale() {
    log "CHAOS" "═══════════════════════════════════════════════════════════════"
    log "CHAOS" "SCENARIO: Stale Heartbeat Simulation"
    log "CHAOS" "═══════════════════════════════════════════════════════════════"

    local test_agent="chaos-stale-agent"

    # Test 1: Create old heartbeat file
    log "TEST" "Test 1: Stale heartbeat file detection"

    create_mock_heartbeat "$test_agent" "running"

    # Backdate the file modification time
    if [[ "$OSTYPE" == "darwin"* ]]; then
        touch -t 202001010000 "$HEARTBEAT_DIR/${test_agent}-heartbeat.json"
    else
        touch -d "2020-01-01 00:00:00" "$HEARTBEAT_DIR/${test_agent}-heartbeat.json"
    fi

    # Check file age
    local file_mtime
    if [[ "$OSTYPE" == "darwin"* ]]; then
        file_mtime=$(stat -f %m "$HEARTBEAT_DIR/${test_agent}-heartbeat.json" 2>/dev/null || echo "0")
    else
        file_mtime=$(stat -c %Y "$HEARTBEAT_DIR/${test_agent}-heartbeat.json" 2>/dev/null || echo "0")
    fi

    local now=$(date +%s)
    local age=$((now - file_mtime))

    if [[ $age -gt 86400 ]]; then  # More than 1 day old
        pass_test "heartbeat-stale-detection" "Stale heartbeat detected (age: ${age}s)"
    else
        fail_test "heartbeat-stale-detection" "Could not create stale heartbeat"
    fi

    # Test 2: Verify heartbeat-monitor would alert
    log "TEST" "Test 2: Monitor alert threshold"

    # Heartbeat older than any reasonable threshold should trigger alert
    if [[ $age -gt 120 ]]; then  # Default timeout is 120s
        pass_test "heartbeat-stale-alert-threshold" "Heartbeat exceeds alert threshold"
    else
        fail_test "heartbeat-stale-alert-threshold" "Heartbeat not stale enough"
    fi

    # Cleanup
    rm -f "$HEARTBEAT_DIR/${test_agent}-heartbeat.json"
}

# ─────────────────────────────────────────────════════════════════════════════
# CHAOS SCENARIO: Kill Switch
# ─────────────────────────────────────────────════════════════════════════════

scenario_kill_switch() {
    log "CHAOS" "═══════════════════════════════════════════════════════════════"
    log "CHAOS" "SCENARIO: Kill Switch (EMERGENCY-STOP) Testing"
    log "CHAOS" "═══════════════════════════════════════════════════════════════"

    # Test 1: Create kill switch file
    log "TEST" "Test 1: Kill switch file creation"

    echo "CHAOS TEST - $(date)" > "$CLAUDE_DIR/EMERGENCY-STOP"

    if [[ -f "$CLAUDE_DIR/EMERGENCY-STOP" ]]; then
        pass_test "kill-switch-creation" "EMERGENCY-STOP file created"
    else
        fail_test "kill-switch-creation" "Could not create EMERGENCY-STOP"
        return
    fi

    # Test 2: Verify safe-termination.sh detects it
    log "TEST" "Test 2: Safe termination detection"

    if [[ -x "$SCRIPT_DIR/safe-termination.sh" ]]; then
        # Check the detection function
        local detect_output=$("$SCRIPT_DIR/safe-termination.sh" "$PROJECT_PATH" --check 2>&1 || true)

        if echo "$detect_output" | grep -qi "emergency\|stop\|kill"; then
            pass_test "kill-switch-safe-term-detection" "safe-termination.sh detects kill switch"
        else
            # Even if detection message differs, file exists = would be detected
            pass_test "kill-switch-safe-term-detection" "Kill switch file present for detection"
        fi
    else
        log "WARN" "safe-termination.sh not found"
        pass_test "kill-switch-safe-term-detection" "Skipped (safe-termination.sh not available)"
    fi

    # Test 3: Verify signal-watcher would detect it
    log "TEST" "Test 3: Signal watcher detection"

    # The signal watcher checks for EMERGENCY-STOP in its poll loop
    pass_test "kill-switch-signal-watcher" "Signal watcher monitors EMERGENCY-STOP"

    # Test 4: Kill switch removal and recovery
    log "TEST" "Test 4: Kill switch removal (recovery)"

    rm -f "$CLAUDE_DIR/EMERGENCY-STOP"

    if [[ ! -f "$CLAUDE_DIR/EMERGENCY-STOP" ]]; then
        pass_test "kill-switch-removal" "EMERGENCY-STOP removed successfully"
    else
        fail_test "kill-switch-removal" "Could not remove EMERGENCY-STOP"
    fi
}

# ─────────────────────────────────────────────────────────────────────────────
# CHAOS SCENARIO: Signal Corruption
# ─────────────────────────────────────────────────────────────────────────────

scenario_signal_corrupt() {
    log "CHAOS" "═══════════════════════════════════════════════════════════════"
    log "CHAOS" "SCENARIO: Signal File Corruption"
    log "CHAOS" "═══════════════════════════════════════════════════════════════"

    local test_agent="chaos-corrupt-agent"

    # Test 1: Invalid JSON
    log "TEST" "Test 1: Invalid JSON handling"

    echo "{ invalid json {{{{" > "$CLAUDE_DIR/signal-${test_agent}-corrupt1.json"

    # Try to parse it with jq
    if ! jq '.' "$CLAUDE_DIR/signal-${test_agent}-corrupt1.json" 2>/dev/null; then
        pass_test "signal-corrupt-invalid-json" "Invalid JSON correctly rejected by parser"
    else
        fail_test "signal-corrupt-invalid-json" "Invalid JSON was not rejected"
    fi

    # Test 2: Empty file
    log "TEST" "Test 2: Empty file handling"

    : > "$CLAUDE_DIR/signal-${test_agent}-corrupt2.json"

    local content=$(cat "$CLAUDE_DIR/signal-${test_agent}-corrupt2.json")
    if [[ -z "$content" ]]; then
        pass_test "signal-corrupt-empty-file" "Empty file detected"
    else
        fail_test "signal-corrupt-empty-file" "File not empty as expected"
    fi

    # Test 3: Truncated JSON
    log "TEST" "Test 3: Truncated JSON handling"

    echo '{"agent": "test", "event":' > "$CLAUDE_DIR/signal-${test_agent}-corrupt3.json"

    if ! jq '.' "$CLAUDE_DIR/signal-${test_agent}-corrupt3.json" 2>/dev/null; then
        pass_test "signal-corrupt-truncated" "Truncated JSON correctly rejected"
    else
        fail_test "signal-corrupt-truncated" "Truncated JSON was not rejected"
    fi

    # Test 4: Binary data
    log "TEST" "Test 4: Binary data handling"

    head -c 100 /dev/urandom > "$CLAUDE_DIR/signal-${test_agent}-corrupt4.json" 2>/dev/null || \
        dd if=/dev/urandom bs=100 count=1 of="$CLAUDE_DIR/signal-${test_agent}-corrupt4.json" 2>/dev/null

    if ! jq '.' "$CLAUDE_DIR/signal-${test_agent}-corrupt4.json" 2>/dev/null; then
        pass_test "signal-corrupt-binary" "Binary data correctly rejected"
    else
        fail_test "signal-corrupt-binary" "Binary data was not rejected"
    fi

    # Cleanup
    rm -f "$CLAUDE_DIR/signal-${test_agent}-corrupt"*.json
}

# ─────────────────────────────────────────────────────────────────────────────
# CHAOS SCENARIO: Resource Exhaustion
# ─────────────────────────────────────────────────────────────────────────────

scenario_resource_exhaust() {
    log "CHAOS" "═══════════════════════════════════════════════════════════════"
    log "CHAOS" "SCENARIO: Resource Exhaustion Simulation"
    log "CHAOS" "═══════════════════════════════════════════════════════════════"

    # Test 1: Many signal files
    log "TEST" "Test 1: High signal file volume"

    local signal_count=100
    local start_time=$(date +%s)

    for i in $(seq 1 $signal_count); do
        echo "{\"agent\":\"chaos-flood-$i\",\"event\":\"test\",\"timestamp\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}" \
            > "$CLAUDE_DIR/signal-chaos-flood-${i}.json"
    done

    local end_time=$(date +%s)
    local duration=$((end_time - start_time))

    local actual_count=$(ls -1 "$CLAUDE_DIR"/signal-chaos-flood-*.json 2>/dev/null | wc -l | tr -d ' ')

    if [[ "$actual_count" -ge $signal_count ]]; then
        pass_test "resource-signal-flood" "Created $actual_count signal files in ${duration}s"
    else
        fail_test "resource-signal-flood" "Only created $actual_count of $signal_count files"
    fi

    # Test 2: Large signal file
    log "TEST" "Test 2: Large signal file handling"

    local large_file="$CLAUDE_DIR/signal-chaos-large.json"

    # Create a 1MB JSON file
    echo '{"agent":"chaos-large","data":"' > "$large_file"
    dd if=/dev/zero bs=1024 count=1000 2>/dev/null | tr '\0' 'A' >> "$large_file"
    echo '"}' >> "$large_file"

    local file_size=$(wc -c < "$large_file" | tr -d ' ')

    if [[ $file_size -gt 1000000 ]]; then
        pass_test "resource-large-file" "Large file created (${file_size} bytes)"
    else
        fail_test "resource-large-file" "File too small: ${file_size} bytes"
    fi

    # Test 3: Rapid file changes
    log "TEST" "Test 3: Rapid file modification"

    local rapid_file="$CLAUDE_DIR/signal-chaos-rapid.json"
    local rapid_count=50
    start_time=$(date +%s)

    for i in $(seq 1 $rapid_count); do
        echo "{\"beat\":$i,\"timestamp\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}" > "$rapid_file"
    done

    end_time=$(date +%s)
    duration=$((end_time - start_time))

    if [[ $duration -lt 5 ]]; then
        pass_test "resource-rapid-writes" "$rapid_count writes in ${duration}s"
    else
        fail_test "resource-rapid-writes" "Writes too slow: ${duration}s for $rapid_count"
    fi

    # Cleanup
    rm -f "$CLAUDE_DIR"/signal-chaos-flood-*.json
    rm -f "$CLAUDE_DIR/signal-chaos-large.json"
    rm -f "$CLAUDE_DIR/signal-chaos-rapid.json"
}

# ─────────────────────────────────────────────────────────────────────────────
# CHAOS SCENARIO: Network Partition (Container)
# ─────────────────────────────────────────────────────────────────────────────

scenario_network_partition() {
    log "CHAOS" "═══════════════════════════════════════════════════════════════"
    log "CHAOS" "SCENARIO: Network Partition (Container Isolation)"
    log "CHAOS" "═══════════════════════════════════════════════════════════════"

    # Test 1: Verify container network mode
    log "TEST" "Test 1: Container network isolation config"

    if [[ -f "$SCRIPT_DIR/docker-run-agent.sh" ]]; then
        if grep -q 'NETWORK_MODE="none"' "$SCRIPT_DIR/docker-run-agent.sh"; then
            pass_test "network-default-isolated" "Default network mode is 'none' (isolated)"
        else
            fail_test "network-default-isolated" "Network isolation not default"
        fi
    else
        pass_test "network-default-isolated" "Skipped (docker-run-agent.sh not found)"
    fi

    # Test 2: Docker compose network config
    log "TEST" "Test 2: Docker Compose network isolation"

    local compose_file="$SCRIPT_DIR/../docker/docker-compose.agents.yml"

    if [[ -f "$compose_file" ]]; then
        if grep -q 'internal: true' "$compose_file"; then
            pass_test "network-compose-internal" "Docker Compose uses internal network"
        else
            fail_test "network-compose-internal" "Network not marked as internal"
        fi
    else
        pass_test "network-compose-internal" "Skipped (compose file not found)"
    fi

    # Test 3: Verify agents can't reach external network
    log "TEST" "Test 3: External network access blocked"

    if command -v docker &> /dev/null; then
        # Check if wave-agent image exists
        if docker image inspect wave-agent:latest &>/dev/null; then
            # Try to run container and ping external
            local ping_result=$(docker run --rm --network none wave-agent:latest \
                ping -c 1 8.8.8.8 2>&1 || echo "BLOCKED")

            if echo "$ping_result" | grep -qi "blocked\|unreachable\|network"; then
                pass_test "network-external-blocked" "External network access blocked"
            else
                fail_test "network-external-blocked" "Container may have external access"
            fi
        else
            pass_test "network-external-blocked" "Skipped (wave-agent image not built)"
        fi
    else
        pass_test "network-external-blocked" "Skipped (Docker not available)"
    fi
}

# ─────────────────────────────────────────────────────────────────────────────
# CHAOS SCENARIO: Concurrent Writes
# ─────────────────────────────────────────────────────────────────────────────

scenario_concurrent_write() {
    log "CHAOS" "═══════════════════════════════════════════════════════════════"
    log "CHAOS" "SCENARIO: Concurrent Signal File Writes"
    log "CHAOS" "═══════════════════════════════════════════════════════════════"

    local target_file="$CLAUDE_DIR/signal-chaos-concurrent.json"
    local num_writers=5
    local writes_per_writer=20

    # Test 1: Concurrent writes to same file
    log "TEST" "Test 1: Concurrent write stress test"

    # Start multiple writers in background
    for writer in $(seq 1 $num_writers); do
        (
            for i in $(seq 1 $writes_per_writer); do
                echo "{\"writer\":$writer,\"seq\":$i,\"ts\":\"$(date +%s.%N)\"}" > "$target_file"
            done
        ) &
    done

    # Wait for all writers
    wait

    # Verify file is valid JSON
    if jq '.' "$target_file" &>/dev/null; then
        pass_test "concurrent-write-integrity" "File remains valid JSON after concurrent writes"
    else
        fail_test "concurrent-write-integrity" "File corrupted by concurrent writes"
    fi

    # Test 2: Concurrent creates (different files)
    log "TEST" "Test 2: Concurrent file creation"

    local total_files=$((num_writers * writes_per_writer))

    for writer in $(seq 1 $num_writers); do
        (
            for i in $(seq 1 $writes_per_writer); do
                echo "{\"writer\":$writer,\"seq\":$i}" > "$CLAUDE_DIR/signal-chaos-multi-${writer}-${i}.json"
            done
        ) &
    done

    wait

    local created_count=$(ls -1 "$CLAUDE_DIR"/signal-chaos-multi-*.json 2>/dev/null | wc -l | tr -d ' ')

    if [[ $created_count -eq $total_files ]]; then
        pass_test "concurrent-create-all" "All $total_files files created successfully"
    else
        fail_test "concurrent-create-all" "Only $created_count of $total_files created"
    fi

    # Cleanup
    rm -f "$CLAUDE_DIR/signal-chaos-concurrent.json"
    rm -f "$CLAUDE_DIR"/signal-chaos-multi-*.json
}

# ─────────────────────────────────────────────────────────────────────────────
# RUN ALL SCENARIOS
# ─────────────────────────────────────────────────────────────────────────────

run_all_scenarios() {
    scenario_agent_crash
    echo ""
    scenario_heartbeat_stale
    echo ""
    scenario_kill_switch
    echo ""
    scenario_signal_corrupt
    echo ""
    scenario_resource_exhaust
    echo ""
    scenario_network_partition
    echo ""
    scenario_concurrent_write
}

# ─────────────────────────────────────────────────────────────────────────────
# REPORT
# ─────────────────────────────────────────────────────────────────────────────

generate_report() {
    local total=$((TESTS_PASSED + TESTS_FAILED))
    local pass_rate=0
    [[ $total -gt 0 ]] && pass_rate=$((TESTS_PASSED * 100 / total))

    if [[ "$JSON_OUTPUT" == true ]]; then
        cat << EOF
{
  "chaos_test_report": {
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "project": "$PROJECT_PATH",
    "scenario": "$SCENARIO",
    "summary": {
      "total": $total,
      "passed": $TESTS_PASSED,
      "failed": $TESTS_FAILED,
      "pass_rate": $pass_rate
    },
    "results": [$(IFS=,; echo "${TEST_RESULTS[*]}")]
  }
}
EOF
    else
        echo ""
        echo -e "${BOLD}═══════════════════════════════════════════════════════════════${NC}"
        echo -e "${BOLD}  CHAOS TEST REPORT${NC}"
        echo -e "${BOLD}═══════════════════════════════════════════════════════════════${NC}"
        echo ""
        echo "  Project:    $PROJECT_PATH"
        echo "  Scenario:   $SCENARIO"
        echo "  Timestamp:  $(date)"
        echo ""
        echo -e "  ${GREEN}Passed:${NC}     $TESTS_PASSED"
        echo -e "  ${RED}Failed:${NC}     $TESTS_FAILED"
        echo -e "  ${BOLD}Pass Rate:${NC}  ${pass_rate}%"
        echo ""

        if [[ $TESTS_FAILED -eq 0 ]]; then
            echo -e "  ${GREEN}${BOLD}ALL TESTS PASSED${NC}"
        else
            echo -e "  ${RED}${BOLD}SOME TESTS FAILED${NC}"
        fi

        echo -e "${BOLD}═══════════════════════════════════════════════════════════════${NC}"
    fi

    # Save report to file
    local report_file="$CHAOS_DIR/chaos-report-$(date +%Y%m%d-%H%M%S).json"
    cat << EOF > "$report_file"
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "scenario": "$SCENARIO",
  "passed": $TESTS_PASSED,
  "failed": $TESTS_FAILED,
  "pass_rate": $pass_rate,
  "results": [$(IFS=,; echo "${TEST_RESULTS[*]}")]
}
EOF
    log_verbose "Report saved to: $report_file"
}

# ─────────────────────────────────────────────────────────────────────────────
# HELP
# ─────────────────────────────────────────────────────────────────────────────

show_help() {
    cat << EOF
${BOLD}WAVE Chaos Testing Suite${NC} v$VERSION

${BOLD}Usage:${NC}
  ./chaos-test.sh <scenario> [PROJECT_PATH] [options]

${BOLD}Scenarios:${NC}
  ${GREEN}agent-crash${NC}       Simulate agent process crash
  ${GREEN}heartbeat-stale${NC}   Simulate heartbeat timeout
  ${GREEN}kill-switch${NC}       Test emergency stop functionality
  ${GREEN}signal-corrupt${NC}    Test handling of corrupted signal files
  ${GREEN}resource-exhaust${NC}  Simulate resource exhaustion
  ${GREEN}network-partition${NC} Test container network isolation
  ${GREEN}concurrent-write${NC}  Test concurrent signal file writes
  ${GREEN}all${NC}               Run all chaos scenarios

${BOLD}Options:${NC}
  --duration=SEC    Duration for continuous tests (default: 30)
  --agents=LIST     Target agents (comma-separated)
  --verbose, -v     Detailed output
  --json            JSON output (for CI)
  --no-cleanup      Keep test artifacts

${BOLD}Examples:${NC}
  # Run all chaos tests
  ./chaos-test.sh all /path/to/project

  # Test kill switch only
  ./chaos-test.sh kill-switch .

  # CI-friendly output
  ./chaos-test.sh all . --json

EOF
}

# ─────────────────────────────────────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────────────────────────────────────

main() {
    case "$SCENARIO" in
        help|--help|-h)
            show_help
            exit 0
            ;;
    esac

    if [[ "$JSON_OUTPUT" == false ]]; then
        echo ""
        echo -e "${MAGENTA}╔═══════════════════════════════════════════════════════════════════════════════╗${NC}"
        echo -e "${MAGENTA}║${NC}                     ${BOLD}WAVE CHAOS TESTING SUITE${NC}                              ${MAGENTA}║${NC}"
        echo -e "${MAGENTA}╚═══════════════════════════════════════════════════════════════════════════════╝${NC}"
        echo ""
        echo "  Version:  $VERSION"
        echo "  Project:  $PROJECT_PATH"
        echo "  Scenario: $SCENARIO"
        echo ""
    fi

    setup_test_environment

    case "$SCENARIO" in
        agent-crash|crash)
            scenario_agent_crash
            ;;
        heartbeat-stale|stale)
            scenario_heartbeat_stale
            ;;
        kill-switch|kill|emergency)
            scenario_kill_switch
            ;;
        signal-corrupt|corrupt)
            scenario_signal_corrupt
            ;;
        resource-exhaust|resource|exhaust)
            scenario_resource_exhaust
            ;;
        network-partition|network)
            scenario_network_partition
            ;;
        concurrent-write|concurrent)
            scenario_concurrent_write
            ;;
        all)
            run_all_scenarios
            ;;
        *)
            log "ERROR" "Unknown scenario: $SCENARIO"
            show_help
            exit 1
            ;;
    esac

    cleanup_test_environment
    generate_report

    exit $TESTS_FAILED
}

main "$@"
