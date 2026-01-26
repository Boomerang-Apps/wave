/**
 * Foundation Analyzer (Step 0: Design Foundation)
 *
 * FUNDAMENTAL: Supports THREE project modes (Grok Review Enhancement):
 * 1. NEW PROJECT - Validate foundation is ready to start development
 * 2. EXISTING PROJECT - Analyze codebase from GitHub/Vercel/local
 * 3. MONOREPO - Multi-package workspace analysis
 *
 * Auto-detects mode based on presence of source code files and workspace config.
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// =============================================================================
// MODE DETECTION (FUNDAMENTAL)
// =============================================================================

/**
 * Detect project mode: NEW, EXISTING, or MONOREPO
 * (Enhanced per Grok Review - added monorepo detection)
 *
 * @param {string} projectPath - Path to project root
 * @returns {'new' | 'existing' | 'monorepo'} Project mode
 */
export function detectProjectMode(projectPath) {
  // Check for monorepo first (Grok Review Enhancement)
  const pkg = safeReadJSON(path.join(projectPath, 'package.json'));
  if (pkg) {
    // npm/yarn workspaces
    if (pkg.workspaces) {
      return 'monorepo';
    }
    // pnpm workspaces
    if (pkg.pnpm?.packages) {
      return 'monorepo';
    }
  }

  // Check for pnpm-workspace.yaml
  if (fs.existsSync(path.join(projectPath, 'pnpm-workspace.yaml'))) {
    return 'monorepo';
  }

  // Check for lerna.json
  if (fs.existsSync(path.join(projectPath, 'lerna.json'))) {
    return 'monorepo';
  }

  // Check for source code directories with actual code files
  // FUNDAMENTAL: Only code files indicate an existing project
  // Package.json with dependencies alone does NOT make it "existing"
  const codeDirs = ['src', 'app', 'lib', 'pages', 'components'];
  const codeExtensions = ['.ts', '.tsx', '.js', '.jsx', '.py', '.go', '.rs', '.svelte', '.vue'];

  for (const dir of codeDirs) {
    const dirPath = path.join(projectPath, dir);
    if (fs.existsSync(dirPath)) {
      try {
        const files = fs.readdirSync(dirPath, { recursive: true });
        const hasCodeFiles = files.some(file =>
          codeExtensions.some(ext => String(file).endsWith(ext))
        );
        if (hasCodeFiles) {
          return 'existing';
        }
      } catch (e) {
        // Directory not readable, continue
      }
    }
  }

  // Note: package.json with dependencies alone does NOT indicate existing project
  // A new project can have dependencies defined without having written any code yet
  // Only the presence of actual source code files makes it "existing"

  return 'new';
}

/**
 * Get workspace paths for monorepo analysis
 */
export function getMonorepoWorkspaces(projectPath) {
  const workspaces = [];
  const pkg = safeReadJSON(path.join(projectPath, 'package.json'));

  if (pkg?.workspaces) {
    const patterns = Array.isArray(pkg.workspaces)
      ? pkg.workspaces
      : pkg.workspaces.packages || [];

    for (const pattern of patterns) {
      // Simple glob handling for common patterns like "packages/*"
      if (pattern.endsWith('/*')) {
        const baseDir = path.join(projectPath, pattern.slice(0, -2));
        if (fs.existsSync(baseDir)) {
          const dirs = safeListDir(baseDir)
            .filter(d => fs.statSync(path.join(baseDir, d)).isDirectory());
          workspaces.push(...dirs.map(d => path.join(baseDir, d)));
        }
      } else if (!pattern.includes('*')) {
        const wsPath = path.join(projectPath, pattern);
        if (fs.existsSync(wsPath)) {
          workspaces.push(wsPath);
        }
      }
    }
  }

  return workspaces;
}

// =============================================================================
// ANALYSIS STEPS CONFIGURATION
// =============================================================================

/**
 * Analysis steps for NEW PROJECT mode (foundation validation)
 */
export const NEW_PROJECT_STEPS = [
  { step: 1, name: 'Scanning project structure', key: 'structure' },
  { step: 2, name: 'Validating documentation', key: 'documentation' },
  { step: 3, name: 'Analyzing design mockups', key: 'mockups' },
  { step: 4, name: 'Checking folder compliance', key: 'compliance' },
  { step: 5, name: 'Validating tech stack definition', key: 'techstack' },
  { step: 6, name: 'Generating readiness score', key: 'readiness' },
];

/**
 * Analysis steps for EXISTING PROJECT mode (comprehensive analysis)
 */
export const EXISTING_PROJECT_STEPS = [
  { step: 1, name: 'Scanning project structure', key: 'structure' },
  { step: 2, name: 'Detecting tech stack', key: 'techstack' },
  { step: 3, name: 'Analyzing code architecture', key: 'architecture' },
  { step: 4, name: 'Counting source files', key: 'sourcefiles' },
  { step: 5, name: 'Finding documentation', key: 'documentation' },
  { step: 6, name: 'Checking design mockups', key: 'mockups' },
  { step: 7, name: 'Analyzing code patterns', key: 'patterns' },
  { step: 8, name: 'Detecting test coverage', key: 'testing' },
  { step: 9, name: 'Identifying potential issues', key: 'issues' },
  { step: 10, name: 'Generating comprehensive report', key: 'report' },
];

/**
 * Analysis steps for MONOREPO mode (Grok Review Enhancement)
 */
export const MONOREPO_STEPS = [
  { step: 1, name: 'Scanning root structure', key: 'structure' },
  { step: 2, name: 'Detecting workspaces', key: 'workspaces' },
  { step: 3, name: 'Analyzing root tech stack', key: 'techstack' },
  { step: 4, name: 'Scanning workspace packages', key: 'packages' },
  { step: 5, name: 'Finding shared documentation', key: 'documentation' },
  { step: 6, name: 'Checking design mockups', key: 'mockups' },
  { step: 7, name: 'Analyzing workspace dependencies', key: 'dependencies' },
  { step: 8, name: 'Detecting test coverage', key: 'testing' },
  { step: 9, name: 'Generating workspace report', key: 'report' },
];

// =============================================================================
// CACHING (Grok Review Enhancement - Performance)
// =============================================================================

const analysisCache = new Map();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

/**
 * Compute hash of directory for cache invalidation
 */
function computeDirHash(dirPath, maxDepth = 2) {
  const hash = crypto.createHash('sha256');

  function walkDir(currentPath, depth) {
    if (depth > maxDepth) return;

    try {
      const items = fs.readdirSync(currentPath, { withFileTypes: true });
      for (const item of items) {
        if (item.name.startsWith('.') || item.name === 'node_modules') continue;

        const fullPath = path.join(currentPath, item.name);
        const stats = fs.statSync(fullPath);

        // Hash: path + mtime + size
        hash.update(`${fullPath}:${stats.mtimeMs}:${stats.size}`);

        if (item.isDirectory()) {
          walkDir(fullPath, depth + 1);
        }
      }
    } catch (e) {
      // Skip unreadable directories
    }
  }

  walkDir(dirPath, 0);
  return hash.digest('hex').substring(0, 16);
}

/**
 * Get cached result or compute fresh
 */
export function getCachedOrCompute(projectPath, stepKey, computeFn) {
  const dirHash = computeDirHash(projectPath);
  const cacheKey = `${projectPath}:${stepKey}:${dirHash}`;

  const cached = analysisCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    cached.fromCache = true;
    return cached.result;
  }

  const result = computeFn();
  analysisCache.set(cacheKey, { result, timestamp: Date.now() });

  // Cleanup old cache entries
  if (analysisCache.size > 100) {
    const now = Date.now();
    for (const [key, value] of analysisCache) {
      if (now - value.timestamp > CACHE_TTL) {
        analysisCache.delete(key);
      }
    }
  }

  return result;
}

/**
 * Clear cache for a specific project
 */
export function clearProjectCache(projectPath) {
  for (const key of analysisCache.keys()) {
    if (key.startsWith(projectPath)) {
      analysisCache.delete(key);
    }
  }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function safeReadFile(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch (e) {
    return null;
  }
}

function safeReadJSON(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch (e) {
    return null;
  }
}

function safeListDir(dirPath) {
  try {
    return fs.readdirSync(dirPath);
  } catch (e) {
    return [];
  }
}

function countFilesRecursive(dirPath, extensions = []) {
  let count = 0;
  try {
    const items = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const item of items) {
      if (item.name.startsWith('.') || item.name === 'node_modules') continue;
      const fullPath = path.join(dirPath, item.name);
      if (item.isDirectory()) {
        count += countFilesRecursive(fullPath, extensions);
      } else if (extensions.length === 0 || extensions.some(ext => item.name.endsWith(ext))) {
        count++;
      }
    }
  } catch (e) {
    // Skip unreadable directories
  }
  return count;
}

function generateFileTree(dirPath, depth = 0, maxDepth = 3) {
  if (depth >= maxDepth) return '';

  let tree = '';
  const indent = '  '.repeat(depth);

  try {
    const items = fs.readdirSync(dirPath, { withFileTypes: true });
    const sortedItems = items
      .filter(item => !item.name.startsWith('.') && item.name !== 'node_modules')
      .sort((a, b) => {
        if (a.isDirectory() && !b.isDirectory()) return -1;
        if (!a.isDirectory() && b.isDirectory()) return 1;
        return a.name.localeCompare(b.name);
      })
      .slice(0, 15); // Limit to 15 items per level

    for (const item of sortedItems) {
      const icon = item.isDirectory() ? '📁' : '📄';
      tree += `${indent}${icon} ${item.name}\n`;
      if (item.isDirectory()) {
        tree += generateFileTree(path.join(dirPath, item.name), depth + 1, maxDepth);
      }
    }

    if (items.length > 15) {
      tree += `${indent}... and ${items.length - 15} more\n`;
    }
  } catch (e) {
    tree += `${indent}(unreadable)\n`;
  }

  return tree;
}

// =============================================================================
// ANALYSIS FUNCTIONS - NEW PROJECT MODE
// =============================================================================

export function analyzeStructure(projectPath) {
  const findings = [];
  const issues = [];

  // Check for key directories
  const requiredDirs = ['docs', 'design_mockups'];
  const recommendedDirs = ['src', 'public', '.claude'];

  for (const dir of requiredDirs) {
    const dirPath = path.join(projectPath, dir);
    if (fs.existsSync(dirPath)) {
      findings.push(`✅ Found ${dir}/ folder`);
    } else {
      issues.push(`Missing required folder: ${dir}/`);
    }
  }

  for (const dir of recommendedDirs) {
    const dirPath = path.join(projectPath, dir);
    if (fs.existsSync(dirPath)) {
      findings.push(`✅ Found ${dir}/ folder`);
    }
  }

  const tree = generateFileTree(projectPath, 0, 3);

  return {
    status: issues.length === 0 ? 'pass' : 'warn',
    findings,
    issues,
    proof: `📁 Project Structure:\n${tree}`,
    tree
  };
}

export function analyzeDocumentation(projectPath) {
  const findings = [];
  const issues = [];
  const docsFound = [];

  // Search for documentation files
  const docPatterns = [
    { name: 'PRD', paths: ['PRD.md', 'AI-PRD.md', 'docs/PRD.md', 'docs/AI-PRD.md', '**/AI-PRD*.md', '**/PRD*.md'] },
    { name: 'README', paths: ['README.md', 'readme.md'] },
    { name: 'CLAUDE.md', paths: ['CLAUDE.md', 'docs/CLAUDE.md'] },
    { name: 'Architecture', paths: ['ARCHITECTURE.md', 'docs/ARCHITECTURE.md', 'docs/architecture.md'] },
  ];

  for (const doc of docPatterns) {
    let found = false;
    for (const p of doc.paths) {
      // Handle simple paths (not globs)
      if (!p.includes('*')) {
        const fullPath = path.join(projectPath, p);
        if (fs.existsSync(fullPath)) {
          const content = safeReadFile(fullPath);
          const lines = content ? content.split('\n').length : 0;
          docsFound.push({ name: doc.name, path: p, lines });
          findings.push(`✅ Found ${doc.name}: ${p} (${lines} lines)`);
          found = true;
          break;
        }
      }
    }
    if (!found && doc.name === 'PRD') {
      issues.push(`⚠️ Missing PRD document - required for AI agents`);
    } else if (!found && doc.name === 'README') {
      issues.push(`⚠️ Missing README.md - recommended for project context`);
    }
  }

  // Also search docs/ folder
  const docsDir = path.join(projectPath, 'docs');
  if (fs.existsSync(docsDir)) {
    const docFiles = safeListDir(docsDir).filter(f => f.endsWith('.md'));
    for (const file of docFiles) {
      if (!docsFound.some(d => d.path.includes(file))) {
        docsFound.push({ name: file, path: `docs/${file}`, lines: 0 });
        findings.push(`📄 Found additional doc: docs/${file}`);
      }
    }
  }

  return {
    status: issues.some(i => i.includes('PRD')) ? 'fail' : (issues.length > 0 ? 'warn' : 'pass'),
    findings,
    issues,
    docsFound,
    proof: `📚 Documentation Analysis:\n${findings.join('\n')}\n\nIssues:\n${issues.join('\n') || 'None'}`
  };
}

export function analyzeMockups(projectPath) {
  const findings = [];
  const issues = [];
  const mockupsFound = [];

  // Check for mockups directory
  const mockupDirs = ['design_mockups', 'mockups', 'design', 'prototypes'];
  let mockupDir = null;

  for (const dir of mockupDirs) {
    const dirPath = path.join(projectPath, dir);
    if (fs.existsSync(dirPath)) {
      mockupDir = dirPath;
      findings.push(`✅ Found mockups folder: ${dir}/`);
      break;
    }
  }

  if (!mockupDir) {
    issues.push(`⚠️ No mockups folder found (expected: design_mockups/)`);
    return {
      status: 'warn',
      findings,
      issues,
      mockupsFound,
      count: 0,
      proof: 'No mockups folder found'
    };
  }

  // Find HTML mockup files
  const files = safeListDir(mockupDir).filter(f => f.endsWith('.html') || f.endsWith('.htm'));

  for (const file of files) {
    mockupsFound.push({ name: file, path: path.join(mockupDir, file) });
    findings.push(`📱 Found mockup: ${file}`);
  }

  if (mockupsFound.length === 0) {
    issues.push(`⚠️ Mockups folder exists but no HTML files found`);
  }

  // Check naming convention (numeric prefix)
  const hasNumericPrefix = mockupsFound.some(m => /^\d+[-_]/.test(m.name));
  if (mockupsFound.length > 1 && !hasNumericPrefix) {
    issues.push(`💡 Consider using numeric prefixes for ordering (e.g., 01-login.html)`);
  }

  return {
    status: mockupsFound.length > 0 ? 'pass' : 'warn',
    findings,
    issues,
    mockupsFound,
    count: mockupsFound.length,
    proof: `🎨 Mockups Analysis:\n${findings.join('\n')}\n\nTotal: ${mockupsFound.length} mockups`
  };
}

export function analyzeCompliance(projectPath) {
  const findings = [];
  const issues = [];
  let score = 100;

  // Check for key files
  const keyFiles = [
    { name: 'package.json', required: false, points: 10 },
    { name: 'tsconfig.json', required: false, points: 5 },
    { name: '.gitignore', required: false, points: 5 },
    { name: 'README.md', required: true, points: 10 },
  ];

  for (const file of keyFiles) {
    const exists = fs.existsSync(path.join(projectPath, file.name));
    if (exists) {
      findings.push(`✅ ${file.name} present`);
    } else {
      if (file.required) {
        issues.push(`Missing required file: ${file.name}`);
        score -= file.points;
      } else {
        findings.push(`ℹ️ ${file.name} not found (optional)`);
      }
    }
  }

  // Check folder structure
  const hasDocsFolder = fs.existsSync(path.join(projectPath, 'docs'));
  const hasMockupsFolder = fs.existsSync(path.join(projectPath, 'design_mockups'));

  if (!hasDocsFolder) {
    issues.push('Missing docs/ folder');
    score -= 15;
  }
  if (!hasMockupsFolder) {
    issues.push('Missing design_mockups/ folder');
    score -= 15;
  }

  return {
    status: score >= 70 ? 'pass' : (score >= 50 ? 'warn' : 'fail'),
    findings,
    issues,
    complianceScore: Math.max(0, score),
    proof: `📋 Compliance Score: ${score}%\n\n${findings.join('\n')}`
  };
}

export function analyzeTechStack(projectPath) {
  const findings = [];
  const issues = [];
  const techStack = [];

  // Read package.json
  const pkg = safeReadJSON(path.join(projectPath, 'package.json'));

  if (pkg) {
    findings.push(`✅ Found package.json: ${pkg.name || 'unnamed'}`);

    const deps = { ...pkg.dependencies, ...pkg.devDependencies };

    // Detect frameworks
    if (deps['next']) techStack.push('Next.js');
    if (deps['react']) techStack.push('React');
    if (deps['vue']) techStack.push('Vue');
    if (deps['express']) techStack.push('Express');
    if (deps['typescript']) techStack.push('TypeScript');
    if (deps['tailwindcss']) techStack.push('Tailwind CSS');
    if (deps['@supabase/supabase-js']) techStack.push('Supabase');
    if (deps['prisma']) techStack.push('Prisma');

    for (const tech of techStack) {
      findings.push(`🔧 Detected: ${tech}`);
    }
  } else {
    issues.push('No package.json found - tech stack undefined');
  }

  // Check for config files
  if (fs.existsSync(path.join(projectPath, 'tsconfig.json'))) {
    if (!techStack.includes('TypeScript')) techStack.push('TypeScript');
  }
  if (fs.existsSync(path.join(projectPath, 'tailwind.config.js')) ||
      fs.existsSync(path.join(projectPath, 'tailwind.config.ts'))) {
    if (!techStack.includes('Tailwind CSS')) techStack.push('Tailwind CSS');
  }

  return {
    status: techStack.length > 0 ? 'pass' : 'warn',
    findings,
    issues,
    techStack,
    proof: `🛠️ Tech Stack:\n${techStack.length > 0 ? techStack.join(', ') : 'Not detected'}`
  };
}

// =============================================================================
// ANALYSIS FUNCTIONS - EXISTING PROJECT MODE
// =============================================================================

export function analyzeCodeArchitecture(projectPath) {
  const findings = [];
  const issues = [];
  const architecture = {
    pattern: 'unknown',
    layers: [],
    mainDirs: []
  };

  // Detect architecture pattern
  const hasPages = fs.existsSync(path.join(projectPath, 'pages'));
  const hasApp = fs.existsSync(path.join(projectPath, 'app'));
  const hasSrc = fs.existsSync(path.join(projectPath, 'src'));
  const hasComponents = fs.existsSync(path.join(projectPath, 'src', 'components')) ||
                        fs.existsSync(path.join(projectPath, 'components'));

  if (hasApp) {
    architecture.pattern = 'Next.js App Router';
    findings.push('📁 Detected Next.js App Router architecture');
  } else if (hasPages) {
    architecture.pattern = 'Next.js Pages Router';
    findings.push('📁 Detected Next.js Pages Router architecture');
  } else if (hasSrc && hasComponents) {
    architecture.pattern = 'Component-based (React/Vue)';
    findings.push('📁 Detected component-based architecture');
  }

  // Find main directories
  const rootDirs = safeListDir(projectPath)
    .filter(f => {
      const fullPath = path.join(projectPath, f);
      return fs.statSync(fullPath).isDirectory() &&
             !f.startsWith('.') &&
             f !== 'node_modules';
    });

  architecture.mainDirs = rootDirs;
  findings.push(`📂 Main directories: ${rootDirs.join(', ')}`);

  return {
    status: 'pass',
    findings,
    issues,
    architecture,
    proof: `🏗️ Architecture: ${architecture.pattern}\n\nMain directories:\n${rootDirs.map(d => `  📁 ${d}/`).join('\n')}`
  };
}

export function analyzeSourceFiles(projectPath) {
  const findings = [];
  const counts = {
    typescript: countFilesRecursive(projectPath, ['.ts', '.tsx']),
    javascript: countFilesRecursive(projectPath, ['.js', '.jsx']),
    css: countFilesRecursive(projectPath, ['.css', '.scss', '.sass']),
    json: countFilesRecursive(projectPath, ['.json']),
    markdown: countFilesRecursive(projectPath, ['.md']),
  };

  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  findings.push(`📊 Total source files: ${total}`);
  if (counts.typescript > 0) findings.push(`  TypeScript: ${counts.typescript} files`);
  if (counts.javascript > 0) findings.push(`  JavaScript: ${counts.javascript} files`);
  if (counts.css > 0) findings.push(`  CSS/SCSS: ${counts.css} files`);

  return {
    status: 'pass',
    findings,
    issues: [],
    counts,
    total,
    proof: `📊 Source File Analysis:\n${findings.join('\n')}`
  };
}

export function analyzeCodePatterns(projectPath) {
  const findings = [];
  const issues = [];
  const patterns = {
    hooks: false,
    components: false,
    api: false,
    utils: false,
    types: false,
    tests: false
  };

  // Check for common patterns
  const srcPath = path.join(projectPath, 'src');
  if (fs.existsSync(srcPath)) {
    const srcDirs = safeListDir(srcPath);

    patterns.hooks = srcDirs.includes('hooks');
    patterns.components = srcDirs.includes('components');
    patterns.api = srcDirs.includes('api') || srcDirs.includes('services');
    patterns.utils = srcDirs.includes('utils') || srcDirs.includes('lib');
    patterns.types = srcDirs.includes('types');
  }

  // Check for tests
  patterns.tests = fs.existsSync(path.join(projectPath, '__tests__')) ||
                   fs.existsSync(path.join(projectPath, 'tests')) ||
                   fs.existsSync(path.join(projectPath, 'src', '__tests__'));

  for (const [pattern, exists] of Object.entries(patterns)) {
    if (exists) {
      findings.push(`✅ ${pattern}/ folder present`);
    }
  }

  if (!patterns.tests) {
    issues.push('💡 Consider adding tests/ or __tests__/ folder');
  }

  return {
    status: 'pass',
    findings,
    issues,
    patterns,
    proof: `🔍 Code Patterns:\n${findings.join('\n')}`
  };
}

export function analyzeTestCoverage(projectPath) {
  const findings = [];
  const issues = [];
  let testCount = 0;

  // Count test files
  const testDirs = ['__tests__', 'tests', 'test', 'src/__tests__'];
  for (const dir of testDirs) {
    const dirPath = path.join(projectPath, dir);
    if (fs.existsSync(dirPath)) {
      const count = countFilesRecursive(dirPath, ['.test.ts', '.test.tsx', '.test.js', '.spec.ts', '.spec.tsx']);
      testCount += count;
      findings.push(`📋 Found ${count} test files in ${dir}/`);
    }
  }

  // Check for test config
  const hasJestConfig = fs.existsSync(path.join(projectPath, 'jest.config.js')) ||
                        fs.existsSync(path.join(projectPath, 'jest.config.ts'));
  const hasVitestConfig = fs.existsSync(path.join(projectPath, 'vitest.config.ts'));

  if (hasJestConfig) findings.push('✅ Jest configuration found');
  if (hasVitestConfig) findings.push('✅ Vitest configuration found');

  if (testCount === 0) {
    issues.push('⚠️ No test files found');
  }

  return {
    status: testCount > 0 ? 'pass' : 'warn',
    findings,
    issues,
    testCount,
    hasConfig: hasJestConfig || hasVitestConfig,
    proof: `🧪 Test Coverage:\nTest files: ${testCount}\n${findings.join('\n')}`
  };
}

// =============================================================================
// MONOREPO ANALYSIS FUNCTIONS (Grok Review Enhancement)
// =============================================================================

export function analyzeWorkspaces(projectPath) {
  const findings = [];
  const issues = [];
  const workspaces = getMonorepoWorkspaces(projectPath);

  if (workspaces.length === 0) {
    issues.push('No workspaces found in monorepo configuration');
    return {
      status: 'fail',
      findings,
      issues,
      workspaces: [],
      count: 0,
      proof: 'No workspaces detected'
    };
  }

  const workspaceDetails = [];
  for (const ws of workspaces) {
    const wsName = path.basename(ws);
    const wsPkg = safeReadJSON(path.join(ws, 'package.json'));

    workspaceDetails.push({
      name: wsName,
      path: ws,
      hasPackageJson: !!wsPkg,
      version: wsPkg?.version,
      dependencies: Object.keys(wsPkg?.dependencies || {}).length,
      devDependencies: Object.keys(wsPkg?.devDependencies || {}).length,
    });

    findings.push(`📦 Workspace: ${wsName} (${wsPkg?.version || 'no version'})`);
  }

  return {
    status: 'pass',
    findings,
    issues,
    workspaces: workspaceDetails,
    count: workspaces.length,
    proof: `🏗️ Monorepo Workspaces:\n${workspaceDetails.map(w =>
      `  📦 ${w.name}: ${w.dependencies} deps, ${w.devDependencies} devDeps`
    ).join('\n')}`
  };
}

export function analyzeWorkspaceDependencies(projectPath) {
  const findings = [];
  const issues = [];
  const workspaces = getMonorepoWorkspaces(projectPath);

  const sharedDeps = new Map();
  const versionMismatches = [];

  for (const ws of workspaces) {
    const wsPkg = safeReadJSON(path.join(ws, 'package.json'));
    if (!wsPkg) continue;

    const allDeps = { ...wsPkg.dependencies, ...wsPkg.devDependencies };
    for (const [dep, version] of Object.entries(allDeps)) {
      if (sharedDeps.has(dep)) {
        const existing = sharedDeps.get(dep);
        existing.count++;
        if (existing.version !== version) {
          versionMismatches.push({ dep, versions: [existing.version, version] });
        }
      } else {
        sharedDeps.set(dep, { version, count: 1 });
      }
    }
  }

  // Find most shared dependencies
  const topShared = [...sharedDeps.entries()]
    .filter(([, v]) => v.count > 1)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 10);

  for (const [dep, info] of topShared) {
    findings.push(`📚 ${dep}@${info.version} (used in ${info.count} workspaces)`);
  }

  if (versionMismatches.length > 0) {
    for (const mismatch of versionMismatches.slice(0, 5)) {
      issues.push(`⚠️ Version mismatch: ${mismatch.dep} (${mismatch.versions.join(' vs ')})`);
    }
  }

  return {
    status: versionMismatches.length === 0 ? 'pass' : 'warn',
    findings,
    issues,
    sharedDependencies: topShared.length,
    versionMismatches: versionMismatches.length,
    proof: `📊 Dependency Analysis:\nShared deps: ${topShared.length}\nVersion mismatches: ${versionMismatches.length}\n\n${findings.join('\n')}`
  };
}

export function identifyIssues(projectPath) {
  const findings = [];
  const issues = [];

  // Check for TODO/FIXME comments in source files
  // (Simplified - would need full file scanning in production)

  // Check for large files
  const srcPath = path.join(projectPath, 'src');
  if (fs.existsSync(srcPath)) {
    try {
      const files = fs.readdirSync(srcPath, { recursive: true });
      for (const file of files) {
        const filePath = path.join(srcPath, String(file));
        try {
          const stats = fs.statSync(filePath);
          if (stats.isFile() && stats.size > 100000) { // > 100KB
            issues.push(`⚠️ Large file: ${file} (${Math.round(stats.size / 1024)}KB)`);
          }
        } catch (e) {
          // Skip
        }
      }
    } catch (e) {
      // Skip
    }
  }

  // Check for .env files that shouldn't be committed
  if (fs.existsSync(path.join(projectPath, '.env'))) {
    const gitignore = safeReadFile(path.join(projectPath, '.gitignore'));
    if (!gitignore || !gitignore.includes('.env')) {
      issues.push('⚠️ .env file exists but may not be in .gitignore');
    }
  }

  if (issues.length === 0) {
    findings.push('✅ No major issues detected');
  }

  return {
    status: issues.length === 0 ? 'pass' : 'warn',
    findings,
    issues,
    proof: `🔎 Issues Analysis:\n${issues.length > 0 ? issues.join('\n') : 'No issues found'}`
  };
}

// =============================================================================
// SCORING PROFILES (Grok Review Enhancement)
// Configurable weight profiles for different project types
// =============================================================================

export const SCORING_PROFILES = {
  // Default balanced scoring
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
    monorepo: {
      documentation: 15,
      mockups: 10,
      structure: 20,
      techstack: 15,
      architecture: 15,
      sourcefiles: 10,
      patterns: 10,
      testing: 5
    }
  },

  // Design-heavy: For projects where UI/UX is paramount
  design_heavy: {
    new: {
      documentation: 25,
      mockups: 40,
      structure: 15,
      compliance: 10,
      techstack: 10
    },
    existing: {
      documentation: 15,
      mockups: 25,
      structure: 15,
      techstack: 10,
      architecture: 15,
      sourcefiles: 5,
      patterns: 10,
      testing: 5
    }
  },

  // Code-focused: For API-only or backend projects
  code_focused: {
    new: {
      documentation: 35,
      mockups: 10,
      structure: 25,
      compliance: 15,
      techstack: 15
    },
    existing: {
      documentation: 15,
      mockups: 5,
      structure: 15,
      techstack: 15,
      architecture: 20,
      sourcefiles: 10,
      patterns: 10,
      testing: 10
    }
  },

  // Test-driven: Emphasizes testing
  test_driven: {
    new: {
      documentation: 25,
      mockups: 20,
      structure: 20,
      compliance: 15,
      techstack: 20
    },
    existing: {
      documentation: 10,
      mockups: 5,
      structure: 10,
      techstack: 15,
      architecture: 15,
      sourcefiles: 5,
      patterns: 15,
      testing: 25
    }
  },

  // Lenient: For rapid prototyping
  lenient: {
    new: {
      documentation: 20,
      mockups: 20,
      structure: 25,
      compliance: 20,
      techstack: 15
    },
    existing: {
      documentation: 10,
      mockups: 10,
      structure: 20,
      techstack: 15,
      architecture: 20,
      sourcefiles: 10,
      patterns: 10,
      testing: 5
    }
  }
};

// =============================================================================
// READINESS SCORE CALCULATION
// =============================================================================

export function calculateReadinessScore(results, mode, profileName = 'default') {
  let score = 0;

  // Get weights from profile (fall back to default)
  const profile = SCORING_PROFILES[profileName] || SCORING_PROFILES.default;
  const modeWeights = profile[mode] || profile.existing || profile.new;

  if (!modeWeights) {
    console.warn(`[Scoring] Unknown mode: ${mode}, using default existing weights`);
    return calculateReadinessScore(results, 'existing', profileName);
  }

  for (const [key, weight] of Object.entries(modeWeights)) {
    const result = results[key];
    if (result) {
      if (result.status === 'pass') score += weight;
      else if (result.status === 'warn') score += weight * 0.6;
      // fail = 0 points
    }
  }

  return Math.round(score);
}

// =============================================================================
// IMPROVEMENT REPORT GENERATOR
// =============================================================================

/**
 * Generate a comprehensive improvement report with actionable fix instructions
 * @param {Object} report - Foundation analysis report
 * @param {string} projectPath - Project path for context
 * @returns {string} Markdown formatted improvement report
 */
export function generateImprovementReport(report, projectPath) {
  const projectName = path.basename(projectPath);
  const timestamp = new Date().toISOString();
  const mode = report.mode || 'new';

  let md = `# Foundation Improvement Report
## ${projectName}

**Generated:** ${timestamp}
**Mode:** ${mode === 'new' ? 'New Project' : mode === 'monorepo' ? 'Monorepo' : 'Existing Project'}
**Readiness Score:** ${report.readinessScore}%
**Status:** ${report.validationStatus === 'ready' ? '✅ Ready' : '⛔ Blocked'}

---

## Executive Summary

${report.validationStatus === 'ready'
  ? 'Your project foundation meets the minimum requirements to proceed with development. However, addressing the recommendations below will improve code quality and maintainability.'
  : 'Your project foundation has blocking issues that must be resolved before proceeding. Follow the steps below in order of priority.'}

`;

  // Collect all issues by priority
  const criticalIssues = [];
  const highIssues = [];
  const mediumIssues = [];
  const recommendations = [];

  // Process blocking reasons first
  if (report.blockingReasons?.length > 0) {
    report.blockingReasons.forEach(reason => {
      criticalIssues.push({
        title: reason,
        fix: getFixInstructions(reason, projectPath),
        commands: getFixCommands(reason, projectPath)
      });
    });
  }

  // Process analysis issues
  for (const [key, analysis] of Object.entries(report.analysis || {})) {
    if (analysis?.issues) {
      analysis.issues.forEach(issue => {
        const priority = getPriority(issue, key);
        const item = {
          title: issue,
          category: key,
          fix: getFixInstructions(issue, projectPath),
          commands: getFixCommands(issue, projectPath)
        };

        if (priority === 'critical') criticalIssues.push(item);
        else if (priority === 'high') highIssues.push(item);
        else if (priority === 'medium') mediumIssues.push(item);
        else recommendations.push(item);
      });
    }
  }

  // Process general issues
  if (report.issues?.length > 0) {
    report.issues.forEach(issue => {
      if (!criticalIssues.find(i => i.title === issue) &&
          !highIssues.find(i => i.title === issue)) {
        const priority = getPriority(issue, 'general');
        const item = {
          title: issue,
          category: 'general',
          fix: getFixInstructions(issue, projectPath),
          commands: getFixCommands(issue, projectPath)
        };

        if (priority === 'critical') criticalIssues.push(item);
        else if (priority === 'high') highIssues.push(item);
        else if (priority === 'medium') mediumIssues.push(item);
        else recommendations.push(item);
      }
    });
  }

  // Critical Issues Section
  if (criticalIssues.length > 0) {
    md += `## 🔴 Critical Issues (Must Fix)

These issues are blocking your project from proceeding. Address them immediately.

`;
    criticalIssues.forEach((issue, i) => {
      md += formatIssue(i + 1, issue);
    });
  }

  // High Priority Issues
  if (highIssues.length > 0) {
    md += `## 🟠 High Priority Issues

These issues significantly impact project quality and should be addressed soon.

`;
    highIssues.forEach((issue, i) => {
      md += formatIssue(i + 1, issue);
    });
  }

  // Medium Priority Issues
  if (mediumIssues.length > 0) {
    md += `## 🟡 Medium Priority Issues

These issues should be addressed to improve project organization.

`;
    mediumIssues.forEach((issue, i) => {
      md += formatIssue(i + 1, issue);
    });
  }

  // Recommendations
  if (recommendations.length > 0) {
    md += `## 💡 Recommendations

Optional improvements to enhance your project.

`;
    recommendations.forEach((issue, i) => {
      md += formatIssue(i + 1, issue);
    });
  }

  // AI Review Section (if present)
  if (report.aiReview) {
    md += `## 🤖 AI Code Review Results

**Files Analyzed:** ${report.aiReview.filesAnalyzed || 'N/A'}
**Score Penalty:** -${report.aiReview.scorePenalty || 0} points
**Cost:** $${(report.aiReview.cost || 0).toFixed(4)}

### Summary
${report.aiReview.nonDevSummary || 'No summary available.'}

`;

    if (report.aiReview.securityFindings?.length > 0) {
      md += `### Security Findings\n\n`;
      report.aiReview.securityFindings.forEach(f => {
        md += `- **[${f.severity.toUpperCase()}]** ${f.title}: ${f.description}\n`;
        if (f.suggestion) md += `  - Fix: ${f.suggestion}\n`;
      });
      md += '\n';
    }

    if (report.aiReview.architectureFindings?.length > 0) {
      md += `### Architecture Findings\n\n`;
      report.aiReview.architectureFindings.forEach(f => {
        md += `- **[${f.severity.toUpperCase()}]** ${f.title}: ${f.description}\n`;
        if (f.suggestion) md += `  - Fix: ${f.suggestion}\n`;
      });
      md += '\n';
    }

    if (report.aiReview.qualityFindings?.length > 0) {
      md += `### Quality Findings\n\n`;
      report.aiReview.qualityFindings.slice(0, 10).forEach(f => {
        md += `- **[${f.severity?.toUpperCase() || 'LOW'}]** ${f.title || 'Improvement'}: ${f.description || ''}\n`;
      });
      md += '\n';
    }
  }

  // Quick Start Commands
  md += `## 🚀 Quick Start Commands

Run these commands to quickly address common issues:

\`\`\`bash
# Create required folder structure
mkdir -p docs design_mockups public

# Create PRD document template
cat > docs/PRD.md << 'EOF'
# Product Requirements Document

## Overview
[Describe your product/feature]

## Goals
- [ ] Goal 1
- [ ] Goal 2

## Features
### Feature 1
[Description]

## Success Metrics
- Metric 1
- Metric 2
EOF

# Create CLAUDE.md if missing
cat > docs/CLAUDE.md << 'EOF'
# CLAUDE.md - AI Agent Instructions

## Project Overview
[Brief description of this project]

## Tech Stack
- Framework: [e.g., Next.js, React]
- Language: TypeScript
- Database: [e.g., Supabase, PostgreSQL]

## Key Files
- \`/app\` - Main application routes
- \`/components\` - React components
- \`/lib\` - Utility functions

## Development Guidelines
- Use TypeScript strict mode
- Follow existing code patterns
- Write tests for new features
EOF

# Create Safety Protocol template
cat > docs/SAFETY-PROTOCOL.md << 'EOF'
# Safety Protocol

## High-Risk Operations
- Database migrations
- Payment processing
- User authentication changes

## Approval Requirements
- All production deployments require review
- Database schema changes need CTO approval

## Forbidden Operations
- Direct production database access
- Bypassing authentication
- Hardcoding credentials
EOF
\`\`\`

---

## Verification

After making changes, run the foundation analysis again to verify improvements:
1. Click "Analyze Foundation" in the Design tab
2. Review the updated readiness score
3. Ensure no critical or high priority issues remain

---

*Generated by WAVE Portal Foundation Analyzer*
`;

  return md;
}

// Helper function to determine issue priority
function getPriority(issue, category) {
  const lower = issue.toLowerCase();

  // Critical - blocking issues
  if (lower.includes('missing prd') || lower.includes('required') && lower.includes('missing')) {
    return 'critical';
  }
  if (category === 'blocking') return 'critical';

  // High - significant issues
  if (lower.includes('unexpected location') || lower.includes('move')) {
    return 'high';
  }
  if (lower.includes('missing') && lower.includes('documentation')) {
    return 'high';
  }

  // Medium - organizational issues
  if (lower.includes('recommended') || lower.includes('consider')) {
    return 'medium';
  }

  // Low - nice to have
  return 'low';
}

// Helper function to get fix instructions based on issue type
function getFixInstructions(issue, projectPath) {
  const lower = issue.toLowerCase();

  if (lower.includes('missing prd')) {
    return `Create a Product Requirements Document that defines your project goals, features, and success metrics. This is essential for AI agents to understand what to build.`;
  }

  if (lower.includes('missing') && lower.includes('docs')) {
    return `Create a docs/ folder in your project root to organize all documentation. Move existing documentation files there.`;
  }

  if (lower.includes('missing') && lower.includes('mockups')) {
    return `Create a design_mockups/ folder and add HTML prototype files for each screen/page of your application.`;
  }

  if (lower.includes('missing') && lower.includes('claude')) {
    return `Create a CLAUDE.md file with project-specific instructions for AI agents. Include tech stack, key files, and development guidelines.`;
  }

  if (lower.includes('unexpected location') && lower.includes('claude')) {
    return `Move your CLAUDE.md file to the docs/ folder for better organization. The expected path is docs/CLAUDE.md.`;
  }

  if (lower.includes('unexpected location') && lower.includes('mockup')) {
    return `Move HTML mockup files to the design_mockups/ folder. Keep all prototypes in one location for easy reference.`;
  }

  if (lower.includes('unexpected location') && lower.includes('safety')) {
    return `Move your safety protocol document to docs/SAFETY-PROTOCOL.md for consistency with project structure.`;
  }

  if (lower.includes('duplicate')) {
    return `Consolidate duplicate documents into a single master document. Remove or archive outdated versions.`;
  }

  if (lower.includes('architecture')) {
    return `Create docs/Architecture.md documenting your system architecture, component relationships, and data flow.`;
  }

  if (lower.includes('user-stories') || lower.includes('user stories')) {
    return `Create docs/User-Stories.json with structured user stories for wave planning. Include priority, acceptance criteria, and dependencies.`;
  }

  if (lower.includes('env') && lower.includes('gitignore')) {
    return `Add .env to your .gitignore file to prevent sensitive configuration from being committed.`;
  }

  if (lower.includes('large file')) {
    return `Consider splitting large files into smaller, focused modules. Aim for files under 500 lines for maintainability.`;
  }

  return `Review this issue and apply the appropriate fix based on your project requirements.`;
}

// Helper function to get shell commands for fixing issues
function getFixCommands(issue, projectPath) {
  const lower = issue.toLowerCase();
  const commands = [];

  if (lower.includes('missing') && lower.includes('docs')) {
    commands.push('mkdir -p docs');
  }

  if (lower.includes('missing') && lower.includes('mockups')) {
    commands.push('mkdir -p design_mockups');
  }

  if (lower.includes('missing') && lower.includes('public')) {
    commands.push('mkdir -p public');
  }

  if (lower.includes('missing prd')) {
    commands.push('touch docs/PRD.md');
    commands.push('# Then edit docs/PRD.md with your requirements');
  }

  if (lower.includes('missing') && lower.includes('claude')) {
    commands.push('touch docs/CLAUDE.md');
    commands.push('# Then edit docs/CLAUDE.md with AI agent instructions');
  }

  if (lower.includes('unexpected location') && lower.includes('claude')) {
    commands.push('mv CLAUDE.md docs/CLAUDE.md');
  }

  if (lower.includes('unexpected location') && lower.includes('mockup')) {
    commands.push('mv *.html design_mockups/');
  }

  if (lower.includes('env') && lower.includes('gitignore')) {
    commands.push('echo ".env" >> .gitignore');
  }

  return commands;
}

// Helper function to format an issue with fix instructions
function formatIssue(num, issue) {
  let md = `### ${num}. ${issue.title}

**How to fix:**
${issue.fix}

`;

  if (issue.commands?.length > 0) {
    md += `**Commands:**
\`\`\`bash
${issue.commands.join('\n')}
\`\`\`

`;
  }

  return md;
}

// =============================================================================
// MAIN ANALYZER EXPORT
// =============================================================================

export default {
  detectProjectMode,
  NEW_PROJECT_STEPS,
  EXISTING_PROJECT_STEPS,
  MONOREPO_STEPS,
  SCORING_PROFILES,
  // Analysis functions
  analyzeStructure,
  analyzeDocumentation,
  analyzeMockups,
  analyzeCompliance,
  analyzeTechStack,
  analyzeCodeArchitecture,
  analyzeSourceFiles,
  analyzeCodePatterns,
  analyzeTestCoverage,
  identifyIssues,
  calculateReadinessScore,
  // Monorepo functions (Grok Review Enhancement)
  getMonorepoWorkspaces,
  analyzeWorkspaces,
  analyzeWorkspaceDependencies,
  // Caching functions (Grok Review Enhancement)
  getCachedOrCompute,
  clearProjectCache,
  // Report generation
  generateImprovementReport,
};
