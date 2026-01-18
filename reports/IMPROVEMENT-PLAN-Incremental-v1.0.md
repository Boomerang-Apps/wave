# WAVE INCREMENTAL IMPROVEMENT PLAN

**Version:** 1.0
**Date:** 2026-01-17
**Baseline:** V10.0.7 (Verified Working)
**Philosophy:** Test each increment before proceeding

---

## GUIDING PRINCIPLES

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     AEROSPACE-GRADE DEVELOPMENT RULES                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  1. NEVER break what works                                                  │
│     └─ V10.0.7 is the foundation - preserve it                              │
│                                                                              │
│  2. ONE increment at a time                                                 │
│     └─ Add one feature, test, verify, then move on                          │
│                                                                              │
│  3. TEST BEFORE TRUST                                                       │
│     └─ Each increment must pass verification test                           │
│                                                                              │
│  4. ROLLBACK READY                                                          │
│     └─ Can always return to V10.0.7 if increment fails                      │
│                                                                              │
│  5. DOCUMENT AS YOU GO                                                      │
│     └─ Update retrospective after each increment                            │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## INCREMENT OVERVIEW

| # | Increment | Priority | Complexity | Test Type |
|---|-----------|----------|------------|-----------|
| 1 | Token Tracking | CRITICAL | Medium | 1-wave run |
| 2 | Slack Cost Display | HIGH | Low | 1-wave run |
| 3 | Budget Enforcement | CRITICAL | Medium | Budget limit test |
| 4 | Dynamic Wave Selection | HIGH | Low | Multi-wave run |
| 5 | Supabase Event Logging | MEDIUM | Medium | Query validation |
| 6 | Post-Deploy Validator | MEDIUM | Low | Failure injection |
| 7 | Dozzle Integration | LOW | Trivial | Visual check |
| 8 | Emergency Levels E1-E3 | LOW | Medium | Trigger test |

---

## INCREMENT 1: TOKEN TRACKING

### Objective
Track actual token usage (input/output) and calculate real costs per agent.

### Current State
```
merge-watcher.log shows:
💰 *Cost:* $0.0000 | 📥 0 in | 📤 0 out
```

### Target State
```
merge-watcher.log shows:
💰 *Cost:* $0.47 | 📥 12,450 in | 📤 3,892 out
```

### Implementation Approach

**Option A: Claude Code `--output-format stream-json` parsing**
- Already using `--output-format stream-json`
- Parse JSON output for token counts
- Calculate cost: (input_tokens × $0.015/1K) + (output_tokens × $0.075/1K) for Opus 4.5

**Option B: Anthropic API usage callback**
- Use Anthropic API's usage callback mechanism
- More accurate but requires API integration

### Recommended: Option A (simpler, uses existing output)

### Changes Required

1. **merge-watcher-v11.2.sh**
   - Parse agent container output for token counts
   - Maintain running totals per wave
   - Calculate costs using Opus 4.5 pricing

2. **docker-compose.yml**
   - Ensure `--output-format stream-json` is present (already is)

### Verification Test

```bash
# Test: Run 1 wave only
WAVE=1 docker compose -f docker-compose.yml up wave1-cto wave1-pm wave1-fe-dev wave1-qa

# Expected: merge-watcher shows non-zero costs
# Pass criteria: Cost > $0.00 for each agent
```

### Success Criteria
- [ ] Each agent shows token count > 0
- [ ] Each agent shows cost > $0.00
- [ ] Total wave cost is sum of agents
- [ ] Cost appears in Slack notification

### Rollback
If fails, revert to V10.0.7 merge-watcher (no code changes to agents).

---

## INCREMENT 2: SLACK COST DISPLAY

### Objective
Include token costs in every Slack notification.

### Current State
```
Slack: ✅ *Wave 1 QA Approved*
Proceeding to Gate 7 (Final Review)
```

### Target State
```
Slack: ✅ *Wave 1 QA Approved*

*Agent:* wave1-qa
*Duration:* 3m 42s
*Cost:* $0.12 (2,145 in / 892 out)

Proceeding to Gate 7 (Final Review)
```

### Implementation

1. **merge-watcher-v11.2.sh**
   - Update `notify_slack()` to include cost parameter
   - Add cost fields to Slack Block Kit format

2. **Slack message template**
```json
{
  "blocks": [
    {"type": "header", "text": {"type": "plain_text", "text": "✅ Wave 1 QA Approved"}},
    {"type": "section", "fields": [
      {"type": "mrkdwn", "text": "*Agent:* wave1-qa"},
      {"type": "mrkdwn", "text": "*Gate:* 4"},
      {"type": "mrkdwn", "text": "*Cost:* $0.12"},
      {"type": "mrkdwn", "text": "*Duration:* 3m 42s"}
    ]}
  ]
}
```

### Verification Test

```bash
# Test: Run 1 wave, check Slack
# Pass criteria: Slack message shows cost in dollars
```

### Success Criteria
- [ ] Every gate notification shows cost
- [ ] Wave summary shows total cost
- [ ] Pipeline complete shows grand total

### Rollback
Revert to simple text notifications.

---

## INCREMENT 3: BUDGET ENFORCEMENT

### Objective
Stop execution if wave exceeds budget limit.

### Current State
No budget limits - agents can spend unlimited tokens.

### Target State
```bash
# .env or command line
WAVE_BUDGET_LIMIT=5.00  # $5 per wave
STORY_BUDGET_LIMIT=2.00  # $2 per story

# If exceeded:
[BUDGET] ⚠️ Wave 1 exceeded budget ($5.23 > $5.00)
[BUDGET] 🛑 Stopping execution - human approval required
```

### Implementation

1. **merge-watcher-v11.2.sh**
   - Add `WAVE_BUDGET_LIMIT` environment variable
   - Check cost after each agent completes
   - If over budget, create signal file and stop

2. **Signal file for budget exceeded**
```json
{
  "type": "BUDGET_EXCEEDED",
  "wave": 1,
  "current_cost": 5.23,
  "limit": 5.00,
  "action": "HALTED",
  "timestamp": "2026-01-17T15:30:00Z"
}
```

3. **Human approval to continue**
   - Create `signal-budget-approved.json` to continue
   - Or use kill switch to stop

### Verification Test

```bash
# Test: Set very low budget limit
export WAVE_BUDGET_LIMIT=0.10  # 10 cents

# Run 1 wave - should stop quickly
docker compose up wave1-cto

# Expected: Execution halts with budget exceeded message
```

### Success Criteria
- [ ] Execution stops when budget exceeded
- [ ] Slack notification sent with budget warning
- [ ] Human can approve to continue
- [ ] Audit trail shows budget halt

### Rollback
Remove budget checks - return to unlimited.

---

## INCREMENT 4: DYNAMIC WAVE SELECTION

### Objective
Configure which wave to run without editing docker-compose.yml.

### Current State
Must manually edit docker-compose or run specific services.

### Target State
```bash
# Run only Wave 4
WAVE=4 ./scripts/start-pipeline.sh

# Run Waves 2 and 3
WAVE=2,3 ./scripts/start-pipeline.sh
```

### Implementation

1. **scripts/start-pipeline.sh** (new)
   - Reads `WAVE` environment variable
   - Starts appropriate services from docker-compose
   - Configures merge-watcher for specified waves

2. **docker-compose.yml**
   - Add wave labels to services
   - Use profiles for wave grouping

3. **merge-watcher-v11.2.sh**
   - Accept `--wave N` parameter
   - Only monitor specified waves

### Verification Test

```bash
# Test: Run only Wave 2
WAVE=2 ./scripts/start-pipeline.sh

# Expected: Only Wave 2 agents start
# Wave 1 and Wave 3 do not run
```

### Success Criteria
- [ ] Can run single wave
- [ ] Can run multiple specific waves
- [ ] Merge-watcher only monitors selected waves
- [ ] Pre-flight validates selected wave stories exist

### Rollback
Use direct docker compose commands (current method).

---

## INCREMENT 5: SUPABASE EVENT LOGGING

### Objective
Persist all pipeline events to Supabase for audit trail.

### Current State
Events only in merge-watcher logs (lost when terminal closes).

### Target State
```
Supabase table: maf_events

| id | pipeline_id | event_type | wave | agent | message | cost | timestamp |
|----|-------------|------------|------|-------|---------|------|-----------|
| 1  | run-001     | PIPELINE_START | - | - | Starting... | - | 2026-01-17T15:00:00Z |
| 2  | run-001     | GATE_START | 1 | cto | Gate 0 | - | 2026-01-17T15:00:05Z |
| 3  | run-001     | GATE_COMPLETE | 1 | cto | Approved | 0.15 | 2026-01-17T15:02:30Z |
```

### Implementation

1. **scripts/supabase-log.sh** (new)
   - Function to POST events to Supabase REST API
   - Uses `SUPABASE_URL` and `SUPABASE_ANON_KEY`

2. **Supabase table creation**
```sql
CREATE TABLE maf_events (
  id SERIAL PRIMARY KEY,
  pipeline_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  wave INTEGER,
  agent TEXT,
  gate INTEGER,
  message TEXT,
  cost DECIMAL(10,4),
  tokens_in INTEGER,
  tokens_out INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

3. **merge-watcher-v11.2.sh**
   - Call `supabase-log.sh` at each event

### Verification Test

```bash
# Test: Run 1 wave, query Supabase
# After run:
curl "$SUPABASE_URL/rest/v1/maf_events?pipeline_id=eq.run-001" \
  -H "apikey: $SUPABASE_ANON_KEY"

# Expected: Returns 10+ event records
```

### Success Criteria
- [ ] Events logged to Supabase
- [ ] Can query events by pipeline_id
- [ ] Cost tracking persisted
- [ ] Timestamps accurate

### Rollback
Remove Supabase calls - continue with log-only.

---

## INCREMENT 6: POST-DEPLOY VALIDATOR

### Objective
Verify deployment actually succeeded after Vercel deploy.

### Current State
Assume deploy worked if Git push succeeded.

### Target State
```bash
# After Vercel deploy, check:
1. Vercel deployment status API
2. HTTP 200 from production URL
3. Basic smoke test (page loads)

# If fails:
[DEPLOY] ❌ Deployment failed - /api/health returned 500
[DEPLOY] 🔄 Triggering rollback...
```

### Implementation

1. **scripts/post-deploy-validator.sh** (new)
   - Check Vercel deployment status
   - Fetch production URL
   - Verify HTTP 200
   - Optional: Run smoke tests

2. **Integration with merge-watcher**
   - After Git push, wait for Vercel webhook
   - Run post-deploy validator
   - Report success/failure to Slack

### Verification Test

```bash
# Test 1: Normal deploy - should pass
./scripts/post-deploy-validator.sh https://photo-gallery-v10.vercel.app

# Test 2: Bad URL - should fail
./scripts/post-deploy-validator.sh https://nonexistent-app.vercel.app
```

### Success Criteria
- [ ] Detects successful deployment
- [ ] Detects failed deployment
- [ ] Reports to Slack
- [ ] Logs to Supabase (if Increment 5 done)

### Rollback
Skip post-deploy check - assume success.

---

## INCREMENT 7: DOZZLE INTEGRATION

### Objective
Add Dozzle container for live log viewing UI.

### Current State
View logs via `docker logs` or Dozzle must be added manually.

### Target State
```
http://localhost:8080 - Dozzle UI showing all agent containers
```

### Implementation

1. **docker-compose.yml addition**
```yaml
dozzle:
  image: amir20/dozzle:latest
  ports:
    - "8080:8080"
  volumes:
    - /var/run/docker.sock:/var/run/docker.sock:ro
  environment:
    - DOZZLE_FILTER=name=wave*
```

### Verification Test

```bash
# Start Dozzle
docker compose up -d dozzle

# Open http://localhost:8080
# Expected: See list of wave* containers
```

### Success Criteria
- [ ] Dozzle accessible at localhost:8080
- [ ] Shows only wave containers
- [ ] Live log streaming works

### Rollback
Remove dozzle service - use `docker logs`.

---

## INCREMENT 8: EMERGENCY LEVELS E1-E3

### Objective
Implement graduated emergency response.

### Current State
Only EMERGENCY-STOP file (all or nothing).

### Target State
```
E1: Agent Stop  - Stop single agent, reassign
E2: Domain Stop - Stop entire wave
E3: Wave Stop   - Stop current wave, save state

# Trigger via signal files:
.claude/emergency-e1-wave1-cto.json
.claude/emergency-e2-wave1.json
.claude/emergency-e3.json
```

### Implementation

1. **merge-watcher-v11.2.sh**
   - Check for emergency signal files
   - Implement E1: Kill specific container
   - Implement E2: Kill wave containers
   - Implement E3: Kill all, save state

2. **scripts/emergency-trigger.sh** (new)
   - CLI to trigger emergency levels
   - `./emergency-trigger.sh E1 wave1-cto`
   - `./emergency-trigger.sh E2 wave1`
   - `./emergency-trigger.sh E3`

### Verification Test

```bash
# Start pipeline
docker compose up

# In another terminal, trigger E1
./scripts/emergency-trigger.sh E1 wave1-fe-dev

# Expected: wave1-fe-dev stops, others continue
```

### Success Criteria
- [ ] E1 stops single agent
- [ ] E2 stops entire wave
- [ ] E3 stops everything gracefully
- [ ] State preserved for resume

### Rollback
Use EMERGENCY-STOP file only.

---

## TESTING SCHEDULE

### Phase 1: Cost Control (Increments 1-3)
**Duration:** Test thoroughly before production use

| Test | Increment | Pass Criteria |
|------|-----------|---------------|
| Token tracking test | 1 | Costs shown in logs |
| Slack cost test | 2 | Costs in Slack |
| Budget halt test | 3 | Stops at limit |

### Phase 2: Operations (Increments 4-6)
**Duration:** After Phase 1 verified

| Test | Increment | Pass Criteria |
|------|-----------|---------------|
| Wave selection test | 4 | Single wave runs |
| Event logging test | 5 | Supabase populated |
| Deploy validation test | 6 | Failure detected |

### Phase 3: Monitoring (Increments 7-8)
**Duration:** After Phase 2 verified

| Test | Increment | Pass Criteria |
|------|-----------|---------------|
| Dozzle test | 7 | UI works |
| Emergency test | 8 | Levels trigger correctly |

---

## VERSIONING PLAN

After each increment verified:

| Increment | Version | Notes |
|-----------|---------|-------|
| Baseline | V10.0.7 | Current working |
| Token tracking | V10.1.0 | Cost visibility |
| Slack costs | V10.1.1 | Notification enhancement |
| Budget enforcement | V10.2.0 | Cost control |
| Wave selection | V10.2.1 | Operational improvement |
| Supabase logging | V10.3.0 | Audit trail |
| Post-deploy validator | V10.3.1 | Deployment safety |
| Dozzle | V10.3.2 | Monitoring UI |
| Emergency levels | V10.4.0 | Safety enhancement |
| **Full WAVE 2.0** | V11.0.0 | All increments verified |

---

## ROLLBACK PROCEDURES

### For any failed increment:

1. **Identify failure**
   - Check merge-watcher logs
   - Check Slack for errors
   - Check container status

2. **Stop execution**
   ```bash
   docker compose down
   pkill -f merge-watcher
   ```

3. **Revert to previous version**
   ```bash
   git checkout v10.0.7  # or appropriate tag
   ```

4. **Document failure**
   - Create retrospective
   - Note what failed and why
   - Plan fix before retry

5. **Retry with fix**
   - Apply fix
   - Run verification test
   - Proceed only if passes

---

## CONCLUSION

This plan provides a systematic path from V10.0.7 to WAVE 2.0.0:

1. **Start with cost control** - Critical for production use
2. **Add operational improvements** - Make it easier to use
3. **Enhance monitoring** - Better visibility
4. **Test everything** - No increment accepted without verification

**Key Rule:** If any test fails, stop and fix before proceeding.

---

**Plan Version:** 1.0
**Created:** 2026-01-17
**Baseline:** V10.0.7
**Target:** WAVE 2.0.0 / V11.0.0
