/**
 * Gate Dependencies Module (Launch Sequence)
 *
 * Defines the 10-step sequential workflow for launching AI agents.
 * Each step must pass before the next unlocks.
 *
 * Step 0: Mockup Design      - HTML prototypes validated
 * Step 1: PRD & Stories      - Requirements and stories validated
 * Step 2: Wave Plan          - Agent assignments created
 * Step 3: Configuration      - API keys and secrets set
 * Step 4: Infrastructure     - External services connected
 * Step 5: Safety Protocol    - Guardrails and scripts verified
 * Step 6: RLM Protocol       - Learning system tested
 * Step 7: Notifications      - Slack webhook working
 * Step 8: Build QA           - Docker and tests passing
 * Step 9: Launch             - Final pre-flight, then execute
 */

// ============================================
// Gate Dependencies Definition
// ============================================

/**
 * @typedef {Object} GateDefinition
 * @property {number} step - Step number (0-9)
 * @property {string} label - Human-readable label
 * @property {string[]} requiredSteps - Step IDs that must pass before this step
 * @property {string} validationKey - Key used to store validation in database (_prefix)
 */

/** @type {Record<string, GateDefinition>} */
export const GATE_DEPENDENCIES = {
  'mockup-design': {
    step: 0,
    label: 'Mockup Design',
    requiredSteps: [],
    validationKey: '_mockup'
  },
  'project-overview': {
    step: 1,
    label: 'PRD & Stories',
    requiredSteps: ['mockup-design'],
    validationKey: '_stories'
  },
  'execution-plan': {
    step: 2,
    label: 'Wave Plan',
    requiredSteps: ['project-overview'],
    validationKey: '_wavePlan'
  },
  'system-config': {
    step: 3,
    label: 'Configuration',
    requiredSteps: ['execution-plan'],
    validationKey: '_config'
  },
  'infrastructure': {
    step: 4,
    label: 'Infrastructure',
    requiredSteps: ['system-config'],
    validationKey: '_foundation'
  },
  'compliance-safety': {
    step: 5,
    label: 'Safety Protocol',
    requiredSteps: ['infrastructure'],
    validationKey: '_safety'
  },
  'rlm-protocol': {
    step: 6,
    label: 'RLM Protocol',
    requiredSteps: ['compliance-safety'],
    validationKey: '_rlm'
  },
  'notifications': {
    step: 7,
    label: 'Notifications',
    requiredSteps: ['rlm-protocol'],
    validationKey: '_slack'
  },
  'build-qa': {
    step: 8,
    label: 'Build QA',
    requiredSteps: ['notifications'],
    validationKey: '_buildQa'
  },
  'agent-dispatch': {
    step: 9,
    label: 'Launch',
    requiredSteps: ['build-qa'],
    validationKey: '_dispatch'
  }
};

// ============================================
// Step IDs Array (Ordered)
// ============================================

/**
 * Array of step IDs in order from 0 to 9
 * @type {string[]}
 */
export const GATE_STEP_IDS = Object.entries(GATE_DEPENDENCIES)
  .sort((a, b) => a[1].step - b[1].step)
  .map(([id]) => id);

// ============================================
// Helper Functions
// ============================================

/**
 * Get gate definition by step number
 * @param {number} stepNumber - Step number (0-9)
 * @returns {{ id: string, ...GateDefinition } | null}
 */
export function getGateByStepNumber(stepNumber) {
  if (stepNumber < 0 || stepNumber > 9) {
    return null;
  }

  for (const [id, gate] of Object.entries(GATE_DEPENDENCIES)) {
    if (gate.step === stepNumber) {
      return { id, ...gate };
    }
  }

  return null;
}

/**
 * Get gate definition by validation key
 * @param {string} validationKey - Validation key (e.g., '_mockup')
 * @returns {{ id: string, ...GateDefinition } | null}
 */
export function getGateByValidationKey(validationKey) {
  for (const [id, gate] of Object.entries(GATE_DEPENDENCIES)) {
    if (gate.validationKey === validationKey) {
      return { id, ...gate };
    }
  }

  return null;
}

/**
 * Validate the gate dependencies structure
 * Checks for circular dependencies, missing references, etc.
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateGateDependencies() {
  const errors = [];
  const allStepIds = Object.keys(GATE_DEPENDENCIES);

  for (const [stepId, gate] of Object.entries(GATE_DEPENDENCIES)) {
    // Check required fields
    if (typeof gate.step !== 'number') {
      errors.push(`${stepId}: missing or invalid step number`);
    }
    if (typeof gate.label !== 'string') {
      errors.push(`${stepId}: missing or invalid label`);
    }
    if (!Array.isArray(gate.requiredSteps)) {
      errors.push(`${stepId}: requiredSteps must be an array`);
    }
    if (typeof gate.validationKey !== 'string') {
      errors.push(`${stepId}: missing or invalid validationKey`);
    }

    // Check that required steps exist
    for (const requiredStep of gate.requiredSteps) {
      if (!allStepIds.includes(requiredStep)) {
        errors.push(`${stepId}: requires non-existent step "${requiredStep}"`);
      }

      // Check for circular dependencies (required step must be earlier)
      const requiredGate = GATE_DEPENDENCIES[requiredStep];
      if (requiredGate && requiredGate.step >= gate.step) {
        errors.push(`${stepId}: circular dependency - requires step ${requiredStep} which is not earlier`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

export default GATE_DEPENDENCIES;
