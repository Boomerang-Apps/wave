# Step 0: Design Foundation - Architecture & Code Review

**Document Type:** AI Code Review & Enhancement Request
**Target Reviewer:** Grok / Claude / GPT-4
**Generated:** 2026-01-25
**Version:** 1.0.0

---

## Executive Summary

Step 0 (Gate 0) is the **Design Foundation Analysis** phase of the WAVE Framework. It validates that a project has the necessary foundation (documentation, mockups, structure) before AI agents begin development work.

### Key Capabilities
- **Dual-Mode Analysis**: Automatically detects NEW vs EXISTING projects
- **Real-Time SSE Streaming**: Step-by-step progress with proof artifacts
- **Database Persistence**: Results stored in Supabase for historical tracking
- **Readiness Scoring**: Weighted scoring system (0-100%) with blocking thresholds

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           WAVE Portal - Step 0                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐       │
│  │   Frontend UI    │    │   Backend API    │    │    Database      │       │
│  │                  │    │                  │    │                  │       │
│  │ MockupDesignTab  │───▶│ /api/analyze-    │───▶│ foundation_      │       │
│  │ FoundationAnalysis│◀──│ foundation-stream│◀───│ analysis_results │       │
│  │ Progress         │SSE │                  │    │                  │       │
│  └──────────────────┘    └────────┬─────────┘    └──────────────────┘       │
│                                   │                                          │
│                          ┌────────▼─────────┐                               │
│                          │  Foundation      │                               │
│                          │  Analyzer        │                               │
│                          │  (Core Logic)    │                               │
│                          └──────────────────┘                               │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## File Structure

```
portal/
├── src/
│   └── components/
│       ├── MockupDesignTab.tsx          # Main Gate 0 UI component
│       └── FoundationAnalysisProgress.tsx # Analysis progress modal
├── server/
│   ├── index.js                         # API endpoints
│   └── utils/
│       └── foundation-analyzer.js       # Core analysis logic
└── supabase/
    └── migrations/
        └── 006_foundation_analysis.sql  # Database schema
```

---

## Component Details

### 1. Foundation Analyzer (`server/utils/foundation-analyzer.js`)

**Purpose:** Core analysis engine that examines project structure, documentation, mockups, and code patterns.

#### Mode Detection Logic

```javascript
export function detectProjectMode(projectPath) {
  // FUNDAMENTAL: Only actual code files indicate "existing" project
  // package.json with dependencies alone does NOT make it "existing"

  const codeDirs = ['src', 'app', 'lib', 'pages', 'components'];
  const codeExtensions = ['.ts', '.tsx', '.js', '.jsx', '.py', '.go', '.rs'];

  for (const dir of codeDirs) {
    const dirPath = path.join(projectPath, dir);
    if (fs.existsSync(dirPath)) {
      const files = fs.readdirSync(dirPath, { recursive: true });
      const hasCodeFiles = files.some(file =>
        codeExtensions.some(ext => String(file).endsWith(ext))
      );
      if (hasCodeFiles) return 'existing';
    }
  }
  return 'new';
}
```

**Critical Design Decision:** A project with `package.json` but no source code files is classified as "new" - this allows scaffolded projects to still go through foundation validation.

#### Analysis Steps

| Mode | Steps | Description |
|------|-------|-------------|
| **NEW** | 6 | Foundation validation for greenfield projects |
| **EXISTING** | 10 | Comprehensive codebase analysis |

##### NEW Project Steps (6 total)
1. **Structure Scan** - Check for required folders (docs/, design_mockups/)
2. **Documentation Validation** - Find PRD, README, CLAUDE.md
3. **Mockup Analysis** - Count and validate HTML mockups
4. **Folder Compliance** - Score folder structure adherence
5. **Tech Stack Detection** - Parse package.json for frameworks
6. **Readiness Score Generation** - Calculate weighted score

##### EXISTING Project Steps (10 total)
1. Structure Scan
2. Tech Stack Detection
3. **Architecture Analysis** - Detect Next.js App/Pages Router, component patterns
4. **Source File Counting** - TypeScript, JavaScript, CSS file counts
5. Documentation Discovery
6. Mockup Check
7. **Code Pattern Analysis** - hooks/, components/, api/, utils/ detection
8. **Test Coverage Detection** - Find test files and configs
9. **Issue Identification** - Large files, TODO comments, .env exposure
10. Comprehensive Report Generation

#### Readiness Score Calculation

```javascript
export function calculateReadinessScore(results, mode) {
  const weights = mode === 'new' ? {
    documentation: 30,  // PRD is critical
    mockups: 25,        // Design before code
    structure: 20,      // Organized foundation
    compliance: 15,     // Best practices
    techstack: 10       // Tech defined
  } : {
    documentation: 15,
    mockups: 10,
    structure: 15,
    techstack: 15,
    architecture: 15,
    sourcefiles: 10,
    patterns: 10,
    testing: 10
  };

  for (const [key, weight] of Object.entries(weights)) {
    const result = results[key];
    if (result?.status === 'pass') score += weight;
    else if (result?.status === 'warn') score += weight * 0.6;
    // fail = 0 points
  }
  return Math.round(score);
}
```

**Blocking Threshold:** Score < 40% automatically blocks progression to Gate 1.

---

### 2. API Endpoint (`server/index.js`)

**Endpoint:** `POST /api/analyze-foundation-stream`

**Protocol:** Server-Sent Events (SSE)

#### Request
```json
{
  "projectPath": "/path/to/project",
  "mode": "auto" | "new" | "existing"
}
```

#### SSE Event Types

| Event | Payload | Description |
|-------|---------|-------------|
| `mode` | `{type: 'mode', mode: 'new'|'existing', totalSteps: number}` | Project mode detected |
| `step` | `{step: number, status: 'running'|'complete'|'failed', detail: string, proof: string}` | Step progress |
| `result` | `{type: 'result', report: FoundationReport}` | Final analysis result |
| `error` | `{type: 'error', error: string}` | Error occurred |

#### Database Persistence

```javascript
async function persistFoundationAnalysis(report) {
  const record = {
    project_path: report.projectPath,
    project_name: path.basename(report.projectPath),
    analysis_mode: report.mode,
    validation_status: report.validationStatus,
    readiness_score: report.readinessScore,
    total_issues: report.issues?.length || 0,
    critical_issues: report.blockingReasons?.length || 0,
    docs_count: report.analysis?.documentation?.docsFound?.length || 0,
    mockups_count: report.analysis?.mockups?.count || 0,
    analysis_data: report,  // Full JSONB
    findings: report.findings || [],
    issues: report.issues || [],
    recommendations: report.recommendations || [],
    blocking_reasons: report.blockingReasons || [],
    tech_stack: report.analysis?.techstack?.techStack || [],
  };

  // Upsert to Supabase
  await fetch(`${supabaseUrl}/rest/v1/foundation_analysis_results`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${supabaseKey}` },
    body: JSON.stringify(record),
  });
}
```

---

### 3. Frontend Components

#### FoundationAnalysisProgress.tsx

**Purpose:** Modal component displaying real-time analysis progress with step-by-step updates.

**Key Features:**
- Dynamic step count based on detected mode
- Real-time SSE consumption with TextDecoder
- Proof artifact display for each completed step
- Result summary with docs/mockups/issues metrics
- Blocking reasons highlighted in red

**State Management:**
```typescript
const [analysisRunning, setAnalysisRunning] = useState(false);
const [analysisMode, setAnalysisMode] = useState<'new' | 'existing' | null>(null);
const [analysisSteps, setAnalysisSteps] = useState<AnalysisStep[]>([]);
const [analysisReport, setAnalysisReport] = useState<FoundationReport | null>(null);
```

#### MockupDesignTab.tsx

**Purpose:** Main Gate 0 UI with project connection, discovery, and analysis trigger.

**States:**
1. **Not Connected** - Folder picker (native macOS Finder integration)
2. **Discovering** - Auto-detecting docs, mockups, structure
3. **Connected** - Display project info with "Analyze Foundation" button

---

### 4. Database Schema

**Table:** `foundation_analysis_results`

```sql
CREATE TABLE foundation_analysis_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Identification
    project_id UUID,                    -- Optional FK
    project_path TEXT NOT NULL,
    project_name TEXT,

    -- Analysis Results
    analysis_mode VARCHAR(20) NOT NULL, -- 'new' | 'existing'
    validation_status VARCHAR(20) NOT NULL, -- 'ready' | 'blocked'
    readiness_score INTEGER NOT NULL,   -- 0-100

    -- Counts
    total_issues INTEGER DEFAULT 0,
    critical_issues INTEGER DEFAULT 0,
    warnings INTEGER DEFAULT 0,
    docs_count INTEGER DEFAULT 0,
    mockups_count INTEGER DEFAULT 0,

    -- Full Data
    analysis_data JSONB NOT NULL,       -- Complete report

    -- Arrays (indexed for queries)
    findings TEXT[] DEFAULT '{}',
    issues TEXT[] DEFAULT '{}',
    recommendations TEXT[] DEFAULT '{}',
    blocking_reasons TEXT[] DEFAULT '{}',
    tech_stack TEXT[] DEFAULT '{}',

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Constraints
    CONSTRAINT valid_analysis_mode CHECK (analysis_mode IN ('new', 'existing')),
    CONSTRAINT valid_validation_status CHECK (validation_status IN ('ready', 'blocked')),
    CONSTRAINT valid_readiness_score CHECK (readiness_score >= 0 AND readiness_score <= 100)
);

-- Indexes for common queries
CREATE INDEX idx_foundation_analysis_project_path ON foundation_analysis_results(project_path);
CREATE INDEX idx_foundation_analysis_status ON foundation_analysis_results(validation_status);
CREATE INDEX idx_foundation_analysis_created ON foundation_analysis_results(created_at DESC);
```

---

## Data Flow

```
User clicks "Analyze Foundation"
         │
         ▼
┌────────────────────┐
│ Frontend sends     │
│ POST request       │
└────────┬───────────┘
         │
         ▼
┌────────────────────┐
│ detectProjectMode()│──── Checks src/, app/, lib/ for code files
└────────┬───────────┘
         │
         ▼
┌────────────────────┐
│ Run Analysis Steps │
│ (6 or 10 based on  │
│  detected mode)    │
│                    │
│ Each step:         │
│ 1. Send SSE        │
│    "running"       │
│ 2. Execute logic   │
│ 3. Send SSE        │
│    "complete"      │
│    with proof      │
└────────┬───────────┘
         │
         ▼
┌────────────────────┐
│ calculateReadiness │
│ Score()            │
└────────┬───────────┘
         │
         ▼
┌────────────────────┐
│ Determine blocking │
│ reasons            │
│                    │
│ - Missing PRD      │
│ - No mockups       │
│ - Score < 40%      │
└────────┬───────────┘
         │
         ▼
┌────────────────────┐
│ persistFoundation  │───▶ Supabase DB
│ Analysis()         │
└────────┬───────────┘
         │
         ▼
┌────────────────────┐
│ Send final SSE     │
│ with report        │
└────────┬───────────┘
         │
         ▼
┌────────────────────┐
│ Frontend updates   │
│ - Shows result     │
│ - Calls callbacks  │
│ - Enables Gate 1   │
│   (if ready)       │
└────────────────────┘
```

---

## TypeScript Types

```typescript
// Analysis Step
interface AnalysisStep {
  step: number;
  status: 'pending' | 'running' | 'complete' | 'failed';
  detail: string;
  proof: string | null;
}

// Foundation Report
interface FoundationReport {
  timestamp: string;
  mode: 'new' | 'existing';
  projectPath: string;
  readinessScore: number;
  analysis: {
    structure?: AnalysisResult;
    documentation?: DocAnalysisResult;
    mockups?: MockupAnalysisResult;
    compliance?: ComplianceResult;
    techstack?: TechStackResult;
    architecture?: ArchitectureResult;
    sourcefiles?: SourceFilesResult;
    patterns?: PatternsResult;
    testing?: TestingResult;
    issues?: IssuesResult;
  };
  findings: string[];
  issues: string[];
  recommendations: string[];
  validationStatus: 'ready' | 'blocked';
  blockingReasons: string[];
  id?: string;        // From DB after persistence
  persisted?: boolean;
}

// Analysis Result (base)
interface AnalysisResult {
  status: 'pass' | 'warn' | 'fail';
  findings: string[];
  issues: string[];
  proof?: string;
}
```

---

## Current Issues & Enhancement Opportunities

### 1. **Mode Detection Edge Cases**
- Empty `src/` folder currently returns 'new' but might confuse users
- Monorepo detection not implemented
- Python/Go projects without standard folder names may misdetect

**Suggested Enhancement:**
```javascript
// Add monorepo detection
const workspacesFile = safeReadJSON(path.join(projectPath, 'package.json'));
if (workspacesFile?.workspaces) {
  return 'monorepo'; // New mode
}
```

### 2. **Scoring System Rigidity**
- Fixed weights don't account for project type variations
- No user-configurable thresholds
- Binary pass/warn/fail doesn't capture nuance

**Suggested Enhancement:**
```javascript
// Configurable scoring profiles
const SCORING_PROFILES = {
  strict: { documentation: 40, mockups: 30, ... },
  lenient: { documentation: 20, mockups: 15, ... },
  api_only: { documentation: 30, testing: 40, ... },
};
```

### 3. **Missing AI Integration**
- No Claude/GPT code review integration
- Static analysis only, no semantic understanding
- No automatic fix suggestions

**Suggested Enhancement:**
```javascript
// Add AI-powered code review step
async function aiCodeReview(projectPath, model = 'claude-opus-4-5-20251101') {
  const codeSnippets = extractKeySnippets(projectPath);
  const review = await anthropic.messages.create({
    model,
    messages: [{ role: 'user', content: buildReviewPrompt(codeSnippets) }]
  });
  return parseReviewResponse(review);
}
```

### 4. **No Diff Tracking**
- Can't compare current vs previous analysis
- No trend visualization
- No regression detection

**Suggested Enhancement:**
```sql
-- Add diff column
ALTER TABLE foundation_analysis_results
ADD COLUMN previous_analysis_id UUID REFERENCES foundation_analysis_results(id);

-- Add improvement_delta computed
ALTER TABLE foundation_analysis_results
ADD COLUMN score_delta INTEGER GENERATED ALWAYS AS (
  readiness_score - (
    SELECT readiness_score
    FROM foundation_analysis_results prev
    WHERE prev.id = previous_analysis_id
  )
) STORED;
```

### 5. **Limited Proof Artifacts**
- Only text proofs, no screenshots
- No code snippet preservation
- No exportable report format

**Suggested Enhancement:**
```typescript
interface EnhancedProof {
  type: 'text' | 'code' | 'tree' | 'screenshot';
  content: string;
  language?: string;  // For code highlighting
  metadata?: {
    filePath?: string;
    lineNumbers?: [number, number];
  };
}
```

### 6. **Missing Recommendations Engine**
- Recommendations are hardcoded
- No priority ranking
- No automated fix actions

**Suggested Enhancement:**
```javascript
const RECOMMENDATION_RULES = [
  {
    condition: (report) => !report.analysis.documentation?.docsFound?.some(d => d.name === 'PRD'),
    recommendation: {
      title: 'Create PRD Document',
      priority: 'critical',
      action: 'create_file',
      template: 'templates/PRD.md',
      targetPath: 'docs/PRD.md',
    }
  },
  // ... more rules
];
```

### 7. **No Caching**
- Full re-analysis on every run
- No incremental analysis
- Slow for large projects

**Suggested Enhancement:**
```javascript
// File hash-based caching
async function getCachedOrAnalyze(projectPath, step) {
  const hash = await computeProjectHash(projectPath);
  const cached = await cache.get(`${projectPath}:${step}:${hash}`);
  if (cached) return cached;

  const result = await runAnalysisStep(step, projectPath);
  await cache.set(`${projectPath}:${step}:${hash}`, result, TTL_1_HOUR);
  return result;
}
```

---

## API Reference

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/analyze-foundation-stream` | Start foundation analysis (SSE) |
| `GET` | `/api/foundation-analysis/history` | Get analysis history |
| `GET` | `/api/foundation-analysis/history?projectPath=...` | Filter by project |
| `GET` | `/api/foundation-analysis/:id` | Get specific analysis |

### Query Parameters

| Param | Type | Description |
|-------|------|-------------|
| `projectPath` | string | Filter history by project path |
| `limit` | number | Max results (default: 10) |

---

## Test Coverage

**Test File:** `server/__tests__/foundation-analyzer.test.js`

**Coverage Areas:**
- Mode detection (new vs existing)
- Each analysis function
- Score calculation
- Edge cases (empty folders, missing files)

**Run Tests:**
```bash
npm test -- foundation-analyzer
```

---

## Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_SUPABASE_URL` | Yes | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Yes | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Optional | Service role for admin ops |

---

## Security Considerations

1. **Path Traversal**: Currently validates `fs.existsSync(projectPath)` but should add path sanitization
2. **File Read Limits**: No limit on file sizes read during analysis
3. **SSE Connection**: No authentication on SSE endpoint
4. **Database Access**: Uses anon key which relies on RLS policies

---

## Performance Metrics

| Operation | Typical Duration | Notes |
|-----------|------------------|-------|
| Mode Detection | < 100ms | Single directory scan |
| Full NEW Analysis | 2-5s | 6 steps with artificial delays |
| Full EXISTING Analysis | 5-15s | 10 steps, recursive file counting |
| Database Persist | 50-200ms | Single Supabase insert |

---

## Glossary

| Term | Definition |
|------|------------|
| **Gate 0** | Design Foundation validation phase |
| **NEW Project** | Greenfield project with no source code |
| **EXISTING Project** | Project with source code to analyze |
| **Readiness Score** | 0-100% indicating foundation completeness |
| **Blocking** | Status preventing progression to Gate 1 |
| **Proof** | Evidence artifact showing what was analyzed |

---

## Questions for Grok Review

1. **Architecture**: Is the dual-mode approach (NEW vs EXISTING) the right abstraction? Should there be more granular modes?

2. **Scoring**: Are the current weight distributions appropriate? Should scoring be ML-based?

3. **Performance**: What caching strategies would work best for large monorepos?

4. **AI Integration**: Where should AI code review fit - as a step, post-analysis, or separate feature?

5. **UX**: Is the SSE streaming approach optimal, or would WebSockets provide better capabilities?

6. **Data Model**: Is JSONB for `analysis_data` the right choice vs normalized tables?

7. **Security**: What additional validation is needed for the `projectPath` parameter?

8. **Testing**: What edge cases are missing from the current test suite?

---

## Appendix: Sample Analysis Output

```json
{
  "timestamp": "2026-01-25T20:36:44.123Z",
  "mode": "new",
  "projectPath": "/Volumes/SSD-01/Projects/Footprint",
  "readinessScore": 62,
  "validationStatus": "blocked",
  "analysis": {
    "structure": {
      "status": "warn",
      "findings": ["✅ Found design_mockups/ folder"],
      "issues": ["Missing required folder: docs/"]
    },
    "documentation": {
      "status": "fail",
      "findings": ["✅ Found README: README.md (45 lines)"],
      "issues": ["⚠️ Missing PRD document - required for AI agents"],
      "docsFound": [{"name": "README", "path": "README.md", "lines": 45}]
    },
    "mockups": {
      "status": "pass",
      "findings": ["✅ Found mockups folder: design_mockups/"],
      "count": 13,
      "mockupsFound": ["01-upload.html", "02-style-selection.html", ...]
    }
  },
  "blockingReasons": ["Missing PRD document"],
  "recommendations": ["Add a PRD.md or AI-PRD.md document"]
}
```

---

**End of Document**

*This document is intended for AI review and enhancement suggestions. Please analyze the architecture, identify potential improvements, and suggest concrete code changes.*
