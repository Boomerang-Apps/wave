# WAVE Quick Start - Human + CTO Master Checklist

**Version:** 1.0.0
**Purpose:** Simple step-by-step guide showing WHO does WHAT

---

## The Two Players

```
┌─────────────────────────────────────┐    ┌─────────────────────────────────────┐
│            YOU (Human)              │    │      CTO MASTER (Claude Code)       │
│                                     │    │                                     │
│  • Sets vision                      │    │  • Validates plans                  │
│  • Approves things                  │    │  • Connects systems                 │
│  • Creates infrastructure           │    │  • Runs pre-flight                  │
│  • Says "START"                     │    │  • Oversees execution               │
│  • Responds to escalations          │    │  • Merges & deploys                 │
│                                     │    │                                     │
└─────────────────────────────────────┘    └─────────────────────────────────────┘
```

---

# PHASE A: PLANNING (Steps 1-4)

## Step 1: Set Goal
| YOU DO | CTO MASTER DOES |
|--------|-----------------|
| Write your project goal | Nothing yet |

```
Example: "I want to build a Photo Gallery website"
```

---

## Step 2: Brainstorm + Prototype
| YOU DO | CTO MASTER DOES |
|--------|-----------------|
| Open Claude.ai (web) | Nothing yet |
| Discuss vision, competition, value prop | |
| Ask Claude.ai to build HTML prototype | |
| Review and refine prototype | |

**Output:** Complete HTML prototype of your app

---

## Step 3: Approve → Get PRD & Stories
| YOU DO | CTO MASTER DOES |
|--------|-----------------|
| Review prototype | Nothing yet |
| Say "Approved, create AI PRD and Stories" | |
| Receive PRD and Stories from Claude.ai | |

**Output:**
- `AI-PRD.md`
- `stories/*.json` files

---

## Step 4: Get Execution Plan
| YOU DO | CTO MASTER DOES |
|--------|-----------------|
| Say "Create execution plan with waves and domains" | Nothing yet |
| Receive plan from Claude.ai | |

**Output:**
- Domains defined
- Waves organized
- Dependencies mapped

---

# PHASE B: VALIDATION (Step 5)

## Step 5: CTO Master Reviews Plan

| YOU DO | CTO MASTER DOES |
|--------|-----------------|
| Open Claude Code (terminal) | |
| Say "Review this execution plan" | Analyze PRD |
| | Validate stories |
| | Check dependencies |
| | Adjust if needed |
| | Confirm ready |

**You say:**
```
Review the execution plan in [path]. Validate the AI PRD
and Stories are technically sound and ready for implementation.
```

**CTO Master outputs:**
- Validation report
- Any adjustments made
- Confirmation: "Plan validated, ready for infrastructure setup"

---

# PHASE C: INFRASTRUCTURE (Step 6)

## Step 6: Human Creates Infrastructure

| YOU DO | CTO MASTER DOES |
|--------|-----------------|
| **Create GitHub repo** | Waiting |
| - New repo for project | |
| - Note the URL | |
| | |
| **Create Supabase project** | Waiting |
| - New project | |
| - Copy URL | |
| - Copy anon key | |
| - Copy service key | |
| | |
| **Create Vercel project** | Waiting |
| - Connect to GitHub | |
| - Note deployment URL | |
| | |
| **Create Slack webhook** | Waiting |
| - Create incoming webhook | |
| - Copy webhook URL | |
| | |
| **Get Anthropic API key** | Waiting |
| - From console.anthropic.com | |

**Collect these credentials:**
```
ANTHROPIC_API_KEY=sk-ant-...
GITHUB_REPO=https://github.com/you/photo-gallery
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_KEY=eyJ...
VERCEL_URL=https://photo-gallery.vercel.app
SLACK_WEBHOOK_URL=https://hooks.slack.com/...
```

---

# PHASE D: CONNECTION (Step 7)

## Step 7: CTO Master Connects Everything

| YOU DO | CTO MASTER DOES |
|--------|-----------------|
| Provide credentials to CTO Master | |
| Say "Connect the systems" | Clone repo |
| | Run project-setup.sh |
| | Create .env file |
| | Set up worktrees |
| | Configure Docker Compose |
| | Load stories |
| | Test connections |

**You say:**
```
Connect the system environment for Photo Gallery.

GitHub: https://github.com/me/photo-gallery
Supabase URL: https://xxx.supabase.co
Supabase Key: eyJ...
Slack Webhook: https://hooks.slack.com/...
Anthropic Key: sk-ant-...

Set up according to the execution plan.
```

**CTO Master does:**
```bash
# 1. Clone and setup
git clone [repo]
cd photo-gallery
./project-setup.sh

# 2. Create .env with your credentials

# 3. Create worktrees for each domain
./setup-worktrees.sh --domain auth
./setup-worktrees.sh --domain albums
./setup-worktrees.sh --domain photos

# 4. Configure docker-compose.yml

# 5. Load stories to signals directory

# 6. Test connections
curl $SUPABASE_URL  # ✓
curl $SLACK_WEBHOOK # ✓
```

**CTO Master outputs:**
- "Systems connected"
- "Worktrees created"
- "Stories loaded"
- "Ready for pre-flight"

---

# PHASE E: PRE-FLIGHT (Step 8)

## Step 8: CTO Master Runs Pre-Flight

| YOU DO | CTO MASTER DOES |
|--------|-----------------|
| Say "Run pre-flight checks" | Run pre-flight-validator.sh |
| | Check 80+ items |
| | Verify all domains ready |
| | Report GO or NO-GO |

**You say:**
```
Run pre-flight validation. Check all systems are ready for takeoff.
```

**CTO Master runs:**
```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  PRE-FLIGHT VALIDATION                                                          │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  SECTION A: Environment                                                         │
│  ✓ A1: ANTHROPIC_API_KEY set                                                   │
│  ✓ A2: SUPABASE_URL accessible                                                 │
│  ✓ A3: SLACK_WEBHOOK works                                                     │
│  ✓ A4: API key valid (live test)                                               │
│                                                                                  │
│  SECTION B: Docker                                                              │
│  ✓ B1: Docker running                                                          │
│  ✓ B2: Docker Compose valid                                                    │
│  ✓ B3: Images available                                                        │
│                                                                                  │
│  SECTION C: Git & Worktrees                                                     │
│  ✓ C1: Git repo valid                                                          │
│  ✓ C2: Worktrees created (7)                                                   │
│  ✓ C3: Branches configured                                                     │
│                                                                                  │
│  SECTION D: Stories                                                             │
│  ✓ D1: All stories valid JSON                                                  │
│  ✓ D2: Prototype references exist                                              │
│  ✓ D3: Dependencies valid                                                      │
│                                                                                  │
│  SECTION E: Domains                                                             │
│  ✓ E1: AUTH domain ready (3 stories)                                           │
│  ✓ E2: ALBUMS domain ready (3 stories)                                         │
│  ✓ E3: PHOTOS domain ready (2 stories)                                         │
│                                                                                  │
│  SECTION F: Safety                                                              │
│  ✓ F1: No kill switch active                                                   │
│  ✓ F2: Safety configs loaded                                                   │
│  ✓ F3: 108 forbidden operations configured                                     │
│                                                                                  │
│  SECTION G: Monitoring                                                          │
│  ✓ G1: Dozzle configured (port 8080)                                           │
│  ✓ G2: Slack webhook valid                                                     │
│  ✓ G3: Supabase tables ready                                                   │
│                                                                                  │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│   RESULT:  🟢 GO                                                                │
│                                                                                  │
│   Systems:  80/80 passed                                                        │
│   Domains:  3/3 ready                                                           │
│   Stories:  8 queued                                                            │
│                                                                                  │
│   ⏳ AWAITING HUMAN "START" COMMAND                                             │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

**If NO-GO:** CTO Master tells you what to fix.

---

# PHASE F: EXECUTION (Step 9)

## Step 9: Human Says START

| YOU DO | CTO MASTER DOES |
|--------|-----------------|
| Review pre-flight report | Waiting for clearance |
| Say **"START"** | |
| | Start Docker containers |
| | Begin autonomous execution |
| | Monitor all domains |
| | Handle merges |

**You say:**
```
START
```

**CTO Master does:**
```bash
# Start all services
docker-compose up -d

# Execution begins automatically
# - CTO validates stories
# - PM assigns to agents
# - Devs implement
# - QA validates
# - Dev-Fix handles failures
# - CTO Master merges approved work
```

---

# PHASE G: MONITORING (During Execution)

## What You Can Do While It Runs

| OPTION | HOW |
|--------|-----|
| **Watch logs** | Open http://localhost:8080 (Dozzle) |
| **Get alerts** | Check Slack for notifications |
| **Do nothing** | Go get coffee, it's autonomous |

## When You MUST Act

| ALERT | YOUR ACTION |
|-------|-------------|
| "Escalation: [story] needs human input" | Provide guidance |
| "Production deploy ready for approval" | Review and approve |
| "Budget exceeded" | Approve more or stop |
| "Agent stuck 3x" | Investigate or skip story |

---

# QUICK REFERENCE CHECKLIST

## Before You Start - Human Checklist

```
□ Project goal defined
□ HTML prototype approved
□ AI PRD created
□ AI Stories created
□ Execution plan created
□ GitHub repo created
□ Supabase project created
□ Vercel project created
□ Slack webhook created
□ Anthropic API key ready
```

## Before START - CTO Master Checklist

```
□ Plan validated
□ Repo cloned
□ .env configured
□ Worktrees created
□ Docker Compose ready
□ Stories loaded
□ Connections tested
□ Pre-flight passed (GO)
```

---

# COMMANDS SUMMARY

## What You Say to CTO Master

| STEP | YOU SAY |
|------|---------|
| 5 | "Review the execution plan and validate" |
| 7 | "Connect the systems with these credentials: [...]" |
| 8 | "Run pre-flight checks" |
| 9 | "START" |

## What CTO Master Runs

| STEP | CTO MASTER RUNS |
|------|-----------------|
| 5 | Reviews PRD, stories, validates |
| 7 | `project-setup.sh`, `setup-worktrees.sh`, creates `.env` |
| 8 | `pre-flight-validator.sh` |
| 9 | `docker-compose up` |

---

# SIMPLE FLOWCHART

```
YOU                                    CTO MASTER
───                                    ──────────

1. "I want Photo Gallery"
         │
2. Build prototype (Claude.ai)
         │
3. "Approved"
         │
4. Get PRD + Stories (Claude.ai)
         │
         ├────────────────────────────────►
         │                                 5. Validate plan
         │◄────────────────────────────────
         │                                 "Plan validated"
         │
6. Create GitHub/Supabase/Vercel
         │
         ├────────────────────────────────►
         │                                 7. Connect systems
         │◄────────────────────────────────
         │                                 "Systems connected"
         │
         ├────────────────────────────────►
         │                                 8. Pre-flight checks
         │◄────────────────────────────────
         │                                 "GO - Ready"
         │
9. "START"
         │
         ├────────────────────────────────►
         │                                 Execute autonomously
         │                                 Monitor & merge
         │                                 │
         │◄────────────────────────────────┤
         │   (Slack alerts)                │
         │                                 │
         │◄────────────────────────────────┤
"Approve prod"                             Deploy
         │
         ▼
      DONE ✅
```

---

**END OF WAVE QUICKSTART**
