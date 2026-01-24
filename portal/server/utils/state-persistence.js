/**
 * Agent State Persistence (GAP-010)
 *
 * Persists agent decisions, constraints, and patterns across context window
 * resets. Supports memory pruning, queryable history, and export/import.
 *
 * Based on:
 * - LangChain Memory Patterns (short-term + long-term memory)
 * - OpenAI Assistants API Threads (persistent state)
 * - Anthropic Context Management (file-based memory)
 *
 * @see https://docs.langchain.com/oss/python/langchain/short-term-memory
 * @see https://platform.openai.com/docs/guides/conversation-state
 * @see https://anthropic.com/news/context-management
 */

import fs from 'fs';
import path from 'path';

// Error codes
export const STATE_PERSISTENCE_ERRORS = {
  INVALID_AGENT: 'invalid_agent',
  INVALID_WAVE: 'invalid_wave',
  MEMORY_NOT_FOUND: 'memory_not_found',
  INVALID_FORMAT: 'invalid_format',
  WRITE_ERROR: 'write_error'
};

// Valid agent names (matches existing schema)
export const VALID_AGENTS = [
  'fe-dev',
  'fe-dev-1',
  'fe-dev-2',
  'be-dev',
  'be-dev-1',
  'be-dev-2',
  'qa',
  'dev-fix',
  'cto',
  'pm',
  'merge'
];

/**
 * Validate agent name
 *
 * @param {string} agent - Agent name
 * @returns {boolean} True if valid
 */
function isValidAgent(agent) {
  if (!agent || typeof agent !== 'string') {
    return false;
  }
  // Check for path traversal attempts
  if (agent.includes('..') || agent.includes('/') || agent.includes('\\')) {
    return false;
  }
  return VALID_AGENTS.includes(agent);
}

/**
 * Validate wave number
 *
 * @param {number} wave - Wave number
 * @returns {boolean} True if valid
 */
function isValidWave(wave) {
  return typeof wave === 'number' && Number.isInteger(wave) && wave > 0;
}

/**
 * Get the memory file path for an agent and wave
 *
 * @param {string} projectPath - Path to project root
 * @param {string} agent - Agent name
 * @param {number} wave - Wave number
 * @returns {string} Memory file path
 */
function getMemoryPath(projectPath, agent, wave) {
  return path.join(projectPath, '.claude', 'agent-memory', `${agent}-wave${wave}.json`);
}

/**
 * Ensure memory directory exists
 *
 * @param {string} projectPath - Path to project root
 */
function ensureMemoryDir(projectPath) {
  const memoryDir = path.join(projectPath, '.claude', 'agent-memory');
  if (!fs.existsSync(memoryDir)) {
    fs.mkdirSync(memoryDir, { recursive: true });
  }
}

/**
 * Initialize empty memory structure
 *
 * @param {string} agent - Agent name
 * @param {number} wave - Wave number
 * @returns {Object} Empty memory structure
 */
function initMemoryStructure(agent, wave) {
  const now = new Date().toISOString();
  return {
    agent,
    wave,
    created_at: now,
    updated_at: now,
    decisions: [],
    constraints: [],
    patterns_used: [],
    context_hashes: []
  };
}

/**
 * Generate next decision ID
 *
 * @param {Array} decisions - Existing decisions
 * @returns {string} Next decision ID (DEC-001, DEC-002, etc.)
 */
function generateDecisionId(decisions) {
  const nextNum = decisions.length + 1;
  return `DEC-${String(nextNum).padStart(3, '0')}`;
}

/**
 * Save a decision to memory
 *
 * @param {string} projectPath - Path to project root
 * @param {string} agent - Agent name
 * @param {number} wave - Wave number
 * @param {string} decision - The decision made
 * @param {string} reason - Reason for the decision
 * @returns {Object} Result { success, decisionId, error }
 */
export function saveDecision(projectPath, agent, wave, decision, reason = 'No reason provided') {
  if (!isValidAgent(agent)) {
    return { success: false, error: STATE_PERSISTENCE_ERRORS.INVALID_AGENT };
  }

  if (!isValidWave(wave)) {
    return { success: false, error: STATE_PERSISTENCE_ERRORS.INVALID_WAVE };
  }

  try {
    ensureMemoryDir(projectPath);
    const memoryPath = getMemoryPath(projectPath, agent, wave);

    let memory;
    if (fs.existsSync(memoryPath)) {
      memory = JSON.parse(fs.readFileSync(memoryPath, 'utf-8'));
    } else {
      memory = initMemoryStructure(agent, wave);
    }

    const decisionId = generateDecisionId(memory.decisions);
    const newDecision = {
      id: decisionId,
      timestamp: new Date().toISOString(),
      decision,
      reason
    };

    memory.decisions.push(newDecision);
    memory.updated_at = new Date().toISOString();

    fs.writeFileSync(memoryPath, JSON.stringify(memory, null, 2));

    return { success: true, decisionId };
  } catch (e) {
    return { success: false, error: STATE_PERSISTENCE_ERRORS.WRITE_ERROR, message: e.message };
  }
}

/**
 * Load memory for an agent and wave
 *
 * @param {string} projectPath - Path to project root
 * @param {string} agent - Agent name
 * @param {number} wave - Wave number
 * @returns {Object|null} Memory object or null if not found
 */
export function loadMemory(projectPath, agent, wave) {
  const memoryPath = getMemoryPath(projectPath, agent, wave);

  if (!fs.existsSync(memoryPath)) {
    return null;
  }

  try {
    return JSON.parse(fs.readFileSync(memoryPath, 'utf-8'));
  } catch (e) {
    return null;
  }
}

/**
 * Add a constraint to memory
 *
 * @param {string} projectPath - Path to project root
 * @param {string} agent - Agent name
 * @param {number} wave - Wave number
 * @param {string} constraint - The constraint to add
 * @returns {Object} Result { success, error }
 */
export function addConstraint(projectPath, agent, wave, constraint) {
  if (!isValidAgent(agent)) {
    return { success: false, error: STATE_PERSISTENCE_ERRORS.INVALID_AGENT };
  }

  if (!isValidWave(wave)) {
    return { success: false, error: STATE_PERSISTENCE_ERRORS.INVALID_WAVE };
  }

  try {
    ensureMemoryDir(projectPath);
    const memoryPath = getMemoryPath(projectPath, agent, wave);

    let memory;
    if (fs.existsSync(memoryPath)) {
      memory = JSON.parse(fs.readFileSync(memoryPath, 'utf-8'));
    } else {
      memory = initMemoryStructure(agent, wave);
    }

    // Only add if not already present
    if (!memory.constraints.includes(constraint)) {
      memory.constraints.push(constraint);
      memory.updated_at = new Date().toISOString();
      fs.writeFileSync(memoryPath, JSON.stringify(memory, null, 2));
    }

    return { success: true };
  } catch (e) {
    return { success: false, error: STATE_PERSISTENCE_ERRORS.WRITE_ERROR, message: e.message };
  }
}

/**
 * Add a pattern to memory
 *
 * @param {string} projectPath - Path to project root
 * @param {string} agent - Agent name
 * @param {number} wave - Wave number
 * @param {string} name - Pattern name
 * @param {string} file - File where pattern is used
 * @returns {Object} Result { success, error }
 */
export function addPattern(projectPath, agent, wave, name, file) {
  if (!isValidAgent(agent)) {
    return { success: false, error: STATE_PERSISTENCE_ERRORS.INVALID_AGENT };
  }

  if (!isValidWave(wave)) {
    return { success: false, error: STATE_PERSISTENCE_ERRORS.INVALID_WAVE };
  }

  try {
    ensureMemoryDir(projectPath);
    const memoryPath = getMemoryPath(projectPath, agent, wave);

    let memory;
    if (fs.existsSync(memoryPath)) {
      memory = JSON.parse(fs.readFileSync(memoryPath, 'utf-8'));
    } else {
      memory = initMemoryStructure(agent, wave);
    }

    // Check if pattern already exists (same name and file)
    const exists = memory.patterns_used.some(p => p.name === name && p.file === file);

    if (!exists) {
      memory.patterns_used.push({
        name,
        file,
        added_at: new Date().toISOString()
      });
      memory.updated_at = new Date().toISOString();
      fs.writeFileSync(memoryPath, JSON.stringify(memory, null, 2));
    }

    return { success: true };
  } catch (e) {
    return { success: false, error: STATE_PERSISTENCE_ERRORS.WRITE_ERROR, message: e.message };
  }
}

/**
 * Query decisions across memory files
 *
 * @param {string} projectPath - Path to project root
 * @param {Object} filters - Query filters
 * @returns {Array} Matching decisions with agent and wave info
 */
export function queryDecisions(projectPath, filters = {}) {
  const { agent, wave, keyword, startDate, endDate } = filters;
  const results = [];

  const memoryDir = path.join(projectPath, '.claude', 'agent-memory');
  if (!fs.existsSync(memoryDir)) {
    return results;
  }

  const files = fs.readdirSync(memoryDir).filter(f => f.endsWith('.json'));

  for (const file of files) {
    try {
      const memory = JSON.parse(fs.readFileSync(path.join(memoryDir, file), 'utf-8'));

      // Filter by agent
      if (agent && memory.agent !== agent) {
        continue;
      }

      // Filter by wave
      if (wave !== undefined && memory.wave !== wave) {
        continue;
      }

      for (const decision of memory.decisions) {
        // Filter by keyword
        if (keyword && !decision.decision.toLowerCase().includes(keyword.toLowerCase())) {
          continue;
        }

        // Filter by date range
        if (startDate) {
          const decisionDate = new Date(decision.timestamp);
          if (decisionDate < new Date(startDate)) {
            continue;
          }
        }

        if (endDate) {
          const decisionDate = new Date(decision.timestamp);
          if (decisionDate > new Date(endDate)) {
            continue;
          }
        }

        results.push({
          ...decision,
          agent: memory.agent,
          wave: memory.wave
        });
      }
    } catch (e) {
      // Skip invalid files
    }
  }

  return results;
}

/**
 * Prune old decisions from memory
 *
 * @param {string} projectPath - Path to project root
 * @param {string} agent - Agent name
 * @param {number} wave - Wave number
 * @param {Object} options - Pruning options
 * @returns {Object} Result { success, prunedCount }
 */
export function pruneMemory(projectPath, agent, wave, options = {}) {
  const { maxAgeDays = 30, maxDecisions } = options;

  const memoryPath = getMemoryPath(projectPath, agent, wave);
  if (!fs.existsSync(memoryPath)) {
    return { success: true, prunedCount: 0 };
  }

  try {
    const memory = JSON.parse(fs.readFileSync(memoryPath, 'utf-8'));
    const originalCount = memory.decisions.length;

    // Filter by age
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - maxAgeDays);

    memory.decisions = memory.decisions.filter(d => {
      const decisionDate = new Date(d.timestamp);
      return decisionDate >= cutoffDate;
    });

    // If maxDecisions specified, keep only the most recent
    if (maxDecisions !== undefined && memory.decisions.length > maxDecisions) {
      // Sort by timestamp descending and keep most recent
      memory.decisions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      memory.decisions = memory.decisions.slice(0, maxDecisions);
    }

    const prunedCount = originalCount - memory.decisions.length;

    if (prunedCount > 0) {
      memory.updated_at = new Date().toISOString();
      fs.writeFileSync(memoryPath, JSON.stringify(memory, null, 2));
    }

    return { success: true, prunedCount };
  } catch (e) {
    return { success: false, prunedCount: 0, error: e.message };
  }
}

/**
 * Get a summary of memory contents
 *
 * @param {string} projectPath - Path to project root
 * @param {string} agent - Agent name
 * @param {number} wave - Wave number
 * @returns {Object|null} Summary or null if not found
 */
export function getMemorySummary(projectPath, agent, wave) {
  const memory = loadMemory(projectPath, agent, wave);
  if (!memory) {
    return null;
  }

  const createdAt = new Date(memory.created_at);
  const now = new Date();
  const ageDays = Math.floor((now - createdAt) / (24 * 60 * 60 * 1000));

  return {
    agent: memory.agent,
    wave: memory.wave,
    decisionCount: memory.decisions.length,
    constraintCount: memory.constraints.length,
    patternCount: memory.patterns_used.length,
    ageDays,
    createdAt: memory.created_at,
    lastUpdated: memory.updated_at
  };
}

/**
 * Clear memory for an agent and wave
 *
 * @param {string} projectPath - Path to project root
 * @param {string} agent - Agent name
 * @param {number} wave - Wave number
 * @returns {Object} Result { success }
 */
export function clearMemory(projectPath, agent, wave) {
  const memoryPath = getMemoryPath(projectPath, agent, wave);

  if (fs.existsSync(memoryPath)) {
    fs.unlinkSync(memoryPath);
  }

  return { success: true };
}

/**
 * Export memory as JSON string
 *
 * @param {string} projectPath - Path to project root
 * @param {string} agent - Agent name
 * @param {number} wave - Wave number
 * @returns {string|null} JSON string or null if not found
 */
export function exportMemory(projectPath, agent, wave) {
  const memory = loadMemory(projectPath, agent, wave);
  if (!memory) {
    return null;
  }
  return JSON.stringify(memory, null, 2);
}

/**
 * Import memory from JSON string
 *
 * @param {string} projectPath - Path to project root
 * @param {string} agent - Agent name
 * @param {number} wave - Wave number
 * @param {string} jsonString - JSON string to import
 * @param {Object} options - Import options
 * @returns {Object} Result { success, error }
 */
export function importMemory(projectPath, agent, wave, jsonString, options = {}) {
  const { merge = false } = options;

  let importedData;
  try {
    importedData = JSON.parse(jsonString);
  } catch (e) {
    return { success: false, error: STATE_PERSISTENCE_ERRORS.INVALID_FORMAT };
  }

  if (!isValidAgent(agent)) {
    return { success: false, error: STATE_PERSISTENCE_ERRORS.INVALID_AGENT };
  }

  if (!isValidWave(wave)) {
    return { success: false, error: STATE_PERSISTENCE_ERRORS.INVALID_WAVE };
  }

  try {
    ensureMemoryDir(projectPath);
    const memoryPath = getMemoryPath(projectPath, agent, wave);

    if (merge && fs.existsSync(memoryPath)) {
      const existingMemory = JSON.parse(fs.readFileSync(memoryPath, 'utf-8'));

      // Merge decisions
      const existingIds = new Set(existingMemory.decisions.map(d => d.id));
      for (const decision of importedData.decisions || []) {
        if (!existingIds.has(decision.id)) {
          existingMemory.decisions.push(decision);
        }
      }

      // Merge constraints
      for (const constraint of importedData.constraints || []) {
        if (!existingMemory.constraints.includes(constraint)) {
          existingMemory.constraints.push(constraint);
        }
      }

      // Merge patterns
      for (const pattern of importedData.patterns_used || []) {
        const exists = existingMemory.patterns_used.some(
          p => p.name === pattern.name && p.file === pattern.file
        );
        if (!exists) {
          existingMemory.patterns_used.push(pattern);
        }
      }

      existingMemory.updated_at = new Date().toISOString();
      fs.writeFileSync(memoryPath, JSON.stringify(existingMemory, null, 2));
    } else {
      // Overwrite with imported data, but ensure agent and wave match
      importedData.agent = agent;
      importedData.wave = wave;
      importedData.updated_at = new Date().toISOString();
      fs.writeFileSync(memoryPath, JSON.stringify(importedData, null, 2));
    }

    return { success: true };
  } catch (e) {
    return { success: false, error: STATE_PERSISTENCE_ERRORS.WRITE_ERROR, message: e.message };
  }
}

export default {
  saveDecision,
  loadMemory,
  addConstraint,
  addPattern,
  queryDecisions,
  pruneMemory,
  getMemorySummary,
  clearMemory,
  exportMemory,
  importMemory,
  STATE_PERSISTENCE_ERRORS,
  VALID_AGENTS
};
