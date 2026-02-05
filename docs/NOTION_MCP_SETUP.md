# MCP Server Setup Guide - AirView Team

## 🎯 Quick Overview

This guide helps you set up 12 MCP (Model Context Protocol) servers that enhance Claude Code with powerful integrations for GitHub, Notion, Slack, Supabase, Vercel, and more.

---

## 🚀 Quick Start (5 Minutes)

### Automated Setup (Recommended)

```bash
# 1. Clone the AirView repository
git clone <repo-url>
cd AirView

# 2. Run the automated setup script
./scripts/setup-mcp.sh

# 3. Edit your tokens (see below for where to get them)
nano ~/.env.mcp

# 4. Reload your shell
source ~/.zshrc

# 5. Start Claude Code
claude-code
```

---

## 📋 What Gets Installed

| Server | Purpose | Auth Required |
|--------|---------|---------------|
| **GitHub** | Repository operations, PRs, issues | ✅ |
| **Notion** | Workspace documentation | ✅ |
| **Slack** | Team communication | ✅ |
| **Supabase** | Database, auth, storage | ✅ |
| **Vercel** | Deployment management | ✅ |
| **PostgreSQL** | Direct database access | ✅ |
| **Sentry** | Error tracking | ✅ |
| **Docker** | Container management | ❌ |
| **Playwright** | Browser automation | ❌ |
| **Filesystem** | File operations | ❌ |
| **Sequential Thinking** | Enhanced AI reasoning | ❌ |
| **Memory** | Knowledge graph | ❌ |

---

## 🔑 Getting Your API Tokens

### 1. GitHub Token
1. Go to: https://github.com/settings/tokens
2. Click "Generate new token (classic)"
3. Select scopes: `repo`, `read:org`, `read:user`
4. Copy the token (starts with `ghp_`)

### 2. Notion Token
1. Go to: https://www.notion.so/my-integrations
2. Click "+ New integration"
3. Name it "Claude Code MCP"
4. Copy the "Internal Integration Token"
5. **Important**: Share relevant pages with your integration

### 3. Slack Token
1. Go to: https://api.slack.com/apps
2. Create new app → "From scratch"
3. Add Bot Token Scopes: `channels:read`, `chat:write`, `users:read`
4. Install to workspace
5. Copy "Bot User OAuth Token" (starts with `xoxb-`)
6. Get Team ID from workspace settings

### 4. Supabase Credentials
1. Go to your Supabase project dashboard
2. Settings → API
3. Copy **URL** and **service_role key**

### 5. Vercel Token
1. Go to: https://vercel.com/account/tokens
2. Click "Create Token"
3. Name: "Claude Code MCP"
4. Copy the token

### 6. Sentry Token
1. Go to: https://sentry.io/settings/account/api/auth-tokens/
2. Create new token
3. Scopes: `project:read`, `project:write`, `org:read`
4. Copy token and your organization slug

### 7. PostgreSQL Connection (Optional)
- For Supabase: Project Settings → Database → Connection String
- Replace `[YOUR-PASSWORD]` with actual password

---

## 📝 Edit Your Environment File

After running the setup script, edit `~/.env.mcp`:

```bash
# Open the file
nano ~/.env.mcp
# or
code ~/.env.mcp
```

Replace the placeholders with your actual tokens:

```bash
# GitHub
export GITHUB_PERSONAL_ACCESS_TOKEN=ghp_YOUR_ACTUAL_TOKEN

# Notion
export NOTION_AUTH_HEADER='{"Authorization": "Bearer secret_YOUR_TOKEN", "Notion-Version": "2022-06-28"}'

# Slack
export SLACK_BOT_TOKEN=xoxb-YOUR_ACTUAL_TOKEN
export SLACK_TEAM_ID=T1234567890

# Supabase
export SUPABASE_URL=https://your-project.supabase.co
export SUPABASE_SERVICE_KEY=YOUR_SERVICE_KEY

# Vercel
export VERCEL_TOKEN=YOUR_VERCEL_TOKEN

# Sentry
export SENTRY_AUTH_TOKEN=YOUR_SENTRY_TOKEN
export SENTRY_ORG=your-org-slug

# PostgreSQL (optional - for direct DB access)
export POSTGRES_CONNECTION_STRING=postgresql://postgres:password@db.project.supabase.co:5432/postgres
```

---

## ✅ Verify Setup

```bash
# 1. Check environment variables are loaded
echo $GITHUB_PERSONAL_ACCESS_TOKEN
# Should show your token (not "ghp_your_token_here")

# 2. Verify Docker is running (if using Docker MCP)
docker ps

# 3. Start Claude Code
claude-code

# 4. You should see prompts to approve each MCP server
# Click "Approve" for each one (this is a one-time setup)
```

---

## 🚨 Troubleshooting

### MCP Server Not Loading
- **Solution**: Restart Claude Code completely
- Check that `~/.config/claude-code/mcp.json` exists

### "Unauthorized" Errors
- **Solution**: Verify token in `~/.env.mcp` is correct
- Reload environment: `source ~/.zshrc`
- Check token hasn't expired

### Docker Not Working
- **Solution**: Ensure Docker Desktop is running
- Test with: `docker ps`

### Environment Variables Empty
- **Solution**: Check `~/.zshrc` has `source ~/.env.mcp`
- Reload shell: `source ~/.zshrc`
- Restart terminal

### Notion "Page Not Found"
- **Solution**: Share Notion pages with your integration
  - Open page → "..." → "Connections" → Add integration

### Slack "Channel Not Found"
- **Solution**: Add bot to channels
  - Open channel → "Integrations" → "Add apps"

---

## 🔒 Security Best Practices

### ✅ DO:
- Protect env file: `chmod 600 ~/.env.mcp`
- Use `.gitignore` for any env files
- Rotate tokens every 90 days
- Use minimum required scopes

### ❌ DON'T:
- Never commit tokens to git
- Don't share tokens
- Don't use production credentials in development

---

## 📚 Full Documentation

For complete details, see the repository documentation:

- **Full Setup Guide**: `docs/MCP_SETUP_GUIDE.md` (400+ lines)
- **Quick Reference**: `docs/MCP_QUICK_REFERENCE.md`
- **Setup Script**: `scripts/setup-mcp.sh`

---

## 💬 Need Help?

- **Slack**: #dev-support channel
- **Documentation**: Check `/docs` folder in repo
- **GitHub Issues**: Report problems in repository

---

## 🎉 You're All Set!

Once configured, these MCP servers will be available in **all projects** automatically. Start Claude Code and enjoy enhanced capabilities for development, deployment, monitoring, and more!

**Last Updated**: February 5, 2026
