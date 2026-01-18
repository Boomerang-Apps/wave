# WAVE Improvement Action Plan
## Post-POC Implementation Guide
### Date: 2026-01-17

---

## Key Takeaways

### 1. Infrastructure Must Be Validated BEFORE Launch
The CTO Master allowed launch without verifying critical infrastructure (storage bucket, database schema, Vercel env vars). This resulted in a broken production deployment.

### 2. Pre-Flight Gave False Confidence
"11/11 checks passed" meant nothing when critical checks weren't included. Pre-flight must validate what actually matters for the wave being executed.

### 3. Slack Notifications Were Non-Existent
The human operator had zero visibility into pipeline progress. No story notifications, no token tracking, no budget alerts. This violates the core WAVE principle of human oversight.

### 4. Worktree Sync Was Missing
QA validated an empty worktree because the merge step never happened. The pipeline architecture was broken at a fundamental level.

### 5. Wave Configuration Was Hardcoded
Docker compose only had Wave 1 & 2 agents. Wave 4 required manual edits mid-run. This is unacceptable for a production framework.

---

## Implementation Plan

### Phase 1: Critical Fixes (Before Next Test)

#### Action Item 1.1: Create Infrastructure Validator
**File:** `/Volumes/SSD-01/Projects/WAVE/core/scripts/validate-infrastructure.sh`

**Must Check:**
```bash
# Database
- [ ] Supabase connection (ping endpoint)
- [ ] Required tables exist (photos)
- [ ] Schema version matches expected

# Storage
- [ ] Storage bucket exists
- [ ] Bucket is public
- [ ] Upload test succeeds

# Vercel
- [ ] Environment variables set
- [ ] Deployment API accessible

# GitHub
- [ ] Repository accessible
- [ ] Can push to branch
```

**Success Criteria:** Script returns non-zero exit code if ANY check fails.

---

#### Action Item 1.2: Create Wave-Specific Pre-Flight
**File:** `/Volumes/SSD-01/Projects/WAVE/core/scripts/wave-preflight.sh`

**Must Check:**
```bash
# Wave Stories
- [ ] stories/wave${WAVE}/ directory exists
- [ ] At least 1 story JSON file present
- [ ] All story files are valid JSON
- [ ] Required fields present (id, title, files, acceptance_criteria)

# Docker Compose
- [ ] wave${WAVE}-fe-dev service defined
- [ ] wave${WAVE}-be-dev service defined
- [ ] wave${WAVE}-qa service defined
- [ ] Correct volume mounts
- [ ] Correct story paths in prompts

# Worktrees
- [ ] All worktrees exist
- [ ] All worktrees clean (no uncommitted changes)
- [ ] All worktrees synced with main branch

# Merge Watcher
- [ ] Script exists
- [ ] Configured for wave ${WAVE}
- [ ] Slack webhook configured
```

**Success Criteria:** Script blocks launch if any check fails.

---

#### Action Item 1.3: Create Launch Checklist Script
**File:** `/Volumes/SSD-01/Projects/WAVE/core/scripts/maf-launch.sh`

**Flow:**
```
1. Run infrastructure validator
   → FAIL: Exit with instructions
   → PASS: Continue

2. Run wave-specific pre-flight
   → FAIL: Exit with instructions
   → PASS: Continue

3. Display summary:
   - Wave number
   - Story count
   - Agent configuration
   - Budget limit
   - Terminal assignments

4. Wait for human input: "Type APPROVE to continue"
   → Anything else: Exit

5. Create start signal
6. Send Slack notification
7. Display terminal commands to run
```

---

#### Action Item 1.4: Fix Merge Watcher Sync
**File:** Update `merge-watcher-v11.2.sh`

**Add after Gate 3 signals detected:**
```bash
# When BOTH fe-complete and be-complete signals exist:

# 1. Commit fe-dev changes
git -C worktrees/fe-dev add -A
git -C worktrees/fe-dev commit -m "Wave ${WAVE} FE: Gate 3 complete"

# 2. Commit be-dev changes
git -C worktrees/be-dev add -A
git -C worktrees/be-dev commit -m "Wave ${WAVE} BE: Gate 3 complete"

# 3. Merge to main
git fetch origin main
git merge feature/fe-dev --no-edit -m "Merge Wave ${WAVE} FE"
git merge feature/be-dev --no-edit -m "Merge Wave ${WAVE} BE"

# 4. Update QA worktree
git -C worktrees/qa fetch origin main
git -C worktrees/qa reset --hard origin/main

# 5. Send Slack notification
slack_notify "Gate 3 Complete" "Worktrees synced, QA can proceed"

# 6. THEN trigger QA validation
```

---

#### Action Item 1.5: Implement Slack Notifications
**File:** `/Volumes/SSD-01/Projects/WAVE/core/scripts/lib/slack-notify.sh`

**Required Functions:**
```bash
slack_wave_start()      # Wave N starting, X stories, $Y budget
slack_story_start()     # Story X assigned to agent Y
slack_story_complete()  # Story X done, Z files, $W cost
slack_gate_transition() # Gate N complete, moving to Gate N+1
slack_qa_result()       # QA approved/rejected with details
slack_budget_warning()  # Budget at X% threshold
slack_wave_complete()   # Wave done, total cost, summary
slack_error()           # Something went wrong
```

**Integration Points:**
- Merge watcher: Call at each gate
- Agent prompts: Include callback instruction
- Pre-flight: Test webhook

---

#### Action Item 1.6: Dynamic Wave Configuration
**File:** Update `docker-compose-v11.2.yml`

**Change from hardcoded to template:**
```yaml
# Instead of wave1-fe-dev, wave2-fe-dev, etc.
# Use environment variable substitution:

wave-fe-dev:
  container_name: maf-wave${WAVE:-1}-fe-dev
  environment:
    - WAVE=${WAVE:-1}
  command: ["... Execute stories in /workspace/stories/wave${WAVE:-1}/ ..."]
```

**Or create:** `scripts/generate-compose.sh` that creates wave-specific compose file.

---

### Phase 2: Testing the Fixes

#### Test Plan for Wave 5

**Pre-Test Checklist:**
1. [ ] All Phase 1 scripts created
2. [ ] Scripts tested individually
3. [ ] New stories created for Wave 5
4. [ ] Infrastructure validated

**Test Execution:**
```bash
# Step 1: Validate infrastructure
./scripts/validate-infrastructure.sh
# Expected: ALL CHECKS PASSED

# Step 2: Configure wave
export WAVE=5
./scripts/wave-preflight.sh
# Expected: ALL CHECKS PASSED

# Step 3: Launch with approval
./scripts/maf-launch.sh
# Expected: Shows summary, waits for APPROVE

# Step 4: Terminal 2 - Merge Watcher
./scripts/merge-watcher-v11.2.sh --wave 5
# Expected: "Watching for Wave 5 signals..."

# Step 5: Terminal 3 - Agents
WAVE=5 docker compose -f docker-compose-v11.2.yml up wave-fe-dev wave-be-dev wave-qa
# Expected: Agents start and process Wave 5 stories

# Step 6: Monitor
# - Slack: Should receive notifications at each gate
# - Dozzle: Should show agent logs
# - QA: Should validate MERGED code
```

**Success Criteria:**
- [ ] Infrastructure validator caught any issues
- [ ] Pre-flight validated Wave 5 configuration
- [ ] Launch required human approval
- [ ] Slack received wave-start notification
- [ ] Slack received story notifications
- [ ] Merge watcher synced worktrees before QA
- [ ] QA validated correct (merged) code
- [ ] Slack received wave-complete notification
- [ ] Code pushed to GitHub
- [ ] Vercel deployed successfully
- [ ] App works (upload, gallery, new features)

---

### Phase 3: Documentation

#### Action Item 3.1: Update WAVE-STEP-BY-STEP.md
Add new pre-launch validation steps.

#### Action Item 3.2: Create CTO-CHECKLIST.md
Checklist for CTO Master before every launch.

#### Action Item 3.3: Update README
Document new scripts and launch process.

---

## Timeline

| Phase | Items | Target |
|-------|-------|--------|
| Phase 1 | Critical fixes (1.1-1.6) | Before next test |
| Phase 2 | Test with Wave 5 | After Phase 1 |
| Phase 3 | Documentation | After successful test |

---

## Ownership

| Item | Owner |
|------|-------|
| Infrastructure validator | CTO Master |
| Wave pre-flight | CTO Master |
| Launch script | CTO Master |
| Merge watcher fix | CTO Master |
| Slack notifications | CTO Master |
| Dynamic wave config | CTO Master |
| Wave 5 stories | Human Operator |
| Test execution | Joint |

---

## Definition of Done

The improvement plan is complete when:

1. [ ] All Phase 1 scripts created and tested
2. [ ] Wave 5 test executed successfully
3. [ ] Slack received all expected notifications
4. [ ] QA validated merged code (not empty worktree)
5. [ ] Production deployment works
6. [ ] Human operator confirms visibility was adequate
7. [ ] Documentation updated

---

*Action Plan Version: 1.0*
*Created: 2026-01-17*
*Status: Ready for Implementation*
