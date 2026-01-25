// ═══════════════════════════════════════════════════════════════════════════════
// ENHANCED READINESS SCORE CALCULATOR (Gate 0 Enhancement)
// ═══════════════════════════════════════════════════════════════════════════════
// Calculates project readiness with structure compliance bonus
// ═══════════════════════════════════════════════════════════════════════════════

import { calculateStructureComplianceScore } from './folder-structure-validator.js';

/**
 * Readiness level definitions
 */
export const READINESS_LEVELS = {
  READY: {
    name: 'Ready',
    min: 90,
    color: 'green',
    description: 'Project is ready for WAVE automation'
  },
  NEEDS_WORK: {
    name: 'Needs Work',
    min: 60,
    color: 'amber',
    description: 'Some improvements needed before proceeding'
  },
  NOT_READY: {
    name: 'Not Ready',
    min: 0,
    color: 'red',
    description: 'Significant gaps need to be addressed'
  }
};

/**
 * Score weights for each component
 */
const SCORE_WEIGHTS = {
  prd: { max: 25, name: 'PRD Document' },
  stories: { max: 25, name: 'User Stories' },
  htmlPrototypes: { max: 15, name: 'HTML Prototypes' },
  claudeMd: { max: 20, name: 'CLAUDE.md' },
  fileStructure: { max: 15, name: 'File Structure' },
  structureCompliance: { max: 10, name: 'Structure Compliance Bonus' }
};

/**
 * Calculate base score from report (without structure bonus)
 * @param {object} report - Analysis report
 * @returns {object} Score breakdown
 */
function calculateBaseScore(report) {
  const breakdown = {
    prd: 0,
    stories: 0,
    htmlPrototypes: 0,
    claudeMd: 0,
    fileStructure: 0
  };

  // PRD (25 points)
  if (report.ai_prd?.status === 'pass') {
    breakdown.prd = 25;
  } else if (report.ai_prd?.status === 'warn') {
    breakdown.prd = 15;
  }

  // Stories (25 points)
  if (report.ai_stories?.status === 'pass') {
    breakdown.stories = 25;
  } else if (report.ai_stories?.status === 'warn') {
    breakdown.stories = 15;
  } else if (report.ai_stories?.stories_found > 0) {
    breakdown.stories = 10;
  }

  // HTML Prototypes (15 points)
  if (report.html_prototype?.status === 'pass') {
    breakdown.htmlPrototypes = 15;
  } else if (report.html_prototype?.total_prototypes > 0) {
    breakdown.htmlPrototypes = 10;
  }

  // CLAUDE.md (20 points)
  if (report.claude_md?.status === 'pass') {
    breakdown.claudeMd = 20;
  } else if (report.claude_md?.has_claude_md) {
    breakdown.claudeMd = 10;
  }

  // File Structure (15 points)
  if (report.file_structure?.status === 'pass') {
    breakdown.fileStructure = 15;
  } else if (report.file_structure?.status === 'warn') {
    breakdown.fileStructure = 10;
  } else if (report.file_structure) {
    breakdown.fileStructure = 5;
  }

  return breakdown;
}

/**
 * Calculate structure compliance bonus (up to 10 points)
 * @param {string[]} existingPaths - Array of existing paths
 * @returns {number} Bonus points 0-10
 */
function calculateStructureBonus(existingPaths) {
  if (!existingPaths || existingPaths.length === 0) {
    return 0;
  }

  const complianceScore = calculateStructureComplianceScore(existingPaths, 'nextjs');

  // Convert 0-100 compliance score to 0-10 bonus
  // Only give bonus if compliance is above 50%
  if (complianceScore < 50) {
    return 0;
  }

  return Math.round((complianceScore - 50) / 5); // 50-100 maps to 0-10
}

/**
 * Calculate enhanced readiness score with structure compliance bonus
 * @param {object} report - Analysis report from project analysis
 * @param {string[]} existingPaths - Array of existing file/folder paths
 * @returns {object} Score result with breakdown
 */
export function calculateEnhancedReadinessScore(report, existingPaths) {
  const baseBreakdown = calculateBaseScore(report || {});
  const base = Object.values(baseBreakdown).reduce((sum, val) => sum + val, 0);

  const structureBonus = calculateStructureBonus(existingPaths);

  // Cap total at 100
  const total = Math.min(100, base + structureBonus);

  return {
    total,
    base,
    structureBonus,
    breakdown: baseBreakdown,
    level: getReadinessLevel(total)
  };
}

/**
 * Get detailed score breakdown for UI display
 * @param {object} report - Analysis report
 * @param {string[]} existingPaths - Array of existing paths
 * @returns {object} Detailed breakdown with descriptions
 */
export function getScoreBreakdown(report, existingPaths) {
  const baseBreakdown = calculateBaseScore(report || {});
  const structureBonus = calculateStructureBonus(existingPaths);

  return {
    prd: {
      score: baseBreakdown.prd,
      maxScore: SCORE_WEIGHTS.prd.max,
      name: SCORE_WEIGHTS.prd.name,
      status: report?.ai_prd?.status || 'unknown'
    },
    stories: {
      score: baseBreakdown.stories,
      maxScore: SCORE_WEIGHTS.stories.max,
      name: SCORE_WEIGHTS.stories.name,
      status: report?.ai_stories?.status || 'unknown',
      count: report?.ai_stories?.stories_found || 0
    },
    htmlPrototypes: {
      score: baseBreakdown.htmlPrototypes,
      maxScore: SCORE_WEIGHTS.htmlPrototypes.max,
      name: SCORE_WEIGHTS.htmlPrototypes.name,
      status: report?.html_prototype?.status || 'unknown',
      count: report?.html_prototype?.total_prototypes || 0
    },
    claudeMd: {
      score: baseBreakdown.claudeMd,
      maxScore: SCORE_WEIGHTS.claudeMd.max,
      name: SCORE_WEIGHTS.claudeMd.name,
      status: report?.claude_md?.status || 'unknown',
      exists: report?.claude_md?.has_claude_md || false
    },
    fileStructure: {
      score: baseBreakdown.fileStructure,
      maxScore: SCORE_WEIGHTS.fileStructure.max,
      name: SCORE_WEIGHTS.fileStructure.name,
      status: report?.file_structure?.status || 'unknown'
    },
    structureCompliance: {
      score: structureBonus,
      maxScore: SCORE_WEIGHTS.structureCompliance.max,
      name: SCORE_WEIGHTS.structureCompliance.name,
      isBonus: true
    }
  };
}

/**
 * Get readiness level based on score
 * @param {number} score - Total score 0-100
 * @returns {object} Readiness level object
 */
export function getReadinessLevel(score) {
  if (score >= READINESS_LEVELS.READY.min) {
    return READINESS_LEVELS.READY;
  } else if (score >= READINESS_LEVELS.NEEDS_WORK.min) {
    return READINESS_LEVELS.NEEDS_WORK;
  }
  return READINESS_LEVELS.NOT_READY;
}

export default {
  READINESS_LEVELS,
  calculateEnhancedReadinessScore,
  getScoreBreakdown,
  getReadinessLevel
};
