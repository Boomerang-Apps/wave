/**
 * AI Code Review - Gate 0 Enhancement
 *
 * Provides semantic code analysis using LLMs to complement static analysis.
 * Detects architecture smells, security vulnerabilities, and best practice violations.
 *
 * Modes:
 * - Quick Scan: Sample key files (routes, configs, auth) - fast/cheap
 * - Deep Dive: Full repo analysis - thorough but costly
 *
 * Multi-LLM approach:
 * - Grok: Security & architecture focus (truthful, strict)
 * - Claude: Refactoring & code quality (creative, constructive)
 */

import fs from 'fs';
import path from 'path';
import {
  callClaude,
  callGrok,
  callBestAvailable,
  estimateTokens,
  estimateCost,
  sanitizeCodeForLLM,
} from './llm-client.js';

// =============================================================================
// CONFIGURATION
// =============================================================================

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
      // Server files (for Express/Node backends)
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
      '**/coverage/**',
      '**/__tests__/**',
    ],
    priority: ['auth', 'api', 'middleware', 'config', 'route', 'index'],
  },
  deep: {
    maxFiles: 50,
    maxTokensPerFile: 5000,
    patterns: [
      '**/*.ts',
      '**/*.tsx',
      '**/*.js',
      '**/*.jsx',
    ],
    excludePatterns: [
      '**/node_modules/**',
      '**/*.test.*',
      '**/*.spec.*',
      '**/dist/**',
      '**/build/**',
      '**/.next/**',
      '**/coverage/**',
      '**/__tests__/**',
    ],
  },
};

// =============================================================================
// REVIEW PROMPTS
// =============================================================================

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

Respond in JSON format:
{
  "findings": [
    {
      "severity": "high",
      "category": "architecture",
      "title": "God Component",
      "file": "src/components/Dashboard.tsx",
      "description": "Component handles 500+ lines with mixed concerns",
      "suggestion": "Split into smaller, focused components",
      "impact": "Hard to maintain and test"
    }
  ],
  "summary": "Architecture assessment summary"
}

Code to review:
{code}`,

  quality: `You are a helpful senior developer reviewing code for quality improvements.
Analyze the following code files for:
1. **Readability** (naming, comments, complexity)
2. **Modern patterns** (React hooks, Next.js best practices)
3. **DRY violations** (duplicated logic)
4. **Testability** (hard-to-test patterns)
5. **Documentation gaps**

Be constructive and provide actionable feedback. For each suggestion:
- Priority: high | medium | low
- Category: readability | patterns | dry | testability | docs
- Current code snippet
- Improved code snippet
- Plain-English explanation

Respond in JSON format:
{
  "findings": [
    {
      "severity": "medium",
      "category": "patterns",
      "title": "Class Component Could Be Functional",
      "file": "src/components/Header.tsx",
      "description": "Using class component where hooks would be cleaner",
      "before": "class Header extends Component {...}",
      "after": "function Header() { const [state, setState] = useState(); ... }",
      "plainEnglish": "Modern React apps use functions instead of classes - it's simpler and has better features"
    }
  ],
  "summary": "Code quality assessment summary"
}

Code to review:
{code}`,

  nonDevSummary: `Based on this code review, write a simple summary for someone who doesn't code.
Explain in plain English:
1. What the code does (one sentence)
2. Any problems found (use analogies, not tech jargon)
3. How serious the problems are (use traffic light: red/yellow/green)
4. What should be fixed first

Keep it under 200 words. Be friendly and reassuring.

Review findings:
{findings}`,
};

// =============================================================================
// FILE EXTRACTION
// =============================================================================

function safeReadFile(filePath, maxChars = 15000) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return content.slice(0, maxChars);
  } catch {
    return null;
  }
}

function findFiles(dirPath, patterns, excludePatterns = [], maxDepth = 5) {
  const files = [];

  function walk(currentPath, depth) {
    if (depth > maxDepth) return;

    try {
      const items = fs.readdirSync(currentPath, { withFileTypes: true });

      for (const item of items) {
        const fullPath = path.join(currentPath, item.name);
        const relativePath = path.relative(dirPath, fullPath);

        // Skip excluded
        if (item.name.startsWith('.') || item.name === 'node_modules') continue;
        if (excludePatterns.some(p => matchPattern(relativePath, p))) continue;

        if (item.isDirectory()) {
          walk(fullPath, depth + 1);
        } else if (item.isFile()) {
          if (patterns.some(p => matchPattern(relativePath, p))) {
            files.push({ path: relativePath, fullPath });
          }
        }
      }
    } catch {
      // Skip unreadable
    }
  }

  walk(dirPath, 0);
  return files;
}

function matchPattern(filePath, pattern) {
  // Glob pattern matching
  // **/ matches any directory path (including empty)
  // * matches any characters except /
  // . matches literal .

  let regexPattern = pattern
    // First escape dots (must be done before ** replacement)
    .replace(/\./g, '\\.')
    // **/ at the start or middle can match zero or more directories
    .replace(/\*\*\//g, '(?:.*\\/)?')
    // ** at the end matches remaining path
    .replace(/\*\*$/g, '.*')
    // Remaining ** (shouldn't happen but just in case)
    .replace(/\*\*/g, '.*')
    // * matches filename characters (not /)
    .replace(/\*/g, '[^/]*');

  try {
    return new RegExp(`^${regexPattern}$`).test(filePath);
  } catch {
    return false;
  }
}

/**
 * Extract key files for review
 */
export function extractKeyFiles(projectPath, depth = 'quick') {
  const config = REVIEW_CONFIG[depth] || REVIEW_CONFIG.quick;
  const files = findFiles(projectPath, config.patterns, config.excludePatterns || []);

  // Sort by priority (auth, api, config first)
  const priorityOrder = config.priority || [];
  files.sort((a, b) => {
    const aScore = priorityOrder.findIndex(p => a.path.toLowerCase().includes(p));
    const bScore = priorityOrder.findIndex(p => b.path.toLowerCase().includes(p));
    return (aScore === -1 ? 999 : aScore) - (bScore === -1 ? 999 : bScore);
  });

  // Limit and read
  const selectedFiles = files.slice(0, config.maxFiles);
  const result = [];

  for (const file of selectedFiles) {
    const content = safeReadFile(file.fullPath, config.maxTokensPerFile * 4);
    if (content) {
      result.push({
        path: file.path,
        content: sanitizeCodeForLLM(content),
        language: path.extname(file.path).slice(1),
        tokens: estimateTokens(content),
      });
    }
  }

  return result;
}

// =============================================================================
// RESPONSE PARSING
// =============================================================================

function parseJSONResponse(response, defaultFindings = []) {
  try {
    // Try to extract JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return parsed.findings || defaultFindings;
    }
  } catch {
    // If parsing fails, try to extract structured data
    const findings = [];
    const lines = response.split('\n');

    let currentFinding = null;
    for (const line of lines) {
      if (line.includes('**') || line.includes('Critical:') || line.includes('High:')) {
        if (currentFinding) findings.push(currentFinding);
        currentFinding = {
          severity: line.toLowerCase().includes('critical') ? 'critical' :
                    line.toLowerCase().includes('high') ? 'high' :
                    line.toLowerCase().includes('medium') ? 'medium' : 'low',
          title: line.replace(/\*\*/g, '').trim(),
          description: '',
        };
      } else if (currentFinding && line.trim()) {
        currentFinding.description += line.trim() + ' ';
      }
    }
    if (currentFinding) findings.push(currentFinding);

    return findings;
  }

  return defaultFindings;
}

// =============================================================================
// MAIN REVIEW FUNCTIONS
// =============================================================================

/**
 * Run security-focused review (Grok)
 */
async function runSecurityReview(codeSnippets) {
  const codeText = codeSnippets.map(f =>
    `// File: ${f.path}\n${f.content}`
  ).join('\n\n---\n\n');

  const prompt = PROMPTS.security.replace('{code}', codeText);
  const response = await callGrok(prompt);

  if (response.error) {
    // Fallback to Claude if Grok unavailable
    const fallback = await callClaude(prompt);
    if (fallback.error) {
      return { findings: [], error: response.error, provider: 'none' };
    }
    return {
      findings: parseJSONResponse(fallback.content),
      provider: 'claude',
      usage: fallback.usage,
      cost: fallback.cost,
    };
  }

  return {
    findings: parseJSONResponse(response.content),
    provider: 'grok',
    usage: response.usage,
    cost: response.cost,
  };
}

/**
 * Run architecture review (Claude)
 */
async function runArchitectureReview(codeSnippets) {
  const codeText = codeSnippets.map(f =>
    `// File: ${f.path}\n${f.content}`
  ).join('\n\n---\n\n');

  const prompt = PROMPTS.architecture.replace('{code}', codeText);
  const response = await callClaude(prompt);

  if (response.error) {
    return { findings: [], error: response.error, provider: 'none' };
  }

  return {
    findings: parseJSONResponse(response.content),
    provider: 'claude',
    usage: response.usage,
    cost: response.cost,
  };
}

/**
 * Run quality review (Claude)
 */
async function runQualityReview(codeSnippets) {
  const codeText = codeSnippets.map(f =>
    `// File: ${f.path}\n${f.content}`
  ).join('\n\n---\n\n');

  const prompt = PROMPTS.quality.replace('{code}', codeText);
  const response = await callClaude(prompt);

  if (response.error) {
    return { findings: [], error: response.error, provider: 'none' };
  }

  return {
    findings: parseJSONResponse(response.content),
    provider: 'claude',
    usage: response.usage,
    cost: response.cost,
  };
}

/**
 * Generate non-developer summary
 */
async function generateNonDevSummary(findings) {
  const findingsText = JSON.stringify(findings.slice(0, 10), null, 2);
  const prompt = PROMPTS.nonDevSummary.replace('{findings}', findingsText);

  const response = await callBestAvailable(prompt, { maxTokens: 500 });

  if (response.error) {
    return {
      summary: 'Unable to generate summary at this time.',
      trafficLight: findings.some(f => f.severity === 'critical') ? 'red' :
                    findings.some(f => f.severity === 'high') ? 'yellow' : 'green',
    };
  }

  return {
    summary: response.content,
    trafficLight: findings.some(f => f.severity === 'critical') ? 'red' :
                  findings.some(f => f.severity === 'high') ? 'yellow' : 'green',
  };
}

// =============================================================================
// MAIN EXPORT
// =============================================================================

/**
 * Run AI Code Review
 *
 * @param {string} projectPath - Path to project root
 * @param {Object} options - Review options
 * @param {string} options.depth - 'quick' or 'deep'
 * @param {boolean} options.includeQuality - Include code quality review
 * @param {boolean} options.generateSummary - Generate non-dev summary
 * @returns {Promise<Object>} Review results
 */
export async function aiCodeReview(projectPath, options = {}) {
  const {
    depth = 'quick',
    includeQuality = true,
    generateSummary = true,
  } = options;

  const startTime = Date.now();

  // Extract files
  const files = extractKeyFiles(projectPath, depth);

  if (files.length === 0) {
    return {
      status: 'skip',
      message: 'No code files found for review',
      findings: [],
      duration: Date.now() - startTime,
    };
  }

  const totalTokens = files.reduce((sum, f) => sum + f.tokens, 0);

  // Estimate cost before running
  const costEstimate = {
    security: estimateCost(files.map(f => f.content).join('\n'), 'grok', 2000),
    architecture: estimateCost(files.map(f => f.content).join('\n'), 'claude', 2000),
    quality: includeQuality ? estimateCost(files.map(f => f.content).join('\n'), 'claude', 2000) : null,
  };

  // Run reviews in parallel
  const reviewPromises = [
    runSecurityReview(files),
    runArchitectureReview(files),
  ];

  if (includeQuality) {
    reviewPromises.push(runQualityReview(files));
  }

  const [securityResult, architectureResult, qualityResult] = await Promise.all(reviewPromises);

  // Combine findings
  const allFindings = [
    ...securityResult.findings.map(f => ({ ...f, source: 'security' })),
    ...architectureResult.findings.map(f => ({ ...f, source: 'architecture' })),
    ...(qualityResult?.findings || []).map(f => ({ ...f, source: 'quality' })),
  ];

  // Sort by severity
  const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  allFindings.sort((a, b) =>
    (severityOrder[a.severity] ?? 99) - (severityOrder[b.severity] ?? 99)
  );

  // Calculate score penalty
  const criticalCount = allFindings.filter(f => f.severity === 'critical').length;
  const highCount = allFindings.filter(f => f.severity === 'high').length;
  const mediumCount = allFindings.filter(f => f.severity === 'medium').length;

  const scorePenalty = Math.min(50,
    criticalCount * 15 +
    highCount * 5 +
    mediumCount * 2
  );

  // Generate non-dev summary
  let nonDevSummary = null;
  if (generateSummary && allFindings.length > 0) {
    nonDevSummary = await generateNonDevSummary(allFindings);
  }

  // Calculate total cost
  const totalCost = (securityResult.cost || 0) +
                    (architectureResult.cost || 0) +
                    (qualityResult?.cost || 0);

  const result = {
    status: criticalCount > 0 ? 'fail' :
            highCount > 0 ? 'warn' :
            allFindings.length > 5 ? 'warn' : 'pass',
    findings: allFindings,
    counts: {
      total: allFindings.length,
      critical: criticalCount,
      high: highCount,
      medium: mediumCount,
      low: allFindings.filter(f => f.severity === 'low').length,
    },
    scorePenalty,
    nonDevSummary,
    filesReviewed: files.length,
    totalTokens,
    cost: {
      total: totalCost,
      security: securityResult.cost || 0,
      architecture: architectureResult.cost || 0,
      quality: qualityResult?.cost || 0,
    },
    providers: {
      security: securityResult.provider,
      architecture: architectureResult.provider,
      quality: qualityResult?.provider,
    },
    errors: [
      securityResult.error,
      architectureResult.error,
      qualityResult?.error,
    ].filter(Boolean),
    duration: Date.now() - startTime,
    depth,
    proof: generateProof(allFindings, files.length),
  };

  return result;
}

/**
 * Generate proof string for UI display
 */
function generateProof(findings, filesCount) {
  const criticalCount = findings.filter(f => f.severity === 'critical').length;
  const highCount = findings.filter(f => f.severity === 'high').length;

  let proof = `🤖 AI Code Review Results\n`;
  proof += `📁 Files Analyzed: ${filesCount}\n`;
  proof += `🔍 Issues Found: ${findings.length}\n\n`;

  if (criticalCount > 0) {
    proof += `🔴 CRITICAL (${criticalCount}):\n`;
    findings.filter(f => f.severity === 'critical').slice(0, 3).forEach(f => {
      proof += `  • ${f.title || f.description?.slice(0, 50)}\n`;
    });
    proof += '\n';
  }

  if (highCount > 0) {
    proof += `🟠 HIGH (${highCount}):\n`;
    findings.filter(f => f.severity === 'high').slice(0, 3).forEach(f => {
      proof += `  • ${f.title || f.description?.slice(0, 50)}\n`;
    });
  }

  if (findings.length === 0) {
    proof += `✅ No significant issues detected!`;
  }

  return proof;
}

/**
 * Estimate cost before running review
 */
export function estimateReviewCost(projectPath, depth = 'quick') {
  const files = extractKeyFiles(projectPath, depth);
  const totalChars = files.reduce((sum, f) => sum + f.content.length, 0);
  const totalTokens = estimateTokens(totalChars.toString());

  return {
    filesCount: files.length,
    estimatedTokens: totalTokens,
    estimatedCost: {
      quick: (totalTokens / 1000 * 0.003 * 3) + (3000 / 1000 * 0.015 * 3), // 3 reviews
      deep: (totalTokens / 1000 * 0.003 * 3) + (6000 / 1000 * 0.015 * 3),
    },
  };
}

// =============================================================================
// EXPORTS
// =============================================================================

export default {
  aiCodeReview,
  extractKeyFiles,
  estimateReviewCost,
};
