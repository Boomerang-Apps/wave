/**
 * TDD Tests for Consensus Mechanism (Grok Recommendation G5.2)
 *
 * For decisions requiring multiple agent agreement (LangGraph Multi-Actor)
 */

import { describe, it, expect } from 'vitest';

import {
  CONSENSUS_TYPES,
  CONSENSUS_DECISIONS,
  requestConsensus,
  submitVote,
  evaluateConsensus
} from '../utils/consensus-mechanism.js';

describe('Consensus Mechanism (G5.2)', () => {

  // ============================================
  // CONSENSUS_TYPES Constants Tests
  // ============================================

  describe('CONSENSUS_TYPES', () => {
    it('should have UNANIMOUS type', () => {
      expect(CONSENSUS_TYPES.UNANIMOUS).toBe('unanimous');
    });

    it('should have MAJORITY type', () => {
      expect(CONSENSUS_TYPES.MAJORITY).toBe('majority');
    });

    it('should have WEIGHTED type', () => {
      expect(CONSENSUS_TYPES.WEIGHTED).toBe('weighted');
    });

    it('should have MANAGER_FINAL type', () => {
      expect(CONSENSUS_TYPES.MANAGER_FINAL).toBe('manager');
    });
  });

  // ============================================
  // CONSENSUS_DECISIONS Constants Tests
  // ============================================

  describe('CONSENSUS_DECISIONS', () => {
    it('should have qa_approval decision config', () => {
      expect(CONSENSUS_DECISIONS.qa_approval).toBeDefined();
      expect(CONSENSUS_DECISIONS.qa_approval.type).toBe(CONSENSUS_TYPES.WEIGHTED);
    });

    it('should have merge_approval decision config', () => {
      expect(CONSENSUS_DECISIONS.merge_approval).toBeDefined();
      expect(CONSENSUS_DECISIONS.merge_approval.type).toBe(CONSENSUS_TYPES.UNANIMOUS);
    });

    it('should have architecture_decision config', () => {
      expect(CONSENSUS_DECISIONS.architecture_decision).toBeDefined();
      expect(CONSENSUS_DECISIONS.architecture_decision.type).toBe(CONSENSUS_TYPES.MANAGER_FINAL);
    });

    it('should have voters for qa_approval', () => {
      expect(CONSENSUS_DECISIONS.qa_approval.voters).toContain('qa');
      expect(CONSENSUS_DECISIONS.qa_approval.voters).toContain('manager');
    });

    it('should have weights for weighted decisions', () => {
      expect(CONSENSUS_DECISIONS.qa_approval.weights).toBeDefined();
      expect(CONSENSUS_DECISIONS.qa_approval.weights.qa).toBe(2);
    });

    it('should require human for merge_approval', () => {
      expect(CONSENSUS_DECISIONS.merge_approval.requiresHuman).toBe(true);
    });
  });

  // ============================================
  // requestConsensus Tests
  // ============================================

  describe('requestConsensus', () => {
    it('should create consensus request with unique ID', () => {
      const consensus = requestConsensus('qa_approval', { prId: 123 }, {});

      expect(consensus.id).toBeDefined();
      expect(consensus.id).toContain('consensus-');
    });

    it('should include decision type', () => {
      const consensus = requestConsensus('qa_approval', { prId: 123 }, {});

      expect(consensus.type).toBe('qa_approval');
    });

    it('should include proposal', () => {
      const consensus = requestConsensus('qa_approval', { prId: 123 }, {});

      expect(consensus.proposal.prId).toBe(123);
    });

    it('should include config from CONSENSUS_DECISIONS', () => {
      const consensus = requestConsensus('qa_approval', { prId: 123 }, {});

      expect(consensus.config).toEqual(CONSENSUS_DECISIONS.qa_approval);
    });

    it('should initialize empty votes', () => {
      const consensus = requestConsensus('qa_approval', { prId: 123 }, {});

      expect(consensus.votes).toEqual({});
    });

    it('should set status to pending', () => {
      const consensus = requestConsensus('qa_approval', { prId: 123 }, {});

      expect(consensus.status).toBe('pending');
    });

    it('should include createdAt timestamp', () => {
      const consensus = requestConsensus('qa_approval', { prId: 123 }, {});

      expect(consensus.createdAt).toBeDefined();
    });

    it('should throw for unknown decision type', () => {
      expect(() => requestConsensus('unknown_type', {}, {})).toThrow();
    });
  });

  // ============================================
  // submitVote Tests
  // ============================================

  describe('submitVote', () => {
    it('should create vote with consensusId', () => {
      const vote = submitVote('consensus-123', 'qa', 'approve', 'Tests pass');

      expect(vote.consensusId).toBe('consensus-123');
    });

    it('should include agentId', () => {
      const vote = submitVote('consensus-123', 'qa', 'approve', 'Tests pass');

      expect(vote.agentId).toBe('qa');
    });

    it('should include vote decision', () => {
      const vote = submitVote('consensus-123', 'qa', 'approve', 'Tests pass');

      expect(vote.vote).toBe('approve');
    });

    it('should include rationale', () => {
      const vote = submitVote('consensus-123', 'qa', 'approve', 'Tests pass');

      expect(vote.rationale).toBe('Tests pass');
    });

    it('should include votedAt timestamp', () => {
      const vote = submitVote('consensus-123', 'qa', 'approve', 'Tests pass');

      expect(vote.votedAt).toBeDefined();
    });

    it('should support reject vote', () => {
      const vote = submitVote('consensus-123', 'qa', 'reject', 'Tests fail');

      expect(vote.vote).toBe('reject');
    });

    it('should support abstain vote', () => {
      const vote = submitVote('consensus-123', 'qa', 'abstain', 'No opinion');

      expect(vote.vote).toBe('abstain');
    });
  });

  // ============================================
  // evaluateConsensus Tests
  // ============================================

  describe('evaluateConsensus', () => {
    describe('when awaiting votes', () => {
      it('should return decided=false when not all voters have voted', () => {
        const consensus = {
          config: CONSENSUS_DECISIONS.qa_approval,
          votes: { qa: { vote: 'approve' } }
        };

        const result = evaluateConsensus(consensus);

        expect(result.decided).toBe(false);
        expect(result.reason).toContain('Awaiting');
      });
    });

    describe('UNANIMOUS type', () => {
      it('should approve when all votes are approve', () => {
        const consensus = {
          config: CONSENSUS_DECISIONS.merge_approval,
          votes: {
            qa: { vote: 'approve' },
            manager: { vote: 'approve' }
          }
        };

        const result = evaluateConsensus(consensus);

        expect(result.decided).toBe(true);
        expect(result.result).toBe('approved');
      });

      it('should reject when any vote is reject', () => {
        const consensus = {
          config: CONSENSUS_DECISIONS.merge_approval,
          votes: {
            qa: { vote: 'approve' },
            manager: { vote: 'reject' }
          }
        };

        const result = evaluateConsensus(consensus);

        expect(result.decided).toBe(true);
        expect(result.result).toBe('rejected');
      });
    });

    describe('MAJORITY type', () => {
      it('should approve when majority approves', () => {
        const consensus = {
          config: {
            type: CONSENSUS_TYPES.MAJORITY,
            voters: ['agent-1', 'agent-2', 'agent-3']
          },
          votes: {
            'agent-1': { vote: 'approve' },
            'agent-2': { vote: 'approve' },
            'agent-3': { vote: 'reject' }
          }
        };

        const result = evaluateConsensus(consensus);

        expect(result.decided).toBe(true);
        expect(result.result).toBe('approved');
      });

      it('should reject when majority rejects', () => {
        const consensus = {
          config: {
            type: CONSENSUS_TYPES.MAJORITY,
            voters: ['agent-1', 'agent-2', 'agent-3']
          },
          votes: {
            'agent-1': { vote: 'reject' },
            'agent-2': { vote: 'reject' },
            'agent-3': { vote: 'approve' }
          }
        };

        const result = evaluateConsensus(consensus);

        expect(result.decided).toBe(true);
        expect(result.result).toBe('rejected');
      });
    });

    describe('WEIGHTED type', () => {
      it('should approve when weighted score meets threshold', () => {
        const consensus = {
          config: CONSENSUS_DECISIONS.qa_approval,
          votes: {
            qa: { vote: 'approve' },      // weight 2
            manager: { vote: 'reject' }   // weight 1
          }
        };

        // Score: 2/3 = 0.67, threshold 0.6
        const result = evaluateConsensus(consensus);

        expect(result.decided).toBe(true);
        expect(result.result).toBe('approved');
      });

      it('should reject when weighted score below threshold', () => {
        const consensus = {
          config: CONSENSUS_DECISIONS.qa_approval,
          votes: {
            qa: { vote: 'reject' },       // weight 2
            manager: { vote: 'approve' }  // weight 1
          }
        };

        // Score: 1/3 = 0.33, threshold 0.6
        const result = evaluateConsensus(consensus);

        expect(result.decided).toBe(true);
        expect(result.result).toBe('rejected');
      });
    });

    describe('MANAGER_FINAL type', () => {
      it('should use manager vote for final decision on tie', () => {
        const consensus = {
          config: CONSENSUS_DECISIONS.architecture_decision,
          votes: {
            'fe-dev-1': { vote: 'approve' },
            'be-dev-1': { vote: 'reject' },
            manager: { vote: 'approve' }
          }
        };

        const result = evaluateConsensus(consensus);

        expect(result.decided).toBe(true);
        expect(result.result).toBe('approved');
      });
    });
  });
});
