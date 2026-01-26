/**
 * TDD Tests for Gate 0: Design Foundation Analysis
 *
 * APPROACH: Write tests FIRST, all should FAIL initially
 * Then implement to make them pass.
 *
 * Total: 27 tests
 * - Mode Detection: 4 tests
 * - New Project Analysis: 6 tests
 * - Existing Project Analysis: 10 tests
 * - SSE Streaming: 3 tests
 * - Validation Status: 4 tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Import the foundation analyzer
import {
  detectProjectMode,
  NEW_PROJECT_STEPS,
  EXISTING_PROJECT_STEPS,
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
} from '../utils/foundation-analyzer.js';

// =============================================================================
// TEST FIXTURES
// =============================================================================

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = path.join(__dirname, 'fixtures', 'foundation');

// Helper to create test directories
function createTestProject(structure) {
  const testDir = path.join(FIXTURES_DIR, `test-${Date.now()}`);
  fs.mkdirSync(testDir, { recursive: true });

  for (const [filePath, content] of Object.entries(structure)) {
    const fullPath = path.join(testDir, filePath);
    const dir = path.dirname(fullPath);
    fs.mkdirSync(dir, { recursive: true });
    if (content !== null) {
      fs.writeFileSync(fullPath, content);
    }
  }

  return testDir;
}

function cleanupTestProject(testDir) {
  if (testDir && testDir.includes('fixtures/foundation/test-')) {
    fs.rmSync(testDir, { recursive: true, force: true });
  }
}

// =============================================================================
// MODE DETECTION TESTS (4 tests)
// =============================================================================

describe('Mode Detection', () => {
  let testDir;

  afterEach(() => {
    if (testDir) cleanupTestProject(testDir);
  });

  it('should detect new project for empty folder', () => {
    testDir = createTestProject({});

    const mode = detectProjectMode(testDir);

    expect(mode).toBe('new');
  });

  it('should detect new project for folder with only docs', () => {
    testDir = createTestProject({
      'docs/PRD.md': '# PRD',
      'design_mockups/01-home.html': '<html></html>',
      'README.md': '# Project',
    });

    const mode = detectProjectMode(testDir);

    expect(mode).toBe('new');
  });

  it('should detect existing project when src/ has code files', () => {
    testDir = createTestProject({
      'src/index.ts': 'export default {}',
      'src/components/Button.tsx': 'export const Button = () => <button />',
      'package.json': JSON.stringify({ name: 'test', dependencies: { react: '^18.0.0' } }),
    });

    const mode = detectProjectMode(testDir);

    expect(mode).toBe('existing');
  });

  it('should detect new project when package.json has dependencies but no code', () => {
    // FUNDAMENTAL: package.json dependencies alone don't make it "existing"
    // A new project can have dependencies defined without any code written yet
    testDir = createTestProject({
      'package.json': JSON.stringify({
        name: 'test-project',
        dependencies: {
          'next': '^14.0.0',
          'react': '^18.0.0',
        },
      }),
    });

    const mode = detectProjectMode(testDir);

    // Still NEW because no source code files exist
    expect(mode).toBe('new');
  });
});

// =============================================================================
// NEW PROJECT ANALYSIS TESTS (6 tests)
// =============================================================================

describe('New Project Analysis', () => {
  let testDir;

  afterEach(() => {
    if (testDir) cleanupTestProject(testDir);
  });

  it('should find required folders in structure analysis', () => {
    testDir = createTestProject({
      'docs/PRD.md': '# PRD',
      'design_mockups/01-home.html': '<html></html>',
    });

    const result = analyzeStructure(testDir);

    expect(result.status).toBe('pass');
    expect(result.findings).toContainEqual(expect.stringContaining('docs/'));
    expect(result.findings).toContainEqual(expect.stringContaining('design_mockups'));
  });

  it('should find PRD document in documentation analysis', () => {
    testDir = createTestProject({
      'docs/PRD.md': '# Product Requirements Document\n\nThis is the PRD.',
    });

    const result = analyzeDocumentation(testDir);

    expect(result.status).not.toBe('fail');
    expect(result.docsFound).toContainEqual(expect.objectContaining({ name: 'PRD' }));
  });

  it('should count HTML mockup files', () => {
    testDir = createTestProject({
      'design_mockups/01-login.html': '<html></html>',
      'design_mockups/02-dashboard.html': '<html></html>',
      'design_mockups/03-settings.html': '<html></html>',
    });

    const result = analyzeMockups(testDir);

    expect(result.status).toBe('pass');
    expect(result.count).toBe(3);
    expect(result.mockupsFound).toHaveLength(3);
  });

  it('should calculate compliance score correctly', () => {
    testDir = createTestProject({
      'README.md': '# Project',
      'docs/': null,
      'design_mockups/': null,
      'package.json': JSON.stringify({ name: 'test' }),
    });

    const result = analyzeCompliance(testDir);

    expect(result.complianceScore).toBeGreaterThanOrEqual(0);
    expect(result.complianceScore).toBeLessThanOrEqual(100);
    expect(result.status).toBeDefined();
  });

  it('should detect tech stack from package.json', () => {
    testDir = createTestProject({
      'package.json': JSON.stringify({
        name: 'my-app',
        dependencies: {
          'next': '^14.0.0',
          'react': '^18.0.0',
          'typescript': '^5.0.0',
          'tailwindcss': '^3.0.0',
        },
      }),
      'tsconfig.json': '{}',
    });

    const result = analyzeTechStack(testDir);

    expect(result.status).toBe('pass');
    expect(result.techStack).toContain('Next.js');
    expect(result.techStack).toContain('React');
    expect(result.techStack).toContain('TypeScript');
    expect(result.techStack).toContain('Tailwind CSS');
  });

  it('should calculate readiness score for new project', () => {
    const results = {
      structure: { status: 'pass' },
      documentation: { status: 'pass' },
      mockups: { status: 'pass' },
      compliance: { status: 'warn' },
      techstack: { status: 'pass' },
    };

    const score = calculateReadinessScore(results, 'new');

    expect(score).toBeGreaterThanOrEqual(70);
    expect(score).toBeLessThanOrEqual(100);
  });
});

// =============================================================================
// EXISTING PROJECT ANALYSIS TESTS (10 tests)
// =============================================================================

describe('Existing Project Analysis', () => {
  let testDir;

  afterEach(() => {
    if (testDir) cleanupTestProject(testDir);
  });

  it('should detect Next.js App Router architecture', () => {
    testDir = createTestProject({
      'app/page.tsx': 'export default function Page() {}',
      'app/layout.tsx': 'export default function Layout({ children }) {}',
      'package.json': JSON.stringify({ dependencies: { next: '^14.0.0' } }),
    });

    const result = analyzeCodeArchitecture(testDir);

    expect(result.architecture.pattern).toContain('App Router');
  });

  it('should detect Next.js Pages Router architecture', () => {
    testDir = createTestProject({
      'pages/index.tsx': 'export default function Home() {}',
      'pages/_app.tsx': 'export default function App() {}',
      'package.json': JSON.stringify({ dependencies: { next: '^14.0.0' } }),
    });

    const result = analyzeCodeArchitecture(testDir);

    expect(result.architecture.pattern).toContain('Pages Router');
  });

  it('should count source files by type', () => {
    testDir = createTestProject({
      'src/index.ts': 'export {}',
      'src/components/Button.tsx': 'export const Button = () => null',
      'src/components/Card.tsx': 'export const Card = () => null',
      'src/styles/main.css': 'body {}',
    });

    const result = analyzeSourceFiles(testDir);

    expect(result.counts.typescript).toBe(3);
    expect(result.counts.css).toBe(1);
    expect(result.total).toBe(4);
  });

  it('should find hooks folder in code patterns', () => {
    testDir = createTestProject({
      'src/hooks/useAuth.ts': 'export function useAuth() {}',
      'src/hooks/useData.ts': 'export function useData() {}',
    });

    const result = analyzeCodePatterns(testDir);

    expect(result.patterns.hooks).toBe(true);
  });

  it('should find components folder in code patterns', () => {
    testDir = createTestProject({
      'src/components/Button.tsx': 'export const Button = () => null',
      'src/components/Card.tsx': 'export const Card = () => null',
    });

    const result = analyzeCodePatterns(testDir);

    expect(result.patterns.components).toBe(true);
  });

  it('should find test files', () => {
    testDir = createTestProject({
      '__tests__/Button.test.tsx': 'test("works", () => {})',
      '__tests__/Card.test.tsx': 'test("works", () => {})',
      '__tests__/utils.test.ts': 'test("works", () => {})',
    });

    const result = analyzeTestCoverage(testDir);

    expect(result.testCount).toBe(3);
  });

  it('should find Jest config', () => {
    testDir = createTestProject({
      'jest.config.js': 'module.exports = {}',
      '__tests__/example.test.ts': 'test("works", () => {})',
    });

    const result = analyzeTestCoverage(testDir);

    expect(result.hasConfig).toBe(true);
    expect(result.findings).toContainEqual(expect.stringContaining('Jest'));
  });

  it('should identify large files as issues', () => {
    testDir = createTestProject({
      'src/big-file.ts': 'x'.repeat(150000), // 150KB
    });

    const result = identifyIssues(testDir);

    expect(result.issues).toContainEqual(expect.stringContaining('Large file'));
  });

  it('should check .env in .gitignore', () => {
    testDir = createTestProject({
      '.env': 'SECRET=value',
      '.gitignore': 'node_modules\n',
    });

    const result = identifyIssues(testDir);

    expect(result.issues).toContainEqual(expect.stringContaining('.env'));
  });

  it('should calculate readiness score for existing project', () => {
    const results = {
      structure: { status: 'pass' },
      documentation: { status: 'warn' },
      mockups: { status: 'pass' },
      techstack: { status: 'pass' },
      architecture: { status: 'pass' },
      sourcefiles: { status: 'pass' },
      patterns: { status: 'warn' },
      testing: { status: 'pass' },
    };

    const score = calculateReadinessScore(results, 'existing');

    expect(score).toBeGreaterThanOrEqual(70);
    expect(score).toBeLessThanOrEqual(100);
  });
});

// =============================================================================
// SSE STREAMING TESTS (3 tests)
// =============================================================================

describe('SSE Streaming', () => {
  it('should have correct number of steps for new project mode', () => {
    expect(NEW_PROJECT_STEPS).toHaveLength(6);
    expect(NEW_PROJECT_STEPS[0].step).toBe(1);
    expect(NEW_PROJECT_STEPS[5].step).toBe(6);
  });

  it('should have correct number of steps for existing project mode', () => {
    expect(EXISTING_PROJECT_STEPS).toHaveLength(10);
    expect(EXISTING_PROJECT_STEPS[0].step).toBe(1);
    expect(EXISTING_PROJECT_STEPS[9].step).toBe(10);
  });

  it('should have unique keys for all steps', () => {
    const newKeys = NEW_PROJECT_STEPS.map(s => s.key);
    const existingKeys = EXISTING_PROJECT_STEPS.map(s => s.key);

    expect(new Set(newKeys).size).toBe(newKeys.length);
    expect(new Set(existingKeys).size).toBe(existingKeys.length);
  });
});

// =============================================================================
// VALIDATION STATUS TESTS (4 tests)
// =============================================================================

describe('Validation Status', () => {
  let testDir;

  afterEach(() => {
    if (testDir) cleanupTestProject(testDir);
  });

  it('should return blocked status when no PRD for new project', () => {
    testDir = createTestProject({
      'docs/': null,
      'design_mockups/01-home.html': '<html></html>',
      'README.md': '# Project',
    });

    const docResult = analyzeDocumentation(testDir);

    // PRD missing should cause fail status
    expect(docResult.status).toBe('fail');
    expect(docResult.issues).toContainEqual(expect.stringContaining('PRD'));
  });

  it('should return blocked status when no mockups for new project', () => {
    testDir = createTestProject({
      'docs/PRD.md': '# PRD',
      'design_mockups/': null, // Empty folder
    });

    const result = analyzeMockups(testDir);

    expect(result.status).toBe('warn');
    expect(result.count).toBe(0);
  });

  it('should return ready status when all checks pass', () => {
    const results = {
      structure: { status: 'pass' },
      documentation: { status: 'pass' },
      mockups: { status: 'pass' },
      compliance: { status: 'pass' },
      techstack: { status: 'pass' },
    };

    const score = calculateReadinessScore(results, 'new');

    expect(score).toBe(100);
  });

  it('should return blocked status when score below 40%', () => {
    const results = {
      structure: { status: 'fail' },
      documentation: { status: 'fail' },
      mockups: { status: 'fail' },
      compliance: { status: 'fail' },
      techstack: { status: 'fail' },
    };

    const score = calculateReadinessScore(results, 'new');

    expect(score).toBeLessThan(40);
  });
});

// =============================================================================
// INTEGRATION TEST
// =============================================================================

describe('Full Analysis Integration', () => {
  let testDir;

  afterEach(() => {
    if (testDir) cleanupTestProject(testDir);
  });

  it('should complete full new project analysis', () => {
    testDir = createTestProject({
      'docs/PRD.md': '# Product Requirements\n\nDetailed requirements...',
      'docs/ARCHITECTURE.md': '# Architecture\n\nSystem design...',
      'design_mockups/01-login.html': '<html><body>Login</body></html>',
      'design_mockups/02-dashboard.html': '<html><body>Dashboard</body></html>',
      'README.md': '# My Project\n\nDescription here...',
      'package.json': JSON.stringify({ name: 'my-project', dependencies: { react: '^18.0.0' } }),
    });

    const mode = detectProjectMode(testDir);
    expect(mode).toBe('new'); // No src/ folder

    const structure = analyzeStructure(testDir);
    const docs = analyzeDocumentation(testDir);
    const mockups = analyzeMockups(testDir);
    const compliance = analyzeCompliance(testDir);
    const techstack = analyzeTechStack(testDir);

    const results = {
      structure,
      documentation: docs,
      mockups,
      compliance,
      techstack,
    };

    const score = calculateReadinessScore(results, mode);

    expect(score).toBeGreaterThanOrEqual(60);
  });

  it('should complete full existing project analysis', () => {
    testDir = createTestProject({
      'src/index.ts': 'export default {}',
      'src/components/Button.tsx': 'export const Button = () => null',
      'src/hooks/useAuth.ts': 'export function useAuth() {}',
      '__tests__/Button.test.tsx': 'test("works", () => {})',
      'docs/README.md': '# Project',
      'package.json': JSON.stringify({
        name: 'existing-project',
        dependencies: { next: '^14.0.0', react: '^18.0.0' },
      }),
      'jest.config.js': 'module.exports = {}',
    });

    const mode = detectProjectMode(testDir);
    expect(mode).toBe('existing');

    const structure = analyzeStructure(testDir);
    const techstack = analyzeTechStack(testDir);
    const architecture = analyzeCodeArchitecture(testDir);
    const sourcefiles = analyzeSourceFiles(testDir);
    const docs = analyzeDocumentation(testDir);
    const mockups = analyzeMockups(testDir);
    const patterns = analyzeCodePatterns(testDir);
    const testing = analyzeTestCoverage(testDir);

    const results = {
      structure,
      documentation: docs,
      mockups,
      techstack,
      architecture,
      sourcefiles,
      patterns,
      testing,
    };

    const score = calculateReadinessScore(results, mode);

    expect(score).toBeGreaterThanOrEqual(50);
  });
});
