# Gate 0: Design Foundation Analysis

**Date:** 2026-01-25
**Status:** IN PROGRESS
**Phase:** Launch Sequence Step 0

---

## 1. Overview

Gate 0 (Design Foundation) is the first step in the WAVE 10-Step Launch Sequence. It validates that a project's design foundation is ready before proceeding to development.

### 1.1 FUNDAMENTAL: Dual-Mode Support

Gate 0 must support **TWO project scenarios**:

| Mode | Description | Use Case |
|------|-------------|----------|
| **NEW PROJECT** | Starting from scratch | Validate foundation is ready to begin development |
| **EXISTING PROJECT** | Connecting to GitHub/Vercel/local codebase | Analyze what was already built |

### 1.2 Auto-Detection Logic

```
Has src/ or app/ with code files (.ts, .tsx, .js)?
  YES → EXISTING PROJECT MODE (comprehensive 10-step analysis)
  NO  → NEW PROJECT MODE (foundation 6-step validation)
```

---

## 2. Analysis Steps

### 2.1 New Project Mode (6 Steps)

| Step | Name | Purpose | Pass Criteria |
|------|------|---------|---------------|
| 1 | Scan project structure | Validate folder organization | Required folders exist |
| 2 | Validate documentation | Check docs completeness | PRD document found |
| 3 | Analyze design mockups | Verify mockups exist | HTML mockups in design_mockups/ |
| 4 | Check folder compliance | Best practices validation | Compliance score >= 60% |
| 5 | Validate tech stack | Check stack definition | package.json or tech docs exist |
| 6 | Generate readiness score | Calculate overall score | Score >= 60% |

### 2.2 Existing Project Mode (10 Steps)

| Step | Name | Purpose | Output |
|------|------|---------|--------|
| 1 | Scan project structure | Understand folder layout | Directory tree |
| 2 | Detect tech stack | Identify frameworks/libraries | Tech stack list |
| 3 | Analyze code architecture | Detect patterns (App Router, etc.) | Architecture type |
| 4 | Count source files | Quantify codebase size | File counts by type |
| 5 | Find documentation | Locate existing docs | Doc list with locations |
| 6 | Check design mockups | Find mockups if present | Mockup count |
| 7 | Analyze code patterns | Detect hooks, components, API | Patterns found |
| 8 | Detect test coverage | Find test files and config | Test count |
| 9 | Identify issues | Find potential problems | Issue list |
| 10 | Generate report | Comprehensive summary | Full analysis report |

---

## 3. Technical Implementation

### 3.1 Backend Endpoint

```
POST /api/analyze-foundation-stream
Content-Type: application/json

Request:
{
  "projectPath": "/path/to/project",
  "mode": "auto" | "new" | "existing"  // Optional, defaults to auto
}

Response: text/event-stream (SSE)
```

### 3.2 SSE Event Format

```typescript
interface AnalysisEvent {
  step: number | 'done' | 'error';
  status: 'running' | 'complete' | 'failed';
  detail: string;
  proof?: string;
  timestamp: string;
  mode?: 'new' | 'existing';  // Included in first event
}

interface FinalResult {
  type: 'result';
  report: FoundationReport;
}
```

### 3.3 Report Structure

```typescript
interface FoundationReport {
  timestamp: string;
  mode: 'new' | 'existing';
  projectPath: string;
  readinessScore: number;  // 0-100

  // Analysis results
  structure: AnalysisResult;
  documentation: AnalysisResult & { docsFound: DocInfo[] };
  mockups: AnalysisResult & { count: number };
  techStack: AnalysisResult & { stack: string[] };

  // Existing project only
  architecture?: AnalysisResult & { pattern: string };
  sourceFiles?: AnalysisResult & { counts: FileCounts };
  patterns?: AnalysisResult & { patterns: PatternFlags };
  testing?: AnalysisResult & { testCount: number };
  issues?: AnalysisResult;

  // Summary
  findings: string[];
  issues: string[];
  recommendations: string[];

  // Validation
  validationStatus: 'ready' | 'blocked';
  blockingReasons: string[];
}

interface AnalysisResult {
  status: 'pass' | 'warn' | 'fail';
  findings: string[];
  issues: string[];
  proof: string;
}
```

---

## 4. Validation Logic

### 4.1 Blocking Conditions

**New Project Mode:**
- No PRD document found → BLOCKED
- No mockups folder → BLOCKED
- Readiness score < 40% → BLOCKED

**Existing Project Mode:**
- No package.json → BLOCKED
- Unrecognized tech stack → BLOCKED
- Readiness score < 40% → BLOCKED

### 4.2 Warning Conditions (non-blocking)

- Missing CLAUDE.md
- Missing README.md
- Structure compliance < 60%
- No test files found
- Large files detected

### 4.3 Readiness Score Weights

**New Project Mode:**
| Component | Weight |
|-----------|--------|
| Documentation | 30% |
| Mockups | 25% |
| Structure | 20% |
| Compliance | 15% |
| Tech Stack | 10% |

**Existing Project Mode:**
| Component | Weight |
|-----------|--------|
| Documentation | 15% |
| Tech Stack | 15% |
| Architecture | 15% |
| Structure | 15% |
| Source Files | 10% |
| Mockups | 10% |
| Patterns | 10% |
| Testing | 10% |

---

## 5. UI Integration

### 5.1 MockupDesignTab Updates

```typescript
// New state variables
const [analysisRunning, setAnalysisRunning] = useState(false);
const [analysisMode, setAnalysisMode] = useState<'new' | 'existing' | null>(null);
const [analysisSteps, setAnalysisSteps] = useState<AnalysisStep[]>([]);
const [analysisReport, setAnalysisReport] = useState<FoundationReport | null>(null);

// Validation callback
onValidationComplete(report.validationStatus);
```

### 5.2 UI Components

1. **ActionBar** - "Analyze Foundation" button
2. **AnalysisProgress** - Step-by-step progress display
3. **KPICards** - Readiness score, docs found, mockups count
4. **ExpandableCard** - Detailed findings per category
5. **ResultSummary** - Overall status (READY/BLOCKED)

---

## 6. Files Structure

### 6.1 New Files

```
portal/
├── server/
│   └── utils/
│       └── foundation-analyzer.js     # Core analysis logic
├── src/
│   └── components/
│       └── FoundationAnalysisProgress.tsx  # Progress UI
└── docs/
    └── GATE-0-DESIGN-FOUNDATION.md    # This document
```

### 6.2 Modified Files

```
portal/
├── server/
│   ├── index.js                       # Add SSE endpoint
│   └── middleware/
│       └── schemas.js                 # Add validation schema
└── src/
    ├── components/
    │   └── MockupDesignTab.tsx        # Add analysis UI
    └── pages/
        └── ProjectChecklist.tsx       # Integration (if needed)
```

---

## 7. TDD Test Plan

### 7.1 Test Categories

| Category | Tests | Description |
|----------|-------|-------------|
| Mode Detection | 4 | Auto-detect new vs existing |
| New Project Analysis | 6 | Foundation validation |
| Existing Project Analysis | 10 | Comprehensive analysis |
| SSE Streaming | 3 | Event stream handling |
| Validation Status | 4 | Ready/blocked determination |
| **Total** | **27** | |

### 7.2 Test Cases

```javascript
// Mode Detection Tests
test_detect_new_project_empty_folder()
test_detect_new_project_docs_only()
test_detect_existing_project_with_src()
test_detect_existing_project_with_package_deps()

// New Project Analysis Tests
test_analyze_structure_finds_required_folders()
test_analyze_documentation_finds_prd()
test_analyze_mockups_counts_html_files()
test_analyze_compliance_calculates_score()
test_analyze_techstack_from_package_json()
test_calculate_readiness_score_new_project()

// Existing Project Analysis Tests
test_analyze_architecture_detects_nextjs_app_router()
test_analyze_architecture_detects_pages_router()
test_analyze_source_files_counts_by_type()
test_analyze_patterns_finds_hooks_folder()
test_analyze_patterns_finds_components_folder()
test_analyze_testing_finds_test_files()
test_analyze_testing_finds_jest_config()
test_identify_issues_finds_large_files()
test_identify_issues_checks_env_gitignore()
test_calculate_readiness_score_existing_project()

// SSE Streaming Tests
test_stream_sends_mode_in_first_event()
test_stream_sends_all_steps_in_order()
test_stream_sends_final_result()

// Validation Status Tests
test_status_blocked_when_no_prd_new_project()
test_status_blocked_when_no_mockups_new_project()
test_status_ready_when_all_checks_pass()
test_status_blocked_when_score_below_40()
```

---

## 8. Success Criteria

### 8.1 Gate 0 Checklist

- [ ] Mode detection works correctly
- [ ] New project analysis runs 6 steps
- [ ] Existing project analysis runs 10 steps
- [ ] SSE streaming works with progress updates
- [ ] Readiness score calculated correctly
- [ ] Validation status flows to parent component
- [ ] Green checkmark shows when ready
- [ ] All 27 tests pass

### 8.2 Acceptance Criteria

1. Connect to empty folder → shows "New Project" mode, validates foundation
2. Connect to Footprint → shows "Existing Project" mode, analyzes codebase
3. Analysis progress shows step-by-step with timing
4. Final report shows readiness score, findings, issues
5. "Analyze Foundation" button triggers analysis
6. Step 0 gets green checkmark when analysis passes

---

## 9. References

- [Launch Sequence Implementation](../LAUNCH-SEQUENCE-IMPLEMENTATION.md)
- [Gate Dependencies](../server/utils/gate-dependencies.js)
- [Step 1 Analysis Pattern](../server/index.js#L514-L672)
- [MockupDesignTab Component](../src/components/MockupDesignTab.tsx)

---

**Next Step:** Write TDD tests (all must FAIL before implementation)
