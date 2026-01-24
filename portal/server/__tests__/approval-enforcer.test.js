/**
 * TDD Tests for Approval Enforcer (GAP-008)
 *
 * Tests that operations are properly classified by approval level (L1-L5)
 * and that required approvals are validated before execution.
 *
 * Based on:
 * - NIST SP 800-53 Access Control (AC-2, AC-3, AC-5, AC-6)
 * - RBAC Best Practices
 * - WAVE APPROVAL-LEVELS.md Specification
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';

// Import the module we're testing
import {
  getApprovalLevel,
  requireApproval,
  validateApprovalChain,
  createApprovalRequest,
  checkApprovalExists,
  createApprovalEnforcerMiddleware,
  APPROVAL_LEVELS,
  APPROVAL_ENFORCER_ERRORS
} from '../utils/approval-enforcer.js';

describe('Approval Enforcer (GAP-008)', () => {
  let tempDir;
  let signalDir;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'approval-enforcer-test-'));
    signalDir = path.join(tempDir, '.claude');
    fs.mkdirSync(signalDir, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  // Helper to create approval signal files
  function createApprovalSignal(filename, content) {
    const filePath = path.join(signalDir, filename);
    fs.writeFileSync(filePath, JSON.stringify(content, null, 2));
    return filePath;
  }

  // ============================================
  // CONSTANTS TESTS
  // ============================================

  describe('APPROVAL_LEVELS constants', () => {
    it('should define L0 as FORBIDDEN', () => {
      expect(APPROVAL_LEVELS.L0).toBe('FORBIDDEN');
    });

    it('should define L1 as HUMAN_ONLY', () => {
      expect(APPROVAL_LEVELS.L1).toBe('HUMAN_ONLY');
    });

    it('should define L2 as CTO_APPROVAL', () => {
      expect(APPROVAL_LEVELS.L2).toBe('CTO_APPROVAL');
    });

    it('should define L3 as PM_APPROVAL', () => {
      expect(APPROVAL_LEVELS.L3).toBe('PM_APPROVAL');
    });

    it('should define L4 as QA_REVIEW', () => {
      expect(APPROVAL_LEVELS.L4).toBe('QA_REVIEW');
    });

    it('should define L5 as AUTO_ALLOWED', () => {
      expect(APPROVAL_LEVELS.L5).toBe('AUTO_ALLOWED');
    });
  });

  describe('APPROVAL_ENFORCER_ERRORS constants', () => {
    it('should define APPROVAL_REQUIRED error', () => {
      expect(APPROVAL_ENFORCER_ERRORS.APPROVAL_REQUIRED).toBe('approval_required');
    });

    it('should define APPROVAL_EXPIRED error', () => {
      expect(APPROVAL_ENFORCER_ERRORS.APPROVAL_EXPIRED).toBe('approval_expired');
    });

    it('should define FORBIDDEN_OPERATION error', () => {
      expect(APPROVAL_ENFORCER_ERRORS.FORBIDDEN_OPERATION).toBe('forbidden_operation');
    });

    it('should define SEPARATION_OF_DUTIES_VIOLATION error', () => {
      expect(APPROVAL_ENFORCER_ERRORS.SEPARATION_OF_DUTIES_VIOLATION).toBe('separation_of_duties_violation');
    });
  });

  // ============================================
  // UNIT TESTS - getApprovalLevel
  // ============================================

  describe('getApprovalLevel', () => {
    // L1 - Human Only operations
    it('should return L1 for merge_to_main', () => {
      expect(getApprovalLevel('merge_to_main')).toBe(APPROVAL_LEVELS.L1);
    });

    it('should return L1 for database_migration', () => {
      expect(getApprovalLevel('database_migration')).toBe(APPROVAL_LEVELS.L1);
    });

    it('should return L1 for create_api_endpoint', () => {
      expect(getApprovalLevel('create_api_endpoint')).toBe(APPROVAL_LEVELS.L1);
    });

    it('should return L1 for add_dependency', () => {
      expect(getApprovalLevel('add_dependency')).toBe(APPROVAL_LEVELS.L1);
    });

    it('should return L1 for modify_security_config', () => {
      expect(getApprovalLevel('modify_security_config')).toBe(APPROVAL_LEVELS.L1);
    });

    it('should return L1 for delete_production_data', () => {
      expect(getApprovalLevel('delete_production_data')).toBe(APPROVAL_LEVELS.L1);
    });

    // L2 - CTO Approval operations
    it('should return L2 for create_module', () => {
      expect(getApprovalLevel('create_module')).toBe(APPROVAL_LEVELS.L2);
    });

    it('should return L2 for modify_shared_interface', () => {
      expect(getApprovalLevel('modify_shared_interface')).toBe(APPROVAL_LEVELS.L2);
    });

    it('should return L2 for add_database_table', () => {
      expect(getApprovalLevel('add_database_table')).toBe(APPROVAL_LEVELS.L2);
    });

    it('should return L2 for change_api_response_format', () => {
      expect(getApprovalLevel('change_api_response_format')).toBe(APPROVAL_LEVELS.L2);
    });

    it('should return L2 for introduce_new_pattern', () => {
      expect(getApprovalLevel('introduce_new_pattern')).toBe(APPROVAL_LEVELS.L2);
    });

    // L3 - PM Approval operations
    it('should return L3 for assign_story', () => {
      expect(getApprovalLevel('assign_story')).toBe(APPROVAL_LEVELS.L3);
    });

    it('should return L3 for approve_gate_transition', () => {
      expect(getApprovalLevel('approve_gate_transition')).toBe(APPROVAL_LEVELS.L3);
    });

    it('should return L3 for approve_merge_readiness', () => {
      expect(getApprovalLevel('approve_merge_readiness')).toBe(APPROVAL_LEVELS.L3);
    });

    it('should return L3 for approve_story_completion', () => {
      expect(getApprovalLevel('approve_story_completion')).toBe(APPROVAL_LEVELS.L3);
    });

    // L4 - QA Review operations
    it('should return L4 for approve_code_review', () => {
      expect(getApprovalLevel('approve_code_review')).toBe(APPROVAL_LEVELS.L4);
    });

    it('should return L4 for run_test_suite', () => {
      expect(getApprovalLevel('run_test_suite')).toBe(APPROVAL_LEVELS.L4);
    });

    it('should return L4 for verify_acceptance_criteria', () => {
      expect(getApprovalLevel('verify_acceptance_criteria')).toBe(APPROVAL_LEVELS.L4);
    });

    // L5 - Auto Allowed operations
    it('should return L5 for read_file', () => {
      expect(getApprovalLevel('read_file')).toBe(APPROVAL_LEVELS.L5);
    });

    it('should return L5 for write_file_in_domain', () => {
      expect(getApprovalLevel('write_file_in_domain')).toBe(APPROVAL_LEVELS.L5);
    });

    it('should return L5 for run_npm_install', () => {
      expect(getApprovalLevel('run_npm_install')).toBe(APPROVAL_LEVELS.L5);
    });

    it('should return L5 for run_npm_build', () => {
      expect(getApprovalLevel('run_npm_build')).toBe(APPROVAL_LEVELS.L5);
    });

    it('should return L5 for run_npm_test', () => {
      expect(getApprovalLevel('run_npm_test')).toBe(APPROVAL_LEVELS.L5);
    });

    it('should return L5 for git_commit_feature_branch', () => {
      expect(getApprovalLevel('git_commit_feature_branch')).toBe(APPROVAL_LEVELS.L5);
    });

    it('should return L5 for create_signal_file', () => {
      expect(getApprovalLevel('create_signal_file')).toBe(APPROVAL_LEVELS.L5);
    });

    // Unknown operations default to L1 (safe default)
    it('should return L1 for unknown operations (safe default)', () => {
      expect(getApprovalLevel('unknown_dangerous_operation')).toBe(APPROVAL_LEVELS.L1);
    });
  });

  // ============================================
  // UNIT TESTS - checkApprovalExists
  // ============================================

  describe('checkApprovalExists', () => {
    it('should return true when L1 approval signal exists', () => {
      createApprovalSignal('signal-wave1-L1-APPROVED.json', {
        type: 'L1-APPROVED',
        operation: 'merge_to_main',
        approver: 'human',
        timestamp: new Date().toISOString()
      });

      const result = checkApprovalExists(signalDir, 1, APPROVAL_LEVELS.L1, 'merge_to_main');
      expect(result.exists).toBe(true);
    });

    it('should return false when L1 approval signal does not exist', () => {
      const result = checkApprovalExists(signalDir, 1, APPROVAL_LEVELS.L1, 'merge_to_main');
      expect(result.exists).toBe(false);
    });

    it('should return true when L2 CTO approval signal exists', () => {
      createApprovalSignal('signal-wave1-L2-CTO-APPROVED.json', {
        type: 'L2-CTO-APPROVED',
        operation: 'create_module',
        approver: 'cto-agent',
        timestamp: new Date().toISOString()
      });

      const result = checkApprovalExists(signalDir, 1, APPROVAL_LEVELS.L2, 'create_module');
      expect(result.exists).toBe(true);
    });

    it('should return true when L3 PM approval signal exists', () => {
      createApprovalSignal('signal-wave1-L3-PM-APPROVED.json', {
        type: 'L3-PM-APPROVED',
        operation: 'assign_story',
        approver: 'pm-agent',
        timestamp: new Date().toISOString()
      });

      const result = checkApprovalExists(signalDir, 1, APPROVAL_LEVELS.L3, 'assign_story');
      expect(result.exists).toBe(true);
    });

    it('should return true when L4 gate4 approval signal exists', () => {
      createApprovalSignal('signal-wave1-gate4-approved.json', {
        decision: 'APPROVED',
        agent: 'qa',
        timestamp: new Date().toISOString()
      });

      const result = checkApprovalExists(signalDir, 1, APPROVAL_LEVELS.L4, 'approve_code_review');
      expect(result.exists).toBe(true);
    });

    it('should always return true for L5 auto-allowed operations', () => {
      const result = checkApprovalExists(signalDir, 1, APPROVAL_LEVELS.L5, 'read_file');
      expect(result.exists).toBe(true);
    });
  });

  // ============================================
  // UNIT TESTS - requireApproval
  // ============================================

  describe('requireApproval', () => {
    it('should return approved for L5 operations without signal', () => {
      const result = requireApproval(signalDir, 1, 'read_file');

      expect(result.approved).toBe(true);
      expect(result.level).toBe(APPROVAL_LEVELS.L5);
    });

    it('should block L1 operation without approval signal', () => {
      const result = requireApproval(signalDir, 1, 'merge_to_main');

      expect(result.approved).toBe(false);
      expect(result.level).toBe(APPROVAL_LEVELS.L1);
      expect(result.error).toBe(APPROVAL_ENFORCER_ERRORS.APPROVAL_REQUIRED);
    });

    it('should allow L1 operation with valid approval signal', () => {
      createApprovalSignal('signal-wave1-L1-APPROVED.json', {
        type: 'L1-APPROVED',
        operation: 'merge_to_main',
        approver: 'human',
        timestamp: new Date().toISOString()
      });

      const result = requireApproval(signalDir, 1, 'merge_to_main');

      expect(result.approved).toBe(true);
      expect(result.level).toBe(APPROVAL_LEVELS.L1);
    });

    it('should block L2 operation without CTO approval signal', () => {
      const result = requireApproval(signalDir, 1, 'create_module');

      expect(result.approved).toBe(false);
      expect(result.level).toBe(APPROVAL_LEVELS.L2);
      expect(result.error).toBe(APPROVAL_ENFORCER_ERRORS.APPROVAL_REQUIRED);
    });

    it('should allow L2 operation with CTO approval signal', () => {
      createApprovalSignal('signal-wave1-L2-CTO-APPROVED.json', {
        type: 'L2-CTO-APPROVED',
        operation: 'create_module',
        approver: 'cto-agent',
        timestamp: new Date().toISOString()
      });

      const result = requireApproval(signalDir, 1, 'create_module');

      expect(result.approved).toBe(true);
      expect(result.level).toBe(APPROVAL_LEVELS.L2);
    });

    it('should reject expired L1 approval', () => {
      // Create approval from 25 hours ago (default timeout is 24h)
      const expiredTime = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
      createApprovalSignal('signal-wave1-L1-APPROVED.json', {
        type: 'L1-APPROVED',
        operation: 'merge_to_main',
        approver: 'human',
        timestamp: expiredTime
      });

      const result = requireApproval(signalDir, 1, 'merge_to_main', { timeoutHours: 24 });

      expect(result.approved).toBe(false);
      expect(result.error).toBe(APPROVAL_ENFORCER_ERRORS.APPROVAL_EXPIRED);
    });

    it('should accept non-expired L1 approval', () => {
      // Create approval from 1 hour ago
      const recentTime = new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString();
      createApprovalSignal('signal-wave1-L1-APPROVED.json', {
        type: 'L1-APPROVED',
        operation: 'merge_to_main',
        approver: 'human',
        timestamp: recentTime
      });

      const result = requireApproval(signalDir, 1, 'merge_to_main', { timeoutHours: 24 });

      expect(result.approved).toBe(true);
    });
  });

  // ============================================
  // UNIT TESTS - validateApprovalChain
  // ============================================

  describe('validateApprovalChain', () => {
    it('should detect missing L1 approval in chain', () => {
      const operations = [
        { operation: 'merge_to_main', level: APPROVAL_LEVELS.L1 }
      ];

      const result = validateApprovalChain(signalDir, 1, operations);

      expect(result.valid).toBe(false);
      expect(result.missing).toContain('merge_to_main');
    });

    it('should validate complete approval chain', () => {
      createApprovalSignal('signal-wave1-L1-APPROVED.json', {
        type: 'L1-APPROVED',
        operation: 'merge_to_main',
        approver: 'human',
        timestamp: new Date().toISOString()
      });

      const operations = [
        { operation: 'merge_to_main', level: APPROVAL_LEVELS.L1 }
      ];

      const result = validateApprovalChain(signalDir, 1, operations);

      expect(result.valid).toBe(true);
      expect(result.missing).toHaveLength(0);
    });

    it('should enforce separation of duties', () => {
      createApprovalSignal('signal-wave1-L1-APPROVED.json', {
        type: 'L1-APPROVED',
        operation: 'merge_to_main',
        approver: 'fe-dev-1',
        requester: 'fe-dev-1', // Same as approver - violation!
        timestamp: new Date().toISOString()
      });

      const operations = [
        { operation: 'merge_to_main', level: APPROVAL_LEVELS.L1 }
      ];

      const result = validateApprovalChain(signalDir, 1, operations, { enforceSoD: true });

      expect(result.valid).toBe(false);
      expect(result.error).toBe(APPROVAL_ENFORCER_ERRORS.SEPARATION_OF_DUTIES_VIOLATION);
    });

    it('should pass when requester and approver are different', () => {
      createApprovalSignal('signal-wave1-L1-APPROVED.json', {
        type: 'L1-APPROVED',
        operation: 'merge_to_main',
        approver: 'human',
        requester: 'fe-dev-1', // Different from approver
        timestamp: new Date().toISOString()
      });

      const operations = [
        { operation: 'merge_to_main', level: APPROVAL_LEVELS.L1 }
      ];

      const result = validateApprovalChain(signalDir, 1, operations, { enforceSoD: true });

      expect(result.valid).toBe(true);
    });
  });

  // ============================================
  // UNIT TESTS - createApprovalRequest
  // ============================================

  describe('createApprovalRequest', () => {
    it('should create L1 approval request signal', () => {
      const request = createApprovalRequest({
        wave: 1,
        level: APPROVAL_LEVELS.L1,
        operation: 'merge_to_main',
        requester: 'fe-dev-1',
        description: 'Merge feature branch to main',
        signalDir
      });

      expect(request.created).toBe(true);
      expect(request.signalPath).toContain('L1-APPROVAL-NEEDED');

      // Verify file was created
      expect(fs.existsSync(request.signalPath)).toBe(true);

      // Verify content
      const content = JSON.parse(fs.readFileSync(request.signalPath, 'utf-8'));
      expect(content.signal_type).toBe('L1-APPROVAL-NEEDED');
      expect(content.operation).toBe('merge_to_main');
      expect(content.requester).toBe('fe-dev-1');
    });

    it('should create L2 CTO approval request signal', () => {
      const request = createApprovalRequest({
        wave: 1,
        level: APPROVAL_LEVELS.L2,
        operation: 'create_module',
        requester: 'be-dev-1',
        description: 'Create new auth module',
        signalDir
      });

      expect(request.created).toBe(true);
      expect(request.signalPath).toContain('L2-CTO-APPROVAL-NEEDED');
    });

    it('should create L3 PM approval request signal', () => {
      const request = createApprovalRequest({
        wave: 1,
        level: APPROVAL_LEVELS.L3,
        operation: 'assign_story',
        requester: 'orchestrator',
        description: 'Assign STORY-001 to fe-dev-1',
        signalDir
      });

      expect(request.created).toBe(true);
      expect(request.signalPath).toContain('L3-PM-APPROVAL-NEEDED');
    });

    it('should include risk level in request', () => {
      const request = createApprovalRequest({
        wave: 1,
        level: APPROVAL_LEVELS.L1,
        operation: 'delete_production_data',
        requester: 'admin',
        description: 'Delete orphaned records',
        riskLevel: 'critical',
        signalDir
      });

      const content = JSON.parse(fs.readFileSync(request.signalPath, 'utf-8'));
      expect(content.risk_level).toBe('critical');
    });
  });

  // ============================================
  // INTEGRATION TESTS - Middleware
  // ============================================

  describe('createApprovalEnforcerMiddleware', () => {
    let req, res, next;

    beforeEach(() => {
      req = {
        body: {
          operation: 'read_file',
          wave: 1
        },
        signalDir: signalDir
      };
      res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis()
      };
      next = vi.fn();
    });

    it('should call next() for L5 auto-allowed operations', () => {
      const middleware = createApprovalEnforcerMiddleware({ signalDir });

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should return 403 for L1 operation without approval', () => {
      req.body.operation = 'merge_to_main';

      const middleware = createApprovalEnforcerMiddleware({ signalDir });

      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: APPROVAL_ENFORCER_ERRORS.APPROVAL_REQUIRED
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should call next() for L1 operation with approval', () => {
      req.body.operation = 'merge_to_main';

      createApprovalSignal('signal-wave1-L1-APPROVED.json', {
        type: 'L1-APPROVED',
        operation: 'merge_to_main',
        approver: 'human',
        timestamp: new Date().toISOString()
      });

      const middleware = createApprovalEnforcerMiddleware({ signalDir });

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should add approval result to request', () => {
      req.body.operation = 'read_file';

      const middleware = createApprovalEnforcerMiddleware({
        signalDir,
        addResultToRequest: true
      });

      middleware(req, res, next);

      expect(req.approvalResult).toBeDefined();
      expect(req.approvalResult.approved).toBe(true);
    });

    it('should call audit callback on approval check', () => {
      const auditCallback = vi.fn();
      req.body.operation = 'read_file';

      const middleware = createApprovalEnforcerMiddleware({
        signalDir,
        onApprovalCheck: auditCallback
      });

      middleware(req, res, next);

      expect(auditCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: 'read_file',
          level: APPROVAL_LEVELS.L5,
          approved: true
        })
      );
    });
  });

  // ============================================
  // SECURITY TESTS
  // ============================================

  describe('Security - Approval Integrity', () => {
    it('should reject approval signal without timestamp', () => {
      createApprovalSignal('signal-wave1-L1-APPROVED.json', {
        type: 'L1-APPROVED',
        operation: 'merge_to_main',
        approver: 'human'
        // No timestamp!
      });

      const result = requireApproval(signalDir, 1, 'merge_to_main');

      expect(result.approved).toBe(false);
    });

    it('should reject approval signal without approver', () => {
      createApprovalSignal('signal-wave1-L1-APPROVED.json', {
        type: 'L1-APPROVED',
        operation: 'merge_to_main',
        timestamp: new Date().toISOString()
        // No approver!
      });

      const result = requireApproval(signalDir, 1, 'merge_to_main');

      expect(result.approved).toBe(false);
    });

    it('should reject approval for different operation', () => {
      createApprovalSignal('signal-wave1-L1-APPROVED.json', {
        type: 'L1-APPROVED',
        operation: 'database_migration', // Different operation
        approver: 'human',
        timestamp: new Date().toISOString()
      });

      const result = requireApproval(signalDir, 1, 'merge_to_main', { strictOperationMatch: true });

      // With strict matching, should reject
      expect(result.approved).toBe(false);
    });
  });

  // ============================================
  // L0 FORBIDDEN OPERATIONS
  // ============================================

  describe('L0 Forbidden Operations', () => {
    it('should always reject L0 operations', () => {
      // Even if someone creates an "approval" signal, L0 should never be allowed
      const result = requireApproval(signalDir, 1, 'DROP_DATABASE');

      expect(result.approved).toBe(false);
      expect(result.error).toBe(APPROVAL_ENFORCER_ERRORS.FORBIDDEN_OPERATION);
    });

    it('should return L0 level for forbidden patterns', () => {
      expect(getApprovalLevel('rm_rf_root')).toBe(APPROVAL_LEVELS.L0);
      expect(getApprovalLevel('DROP_DATABASE')).toBe(APPROVAL_LEVELS.L0);
      expect(getApprovalLevel('git_push_force_main')).toBe(APPROVAL_LEVELS.L0);
    });
  });
});
