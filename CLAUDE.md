# CLAUDE.md - AirView Marketplace

## 🛡️ WORKFLOW V4.3 + WAVE V2 ACTIVE

### ✅ DO WITHOUT ASKING
- Create/edit files in your owned paths
- Run pnpm install, test, lint, build
- Git add, commit, push to feature branches
- Create TypeScript contracts
- Run story linter

### ⛔ ASK FIRST
- Modify files outside ownership paths
- Merge to main or develop
- Delete migrations or seed data
- Unclear requirements

### 🚫 NEVER DO
- Push directly to main
- Skip workflow gates
- Self-approve for QA/PM review
- Commit .env files or secrets
- Modify other agents' domains

## 📂 DOMAIN OWNERSHIP

| Domain | Agent | Paths |
|--------|-------|-------|
| Auth | BE-Dev | src/features/auth/**, supabase/functions/auth-** |
| Profiles | BE-Dev | src/features/profiles/**, supabase/functions/profile-** |
| Projects | BE-Dev | src/features/projects/**, supabase/functions/project-** |
| Proposals | BE-Dev | src/features/proposals/**, supabase/functions/proposal-** |
| Payments | BE-Dev | src/features/payments/**, supabase/functions/payment-** |
| Messaging | BE-Dev | src/features/messaging/**, supabase/functions/message-** |
| UI Shell | FE-Dev | src/components/**, src/app/** |
| Contracts | CTO | contracts/** |
| Stories | PM | stories/** |

## 🔄 SIGNAL FILES
Location: `.claude/`
Pattern: `signal-{wave}-{gate}-{status}.json`

## 📦 TECH STACK

| Layer | Technology | Notes |
|-------|------------|-------|
| Frontend | Next.js 14 App Router | TypeScript strict mode |
| Styling | Tailwind CSS | Mobile-first, RTL support |
| Backend | Supabase | PostgreSQL + PostGIS + Edge Functions |
| Auth | Supabase GoTrue | Email/password + OTP |
| Payments | PayPlus | Israeli payment processor |
| Hosting | Vercel | Auto-deploy from main |
| Language | Hebrew (RTL) | Primary, English secondary |

## 📐 CODE STYLE

### TypeScript
- Strict mode enabled
- Explicit return types on exported functions
- Use interfaces over types where possible
- Prefer const assertions

### React/Next.js
- Server Components by default
- Client Components only when needed (interactivity, hooks)
- Use App Router conventions
- Colocate components with features

### Naming Conventions
- Components: PascalCase (LoginForm.tsx)
- Hooks: camelCase with 'use' prefix (useAuth.ts)
- Utils: camelCase (formatCurrency.ts)
- Types: PascalCase with 'I' prefix for interfaces (IUser)
- Constants: SCREAMING_SNAKE_CASE

### File Organization
```
src/
├── app/                    # Next.js App Router
├── components/             # Shared UI components
│   ├── ui/                # Base UI primitives
│   └── layout/            # Layout components
├── features/              # Feature modules
│   └── {feature}/
│       ├── components/    # Feature-specific components
│       ├── hooks/         # Feature-specific hooks
│       ├── lib/           # Feature utilities
│       └── types/         # Feature types
├── lib/                   # Shared utilities
└── types/                 # Global types
```

## 🌍 INTERNATIONALIZATION

- Primary language: Hebrew (RTL)
- Secondary: English
- All UI strings in translation files
- Use dir="rtl" on root HTML element
- Tailwind RTL utilities (start/end vs left/right)

## 🔒 SECURITY REQUIREMENTS

### Authentication
- Email/password with strong password policy
- Email verification required
- Rate limiting on auth endpoints
- Session expiry: 7 days (configurable)

### Authorization
- Row Level Security (RLS) on all Supabase tables
- Role-based access control (client/pilot/admin)
- Never trust client-side role claims

### Data Protection
- No PII in logs
- Encrypt sensitive data at rest
- HTTPS only
- CSRF protection on forms

## 🧪 TESTING REQUIREMENTS

- Unit tests for utilities and hooks
- Integration tests for API endpoints
- E2E tests for critical flows (auth, payment)
- Minimum coverage: 70%

## 📋 ACCEPTANCE CRITERIA FORMAT

All stories use EARS (Easy Approach to Requirements Syntax):

```
WHEN {trigger} THEN {behavior} [threshold: {metric}]
```

Examples:
- WHEN user submits valid login form THEN redirect to dashboard [latency: <500ms]
- WHEN pilot uploads license THEN status changes to 'pending' [storage: <10MB]

## 🚦 WORKFLOW GATES

| Gate | Owner | Description |
|------|-------|-------------|
| Gate 0 | CTO | Pre-wave approval |
| Gate 1 | Agent | Self-review |
| Gate 2 | Agent | Build passes |
| Gate 3 | Agent | Tests pass |
| Gate 4 | QA | Acceptance testing |
| Gate 5 | PM | Requirements met |
| Gate 6 | CTO | Architecture review |
| Gate 7 | CTO | Merge approval |

## 🚀 WAVE V2 SDK INFRASTRUCTURE

### Installed SDKs
| SDK | Purpose |
|-----|---------|
| `@anthropic-ai/claude-agent-sdk` | Multi-agent orchestration |
| `zod` v4 | Runtime schema validation |
| `@opentelemetry/*` | Observability & tracing |
| `@playwright/test` | E2E testing |
| `@orpc/server` | Agent-to-agent RPC |

### Slash Commands Available
Run `/commands` to see full list. Key commands:
- `/gate-0` through `/gate-7` - Execute specific gates
- `/execute-story <id>` - Full story execution
- `/wave-status` - Wave progress dashboard
- `/protocol-verify` - Compliance audit
- `/tdd` - TDD cycle guidance
- `/research` - Research validation
- `/branch` - Create feature branch

### Hooks (Auto-triggered)
Location: `.claude/hooks/`
- `check-gates.sh` - Blocks push without Gate 7
- `validate-branch-name.sh` - Enforces `feature/EPIC-TYPE-NNN`
- `check-tdd.sh` - Warns if tests missing
- `validate-story.sh` - Schema validation on save
- `update-signals.sh` - Creates signal files

### Agent SDK Usage
```bash
# Execute story through gates
pnpm wave:execute AUTH-STORY-001
pnpm wave:execute AUTH-STORY-001 --start-gate gate2
```

### E2E Testing
```bash
pnpm playwright:install  # First time
pnpm test:e2e            # Run tests
pnpm test:e2e:ui         # Interactive mode
```

### MCP Integrations
| MCP | Status | Use For |
|-----|--------|---------|
| GitHub | ✅ | PR, issues, repo ops |
| Notion | ✅ | Workspace docs |
| Slack | ✅ | Notifications |
| Memory | ✅ | Knowledge graph |

### Key Directories
```
.claude/
├── agents/      # Claude Agent SDK config
├── telemetry/   # OpenTelemetry setup
├── rpc/         # oRPC procedures
├── hooks/       # Git/tool hooks
├── commands/    # Slash commands
├── signals/     # Runtime signals
└── settings.json
```

### Environment Required
```bash
export ANTHROPIC_API_KEY=your-key  # For agent execution
```

### Documentation
- `.claude/SDK-README.md` - Full SDK documentation
- `.claude/SESSION-HANDOFF-2026-01-31.md` - Latest session context
