# Hazard: Analyze Story Hazards

Perform hazard analysis for a story or wave.

## Arguments
- `$ARGUMENTS` - Story ID or Wave number (e.g., "AUTH-BE-001" or "wave 1")

## Purpose
Identify, assess, and document hazards with mitigations per aerospace safety standards.

## Hazard Categories

| Category | Examples |
|----------|----------|
| Security | Auth bypass, injection, data exposure |
| Privacy | PII leakage, consent violations |
| Data | Corruption, loss, inconsistency |
| Performance | Degradation, timeouts, resource exhaustion |
| Availability | Downtime, single points of failure |
| Technical | Contract mismatch, integration failures |

## Risk Assessment

### Severity Levels (DO-178C inspired)
| Level | Name | Description |
|-------|------|-------------|
| 1 | Catastrophic | Data loss, security breach, financial loss |
| 2 | Hazardous | Major feature failure, data corruption |
| 3 | Major | Feature degraded, workaround available |
| 4 | Minor | Cosmetic issue, minimal impact |
| 5 | No Effect | Documentation, logging only |

### Likelihood Levels
| Level | Name | Description |
|-------|------|-------------|
| A | Frequent | Likely to occur often |
| B | Probable | Will occur several times |
| C | Occasional | Likely to occur sometime |
| D | Remote | Unlikely but possible |
| E | Improbable | Very unlikely to occur |

### Risk Matrix
```
                    SEVERITY
              1    2    3    4    5
         ┌────┬────┬────┬────┬────┐
    A    │ ██ │ ██ │ ██ │ ░░ │ ░░ │
    L    ├────┼────┼────┼────┼────┤
    I    │ ██ │ ██ │ ░░ │ ░░ │ ░░ │
    K    ├────┼────┼────┼────┼────┤
    E    │ ██ │ ░░ │ ░░ │ ░░ │ ░░ │
    L    ├────┼────┼────┼────┼────┤
    I    │ ░░ │ ░░ │ ░░ │ ░░ │ ░░ │
    H    ├────┼────┼────┼────┼────┤
    O    │ ░░ │ ░░ │ ░░ │ ░░ │ ░░ │
    O    └────┴────┴────┴────┴────┘
    D
         ██ = Unacceptable (requires mitigation)
         ░░ = Acceptable (monitor)
```

## Execution

### 1. Load Story/Wave
Read story or all stories in wave.

### 2. Identify Hazards
For each story, analyze:
- Security implications
- Data handling risks
- Integration points
- Failure modes

### 3. Assess Each Hazard
- Assign severity (1-5)
- Assign likelihood (A-E)
- Calculate risk level
- Identify affected stories/ACs

### 4. Define Mitigations
For unacceptable risks:
- Define mitigation action
- Assign owner
- Define verification method
- Calculate residual risk

### 5. Generate Hazard File

```json
{
  "documentId": "HAZ-{SCOPE}-001",
  "title": "Hazard Analysis - {scope}",
  "hazards": [
    {
      "id": "HAZ-001",
      "title": "{hazard title}",
      "category": "Security",
      "severity": "Hazardous",
      "likelihood": "Remote",
      "riskLevel": "Medium",
      "description": "{description}",
      "affectedStories": ["{STORY-ID}"],
      "potentialCauses": ["cause 1", "cause 2"],
      "mitigations": [
        {
          "id": "MIT-001-A",
          "action": "{mitigation action}",
          "owner": "{agent}",
          "verificationMethod": "{how to verify}"
        }
      ],
      "residualRisk": "Low"
    }
  ]
}
```

## Output Format

```
╔══════════════════════════════════════════════════════════════════════════════╗
║  HAZARD ANALYSIS: {scope}                                                    ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  IDENTIFIED HAZARDS                                                          ║
║  ──────────────────                                                          ║
║                                                                              ║
║  HAZ-001: Authentication Bypass                                              ║
║  ├─ Category: Security                                                       ║
║  ├─ Severity: Hazardous (2) | Likelihood: Remote (D)                         ║
║  ├─ Risk: MEDIUM (requires mitigation)                                       ║
║  ├─ Affects: AUTH-BE-002, AUTH-BE-003, AUTH-BE-004                           ║
║  └─ Mitigations:                                                             ║
║     • MIT-001-A: Enforce password policy [BE-Dev]                            ║
║     • MIT-001-B: Use framework auth [BE-Dev]                                 ║
║     Residual Risk: Low ✓                                                     ║
║                                                                              ║
║  HAZ-002: User Enumeration                                                   ║
║  ├─ Category: Security                                                       ║
║  ├─ Severity: Major (3) | Likelihood: Probable (B)                           ║
║  ├─ Risk: MEDIUM (requires mitigation)                                       ║
║  ...                                                                         ║
║                                                                              ║
║  RISK SUMMARY                                                                ║
║  ────────────                                                                ║
║  Total Hazards: {N}                                                          ║
║  Unacceptable (pre-mitigation): {N}                                          ║
║  Acceptable (post-mitigation): {N}                                           ║
║                                                                              ║
║  File: planning/hazards/{scope}-hazards.json                                 ║
╚══════════════════════════════════════════════════════════════════════════════╝
```
