# WAVE AI Story Best Practices

Guidelines for writing effective stories that reduce cost, improve agent accuracy, and maximize automation success.

---

## Cost Reduction

### Use `context.read_files` to Eliminate Exploration

Without context, agents spend tokens exploring the codebase to find relevant files. Listing files upfront reduces this.

```json
"context": {
  "read_files": [
    "src/pubsub/subscriber.py",
    "src/pubsub/types.py",
    "tests/pubsub/test_pubsub_integration.py"
  ]
}
```

**Impact:** 30-50% token reduction on typical stories.

### Choose the Right `model_tier`

| Tier | Use When | Cost |
|------|----------|------|
| `haiku` | Simple file changes, documentation, config updates | Lowest |
| `sonnet` | Standard features, tests, refactoring | Medium |
| `opus` | Complex architecture, multi-file refactors, novel patterns | Highest |

```json
"execution": {
  "model_tier": "haiku"
}
```

**Rule of thumb:** Start with `sonnet`. Use `opus` for 8+ point stories. Use `haiku` for 1-3 point stories.

### Break Large Stories Into Subtasks

Stories over 8 points benefit from subtask decomposition. Each subtask can checkpoint independently, preventing wasted tokens on retry.

```json
"subtasks": [
  {
    "id": "ST-01",
    "title": "Create base handler class",
    "estimated_tokens": 2000,
    "checkpoint_after": true
  },
  {
    "id": "ST-02",
    "title": "Implement concrete handlers",
    "estimated_tokens": 5000,
    "checkpoint_after": true
  }
]
```

**Impact:** If ST-02 fails, only ST-02 retries (5000 tokens), not the entire story (7000 tokens).

### Set Appropriate Timeouts

Avoid wasting tokens on stories that are stuck:

```json
"execution": {
  "timeout_minutes": 30,
  "max_retries": 2
}
```

---

## Writing Effective Stories

### Be Specific in Objective

The objective drives agent understanding. Vague objectives lead to exploration and wasted tokens.

```json
// Bad - vague
"objective": {
  "i_want": "better performance",
  "so_that": "the app is faster"
}

// Good - specific
"objective": {
  "i_want": "Redis Streams pub/sub replacing polling loops",
  "so_that": "signal latency drops from 10s to under 100ms"
}
```

### Use EARS Format for Complex Criteria

EARS (Easy Approach to Requirements Syntax) makes acceptance criteria unambiguous and testable.

```json
{
  "id": "AC-02",
  "description": "Agent completion signals received via pub/sub under 100ms",
  "ears_format": "WHEN agent publishes completion signal THEN handler invoked within 100ms",
  "threshold": "latency: <100ms",
  "test_approach": "Publish signal, measure handler invocation time"
}
```

### Include Code Examples in Context

When agents should follow existing patterns, show them:

```json
"context": {
  "code_examples": [
    {
      "description": "Follow this pattern for new handlers",
      "code": "class GateCompleteHandler(SignalHandler):\n    def handle(self, message):\n        # Process gate completion\n        return HandlerResult(success=True)",
      "file_reference": "src/events/signal_handler.py"
    }
  ]
}
```

### Define File Boundaries

Prevent agents from modifying files they shouldn't touch:

```json
"files": {
  "create": ["src/events/dispatcher.py"],
  "modify": ["src/supervisor.py"],
  "forbidden": ["core/safety/*", "portal/*", "*.lock"]
}
```

---

## Story Sizing

| Points | Scope | Model Tier | Subtasks |
|--------|-------|------------|----------|
| 1-2 | Config change, doc update, single file edit | `haiku` | No |
| 3-5 | Single feature, 2-3 files, ~10 tests | `sonnet` | Optional |
| 8 | Multi-file feature, 15+ tests | `sonnet` | Recommended |
| 13 | Major refactor, architectural change | `opus` | Required |
| 21 | System-wide change, new subsystem | `opus` | Required |

---

## Checkpoint Strategy

| Frequency | Use When |
|-----------|----------|
| `on_complete` | Simple stories (1-3 points) |
| `per_gate` | Standard stories (5-8 points) |
| `per_criterion` | Stories with many independent ACs |
| `per_subtask` | Complex stories (13-21 points) |

---

## Safety Rules

### Always Include Stop Conditions

```json
"safety": {
  "stop_conditions": [
    "Build fails after implementing changes",
    "Existing tests break (regression)",
    "Token budget exceeded by 2x"
  ]
}
```

### Add Escalation Triggers for Risky Operations

```json
"safety": {
  "escalation_triggers": [
    "Database migration required",
    "Cannot resolve merge conflict",
    "Security vulnerability detected"
  ]
}
```

### Add Hazard Analysis for Critical Stories

Stories involving auth, payments, data deletion, or external APIs should include hazard analysis:

```json
"hazard_analysis": {
  "identified_hazards": [
    {
      "id": "HAZ-001",
      "description": "Race condition in parallel signal processing",
      "severity": "major",
      "likelihood": "occasional",
      "mitigation": "Use Redis consumer groups for load-balanced, ordered delivery"
    }
  ],
  "risk_level": "medium"
}
```

---

## Parallel Execution

Mark stories that can run concurrently:

```json
"execution": {
  "parallel_with": ["SCHEMA-004", "WAVE-P0-001"]
}
```

Requirements for parallel execution:
- Stories must not modify the same files
- Stories must be in different domains or have non-overlapping `files.create`/`files.modify`
- Use Git worktree isolation (WAVE-P3-001)

---

## Enterprise Compliance

For regulated environments, track compliance requirements:

```json
"enterprise": {
  "compliance": ["SOC2", "GDPR"],
  "approvals_required": [
    {
      "role": "security-lead",
      "approved": false
    }
  ]
}
```

Supported compliance standards: `GDPR`, `SOC2`, `HIPAA`, `PCI-DSS`, `ISO27001`
