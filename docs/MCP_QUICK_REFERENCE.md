# MCP Servers Quick Reference

## 🚀 One-Time Setup

```bash
# 1. Create config
mkdir -p ~/.config/claude-code
# Copy mcp.json from docs/mcp.json

# 2. Create secure env file
touch ~/.env.mcp && chmod 600 ~/.env.mcp

# 3. Add tokens to ~/.env.mcp (see below)

# 4. Auto-load on shell start
echo 'source ~/.env.mcp' >> ~/.zshrc

# 5. Reload and start
source ~/.zshrc
claude-code
```

## 🔑 Required Tokens

```bash
# ~/.env.mcp
export GITHUB_PERSONAL_ACCESS_TOKEN=ghp_...
export NOTION_AUTH_HEADER='{"Authorization": "Bearer secret_...", "Notion-Version": "2022-06-28"}'
export SLACK_BOT_TOKEN=xoxb-...
export SLACK_TEAM_ID=T...
export POSTGRES_CONNECTION_STRING=postgresql://...
export SENTRY_AUTH_TOKEN=...
export SENTRY_ORG=your-org-slug
export SUPABASE_URL=https://...supabase.co
export SUPABASE_SERVICE_KEY=eyJ...
export VERCEL_TOKEN=...
```

## 📋 MCP Servers (12 Total)

| Server | Package | Auth |
|--------|---------|------|
| GitHub | `@modelcontextprotocol/server-github` | ✅ |
| Notion | `@notionhq/notion-mcp-server` | ✅ |
| Slack | `@modelcontextprotocol/server-slack` | ✅ |
| Supabase | `@supabase/mcp-server-supabase` | ✅ |
| Vercel | `@open-mcp/vercel` | ✅ |
| PostgreSQL | `@modelcontextprotocol/server-postgres` | ✅ |
| Sentry | `@modelcontextprotocol/server-sentry` | ✅ |
| Docker | `@modelcontextprotocol/server-docker` | ❌ |
| Playwright | `@playwright/mcp` | ❌ |
| Filesystem | `@modelcontextprotocol/server-filesystem` | ❌ |
| Sequential Thinking | `@modelcontextprotocol/server-sequential-thinking` | ❌ |
| Memory | `@modelcontextprotocol/server-memory` | ❌ |

## 🔗 Get Tokens From

- **GitHub**: https://github.com/settings/tokens
- **Notion**: https://www.notion.so/my-integrations
- **Slack**: https://api.slack.com/apps
- **Vercel**: https://vercel.com/account/tokens
- **Sentry**: https://sentry.io/settings/account/api/auth-tokens/
- **Supabase**: Project Settings → API

## 🔧 Common Commands

```bash
# Check env vars are loaded
env | grep GITHUB_PERSONAL_ACCESS_TOKEN

# Reload env vars
source ~/.zshrc

# Test Docker is running
docker ps

# Verify setup
ls -la ~/.config/claude-code/mcp.json
ls -la ~/.env.mcp
```

## 🚨 Troubleshooting

| Problem | Solution |
|---------|----------|
| Server not loading | Restart Claude Code |
| Auth error | Check token, reload env: `source ~/.zshrc` |
| Docker not working | Start Docker Desktop |
| Env vars empty | Add `source ~/.env.mcp` to `~/.zshrc` |
| Notion "not found" | Share pages with integration |
| Slack "not found" | Add bot to channels |

## 📖 Full Documentation

See `docs/MCP_SETUP_GUIDE.md` for complete setup instructions.
