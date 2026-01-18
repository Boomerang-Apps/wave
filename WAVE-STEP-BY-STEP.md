# WAVE Step-by-Step Process

**Version:** 1.0.0
**Purpose:** Complete process reference with responsibilities, scripts, and documents

---

## Quick Reference

| Phase | Steps | Owner |
|-------|-------|-------|
| A. Planning | 1-4 | Human + Claude.ai (Web) |
| B. Validation | 5 | CTO Master |
| C. Infrastructure | 6 | Human |
| D. Connection | 7 | CTO Master |
| E. Pre-Flight | 8 | CTO Master |
| F. Execution | 9 | CTO Master |
| G. Monitoring | Ongoing | Both |

---

# PHASE A: PLANNING (Steps 1-4)

## Step 1: Set Goal

| Column | Details |
|--------|---------|
| **Step Name** | Set Project Goal |
| **Human** | Define what you want to build (e.g., "Photo Gallery website") |
| **Master CTO** | — |
| **Script** | — |
| **Document** | — |
| **Notes** | Be specific about the core value proposition |

---

## Step 2: Brainstorm + Prototype

| Column | Details |
|--------|---------|
| **Step Name** | Brainstorm and Build Prototype |
| **Human** | Open Claude.ai (web), discuss vision, request HTML prototype |
| **Master CTO** | — |
| **Script** | — |
| **Document** | — |
| **Notes** | PROTOTYPE-FIRST: Build complete HTML mockup before any PRD |

| Sub-Step | Human | Claude.ai (Web) |
|----------|-------|-----------------|
| 2.1 | Describe project vision | Ask clarifying questions |
| 2.2 | Discuss competitors, differentiation | Suggest features |
| 2.3 | Request HTML prototype | Build complete HTML prototype |
| 2.4 | Review and request changes | Iterate on prototype |
| 2.5 | Approve prototype | Save final HTML |

**Output:** Complete HTML prototype file(s)

---

## Step 3: Approve → Get PRD & Stories

| Column | Details |
|--------|---------|
| **Step Name** | Approve Prototype, Generate AI PRD & Stories |
| **Human** | Say "Approved, create AI PRD and Stories" |
| **Master CTO** | — |
| **Script** | — |
| **Document** | `AI-PRD.md`, `stories/*.json` |
| **Notes** | Claude.ai generates both documents based on approved prototype |

| Sub-Step | Human | Claude.ai (Web) |
|----------|-------|-----------------|
| 3.1 | "Prototype approved" | Acknowledge |
| 3.2 | "Create AI PRD" | Generate `AI-PRD.md` |
| 3.3 | Review PRD | Revise if needed |
| 3.4 | "Create AI Stories" | Generate story JSON files |
| 3.5 | Review stories | Ensure each has acceptance criteria |

**Output:**
- `AI-PRD.md` - Technical requirements document
- `stories/*.json` - Individual story files with acceptance criteria

---

## Step 4: Get Execution Plan

| Column | Details |
|--------|---------|
| **Step Name** | Create Execution Plan |
| **Human** | Say "Create execution plan with waves and domains" |
| **Master CTO** | — |
| **Script** | — |
| **Document** | `EXECUTION-PLAN.md` |
| **Notes** | Claude.ai organizes stories into domains and waves |

| Sub-Step | Human | Claude.ai (Web) |
|----------|-------|-----------------|
| 4.1 | Request execution plan | Analyze stories |
| 4.2 | — | Define domains (Auth, Albums, Photos, etc.) |
| 4.3 | — | Organize into waves based on dependencies |
| 4.4 | — | Map dependencies between stories |
| 4.5 | Review plan | Provide `EXECUTION-PLAN.md` |

**Output:**
- Domains defined with boundaries
- Waves organized (Wave 1, Wave 2, etc.)
- Dependencies mapped between stories

---

# PHASE B: VALIDATION (Step 5)

## Step 5: CTO Master Reviews Plan

| Column | Details |
|--------|---------|
| **Step Name** | Validate Execution Plan |
| **Human** | Open Claude Code, say "Review the execution plan" |
| **Master CTO** | Validate PRD, stories, domains, waves, dependencies |
| **Script** | `ai-prd-validator.sh`, `story-schema-validator.sh`, `wave-dependency-validator.sh` |
| **Document** | `CTO-MASTER-EXECUTION-PROTOCOL.md` (Phase 1) |
| **Notes** | First time CTO Master is involved |

| Sub-Step | Human | Master CTO | Script |
|----------|-------|------------|--------|
| 5.1 | Provide plan location | Receive inputs | — |
| 5.2 | — | Validate AI PRD | `ai-prd-validator.sh` |
| 5.3 | — | Validate AI Stories (schema, fields) | `story-schema-validator.sh` |
| 5.4 | — | Validate domains (boundaries, ownership) | `domain-boundary-validator.sh` |
| 5.5 | — | Validate waves (no circular deps) | `wave-dependency-validator.sh` |
| 5.6 | — | Validate dependencies | `dependency-graph-validator.sh` |
| 5.7 | — | Make adjustments if needed | — |
| 5.8 | Receive confirmation | Report "Plan validated" | — |

**Output:** "Plan validated, ready for infrastructure setup"

---

# PHASE C: INFRASTRUCTURE (Step 6)

## Step 6: Human Creates Infrastructure

| Column | Details |
|--------|---------|
| **Step Name** | Create External Infrastructure |
| **Human** | Create GitHub repo, Supabase project, Vercel project, Slack webhook |
| **Master CTO** | Waiting |
| **Script** | — |
| **Document** | `WAVE-QUICKSTART.md` (Infrastructure section) |
| **Notes** | Human must create these manually - cannot be automated |

| Sub-Step | Human Action | Output |
|----------|--------------|--------|
| 6.1 | Create GitHub repository | `https://github.com/you/project` |
| 6.2 | Create Supabase project | URL + Anon Key + Service Key |
| 6.3 | Create Vercel project (connect to GitHub) | `https://project.vercel.app` |
| 6.4 | Create Slack incoming webhook | `https://hooks.slack.com/...` |
| 6.5 | Get Anthropic API key | `sk-ant-...` |
| 6.6 | Collect all credentials | Ready to provide to CTO Master |

**Credentials Collected:**
```
ANTHROPIC_API_KEY=sk-ant-...
GITHUB_REPO=https://github.com/you/project
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_KEY=eyJ...
SLACK_WEBHOOK_URL=https://hooks.slack.com/...
VERCEL_URL=https://project.vercel.app
```

---

# PHASE D: CONNECTION (Step 7)

## Step 7: CTO Master Connects Systems

| Column | Details |
|--------|---------|
| **Step Name** | Connect and Configure Systems |
| **Human** | Provide credentials, say "Connect the systems" |
| **Master CTO** | Clone, setup, create worktrees, configure Docker, store credentials |
| **Script** | `project-setup.sh`, `setup-worktrees.sh`, `credentials-manager.sh` |
| **Document** | `CTO-MASTER-EXECUTION-PROTOCOL.md` (Phase 2) |
| **Notes** | Credentials stored in WAVE Portal Supabase for future retrieval |

| Sub-Step | Human | Master CTO | Script |
|----------|-------|------------|--------|
| 7.1 | Provide credentials | Receive and validate | `credentials-manager.sh validate` |
| 7.2 | — | Store credentials in WAVE Portal | `credentials-manager.sh store` |
| 7.3 | — | Clone repository | `git clone` |
| 7.4 | — | Initialize WAVE structure | `project-setup.sh` |
| 7.5 | — | Create .env file | From `.env.template` |
| 7.6 | — | Create worktrees for each agent | `setup-worktrees.sh` |
| 7.7 | — | Configure Docker Compose | From `docker-compose.template.yml` |
| 7.8 | — | Configure domain boundaries | Domain config files |
| 7.9 | — | Load stories to signals directory | Copy to `.claude/signals/` |
| 7.10 | — | Copy HTML prototype | To project root |
| 7.11 | — | Test all connections | `connection-test.sh` |
| 7.12 | Receive confirmation | Report "Systems connected" | — |

**Output:** "Systems connected, worktrees created, stories loaded, ready for pre-flight"

---

# PHASE E: PRE-FLIGHT (Step 8)

## Step 8: CTO Master Runs Pre-Flight

| Column | Details |
|--------|---------|
| **Step Name** | Pre-Flight Validation |
| **Human** | Say "Run pre-flight checks" |
| **Master CTO** | Run 80+ validation checks across all systems |
| **Script** | `pre-flight-validator.sh` |
| **Document** | `CTO-MASTER-EXECUTION-PROTOCOL.md` (Phase 3) |
| **Notes** | Result is GO or NO-GO. If NO-GO, fix issues and re-run |

| Sub-Step | Master CTO | Script/Check |
|----------|------------|--------------|
| 8.1 | Section A: Environment Variables | `env-validator.sh` |
| 8.2 | Section B: Docker | `docker-validator.sh` |
| 8.3 | Section C: Git & Worktrees | `git-worktree-validator.sh` |
| 8.4 | Section D: Stories | `story-schema-validator.sh` |
| 8.5 | Section E: Domains | `domain-readiness-validator.sh` |
| 8.6 | Section F: Safety | `safety-validator.sh` |
| 8.7 | Section G: Monitoring | `monitoring-validator.sh` |
| 8.8 | Determine result | GO or NO-GO |

| Result | Human Action | Master CTO |
|--------|--------------|------------|
| **GO** | Say "START" | Wait for command |
| **NO-GO** | Fix listed issues | Provide fix instructions |

**Output:**
- GO: "80/80 passed, awaiting START command"
- NO-GO: List of failures with remediation steps

---

# PHASE F: EXECUTION (Step 9)

## Step 9: Human Says START

| Column | Details |
|--------|---------|
| **Step Name** | Begin Autonomous Execution |
| **Human** | Say "START" |
| **Master CTO** | Start Docker containers, monitor execution, handle events |
| **Script** | `docker-compose up`, `signal-watcher.sh`, `wave-orchestrator.sh` |
| **Document** | `CTO-MASTER-EXECUTION-PROTOCOL.md` (Phase 4) |
| **Notes** | Execution is autonomous until escalation or completion |

| Sub-Step | Human | Master CTO | Script |
|----------|-------|------------|--------|
| 9.1 | Say "START" | Verify pre-flight was GO | — |
| 9.2 | — | Start monitoring (Dozzle) | `docker-compose up dozzle` |
| 9.3 | — | Start Wave 1 agents | `docker-compose up` |
| 9.4 | — | Monitor for signals | `signal-watcher.sh` |
| 9.5 | — | Handle story completion | `pre-merge-validator.sh` |
| 9.6 | — | Handle failures (retry up to 3x) | `retry-handler.sh` |
| 9.7 | Respond if escalated | Handle escalations | `escalation-handler.sh` |
| 9.8 | — | When Wave 1 complete, start Wave 2 | — |
| 9.9 | — | Continue until all waves done | — |

---

# PHASE G: MONITORING & DEPLOY (Ongoing)

## During Execution

| Event | Human | Master CTO | Script |
|-------|-------|------------|--------|
| Normal progress | Watch Dozzle (optional) | Log to Supabase, send Slack | `supabase-report.sh`, `slack-notify.sh` |
| Story complete | — | Run pre-merge validation | `pre-merge-validator.sh` |
| Story fails | — | Trigger retry (up to 3x) | `retry-handler.sh` |
| Max retries | Provide guidance | Escalate | `escalation-handler.sh` |
| Budget warning | Approve more or stop | Pause and notify | `budget-monitor.sh` |
| Kill switch | — | STOP immediately | `emergency-stop.sh` |
| Security issue | Review | STOP that agent | `security-alert.sh` |

## Merge & Deploy

| Sub-Step | Human | Master CTO | Script |
|----------|-------|------------|--------|
| Merge ready | — | Run pre-merge validation | `pre-merge-validator.sh` |
| Merge | — | `git merge --no-ff` | `merge-handler.sh` |
| CI/CD | — | Monitor pipeline | External |
| Staging deploy | — | Run post-deploy validation | `post-deploy-validator.sh` |
| Production ready | **Approve** | Wait for approval | `slack-notify.sh` |
| Production deploy | — | Deploy after approval | `post-deploy-validator.sh` |
| Complete | Receive summary | Generate final report | `supabase-report.sh` |

---

# EXISTING PROJECT FLOW

## When Returning to a Project

| Column | Details |
|--------|---------|
| **Step Name** | Resume Existing Project |
| **Human** | Say "Continue work on [project]" or "Resume [project]" |
| **Master CTO** | Quick validation only - skip full setup |
| **Script** | `credentials-manager.sh get`, `pre-flight-validator.sh` |
| **Document** | `CTO-MASTER-EXECUTION-PROTOCOL.md` (Returning to Existing Project) |
| **Notes** | DO NOT redo full setup - only validate and resume |

| Sub-Step | Human | Master CTO | Script |
|----------|-------|------------|--------|
| V0 | — | Retrieve stored credentials | `credentials-manager.sh get` |
| V1 | — | Verify project state (git status) | — |
| V2 | — | Check worktrees exist | — |
| V3 | — | Check signals (pending/complete) | — |
| V4 | — | Verify connections | `connection-test.sh` |
| V5 | — | Check for changes since last run | — |
| V6a | If no changes: say "START" | Skip to Phase 4 (Execute) | — |
| V6b | If changes: review | Validate new items only | — |

**Output:** "Project validated, ready to resume - Say START to continue"

---

# COMPLETE REFERENCE TABLE

## All Steps with Scripts and Documents

| Step | Name | Human | Master CTO | Script | Document |
|------|------|-------|------------|--------|----------|
| 1 | Set Goal | Define vision | — | — | — |
| 2 | Brainstorm | Work with Claude.ai | — | — | — |
| 3 | Approve PRD | Say "Approved" | — | — | `AI-PRD.md`, `stories/*.json` |
| 4 | Execution Plan | Request plan | — | — | `EXECUTION-PLAN.md` |
| 5 | Validate Plan | Say "Review" | Validate all | `*-validator.sh` | `CTO-MASTER-EXECUTION-PROTOCOL.md` |
| 6 | Infrastructure | Create GitHub/Supabase/etc | Waiting | — | `WAVE-QUICKSTART.md` |
| 7 | Connect | Provide credentials | Setup everything | `project-setup.sh`, `setup-worktrees.sh`, `credentials-manager.sh` | `CTO-MASTER-EXECUTION-PROTOCOL.md` |
| 8 | Pre-Flight | Say "Run pre-flight" | 80+ checks | `pre-flight-validator.sh` | `CTO-MASTER-EXECUTION-PROTOCOL.md` |
| 9 | Execute | Say "START" | Autonomous run | `docker-compose`, `wave-orchestrator.sh` | `CTO-MASTER-EXECUTION-PROTOCOL.md` |
| — | Monitor | Watch/respond | Log/notify | `supabase-report.sh`, `slack-notify.sh` | — |
| — | Merge | — | Validate & merge | `pre-merge-validator.sh` | — |
| — | Deploy | **Approve prod** | Deploy | `post-deploy-validator.sh` | — |

---

# SCRIPT REFERENCE

## Core Scripts

| Script | Location | Purpose | Used In Step |
|--------|----------|---------|--------------|
| `project-setup.sh` | `core/templates/` | Initialize WAVE structure | 7 |
| `setup-worktrees.sh` | `core/scripts/` | Create git worktrees | 7 |
| `credentials-manager.sh` | `core/scripts/` | Store/retrieve credentials | 7, V0 |
| `pre-flight-validator.sh` | `core/scripts/` | 80+ pre-flight checks | 8 |
| `wave-orchestrator.sh` | `core/scripts/` | Coordinate wave execution | 9 |
| `pre-merge-validator.sh` | `core/scripts/` | Validate before merge | 9 |
| `post-deploy-validator.sh` | `core/scripts/` | Validate after deploy | 9 |

## Notification Scripts

| Script | Location | Purpose | Used In Step |
|--------|----------|---------|--------------|
| `slack-notify.sh` | `core/scripts/` | Send Slack messages | 9, ongoing |
| `supabase-report.sh` | `core/scripts/` | Log to Supabase | 9, ongoing |

## Safety Scripts

| Script | Location | Purpose | Used In Step |
|--------|----------|---------|--------------|
| `check-kill-switch.sh` | `core/scripts/` | Check for emergency stop | 9 |
| `safe-termination.sh` | `core/scripts/` | Graceful shutdown | Emergency |
| `safety-violation-detector.sh` | `core/scripts/` | Detect forbidden ops | 9 |

---

# DOCUMENT REFERENCE

| Document | Location | Purpose |
|----------|----------|---------|
| `CTO-MASTER-EXECUTION-PROTOCOL.md` | `/WAVE/` | My execution protocol |
| `WAVE-QUICKSTART.md` | `/WAVE/` | Human + CTO checklist |
| `WAVE-ARCHITECTURE.md` | `/WAVE/` | Full system architecture |
| `WAVE-PROCESS-GUIDE.md` | `/WAVE/` | Detailed process guide |
| `AI-PRD.md` | Project root | Technical requirements |
| `EXECUTION-PLAN.md` | Project root | Waves and domains |
| `CLAUDE.md` | Project root | Agent instructions |
| `.env.template` | `core/templates/` | Environment template |
| `docker-compose.template.yml` | `core/templates/` | Docker template |

---

# COMMAND QUICK REFERENCE

## What You Say to CTO Master

| Situation | You Say |
|-----------|---------|
| New project - validate plan | "Review the execution plan in [path]" |
| New project - connect systems | "Connect the systems" + credentials |
| New project - pre-flight | "Run pre-flight checks" |
| New project - start | "START" |
| Existing project - resume | "Continue work on [project]" |
| Existing project - start | "START" |
| Stop execution | "STOP" or create EMERGENCY-STOP file |
| Check status | "What's the status?" |
| Approve production | "Approved for production" |

---

**END OF WAVE STEP-BY-STEP PROCESS v1.0.0**
