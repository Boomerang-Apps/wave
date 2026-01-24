/**
 * Wave Batching Algorithm Module (Launch Sequence)
 *
 * Phase 4, Step 4.4: Wave Batching Algorithm
 *
 * Batches stories into execution waves based on dependencies.
 */

import { getExecutionLevels, validateDependencies } from './dependency-graph.js';
import { classifyStoryDomain, getDomainStats } from './story-domain.js';
import { assignAllStories, getAgentWorkload, balanceWorkload } from './agent-assignment.js';

// ============================================
// Wave Batching
// ============================================

/**
 * @typedef {Object} Wave
 * @property {number} waveNumber - Wave number (starting from 1)
 * @property {Object[]} stories - Stories in this wave
 */

/**
 * Batch stories into waves based on dependencies
 * @param {Object[]} stories - Array of story objects
 * @returns {Wave[]} Array of waves
 */
export function batchStoriesIntoWaves(stories) {
  if (stories.length === 0) return [];

  // Classify domains if not already set
  const classifiedStories = stories.map(story => ({
    ...story,
    domain: story.domain || classifyStoryDomain(story)
  }));

  // Get execution levels (stories that can run in parallel)
  const levels = getExecutionLevels(classifiedStories);

  if (levels.length === 0) return [];

  // Assign stories to agents
  const assignments = assignAllStories(classifiedStories);
  const assignmentMap = {};
  for (const assignment of assignments) {
    assignmentMap[assignment.storyId || assignment.id] = assignment;
  }

  // Build waves from levels
  const waves = levels.map((levelStoryIds, index) => {
    const waveStories = levelStoryIds.map(storyId => {
      const assignment = assignmentMap[storyId];
      const original = classifiedStories.find(s => s.id === storyId);
      return {
        ...original,
        ...assignment
      };
    });

    return {
      waveNumber: index + 1,
      stories: waveStories
    };
  });

  return waves;
}

// ============================================
// Wave Plan Creation
// ============================================

/**
 * @typedef {Object} WavePlan
 * @property {string} projectId - Project ID
 * @property {Wave[]} waves - Array of waves
 * @property {number} totalStories - Total story count
 * @property {number} totalWaves - Total wave count
 * @property {Object} domainBreakdown - Stories per domain
 * @property {Object} agentWorkload - Stories per agent
 * @property {boolean} valid - Whether plan is valid
 * @property {string[]} errors - Validation errors
 * @property {string} createdAt - Creation timestamp
 */

/**
 * Create a complete wave plan
 * @param {Object[]} stories - Array of story objects
 * @param {string} projectId - Project ID
 * @returns {WavePlan}
 */
export function createWavePlan(stories, projectId) {
  // Validate dependencies first
  const validation = validateDependencies(stories);

  if (!validation.valid) {
    return {
      projectId,
      waves: [],
      totalStories: stories.length,
      totalWaves: 0,
      domainBreakdown: {},
      agentWorkload: {},
      valid: false,
      errors: validation.errors,
      createdAt: new Date().toISOString()
    };
  }

  // Classify stories
  const classifiedStories = stories.map(story => ({
    ...story,
    domain: story.domain || classifyStoryDomain(story)
  }));

  // Batch into waves
  const waves = batchStoriesIntoWaves(classifiedStories);

  // Get domain stats
  const domainStats = getDomainStats(classifiedStories);
  const domainBreakdown = {
    frontend: domainStats.frontend,
    backend: domainStats.backend,
    fullstack: domainStats.fullstack,
    qa: domainStats.qa,
    devops: domainStats.devops,
    design: domainStats.design
  };

  // Get all assignments for workload calculation
  const allAssignments = waves.flatMap(w => w.stories);
  const agentWorkload = getAgentWorkload(allAssignments);

  return {
    projectId,
    waves,
    totalStories: stories.length,
    totalWaves: waves.length,
    domainBreakdown,
    agentWorkload,
    valid: true,
    errors: [],
    createdAt: new Date().toISOString()
  };
}

// ============================================
// Wave Statistics
// ============================================

/**
 * @typedef {Object} WaveStats
 * @property {number[]} storiesPerWave - Story count for each wave
 * @property {number} averagePerWave - Average stories per wave
 * @property {number} largestWave - Wave number with most stories
 * @property {number} largestWaveSize - Size of largest wave
 * @property {number} parallelismFactor - Maximum parallel execution
 * @property {number} totalWaves - Total wave count
 */

/**
 * Get statistics about waves
 * @param {Wave[]} waves - Array of waves
 * @returns {WaveStats}
 */
export function getWaveStats(waves) {
  if (waves.length === 0) {
    return {
      storiesPerWave: [],
      averagePerWave: 0,
      largestWave: 0,
      largestWaveSize: 0,
      parallelismFactor: 0,
      totalWaves: 0
    };
  }

  const storiesPerWave = waves.map(w => w.stories.length);
  const totalStories = storiesPerWave.reduce((sum, count) => sum + count, 0);
  const averagePerWave = Math.round(totalStories / waves.length);

  let largestWave = 1;
  let largestWaveSize = 0;

  for (const wave of waves) {
    if (wave.stories.length > largestWaveSize) {
      largestWaveSize = wave.stories.length;
      largestWave = wave.waveNumber;
    }
  }

  const parallelismFactor = Math.max(...storiesPerWave);

  return {
    storiesPerWave,
    averagePerWave,
    largestWave,
    largestWaveSize,
    parallelismFactor,
    totalWaves: waves.length
  };
}

// ============================================
// Wave Plan Validation
// ============================================

/**
 * @typedef {Object} WavePlanValidationResult
 * @property {boolean} valid - Whether plan is valid
 * @property {string[]} errors - Validation errors
 */

/**
 * Validate a wave plan
 * @param {WavePlan} plan - Wave plan to validate
 * @returns {WavePlanValidationResult}
 */
export function validateWavePlan(plan) {
  const errors = [];

  // Check projectId
  if (!plan.projectId) {
    errors.push('Missing projectId');
  }

  // Check waves exist
  if (!plan.waves || plan.waves.length === 0) {
    errors.push('No waves in plan');
  } else {
    // Check each wave has stories
    for (const wave of plan.waves) {
      if (!wave.stories || wave.stories.length === 0) {
        errors.push(`Wave ${wave.waveNumber} has no stories`);
      }
    }

    // Check for duplicate stories
    const storyIds = new Set();
    for (const wave of plan.waves) {
      for (const story of wave.stories || []) {
        if (storyIds.has(story.id)) {
          errors.push(`Story ${story.id} appears in multiple waves (duplicate)`);
        }
        storyIds.add(story.id);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

// ============================================
// Wave Plan Optimization
// ============================================

/**
 * Optimize a wave plan for better load balancing
 * @param {Wave[]} waves - Array of waves
 * @returns {Wave[]} Optimized waves
 */
export function optimizeWavePlan(waves) {
  if (waves.length === 0) return [];

  return waves.map(wave => {
    // Balance workload within each wave
    const balancedStories = balanceWorkload(wave.stories);

    return {
      ...wave,
      stories: balancedStories
    };
  });
}

export default createWavePlan;
