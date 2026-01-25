// ═══════════════════════════════════════════════════════════════════════════════
// FOLDER STRUCTURE VALIDATOR (Gate 0 Enhancement)
// ═══════════════════════════════════════════════════════════════════════════════
// Validates project folder structure against recommended best practices
// Provides soft validation (warnings, not blockers) for Gate 0
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Structure templates for different project types
 * Based on 2026 best practices for Next.js + Supabase + Tailwind projects
 */
export const STRUCTURE_TEMPLATES = {
  nextjs: {
    name: 'Next.js + Supabase + Tailwind',
    description: 'Recommended structure for Next.js App Router projects with Supabase backend',

    // Required folders - errors if missing
    required: [
      'docs',
      'mockups'
    ],

    // Required files - errors if missing
    requiredFiles: [
      'docs/PRD.md',
      'docs/CLAUDE.md'
    ],

    // Recommended folders - warnings if missing
    recommended: [
      'src',
      'src/app',
      'src/components',
      'src/lib',
      'public',
      'mockups/html'
    ],

    // Recommended files - warnings if missing
    recommendedFiles: [
      'docs/Architecture.md',
      'docs/User-Stories.json',
      'docs/Safety-Protocol.md',
      '.env.example',
      'package.json'
    ],

    // Files that should be in specific locations (for reorganization suggestions)
    fileLocationRules: [
      { pattern: /^PRD\.md$/i, expectedDir: 'docs', name: 'PRD document' },
      { pattern: /^CLAUDE\.md$/i, expectedDir: 'docs', name: 'CLAUDE instructions' },
      { pattern: /^Architecture\.md$/i, expectedDir: 'docs', name: 'Architecture document' },
      { pattern: /^.*stories.*\.json$/i, expectedDir: 'docs', name: 'User stories' },
      { pattern: /^.*\.html$/i, expectedDir: 'mockups/html', name: 'HTML mockup' },
      { pattern: /^.*\.htm$/i, expectedDir: 'mockups/html', name: 'HTML mockup' },
      { pattern: /^Safety.*\.md$/i, expectedDir: 'docs', name: 'Safety document' }
    ]
  }
};

/**
 * Normalize path for comparison (remove leading/trailing slashes, lowercase)
 */
function normalizePath(path) {
  return path.replace(/^\/+|\/+$/g, '').toLowerCase();
}

/**
 * Check if a path or its parent exists in the paths array
 */
function pathExists(paths, targetPath) {
  const normalizedTarget = normalizePath(targetPath);
  const normalizedPaths = paths.map(normalizePath);

  return normalizedPaths.some(p => {
    // Exact match
    if (p === normalizedTarget) return true;
    // Parent directory exists (e.g., 'src/app/page.tsx' satisfies 'src')
    if (p.startsWith(normalizedTarget + '/')) return true;
    // Target is parent of existing path
    if (normalizedTarget.startsWith(p + '/')) return true;
    return false;
  });
}

/**
 * Check if a specific file exists in paths
 */
function fileExists(paths, targetFile) {
  const normalizedTarget = normalizePath(targetFile);
  return paths.map(normalizePath).some(p => p === normalizedTarget || p.endsWith('/' + normalizedTarget));
}

/**
 * Get the recommended folder structure template
 * @param {string} templateName - Template name (default: 'nextjs')
 * @returns {object} Structure template
 */
export function getRecommendedStructure(templateName = 'nextjs') {
  return STRUCTURE_TEMPLATES[templateName] || STRUCTURE_TEMPLATES.nextjs;
}

/**
 * Validate folder structure against recommended template
 * @param {string[]} existingPaths - Array of existing paths in project
 * @param {string} templateName - Template to validate against
 * @returns {object} Validation result
 */
export function validateFolderStructure(existingPaths, templateName = 'nextjs') {
  const template = getRecommendedStructure(templateName);

  // Check required folders
  const missingRequired = template.required.filter(folder => !pathExists(existingPaths, folder));

  // Check required files
  const missingRequiredFiles = template.requiredFiles.filter(file => !fileExists(existingPaths, file));

  // Check recommended folders
  const missingRecommended = template.recommended.filter(folder => !pathExists(existingPaths, folder));
  const presentRecommended = template.recommended.filter(folder => pathExists(existingPaths, folder));

  // Check recommended files
  const missingRecommendedFiles = template.recommendedFiles.filter(file => !fileExists(existingPaths, file));
  const presentRecommendedFiles = template.recommendedFiles.filter(file => fileExists(existingPaths, file));

  // Calculate compliance score
  const complianceScore = calculateStructureComplianceScore(existingPaths, templateName);

  // Determine if structure is valid (no missing required items)
  const valid = missingRequired.length === 0 && missingRequiredFiles.length === 0;

  return {
    valid,
    templateName,
    complianceScore,
    missingRequired,
    missingRequiredFiles,
    missingRecommended,
    missingRecommendedFiles,
    presentRecommended,
    presentRecommendedFiles,
    totalRequired: template.required.length + template.requiredFiles.length,
    totalRecommended: template.recommended.length + template.recommendedFiles.length
  };
}

/**
 * Calculate structure compliance score (0-100)
 * Required items weighted higher than recommended
 * @param {string[]} existingPaths - Array of existing paths
 * @param {string} templateName - Template name
 * @returns {number} Compliance score 0-100
 */
export function calculateStructureComplianceScore(existingPaths, templateName = 'nextjs') {
  if (!existingPaths || existingPaths.length === 0) {
    return 0;
  }

  const template = getRecommendedStructure(templateName);

  // Weight distribution: Required=60%, Recommended=40%
  const requiredWeight = 60;
  const recommendedWeight = 40;

  // Count required items present
  const requiredFoldersPresent = template.required.filter(f => pathExists(existingPaths, f)).length;
  const requiredFilesPresent = template.requiredFiles.filter(f => fileExists(existingPaths, f)).length;
  const totalRequiredItems = template.required.length + template.requiredFiles.length;
  const requiredPresent = requiredFoldersPresent + requiredFilesPresent;

  // Count recommended items present
  const recommendedFoldersPresent = template.recommended.filter(f => pathExists(existingPaths, f)).length;
  const recommendedFilesPresent = template.recommendedFiles.filter(f => fileExists(existingPaths, f)).length;
  const totalRecommendedItems = template.recommended.length + template.recommendedFiles.length;
  const recommendedPresent = recommendedFoldersPresent + recommendedFilesPresent;

  // Calculate scores
  const requiredScore = totalRequiredItems > 0
    ? (requiredPresent / totalRequiredItems) * requiredWeight
    : requiredWeight;

  const recommendedScore = totalRecommendedItems > 0
    ? (recommendedPresent / totalRecommendedItems) * recommendedWeight
    : recommendedWeight;

  return Math.round(requiredScore + recommendedScore);
}

/**
 * Get list of structure deviations with suggestions
 * @param {string[]} existingPaths - Array of existing paths
 * @param {string} templateName - Template name
 * @returns {Array} Array of deviation objects
 */
export function getStructureDeviations(existingPaths, templateName = 'nextjs') {
  const template = getRecommendedStructure(templateName);
  const deviations = [];

  // Check for missing required folders
  template.required.forEach(folder => {
    if (!pathExists(existingPaths, folder)) {
      deviations.push({
        type: 'missing',
        path: folder,
        severity: 'error',
        message: `Required folder missing: ${folder}`,
        suggestion: `Create the '${folder}' directory to store ${getFolderPurpose(folder)}`
      });
    }
  });

  // Check for missing required files
  template.requiredFiles.forEach(file => {
    if (!fileExists(existingPaths, file)) {
      deviations.push({
        type: 'missing',
        path: file,
        severity: 'error',
        message: `Required file missing: ${file}`,
        suggestion: `Create '${file}' - ${getFilePurpose(file)}`
      });
    }
  });

  // Check for missing recommended folders
  template.recommended.forEach(folder => {
    if (!pathExists(existingPaths, folder)) {
      deviations.push({
        type: 'missing',
        path: folder,
        severity: 'warning',
        message: `Recommended folder missing: ${folder}`,
        suggestion: `Consider adding '${folder}' for ${getFolderPurpose(folder)}`
      });
    }
  });

  // Check for missing recommended files
  template.recommendedFiles.forEach(file => {
    if (!fileExists(existingPaths, file)) {
      deviations.push({
        type: 'missing',
        path: file,
        severity: 'warning',
        message: `Recommended file missing: ${file}`,
        suggestion: `Consider adding '${file}' - ${getFilePurpose(file)}`
      });
    }
  });

  // Check for misplaced files (files in wrong location)
  existingPaths.forEach(path => {
    const normalizedPath = normalizePath(path);
    const fileName = normalizedPath.split('/').pop();
    const currentDir = normalizedPath.includes('/') ? normalizedPath.substring(0, normalizedPath.lastIndexOf('/')) : '';

    template.fileLocationRules.forEach(rule => {
      if (rule.pattern.test(fileName)) {
        const expectedDir = rule.expectedDir;
        if (currentDir !== expectedDir && !currentDir.startsWith(expectedDir)) {
          deviations.push({
            type: 'misplaced',
            path: path,
            severity: 'warning',
            message: `${rule.name} found in unexpected location`,
            suggestion: `Move '${fileName}' to '${expectedDir}/' directory`,
            suggestedLocation: `${expectedDir}/${fileName}`
          });
        }
      }
    });
  });

  return deviations;
}

/**
 * Get human-readable purpose for a folder
 */
function getFolderPurpose(folder) {
  const purposes = {
    'docs': 'PRD, architecture, and planning documents',
    'mockups': 'design assets and HTML prototypes',
    'mockups/html': 'HTML prototype screens',
    'mockups/figma': 'Figma exports and screenshots',
    'src': 'source code',
    'src/app': 'Next.js App Router pages and layouts',
    'src/components': 'reusable React components',
    'src/lib': 'utility functions and API clients',
    'public': 'static assets (images, fonts, etc.)',
    '.claude': 'WAVE protocol signals and hooks'
  };
  return purposes[folder] || 'project organization';
}

/**
 * Get human-readable purpose for a file
 */
function getFilePurpose(file) {
  const purposes = {
    'docs/PRD.md': 'Product Requirements Document defining features and scope',
    'docs/CLAUDE.md': 'Project-specific agent instructions for WAVE',
    'docs/Architecture.md': 'System architecture and tech stack documentation',
    'docs/User-Stories.json': 'Structured user stories for wave planning',
    'docs/Safety-Protocol.md': 'Safety guidelines and FMEA considerations',
    '.env.example': 'Environment variables template for team setup',
    'package.json': 'Node.js project configuration and dependencies'
  };
  return purposes[file] || 'project configuration';
}

export default {
  STRUCTURE_TEMPLATES,
  getRecommendedStructure,
  validateFolderStructure,
  calculateStructureComplianceScore,
  getStructureDeviations
};
