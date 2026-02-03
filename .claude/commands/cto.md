# /cto - CTO Advisor & Strategic Analysis

**Priority:** P1 (Critical)
**Aliases:** /advisor, /strategy, /recommend

## Purpose

Comprehensive CTO-level analysis of project health, technical debt, risks, and strategic recommendations. Provides actionable next steps prioritized by business impact and technical urgency.

## When to Run

- Start of new development cycle
- Before major releases
- Weekly project health check
- When deciding what to work on next
- After completing a wave/milestone
- When onboarding to a project

---

## Arguments

| Argument | Description |
|----------|-------------|
| `full` | Complete analysis (all sections) - DEFAULT |
| `quick` | Fast executive summary (~2 min) |
| `health` | Project health metrics only |
| `debt` | Technical debt analysis only |
| `risks` | Risk assessment only |
| `roadmap` | Strategic roadmap recommendations |
| `next` | Just "what should I do next?" |

---

## Execution Protocol

### Phase 1: Data Collection (Parallel)

Run these analyses simultaneously:

```bash
# 1. Git & Repository Health
git status --short
git branch -a | wc -l
git log --oneline --since="7 days ago" | wc -l
git stash list | wc -l

# 2. Code Metrics
find . -name "*.ts" -o -name "*.tsx" | wc -l
find . -name "*.test.ts" -o -name "*.spec.ts" | wc -l

# 3. Dependency Health
npm audit --json 2>/dev/null | head -50
npm outdated --json 2>/dev/null | head -50

# 4. Build Status
npm run build 2>&1 | tail -20

# 5. Test Status
npm test -- --coverage --reporter=json 2>/dev/null | tail -50

# 6. TODO/FIXME Count
grep -r "TODO\|FIXME\|HACK\|XXX" --include="*.ts" --include="*.tsx" . | wc -l
```

### Phase 2: Wave/Story Analysis

```bash
# Story completion status
find stories/ -name "*.json" -exec grep -l '"status": "completed"' {} \; | wc -l
find stories/ -name "*.json" -exec grep -l '"status": "in_progress"' {} \; | wc -l
find stories/ -name "*.json" -exec grep -l '"status": "pending"' {} \; | wc -l

# Gate passage rates
# Check signal files for gate completions
```

### Phase 3: Analysis & Scoring

Calculate scores for each dimension (0-100):

| Dimension | Weight | Factors |
|-----------|--------|---------|
| Code Quality | 20% | Lint errors, type coverage, complexity |
| Test Coverage | 20% | Statement, branch, function coverage |
| Security | 20% | Vulnerabilities, audit findings, secrets |
| Dependencies | 15% | Outdated packages, known CVEs |
| Architecture | 15% | Pattern compliance, modularity |
| Documentation | 10% | README, API docs, inline comments |

**Overall Health Score** = Weighted average

---

## Output Format

### Executive Summary (Always Shown)

```
╔══════════════════════════════════════════════════════════════════════════════╗
║  CTO ADVISOR - PROJECT ANALYSIS                                              ║
║  {Project Name} | {Date}                                                     ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  OVERALL HEALTH SCORE: {XX}/100  {EMOJI}                                     ║
║  ══════════════════════════════                                              ║
║                                                                              ║
║  ████████████████████░░░░░░░░░░  {XX}% - {STATUS}                            ║
║                                                                              ║
║  Quick Stats:                                                                ║
║  ┌─────────────────┬─────────────────┬─────────────────┐                     ║
║  │ Code Quality    │ Test Coverage   │ Security        │                     ║
║  │ {XX}/100        │ {XX}%           │ {X} issues      │                     ║
║  └─────────────────┴─────────────────┴─────────────────┘                     ║
║                                                                              ║
║  TOP 3 PRIORITIES:                                                           ║
║  1. {Priority 1 - Most Critical}                                             ║
║  2. {Priority 2}                                                             ║
║  3. {Priority 3}                                                             ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

### Health Score Interpretation

| Score | Status | Emoji | Meaning |
|-------|--------|-------|---------|
| 90-100 | Excellent | 🟢 | Production-ready, minimal issues |
| 75-89 | Good | 🟡 | Healthy, minor improvements needed |
| 60-74 | Fair | 🟠 | Attention needed, technical debt accumulating |
| 40-59 | Poor | 🔴 | Significant issues, prioritize fixes |
| 0-39 | Critical | ⛔ | Major intervention required |

---

### Detailed Sections

#### 1. PROJECT HEALTH METRICS

```
╔══════════════════════════════════════════════════════════════════════════════╗
║  PROJECT HEALTH METRICS                                                      ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  CODE QUALITY                                     Score: {XX}/100            ║
║  ─────────────                                                               ║
║  TypeScript Files:     {XXX} files                                           ║
║  Type Coverage:        {XX}%                                                 ║
║  Lint Errors:          {X} errors, {X} warnings                              ║
║  Complexity Hotspots:  {X} files > 200 lines                                 ║
║                                                                              ║
║  TEST COVERAGE                                    Score: {XX}/100            ║
║  ─────────────                                                               ║
║  Statements:           {XX}% ████████░░ (target: 70%)                        ║
║  Branches:             {XX}% ██████░░░░ (target: 65%)                        ║
║  Functions:            {XX}% ████████░░ (target: 75%)                        ║
║  Test Files:           {XX} files                                            ║
║  Test-to-Code Ratio:   1:{X.X}                                               ║
║                                                                              ║
║  SECURITY POSTURE                                 Score: {XX}/100            ║
║  ────────────────                                                            ║
║  Vulnerabilities:      {X} critical, {X} high, {X} moderate                  ║
║  Secrets Detected:     {X} potential leaks                                   ║
║  OWASP Compliance:     {X}/10 categories passing                             ║
║  Last Security Scan:   {date}                                                ║
║                                                                              ║
║  DEPENDENCY HEALTH                                Score: {XX}/100            ║
║  ─────────────────                                                           ║
║  Total Dependencies:   {XXX} packages                                        ║
║  Outdated:             {X} major, {X} minor, {X} patch                       ║
║  Deprecated:           {X} packages                                          ║
║  Last Updated:         {date}                                                ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

#### 2. TECHNICAL DEBT ANALYSIS

```
╔══════════════════════════════════════════════════════════════════════════════╗
║  TECHNICAL DEBT ANALYSIS                                                     ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  DEBT INVENTORY                                                              ║
║  ──────────────                                                              ║
║  TODO Comments:        {XX} items                                            ║
║  FIXME Comments:       {XX} items                                            ║
║  HACK Comments:        {XX} items                                            ║
║  Skipped Tests:        {XX} tests                                            ║
║  Any Casts:            {XX} occurrences                                      ║
║  Console.logs:         {XX} in production code                               ║
║                                                                              ║
║  DEBT BY CATEGORY                                                            ║
║  ────────────────                                                            ║
║  Architecture:         ████░░░░░░  {XX}%                                     ║
║  Code Quality:         ██████░░░░  {XX}%                                     ║
║  Testing:              ████████░░  {XX}%                                     ║
║  Documentation:        ██░░░░░░░░  {XX}%                                     ║
║  Security:             ███░░░░░░░  {XX}%                                     ║
║                                                                              ║
║  HIGH-PRIORITY DEBT ITEMS                                                    ║
║  ────────────────────────                                                    ║
║  1. {File}: {Description} (Impact: HIGH)                                     ║
║  2. {File}: {Description} (Impact: HIGH)                                     ║
║  3. {File}: {Description} (Impact: MEDIUM)                                   ║
║                                                                              ║
║  ESTIMATED PAYOFF EFFORT                                                     ║
║  ───────────────────────                                                     ║
║  Quick Wins (<1 hour):     {X} items                                         ║
║  Medium Effort (1-4 hrs):  {X} items                                         ║
║  Major Refactor (1+ days): {X} items                                         ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

#### 3. RISK ASSESSMENT

```
╔══════════════════════════════════════════════════════════════════════════════╗
║  RISK ASSESSMENT                                                             ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  CRITICAL RISKS (Immediate Action Required)                                  ║
║  ──────────────────────────────────────────                                  ║
║  ⛔ {Risk 1}: {Description}                                                  ║
║     Impact: {HIGH/CRITICAL} | Likelihood: {HIGH}                             ║
║     Mitigation: {Recommended action}                                         ║
║                                                                              ║
║  HIGH RISKS (Address This Sprint)                                            ║
║  ────────────────────────────────                                            ║
║  🔴 {Risk 2}: {Description}                                                  ║
║     Impact: {HIGH} | Likelihood: {MEDIUM}                                    ║
║     Mitigation: {Recommended action}                                         ║
║                                                                              ║
║  MEDIUM RISKS (Plan for Next Sprint)                                         ║
║  ───────────────────────────────────                                         ║
║  🟠 {Risk 3}: {Description}                                                  ║
║     Impact: {MEDIUM} | Likelihood: {MEDIUM}                                  ║
║     Mitigation: {Recommended action}                                         ║
║                                                                              ║
║  RISK MATRIX                                                                 ║
║  ───────────                                                                 ║
║                    L I K E L I H O O D                                       ║
║                    Low    Med    High                                        ║
║  I  │ High    │   {X}  │  {X}  │  {X}  │                                     ║
║  M  │ Medium  │   {X}  │  {X}  │  {X}  │                                     ║
║  P  │ Low     │   {X}  │  {X}  │  {X}  │                                     ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

#### 4. WAVE/STORY PROGRESS

```
╔══════════════════════════════════════════════════════════════════════════════╗
║  WAVE PROGRESS & VELOCITY                                                    ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  CURRENT WAVE STATUS                                                         ║
║  ───────────────────                                                         ║
║  Active Wave:          Wave {N} - {Name}                                     ║
║  Progress:             ████████░░░░░░░░  {XX}% ({X}/{Y} stories)             ║
║  Stories Completed:    {X}                                                   ║
║  Stories In Progress:  {X}                                                   ║
║  Stories Pending:      {X}                                                   ║
║  Stories Blocked:      {X}                                                   ║
║                                                                              ║
║  GATE PASSAGE RATES                                                          ║
║  ──────────────────                                                          ║
║  Gate 0 (Preflight):   {XX}% pass rate                                       ║
║  Gate 1 (Self-Review): {XX}% pass rate                                       ║
║  Gate 2 (Build):       {XX}% pass rate                                       ║
║  Gate 3 (Tests):       {XX}% pass rate                                       ║
║  Gate 4 (QA):          {XX}% pass rate                                       ║
║  Gate 5 (PM):          {XX}% pass rate                                       ║
║  Gate 6 (Architecture):{XX}% pass rate                                       ║
║  Gate 7 (Merge):       {XX}% pass rate                                       ║
║                                                                              ║
║  VELOCITY METRICS                                                            ║
║  ────────────────                                                            ║
║  Stories/Week (avg):   {X.X}                                                 ║
║  Cycle Time (avg):     {X} days                                              ║
║  Blockers Resolved:    {X} this week                                         ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

#### 5. CTO RECOMMENDATIONS

```
╔══════════════════════════════════════════════════════════════════════════════╗
║  CTO STRATEGIC RECOMMENDATIONS                                               ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  IMMEDIATE ACTIONS (Do Today)                                                ║
║  ════════════════════════════                                                ║
║  1. 🔴 {Action 1}                                                            ║
║     Why: {Business/technical justification}                                  ║
║     Command: {/command to run}                                               ║
║                                                                              ║
║  2. 🔴 {Action 2}                                                            ║
║     Why: {Business/technical justification}                                  ║
║     Command: {/command to run}                                               ║
║                                                                              ║
║  THIS WEEK PRIORITIES                                                        ║
║  ════════════════════                                                        ║
║  3. 🟠 {Action 3}                                                            ║
║     Why: {Justification}                                                     ║
║     Effort: {Low/Medium/High}                                                ║
║                                                                              ║
║  4. 🟠 {Action 4}                                                            ║
║     Why: {Justification}                                                     ║
║     Effort: {Low/Medium/High}                                                ║
║                                                                              ║
║  STRATEGIC INITIATIVES (This Month)                                          ║
║  ══════════════════════════════════                                          ║
║  5. 🟡 {Initiative 1}                                                        ║
║     Impact: {Description of business value}                                  ║
║                                                                              ║
║  6. 🟡 {Initiative 2}                                                        ║
║     Impact: {Description of business value}                                  ║
║                                                                              ║
║  RECOMMENDED COMMAND SEQUENCE                                                ║
║  ════════════════════════════                                                ║
║  ```bash                                                                     ║
║  /security deps          # Fix critical vulnerabilities                      ║
║  /test --ci              # Verify test coverage                              ║
║  /harden quick           # Quick quality check                               ║
║  /story {NEXT-ID}        # Continue development                              ║
║  ```                                                                         ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

---

## Quick Mode Output (`/cto quick`)

```
╔══════════════════════════════════════════════════════════════════════════════╗
║  CTO QUICK ASSESSMENT                                                        ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  Health: {XX}/100 {EMOJI}  |  Risks: {X}  |  Debt Items: {XX}                ║
║                                                                              ║
║  DO NOW:                                                                     ║
║  → {Most important action}                                                   ║
║  → {Second action}                                                           ║
║                                                                              ║
║  Run `/cto full` for detailed analysis                                       ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

---

## Next Mode Output (`/cto next`)

```
╔══════════════════════════════════════════════════════════════════════════════╗
║  WHAT SHOULD I DO NEXT?                                                      ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  Based on current project state, here's your prioritized action list:        ║
║                                                                              ║
║  1. {Action} - {Why this is #1}                                              ║
║     └── Command: {/command}                                                  ║
║                                                                              ║
║  2. {Action} - {Why this is #2}                                              ║
║     └── Command: {/command}                                                  ║
║                                                                              ║
║  3. {Action} - {Why this is #3}                                              ║
║     └── Command: {/command}                                                  ║
║                                                                              ║
║  BLOCKED? Run `/escalate` to flag for human review                           ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

---

## Research Validation

### Sources

1. **DORA Metrics (DevOps Research and Assessment)**
   - URL: https://dora.dev/research/
   - Type: industry-standard
   - Credibility: high
   - Key Insights:
     - Four key metrics: deployment frequency, lead time, change failure rate, time to restore
     - Elite performers deploy on-demand with <1 hour lead time
     - Measuring and improving these metrics correlates with organizational performance

2. **Technical Debt Quadrant (Martin Fowler)**
   - URL: https://martinfowler.com/bliki/TechnicalDebtQuadrant.html
   - Type: best-practice-guide
   - Credibility: high
   - Key Insights:
     - Categorize debt as Reckless/Prudent and Deliberate/Inadvertent
     - Prudent deliberate debt can be strategic
     - Track and prioritize debt payoff

3. **OWASP Risk Rating Methodology**
   - URL: https://owasp.org/www-community/OWASP_Risk_Rating_Methodology
   - Type: industry-standard
   - Credibility: high
   - Key Insights:
     - Risk = Likelihood × Impact
     - Consider both technical and business factors
     - Prioritize based on risk score

4. **Google Engineering Practices**
   - URL: https://google.github.io/eng-practices/
   - Type: best-practice-guide
   - Credibility: high
   - Key Insights:
     - Code review best practices
     - Small, focused changes
     - Continuous improvement mindset

5. **Accelerate Book Metrics**
   - URL: https://itrevolution.com/book/accelerate/
   - Type: academic-paper
   - Credibility: high
   - Key Insights:
     - Software delivery performance predicts organizational performance
     - Culture and practices matter more than tools
     - Continuous improvement is key

---

## Integration

- **Uses:** `/status`, `/security`, `/test`, `/harden`, `/wave-status`, `/branch-health`
- **Triggers:** Can be run automatically at session start via `/go`
- **Outputs:** Recommendations that map to other commands

---

## Example Usage

```bash
# Full CTO analysis
/cto

# Quick health check
/cto quick

# Just tell me what to do next
/cto next

# Focus on specific areas
/cto health      # Project health metrics only
/cto debt        # Technical debt analysis
/cto risks       # Risk assessment only
/cto roadmap     # Strategic recommendations

# Aliases
/advisor
/strategy
/recommend
```

---

## Decision Framework

The CTO Advisor uses this prioritization framework:

```
PRIORITY MATRIX
═══════════════

                    BUSINESS IMPACT
                    Low         High
              ┌───────────┬───────────┐
        High  │  P2       │  P1       │
URGENCY       │  Schedule │  DO NOW   │
              ├───────────┼───────────┤
        Low   │  P4       │  P3       │
              │  Backlog  │  Plan     │
              └───────────┴───────────┘

P1: Critical blockers, security issues, production bugs
P2: Technical debt affecting velocity, failing tests
P3: Strategic improvements, architecture enhancements
P4: Nice-to-haves, minor optimizations
```

---

*Command Version: 1.0*
*Last Updated: 2026-02-03*
