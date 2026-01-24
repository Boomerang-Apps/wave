/**
 * TDD Tests for Gate Status Types (Grok Recommendation G1.1)
 *
 * Stage-Gate Compliant Status Model
 * Based on Dr. Robert Cooper's Stage-Gate methodology
 */

import { describe, it, expect } from 'vitest';

import {
  GATE_STATUSES,
  GATE_DECISIONS,
  isValidStatus,
  isValidDecision,
  canTransitionTo,
  getStatusLabel,
  getStatusColor,
  isTerminalStatus,
  isActionableStatus
} from '../utils/gate-status-types.js';

describe('Gate Status Types (G1.1)', () => {

  // ============================================
  // GATE_STATUSES Tests
  // ============================================

  describe('GATE_STATUSES', () => {
    it('should include idle status', () => {
      expect(GATE_STATUSES.IDLE).toBe('idle');
    });

    it('should include ready status (GO decision)', () => {
      expect(GATE_STATUSES.READY).toBe('ready');
    });

    it('should include hold status (HOLD decision)', () => {
      expect(GATE_STATUSES.HOLD).toBe('hold');
    });

    it('should include blocked status (FAIL)', () => {
      expect(GATE_STATUSES.BLOCKED).toBe('blocked');
    });

    it('should include killed status (KILL decision)', () => {
      expect(GATE_STATUSES.KILLED).toBe('killed');
    });

    it('should include recycle status (RECYCLE decision)', () => {
      expect(GATE_STATUSES.RECYCLE).toBe('recycle');
    });

    it('should include pending_human_review status', () => {
      expect(GATE_STATUSES.PENDING_HUMAN_REVIEW).toBe('pending_human_review');
    });

    it('should include validating status', () => {
      expect(GATE_STATUSES.VALIDATING).toBe('validating');
    });

    it('should have exactly 8 statuses', () => {
      expect(Object.keys(GATE_STATUSES)).toHaveLength(8);
    });
  });

  // ============================================
  // GATE_DECISIONS Tests
  // ============================================

  describe('GATE_DECISIONS', () => {
    it('should include GO decision', () => {
      expect(GATE_DECISIONS.GO).toBe('go');
    });

    it('should include KILL decision', () => {
      expect(GATE_DECISIONS.KILL).toBe('kill');
    });

    it('should include HOLD decision', () => {
      expect(GATE_DECISIONS.HOLD).toBe('hold');
    });

    it('should include RECYCLE decision', () => {
      expect(GATE_DECISIONS.RECYCLE).toBe('recycle');
    });

    it('should have exactly 4 decisions', () => {
      expect(Object.keys(GATE_DECISIONS)).toHaveLength(4);
    });
  });

  // ============================================
  // isValidStatus Tests
  // ============================================

  describe('isValidStatus', () => {
    it('should return true for idle', () => {
      expect(isValidStatus('idle')).toBe(true);
    });

    it('should return true for ready', () => {
      expect(isValidStatus('ready')).toBe(true);
    });

    it('should return true for hold', () => {
      expect(isValidStatus('hold')).toBe(true);
    });

    it('should return true for killed', () => {
      expect(isValidStatus('killed')).toBe(true);
    });

    it('should return false for invalid status', () => {
      expect(isValidStatus('invalid')).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(isValidStatus('')).toBe(false);
    });

    it('should return false for null', () => {
      expect(isValidStatus(null)).toBe(false);
    });
  });

  // ============================================
  // isValidDecision Tests
  // ============================================

  describe('isValidDecision', () => {
    it('should return true for go', () => {
      expect(isValidDecision('go')).toBe(true);
    });

    it('should return true for kill', () => {
      expect(isValidDecision('kill')).toBe(true);
    });

    it('should return true for hold', () => {
      expect(isValidDecision('hold')).toBe(true);
    });

    it('should return true for recycle', () => {
      expect(isValidDecision('recycle')).toBe(true);
    });

    it('should return false for invalid decision', () => {
      expect(isValidDecision('invalid')).toBe(false);
    });
  });

  // ============================================
  // canTransitionTo Tests
  // ============================================

  describe('canTransitionTo', () => {
    it('should allow idle to validating', () => {
      expect(canTransitionTo('idle', 'validating')).toBe(true);
    });

    it('should allow validating to ready', () => {
      expect(canTransitionTo('validating', 'ready')).toBe(true);
    });

    it('should allow validating to blocked', () => {
      expect(canTransitionTo('validating', 'blocked')).toBe(true);
    });

    it('should allow validating to hold', () => {
      expect(canTransitionTo('validating', 'hold')).toBe(true);
    });

    it('should allow validating to killed', () => {
      expect(canTransitionTo('validating', 'killed')).toBe(true);
    });

    it('should allow blocked to validating (retry)', () => {
      expect(canTransitionTo('blocked', 'validating')).toBe(true);
    });

    it('should allow hold to validating (resume)', () => {
      expect(canTransitionTo('hold', 'validating')).toBe(true);
    });

    it('should NOT allow killed to any status', () => {
      expect(canTransitionTo('killed', 'idle')).toBe(false);
      expect(canTransitionTo('killed', 'validating')).toBe(false);
    });

    it('should allow ready to idle (rollback)', () => {
      expect(canTransitionTo('ready', 'idle')).toBe(true);
    });

    it('should allow pending_human_review to ready', () => {
      expect(canTransitionTo('pending_human_review', 'ready')).toBe(true);
    });

    it('should allow pending_human_review to blocked', () => {
      expect(canTransitionTo('pending_human_review', 'blocked')).toBe(true);
    });
  });

  // ============================================
  // getStatusLabel Tests
  // ============================================

  describe('getStatusLabel', () => {
    it('should return "Idle" for idle', () => {
      expect(getStatusLabel('idle')).toBe('Idle');
    });

    it('should return "Ready" for ready', () => {
      expect(getStatusLabel('ready')).toBe('Ready');
    });

    it('should return "On Hold" for hold', () => {
      expect(getStatusLabel('hold')).toBe('On Hold');
    });

    it('should return "Blocked" for blocked', () => {
      expect(getStatusLabel('blocked')).toBe('Blocked');
    });

    it('should return "Killed" for killed', () => {
      expect(getStatusLabel('killed')).toBe('Killed');
    });

    it('should return "Recycle" for recycle', () => {
      expect(getStatusLabel('recycle')).toBe('Recycle');
    });

    it('should return "Pending Review" for pending_human_review', () => {
      expect(getStatusLabel('pending_human_review')).toBe('Pending Review');
    });

    it('should return "Validating" for validating', () => {
      expect(getStatusLabel('validating')).toBe('Validating');
    });

    it('should return "Unknown" for invalid status', () => {
      expect(getStatusLabel('invalid')).toBe('Unknown');
    });
  });

  // ============================================
  // getStatusColor Tests
  // ============================================

  describe('getStatusColor', () => {
    it('should return gray for idle', () => {
      expect(getStatusColor('idle')).toBe('gray');
    });

    it('should return green for ready', () => {
      expect(getStatusColor('ready')).toBe('green');
    });

    it('should return yellow for hold', () => {
      expect(getStatusColor('hold')).toBe('yellow');
    });

    it('should return red for blocked', () => {
      expect(getStatusColor('blocked')).toBe('red');
    });

    it('should return red for killed', () => {
      expect(getStatusColor('killed')).toBe('red');
    });

    it('should return orange for recycle', () => {
      expect(getStatusColor('recycle')).toBe('orange');
    });

    it('should return blue for pending_human_review', () => {
      expect(getStatusColor('pending_human_review')).toBe('blue');
    });

    it('should return blue for validating', () => {
      expect(getStatusColor('validating')).toBe('blue');
    });
  });

  // ============================================
  // isTerminalStatus Tests
  // ============================================

  describe('isTerminalStatus', () => {
    it('should return true for killed', () => {
      expect(isTerminalStatus('killed')).toBe(true);
    });

    it('should return false for idle', () => {
      expect(isTerminalStatus('idle')).toBe(false);
    });

    it('should return false for ready', () => {
      expect(isTerminalStatus('ready')).toBe(false);
    });

    it('should return false for blocked', () => {
      expect(isTerminalStatus('blocked')).toBe(false);
    });

    it('should return false for hold', () => {
      expect(isTerminalStatus('hold')).toBe(false);
    });
  });

  // ============================================
  // isActionableStatus Tests
  // ============================================

  describe('isActionableStatus', () => {
    it('should return true for idle (can validate)', () => {
      expect(isActionableStatus('idle')).toBe(true);
    });

    it('should return true for blocked (can retry)', () => {
      expect(isActionableStatus('blocked')).toBe(true);
    });

    it('should return true for hold (can resume)', () => {
      expect(isActionableStatus('hold')).toBe(true);
    });

    it('should return true for pending_human_review (awaiting action)', () => {
      expect(isActionableStatus('pending_human_review')).toBe(true);
    });

    it('should return false for ready (completed)', () => {
      expect(isActionableStatus('ready')).toBe(false);
    });

    it('should return false for killed (terminal)', () => {
      expect(isActionableStatus('killed')).toBe(false);
    });

    it('should return false for validating (in progress)', () => {
      expect(isActionableStatus('validating')).toBe(false);
    });
  });
});
