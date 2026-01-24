/**
 * Validation Persistence Module (Pre-Flight Checklist)
 *
 * Handles saving and loading validation states to/from the database.
 * Supports multiple validation types: foundation, safety, slack, build_qa
 *
 * Storage Pattern:
 * - Validations are stored in wave_project_config.config JSONB
 * - Each type is stored under a key like _foundation, _safety, etc.
 * - Timestamps are stored in ISO format
 */

// ============================================
// Constants
// ============================================

export const VALIDATION_TYPES = {
  FOUNDATION: 'foundation',
  SAFETY: 'safety',
  SLACK: 'slack',
  BUILD_QA: 'build_qa',
  AGENT_DISPATCH: 'agent_dispatch',
  AUDIT_LOG: 'audit_log'
};

export const PERSISTENCE_ERRORS = {
  PROJECT_ID_REQUIRED: 'Project ID is required',
  VALIDATION_TYPE_INVALID: 'Invalid validation type',
  SAVE_FAILED: 'Failed to save validation to database',
  LOAD_FAILED: 'Failed to load validation from database'
};

const VALID_TYPES = Object.values(VALIDATION_TYPES);
const VALID_CHECK_STATUSES = ['pass', 'fail', 'warn', 'skip'];
const VALID_RESULT_STATUSES = ['idle', 'validating', 'ready', 'blocked'];

// ============================================
// ValidationCheck Helper
// ============================================

export const ValidationCheck = {
  /**
   * Create a validation check with sanitization
   */
  create({ name, status, message = null, details = null }) {
    return {
      name: this.sanitizeName(name),
      status: VALID_CHECK_STATUSES.includes(status) ? status : 'skip',
      message: message || null,
      details: details || null
    };
  },

  /**
   * Check if a status value is valid
   */
  isValidStatus(status) {
    return VALID_CHECK_STATUSES.includes(status);
  },

  /**
   * Sanitize check name to prevent XSS
   */
  sanitizeName(name) {
    if (!name) return 'Unknown';
    return name
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
  }
};

// ============================================
// ValidationResult Helper
// ============================================

export const ValidationResult = {
  /**
   * Create a validation result with computed values
   */
  create({ status, checks = [], last_checked = null }) {
    const normalizedChecks = checks.map(c => ValidationCheck.create(c));
    const counts = this.calculateCounts(normalizedChecks);
    const percentage = counts.total > 0
      ? Math.round((counts.passed / counts.total) * 100)
      : 100;

    return {
      status: VALID_RESULT_STATUSES.includes(status) ? status : 'idle',
      checks: normalizedChecks,
      last_checked: last_checked || new Date().toISOString(),
      counts,
      percentage
    };
  },

  /**
   * Check if a result status value is valid
   */
  isValidStatus(status) {
    return VALID_RESULT_STATUSES.includes(status);
  },

  /**
   * Calculate check counts
   */
  calculateCounts(checks) {
    return {
      passed: checks.filter(c => c.status === 'pass').length,
      failed: checks.filter(c => c.status === 'fail').length,
      warned: checks.filter(c => c.status === 'warn').length,
      skipped: checks.filter(c => c.status === 'skip').length,
      total: checks.length
    };
  },

  /**
   * Format timestamp for display
   */
  formatTimestamp(timestamp, options = {}) {
    if (!timestamp) return 'Never';

    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return 'Invalid date';

    if (options.relative) {
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
      if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
      if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    }

    return date.toLocaleString();
  }
};

// ============================================
// ValidationPersistence Class
// ============================================

export class ValidationPersistence {
  constructor(supabase) {
    this.supabase = supabase;
  }

  /**
   * Get the config key for a validation type
   */
  getConfigKey(type) {
    return `_${type}`;
  }

  /**
   * Validate parameters before database operations
   */
  validateParams(projectId, type) {
    if (!projectId) {
      return { valid: false, error: PERSISTENCE_ERRORS.PROJECT_ID_REQUIRED };
    }
    if (!VALID_TYPES.includes(type)) {
      return { valid: false, error: PERSISTENCE_ERRORS.VALIDATION_TYPE_INVALID };
    }
    return { valid: true };
  }

  /**
   * Save validation state to database
   */
  async saveValidation(projectId, type, data) {
    const validation = this.validateParams(projectId, type);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    try {
      // Load existing config
      const { data: existingData, error: loadError } = await this.supabase
        .from('wave_project_config')
        .select('config')
        .eq('project_id', projectId)
        .single();

      // Existing config or empty object
      const existingConfig = existingData?.config || {};

      // Create validated result
      const validatedResult = ValidationResult.create(data);

      // Merge with existing config
      const configKey = this.getConfigKey(type);
      const updatedConfig = {
        ...existingConfig,
        [configKey]: {
          status: validatedResult.status,
          checks: validatedResult.checks,
          last_checked: validatedResult.last_checked
        }
      };

      // Save to database
      const { error: saveError } = await this.supabase
        .from('wave_project_config')
        .upsert({
          project_id: projectId,
          config: updatedConfig,
          updated_at: new Date().toISOString()
        }, { onConflict: 'project_id' });

      if (saveError) {
        console.error('Database save error:', saveError);
        return { success: false, error: PERSISTENCE_ERRORS.SAVE_FAILED };
      }

      return { success: true, data: validatedResult };

    } catch (err) {
      console.error('Validation persistence error:', err);
      return { success: false, error: PERSISTENCE_ERRORS.SAVE_FAILED };
    }
  }

  /**
   * Load validation state from database
   */
  async loadValidation(projectId, type) {
    const validation = this.validateParams(projectId, type);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    try {
      const { data: configData, error } = await this.supabase
        .from('wave_project_config')
        .select('config')
        .eq('project_id', projectId)
        .single();

      if (error) {
        console.error('Database load error:', error);
        return { success: false, error: PERSISTENCE_ERRORS.LOAD_FAILED };
      }

      if (!configData?.config) {
        return { success: true, data: null };
      }

      const configKey = this.getConfigKey(type);
      const validationData = configData.config[configKey];

      if (!validationData) {
        return { success: true, data: null };
      }

      return { success: true, data: validationData };

    } catch (err) {
      console.error('Validation load error:', err);
      return { success: false, error: PERSISTENCE_ERRORS.LOAD_FAILED };
    }
  }

  /**
   * Load all validation types at once
   */
  async loadAllValidations(projectId) {
    if (!projectId) {
      return { success: false, error: PERSISTENCE_ERRORS.PROJECT_ID_REQUIRED };
    }

    try {
      const { data: configData, error } = await this.supabase
        .from('wave_project_config')
        .select('config')
        .eq('project_id', projectId)
        .single();

      if (error) {
        console.error('Database load error:', error);
        return { success: false, error: PERSISTENCE_ERRORS.LOAD_FAILED };
      }

      const config = configData?.config || {};

      return {
        success: true,
        data: {
          foundation: config._foundation || null,
          safety: config._safety || null,
          slack: config._slack || null,
          build_qa: config._build_qa || null,
          agent_dispatch: config._agent_dispatch || null,
          audit_log: config._audit_log || null
        }
      };

    } catch (err) {
      console.error('Load all validations error:', err);
      return { success: false, error: PERSISTENCE_ERRORS.LOAD_FAILED };
    }
  }

  /**
   * Get pre-flight summary (overall readiness status)
   */
  async getPreFlightSummary(projectId) {
    const result = await this.loadAllValidations(projectId);

    if (!result.success) {
      return {
        ready: false,
        blockers: [{ type: 'system', message: result.error }],
        percentage: 0
      };
    }

    const validations = result.data;
    const blockers = [];
    let totalPassed = 0;
    let totalChecks = 0;

    // Required validations
    const requiredTypes = ['foundation', 'safety'];

    for (const type of requiredTypes) {
      const validation = validations[type];

      if (!validation) {
        blockers.push({
          type,
          message: `${type} validation has not been run`
        });
        continue;
      }

      if (validation.status === 'blocked') {
        blockers.push({
          type,
          message: `${type} validation is blocked`,
          checks: validation.checks?.filter(c => c.status === 'fail') || []
        });
      }

      // Count checks for percentage
      const checks = validation.checks || [];
      totalPassed += checks.filter(c => c.status === 'pass').length;
      totalChecks += checks.length;
    }

    // Optional validations (count toward percentage but not blockers)
    const optionalTypes = ['slack', 'build_qa'];
    for (const type of optionalTypes) {
      const validation = validations[type];
      if (validation?.checks) {
        totalPassed += validation.checks.filter(c => c.status === 'pass').length;
        totalChecks += validation.checks.length;
      }
    }

    return {
      ready: blockers.length === 0,
      blockers,
      percentage: totalChecks > 0 ? Math.round((totalPassed / totalChecks) * 100) : 0,
      lastUpdated: new Date().toISOString()
    };
  }

  /**
   * Clear validation data for a specific type
   */
  async clearValidation(projectId, type) {
    const validation = this.validateParams(projectId, type);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    try {
      // Load existing config
      const { data: existingData, error: loadError } = await this.supabase
        .from('wave_project_config')
        .select('config')
        .eq('project_id', projectId)
        .single();

      const existingConfig = existingData?.config || {};
      const configKey = this.getConfigKey(type);

      // Remove the validation data
      const { [configKey]: removed, ...updatedConfig } = existingConfig;

      // Save updated config
      const { error: saveError } = await this.supabase
        .from('wave_project_config')
        .upsert({
          project_id: projectId,
          config: updatedConfig,
          updated_at: new Date().toISOString()
        }, { onConflict: 'project_id' });

      if (saveError) {
        return { success: false, error: PERSISTENCE_ERRORS.SAVE_FAILED };
      }

      return { success: true };

    } catch (err) {
      console.error('Clear validation error:', err);
      return { success: false, error: PERSISTENCE_ERRORS.SAVE_FAILED };
    }
  }
}

export default ValidationPersistence;
