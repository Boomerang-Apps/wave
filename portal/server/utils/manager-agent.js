/**
 * Manager Agent (Grok Recommendation G5.1)
 *
 * Coordinates agent delegation and consensus (CrewAI Hierarchical Pattern)
 *
 * Reference: https://docs.crewai.com/core-concepts/Hierarchical-Process
 */

// ============================================
// Manager Agent Configuration
// ============================================

/**
 * Manager agent configuration
 */
export const MANAGER_AGENT = {
  id: 'manager',
  type: 'orchestrator',
  capabilities: [
    'delegate_tasks',
    'resolve_conflicts',
    'escalate_to_human',
    'reassign_work',
    'approve_completion'
  ],

  // Delegation rules
  delegation: {
    frontend: ['fe-dev-1', 'fe-dev-2'],
    backend: ['be-dev-1', 'be-dev-2'],
    qa: ['qa'],
    devops: ['devops'],

    // Fallback chain
    fallback: {
      'fe-dev-1': 'fe-dev-2',
      'fe-dev-2': 'fe-dev-1',
      'be-dev-1': 'be-dev-2',
      'be-dev-2': 'be-dev-1'
    }
  }
};

// ============================================
// Delegation Functions
// ============================================

/**
 * Delegate a task to an agent
 * @param {Object} task - Task to delegate
 * @param {Object} context - Current context
 * @returns {Object} Delegation result
 */
export function delegateTask(task, context) {
  const { domain } = task;
  const { currentWorkload = {} } = context;

  // Get eligible agents for domain
  const eligible = getEligibleAgents(domain);

  // Select least loaded agent
  const selected = selectLeastLoaded(eligible, currentWorkload);

  return {
    taskId: task.id,
    assignedTo: selected,
    delegatedBy: 'manager',
    delegatedAt: new Date().toISOString(),
    fallback: MANAGER_AGENT.delegation.fallback[selected] || null
  };
}

/**
 * Handle agent failure with fallback
 * @param {string} agentId - Failed agent ID
 * @param {string} taskId - Task ID
 * @param {Object} context - Current context
 * @returns {Object} Failure handling result
 */
export function handleAgentFailure(agentId, taskId, context) {
  const fallback = MANAGER_AGENT.delegation.fallback[agentId];

  if (fallback) {
    return {
      action: 'reassign',
      from: agentId,
      to: fallback,
      taskId,
      reason: 'Agent failure - automatic fallback'
    };
  }

  return {
    action: 'escalate',
    to: 'human',
    taskId,
    reason: `No fallback available for ${agentId}`
  };
}

/**
 * Get eligible agents for a domain
 * @param {string} domain - Task domain
 * @returns {string[]} Eligible agent IDs
 */
export function getEligibleAgents(domain) {
  return MANAGER_AGENT.delegation[domain] || [];
}

/**
 * Select least loaded agent from list
 * @param {string[]} agents - Agent IDs
 * @param {Object} workload - Current workload map
 * @returns {string} Selected agent ID
 */
export function selectLeastLoaded(agents, workload) {
  if (agents.length === 0) {
    return null;
  }

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

export default MANAGER_AGENT;
