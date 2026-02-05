# WAVE Project Documentation

## 📚 Available Documentation

### MCP Server Setup
- **[MCP_SETUP_GUIDE.md](./MCP_SETUP_GUIDE.md)** - Complete MCP server setup guide (12 servers)
- **[MCP_QUICK_REFERENCE.md](./MCP_QUICK_REFERENCE.md)** - Quick reference card
- **[NOTION_MCP_SETUP.md](./NOTION_MCP_SETUP.md)** - Notion-optimized version

### Configuration Files
- **[mcp.json](./mcp.json)** - Reference MCP configuration file

## 🚀 Quick Setup

Run the automated setup script:

```bash
./scripts/setup-mcp.sh
```

This will:
1. ✅ Check prerequisites (Node.js, npm, Docker)
2. ✅ Create `~/.config/claude-code/mcp.json`
3. ✅ Create secure `~/.env.mcp` template
4. ✅ Configure shell profile to auto-load environment
5. ✅ Provide next steps for adding your tokens

## 🔧 MCP Servers Included (12)

1. **GitHub** - Repository operations, PRs, issues
2. **Notion** - Workspace documentation
3. **Slack** - Team communication
4. **Supabase** - Database, auth, storage
5. **Vercel** - Deployment management
6. **PostgreSQL** - Direct database access
7. **Sentry** - Error tracking
8. **Docker** - Container management
9. **Playwright** - Browser automation
10. **Filesystem** - File operations
11. **Sequential Thinking** - Enhanced reasoning
12. **Memory** - Knowledge graph

## 📖 Project Guidelines

See [CLAUDE.md](../CLAUDE.md) in project root for WAVE-specific development guidelines.
