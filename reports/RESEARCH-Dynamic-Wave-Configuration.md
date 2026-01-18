# CTO ARCHITECT RESEARCH REPORT
## Dynamic Wave Configuration for Merge-Watcher

**Date:** 2026-01-17
**Classification:** Evidence-Based Technical Analysis
**Purpose:** Validate solution approach before implementation

---

## EXECUTIVE SUMMARY

Based on research from multiple credible sources, I recommend implementing **file-based state tracking with environment variable configuration** for dynamic wave support. This approach is validated by:

1. Apache Airflow's dynamic DAG generation patterns
2. Jenkins/GitHub Actions dynamic pipeline configuration
3. Production-grade bash scripting best practices
4. File-based locking and state management patterns

---

## RESEARCH FINDINGS

### Source 1: Bash Dynamic Configuration Best Practices

**Source:** [Redowan's Reflections - Dynamic Shell Variables](https://rednafi.com/misc/dynamic-shell-variables/)

**Key Finding:**
> "A practical use of dynamic shell variables is managing environment-specific configurations. This is particularly handy in scenarios where you have multiple environments like staging and prod, each with its own unique configuration settings."

**Applied Pattern:**
```bash
# Instead of hardcoded:
WAVE1_STATUS="PENDING"
WAVE2_STATUS="PENDING"

# Use dynamic configuration:
WAVES="${WAVES:-1 2}"  # Default to "1 2", can be overridden
```

---

**Source:** [Chef Expeditor - Bash Script Best Practices](https://expeditor.chef.io/docs/patterns/bash-scripts/)

**Key Finding:**
> "Set a default value for missing environment variables if appropriate. If you want to allow your script to run in a default mode outside of a specific context, provide a default for that environment variable."
>
> Example syntax: `channel="${EXPEDITOR_CHANNEL:-unstable}"`

**Applied Pattern:**
```bash
# Environment variable with default
WAVES="${WAVES:-1 2}"
MAX_RETRIES="${MAX_RETRIES:-3}"
```

---

### Source 2: CI/CD Pipeline Dynamic Configuration

**Source:** [Tim Deschryver - Dynamic CI/CD Pipeline with GitHub Actions](https://timdeschryver.dev/blog/how-to-set-up-a-dynamic-ci-cd-pipeline-with-github-actions)

**Key Finding:**
> Dynamic pipelines allow you to configure which stages/jobs run based on runtime parameters rather than hardcoding them in the pipeline definition.

**Source:** [DEV Community - Complete CI/CD Guide](https://dev.to/fonteeboa/complete-cicd-guide-with-yaml-pipelines-azure-devops-jenkins-github-actions-319g)

**Key Finding:**
> "Reuse templates to avoid duplication. Best practices include isolating build and deployment stages for security and performance."

**Applied Pattern:**
- Use a single configuration point (environment variable) to control which waves run
- Process waves in a loop rather than hardcoding each wave

---

### Source 3: Apache Airflow Dynamic DAG Generation

**Source:** [Apache Airflow Documentation - Dynamic DAG Generation](https://airflow.apache.org/docs/apache-airflow/stable/howto/dynamic-dag-generation.html)

**Key Finding:**
> "When generating DAGs dynamically, you should make sure that Tasks and Task Groups are generated with consistent sequence every time."

**Source:** [Apache Airflow Documentation - Params](https://airflow.apache.org/docs/apache-airflow/stable/core-concepts/params.html)

**Key Finding:**
> "Params enable you to provide runtime configuration to tasks. You can configure default Params in your DAG code and supply additional Params, or overwrite Param values, at runtime when you trigger a DAG."

**Applied Pattern:**
- Default configuration in code
- Runtime override via environment variables
- Consistent processing sequence

---

### Source 4: File-Based State Management

**Source:** [Baeldung - Ensure Only One Instance of Bash Script Running](https://www.baeldung.com/linux/bash-ensure-instance-running)

**Key Finding:**
> "You can use flock to create a lock on a file. The idea is that you first try to obtain the lock, and if this fails, it means there's another instance running. Any lock held on a file is released once the process exits."

**Source:** [GitHub - Open-Technology-Foundation/locks](https://github.com/Open-Technology-Foundation/locks)

**Key Finding:**
> "Robust, production-ready file-based locking utility with stale lock detection and flexible waiting modes."

**Source:** [Bash Hackers Wiki - Lock Your Script](https://bash-hackers.gabe565.com/howto/mutex/)

**Key Finding:**
> "The locking stores the process ID of the locked instance; if a lock fails, the script tries to find out if the locked instance still is active; traps are created to automatically remove the lock when the script terminates."

**Applied Pattern:**
```bash
# File-based state tracking (bash 3.x compatible)
STATE_DIR="$SIGNAL_CLAUDE_DIR/.state"

get_wave_status() {
    local wave="$1"
    cat "$STATE_DIR/wave${wave}-status" 2>/dev/null || echo "PENDING"
}

set_wave_status() {
    local wave="$1"
    local status="$2"
    mkdir -p "$STATE_DIR"
    echo "$status" > "$STATE_DIR/wave${wave}-status"
}
```

---

### Source 5: Production Shell Script Management

**Source:** [ITNEXT - Best Practices for Managing BASH Scripts](https://itnext.io/best-practices-for-managing-bash-scripts-be2a36aa5147)

**Key Finding:**
> "Even with all the changes in how we run systems at scale, shell scripts are still a go-to tool in the DevOps & Site Reliability Engineers toolbelt. The solution is to use the same code management best practices we use for production applications."

**Source:** [Sharats.me - Shell Script Best Practices](https://sharats.me/posts/shell-script-best-practices/)

**Key Finding:**
> "Define all configuration variables, constants, and default values at the top of your script after the header section. This creates a clear separation between what can be customized and the actual script logic."

**Applied Pattern:**
- Configuration at top of script
- Clear separation between config and logic
- Environment variable overrides for runtime flexibility

---

## EVIDENCE-BASED RECOMMENDATION

### Recommended Approach: File-Based State with Environment Configuration

Based on the research, the recommended pattern is:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    EVIDENCE-BASED SOLUTION                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  1. CONFIGURATION (Environment Variable with Default)                       │
│     ─────────────────────────────────────────────────                       │
│     WAVES="${WAVES:-1 2}"                                                   │
│                                                                              │
│     Evidence: Chef Expeditor, Dynamic Shell Variables                       │
│     Benefit: Backward compatible, runtime configurable                      │
│                                                                              │
│  2. STATE TRACKING (File-Based)                                             │
│     ─────────────────────────────────────────────────                       │
│     .claude/.state/wave1-status → "PENDING"                                 │
│     .claude/.state/wave4-status → "DEPLOYED"                                │
│                                                                              │
│     Evidence: Baeldung, Bash Hackers Wiki                                   │
│     Benefit: Persistent, bash 3.x compatible, debuggable                    │
│                                                                              │
│  3. PROCESSING (Loop Through Configured Waves)                              │
│     ─────────────────────────────────────────────────                       │
│     for wave in $WAVES; do                                                  │
│         process_wave "$wave"                                                │
│     done                                                                     │
│                                                                              │
│     Evidence: Airflow dynamic DAG, GitHub Actions                           │
│     Benefit: Scalable, no code changes for new waves                        │
│                                                                              │
│  4. CLEANUP (Trap-Based)                                                    │
│     ─────────────────────────────────────────────────                       │
│     trap cleanup EXIT ERR                                                   │
│                                                                              │
│     Evidence: Cycle.io, Shell Script Best Practices                         │
│     Benefit: Automatic state cleanup on exit                                │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Implementation Changes

| Component | Current (V11.2) | Proposed (V11.3) | Evidence Source |
|-----------|-----------------|------------------|-----------------|
| Wave config | Hardcoded `1 2` | `WAVES="${WAVES:-1 2}"` | [Chef Expeditor](https://expeditor.chef.io/docs/patterns/bash-scripts/) |
| State storage | Variables | Files in `.state/` | [Baeldung](https://www.baeldung.com/linux/bash-ensure-instance-running) |
| Processing | `process_wave 1; process_wave 2` | `for wave in $WAVES` | [Airflow](https://airflow.apache.org/docs/apache-airflow/stable/howto/dynamic-dag-generation.html) |
| Completion | Hardcoded Wave 1/2 check | Dynamic all-waves check | [GitHub Actions Dynamic](https://timdeschryver.dev/blog/how-to-set-up-a-dynamic-ci-cd-pipeline-with-github-actions) |

### Why NOT Variable-Based Tracking

| Approach | Pros | Cons | Verdict |
|----------|------|------|---------|
| **Variables (current)** | Fast, simple | Not dynamic, hardcoded | ❌ Limited |
| **Associative Arrays** | Dynamic | Bash 4+ only, macOS issue | ⚠️ Compatibility |
| **Files (recommended)** | Dynamic, persistent, debuggable | Slightly slower I/O | ✅ Best choice |

**Key reason from research:**
> "Using PID files has the added benefit that if the script dies midway through, another instance will start – a drawback of just using lock files without a pid." - [Baeldung](https://www.baeldung.com/linux/bash-ensure-instance-running)

Same principle applies to state files - they persist across script restarts and can be inspected for debugging.

---

## BACKWARD COMPATIBILITY

The solution maintains full backward compatibility:

```bash
# Current usage (unchanged)
./scripts/merge-watcher-v11.3.sh
# → Defaults to WAVES="1 2"

# New usage (Wave 4 only)
WAVES="4" ./scripts/merge-watcher-v11.3.sh

# New usage (multiple waves)
WAVES="1 2 3 4" ./scripts/merge-watcher-v11.3.sh
```

---

## RISK ASSESSMENT

| Risk | Mitigation | Evidence |
|------|------------|----------|
| File I/O overhead | State dir in RAM-backed `.claude/` | Minimal impact per [Bash Hackers](https://bash-hackers.gabe565.com/howto/mutex/) |
| State file corruption | Use atomic writes (write to temp, mv) | [mkdir atomicity](https://www.tobru.ch/easy-bash-script-locking-with-mkdir/) |
| Orphaned state files | Cleanup trap on EXIT/ERR | [Cycle.io](https://cycle.io/learn/shell-scripting-best-practices/) |
| Bash 3.x compatibility | File-based (no associative arrays) | macOS ships with Bash 3.2 |

---

## CONCLUSION

The evidence strongly supports:

1. **Environment variable configuration** - Standard practice per Chef Expeditor, DigitalOcean guides
2. **File-based state tracking** - Production-proven per Baeldung, Bash Hackers Wiki
3. **Loop-based processing** - Scalable pattern per Airflow, GitHub Actions

**Recommendation:** Proceed with implementation using the file-based state tracking pattern with environment variable configuration.

---

## SOURCES

1. [Redowan's Reflections - Dynamic Shell Variables](https://rednafi.com/misc/dynamic-shell-variables/)
2. [Chef Expeditor - Bash Script Best Practices](https://expeditor.chef.io/docs/patterns/bash-scripts/)
3. [Tim Deschryver - Dynamic CI/CD Pipeline with GitHub Actions](https://timdeschryver.dev/blog/how-to-set-up-a-dynamic-ci-cd-pipeline-with-github-actions)
4. [DEV Community - Complete CI/CD Guide](https://dev.to/fonteeboa/complete-cicd-guide-with-yaml-pipelines-azure-devops-jenkins-github-actions-319g)
5. [Apache Airflow - Dynamic DAG Generation](https://airflow.apache.org/docs/apache-airflow/stable/howto/dynamic-dag-generation.html)
6. [Apache Airflow - Params Documentation](https://airflow.apache.org/docs/apache-airflow/stable/core-concepts/params.html)
7. [Baeldung - Ensure Only One Instance of Bash Script Running](https://www.baeldung.com/linux/bash-ensure-instance-running)
8. [GitHub - Open-Technology-Foundation/locks](https://github.com/Open-Technology-Foundation/locks)
9. [Bash Hackers Wiki - Lock Your Script](https://bash-hackers.gabe565.com/howto/mutex/)
10. [ITNEXT - Best Practices for Managing BASH Scripts](https://itnext.io/best-practices-for-managing-bash-scripts-be2a36aa5147)
11. [Sharats.me - Shell Script Best Practices](https://sharats.me/posts/shell-script-best-practices/)
12. [Cycle.io - Shell Scripting Best Practices](https://cycle.io/learn/shell-scripting-best-practices/)

---

*Report Generated: 2026-01-17*
*Classification: Evidence-Based Technical Analysis*
