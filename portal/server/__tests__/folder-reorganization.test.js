// ═══════════════════════════════════════════════════════════════════════════════
// FOLDER REORGANIZATION RECOMMENDER TESTS (Gate 0 Enhancement)
// ═══════════════════════════════════════════════════════════════════════════════
// Generates specific move/create suggestions for project reorganization
// ═══════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  generateReorganizationPlan,
  generateMoveCommands,
  detectDuplicateDocuments,
  suggestDocsFolderCreation,
  suggestMockupsFolderCreation,
  ReorganizationPriority
} from '../utils/folder-reorganization.js';

describe('FolderReorganization', () => {
  describe('ReorganizationPriority', () => {
    it('should define priority levels', () => {
      expect(ReorganizationPriority.CRITICAL).toBe('critical');
      expect(ReorganizationPriority.HIGH).toBe('high');
      expect(ReorganizationPriority.MEDIUM).toBe('medium');
      expect(ReorganizationPriority.LOW).toBe('low');
    });
  });

  describe('generateReorganizationPlan', () => {
    it('should return empty plan for well-organized project', () => {
      const existingFiles = [
        'docs/PRD.md',
        'docs/CLAUDE.md',
        'docs/Architecture.md',
        'mockups/html/login.html',
        'mockups/html/dashboard.html',
        'src/app/page.tsx',
        'package.json'
      ];

      const plan = generateReorganizationPlan(existingFiles);

      expect(plan.actions).toHaveLength(0);
      expect(plan.isOrganized).toBe(true);
    });

    it('should suggest moving PRD from root to docs/', () => {
      const existingFiles = [
        'PRD.md',
        'src/app/page.tsx'
      ];

      const plan = generateReorganizationPlan(existingFiles);

      const prdAction = plan.actions.find(a => a.file === 'PRD.md');
      expect(prdAction).toBeDefined();
      expect(prdAction.action).toBe('move');
      expect(prdAction.destination).toBe('docs/PRD.md');
      expect(prdAction.priority).toBe(ReorganizationPriority.CRITICAL);
    });

    it('should suggest moving HTML mockups to mockups/html/', () => {
      const existingFiles = [
        'login.html',
        'dashboard.html',
        'docs/PRD.md'
      ];

      const plan = generateReorganizationPlan(existingFiles);

      const htmlActions = plan.actions.filter(a => a.action === 'move' && a.file.endsWith('.html'));
      expect(htmlActions.length).toBe(2);
      htmlActions.forEach(action => {
        expect(action.destination).toMatch(/^mockups\/html\//);
      });
    });

    it('should suggest creating docs folder if missing', () => {
      const existingFiles = [
        'PRD.md',
        'CLAUDE.md',
        'src/index.ts'
      ];

      const plan = generateReorganizationPlan(existingFiles);

      const createDocsAction = plan.actions.find(a =>
        a.action === 'create' && a.folder === 'docs'
      );
      expect(createDocsAction).toBeDefined();
      expect(createDocsAction.priority).toBe(ReorganizationPriority.CRITICAL);
    });

    it('should suggest creating mockups folder if HTML files exist elsewhere', () => {
      const existingFiles = [
        'screens/login.html',
        'screens/signup.html',
        'docs/PRD.md'
      ];

      const plan = generateReorganizationPlan(existingFiles);

      const createMockupsAction = plan.actions.find(a =>
        a.action === 'create' && a.folder === 'mockups/html'
      );
      expect(createMockupsAction).toBeDefined();
    });

    it('should prioritize actions correctly', () => {
      const existingFiles = [
        'PRD.md',           // Critical - move to docs
        'readme.txt',       // Low - optional
        'login.html'        // High - move to mockups
      ];

      const plan = generateReorganizationPlan(existingFiles);

      // Should be sorted by priority
      const priorities = plan.actions.map(a => a.priority);
      const priorityOrder = ['critical', 'high', 'medium', 'low'];

      for (let i = 0; i < priorities.length - 1; i++) {
        const currentIdx = priorityOrder.indexOf(priorities[i]);
        const nextIdx = priorityOrder.indexOf(priorities[i + 1]);
        expect(currentIdx).toBeLessThanOrEqual(nextIdx);
      }
    });

    it('should include estimated time for plan', () => {
      const existingFiles = ['PRD.md', 'login.html', 'CLAUDE.md'];
      const plan = generateReorganizationPlan(existingFiles);

      expect(plan.estimatedMinutes).toBeDefined();
      expect(plan.estimatedMinutes).toBeGreaterThan(0);
    });
  });

  describe('generateMoveCommands', () => {
    it('should generate bash mv commands', () => {
      const actions = [
        { action: 'move', file: 'PRD.md', destination: 'docs/PRD.md' },
        { action: 'move', file: 'login.html', destination: 'mockups/html/login.html' }
      ];

      const commands = generateMoveCommands(actions);

      expect(commands).toContain('mv PRD.md docs/PRD.md');
      expect(commands).toContain('mv login.html mockups/html/login.html');
    });

    it('should generate mkdir commands for create actions', () => {
      const actions = [
        { action: 'create', folder: 'docs' },
        { action: 'create', folder: 'mockups/html' }
      ];

      const commands = generateMoveCommands(actions);

      expect(commands).toContain('mkdir -p docs');
      expect(commands).toContain('mkdir -p mockups/html');
    });

    it('should order commands correctly (mkdir before mv)', () => {
      const actions = [
        { action: 'move', file: 'PRD.md', destination: 'docs/PRD.md' },
        { action: 'create', folder: 'docs' }
      ];

      const commands = generateMoveCommands(actions);
      const mkdirIdx = commands.findIndex(c => c.includes('mkdir'));
      const mvIdx = commands.findIndex(c => c.includes('mv'));

      expect(mkdirIdx).toBeLessThan(mvIdx);
    });

    it('should handle files with spaces in names', () => {
      const actions = [
        { action: 'move', file: 'Product Requirements.md', destination: 'docs/Product Requirements.md' }
      ];

      const commands = generateMoveCommands(actions);

      expect(commands).toContain('mv "Product Requirements.md" "docs/Product Requirements.md"');
    });
  });

  describe('detectDuplicateDocuments', () => {
    it('should detect duplicate PRD files', () => {
      const existingFiles = [
        'PRD.md',
        'docs/PRD.md',
        'Footprint PRD.md',
        'PRD-v2.md'
      ];

      const duplicates = detectDuplicateDocuments(existingFiles);

      expect(duplicates.prd.length).toBeGreaterThan(1);
    });

    it('should suggest consolidation for duplicates', () => {
      const existingFiles = [
        'PRD.md',
        'Footprint PRD.md',
        'docs/PRD-old.md'
      ];

      const duplicates = detectDuplicateDocuments(existingFiles);

      expect(duplicates.prd.length).toBe(3);
      expect(duplicates.suggestion).toContain('consolidating');
    });

    it('should detect duplicate architecture docs', () => {
      const existingFiles = [
        'Architecture.md',
        'docs/Architecture.md',
        'ARCHITECTURE.md'
      ];

      const duplicates = detectDuplicateDocuments(existingFiles);

      expect(duplicates.architecture.length).toBe(3);
    });

    it('should return empty for no duplicates', () => {
      const existingFiles = [
        'docs/PRD.md',
        'docs/Architecture.md',
        'src/index.ts'
      ];

      const duplicates = detectDuplicateDocuments(existingFiles);

      expect(duplicates.prd.length).toBeLessThanOrEqual(1);
      expect(duplicates.architecture.length).toBeLessThanOrEqual(1);
    });
  });

  describe('suggestDocsFolderCreation', () => {
    it('should suggest docs folder with proper structure', () => {
      const suggestion = suggestDocsFolderCreation();

      expect(suggestion.folder).toBe('docs');
      expect(suggestion.files).toContain('PRD.md');
      expect(suggestion.files).toContain('CLAUDE.md');
      expect(suggestion.files).toContain('Architecture.md');
    });

    it('should include template content hints', () => {
      const suggestion = suggestDocsFolderCreation();

      expect(suggestion.templates).toBeDefined();
      expect(suggestion.templates['PRD.md']).toContain('Product Requirements');
    });
  });

  describe('suggestMockupsFolderCreation', () => {
    it('should suggest mockups folder with subfolders', () => {
      const suggestion = suggestMockupsFolderCreation();

      expect(suggestion.folder).toBe('mockups');
      expect(suggestion.subfolders).toContain('html');
      expect(suggestion.subfolders).toContain('figma');
    });

    it('should include naming conventions', () => {
      const suggestion = suggestMockupsFolderCreation();

      expect(suggestion.namingConvention).toBeDefined();
      expect(suggestion.namingConvention).toContain('01-');
    });
  });
});

describe('Integration: Full Reorganization Workflow', () => {
  it('should handle typical scattered project', () => {
    const scatteredProject = [
      'Footprint PRD.md',
      'PRD.md',
      'architecture.md',
      'login-screen.html',
      'dashboard.html',
      'signup-form.html',
      'CLAUDE.md',
      'stories.json',
      'package.json',
      'src/index.ts'
    ];

    const plan = generateReorganizationPlan(scatteredProject);

    // Should have multiple reorganization actions
    expect(plan.actions.length).toBeGreaterThan(0);
    expect(plan.isOrganized).toBe(false);

    // Should detect duplicate PRDs
    expect(plan.duplicates.prd.length).toBe(2);

    // Should generate executable commands
    const commands = generateMoveCommands(plan.actions);
    expect(commands.length).toBeGreaterThan(0);
  });
});
