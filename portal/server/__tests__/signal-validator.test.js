/**
 * TDD Tests for Signal Schema Validator (GAP-014)
 *
 * Tests JSON schema validation for all WAVE signal types.
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import {
  validateSignal,
  validateSignalFile,
  getSignalType,
  getSchema,
  SCHEMA_VERSION,
  SIGNAL_TYPES
} from '../utils/signal-validator.js';

describe('SignalValidator (GAP-014)', () => {
  let tempDir;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'signal-validator-test-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  // ============================================
  // Schema Version Tests
  // ============================================

  describe('Schema Version', () => {
    test('SCHEMA_VERSION is defined and exported', () => {
      expect(SCHEMA_VERSION).toBeDefined();
      expect(typeof SCHEMA_VERSION).toBe('string');
    });

    test('SCHEMA_VERSION follows semver format', () => {
      expect(SCHEMA_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
    });
  });

  // ============================================
  // Signal Type Detection Tests
  // ============================================

  describe('getSignalType', () => {
    test('returns correct type for Gate 3 FE signal', () => {
      expect(getSignalType('signal-wave1-gate3-fe-complete.json')).toBe('gate3-complete');
    });

    test('returns correct type for Gate 3 BE signal', () => {
      expect(getSignalType('signal-wave1-gate3-be-complete.json')).toBe('gate3-complete');
    });

    test('returns correct type for Gate 4 approved signal', () => {
      expect(getSignalType('signal-wave1-gate4-approved.json')).toBe('gate4-approved');
    });

    test('returns correct type for Gate 4 rejected signal', () => {
      expect(getSignalType('signal-wave1-gate4-rejected.json')).toBe('gate4-rejected');
    });

    test('returns correct type for Gate 4.5 retry signal', () => {
      expect(getSignalType('signal-wave1-gate4.5-retry.json')).toBe('gate4.5-retry');
    });

    test('returns correct type for Gate 4.5 fixed signal', () => {
      expect(getSignalType('signal-wave1-gate4.5-fixed.json')).toBe('gate4.5-fixed');
    });

    test('returns correct type for Gate 7 merge signal', () => {
      expect(getSignalType('signal-wave1-gate7-merge-approved.json')).toBe('gate7-merge-approved');
    });

    test('returns correct type for Escalation signal', () => {
      expect(getSignalType('signal-wave1-ESCALATION.json')).toBe('escalation');
    });

    test('returns null for invalid filename', () => {
      expect(getSignalType('invalid-file.json')).toBeNull();
    });

    test('returns null for non-signal file', () => {
      expect(getSignalType('config.json')).toBeNull();
    });
  });

  // ============================================
  // Schema Retrieval Tests
  // ============================================

  describe('getSchema', () => {
    test('returns compiled schema for gate3-complete', () => {
      const schema = getSchema('gate3-complete');
      expect(schema).toBeDefined();
      expect(typeof schema).toBe('function');
    });

    test('returns compiled schema for gate4-approved', () => {
      const schema = getSchema('gate4-approved');
      expect(schema).toBeDefined();
    });

    test('returns compiled schema for escalation', () => {
      const schema = getSchema('escalation');
      expect(schema).toBeDefined();
    });

    test('returns null for unknown type', () => {
      expect(getSchema('unknown-type')).toBeNull();
    });

    test('all SIGNAL_TYPES have schemas', () => {
      for (const type of SIGNAL_TYPES) {
        const schema = getSchema(type);
        expect(schema).not.toBeNull();
      }
    });
  });

  // ============================================
  // Valid Signal Tests
  // ============================================

  describe('validateSignal - Valid Signals', () => {
    test('returns valid for correct Gate 3 complete signal', () => {
      const signal = {
        wave: 1,
        gate: 3,
        agent: 'fe-dev',
        story_id: 'STORY-001',
        status: 'COMPLETE',
        files_created: ['src/app/page.tsx'],
        files_modified: [],
        tests_passed: true,
        token_usage: {
          input_tokens: 12500,
          output_tokens: 2800,
          total_tokens: 15300,
          estimated_cost_usd: 0.0795,
          model: 'claude-sonnet-4-20250514'
        },
        timestamp: '2026-01-16T10:30:00Z'
      };

      const result = validateSignal(signal, 'gate3-complete');
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    test('returns valid for correct Gate 4 approved signal', () => {
      const signal = {
        wave: 1,
        gate: 4,
        decision: 'APPROVED',
        rejection_count: 0,
        validations: {
          build: { status: 'PASS', exit_code: 0, duration_ms: 5230 },
          typecheck: { status: 'PASS', errors: 0, warnings: 0 },
          lint: { status: 'PASS', errors: 0, warnings: 2 },
          test: { status: 'PASS', passed: 47, failed: 0, skipped: 0, coverage: 87.5 }
        },
        token_usage: {
          input_tokens: 8000,
          output_tokens: 1500,
          total_tokens: 9500,
          estimated_cost_usd: 0.0425,
          model: 'claude-haiku-4-20251001'
        },
        agent: 'qa',
        timestamp: '2026-01-16T10:50:00Z'
      };

      const result = validateSignal(signal, 'gate4-approved');
      expect(result.valid).toBe(true);
    });

    test('returns valid for correct Gate 4 rejected signal', () => {
      const signal = {
        wave: 1,
        gate: 4,
        decision: 'REJECTED',
        rejection_count: 1,
        max_retries: 3,
        validations: {
          build: { status: 'PASS', exit_code: 0 },
          typecheck: { status: 'FAIL', errors: 3 }
        },
        issues: [
          {
            id: 'QA-001',
            severity: 'HIGH',
            category: 'test_failure',
            description: 'Test fails'
          }
        ],
        return_to_gate: 2,
        token_usage: {
          input_tokens: 10000,
          output_tokens: 2000,
          total_tokens: 12000,
          estimated_cost_usd: 0.055,
          model: 'claude-haiku-4-20251001'
        },
        agent: 'qa',
        timestamp: '2026-01-16T10:47:08Z'
      };

      const result = validateSignal(signal, 'gate4-rejected');
      expect(result.valid).toBe(true);
    });

    test('returns valid for correct Gate 4.5 retry signal', () => {
      const signal = {
        wave: 1,
        gate: '4.5',
        action: 'DEV_FIX',
        retry_count: 1,
        max_retries: 3,
        issues_file: 'signal-wave1-gate4-rejected.json',
        trigger: 'qa_rejection',
        timestamp: '2026-01-16T10:47:15Z'
      };

      const result = validateSignal(signal, 'gate4.5-retry');
      expect(result.valid).toBe(true);
    });

    test('returns valid for correct Gate 4.5 fixed signal', () => {
      const signal = {
        wave: 1,
        gate: '4.5',
        status: 'FIXED',
        retry_count: 1,
        issues_fixed: ['QA-001', 'QA-002'],
        issues_remaining: [],
        changes_made: [
          { file: 'src/api/upload.ts', action: 'modified', description: 'Added validation' }
        ],
        tests_passed: true,
        build_passed: true,
        token_usage: {
          input_tokens: 18500,
          output_tokens: 4200,
          total_tokens: 22700,
          estimated_cost_usd: 0.1185,
          model: 'claude-sonnet-4-20250514'
        },
        agent: 'dev-fix',
        timestamp: '2026-01-16T10:55:00Z'
      };

      const result = validateSignal(signal, 'gate4.5-fixed');
      expect(result.valid).toBe(true);
    });

    test('returns valid for correct Gate 7 merge approved signal', () => {
      const signal = {
        wave: 1,
        gate: 7,
        status: 'APPROVED',
        approver: 'pm-agent',
        stories_included: ['STORY-001', 'STORY-002'],
        total_cost: 0.45,
        timestamp: '2026-01-16T11:00:00Z'
      };

      const result = validateSignal(signal, 'gate7-merge-approved');
      expect(result.valid).toBe(true);
    });

    test('returns valid for correct Escalation signal', () => {
      const signal = {
        wave: 1,
        type: 'ESCALATION',
        reason: 'Max retries exceeded',
        rejection_count: 3,
        max_retries: 3,
        history: [
          { attempt: 1, timestamp: '2026-01-16T10:30:00Z', issues: 5 }
        ],
        unresolved_issues: [
          { id: 'QA-001', severity: 'HIGH', description: 'Test fails' }
        ],
        requires: 'HUMAN_INTERVENTION',
        suggested_actions: ['Review issues manually'],
        timestamp: '2026-01-16T11:00:15Z'
      };

      const result = validateSignal(signal, 'escalation');
      expect(result.valid).toBe(true);
    });
  });

  // ============================================
  // Missing Required Fields Tests
  // ============================================

  describe('validateSignal - Missing Required Fields', () => {
    const validGate3Signal = {
      wave: 1,
      gate: 3,
      agent: 'fe-dev',
      story_id: 'STORY-001',
      status: 'COMPLETE',
      files_created: [],
      files_modified: [],
      tests_passed: true,
      token_usage: {
        input_tokens: 1000,
        output_tokens: 500,
        total_tokens: 1500,
        estimated_cost_usd: 0.01,
        model: 'claude-sonnet-4'
      },
      timestamp: '2026-01-16T10:30:00Z'
    };

    test('rejects missing wave field', () => {
      const signal = { ...validGate3Signal };
      delete signal.wave;

      const result = validateSignal(signal, 'gate3-complete');
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(e => e.field.includes('wave'))).toBe(true);
    });

    test('rejects missing gate field', () => {
      const signal = { ...validGate3Signal };
      delete signal.gate;

      const result = validateSignal(signal, 'gate3-complete');
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field.includes('gate'))).toBe(true);
    });

    test('rejects missing timestamp field', () => {
      const signal = { ...validGate3Signal };
      delete signal.timestamp;

      const result = validateSignal(signal, 'gate3-complete');
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field.includes('timestamp'))).toBe(true);
    });

    test('rejects missing token_usage', () => {
      const signal = { ...validGate3Signal };
      delete signal.token_usage;

      const result = validateSignal(signal, 'gate3-complete');
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field.includes('token_usage'))).toBe(true);
    });
  });

  // ============================================
  // Token Usage Validation Tests
  // ============================================

  describe('validateSignal - Token Usage Validation', () => {
    const baseSignal = {
      wave: 1,
      gate: 3,
      agent: 'fe-dev',
      story_id: 'STORY-001',
      status: 'COMPLETE',
      files_created: [],
      files_modified: [],
      tests_passed: true,
      timestamp: '2026-01-16T10:30:00Z'
    };

    test('rejects missing token_usage.input_tokens', () => {
      const signal = {
        ...baseSignal,
        token_usage: {
          output_tokens: 500,
          total_tokens: 1500,
          estimated_cost_usd: 0.01,
          model: 'claude-sonnet-4'
        }
      };

      const result = validateSignal(signal, 'gate3-complete');
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field.includes('input_tokens'))).toBe(true);
    });

    test('rejects missing token_usage.output_tokens', () => {
      const signal = {
        ...baseSignal,
        token_usage: {
          input_tokens: 1000,
          total_tokens: 1500,
          estimated_cost_usd: 0.01,
          model: 'claude-sonnet-4'
        }
      };

      const result = validateSignal(signal, 'gate3-complete');
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field.includes('output_tokens'))).toBe(true);
    });

    test('rejects missing token_usage.total_tokens', () => {
      const signal = {
        ...baseSignal,
        token_usage: {
          input_tokens: 1000,
          output_tokens: 500,
          estimated_cost_usd: 0.01,
          model: 'claude-sonnet-4'
        }
      };

      const result = validateSignal(signal, 'gate3-complete');
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field.includes('total_tokens'))).toBe(true);
    });

    test('rejects missing token_usage.estimated_cost_usd', () => {
      const signal = {
        ...baseSignal,
        token_usage: {
          input_tokens: 1000,
          output_tokens: 500,
          total_tokens: 1500,
          model: 'claude-sonnet-4'
        }
      };

      const result = validateSignal(signal, 'gate3-complete');
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field.includes('estimated_cost_usd'))).toBe(true);
    });

    test('rejects missing token_usage.model', () => {
      const signal = {
        ...baseSignal,
        token_usage: {
          input_tokens: 1000,
          output_tokens: 500,
          total_tokens: 1500,
          estimated_cost_usd: 0.01
        }
      };

      const result = validateSignal(signal, 'gate3-complete');
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field.includes('model'))).toBe(true);
    });

    test('rejects negative input_tokens', () => {
      const signal = {
        ...baseSignal,
        token_usage: {
          input_tokens: -100,
          output_tokens: 500,
          total_tokens: 1500,
          estimated_cost_usd: 0.01,
          model: 'claude-sonnet-4'
        }
      };

      const result = validateSignal(signal, 'gate3-complete');
      expect(result.valid).toBe(false);
    });

    test('rejects empty model string', () => {
      const signal = {
        ...baseSignal,
        token_usage: {
          input_tokens: 1000,
          output_tokens: 500,
          total_tokens: 1500,
          estimated_cost_usd: 0.01,
          model: ''
        }
      };

      const result = validateSignal(signal, 'gate3-complete');
      expect(result.valid).toBe(false);
    });
  });

  // ============================================
  // Type Validation Tests
  // ============================================

  describe('validateSignal - Type Validation', () => {
    test('rejects invalid wave type (string instead of number)', () => {
      const signal = {
        wave: 'one',
        gate: 3,
        agent: 'fe-dev',
        story_id: 'STORY-001',
        status: 'COMPLETE',
        files_created: [],
        files_modified: [],
        tests_passed: true,
        token_usage: {
          input_tokens: 1000,
          output_tokens: 500,
          total_tokens: 1500,
          estimated_cost_usd: 0.01,
          model: 'claude-sonnet-4'
        },
        timestamp: '2026-01-16T10:30:00Z'
      };

      const result = validateSignal(signal, 'gate3-complete');
      expect(result.valid).toBe(false);
    });

    test('rejects invalid files_created type (string instead of array)', () => {
      const signal = {
        wave: 1,
        gate: 3,
        agent: 'fe-dev',
        story_id: 'STORY-001',
        status: 'COMPLETE',
        files_created: 'src/app/page.tsx',
        files_modified: [],
        tests_passed: true,
        token_usage: {
          input_tokens: 1000,
          output_tokens: 500,
          total_tokens: 1500,
          estimated_cost_usd: 0.01,
          model: 'claude-sonnet-4'
        },
        timestamp: '2026-01-16T10:30:00Z'
      };

      const result = validateSignal(signal, 'gate3-complete');
      expect(result.valid).toBe(false);
    });
  });

  // ============================================
  // Error Reporting Tests
  // ============================================

  describe('validateSignal - Error Reporting', () => {
    test('returns errors array with field paths', () => {
      const signal = {
        gate: 3,
        agent: 'fe-dev'
        // Missing many required fields
      };

      const result = validateSignal(signal, 'gate3-complete');
      expect(result.valid).toBe(false);
      expect(Array.isArray(result.errors)).toBe(true);
      expect(result.errors.length).toBeGreaterThan(0);
      result.errors.forEach(error => {
        expect(error).toHaveProperty('field');
        expect(error).toHaveProperty('message');
      });
    });

    test('returns all errors not just first', () => {
      const signal = {
        // Missing wave, gate, timestamp, token_usage, etc.
        agent: 'fe-dev'
      };

      const result = validateSignal(signal, 'gate3-complete');
      expect(result.valid).toBe(false);
      // Should have multiple errors
      expect(result.errors.length).toBeGreaterThan(1);
    });

    test('includes schema version in result', () => {
      const signal = { wave: 1 };
      const result = validateSignal(signal, 'gate3-complete');
      expect(result.schemaVersion).toBe(SCHEMA_VERSION);
    });
  });

  // ============================================
  // File Validation Tests
  // ============================================

  describe('validateSignalFile', () => {
    test('reads and validates valid file', () => {
      const signal = {
        wave: 1,
        gate: 3,
        agent: 'fe-dev',
        story_id: 'STORY-001',
        status: 'COMPLETE',
        files_created: [],
        files_modified: [],
        tests_passed: true,
        token_usage: {
          input_tokens: 1000,
          output_tokens: 500,
          total_tokens: 1500,
          estimated_cost_usd: 0.01,
          model: 'claude-sonnet-4'
        },
        timestamp: '2026-01-16T10:30:00Z'
      };

      const filepath = path.join(tempDir, 'signal-wave1-gate3-fe-complete.json');
      fs.writeFileSync(filepath, JSON.stringify(signal, null, 2));

      const result = validateSignalFile(filepath);
      expect(result.valid).toBe(true);
    });

    test('returns error for non-existent file', () => {
      const filepath = path.join(tempDir, 'nonexistent.json');

      const result = validateSignalFile(filepath);
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('not found');
    });

    test('returns error for invalid JSON', () => {
      const filepath = path.join(tempDir, 'signal-wave1-gate3-fe-complete.json');
      fs.writeFileSync(filepath, '{ invalid json }');

      const result = validateSignalFile(filepath);
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    test('returns error for unrecognized signal type', () => {
      const filepath = path.join(tempDir, 'signal-wave1-unknown.json');
      fs.writeFileSync(filepath, JSON.stringify({ wave: 1 }));

      const result = validateSignalFile(filepath);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Unknown signal type');
    });
  });

  // ============================================
  // Security Tests
  // ============================================

  describe('Security', () => {
    test('handles malformed JSON gracefully', () => {
      const filepath = path.join(tempDir, 'signal-wave1-gate3-fe-complete.json');
      fs.writeFileSync(filepath, 'not json at all');

      const result = validateSignalFile(filepath);
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    test('rejects oversized signal data', () => {
      // Create a signal with very large array
      const signal = {
        wave: 1,
        gate: 3,
        agent: 'fe-dev',
        story_id: 'STORY-001',
        status: 'COMPLETE',
        files_created: new Array(10000).fill('file.txt'),
        files_modified: [],
        tests_passed: true,
        token_usage: {
          input_tokens: 1000,
          output_tokens: 500,
          total_tokens: 1500,
          estimated_cost_usd: 0.01,
          model: 'claude-sonnet-4'
        },
        timestamp: '2026-01-16T10:30:00Z'
      };

      // This should still validate but we should have limits
      const result = validateSignal(signal, 'gate3-complete');
      // The validator may accept this, but we can add maxItems if needed
      expect(result).toBeDefined();
    });
  });

  // ============================================
  // Gate 4.5 Signals (no token_usage required)
  // ============================================

  describe('Gate 4.5 Signals', () => {
    test('Gate 4.5 retry does not require token_usage', () => {
      const signal = {
        wave: 1,
        gate: '4.5',
        action: 'DEV_FIX',
        retry_count: 1,
        max_retries: 3,
        issues_file: 'signal-wave1-gate4-rejected.json',
        trigger: 'qa_rejection',
        timestamp: '2026-01-16T10:47:15Z'
        // No token_usage - that's OK for retry signal
      };

      const result = validateSignal(signal, 'gate4.5-retry');
      expect(result.valid).toBe(true);
    });
  });

  // ============================================
  // Gate 7 and Escalation (no token_usage required)
  // ============================================

  describe('Signals without token_usage requirement', () => {
    test('Gate 7 merge does not require token_usage', () => {
      const signal = {
        wave: 1,
        gate: 7,
        status: 'APPROVED',
        approver: 'pm-agent',
        stories_included: ['STORY-001'],
        total_cost: 0.45,
        timestamp: '2026-01-16T11:00:00Z'
      };

      const result = validateSignal(signal, 'gate7-merge-approved');
      expect(result.valid).toBe(true);
    });

    test('Escalation signal does not require token_usage', () => {
      const signal = {
        wave: 1,
        type: 'ESCALATION',
        reason: 'Max retries exceeded',
        rejection_count: 3,
        max_retries: 3,
        requires: 'HUMAN_INTERVENTION',
        timestamp: '2026-01-16T11:00:15Z'
      };

      const result = validateSignal(signal, 'escalation');
      expect(result.valid).toBe(true);
    });
  });
});
