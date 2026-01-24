/**
 * Gate Status Types (Grok Recommendation G1.1)
 *
 * Stage-Gate Compliant Status Model
 * Based on Dr. Robert Cooper's Stage-Gate methodology
 *
 * Reference: https://www.stage-gate.com/blog/the-stage-gate-model-an-overview
 */

// ============================================
// Status Constants
// ============================================

/**
 * Gate status values (Stage-Gate compliant)
 */
export const GATE_STATUSES = {
  // Initial state - not yet validated
  IDLE: 'idle',

  // GO decision - validation passed, proceed to next gate
  READY: 'ready',

  // HOLD decision - pause for more information/data
  HOLD: 'hold',

  // BLOCKED decision - validation failed, can retry
  BLOCKED: 'blocked',

  // KILL decision - abandon this item (terminal)
  KILLED: 'killed',

  // RECYCLE decision - go back to previous gate for rework
  RECYCLE: 'recycle',

  // Awaiting human review (for critical gates)
  PENDING_HUMAN_REVIEW: 'pending_human_review',

  // Currently validating
  VALIDATING: 'validating'
};

/**
 * Gate decision types (Stage-Gate compliant)
 */
export const GATE_DECISIONS = {
  GO: 'go',           // Proceed to next gate
  KILL: 'kill',       // Abandon - not viable
  HOLD: 'hold',       // Pause - need more data
  RECYCLE: 'recycle'  // Go back - rework needed
};

// ============================================
// Status Validation
// ============================================

/**
 * Check if a status value is valid
 * @param {string} status - Status to check
 * @returns {boolean}
 */
export function isValidStatus(status) {
  if (!status || typeof status !== 'string') {
    return false;
  }
  return Object.values(GATE_STATUSES).includes(status);
}

/**
 * Check if a decision value is valid
 * @param {string} decision - Decision to check
 * @returns {boolean}
 */
export function isValidDecision(decision) {
  if (!decision || typeof decision !== 'string') {
    return false;
  }
  return Object.values(GATE_DECISIONS).includes(decision);
}

// ============================================
// State Transitions
// ============================================

/**
 * Valid state transitions
 * Defines which status can transition to which other status
 */
const STATE_TRANSITIONS = {
  [GATE_STATUSES.IDLE]: [
    GATE_STATUSES.VALIDATING
  ],
  [GATE_STATUSES.VALIDATING]: [
    GATE_STATUSES.READY,
    GATE_STATUSES.BLOCKED,
    GATE_STATUSES.HOLD,
    GATE_STATUSES.KILLED,
    GATE_STATUSES.RECYCLE,
    GATE_STATUSES.PENDING_HUMAN_REVIEW
  ],
  [GATE_STATUSES.READY]: [
    GATE_STATUSES.IDLE // Rollback
  ],
  [GATE_STATUSES.BLOCKED]: [
    GATE_STATUSES.VALIDATING, // Retry
    GATE_STATUSES.KILLED      // Give up
  ],
  [GATE_STATUSES.HOLD]: [
    GATE_STATUSES.VALIDATING, // Resume
    GATE_STATUSES.KILLED      // Give up
  ],
  [GATE_STATUSES.KILLED]: [], // Terminal - no transitions out
  [GATE_STATUSES.RECYCLE]: [
    GATE_STATUSES.IDLE,       // Go back to start
    GATE_STATUSES.VALIDATING  // Try again
  ],
  [GATE_STATUSES.PENDING_HUMAN_REVIEW]: [
    GATE_STATUSES.READY,    // Human approved
    GATE_STATUSES.BLOCKED,  // Human rejected
    GATE_STATUSES.KILLED    // Human killed
  ]
};

/**
 * Check if a status transition is allowed
 * @param {string} fromStatus - Current status
 * @param {string} toStatus - Target status
 * @returns {boolean}
 */
export function canTransitionTo(fromStatus, toStatus) {
  const allowedTransitions = STATE_TRANSITIONS[fromStatus];
  if (!allowedTransitions) {
    return false;
  }
  return allowedTransitions.includes(toStatus);
}

// ============================================
// Status Display
// ============================================

/**
 * Status labels for UI display
 */
const STATUS_LABELS = {
  [GATE_STATUSES.IDLE]: 'Idle',
  [GATE_STATUSES.READY]: 'Ready',
  [GATE_STATUSES.HOLD]: 'On Hold',
  [GATE_STATUSES.BLOCKED]: 'Blocked',
  [GATE_STATUSES.KILLED]: 'Killed',
  [GATE_STATUSES.RECYCLE]: 'Recycle',
  [GATE_STATUSES.PENDING_HUMAN_REVIEW]: 'Pending Review',
  [GATE_STATUSES.VALIDATING]: 'Validating'
};

/**
 * Get human-readable label for a status
 * @param {string} status - Status value
 * @returns {string}
 */
export function getStatusLabel(status) {
  return STATUS_LABELS[status] || 'Unknown';
}

/**
 * Status colors for UI display
 */
const STATUS_COLORS = {
  [GATE_STATUSES.IDLE]: 'gray',
  [GATE_STATUSES.READY]: 'green',
  [GATE_STATUSES.HOLD]: 'yellow',
  [GATE_STATUSES.BLOCKED]: 'red',
  [GATE_STATUSES.KILLED]: 'red',
  [GATE_STATUSES.RECYCLE]: 'orange',
  [GATE_STATUSES.PENDING_HUMAN_REVIEW]: 'blue',
  [GATE_STATUSES.VALIDATING]: 'blue'
};

/**
 * Get color for a status (for UI)
 * @param {string} status - Status value
 * @returns {string}
 */
export function getStatusColor(status) {
  return STATUS_COLORS[status] || 'gray';
}

// ============================================
// Status Classification
// ============================================

/**
 * Terminal statuses - no further action possible
 */
const TERMINAL_STATUSES = [
  GATE_STATUSES.KILLED
];

/**
 * Check if a status is terminal (no recovery)
 * @param {string} status - Status to check
 * @returns {boolean}
 */
export function isTerminalStatus(status) {
  return TERMINAL_STATUSES.includes(status);
}

/**
 * Actionable statuses - user can take action
 */
const ACTIONABLE_STATUSES = [
  GATE_STATUSES.IDLE,
  GATE_STATUSES.BLOCKED,
  GATE_STATUSES.HOLD,
  GATE_STATUSES.PENDING_HUMAN_REVIEW
];

/**
 * Check if a status allows user action
 * @param {string} status - Status to check
 * @returns {boolean}
 */
export function isActionableStatus(status) {
  return ACTIONABLE_STATUSES.includes(status);
}

export default GATE_STATUSES;
