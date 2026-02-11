# Doppler Secrets Management for WAVE V2.1

**Status:** ✅ Configured and Active
**Last Updated:** February 11, 2026

---

## Overview

All sensitive credentials for WAVE are now managed through [Doppler](https://doppler.com), a centralized secrets management platform. This eliminates the need to store API keys in local `.env` files and provides better security, team collaboration, and secret rotation capabilities.

---

## Quick Start

### Install Doppler CLI

```bash
# macOS
brew install dopplerhq/cli/doppler

# Other platforms
curl -Ls --tlsv1.2 --proto "=https" --retry 3 https://cli.doppler.com/install.sh | sudo sh
```

### Login to Doppler

```bash
doppler login
```

### Verify Access

```bash
doppler me
# Should show: Elis-Mac-Studio | Boomerang-apps workspace
```

---

## Available Environments

| Environment | Config Name | Purpose | LangSmith Project |
|-------------|-------------|---------|-------------------|
| **Development** | `dev` | Local development | `wave-local-development` |
| **Personal Dev** | `dev_personal` | Personal testing | - |
| **Staging** | `stg` | Pre-production testing | `wave-staging` |
| **Production** | `prd` | Live production | `wave-production` |

---

## Secrets Stored in Doppler

### LangSmith Tracing (All Environments)

| Secret | Description | Example Value |
|--------|-------------|---------------|
| `LANGCHAIN_TRACING_V2` | Enable LangSmith tracing | `true` |
| `LANGCHAIN_API_KEY` | LangSmith authentication | `lsv2_sk_xxxxx...` |
| `LANGCHAIN_PROJECT` | Project name for traces | `wave-{env}` |
| `LANGSMITH_API_KEY` | Alternative API key variable | `lsv2_sk_xxxxx...` |
| `LANGSMITH_WORKSPACE_ID` | Workspace identifier | UUID |

### Other Secrets

| Secret | Description |
|--------|-------------|
| `ANTHROPIC_API_KEY` | Claude API access |
| `DATABASE_URL` | Supabase database URL |
| `GITHUB_PERSONAL_ACCESS_TOKEN` | GitHub API access |
| `NOTION_AUTH_HEADER` | Notion API credentials |
| `POSTGRES_CONNECTION_STRING` | PostgreSQL connection |
| `SENTRY_AUTH_TOKEN` | Sentry error tracking |
| `SLACK_BOT_TOKEN` | Slack bot credentials |
| `SLACK_WEBHOOK_URL` | Slack notifications |
| `SUPABASE_ACCESS_TOKEN` | Supabase admin access |
| `SUPABASE_ANON_KEY` | Supabase anonymous key |

---

## Usage

### Run Commands with Doppler Secrets

```bash
# Development
doppler run --config dev -- docker compose up

# Staging
doppler run --config stg -- docker compose up

# Production
doppler run --config prd -- docker compose up

# Run any command with secrets
doppler run --config dev -- npm run dev
doppler run --config dev -- python orchestrator/main.py
```

### Inject Secrets into Shell

```bash
# Export all secrets to current shell (development)
eval $(doppler secrets download --config dev --format env-no-quotes)

# Verify loaded
env | grep LANGSMITH

# Alternative: source from downloaded file
doppler secrets download --config dev --no-file --format env > .env.local
source .env.local
```

### View Secrets

```bash
# List all secrets in dev config
doppler secrets --config dev

# Get specific secret
doppler secrets get LANGCHAIN_API_KEY --config dev --plain

# Get multiple secrets
doppler secrets get LANGCHAIN_API_KEY ANTHROPIC_API_KEY --config dev
```

### Update Secrets

```bash
# Set a single secret
doppler secrets set LANGCHAIN_PROJECT="wave-production" --config prd

# Set multiple secrets
doppler secrets set \
  LANGCHAIN_TRACING_V2="true" \
  LANGCHAIN_PROJECT="wave-dev" \
  --config dev

# Update from file
doppler secrets upload .env.template --config dev
```

---

## Docker Compose Integration

### Using Doppler with Docker Compose

**Option 1: Run with doppler CLI**
```bash
doppler run --config dev -- docker compose up -d
```

**Option 2: Export before running**
```bash
eval $(doppler secrets download --config dev --format env-no-quotes)
docker compose up -d
```

**Option 3: Download to .env file**
```bash
doppler secrets download --config dev --no-file --format docker > .env
docker compose up -d
```

### docker-compose.yml Integration

```yaml
services:
  orchestrator:
    image: wave-orchestrator:latest
    environment:
      # Doppler will inject these automatically when using "doppler run"
      - LANGCHAIN_TRACING_V2
      - LANGCHAIN_API_KEY
      - LANGCHAIN_PROJECT
      - ANTHROPIC_API_KEY
```

---

## Preflight Integration

The `/preflight` command now validates LangSmith configuration from Doppler:

```bash
# Run preflight with Doppler secrets
doppler run --config dev -- claude /preflight

# Or load secrets first
eval $(doppler secrets download --config dev --format env-no-quotes)
claude /preflight
```

**Preflight Section 1.8 checks:**
- ✓ LANGCHAIN_* and LANGSMITH_* environment variables present
- ✓ API connectivity to https://api.smith.langchain.com
- ✓ LangSmith version and workspace access

---

## Security Best Practices

### ✅ DO

- ✅ Use Doppler for all sensitive credentials
- ✅ Use environment-specific configs (dev/stg/prd)
- ✅ Rotate API keys regularly via Doppler dashboard
- ✅ Use `--config` flag explicitly to avoid mistakes
- ✅ Run `doppler run` for temporary secret injection
- ✅ Add `.env` and `.env.*` to `.gitignore`

### ❌ DON'T

- ❌ Commit `.env` files with real credentials
- ❌ Share API keys via Slack/email
- ❌ Use production secrets in development
- ❌ Hardcode secrets in source code
- ❌ Download secrets to files without `.gitignore`
- ❌ Mix environments (e.g., dev + prd secrets)

---

## CI/CD Integration

### GitHub Actions

```yaml
name: WAVE Production Deployment

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install Doppler CLI
        run: |
          curl -Ls https://cli.doppler.com/install.sh | sudo sh

      - name: Deploy with Doppler
        env:
          DOPPLER_TOKEN: ${{ secrets.DOPPLER_TOKEN_PRD }}
        run: |
          doppler run --config prd -- docker compose up -d
```

### Service Tokens

Create service tokens for CI/CD:

```bash
# Create token for GitHub Actions
doppler configs tokens create github-actions --config prd

# Token will be printed - add to GitHub Secrets as DOPPLER_TOKEN_PRD
```

---

## Troubleshooting

### Secret Not Found

```bash
# List all secrets in config
doppler secrets --config dev

# Check you're using correct config
doppler configure get config

# Set default config
doppler configure set config dev
```

### API Connection Failed

```bash
# Check Doppler authentication
doppler me

# Re-login if needed
doppler login

# Test specific secret
doppler secrets get LANGCHAIN_API_KEY --config dev --plain
```

### LangSmith Not Working

```bash
# Verify all LangSmith variables are set
doppler secrets get \
  LANGCHAIN_TRACING_V2 \
  LANGCHAIN_API_KEY \
  LANGCHAIN_PROJECT \
  LANGSMITH_API_KEY \
  LANGSMITH_WORKSPACE_ID \
  --config dev

# Test API connectivity
export LANGSMITH_API_KEY=$(doppler secrets get LANGSMITH_API_KEY --config dev --plain)
curl -H "x-api-key: $LANGSMITH_API_KEY" https://api.smith.langchain.com/info
```

### Wrong Environment Loaded

```bash
# Always specify --config explicitly
doppler run --config dev -- your-command

# Or set project default
cd /path/to/wave
doppler setup --config dev

# Verify current config
doppler configure get
```

---

## LangSmith Dashboard Access

After loading secrets from Doppler, traces will appear at:

**Dashboard:** https://smith.langchain.com/

**Projects by environment:**
- Development: `wave-local-development`
- Staging: `wave-staging`
- Production: `wave-production`

**View traces:**
1. Visit https://smith.langchain.com/
2. Select project (e.g., `wave-local-development`)
3. View traces, costs, and performance metrics

---

## Migration from .env Files

If you have existing `.env` files:

```bash
# 1. Review local .env
cat .env

# 2. Upload to Doppler
doppler secrets upload .env --config dev

# 3. Verify upload
doppler secrets --config dev

# 4. Test with doppler run
doppler run --config dev -- npm run dev

# 5. Delete local .env (after confirming it works)
rm .env
```

**Note:** Never commit `.env` files with real credentials. If you did, rotate all keys immediately.

---

## Team Collaboration

### Adding Team Members

1. Invite to Doppler workspace: https://dashboard.doppler.com/
2. Grant access to `wave` project
3. Share this documentation
4. Team member runs: `doppler login` and `doppler setup`

### Access Levels

| Role | Permissions | Use Case |
|------|-------------|----------|
| **Admin** | Full access to all configs | DevOps, Team Leads |
| **Developer** | Read dev/stg, no production | Engineers |
| **Viewer** | Read-only all configs | Auditors, Stakeholders |

---

## Backup and Disaster Recovery

### Export Secrets for Backup

```bash
# Export all configs
doppler secrets download --config dev --no-file --format json > backups/dev-secrets.json
doppler secrets download --config stg --no-file --format json > backups/stg-secrets.json
doppler secrets download --config prd --no-file --format json > backups/prd-secrets.json

# Store backups in secure location (1Password, encrypted drive)
```

### Restore from Backup

```bash
# Upload from JSON backup
doppler secrets upload backups/dev-secrets.json --config dev
```

---

## Cost and Limits

**Doppler Plan:** Free tier (currently)
- ✅ Unlimited secrets
- ✅ Unlimited environments
- ✅ 5 users included
- ✅ Basic audit logs

**Upgrade triggers:**
- Need more than 5 team members
- Advanced audit logs required
- RBAC for fine-grained access control

---

## Quick Reference

```bash
# Setup
doppler login
doppler setup --config dev

# View secrets
doppler secrets --config dev
doppler secrets get SECRET_NAME --config dev --plain

# Update secrets
doppler secrets set KEY="value" --config dev

# Run with secrets
doppler run --config dev -- your-command

# Load to shell
eval $(doppler secrets download --config dev --format env-no-quotes)

# Download to file
doppler secrets download --config dev --no-file --format env > .env.local
```

---

## Support

**Doppler Documentation:** https://docs.doppler.com/
**WAVE Team:** Slack #wave-v2
**Issues:** https://github.com/Boomerang-Apps/wave/issues

---

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2026-02-11 | Initial Doppler setup with LangSmith credentials | Claude Sonnet 4.5 |
| 2026-02-11 | Added all environments (dev/stg/prd) | Claude Sonnet 4.5 |
| 2026-02-11 | Integrated with preflight validation | Claude Sonnet 4.5 |
