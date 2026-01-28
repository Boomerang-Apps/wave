# Gate 0 Research Report: Item #3 - Container Completeness Validation

## Overview

**Item:** Container Completeness Validation
**Proposed by:** Grok
**Researcher:** Claude Opus 4.5
**Date:** 2026-01-28
**Status:** Research Complete - **VALIDATED**

---

## 1. Current State Analysis

### Existing Pre-Flight Validator

`core/scripts/pre-flight-validator.sh` is comprehensive (688 lines, 80+ checks) but focuses on:
- Configuration validation (docker-compose.yml syntax)
- Environment variables (.env, API keys)
- Scripts existence
- Safety configuration

**Key Gap:** NO runtime container health validation.

### Evidence from Code

```bash
# pre-flight-validator.sh lines 192-193
check "A1: Docker daemon running" "$(docker info > /dev/null 2>&1 && echo true || echo false)"
check "A2: Docker Compose available" "$(docker compose version > /dev/null 2>&1 && echo true || echo false)"
```

This only checks that Docker is available, NOT that required containers are running.

---

## 2. Two Docker Compose Configurations

### Config 1: `/docker-compose.yml` (Root)

| Container | Name | Profile |
|-----------|------|---------|
| orchestrator | wave-orchestrator | default |
| merge-watcher | wave-merge-watcher | default |
| cto | wave-cto | leadership |
| pm | wave-pm | leadership |
| fe-dev-1 | wave-fe-dev-1 | agents |
| fe-dev-2 | wave-fe-dev-2 | agents |
| be-dev-1 | wave-be-dev-1 | agents |
| be-dev-2 | wave-be-dev-2 | agents |
| dev-fix | wave-dev-fix | agents |
| qa | wave-qa | qa |
| dozzle | wave-dozzle | default |

**Total: 11 containers**

### Config 2: `orchestrator/docker/docker-compose.agents.yml`

| Container | Name |
|-----------|------|
| orchestrator | wave-orchestrator |
| pm-agent | wave-pm-agent |
| fe-agent-1 | wave-fe-agent-1 |
| fe-agent-2 | wave-fe-agent-2 |
| be-agent-1 | wave-be-agent-1 |
| be-agent-2 | wave-be-agent-2 |
| qa-agent | wave-qa-agent |
| merge-watcher | wave-merge-watcher |
| redis | wave-redis |
| dozzle | wave-dozzle |

**Total: 10 containers**

---

## 3. Why This Matters

### Prior Incident: Missing Merge-Watcher

From WAVE1 retrospective: The merge-watcher container was not defined in one of the compose files, causing QA-pass signals to be missed. This could have been caught by a container completeness check.

### Current Risk

Without runtime validation:
1. Containers may fail to start (image issues)
2. Containers may crash during startup
3. Containers may be unhealthy but running
4. Missing containers cause silent failures

---

## 4. Recommendation: Container Health Validator

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│           Container Completeness Validator                   │
├─────────────────────────────────────────────────────────────┤
│  1. Parse docker-compose.yml for required containers         │
│  2. Check each container exists (docker ps)                  │
│  3. Check each container is healthy (health status)          │
│  4. Report missing/unhealthy containers                      │
│  5. Block workflow if critical containers missing            │
└─────────────────────────────────────────────────────────────┘
```

### Integration Points

1. **Pre-flight validator** - Add Section N: Container Health
2. **Orchestrator startup** - Check containers before dispatching
3. **Monitoring** - Periodic health checks

---

## 5. TDD Implementation Plan

### Tests to Write FIRST

```python
class TestContainerValidator:
    def test_all_required_containers_detected(self):
        """Should detect all 10 required containers."""
        validator = ContainerValidator()
        required = validator.get_required_containers()
        assert len(required) >= 10

    def test_healthy_container_passes(self):
        """Healthy container should pass validation."""
        validator = ContainerValidator()
        result = validator.check_container("wave-redis")
        assert result.status in ["running", "healthy"]

    def test_missing_container_fails(self):
        """Missing container should fail validation."""
        validator = ContainerValidator()
        result = validator.check_container("wave-nonexistent")
        assert result.status == "missing"

    def test_unhealthy_container_warns(self):
        """Unhealthy container should warn."""
        validator = ContainerValidator()
        # Mock unhealthy container
        result = validator.check_container_health("wave-test-unhealthy")
        assert result.healthy is False

    def test_critical_containers_block(self):
        """Missing critical containers should block."""
        validator = ContainerValidator()
        validator.critical_containers = ["wave-orchestrator", "wave-redis"]
        result = validator.validate_all()
        # If orchestrator missing, should be NO-GO
```

---

## 6. Files to Create/Modify

### Create

| File | Purpose |
|------|---------|
| `orchestrator/src/monitoring/container_validator.py` | Container health checker |
| `orchestrator/tests/test_container_validator.py` | TDD tests |

### Modify

| File | Change |
|------|--------|
| `core/scripts/pre-flight-validator.sh` | Add Section N: Container Health |
| `orchestrator/src/monitoring/__init__.py` | Export ContainerValidator |

---

## 7. Required Container List

Based on both docker-compose files:

### Critical (Block if missing)

| Container | Purpose |
|-----------|---------|
| wave-orchestrator | Core orchestration |
| wave-redis | Task queue |
| wave-dozzle | Log visibility |

### Required (Warn if missing)

| Container | Purpose |
|-----------|---------|
| wave-pm-agent OR wave-pm | Project management |
| wave-fe-agent-1 OR wave-fe-dev-1 | Frontend development |
| wave-be-agent-1 OR wave-be-dev-1 | Backend development |
| wave-qa-agent OR wave-qa | Quality assurance |
| wave-merge-watcher | Merge automation |

### Optional (Info if missing)

| Container | Purpose |
|-----------|---------|
| wave-fe-agent-2 OR wave-fe-dev-2 | Parallel FE |
| wave-be-agent-2 OR wave-be-dev-2 | Parallel BE |
| wave-cto | Architecture oversight |
| wave-dev-fix | Bug fix agent |

---

## 8. Conclusion

| Aspect | Finding |
|--------|---------|
| Grok's Recommendation | **VALIDATED** |
| Current Gap | Pre-flight checks config but NOT runtime health |
| Impact | HIGH - Missing containers cause silent failures |
| Effort | LOW - 30 minutes |
| Risk | LOW - Additive change |

**Implementation Ready:** Yes, proceed with TDD.

---

## 9. Bash Implementation (for pre-flight-validator.sh)

```bash
# Section N: Container Health (add after Section M)
section "SECTION N: CONTAINER HEALTH"

REQUIRED_CONTAINERS=(
    "wave-orchestrator:critical"
    "wave-redis:critical"
    "wave-dozzle:critical"
    "wave-merge-watcher:required"
    "wave-pm-agent:required"
    "wave-fe-agent-1:required"
    "wave-be-agent-1:required"
    "wave-qa-agent:required"
)

CONTAINER_FAIL=0
CONTAINER_WARN=0

for entry in "${REQUIRED_CONTAINERS[@]}"; do
    container="${entry%%:*}"
    level="${entry##*:}"

    if docker ps --format '{{.Names}}' | grep -q "^${container}$"; then
        # Check health status
        health=$(docker inspect --format='{{.State.Health.Status}}' "$container" 2>/dev/null || echo "none")
        if [ "$health" = "healthy" ] || [ "$health" = "none" ]; then
            check "N: $container running" "true"
        else
            check "N: $container unhealthy" "false" false
            ((CONTAINER_WARN++))
        fi
    else
        if [ "$level" = "critical" ]; then
            check "N: $container running" "false"
            ((CONTAINER_FAIL++))
        else
            check "N: $container running" "false" false
            ((CONTAINER_WARN++))
        fi
    fi
done

if [ $CONTAINER_FAIL -gt 0 ]; then
    verbose "$CONTAINER_FAIL critical container(s) missing"
fi
```
