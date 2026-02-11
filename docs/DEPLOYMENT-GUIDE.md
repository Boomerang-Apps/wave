# WAVE V2.1 - Production Deployment Guide

**Version:** 2.1.0
**Last Updated:** February 11, 2026
**Audience:** DevOps, SRE, Deployment Engineers

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Pre-Deployment Checklist](#pre-deployment-checklist)
3. [Infrastructure Setup](#infrastructure-setup)
4. [Configuration](#configuration)
5. [Database Setup](#database-setup)
6. [Service Deployment](#service-deployment)
7. [Verification](#verification)
8. [Post-Deployment](#post-deployment)
9. [Rollback Procedures](#rollback-procedures)
10. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### System Requirements

**Minimum:**
- CPU: 4 cores
- RAM: 8 GB
- Disk: 50 GB SSD
- Network: 100 Mbps

**Recommended (Production):**
- CPU: 8 cores
- RAM: 16 GB
- Disk: 200 GB SSD
- Network: 1 Gbps

### Software Requirements

| Software | Version | Purpose |
|----------|---------|---------|
| Docker | ≥24.0 | Container runtime |
| Docker Compose | ≥2.20 | Service orchestration |
| Git | ≥2.40 | Version control |
| Python | ≥3.11 | Orchestrator runtime |
| Node.js | ≥18.0 | Portal (optional) |

### Access Requirements

- [ ] GitHub repository access
- [ ] Anthropic API key
- [ ] PostgreSQL credentials
- [ ] Redis password
- [ ] Grafana admin password
- [ ] Deployment server SSH access
- [ ] Docker registry access (if using private registry)

### Network Requirements

**Inbound Ports:**
- 9080 - Dozzle (logs dashboard)
- 3000 - Grafana (monitoring)
- 9090 - Prometheus (metrics)
- 8000 - Orchestrator API (internal only)

**Outbound Access:**
- api.anthropic.com:443 - Claude API
- github.com:443 - Git operations
- registry.hub.docker.com:443 - Docker images

---

## Pre-Deployment Checklist

### Code Verification

```bash
# 1. Clone repository
git clone https://github.com/Boomerang-Apps/wave.git
cd wave

# 2. Checkout production tag
git checkout v2.1.0

# 3. Verify tests passing
cd orchestrator
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
pytest tests/ -v
# Expected: 214 tests passed

# 4. Run smoke test
python tools/test_autonomous_pipeline.py
# Expected: ✅ 4/4 tests passed (100%)
```

### Security Verification

```bash
# 1. Run security audit
cd portal
npm audit --audit-level=moderate
# Expected: found 0 vulnerabilities

# 2. Check for secrets in code
cd ..
git secrets --scan

# 3. Verify .env is gitignored
cat .gitignore | grep "\.env"
```

### Documentation Review

- [ ] Read KNOWN-ISSUES.md
- [ ] Review OPERATOR-RUNBOOK.md
- [ ] Review this DEPLOYMENT-GUIDE.md
- [ ] Read docs/retrospectives/WAVE-V2-PROJECT-RETROSPECTIVE-2026-02-11.md

---

## Infrastructure Setup

### Step 1: Prepare Deployment Server

```bash
# SSH to deployment server
ssh user@production-server

# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
newgrp docker

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.23.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verify installation
docker --version
docker-compose --version
```

### Step 2: Create Directory Structure

```bash
# Create deployment directory
sudo mkdir -p /opt/wave
sudo chown $USER:$USER /opt/wave
cd /opt/wave

# Create data directories
mkdir -p {data,logs,backups,config}
mkdir -p data/{redis,postgres,grafana,prometheus}
mkdir -p logs/{orchestrator,agents}
mkdir -p backups/{postgres,redis}
```

### Step 3: Clone Repository

```bash
cd /opt/wave
git clone https://github.com/Boomerang-Apps/wave.git .
git checkout v2.1.0

# Verify clean checkout
git status
# Expected: On branch v2.1.0, nothing to commit
```

---

## Configuration

### Step 1: Create Production Environment File

```bash
cd /opt/wave
cp .env.production.template .env.production

# Edit with production values
nano .env.production
```

**Required Values:**
```bash
# API Keys
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxx

# Database
POSTGRES_PASSWORD=<generate-secure-password>
POSTGRES_DB=wave
POSTGRES_USER=wave

# Redis
REDIS_PASSWORD=<generate-secure-password>

# Monitoring
GRAFANA_PASSWORD=<generate-secure-password>

# Project
PROJECT_PATH=/workspace/your-project

# Wave Configuration
WAVE_NUMBER=1
CHECKPOINT_LEVEL=1
MAX_PARALLEL_AGENTS=4
BUDGET_LIMIT=100.0
```

### Step 2: Generate Secure Passwords

```bash
# Generate passwords
openssl rand -base64 32  # For POSTGRES_PASSWORD
openssl rand -base64 32  # For REDIS_PASSWORD
openssl rand -base64 32  # For GRAFANA_PASSWORD

# Store in password manager
```

### Step 3: Validate Configuration

```bash
# Check all required variables are set
source .env.production
env | grep -E 'ANTHROPIC|POSTGRES|REDIS|GRAFANA' | grep -v '='$

# Should show no empty variables
```

### Step 4: Configure Redis

```bash
# Update Redis config with password
sed -i "s/\${REDIS_PASSWORD}/$REDIS_PASSWORD/" config/redis.conf

# Verify
grep "requirepass" config/redis.conf
```

---

## Database Setup

### Step 1: Initialize PostgreSQL

```bash
# Start PostgreSQL only
docker-compose -f docker-compose.prod.yml up -d postgres

# Wait for initialization
sleep 10

# Verify running
docker-compose ps postgres
# State should be: Up (healthy)
```

### Step 2: Create Database Schema

```bash
# Run migrations
docker exec -i wave-postgres psql -U wave -d wave < orchestrator/migrations/001_initial_schema.sql

# Verify tables created
docker exec wave-postgres psql -U wave -d wave -c "\dt"
# Should list: stories, checkpoints, agents, events
```

### Step 3: Create Database Backup Script

```bash
# Create backup script
cat > /opt/wave/scripts/backup-db.sh <<'EOF'
#!/bin/bash
BACKUP_DIR=/opt/wave/backups/postgres
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
docker exec wave-postgres pg_dump -U wave wave > $BACKUP_DIR/backup_$TIMESTAMP.sql
find $BACKUP_DIR -name "backup_*.sql" -mtime +30 -delete
EOF

chmod +x /opt/wave/scripts/backup-db.sh

# Add to crontab
(crontab -l ; echo "0 2 * * * /opt/wave/scripts/backup-db.sh") | crontab -
```

---

## Service Deployment

### Step 1: Build Docker Images

```bash
cd /opt/wave

# Build orchestrator image
docker-compose -f docker-compose.prod.yml build orchestrator

# Build agent image
docker-compose -f docker-compose.prod.yml build fe-dev

# Verify images
docker images | grep wave
```

### Step 2: Start Infrastructure Services

```bash
# Start Redis and PostgreSQL
docker-compose -f docker-compose.prod.yml up -d redis postgres

# Wait for health checks
sleep 15

# Verify healthy
docker-compose ps redis postgres
# Both should show: Up (healthy)
```

### Step 3: Start Orchestrator

```bash
# Start orchestrator
docker-compose -f docker-compose.prod.yml up -d orchestrator

# Wait for startup
sleep 10

# Check logs
docker-compose logs orchestrator --tail 50

# Verify health
curl http://localhost:8000/health
# Expected: {"status": "healthy"}
```

### Step 4: Start Monitoring Stack

```bash
# Start monitoring services
docker-compose -f docker-compose.prod.yml up -d prometheus grafana dozzle

# Verify running
docker-compose ps prometheus grafana dozzle

# Access Grafana
# URL: http://<server-ip>:3000
# Login: admin / ${GRAFANA_PASSWORD}
```

### Step 5: Start Merge Watcher

```bash
# Start merge watcher
docker-compose -f docker-compose.prod.yml up -d merge-watcher

# Verify logs
docker-compose logs merge-watcher --tail 20
```

### Step 6: Verify All Services

```bash
# Check all services
docker-compose -f docker-compose.prod.yml ps

# Expected output:
# NAME               STATE    HEALTH
# wave-orchestrator  Up       healthy
# wave-redis         Up       healthy
# wave-postgres      Up       healthy
# wave-prometheus    Up       starting
# wave-grafana       Up
# wave-dozzle        Up
# wave-merge-watcher Up
```

---

## Verification

### Health Checks

```bash
# 1. Orchestrator API
curl http://localhost:8000/health
# Expected: {"status": "healthy", "version": "2.1.0"}

# 2. Redis
docker exec wave-redis redis-cli -a $REDIS_PASSWORD ping
# Expected: PONG

# 3. PostgreSQL
docker exec wave-postgres pg_isready -U wave
# Expected: accepting connections

# 4. Prometheus
curl http://localhost:9090/-/healthy
# Expected: Prometheus is Healthy.

# 5. Grafana
curl http://localhost:3000/api/health
# Expected: {"database": "ok"}
```

### Smoke Test

```bash
# Run end-to-end smoke test
cd /opt/wave/orchestrator
source venv/bin/activate
python tools/test_autonomous_pipeline.py

# Expected output:
# ✅ PASS: PRD Ingestion
# ✅ PASS: Story Generation
# ✅ PASS: Story Assignment
# ✅ PASS: Pipeline Initialization
# Overall: 4/4 tests passed (100%)
```

### Monitoring Verification

```bash
# 1. Access Dozzle
# Open: http://<server-ip>:9080
# Verify: Can see all container logs

# 2. Access Grafana
# Open: http://<server-ip>:3000
# Login: admin / ${GRAFANA_PASSWORD}
# Verify: WAVE dashboards present

# 3. Check Prometheus targets
# Open: http://<server-ip>:9090/targets
# Verify: All targets UP
```

### Test Agent Execution

```bash
# Start a test agent
docker-compose -f docker-compose.prod.yml --profile agents up -d fe-dev

# Monitor logs
docker-compose logs -f fe-dev

# Verify agent connects to orchestrator
docker-compose logs orchestrator | grep "Agent connected"
# Expected: Agent fe-dev-1 connected

# Stop test agent
docker-compose stop fe-dev
```

---

## Post-Deployment

### Step 1: Configure Alerting

```bash
# Set up Slack notifications (if configured)
# Test webhook
curl -X POST -H 'Content-type: application/json' \
  --data '{"text":"WAVE V2.1 deployed successfully"}' \
  $SLACK_WEBHOOK_URL
```

### Step 2: Set Up Monitoring Alerts

1. Log into Grafana: http://<server-ip>:3000
2. Navigate to Alerting → Alert rules
3. Create alerts for:
   - High CPU usage (>85%)
   - High memory usage (>90%)
   - High error rate (>5%)
   - Cost overrun (>$1/story)
   - Agent timeout (>2 hours)

### Step 3: Configure Backups

```bash
# Test database backup
/opt/wave/scripts/backup-db.sh

# Verify backup created
ls -lh /opt/wave/backups/postgres/
```

### Step 4: Document Deployment

Create deployment record:

```bash
cat > /opt/wave/logs/deployment-$(date +%Y%m%d).txt <<EOF
Deployment Date: $(date)
Version: v2.1.0
Deployed By: $USER
Server: $(hostname)
Docker Version: $(docker --version)
Compose Version: $(docker-compose --version)
Status: SUCCESS
EOF
```

### Step 5: Notify Stakeholders

- [ ] Post in #wave-operations Slack channel
- [ ] Update deployment log
- [ ] Schedule training session for operations team
- [ ] Share access credentials securely

---

## Rollback Procedures

### Quick Rollback (Same Day)

```bash
# 1. Stop all services
docker-compose -f docker-compose.prod.yml down

# 2. Checkout previous version
git fetch --tags
git checkout v2.0.0

# 3. Restore database backup
LATEST_BACKUP=$(ls -t /opt/wave/backups/postgres/ | head -1)
docker-compose up -d postgres
sleep 10
docker exec -i wave-postgres psql -U wave -d wave < /opt/wave/backups/postgres/$LATEST_BACKUP

# 4. Start services
docker-compose -f docker-compose.prod.yml up -d

# 5. Verify health
curl http://localhost:8000/health
```

### Full Rollback (After Configuration Changes)

```bash
# 1. Emergency stop
echo "STOP" > ${PROJECT_PATH}/.claude/EMERGENCY-STOP

# 2. Stop services
docker-compose -f docker-compose.prod.yml down

# 3. Restore configuration
git checkout v2.0.0
cp .env.production.v2.0 .env.production

# 4. Restore database
# See Quick Rollback Step 3

# 5. Rebuild if needed
docker-compose -f docker-compose.prod.yml build

# 6. Start services
docker-compose -f docker-compose.prod.yml up -d

# 7. Remove emergency stop
rm ${PROJECT_PATH}/.claude/EMERGENCY-STOP

# 8. Verify
./scripts/health-check.sh
```

---

## Troubleshooting

### Deployment Fails at Docker Compose

**Error:** `ERROR: Couldn't connect to Docker daemon`

**Solution:**
```bash
# Check Docker service
sudo systemctl status docker

# Start Docker if stopped
sudo systemctl start docker

# Add user to docker group
sudo usermod -aG docker $USER
newgrp docker
```

### PostgreSQL Won't Start

**Error:** `postgres: could not access the server configuration file`

**Solution:**
```bash
# Check permissions
ls -la data/postgres/

# Fix permissions
sudo chown -R 999:999 data/postgres/

# Restart
docker-compose restart postgres
```

### Redis Connection Refused

**Error:** `Error connecting to Redis: Connection refused`

**Solution:**
```bash
# Check Redis running
docker-compose ps redis

# Check Redis logs
docker-compose logs redis

# Verify password
echo $REDIS_PASSWORD

# Test connection
docker exec wave-redis redis-cli -a $REDIS_PASSWORD ping
```

### Orchestrator API Not Responding

**Error:** `curl: (7) Failed to connect to localhost port 8000`

**Solution:**
```bash
# Check orchestrator logs
docker-compose logs orchestrator --tail 100

# Check if port is bound
sudo netstat -tlnp | grep 8000

# Restart orchestrator
docker-compose restart orchestrator

# Check health again
curl http://localhost:8000/health
```

### High Memory Usage

**Symptom:** Services OOMKilled

**Solution:**
```bash
# Check memory usage
docker stats --no-stream

# Increase Docker memory limit
# Edit /etc/docker/daemon.json:
{
  "default-ulimits": {
    "memlock": {
      "hard": -1,
      "name": "memlock",
      "soft": -1
    }
  }
}

# Restart Docker
sudo systemctl restart docker

# Scale down agents
docker-compose -f docker-compose.prod.yml up -d --scale fe-dev=1
```

---

## Appendix

### Deployment Checklist

**Pre-Deployment:**
- [ ] Tests passing (214 tests)
- [ ] Smoke test passing (4/4)
- [ ] Security audit clean (0 vulnerabilities)
- [ ] Configuration reviewed
- [ ] Passwords generated
- [ ] Backups verified

**Deployment:**
- [ ] Infrastructure deployed (Redis, PostgreSQL)
- [ ] Orchestrator deployed
- [ ] Monitoring deployed (Prometheus, Grafana, Dozzle)
- [ ] Merge watcher deployed
- [ ] Health checks passing
- [ ] Smoke test passing

**Post-Deployment:**
- [ ] Alerts configured
- [ ] Backups scheduled
- [ ] Documentation updated
- [ ] Stakeholders notified
- [ ] Operations team trained

### Quick Commands

```bash
# Start everything
docker-compose -f docker-compose.prod.yml up -d

# Stop everything
docker-compose -f docker-compose.prod.yml down

# View all logs
docker-compose logs -f

# Health check
curl http://localhost:8000/health

# Backup database
/opt/wave/scripts/backup-db.sh

# Emergency stop
echo "STOP" > ${PROJECT_PATH}/.claude/EMERGENCY-STOP
```

### Support Contacts

**Slack Channels:**
- #wave-operations
- #wave-incidents
- #wave-deployments

**Documentation:**
- Operator Runbook: docs/OPERATOR-RUNBOOK.md
- Known Issues: docs/KNOWN-ISSUES.md
- Architecture: README.md

**On-Call:** Check PagerDuty schedule

---

**Document Version:** 1.0
**Last Updated:** February 11, 2026
**Next Review:** March 11, 2026
**Owner:** DevOps Team
