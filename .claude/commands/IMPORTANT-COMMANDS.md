# ⭐ Important Commands - Quick Reference

**CTO's Essential WAVE Workflow Commands**

This is your command cheat sheet organized by workflow stage. Use these commands in order for optimal results.

---

## 🚀 BEFORE STARTING A WAVE/STORY

### Pre-Flight Checks (CRITICAL - Always Run First)

```bash
/wave-status                    # Check current wave progress & story states
/status                         # System health check (Redis, DB, Git)
/keys                          # Validate credentials & environment variables
/gate-0 story WAVE-P1-001      # Pre-flight authorization (CTO approval)
```

**CTO Recommendation:**
- **NEVER skip /gate-0** - This is your authorization gate
- Always run `/wave-status` to understand current state
- Check `/status` to ensure all dependencies are healthy
- Validate environment with `/keys` before any autonomous work

### Story Analysis & Planning

```bash
/story analyze WAVE-P1-001     # Deep story analysis (ACs, files, tests)
/prd validate story-id.json    # Validate story against schema V4.2
/research WAVE-P1-001          # Validate research requirements (PFC-K)
/hazard analyze WAVE-P1-001    # Identify potential hazards
```

**CTO Recommendation:**
- Run `/story analyze` to understand scope BEFORE coding
- Use `/hazard` for P0/P1 stories (safety-critical)
- `/research` validates that story has adequate background

### Branch & Environment Setup

```bash
/branch create WAVE-P1-001     # Create feature branch (follows naming convention)
/docker status                 # Check container health
/rlm budget check              # Verify token budget available
```

---

## 💻 DURING DEVELOPMENT

### Active Development Cycle

```bash
/tdd                           # Start TDD cycle (Red-Green-Refactor)
/test unit                     # Run unit tests for current work
/build                         # Validate build (no breaking changes)
/commit                        # Standardized git commit with co-author
```

**CTO Recommendation:**
- Use `/tdd` workflow for all new features
- Commit frequently with `/commit` (includes proper attribution)
- Run `/build` before any commit to catch issues early
- Keep commits atomic and focused

### Gates During Development (Run in Order)

```bash
/gate-1 story WAVE-P1-001      # Self-verification (agent checks own work)
/gate-2 story WAVE-P1-001      # Build verification
/gate-3 story WAVE-P1-001      # Test verification (coverage check)
```

**CTO Recommendation:**
- Gates 1-3 can run **during development** to catch issues early
- Don't wait until story is "done" - run gates incrementally
- If gate fails, fix immediately before proceeding

### Code Quality & Safety Checks

```bash
/safety check action.txt       # Constitutional AI safety check
/security scan                 # Security vulnerability scan
/a11y check                    # Accessibility audit
/harden tests                  # Test quality hardening
```

**CTO Recommendation:**
- Run `/safety` for any destructive or sensitive operations
- `/security` is mandatory before merge (Gate 7)
- Use `/harden tests` to improve test quality metrics

### Real-Time Monitoring

```bash
/rlm status                    # Token usage & budget tracking
/trace view WAVE-P1-001        # View traceability matrix
/wave-status                   # Progress dashboard
```

---

## ✅ WHEN AGENT FINISHES STORY

### Completion Verification (CRITICAL - Run ALL Gates)

```bash
/gate-4 story WAVE-P1-001      # QA acceptance testing
/gate-5 story WAVE-P1-001      # PM validation (requirements met)
/gate-6 story WAVE-P1-001      # Architecture review (CTO)
/gate-7 story WAVE-P1-001      # Merge authorization (FINAL)
```

**CTO Recommendation:**
- **ALL 8 GATES MUST PASS** (Gates 0-7)
- Never skip gates - they exist for quality & safety
- Gates 4-7 are human checkpoints in Level 1-3 autonomy
- Gate 7 is the final merge authorization - double-check everything

### Pre-Merge Validation

```bash
/test                          # Full test suite with coverage
/ci                           # CI/CD pipeline validation
/branch-health                # Branch health analysis
/protocol-verify              # Wave V2 compliance verification
```

**CTO Recommendation:**
- `/test` should show 0 failures and coverage > target
- `/ci` simulates what will run in CI/CD
- `/protocol-verify` ensures Wave V2 compliance

### Story Completion

```bash
/done story WAVE-P1-001        # Mark story complete & update signals
/story-audit WAVE-P1-001       # Post-completion schema compliance audit
/report generate WAVE-P1-001   # Generate completion report
```

**CTO Recommendation:**
- `/done` creates completion signal and updates traceability
- `/story-audit` validates schema V4.2 compliance
- Keep completion reports for project retrospectives

### Pull Request Creation

```bash
/pr create WAVE-P1-001         # Create PR with summary & test plan
/git status                    # Verify clean working directory
```

**CTO Recommendation:**
- `/pr` automatically generates PR description from story
- Review PR checklist before submitting
- Ensure all gates show ✅ in PR description

---

## 🎯 CTO'S RECOMMENDED WORKFLOWS

### Minimal Workflow (Small Stories - 3-5 pts)

```bash
# Before
/wave-status && /gate-0 story WAVE-P1-001

# During
/tdd && /test unit && /commit

# After
/gate-1 && /gate-2 && /gate-3 && /gate-4 && /gate-5 && /gate-6 && /gate-7
/test && /done story WAVE-P1-001
```

### Standard Workflow (Medium Stories - 5-13 pts)

```bash
# Before
/wave-status
/status
/gate-0 story WAVE-P1-001
/story analyze WAVE-P1-001
/branch create WAVE-P1-001

# During (iterative)
/tdd
/test unit
/safety check
/commit
/gate-1 && /gate-2 && /gate-3  # Early gates during development

# After
/test                          # Full suite
/gate-4 && /gate-5 && /gate-6  # Human review gates
/security scan
/gate-7                        # Final authorization
/pr create WAVE-P1-001
/done story WAVE-P1-001
```

### Comprehensive Workflow (Large Stories - 13-21 pts, P0/P1)

```bash
# Before (Extended Pre-Flight)
/wave-status
/status
/keys
/gate-0 story WAVE-P1-001
/story analyze WAVE-P1-001
/prd validate WAVE-P1-001.json
/research WAVE-P1-001
/hazard analyze WAVE-P1-001    # Critical for P0/P1
/branch create WAVE-P1-001
/rlm budget check

# During (Strict Quality Gates)
/tdd                           # TDD mandatory for P0/P1
/test unit
/build
/safety check
/commit
/gate-1 && /gate-2 && /gate-3  # Run early, fix issues immediately

# After (Full Validation)
/test coverage                 # Verify coverage targets
/test integration              # Integration tests
/harden tests                  # Test quality hardening
/gate-4                        # QA acceptance
/gate-5                        # PM validation
/a11y check                    # Accessibility (if UI)
/security scan                 # Security mandatory
/gate-6                        # Architecture review
/protocol-verify               # Wave V2 compliance
/ci                           # CI/CD simulation
/branch-health                 # Branch health check
/gate-7                        # Final merge authorization
/pr create WAVE-P1-001
/story-audit WAVE-P1-001       # Post-completion audit
/report generate WAVE-P1-001   # Documentation
/done story WAVE-P1-001
```

---

## 🚨 Emergency & Troubleshooting Commands

### Emergency Stop & Recovery

```bash
/emergency-stop                # Halt all execution immediately (<5s)
/rollback to checkpoint-id     # Rollback to previous checkpoint
/escalate reason "..."         # Escalate to human immediately
```

### Troubleshooting

```bash
/fix investigate issue         # Research-driven fix protocol
/debug analyze error.txt       # Debug analysis
/gap-analysis                  # Identify missing requirements
/anomaly report               # Report unexpected behavior
```

**CTO Recommendation:**
- Use `/emergency-stop` if anything feels unsafe
- `/escalate` for budget overruns, security concerns, or uncertainty
- `/fix` is your research-driven debugging assistant

---

## 📊 Monitoring & Reporting Commands

### Progress Tracking

```bash
/wave-status                   # Overall wave progress dashboard
/trace view WAVE-P1-001        # Traceability matrix
/rlm status                    # Token usage & cost tracking
```

### Quality Metrics

```bash
/test coverage                 # Coverage report
/branch-health                # Branch quality metrics
/design-verify                # Design-to-code validation (UI)
```

### Documentation & Reporting

```bash
/report generate WAVE-P1-001   # Progress report
/handoff create               # Session handoff document
/story-audit WAVE-P1-001      # Schema compliance audit
```

---

## 🎓 CTO's Golden Rules

### Rule 1: Always Run Gates in Order
```
Gate 0 → Gate 1 → Gate 2 → Gate 3 → Gate 4 → Gate 5 → Gate 6 → Gate 7
```
**Never skip. Never reorder. Each gate builds on the previous.**

### Rule 2: Commit Frequently
```bash
/test unit && /build && /commit   # After each meaningful change
```
**Small, atomic commits are easier to review and revert.**

### Rule 3: Test Before Merge
```bash
/test && /test integration        # Before requesting Gate 7
```
**Zero test failures. Coverage must exceed target.**

### Rule 4: Safety First
```bash
/safety check                     # Before any destructive operation
/hazard analyze                   # For all P0/P1 stories
```
**When in doubt, escalate. Never compromise safety.**

### Rule 5: Document Everything
```bash
/done && /story-audit && /report  # After story completion
```
**Traceability matters. Future you will thank present you.**

---

## 📌 Quick Command Reference Card

**Print this out or keep visible:**

```
┌────────────────────────────────────────────────────────────────┐
│ WAVE WORKFLOW COMMAND CARD                                     │
├────────────────────────────────────────────────────────────────┤
│ BEFORE:  /wave-status → /status → /gate-0 → /branch create    │
│ DURING:  /tdd → /test unit → /commit → /gates 1-3             │
│ AFTER:   /test → /gates 4-7 → /pr create → /done              │
│                                                                │
│ EMERGENCY: /emergency-stop | /escalate | /rollback            │
│ HELP:      /commands | /help | /cto                           │
└────────────────────────────────────────────────────────────────┘
```

---

## 💡 Pro Tips from Your CTO

1. **Front-load quality:** Run `/gate-1` through `/gate-3` DURING development, not after. Catch issues early.

2. **Checkpoint frequently:** Every gate creates a checkpoint. Use them for recovery.

3. **Budget awareness:** Check `/rlm status` regularly. Token overruns delay projects.

4. **Human checkpoints:** In Level 1-3 autonomy, Gates 4-7 pause for human review. Be ready to approve/reject.

5. **Batch commands:** You can chain commands with `&&`:
   ```bash
   /test unit && /build && /commit && /gate-1 && /gate-2 && /gate-3
   ```

6. **Story analysis first:** Always `/story analyze` before coding. Understanding scope prevents scope creep.

7. **Safety is not optional:** Constitutional AI checks are your safety net. Use them.

8. **Document as you go:** Don't wait until the end. `/commit` messages are documentation.

9. **Trust but verify:** Even autonomous agents need verification. That's what gates are for.

10. **When stuck, escalate:** `/escalate` is not failure - it's good judgment.

---

## 📚 Related Documentation

- **Full Command Reference:** `.claude/commands/COMMANDS-REFERENCE.md`
- **Wave V2 Protocol:** See `/commands` for complete list
- **Gate Definitions:** Each gate has detailed documentation (`/gate-0` through `/gate-7`)
- **Story Schema:** `planning/schemas/story-schema-v4.2.json`
- **CTO Analysis:** Run `/cto` for strategic analysis and recommendations

---

**Last Updated:** 2026-02-10
**Schema Version:** 4.2
**Wave Version:** V2 (Aerospace Safety Protocol)

---

*Remember: Quality over speed. Safety over shortcuts. Documentation over assumptions.*

**Your CTO** 🎯
