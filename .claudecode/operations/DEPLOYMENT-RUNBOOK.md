# WAVE Framework - Deployment Runbook

**Version:** 1.0.0
**Classification:** OPERATIONAL - Deployment procedures
**Approval Required:** L1 (Human) for production deployments

---

## Table of Contents

1. [Deployment Overview](#deployment-overview)
2. [Pre-Deployment Checklist](#pre-deployment-checklist)
3. [Deployment Procedures](#deployment-procedures)
4. [Post-Deployment Verification](#post-deployment-verification)
5. [Rollback Procedures](#rollback-procedures)
6. [Environment-Specific Guides](#environment-specific-guides)

---

## Deployment Overview

### Deployment Flow

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         WAVE DEPLOYMENT FLOW                                     │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│   Gate 7 Approved                                                               │
│         │                                                                        │
│         ▼                                                                        │
│   ┌─────────────┐     ┌─────────────┐     ┌─────────────┐                      │
│   │ Pre-Deploy  │────▶│   Deploy    │────▶│   Verify    │                      │
│   │  Checklist  │     │  (Merge)    │     │  (Smoke)    │                      │
│   └─────────────┘     └─────────────┘     └──────┬──────┘                      │
│                                                   │                             │
│                              ┌────────────────────┴────────────────────┐        │
│                              │                                         │        │
│                              ▼                                         ▼        │
│                       ┌─────────────┐                          ┌─────────────┐ │
│                       │   Success   │                          │  Rollback   │ │
│                       │  Complete   │                          │  Procedure  │ │
│                       └─────────────┘                          └─────────────┘ │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Deployment Environments

| Environment | Branch | Auto-Deploy | Approval |
|-------------|--------|-------------|----------|
| Development | `feature/*` | Yes | None |
| Staging | `develop` | Yes | L4 (QA) |
| Production | `main` | No | L1 (Human) |

### Deployment Approval Matrix

| Action | Development | Staging | Production |
|--------|-------------|---------|------------|
| Merge feature branch | L5 (Auto) | L3 (PM) | L1 (Human) |
| Database migration | L4 (QA) | L2 (CTO) | L1 (Human) |
| Config change | L5 (Auto) | L3 (PM) | L1 (Human) |
| Rollback | L5 (Auto) | L3 (PM) | L1 (Human) |

---

## Pre-Deployment Checklist

### Gate 7 Completion Requirements

```
□ All stories in wave marked complete
□ All QA validations passed (Gate 4)
□ No open ESCALATION signals
□ No active violations in VIOLATIONS.log
□ Budget under limit
□ All worktree branches have clean merges to target
□ PM approval signal exists: signal-wave[N]-gate7-merge-approved.json
```

### Technical Checklist

```
□ Build passes: npm run build
□ TypeScript check passes: npm run typecheck
□ Lint passes: npm run lint
□ All tests pass: npm test
□ No security vulnerabilities: npm audit
□ Bundle size acceptable
□ Database migrations ready (if any)
```

### Documentation Checklist

```
□ CHANGELOG updated
□ API documentation updated (if changed)
□ README updated (if needed)
□ VALIDATION-REPORT.md generated
```

### Communication Checklist

```
□ Team notified of upcoming deployment
□ Stakeholders aware of changes
□ On-call engineer identified
□ Rollback plan documented
```

---

## Deployment Procedures

### Procedure 1: Standard Merge Deployment

**When:** Normal feature deployment after Gate 7 approval

**Steps:**

```bash
# 1. Verify Gate 7 signal exists
ls -la .claude/signal-*-gate7-merge-approved.json

# 2. Ensure main is up to date
git checkout main
git pull origin main

# 3. Merge worktree branches (in order)
# Backend first (if has migrations)
git merge --no-ff feature/be-dev-1 -m "Merge BE-Dev-1: [description]"
git merge --no-ff feature/be-dev-2 -m "Merge BE-Dev-2: [description]"

# Frontend second
git merge --no-ff feature/fe-dev-1 -m "Merge FE-Dev-1: [description]"
git merge --no-ff feature/fe-dev-2 -m "Merge FE-Dev-2: [description]"

# 4. Run final validation
npm run build
npm run typecheck
npm test

# 5. Push to remote (triggers CI/CD)
git push origin main

# 6. Monitor deployment
# Watch CI/CD pipeline
# Check deployment logs
# Verify application health

# 7. Create deployment signal
cat > .claude/signal-deployment-complete.json << EOF
{
  "signal_type": "deployment-complete",
  "environment": "production",
  "commit": "$(git rev-parse HEAD)",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "deployed_by": "$(whoami)"
}
EOF
```

### Procedure 2: Database Migration Deployment

**When:** Deployment includes database schema changes

**Pre-requisites:**
- L1 (Human) approval for production
- Backup completed
- Rollback migration tested

**Steps:**

```bash
# 1. Create database backup
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d-%H%M%S).sql
# Or for Supabase:
# Use Supabase dashboard to create backup

# 2. Review migration files
cat prisma/migrations/*/migration.sql

# 3. Run migrations on staging first
DATABASE_URL=$STAGING_DATABASE_URL npx prisma migrate deploy

# 4. Verify staging
npm run test:e2e -- --env=staging

# 5. Get explicit human approval
echo "Migration verified on staging. Approve production deployment? (yes/no)"
read approval
if [ "$approval" != "yes" ]; then
    echo "Deployment cancelled"
    exit 1
fi

# 6. Run migrations on production
DATABASE_URL=$PRODUCTION_DATABASE_URL npx prisma migrate deploy

# 7. Deploy application code
git push origin main

# 8. Verify production
npm run test:smoke -- --env=production
```

### Procedure 3: Hotfix Deployment

**When:** Critical bug fix needed in production

**Steps:**

```bash
# 1. Create hotfix branch from main
git checkout main
git pull origin main
git checkout -b hotfix/critical-bug-fix

# 2. Make minimal fix
# ... edit files ...

# 3. Test locally
npm run build
npm test

# 4. Get expedited approval (still requires L1 for production)
# Document the fix and get human sign-off

# 5. Merge to main
git checkout main
git merge --no-ff hotfix/critical-bug-fix -m "Hotfix: [description]"

# 6. Push and deploy
git push origin main

# 7. Backport to develop if needed
git checkout develop
git merge main

# 8. Clean up
git branch -d hotfix/critical-bug-fix
```

### Procedure 4: Rollback Deployment

**When:** Deployment caused issues, need to revert

**Steps:**

```bash
# 1. Identify the commit to rollback to
git log --oneline -10

# 2. Create rollback
git revert HEAD --no-edit  # Revert last commit
# Or for multiple commits:
git revert HEAD~3..HEAD --no-edit

# 3. Push rollback
git push origin main

# 4. If database migration needs rollback
DATABASE_URL=$PRODUCTION_DATABASE_URL npx prisma migrate rollback

# 5. Verify rollback
npm run test:smoke -- --env=production

# 6. Document incident
cat > .claude/signal-rollback-complete.json << EOF
{
  "signal_type": "rollback-complete",
  "environment": "production",
  "rolled_back_to": "$(git rev-parse HEAD)",
  "reason": "[description of issue]",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF
```

---

## Post-Deployment Verification

### Smoke Test Checklist

```bash
# Automated smoke tests
npm run test:smoke -- --env=production

# Manual verification checklist
□ Application loads
□ Authentication works
□ Critical user flows work
□ API endpoints respond
□ Database queries succeed
□ External integrations work
□ No console errors
□ Performance acceptable
```

### Health Check Endpoints

```bash
# Application health
curl -s https://your-app.com/api/health | jq '.'

# Database health
curl -s https://your-app.com/api/health/db | jq '.'

# External services health
curl -s https://your-app.com/api/health/external | jq '.'
```

### Monitoring Verification

```
□ Application metrics normal
□ Error rate within threshold
□ Response times acceptable
□ No new error patterns in logs
□ Alerts configured and working
```

### Post-Deployment Communication

```bash
# Slack notification
curl -X POST "$SLACK_WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "✅ Deployment Complete",
    "blocks": [
      {
        "type": "section",
        "text": {
          "type": "mrkdwn",
          "text": "*Deployment Complete*\n• Environment: Production\n• Commit: '$(git rev-parse --short HEAD)'\n• Time: '$(date)'"
        }
      }
    ]
  }'
```

---

## Rollback Procedures

### Quick Rollback (< 5 minutes)

For simple code changes without database migrations:

```bash
# 1. Identify previous working commit
git log --oneline -5

# 2. Revert to previous commit
git revert HEAD --no-edit

# 3. Force deploy
git push origin main

# 4. Verify
curl -s https://your-app.com/api/health
```

### Full Rollback (With Database)

For changes that included database migrations:

```bash
# 1. Stop application (if needed)
# Depends on your hosting platform

# 2. Rollback database
DATABASE_URL=$PRODUCTION_DATABASE_URL npx prisma migrate rollback

# 3. Restore from backup (if migration rollback fails)
psql $DATABASE_URL < backup-YYYYMMDD-HHMMSS.sql

# 4. Rollback code
git revert HEAD --no-edit
git push origin main

# 5. Restart application

# 6. Verify everything
npm run test:smoke -- --env=production
```

### Rollback Decision Tree

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         ROLLBACK DECISION TREE                                   │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│   Issue Detected                                                                │
│         │                                                                        │
│         ▼                                                                        │
│   ┌─────────────────┐                                                           │
│   │ Is app working  │──YES──▶ Monitor, may not need rollback                   │
│   │ for most users? │                                                           │
│   └────────┬────────┘                                                           │
│            │ NO                                                                  │
│            ▼                                                                     │
│   ┌─────────────────┐                                                           │
│   │ Is it a config  │──YES──▶ Fix config, redeploy (faster than rollback)      │
│   │ issue?          │                                                           │
│   └────────┬────────┘                                                           │
│            │ NO                                                                  │
│            ▼                                                                     │
│   ┌─────────────────┐                                                           │
│   │ Did deployment  │──YES──▶ Rollback database first, then code               │
│   │ include DB      │                                                           │
│   │ migration?      │                                                           │
│   └────────┬────────┘                                                           │
│            │ NO                                                                  │
│            ▼                                                                     │
│   Quick Rollback (code only)                                                    │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Environment-Specific Guides

### Vercel Deployment

```bash
# Preview deployment (automatic on PR)
# Production deployment
vercel --prod

# Rollback to previous deployment
vercel rollback

# Check deployment status
vercel ls
```

### Netlify Deployment

```bash
# Deploy to production
netlify deploy --prod

# Rollback
netlify rollback

# Check status
netlify status
```

### Docker/Kubernetes Deployment

```bash
# Build and push image
docker build -t your-app:$(git rev-parse --short HEAD) .
docker push your-registry/your-app:$(git rev-parse --short HEAD)

# Update Kubernetes deployment
kubectl set image deployment/your-app \
  your-app=your-registry/your-app:$(git rev-parse --short HEAD)

# Rollback
kubectl rollout undo deployment/your-app

# Check status
kubectl rollout status deployment/your-app
```

### Manual Server Deployment

```bash
# SSH to server
ssh user@your-server

# Pull latest code
cd /var/www/your-app
git pull origin main

# Install dependencies
npm ci

# Build
npm run build

# Restart application
pm2 restart your-app
# Or: systemctl restart your-app

# Verify
curl -s http://localhost:3000/api/health
```

---

## Deployment Signals

### Pre-Deployment Signal

```json
{
  "signal_type": "deployment-starting",
  "environment": "production",
  "commit": "abc123",
  "deployer": "human",
  "timestamp": "2026-01-16T12:00:00Z",
  "changes": {
    "stories": ["STORY-001", "STORY-002"],
    "has_migrations": false
  }
}
```

### Post-Deployment Signal

```json
{
  "signal_type": "deployment-complete",
  "environment": "production",
  "commit": "abc123",
  "status": "success",
  "timestamp": "2026-01-16T12:05:00Z",
  "verification": {
    "smoke_tests": "passed",
    "health_check": "healthy",
    "response_time_ms": 150
  }
}
```

### Rollback Signal

```json
{
  "signal_type": "rollback-complete",
  "environment": "production",
  "rolled_back_from": "abc123",
  "rolled_back_to": "def456",
  "reason": "API errors detected post-deployment",
  "timestamp": "2026-01-16T12:10:00Z"
}
```

---

## Emergency Contacts

| Role | Responsibility | Contact |
|------|----------------|---------|
| On-Call Engineer | First responder | [contact] |
| Tech Lead | Escalation | [contact] |
| DevOps | Infrastructure | [contact] |
| Database Admin | Database issues | [contact] |

---

**Document Status:** OPERATIONAL
**Last Updated:** 2026-01-16

*WAVE Framework | Deployment Runbook | Version 1.0.0*
