/**
 * Alignment Checker Module
 *
 * Validates consistency between PRD, Stories, and Mockups:
 * - PRD ↔ Stories: Feature coverage
 * - Stories ↔ Mockups: UI reference alignment
 * - PRD ↔ Mockups: Feature visibility
 *
 * Based on: docs/alignment-checker/SPECIFICATION.md
 * Date: 2026-01-26
 */

import { discoverProject } from './project-discovery.js';

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Alignment score thresholds
 */
export const ALIGNMENT_THRESHOLDS = {
  excellent: 90,    // Ready for development
  good: 80,         // Minor gaps to address
  acceptable: 70,   // Usable but needs work
  poor: 50,         // Significant gaps
  failing: 0        // Major alignment issues
};

/**
 * UI-related domains that require mockup references
 */
export const UI_DOMAINS = ['ui-components', 'forms', 'navigation'];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Calculate coverage percentage
 * @param {number} covered - Number of covered items
 * @param {number} total - Total items
 * @returns {number} Percentage (0-100)
 */
export function calculateCoveragePercentage(covered, total) {
  if (total === 0) return 0;
  return Math.round((covered / total) * 100);
}

/**
 * Check if a story is UI-related (requires mockups)
 * @param {Object} story - Story to check
 * @returns {boolean} True if UI-related
 */
export function isUIRelatedStory(story) {
  if (!story || !story.domain) return false;
  return UI_DOMAINS.includes(story.domain);
}

/**
 * Validate a mockup reference exists
 * @param {Object|string} ref - Mockup reference
 * @param {Array} mockups - Available mockups
 * @returns {boolean} True if mockup exists
 */
export function validateMockupRef(ref, mockups) {
  if (!ref || !mockups || mockups.length === 0) return false;

  const fileName = typeof ref === 'string' ? ref : ref.file;
  if (!fileName) return false;

  return mockups.some(m => m.name === fileName);
}

/**
 * Find story that corresponds to a PRD feature
 * @param {Object} feature - PRD feature
 * @param {Array} stories - Available stories
 * @returns {Object|null} Matching story or null
 */
export function findStoryForFeature(feature, stories) {
  if (!feature || !stories || stories.length === 0) return null;

  const featureName = (feature.name || '').toLowerCase();
  const featureKeywords = featureName.split(/\s+/).filter(w => w.length > 2);

  // First, try to find a story that matches BOTH domain AND name keywords
  for (const story of stories) {
    if (story.domain === feature.domain) {
      const storyTitle = (story.title || '').toLowerCase();
      const hasKeywordMatch = featureKeywords.some(keyword =>
        storyTitle.includes(keyword)
      );
      if (hasKeywordMatch) {
        return story;
      }
    }
  }

  // Second, try to find a story that matches domain only
  const domainMatch = stories.find(s => s.domain === feature.domain);
  if (domainMatch) {
    return domainMatch;
  }

  // Third, try to find a story that matches by name keywords (even with different domain)
  // This allows detecting domain mismatches
  for (const story of stories) {
    const storyTitle = (story.title || '').toLowerCase();
    const hasKeywordMatch = featureKeywords.some(keyword =>
      storyTitle.includes(keyword)
    );
    if (hasKeywordMatch) {
      return story;
    }
  }

  return null;
}

/**
 * Map PRD priority to story priority for comparison
 * @param {string} prdPriority - PRD feature priority
 * @returns {string} Equivalent story priority
 */
function mapPRDPriorityToStory(prdPriority) {
  const mapping = {
    'must-have': 'high',
    'should-have': 'medium',
    'nice-to-have': 'low'
  };
  return mapping[prdPriority] || prdPriority;
}

/**
 * Generate recommendations from gaps
 * @param {Object} gaps - Identified gaps
 * @returns {Array} Recommendations
 */
export function generateRecommendations(gaps) {
  const recommendations = [];

  // Features without stories
  for (const feature of gaps.featuresWithoutStories || []) {
    recommendations.push({
      type: 'create_story',
      priority: feature.priority === 'must-have' ? 'high' : 'medium',
      message: `Create story for feature '${feature.featureName}' (${feature.featureId})`,
      target: feature.featureId
    });
  }

  // UI stories without mockups
  for (const story of gaps.uiStoriesWithoutMockups || []) {
    recommendations.push({
      type: 'add_mockup_ref',
      priority: 'medium',
      message: `Add mockup reference to UI story '${story.title}' (${story.storyId})`,
      target: story.storyId
    });
  }

  // Domain mismatches
  for (const mismatch of gaps.domainMismatches || []) {
    recommendations.push({
      type: 'fix_domain',
      priority: 'high',
      message: `Fix domain mismatch: Feature ${mismatch.featureId} has domain '${mismatch.featureDomain}' but story ${mismatch.storyId} has '${mismatch.storyDomain}'`,
      target: mismatch.storyId
    });
  }

  // Priority mismatches
  for (const mismatch of gaps.priorityMismatches || []) {
    recommendations.push({
      type: 'fix_priority',
      priority: 'low',
      message: `Fix priority mismatch: Feature ${mismatch.featureId} has priority '${mismatch.featurePriority}' but story ${mismatch.storyId} has '${mismatch.storyPriority}'`,
      target: mismatch.storyId
    });
  }

  // Orphan stories
  for (const story of gaps.storiesWithoutFeatures || []) {
    recommendations.push({
      type: 'remove_orphan',
      priority: 'low',
      message: `Review orphan story '${story.title}' (${story.storyId}) - no matching PRD feature`,
      target: story.storyId
    });
  }

  return recommendations;
}

// ============================================================================
// ALIGNMENT CHECK FUNCTIONS
// ============================================================================

/**
 * Check alignment between PRD and Stories
 * @param {Object} prd - PRD object
 * @param {Array} stories - Stories array
 * @returns {Object} PRD-Stories alignment check result
 */
export function checkPRDStoriesAlignment(prd, stories) {
  const result = {
    score: 0,
    featuresWithStories: [],
    featuresWithoutStories: [],
    storiesWithoutFeatures: [],
    domainMismatches: [],
    priorityMismatches: []
  };

  if (!prd || !prd.features || !prd.features.core) {
    return result;
  }

  if (!stories || !Array.isArray(stories)) {
    // All features lack stories
    result.featuresWithoutStories = prd.features.core.map(f => ({
      featureId: f.id,
      featureName: f.name,
      domain: f.domain,
      priority: f.priority
    }));
    return result;
  }

  const features = prd.features.core;
  const matchedStoryIds = new Set();

  // Check each feature for a matching story
  for (const feature of features) {
    const story = findStoryForFeature(feature, stories);

    if (story) {
      result.featuresWithStories.push(feature.id);
      matchedStoryIds.add(story.id);

      // Check domain match
      if (story.domain !== feature.domain) {
        result.domainMismatches.push({
          featureId: feature.id,
          storyId: story.id,
          featureDomain: feature.domain,
          storyDomain: story.domain
        });
      }

      // Check priority match
      const expectedPriority = mapPRDPriorityToStory(feature.priority);
      if (story.priority !== expectedPriority) {
        result.priorityMismatches.push({
          featureId: feature.id,
          storyId: story.id,
          featurePriority: feature.priority,
          storyPriority: story.priority
        });
      }
    } else {
      result.featuresWithoutStories.push({
        featureId: feature.id,
        featureName: feature.name,
        domain: feature.domain,
        priority: feature.priority
      });
    }
  }

  // Find orphan stories (stories without matching features)
  for (const story of stories) {
    if (!matchedStoryIds.has(story.id)) {
      result.storiesWithoutFeatures.push({
        storyId: story.id,
        title: story.title,
        domain: story.domain
      });
    }
  }

  // Calculate score (max 50)
  const featureCoverage = calculateCoveragePercentage(
    result.featuresWithStories.length,
    features.length
  );
  result.score = Math.round(featureCoverage * 0.4); // 40 points max for coverage

  // Bonus for domain matches
  if (result.domainMismatches.length === 0 && result.featuresWithStories.length > 0) {
    result.score += 5;
  }

  // Bonus for priority matches
  if (result.priorityMismatches.length === 0 && result.featuresWithStories.length > 0) {
    result.score += 5;
  }

  // Penalty for orphan stories
  result.score -= result.storiesWithoutFeatures.length * 2;

  result.score = Math.max(0, Math.min(50, result.score));

  return result;
}

/**
 * Check alignment between Stories and Mockups
 * @param {Array} stories - Stories array
 * @param {Array} mockups - Mockups array
 * @returns {Object} Stories-Mockups alignment check result
 */
export function checkStoryMockupsAlignment(stories, mockups) {
  const result = {
    score: 0,
    uiStoriesWithMockups: [],
    uiStoriesWithoutMockups: [],
    missingMockupRefs: [],
    orphanMockups: []
  };

  if (!stories || !Array.isArray(stories) || stories.length === 0) {
    return result;
  }

  const mockupsArray = mockups || [];
  const referencedMockups = new Set();

  // Check each story
  for (const story of stories) {
    const isUI = isUIRelatedStory(story);
    const refs = story.mockupRefs || [];

    if (isUI) {
      if (refs.length > 0) {
        result.uiStoriesWithMockups.push(story.id);

        // Validate each ref
        for (const ref of refs) {
          const fileName = typeof ref === 'string' ? ref : ref?.file;
          if (fileName) {
            if (validateMockupRef(ref, mockupsArray)) {
              referencedMockups.add(fileName);
            } else {
              result.missingMockupRefs.push({
                storyId: story.id,
                missingFile: fileName
              });
            }
          }
        }
      } else {
        result.uiStoriesWithoutMockups.push({
          storyId: story.id,
          title: story.title,
          domain: story.domain
        });
      }
    }
  }

  // Find orphan mockups
  for (const mockup of mockupsArray) {
    if (!referencedMockups.has(mockup.name)) {
      result.orphanMockups.push(mockup.name);
    }
  }

  // Calculate score (max 30)
  const uiStories = stories.filter(s => isUIRelatedStory(s));
  const totalUIStories = uiStories.length;

  if (totalUIStories > 0) {
    const coverageScore = calculateCoveragePercentage(
      result.uiStoriesWithMockups.length,
      totalUIStories
    );
    result.score = Math.round(coverageScore * 0.3); // 30 points max
  }

  // Penalty for missing refs
  result.score -= result.missingMockupRefs.length * 3;

  result.score = Math.max(0, Math.min(30, result.score));

  return result;
}

/**
 * Check alignment between PRD and Mockups
 * @param {Object} prd - PRD object
 * @param {Array} mockups - Mockups array
 * @returns {Object} PRD-Mockups alignment check result
 */
export function checkPRDMockupsAlignment(prd, mockups) {
  const result = {
    score: 0,
    featuresInMockups: [],
    featuresNotInMockups: [],
    orphanMockups: []
  };

  if (!prd || !prd.features || !prd.features.core) {
    return result;
  }

  if (!mockups || mockups.length === 0) {
    result.featuresNotInMockups = prd.features.core
      .filter(f => UI_DOMAINS.includes(f.domain))
      .map(f => f.id);
    return result;
  }

  const features = prd.features.core;
  const referencedMockups = new Set();
  const uiFeatures = features.filter(f => UI_DOMAINS.includes(f.domain));

  // Check each UI feature for visibility in mockups
  for (const feature of uiFeatures) {
    const featureName = (feature.name || '').toLowerCase();
    const featureKeywords = featureName.split(/\s+/).filter(w => w.length > 2);

    let foundInMockup = false;

    for (const mockup of mockups) {
      const mockupContent = (mockup.content || '').toLowerCase();
      const mockupName = (mockup.name || '').toLowerCase();

      // Check if any keyword appears in mockup
      const hasKeyword = featureKeywords.some(keyword =>
        mockupContent.includes(keyword) || mockupName.includes(keyword)
      );

      if (hasKeyword) {
        foundInMockup = true;
        referencedMockups.add(mockup.name);
        break;
      }
    }

    if (foundInMockup) {
      result.featuresInMockups.push(feature.id);
    } else {
      result.featuresNotInMockups.push(feature.id);
    }
  }

  // Find orphan mockups
  for (const mockup of mockups) {
    if (!referencedMockups.has(mockup.name)) {
      result.orphanMockups.push(mockup.name);
    }
  }

  // Calculate score (max 20)
  if (uiFeatures.length > 0) {
    const visibilityScore = calculateCoveragePercentage(
      result.featuresInMockups.length,
      uiFeatures.length
    );
    result.score = Math.round(visibilityScore * 0.2); // 20 points max
  }

  // Penalty for orphan mockups
  result.score -= result.orphanMockups.length;

  result.score = Math.max(0, Math.min(20, result.score));

  return result;
}

// ============================================================================
// MAIN ALIGNMENT CHECK
// ============================================================================

/**
 * Perform full alignment check between PRD, Stories, and Mockups
 * @param {Object} prd - PRD object
 * @param {Array} stories - Stories array
 * @param {string} projectPath - Project path for mockup discovery
 * @returns {Promise<Object>} Alignment report
 */
export async function checkAlignment(prd, stories, projectPath) {
  const timestamp = new Date().toISOString();

  // Handle invalid input or empty PRD
  if (!prd || !prd.features?.core?.length) {
    return {
      valid: false,
      score: 0,
      timestamp,
      scores: { prdStories: 0, storyMockups: 0, prdMockups: 0 },
      coverage: {
        featuresWithStories: 0,
        totalFeatures: 0,
        featureCoverage: 0,
        uiStoriesWithMockups: 0,
        totalUIStories: 0,
        mockupCoverage: 0
      },
      gaps: {
        featuresWithoutStories: [],
        storiesWithoutFeatures: [],
        uiStoriesWithoutMockups: [],
        missingMockupRefs: [],
        domainMismatches: [],
        priorityMismatches: []
      },
      recommendations: []
    };
  }

  if (!stories) {
    return {
      valid: false,
      score: 0,
      timestamp,
      scores: { prdStories: 0, storyMockups: 0, prdMockups: 0 },
      coverage: {
        featuresWithStories: 0,
        totalFeatures: prd.features?.core?.length || 0,
        featureCoverage: 0,
        uiStoriesWithMockups: 0,
        totalUIStories: 0,
        mockupCoverage: 0
      },
      gaps: {
        featuresWithoutStories: (prd.features?.core || []).map(f => ({
          featureId: f.id,
          featureName: f.name,
          domain: f.domain,
          priority: f.priority
        })),
        storiesWithoutFeatures: [],
        uiStoriesWithoutMockups: [],
        missingMockupRefs: [],
        domainMismatches: [],
        priorityMismatches: []
      },
      recommendations: []
    };
  }

  // Discover mockups from project
  let mockups = [];
  try {
    const discovery = await discoverProject(projectPath);
    mockups = discovery.mockups || [];
  } catch (e) {
    // Continue without mockups
  }

  // Run all alignment checks
  const prdStoriesCheck = checkPRDStoriesAlignment(prd, stories);
  const storyMockupsCheck = checkStoryMockupsAlignment(stories, mockups);
  const prdMockupsCheck = checkPRDMockupsAlignment(prd, mockups);

  // Calculate total score
  const totalScore = prdStoriesCheck.score + storyMockupsCheck.score + prdMockupsCheck.score;

  // Calculate coverage stats
  const totalFeatures = prd.features?.core?.length || 0;
  const uiStories = (stories || []).filter(s => isUIRelatedStory(s));

  // Compile gaps
  const gaps = {
    featuresWithoutStories: prdStoriesCheck.featuresWithoutStories,
    storiesWithoutFeatures: prdStoriesCheck.storiesWithoutFeatures,
    uiStoriesWithoutMockups: storyMockupsCheck.uiStoriesWithoutMockups,
    missingMockupRefs: storyMockupsCheck.missingMockupRefs,
    domainMismatches: prdStoriesCheck.domainMismatches,
    priorityMismatches: prdStoriesCheck.priorityMismatches
  };

  // Generate recommendations
  const recommendations = generateRecommendations(gaps);

  return {
    valid: totalScore >= ALIGNMENT_THRESHOLDS.acceptable,
    score: totalScore,
    timestamp,
    scores: {
      prdStories: prdStoriesCheck.score,
      storyMockups: storyMockupsCheck.score,
      prdMockups: prdMockupsCheck.score
    },
    coverage: {
      featuresWithStories: prdStoriesCheck.featuresWithStories.length,
      totalFeatures,
      featureCoverage: calculateCoveragePercentage(
        prdStoriesCheck.featuresWithStories.length,
        totalFeatures
      ),
      uiStoriesWithMockups: storyMockupsCheck.uiStoriesWithMockups.length,
      totalUIStories: uiStories.length,
      mockupCoverage: uiStories.length > 0
        ? calculateCoveragePercentage(
            storyMockupsCheck.uiStoriesWithMockups.length,
            uiStories.length
          )
        : 0
    },
    gaps,
    recommendations
  };
}

// Default export
export default checkAlignment;
