# WAVE Implementation Complete Execution Order

**Document:** Claude Code Execution Guide (Complete)
**Version:** 2.0.0
**Date:** February 7, 2026
**Total Stories:** 23
**Total Story Points:** 156

---

## Quick Start

```bash
# Start Claude Code with WAVE project
claude --project /path/to/WAVE

# First instruction:
"Read ai-prd/implementation-stories/EXECUTION-ORDER.md and begin with SCHEMA-001"
```

---

## Complete Execution Sequence

Execute these stories in order. Each story depends on the completion of previous stories.

### Week 1-2: Schema + Foundation

| Order | Story ID | Title | Points | Depends On |
|-------|----------|-------|--------|------------|
| 1 | **SCHEMA-001** | Create AI Stories Schema V4.3 | 5 | None |
| 2 | **SCHEMA-002** | Create V4.3 Story Template | 3 | SCHEMA-001 |
| 3 | **SCHEMA-004** | Create Schema Validation Script | 3 | SCHEMA-001 |
| 4 | **WAVE-P0-001** | Setup WAVE Development Environment | 3 | None |
| 5 | **WAVE-P1-001** | Implement PostgreSQL State Schema | 5 | P0-001 |
| 6 | **WAVE-P1-002** | Implement Checkpoint Manager | 8 | P1-001 |
| 7 | **WAVE-P1-003** | Implement Session Recovery | 5 | P1-002 |
| 8 | **SCHEMA-003** | Create Migration Tool V4.2→V4.3 | 5 | SCHEMA-001 |
| 9 | **SCHEMA-005** | Update Schema Documentation | 2 | SCHEMA-001,002,003,004 |

**Week 2 Milestone:** ✓ V4.3 Schema complete, State persistence + crash recovery working

---

### Week 3-4: Event-Driven Communication

| Order | Story ID | Title | Points | Depends On |
|-------|----------|-------|--------|------------|
| 10 | **WAVE-P2-001** | Implement Redis Pub/Sub Infrastructure | 8 | P1-002 |
| 11 | **WAVE-P2-002** | Refactor Orchestrator to Event-Driven | 13 | P2-001 |
| 12 | **WAVE-P2-003** | Implement Agent Signal Publisher | 5 | P2-002 |

**Week 4 Milestone:** ✓ Signal latency <100ms (was 10,000ms)

---

### Week 5-6: Multi-Agent Parallel Execution

| Order | Story ID | Title | Points | Depends On |
|-------|----------|-------|--------|------------|
| 13 | **WAVE-P3-001** | Implement Git Worktree Manager | 8 | P2-002 |
| 14 | **WAVE-P3-002** | Implement Domain Boundary Enforcer | 5 | P3-001 |
| 15 | **WAVE-P3-003** | Implement Parallel Story Executor | 8 | P3-002 |

**Week 6 Milestone:** ✓ 4 agents working in parallel, no merge conflicts

---

### Week 7-8: RLM Integration

| Order | Story ID | Title | Points | Depends On |
|-------|----------|-------|--------|------------|
| 16 | **WAVE-P4-001** | Implement RLM Context Manager | 13 | P3-002 |
| 17 | **WAVE-P4-002** | Implement Domain Scoper | 5 | P4-001 |
| 18 | **WAVE-P4-003** | Implement Subagent Spawner | 8 | P4-002 |

**Week 8 Milestone:** ✓ Context efficiency <10%, cost reduced >50%

---

### Week 9-10: Full Autonomy

| Order | Story ID | Title | Points | Depends On |
|-------|----------|-------|--------|------------|
| 19 | **WAVE-P5-001** | Implement Autonomous Pipeline | 21 | P4-001 |
| 20 | **WAVE-P5-002** | Implement Human Checkpoint System | 8 | P5-001 |
| 21 | **WAVE-P5-003** | Implement Emergency Stop System | 5 | P5-002 |

**Week 10 Milestone:** ✓ Full autonomous execution, human approves PRD only

---

## Story Files - All Created ✅

```
/WAVE/ai-prd/implementation-stories/
├── EXECUTION-ORDER.md       # This file
│
├── SCHEMA Stories (Week 1-2)
│   ├── SCHEMA-001.json     ✅ Create V4.3 Schema
│   ├── SCHEMA-002.json     ✅ Create V4.3 Template
│   ├── SCHEMA-003.json     ✅ Migration Tool
│   ├── SCHEMA-004.json     ✅ Validation Script
│   └── SCHEMA-005.json     ✅ Documentation
│
├── Phase 0: Foundation
│   └── WAVE-P0-001.json    ✅ Environment Setup
│
├── Phase 1: State Persistence
│   ├── WAVE-P1-001.json    ✅ PostgreSQL Schema
│   ├── WAVE-P1-002.json    ✅ Checkpoint Manager
│   └── WAVE-P1-003.json    ✅ Session Recovery
│
├── Phase 2: Event-Driven
│   ├── WAVE-P2-001.json    ✅ Redis Pub/Sub
│   ├── WAVE-P2-002.json    ✅ Orchestrator Refactor
│   └── WAVE-P2-003.json    ✅ Signal Publisher
│
├── Phase 3: Multi-Agent
│   ├── WAVE-P3-001.json    ✅ Git Worktree Manager
│   ├── WAVE-P3-002.json    ✅ Domain Boundary Enforcer
│   └── WAVE-P3-003.json    ✅ Parallel Executor
│
├── Phase 4: RLM
│   ├── WAVE-P4-001.json    ✅ Context Manager
│   ├── WAVE-P4-002.json    ✅ Domain Scoper
│   └── WAVE-P4-003.json    ✅ Subagent Spawner
│
└── Phase 5: Autonomy
    ├── WAVE-P5-001.json    ✅ Autonomous Pipeline
    ├── WAVE-P5-002.json    ✅ Human Checkpoint System
    └── WAVE-P5-003.json    ✅ Emergency Stop

Total: 23 Stories | ALL CREATED ✅
```

---

## Claude Code Instructions

### For Each Story:

1. **Read the story JSON file**
   ```
   Read ai-prd/implementation-stories/{STORY_ID}.json
   ```

2. **Verify dependencies are complete**
   - Check `dependencies.required_before` array
   - Confirm all listed stories have `status: "complete"`

3. **Load context files (V4.3 feature)**
   - Read files listed in `context.read_files`
   - Review `context.code_examples` for patterns
   - Check `context.similar_implementations`

4. **Create files listed in `files.create`**
   - Follow TDD: write tests first
   - Use patterns from `technical_requirements.reuse_patterns`
   - Respect domain boundaries

5. **Validate each acceptance criterion**
   - Execute the `test_approach`
   - Verify the `ears_format` condition is met
   - Check `threshold` if specified

6. **Run all tests**
   ```bash
   pnpm test {test_files}
   ```

7. **Checkpoint (V4.3 feature)**
   - Follow `execution.checkpoint_frequency`
   - Save state at each checkpoint

8. **Update story status**
   - Change `status` to "complete"
   - Add `gates_completed` entries
   - Record `actual_tokens` used

9. **Commit with conventional format**
   ```
   feat(orchestrator): {story_title}

   Story: {story_id}
   Acceptance Criteria: All passed
   Tests: {estimated_tests} tests passing
   ```

---

## Safety Rules - ALWAYS OBSERVE

1. **NEVER** modify files in `files.forbidden`
2. **STOP** immediately if any `stop_conditions` triggered
3. **ESCALATE** to human if any `escalation_triggers` hit
4. **ALWAYS** run tests before marking complete
5. **NEVER** skip the dependency check
6. **RESPECT** `execution.max_retries` limit
7. **CHECKPOINT** according to `execution.checkpoint_frequency`

---

## Success Metrics by Week

| Week | Key Deliverable | Success Metric |
|------|-----------------|----------------|
| 2 | Schema V4.3 + State Persistence | Crash recovery works |
| 4 | Event-Driven Communication | Latency <100ms |
| 6 | Multi-Agent Parallel | 4 agents, no conflicts |
| 8 | RLM Integration | Cost reduced >50% |
| 10 | Full Autonomy | Human approves PRD only |

---

## Emergency Procedures

### If Agent Gets Stuck:
1. Check `safety.escalation_triggers`
2. Review error logs
3. Attempt rollback using `safety.rollback_plan`
4. Escalate to human if retry limit reached

### If Tests Fail Repeatedly:
1. Check test approach in acceptance criteria
2. Review mocking strategy
3. Verify environment setup
4. Escalate after 3 failures

### If Cost Exceeds Budget:
1. Check `execution.timeout_minutes`
2. Review token usage vs `estimated_tokens`
3. Consider using lower `execution.model_tier`
4. Stop and report to human

---

## Reference Files

| File | Purpose |
|------|---------|
| `wave-config.json` | Project configuration with domains |
| `planning/schemas/story-schema-v4.3.json` | V4.3 schema definition |
| `WAVE-IMPLEMENTATION-MASTER-PLAN.md` | Full strategic roadmap |

---

**END OF EXECUTION GUIDE**

**Total Stories:** 23
**Total Points:** 156
**Timeline:** 10 Weeks
**Status:** All Story Files Created ✅
