/**
 * Tests for WAVE AI Story Schema Validator
 * Story: SCHEMA-004
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import { validateStory, detectSchemaVersion, getSuggestion, getLineNumber } from '../validate-story';

const TEST_DATA_DIR = path.join(__dirname, '__test-data__');

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

describe('validate-story', () => {
  describe('AC-01: Validates single story file', () => {
    it('should pass valid V4.3 story', () => {
      const validStory = {
        $schema: '../planning/schemas/story-schema-v4.3.json',
        schema_version: '4.3',
        story_id: 'TEST-001',
        title: 'Test Story',
        domain: 'backend',
        wave_number: 1,
        priority: 'P1',
        status: 'pending',
        objective: {
          as_a: 'Developer',
          i_want: 'to test validation',
          so_that: 'stories are correct',
        },
        acceptance_criteria: [
          {
            id: 'AC-01',
            description: 'Test criterion',
          },
        ],
        files: {
          create: [],
        },
        safety: {
          stop_conditions: ['test'],
        },
      };

      const filePath = path.join(TEST_DATA_DIR, 'valid-v4.3.json');
      fs.writeFileSync(filePath, JSON.stringify(validStory, null, 2));

      const result = validateStory(filePath);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail invalid story (missing required field)', () => {
      const invalidStory = {
        schema_version: '4.3',
        title: 'Invalid Story',
        // Missing required fields
      };

      const filePath = path.join(TEST_DATA_DIR, 'invalid-missing-fields.json');
      fs.writeFileSync(filePath, JSON.stringify(invalidStory, null, 2));

      const result = validateStory(filePath);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should fail on invalid JSON syntax', () => {
      const filePath = path.join(TEST_DATA_DIR, 'invalid-json.json');
      fs.writeFileSync(filePath, '{ invalid json }');

      const result = validateStory(filePath);

      expect(result.valid).toBe(false);
      expect(result.errors[0].message).toContain('Invalid JSON');
    });
  });

  describe('AC-02: Validates directory of stories (tested via main function)', () => {
    // This is integration-tested via the main() function
    // Unit test verifies single file validation which is the building block
    it('should validate single file as building block for directory validation', () => {
      const story = {
        $schema: '../planning/schemas/story-schema-v4.3.json',
        schema_version: '4.3',
        story_id: 'TEST-002',
        title: 'Directory Test Story',
        domain: 'backend',
        wave_number: 1,
        priority: 'P1',
        status: 'pending',
        objective: {
          as_a: 'Developer',
          i_want: 'directory validation',
          so_that: 'all stories are checked',
        },
        acceptance_criteria: [{ id: 'AC-01', description: 'Test' }],
        files: { create: [] },
        safety: { stop_conditions: ['test'] },
      };

      const filePath = path.join(TEST_DATA_DIR, 'directory-test.json');
      fs.writeFileSync(filePath, JSON.stringify(story, null, 2));

      const result = validateStory(filePath);
      expect(result.valid).toBe(true);
    });
  });

  describe('AC-03: Auto-detects schema version', () => {
    it('should detect V4.3 from schema_version field', () => {
      const story = { schema_version: '4.3' };
      expect(detectSchemaVersion(story)).toBe('4.3');
    });

    it('should detect V4.2 from schema_version field', () => {
      const story = { schema_version: '4.2' };
      expect(detectSchemaVersion(story)).toBe('4.2');
    });

    it('should detect V4.1 from schema_version field', () => {
      const story = { schema_version: '4.1' };
      expect(detectSchemaVersion(story)).toBe('4.1');
    });

    it('should detect V4.3 from presence of context field', () => {
      const story = { context: { read_files: [] } };
      expect(detectSchemaVersion(story)).toBe('4.3');
    });

    it('should detect V4.3 from presence of execution field', () => {
      const story = { execution: { max_retries: 3 } };
      expect(detectSchemaVersion(story)).toBe('4.3');
    });

    it('should detect V4.3 from presence of subtasks field', () => {
      const story = { subtasks: [] };
      expect(detectSchemaVersion(story)).toBe('4.3');
    });

    it('should detect V4.3 from presence of enterprise field', () => {
      const story = { enterprise: { compliance: [] } };
      expect(detectSchemaVersion(story)).toBe('4.3');
    });

    it('should detect V4.2 from presence of design_source field', () => {
      const story = { design_source: { type: 'figma' } };
      expect(detectSchemaVersion(story)).toBe('4.2');
    });

    it('should default to V4.1 if no version indicators', () => {
      const story = { story_id: 'TEST-001' };
      expect(detectSchemaVersion(story)).toBe('4.1');
    });
  });

  describe('AC-04: Error messages include line numbers', () => {
    it('should find line number for field in JSON', () => {
      const fileContent = `{
  "story_id": "TEST-001",
  "title": "Test Story",
  "invalid_field": "test"
}`;

      const line = getLineNumber(fileContent, '/invalid_field');
      expect(line).toBe(4); // 1-indexed
    });

    it('should return undefined if field not found', () => {
      const fileContent = '{ "story_id": "TEST-001" }';
      const line = getLineNumber(fileContent, '/nonexistent');
      expect(line).toBeUndefined();
    });

    it('should include line numbers in validation errors', () => {
      const invalidStory = {
        schema_version: '4.3',
        story_id: 'TEST-LINE-001',
        title: 'Test',
        // Missing many required fields
      };

      const filePath = path.join(TEST_DATA_DIR, 'line-number-test.json');
      fs.writeFileSync(filePath, JSON.stringify(invalidStory, null, 2));

      const result = validateStory(filePath);

      expect(result.valid).toBe(false);
      // At least some errors should have line numbers
      const errorsWithLines = result.errors.filter(e => e.line !== undefined);
      expect(errorsWithLines.length).toBeGreaterThan(0);
    });
  });

  describe('AC-05: Suggestions for common errors', () => {
    it('should suggest fix for "must be string" error', () => {
      const suggestion = getSuggestion('must be string');
      expect(suggestion).toContain('string value');
    });

    it('should suggest fix for "must be integer" error', () => {
      const suggestion = getSuggestion('must be integer');
      expect(suggestion).toContain('whole number');
    });

    it('should suggest fix for "must be array" error', () => {
      const suggestion = getSuggestion('must be array');
      expect(suggestion).toContain('square brackets');
    });

    it('should suggest fix for "must have required property" error', () => {
      const suggestion = getSuggestion('must have required property');
      expect(suggestion).toContain('missing required field');
    });

    it('should suggest fix for "must match format uri" error', () => {
      const suggestion = getSuggestion('must match format "uri"');
      expect(suggestion).toContain('http://');
    });

    it('should suggest fix for "must match format date-time" error', () => {
      const suggestion = getSuggestion('must match format "date-time"');
      expect(suggestion).toContain('ISO 8601');
    });

    it('should return undefined for unknown error patterns', () => {
      const suggestion = getSuggestion('some unknown error');
      expect(suggestion).toBeUndefined();
    });

    it('should include suggestions in validation errors', () => {
      const invalidStory = {
        schema_version: '4.3',
        story_id: 'TEST-SUGGEST-001',
        // Missing required string fields -> triggers suggestions
      };

      const filePath = path.join(TEST_DATA_DIR, 'suggestion-test.json');
      fs.writeFileSync(filePath, JSON.stringify(invalidStory, null, 2));

      const result = validateStory(filePath);

      expect(result.valid).toBe(false);
      // At least some errors should have suggestions
      const errorsWithSuggestions = result.errors.filter(e => e.suggestion !== undefined);
      expect(errorsWithSuggestions.length).toBeGreaterThan(0);
    });
  });

  describe('AC-06: Exit code indicates pass/fail (integration test via main)', () => {
    // Exit codes are tested in integration/e2e tests when running the script
    // Unit test verifies the validation result structure is correct
    it('should return valid=true for passing stories', () => {
      const validStory = {
        $schema: '../planning/schemas/story-schema-v4.3.json',
        schema_version: '4.3',
        story_id: 'TEST-EXIT-001',
        title: 'Exit Code Test',
        domain: 'backend',
        wave_number: 1,
        priority: 'P1',
        status: 'pending',
        objective: {
          as_a: 'Developer',
          i_want: 'exit code validation',
          so_that: 'CI/CD can detect failures',
        },
        acceptance_criteria: [{ id: 'AC-01', description: 'Test' }],
        files: { create: [] },
        safety: { stop_conditions: ['test'] },
      };

      const filePath = path.join(TEST_DATA_DIR, 'exit-code-pass.json');
      fs.writeFileSync(filePath, JSON.stringify(validStory, null, 2));

      const result = validateStory(filePath);
      expect(result.valid).toBe(true); // Should result in exit 0
    });

    it('should return valid=false for failing stories', () => {
      const invalidStory = {
        schema_version: '4.3',
        story_id: 'TEST-EXIT-002',
        // Missing required fields
      };

      const filePath = path.join(TEST_DATA_DIR, 'exit-code-fail.json');
      fs.writeFileSync(filePath, JSON.stringify(invalidStory, null, 2));

      const result = validateStory(filePath);
      expect(result.valid).toBe(false); // Should result in exit 1
    });
  });

  describe('Edge cases and robustness', () => {
    it('should handle stories with all optional V4.3 fields', () => {
      const fullStory = {
        $schema: '../planning/schemas/story-schema-v4.3.json',
        schema_version: '4.3',
        story_id: 'TEST-FULL-001',
        title: 'Full Story Test',
        type: 'feature',
        domain: 'backend',
        agent: 'be-dev',
        wave_number: 1,
        priority: 'P1',
        story_points: 5,
        status: 'pending',
        description: 'Full story with all optional fields for comprehensive validation testing',
        objective: {
          as_a: 'Developer',
          i_want: 'all fields tested',
          so_that: 'validation is comprehensive',
        },
        acceptance_criteria: [
          {
            id: 'AC-01',
            description: 'Test all fields',
            ears_format: 'WHEN all fields present THEN validation passes',
            test_approach: 'Automated test',
            status: 'pending',
          },
        ],
        context: {
          read_files: ['src/test.ts'],
          code_examples: [{ description: 'Example', code: 'const x = 1;' }],
        },
        execution: {
          max_retries: 3,
          timeout_minutes: 60,
          model_tier: 'sonnet',
        },
        subtasks: [
          {
            id: 'ST-01',
            title: 'Subtask 1',
            status: 'pending',
          },
        ],
        files: {
          create: ['test.ts'],
        },
        safety: {
          stop_conditions: ['test failure'],
        },
        enterprise: {
          compliance: ['GDPR'],
        },
      };

      const filePath = path.join(TEST_DATA_DIR, 'full-story.json');
      fs.writeFileSync(filePath, JSON.stringify(fullStory, null, 2));

      const result = validateStory(filePath);
      expect(result.valid).toBe(true);
    });
  });
});
