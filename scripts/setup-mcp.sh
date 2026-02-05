#!/bin/bash
# MCP Server Setup Script for AirView Team
# This script helps automate the MCP server configuration

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Header
echo -e "${BLUE}"
echo "╔═══════════════════════════════════════════════════════╗"
echo "║       AirView MCP Server Setup Script                ║"
echo "║       Setting up 12 MCP servers globally             ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Check prerequisites
echo -e "${YELLOW}[1/6] Checking prerequisites...${NC}"

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed. Please install Node.js 18+ first.${NC}"
    exit 1
fi
NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}❌ Node.js version must be 18 or higher. Current: $(node --version)${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Node.js $(node --version)${NC}"

# Check npm
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm is not installed.${NC}"
    exit 1
fi
echo -e "${GREEN}✅ npm $(npm --version)${NC}"

# Check Claude Code
if ! command -v claude-code &> /dev/null; then
    echo -e "${YELLOW}⚠️  Claude Code CLI not found. Make sure it's installed.${NC}"
else
    echo -e "${GREEN}✅ Claude Code CLI${NC}"
fi

# Check Docker (optional)
if command -v docker &> /dev/null; then
    echo -e "${GREEN}✅ Docker $(docker --version | cut -d' ' -f3 | tr -d ',')${NC}"
else
    echo -e "${YELLOW}⚠️  Docker not found (optional, needed for Docker MCP)${NC}"
fi

echo ""

# Create config directory
echo -e "${YELLOW}[2/6] Creating configuration directory...${NC}"
mkdir -p ~/.config/claude-code
echo -e "${GREEN}✅ Created ~/.config/claude-code${NC}"
echo ""

# Create MCP config file
echo -e "${YELLOW}[3/6] Creating MCP configuration file...${NC}"

cat > ~/.config/claude-code/mcp.json << 'EOF'
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
EOF

echo -e "${GREEN}✅ Created ~/.config/claude-code/mcp.json${NC}"
echo ""

# Create environment file template
echo -e "${YELLOW}[4/6] Creating environment file template...${NC}"

if [ -f ~/.env.mcp ]; then
    echo -e "${YELLOW}⚠️  ~/.env.mcp already exists. Creating backup...${NC}"
    cp ~/.env.mcp ~/.env.mcp.backup.$(date +%Y%m%d_%H%M%S)
    echo -e "${GREEN}✅ Backup created${NC}"
fi

cat > ~/.env.mcp << 'EOF'
# MCP Server Environment Variables
# AirView Team - DO NOT COMMIT THIS FILE

# GitHub Personal Access Token
# Get from: https://github.com/settings/tokens
# Scopes: repo, read:org, read:user
export GITHUB_PERSONAL_ACCESS_TOKEN=ghp_your_token_here

# Notion Integration Token
# Get from: https://www.notion.so/my-integrations
export NOTION_AUTH_HEADER='{"Authorization": "Bearer secret_your_token_here", "Notion-Version": "2022-06-28"}'

# Slack Bot Token
# Get from: https://api.slack.com/apps → Your App → OAuth & Permissions
# Scopes: channels:read, chat:write, users:read
export SLACK_BOT_TOKEN=xoxb-your-bot-token-here
export SLACK_TEAM_ID=T1234567890

# PostgreSQL Connection String (for direct DB access)
# For Supabase: Project Settings → Database → Connection String
export POSTGRES_CONNECTION_STRING=postgresql://postgres:your_password@db.your_project.supabase.co:5432/postgres

# Sentry Auth Token
# Get from: https://sentry.io/settings/account/api/auth-tokens/
export SENTRY_AUTH_TOKEN=your_sentry_token_here
export SENTRY_ORG=your-org-slug

# Supabase (for Supabase MCP)
# Get from: Project Settings → API
export SUPABASE_URL=https://your-project.supabase.co
export SUPABASE_SERVICE_KEY=your-service-role-key-here

# Vercel Token
# Get from: https://vercel.com/account/tokens
export VERCEL_TOKEN=your_vercel_token_here
EOF

chmod 600 ~/.env.mcp
echo -e "${GREEN}✅ Created ~/.env.mcp with secure permissions (600)${NC}"
echo ""

# Add to shell profile
echo -e "${YELLOW}[5/6] Configuring shell profile...${NC}"

SHELL_PROFILE=""
if [ -n "$ZSH_VERSION" ]; then
    SHELL_PROFILE="$HOME/.zshrc"
elif [ -n "$BASH_VERSION" ]; then
    SHELL_PROFILE="$HOME/.bashrc"
else
    echo -e "${YELLOW}⚠️  Unknown shell. Please manually add 'source ~/.env.mcp' to your shell profile.${NC}"
fi

if [ -n "$SHELL_PROFILE" ]; then
    if grep -q "source ~/.env.mcp" "$SHELL_PROFILE" 2>/dev/null; then
        echo -e "${GREEN}✅ ~/.env.mcp already sourced in $SHELL_PROFILE${NC}"
    else
        echo "" >> "$SHELL_PROFILE"
        echo "# MCP Server Environment Variables" >> "$SHELL_PROFILE"
        echo "source ~/.env.mcp" >> "$SHELL_PROFILE"
        echo -e "${GREEN}✅ Added 'source ~/.env.mcp' to $SHELL_PROFILE${NC}"
    fi
fi
echo ""

# Summary
echo -e "${YELLOW}[6/6] Setup complete!${NC}"
echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ MCP servers configured successfully!${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${YELLOW}📝 Next Steps:${NC}"
echo ""
echo "1. Edit ~/.env.mcp and add your API tokens:"
echo -e "   ${BLUE}nano ~/.env.mcp${NC}"
echo "   or"
echo -e "   ${BLUE}code ~/.env.mcp${NC}"
echo ""
echo "2. Get your tokens from:"
echo "   • GitHub: https://github.com/settings/tokens"
echo "   • Notion: https://www.notion.so/my-integrations"
echo "   • Slack: https://api.slack.com/apps"
echo "   • Vercel: https://vercel.com/account/tokens"
echo "   • Sentry: https://sentry.io/settings/account/api/auth-tokens/"
echo "   • Supabase: Your project dashboard → Settings → API"
echo ""
echo "3. Reload your shell:"
echo -e "   ${BLUE}source ~/.zshrc${NC}  (or source ~/.bashrc)"
echo ""
echo "4. Verify environment variables are loaded:"
echo -e "   ${BLUE}echo \$GITHUB_PERSONAL_ACCESS_TOKEN${NC}"
echo ""
echo "5. Start Claude Code:"
echo -e "   ${BLUE}claude-code${NC}"
echo ""
echo "6. Approve MCP servers when prompted"
echo ""
echo -e "${YELLOW}📚 Documentation:${NC}"
echo "   • Full guide: docs/MCP_SETUP_GUIDE.md"
echo "   • Quick ref: docs/MCP_QUICK_REFERENCE.md"
echo ""
echo -e "${GREEN}🎉 You're all set! Happy coding!${NC}"
