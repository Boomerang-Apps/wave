/**
 * File Rate Limit Store Tests (SEC-006)
 *
 * TDD tests for file-based rate limit persistence.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { FileStore } from '../utils/file-rate-limit-store.js';

describe('File Rate Limit Store (SEC-006)', () => {
  let testDir;
  let testFile;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rate-limit-test-'));
    testFile = path.join(testDir, 'rate-limits.json');
  });

  afterEach(() => {
    try {
      fs.rmSync(testDir, { recursive: true, force: true });
    } catch (e) {
      // Ignore cleanup errors
    }
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Basic Operations
  // ─────────────────────────────────────────────────────────────────────────────

  describe('Basic Operations', () => {
    it('should create store with file path', () => {
      const store = new FileStore({ filePath: testFile });
      expect(store).toBeDefined();
      store.stopAutoSave();
    });

    it('should increment counter', async () => {
      const store = new FileStore({ filePath: testFile });

      const result = await store.increment('test-key', 60000);

      expect(result.count).toBe(1);
      expect(result.resetTime).toBeGreaterThan(Date.now());

      store.stopAutoSave();
    });

    it('should increment counter multiple times', async () => {
      const store = new FileStore({ filePath: testFile });

      await store.increment('test-key', 60000);
      await store.increment('test-key', 60000);
      const result = await store.increment('test-key', 60000);

      expect(result.count).toBe(3);

      store.stopAutoSave();
    });

    it('should get current count', async () => {
      const store = new FileStore({ filePath: testFile });

      await store.increment('test-key', 60000);
      await store.increment('test-key', 60000);

      const result = await store.get('test-key');

      expect(result.count).toBe(2);

      store.stopAutoSave();
    });

    it('should return null for non-existent key', async () => {
      const store = new FileStore({ filePath: testFile });

      const result = await store.get('non-existent');

      expect(result).toBeNull();

      store.stopAutoSave();
    });

    it('should decrement counter', async () => {
      const store = new FileStore({ filePath: testFile });

      await store.increment('test-key', 60000);
      await store.increment('test-key', 60000);
      await store.decrement('test-key');

      const result = await store.get('test-key');

      expect(result.count).toBe(1);

      store.stopAutoSave();
    });

    it('should not decrement below zero', async () => {
      const store = new FileStore({ filePath: testFile });

      await store.increment('test-key', 60000);
      await store.decrement('test-key');
      await store.decrement('test-key');

      const result = await store.get('test-key');

      expect(result.count).toBe(0);

      store.stopAutoSave();
    });

    it('should reset counter', async () => {
      const store = new FileStore({ filePath: testFile });

      await store.increment('test-key', 60000);
      await store.increment('test-key', 60000);
      await store.reset('test-key');

      const result = await store.get('test-key');

      expect(result).toBeNull();

      store.stopAutoSave();
    });

    it('should clear all entries', async () => {
      const store = new FileStore({ filePath: testFile });

      await store.increment('key1', 60000);
      await store.increment('key2', 60000);
      await store.clear();

      expect(await store.get('key1')).toBeNull();
      expect(await store.get('key2')).toBeNull();

      store.stopAutoSave();
    });

    it('should report size', async () => {
      const store = new FileStore({ filePath: testFile });

      await store.increment('key1', 60000);
      await store.increment('key2', 60000);
      await store.increment('key3', 60000);

      expect(store.size).toBe(3);

      store.stopAutoSave();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Expiration
  // ─────────────────────────────────────────────────────────────────────────────

  describe('Expiration', () => {
    it('should expire entries after window', async () => {
      const store = new FileStore({ filePath: testFile });

      await store.increment('test-key', 50); // 50ms window

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 60));

      const result = await store.get('test-key');

      expect(result).toBeNull();

      store.stopAutoSave();
    });

    it('should reset counter on new window', async () => {
      const store = new FileStore({ filePath: testFile });

      await store.increment('test-key', 50);
      await store.increment('test-key', 50);

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 60));

      const result = await store.increment('test-key', 50);

      expect(result.count).toBe(1);

      store.stopAutoSave();
    });

    it('should cleanup expired entries', async () => {
      const store = new FileStore({ filePath: testFile });

      await store.increment('expired-key', 50);
      await store.increment('valid-key', 10000);

      // Wait for first key to expire
      await new Promise(resolve => setTimeout(resolve, 60));

      // Manual cleanup
      store.cleanup();

      expect(await store.get('expired-key')).toBeNull();
      expect(await store.get('valid-key')).not.toBeNull();

      store.stopAutoSave();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Persistence
  // ─────────────────────────────────────────────────────────────────────────────

  describe('Persistence', () => {
    it('should save to file', async () => {
      const store = new FileStore({ filePath: testFile });

      await store.increment('test-key', 60000);
      await store.save();

      expect(fs.existsSync(testFile)).toBe(true);

      const content = fs.readFileSync(testFile, 'utf8');
      const data = JSON.parse(content);

      expect(data['test-key']).toBeDefined();
      expect(data['test-key'].count).toBe(1);

      store.stopAutoSave();
    });

    it('should load from file on start', async () => {
      // Create a store and save some data
      const store1 = new FileStore({ filePath: testFile });
      await store1.increment('persisted-key', 60000);
      await store1.increment('persisted-key', 60000);
      await store1.save();
      store1.stopAutoSave();

      // Create a new store with the same file
      const store2 = new FileStore({ filePath: testFile });
      await store2.load();

      const result = await store2.get('persisted-key');

      expect(result.count).toBe(2);

      store2.stopAutoSave();
    });

    it('should survive restart', async () => {
      // Create a store and save some data
      const store1 = new FileStore({ filePath: testFile });
      await store1.increment('restart-key', 60000);
      await store1.increment('restart-key', 60000);
      await store1.increment('restart-key', 60000);
      await store1.save();
      store1.stopAutoSave();

      // Simulate restart with new store
      const store2 = new FileStore({ filePath: testFile, autoLoad: true });
      // autoLoad is synchronous in constructor

      const result = await store2.get('restart-key');

      expect(result.count).toBe(3);

      store2.stopAutoSave();
    });

    it('should not load expired entries', async () => {
      // Create file with expired entry
      const expiredData = {
        'expired-key': {
          count: 5,
          resetTime: Date.now() - 1000 // Already expired
        },
        'valid-key': {
          count: 3,
          resetTime: Date.now() + 60000
        }
      };
      fs.writeFileSync(testFile, JSON.stringify(expiredData));

      const store = new FileStore({ filePath: testFile, autoLoad: true });

      expect(await store.get('expired-key')).toBeNull();
      expect(await store.get('valid-key')).not.toBeNull();

      store.stopAutoSave();
    });

    it('should handle missing file on load', async () => {
      const store = new FileStore({ filePath: testFile, autoLoad: true });

      // Should not throw, just start empty
      expect(store.size).toBe(0);

      store.stopAutoSave();
    });

    it('should handle corrupted file on load', async () => {
      fs.writeFileSync(testFile, 'not valid json {{{');

      const store = new FileStore({ filePath: testFile, autoLoad: true });

      // Should not throw, just start empty
      expect(store.size).toBe(0);

      store.stopAutoSave();
    });

    it('should create directory if not exists', async () => {
      const nestedFile = path.join(testDir, 'nested', 'dir', 'rate-limits.json');
      const store = new FileStore({ filePath: nestedFile });

      await store.increment('test-key', 60000);
      await store.save();

      expect(fs.existsSync(nestedFile)).toBe(true);

      store.stopAutoSave();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Auto-Save
  // ─────────────────────────────────────────────────────────────────────────────

  describe('Auto-Save', () => {
    it('should auto-save at interval', async () => {
      const store = new FileStore({
        filePath: testFile,
        autoSaveInterval: 50
      });

      await store.increment('auto-save-key', 60000);

      // Wait for auto-save
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(fs.existsSync(testFile)).toBe(true);

      const content = fs.readFileSync(testFile, 'utf8');
      const data = JSON.parse(content);
      expect(data['auto-save-key']).toBeDefined();

      store.stopAutoSave();
    });

    it('should stop auto-save', async () => {
      const store = new FileStore({
        filePath: testFile,
        autoSaveInterval: 50
      });

      await store.increment('test-key', 60000);
      store.stopAutoSave();

      // Delete file if it exists
      if (fs.existsSync(testFile)) {
        fs.unlinkSync(testFile);
      }

      // Wait longer than auto-save interval
      await new Promise(resolve => setTimeout(resolve, 100));

      // File should not be recreated
      expect(fs.existsSync(testFile)).toBe(false);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Multiple Keys
  // ─────────────────────────────────────────────────────────────────────────────

  describe('Multiple Keys', () => {
    it('should handle multiple keys independently', async () => {
      const store = new FileStore({ filePath: testFile });

      await store.increment('ip:192.168.1.1', 60000);
      await store.increment('ip:192.168.1.1', 60000);
      await store.increment('ip:192.168.1.2', 60000);

      expect((await store.get('ip:192.168.1.1')).count).toBe(2);
      expect((await store.get('ip:192.168.1.2')).count).toBe(1);

      store.stopAutoSave();
    });

    it('should persist and restore multiple keys', async () => {
      const store1 = new FileStore({ filePath: testFile });

      await store1.increment('key1', 60000);
      await store1.increment('key2', 60000);
      await store1.increment('key2', 60000);
      await store1.increment('key3', 60000);
      await store1.increment('key3', 60000);
      await store1.increment('key3', 60000);
      await store1.save();
      store1.stopAutoSave();

      const store2 = new FileStore({ filePath: testFile, autoLoad: true });

      expect((await store2.get('key1')).count).toBe(1);
      expect((await store2.get('key2')).count).toBe(2);
      expect((await store2.get('key3')).count).toBe(3);

      store2.stopAutoSave();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Edge Cases
  // ─────────────────────────────────────────────────────────────────────────────

  describe('Edge Cases', () => {
    it('should handle special characters in keys', async () => {
      const store = new FileStore({ filePath: testFile });

      await store.increment('ip:2001:0db8:85a3::8a2e:0370:7334', 60000); // IPv6
      await store.increment('path:/api/v1/users?id=123', 60000);

      expect((await store.get('ip:2001:0db8:85a3::8a2e:0370:7334')).count).toBe(1);
      expect((await store.get('path:/api/v1/users?id=123')).count).toBe(1);

      store.stopAutoSave();
    });

    it('should handle concurrent increments', async () => {
      const store = new FileStore({ filePath: testFile });

      // Simulate concurrent increments
      await Promise.all([
        store.increment('concurrent-key', 60000),
        store.increment('concurrent-key', 60000),
        store.increment('concurrent-key', 60000),
        store.increment('concurrent-key', 60000),
        store.increment('concurrent-key', 60000)
      ]);

      const result = await store.get('concurrent-key');

      expect(result.count).toBe(5);

      store.stopAutoSave();
    });

    it('should handle very long keys', async () => {
      const store = new FileStore({ filePath: testFile });
      const longKey = 'x'.repeat(1000);

      await store.increment(longKey, 60000);

      expect((await store.get(longKey)).count).toBe(1);

      store.stopAutoSave();
    });

    it('should handle empty key', async () => {
      const store = new FileStore({ filePath: testFile });

      await store.increment('', 60000);

      expect((await store.get('')).count).toBe(1);

      store.stopAutoSave();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Integration with DistributedRateLimiter
  // ─────────────────────────────────────────────────────────────────────────────

  describe('Integration', () => {
    it('should work as store for DistributedRateLimiter', async () => {
      // Import the distributed rate limiter
      const { DistributedRateLimiter } = await import('../utils/distributed-rate-limiter.js');

      const store = new FileStore({ filePath: testFile });
      const limiter = new DistributedRateLimiter({
        store,
        windowMs: 60000,
        maxRequests: 3
      });

      // Check rate limiting
      const result1 = await limiter.check('test-ip');
      expect(result1.limited).toBe(false);
      expect(result1.remaining).toBe(2);

      const result2 = await limiter.check('test-ip');
      expect(result2.limited).toBe(false);
      expect(result2.remaining).toBe(1);

      const result3 = await limiter.check('test-ip');
      expect(result3.limited).toBe(false);
      expect(result3.remaining).toBe(0);

      const result4 = await limiter.check('test-ip');
      expect(result4.limited).toBe(true);

      store.stopAutoSave();
    });
  });
});
