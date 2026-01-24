/**
 * Business Case Validation (Grok Recommendation G4.1)
 *
 * Validates business justification exists (PRINCE2 PID)
 *
 * Reference: https://www.prince2.com/uk/prince2-documents
 */

// ============================================
// Business Case Schema
// ============================================

/**
 * Business case validation schema
 */
export const BUSINESS_CASE_SCHEMA = {
  required: [
    'executive_summary',
    'reasons',
    'business_options',
    'expected_benefits',
    'expected_costs',
    'risks'
  ],
  optional: [
    'timescale',
    'investment_appraisal',
    'major_risks'
  ]
};

/**
 * Patterns for detecting business case documents
 */
const BUSINESS_CASE_PATTERNS = [
  /business[-_]?case/i,
  /justification/i,
  /roi[-_]?analysis/i
];

/**
 * Locations to search for business case documents
 */
const SEARCH_LOCATIONS = [
  'docs',
  'documentation',
  '.claude',
  '.claudecode',
  '.'
];

// ============================================
// Validation Functions
// ============================================

/**
 * Validate a business case document
 * @param {Object} businessCase - Business case object
 * @returns {{ valid: boolean, errors: string[], warnings: string[] }}
 */
export function validateBusinessCase(businessCase) {
  const errors = [];
  const warnings = [];

  // Check required fields
  for (const field of BUSINESS_CASE_SCHEMA.required) {
    if (!businessCase[field]) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  // Check optional fields
  for (const field of BUSINESS_CASE_SCHEMA.optional) {
    if (!businessCase[field]) {
      warnings.push(`Recommended field missing: ${field}`);
    }
  }

  // Validate benefits vs costs (ROI check)
  if (businessCase.expected_benefits && businessCase.expected_costs) {
    const roi = businessCase.expected_benefits / businessCase.expected_costs;
    if (roi < 1) {
      warnings.push(`ROI < 1 (${roi.toFixed(2)}) - costs exceed benefits`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Detect business case document in project
 * @param {string} projectRoot - Project root path
 * @returns {{ found: boolean, path: string|null }}
 */
export function detectBusinessCase(projectRoot) {
  // Note: In a real implementation, this would search the filesystem
  // For now, return not found
  return {
    found: false,
    path: null
  };
}

/**
 * Create a business case summary
 * @param {string} projectName - Project name
 * @param {Object} businessCase - Business case data
 * @returns {Object} Summary
 */
export function createBusinessCaseSummary(projectName, businessCase) {
  const validation = validateBusinessCase(businessCase);

  let roi = 0;
  if (businessCase.expected_benefits && businessCase.expected_costs) {
    roi = businessCase.expected_benefits / businessCase.expected_costs;
  }

  return {
    projectName,
    roi,
    riskCount: businessCase.risks?.length || 0,
    isValid: validation.valid,
    createdAt: new Date().toISOString()
  };
}

export default validateBusinessCase;
