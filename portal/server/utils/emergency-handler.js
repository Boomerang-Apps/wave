/**
 * Emergency Handler (GAP-015)
 *
 * Provides programmatic emergency level control (E1-E4) for the WAVE framework.
 * Mirrors the bash safe-termination.sh functionality in Node.js for portal integration.
 *
 * Emergency Levels:
 * - E1: Agent Stop (single agent)
 * - E2: Domain Stop (all agents in domain)
 * - E3: Wave Stop (all agents in wave)
 * - E4: System Stop (all agents)
 * - E5: Emergency Halt (security - handled separately)
 *
 * Based on:
 * - core/scripts/safe-termination.sh
 * - .claudecode/safety/EMERGENCY-LEVELS.md
 */

import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

const writeFileAsync = promisify(fs.writeFile);
const unlinkAsync = promisify(fs.unlink);

// ============================================
// Emergency Level Definitions
// ============================================

export const EMERGENCY_LEVELS = {
  E1: {
    level: 'E1',
    name: 'Agent Stop',
    description: 'Stop a single agent gracefully. Auto-retry possible after issue resolved.'
  },
  E2: {
    level: 'E2',
    name: 'Domain Stop',
    description: 'Stop all agents in a domain (frontend, backend, qa, devfix, management).'
  },
  E3: {
    level: 'E3',
    name: 'Wave Stop',
    description: 'Stop all agents in current wave. Use when wave is blocked by dependency.'
  },
  E4: {
    level: 'E4',
    name: 'System Stop',
    description: 'Stop all agents in the system. Creates EMERGENCY-STOP file.'
  },
  E5: {
    level: 'E5',
    name: 'Emergency Halt',
    description: 'Immediate halt for security incidents. No auto-restart. Requires human review.'
  }
};

// ============================================
// Domain and Wave Mappings
// ============================================

const DOMAIN_AGENTS = {
  frontend: ['fe-dev-1', 'fe-dev-2'],
  backend: ['be-dev-1', 'be-dev-2'],
  qa: ['qa'],
  devfix: ['dev-fix'],
  management: ['cto', 'pm']
};

const WAVE_AGENTS = {
  1: ['fe-dev-1', 'be-dev-1'],
  2: ['fe-dev-2', 'be-dev-2']
};

const ALL_AGENTS = ['cto', 'pm', 'fe-dev-1', 'fe-dev-2', 'be-dev-1', 'be-dev-2', 'qa', 'dev-fix'];

/**
 * Get agents in a domain
 * @param {string} domain - Domain name
 * @returns {string[]|null} Agent list or null
 */
export function getAgentsInDomain(domain) {
  return DOMAIN_AGENTS[domain] || null;
}

/**
 * Get agents in a wave
 * @param {number} waveNumber - Wave number
 * @returns {string[]|null} Agent list or null
 */
export function getAgentsInWave(waveNumber) {
  return WAVE_AGENTS[waveNumber] || null;
}

// ============================================
// Emergency Handler Class
// ============================================

export class EmergencyHandler {
  constructor(options = {}) {
    this.claudeDir = options.claudeDir || '.claude';
    this.history = [];
    this.emergencyCallback = null;
    this.activeEmergencies = new Map(); // level -> { agents, target, timestamp }
  }

  /**
   * Set callback for emergency events
   * @param {Function} callback - Callback function
   */
  onEmergency(callback) {
    this.emergencyCallback = callback;
  }

  /**
   * Create stop signal file for an agent
   * @param {string} agentId - Agent ID
   * @param {string} reason - Stop reason
   * @param {string} level - Emergency level
   */
  async _createAgentStopSignal(agentId, reason, level) {
    const signalFile = path.join(this.claudeDir, `signal-${agentId}-stop.json`);

    const signal = {
      signal_type: 'stop',
      target_agent: agentId,
      emergency_level: level,
      reason: reason,
      timestamp: new Date().toISOString(),
      action_required: 'graceful_shutdown'
    };

    await writeFileAsync(signalFile, JSON.stringify(signal, null, 2), 'utf8');
  }

  /**
   * Create wave stop signal file
   * @param {number} waveNumber - Wave number
   * @param {string} reason - Stop reason
   */
  async _createWaveStopSignal(waveNumber, reason) {
    const signalFile = path.join(this.claudeDir, `signal-wave${waveNumber}-stop.json`);

    const signal = {
      signal_type: 'wave-stop',
      wave: waveNumber,
      reason: reason,
      timestamp: new Date().toISOString()
    };

    await writeFileAsync(signalFile, JSON.stringify(signal, null, 2), 'utf8');
  }

  /**
   * Create EMERGENCY-STOP file
   * @param {string} reason - Stop reason
   * @param {string} level - Emergency level
   */
  async _createEmergencyStopFile(reason, level) {
    const stopFile = path.join(this.claudeDir, 'EMERGENCY-STOP');

    const content = [
      'EMERGENCY STOP ACTIVATED',
      '========================',
      `Level: ${level}`,
      `Time: ${new Date().toISOString()}`,
      `Reason: ${reason}`,
      '',
      'All agents must halt immediately.',
      'Check for EMERGENCY-STOP file before any operation.'
    ].join('\n');

    await writeFileAsync(stopFile, content, 'utf8');
  }

  /**
   * Record event in history
   * @param {Object} event - Event data
   */
  _recordHistory(event) {
    this.history.push({
      ...event,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Invoke emergency callback
   * @param {Object} data - Event data
   */
  _notifyCallback(data) {
    if (this.emergencyCallback) {
      this.emergencyCallback(data);
    }
  }

  /**
   * E1: Agent Stop - Stop a single agent
   * @param {string} agentId - Agent ID
   * @param {string} reason - Stop reason
   * @returns {Object} Result with affected agents
   */
  async triggerE1(agentId, reason) {
    await this._createAgentStopSignal(agentId, reason, 'E1');

    const result = {
      level: 'E1',
      target: agentId,
      reason: reason,
      affectedAgents: [agentId]
    };

    this._recordHistory({ ...result, action: 'trigger' });
    this._notifyCallback(result);

    this.activeEmergencies.set('E1', {
      agents: [agentId],
      target: agentId,
      timestamp: new Date().toISOString()
    });

    return result;
  }

  /**
   * E2: Domain Stop - Stop all agents in a domain
   * @param {string} domain - Domain name
   * @param {string} reason - Stop reason
   * @returns {Object} Result with affected agents
   */
  async triggerE2(domain, reason) {
    const agents = getAgentsInDomain(domain);

    if (!agents) {
      throw new Error(`Unknown domain: ${domain}`);
    }

    // Create stop signals for all domain agents
    for (const agentId of agents) {
      await this._createAgentStopSignal(agentId, `Domain stop: ${reason}`, 'E2');
    }

    const result = {
      level: 'E2',
      target: domain,
      reason: reason,
      affectedAgents: agents
    };

    this._recordHistory({ ...result, action: 'trigger' });
    this._notifyCallback(result);

    this.activeEmergencies.set('E2', {
      agents: agents,
      target: domain,
      timestamp: new Date().toISOString()
    });

    return result;
  }

  /**
   * E3: Wave Stop - Stop all agents in a wave
   * @param {number} waveNumber - Wave number
   * @param {string} reason - Stop reason
   * @returns {Object} Result with affected agents
   */
  async triggerE3(waveNumber, reason) {
    const agents = getAgentsInWave(waveNumber);

    if (!agents) {
      throw new Error(`Unknown wave: ${waveNumber}`);
    }

    // Create stop signals for all wave agents
    for (const agentId of agents) {
      await this._createAgentStopSignal(agentId, `Wave stop: ${reason}`, 'E3');
    }

    // Create wave stop signal
    await this._createWaveStopSignal(waveNumber, reason);

    const result = {
      level: 'E3',
      target: `wave-${waveNumber}`,
      reason: reason,
      affectedAgents: agents
    };

    this._recordHistory({ ...result, action: 'trigger' });
    this._notifyCallback(result);

    this.activeEmergencies.set('E3', {
      agents: agents,
      target: waveNumber,
      timestamp: new Date().toISOString()
    });

    return result;
  }

  /**
   * E4: System Stop - Stop all agents
   * @param {string} reason - Stop reason
   * @returns {Object} Result with affected agents
   */
  async triggerE4(reason) {
    if (!reason || reason.trim() === '') {
      throw new Error('Reason required for E4 system stop');
    }

    // Create EMERGENCY-STOP file
    await this._createEmergencyStopFile(reason, 'E4');

    // Create stop signals for all agents
    for (const agentId of ALL_AGENTS) {
      await this._createAgentStopSignal(agentId, `System stop: ${reason}`, 'E4');
    }

    const result = {
      level: 'E4',
      target: 'system',
      reason: reason,
      affectedAgents: [...ALL_AGENTS]
    };

    this._recordHistory({ ...result, action: 'trigger' });
    this._notifyCallback(result);

    this.activeEmergencies.set('E4', {
      agents: [...ALL_AGENTS],
      target: 'system',
      timestamp: new Date().toISOString()
    });

    return result;
  }

  /**
   * Get current emergency status
   * @returns {Object} Status with current level and affected agents
   */
  getEmergencyStatus() {
    const isActive = this.activeEmergencies.size > 0;

    if (!isActive) {
      return {
        isActive: false,
        currentLevel: null,
        affectedAgents: []
      };
    }

    // Find highest level
    const levelOrder = ['E1', 'E2', 'E3', 'E4', 'E5'];
    let highestLevel = null;
    let highestAgents = [];

    for (const level of levelOrder) {
      if (this.activeEmergencies.has(level)) {
        highestLevel = level;
        highestAgents = this.activeEmergencies.get(level).agents;
      }
    }

    return {
      isActive: true,
      currentLevel: highestLevel,
      affectedAgents: highestAgents
    };
  }

  /**
   * Get escalation history
   * @returns {Array} History of emergency events
   */
  getEscalationHistory() {
    return [...this.history];
  }

  /**
   * Clear an emergency
   * @param {string} level - Emergency level to clear
   * @param {Object} options - Options with confirmation
   */
  async clearEmergency(level, options = {}) {
    if (!options.confirm) {
      throw new Error('Confirmation required to clear emergency. Pass { confirm: true }');
    }

    const clearActions = [];

    switch (level) {
      case 'E1': {
        if (!options.agentId) {
          throw new Error('agentId required to clear E1');
        }
        const signalFile = path.join(this.claudeDir, `signal-${options.agentId}-stop.json`);
        if (fs.existsSync(signalFile)) {
          await unlinkAsync(signalFile);
        }
        clearActions.push(`Removed signal for ${options.agentId}`);
        break;
      }

      case 'E2': {
        if (!options.domain) {
          throw new Error('domain required to clear E2');
        }
        const agents = getAgentsInDomain(options.domain);
        if (agents) {
          for (const agentId of agents) {
            const signalFile = path.join(this.claudeDir, `signal-${agentId}-stop.json`);
            if (fs.existsSync(signalFile)) {
              await unlinkAsync(signalFile);
            }
          }
        }
        clearActions.push(`Removed signals for domain ${options.domain}`);
        break;
      }

      case 'E3': {
        if (!options.wave) {
          throw new Error('wave required to clear E3');
        }
        const agents = getAgentsInWave(options.wave);
        if (agents) {
          for (const agentId of agents) {
            const signalFile = path.join(this.claudeDir, `signal-${agentId}-stop.json`);
            if (fs.existsSync(signalFile)) {
              await unlinkAsync(signalFile);
            }
          }
        }
        // Remove wave signal
        const waveSignal = path.join(this.claudeDir, `signal-wave${options.wave}-stop.json`);
        if (fs.existsSync(waveSignal)) {
          await unlinkAsync(waveSignal);
        }
        clearActions.push(`Removed signals for wave ${options.wave}`);
        break;
      }

      case 'E4': {
        // Remove EMERGENCY-STOP file
        const stopFile = path.join(this.claudeDir, 'EMERGENCY-STOP');
        if (fs.existsSync(stopFile)) {
          await unlinkAsync(stopFile);
        }

        // Remove all agent stop signals
        for (const agentId of ALL_AGENTS) {
          const signalFile = path.join(this.claudeDir, `signal-${agentId}-stop.json`);
          if (fs.existsSync(signalFile)) {
            await unlinkAsync(signalFile);
          }
        }
        clearActions.push('Removed EMERGENCY-STOP and all agent signals');
        break;
      }

      default:
        throw new Error(`Unknown level: ${level}`);
    }

    // Remove from active emergencies
    this.activeEmergencies.delete(level);

    // Record in history
    this._recordHistory({
      level: level,
      action: 'clear',
      actions: clearActions
    });
  }

  /**
   * Check if any emergency is active
   * @returns {boolean} True if emergency is active
   */
  isEmergencyActive() {
    // Check for EMERGENCY-STOP file
    const stopFile = path.join(this.claudeDir, 'EMERGENCY-STOP');
    if (fs.existsSync(stopFile)) {
      return true;
    }

    return this.activeEmergencies.size > 0;
  }

  /**
   * Reset all state and history
   */
  reset() {
    this.history = [];
    this.activeEmergencies.clear();
  }
}

export default EmergencyHandler;
