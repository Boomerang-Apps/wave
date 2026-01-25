# WAVE Portal - Comprehensive Codebase Report

**Generated:** 2026-01-25
**Version:** 1.0.0
**Purpose:** Full codebase analysis for external review

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Project Overview](#2-project-overview)
3. [Architecture](#3-architecture)
4. [Frontend Structure](#4-frontend-structure)
5. [Backend Structure](#5-backend-structure)
6. [Database Schema](#6-database-schema)
7. [API Endpoints](#7-api-endpoints)
8. [Key Features Implemented](#8-key-features-implemented)
9. [Recent Implementations](#9-recent-implementations)
10. [Configuration](#10-configuration)
11. [Testing](#11-testing)
12. [Dependencies](#12-dependencies)

---

## 1. Executive Summary

WAVE Portal is a **pre-launch validation system** for AI-driven software development. It provides:

- **10-Gate Launch Sequence**: Progressive validation from Design (Gate 0) to Launch (Gate 9)
- **Project Discovery**: Auto-detect project structure, documentation, and mockups
- **Validation Framework**: Safety, RLM, behavioral probes, and build QA checks
- **Agent Management**: Track AI agents performing development tasks
- **Real-time Monitoring**: Supabase subscriptions for live updates
- **Audit & Compliance**: Complete audit trail with safety tagging

**Tech Stack:**
- Frontend: React 19 + TypeScript + Vite + Tailwind CSS
- Backend: Node.js + Express.js
- Database: Supabase (PostgreSQL)
- Integrations: Slack, Anthropic API

---

## 2. Project Overview

### Directory Structure

```
/Volumes/SSD-01/Projects/WAVE/portal/
├── src/                          # Frontend (React/TypeScript)
│   ├── components/               # 21 UI components
│   ├── pages/                    # 9 page routes
│   ├── lib/                      # Utilities (utils.ts)
│   ├── types/                    # TypeScript definitions
│   ├── hooks/                    # Custom React hooks
│   ├── App.tsx                   # Main router
│   └── main.tsx                  # Entry point
├── server/                       # Backend (Node.js/Express)
│   ├── index.js                  # Main API server (7000+ lines)
│   ├── utils/                    # 77 utility modules
│   ├── middleware/               # Auth, validation, rate limiting
│   └── __tests__/                # 87 test files
├── supabase/                     # Database
│   └── migrations/               # 4 SQL migrations
├── docs/                         # Documentation
├── vite.config.ts                # Vite configuration
├── tailwind.config.js            # Tailwind configuration
└── package.json                  # Dependencies
```

### Gate System (Launch Sequence)

| Gate | Name | Purpose |
|------|------|---------|
| 0 | Design | Mockup validation, project structure |
| 1 | PRD & Stories | Documentation and story validation |
| 2 | Execution Plan | Wave planning and task breakdown |
| 3 | Configuration | Environment and config validation |
| 4 | Infrastructure | System infrastructure checks |
| 4.5 | Aerospace | Safety checkpoint |
| 5 | RLM Protocol | Retrieval limitation model validation |
| 6 | Notifications | Slack/notification setup |
| 7 | Build QA | Quality assurance checks |
| 8 | Launch | Final launch approval |

---

## 3. Architecture

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend                              │
│  React 19 + TypeScript + Vite + Tailwind CSS                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │   Pages     │  │ Components  │  │   Hooks     │         │
│  │ (9 routes)  │  │ (21 files)  │  │ (Supabase)  │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
└─────────────────────────┬───────────────────────────────────┘
                          │ HTTP/REST + SSE
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                        Backend                               │
│  Node.js + Express.js (Port 3000)                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │ API Routes  │  │ Middleware  │  │   Utils     │         │
│  │ (40+ APIs)  │  │ (Auth/Rate) │  │ (77 files)  │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
└─────────────────────────┬───────────────────────────────────┘
                          │ SQL + Realtime
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                       Database                               │
│  Supabase (PostgreSQL)                                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │  Projects   │  │   Stories   │  │ Audit Logs  │         │
│  │   Waves     │  │   Config    │  │   Agents    │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **User Action** → React Component → API Call
2. **API Call** → Express Router → Middleware (Auth/Validation)
3. **Business Logic** → Utils (77 modules) → Database Query
4. **Response** → JSON/SSE → Frontend State Update
5. **Real-time** → Supabase Subscription → Component Re-render

---

## 4. Frontend Structure

### Pages (src/pages/)

| Page | Route | Description |
|------|-------|-------------|
| Dashboard.tsx | `/` | Project overview, stats, quick actions |
| Projects.tsx | `/projects` | Project listing and management |
| NewProject.tsx | `/projects/new` | Create new project form |
| ProjectChecklist.tsx | `/projects/:id` | Project launch checklist |
| Waves.tsx | `/waves` | Wave management and tracking |
| Stories.tsx | `/stories` | Story listing and filtering |
| Activity.tsx | `/activity` | Audit log viewer |
| Architecture.tsx | `/architecture` | System documentation |
| Settings.tsx | `/settings` | Configuration panel |

### Core Components (src/components/)

#### Layout Components
- **Layout.tsx** - Main app shell with sidebar, header, status bar
- **TabLayout.tsx** - Standardized tab layout with 5 sections:
  - InfoBox - Step description (blue banner)
  - KPICards - Metrics display (4-column grid)
  - ActionBar - Title + CTA buttons
  - ResultSummary - Status after validation
  - ExpandableCard - Collapsible detail cards

#### Tab Components (Gate-specific)
- **MockupDesignTab.tsx** - Gate 0: Design validation
- **PRDStoriesTab.tsx** - Gate 1: PRD & Stories validation
- **ExecutionPlanTab.tsx** - Gate 2: Execution planning
- **GatedTab.tsx** - Generic gated tab wrapper

#### UI Primitives (Radix-based)
- button.tsx, card.tsx, input.tsx, label.tsx
- badge.tsx, alert.tsx, progress.tsx
- tabs.tsx, tooltip.tsx, dropdown-menu.tsx, separator.tsx

### State Management

- **Supabase Real-time**: Project, wave, story subscriptions
- **React useState/useEffect**: Local component state
- **Context**: ThemeProvider for dark/light mode

---

## 5. Backend Structure

### Server Entry Point (server/index.js)

**Size:** 7000+ lines
**Port:** 3000

Key sections:
1. Express app setup with middleware
2. 40+ API endpoint handlers
3. Slack integration (Web API + Webhook fallback)
4. Error handling and cleanup

### Middleware (server/middleware/)

| File | Purpose |
|------|---------|
| auth.js | JWT validation, session management |
| validation.js | Zod schema validation |
| rate-limit-enforcer.js | Token bucket rate limiting |
| schemas.js | All validation schemas |

### Utility Modules (server/utils/) - 77 Files

#### Project & Content
- project-discovery.js - Auto-discover project structure
- mockup-endpoint.js - Mockup validation endpoint
- mockup-analysis.js - Analyze HTML mockups
- mockup-detection.js - Detect mockup files
- prd-endpoint.js - PRD validation
- story-scanner.js - Scan for stories
- content-drift-detector.js - Detect content changes

#### Gate & Validation
- gate-decision-engine.js - Gate readiness logic
- gate-status-types.js - Gate status enums
- gate-dependencies.js - Gate prerequisites
- validation-persistence.js - Store validation results
- signal-validator.js - Validate agent signals

#### Agent Management
- agent-assignment.js - Assign work to agents
- manager-agent.js - Manager agent logic
- heartbeat-manager.js - Agent health monitoring
- retry-manager.js - Retry with backoff

#### Security
- prompt-injection-detector.js - Detect injection attacks
- security-middleware.js - OWASP headers
- prompt-encryptor.js - Encrypt sensitive data
- secret-redactor.js - Remove secrets from logs

#### Operational
- state-persistence.js - Persist app state
- snapshot-restore.js - State snapshots
- rate-limiter.js - Rate limiting
- error-handler.js - Centralized errors
- emergency-handler.js - Emergency shutdown

---

## 6. Database Schema

### Tables (Supabase PostgreSQL)

#### maf_analysis_reports
```sql
CREATE TABLE maf_analysis_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL,
  report_type TEXT NOT NULL,
  report_data JSONB NOT NULL,
  readiness_score INTEGER,
  total_gaps INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, report_type)
);
```

#### stories
```sql
CREATE TABLE stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id TEXT NOT NULL,
  project_id UUID NOT NULL,
  wave_number INTEGER,
  title TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  gate TEXT,
  agent_type TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(story_id, project_id)
);
```

#### wave_audit_log
```sql
CREATE TABLE wave_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID,
  event_type TEXT NOT NULL,
  event_category TEXT,
  severity TEXT DEFAULT 'info',
  actor_type TEXT,
  actor_id TEXT,
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id TEXT,
  wave_number INTEGER,
  gate_number TEXT,
  validation_mode TEXT,
  details JSONB,
  metadata JSONB,
  safety_tags TEXT[],
  requires_review BOOLEAN DEFAULT FALSE,
  reviewed_at TIMESTAMPTZ,
  reviewed_by TEXT,
  token_input INTEGER,
  token_output INTEGER,
  cost_usd DECIMAL(10,6),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### wave_agent_sessions
```sql
CREATE TABLE wave_agent_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL,
  agent_type TEXT NOT NULL,
  agent_model TEXT,
  status TEXT DEFAULT 'pending',
  current_task TEXT,
  current_gate TEXT,
  wave_number INTEGER,
  pid INTEGER,
  worktree_path TEXT,
  started_at TIMESTAMPTZ,
  stopped_at TIMESTAMPTZ,
  last_heartbeat TIMESTAMPTZ,
  token_usage JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 7. API Endpoints

### Analysis & Validation

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/analyze | Run full project analysis |
| POST | /api/analyze-stream | Streaming analysis with SSE |
| GET | /api/gap-analysis | Get gap analysis results |
| POST | /api/validate-safety | Safety validation |
| POST | /api/validate-rlm | RLM validation |
| POST | /api/validate-foundation | Foundation validation |
| POST | /api/validate-behavioral | Behavioral probes |
| POST | /api/validate-build-qa | Build QA validation |
| POST | /api/validate-all | Run all validations |
| GET | /api/validate-quick | Quick validation check |

### Project & Content

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/discover-project | Discover project structure |
| POST | /api/validate-mockups | Validate HTML mockups |
| GET | /api/serve-mockup | Serve mockup for preview |
| POST | /api/open-folder-picker | Native macOS folder picker |
| POST | /api/browse-folders | Browse directory structure |
| POST | /api/update-project-path | Update project root path |
| POST | /api/sync-stories | Sync stories to database |

### Agent Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/agents | List all agents |
| POST | /api/agents/:type/start | Start agent |
| POST | /api/agents/:type/stop | Stop agent |
| GET | /api/agents/:type/output | Get agent output |
| GET | /api/agents/activity | Agent activity log |

### Monitoring & Audit

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/health | Health check |
| GET | /api/audit-log | Retrieve audit logs |
| POST | /api/audit-log | Create audit entry |
| GET | /api/audit-log/export | Export audit logs |
| GET | /api/drift-report | Content drift report |

### Slack Integration

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/test-slack | Test Slack connection |
| POST | /api/slack-notify | Send notification |
| GET | /api/slack-events | Retrieve events |

---

## 8. Key Features Implemented

### 1. Project Discovery System
- Auto-detect project structure from folder path
- Find package.json for project name
- Discover documentation files (PRD, Architecture, User Stories, README)
- Detect design mockups (HTML files in design_mockups/)
- Identify tech stack (React, Next.js, TypeScript, etc.)
- Track folder connection status

### 2. Launch Sequence (10-Gate System)
- Visual progress indicator
- Gate dependencies and prerequisites
- Gate override with mandatory reason
- Gate status tracking (pending, in_progress, completed, failed)
- Override history audit trail

### 3. Validation Framework
- **Safety Validation**: Check for security issues
- **RLM Validation**: Retrieval limitation checks
- **Behavioral Probes**: Test agent behavior
- **Build QA**: Quality thresholds
- **Content Drift**: Detect unauthorized changes
- Multi-mode: strict, dev, ci

### 4. Real-time Updates
- Supabase subscriptions for live data
- Activity feed with instant updates
- Project/wave/story sync
- Status indicators

### 5. Slack Integration
- Web API (preferred) with threading
- Webhook fallback
- Channel-specific notifications
- Thread persistence in database

### 6. Audit & Compliance
- Complete audit trail
- Safety tagging on events
- Human review requests
- Cost tracking (token usage, USD)
- DORA metrics

---

## 9. Recent Implementations

### Design Tab (Gate 0) - MockupDesignTab.tsx

#### Features Implemented:

1. **Native macOS Folder Picker**
   - Server endpoint: `POST /api/open-folder-picker`
   - Uses AppleScript `choose folder` command
   - Opens native Finder dialog
   - Auto-connects after selection

2. **Project Discovery**
   - Endpoint: `POST /api/discover-project`
   - Returns: name, tagline, vision, documentation, mockups, techStack
   - Connection status (rootExists, mockupsFolderExists, docsFolderExists)

3. **Mockup Preview**
   - Endpoint: `GET /api/serve-mockup`
   - Serves HTML files via iframe
   - Modal preview with "Open in New Tab" option
   - Security: Only allows files from design_mockups/

4. **Consistent Tab Layout**
   - Uses standardized TabLayout components
   - InfoBox: "Step 0: Design Foundation"
   - KPICards: Documents, Mockups, Technologies, Status
   - ActionBar: Project name, path, Refresh/Change Folder CTAs
   - ExpandableCard: Documentation and Mockups sections

#### Component States:
- **not-connected**: Folder selection UI with native picker + manual input
- **discovering**: Loading spinner while scanning project
- **connected**: Full project info with docs/mockups

### Vite Proxy Configuration

```typescript
// vite.config.ts
export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
```

---

## 10. Configuration

### Environment Variables (.env)

```bash
# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key

# Validation Mode
VALIDATION_MODE=dev  # strict | dev | ci

# Slack Integration
SLACK_BOT_TOKEN=xoxb-your-token
SLACK_CHANNEL_UPDATES=#wave-updates
SLACK_CHANNEL_ALERTS=#wave-alerts
SLACK_CHANNEL_BUDGET=#wave-budget
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...

# Project
PROJECT_NAME=WAVE Portal
```

### Tailwind Configuration

```javascript
// tailwind.config.js
module.exports = {
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: 'hsl(var(--primary))' },
        secondary: { DEFAULT: 'hsl(var(--secondary))' },
        destructive: { DEFAULT: 'hsl(var(--destructive))' },
        muted: { DEFAULT: 'hsl(var(--muted))' },
        accent: { DEFAULT: 'hsl(var(--accent))' },
        card: { DEFAULT: 'hsl(var(--card))' },
        success: 'hsl(var(--success))',
        warning: 'hsl(var(--warning))',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
};
```

---

## 11. Testing

### Test Framework: Vitest

```bash
npm test          # Watch mode
npm run test:run  # Single run
npm run test:coverage  # With coverage
```

### Test Structure

```
server/__tests__/        # 87 test files
├── api/                 # API endpoint tests
├── utils/               # Utility module tests
└── integration/         # Integration tests

src/__tests__/           # Frontend tests
├── components/          # Component tests
└── pages/               # Page tests
```

### Coverage Requirements
- Minimum: 80% coverage
- Reports: v8 format

---

## 12. Dependencies

### Core Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| react | 19.2.0 | UI framework |
| react-router-dom | 7.12.0 | Routing |
| express | 4.21.0 | Backend framework |
| @supabase/supabase-js | 2.91.0 | Database client |
| tailwindcss | 3.4.0 | CSS framework |
| lucide-react | 0.562.0 | Icons |
| @slack/web-api | 7.13.0 | Slack integration |
| zod | - | Schema validation |
| ajv | 8.17.1 | JSON schema |

### Dev Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| vite | 7.2.4 | Build tool |
| typescript | 5.9.3 | Type checking |
| vitest | 4.0.18 | Testing |
| eslint | 9.39.1 | Linting |

---

## Summary

WAVE Portal is a comprehensive pre-launch validation system that:

1. **Manages Projects** through a 10-gate launch sequence
2. **Auto-discovers** project structure, docs, and mockups
3. **Validates** safety, behavior, and quality at each gate
4. **Tracks** AI agents performing development work
5. **Integrates** with Slack for notifications
6. **Audits** all actions with complete traceability

The system is built with modern technologies (React 19, TypeScript, Supabase) and follows best practices for security (rate limiting, input validation, OWASP compliance) and observability (audit logs, DORA metrics).

---

*Report generated for external review. For questions, refer to the codebase at `/Volumes/SSD-01/Projects/WAVE/portal`*
