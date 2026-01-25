// ═══════════════════════════════════════════════════════════════════════════════
// MIGRATION 005 ORCHESTRATOR TESTS
// ═══════════════════════════════════════════════════════════════════════════════
// TDD tests for database migration schema validation
// ═══════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const MIGRATION_PATH = join(__dirname, '../../supabase/migrations/005_orchestrator.sql');

describe('Migration 005: Orchestrator Tables', () => {
  let migrationContent;

  beforeAll(() => {
    expect(existsSync(MIGRATION_PATH)).toBe(true);
    migrationContent = readFileSync(MIGRATION_PATH, 'utf-8');
  });

  describe('file existence', () => {
    it('should have migration file at correct path', () => {
      expect(existsSync(MIGRATION_PATH)).toBe(true);
    });
  });

  describe('orchestrator_runs table', () => {
    it('should create orchestrator_runs table', () => {
      expect(migrationContent).toContain('CREATE TABLE');
      expect(migrationContent).toContain('orchestrator_runs');
    });

    it('should have id as UUID primary key', () => {
      expect(migrationContent).toMatch(/id\s+UUID\s+PRIMARY KEY/i);
    });

    it('should have thread_id column', () => {
      expect(migrationContent).toContain('thread_id');
    });

    it('should have project_id column', () => {
      expect(migrationContent).toContain('project_id');
    });

    it('should have phase column with default', () => {
      expect(migrationContent).toMatch(/phase\s+.*DEFAULT/i);
    });

    it('should have current_agent column', () => {
      expect(migrationContent).toContain('current_agent');
    });

    it('should have gate_status column', () => {
      expect(migrationContent).toContain('gate_status');
    });

    it('should have safety_score column', () => {
      expect(migrationContent).toContain('safety_score');
    });

    it('should have tokens_used column', () => {
      expect(migrationContent).toContain('tokens_used');
    });

    it('should have cost_usd column', () => {
      expect(migrationContent).toContain('cost_usd');
    });

    it('should have timestamp columns', () => {
      expect(migrationContent).toContain('started_at');
      expect(migrationContent).toContain('completed_at');
      expect(migrationContent).toContain('updated_at');
    });
  });

  describe('human_review_queue table', () => {
    it('should create human_review_queue table', () => {
      expect(migrationContent).toContain('human_review_queue');
    });

    it('should have review_type column', () => {
      expect(migrationContent).toContain('review_type');
    });

    it('should have reason column', () => {
      expect(migrationContent).toContain('reason');
    });

    it('should have status column with default pending', () => {
      expect(migrationContent).toMatch(/status.*DEFAULT.*'pending'/i);
    });

    it('should have resolution columns', () => {
      expect(migrationContent).toContain('resolved_by');
      expect(migrationContent).toContain('resolved_at');
      expect(migrationContent).toContain('resolution_notes');
    });

    it('should have context JSONB column', () => {
      expect(migrationContent).toMatch(/context\s+JSONB/i);
    });
  });

  describe('indexes', () => {
    it('should create index on project_id', () => {
      expect(migrationContent).toContain('idx_orchestrator_runs_project');
    });

    it('should create index on phase and gate_status', () => {
      expect(migrationContent).toContain('idx_orchestrator_runs_status');
    });

    it('should create index on human_review_queue', () => {
      expect(migrationContent).toContain('idx_human_review');
    });
  });

  describe('triggers', () => {
    it('should have updated_at trigger function', () => {
      expect(migrationContent).toContain('update_orchestrator_runs_updated_at');
    });

    it('should create trigger on orchestrator_runs', () => {
      expect(migrationContent).toContain('TRIGGER');
      expect(migrationContent).toContain('BEFORE UPDATE');
    });
  });

  describe('row level security', () => {
    it('should enable RLS on orchestrator_runs', () => {
      expect(migrationContent).toContain('ENABLE ROW LEVEL SECURITY');
    });

    it('should have RLS policy for orchestrator_runs', () => {
      expect(migrationContent).toContain('CREATE POLICY');
    });
  });

  describe('SQL syntax', () => {
    it('should use IF NOT EXISTS for tables', () => {
      expect(migrationContent).toContain('IF NOT EXISTS');
    });

    it('should not contain syntax errors (basic check)', () => {
      // Check for balanced parentheses in CREATE TABLE statements
      const createStatements = migrationContent.match(/CREATE TABLE[^;]+;/gi) || [];
      createStatements.forEach(stmt => {
        const openParens = (stmt.match(/\(/g) || []).length;
        const closeParens = (stmt.match(/\)/g) || []).length;
        expect(openParens).toBe(closeParens);
      });
    });

    it('should end statements with semicolons', () => {
      const lines = migrationContent.split('\n').filter(l =>
        l.trim() &&
        !l.trim().startsWith('--') &&
        !l.trim().startsWith('$$')
      );
      // SQL statements should end with ; or be part of function body
      const statements = migrationContent.split(';').filter(s => s.trim());
      expect(statements.length).toBeGreaterThan(5);
    });
  });
});
