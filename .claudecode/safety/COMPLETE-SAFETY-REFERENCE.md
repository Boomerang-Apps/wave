# WAVE Framework - Complete Safety Reference

**Version:** 1.0.0
**Classification:** CRITICAL - All agents MUST comply
**Total Forbidden Operations:** 108
**Source:** MAF V11.0.0 Safety Protocol (Adapted for WAVE)

---

## Document Hierarchy

| Priority | Document | Purpose |
|----------|----------|---------|
| 1 | **This Document** | Complete 108 forbidden operations |
| 2 | SAFETY-POLICY.md | General safety principles |
| 3 | FMEA.md | Failure modes and mitigations |
| 4 | APPROVAL-LEVELS.md | L0-L5 approval matrix |
| 5 | EMERGENCY-LEVELS.md | E1-E5 emergency responses |

---

## Safety Philosophy

> "Safety must be enforced externally, not requested. Telling agents 'DO NOT exceed budget' doesn't work. External kill switch, stuck detection, and budget limits DO work."

### Key Principles

1. **Defense in Depth** - Multiple layers of protection
2. **Fail Safe** - When in doubt, stop and escalate
3. **Human in the Loop** - Critical operations require approval
4. **Reversibility First** - Every action must be undoable
5. **Minimal Privilege** - Agents only access what they need

---

# FORBIDDEN OPERATIONS (108 Total)

## CATEGORY A: DATABASE DESTRUCTION (12 operations)

| # | Command Pattern | Risk | Why Forbidden |
|---|----------------|------|---------------|
| A1 | `DROP DATABASE [any]` | Data Loss | Destroys entire database |
| A2 | `DROP TABLE [any]` | Data Loss | Destroys table and all data |
| A3 | `DROP SCHEMA [any]` | Data Loss | Destroys schema and contents |
| A4 | `DROP INDEX [any]` | Performance | Can cripple queries |
| A5 | `TRUNCATE TABLE [any]` | Data Loss | Deletes all rows instantly |
| A6 | `TRUNCATE [any]` | Data Loss | Same as above |
| A7 | `DELETE FROM [table]` (no WHERE) | Data Loss | Mass deletion |
| A8 | `DELETE FROM [table] WHERE 1=1` | Data Loss | Mass deletion pattern |
| A9 | `DELETE FROM [table] WHERE true` | Data Loss | Mass deletion pattern |
| A10 | `UPDATE [table] SET ...` (no WHERE) | Data Corruption | Mass update |
| A11 | `ALTER TABLE ... DROP COLUMN` | Data Loss | Column data lost |
| A12 | `ALTER TABLE ... DROP CONSTRAINT` | Data Integrity | Breaks referential integrity |

**Detection:** Stop if SQL starts with `DROP`, `TRUNCATE`, or has `DELETE`/`UPDATE` without specific `WHERE` clause.

---

## CATEGORY B: FILE SYSTEM DESTRUCTION (14 operations)

| # | Command Pattern | Risk | Why Forbidden |
|---|----------------|------|---------------|
| B1 | `rm -rf /` | System Destruction | Destroys entire filesystem |
| B2 | `rm -rf ~` | Data Loss | Destroys home directory |
| B3 | `rm -rf .` | Data Loss | Destroys current directory |
| B4 | `rm -rf *` | Data Loss | Destroys all files |
| B5 | `rm -rf /*` | System Destruction | Destroys root contents |
| B6 | `rm -r /` (any variation) | System Destruction | Same as above |
| B7 | `rm -rf /home` | Data Loss | Destroys all users |
| B8 | `rm -rf /var` | System Destruction | Destroys system data |
| B9 | `rm -rf node_modules/` (in root) | Build Break | Must use npm clean |
| B10 | `rm -rf .git` | History Loss | Destroys version control |
| B11 | `rm -rf .env*` | Security Risk | Destroys configuration |
| B12 | `unlink /[critical-path]` | Data Loss | Destroys critical files |
| B13 | `rmdir --ignore-fail-on-non-empty /` | System Destruction | Force delete |
| B14 | `find . -delete` (without specific path) | Data Loss | Mass deletion |

**Also Forbidden Without Approval:**
- `rm -rf` with any path containing `..`
- `rm` with `-f` flag on multiple files
- Any recursive delete outside agent's domain

---

## CATEGORY C: GIT DESTRUCTION (11 operations)

| # | Command Pattern | Risk | Why Forbidden |
|---|----------------|------|---------------|
| C1 | `git push --force` | History Loss | Overwrites shared history |
| C2 | `git push -f` | History Loss | Same as above |
| C3 | `git push origin main --force` | History Loss | Destroys main branch |
| C4 | `git push --force-with-lease` (to main) | History Loss | Even lease is dangerous |
| C5 | `git reset --hard origin/main` (on shared) | Code Loss | Destroys local changes |
| C6 | `git clean -fdx` (in root) | Data Loss | Removes all untracked |
| C7 | `git branch -D main` | Branch Loss | Deletes main branch |
| C8 | `git branch -D master` | Branch Loss | Deletes master branch |
| C9 | `git branch --delete --force [protected]` | Branch Loss | Force deletes branch |
| C10 | `git rebase -i` (on shared branch) | History Corruption | Rewrites history |
| C11 | `git filter-branch` | History Corruption | Rewrites entire history |

**Protected Branches (NEVER force push):**
- `main`, `master`, `develop`, `production`, `staging`

---

## CATEGORY D: PRIVILEGE ESCALATION (10 operations)

| # | Command Pattern | Risk | Why Forbidden |
|---|----------------|------|---------------|
| D1 | `sudo [any command]` | Security | Bypasses permissions |
| D2 | `su [any user]` | Security | Switches user context |
| D3 | `chmod 777 [any path]` | Security | World-writable files |
| D4 | `chmod -R 777` | Security | Recursive world-writable |
| D5 | `chown root [any]` | Security | Changes to root ownership |
| D6 | `chown -R [any system path]` | Security | Mass ownership change |
| D7 | `passwd` | Security | Password modification |
| D8 | `usermod` | Security | User modification |
| D9 | `useradd` | Security | User creation |
| D10 | `visudo` | Security | Sudo configuration |

---

## CATEGORY E: NETWORK & EXTERNAL (10 operations)

| # | Command Pattern | Risk | Why Forbidden |
|---|----------------|------|---------------|
| E1 | `curl [untrusted URL]` | Security | Data exfiltration |
| E2 | `wget [untrusted URL]` | Security | Malicious downloads |
| E3 | `curl \| bash` | Security | Remote code execution |
| E4 | `wget \| sh` | Security | Remote code execution |
| E5 | `curl -o- [URL] \| bash` | Security | Remote code execution |
| E6 | `nc [any]` (netcat) | Security | Network backdoor |
| E7 | `netcat [any]` | Security | Network backdoor |
| E8 | `ssh [external]` | Security | External access |
| E9 | `scp [to external]` | Data Exfiltration | Data transfer out |
| E10 | `rsync [to external]` | Data Exfiltration | Data sync out |

**Allowed Package Registries:**
- `registry.npmjs.org`
- `pypi.org`
- `github.com` (for dependencies only)

---

## CATEGORY F: SECRETS & CREDENTIALS (13 operations)

| # | Command Pattern | Risk | Why Forbidden |
|---|----------------|------|---------------|
| F1 | `cat ~/.ssh/*` | Security | Exposes SSH keys |
| F2 | `cat ~/.env` | Security | Exposes secrets |
| F3 | `cat .env` | Security | Exposes secrets |
| F4 | `cat .env.*` | Security | Exposes secrets |
| F5 | `cat */secrets/*` | Security | Exposes secrets |
| F6 | `cat */credentials/*` | Security | Exposes credentials |
| F7 | `cat */.aws/*` | Security | Exposes AWS keys |
| F8 | `echo $API_KEY` | Security | Prints secrets |
| F9 | `echo $SECRET` | Security | Prints secrets |
| F10 | `printenv \| grep -i key` | Security | Finds secrets |
| F11 | `printenv \| grep -i secret` | Security | Finds secrets |
| F12 | `printenv \| grep -i password` | Security | Finds passwords |
| F13 | `env \| grep -i token` | Security | Finds tokens |

**NEVER:**
- Print secrets to console
- Commit secrets to git
- Include secrets in error messages
- Log API keys or tokens

---

## CATEGORY G: SYSTEM DAMAGE (10 operations)

| # | Command Pattern | Risk | Why Forbidden |
|---|----------------|------|---------------|
| G1 | `shutdown` | Availability | Stops system |
| G2 | `reboot` | Availability | Restarts system |
| G3 | `halt` | Availability | Halts system |
| G4 | `init 0` | Availability | Shutdown |
| G5 | `init 6` | Availability | Reboot |
| G6 | `kill -9 -1` | Availability | Kills all processes |
| G7 | `killall` | Availability | Mass process kill |
| G8 | `pkill [system process]` | Availability | System process kill |
| G9 | `systemctl stop [critical]` | Availability | Stops critical service |
| G10 | `service [critical] stop` | Availability | Stops critical service |

---

## CATEGORY H: PACKAGE PUBLISHING (6 operations)

| # | Command Pattern | Risk | Why Forbidden |
|---|----------------|------|---------------|
| H1 | `npm publish` | Supply Chain | Public package release |
| H2 | `yarn publish` | Supply Chain | Public package release |
| H3 | `pip upload` | Supply Chain | Public package release |
| H4 | `twine upload` | Supply Chain | Python package release |
| H5 | `gem push` | Supply Chain | Ruby package release |
| H6 | `cargo publish` | Supply Chain | Rust package release |

---

## CATEGORY I: PRODUCTION OPERATIONS (8 operations)

| # | Operation | Risk | Why Forbidden |
|---|-----------|------|---------------|
| I1 | Deploy to production | User Impact | Affects real users |
| I2 | Modify production config | Availability | Can cause outages |
| I3 | Update production env vars | Security | Credential exposure |
| I4 | Change production API keys | Security | Service disruption |
| I5 | Production database access | Data Integrity | Real data at risk |
| I6 | Modify production DNS | Availability | Service unreachable |
| I7 | Update SSL certificates | Security | HTTPS failures |
| I8 | Cloud resource creation/deletion | Cost/Availability | Billing and outages |

---

## CATEGORY J: DOMAIN BOUNDARY VIOLATIONS (14 operations)

| # | Operation | Risk | Why Forbidden |
|---|-----------|------|---------------|
| J1 | Modify files outside assigned domain | Code Ownership | Conflicts, confusion |
| J2 | Delete files in other domain | Code Ownership | Breaking others' work |
| J3 | Commit to other agent's branch | Git Hygiene | Branch pollution |
| J4 | Approve own code (no self-approval) | QA Integrity | No independent review |
| J5 | Skip gates | Quality | Bypasses validation |
| J6 | Merge without QA approval | Quality | Untested code |
| J7 | Merge without PM approval | Process | Unreviewed changes |
| J8 | Push directly to main | Git Safety | No review |
| J9 | Revert other agent's commits | Coordination | Must request |
| J10 | Modify shared contracts without approval | Architecture | Breaking changes |
| J11 | Create migrations without CTO approval | Database | Schema changes |
| J12 | Install dependencies without QA review | Security | Supply chain |
| J13 | Exceed token budget | Cost | Budget overrun |
| J14 | Continue after stuck detection | Efficiency | Wasted resources |

---

# SUMMARY TABLE

| Category | Count | Examples |
|----------|-------|----------|
| A: Database Destruction | 12 | DROP, DELETE, TRUNCATE |
| B: File System Destruction | 14 | rm -rf, unlink |
| C: Git Destruction | 11 | force push, branch delete |
| D: Privilege Escalation | 10 | sudo, chmod 777 |
| E: Network & External | 10 | curl \| bash, ssh external |
| F: Secrets & Credentials | 13 | cat .env, echo $SECRET |
| G: System Damage | 10 | shutdown, kill -9 -1 |
| H: Package Publishing | 6 | npm publish |
| I: Production Operations | 8 | deploy, config change |
| J: Domain Boundary | 14 | cross-domain, self-approval |
| **TOTAL** | **108** | All require human approval or are FORBIDDEN |

---

# DETECTION REGEX PATTERNS

Use these patterns in `safety-violation-detector.sh`:

```bash
FORBIDDEN_PATTERNS=(
    # Category A: Database
    "DROP\\s+(DATABASE|TABLE|SCHEMA|INDEX)"
    "TRUNCATE\\s+TABLE"
    "TRUNCATE\\s+[a-z_]+"
    "DELETE\\s+FROM\\s+[a-z_]+\\s*$"
    "DELETE\\s+FROM\\s+[a-z_]+\\s+WHERE\\s+1\\s*=\\s*1"
    "DELETE\\s+FROM\\s+[a-z_]+\\s+WHERE\\s+true"
    "UPDATE\\s+[a-z_]+\\s+SET.*WHERE\\s+1\\s*=\\s*1"
    "ALTER\\s+TABLE.*DROP\\s+COLUMN"
    "ALTER\\s+TABLE.*DROP\\s+CONSTRAINT"

    # Category B: File System
    "rm\\s+-rf\\s+/"
    "rm\\s+-rf\\s+~"
    "rm\\s+-rf\\s+\\."
    "rm\\s+-rf\\s+\\*"
    "rm\\s+-rf\\s+/\\*"
    "rm\\s+-r\\s+/"
    "rm\\s+-rf\\s+/home"
    "rm\\s+-rf\\s+/var"
    "rm\\s+-rf\\s+/etc"
    "rm\\s+-rf\\s+\\.git"
    "rm\\s+-rf\\s+\\.env"
    "rmdir.*--ignore-fail-on-non-empty"
    "find.*-delete"
    "unlink\\s+/"

    # Category C: Git
    "git\\s+push\\s+--force"
    "git\\s+push\\s+-f"
    "git\\s+push.*origin\\s+(main|master).*--force"
    "git\\s+push.*--force-with-lease.*main"
    "git\\s+reset\\s+--hard.*origin"
    "git\\s+clean\\s+-fdx"
    "git\\s+branch\\s+-D\\s+(main|master)"
    "git\\s+branch.*--delete.*--force"
    "git\\s+rebase\\s+-i"
    "git\\s+filter-branch"
    "git\\s+checkout\\s+--\\s+\\."

    # Category D: Privilege
    "sudo\\s+"
    "su\\s+(root|-)"
    "chmod\\s+777"
    "chmod\\s+-R\\s+777"
    "chown\\s+root"
    "chown\\s+-R.*/"
    "passwd"
    "usermod"
    "useradd"
    "visudo"

    # Category E: Network
    "curl.*\\|.*bash"
    "wget.*\\|.*sh"
    "curl\\s+-o-.*\\|.*bash"
    "nc\\s+-l"
    "netcat"
    "nmap"
    "ssh\\s+[^@]*@[^l]"
    "scp.*@.*:"
    "rsync.*@.*:"

    # Category F: Secrets
    "cat\\s+~/.ssh"
    "cat\\s+\\.env"
    "cat\\s+\\*/secrets"
    "cat\\s+\\*/credentials"
    "cat\\s+\\*/.aws"
    "echo\\s+\\$[A-Z_]*KEY"
    "echo\\s+\\$[A-Z_]*SECRET"
    "echo\\s+\\$[A-Z_]*PASSWORD"
    "echo\\s+\\$[A-Z_]*TOKEN"
    "echo\\s+\\$ANTHROPIC"
    "echo\\s+\\$SUPABASE"
    "printenv.*grep.*-i.*(key|secret|password|token)"
    "env.*grep.*-i.*(key|secret|password|token)"
    "console\\.log.*KEY"
    "console\\.log.*SECRET"
    "print.*API.?KEY"

    # Category G: System
    "shutdown"
    "reboot"
    "halt"
    "init\\s+[06]"
    "kill\\s+-9\\s+-1"
    "killall"
    "pkill\\s+-9"
    "systemctl\\s+stop"
    "service.*stop"

    # Category H: Publishing
    "npm\\s+publish"
    "yarn\\s+publish"
    "pip\\s+upload"
    "twine\\s+upload"
    "gem\\s+push"
    "cargo\\s+publish"

    # Category I: Production
    "deploy.*prod"
    "production.*deploy"
    "prod.*config.*change"
    "UPDATE.*prod"

    # Category J: Domain Boundary
    "eval\\("
    "exec\\("
    "__import__"
    "os\\.system"
    "subprocess\\.call.*shell=True"
    "crypto.*mine"
    "xmrig"
    "bitcoin"
    "monero"
)
```

---

# ENFORCEMENT

This protocol is enforced by:

1. **CLAUDE.md** - Included in every agent prompt
2. **safety-violation-detector.sh** - Real-time monitoring
3. **workspace-validator.sh** - Gate 0.5 boundary check
4. **pre-flight-validator.sh** - Pre-flight validation
5. **Kill switch** - Terminates on violation

**Trust-based safety does NOT work. External enforcement is REQUIRED.**

---

# CROSS-REFERENCE

| Related Document | Purpose |
|-----------------|---------|
| SAFETY-POLICY.md | High-level safety principles |
| FMEA.md | 17 failure modes with mitigations |
| APPROVAL-LEVELS.md | L0-L5 approval matrix |
| EMERGENCY-LEVELS.md | E1-E5 emergency responses |
| safety-violation-detector.sh | Runtime detection |
| workspace-validator.sh | Domain boundary validation |

---

**Document Status:** LOCKED
**Last Updated:** 2026-01-16
**Adapted From:** MAF V11.0.0 SAFETY-PROTOCOL.md

*WAVE Framework | Complete Safety Reference | 108 Forbidden Operations*
