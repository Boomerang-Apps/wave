/**
 * Story Domain Classifier Module (Launch Sequence)
 *
 * Phase 4, Step 4.1: Story Domain Classifier
 *
 * Classifies stories by domain (frontend, backend, etc.) for agent assignment.
 */

// ============================================
// Constants
// ============================================

/**
 * Valid story domains
 */
export const STORY_DOMAINS = [
  'frontend',
  'backend',
  'fullstack',
  'qa',
  'devops',
  'design'
];

/**
 * Keywords for domain classification
 */
export const DOMAIN_KEYWORDS = {
  frontend: [
    'ui', 'component', 'button', 'form', 'modal', 'dialog',
    'react', 'vue', 'angular', 'css', 'style', 'styling',
    'layout', 'responsive', 'animation', 'page', 'view',
    'navigation', 'menu', 'header', 'footer', 'sidebar',
    'input', 'dropdown', 'select', 'checkbox', 'radio',
    'table', 'list', 'card', 'grid', 'flex', 'tailwind',
    'html', 'jsx', 'tsx', 'scss', 'sass', 'less',
    'client', 'browser', 'dom', 'render', 'display'
  ],
  backend: [
    'api', 'endpoint', 'rest', 'graphql', 'server',
    'database', 'db', 'sql', 'postgres', 'mysql', 'mongo',
    'migration', 'schema', 'model', 'entity', 'repository',
    'controller', 'service', 'middleware', 'route', 'router',
    'auth', 'authentication', 'authorization', 'jwt', 'oauth',
    'crud', 'query', 'mutation', 'resolver', 'handler',
    'node', 'express', 'fastify', 'nest', 'django', 'flask',
    'cache', 'redis', 'queue', 'worker', 'job', 'cron',
    'webhook', 'socket', 'websocket', 'realtime'
  ],
  qa: [
    'test', 'testing', 'qa', 'quality',
    'unit test', 'integration test', 'e2e', 'end-to-end',
    'jest', 'vitest', 'mocha', 'cypress', 'playwright',
    'coverage', 'assertion', 'mock', 'stub', 'spy',
    'regression', 'smoke test', 'acceptance', 'validation'
  ],
  devops: [
    'ci', 'cd', 'cicd', 'pipeline', 'deploy', 'deployment',
    'docker', 'kubernetes', 'k8s', 'container',
    'github actions', 'jenkins', 'circleci', 'travis',
    'terraform', 'ansible', 'infrastructure',
    'aws', 'gcp', 'azure', 'cloud', 'serverless',
    'monitoring', 'logging', 'metrics', 'alerting',
    'nginx', 'load balancer', 'ssl', 'https', 'dns'
  ],
  design: [
    'design', 'mockup', 'wireframe', 'prototype',
    'figma', 'sketch', 'adobe', 'photoshop',
    'ux', 'user experience', 'usability',
    'color', 'typography', 'font', 'icon', 'image',
    'brand', 'branding', 'logo', 'visual'
  ]
};

// ============================================
// Classification Functions
// ============================================

/**
 * Count keyword matches for a domain
 * @param {string} text - Text to search
 * @param {string[]} keywords - Keywords to match
 * @returns {number} Match count
 */
function countKeywordMatches(text, keywords) {
  if (!text) return 0;
  const lowerText = text.toLowerCase();
  return keywords.filter(keyword => lowerText.includes(keyword.toLowerCase())).length;
}

/**
 * @typedef {Object} ClassificationResult
 * @property {string} domain - Classified domain
 * @property {number} confidence - Confidence score (0-100)
 */

/**
 * Classify a story's domain
 * @param {Object} story - Story object
 * @param {string} [story.id] - Story ID
 * @param {string} [story.title] - Story title
 * @param {string} [story.description] - Story description
 * @param {string} [story.domain] - Explicit domain
 * @param {Object} [options] - Options
 * @param {boolean} [options.includeConfidence] - Include confidence score
 * @returns {string|ClassificationResult} Domain or classification result
 */
export function classifyStoryDomain(story, options = {}) {
  // If explicit domain is provided, use it
  if (story.domain && STORY_DOMAINS.includes(story.domain)) {
    if (options.includeConfidence) {
      return { domain: story.domain, confidence: 100 };
    }
    return story.domain;
  }

  // Combine title and description for analysis
  const text = `${story.title || ''} ${story.description || ''}`;

  // Count matches for each domain
  const scores = {};
  let maxScore = 0;
  let topDomains = [];

  for (const domain of ['frontend', 'backend', 'qa', 'devops', 'design']) {
    const keywords = DOMAIN_KEYWORDS[domain];
    const score = countKeywordMatches(text, keywords);
    scores[domain] = score;

    if (score > maxScore) {
      maxScore = score;
      topDomains = [domain];
    } else if (score === maxScore && score > 0) {
      topDomains.push(domain);
    }
  }

  // Determine domain
  let domain = 'fullstack'; // default
  let confidence = 50; // default confidence

  if (maxScore === 0) {
    // No matches, default to fullstack
    domain = 'fullstack';
    confidence = 30;
  } else if (topDomains.length === 1) {
    // Clear winner
    domain = topDomains[0];
    confidence = Math.min(100, 50 + maxScore * 10);
  } else if (topDomains.includes('frontend') && topDomains.includes('backend')) {
    // Both frontend and backend - fullstack
    domain = 'fullstack';
    confidence = Math.min(100, 50 + maxScore * 5);
  } else {
    // Multiple matches, pick first
    domain = topDomains[0];
    confidence = Math.min(100, 40 + maxScore * 8);
  }

  if (options.includeConfidence) {
    return { domain, confidence };
  }
  return domain;
}

/**
 * Classify all stories in an array
 * @param {Object[]} stories - Array of story objects
 * @returns {Object[]} Stories with domain added
 */
export function classifyAllStories(stories) {
  return stories.map(story => ({
    ...story,
    storyId: story.id,
    domain: classifyStoryDomain(story)
  }));
}

// ============================================
// Statistics Functions
// ============================================

/**
 * @typedef {Object} DomainStats
 * @property {number} frontend - Frontend story count
 * @property {number} backend - Backend story count
 * @property {number} fullstack - Fullstack story count
 * @property {number} qa - QA story count
 * @property {number} devops - DevOps story count
 * @property {number} design - Design story count
 * @property {number} total - Total story count
 * @property {Object} percentages - Percentage breakdown
 */

/**
 * Get domain statistics for classified stories
 * @param {Object[]} stories - Array of stories with domain field
 * @returns {DomainStats} Domain statistics
 */
export function getDomainStats(stories) {
  const counts = {
    frontend: 0,
    backend: 0,
    fullstack: 0,
    qa: 0,
    devops: 0,
    design: 0
  };

  for (const story of stories) {
    const domain = story.domain || 'fullstack';
    if (counts[domain] !== undefined) {
      counts[domain]++;
    }
  }

  const total = stories.length;
  const percentages = {};

  for (const domain of STORY_DOMAINS) {
    percentages[domain] = total > 0
      ? Math.round((counts[domain] / total) * 100)
      : 0;
  }

  return {
    ...counts,
    total,
    percentages
  };
}

export default classifyStoryDomain;
