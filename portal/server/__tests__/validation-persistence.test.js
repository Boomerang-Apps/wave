/**
 * TDD Tests for Validation Persistence (Pre-Flight Checklist)
 *
 * Tests that all validation states persist across page navigation:
 * - Infrastructure validation (Foundation checks)
 * - Safety validation (Guardrails, permissions)
 * - Configuration validation (API keys, settings)
 * - Slack validation (Webhook, channels)
 *
 * Based on user requirement: "all steps status needs to be stored in the database with time stamp"
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Import the module we're testing
import {
  ValidationPersistence,
  VALIDATION_TYPES,
  ValidationCheck,
  ValidationResult,
  PERSISTENCE_ERRORS
} from '../utils/validation-persistence.js';

describe('Validation Persistence (Pre-Flight Checklist)', () => {
  let mockSupabase;
  let persistence;

  beforeEach(() => {
    // Mock Supabase client
    mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      upsert: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null })
    };

    persistence = new ValidationPersistence(mockSupabase);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ============================================
  // UNIT TESTS - Constants & Types
  // ============================================

  describe('constants', () => {
    it('should define VALIDATION_TYPES', () => {
      expect(VALIDATION_TYPES).toBeDefined();
      expect(VALIDATION_TYPES.FOUNDATION).toBe('foundation');
      expect(VALIDATION_TYPES.SAFETY).toBe('safety');
      expect(VALIDATION_TYPES.SLACK).toBe('slack');
      expect(VALIDATION_TYPES.BUILD_QA).toBe('build_qa');
    });

    it('should define PERSISTENCE_ERRORS', () => {
      expect(PERSISTENCE_ERRORS).toBeDefined();
      expect(PERSISTENCE_ERRORS.PROJECT_ID_REQUIRED).toBeDefined();
      expect(PERSISTENCE_ERRORS.VALIDATION_TYPE_INVALID).toBeDefined();
      expect(PERSISTENCE_ERRORS.SAVE_FAILED).toBeDefined();
      expect(PERSISTENCE_ERRORS.LOAD_FAILED).toBeDefined();
    });
  });

  // ============================================
  // UNIT TESTS - ValidationCheck Schema
  // ============================================

  describe('ValidationCheck schema', () => {
    it('should require name field', () => {
      const check = ValidationCheck.create({
        name: 'API Key',
        status: 'pass'
      });
      expect(check.name).toBe('API Key');
    });

    it('should require status field', () => {
      const check = ValidationCheck.create({
        name: 'API Key',
        status: 'pass'
      });
      expect(check.status).toBe('pass');
    });

    it('should allow valid status values: pass, fail, warn, skip', () => {
      expect(ValidationCheck.isValidStatus('pass')).toBe(true);
      expect(ValidationCheck.isValidStatus('fail')).toBe(true);
      expect(ValidationCheck.isValidStatus('warn')).toBe(true);
      expect(ValidationCheck.isValidStatus('skip')).toBe(true);
      expect(ValidationCheck.isValidStatus('invalid')).toBe(false);
    });

    it('should include optional message field', () => {
      const check = ValidationCheck.create({
        name: 'API Key',
        status: 'fail',
        message: 'Key not configured'
      });
      expect(check.message).toBe('Key not configured');
    });

    it('should include optional details field', () => {
      const check = ValidationCheck.create({
        name: 'API Key',
        status: 'pass',
        details: { keyLength: 64, expiresAt: null }
      });
      expect(check.details.keyLength).toBe(64);
    });
  });

  // ============================================
  // UNIT TESTS - ValidationResult Schema
  // ============================================

  describe('ValidationResult schema', () => {
    it('should include status: idle | validating | ready | blocked', () => {
      expect(ValidationResult.isValidStatus('idle')).toBe(true);
      expect(ValidationResult.isValidStatus('validating')).toBe(true);
      expect(ValidationResult.isValidStatus('ready')).toBe(true);
      expect(ValidationResult.isValidStatus('blocked')).toBe(true);
      expect(ValidationResult.isValidStatus('unknown')).toBe(false);
    });

    it('should include checks array', () => {
      const result = ValidationResult.create({
        status: 'ready',
        checks: [
          { name: 'Check 1', status: 'pass' },
          { name: 'Check 2', status: 'pass' }
        ]
      });
      expect(result.checks.length).toBe(2);
    });

    it('should include last_checked timestamp as ISO string', () => {
      const result = ValidationResult.create({
        status: 'ready',
        checks: []
      });
      expect(result.last_checked).toBeDefined();
      expect(new Date(result.last_checked).getTime()).not.toBeNaN();
    });

    it('should auto-generate last_checked if not provided', () => {
      const before = new Date();
      const result = ValidationResult.create({
        status: 'ready',
        checks: []
      });
      const after = new Date();

      const timestamp = new Date(result.last_checked);
      expect(timestamp >= before).toBe(true);
      expect(timestamp <= after).toBe(true);
    });

    it('should calculate passed/failed/total counts', () => {
      const result = ValidationResult.create({
        status: 'ready',
        checks: [
          { name: 'Check 1', status: 'pass' },
          { name: 'Check 2', status: 'fail' },
          { name: 'Check 3', status: 'pass' },
          { name: 'Check 4', status: 'warn' }
        ]
      });

      expect(result.counts.passed).toBe(2);
      expect(result.counts.failed).toBe(1);
      expect(result.counts.warned).toBe(1);
      expect(result.counts.total).toBe(4);
    });

    it('should calculate percentage based on passed/total', () => {
      const result = ValidationResult.create({
        status: 'ready',
        checks: [
          { name: 'Check 1', status: 'pass' },
          { name: 'Check 2', status: 'pass' },
          { name: 'Check 3', status: 'fail' },
          { name: 'Check 4', status: 'pass' }
        ]
      });

      expect(result.percentage).toBe(75);
    });
  });

  // ============================================
  // UNIT TESTS - Save Validation
  // ============================================

  describe('saveValidation', () => {
    it('should require project_id', async () => {
      const result = await persistence.saveValidation(null, 'foundation', {
        status: 'ready',
        checks: []
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe(PERSISTENCE_ERRORS.PROJECT_ID_REQUIRED);
    });

    it('should require valid validation type', async () => {
      const result = await persistence.saveValidation('project-123', 'invalid_type', {
        status: 'ready',
        checks: []
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe(PERSISTENCE_ERRORS.VALIDATION_TYPE_INVALID);
    });

    it('should save foundation validation to config._foundation', async () => {
      mockSupabase.single.mockResolvedValue({
        data: { config: { API_KEY: 'test' } },
        error: null
      });
      mockSupabase.upsert.mockResolvedValue({ error: null });

      const result = await persistence.saveValidation('project-123', 'foundation', {
        status: 'ready',
        checks: [{ name: 'Test', status: 'pass' }]
      });

      expect(result.success).toBe(true);
      expect(mockSupabase.from).toHaveBeenCalledWith('wave_project_config');
    });

    it('should save safety validation to config._safety', async () => {
      mockSupabase.single.mockResolvedValue({
        data: { config: { API_KEY: 'test' } },
        error: null
      });
      mockSupabase.upsert.mockResolvedValue({ error: null });

      await persistence.saveValidation('project-123', 'safety', {
        status: 'ready',
        checks: [{ name: 'Guardrails', status: 'pass' }]
      });

      expect(mockSupabase.upsert).toHaveBeenCalled();
    });

    it('should preserve existing config values when saving', async () => {
      mockSupabase.single.mockResolvedValue({
        data: { config: { API_KEY: 'existing', SUPABASE_URL: 'url' } },
        error: null
      });
      mockSupabase.upsert.mockImplementation(data => {
        expect(data.config.API_KEY).toBe('existing');
        expect(data.config.SUPABASE_URL).toBe('url');
        return { error: null };
      });

      await persistence.saveValidation('project-123', 'foundation', {
        status: 'ready',
        checks: []
      });
    });

    it('should include timestamp in saved data', async () => {
      mockSupabase.single.mockResolvedValue({
        data: { config: {} },
        error: null
      });

      let savedConfig = null;
      mockSupabase.upsert.mockImplementation(data => {
        savedConfig = data.config;
        return { error: null };
      });

      await persistence.saveValidation('project-123', 'foundation', {
        status: 'ready',
        checks: []
      });

      expect(savedConfig._foundation.last_checked).toBeDefined();
    });

    it('should return error if database save fails', async () => {
      mockSupabase.single.mockResolvedValue({
        data: { config: {} },
        error: null
      });
      mockSupabase.upsert.mockResolvedValue({
        error: { message: 'Database error' }
      });

      const result = await persistence.saveValidation('project-123', 'foundation', {
        status: 'ready',
        checks: []
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe(PERSISTENCE_ERRORS.SAVE_FAILED);
    });
  });

  // ============================================
  // UNIT TESTS - Load Validation
  // ============================================

  describe('loadValidation', () => {
    it('should require project_id', async () => {
      const result = await persistence.loadValidation(null, 'foundation');

      expect(result.success).toBe(false);
      expect(result.error).toBe(PERSISTENCE_ERRORS.PROJECT_ID_REQUIRED);
    });

    it('should require valid validation type', async () => {
      const result = await persistence.loadValidation('project-123', 'invalid_type');

      expect(result.success).toBe(false);
      expect(result.error).toBe(PERSISTENCE_ERRORS.VALIDATION_TYPE_INVALID);
    });

    it('should load foundation validation from config._foundation', async () => {
      mockSupabase.single.mockResolvedValue({
        data: {
          config: {
            _foundation: {
              status: 'ready',
              checks: [{ name: 'Test', status: 'pass' }],
              last_checked: '2024-01-20T10:00:00Z'
            }
          }
        },
        error: null
      });

      const result = await persistence.loadValidation('project-123', 'foundation');

      expect(result.success).toBe(true);
      expect(result.data.status).toBe('ready');
      expect(result.data.checks.length).toBe(1);
    });

    it('should load safety validation from config._safety', async () => {
      mockSupabase.single.mockResolvedValue({
        data: {
          config: {
            _safety: {
              status: 'blocked',
              checks: [{ name: 'Guardrails', status: 'fail' }],
              last_checked: '2024-01-20T10:00:00Z'
            }
          }
        },
        error: null
      });

      const result = await persistence.loadValidation('project-123', 'safety');

      expect(result.success).toBe(true);
      expect(result.data.status).toBe('blocked');
    });

    it('should return null data if no validation exists', async () => {
      mockSupabase.single.mockResolvedValue({
        data: { config: { API_KEY: 'test' } },
        error: null
      });

      const result = await persistence.loadValidation('project-123', 'foundation');

      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
    });

    it('should return null data if config is empty', async () => {
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: null
      });

      const result = await persistence.loadValidation('project-123', 'foundation');

      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
    });

    it('should return error if database load fails', async () => {
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { message: 'Database error' }
      });

      const result = await persistence.loadValidation('project-123', 'foundation');

      expect(result.success).toBe(false);
      expect(result.error).toBe(PERSISTENCE_ERRORS.LOAD_FAILED);
    });
  });

  // ============================================
  // UNIT TESTS - Load All Validations
  // ============================================

  describe('loadAllValidations', () => {
    it('should load all validation types at once', async () => {
      mockSupabase.single.mockResolvedValue({
        data: {
          config: {
            _foundation: { status: 'ready', checks: [], last_checked: '2024-01-20T10:00:00Z' },
            _safety: { status: 'ready', checks: [], last_checked: '2024-01-20T10:00:00Z' },
            _slack: { status: 'blocked', checks: [], last_checked: '2024-01-20T09:00:00Z' },
            _build_qa: { status: 'idle', checks: [], last_checked: null }
          }
        },
        error: null
      });

      const result = await persistence.loadAllValidations('project-123');

      expect(result.success).toBe(true);
      expect(result.data.foundation.status).toBe('ready');
      expect(result.data.safety.status).toBe('ready');
      expect(result.data.slack.status).toBe('blocked');
      expect(result.data.build_qa.status).toBe('idle');
    });

    it('should return nulls for missing validations', async () => {
      mockSupabase.single.mockResolvedValue({
        data: {
          config: {
            _foundation: { status: 'ready', checks: [], last_checked: '2024-01-20T10:00:00Z' }
          }
        },
        error: null
      });

      const result = await persistence.loadAllValidations('project-123');

      expect(result.success).toBe(true);
      expect(result.data.foundation.status).toBe('ready');
      expect(result.data.safety).toBeNull();
      expect(result.data.slack).toBeNull();
    });
  });

  // ============================================
  // UNIT TESTS - Timestamp Formatting
  // ============================================

  describe('timestamp formatting', () => {
    it('should format timestamp for display', () => {
      const timestamp = '2024-01-20T10:30:45.123Z';
      const formatted = ValidationResult.formatTimestamp(timestamp);

      expect(formatted).toBeDefined();
      expect(typeof formatted).toBe('string');
    });

    it('should return "Never" for null timestamp', () => {
      const formatted = ValidationResult.formatTimestamp(null);

      expect(formatted).toBe('Never');
    });

    it('should return relative time if within 24 hours', () => {
      const now = new Date();
      const hourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
      const formatted = ValidationResult.formatTimestamp(hourAgo, { relative: true });

      expect(formatted).toMatch(/hour|minute/);
    });
  });

  // ============================================
  // UNIT TESTS - Pre-Flight Summary
  // ============================================

  describe('getPreFlightSummary', () => {
    it('should calculate overall readiness status', async () => {
      mockSupabase.single.mockResolvedValue({
        data: {
          config: {
            _foundation: { status: 'ready', checks: [], last_checked: '2024-01-20T10:00:00Z' },
            _safety: { status: 'ready', checks: [], last_checked: '2024-01-20T10:00:00Z' },
            _slack: { status: 'ready', checks: [], last_checked: '2024-01-20T10:00:00Z' }
          }
        },
        error: null
      });

      const summary = await persistence.getPreFlightSummary('project-123');

      expect(summary.ready).toBe(true);
      expect(summary.blockers).toHaveLength(0);
    });

    it('should identify blockers when any validation is blocked', async () => {
      mockSupabase.single.mockResolvedValue({
        data: {
          config: {
            _foundation: { status: 'blocked', checks: [{ name: 'API Key', status: 'fail' }], last_checked: '2024-01-20T10:00:00Z' },
            _safety: { status: 'ready', checks: [], last_checked: '2024-01-20T10:00:00Z' }
          }
        },
        error: null
      });

      const summary = await persistence.getPreFlightSummary('project-123');

      expect(summary.ready).toBe(false);
      expect(summary.blockers.length).toBeGreaterThan(0);
      expect(summary.blockers[0].type).toBe('foundation');
    });

    it('should identify blockers when validation never run', async () => {
      mockSupabase.single.mockResolvedValue({
        data: {
          config: {
            _foundation: { status: 'ready', checks: [], last_checked: '2024-01-20T10:00:00Z' }
            // _safety is missing
          }
        },
        error: null
      });

      const summary = await persistence.getPreFlightSummary('project-123');

      expect(summary.ready).toBe(false);
      expect(summary.blockers.some(b => b.type === 'safety')).toBe(true);
    });

    it('should calculate overall percentage', async () => {
      mockSupabase.single.mockResolvedValue({
        data: {
          config: {
            _foundation: { status: 'ready', checks: [
              { name: 'Check 1', status: 'pass' },
              { name: 'Check 2', status: 'pass' }
            ], last_checked: '2024-01-20T10:00:00Z' },
            _safety: { status: 'blocked', checks: [
              { name: 'Check 1', status: 'pass' },
              { name: 'Check 2', status: 'fail' }
            ], last_checked: '2024-01-20T10:00:00Z' }
          }
        },
        error: null
      });

      const summary = await persistence.getPreFlightSummary('project-123');

      expect(summary.percentage).toBe(75); // 3 pass out of 4
    });
  });

  // ============================================
  // UNIT TESTS - Clear Validation
  // ============================================

  describe('clearValidation', () => {
    it('should remove validation data for a type', async () => {
      mockSupabase.single.mockResolvedValue({
        data: {
          config: {
            API_KEY: 'test',
            _foundation: { status: 'ready', checks: [] }
          }
        },
        error: null
      });

      let savedConfig = null;
      mockSupabase.upsert.mockImplementation(data => {
        savedConfig = data.config;
        return { error: null };
      });

      await persistence.clearValidation('project-123', 'foundation');

      expect(savedConfig._foundation).toBeUndefined();
      expect(savedConfig.API_KEY).toBe('test');
    });
  });

  // ============================================
  // INTEGRATION TESTS
  // ============================================

  describe('integration', () => {
    it('should save and load foundation validation round-trip', async () => {
      const validationData = {
        status: 'ready',
        checks: [
          { name: 'Anthropic API Key', status: 'pass', message: 'Key configured' },
          { name: 'Supabase Connection', status: 'pass', message: 'Connected' },
          { name: 'GitHub Token', status: 'fail', message: 'Not configured' }
        ]
      };

      // Mock save
      mockSupabase.single.mockResolvedValue({
        data: { config: {} },
        error: null
      });

      let savedConfig = null;
      mockSupabase.upsert.mockImplementation(data => {
        savedConfig = data.config;
        return { error: null };
      });

      await persistence.saveValidation('project-123', 'foundation', validationData);

      // Mock load with saved data
      mockSupabase.single.mockResolvedValue({
        data: { config: savedConfig },
        error: null
      });

      const loaded = await persistence.loadValidation('project-123', 'foundation');

      expect(loaded.success).toBe(true);
      expect(loaded.data.status).toBe('ready');
      expect(loaded.data.checks.length).toBe(3);
      expect(loaded.data.checks[0].name).toBe('Anthropic API Key');
      expect(loaded.data.last_checked).toBeDefined();
    });

    it('should handle multiple validation types independently', async () => {
      const storage = {};

      mockSupabase.single.mockImplementation(() => ({
        data: { config: storage },
        error: null
      }));

      mockSupabase.upsert.mockImplementation(data => {
        Object.assign(storage, data.config);
        return { error: null };
      });

      // Save foundation
      await persistence.saveValidation('project-123', 'foundation', {
        status: 'ready',
        checks: [{ name: 'Foundation Check', status: 'pass' }]
      });

      // Save safety
      await persistence.saveValidation('project-123', 'safety', {
        status: 'blocked',
        checks: [{ name: 'Safety Check', status: 'fail' }]
      });

      // Verify both persist independently
      expect(storage._foundation.status).toBe('ready');
      expect(storage._safety.status).toBe('blocked');
    });
  });

  // ============================================
  // EDGE CASES
  // ============================================

  describe('edge cases', () => {
    it('should handle empty checks array', async () => {
      mockSupabase.single.mockResolvedValue({
        data: { config: {} },
        error: null
      });
      mockSupabase.upsert.mockResolvedValue({ error: null });

      const result = await persistence.saveValidation('project-123', 'foundation', {
        status: 'idle',
        checks: []
      });

      expect(result.success).toBe(true);
    });

    it('should handle very long check messages', async () => {
      const longMessage = 'x'.repeat(10000);

      mockSupabase.single.mockResolvedValue({
        data: { config: {} },
        error: null
      });
      mockSupabase.upsert.mockResolvedValue({ error: null });

      const result = await persistence.saveValidation('project-123', 'foundation', {
        status: 'ready',
        checks: [{ name: 'Test', status: 'pass', message: longMessage }]
      });

      expect(result.success).toBe(true);
    });

    it('should sanitize check names with special characters', () => {
      const check = ValidationCheck.create({
        name: '<script>alert("xss")</script>',
        status: 'pass'
      });

      expect(check.name).not.toContain('<script>');
    });
  });
});
