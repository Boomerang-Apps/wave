# /docker - WAVE Container Management

**Tier:** 2 (Workflow Command)
**Priority:** P1 (HIGH)
**Recommended Model:** Haiku
**Aliases:** /dk

## Purpose

Manage WAVE Docker containers required for orchestration: Redis (task queue), Dozzle (log viewer), and the orchestrator itself.

## When to Run

- Session start (check container status)
- Troubleshooting connection issues
- Deployment of orchestrator
- Building agent images
- Before launching multi-agent wave

## Arguments

| Command | Description |
|---------|-------------|
| `status` | Show all container status (default) |
| `ready` | **Full readiness check with dependencies** |
| `start` | Start all WAVE containers |
| `stop` | Stop all WAVE containers |
| `restart` | Restart all containers |
| `logs <container>` | View container logs |
| `build` | Build agent Docker image |
| `deploy` | Deploy orchestrator |

---

## /docker ready (NEW)

Comprehensive readiness check for Docker infrastructure including image, dependencies, environment, and connectivity.

### Usage
```bash
/docker ready              # Full readiness check
/docker ready --quick      # Skip dependency version checks
/docker ready --verbose    # Show all check details
```

### What It Checks

```
/docker ready
 │
 ├─→ 1. IMAGE CHECKS
 │     ├── wave-agent:latest exists
 │     ├── Image build age (warn if >7 days)
 │     ├── Base image: node:20-slim
 │     └── Image size reasonable
 │
 ├─→ 2. DEPENDENCY CHECKS (inside image)
 │     ├── node --version (≥20)
 │     ├── pnpm --version
 │     ├── claude --version (@anthropic-ai/claude-code)
 │     ├── git --version
 │     ├── jq --version
 │     ├── python3 --version
 │     └── bash present
 │
 ├─→ 3. ENVIRONMENT CHECKS
 │     ├── ANTHROPIC_API_KEY set
 │     ├── PROJECT_PATH valid
 │     ├── WAVE_NUMBER set
 │     └── Optional: LANGSMITH_API_KEY, SLACK_WEBHOOK_URL
 │
 ├─→ 4. VOLUME MOUNT CHECKS
 │     ├── PROJECT_PATH directory exists
 │     ├── PROJECT_PATH is readable/writable
 │     ├── /wave-framework mount available
 │     └── /scripts mount available
 │
 ├─→ 5. NETWORK CHECKS
 │     ├── wave-network exists
 │     ├── DNS resolution works
 │     └── Container-to-container connectivity
 │
 ├─→ 6. CONTAINER HEALTH
 │     ├── wave-dozzle responding
 │     └── All required containers healthy
 │
 └─→ 7. API VALIDATION
       ├── Anthropic API accessible from container
       └── Rate limits OK
```

### Output Format

```
╔══════════════════════════════════════════════════════════════════════════════╗
║  DOCKER READINESS CHECK                                      /docker ready   ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  IMAGE STATUS                                                                ║
║  ────────────                                                                ║
║  wave-agent:latest          ✓ Built 2h ago (sha256:a1b2c3d)                  ║
║  node:20-slim               ✓ Up to date                                     ║
║  amir20/dozzle:latest       ✓ Up to date                                     ║
║                                                                              ║
║  DEPENDENCIES (wave-agent:latest)                                            ║
║  ────────────────────────────────                                            ║
║  node                       ✓ v20.11.0                                       ║
║  pnpm                       ✓ v8.15.0                                        ║
║  claude                     ✓ v1.0.17 (@anthropic-ai/claude-code)            ║
║  git                        ✓ v2.43.0                                        ║
║  jq                         ✓ v1.7                                           ║
║  python3                    ✓ v3.11.6                                        ║
║  bash                       ✓ v5.2.15                                        ║
║                                                                              ║
║  ENVIRONMENT                                                                 ║
║  ───────────                                                                 ║
║  ANTHROPIC_API_KEY          ✓ Set (sk-ant-...xxx)                            ║
║  PROJECT_PATH               ✓ /Volumes/SSD-01/Projects/Footprint             ║
║  WAVE_NUMBER                ✓ 1                                              ║
║  LANGSMITH_API_KEY          ○ Not set (optional)                             ║
║  SLACK_WEBHOOK_URL          ○ Not set (optional)                             ║
║                                                                              ║
║  VOLUME MOUNTS                                                               ║
║  ─────────────                                                               ║
║  /project                   ✓ Mounted, RW                                    ║
║  /wave-framework            ✓ Mounted, RO                                    ║
║  /scripts                   ✓ Mounted, RO                                    ║
║                                                                              ║
║  NETWORK                                                                     ║
║  ───────                                                                     ║
║  wave-network               ✓ Created                                        ║
║  Container DNS              ✓ Resolving                                      ║
║                                                                              ║
║  CONTAINER HEALTH                                                            ║
║  ────────────────                                                            ║
║  wave-dozzle                ✓ Running (http://localhost:9080)                ║
║                                                                              ║
║  API VALIDATION                                                              ║
║  ──────────────                                                              ║
║  Anthropic API              ✓ Accessible from container                      ║
║                                                                              ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  RESULT: ✓ READY                                                             ║
║  All 7 check categories passed. Docker infrastructure ready for Wave V2.     ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

### Failure Output

```
╔══════════════════════════════════════════════════════════════════════════════╗
║  DOCKER READINESS CHECK                               /docker ready ✗ FAILED ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  IMAGE STATUS                                                                ║
║  ────────────                                                                ║
║  wave-agent:latest          ✗ NOT FOUND                                      ║
║                                                                              ║
║  DEPENDENCIES                                                                ║
║  ────────────                                                                ║
║  (skipped - image not built)                                                 ║
║                                                                              ║
║  ENVIRONMENT                                                                 ║
║  ───────────                                                                 ║
║  ANTHROPIC_API_KEY          ✗ NOT SET                                        ║
║  PROJECT_PATH               ✓ Valid                                          ║
║                                                                              ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  RESULT: ✗ NOT READY (2 failures)                                            ║
║                                                                              ║
║  REQUIRED ACTIONS:                                                           ║
║  1. Build image:     /docker build                                           ║
║  2. Set API key:     export ANTHROPIC_API_KEY=sk-ant-...                     ║
║                                                                              ║
║  Run /docker ready again after fixing.                                       ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

### Validation Commands Used

```bash
# Check image exists
docker image inspect wave-agent:latest

# Check image age
docker image inspect wave-agent:latest --format '{{.Created}}'

# Check dependencies inside image
docker run --rm wave-agent:latest node --version
docker run --rm wave-agent:latest pnpm --version
docker run --rm wave-agent:latest claude --version
docker run --rm wave-agent:latest git --version
docker run --rm wave-agent:latest jq --version
docker run --rm wave-agent:latest python3 --version

# Check network
docker network inspect wave-network

# Check container health
docker inspect wave-dozzle --format '{{.State.Health.Status}}'

# Test API from container
docker run --rm -e ANTHROPIC_API_KEY wave-agent:latest \
  curl -s -o /dev/null -w "%{http_code}" \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  https://api.anthropic.com/v1/models
```

### Signal File

Creates on check:
```json
// .claude/signals/docker-ready-{timestamp}.json
{
  "command": "/docker ready",
  "timestamp": "2026-02-01T10:00:00Z",
  "result": "READY",
  "checks": {
    "image": "pass",
    "dependencies": "pass",
    "environment": "pass",
    "volumes": "pass",
    "network": "pass",
    "containers": "pass",
    "api": "pass"
  },
  "imageAge": "2 hours",
  "imageSha": "sha256:a1b2c3d..."
}
```

---

## Container Definitions

### wave-redis
```yaml
image: redis:7-alpine
ports: 6379:6379
healthcheck: redis-cli ping
purpose: Task queue for agent coordination
```

### wave-dozzle
```yaml
image: amir20/dozzle:latest
ports: 9080:8080
purpose: Container log viewer UI
url: http://localhost:9080
```

### wave-orchestrator
```yaml
build: Dockerfile.agent
depends_on: wave-redis
env:
  - PROJECT_PATH
  - ANTHROPIC_API_KEY
purpose: Multi-agent orchestrator
```

## Commands

### /docker status (default)
```bash
docker ps -a --filter "name=wave-" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```

Output:
```
WAVE Docker Status
==================
CONTAINER          STATUS       PORTS                  HEALTH
wave-redis         Running      6379:6379              Healthy
wave-dozzle        Running      9080:8080              Healthy
wave-orchestrator  Stopped      -                      -

Commands:
  /docker start       - Start all containers
  /docker logs redis  - View Redis logs
  /docker build       - Rebuild agent image
```

### /docker start
```bash
# Start Redis
docker start wave-redis 2>/dev/null || \
  docker run -d --name wave-redis -p 6379:6379 redis:7-alpine

# Start Dozzle
docker start wave-dozzle 2>/dev/null || \
  docker run -d --name wave-dozzle -p 9080:8080 \
    -v /var/run/docker.sock:/var/run/docker.sock \
    amir20/dozzle:latest

# Verify
docker ps --filter "name=wave-" --format "{{.Names}}: {{.Status}}"
```

### /docker stop
```bash
docker stop wave-redis wave-dozzle wave-orchestrator 2>/dev/null
echo "All WAVE containers stopped"
```

### /docker restart
```bash
docker restart wave-redis wave-dozzle
echo "WAVE containers restarted"
```

### /docker logs <container>
```bash
# Example: /docker logs redis
docker logs wave-redis --tail 50 -f
```

### /docker build
```bash
# Build agent image from Dockerfile.agent
cd /Volumes/SSD-01/Projects/WAVE
docker build -f Dockerfile.agent -t wave-agent:latest .
echo "Agent image built: wave-agent:latest"
```

### /docker deploy
```bash
# Deploy orchestrator with current config
cd /Volumes/SSD-01/Projects/WAVE
docker-compose up -d orchestrator
echo "Orchestrator deployed"
```

## Health Checks

### Redis Health
```bash
docker exec wave-redis redis-cli ping
# Expected: PONG
```

### Dozzle Health
```bash
curl -s http://localhost:9080 | head -1
# Expected: HTML response
```

## Troubleshooting

### Redis Connection Failed
```
FIX: docker start wave-redis
     OR
     docker run -d --name wave-redis -p 6379:6379 redis:7-alpine
```

### Dozzle Not Accessible
```
FIX: docker start wave-dozzle
     Check: http://localhost:9080
```

### Container Not Found
```
FIX: Run /docker start to create containers
```

## Output Format

Success:
```
WAVE Docker Status
==================
[✓] wave-redis: Running (healthy)
[✓] wave-dozzle: Running (healthy)
[!] wave-orchestrator: Not running

All required containers operational.
```

Failure:
```
WAVE Docker Status
==================
[✗] wave-redis: Not running
[✓] wave-dozzle: Running
[!] wave-orchestrator: Not running

REQUIRED ACTION:
  Run: /docker start

Pre-flight will FAIL without Redis.
```

## Integration

- Required by: `/preflight` (Redis check)
- Used by: Task queue system
- Logs viewable at: http://localhost:9080

## Evidence Sources

- Spec: `/Volumes/SSD-01/Projects/Footprint/footprint/.claude/SKILLS-RECOMMENDATION.md` (Section 3.11)
- WAVE orchestrator: `/Volumes/SSD-01/Projects/WAVE/`
