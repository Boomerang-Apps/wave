/**
 * Risk Register (Grok Recommendation G4.2)
 *
 * Tracks and validates project risks (PRINCE2)
 *
 * Reference: https://www.prince2.com/uk/prince2-documents
 */

// ============================================
// Risk Constants
// ============================================

/**
 * Risk categories
 */
export const RISK_CATEGORIES = {
  TECHNICAL: 'technical',
  SCHEDULE: 'schedule',
  BUDGET: 'budget',
  RESOURCE: 'resource',
  SECURITY: 'security',
  COMPLIANCE: 'compliance'
};

/**
 * Risk levels with values and colors
 */
export const RISK_LEVELS = {
  LOW: { value: 1, label: 'Low', color: 'green' },
  MEDIUM: { value: 2, label: 'Medium', color: 'yellow' },
  HIGH: { value: 3, label: 'High', color: 'orange' },
  CRITICAL: { value: 4, label: 'Critical', color: 'red' }
};

/**
 * Risk validation schema
 */
export const RISK_SCHEMA = {
  id: { type: 'string', required: true },
  category: { type: 'enum', values: Object.values(RISK_CATEGORIES), required: true },
  description: { type: 'string', required: true },
  probability: { type: 'number', min: 0, max: 1, required: true },
  impact: { type: 'enum', values: Object.keys(RISK_LEVELS), required: true },
  mitigation: { type: 'string', required: true },
  owner: { type: 'string', required: true },
  status: { type: 'enum', values: ['open', 'mitigated', 'closed', 'accepted'], required: true }
};

// ============================================
// Validation Functions
// ============================================

/**
 * Validate a risk register
 * @param {Array} risks - Array of risk objects
 * @returns {{ valid: boolean, errors: string[], warnings: string[], summary: Object }}
 */
export function validateRiskRegister(risks) {
  const errors = [];
  const warnings = [];

  // Check array exists and has items
  if (!Array.isArray(risks) || risks.length === 0) {
    errors.push('Risk register must contain at least one risk');
    return { valid: false, errors, warnings, summary: null };
  }

  // Validate each risk
  for (const risk of risks) {
    for (const [field, schema] of Object.entries(RISK_SCHEMA)) {
      if (schema.required && !risk[field]) {
        errors.push(`Risk ${risk.id || 'unknown'}: missing ${field}`);
      }
    }
  }

  // Check for high/critical risks without mitigation
  const unmitigatedHighRisks = risks.filter(r =>
    ['HIGH', 'CRITICAL'].includes(r.impact) &&
    r.status === 'open' &&
    !r.mitigation
  );

  if (unmitigatedHighRisks.length > 0) {
    errors.push(`${unmitigatedHighRisks.length} high/critical risks without mitigation`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    summary: {
      total: risks.length,
      byCategory: groupBy(risks, 'category'),
      byStatus: groupBy(risks, 'status'),
      highRiskCount: risks.filter(r => ['HIGH', 'CRITICAL'].includes(r.impact)).length
    }
  };
}

/**
 * Create a new risk
 * @param {Object} riskData - Risk data without ID
 * @returns {Object} Complete risk object
 */
export function createRisk(riskData) {
  return {
    id: `RISK-${Date.now()}`,
    category: riskData.category,
    description: riskData.description,
    probability: riskData.probability,
    impact: riskData.impact,
    mitigation: riskData.mitigation,
    owner: riskData.owner,
    status: riskData.status || 'open',
    createdAt: new Date().toISOString()
  };
}

/**
 * Calculate risk score
 * @param {number} probability - Probability (0-1)
 * @param {string} impact - Impact level (LOW, MEDIUM, HIGH, CRITICAL)
 * @returns {number} Risk score
 */
export function calculateRiskScore(probability, impact) {
  const impactValue = RISK_LEVELS[impact]?.value || 1;
  return probability * impactValue;
}

/**
 * Group array by key
 * @param {Array} arr - Array to group
 * @param {string} key - Key to group by
 * @returns {Object} Grouped counts
 */
function groupBy(arr, key) {
  return arr.reduce((acc, item) => {
    acc[item[key]] = (acc[item[key]] || 0) + 1;
    return acc;
  }, {});
}

export default validateRiskRegister;
