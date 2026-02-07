/**
 * Tests for WAVE AI Story Migration Tool: V4.2 → V4.3
 * Story: SCHEMA-003
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import { migrateStory, addV43Fields } from '../migrate-stories-v42-to-v43';

const TEST_DATA_DIR = path.join(__dirname, '__test-migration-data__');

// Setup test data
beforeAll(() => {
  if (!fs.existsSync(TEST_DATA_DIR)) {
    fs.mkdirSync(TEST_DATA_DIR, { recursive: true });
  }
});

// Cleanup test data
afterAll(() => {
  if (fs.existsSync(TEST_DATA_DIR)) {
    fs.rmSync(TEST_DATA_DIR, { recursive: true });
  }
});

describe('migrate-stories-v42-to-v43', () => {
  describe('AC-01: Tool accepts V4.2 story file as input', () => {
    it('should process V4.2 story without error', () => {
      const v42Story = {
        $schema: '../planning/schemas/story-schema-v4.2.json',
        schema_version: '4.2',
        story_id: 'TEST-MIGRATE-001',
        title: 'Test Migration Story',
        domain: 'backend',
        wave_number: 1,
        priority: 'P1',
        status: 'pending',
        objective: {
          as_a: 'Developer',
          i_want: 'to test migration',
          so_that: 'V4.2 stories work in V4.3',
        },
        acceptance_criteria: [
          {
            id: 'AC-01',
            description: 'Migration works',
          },
        ],
        files: {
          create: ['test.ts'],
        },
        safety: {
          stop_conditions: ['test'],
        },
      };

      const inputPath = path.join(TEST_DATA_DIR, 'v42-input.json');
      fs.writeFileSync(inputPath, JSON.stringify(v42Story, null, 2));

      const result = migrateStory(inputPath, { dryRun: true, backup: false, outputSuffix: '.v43' });

      expect(result.success).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle V4.1 stories (backward compat)', () => {
      const v41Story = {
        schema_version: '4.1',
        story_id: 'TEST-V41-001',
        title: 'V4.1 Story',
        domain: 'backend',
        wave_number: 1,
        priority: 'P1',
        status: 'pending',
        objective: {
          as_a: 'Developer',
          i_want: 'migration',
          so_that: 'it works',
        },
        acceptance_criteria: [{ id: 'AC-01', description: 'Test' }],
        files: { create: [] },
        safety: { stop_conditions: ['test'] },
      };

      const inputPath = path.join(TEST_DATA_DIR, 'v41-input.json');
      fs.writeFileSync(inputPath, JSON.stringify(v41Story, null, 2));

      const result = migrateStory(inputPath, { dryRun: true, backup: false, outputSuffix: '.v43' });

      expect(result.success).toBe(true);
    });
  });

  describe('AC-02: All existing fields preserved in output', () => {
    it('should preserve all V4.2 fields exactly', () => {
      const v42Story = {
        $schema: '../planning/schemas/story-schema-v4.2.json',
        schema_version: '4.2',
        story_id: 'TEST-PRESERVE-001',
        title: 'Field Preservation Test',
        type: 'feature',
        domain: 'backend',
        agent: 'be-dev',
        wave_number: 2,
        priority: 'P2',
        story_points: 8,
        status: 'in_progress',
        description: 'This is a test story for field preservation during migration',
        objective: {
          as_a: 'Developer',
          i_want: 'field preservation',
          so_that: 'data is not lost',
        },
        acceptance_criteria: [
          {
            id: 'AC-01',
            description: 'Fields preserved',
            ears_format: 'WHEN migrated THEN fields match',
            threshold: 'accuracy: 100%',
            test_approach: 'Compare before and after',
            status: 'pending',
          },
        ],
        files: {
          create: ['src/test.ts', 'src/test.test.ts'],
          modify: ['src/index.ts'],
          forbidden: ['src/admin/**'],
          existing: ['src/utils.ts'],
        },
        technical_requirements: {
          database_tables: ['users', 'sessions'],
          api_endpoints: [{ method: 'POST', path: '/api/test', description: 'Test endpoint' }],
        },
        design_source: {
          type: 'figma',
          path: 'mockups/test.html',
          verified: false,
        },
        tdd: {
          test_framework: 'vitest',
          test_files: ['src/test.test.ts'],
          coverage_target: 85,
        },
        safety: {
          stop_conditions: ['Build fails'],
          escalation_triggers: ['Critical error'],
          rollback_plan: 'git reset',
        },
        dependencies: {
          required_before: ['TEST-000'],
          blocks: ['TEST-002'],
        },
        traceability: {
          requirements: ['REQ-001'],
          epic: 'Test Epic',
          related_stories: ['TEST-002'],
        },
        gates_completed: [],
        estimated_tests: 10,
        estimated_tokens: 5000,
        metadata: {
          created_at: '2026-02-07T10:00:00Z',
          created_by: 'test-agent',
        },
        notes: 'Test notes',
      };

      const migrated = addV43Fields(v42Story);

      // Check all original fields are preserved
      expect(migrated.story_id).toBe(v42Story.story_id);
      expect(migrated.title).toBe(v42Story.title);
      expect(migrated.type).toBe(v42Story.type);
      expect(migrated.domain).toBe(v42Story.domain);
      expect(migrated.agent).toBe(v42Story.agent);
      expect(migrated.wave_number).toBe(v42Story.wave_number);
      expect(migrated.priority).toBe(v42Story.priority);
      expect(migrated.story_points).toBe(v42Story.story_points);
      expect(migrated.status).toBe(v42Story.status);
      expect(migrated.description).toBe(v42Story.description);
      expect(migrated.objective).toEqual(v42Story.objective);
      expect(migrated.acceptance_criteria).toEqual(v42Story.acceptance_criteria);
      expect(migrated.files).toEqual(v42Story.files);
      expect(migrated.technical_requirements).toEqual(v42Story.technical_requirements);
      expect(migrated.tdd).toEqual(v42Story.tdd);
      expect(migrated.safety).toEqual(v42Story.safety);
      expect(migrated.dependencies).toEqual(v42Story.dependencies);
      expect(migrated.traceability).toEqual(v42Story.traceability);
      expect(migrated.estimated_tests).toBe(v42Story.estimated_tests);
      expect(migrated.estimated_tokens).toBe(v42Story.estimated_tokens);
      expect(migrated.metadata).toEqual(v42Story.metadata);
      expect(migrated.notes).toBe(v42Story.notes);
    });
  });

  describe('AC-03: New V4.3 fields added with defaults', () => {
    it('should add context section', () => {
      const v42Story = {
        schema_version: '4.2',
        story_id: 'TEST-003',
        title: 'Test',
        domain: 'backend',
        wave_number: 1,
        priority: 'P1',
        status: 'pending',
        objective: { as_a: 'Dev', i_want: 'test', so_that: 'it works' },
        acceptance_criteria: [{ id: 'AC-01', description: 'Test' }],
        files: { create: [] },
        safety: { stop_conditions: ['test'] },
      };

      const migrated = addV43Fields(v42Story);

      expect(migrated.context).toBeDefined();
      expect(migrated.context.read_files).toEqual([]);
      expect(migrated.context.code_examples).toEqual([]);
      expect(migrated.context.similar_implementations).toEqual([]);
    });

    it('should add execution section with defaults', () => {
      const v42Story = {
        schema_version: '4.2',
        story_id: 'TEST-004',
        title: 'Test',
        domain: 'backend',
        wave_number: 1,
        priority: 'P1',
        status: 'pending',
        objective: { as_a: 'Dev', i_want: 'test', so_that: 'it works' },
        acceptance_criteria: [{ id: 'AC-01', description: 'Test' }],
        files: { create: [] },
        safety: { stop_conditions: ['test'] },
      };

      const migrated = addV43Fields(v42Story);

      expect(migrated.execution).toBeDefined();
      expect(migrated.execution.max_retries).toBe(3);
      expect(migrated.execution.timeout_minutes).toBe(60);
      expect(migrated.execution.model_tier).toBe('sonnet');
      expect(migrated.execution.checkpoint_frequency).toBe('per_gate');
    });

    it('should add subtasks array', () => {
      const v42Story = {
        schema_version: '4.2',
        story_id: 'TEST-005',
        title: 'Test',
        domain: 'backend',
        wave_number: 1,
        priority: 'P1',
        status: 'pending',
        objective: { as_a: 'Dev', i_want: 'test', so_that: 'it works' },
        acceptance_criteria: [{ id: 'AC-01', description: 'Test' }],
        files: { create: [] },
        safety: { stop_conditions: ['test'] },
      };

      const migrated = addV43Fields(v42Story);

      expect(migrated.subtasks).toBeDefined();
      expect(Array.isArray(migrated.subtasks)).toBe(true);
      expect(migrated.subtasks).toHaveLength(0);
    });

    it('should add enterprise section with modification history', () => {
      const v42Story = {
        schema_version: '4.2',
        story_id: 'TEST-006',
        title: 'Test',
        domain: 'backend',
        wave_number: 1,
        priority: 'P1',
        status: 'pending',
        objective: { as_a: 'Dev', i_want: 'test', so_that: 'it works' },
        acceptance_criteria: [{ id: 'AC-01', description: 'Test' }],
        files: { create: [] },
        safety: { stop_conditions: ['test'] },
      };

      const migrated = addV43Fields(v42Story);

      expect(migrated.enterprise).toBeDefined();
      expect(migrated.enterprise.compliance).toEqual([]);
      expect(migrated.enterprise.modification_history).toBeDefined();
      expect(migrated.enterprise.modification_history[0].author).toBe('migration-tool-v42-to-v43');
      expect(migrated.enterprise.modification_history[0].change_description).toContain('V4.2 to V4.3');
    });

    it('should enhance design_source if present', () => {
      const v42Story = {
        schema_version: '4.2',
        story_id: 'TEST-007',
        title: 'Test',
        domain: 'frontend',
        wave_number: 1,
        priority: 'P1',
        status: 'pending',
        objective: { as_a: 'Dev', i_want: 'test', so_that: 'it works' },
        acceptance_criteria: [{ id: 'AC-01', description: 'Test' }],
        files: { create: [] },
        safety: { stop_conditions: ['test'] },
        design_source: {
          type: 'figma',
          path: 'mockups/test.html',
        },
      };

      const migrated = addV43Fields(v42Story);

      expect(migrated.design_source.components).toEqual([]);
      expect(migrated.design_source.interactions).toEqual([]);
      expect(migrated.design_source.accessibility).toBeDefined();
      expect(migrated.design_source.accessibility.wcag_level).toBe('AA');
    });

    it('should update schema_version to 4.3', () => {
      const v42Story = {
        schema_version: '4.2',
        story_id: 'TEST-008',
        title: 'Test',
        domain: 'backend',
        wave_number: 1,
        priority: 'P1',
        status: 'pending',
        objective: { as_a: 'Dev', i_want: 'test', so_that: 'it works' },
        acceptance_criteria: [{ id: 'AC-01', description: 'Test' }],
        files: { create: [] },
        safety: { stop_conditions: ['test'] },
      };

      const migrated = addV43Fields(v42Story);

      expect(migrated.schema_version).toBe('4.3');
    });

    it('should update $schema reference', () => {
      const v42Story = {
        $schema: '../planning/schemas/story-schema-v4.2.json',
        schema_version: '4.2',
        story_id: 'TEST-009',
        title: 'Test',
        domain: 'backend',
        wave_number: 1,
        priority: 'P1',
        status: 'pending',
        objective: { as_a: 'Dev', i_want: 'test', so_that: 'it works' },
        acceptance_criteria: [{ id: 'AC-01', description: 'Test' }],
        files: { create: [] },
        safety: { stop_conditions: ['test'] },
      };

      const migrated = addV43Fields(v42Story);

      expect(migrated.$schema).toBe('../planning/schemas/story-schema-v4.3.json');
    });
  });

  describe('AC-04: Output validates against V4.3 schema', () => {
    it('should produce valid V4.3 story', () => {
      const v42Story = {
        $schema: '../planning/schemas/story-schema-v4.2.json',
        schema_version: '4.2',
        story_id: 'TEST-VALID-001',
        title: 'Validation Test Story',
        domain: 'backend',
        wave_number: 1,
        priority: 'P1',
        status: 'pending',
        objective: {
          as_a: 'Developer',
          i_want: 'validated migration',
          so_that: 'output is V4.3 compliant',
        },
        acceptance_criteria: [
          {
            id: 'AC-01',
            description: 'Validation passes',
          },
        ],
        files: {
          create: ['test.ts'],
        },
        safety: {
          stop_conditions: ['validation failure'],
        },
      };

      const inputPath = path.join(TEST_DATA_DIR, 'validation-test.json');
      fs.writeFileSync(inputPath, JSON.stringify(v42Story, null, 2));

      const result = migrateStory(inputPath, { dryRun: true, backup: false, outputSuffix: '.v43' });

      expect(result.success).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('AC-05: Batch migration supported (tested via main function)', () => {
    it('should handle single file migration', () => {
      const v42Story = {
        schema_version: '4.2',
        story_id: 'TEST-BATCH-001',
        title: 'Batch Test',
        domain: 'backend',
        wave_number: 1,
        priority: 'P1',
        status: 'pending',
        objective: { as_a: 'Dev', i_want: 'batch', so_that: 'multiple stories migrate' },
        acceptance_criteria: [{ id: 'AC-01', description: 'Test' }],
        files: { create: [] },
        safety: { stop_conditions: ['test'] },
      };

      const inputPath = path.join(TEST_DATA_DIR, 'batch-test-1.json');
      fs.writeFileSync(inputPath, JSON.stringify(v42Story, null, 2));

      const result = migrateStory(inputPath, { dryRun: true, backup: false, outputSuffix: '.v43' });

      expect(result.success).toBe(true);
    });
  });

  describe('AC-06: Dry-run mode available', () => {
    it('should not create files in dry-run mode', () => {
      const v42Story = {
        schema_version: '4.2',
        story_id: 'TEST-DRYRUN-001',
        title: 'Dry Run Test',
        domain: 'backend',
        wave_number: 1,
        priority: 'P1',
        status: 'pending',
        objective: { as_a: 'Dev', i_want: 'dry run', so_that: 'no files change' },
        acceptance_criteria: [{ id: 'AC-01', description: 'Test' }],
        files: { create: [] },
        safety: { stop_conditions: ['test'] },
      };

      const inputPath = path.join(TEST_DATA_DIR, 'dryrun-test.json');
      const outputPath = path.join(TEST_DATA_DIR, 'dryrun-test.v43.json');

      fs.writeFileSync(inputPath, JSON.stringify(v42Story, null, 2));

      // Ensure output doesn't exist
      if (fs.existsSync(outputPath)) {
        fs.unlinkSync(outputPath);
      }

      // Run migration in dry-run mode
      const result = migrateStory(inputPath, { dryRun: true, backup: false, outputSuffix: '.v43' });

      expect(result.success).toBe(true);
      expect(fs.existsSync(outputPath)).toBe(false); // File should NOT be created
    });

    it('should create files when not in dry-run mode', () => {
      const v42Story = {
        schema_version: '4.2',
        story_id: 'TEST-NODRYRUN-001',
        title: 'No Dry Run Test',
        domain: 'backend',
        wave_number: 1,
        priority: 'P1',
        status: 'pending',
        objective: { as_a: 'Dev', i_want: 'real migration', so_that: 'files are created' },
        acceptance_criteria: [{ id: 'AC-01', description: 'Test' }],
        files: { create: [] },
        safety: { stop_conditions: ['test'] },
      };

      const inputPath = path.join(TEST_DATA_DIR, 'nodryrun-test.json');
      const outputPath = path.join(TEST_DATA_DIR, 'nodryrun-test.v43.json');

      fs.writeFileSync(inputPath, JSON.stringify(v42Story, null, 2));

      // Ensure output doesn't exist
      if (fs.existsSync(outputPath)) {
        fs.unlinkSync(outputPath);
      }

      // Run migration WITHOUT dry-run
      const result = migrateStory(inputPath, { dryRun: false, backup: false, outputSuffix: '.v43' });

      expect(result.success).toBe(true);
      expect(fs.existsSync(outputPath)).toBe(true); // File SHOULD be created

      // Verify migrated content
      const migrated = JSON.parse(fs.readFileSync(outputPath, 'utf-8'));
      expect(migrated.schema_version).toBe('4.3');
      expect(migrated.context).toBeDefined();
      expect(migrated.execution).toBeDefined();
    });
  });

  describe('Edge cases', () => {
    it('should handle stories already at V4.3', () => {
      const v43Story = {
        schema_version: '4.3',
        story_id: 'TEST-ALREADY-V43',
        title: 'Already V4.3',
        domain: 'backend',
        wave_number: 1,
        priority: 'P1',
        status: 'pending',
        objective: { as_a: 'Dev', i_want: 'test', so_that: 'it works' },
        acceptance_criteria: [{ id: 'AC-01', description: 'Test' }],
        files: { create: [] },
        safety: { stop_conditions: ['test'] },
        context: {},
        execution: {},
      };

      const inputPath = path.join(TEST_DATA_DIR, 'already-v43.json');
      fs.writeFileSync(inputPath, JSON.stringify(v43Story, null, 2));

      const result = migrateStory(inputPath, { dryRun: true, backup: false, outputSuffix: '.v43' });

      expect(result.success).toBe(true);
      expect(result.warnings.some(w => w.includes('already V4.3'))).toBe(true);
    });

    it('should handle invalid JSON', () => {
      const inputPath = path.join(TEST_DATA_DIR, 'invalid.json');
      fs.writeFileSync(inputPath, '{ invalid json }');

      const result = migrateStory(inputPath, { dryRun: true, backup: false, outputSuffix: '.v43' });

      expect(result.success).toBe(false);
      expect(result.errors.some(e => e.includes('Invalid JSON'))).toBe(true);
    });
  });
});
