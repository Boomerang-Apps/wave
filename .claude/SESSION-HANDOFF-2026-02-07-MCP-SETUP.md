# Session Handoff: MCP Server Setup

**Date:** 2026-02-07
**Previous Session:** Claude Opus 4.5
**Next Session:** Claude Opus 4.6

---

## Summary

Setting up all 12 MCP servers for WAVE using Doppler for secrets management.

---

## Completed Tasks

- [x] Set up Doppler project (WAVE)
- [x] Added existing secrets to Doppler (GitHub, Supabase, Vercel, Postgres)
- [x] Created Notion integration and added `NOTION_AUTH_HEADER`
- [x] Created Slack Bot and added `SLACK_BOT_TOKEN`
- [x] Created Sentry token and added `SENTRY_AUTH_TOKEN` + `SENTRY_ORG`
- [x] Configured Claude to use Doppler (alias in ~/.zshrc)

---

## In Progress

### Add MCP Servers to Claude

User needs to run these commands to add the remaining MCP servers:

```bash
claude mcp add notion -- npx -y @notionhq/notion-mcp-server
claude mcp add slack -- npx -y @modelcontextprotocol/server-slack
claude mcp add postgres -- npx -y @modelcontextprotocol/server-postgres
claude mcp add sentry -- npx -y @modelcontextprotocol/server-sentry
claude mcp add supabase -- npx -y @supabase/mcp-server-supabase
claude mcp add docker -- npx -y @modelcontextprotocol/server-docker
```

---

## Doppler Secrets (All Set)

| Secret Name | Status | MCP Server |
|-------------|--------|------------|
| `ANTHROPIC_API_KEY` | ✅ | - |
| `GITHUB_PERSONAL_ACCESS_TOKEN` | ✅ | github |
| `SUPABASE_URL` | ✅ | supabase |
| `SUPABASE_SERVICE_KEY` | ✅ | supabase |
| `SUPABASE_ANON_KEY` | ✅ | - |
| `VERCEL_TOKEN` | ✅ | vercel |
| `POSTGRES_CONNECTION_STRING` | ✅ | postgres |
| `SLACK_TEAM_ID` | ✅ | slack |
| `SLACK_BOT_TOKEN` | ✅ | slack |
| `SLACK_WEBHOOK_URL` | ✅ | - |
| `NOTION_AUTH_HEADER` | ✅ | notion |
| `SENTRY_AUTH_TOKEN` | ✅ | sentry |
| `SENTRY_ORG` | ✅ | sentry (boomerang-applications-ltd) |
| `LANGSMITH_API_KEY` | ✅ | - |
| `LANGSMITH_WORKSPACE_ID` | ✅ | - |

---

## MCP Servers Status

### Already Connected (6)
1. github
2. filesystem
3. memory
4. playwright
5. sequential-thinking
6. vercel

### Need to Add (6)
1. notion
2. slack
3. postgres
4. sentry
5. supabase
6. docker

---

## Configuration

### Doppler Alias (Added to ~/.zshrc)
```bash
alias claude="doppler run -- claude"
```

### MCP Config Location
- Reference: `/Volumes/SSD-01/Projects/WAVE/docs/mcp.json`
- Setup script: `/Volumes/SSD-01/Projects/WAVE/scripts/setup-mcp.sh`

---

## Next Steps for New Session

1. Run the 6 `claude mcp add` commands listed above
2. Restart Claude with Doppler: `doppler run -- claude`
3. Verify all 12 MCP servers are connected
4. Test each MCP connection

---

## Key Files

- `/Volumes/SSD-01/Projects/WAVE/.env` - Local env (reference only, use Doppler)
- `/Volumes/SSD-01/Projects/WAVE/docs/mcp.json` - MCP server definitions
- `/Volumes/SSD-01/Projects/WAVE/scripts/setup-mcp.sh` - Setup automation script

---

## Notes

- User prefers Doppler for secrets management
- SENTRY_ORG slug: `boomerang-applications-ltd`
- Notion token format: `ntn_xxx` (new format, not `secret_xxx`)
- Slack app name: "Wave" in boomerang-apps workspace
