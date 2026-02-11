# WAVE V2.1 - Operator Runbook

**Version:** 2.1.0
**Last Updated:** February 11, 2026
**Audience:** Operations Team, SRE, DevOps

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Quick Reference](#quick-reference)
3. [System Monitoring](#system-monitoring)
4. [Common Operations](#common-operations)
5. [Troubleshooting](#troubleshooting)
6. [Emergency Procedures](#emergency-procedures)
7. [Maintenance](#maintenance)
8. [Escalation](#escalation)

---

## System Overview

### Architecture

WAVE V2.1 is an autonomous multi-agent orchestration framework with:
- **Orchestrator** - Python-based coordinator
- **Redis** - Event bus and pub/sub
- **PostgreSQL** - State persistence
- **Agents** - Autonomous development agents (FE, BE, QA)
- **Monitoring** - Prometheus, Grafana, Dozzle

### Key Components

| Component | Container | Port | Purpose |
|-----------|-----------|------|---------|
| Orchestrator | wave-orchestrator | 8000 | Main coordinator |
| Redis | wave-redis | 6379 | Event bus |
| PostgreSQL | wave-postgres | 5432 | State storage |
| Dozzle | wave-dozzle | 9080 | Log viewer |
| Prometheus | wave-prometheus | 9090 | Metrics |
| Grafana | wave-grafana | 3000 | Dashboards |
| Agents | wave-{fe,be,qa}-dev | - | Development agents |

### Service Dependencies

```
Orchestrator
├── Requires: Redis, PostgreSQL
├── Monitors: All agents
└── Controls: Agent lifecycle

Agents
├── Requires: Redis, Orchestrator
└── Reports to: Orchestrator

Monitoring
└── Scrapes: All services
```

---

## Quick Reference

### Health Checks

```bash
# Check all services
docker compose -f docker-compose.prod.yml ps

# Check orchestrator health
curl http://localhost:8000/health

# Check Redis
docker exec wave-redis redis-cli ping

# Check PostgreSQL
docker exec wave-postgres pg_isready -U wave
```

### Common Commands

```bash
# Start all services
docker compose -f docker-compose.prod.yml up -d

# Stop all services
docker compose -f docker-compose.prod.yml down

# Restart orchestrator
docker compose -f docker-compose.prod.yml restart orchestrator

# View logs
docker compose -f docker-compose.prod.yml logs -f orchestrator

# Trigger emergency stop
echo "STOP" > ${PROJECT_PATH}/.claude/EMERGENCY-STOP
```

### Access Points

| Service | URL | Credentials |
|---------|-----|-------------|
| Dozzle Logs | http://localhost:9080 | None |
| Grafana | http://localhost:3000 | admin / ${GRAFANA_PASSWORD} |
| Prometheus | http://localhost:9090 | None |
| Orchestrator API | http://localhost:8000/docs | API key required |

---

## System Monitoring

### Dashboards

**Primary Dashboard: Grafana**
- URL: http://localhost:3000
- Login: admin / ${GRAFANA_PASSWORD}
- Dashboards:
  - WAVE Overview
  - Agent Performance
  - Cost Tracking
  - Error Rates

**Log Aggregation: Dozzle**
- URL: http://localhost:9080
- Real-time container logs
- Filter by container name
- Search across all logs

### Key Metrics to Monitor

#### Orchestrator Metrics

```prometheus
# Story completion rate
wave_stories_completed_total

# Agent utilization
wave_agent_utilization_percent

# Cost tracking
wave_cost_total_usd

# Error rate
wave_errors_total
```

#### System Health Metrics

```prometheus
# Redis connection pool
redis_connected_clients
redis_used_memory_bytes

# PostgreSQL connections
pg_stat_activity_count

# Container health
container_health_status
```

### Alerting Thresholds

| Metric | Warning | Critical | Action |
|--------|---------|----------|--------|
| CPU Usage | >70% | >85% | Scale up or investigate |
| Memory Usage | >75% | >90% | Check for leaks |
| Disk Usage | >75% | >85% | Clean up or expand |
| Error Rate | >1% | >5% | Check logs, escalate |
| Cost per Story | >$0.80 | >$1.00 | Review token usage |
| Agent Timeout | >1 hour | >2 hours | Restart agent |

---

## Common Operations

### Starting the System

```bash
# 1. Set environment variables
cd /path/to/WAVE
source .env.production

# 2. Verify configuration
cat .env.production | grep -E 'ANTHROPIC|POSTGRES|REDIS'

# 3. Start infrastructure
docker compose -f docker-compose.prod.yml up -d redis postgres

# 4. Wait for health checks
sleep 10
docker compose -f docker-compose.prod.yml ps

# 5. Start orchestrator
docker compose -f docker-compose.prod.yml up -d orchestrator

# 6. Start monitoring
docker compose -f docker-compose.prod.yml up -d dozzle prometheus grafana

# 7. Verify all services healthy
docker compose -f docker-compose.prod.yml ps
```

### Stopping the System

```bash
# Graceful shutdown
docker compose -f docker-compose.prod.yml down

# Force shutdown (if needed)
docker compose -f docker-compose.prod.yml down --timeout 30

# Stop and remove volumes (WARNING: destroys data)
docker compose -f docker-compose.prod.yml down -v
```

### Restarting Components

```bash
# Restart orchestrator only
docker compose -f docker-compose.prod.yml restart orchestrator

# Restart all agents
docker compose -f docker-compose.prod.yml restart fe-dev be-dev qa

# Restart infrastructure
docker compose -f docker-compose.prod.yml restart redis postgres
```

### Scaling Agents

```bash
# Scale FE agents to 3
docker compose -f docker-compose.prod.yml up -d --scale fe-dev=3

# Scale BE agents to 2
docker compose -f docker-compose.prod.yml up -d --scale be-dev=2
```

### Changing Checkpoint Level

```bash
# Update .env.production
export CHECKPOINT_LEVEL=2  # L2: CTO Gate Only

# Restart orchestrator
docker compose -f docker-compose.prod.yml restart orchestrator

# Verify
docker compose -f docker-compose.prod.yml logs orchestrator | grep "Checkpoint level"
```

---

## Troubleshooting

### Agent Not Starting

**Symptoms:**
- Agent container exits immediately
- Logs show "Connection refused"

**Diagnosis:**
```bash
# Check agent logs
docker compose -f docker-compose.prod.yml logs fe-dev

# Check Redis connection
docker exec wave-redis redis-cli ping

# Check orchestrator health
curl http://localhost:8000/health
```

**Resolution:**
1. Verify Redis is running: `docker compose ps redis`
2. Verify orchestrator is healthy
3. Check ANTHROPIC_API_KEY is set
4. Restart agent: `docker compose restart fe-dev`

### High Token Usage / Cost Overrun

**Symptoms:**
- Cost per story >$1.00
- Budget alerts triggering

**Diagnosis:**
```bash
# Check cost metrics
curl http://localhost:8000/metrics | grep wave_cost

# Review recent stories
docker compose logs orchestrator | grep "Story cost"

# Check RLM cache hit rate
docker compose logs orchestrator | grep "Cache hit rate"
```

**Resolution:**
1. Review story complexity - simplify if possible
2. Verify RLM context manager is active
3. Check for context rot (should be 0%)
4. Increase budget limit if justified
5. Review token usage patterns in LangSmith

### Redis Connection Failures

**Symptoms:**
- "Connection refused" errors
- Event bus not working
- Emergency stop not broadcasting

**Diagnosis:**
```bash
# Check Redis health
docker exec wave-redis redis-cli ping

# Check Redis logs
docker compose logs redis

# Check connection count
docker exec wave-redis redis-cli INFO clients
```

**Resolution:**
1. Verify Redis container running: `docker compose ps redis`
2. Check Redis password: `echo $REDIS_PASSWORD`
3. Verify network connectivity: `docker network ls`
4. Restart Redis: `docker compose restart redis`
5. If data corrupted, restore from backup

### PostgreSQL Database Issues

**Symptoms:**
- State not persisting
- "Connection pool exhausted"
- Query timeouts

**Diagnosis:**
```bash
# Check PostgreSQL health
docker exec wave-postgres pg_isready -U wave

# Check active connections
docker exec wave-postgres psql -U wave -c "SELECT count(*) FROM pg_stat_activity;"

# Check database size
docker exec wave-postgres psql -U wave -c "SELECT pg_size_pretty(pg_database_size('wave'));"
```

**Resolution:**
1. Verify PostgreSQL running: `docker compose ps postgres`
2. Check connection pool settings
3. Kill long-running queries if needed
4. Increase pool size in .env.production
5. Restart PostgreSQL: `docker compose restart postgres`

### Agent Stuck / Hanging

**Symptoms:**
- Agent not responding
- Gate execution timeout
- No progress for >1 hour

**Diagnosis:**
```bash
# Check agent logs
docker compose logs fe-dev --tail 100

# Check agent CPU/memory
docker stats wave-fe-dev --no-stream

# Check checkpoint status
curl http://localhost:8000/api/checkpoints
```

**Resolution:**
1. Wait for timeout (default: 1 hour)
2. If critical, trigger emergency stop
3. Restart agent: `docker compose restart fe-dev`
4. Review story for complexity issues
5. Adjust checkpoint level if needed

### Monitoring Not Working

**Symptoms:**
- Grafana shows no data
- Prometheus not scraping
- Dozzle not showing logs

**Diagnosis:**
```bash
# Check Prometheus targets
curl http://localhost:9090/api/v1/targets

# Check Grafana datasource
curl http://localhost:3000/api/datasources

# Check Dozzle access to Docker socket
docker exec wave-dozzle ls -la /var/run/docker.sock
```

**Resolution:**
1. Verify monitoring stack running: `docker compose ps prometheus grafana dozzle`
2. Check Prometheus config: `cat config/prometheus.yml`
3. Restart monitoring: `docker compose restart prometheus grafana dozzle`
4. Verify network connectivity between services

---

## Emergency Procedures

### Emergency Stop

**When to Use:**
- Critical bug detected
- Runaway costs
- Security incident
- Data corruption detected

**Procedure:**
```bash
# 1. Trigger emergency stop
echo "STOP" > ${PROJECT_PATH}/.claude/EMERGENCY-STOP

# 2. Verify agents halted
docker compose logs -f | grep "Emergency stop detected"

# 3. Verify state saved
ls -la ${PROJECT_PATH}/.claude/checkpoints/

# 4. Stop all services
docker compose -f docker-compose.prod.yml down

# 5. Notify team
# Post to incident channel
```

**Recovery:**
```bash
# 1. Identify and fix issue
# Review logs, fix bug, etc.

# 2. Remove emergency stop file
rm ${PROJECT_PATH}/.claude/EMERGENCY-STOP

# 3. Restore from checkpoint if needed
cd orchestrator
python -m emergency_stop.recovery --checkpoint latest

# 4. Restart services
docker compose -f docker-compose.prod.yml up -d

# 5. Verify health
./scripts/health-check.sh
```

### Rollback Procedure

**When to Use:**
- Deployment failure
- Critical regression detected
- Data integrity issues

**Procedure:**
```bash
# 1. Stop current deployment
docker compose -f docker-compose.prod.yml down

# 2. Restore previous version
git checkout <previous-version-tag>

# 3. Restore database backup
./scripts/restore-db.sh --backup <timestamp>

# 4. Start services
docker compose -f docker-compose.prod.yml up -d

# 5. Verify functionality
./scripts/smoke-test.sh

# 6. Notify team
```

### Data Recovery

**When to Use:**
- Accidental deletion
- Database corruption
- Lost checkpoint data

**Procedure:**
```bash
# 1. Stop orchestrator
docker compose stop orchestrator

# 2. Identify backup to restore
ls -la /backups/postgres/

# 3. Restore database
./scripts/restore-db.sh --backup <timestamp>

# 4. Verify data integrity
docker exec wave-postgres psql -U wave -c "SELECT count(*) FROM stories;"

# 5. Restart orchestrator
docker compose start orchestrator
```

---

## Maintenance

### Daily Tasks

- [ ] Review Grafana dashboard for anomalies
- [ ] Check Dozzle logs for errors
- [ ] Verify all services healthy: `docker compose ps`
- [ ] Review cost metrics: `curl http://localhost:8000/metrics | grep cost`

### Weekly Tasks

- [ ] Review and dismiss false positive Dependabot alerts
- [ ] Backup PostgreSQL database
- [ ] Clean up old logs: `docker system prune -f`
- [ ] Review agent performance metrics
- [ ] Check disk usage: `df -h`

### Monthly Tasks

- [ ] Rotate API keys
- [ ] Review and update security policies
- [ ] Test rollback procedures
- [ ] Update dependencies
- [ ] Review incident reports

### Database Backup

```bash
# Backup PostgreSQL
docker exec wave-postgres pg_dump -U wave wave > backup-$(date +%Y%m%d).sql

# Backup Redis (AOF)
docker exec wave-redis redis-cli BGSAVE

# Copy to backup location
cp backup-*.sql /backups/postgres/
docker cp wave-redis:/data/dump.rdb /backups/redis/
```

### Log Rotation

```bash
# Docker handles log rotation via json-file driver
# Configured in docker-compose.prod.yml:
#   max-size: "10m"
#   max-file: "3"

# Manual cleanup if needed
docker system prune -f --filter "until=72h"
```

---

## Escalation

### Severity Levels

| Level | Description | Response Time | Escalation |
|-------|-------------|---------------|------------|
| **P0** | System down, no workaround | 15 minutes | Immediate |
| **P1** | Critical feature broken | 1 hour | If not resolved in 2 hours |
| **P2** | Major feature degraded | 4 hours | If not resolved in 8 hours |
| **P3** | Minor issue, workaround exists | 1 day | If not resolved in 3 days |

### Escalation Path

1. **On-Call Engineer** - First responder
2. **Engineering Lead** - If not resolved in response time
3. **CTO** - For P0/P1 incidents or architectural decisions
4. **CEO** - For business-critical incidents only

### Incident Response

**P0/P1 Incident:**
```bash
# 1. Trigger emergency stop if needed
echo "STOP" > ${PROJECT_PATH}/.claude/EMERGENCY-STOP

# 2. Create incident
# Post in #incidents Slack channel
# Create incident in incident management tool

# 3. Gather information
docker compose ps > incident-services.txt
docker compose logs > incident-logs.txt
curl http://localhost:8000/health > incident-health.txt

# 4. Notify stakeholders
# Incident channel
# Status page update

# 5. Work resolution
# Follow troubleshooting guide
# Escalate if needed

# 6. Post-mortem
# Document root cause
# Action items for prevention
```

### Contact Information

**Slack Channels:**
- #wave-operations - General operations
- #wave-incidents - Incident coordination
- #wave-alerts - Automated alerts

**On-Call Rotation:**
- Check PagerDuty schedule
- Backup: Engineering Lead

**Documentation:**
- Internal Wiki: [URL]
- Runbooks: /docs/runbooks/
- Architecture Diagrams: /docs/architecture/

---

## Appendix

### Useful Commands

```bash
# View all containers
docker ps -a --filter "name=wave"

# Follow all logs
docker compose logs -f

# Check resource usage
docker stats --no-stream

# Shell into container
docker exec -it wave-orchestrator /bin/bash

# Export metrics
curl http://localhost:8000/metrics > metrics.txt

# Database shell
docker exec -it wave-postgres psql -U wave

# Redis CLI
docker exec -it wave-redis redis-cli
```

### Configuration Files

| File | Purpose | Location |
|------|---------|----------|
| docker-compose.prod.yml | Service definitions | / |
| .env.production | Environment variables | / |
| config/redis.conf | Redis configuration | /config/ |
| config/prometheus.yml | Prometheus scrape config | /config/ |
| orchestrator/config/* | Orchestrator settings | /orchestrator/config/ |

### Logs Location

```bash
# Container logs (JSON format)
/var/lib/docker/containers/<container-id>/<container-id>-json.log

# Orchestrator application logs
docker exec wave-orchestrator cat /app/logs/orchestrator.log

# Audit logs
docker exec wave-orchestrator cat /app/logs/audit.log
```

---

**Document Version:** 1.0
**Last Reviewed:** February 11, 2026
**Next Review:** March 11, 2026
**Owner:** Operations Team
