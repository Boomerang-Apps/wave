# Wave V2 SDK Infrastructure

Production-grade SDK integration for the Wave V2 Aerospace Safety Protocol.

## Overview

This directory contains the SDK infrastructure that powers automated story execution, observability, testing, and agent coordination for the Wave V2 framework.

## Installed SDKs

| SDK | Version | Purpose |
|-----|---------|---------|
| `@anthropic-ai/claude-agent-sdk` | 0.2.27 | Multi-agent orchestration |
| `zod` | 4.3.6 | Runtime schema validation |
| `@opentelemetry/*` | 1.9.0+ | Observability & distributed tracing |
| `@playwright/test` | 1.58.1 | End-to-end testing |
| `@orpc/server` | 1.13.4 | Type-safe agent RPC |

## Directory Structure

```
.claude/
├── agents/                     # Claude Agent SDK
│   ├── wave-v2-config.ts       # Schemas, subagent definitions
│   ├── story-executor.ts       # Gate 0-7 execution pipeline
│   ├── index.ts                # Main exports
│   └── examples/               # Usage examples
│       ├── run-story.ts
│       └── parallel-agents.ts
│
├── telemetry/                  # OpenTelemetry
│   ├── wave-v2-telemetry.ts    # Tracing configuration
│   └── index.ts
│
├── rpc/                        # oRPC
│   ├── wave-v2-router.ts       # Agent communication procedures
│   └── index.ts
│
├── hooks/                      # Git/Tool hooks
├── commands/                   # Slash commands
├── signals/                    # Runtime signal files
└── settings.json               # Hook configuration
```

## Quick Start

### 1. Set Environment Variables

```bash
export ANTHROPIC_API_KEY=your-api-key
```

### 2. Execute a Story

```bash
# Full execution (Gate 0-7)
pnpm wave:execute AUTH-STORY-001

# Start from specific gate
pnpm wave:execute AUTH-STORY-001 --start-gate gate2

# Stop at specific gate
pnpm wave:execute AUTH-STORY-001 --stop-gate gate4

# Skip gates
pnpm wave:execute AUTH-STORY-001 --skip gate5,gate6
```

### 3. Run E2E Tests

```bash
# Install browsers (first time only)
pnpm playwright:install

# Run tests
pnpm test:e2e

# Interactive UI mode
pnpm test:e2e:ui

# View report
pnpm test:e2e:report
```

## Agent SDK

### Subagents

| Agent | Description | Tools |
|-------|-------------|-------|
| `be-dev` | Backend Development | Read, Write, Edit, Bash, Glob, Grep |
| `fe-dev` | Frontend Development | Read, Write, Edit, Bash, Glob, Grep |
| `qa-agent` | Quality Assurance | Read, Bash, Glob, Grep |
| `devops-agent` | DevOps/CI-CD | Read, Bash, Glob, Grep |
| `research-agent` | Research Validation | Read, Write, Edit, Bash, Glob, Grep, WebFetch |

### Usage in Code

```typescript
import { query } from "@anthropic-ai/claude-agent-sdk";
import { createWaveV2Options, waveV2Agents } from "./.claude/agents";

// Execute with BE-Dev agent
const options = createWaveV2Options("AUTH-STORY-001", "be-dev");

for await (const message of query({
  prompt: "Implement the login API endpoint",
  options
})) {
  console.log(message);
}
```

### Parallel Agent Execution

```typescript
// Run BE-Dev and FE-Dev in parallel
const [beResult, feResult] = await Promise.all([
  runAgent("AUTH-STORY-001", "be-dev", "Implement API"),
  runAgent("AUTH-STORY-001", "fe-dev", "Implement UI")
]);
```

## Telemetry

### Initialize

```typescript
import { initTelemetry } from "./.claude/telemetry";

initTelemetry({
  serviceName: "airview-marketplace",
  environment: "production",
  otlpEndpoint: "http://localhost:4318/v1/traces"
});
```

### Trace Story Execution

```typescript
import {
  startStorySpan,
  startGateSpan,
  recordGateSuccess,
  recordGateFailure
} from "./.claude/telemetry";

const storySpan = startStorySpan({
  storyId: "AUTH-STORY-001",
  wave: 1,
  dalLevel: "C"
});

const gateSpan = startGateSpan(storySpan, {
  storyId: "AUTH-STORY-001",
  gate: "gate2",
  gateDescription: "Build Verification",
  wave: 1,
  dalLevel: "C"
});

// On success
recordGateSuccess(gateSpan, { buildTime: 45000 });

// On failure
recordGateFailure(gateSpan, new Error("Build failed"));
```

## RPC Procedures

### Story Management

```typescript
import { waveV2Router } from "./.claude/rpc";

// Get story status
const status = await waveV2Router.story.getStatus({ storyId: "AUTH-STORY-001" });

// List wave stories
const stories = await waveV2Router.story.listByWave({ wave: 1 });

// Update status
await waveV2Router.story.updateStatus({
  storyId: "AUTH-STORY-001",
  status: "in-progress",
  assignedAgent: "be-dev"
});
```

### Signal Management

```typescript
// Create gate signal
await waveV2Router.signal.createGateSignal({
  storyId: "AUTH-STORY-001",
  gate: "gate2",
  event: "passed",
  agent: "devops-agent"
});

// Check if gate passed
const { passed } = await waveV2Router.signal.checkGatePassed({
  storyId: "AUTH-STORY-001",
  gate: "gate2"
});
```

### Wave Progress

```typescript
const progress = await waveV2Router.wave.getProgress({ wave: 1 });
// { wave: 1, totalStories: 10, completed: 7, inProgress: 2, blocked: 1, completionPercentage: 70 }
```

## GitHub Actions

### CI/CD Pipeline (`wave-v2-ci.yml`)

Triggered on push/PR to main/develop:

1. **Gate 2 (Build)** - Lint, typecheck, build
2. **Gate 3 (Test)** - Unit tests with coverage
3. **E2E Tests** - Playwright (on PR or manual trigger)
4. **Security Scan** - Dependency audit

### Story Execution (`wave-story-execution.yml`)

Manual workflow dispatch:

```yaml
inputs:
  story_id: "AUTH-STORY-001"
  start_gate: "gate0"
  stop_gate: "gate7"
  agent_type: "be-dev"
```

Required secrets:
- `ANTHROPIC_API_KEY`
- `SLACK_WEBHOOK` (optional)

## E2E Testing

### Page Objects

```typescript
import { test, AuthPage, DashboardPage } from "./fixtures/wave-v2-fixtures";

test("login flow", async ({ page }) => {
  const authPage = new AuthPage(page);
  await page.goto("/login");
  await authPage.login("user@example.com", "password");
  await authPage.expectLoginSuccess();
});
```

### EARS Verification

```typescript
import { verifyEARSCriteria } from "./fixtures/wave-v2-fixtures";

const result = await verifyEARSCriteria(
  page,
  {
    type: "event-driven",
    trigger: "user submits login form",
    behavior: "user is redirected to dashboard"
  },
  async () => {
    await authPage.login(email, password);
    return page.url().includes("dashboard");
  }
);
```

## Schema Validation

### Story Schema (V4.1)

```typescript
import { StorySchemaV4_1, Story } from "./.claude/agents";

const result = StorySchemaV4_1.safeParse(storyData);
if (!result.success) {
  console.error(result.error.issues);
}

const story: Story = result.data;
```

### Required Fields

- `storyId` - Format: `EPIC-TYPE-NNN`
- `wave` - 1-6
- `dalLevel` - A, B, C, D, or E
- `researchValidation.validated` - Must be true for Gate 0
- `acceptanceCriteria[]` - EARS format

## Coverage Requirements by DAL

| DAL | Coverage | Description |
|-----|----------|-------------|
| A | 100% MC/DC | Catastrophic failure prevention |
| B | 100% Decision | Hazardous failure prevention |
| C | 100% Statement | Major failure prevention |
| D | 80%+ | Minor failure prevention |
| E | 60%+ | No safety effect |

## Troubleshooting

### Agent SDK not connecting

```bash
# Verify API key
echo $ANTHROPIC_API_KEY

# Check Claude Code is installed
claude --version
```

### Playwright browsers not installed

```bash
pnpm playwright:install
```

### OpenTelemetry not exporting

```bash
# Check endpoint is reachable
curl http://localhost:4318/v1/traces
```

---

*Wave V2 Aerospace Safety Protocol - SDK Infrastructure*
*Last updated: January 31, 2026*
