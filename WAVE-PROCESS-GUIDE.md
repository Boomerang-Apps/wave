# WAVE Process Guide - From Vision to Production

**Version:** 2.0.0
**Purpose:** Step-by-step guide for running a project through WAVE
**Approach:** Prototype-First Development

---

## Process Overview

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                                                                  │
│                         WAVE: 9-STEP PROCESS                                     │
│                                                                                  │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐               │
│  │ STEP 1  │  │ STEP 2  │  │ STEP 3  │  │ STEP 4  │  │ STEP 5  │               │
│  │  GOAL   │→ │PROTOTYPE│→ │ APPROVE │→ │  PLAN   │→ │ CTO     │               │
│  │         │  │  FIRST  │  │PRD+STORY│  │  WAVES  │  │ REVIEW  │               │
│  │[HUMAN]  │  │[HUMAN+  │  │[HUMAN+  │  │[HUMAN+  │  │[CTO     │               │
│  │         │  │CLAUDE.AI]  │CLAUDE.AI]  │CLAUDE.AI]  │MASTER]  │               │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘  └─────────┘               │
│                                                                                  │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐                            │
│  │ STEP 6  │  │ STEP 7  │  │ STEP 8  │  │ STEP 9  │                            │
│  │ INFRA   │→ │ CONNECT │→ │PREFLIGHT│→ │ START   │→  AUTONOMOUS               │
│  │ SETUP   │  │ SYSTEMS │  │  CHECK  │  │         │   EXECUTION                │
│  │[HUMAN]  │  │[CTO     │  │[CTO     │  │[HUMAN]  │                            │
│  │         │  │MASTER]  │  │MASTER]  │  │         │                            │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘                            │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Two Claudes in the Process

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                                                                  │
│   CLAUDE.AI (Web Interface)          CTO MASTER (Claude Code CLI)              │
│   ─────────────────────────          ────────────────────────────              │
│                                                                                  │
│   Used in Steps 2, 3, 4              Used in Steps 5, 7, 8, 9+                 │
│                                                                                  │
│   • Creative brainstorming           • Technical validation                     │
│   • HTML prototype creation          • Plan review & adjustment                 │
│   • Writes AI PRD                    • System connection                        │
│   • Writes AI Stories                • Pre-flight checks                        │
│   • Builds execution plan            • Oversees autonomous execution            │
│                                      • Merge & deploy coordination              │
│                                                                                  │
│   PLANNING PHASE                     EXECUTION PHASE                            │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

# STEP 1: HUMAN SETS GOAL & VISION

## Who: Human
## What: Define what you want to build

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  STEP 1: SET THE GOAL                                                           │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  Human defines the high-level vision:                                           │
│                                                                                  │
│  Example:                                                                        │
│  "I want to build a Photo Gallery website where users can                       │
│   upload, organize, and share their photos in albums."                          │
│                                                                                  │
│  At this stage:                                                                  │
│  • Just the idea                                                                │
│  • No technical details yet                                                     │
│  • No implementation plan                                                       │
│                                                                                  │
│  Output: Clear project goal statement                                           │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

# STEP 2: BRAINSTORM & BUILD PROTOTYPE (Prototype-First)

## Who: Human + Claude.ai (Web)
## What: Explore the vision AND build HTML prototype

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  STEP 2: BRAINSTORM & PROTOTYPE                                                 │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  Human collaborates with Claude.ai (web interface) on:                          │
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │  PART A: VISION & STRATEGY                                              │   │
│  │  ─────────────────────────────                                          │   │
│  │                                                                          │   │
│  │  • Define the vision clearly                                            │   │
│  │  • Analyze competition (what exists, what's missing)                    │   │
│  │  • Define value proposition (why this is different)                     │   │
│  │  • Identify target users (who will use this)                            │   │
│  │  • List core features (what it must do)                                 │   │
│  │                                                                          │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │  PART B: HTML PROTOTYPE (Critical - Prototype First!)                   │   │
│  │  ────────────────────────────────────────────────────                   │   │
│  │                                                                          │   │
│  │  Claude.ai builds FULL HTML mockups:                                    │   │
│  │                                                                          │   │
│  │  • Every page/screen designed                                           │   │
│  │  • Accurate to final intended output                                    │   │
│  │  • Interactive where possible                                           │   │
│  │  • Responsive layouts                                                   │   │
│  │  • Real copy/content (not lorem ipsum)                                  │   │
│  │  • All UI components visible                                            │   │
│  │  • All user flows represented                                           │   │
│  │                                                                          │   │
│  │  Example prototype structure:                                           │   │
│  │  /prototype                                                              │   │
│  │  ├── index.html           # Landing page                                │   │
│  │  ├── auth/                                                               │   │
│  │  │   ├── signup.html      # Signup page                                 │   │
│  │  │   ├── login.html       # Login page                                  │   │
│  │  │   └── forgot.html      # Password reset                              │   │
│  │  ├── dashboard/                                                          │   │
│  │  │   ├── index.html       # Main dashboard                              │   │
│  │  │   └── albums.html      # Albums list                                 │   │
│  │  ├── album/                                                              │   │
│  │  │   ├── view.html        # Album view                                  │   │
│  │  │   ├── create.html      # Create album                                │   │
│  │  │   └── edit.html        # Edit album                                  │   │
│  │  ├── photo/                                                              │   │
│  │  │   ├── upload.html      # Upload flow                                 │   │
│  │  │   └── view.html        # Photo viewer                                │   │
│  │  └── shared/                                                             │   │
│  │      └── album.html       # Public shared view                          │   │
│  │                                                                          │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │  WHY PROTOTYPE FIRST?                                                   │   │
│  │  ────────────────────                                                   │   │
│  │                                                                          │   │
│  │  1. VISUAL CLARITY                                                      │   │
│  │     • See exactly what you're building before writing code              │   │
│  │     • No ambiguity in requirements                                      │   │
│  │                                                                          │   │
│  │  2. BETTER AI STORIES                                                   │   │
│  │     • Stories reference actual UI: "Build signup as shown in            │   │
│  │       prototype/auth/signup.html"                                       │   │
│  │     • Agents have visual reference                                      │   │
│  │                                                                          │   │
│  │  3. ACCURATE QA                                                         │   │
│  │     • QA compares output to prototype                                   │   │
│  │     • Clear pass/fail criteria                                          │   │
│  │                                                                          │   │
│  │  4. HUMAN VALIDATION                                                    │   │
│  │     • You approved the prototype                                        │   │
│  │     • Final output should match what you approved                       │   │
│  │                                                                          │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│  Output:                                                                         │
│  • Vision document                                                              │
│  • Competition analysis                                                         │
│  • Value proposition                                                            │
│  • COMPLETE HTML PROTOTYPE (source of truth)                                   │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

# STEP 3: HUMAN APPROVES → CLAUDE.AI WRITES PRD & STORIES

## Who: Human approves, Claude.ai writes
## What: Generate AI PRD and AI Stories based on approved prototype

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  STEP 3: APPROVE & GENERATE                                                     │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  HUMAN REVIEWS & APPROVES:                                                      │
│  ─────────────────────────                                                      │
│  • Reviews HTML prototype                                                       │
│  • Confirms it matches vision                                                   │
│  • Requests any adjustments                                                     │
│  • Says: "Approved, proceed"                                                    │
│                                                                                  │
│  ─────────────────────────────────────────────────────────────────────────────  │
│                                                                                  │
│  CLAUDE.AI WRITES (based on approved prototype):                                │
│  ───────────────────────────────────────────────                                │
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │  AI PRD (Product Requirements Document)                                 │   │
│  │  ──────────────────────────────────────                                 │   │
│  │                                                                          │   │
│  │  Written FOR AI/LLM execution:                                          │   │
│  │  • Technical stack decisions                                            │   │
│  │  • Architecture overview                                                │   │
│  │  • Database schema                                                       │   │
│  │  • API structure                                                         │   │
│  │  • Component hierarchy                                                   │   │
│  │  • References to prototype pages                                        │   │
│  │                                                                          │   │
│  │  Example excerpt:                                                        │   │
│  │  "The signup page (prototype/auth/signup.html) requires:                │   │
│  │   - Email input with validation                                         │   │
│  │   - Password input with strength indicator                              │   │
│  │   - Submit button with loading state                                    │   │
│  │   - Error message display area                                          │   │
│  │   - Link to login page"                                                 │   │
│  │                                                                          │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │  AI STORIES (for AI Agents)                                             │   │
│  │  ──────────────────────────                                             │   │
│  │                                                                          │   │
│  │  Each story references the prototype:                                   │   │
│  │                                                                          │   │
│  │  {                                                                       │   │
│  │    "id": "WAVE1-AUTH-001",                                              │   │
│  │    "domain": "auth",                                                     │   │
│  │    "title": "Implement signup page",                                    │   │
│  │    "prototype_reference": "prototype/auth/signup.html",                 │   │
│  │    "description": "Build the signup page exactly as shown in the        │   │
│  │                    HTML prototype",                                     │   │
│  │    "acceptance_criteria": [                                             │   │
│  │      "Matches prototype layout exactly",                                │   │
│  │      "Email validation works as designed",                              │   │
│  │      "Password strength indicator matches prototype",                   │   │
│  │      "Error states match prototype error-states.html",                  │   │
│  │      "Mobile responsive as shown in prototype"                          │   │
│  │    ],                                                                    │   │
│  │    "technical_notes": "Use Supabase Auth, Tailwind CSS"                │   │
│  │  }                                                                       │   │
│  │                                                                          │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│  Output:                                                                         │
│  • ai-prd/AI-PRD.md                                                            │
│  • ai-prd/stories/WAVE1-*.json (all stories)                                   │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

# STEP 4: HUMAN INSTRUCTS → CLAUDE.AI BUILDS EXECUTION PLAN

## Who: Human instructs, Claude.ai creates
## What: Organize stories into Waves and Domains

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  STEP 4: BUILD EXECUTION PLAN                                                   │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  HUMAN INSTRUCTS:                                                               │
│  ────────────────                                                               │
│  "Create the execution plan - organize into waves and domains"                  │
│                                                                                  │
│  ─────────────────────────────────────────────────────────────────────────────  │
│                                                                                  │
│  CLAUDE.AI CREATES:                                                             │
│  ──────────────────                                                             │
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │  DOMAIN BREAKDOWN                                                       │   │
│  │  ────────────────                                                       │   │
│  │                                                                          │   │
│  │  Photo Gallery Domains:                                                 │   │
│  │  ├── AUTH Domain      → User authentication (signup, login, logout)    │   │
│  │  ├── ALBUMS Domain    → Album CRUD operations                          │   │
│  │  ├── PHOTOS Domain    → Photo upload and management                    │   │
│  │  ├── SHARING Domain   → Share links, permissions                       │   │
│  │  └── EDITOR Domain    → Basic photo editing                            │   │
│  │                                                                          │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │  WAVE ORGANIZATION                                                      │   │
│  │  ─────────────────                                                      │   │
│  │                                                                          │   │
│  │  WAVE 1: Foundation (Must complete first)                               │   │
│  │  ├── WAVE1-AUTH-001: Signup page                                       │   │
│  │  ├── WAVE1-AUTH-002: Login page                                        │   │
│  │  ├── WAVE1-AUTH-003: Logout functionality                              │   │
│  │  └── WAVE1-ALBUMS-001: Create album                                    │   │
│  │                                                                          │   │
│  │  WAVE 2: Core Features (Depends on Wave 1)                             │   │
│  │  ├── WAVE2-ALBUMS-002: Edit album                                      │   │
│  │  ├── WAVE2-ALBUMS-003: Delete album                                    │   │
│  │  ├── WAVE2-PHOTOS-001: Upload photo                                    │   │
│  │  └── WAVE2-PHOTOS-002: View photo                                      │   │
│  │                                                                          │   │
│  │  WAVE 3: Advanced Features (Depends on Wave 2)                         │   │
│  │  ├── WAVE3-SHARING-001: Generate share link                            │   │
│  │  ├── WAVE3-SHARING-002: View shared album                              │   │
│  │  └── WAVE3-EDITOR-001: Crop photo                                      │   │
│  │                                                                          │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │  DEPENDENCY MAP                                                         │   │
│  │  ──────────────                                                         │   │
│  │                                                                          │   │
│  │  AUTH-001 (signup)                                                      │   │
│  │      │                                                                   │   │
│  │      ▼                                                                   │   │
│  │  AUTH-002 (login) ──────────┐                                          │   │
│  │      │                       │                                          │   │
│  │      ▼                       ▼                                          │   │
│  │  ALBUMS-001 (create) ──→ PHOTOS-001 (upload)                           │   │
│  │      │                       │                                          │   │
│  │      ▼                       ▼                                          │   │
│  │  SHARING-001 (share) ←── PHOTOS-002 (view)                             │   │
│  │                                                                          │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│  Output:                                                                         │
│  • execution-plan/domains.yaml                                                  │
│  • execution-plan/waves.yaml                                                    │
│  • execution-plan/dependencies.yaml                                             │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

# STEP 5: CTO MASTER REVIEWS & VALIDATES PLAN

## Who: CTO Master AI (Claude Code)
## What: Technical review, adjustments, validation

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  STEP 5: CTO MASTER REVIEW                                                      │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  Human provides plan to CTO Master (Claude Code):                               │
│  "Review this execution plan and validate it's ready for implementation"        │
│                                                                                  │
│  ─────────────────────────────────────────────────────────────────────────────  │
│                                                                                  │
│  CTO MASTER (Claude Code) PERFORMS:                                             │
│  ───────────────────────────────────                                            │
│                                                                                  │
│  1. TECHNICAL REVIEW                                                            │
│     • Reviews AI PRD for technical accuracy                                     │
│     • Validates architecture decisions                                          │
│     • Checks for missing technical requirements                                 │
│     • Ensures stories are implementable                                         │
│                                                                                  │
│  2. ADJUSTMENTS                                                                 │
│     • Adds missing technical details                                            │
│     • Corrects dependency order if needed                                       │
│     • Splits stories that are too large                                         │
│     • Adds infrastructure requirements                                          │
│                                                                                  │
│  3. VALIDATION                                                                  │
│     • Confirms all stories have:                                                │
│       - Clear acceptance criteria                                               │
│       - Prototype reference                                                     │
│       - Proper domain assignment                                                │
│       - Realistic scope                                                         │
│     • Confirms waves are properly sequenced                                     │
│     • Confirms domains are properly bounded                                     │
│                                                                                  │
│  4. SIGN-OFF                                                                    │
│     • CTO Master approves plan for execution                                    │
│     • Or requests changes from human                                            │
│                                                                                  │
│  Output:                                                                         │
│  • Validated/adjusted execution plan                                            │
│  • CTO validation report                                                        │
│  • Ready for infrastructure setup                                               │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

# STEP 6: HUMAN CREATES INFRASTRUCTURE

## Who: Human (manual)
## What: Set up external services

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  STEP 6: INFRASTRUCTURE SETUP                                                   │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  HUMAN MANUALLY CREATES:                                                        │
│  ───────────────────────                                                        │
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │  1. GITHUB REPOSITORY                                                   │   │
│  │     • Create new repo: photo-gallery                                    │   │
│  │     • Initialize with README                                            │   │
│  │     • Set up branch protection on main                                  │   │
│  │     • Add collaborators if needed                                       │   │
│  │                                                                          │   │
│  │  2. SUPABASE PROJECT                                                    │   │
│  │     • Create new project                                                │   │
│  │     • Note the URL and keys:                                            │   │
│  │       - SUPABASE_URL                                                    │   │
│  │       - SUPABASE_ANON_KEY                                               │   │
│  │       - SUPABASE_SERVICE_KEY                                            │   │
│  │     • Enable Auth providers as needed                                   │   │
│  │     • Set up storage buckets                                            │   │
│  │                                                                          │   │
│  │  3. VERCEL PROJECT                                                      │   │
│  │     • Connect to GitHub repo                                            │   │
│  │     • Configure build settings                                          │   │
│  │     • Set up environment variables                                      │   │
│  │     • Note deployment URL                                               │   │
│  │                                                                          │   │
│  │  4. ADDITIONAL SERVICES (if needed)                                     │   │
│  │     • Stripe (payments)                                                 │   │
│  │     • SendGrid (email)                                                  │   │
│  │     • Cloudinary (images)                                               │   │
│  │     • etc.                                                              │   │
│  │                                                                          │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│  COLLECT CREDENTIALS:                                                           │
│  ────────────────────                                                           │
│                                                                                  │
│  ANTHROPIC_API_KEY=sk-ant-...                                                   │
│  SUPABASE_URL=https://xxx.supabase.co                                          │
│  SUPABASE_ANON_KEY=eyJ...                                                       │
│  SUPABASE_SERVICE_KEY=eyJ...                                                    │
│  VERCEL_TOKEN=...                                                               │
│  GITHUB_TOKEN=...                                                               │
│  SLACK_WEBHOOK_URL=https://hooks.slack.com/...                                 │
│                                                                                  │
│  Output:                                                                         │
│  • GitHub repo created                                                          │
│  • Supabase project ready                                                       │
│  • Vercel project connected                                                     │
│  • All credentials collected                                                    │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

# STEP 7: CTO MASTER CONNECTS SYSTEMS

## Who: CTO Master AI (Claude Code)
## What: Configure and connect everything

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  STEP 7: CONNECT SYSTEMS                                                        │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  Human instructs CTO Master:                                                    │
│  "Connect the system environment according to the setup plan"                   │
│                                                                                  │
│  ─────────────────────────────────────────────────────────────────────────────  │
│                                                                                  │
│  CTO MASTER (Claude Code) PERFORMS:                                             │
│  ───────────────────────────────────                                            │
│                                                                                  │
│  1. INITIALIZE PROJECT                                                          │
│     • Clone repo locally                                                        │
│     • Run WAVE project-setup.sh                                                 │
│     • Create initial project structure                                          │
│     • Copy prototype to project                                                 │
│                                                                                  │
│  2. CONFIGURE ENVIRONMENT                                                       │
│     • Create .env with all credentials                                          │
│     • Configure WAVE settings                                                   │
│     • Set up Docker Compose for domains                                         │
│                                                                                  │
│  3. SET UP GIT WORKTREES                                                        │
│     • Create worktrees for each domain                                          │
│     • Create worktrees for each agent                                           │
│     • Configure branch naming                                                   │
│                                                                                  │
│  4. CONFIGURE DOMAIN BOUNDARIES                                                 │
│     • Create domain config files                                                │
│     • Define allowed/forbidden paths                                            │
│     • Set up workspace validators                                               │
│                                                                                  │
│  5. LOAD STORIES                                                                │
│     • Copy stories to signal directories                                        │
│     • Organize by domain                                                        │
│     • Validate JSON schemas                                                     │
│                                                                                  │
│  6. VERIFY CONNECTIONS                                                          │
│     • Test Supabase connection                                                  │
│     • Test GitHub access                                                        │
│     • Test Slack webhook                                                        │
│     • Test Anthropic API                                                        │
│                                                                                  │
│  Output:                                                                         │
│  • Project fully configured                                                     │
│  • All systems connected                                                        │
│  • Worktrees ready                                                              │
│  • Stories loaded                                                               │
│  • Ready for pre-flight                                                         │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

# STEP 8: CTO MASTER RUNS PRE-FLIGHT

## Who: CTO Master AI (Claude Code)
## What: Validate everything is ready for takeoff

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  STEP 8: PRE-FLIGHT VALIDATION                                                  │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  CTO Master automatically runs pre-flight checks:                               │
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │  CHECKING ALL SYSTEMS (80+ checks)                                      │   │
│  │  ───────────────────────────────                                        │   │
│  │                                                                          │   │
│  │  SECTION A: Environment                                                 │   │
│  │  ✓ ANTHROPIC_API_KEY valid                                              │   │
│  │  ✓ SUPABASE_URL accessible                                              │   │
│  │  ✓ SLACK_WEBHOOK works                                                  │   │
│  │  ✓ All required env vars set                                            │   │
│  │                                                                          │   │
│  │  SECTION B: Docker                                                      │   │
│  │  ✓ Docker running                                                       │   │
│  │  ✓ Docker Compose valid                                                 │   │
│  │  ✓ Images available                                                     │   │
│  │                                                                          │   │
│  │  SECTION C: Git & Worktrees                                             │   │
│  │  ✓ Git repo valid                                                       │   │
│  │  ✓ All worktrees created                                                │   │
│  │  ✓ Branches configured                                                  │   │
│  │                                                                          │   │
│  │  SECTION D: Stories                                                     │   │
│  │  ✓ All stories valid JSON                                               │   │
│  │  ✓ Prototype references exist                                           │   │
│  │  ✓ Dependencies valid                                                   │   │
│  │                                                                          │   │
│  │  SECTION E: Safety                                                      │   │
│  │  ✓ No kill switch active                                                │   │
│  │  ✓ Safety configs loaded                                                │   │
│  │  ✓ Forbidden operations configured                                      │   │
│  │                                                                          │   │
│  │  ... (all 13 sections)                                                  │   │
│  │                                                                          │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │  CHECKING ALL AIRPLANES (Domains)                                       │   │
│  │  ────────────────────────────────                                       │   │
│  │                                                                          │   │
│  │  ✈️  AUTH Domain                                                        │   │
│  │  ✓ Worktrees ready                                                      │   │
│  │  ✓ Stories loaded (3 stories)                                           │   │
│  │  ✓ Boundaries configured                                                │   │
│  │  ✓ Crew (agents) ready                                                  │   │
│  │                                                                          │   │
│  │  ✈️  ALBUMS Domain                                                      │   │
│  │  ✓ Worktrees ready                                                      │   │
│  │  ✓ Stories loaded (3 stories)                                           │   │
│  │  ✓ Boundaries configured                                                │   │
│  │  ✓ Crew (agents) ready                                                  │   │
│  │                                                                          │   │
│  │  ✈️  PHOTOS Domain                                                      │   │
│  │  ✓ Worktrees ready                                                      │   │
│  │  ✓ Stories loaded (2 stories)                                           │   │
│  │  ✓ Boundaries configured                                                │   │
│  │  ✓ Crew (agents) ready                                                  │   │
│  │                                                                          │   │
│  │  ... (all domains)                                                      │   │
│  │                                                                          │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│  RESULT:                                                                        │
│  ═══════════════════════════════════════════════════════════════════════════   │
│                                                                                  │
│       ┌─────────────────────────────────────────────────────────────┐          │
│       │                                                             │          │
│       │   🟢 GO - All systems ready for takeoff                    │          │
│       │                                                             │          │
│       │   Systems: 80/80 passed                                    │          │
│       │   Domains: 5/5 ready                                       │          │
│       │   Stories: 11 stories queued                               │          │
│       │                                                             │          │
│       │   Awaiting human START command                             │          │
│       │                                                             │          │
│       └─────────────────────────────────────────────────────────────┘          │
│                                                                                  │
│  (If NO-GO: CTO Master reports what needs to be fixed)                         │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

# STEP 9: HUMAN SAYS "START"

## Who: Human
## What: Give explicit command to begin autonomous execution

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  STEP 9: START EXECUTION                                                        │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  PRE-FLIGHT COMPLETE. AWAITING CLEARANCE.                                       │
│                                                                                  │
│  Human reviews pre-flight report and says:                                      │
│                                                                                  │
│       ┌─────────────────────────────────────────────────────────────┐          │
│       │                                                             │          │
│       │   Human: "START"                                           │          │
│       │                                                             │          │
│       └─────────────────────────────────────────────────────────────┘          │
│                                                                                  │
│  ─────────────────────────────────────────────────────────────────────────────  │
│                                                                                  │
│  AUTONOMOUS EXECUTION BEGINS:                                                   │
│  ════════════════════════════                                                   │
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                                                                          │   │
│  │   🛫 WAVE 1 TAKEOFF                                                     │   │
│  │                                                                          │   │
│  │   ✈️  AUTH Domain departing...                                          │   │
│  │       → CTO validating stories                                          │   │
│  │       → PM assigning to crew                                            │   │
│  │       → FE-Dev-1 implementing signup                                    │   │
│  │       → BE-Dev-1 implementing auth API                                  │   │
│  │                                                                          │   │
│  │   ✈️  ALBUMS Domain departing...                                        │   │
│  │       → CTO validating stories                                          │   │
│  │       → PM assigning to crew                                            │   │
│  │       → FE-Dev-1 implementing create album                              │   │
│  │                                                                          │   │
│  │   All flights in progress...                                            │   │
│  │                                                                          │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│  FROM THIS POINT:                                                               │
│  ────────────────                                                               │
│                                                                                  │
│  • Execution is FULLY AUTONOMOUS                                               │
│  • CTO Master monitors all domains                                             │
│  • Each domain crew works independently                                        │
│  • Stories flow through 8 gates automatically                                  │
│  • Failures trigger Dev-Fix retry (up to 3x)                                   │
│  • Escalations notify human via Slack                                          │
│  • Completed stories merge via CTO Master                                      │
│  • Deployments require human approval for production                           │
│                                                                                  │
│  HUMAN'S ROLE DURING EXECUTION:                                                │
│  ─────────────────────────────                                                 │
│  • Monitor Slack for notifications                                             │
│  • Respond to escalations (if any)                                             │
│  • Approve production deployments                                              │
│  • Emergency stop if needed (EMERGENCY-STOP file)                              │
│                                                                                  │
│  OTHERWISE:                                                                      │
│  • Go get coffee ☕                                                             │
│  • Work on something else                                                       │
│  • Sleep (for overnight runs)                                                  │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

# COMPLETE PROCESS SUMMARY

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                                                                  │
│                    WAVE: FROM VISION TO PRODUCTION                              │
│                         (9-Step Process)                                        │
│                                                                                  │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  STEP │ WHO                │ WHAT                                               │
│  ─────┼────────────────────┼─────────────────────────────────────────────────   │
│   1   │ Human              │ Set goal/vision                                    │
│   2   │ Human + Claude.ai  │ Brainstorm + BUILD HTML PROTOTYPE                 │
│   3   │ Human + Claude.ai  │ Approve prototype → Claude writes PRD & Stories   │
│   4   │ Human + Claude.ai  │ Instruct → Claude builds execution plan           │
│   5   │ CTO Master         │ Review, adjust, validate plan                     │
│   6   │ Human              │ Create infrastructure (repo, DB, Vercel)          │
│   7   │ CTO Master         │ Connect systems according to plan                 │
│   8   │ CTO Master         │ Run pre-flight validation (all checks)            │
│   9   │ Human              │ Say "START" → Autonomous execution begins         │
│                                                                                  │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  AFTER START:                                                                   │
│  ─────────────                                                                  │
│  • Execution is autonomous                                                      │
│  • Human only responds to escalations                                          │
│  • Human approves production deploys                                           │
│  • Stories delivered like passengers to destination                            │
│                                                                                  │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  KEY PRINCIPLE: PROTOTYPE FIRST                                                │
│  ─────────────────────────────                                                 │
│  HTML Prototype → PRD → Stories → Execution                                    │
│                                                                                  │
│  The prototype IS the specification.                                           │
│  Everything else is derived from it.                                           │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

**END OF WAVE PROCESS GUIDE v2.0.0**
