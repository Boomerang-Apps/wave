# /status - System Health Check

**Tier:** 1 (Core Command)
**Priority:** P2 (MEDIUM)
**Recommended Model:** Haiku
**Aliases:** /check, /c, /st, /health

## Purpose

Check all WAVE systems and report health status. Quick diagnostic for troubleshooting and session start verification.

## When to Run

- On demand for troubleshooting
- After environment changes
- When something seems broken
- Quick health verification

## Arguments

| Argument | Description | Default |
|----------|-------------|---------|
| `--verbose` | Show detailed info | false |
| `--json` | Output as JSON | false |
| `--fix` | Attempt auto-fixes | false |

## Health Checks

### 1. Docker Containers
```bash
docker ps --filter "name=wave-" --format "{{.Names}}: {{.Status}}"
```

### 2. Redis Connection
```bash
docker exec wave-redis redis-cli ping
```

### 3. Pre-flight Lock
```bash
python scripts/preflight_lock.py --check
```

### 4. Git Status
```bash
git status --porcelain
git branch --show-current
git log origin/main..HEAD --oneline
```

### 5. Build Status
```bash
npm run type-check 2>&1 | tail -1
```

### 6. Environment
```bash
# Check required env vars
echo $ANTHROPIC_API_KEY | head -c 10
echo $SUPABASE_URL
```

## Output Format

### All Healthy
```
WAVE System Status
==================
[✓] Docker: Running
[✓] Redis: Connected (wave-redis)
[✓] Pre-flight Lock: Valid (expires: 2026-01-30)
[✓] Git: Clean working tree
[✓] Branch: wave1/WAVE1-FE-001
[✓] Upstream: Synced with origin
[✓] Build: Type-check passing
[✓] Environment: All vars set

All systems operational.
```

### With Issues
```
WAVE System Status
==================
[✓] Docker: Running
[✗] Redis: NOT CONNECTED
[✓] Pre-flight Lock: Valid
[!] Git: 3 uncommitted changes
[✓] Branch: wave1/WAVE1-FE-001
[!] Upstream: 2 commits ahead of origin
[✓] Build: Type-check passing
[✓] Environment: All vars set

ISSUES DETECTED
---------------
1. Redis not connected
   FIX: docker start wave-redis

2. Uncommitted changes
   FIX: /commit or git stash

3. Commits not pushed
   FIX: git push origin wave1/WAVE1-FE-001
```

### Verbose Output
```
WAVE System Status (Verbose)
============================

DOCKER
------
Container: wave-redis
  Status: Up 2 hours
  Ports: 6379->6379/tcp
  Health: healthy

Container: wave-dozzle
  Status: Up 2 hours
  Ports: 9080->8080/tcp
  Health: healthy

REDIS
-----
Connection: OK
Ping: PONG (1ms)
Memory: 2.1MB
Keys: 45

PRE-FLIGHT LOCK
---------------
Status: Valid
Created: 2026-01-29T10:00:00Z
Hash: abc123def456...
Files Validated: 15

GIT
---
Branch: wave1/WAVE1-FE-001
Status: Clean
Ahead: 0
Behind: 0
Last Commit: abc123 (2 hours ago)

ENVIRONMENT
-----------
ANTHROPIC_API_KEY: sk-ant-... (set)
SUPABASE_URL: https://xxx.supabase.co (set)
SUPABASE_ANON_KEY: eyJ... (set)
NODE_ENV: development

BUILD
-----
Type-check: 0 errors
Last Build: 45 minutes ago
Node: v20.10.0
npm: 10.2.3
```

### JSON Output
```bash
/status --json
```

```json
{
  "timestamp": "2026-01-29T14:30:00Z",
  "healthy": true,
  "checks": {
    "docker": { "status": "ok", "containers": ["wave-redis", "wave-dozzle"] },
    "redis": { "status": "ok", "ping": "PONG" },
    "preflight": { "status": "ok", "valid": true },
    "git": { "status": "warning", "uncommitted": 3 },
    "build": { "status": "ok", "errors": 0 },
    "env": { "status": "ok", "vars_set": 5 }
  },
  "issues": [
    { "type": "warning", "message": "3 uncommitted changes" }
  ]
}
```

## Auto-Fix Mode

```bash
/status --fix
```

Attempts to fix common issues:
```
WAVE System Status (Auto-Fix)
=============================

[FIX] Redis not running...
  Running: docker start wave-redis
  Result: ✓ Started

[FIX] Pre-flight lock invalid...
  Running: python scripts/preflight_lock.py --validate --lock
  Result: ✓ Lock created

[SKIP] Uncommitted changes
  Reason: Cannot auto-fix - manual decision required

Fixed 2/3 issues.
Remaining: 1 manual fix required
```

## Integration

- Used by: `/preflight` (subset of checks)
- Used by: Troubleshooting workflows
- Reads: Docker, Git, Environment
- Outputs: Console or JSON

## Evidence Sources

- Spec: `/Volumes/SSD-01/Projects/Footprint/footprint/.claude/SKILLS-RECOMMENDATION.md` (Section 3.8)
- Docker: Container health checks
- Git: Repository state
