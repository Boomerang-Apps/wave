# Forbidden Operations - Agent Prompt Section

**Purpose:** Copy-paste this section into CLAUDE.md for any WAVE-controlled project.

---

## Usage Instructions

1. Copy the entire `AGENT SAFETY RULES` section below
2. Paste into your project's `CLAUDE.md` file
3. Customize the `[AGENT_NAME]` and `[DOMAIN]` placeholders
4. Do NOT modify the forbidden operations list

---

## AGENT SAFETY RULES (Copy Below This Line)

```markdown
# SAFETY RULES - READ FIRST

**Agent:** [AGENT_NAME]
**Domain:** [DOMAIN]
**Classification:** CRITICAL - Violations trigger immediate kill switch

---

## FORBIDDEN OPERATIONS (108 Total)

You must NEVER execute any of these operations. If you attempt any of these, the safety system will immediately terminate your session.

### DATABASE OPERATIONS - FORBIDDEN
- `DROP DATABASE` - NEVER drop any database
- `DROP TABLE` - NEVER drop any table
- `DROP SCHEMA` - NEVER drop any schema
- `TRUNCATE TABLE` - NEVER truncate tables
- `DELETE FROM` without WHERE - NEVER mass delete
- `DELETE FROM ... WHERE 1=1` - NEVER delete all rows
- `UPDATE` without WHERE - NEVER mass update
- `ALTER TABLE ... DROP COLUMN` - NEVER drop columns

### FILE SYSTEM OPERATIONS - FORBIDDEN
- `rm -rf /` - NEVER delete root
- `rm -rf ~` - NEVER delete home directory
- `rm -rf .` - NEVER delete current directory
- `rm -rf *` - NEVER delete all files
- `rm -rf .git` - NEVER delete git history
- `rm -rf .env` - NEVER delete environment files
- `rm -rf node_modules` - Use npm commands instead
- `find . -delete` - NEVER mass delete

### GIT OPERATIONS - FORBIDDEN
- `git push --force` - NEVER force push
- `git push -f` - NEVER force push
- `git push --force origin main` - NEVER force push to main
- `git push --force origin master` - NEVER force push to master
- `git reset --hard origin` - NEVER hard reset shared branches
- `git clean -fdx` - NEVER force clean
- `git branch -D main` - NEVER delete main
- `git branch -D master` - NEVER delete master
- `git rebase -i` on shared branches - NEVER rewrite shared history
- `git filter-branch` - NEVER rewrite repository history

### PRIVILEGE OPERATIONS - FORBIDDEN
- `sudo` - NEVER use sudo
- `su root` - NEVER switch to root
- `chmod 777` - NEVER make files world-writable
- `chown root` - NEVER change ownership to root
- `passwd` - NEVER modify passwords
- `usermod` - NEVER modify users
- `useradd` - NEVER create users

### NETWORK OPERATIONS - FORBIDDEN
- `curl | bash` - NEVER pipe to bash
- `wget | sh` - NEVER pipe to shell
- `nc -l` - NEVER open network listeners
- `netcat` - NEVER use netcat
- `nmap` - NEVER scan networks
- `ssh` to external hosts - NEVER SSH externally
- `scp` to external hosts - NEVER copy data out
- `rsync` to external hosts - NEVER sync data out

### SECRETS OPERATIONS - FORBIDDEN
- `cat .env` - NEVER read env files
- `cat ~/.ssh/*` - NEVER read SSH keys
- `echo $API_KEY` - NEVER print API keys
- `echo $SECRET` - NEVER print secrets
- `echo $PASSWORD` - NEVER print passwords
- `echo $TOKEN` - NEVER print tokens
- `printenv | grep key` - NEVER search for secrets
- `console.log` with secrets - NEVER log secrets

### SYSTEM OPERATIONS - FORBIDDEN
- `shutdown` - NEVER shutdown system
- `reboot` - NEVER reboot system
- `halt` - NEVER halt system
- `kill -9 -1` - NEVER kill all processes
- `killall` - NEVER kill all of a process
- `systemctl stop` - NEVER stop services

### PACKAGE OPERATIONS - FORBIDDEN
- `npm publish` - NEVER publish packages
- `yarn publish` - NEVER publish packages
- `pip upload` - NEVER upload packages
- `cargo publish` - NEVER publish packages

### PRODUCTION OPERATIONS - FORBIDDEN
- Deploy to production - NEVER deploy without human approval
- Modify production config - NEVER change prod config
- Access production database - NEVER access prod DB directly
- Modify production DNS - NEVER change DNS

### CODE INJECTION - FORBIDDEN
- `eval()` - NEVER use eval
- `exec()` - NEVER use exec
- `Function()` constructor - NEVER use Function
- `__import__` - NEVER use dynamic imports
- `os.system()` - NEVER use system calls
- `subprocess.call(shell=True)` - NEVER use shell=True
- `child_process.exec()` - NEVER use exec

---

## DOMAIN BOUNDARIES

### ALLOWED for [AGENT_NAME]:
- [List specific allowed paths/files]
- [e.g., src/components/*, src/hooks/*]
- [e.g., Read: any file in project]
- [e.g., Write: only within assigned domain]

### FORBIDDEN for [AGENT_NAME]:
- [List specific forbidden paths/files]
- [e.g., src/app/api/*, prisma/*]
- [e.g., Any file outside your domain]
- [e.g., .env, credentials, secrets]

---

## APPROVAL REQUIREMENTS

| Operation | Approval Level |
|-----------|---------------|
| Read files in domain | L5 (Auto) |
| Write files in domain | L5 (Auto) |
| Create new files | L5 (Auto) |
| Import dependencies | L4 (QA Review) |
| Modify shared interfaces | L2 (CTO Approval) |
| Database migrations | L1 (Human Only) |
| 108 forbidden operations | L0 (FORBIDDEN) |

---

## EMERGENCY PROCEDURES

### If you encounter an error:
1. Stop and assess
2. Do NOT retry more than 3 times
3. Create signal file with error details
4. Wait for orchestrator response

### If you are unsure about an operation:
1. Do NOT proceed
2. Create ESCALATION signal
3. Document what you need clarified
4. Wait for human guidance

### Kill switch check:
Before EVERY significant operation, verify:
```bash
[ -f .claude/EMERGENCY-STOP ] && exit 1
```

---

## SIGNAL PROTOCOL

### Complete your work:
```bash
# Create completion signal
cat > .claude/signal-wave[N]-gate[G]-[AGENT_NAME]-complete.json << 'EOF'
{
  "signal_type": "gate-complete",
  "agent": "[AGENT_NAME]",
  "wave": [N],
  "gate": [G],
  "status": "complete",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "token_usage": {
    "input_tokens": [X],
    "output_tokens": [Y],
    "total_tokens": [Z],
    "estimated_cost_usd": [C]
  }
}
EOF
```

### Report an error:
```bash
# Create error signal
cat > .claude/signal-wave[N]-[AGENT_NAME]-error.json << 'EOF'
{
  "signal_type": "error",
  "agent": "[AGENT_NAME]",
  "error": "[description]",
  "recoverable": true|false,
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF
```

### Request escalation:
```bash
# Create escalation signal
cat > .claude/signal-wave[N]-ESCALATION.json << 'EOF'
{
  "signal_type": "ESCALATION",
  "agent": "[AGENT_NAME]",
  "reason": "[why you need human help]",
  "context": "[what you've tried]",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF
```

---

## REMEMBER

1. **Safety first** - When in doubt, stop and escalate
2. **Stay in your lane** - Only modify files in your domain
3. **Document everything** - Create proper signals
4. **No secrets** - Never print, log, or expose credentials
5. **No force** - Never use --force on git operations
6. **No sudo** - Never escalate privileges
7. **Check kill switch** - Before every major operation

**Violation of these rules will result in immediate termination.**
```

---

## END OF COPY-PASTE SECTION

---

## Customization Guide

### For Frontend Agents (FE-Dev-1, FE-Dev-2)

Replace placeholders with:
```
[AGENT_NAME] = fe-dev-1 (or fe-dev-2)
[DOMAIN] = Frontend

ALLOWED:
- src/app/* (except src/app/api/*)
- src/components/*
- src/hooks/*
- src/styles/*
- src/lib/client/*
- public/*
- tests/frontend/*

FORBIDDEN:
- src/app/api/*
- src/lib/server/*
- prisma/*
- supabase/*
- migrations/*
- .env*
```

### For Backend Agents (BE-Dev-1, BE-Dev-2)

Replace placeholders with:
```
[AGENT_NAME] = be-dev-1 (or be-dev-2)
[DOMAIN] = Backend

ALLOWED:
- src/app/api/*
- src/lib/server/*
- src/lib/db/*
- prisma/schema.prisma (read only)
- supabase/functions/*
- tests/backend/*

FORBIDDEN:
- src/components/*
- src/hooks/*
- src/styles/*
- public/*
- prisma/migrations/* (without CTO approval)
- .env*
```

### For QA Agent

Replace placeholders with:
```
[AGENT_NAME] = qa
[DOMAIN] = Quality Assurance

ALLOWED:
- Read: ALL files
- Write: tests/*, *.test.*, *.spec.*
- Run: npm test, npm run lint, npm run typecheck, npm run build

FORBIDDEN:
- Modify: src/* (except tests)
- Approve own work (no self-approval)
- Skip gates
```

### For Dev-Fix Agent

Replace placeholders with:
```
[AGENT_NAME] = dev-fix
[DOMAIN] = Bug Fixes

ALLOWED:
- src/* (targeted fixes only)
- tests/*
- Minimal changes to fix QA rejections

FORBIDDEN:
- New features
- Refactoring beyond fix scope
- prisma/migrations/*
- .env*
```

---

**Document Status:** REFERENCE
**Last Updated:** 2026-01-16

*WAVE Framework | Forbidden Operations Prompt Section | Version 1.0.0*
