# MCP Server Setup Guide

This guide will help you configure Model Context Protocol (MCP) servers for Claude Code. These servers provide enhanced capabilities like GitHub integration, database access, and more.

## 📋 Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Detailed Setup](#detailed-setup)
- [Service Configuration](#service-configuration)
- [Verification](#verification)
- [Troubleshooting](#troubleshooting)
- [Security Best Practices](#security-best-practices)

## 🎯 Overview

We use 12 MCP servers for our development workflow:

| Server | Purpose | Auth Required |
|--------|---------|---------------|
| GitHub | Repository operations, PRs, issues | ✅ |
| Notion | Workspace documentation | ✅ |
| Slack | Team communication | ✅ |
| Supabase | Database, auth, storage management | ✅ |
| Vercel | Deployment management | ✅ |
| PostgreSQL | Direct database access | ✅ |
| Sentry | Error tracking | ✅ |
| Docker | Container management | ❌ |
| Playwright | Browser automation & testing | ❌ |
| Filesystem | Local file operations | ❌ |
| Sequential Thinking | Enhanced AI reasoning | ❌ |
| Memory | Persistent knowledge graph | ❌ |

## 🔧 Prerequisites

### Required Software

1. **Node.js** (v18 or higher)
   ```bash
   node --version  # Should be 18+
   ```

2. **Claude Code CLI** (installed)
   ```bash
   which claude-code  # Should return a path
   ```

3. **Docker Desktop** (for Docker MCP)
   - Download: https://www.docker.com/products/docker-desktop/
   - Must be running for Docker MCP to work

### Required Accounts & Tokens

You'll need accounts and API tokens for:
- GitHub (https://github.com/settings/tokens)
- Notion (https://www.notion.so/my-integrations)
- Slack (https://api.slack.com/apps)
- Supabase (your project dashboard)
- Vercel (https://vercel.com/account/tokens)
- Sentry (https://sentry.io/settings/account/api/auth-tokens/)

## 🚀 Quick Start

Follow these steps to set up MCP servers globally (available in all projects):

### Step 1: Create User-Level MCP Configuration

```bash
# Create Claude Code config directory
mkdir -p ~/.config/claude-code

# Create MCP configuration file
curl -o ~/.config/claude-code/mcp.json https://raw.githubusercontent.com/your-org/airview/main/docs/mcp.json
```

**Or manually create** `~/.config/claude-code/mcp.json`:

```json
{
  "mcpServers": {
    "notion": {
      "command": "npx",
      "args": ["-y", "@notionhq/notion-mcp-server"],
      "env": {
        "OPENAPI_MCP_HEADERS": "${NOTION_AUTH_HEADER}"
      }
    },
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "${GITHUB_PERSONAL_ACCESS_TOKEN}"
      }
    },
    "slack": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-slack"],
      "env": {
        "SLACK_BOT_TOKEN": "${SLACK_BOT_TOKEN}",
        "SLACK_TEAM_ID": "${SLACK_TEAM_ID}"
      }
    },
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem"],
      "env": {}
    },
    "postgres": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-postgres"],
      "env": {
        "POSTGRES_CONNECTION_STRING": "${POSTGRES_CONNECTION_STRING}"
      }
    },
    "sentry": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-sentry"],
      "env": {
        "SENTRY_AUTH_TOKEN": "${SENTRY_AUTH_TOKEN}",
        "SENTRY_ORG": "${SENTRY_ORG}"
      }
    },
    "sequential-thinking": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-sequential-thinking"],
      "env": {}
    },
    "memory": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-memory"],
      "env": {}
    },
    "docker": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-docker"],
      "env": {}
    },
    "playwright": {
      "command": "npx",
      "args": ["-y", "@playwright/mcp"],
      "env": {}
    },
    "supabase": {
      "command": "npx",
      "args": ["-y", "@supabase/mcp-server-supabase"],
      "env": {
        "SUPABASE_URL": "${SUPABASE_URL}",
        "SUPABASE_SERVICE_KEY": "${SUPABASE_SERVICE_KEY}"
      }
    },
    "vercel": {
      "command": "npx",
      "args": ["-y", "@open-mcp/vercel"],
      "env": {
        "VERCEL_TOKEN": "${VERCEL_TOKEN}"
      }
    }
  }
}
```

### Step 2: Create Secure Environment File

```bash
# Create protected environment file
touch ~/.env.mcp
chmod 600 ~/.env.mcp  # Only you can read/write

# Edit with your preferred editor
nano ~/.env.mcp
# or
code ~/.env.mcp
```

Add your tokens to `~/.env.mcp`:

```bash
# GitHub Personal Access Token
# Get from: https://github.com/settings/tokens
# Scopes needed: repo, read:org, read:user
export GITHUB_PERSONAL_ACCESS_TOKEN=ghp_your_token_here

# Notion Integration Token
# Get from: https://www.notion.so/my-integrations
# Format: Full JSON header with Authorization and Notion-Version
export NOTION_AUTH_HEADER='{"Authorization": "Bearer secret_your_token_here", "Notion-Version": "2022-06-28"}'

# Slack Bot Token
# Get from: https://api.slack.com/apps → Your App → OAuth & Permissions
# Scopes needed: channels:read, chat:write, users:read
export SLACK_BOT_TOKEN=xoxb-your-bot-token-here
export SLACK_TEAM_ID=T1234567890

# PostgreSQL Connection String
# For Supabase, get from: Project Settings → Database → Connection String
# Format: postgresql://postgres:[password]@db.[project].supabase.co:5432/postgres
export POSTGRES_CONNECTION_STRING=postgresql://postgres:your_password@db.your_project.supabase.co:5432/postgres

# Sentry Auth Token
# Get from: https://sentry.io/settings/account/api/auth-tokens/
# Scopes needed: project:read, project:write, org:read
export SENTRY_AUTH_TOKEN=your_sentry_token_here
export SENTRY_ORG=your-org-slug

# Supabase (for Supabase MCP)
# Get from: Project Settings → API
export SUPABASE_URL=https://your-project.supabase.co
export SUPABASE_SERVICE_KEY=your-service-role-key-here

# Vercel Token
# Get from: https://vercel.com/account/tokens
# Scopes: Full Account
export VERCEL_TOKEN=your_vercel_token_here
```

### Step 3: Load Environment Variables Automatically

Add to your shell profile:

```bash
# For Zsh (macOS default)
echo 'source ~/.env.mcp' >> ~/.zshrc

# For Bash
echo 'source ~/.env.mcp' >> ~/.bashrc
```

Reload your shell:

```bash
source ~/.zshrc  # or source ~/.bashrc
```

### Step 4: Verify Setup

```bash
# Check if environment variables are loaded
echo $GITHUB_PERSONAL_ACCESS_TOKEN  # Should show your token

# Start Claude Code
claude-code

# You should see prompts to approve each MCP server
# Approve all servers when prompted
```

## 📚 Detailed Setup

### Service Configuration

#### 1. GitHub MCP

**Purpose**: Repository operations, pull requests, issues, code search

**Setup**:
1. Go to https://github.com/settings/tokens
2. Click "Generate new token (classic)"
3. Select scopes:
   - ✅ `repo` (Full control of private repositories)
   - ✅ `read:org` (Read org and team membership)
   - ✅ `read:user` (Read user profile data)
4. Generate token and copy it
5. Add to `~/.env.mcp`:
   ```bash
   export GITHUB_PERSONAL_ACCESS_TOKEN=ghp_your_token_here
   ```

**Capabilities**:
- Create/update/close issues
- Create/update pull requests
- Search code and repositories
- Manage branches
- View commit history

---

#### 2. Notion MCP

**Purpose**: Access and manage Notion workspace documentation

**Setup**:
1. Go to https://www.notion.so/my-integrations
2. Click "+ New integration"
3. Give it a name (e.g., "Claude Code MCP")
4. Select your workspace
5. Copy the "Internal Integration Token"
6. Share relevant Notion pages with your integration
7. Add to `~/.env.mcp`:
   ```bash
   export NOTION_AUTH_HEADER='{"Authorization": "Bearer secret_your_token", "Notion-Version": "2022-06-28"}'
   ```

**Capabilities**:
- Read Notion pages
- Create/update pages
- Search workspace
- Manage databases

---

#### 3. Slack MCP

**Purpose**: Team communication, send messages, read channels

**Setup**:
1. Go to https://api.slack.com/apps
2. Click "Create New App" → "From scratch"
3. Name: "Claude Code MCP"
4. Select your workspace
5. Go to "OAuth & Permissions"
6. Add Bot Token Scopes:
   - `channels:read`
   - `chat:write`
   - `users:read`
   - `channels:history`
   - `groups:read`
7. Click "Install to Workspace"
8. Copy the "Bot User OAuth Token" (starts with `xoxb-`)
9. Get Team ID: Click workspace name → Copy Team ID
10. Add to `~/.env.mcp`:
    ```bash
    export SLACK_BOT_TOKEN=xoxb-your-bot-token
    export SLACK_TEAM_ID=T1234567890
    ```

**Capabilities**:
- Send messages to channels
- Read channel history
- List channels and users
- React to messages

---

#### 4. Supabase MCP

**Purpose**: Database operations, authentication, storage management

**Setup**:
1. Go to your Supabase project dashboard
2. Navigate to Project Settings → API
3. Copy:
   - **URL**: Your project URL
   - **Service role key** (⚠️ Never expose this in client-side code)
4. Add to `~/.env.mcp`:
   ```bash
   export SUPABASE_URL=https://your-project.supabase.co
   export SUPABASE_SERVICE_KEY=eyJhb...your-service-key
   ```

**Capabilities**:
- Query database tables
- Manage authentication
- Handle file storage
- Run migrations
- View logs

---

#### 5. Vercel MCP

**Purpose**: Deployment management, environment variables, logs

**Setup**:
1. Go to https://vercel.com/account/tokens
2. Click "Create Token"
3. Name: "Claude Code MCP"
4. Scope: Select "Full Account" or specific teams
5. Expiration: Choose based on security policy (recommended: 90 days)
6. Copy the token
7. Add to `~/.env.mcp`:
   ```bash
   export VERCEL_TOKEN=your_vercel_token_here
   ```

**Capabilities**:
- Deploy projects
- Manage environment variables
- View deployment logs
- Configure domains
- Manage teams

---

#### 6. PostgreSQL MCP

**Purpose**: Direct database access (can connect to Supabase or any PostgreSQL DB)

**Setup**:
1. Get connection string from your database provider
2. For Supabase: Project Settings → Database → Connection String
3. Replace `[YOUR-PASSWORD]` with your actual database password
4. Add to `~/.env.mcp`:
   ```bash
   export POSTGRES_CONNECTION_STRING=postgresql://postgres:your_password@db.your_project.supabase.co:5432/postgres
   ```

**Capabilities**:
- Execute SQL queries
- View table schemas
- Manage indexes
- Run migrations

---

#### 7. Sentry MCP

**Purpose**: Error tracking and performance monitoring

**Setup**:
1. Go to https://sentry.io/settings/account/api/auth-tokens/
2. Click "Create New Token"
3. Name: "Claude Code MCP"
4. Scopes:
   - ✅ `project:read`
   - ✅ `project:write`
   - ✅ `org:read`
   - ✅ `event:read`
5. Copy the token
6. Get your organization slug from Sentry URL: `https://sentry.io/organizations/YOUR-ORG-SLUG/`
7. Add to `~/.env.mcp`:
   ```bash
   export SENTRY_AUTH_TOKEN=your_sentry_token
   export SENTRY_ORG=your-org-slug
   ```

**Capabilities**:
- View error reports
- Search issues
- Manage releases
- View performance metrics

---

#### 8. Docker MCP

**Purpose**: Container and image management

**Setup**:
- ✅ **No configuration needed!**
- Requires Docker Desktop to be installed and running
- Uses local Docker socket

**Capabilities**:
- List/start/stop containers
- Build and manage images
- View logs
- Execute commands in containers
- Manage volumes and networks

---

#### 9. Playwright MCP

**Purpose**: Browser automation and testing

**Setup**:
- ✅ **No configuration needed!**

**Capabilities**:
- Run browser tests
- Take screenshots
- Automate web interactions
- Test responsive design

---

#### 10. Filesystem MCP

**Purpose**: Enhanced local file operations

**Setup**:
- ✅ **No configuration needed!**

**Capabilities**:
- Read/write files
- List directories
- Search files
- Monitor file changes

---

#### 11. Sequential Thinking MCP

**Purpose**: Enhanced AI reasoning for complex problems

**Setup**:
- ✅ **No configuration needed!**

**Capabilities**:
- Multi-step reasoning
- Complex problem solving
- Structured thinking

---

#### 12. Memory MCP

**Purpose**: Persistent knowledge graph across sessions

**Setup**:
- ✅ **No configuration needed!**

**Capabilities**:
- Store information across sessions
- Build knowledge graphs
- Contextual memory

---

## ✅ Verification

After setup, verify everything works:

### 1. Check Environment Variables

```bash
# Test that variables are loaded
env | grep -E "GITHUB_PERSONAL_ACCESS_TOKEN|SLACK_BOT_TOKEN|VERCEL_TOKEN"
```

### 2. Start Claude Code

```bash
claude-code
```

You should see prompts to approve each MCP server. Approve all of them.

### 3. Test Individual Servers

In Claude Code, you can test each server:

**GitHub**:
```
Can you list my recent repositories?
```

**Docker** (if Docker Desktop is running):
```
Can you list my running Docker containers?
```

**Filesystem**:
```
Can you list files in the current directory?
```

**Supabase**:
```
Can you show me the tables in my Supabase database?
```

## 🔧 Troubleshooting

### MCP Server Not Loading

**Problem**: Server doesn't appear in Claude Code

**Solutions**:
1. Check `~/.config/claude-code/mcp.json` exists and is valid JSON
2. Restart Claude Code completely
3. Check npm package exists: `npm view @package-name`
4. Clear npm cache: `npm cache clean --force`

### Authentication Errors

**Problem**: "Unauthorized" or "Invalid token" errors

**Solutions**:
1. Verify token in `~/.env.mcp` is correct (no extra spaces/quotes)
2. Check token hasn't expired
3. Verify token has required scopes
4. Reload environment: `source ~/.zshrc`
5. Restart Claude Code

### Docker MCP Not Working

**Problem**: Docker commands fail

**Solutions**:
1. Ensure Docker Desktop is running
2. Check Docker socket: `docker ps` should work in terminal
3. On macOS: Check Docker Desktop → Settings → Advanced → Allow default Docker socket

### Environment Variables Not Loading

**Problem**: `echo $VARIABLE` shows nothing

**Solutions**:
1. Check `~/.env.mcp` has correct syntax (no spaces around `=`)
2. Verify `source ~/.env.mcp` is in your shell profile
3. Reload shell: `source ~/.zshrc` or restart terminal
4. Check file permissions: `ls -la ~/.env.mcp` (should be `-rw-------`)

### Notion "Page not found" Errors

**Problem**: Cannot access Notion pages

**Solutions**:
1. Share pages with your integration:
   - Open Notion page
   - Click "..." → "Connections" → Add your integration
2. Verify integration has access to workspace

### Slack "Channel not found" Errors

**Problem**: Cannot access Slack channels

**Solutions**:
1. Add bot to channels:
   - Open channel → "Integrations" → "Add apps"
   - Find your bot and add it
2. Verify bot has required scopes in Slack app settings

## 🔒 Security Best Practices

### ✅ DO:

1. **Protect your env file**:
   ```bash
   chmod 600 ~/.env.mcp  # Only you can read/write
   ```

2. **Use `.gitignore`** for any env files in projects:
   ```bash
   echo ".env.mcp" >> .gitignore
   echo ".mcp.json" >> .gitignore
   ```

3. **Rotate tokens regularly**:
   - GitHub: Every 90 days
   - Vercel: Every 90 days
   - Slack: Annually or when team members leave

4. **Use minimum required scopes**:
   - Only grant permissions that are actually needed

5. **Different tokens per environment**:
   - Development vs Production
   - Never use production tokens in development

### ❌ DON'T:

1. **Never commit tokens to git**:
   - Always use environment variables
   - Never hardcode in config files

2. **Don't share tokens**:
   - Each developer should have their own tokens
   - Use team/organization features when available

3. **Don't use production database credentials**:
   - Use separate dev/staging databases
   - Service role keys should be for development only

4. **Don't store tokens in plain text** outside of:
   - Protected `~/.env.mcp` (chmod 600)
   - System keychain (macOS Keychain, Windows Credential Manager)

### Using macOS Keychain (Advanced)

For extra security, store tokens in macOS Keychain:

```bash
# Store token in Keychain
security add-generic-password -a "$USER" -s "github-mcp-token" -w "ghp_your_token"

# Retrieve in ~/.zshrc
export GITHUB_PERSONAL_ACCESS_TOKEN=$(security find-generic-password -a "$USER" -s "github-mcp-token" -w 2>/dev/null)
```

## 📞 Support

### Team Resources

- **AirView CLAUDE.md**: See project root for development guidelines
- **Slack**: #dev-support channel
- **Documentation**: `/docs` directory in repository

### External Resources

- **MCP Documentation**: https://modelcontextprotocol.io/
- **Claude Code Docs**: https://claude.ai/code
- **GitHub Issues**: Report MCP server issues to respective repositories

## 🎉 You're All Set!

Your MCP servers are now configured and available in **all projects**. When you start Claude Code, you'll have enhanced capabilities for:

- GitHub operations
- Database management
- Deployments
- Error tracking
- Browser testing
- And more!

Happy coding! 🚀
