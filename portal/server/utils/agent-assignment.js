/**
 * Agent Assignment Logic Module (Launch Sequence)
 *
 * Phase 4, Step 4.3: Agent Assignment Logic
 *
 * Assigns stories to agents based on domain and load balancing.
 */

// ============================================
// Constants
// ============================================

/**
 * Available agent types
 */
export const AGENT_TYPES = [
  'fe-dev-1',
  'fe-dev-2',
  'be-dev-1',
  'be-dev-2',
  'qa',
  'devops'
];

/**
 * Map of domains to eligible agents
 */
export const AGENT_DOMAIN_MAP = {
  frontend: ['fe-dev-1', 'fe-dev-2'],
  backend: ['be-dev-1', 'be-dev-2'],
  fullstack: ['fe-dev-1', 'fe-dev-2', 'be-dev-1', 'be-dev-2'],
  qa: ['qa'],
  devops: ['devops'],
  design: ['fe-dev-1', 'fe-dev-2']
};

// ============================================
// Agent Selection
// ============================================

/**
 * Get eligible agents for a domain
 * @param {string} domain - Story domain
 * @returns {string[]} Array of eligible agent IDs
 */
export function getAgentsForDomain(domain) {
  const agents = AGENT_DOMAIN_MAP[domain];
  if (agents && agents.length > 0) {
    return agents;
  }
  // Default fallback to fullstack agents
  return AGENT_DOMAIN_MAP.fullstack;
}

/**
 * Select the best agent from a list based on workload
 * @param {string[]} agents - Eligible agents
 * @param {Object<string, number>} workload - Current workload per agent
 * @returns {string} Selected agent ID
 */
function selectLeastLoadedAgent(agents, workload = {}) {
  let minLoad = Infinity;
  let selected = agents[0];

  for (const agent of agents) {
    const load = workload[agent] || 0;
    if (load < minLoad) {
      minLoad = load;
      selected = agent;
    }
  }

  return selected;
}

// ============================================
// Assignment Functions
// ============================================

/**
 * @typedef {Object} StoryAssignment
 * @property {string} storyId - Story ID
 * @property {string} agent - Assigned agent ID
 * @property {string} [domain] - Story domain
 * @property {string} [assignedAt] - Assignment timestamp
 */

/**
 * Assign a single story to an agent
 * @param {Object} story - Story object
 * @param {Object} [options] - Options
 * @param {Object<string, number>} [options.workload] - Current workload per agent
 * @returns {StoryAssignment}
 */
export function assignStoryToAgent(story, options = {}) {
  const { workload = {} } = options;

  // Use explicit assignment if provided
  if (story.assignedAgent && AGENT_TYPES.includes(story.assignedAgent)) {
    return {
      storyId: story.id,
      agent: story.assignedAgent,
      domain: story.domain,
      assignedAt: new Date().toISOString()
    };
  }

  // Get eligible agents for domain
  const domain = story.domain || 'fullstack';
  const eligibleAgents = getAgentsForDomain(domain);

  // Select least loaded agent
  const agent = selectLeastLoadedAgent(eligibleAgents, workload);

  return {
    storyId: story.id,
    agent,
    domain,
    assignedAt: new Date().toISOString()
  };
}

/**
 * Assign all stories to agents
 * @param {Object[]} stories - Array of story objects
 * @returns {Object[]} Stories with assignments
 */
export function assignAllStories(stories) {
  const workload = {};
  const assignments = [];

  // Initialize workload
  for (const agent of AGENT_TYPES) {
    workload[agent] = 0;
  }

  for (const story of stories) {
    const assignment = assignStoryToAgent(story, { workload });

    // Update workload
    workload[assignment.agent]++;

    // Merge story data with assignment
    assignments.push({
      ...story,
      ...assignment
    });
  }

  return assignments;
}

// ============================================
// Workload Functions
// ============================================

/**
 * Get current workload per agent
 * @param {Object[]} assignments - Array of assignments
 * @param {Object} [options] - Options
 * @param {boolean} [options.useHours] - Use estimated hours instead of count
 * @returns {Object<string, number>} Workload per agent
 */
export function getAgentWorkload(assignments, options = {}) {
  const { useHours = false } = options;
  const workload = {};

  // Initialize all agents to 0
  for (const agent of AGENT_TYPES) {
    workload[agent] = 0;
  }

  for (const assignment of assignments) {
    const agent = assignment.agent;
    if (agent) {
      if (useHours && assignment.estimatedHours) {
        workload[agent] += assignment.estimatedHours;
      } else {
        workload[agent]++;
      }
    }
  }

  return workload;
}

// ============================================
// Load Balancing
// ============================================

/**
 * Rebalance workload across agents
 * @param {Object[]} assignments - Array of assignments
 * @returns {Object[]} Rebalanced assignments
 */
export function balanceWorkload(assignments) {
  if (assignments.length === 0) return [];

  // Group assignments by domain
  const byDomain = {};
  for (const assignment of assignments) {
    const domain = assignment.domain || 'fullstack';
    if (!byDomain[domain]) {
      byDomain[domain] = [];
    }
    byDomain[domain].push(assignment);
  }

  // Rebalance each domain independently
  const balanced = [];

  for (const [domain, domainAssignments] of Object.entries(byDomain)) {
    const eligibleAgents = getAgentsForDomain(domain);
    const workload = {};

    for (const agent of eligibleAgents) {
      workload[agent] = 0;
    }

    // Reassign stories in round-robin fashion
    for (const assignment of domainAssignments) {
      const agent = selectLeastLoadedAgent(eligibleAgents, workload);
      workload[agent]++;

      balanced.push({
        ...assignment,
        agent
      });
    }
  }

  return balanced;
}

export default assignStoryToAgent;
