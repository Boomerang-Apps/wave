/**
 * State Persistence Base Class Tests (CQ-011)
 *
 * TDD tests for centralized state persistence logic.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import {
  StatePersistenceBase,
  JsonStatePersistence,
  VersionedStatePersistence
} from '../utils/state-persistence-base.js';

describe('State Persistence Base (CQ-011)', () => {
  let testDir;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'state-persist-test-'));
  });

  afterEach(() => {
    try {
      fs.rmSync(testDir, { recursive: true, force: true });
    } catch (e) {
      // Ignore cleanup errors
    }
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // StatePersistenceBase
  // ─────────────────────────────────────────────────────────────────────────────

  describe('StatePersistenceBase', () => {
    it('should create with default state', () => {
      const filePath = path.join(testDir, 'state.json');
      const defaultState = { count: 0, items: [] };
      const persistence = new JsonStatePersistence(filePath, defaultState);

      expect(persistence.state).toEqual(defaultState);
    });

    it('should update state', () => {
      const filePath = path.join(testDir, 'state.json');
      const persistence = new JsonStatePersistence(filePath, { value: 0 });

      persistence.setState({ value: 42 });

      expect(persistence.state.value).toBe(42);
    });

    it('should merge state', () => {
      const filePath = path.join(testDir, 'state.json');
      const persistence = new JsonStatePersistence(filePath, { a: 1, b: 2 });

      persistence.mergeState({ b: 3, c: 4 });

      expect(persistence.state).toEqual({ a: 1, b: 3, c: 4 });
    });

    it('should reset to default state', () => {
      const filePath = path.join(testDir, 'state.json');
      const defaultState = { count: 0 };
      const persistence = new JsonStatePersistence(filePath, defaultState);

      persistence.setState({ count: 100 });
      persistence.reset();

      expect(persistence.state).toEqual(defaultState);
    });

    it('should track dirty state', () => {
      const filePath = path.join(testDir, 'state.json');
      const persistence = new JsonStatePersistence(filePath, { value: 0 });

      expect(persistence.isDirty).toBe(false);

      persistence.setState({ value: 1 });

      expect(persistence.isDirty).toBe(true);
    });

    it('should clear dirty flag after save', async () => {
      const filePath = path.join(testDir, 'state.json');
      const persistence = new JsonStatePersistence(filePath, { value: 0 });

      persistence.setState({ value: 1 });
      await persistence.save();

      expect(persistence.isDirty).toBe(false);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // JsonStatePersistence
  // ─────────────────────────────────────────────────────────────────────────────

  describe('JsonStatePersistence', () => {
    it('should save state to file', async () => {
      const filePath = path.join(testDir, 'state.json');
      const persistence = new JsonStatePersistence(filePath, { count: 0 });

      persistence.setState({ count: 42 });
      await persistence.save();

      expect(fs.existsSync(filePath)).toBe(true);

      const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      expect(content.count).toBe(42);
    });

    it('should load state from file', async () => {
      const filePath = path.join(testDir, 'state.json');
      fs.writeFileSync(filePath, JSON.stringify({ count: 100 }));

      const persistence = new JsonStatePersistence(filePath, { count: 0 });
      await persistence.load();

      expect(persistence.state.count).toBe(100);
    });

    it('should use default state when file missing', async () => {
      const filePath = path.join(testDir, 'missing.json');
      const persistence = new JsonStatePersistence(filePath, { count: 0 });

      await persistence.load();

      expect(persistence.state.count).toBe(0);
    });

    it('should handle corrupted file gracefully', async () => {
      const filePath = path.join(testDir, 'corrupted.json');
      fs.writeFileSync(filePath, 'not valid json {{{');

      const persistence = new JsonStatePersistence(filePath, { count: 0 });
      await persistence.load();

      // Should use default state
      expect(persistence.state.count).toBe(0);
    });

    it('should create directory if not exists', async () => {
      const filePath = path.join(testDir, 'nested', 'dir', 'state.json');
      const persistence = new JsonStatePersistence(filePath, { value: 1 });

      await persistence.save();

      expect(fs.existsSync(filePath)).toBe(true);
    });

    it('should format JSON with indentation', async () => {
      const filePath = path.join(testDir, 'formatted.json');
      const persistence = new JsonStatePersistence(filePath, { a: 1 }, { indent: 2 });

      await persistence.save();

      const content = fs.readFileSync(filePath, 'utf8');
      expect(content).toContain('\n');
    });

    it('should support auto-save', async () => {
      const filePath = path.join(testDir, 'autosave.json');
      const persistence = new JsonStatePersistence(filePath, { count: 0 }, {
        autoSave: true,
        autoSaveInterval: 50
      });

      persistence.setState({ count: 42 });

      // Wait for auto-save
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(fs.existsSync(filePath)).toBe(true);

      persistence.stopAutoSave();
    });

    it('should stop auto-save', async () => {
      const filePath = path.join(testDir, 'stop-autosave.json');
      const persistence = new JsonStatePersistence(filePath, { count: 0 }, {
        autoSave: true,
        autoSaveInterval: 50
      });

      persistence.stopAutoSave();
      persistence.setState({ count: 42 });

      // Wait longer than auto-save interval
      await new Promise(resolve => setTimeout(resolve, 100));

      // File should not exist
      expect(fs.existsSync(filePath)).toBe(false);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // VersionedStatePersistence
  // ─────────────────────────────────────────────────────────────────────────────

  describe('VersionedStatePersistence', () => {
    it('should include version in saved state', async () => {
      const filePath = path.join(testDir, 'versioned.json');
      const persistence = new VersionedStatePersistence(filePath, { data: [] }, { version: 1 });

      await persistence.save();

      const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      expect(content._version).toBe(1);
    });

    it('should load state with matching version', async () => {
      const filePath = path.join(testDir, 'versioned.json');
      fs.writeFileSync(filePath, JSON.stringify({ _version: 1, data: [1, 2, 3] }));

      const persistence = new VersionedStatePersistence(filePath, { data: [] }, { version: 1 });
      await persistence.load();

      expect(persistence.state.data).toEqual([1, 2, 3]);
    });

    it('should migrate old version', async () => {
      const filePath = path.join(testDir, 'migrate.json');
      fs.writeFileSync(filePath, JSON.stringify({ _version: 1, oldField: 'value' }));

      const migrations = {
        1: (state) => ({ ...state, newField: state.oldField, _version: 2 }),
        2: (state) => ({ data: state.newField, _version: 3 })
      };

      const persistence = new VersionedStatePersistence(
        filePath,
        { data: null },
        { version: 3, migrations }
      );
      await persistence.load();

      expect(persistence.state.data).toBe('value');
    });

    it('should reset on version mismatch without migration', async () => {
      const filePath = path.join(testDir, 'mismatch.json');
      fs.writeFileSync(filePath, JSON.stringify({ _version: 1, old: 'data' }));

      const persistence = new VersionedStatePersistence(
        filePath,
        { new: 'default' },
        { version: 2 }
      );
      await persistence.load();

      // Should use default state since no migration provided
      expect(persistence.state.new).toBe('default');
    });

    it('should handle state without version', async () => {
      const filePath = path.join(testDir, 'no-version.json');
      fs.writeFileSync(filePath, JSON.stringify({ data: 'old' }));

      const persistence = new VersionedStatePersistence(
        filePath,
        { data: 'default' },
        { version: 1 }
      );
      await persistence.load();

      // State without version is treated as version 0
      expect(persistence.state.data).toBe('default');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Event Handling
  // ─────────────────────────────────────────────────────────────────────────────

  describe('Event Handling', () => {
    it('should emit change event', () => {
      const filePath = path.join(testDir, 'events.json');
      const persistence = new JsonStatePersistence(filePath, { value: 0 });

      const changes = [];
      persistence.onChange((newState, oldState) => {
        changes.push({ newState, oldState });
      });

      persistence.setState({ value: 1 });
      persistence.setState({ value: 2 });

      expect(changes).toHaveLength(2);
      expect(changes[0].oldState.value).toBe(0);
      expect(changes[0].newState.value).toBe(1);
    });

    it('should emit save event', async () => {
      const filePath = path.join(testDir, 'save-event.json');
      const persistence = new JsonStatePersistence(filePath, { value: 0 });

      let saved = false;
      persistence.onSave(() => {
        saved = true;
      });

      await persistence.save();

      expect(saved).toBe(true);
    });

    it('should emit load event', async () => {
      const filePath = path.join(testDir, 'load-event.json');
      fs.writeFileSync(filePath, JSON.stringify({ value: 42 }));

      const persistence = new JsonStatePersistence(filePath, { value: 0 });

      let loaded = false;
      persistence.onLoad(() => {
        loaded = true;
      });

      await persistence.load();

      expect(loaded).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Edge Cases
  // ─────────────────────────────────────────────────────────────────────────────

  describe('Edge Cases', () => {
    it('should handle null state', () => {
      const filePath = path.join(testDir, 'null.json');
      const persistence = new JsonStatePersistence(filePath, null);

      expect(persistence.state).toBeNull();
    });

    it('should handle array state', async () => {
      const filePath = path.join(testDir, 'array.json');
      const persistence = new JsonStatePersistence(filePath, []);

      persistence.setState([1, 2, 3]);
      await persistence.save();
      await persistence.load();

      expect(persistence.state).toEqual([1, 2, 3]);
    });

    it('should handle empty object', async () => {
      const filePath = path.join(testDir, 'empty.json');
      const persistence = new JsonStatePersistence(filePath, {});

      await persistence.save();
      await persistence.load();

      expect(persistence.state).toEqual({});
    });

    it('should handle deep state objects', async () => {
      const filePath = path.join(testDir, 'deep.json');
      const deepState = {
        level1: {
          level2: {
            level3: {
              value: 'deep'
            }
          }
        }
      };
      const persistence = new JsonStatePersistence(filePath, {});

      persistence.setState(deepState);
      await persistence.save();
      await persistence.load();

      expect(persistence.state.level1.level2.level3.value).toBe('deep');
    });
  });
});
