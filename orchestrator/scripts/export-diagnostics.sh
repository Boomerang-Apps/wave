#!/bin/bash
# WAVE Diagnostics Export Script
# Exports all logs, state, and traces for external validation (e.g., Grok)
#
# Usage: ./scripts/export-diagnostics.sh [output_dir]

set -e

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
OUTPUT_DIR="${1:-diagnostics/$TIMESTAMP}"

echo "═══════════════════════════════════════════════════════════════════════════"
echo "WAVE Diagnostics Export"
echo "═══════════════════════════════════════════════════════════════════════════"
echo "Output: $OUTPUT_DIR"
echo ""

mkdir -p "$OUTPUT_DIR"/{logs,redis,workflows,config}

# ─────────────────────────────────────────────────────────────────────────────
# 1. CONTAINER LOGS
# ─────────────────────────────────────────────────────────────────────────────
echo "[1/6] Exporting container logs..."

for container in wave-orchestrator wave-fe-agent-1 wave-fe-agent-2 wave-be-agent-1 wave-be-agent-2 wave-qa-agent wave-redis; do
    if docker ps -q -f name=$container > /dev/null 2>&1; then
        docker logs $container > "$OUTPUT_DIR/logs/$container.log" 2>&1 || true
        echo "  ✓ $container"
    else
        echo "  ✗ $container (not running)"
    fi
done

# ─────────────────────────────────────────────────────────────────────────────
# 2. REDIS STATE DUMP
# ─────────────────────────────────────────────────────────────────────────────
echo "[2/6] Exporting Redis state..."

# All WAVE keys
docker exec wave-redis redis-cli KEYS "wave:*" > "$OUTPUT_DIR/redis/all_keys.txt" 2>/dev/null || true

# Task details
echo "# WAVE Task Details" > "$OUTPUT_DIR/redis/tasks.txt"
for key in $(docker exec wave-redis redis-cli KEYS "wave:task:*" 2>/dev/null); do
    echo "─────────────────────────────────────────" >> "$OUTPUT_DIR/redis/tasks.txt"
    echo "KEY: $key" >> "$OUTPUT_DIR/redis/tasks.txt"
    docker exec wave-redis redis-cli HGETALL "$key" >> "$OUTPUT_DIR/redis/tasks.txt" 2>/dev/null || true
    echo "" >> "$OUTPUT_DIR/redis/tasks.txt"
done

# Result details
echo "# WAVE Result Details" > "$OUTPUT_DIR/redis/results.txt"
for key in $(docker exec wave-redis redis-cli KEYS "wave:result:*" 2>/dev/null); do
    echo "─────────────────────────────────────────" >> "$OUTPUT_DIR/redis/results.txt"
    echo "KEY: $key" >> "$OUTPUT_DIR/redis/results.txt"
    docker exec wave-redis redis-cli HGETALL "$key" >> "$OUTPUT_DIR/redis/results.txt" 2>/dev/null || true
    echo "" >> "$OUTPUT_DIR/redis/results.txt"
done

# Queue lengths
echo "# Queue Lengths" > "$OUTPUT_DIR/redis/queues.txt"
for queue in wave:tasks:pm wave:tasks:cto wave:tasks:fe wave:tasks:be wave:tasks:qa; do
    len=$(docker exec wave-redis redis-cli LLEN "$queue" 2>/dev/null || echo "0")
    echo "$queue: $len" >> "$OUTPUT_DIR/redis/queues.txt"
done

echo "  ✓ Redis state exported"

# ─────────────────────────────────────────────────────────────────────────────
# 3. WORKFLOW STATUS
# ─────────────────────────────────────────────────────────────────────────────
echo "[3/6] Exporting workflow status..."

curl -s http://localhost:8000/workflows 2>/dev/null | python3 -m json.tool > "$OUTPUT_DIR/workflows/active_workflows.json" 2>/dev/null || echo "[]" > "$OUTPUT_DIR/workflows/active_workflows.json"
echo "  ✓ Workflow status exported"

# ─────────────────────────────────────────────────────────────────────────────
# 4. CONFIGURATION
# ─────────────────────────────────────────────────────────────────────────────
echo "[4/6] Exporting configuration..."

# Docker compose (sanitized - no secrets)
cp docker/docker-compose.agents.yml "$OUTPUT_DIR/config/" 2>/dev/null || true

# Safety configuration
if [ -f "src/safety/constitutional.py" ]; then
    cp src/safety/constitutional.py "$OUTPUT_DIR/config/"
fi

# Environment (sanitized)
docker exec wave-orchestrator env | grep -E "^(WAVE_|LANGSMITH_TRACING|REDIS_|TZ)" > "$OUTPUT_DIR/config/env_sanitized.txt" 2>/dev/null || true

echo "  ✓ Configuration exported"

# ─────────────────────────────────────────────────────────────────────────────
# 5. SYSTEM STATUS
# ─────────────────────────────────────────────────────────────────────────────
echo "[5/6] Collecting system status..."

cat > "$OUTPUT_DIR/system_status.txt" << EOF
WAVE System Status Report
Generated: $(date -Iseconds)
═══════════════════════════════════════════════════════════════════════════

CONTAINER STATUS
────────────────
$(docker ps --filter "name=wave-" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}")

RESOURCE USAGE
──────────────
$(docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}" $(docker ps -q --filter "name=wave-") 2>/dev/null || echo "N/A")

NETWORK
───────
$(docker network inspect wave-network --format '{{range .Containers}}{{.Name}}: {{.IPv4Address}}{{"\n"}}{{end}}' 2>/dev/null || echo "N/A")

EOF

echo "  ✓ System status collected"

# ─────────────────────────────────────────────────────────────────────────────
# 6. GENERATE ANALYSIS SUMMARY
# ─────────────────────────────────────────────────────────────────────────────
echo "[6/6] Generating analysis summary..."

cat > "$OUTPUT_DIR/ANALYSIS_SUMMARY.md" << 'EOF'
# WAVE Diagnostics Analysis Summary

## For Grok Validation

This diagnostic export contains:

### 1. Container Logs (`logs/`)
- `wave-orchestrator.log` - Main API and supervisor logs
- `wave-fe-agent-*.log` - Frontend agent execution
- `wave-be-agent-*.log` - Backend agent execution
- `wave-qa-agent.log` - QA agent execution

**Key patterns to look for:**
- `[SUPERVISOR]` - Task dispatch and results
- `SAFETY BLOCK` - Constitutional AI rejections
- `Generated X files` - Successful code generation
- `Completed in Xs | Safety: X.XX` - Task completion with safety score

### 2. Redis State (`redis/`)
- `all_keys.txt` - All WAVE-related Redis keys
- `tasks.txt` - Task details (payload, timing, status)
- `results.txt` - Task results and outcomes
- `queues.txt` - Current queue depths

**Key fields in tasks:**
- `status`: pending/assigned/completed/failed
- `duration`: execution time in seconds
- `agent_id`: which agent processed it

### 3. Workflow Status (`workflows/`)
- `active_workflows.json` - Current workflow states

### 4. Configuration (`config/`)
- `docker-compose.agents.yml` - Container configuration
- `constitutional.py` - Safety rules (WAVE_PRINCIPLES)
- `env_sanitized.txt` - Environment variables (no secrets)

### 5. System Status (`system_status.txt`)
- Container health
- Resource usage
- Network topology

## Validation Questions for Grok

1. **Safety System**: Are the WAVE_PRINCIPLES (P001-P006) being correctly applied?
2. **Task Flow**: Is the Redis task queue functioning correctly (LPUSH/BRPOP)?
3. **Agent Coordination**: Are agents receiving and processing tasks in order?
4. **Error Handling**: Are failures being properly logged and reported?
5. **Performance**: Are task durations within acceptable ranges?

## Expected Flow

```
Workflow Start
    ↓
PM Agent (planning)
    ↓
FE/BE Agents (parallel development)
    ↓
Safety Check (constitutional.py)
    ↓
Pass → Write files → QA Agent
Fail → Log block → Retry or escalate
```

EOF

echo "  ✓ Analysis summary generated"

# ─────────────────────────────────────────────────────────────────────────────
# COMPLETE
# ─────────────────────────────────────────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════════════════════════════════════"
echo "Export complete: $OUTPUT_DIR"
echo "═══════════════════════════════════════════════════════════════════════════"
echo ""
echo "Files created:"
find "$OUTPUT_DIR" -type f | sed 's|^|  |'
echo ""
echo "To share with Grok:"
echo "  1. Zip: cd diagnostics && zip -r wave-diagnostics-$TIMESTAMP.zip $TIMESTAMP"
echo "  2. Upload the zip file to Grok"
echo "  3. Ask Grok to validate the WAVE multi-agent execution flow"
