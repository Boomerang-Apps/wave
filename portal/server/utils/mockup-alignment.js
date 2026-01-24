/**
 * Mockup-Story Alignment Checker Module (Launch Sequence)
 *
 * Phase 3, Step 3.3: Mockup-Story Alignment Checker
 *
 * Checks alignment between mockups and stories to ensure
 * every mockup has corresponding stories and identifies gaps.
 */

// ============================================
// Helper Functions
// ============================================

/**
 * Normalize a filename for comparison (lowercase, no extension)
 * @param {string} name - Filename to normalize
 * @returns {string} Normalized name
 */
function normalizeFilename(name) {
  if (!name) return '';
  return name.toLowerCase().replace(/\.html?$/i, '').replace(/[-_]/g, '');
}

/**
 * Check if a story title matches a mockup name
 * @param {string} title - Story title
 * @param {string} mockupName - Mockup filename
 * @returns {boolean} True if they match
 */
function titleMatchesMockup(title, mockupName) {
  if (!title || !mockupName) return false;

  const normalizedTitle = title.toLowerCase().replace(/[-_\s]/g, '');
  const normalizedMockup = normalizeFilename(mockupName);

  return normalizedTitle.includes(normalizedMockup) ||
         normalizedMockup.includes(normalizedTitle);
}

// ============================================
// Core Functions
// ============================================

/**
 * Find mockups that have no corresponding stories
 * @param {Array<{name: string}>} mockups - Array of mockup objects
 * @param {Array<{mockupRef?: string}>} stories - Array of story objects
 * @returns {string[]} Array of unmapped mockup names
 */
export function findUnmappedMockups(mockups, stories) {
  const unmapped = [];

  for (const mockup of mockups) {
    const mockupName = mockup.name.toLowerCase();

    const hasStory = stories.some(story => {
      if (story.mockupRef) {
        return story.mockupRef.toLowerCase() === mockupName;
      }
      return false;
    });

    if (!hasStory) {
      unmapped.push(mockup.name);
    }
  }

  return unmapped;
}

/**
 * Find stories that reference non-existent mockups
 * @param {Array<{name: string}>} mockups - Array of mockup objects
 * @param {Array<{id: string, mockupRef?: string}>} stories - Array of story objects
 * @returns {string[]} Array of orphaned story IDs
 */
export function findOrphanedStories(mockups, stories) {
  const orphaned = [];
  const mockupNames = new Set(mockups.map(m => m.name.toLowerCase()));

  for (const story of stories) {
    if (story.mockupRef) {
      const refLower = story.mockupRef.toLowerCase();
      if (!mockupNames.has(refLower)) {
        orphaned.push(story.id);
      }
    }
    // Stories without mockupRef are not considered orphaned
    // (they may be backend stories or infrastructure stories)
  }

  return orphaned;
}

/**
 * Calculate alignment score (0-100)
 * @param {Array<{name: string}>} mockups - Array of mockup objects
 * @param {Array<{mockupRef?: string, title?: string}>} stories - Array of story objects
 * @returns {number} Alignment score percentage
 */
export function calculateAlignmentScore(mockups, stories) {
  if (mockups.length === 0) {
    return 100; // No mockups means nothing to align
  }

  let coveredCount = 0;

  for (const mockup of mockups) {
    const mockupName = mockup.name.toLowerCase();

    const hasStory = stories.some(story => {
      if (story.mockupRef) {
        return story.mockupRef.toLowerCase() === mockupName;
      }
      // Try title matching as fallback
      if (story.title) {
        return titleMatchesMockup(story.title, mockup.name);
      }
      return false;
    });

    if (hasStory) {
      coveredCount++;
    }
  }

  return Math.round((coveredCount / mockups.length) * 100);
}

/**
 * @typedef {Object} AlignmentResult
 * @property {boolean} aligned - Whether all mockups have stories
 * @property {number} coveragePercent - Percentage of mockups covered
 * @property {string[]} unmappedMockups - Mockups without stories
 * @property {string[]} orphanedStories - Stories referencing non-existent mockups
 * @property {Object<string, number>} storyCountPerMockup - Story count per mockup
 */

/**
 * Check alignment between mockups and stories
 * @param {Array<{name: string, path?: string}>} mockups - Array of mockup objects
 * @param {Array<{id: string, title?: string, mockupRef?: string}>} stories - Array of story objects
 * @returns {AlignmentResult}
 */
export function checkMockupStoryAlignment(mockups, stories) {
  // Handle edge cases
  if (mockups.length === 0 && stories.length === 0) {
    return {
      aligned: true,
      coveragePercent: 100,
      unmappedMockups: [],
      orphanedStories: [],
      storyCountPerMockup: {}
    };
  }

  if (mockups.length === 0) {
    return {
      aligned: true,
      coveragePercent: 100,
      unmappedMockups: [],
      orphanedStories: stories.filter(s => s.mockupRef).map(s => s.id),
      storyCountPerMockup: {}
    };
  }

  // Calculate coverage
  const coveragePercent = calculateAlignmentScore(mockups, stories);

  // Find unmapped mockups
  const unmappedMockups = findUnmappedMockups(mockups, stories);

  // Find orphaned stories
  const orphanedStories = findOrphanedStories(mockups, stories);

  // Count stories per mockup
  const storyCountPerMockup = {};
  for (const mockup of mockups) {
    const mockupName = mockup.name.toLowerCase();
    const count = stories.filter(story => {
      if (story.mockupRef) {
        return story.mockupRef.toLowerCase() === mockupName;
      }
      if (story.title) {
        return titleMatchesMockup(story.title, mockup.name);
      }
      return false;
    }).length;

    storyCountPerMockup[mockup.name] = count;
  }

  // Determine if aligned (all mockups have at least one story)
  const aligned = unmappedMockups.length === 0;

  return {
    aligned,
    coveragePercent,
    unmappedMockups,
    orphanedStories,
    storyCountPerMockup
  };
}

/**
 * @typedef {Object} AlignmentReport
 * @property {string} summary - Human-readable summary
 * @property {number} mockupCount - Number of mockups
 * @property {number} storyCount - Number of stories
 * @property {number} coveragePercent - Coverage percentage
 * @property {'ready' | 'blocked'} status - Alignment status
 * @property {string[]} gaps - List of unmapped mockups
 * @property {string} timestamp - Report timestamp
 */

/**
 * Create an alignment report
 * @param {Array<{name: string, path?: string}>} mockups - Array of mockup objects
 * @param {Array<{id: string, title?: string, mockupRef?: string}>} stories - Array of story objects
 * @returns {AlignmentReport}
 */
export function createAlignmentReport(mockups, stories) {
  const alignment = checkMockupStoryAlignment(mockups, stories);

  const summary = mockups.length === 0
    ? 'No mockups to align'
    : alignment.aligned
      ? `All ${mockups.length} mockup(s) have corresponding stories`
      : `${alignment.unmappedMockups.length} of ${mockups.length} mockup(s) need stories`;

  return {
    summary,
    mockupCount: mockups.length,
    storyCount: stories.length,
    coveragePercent: alignment.coveragePercent,
    status: alignment.aligned ? 'ready' : 'blocked',
    gaps: alignment.unmappedMockups,
    timestamp: new Date().toISOString()
  };
}

export default checkMockupStoryAlignment;
