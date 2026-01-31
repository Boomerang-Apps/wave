# /docker - WAVE Container Management

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

## Arguments

| Command | Description |
|---------|-------------|
| `status` | Show all container status (default) |
| `start` | Start all WAVE containers |
| `stop` | Stop all WAVE containers |
| `restart` | Restart all containers |
| `logs <container>` | View container logs |
| `build` | Build agent Docker image |
| `deploy` | Deploy orchestrator |

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
