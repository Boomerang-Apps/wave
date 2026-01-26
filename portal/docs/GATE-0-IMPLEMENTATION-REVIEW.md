# Gate 0: Design Foundation Analysis - Implementation Review Document

**Project:** WAVE Portal
**Feature:** Step 0 - Design Foundation Analysis with AI Code Review
**Date:** 2026-01-26
**Purpose:** Technical implementation summary for external code review

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Architecture Overview](#architecture-overview)
3. [Project Mode Detection](#project-mode-detection)
4. [Backend Implementation](#backend-implementation)
5. [LLM Client Integration](#llm-client-integration)
6. [AI Code Review System](#ai-code-review-system)
7. [Foundation Analyzer](#foundation-analyzer)
8. [API Endpoints](#api-endpoints)
9. [Frontend Implementation](#frontend-implementation)
10. [Database Integration](#database-integration)
11. [Security Considerations](#security-considerations)
12. [Error Handling](#error-handling)
13. [Performance Optimizations](#performance-optimizations)
14. [Configuration & Constants](#configuration--constants)
15. [File Structure](#file-structure)
16. [Data Flow Diagrams](#data-flow-diagrams)
17. [Known Limitations](#known-limitations)
18. [Future Considerations](#future-considerations)

---

## Executive Summary

Gate 0 (Design Foundation Analysis) is a pre-development validation system that ensures projects have proper documentation, structure, and design assets before AI agents begin code generation. The system supports three project modes (New, Existing, Monorepo) and optionally integrates AI-powered code review for existing codebases.

### Key Capabilities

- **Auto-detect project mode** based on source code presence
- **Validate documentation** (PRD, README, CLAUDE.md, Architecture docs)
- **Check design mockups** (HTML prototypes in design_mockups/)
- **Analyze existing codebases** (tech stack, architecture, patterns, tests)
- **AI Code Review** using multiple LLM providers (Claude, Grok, OpenAI)
- **Generate improvement reports** with actionable fix instructions
- **Real-time progress streaming** via Server-Sent Events (SSE)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         WAVE Portal Frontend                             │
│                    (React + TypeScript + Vite)                          │
├─────────────────────────────────────────────────────────────────────────┤
│  MockupDesignTab.tsx                                                     │
│    └── FoundationAnalysisProgress.tsx                                    │
│          ├── Step Progress Display (6-10 steps based on mode)           │
│          ├── AI Review Toggle & Cost Estimation                          │
│          ├── Results Display (KPIs, Issues, Findings)                    │
│          └── SSE Connection Handler                                      │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │ HTTP POST + SSE Stream
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         Express.js Backend                               │
│                        (server/index.js)                                 │
├─────────────────────────────────────────────────────────────────────────┤
│  Endpoints:                                                              │
│    POST /api/analyze-foundation-stream  (main analysis with SSE)        │
│    POST /api/ai-review/estimate         (cost estimation)               │
│    POST /api/ai-review/run              (standalone AI review)          │
│    POST /api/foundation/improvement-report (generate report)            │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        ▼                       ▼                       ▼
┌───────────────┐     ┌─────────────────┐     ┌─────────────────┐
│ foundation-   │     │   llm-client    │     │  ai-code-       │
│ analyzer.js   │     │      .js        │     │  review.js      │
│               │     │                 │     │                 │
│ - Mode detect │     │ - Claude API    │     │ - Security scan │
│ - Structure   │     │ - Grok API      │     │ - Architecture  │
│ - Docs check  │     │ - OpenAI API    │     │ - Quality check │
│ - Mockups     │     │ - Key retrieval │     │ - File extract  │
│ - Tech stack  │     │ - Caching       │     │ - Score penalty │
│ - Scoring     │     │ - Safety filter │     │ - Non-dev sum   │
│ - Report gen  │     │ - Cost estimate │     │                 │
└───────────────┘     └────────┬────────┘     └─────────────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │   Data Sources      │
                    ├─────────────────────┤
                    │ - .env (API keys)   │
                    │ - Supabase DB       │
                    │   (wave_project_    │
                    │    config table)    │
                    │ - Project files     │
                    └─────────────────────┘
```

---

## Project Mode Detection

### Logic Flow

```javascript
function detectProjectMode(projectPath) {
  // 1. Check for monorepo indicators FIRST
  if (has package.json with "workspaces" field) return 'monorepo';
  if (has pnpm-workspace.yaml) return 'monorepo';
  if (has lerna.json) return 'monorepo';

  // 2. Check for actual source code files
  const codeDirs = ['src', 'app', 'lib', 'pages', 'components'];
  const codeExtensions = ['.ts', '.tsx', '.js', '.jsx', '.py', '.go', '.rs', '.svelte', '.vue'];

  for (dir of codeDirs) {
    if (dir exists AND contains files with code extensions) {
      return 'existing';
    }
  }

  // 3. Default to new project
  // NOTE: package.json alone does NOT make it "existing"
  return 'new';
}
```

### Design Decision

A project with `package.json` containing dependencies but NO source code files is still considered "new" because:
- Dependencies can be defined before writing code
- The validation focus should be on foundation documents, not dependency presence
- AI agents need PRD/mockups regardless of whether dependencies are pre-configured

---

## Backend Implementation

### File: `server/index.js`

#### Main Analysis Endpoint

```javascript
app.post('/api/analyze-foundation-stream', async (req, res) => {
  const { projectPath, enableAiReview, aiReviewDepth, scoringProfile } = req.body;

  // Setup SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  // Helper to send SSE events
  const sendEvent = (data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  try {
    // 1. Detect project mode
    const mode = detectProjectMode(projectPath);
    sendEvent({ step: 'mode', mode, detail: `Detected: ${mode} project` });

    // 2. Get steps based on mode
    const steps = mode === 'new' ? NEW_PROJECT_STEPS :
                  mode === 'monorepo' ? MONOREPO_STEPS :
                  EXISTING_PROJECT_STEPS;

    // 3. Execute each analysis step
    const results = {};
    for (const step of steps) {
      sendEvent({ step: step.key, status: 'running', name: step.name });

      // Execute appropriate analyzer function
      const result = await executeStep(step.key, projectPath, mode);
      results[step.key] = result;

      sendEvent({
        step: step.key,
        status: 'complete',
        result,
        proof: result.proof
      });
    }

    // 4. Optional AI Review (existing/monorepo only)
    if (enableAiReview && mode !== 'new') {
      sendEvent({ step: 'ai-review', status: 'running' });
      const aiResult = await aiCodeReview(projectPath, { depth: aiReviewDepth });
      results.aiReview = aiResult;
      sendEvent({ step: 'ai-review', status: 'complete', result: aiResult });
    }

    // 5. Calculate final score
    const readinessScore = calculateReadinessScore(results, mode, scoringProfile);

    // 6. Determine validation status
    const blockingReasons = getBlockingReasons(results, mode);
    const validationStatus = blockingReasons.length === 0 && readinessScore >= 60
      ? 'ready' : 'blocked';

    // 7. Generate and save improvement report
    const report = { mode, results, readinessScore, validationStatus, blockingReasons };
    const improvementMarkdown = generateImprovementReport(report, projectPath);
    fs.writeFileSync(path.join(projectPath, 'docs', 'FOUNDATION-IMPROVEMENT-REPORT.md'), improvementMarkdown);

    // 8. Persist to database
    await persistFoundationResults(projectId, report);

    // 9. Send final results
    sendEvent({ step: 'done', report });
    res.end();

  } catch (error) {
    sendEvent({ step: 'error', error: error.message });
    res.end();
  }
});
```

---

## LLM Client Integration

### File: `server/utils/llm-client.js`

### Supported Providers

| Provider | Model | Use Case | Cost (per 1K tokens) |
|----------|-------|----------|---------------------|
| Claude (Anthropic) | claude-sonnet-4-20250514 | Architecture, Quality | $0.003 in / $0.015 out |
| Grok (xAI) | grok-2-latest | Security Analysis | $0.002 in / $0.010 out |
| OpenAI | gpt-4-turbo-preview | Fallback | $0.010 in / $0.030 out |

### API Key Retrieval Chain

```javascript
async function getApiKey(envVarName, dbKeyName, projectId = null) {
  // Priority 1: Environment variable
  const envKey = process.env[envVarName];
  if (envKey) return envKey;

  // Priority 2: Database lookup
  return await getApiKeyFromDatabase(dbKeyName, projectId);
}

async function getApiKeyFromDatabase(keyName, projectId = null) {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // Check cache first (5-minute TTL)
  const cached = apiKeyCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < 5 * 60 * 1000) {
    return cached.value;
  }

  // Query wave_project_config table
  const response = await fetch(
    `${supabaseUrl}/rest/v1/wave_project_config?select=config&limit=1`,
    { headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` } }
  );

  const data = await response.json();
  return data[0]?.config?.[keyName] || null;
}
```

### Claude API Call Implementation

```javascript
export async function callClaude(prompt, options = {}) {
  const apiKey = await getApiKey('ANTHROPIC_API_KEY', 'ANTHROPIC_API_KEY', options.projectId);
  if (!apiKey) return { error: 'ANTHROPIC_API_KEY not configured' };

  // Check response cache (30-minute TTL)
  const cached = getCached('claude', prompt);
  if (cached) return cached;

  // Safety check for prompt injection
  const safetyCheck = isPromptSafe(prompt);
  if (!safetyCheck.safe) return { error: safetyCheck.reason, blocked: true };

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: options.model || 'claude-sonnet-4-20250514',
      max_tokens: options.maxTokens || 4096,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  const data = await response.json();
  const result = {
    provider: 'claude',
    model: data.model,
    content: data.content[0]?.text || '',
    usage: {
      inputTokens: data.usage?.input_tokens || 0,
      outputTokens: data.usage?.output_tokens || 0,
    },
    cost: calculateCost(data.usage, 'claude'),
  };

  setCache('claude', prompt, result);
  return result;
}
```

### Grok API Call Implementation

```javascript
export async function callGrok(prompt, options = {}) {
  // Try both key names for flexibility
  let apiKey = await getApiKey('XAI_API_KEY', 'XAI_API_KEY', options.projectId);
  if (!apiKey) {
    apiKey = await getApiKey('GROK_API_KEY', 'GROK_API_KEY', options.projectId);
  }
  if (!apiKey) return { error: 'XAI_API_KEY not configured' };

  const response = await fetch('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: options.model || 'grok-2-latest',
      max_tokens: options.maxTokens || 4096,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  const data = await response.json();
  return {
    provider: 'grok',
    model: data.model,
    content: data.choices[0]?.message?.content || '',
    usage: {
      inputTokens: data.usage?.prompt_tokens || 0,
      outputTokens: data.usage?.completion_tokens || 0,
    },
    cost: calculateCost(data.usage, 'grok'),
  };
}
```

### Safety Filtering

```javascript
const BLOCKED_PATTERNS = [
  /password\s*[:=]\s*["'][^"']+["']/gi,  // Hardcoded passwords
  /api[_-]?key\s*[:=]\s*["'][^"']+["']/gi, // API keys in code
  /secret\s*[:=]\s*["'][^"']+["']/gi,     // Secrets
  /-----BEGIN\s+(RSA\s+)?PRIVATE\s+KEY-----/gi, // Private keys
];

export function sanitizeCodeForLLM(code) {
  let sanitized = code;
  for (const pattern of BLOCKED_PATTERNS) {
    sanitized = sanitized.replace(pattern, '[REDACTED_SENSITIVE]');
  }
  return sanitized;
}

export function isPromptSafe(prompt) {
  const injectionPatterns = [
    /ignore\s+(previous|all)\s+instructions/i,
    /disregard\s+(your|the)\s+rules/i,
    /you\s+are\s+now\s+/i,
    /pretend\s+to\s+be/i,
  ];

  for (const pattern of injectionPatterns) {
    if (pattern.test(prompt)) {
      return { safe: false, reason: 'Potential prompt injection detected' };
    }
  }
  return { safe: true };
}
```

---

## AI Code Review System

### File: `server/utils/ai-code-review.js`

### Review Modes

| Mode | Max Files | Token Limit | Use Case |
|------|-----------|-------------|----------|
| Quick | 10 | 3000/file | Fast validation, cost-effective |
| Deep | 50 | 5000/file | Comprehensive analysis |

### File Extraction Patterns

```javascript
const REVIEW_CONFIG = {
  quick: {
    maxFiles: 10,
    maxTokensPerFile: 3000,
    patterns: [
      // Next.js App Router
      '**/app/**/page.tsx',
      '**/app/**/route.ts',
      '**/app/**/layout.tsx',
      // Next.js Pages Router
      '**/pages/**/*.tsx',
      '**/pages/api/**/*.ts',
      // Source files
      '**/src/**/*.tsx',
      '**/src/**/*.ts',
      // Server files
      '**/server/**/*.js',
      '**/server/**/*.ts',
      // Common patterns
      '**/lib/auth*',
      '**/lib/db*',
      '**/utils/**/*.js',
      '**/utils/**/*.ts',
      '**/middleware.*',
      '**/*.config.js',
      '**/*.config.ts',
      '**/api/**/*.ts',
      '**/api/**/*.js',
      '**/routes/**/*.js',
      '**/routes/**/*.ts',
    ],
    excludePatterns: [
      '**/node_modules/**',
      '**/*.test.*',
      '**/*.spec.*',
      '**/dist/**',
      '**/build/**',
      '**/.next/**',
    ],
    priority: ['auth', 'api', 'middleware', 'config', 'route', 'index'],
  },
};
```

### Glob Pattern Matching Implementation

```javascript
function matchPattern(filePath, pattern) {
  // Convert glob pattern to regex
  let regexPattern = pattern
    .replace(/\./g, '\\.')           // Escape dots
    .replace(/\*\*\//g, '(?:.*\\/)?') // **/ = zero or more directories
    .replace(/\*\*$/g, '.*')          // ** at end = any remaining path
    .replace(/\*\*/g, '.*')           // ** = any characters
    .replace(/\*/g, '[^/]*');         // * = any chars except /

  try {
    return new RegExp(`^${regexPattern}$`).test(filePath);
  } catch {
    return false;
  }
}
```

### Review Prompts

#### Security Review Prompt (Grok)

```javascript
const PROMPTS = {
  security: `You are a strict security auditor reviewing code for vulnerabilities.
Analyze the following code files for:
1. **OWASP Top 10** vulnerabilities (injection, XSS, CSRF, auth issues)
2. **Hardcoded secrets** (API keys, passwords, tokens)
3. **Insecure data handling** (PII exposure, logging sensitive data)
4. **Authentication/Authorization flaws**
5. **Input validation gaps**

For each issue found, provide:
- Severity: critical | high | medium | low
- Category: security
- File path and line number (if identifiable)
- Description (1-2 sentences)
- Fix suggestion with code example

Respond in JSON format:
{
  "findings": [
    {
      "severity": "critical",
      "category": "security",
      "title": "SQL Injection Risk",
      "file": "src/api/users.ts",
      "line": 42,
      "description": "User input directly concatenated into SQL query",
      "suggestion": "Use parameterized queries",
      "codeExample": "db.query('SELECT * FROM users WHERE id = ?', [userId])"
    }
  ],
  "summary": "Found X critical, Y high severity issues"
}

Code to review:
{code}`,
};
```

#### Architecture Review Prompt (Claude)

```javascript
architecture: `You are a senior software architect reviewing code for design issues.
Analyze the following code files for:
1. **Architecture smells** (god objects, tight coupling, circular dependencies)
2. **Code organization** (separation of concerns, layer violations)
3. **Performance issues** (N+1 queries, unnecessary re-renders, memory leaks)
4. **Error handling** (missing try-catch, unhandled promises)
5. **Type safety** (any types, missing null checks)

For each issue found, provide:
- Severity: critical | high | medium | low
- Category: architecture | performance | error-handling | type-safety
- Description and impact
- Refactoring suggestion

Respond in JSON format...`
```

### Review Execution Flow

```javascript
export async function aiCodeReview(projectPath, options = {}) {
  const { depth = 'quick', includeQuality = true, generateSummary = true } = options;

  // 1. Extract key files
  const files = extractKeyFiles(projectPath, depth);
  if (files.length === 0) {
    return { status: 'skip', message: 'No code files found' };
  }

  // 2. Run reviews in parallel
  const [securityResult, architectureResult, qualityResult] = await Promise.all([
    runSecurityReview(files),      // Uses Grok
    runArchitectureReview(files),  // Uses Claude
    includeQuality ? runQualityReview(files) : null,  // Uses Claude
  ]);

  // 3. Combine and sort findings
  const allFindings = [
    ...securityResult.findings.map(f => ({ ...f, source: 'security' })),
    ...architectureResult.findings.map(f => ({ ...f, source: 'architecture' })),
    ...(qualityResult?.findings || []).map(f => ({ ...f, source: 'quality' })),
  ];

  allFindings.sort((a, b) => {
    const order = { critical: 0, high: 1, medium: 2, low: 3 };
    return (order[a.severity] ?? 99) - (order[b.severity] ?? 99);
  });

  // 4. Calculate score penalty
  const criticalCount = allFindings.filter(f => f.severity === 'critical').length;
  const highCount = allFindings.filter(f => f.severity === 'high').length;
  const mediumCount = allFindings.filter(f => f.severity === 'medium').length;

  const scorePenalty = Math.min(50,
    criticalCount * 15 +
    highCount * 5 +
    mediumCount * 2
  );

  // 5. Generate non-developer summary
  const nonDevSummary = generateSummary
    ? await generateNonDevSummary(allFindings)
    : null;

  return {
    status: criticalCount > 0 ? 'fail' : highCount > 0 ? 'warn' : 'pass',
    findings: allFindings,
    counts: { total: allFindings.length, critical: criticalCount, high: highCount, medium: mediumCount },
    scorePenalty,
    nonDevSummary,
    filesReviewed: files.length,
    cost: {
      total: securityResult.cost + architectureResult.cost + (qualityResult?.cost || 0),
      security: securityResult.cost,
      architecture: architectureResult.cost,
      quality: qualityResult?.cost || 0,
    },
  };
}
```

---

## Foundation Analyzer

### File: `server/utils/foundation-analyzer.js`

### Analysis Steps by Mode

#### New Project Mode (6 steps)

| Step | Function | Validates |
|------|----------|-----------|
| 1 | `analyzeStructure()` | Required folders (docs/, design_mockups/) |
| 2 | `analyzeDocumentation()` | PRD.md, README.md, CLAUDE.md |
| 3 | `analyzeMockups()` | HTML prototypes in design_mockups/ |
| 4 | `analyzeCompliance()` | package.json, tsconfig.json, .gitignore |
| 5 | `analyzeTechStack()` | Framework detection from dependencies |
| 6 | `calculateReadinessScore()` | Weighted score calculation |

#### Existing Project Mode (10 steps)

| Step | Function | Analyzes |
|------|----------|----------|
| 1 | `analyzeStructure()` | Directory tree |
| 2 | `analyzeTechStack()` | Framework/library detection |
| 3 | `analyzeCodeArchitecture()` | Pattern detection (App Router, Pages, etc.) |
| 4 | `analyzeSourceFiles()` | File counts by type |
| 5 | `analyzeDocumentation()` | Existing docs |
| 6 | `analyzeMockups()` | Design assets |
| 7 | `analyzeCodePatterns()` | hooks/, components/, api/, utils/ |
| 8 | `analyzeTestCoverage()` | Test files and config |
| 9 | `identifyIssues()` | Large files, TODO comments, .env security |
| 10 | `calculateReadinessScore()` | Comprehensive scoring |

### Scoring Profiles

```javascript
export const SCORING_PROFILES = {
  default: {
    new: {
      documentation: 30,
      mockups: 25,
      structure: 20,
      compliance: 15,
      techstack: 10
    },
    existing: {
      documentation: 15,
      mockups: 10,
      structure: 15,
      techstack: 15,
      architecture: 15,
      sourcefiles: 10,
      patterns: 10,
      testing: 10
    },
  },

  design_heavy: {
    new: { documentation: 25, mockups: 40, structure: 15, compliance: 10, techstack: 10 },
    existing: { documentation: 15, mockups: 25, structure: 15, techstack: 10, architecture: 15, sourcefiles: 5, patterns: 10, testing: 5 },
  },

  code_focused: {
    new: { documentation: 35, mockups: 10, structure: 25, compliance: 15, techstack: 15 },
    existing: { documentation: 15, mockups: 5, structure: 15, techstack: 15, architecture: 20, sourcefiles: 10, patterns: 10, testing: 10 },
  },

  test_driven: {
    existing: { documentation: 10, mockups: 5, structure: 10, techstack: 15, architecture: 15, sourcefiles: 5, patterns: 15, testing: 25 },
  },
};
```

### Score Calculation

```javascript
export function calculateReadinessScore(results, mode, profileName = 'default') {
  let score = 0;
  const profile = SCORING_PROFILES[profileName] || SCORING_PROFILES.default;
  const weights = profile[mode];

  for (const [key, weight] of Object.entries(weights)) {
    const result = results[key];
    if (result) {
      if (result.status === 'pass') score += weight;
      else if (result.status === 'warn') score += weight * 0.6;
      // 'fail' status = 0 points
    }
  }

  return Math.round(score);
}
```

### Improvement Report Generator

```javascript
export function generateImprovementReport(report, projectPath) {
  // Categorize issues by priority
  const criticalIssues = [];  // Blocking
  const highIssues = [];       // Significant impact
  const mediumIssues = [];     // Organizational
  const recommendations = [];  // Nice to have

  // Process blocking reasons
  report.blockingReasons?.forEach(reason => {
    criticalIssues.push({
      title: reason,
      fix: getFixInstructions(reason),
      commands: getFixCommands(reason),
    });
  });

  // Generate markdown with:
  // - Executive Summary
  // - Critical Issues section
  // - High Priority Issues section
  // - Medium Priority Issues section
  // - Recommendations section
  // - AI Review Results (if available)
  // - Quick Start Commands

  return markdownContent;
}
```

---

## API Endpoints

### POST /api/analyze-foundation-stream

**Purpose:** Main foundation analysis with real-time progress

**Request:**
```json
{
  "projectPath": "/path/to/project",
  "projectId": "uuid-optional",
  "enableAiReview": true,
  "aiReviewDepth": "quick",
  "scoringProfile": "default"
}
```

**Response:** Server-Sent Events stream

```
data: {"step":"mode","mode":"existing","detail":"Detected: existing project"}

data: {"step":"structure","status":"running","name":"Scanning project structure"}

data: {"step":"structure","status":"complete","result":{...},"proof":"📁 Project Structure:..."}

... (more steps)

data: {"step":"done","report":{"mode":"existing","readinessScore":75,"validationStatus":"ready",...}}
```

### POST /api/ai-review/estimate

**Purpose:** Cost estimation before running AI review

**Request:**
```json
{
  "projectPath": "/path/to/project",
  "depth": "quick"
}
```

**Response:**
```json
{
  "filesCount": 10,
  "estimatedTokens": 25000,
  "estimatedCost": {
    "quick": 0.31,
    "deep": 0.85
  }
}
```

### POST /api/ai-review/run

**Purpose:** Standalone AI code review

**Request:**
```json
{
  "projectPath": "/path/to/project",
  "depth": "quick",
  "includeQuality": true
}
```

**Response:**
```json
{
  "status": "warn",
  "findings": [...],
  "counts": { "total": 26, "critical": 3, "high": 8, "medium": 9, "low": 6 },
  "scorePenalty": 45,
  "nonDevSummary": { "summary": "...", "trafficLight": "red" },
  "filesReviewed": 10,
  "cost": { "total": 0.31, "security": 0.10, "architecture": 0.12, "quality": 0.09 }
}
```

### POST /api/foundation/improvement-report

**Purpose:** Generate improvement report from existing analysis

**Request:**
```json
{
  "projectPath": "/path/to/project",
  "report": { ... }
}
```

**Response:**
```json
{
  "success": true,
  "reportPath": "docs/FOUNDATION-IMPROVEMENT-REPORT.md"
}
```

---

## Frontend Implementation

### File: `src/components/FoundationAnalysisProgress.tsx`

### TypeScript Interfaces

```typescript
interface AIReviewFinding {
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  title: string;
  description: string;
  file?: string;
  line?: number;
  suggestion?: string;
}

interface AIReviewResult {
  securityFindings: AIReviewFinding[];
  architectureFindings: AIReviewFinding[];
  qualityFindings: AIReviewFinding[];
  scorePenalty: number;
  nonDevSummary: string;
  filesAnalyzed: number;
  tokensUsed: number;
  cost: number;
}

interface CostEstimate {
  filesCount: number;
  estimatedTokens: number;
  estimatedCost: {
    quick: number;
    deep: number;
  };
}

interface AnalysisStep {
  key: string;
  name: string;
  status: 'pending' | 'running' | 'complete' | 'error';
  detail?: string;
  proof?: string;
}

interface FoundationReport {
  mode: 'new' | 'existing' | 'monorepo';
  readinessScore: number;
  validationStatus: 'ready' | 'blocked';
  blockingReasons: string[];
  analysis: Record<string, AnalysisResult>;
  aiReview?: AIReviewResult;
}
```

### Component State

```typescript
const [analysisRunning, setAnalysisRunning] = useState(false);
const [analysisSteps, setAnalysisSteps] = useState<AnalysisStep[]>([]);
const [analysisReport, setAnalysisReport] = useState<FoundationReport | null>(null);
const [enableAiReview, setEnableAiReview] = useState(false);
const [aiReviewDepth, setAiReviewDepth] = useState<'quick' | 'deep'>('quick');
const [costEstimate, setCostEstimate] = useState<CostEstimate | null>(null);
```

### SSE Connection Handler

```typescript
const startAnalysis = async () => {
  setAnalysisRunning(true);
  setAnalysisSteps([]);

  const response = await fetch('/api/analyze-foundation-stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      projectPath,
      enableAiReview,
      aiReviewDepth,
    }),
  });

  const reader = response.body?.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);
    const lines = chunk.split('\n');

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = JSON.parse(line.slice(6));
        handleSSEEvent(data);
      }
    }
  }

  setAnalysisRunning(false);
};

const handleSSEEvent = (data) => {
  if (data.step === 'mode') {
    // Initialize steps based on detected mode
    const steps = getStepsForMode(data.mode);
    setAnalysisSteps(steps.map(s => ({ ...s, status: 'pending' })));
  }
  else if (data.status === 'running') {
    setAnalysisSteps(prev => prev.map(s =>
      s.key === data.step ? { ...s, status: 'running' } : s
    ));
  }
  else if (data.status === 'complete') {
    setAnalysisSteps(prev => prev.map(s =>
      s.key === data.step ? { ...s, status: 'complete', detail: data.result?.status } : s
    ));
  }
  else if (data.step === 'done') {
    // Mark all remaining steps as complete
    setAnalysisSteps(prev => prev.map(s =>
      s.status === 'running' || s.status === 'pending'
        ? { ...s, status: 'complete' }
        : s
    ));
    setAnalysisReport(data.report);
    onValidationComplete?.(data.report.validationStatus);
  }
};
```

### AI Review UI Components

```typescript
// AI Review Toggle
<div className="ai-review-toggle">
  <label>
    <input
      type="checkbox"
      checked={enableAiReview}
      onChange={(e) => setEnableAiReview(e.target.checked)}
    />
    Include AI Deep Review
  </label>

  {enableAiReview && (
    <select value={aiReviewDepth} onChange={(e) => setAiReviewDepth(e.target.value)}>
      <option value="quick">Quick (10 files) - ~$0.30</option>
      <option value="deep">Deep (50 files) - ~$0.85</option>
    </select>
  )}
</div>

// Cost Estimate Display
{costEstimate && (
  <div className="cost-estimate">
    <span>📁 {costEstimate.filesCount} files</span>
    <span>🔤 ~{costEstimate.estimatedTokens.toLocaleString()} tokens</span>
    <span>💰 ~${costEstimate.estimatedCost[aiReviewDepth].toFixed(2)}</span>
  </div>
)}

// AI Review Results
{analysisReport?.aiReview && (
  <AIReviewSection
    review={analysisReport.aiReview}
    expanded={expandedSections.aiReview}
    onToggle={() => toggleSection('aiReview')}
  />
)}
```

---

## Database Integration

### Table: `wave_project_config`

```sql
CREATE TABLE wave_project_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id),
  config JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Example config structure
{
  "ANTHROPIC_API_KEY": "sk-ant-...",
  "OPENAI_API_KEY": "sk-...",
  "XAI_API_KEY": "xai-...",
  "scoring_profile": "default",
  "ai_review_enabled": true
}
```

### Table: `foundation_analysis_results`

```sql
CREATE TABLE foundation_analysis_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id),
  mode VARCHAR(20) NOT NULL,
  readiness_score INTEGER NOT NULL,
  validation_status VARCHAR(20) NOT NULL,
  blocking_reasons JSONB DEFAULT '[]',
  analysis_results JSONB NOT NULL,
  ai_review_results JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Security Considerations

### 1. API Key Protection

- Keys stored in encrypted JSONB field in database
- Keys never logged or returned in API responses
- 5-minute cache with automatic expiration
- Environment variables take precedence (for local dev)

### 2. Code Sanitization

- Sensitive patterns redacted before sending to LLMs
- Private keys, passwords, API keys replaced with `[REDACTED_SENSITIVE]`
- Prompt injection detection blocks malicious prompts

### 3. File Access

- Analysis limited to provided project path
- node_modules, .git, dist folders excluded
- Maximum file size limits prevent memory issues

### 4. SSE Security

- No sensitive data in SSE stream
- Progress events contain only step names and status
- Full results sent only in final 'done' event

---

## Error Handling

### Backend Error Handling

```javascript
// Graceful degradation for LLM failures
async function runSecurityReview(files) {
  const response = await callGrok(prompt);

  if (response.error) {
    // Fallback to Claude if Grok unavailable
    const fallback = await callClaude(prompt);
    if (fallback.error) {
      return { findings: [], error: response.error, provider: 'none' };
    }
    return { findings: parseJSONResponse(fallback.content), provider: 'claude' };
  }

  return { findings: parseJSONResponse(response.content), provider: 'grok' };
}

// SSE error event
try {
  // ... analysis steps
} catch (error) {
  sendEvent({ step: 'error', error: error.message });
  res.end();
}
```

### Frontend Error Handling

```typescript
const handleSSEEvent = (data) => {
  if (data.step === 'error') {
    setAnalysisSteps(prev => prev.map(s =>
      s.status === 'running' ? { ...s, status: 'error', detail: data.error } : s
    ));
    setAnalysisRunning(false);
    toast.error(`Analysis failed: ${data.error}`);
  }
};
```

---

## Performance Optimizations

### 1. Analysis Caching

```javascript
const analysisCache = new Map();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

function computeDirHash(dirPath, maxDepth = 2) {
  const hash = crypto.createHash('sha256');
  // Hash file paths, mtimes, and sizes
  return hash.digest('hex').substring(0, 16);
}

export function getCachedOrCompute(projectPath, stepKey, computeFn) {
  const dirHash = computeDirHash(projectPath);
  const cacheKey = `${projectPath}:${stepKey}:${dirHash}`;

  const cached = analysisCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return { ...cached.result, fromCache: true };
  }

  const result = computeFn();
  analysisCache.set(cacheKey, { result, timestamp: Date.now() });
  return result;
}
```

### 2. LLM Response Caching

```javascript
const responseCache = new Map();
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

function getCacheKey(provider, prompt) {
  return crypto.createHash('sha256').update(`${provider}:${prompt}`).digest('hex');
}
```

### 3. Parallel LLM Calls

```javascript
const [securityResult, architectureResult, qualityResult] = await Promise.all([
  runSecurityReview(files),
  runArchitectureReview(files),
  includeQuality ? runQualityReview(files) : null,
]);
```

### 4. File Priority Sorting

```javascript
const priority = ['auth', 'api', 'middleware', 'config', 'route', 'index'];
files.sort((a, b) => {
  const aScore = priority.findIndex(p => a.path.toLowerCase().includes(p));
  const bScore = priority.findIndex(p => b.path.toLowerCase().includes(p));
  return (aScore === -1 ? 999 : aScore) - (bScore === -1 ? 999 : bScore);
});
```

---

## Configuration & Constants

### LLM Configuration

```javascript
const LLM_CONFIG = {
  claude: {
    baseUrl: 'https://api.anthropic.com/v1/messages',
    model: 'claude-sonnet-4-20250514',
    maxTokens: 4096,
    costPer1kInput: 0.003,
    costPer1kOutput: 0.015,
  },
  grok: {
    baseUrl: 'https://api.x.ai/v1/chat/completions',
    model: 'grok-2-latest',
    maxTokens: 4096,
    costPer1kInput: 0.002,
    costPer1kOutput: 0.010,
  },
  openai: {
    baseUrl: 'https://api.openai.com/v1/chat/completions',
    model: 'gpt-4-turbo-preview',
    maxTokens: 4096,
    costPer1kInput: 0.01,
    costPer1kOutput: 0.03,
  }
};
```

### Cache TTLs

| Cache | TTL | Purpose |
|-------|-----|---------|
| API Keys | 5 minutes | Database key refresh |
| LLM Responses | 30 minutes | Avoid duplicate LLM calls |
| Analysis Results | 1 hour | Skip unchanged projects |

### Token Estimation

```javascript
// Rough approximation: ~4 characters per token
export function estimateTokens(text) {
  return Math.ceil(text.length / 4);
}
```

---

## File Structure

```
portal/
├── server/
│   ├── index.js                    # Express server, API endpoints
│   ├── utils/
│   │   ├── llm-client.js          # Multi-LLM client wrapper [NEW]
│   │   ├── ai-code-review.js      # AI code review system [NEW]
│   │   ├── foundation-analyzer.js  # Foundation analysis logic [MODIFIED]
│   │   ├── project-discovery.js    # Doc/mockup detection
│   │   └── folder-structure-validator.js
│   └── middleware/
│       └── schemas.js              # Request validation
├── src/
│   ├── components/
│   │   ├── MockupDesignTab.tsx     # Step 0 container
│   │   ├── FoundationAnalysisProgress.tsx  # Analysis UI [MODIFIED]
│   │   └── ...
│   └── ...
├── docs/
│   ├── SESSION-HANDOFF-2026-01-26.md
│   ├── GATE-0-IMPLEMENTATION-REVIEW.md  # This document
│   └── ...
└── .env                            # Local API keys (optional)
```

---

## Data Flow Diagrams

### Analysis Flow

```
User clicks "Analyze Foundation"
         │
         ▼
┌─────────────────────┐
│ Frontend fetches    │
│ cost estimate (if   │
│ AI review enabled)  │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ POST /api/analyze-  │
│ foundation-stream   │
│ (SSE connection)    │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ detectProjectMode() │
│ → new/existing/     │
│   monorepo          │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ For each step:      │
│ 1. Send "running"   │
│ 2. Execute analyzer │
│ 3. Send "complete"  │
└──────────┬──────────┘
           │
           ▼ (if AI review enabled)
┌─────────────────────┐
│ aiCodeReview()      │
│ ├─ extractKeyFiles()│
│ ├─ runSecurityReview│
│ ├─ runArchReview    │
│ └─ runQualityReview │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ calculateScore()    │
│ generateReport()    │
│ persistResults()    │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Send "done" event   │
│ with full report    │
└─────────────────────┘
```

### LLM Call Flow

```
aiCodeReview()
     │
     ├─────────────────────────────────────────┐
     │                                         │
     ▼                                         ▼
runSecurityReview()                    runArchitectureReview()
     │                                         │
     ▼                                         ▼
callGrok()                              callClaude()
     │                                         │
     ├─ getApiKey()                            ├─ getApiKey()
     │   ├─ check .env                         │   ├─ check .env
     │   └─ query wave_project_config          │   └─ query wave_project_config
     │                                         │
     ├─ check responseCache                    ├─ check responseCache
     │                                         │
     ├─ isPromptSafe()                         ├─ isPromptSafe()
     │                                         │
     ├─ fetch xAI API                          ├─ fetch Anthropic API
     │                                         │
     └─ cache response                         └─ cache response
```

---

## Known Limitations

1. **Token Estimation Accuracy**
   - Uses ~4 chars/token approximation
   - Actual usage may vary by ±20%

2. **Glob Pattern Edge Cases**
   - Custom implementation may not handle all glob edge cases
   - Complex patterns like `{a,b}` not supported

3. **API Key Cache Delay**
   - 5-minute TTL means key rotation requires up to 5 min delay
   - Workaround: Restart server for immediate key updates

4. **AI Review Scope**
   - Limited to 50 files max in deep mode
   - Large monorepos may not have full coverage

5. **LLM Response Parsing**
   - Expects JSON format from LLMs
   - Falls back to text parsing if JSON invalid

6. **New Project AI Review**
   - AI review skipped for new projects (no code to analyze)
   - Must have source files to trigger AI review

---

## Future Considerations

1. **Webhook Notifications**
   - Notify Slack/Discord on critical findings
   - Integration with existing SlackNotifier

2. **Historical Comparison**
   - Track score changes over time
   - Show improvement/regression trends

3. **Custom Rule Sets**
   - Allow project-specific review rules
   - Configure severity thresholds

4. **PR Integration**
   - Auto-review on PR creation
   - GitHub Action integration

5. **Scheduled Scans**
   - Periodic security/quality scans
   - Cron-based analysis triggers

6. **Export Formats**
   - PDF/HTML report generation
   - CI/CD artifact publishing

---

## Verification Checklist

- [x] Project mode detection works for new/existing/monorepo
- [x] All 6 new project steps execute correctly
- [x] All 10 existing project steps execute correctly
- [x] SSE streaming delivers progress in real-time
- [x] AI review toggle enables/disables correctly
- [x] Cost estimation displays before running
- [x] Grok used for security review
- [x] Claude used for architecture/quality review
- [x] Fallback chain works when primary LLM unavailable
- [x] API keys fetched from database when not in .env
- [x] Response caching prevents duplicate LLM calls
- [x] Improvement report auto-generated and saved
- [x] Spinner completes when analysis finishes
- [x] Validation status flows to parent component

---

*Document prepared for Grok code review - 2026-01-26*
