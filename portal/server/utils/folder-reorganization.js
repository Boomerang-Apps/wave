// ═══════════════════════════════════════════════════════════════════════════════
// FOLDER REORGANIZATION RECOMMENDER (Gate 0 Enhancement)
// ═══════════════════════════════════════════════════════════════════════════════
// Generates specific move/create suggestions for project reorganization
// Helps users organize scattered files into recommended structure
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Priority levels for reorganization actions
 */
export const ReorganizationPriority = {
  CRITICAL: 'critical',  // Required for WAVE to function
  HIGH: 'high',          // Strongly recommended
  MEDIUM: 'medium',      // Good to have
  LOW: 'low'             // Optional improvement
};

/**
 * File patterns and their recommended locations
 */
const FILE_LOCATION_RULES = [
  // Critical - PRD and Claude docs
  { pattern: /^PRD\.md$/i, dest: 'docs/PRD.md', priority: ReorganizationPriority.CRITICAL, type: 'prd' },
  { pattern: /^.*PRD.*\.md$/i, dest: 'docs/', priority: ReorganizationPriority.CRITICAL, type: 'prd' },
  { pattern: /^CLAUDE\.md$/i, dest: 'docs/CLAUDE.md', priority: ReorganizationPriority.CRITICAL, type: 'claude' },

  // High - Architecture and stories
  { pattern: /^Architecture\.md$/i, dest: 'docs/Architecture.md', priority: ReorganizationPriority.HIGH, type: 'architecture' },
  { pattern: /^.*architecture.*\.md$/i, dest: 'docs/', priority: ReorganizationPriority.HIGH, type: 'architecture' },
  { pattern: /^.*stories.*\.json$/i, dest: 'docs/', priority: ReorganizationPriority.HIGH, type: 'stories' },
  { pattern: /^User-Stories\.json$/i, dest: 'docs/User-Stories.json', priority: ReorganizationPriority.HIGH, type: 'stories' },

  // High - HTML mockups
  { pattern: /^.*\.html$/i, dest: 'mockups/html/', priority: ReorganizationPriority.HIGH, type: 'mockup' },
  { pattern: /^.*\.htm$/i, dest: 'mockups/html/', priority: ReorganizationPriority.HIGH, type: 'mockup' },

  // Medium - Safety and other docs
  { pattern: /^Safety.*\.md$/i, dest: 'docs/', priority: ReorganizationPriority.MEDIUM, type: 'safety' },
  { pattern: /^Figma.*\.md$/i, dest: 'docs/', priority: ReorganizationPriority.MEDIUM, type: 'figma' }
];

/**
 * Check if file is in correct location
 */
function isInCorrectLocation(filePath, expectedDest) {
  const normalizedPath = filePath.toLowerCase();
  const normalizedDest = expectedDest.toLowerCase();

  // If dest ends with /, check if file is in that directory
  if (normalizedDest.endsWith('/')) {
    return normalizedPath.startsWith(normalizedDest);
  }
  // Otherwise exact match
  return normalizedPath === normalizedDest;
}

/**
 * Get filename from path
 */
function getFileName(filePath) {
  return filePath.split('/').pop();
}

/**
 * Generate a complete reorganization plan for a project
 * @param {string[]} existingFiles - Array of existing file paths
 * @param {object} options - Options for plan generation
 * @returns {object} Reorganization plan
 */
export function generateReorganizationPlan(existingFiles, options = {}) {
  const actions = [];
  const foldersNeeded = new Set();

  // Check each file against location rules
  existingFiles.forEach(filePath => {
    const fileName = getFileName(filePath);
    const currentDir = filePath.includes('/') ? filePath.substring(0, filePath.lastIndexOf('/')) : '';

    FILE_LOCATION_RULES.forEach(rule => {
      if (rule.pattern.test(fileName)) {
        // Determine destination
        let destination;
        if (rule.dest.endsWith('/')) {
          destination = rule.dest + fileName;
        } else {
          destination = rule.dest;
        }

        // Check if already in correct location
        if (!isInCorrectLocation(filePath, rule.dest)) {
          // Need to move this file
          const destDir = destination.includes('/')
            ? destination.substring(0, destination.lastIndexOf('/'))
            : '';

          if (destDir && !existingFiles.some(f => f.toLowerCase().startsWith(destDir.toLowerCase() + '/'))) {
            foldersNeeded.add(destDir);
          }

          actions.push({
            action: 'move',
            file: filePath,
            destination,
            priority: rule.priority,
            type: rule.type,
            reason: `${fileName} should be in ${rule.dest}`
          });
        }
      }
    });
  });

  // Add folder creation actions
  foldersNeeded.forEach(folder => {
    actions.unshift({
      action: 'create',
      folder,
      priority: ReorganizationPriority.CRITICAL,
      reason: `Create ${folder} directory for proper organization`
    });
  });

  // Check if docs folder needs to be created
  const hasDocsFolder = existingFiles.some(f => f.toLowerCase().startsWith('docs/'));
  const needsDocsFolder = actions.some(a => a.destination && a.destination.startsWith('docs/'));
  if (!hasDocsFolder && needsDocsFolder && !foldersNeeded.has('docs')) {
    actions.unshift({
      action: 'create',
      folder: 'docs',
      priority: ReorganizationPriority.CRITICAL,
      reason: 'Create docs directory for PRD and planning documents'
    });
  }

  // Check if mockups/html folder needs to be created
  const hasMockupsHtmlFolder = existingFiles.some(f => f.toLowerCase().startsWith('mockups/html/'));
  const needsMockupsHtmlFolder = actions.some(a => a.destination && a.destination.startsWith('mockups/html/'));
  if (!hasMockupsHtmlFolder && needsMockupsHtmlFolder && !foldersNeeded.has('mockups/html')) {
    actions.unshift({
      action: 'create',
      folder: 'mockups/html',
      priority: ReorganizationPriority.HIGH,
      reason: 'Create mockups/html directory for HTML prototypes'
    });
  }

  // Sort by priority
  const priorityOrder = ['critical', 'high', 'medium', 'low'];
  actions.sort((a, b) => {
    // Create actions first
    if (a.action === 'create' && b.action !== 'create') return -1;
    if (a.action !== 'create' && b.action === 'create') return 1;
    // Then by priority
    return priorityOrder.indexOf(a.priority) - priorityOrder.indexOf(b.priority);
  });

  // Detect duplicates
  const duplicates = detectDuplicateDocuments(existingFiles);

  // Calculate estimated time (rough: 1 min per action)
  const estimatedMinutes = Math.max(5, actions.length * 1);

  return {
    actions,
    duplicates,
    isOrganized: actions.length === 0,
    estimatedMinutes,
    summary: {
      totalActions: actions.length,
      criticalActions: actions.filter(a => a.priority === ReorganizationPriority.CRITICAL).length,
      foldersToCreate: actions.filter(a => a.action === 'create').length,
      filesToMove: actions.filter(a => a.action === 'move').length
    }
  };
}

/**
 * Generate executable bash commands from actions
 * @param {Array} actions - Array of action objects
 * @returns {string[]} Array of bash commands
 */
export function generateMoveCommands(actions) {
  const commands = [];

  // First, all mkdir commands
  actions
    .filter(a => a.action === 'create')
    .forEach(action => {
      commands.push(`mkdir -p ${action.folder}`);
    });

  // Then, all mv commands
  actions
    .filter(a => a.action === 'move')
    .forEach(action => {
      const src = action.file.includes(' ') ? `"${action.file}"` : action.file;
      const dest = action.destination.includes(' ') ? `"${action.destination}"` : action.destination;
      commands.push(`mv ${src} ${dest}`);
    });

  return commands;
}

/**
 * Detect duplicate documents (multiple PRDs, architectures, etc.)
 * @param {string[]} existingFiles - Array of file paths
 * @returns {object} Duplicate detection results
 */
export function detectDuplicateDocuments(existingFiles) {
  const prdFiles = existingFiles.filter(f =>
    /prd/i.test(f) && f.endsWith('.md')
  );

  const architectureFiles = existingFiles.filter(f =>
    /architecture/i.test(f) && f.endsWith('.md')
  );

  const claudeFiles = existingFiles.filter(f =>
    /claude\.md$/i.test(f)
  );

  const hasDuplicates = prdFiles.length > 1 || architectureFiles.length > 1;

  return {
    prd: prdFiles,
    architecture: architectureFiles,
    claude: claudeFiles,
    hasDuplicates,
    suggestion: hasDuplicates
      ? 'Multiple versions detected. Consider consolidating into a single master document in docs/'
      : null
  };
}

/**
 * Generate suggestion for creating docs folder
 * @returns {object} Docs folder creation suggestion
 */
export function suggestDocsFolderCreation() {
  return {
    folder: 'docs',
    files: [
      'PRD.md',
      'CLAUDE.md',
      'Architecture.md',
      'User-Stories.json',
      'Safety-Protocol.md',
      'Figma-Links.md'
    ],
    templates: {
      'PRD.md': '# Product Requirements Document\n\n## Overview\n\n## Features\n\n## User Stories\n',
      'CLAUDE.md': '# Project Instructions for WAVE Agents\n\n## Context\n\n## Guidelines\n\n## Constraints\n',
      'Architecture.md': '# Architecture Overview\n\n## Tech Stack\n\n## System Design\n\n## Data Flow\n'
    },
    description: 'Central location for all planning and requirements documents'
  };
}

/**
 * Generate suggestion for creating mockups folder
 * @returns {object} Mockups folder creation suggestion
 */
export function suggestMockupsFolderCreation() {
  return {
    folder: 'mockups',
    subfolders: ['html', 'figma'],
    namingConvention: 'Use numeric prefixes for ordering: 01-login.html, 02-dashboard.html, etc.',
    description: 'Store all design assets and prototypes',
    tips: [
      'Put HTML prototypes in mockups/html/',
      'Export Figma screens to mockups/figma/ or link in docs/Figma-Links.md',
      'Name files descriptively to match user stories'
    ]
  };
}

export default {
  ReorganizationPriority,
  generateReorganizationPlan,
  generateMoveCommands,
  detectDuplicateDocuments,
  suggestDocsFolderCreation,
  suggestMockupsFolderCreation
};
