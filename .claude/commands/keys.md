# /keys - Credential Validation & Setup

**Tier:** 2 (Workflow Command)
**Priority:** P1 (HIGH)
**Recommended Model:** Haiku
**Aliases:** /creds, /credentials, /apikeys

## Purpose

Comprehensive credential management: audit what's needed, validate connectivity, and guide setup of missing keys.

## Usage

```bash
# Three modes
/keys                    # Default: audit mode (compare .env.example vs actual)
/keys audit              # Explicitly run audit
/keys validate           # Test actual API connectivity
/keys setup              # Interactive guide for missing keys

# Scope options
/keys audit airview      # Audit specific project
/keys validate anthropic # Validate specific service
/keys setup supabase     # Setup guide for specific service

# Quick options
/keys --quick            # Just show set/unset, no API calls
/keys --verbose          # Show detailed validation info
```

---

## Mode 1: `/keys audit` (Default)

Compares `.env.example` with actual environment to find gaps.

### What It Does
1. Reads `.env.example` from project root
2. Checks each key against `.env`, `.env.local`, and shell environment
3. Reports missing, set, and optional keys

### Output
```
╔══════════════════════════════════════════════════════════════════════════════╗
║  CREDENTIAL AUDIT                                               /keys audit  ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  PROJECT: AirView                                                            ║
║  SOURCE:  .env.example                                                       ║
║  TARGET:  .env.local                                                         ║
║                                                                              ║
║  REQUIRED                                                                    ║
║  ────────                                                                    ║
║  NEXT_PUBLIC_SUPABASE_URL      ✓ Set                                         ║
║  NEXT_PUBLIC_SUPABASE_ANON_KEY ✓ Set                                         ║
║  SUPABASE_SERVICE_ROLE_KEY     ✗ MISSING                                     ║
║  PAYPLUS_API_KEY               ✗ MISSING                                     ║
║  PAYPLUS_SECRET_KEY            ✗ MISSING                                     ║
║  PAYPLUS_TERMINAL_ID           ✗ MISSING                                     ║
║                                                                              ║
║  OPTIONAL                                                                    ║
║  ────────                                                                    ║
║  RESEND_API_KEY                ○ Not set (optional)                          ║
║                                                                              ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  RESULT: 4 required keys missing                                             ║
║                                                                              ║
║  Next steps:                                                                 ║
║  → /keys setup           Guide for missing keys                              ║
║  → /keys validate        Test configured keys work                           ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

---

## Mode 2: `/keys validate`

Tests actual API connectivity for all configured credentials.

### What It Does
1. For each set credential, makes a test API call
2. Reports valid, invalid, or network errors
3. Shows masked key values for reference

### Output
```
╔══════════════════════════════════════════════════════════════════════════════╗
║  CREDENTIAL VALIDATION                                       /keys validate  ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  AI / LLM                                                                    ║
║  ────────                                                                    ║
║  ANTHROPIC_API_KEY     ✓ Valid (claude-sonnet-4 accessible)                  ║
║                          sk-ant-api03-...xxxx (masked)                       ║
║                                                                              ║
║  DEVOPS                                                                      ║
║  ──────                                                                      ║
║  GITHUB_TOKEN          ✓ Valid (user: elizager, scopes: repo,workflow)       ║
║                          Logged in via gh CLI                                ║
║                                                                              ║
║  DATABASE                                                                    ║
║  ────────                                                                    ║
║  SUPABASE_URL          ✓ Valid (https://xxx.supabase.co)                     ║
║  SUPABASE_ANON_KEY     ✓ Valid (connection OK)                               ║
║  SUPABASE_SERVICE_KEY  ○ Not set                                             ║
║                                                                              ║
║  PAYMENTS                                                                    ║
║  ────────                                                                    ║
║  PAYPLUS_API_KEY       ✗ INVALID (401 Unauthorized)                          ║
║                          Key may be expired                                  ║
║                                                                              ║
║  NOTIFICATIONS                                                               ║
║  ─────────────                                                               ║
║  SLACK_WEBHOOK_URL     ✓ Valid (webhook reachable)                           ║
║  RESEND_API_KEY        ○ Not set (optional)                                  ║
║                                                                              ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  RESULT: 1 key invalid, 2 not set                                            ║
║                                                                              ║
║  Run /keys setup payplus to fix invalid key                                  ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

---

## Mode 3: `/keys setup`

Interactive guide with step-by-step instructions and URLs for each missing key.

### Output
```
╔══════════════════════════════════════════════════════════════════════════════╗
║  CREDENTIAL SETUP GUIDE                                        /keys setup   ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  1. SUPABASE_SERVICE_ROLE_KEY                                                ║
║  ────────────────────────────────────────────────────────────────────────    ║
║  Purpose:  Server-side database access with admin privileges                 ║
║  Required: Yes (for API routes)                                              ║
║                                                                              ║
║  Steps:                                                                      ║
║  1. Go to: https://supabase.com/dashboard/project/_/settings/api             ║
║  2. Scroll to "Service role key" section                                     ║
║  3. Click "Reveal" and copy the key (starts with eyJhbG...)                  ║
║  4. Add to .env.local:                                                       ║
║                                                                              ║
║     SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...        ║
║                                                                              ║
║  Security: Never expose in client-side code or commit to git                 ║
║                                                                              ║
║  ────────────────────────────────────────────────────────────────────────    ║
║                                                                              ║
║  2. PAYPLUS_API_KEY                                                          ║
║  ────────────────────────────────────────────────────────────────────────    ║
║  Purpose:  Israeli payment gateway integration                               ║
║  Required: Yes (for payments)                                                ║
║                                                                              ║
║  Steps:                                                                      ║
║  1. Go to: https://www.payplus.co.il/merchant                                ║
║  2. Login to merchant dashboard                                              ║
║  3. Navigate: Settings → API Integration → API Keys                          ║
║  4. Copy the API Key                                                         ║
║  5. Add to .env.local:                                                       ║
║                                                                              ║
║     PAYPLUS_API_KEY=your-api-key-here                                        ║
║                                                                              ║
║  Also needed: PAYPLUS_SECRET_KEY, PAYPLUS_TERMINAL_ID                        ║
║                                                                              ║
║  ────────────────────────────────────────────────────────────────────────    ║
║                                                                              ║
║  After adding keys, run:                                                     ║
║  → /keys validate    Verify keys work                                        ║
║  → /keys audit       Confirm no gaps remain                                  ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

---

## Full Credential Registry

### AI / LLM Services
| Key | Variable | Get From | Validation |
|-----|----------|----------|------------|
| Anthropic | `ANTHROPIC_API_KEY` | [console.anthropic.com](https://console.anthropic.com/settings/keys) | API call to /v1/models |
| OpenAI | `OPENAI_API_KEY` | [platform.openai.com](https://platform.openai.com/api-keys) | API call to /v1/models |
| LangSmith | `LANGSMITH_API_KEY` | [smith.langchain.com](https://smith.langchain.com/settings) | API status check |

### Database
| Key | Variable | Get From | Validation |
|-----|----------|----------|------------|
| Supabase URL | `NEXT_PUBLIC_SUPABASE_URL` | [supabase.com/dashboard](https://supabase.com/dashboard/project/_/settings/api) | HTTP ping |
| Supabase Anon | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | [supabase.com/dashboard](https://supabase.com/dashboard/project/_/settings/api) | REST query |
| Supabase Service | `SUPABASE_SERVICE_ROLE_KEY` | [supabase.com/dashboard](https://supabase.com/dashboard/project/_/settings/api) | Auth check |

### Payments
| Key | Variable | Get From | Validation |
|-----|----------|----------|------------|
| PayPlus API | `PAYPLUS_API_KEY` | [payplus.co.il/merchant](https://www.payplus.co.il/merchant) | API status |
| PayPlus Secret | `PAYPLUS_SECRET_KEY` | [payplus.co.il/merchant](https://www.payplus.co.il/merchant) | Signature test |
| PayPlus Terminal | `PAYPLUS_TERMINAL_ID` | [payplus.co.il/merchant](https://www.payplus.co.il/merchant) | Format check |

### DevOps
| Key | Variable | Get From | Validation |
|-----|----------|----------|------------|
| GitHub | `GITHUB_TOKEN` | `gh auth login` or [github.com/settings/tokens](https://github.com/settings/tokens) | API user check |
| Vercel | `VERCEL_TOKEN` | [vercel.com/account/tokens](https://vercel.com/account/tokens) | `vercel whoami` |

### Notifications
| Key | Variable | Get From | Validation |
|-----|----------|----------|------------|
| Slack Webhook | `SLACK_WEBHOOK_URL` | [api.slack.com/apps](https://api.slack.com/apps) → Incoming Webhooks | POST test |
| Resend | `RESEND_API_KEY` | [resend.com/api-keys](https://resend.com/api-keys) | API status |

### Observability
| Key | Variable | Get From | Validation |
|-----|----------|----------|------------|
| Sentry DSN | `SENTRY_DSN` | [sentry.io](https://sentry.io) → Project Settings → DSN | Format check |

---

## Validation Methods

### Anthropic API Key
```bash
curl -s -o /dev/null -w "%{http_code}" \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  https://api.anthropic.com/v1/models
# 200 = Valid, 401 = Invalid
```

### GitHub Token
```bash
gh auth status
# Or direct API:
curl -s -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/user
```

### Supabase
```bash
curl -s -o /dev/null -w "%{http_code}" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  "$SUPABASE_URL/rest/v1/"
```

### PayPlus
```bash
curl -s -o /dev/null -w "%{http_code}" \
  -H "Authorization: Bearer $PAYPLUS_API_KEY" \
  https://api.payplus.co.il/api/v1.0/status
```

### Slack Webhook
```bash
curl -s -o /dev/null -w "%{http_code}" \
  -X POST "$SLACK_WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d '{"text":"[WAVE] Credential validation test"}'
```

---

## Environment File Detection

Checks credentials in order of precedence:
```
1. Shell environment (export)
2. .env.local
3. .env
4. .env.development
5. .env.example (reference only)
```

Reports if key exists in file but not exported to shell.

---

## Integration

### With /go (Session Start)
```
/go → runs /keys audit automatically
If required credentials missing → shows setup instructions
```

### With /preflight
```
/preflight → includes /keys validate for GO/NO-GO
```

### With /docker ready
```
/docker ready → validates container has required env vars
```

---

## Quick Mode (--quick)

```bash
/keys --quick
```

```
╔══════════════════════════════════════════════════════════════════════════════╗
║  CREDENTIAL CHECK (quick)                                          /keys     ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  ANTHROPIC_API_KEY     ✓ Set                                                 ║
║  GITHUB_TOKEN          ✓ Set (via gh CLI)                                    ║
║  SUPABASE_URL          ✓ Set                                                 ║
║  SUPABASE_ANON_KEY     ✓ Set                                                 ║
║  SUPABASE_SERVICE_KEY  ✗ Missing                                             ║
║  PAYPLUS_API_KEY       ✗ Missing                                             ║
║  SLACK_WEBHOOK_URL     ✓ Set                                                 ║
║                                                                              ║
║  2 missing → Run /keys setup                                                 ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

---

## Signal File

Creates on each run:
```json
// .claude/signals/keys-{mode}-{timestamp}.json
{
  "command": "/keys audit",
  "timestamp": "2026-02-01T10:00:00Z",
  "project": "AirView",
  "result": "GAPS_FOUND",
  "summary": {
    "total": 10,
    "set": 6,
    "missing": 3,
    "optional_missing": 1
  },
  "missing": [
    "SUPABASE_SERVICE_ROLE_KEY",
    "PAYPLUS_API_KEY",
    "PAYPLUS_SECRET_KEY"
  ],
  "valid": [
    "ANTHROPIC_API_KEY",
    "GITHUB_TOKEN",
    "SUPABASE_URL",
    "SUPABASE_ANON_KEY"
  ]
}
```

---

## Security Notes

- Keys are always masked in output (first 8 + last 4 chars)
- No keys are logged or stored permanently
- API calls use minimal permissions (read-only where possible)
- Slack test messages are clearly marked as tests
- Service keys never shown in full

---

## Troubleshooting

### Key in .env but not working
```bash
# Check if exported to shell
echo $YOUR_KEY_NAME

# If empty, source the file:
source .env.local
# Or restart terminal
```

### Anthropic Key Invalid
```
1. Check key at: https://console.anthropic.com/settings/keys
2. Ensure key starts with: sk-ant-
3. Check if key is expired (keys can expire)
4. Verify billing is active and not past due
```

### Supabase Connection Failed
```
1. Check project status: https://supabase.com/dashboard
2. Free tier projects pause after 7 days inactivity
3. Verify URL format: https://<project-id>.supabase.co
4. Check if IP restrictions are enabled
```

### PayPlus Authentication Failed
```
1. Login to merchant portal: https://www.payplus.co.il/merchant
2. Check if in test mode vs production
3. Verify terminal ID matches the API key
4. Contact PayPlus support if keys were recently rotated
```
