# /keys - Credential Validation

**Tier:** 2 (Workflow Command)
**Priority:** P1 (HIGH)
**Recommended Model:** Haiku
**Aliases:** /creds, /credentials, /apikeys

## Purpose

Quickly validate all API keys and credentials required for Wave V2 operations. Tests actual connectivity, not just presence.

## Usage

```bash
/keys                    # Check all credentials
/keys anthropic          # Check only Anthropic API key
/keys github             # Check only GitHub credentials
/keys supabase           # Check only Supabase credentials
/keys --quick            # Just show set/unset, no API calls
/keys --verbose          # Show detailed validation info
```

## Credentials Checked

### Required
| Key | Environment Variable | Validation Method |
|-----|---------------------|-------------------|
| Anthropic API | `ANTHROPIC_API_KEY` | Test API call to models endpoint |
| GitHub | `GITHUB_TOKEN` or `gh auth` | `gh auth status` |

### Optional (Project-Specific)
| Key | Environment Variable | Validation Method |
|-----|---------------------|-------------------|
| Supabase URL | `SUPABASE_URL` | HTTP ping |
| Supabase Anon | `SUPABASE_ANON_KEY` | Test query |
| Supabase Service | `SUPABASE_SERVICE_ROLE_KEY` | Auth check |
| LangSmith | `LANGSMITH_API_KEY` | API status |
| Slack Webhook | `SLACK_WEBHOOK_URL` | Test payload (dry-run) |
| OpenAI | `OPENAI_API_KEY` | Models endpoint |
| Vercel | `VERCEL_TOKEN` | `vercel whoami` |

## Validation Methods

### Anthropic API Key
```bash
# Test with minimal API call
curl -s -o /dev/null -w "%{http_code}" \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  https://api.anthropic.com/v1/models

# 200 = Valid, 401 = Invalid, other = Network issue
```

### GitHub Token
```bash
# Using GitHub CLI
gh auth status

# Or direct API
curl -s -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/user
```

### Supabase
```bash
# Test connection
curl -s -o /dev/null -w "%{http_code}" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  "$SUPABASE_URL/rest/v1/"
```

### LangSmith
```bash
curl -s -o /dev/null -w "%{http_code}" \
  -H "x-api-key: $LANGSMITH_API_KEY" \
  https://api.smith.langchain.com/api/v1/info
```

### Slack Webhook
```bash
# Dry-run validation (don't actually send)
# Check URL format and reachability
curl -s -o /dev/null -w "%{http_code}" \
  -X POST "$SLACK_WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d '{"text":"[WAVE] Credential validation test - ignore"}'
```

## Output Format

### All Valid
```
╔══════════════════════════════════════════════════════════════════════════════╗
║  CREDENTIAL VALIDATION                                             /keys     ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  REQUIRED                                                                    ║
║  ────────                                                                    ║
║  ANTHROPIC_API_KEY     ✓ Valid (claude-sonnet-4 accessible)                  ║
║                          sk-ant-api03-...xxxx (masked)                       ║
║                                                                              ║
║  GITHUB_TOKEN          ✓ Valid (user: elizager, scopes: repo,workflow)       ║
║                          Logged in via gh CLI                                ║
║                                                                              ║
║  OPTIONAL                                                                    ║
║  ────────                                                                    ║
║  SUPABASE_URL          ✓ Valid (https://xxx.supabase.co)                     ║
║  SUPABASE_ANON_KEY     ✓ Valid (connection OK)                               ║
║  LANGSMITH_API_KEY     ○ Not set (tracing disabled)                          ║
║  SLACK_WEBHOOK_URL     ✓ Valid (webhook reachable)                           ║
║  OPENAI_API_KEY        ○ Not set                                             ║
║  VERCEL_TOKEN          ○ Not set                                             ║
║                                                                              ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  RESULT: ✓ All required credentials valid                                    ║
║                                                                              ║
║  Required: 2/2 valid                                                         ║
║  Optional: 3/6 configured                                                    ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

### With Failures
```
╔══════════════════════════════════════════════════════════════════════════════╗
║  CREDENTIAL VALIDATION                                       /keys ✗ FAILED  ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  REQUIRED                                                                    ║
║  ────────                                                                    ║
║  ANTHROPIC_API_KEY     ✗ INVALID (401 Unauthorized)                          ║
║                          Key may be expired or revoked                       ║
║                          Get new key: https://console.anthropic.com          ║
║                                                                              ║
║  GITHUB_TOKEN          ✗ NOT SET                                             ║
║                          Run: gh auth login                                  ║
║                          Or: export GITHUB_TOKEN=ghp_...                     ║
║                                                                              ║
║  OPTIONAL                                                                    ║
║  ────────                                                                    ║
║  SUPABASE_URL          ✓ Valid                                               ║
║  SUPABASE_ANON_KEY     ✗ INVALID (connection refused)                        ║
║                          Check Supabase project status                       ║
║                                                                              ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  RESULT: ✗ 2 required credentials invalid                                    ║
║                                                                              ║
║  REQUIRED ACTIONS:                                                           ║
║  1. Get new Anthropic key: https://console.anthropic.com/settings/keys      ║
║  2. Run: gh auth login                                                       ║
║                                                                              ║
║  Wave V2 operations will FAIL without valid credentials.                     ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

### Quick Mode (--quick)
```
╔══════════════════════════════════════════════════════════════════════════════╗
║  CREDENTIAL CHECK (quick)                                          /keys     ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  ANTHROPIC_API_KEY     ✓ Set (sk-ant-...xxxx)                                ║
║  GITHUB_TOKEN          ✓ Set (via gh CLI)                                    ║
║  SUPABASE_URL          ✓ Set                                                 ║
║  SUPABASE_ANON_KEY     ✓ Set                                                 ║
║  LANGSMITH_API_KEY     ○ Not set                                             ║
║  SLACK_WEBHOOK_URL     ✓ Set                                                 ║
║                                                                              ║
║  Note: Use /keys (without --quick) to validate credentials work              ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

## Single Credential Check

```bash
/keys anthropic
```

```
╔══════════════════════════════════════════════════════════════════════════════╗
║  ANTHROPIC API KEY                                                 /keys     ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  Status:      ✓ Valid                                                        ║
║  Key:         sk-ant-api03-...xxxx (masked)                                  ║
║  Models:      claude-opus-4, claude-sonnet-4, claude-haiku-4                 ║
║  Rate Limit:  4000 req/min (tier 4)                                          ║
║  Usage:       $127.45 this month                                             ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

## Integration

### With /go (Session Start)
```
/go runs /keys --quick automatically
If required credentials missing → blocks with instructions
```

### With /docker ready
```
/docker ready includes credential check for container env vars
```

## Environment File Detection

Also checks for credentials in:
```
.env
.env.local
.env.development
~/.bashrc
~/.zshrc
```

Reports if key is set in file but not exported.

## Security Notes

- Keys are always masked in output (show first 8 + last 4 chars)
- No keys are logged or stored
- API calls use minimal permissions
- Slack test messages are clearly marked as tests

## Signal File

Creates on validation:
```json
// .claude/signals/keys-check-{timestamp}.json
{
  "command": "/keys",
  "timestamp": "2026-02-01T10:00:00Z",
  "result": "PASS",
  "required": {
    "ANTHROPIC_API_KEY": "valid",
    "GITHUB_TOKEN": "valid"
  },
  "optional": {
    "SUPABASE_URL": "valid",
    "SUPABASE_ANON_KEY": "valid",
    "LANGSMITH_API_KEY": "not_set",
    "SLACK_WEBHOOK_URL": "valid"
  }
}
```

## Troubleshooting

### Anthropic Key Invalid
```
1. Check key at: https://console.anthropic.com/settings/keys
2. Ensure key starts with: sk-ant-
3. Check if key is expired
4. Verify billing is active
```

### GitHub Token Issues
```
1. Run: gh auth status
2. If not logged in: gh auth login
3. For CI: export GITHUB_TOKEN=ghp_...
4. Check token scopes include: repo, workflow
```

### Supabase Connection Failed
```
1. Check project status at: https://supabase.com/dashboard
2. Verify URL format: https://<project-id>.supabase.co
3. Check if project is paused (free tier)
4. Regenerate keys if needed
```
