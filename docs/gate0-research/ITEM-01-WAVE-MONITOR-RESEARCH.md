# Gate 0 Research Report: Item #1 - wave_monitor.py

## Overview

**Item:** Real-time Monitoring Script
**Proposed by:** Grok
**Researcher:** Claude Opus 4.5
**Date:** 2026-01-28
**Status:** Research Complete

---

## 1. Existing Infrastructure Analysis

### 1.1 Slack Notifications (ALREADY EXISTS)

**Location:** `/Volumes/SSD-01/Projects/WAVE/orchestrator/src/api/slack.py`

| Feature | Status | Implementation |
|---------|--------|----------------|
| Webhook integration | ✅ | `SlackNotifier` class |
| Severity levels | ✅ | INFO, WARNING, CRITICAL, SUCCESS |
| Thread-per-story | ✅ | `_thread_cache` dictionary |
| Gate transitions | ✅ | `notify_gate_transition()` |
| Budget warnings | ✅ | `notify_budget_warning()` |
| Safety violations | ✅ | `notify_safety_violation()` |
| Story start/complete | ✅ | `notify_story_start/complete()` |

**Also:** `/Volumes/SSD-01/Projects/WAVE/orchestrator/notifications.py` (344 lines)
- Step notifications
- Run start/complete with metrics
- Agent completion with safety scores
- Code generation notifications

### 1.2 LangSmith Metrics (ALREADY EXISTS)

**Location:** `/Volumes/SSD-01/Projects/WAVE/orchestrator/src/tracing/metrics.py`

| Feature | Status | Implementation |
|---------|--------|----------------|
| RunMetrics dataclass | ✅ | Tokens, cost, duration, errors |
| MetricsCollector singleton | ✅ | Thread-safe collection |
| JSON export | ✅ | `export_metrics_json()` |
| Human-readable summary | ✅ | `get_run_summary()` |
| Safety violations tracking | ✅ | `record_safety_violation()` |
| Retry counting | ✅ | `record_retry()` |
| Per-agent metrics | ✅ | `agent_counts`, `agent_durations` |

### 1.3 Diagnostics Export (ALREADY EXISTS)

**Location:** `/Volumes/SSD-01/Projects/WAVE/orchestrator/scripts/export-diagnostics.sh`

| Feature | Status | Implementation |
|---------|--------|----------------|
| Container logs | ✅ | `docker logs` export |
| Redis state dump | ✅ | Keys, tasks, results, queues |
| Workflow status | ✅ | API call to `/workflows` |
| Configuration export | ✅ | docker-compose, env (sanitized) |
| System status | ✅ | Container health, resources, network |
| Analysis summary | ✅ | Markdown report for Grok |

### 1.4 Validation Report Generator (ALREADY EXISTS)

**Location:** `/Volumes/SSD-01/Projects/WAVE/core/scripts/validation-report-generator.sh`

| Feature | Status | Implementation |
|---------|--------|----------------|
| Signal files analysis | ✅ | Count approved/rejected/complete |
| Gates passed tracking | ✅ | Parse gate signals |
| Cost analysis | ✅ | Token tracking CSV |
| Safety report | ✅ | Kill switch, violations, escalations |
| Verdict generation | ✅ | VALIDATED / FAILED / INCOMPLETE |

---

## 2. Gap Analysis

### What Grok's wave_monitor.py Proposes:

```python
# From Grok's suggestion
def generate_report():
    dozzle_logs = get_dozzle_logs()
    langsmith = get_langsmith_traces()
    supabase = get_supabase_audits()
    issues = detect_issues(logs)
    # Write report
```

### Overlap Assessment:

| Grok Feature | Existing Coverage | Gap |
|--------------|-------------------|-----|
| Docker logs polling | ❌ One-shot only | **REAL GAP** |
| LangSmith traces | ✅ `metrics.py` | None |
| Supabase audits | ❌ Not implemented | **REAL GAP** |
| Issue detection | ⚠️ Manual only | **REAL GAP** |
| Slack alerts | ✅ Full implementation | None |
| Continuous polling | ❌ Scripts are one-shot | **REAL GAP** |
| Report generation | ✅ Multiple scripts | None |

### Actual Gaps (4 items):

1. **Continuous polling loop** - Existing scripts run once, not continuously
2. **Automated issue detection** - No real-time anomaly detection
3. **Supabase audit integration** - Not currently pulling from Supabase events
4. **Unified dashboard output** - Currently scattered across multiple tools

---

## 3. Recommendation

### Verdict: PARTIAL IMPLEMENTATION NEEDED

Grok's `wave_monitor.py` duplicates **~60% of existing functionality**. Rather than implementing Grok's script as-is, recommend:

### Option A: Enhance Existing Tools (RECOMMENDED)

1. Add continuous mode to `export-diagnostics.sh`:
   ```bash
   ./export-diagnostics.sh --watch --interval 60
   ```

2. Add issue detection to `MetricsCollector`:
   ```python
   def detect_anomalies(self) -> List[str]:
       issues = []
       if self._safety_violations > 0:
           issues.append(f"Safety violations: {self._safety_violations}")
       if self._cost_usd > 5.0:
           issues.append(f"High cost: ${self._cost_usd:.2f}")
       return issues
   ```

3. Integrate Slack alerting with metrics:
   ```python
   issues = collector.detect_anomalies()
   if issues:
       notify_safety_violation(story_id, issues)
   ```

### Option B: Create New Unified Monitor

Only if Option A is rejected. Would create:
- `wave_monitor.py` - New unified monitoring daemon
- But must reuse existing Slack/Metrics modules, not duplicate

---

## 4. TDD Implementation Plan

### Tests to Write FIRST:

```python
# File: tests/test_wave_monitor.py

def test_detect_safety_block():
    """Detect safety score < 0.85 in logs."""
    logs = "SAFETY BLOCK: Score 0.70 below threshold"
    issues = detect_issues(logs)
    assert "Safety block" in issues[0]

def test_detect_timeout():
    """Detect workflow timeout > 5 min."""
    logs = "Task timed out after 600s"
    issues = detect_issues(logs)
    assert "Timeout" in issues[0]

def test_detect_retry_limit():
    """Detect max retries hit."""
    logs = "Retry limit reached (3/3)"
    issues = detect_issues(logs)
    assert "retry limit" in issues[0].lower()

def test_continuous_polling():
    """Verify polling runs at configured interval."""
    monitor = WaveMonitor(interval_sec=1)
    monitor.start()
    time.sleep(2.5)
    monitor.stop()
    assert monitor.poll_count >= 2

def test_slack_alert_on_issue():
    """Verify Slack alert sent when issue detected."""
    monitor = WaveMonitor()
    monitor.on_issue_detected(["Safety block"])
    assert mock_slack.called
```

### Implementation Order:

1. Write failing tests (above)
2. Implement `IssueDetector` class
3. Implement `WaveMonitor` class
4. Integrate with existing `SlackNotifier`
5. Add to docker-compose as optional service

---

## 5. Files to Create/Modify

### New Files:
| File | Purpose |
|------|---------|
| `orchestrator/src/monitoring/issue_detector.py` | Pattern-based issue detection |
| `orchestrator/src/monitoring/wave_monitor.py` | Main monitoring daemon |
| `orchestrator/tests/test_issue_detector.py` | TDD tests |
| `orchestrator/tests/test_wave_monitor.py` | TDD tests |

### Modify:
| File | Change |
|------|--------|
| `orchestrator/src/tracing/metrics.py` | Add `detect_anomalies()` |
| `orchestrator/docker/docker-compose.agents.yml` | Add monitor service |

---

## 6. Proof/Evidence

### Source 1: Existing Slack Implementation
```python
# From src/api/slack.py:269-283
def notify_safety_violation(
    self,
    story_id: str,
    violations: List[str]
) -> SlackResponse:
    """Notify safety violation."""
    violations_text = "\n".join(f"• {v}" for v in violations[:5])
    message = SlackMessage(
        text=f"*Safety Violation: {story_id}*\n{violations_text}",
        channel=SlackChannel.ALERTS,
        severity=NotificationSeverity.CRITICAL,
        story_id=story_id
    )
    return self.send(message)
```

### Source 2: Existing Metrics Collection
```python
# From src/tracing/metrics.py:250-260
def record_safety_violation(self, violation: str) -> None:
    """Record a safety violation."""
    if not self._collecting:
        return
    self._safety_violations += 1
```

### Source 3: Existing Diagnostics Export
```bash
# From scripts/export-diagnostics.sh:40-48
docker exec wave-redis redis-cli KEYS "wave:*" > "$OUTPUT_DIR/redis/all_keys.txt"
for key in $(docker exec wave-redis redis-cli KEYS "wave:task:*"); do
    docker exec wave-redis redis-cli HGETALL "$key" >> "$OUTPUT_DIR/redis/tasks.txt"
done
```

---

## 7. Conclusion

| Aspect | Finding |
|--------|---------|
| Duplication Risk | HIGH (60% overlap) |
| Real Value Add | MEDIUM (continuous monitoring, issue detection) |
| Implementation Effort | LOW (reuse existing modules) |
| Recommendation | Enhance existing tools, don't create from scratch |

**Next Step:** Proceed to TDD implementation of `IssueDetector` class that integrates with existing infrastructure.
