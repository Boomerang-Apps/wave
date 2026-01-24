/**
 * State Versioning (Grok Recommendation G6.1)
 *
 * Tracks gate status history for rollback
 */

// ============================================
// State Version Functions
// ============================================

/**
 * Create a state version record
 * @param {string} stepId - Step identifier
 * @param {string} status - Current status
 * @param {Object} context - Context data
 * @returns {Object} State version
 */
export function createStateVersion(stepId, status, context) {
  const versionedContext = {
    ...context,
    versionedAt: new Date().toISOString()
  };

  return {
    id: `v-${stepId}-${Date.now()}`,
    stepId,
    status,
    context: versionedContext,
    checksum: generateChecksum({ stepId, status, context })
  };
}

/**
 * Get state history for a step
 * @param {string} stepId - Step identifier
 * @param {number} limit - Max versions to return
 * @returns {Object} History object
 */
export function getStateHistory(stepId, limit = 10) {
  // Note: In real implementation, this would query database
  return {
    stepId,
    versions: [],
    currentVersion: null,
    limit
  };
}

/**
 * Verify checksum of a state version
 * @param {Object} version - State version to verify
 * @returns {boolean} Whether checksum is valid
 */
export function verifyChecksum(version) {
  if (!version.checksum) {
    return false;
  }

  // Remove versionedAt from context for checksum verification
  // since it was added after checksum was generated
  const contextForChecksum = { ...version.context };
  delete contextForChecksum.versionedAt;

  const expectedChecksum = generateChecksum({
    stepId: version.stepId,
    status: version.status,
    context: contextForChecksum
  });

  return version.checksum === expectedChecksum;
}

/**
 * Compare two versions to find differences
 * @param {Object} v1 - First version
 * @param {Object} v2 - Second version
 * @returns {Object} Differences
 */
export function compareVersions(v1, v2) {
  const statusChanged = v1.status !== v2.status;

  // Remove versionedAt for context comparison
  const ctx1 = { ...v1.context };
  const ctx2 = { ...v2.context };
  delete ctx1.versionedAt;
  delete ctx2.versionedAt;

  const contextChanged = JSON.stringify(ctx1) !== JSON.stringify(ctx2);

  return {
    statusChanged,
    fromStatus: v1.status,
    toStatus: v2.status,
    contextChanged
  };
}

/**
 * Generate checksum for data integrity
 * @param {Object} data - Data to hash
 * @returns {string} Checksum string
 */
function generateChecksum(data) {
  const str = JSON.stringify(data);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(16);
}

export default createStateVersion;
