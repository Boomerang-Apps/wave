/**
 * Consensus Mechanism (Grok Recommendation G5.2)
 *
 * For decisions requiring multiple agent agreement (LangGraph Multi-Actor)
 *
 * Reference: https://langchain-ai.github.io/langgraph/
 */

// ============================================
// Consensus Type Constants
// ============================================

/**
 * Consensus types
 */
export const CONSENSUS_TYPES = {
  UNANIMOUS: 'unanimous',     // All must agree
  MAJORITY: 'majority',       // >50% must agree
  WEIGHTED: 'weighted',       // Based on agent expertise
  MANAGER_FINAL: 'manager'    // Manager decides if tie
};

/**
 * Pre-configured consensus decisions
 */
export const CONSENSUS_DECISIONS = {
  // QA approval requires consensus
  qa_approval: {
    type: CONSENSUS_TYPES.WEIGHTED,
    voters: ['qa', 'manager'],
    weights: { qa: 2, manager: 1 },
    threshold: 0.6
  },

  // Merge approval
  merge_approval: {
    type: CONSENSUS_TYPES.UNANIMOUS,
    voters: ['qa', 'manager'],
    requiresHuman: true
  },

  // Architecture decisions
  architecture_decision: {
    type: CONSENSUS_TYPES.MANAGER_FINAL,
    voters: ['fe-dev-1', 'be-dev-1', 'manager'],
    managerOverride: true
  }
};

// ============================================
// Consensus Functions
// ============================================

/**
 * Request a consensus decision
 * @param {string} decisionType - Type of decision
 * @param {Object} proposal - Proposal to vote on
 * @param {Object} context - Current context
 * @returns {Object} Consensus request
 */
export function requestConsensus(decisionType, proposal, context) {
  const config = CONSENSUS_DECISIONS[decisionType];
  if (!config) {
    throw new Error(`Unknown consensus type: ${decisionType}`);
  }

  return {
    id: `consensus-${Date.now()}`,
    type: decisionType,
    proposal,
    config,
    votes: {},
    status: 'pending',
    createdAt: new Date().toISOString()
  };
}

/**
 * Submit a vote for a consensus decision
 * @param {string} consensusId - Consensus ID
 * @param {string} agentId - Agent ID
 * @param {string} vote - Vote (approve/reject/abstain)
 * @param {string} rationale - Reason for vote
 * @returns {Object} Vote record
 */
export function submitVote(consensusId, agentId, vote, rationale) {
  return {
    consensusId,
    agentId,
    vote, // 'approve' | 'reject' | 'abstain'
    rationale,
    votedAt: new Date().toISOString()
  };
}

/**
 * Evaluate consensus based on votes
 * @param {Object} consensus - Consensus with votes
 * @returns {{ decided: boolean, result?: string, reason: string }}
 */
export function evaluateConsensus(consensus) {
  const { config, votes } = consensus;
  const voterCount = config.voters.length;
  const voteCount = Object.keys(votes).length;

  // Check if all voters have voted
  if (voteCount < voterCount) {
    return { decided: false, reason: 'Awaiting votes' };
  }

  switch (config.type) {
    case CONSENSUS_TYPES.UNANIMOUS:
      return evaluateUnanimous(votes);

    case CONSENSUS_TYPES.MAJORITY:
      return evaluateMajority(votes, voterCount);

    case CONSENSUS_TYPES.WEIGHTED:
      return evaluateWeighted(votes, config);

    case CONSENSUS_TYPES.MANAGER_FINAL:
      return evaluateManagerFinal(votes);

    default:
      return { decided: false, reason: `Unknown consensus type: ${config.type}` };
  }
}

/**
 * Evaluate unanimous consensus
 * @param {Object} votes - Vote map
 * @returns {Object} Result
 */
function evaluateUnanimous(votes) {
  const allApprove = Object.values(votes).every(v => v.vote === 'approve');
  return {
    decided: true,
    result: allApprove ? 'approved' : 'rejected',
    reason: allApprove ? 'Unanimous approval' : 'Not unanimous'
  };
}

/**
 * Evaluate majority consensus
 * @param {Object} votes - Vote map
 * @param {number} voterCount - Total voters
 * @returns {Object} Result
 */
function evaluateMajority(votes, voterCount) {
  const approvals = Object.values(votes).filter(v => v.vote === 'approve').length;
  const majority = approvals > voterCount / 2;
  return {
    decided: true,
    result: majority ? 'approved' : 'rejected',
    reason: `${approvals}/${voterCount} approved`
  };
}

/**
 * Evaluate weighted consensus
 * @param {Object} votes - Vote map
 * @param {Object} config - Decision config
 * @returns {Object} Result
 */
function evaluateWeighted(votes, config) {
  let weightedScore = 0;
  let totalWeight = 0;

  for (const [agentId, voteData] of Object.entries(votes)) {
    const weight = config.weights[agentId] || 1;
    totalWeight += weight;
    if (voteData.vote === 'approve') {
      weightedScore += weight;
    }
  }

  const ratio = weightedScore / totalWeight;
  return {
    decided: true,
    result: ratio >= config.threshold ? 'approved' : 'rejected',
    reason: `Weighted score: ${(ratio * 100).toFixed(0)}%`
  };
}

/**
 * Evaluate manager-final consensus
 * @param {Object} votes - Vote map
 * @returns {Object} Result
 */
function evaluateManagerFinal(votes) {
  // Manager vote is the deciding factor
  const managerVote = votes.manager?.vote;
  if (managerVote) {
    return {
      decided: true,
      result: managerVote === 'approve' ? 'approved' : 'rejected',
      reason: 'Manager final decision'
    };
  }

  // Fallback to majority if no manager vote
  const approvals = Object.values(votes).filter(v => v.vote === 'approve').length;
  const voterCount = Object.keys(votes).length;
  const majority = approvals > voterCount / 2;
  return {
    decided: true,
    result: majority ? 'approved' : 'rejected',
    reason: `Majority decision (no manager vote): ${approvals}/${voterCount}`
  };
}

export default requestConsensus;
