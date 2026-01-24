/**
 * State Persistence Base Class (CQ-011)
 *
 * Provides centralized state persistence logic to eliminate duplicate
 * implementations across the codebase.
 *
 * Features:
 * - JSON file persistence
 * - Auto-save support
 * - State versioning and migrations
 * - Event callbacks
 */

import fs from 'fs';
import path from 'path';

// ─────────────────────────────────────────────────────────────────────────────
// BASE CLASS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Abstract base class for state persistence
 */
export class StatePersistenceBase {
  /**
   * @param {string} filePath - Path to persistence file
   * @param {*} defaultState - Default state value
   * @param {Object} [options] - Options
   */
  constructor(filePath, defaultState, options = {}) {
    this.filePath = filePath;
    this.defaultState = this._clone(defaultState);
    this._state = this._clone(defaultState);
    this._dirty = false;
    this._callbacks = {
      change: [],
      save: [],
      load: []
    };
  }

  /**
   * Get current state (returns a copy)
   * @returns {*}
   */
  get state() {
    return this._state;
  }

  /**
   * Check if state has unsaved changes
   * @returns {boolean}
   */
  get isDirty() {
    return this._dirty;
  }

  /**
   * Set entire state
   * @param {*} newState - New state
   */
  setState(newState) {
    const oldState = this._state;
    this._state = this._clone(newState);
    this._dirty = true;
    this._emit('change', this._state, oldState);
  }

  /**
   * Merge partial state (for object states)
   * @param {Object} partial - Partial state to merge
   */
  mergeState(partial) {
    if (typeof this._state !== 'object' || this._state === null) {
      throw new Error('mergeState requires object state');
    }

    const oldState = this._state;
    this._state = { ...this._state, ...partial };
    this._dirty = true;
    this._emit('change', this._state, oldState);
  }

  /**
   * Reset to default state
   */
  reset() {
    const oldState = this._state;
    this._state = this._clone(this.defaultState);
    this._dirty = true;
    this._emit('change', this._state, oldState);
  }

  /**
   * Save state (abstract - implement in subclass)
   * @returns {Promise<void>}
   */
  async save() {
    throw new Error('save() must be implemented by subclass');
  }

  /**
   * Load state (abstract - implement in subclass)
   * @returns {Promise<void>}
   */
  async load() {
    throw new Error('load() must be implemented by subclass');
  }

  /**
   * Register change callback
   * @param {Function} callback - Function(newState, oldState)
   * @returns {Function} Unsubscribe function
   */
  onChange(callback) {
    this._callbacks.change.push(callback);
    return () => {
      const idx = this._callbacks.change.indexOf(callback);
      if (idx >= 0) this._callbacks.change.splice(idx, 1);
    };
  }

  /**
   * Register save callback
   * @param {Function} callback - Function()
   * @returns {Function} Unsubscribe function
   */
  onSave(callback) {
    this._callbacks.save.push(callback);
    return () => {
      const idx = this._callbacks.save.indexOf(callback);
      if (idx >= 0) this._callbacks.save.splice(idx, 1);
    };
  }

  /**
   * Register load callback
   * @param {Function} callback - Function()
   * @returns {Function} Unsubscribe function
   */
  onLoad(callback) {
    this._callbacks.load.push(callback);
    return () => {
      const idx = this._callbacks.load.indexOf(callback);
      if (idx >= 0) this._callbacks.load.splice(idx, 1);
    };
  }

  /**
   * Emit event to callbacks
   * @private
   */
  _emit(event, ...args) {
    for (const callback of this._callbacks[event] || []) {
      try {
        callback(...args);
      } catch (e) {
        console.error(`[StatePersistence] Callback error:`, e.message);
      }
    }
  }

  /**
   * Deep clone a value
   * @private
   */
  _clone(value) {
    if (value === null || value === undefined) {
      return value;
    }
    return JSON.parse(JSON.stringify(value));
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// JSON STATE PERSISTENCE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * JSON file-based state persistence
 */
export class JsonStatePersistence extends StatePersistenceBase {
  /**
   * @param {string} filePath - Path to JSON file
   * @param {*} defaultState - Default state
   * @param {Object} [options] - Options
   * @param {number} [options.indent=0] - JSON indentation
   * @param {boolean} [options.autoSave=false] - Enable auto-save
   * @param {number} [options.autoSaveInterval=30000] - Auto-save interval
   */
  constructor(filePath, defaultState, options = {}) {
    super(filePath, defaultState, options);

    this.indent = options.indent || 0;
    this._autoSaveInterval = null;

    if (options.autoSave) {
      this.startAutoSave(options.autoSaveInterval || 30000);
    }
  }

  /**
   * Save state to JSON file
   * @returns {Promise<void>}
   */
  async save() {
    // Ensure directory exists
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Write atomically
    const tempPath = `${this.filePath}.tmp`;
    const content = JSON.stringify(this._state, null, this.indent);
    fs.writeFileSync(tempPath, content, 'utf8');
    fs.renameSync(tempPath, this.filePath);

    this._dirty = false;
    this._emit('save');
  }

  /**
   * Load state from JSON file
   * @returns {Promise<void>}
   */
  async load() {
    try {
      if (!fs.existsSync(this.filePath)) {
        // Use default state
        return;
      }

      const content = fs.readFileSync(this.filePath, 'utf8');
      this._state = JSON.parse(content);
      this._dirty = false;
      this._emit('load');
    } catch (error) {
      // On error, use default state
      console.error('[JsonStatePersistence] Load error:', error.message);
      this._state = this._clone(this.defaultState);
    }
  }

  /**
   * Start auto-save interval
   * @param {number} intervalMs - Interval in milliseconds
   */
  startAutoSave(intervalMs) {
    if (this._autoSaveInterval) {
      return;
    }

    this._autoSaveInterval = setInterval(async () => {
      if (this._dirty) {
        await this.save();
      }
    }, intervalMs);

    // Don't prevent process exit
    if (this._autoSaveInterval.unref) {
      this._autoSaveInterval.unref();
    }
  }

  /**
   * Stop auto-save interval
   */
  stopAutoSave() {
    if (this._autoSaveInterval) {
      clearInterval(this._autoSaveInterval);
      this._autoSaveInterval = null;
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// VERSIONED STATE PERSISTENCE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Versioned state persistence with migration support
 */
export class VersionedStatePersistence extends JsonStatePersistence {
  /**
   * @param {string} filePath - Path to JSON file
   * @param {*} defaultState - Default state
   * @param {Object} [options] - Options
   * @param {number} [options.version=1] - Current state version
   * @param {Object} [options.migrations] - Migration functions keyed by version
   */
  constructor(filePath, defaultState, options = {}) {
    super(filePath, defaultState, options);

    this.version = options.version || 1;
    this.migrations = options.migrations || {};
  }

  /**
   * Save state with version
   * @returns {Promise<void>}
   */
  async save() {
    // Add version to state before saving
    const stateWithVersion = {
      ...this._state,
      _version: this.version
    };

    // Temporarily set versioned state
    const originalState = this._state;
    this._state = stateWithVersion;

    await super.save();

    // Restore original state (without _version in memory)
    this._state = originalState;
  }

  /**
   * Load state with version checking and migration
   * @returns {Promise<void>}
   */
  async load() {
    try {
      if (!fs.existsSync(this.filePath)) {
        return;
      }

      const content = fs.readFileSync(this.filePath, 'utf8');
      let loadedState = JSON.parse(content);
      let loadedVersion = loadedState._version || 0;

      // Remove version from state
      delete loadedState._version;

      // Check if migration needed
      if (loadedVersion < this.version) {
        loadedState = this._migrate(loadedState, loadedVersion);

        if (loadedState === null) {
          // Migration failed, use default
          this._state = this._clone(this.defaultState);
          return;
        }
      }

      this._state = loadedState;
      this._dirty = false;
      this._emit('load');
    } catch (error) {
      console.error('[VersionedStatePersistence] Load error:', error.message);
      this._state = this._clone(this.defaultState);
    }
  }

  /**
   * Migrate state from old version to current
   * @private
   */
  _migrate(state, fromVersion) {
    let currentState = state;
    let currentVersion = fromVersion;

    while (currentVersion < this.version) {
      const migration = this.migrations[currentVersion];

      if (!migration) {
        // No migration path, return null to use default
        console.warn(`[VersionedStatePersistence] No migration from version ${currentVersion}`);
        return null;
      }

      try {
        currentState = migration(currentState);
        currentVersion++;
      } catch (error) {
        console.error(`[VersionedStatePersistence] Migration from v${currentVersion} failed:`, error.message);
        return null;
      }
    }

    return currentState;
  }
}

export default {
  StatePersistenceBase,
  JsonStatePersistence,
  VersionedStatePersistence
};
