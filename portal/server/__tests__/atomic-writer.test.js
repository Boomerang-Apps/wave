// ═══════════════════════════════════════════════════════════════════════════════
// ATOMIC WRITER TESTS (TDD - Written First)
// ═══════════════════════════════════════════════════════════════════════════════
// Tests for IMP-004: Atomic signal writes - Reliable file operations
//
// Sources:
// - https://www.npmjs.com/package/write-file-atomic
// - https://github.com/fabiospampinato/atomically
// - https://lwn.net/Articles/789600/
// - https://nodejs.org/api/fs.html
// ═══════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';

// Import the module we're going to implement
import {
  AtomicWriter,
  atomicWriteFile,
  atomicWriteJson,
  writeSignalFile,
  ATOMIC_WRITE_OPTIONS
} from '../utils/atomic-writer.js';

describe('AtomicWriter', () => {
  let tempDir;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'atomic-writer-test-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // AC1: Write to temporary file first
  // ─────────────────────────────────────────────────────────────────────────────

  describe('AC1: Temporary File Pattern', () => {
    it('should write to temp file before final destination', async () => {
      const writer = new AtomicWriter();
      const targetPath = path.join(tempDir, 'test.json');
      const content = '{"test": true}';

      // Track files created during write
      const createdFiles = [];
      const originalWriteFile = fs.promises.writeFile;
      vi.spyOn(fs.promises, 'writeFile').mockImplementation(async (path, ...args) => {
        createdFiles.push(path);
        return originalWriteFile(path, ...args);
      });

      await writer.write(targetPath, content);

      // Should have written to a .tmp file first
      const tempFiles = createdFiles.filter(f => f.includes('.tmp'));
      expect(tempFiles.length).toBeGreaterThan(0);
    });

    it('should use unique temp file names', async () => {
      const writer = new AtomicWriter();
      const targetPath = path.join(tempDir, 'test.json');

      const tempNames = new Set();
      for (let i = 0; i < 5; i++) {
        const tempPath = writer.getTempPath(targetPath);
        tempNames.add(tempPath);
      }

      // All temp paths should be unique
      expect(tempNames.size).toBe(5);
    });

    it('should place temp file in same directory as target', async () => {
      const writer = new AtomicWriter();
      const targetPath = path.join(tempDir, 'subdir', 'test.json');

      // Create subdir
      fs.mkdirSync(path.dirname(targetPath), { recursive: true });

      const tempPath = writer.getTempPath(targetPath);

      expect(path.dirname(tempPath)).toBe(path.dirname(targetPath));
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // AC2: fsync before rename
  // ─────────────────────────────────────────────────────────────────────────────

  describe('AC2: fsync Operation', () => {
    it('should call fsync by default', async () => {
      const writer = new AtomicWriter();
      const targetPath = path.join(tempDir, 'test.json');

      // Track operations to verify fsync is called
      const operations = [];
      vi.spyOn(fs, 'fsync').mockImplementation((fd, callback) => {
        operations.push('fsync');
        callback(null);
      });

      await writer.write(targetPath, '{"test": true}');

      expect(operations).toContain('fsync');
    });

    it('should support disabling fsync', async () => {
      const writer = new AtomicWriter({ fsync: false });
      const targetPath = path.join(tempDir, 'test.json');

      const fsyncCalled = { value: false };
      vi.spyOn(fs, 'fsync').mockImplementation((fd, callback) => {
        fsyncCalled.value = true;
        callback(null);
      });

      await writer.write(targetPath, '{"test": true}');

      expect(fsyncCalled.value).toBe(false);
    });

    it('should fsync before rename', async () => {
      const writer = new AtomicWriter();
      const targetPath = path.join(tempDir, 'test.json');

      const operations = [];
      vi.spyOn(fs, 'fsync').mockImplementation((fd, callback) => {
        operations.push('fsync');
        callback(null);
      });
      const originalRename = fs.promises.rename;
      vi.spyOn(fs.promises, 'rename').mockImplementation(async (...args) => {
        operations.push('rename');
        return originalRename(...args);
      });

      await writer.write(targetPath, '{"test": true}');

      const fsyncIndex = operations.indexOf('fsync');
      const renameIndex = operations.indexOf('rename');
      expect(fsyncIndex).toBeLessThan(renameIndex);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // AC3: Atomic rename to final destination
  // ─────────────────────────────────────────────────────────────────────────────

  describe('AC3: Atomic Rename', () => {
    it('should use rename for final move', async () => {
      const writer = new AtomicWriter();
      const targetPath = path.join(tempDir, 'test.json');

      let renameCalled = false;
      const originalRename = fs.promises.rename;
      vi.spyOn(fs.promises, 'rename').mockImplementation(async (...args) => {
        renameCalled = true;
        return originalRename(...args);
      });

      await writer.write(targetPath, '{"test": true}');

      expect(renameCalled).toBe(true);
    });

    it('should write correct content to final file', async () => {
      const writer = new AtomicWriter();
      const targetPath = path.join(tempDir, 'test.json');
      const content = '{"key": "value", "number": 42}';

      await writer.write(targetPath, content);

      const result = fs.readFileSync(targetPath, 'utf8');
      expect(result).toBe(content);
    });

    it('should overwrite existing file atomically', async () => {
      const writer = new AtomicWriter();
      const targetPath = path.join(tempDir, 'test.json');

      // Create initial file
      fs.writeFileSync(targetPath, '{"old": true}');

      // Overwrite atomically
      await writer.write(targetPath, '{"new": true}');

      const result = JSON.parse(fs.readFileSync(targetPath, 'utf8'));
      expect(result.new).toBe(true);
      expect(result.old).toBeUndefined();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // AC4: No partial files on failure
  // ─────────────────────────────────────────────────────────────────────────────

  describe('AC4: Failure Handling', () => {
    it('should not leave partial file on write error', async () => {
      const writer = new AtomicWriter();
      const targetPath = path.join(tempDir, 'test.json');

      // Mock writeFile to fail
      vi.spyOn(fs.promises, 'writeFile').mockRejectedValue(new Error('Disk full'));

      await expect(writer.write(targetPath, '{"test": true}')).rejects.toThrow('Disk full');

      // Target should not exist
      expect(fs.existsSync(targetPath)).toBe(false);
    });

    it('should not leave partial file on rename error', async () => {
      const writer = new AtomicWriter();
      const targetPath = path.join(tempDir, 'test.json');

      // Mock rename to fail
      vi.spyOn(fs.promises, 'rename').mockRejectedValue(new Error('Permission denied'));

      await expect(writer.write(targetPath, '{"test": true}')).rejects.toThrow();

      // Target should not exist
      expect(fs.existsSync(targetPath)).toBe(false);
    });

    it('should not corrupt existing file on error', async () => {
      const writer = new AtomicWriter();
      const targetPath = path.join(tempDir, 'test.json');
      const originalContent = '{"original": true}';

      // Create initial file
      fs.writeFileSync(targetPath, originalContent);

      // Mock rename to fail
      vi.spyOn(fs.promises, 'rename').mockRejectedValue(new Error('Failed'));

      await expect(writer.write(targetPath, '{"new": true}')).rejects.toThrow();

      // Original file should be unchanged
      const result = fs.readFileSync(targetPath, 'utf8');
      expect(result).toBe(originalContent);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // AC5: Cleanup temp files on error
  // ─────────────────────────────────────────────────────────────────────────────

  describe('AC5: Temp File Cleanup', () => {
    it('should remove temp file on write error', async () => {
      const writer = new AtomicWriter();
      const targetPath = path.join(tempDir, 'test.json');

      // Track temp file created
      let tempFilePath = null;
      const originalWriteFile = fs.promises.writeFile;
      vi.spyOn(fs.promises, 'writeFile').mockImplementation(async (p, ...args) => {
        if (p.includes('.tmp')) {
          tempFilePath = p;
          // Actually write the file, then throw
          await originalWriteFile(p, ...args);
          throw new Error('Simulated error after write');
        }
        return originalWriteFile(p, ...args);
      });

      await expect(writer.write(targetPath, '{"test": true}')).rejects.toThrow();

      // Temp file should be cleaned up
      if (tempFilePath) {
        expect(fs.existsSync(tempFilePath)).toBe(false);
      }
    });

    it('should remove temp file on rename error', async () => {
      const writer = new AtomicWriter();
      const targetPath = path.join(tempDir, 'test.json');

      // Write will succeed, rename will fail
      vi.spyOn(fs.promises, 'rename').mockRejectedValue(new Error('Rename failed'));

      await expect(writer.write(targetPath, '{"test": true}')).rejects.toThrow();

      // No .tmp files should remain
      const files = fs.readdirSync(tempDir);
      const tempFiles = files.filter(f => f.includes('.tmp'));
      expect(tempFiles.length).toBe(0);
    });

    it('should not leave temp files on success', async () => {
      const writer = new AtomicWriter();
      const targetPath = path.join(tempDir, 'test.json');

      await writer.write(targetPath, '{"test": true}');

      const files = fs.readdirSync(tempDir);
      const tempFiles = files.filter(f => f.includes('.tmp'));
      expect(tempFiles.length).toBe(0);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // AC6: Support for signal file format
  // ─────────────────────────────────────────────────────────────────────────────

  describe('AC6: Signal File Support', () => {
    it('should write valid JSON signal files', async () => {
      const signalData = {
        type: 'STORY_COMPLETE',
        story_id: 'STORY-001',
        wave: 1,
        agent: 'fe-dev-1',
        timestamp: new Date().toISOString(),
        payload: { status: 'passed' }
      };

      const targetPath = path.join(tempDir, 'STORY-001.signal.json');
      await writeSignalFile(targetPath, signalData);

      const result = JSON.parse(fs.readFileSync(targetPath, 'utf8'));
      expect(result.type).toBe('STORY_COMPLETE');
      expect(result.story_id).toBe('STORY-001');
    });

    it('should pretty-print JSON by default', async () => {
      const signalData = { key: 'value' };
      const targetPath = path.join(tempDir, 'test.signal.json');

      await writeSignalFile(targetPath, signalData);

      const result = fs.readFileSync(targetPath, 'utf8');
      expect(result).toContain('\n'); // Pretty printed has newlines
    });

    it('should support compact JSON option', async () => {
      const signalData = { key: 'value' };
      const targetPath = path.join(tempDir, 'test.signal.json');

      await writeSignalFile(targetPath, signalData, { compact: true });

      const result = fs.readFileSync(targetPath, 'utf8');
      expect(result).not.toContain('\n');
    });

    it('should preserve special characters in signal data', async () => {
      const signalData = {
        message: 'Test with "quotes" and \\ backslash',
        emoji: '🚀',
        unicode: '日本語'
      };
      const targetPath = path.join(tempDir, 'unicode.signal.json');

      await writeSignalFile(targetPath, signalData);

      const result = JSON.parse(fs.readFileSync(targetPath, 'utf8'));
      expect(result.message).toBe('Test with "quotes" and \\ backslash');
      expect(result.emoji).toBe('🚀');
      expect(result.unicode).toBe('日本語');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Convenience Functions
  // ─────────────────────────────────────────────────────────────────────────────

  describe('Convenience Functions', () => {
    it('atomicWriteFile should write string content', async () => {
      const targetPath = path.join(tempDir, 'test.txt');
      await atomicWriteFile(targetPath, 'Hello, World!');

      const result = fs.readFileSync(targetPath, 'utf8');
      expect(result).toBe('Hello, World!');
    });

    it('atomicWriteJson should write JSON object', async () => {
      const targetPath = path.join(tempDir, 'test.json');
      await atomicWriteJson(targetPath, { name: 'test', value: 42 });

      const result = JSON.parse(fs.readFileSync(targetPath, 'utf8'));
      expect(result.name).toBe('test');
      expect(result.value).toBe(42);
    });

    it('should export ATOMIC_WRITE_OPTIONS defaults', () => {
      expect(ATOMIC_WRITE_OPTIONS).toHaveProperty('fsync', true);
      expect(ATOMIC_WRITE_OPTIONS).toHaveProperty('mode');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Edge Cases
  // ─────────────────────────────────────────────────────────────────────────────

  describe('Edge Cases', () => {
    it('should handle empty content', async () => {
      const writer = new AtomicWriter();
      const targetPath = path.join(tempDir, 'empty.txt');

      await writer.write(targetPath, '');

      expect(fs.existsSync(targetPath)).toBe(true);
      const result = fs.readFileSync(targetPath, 'utf8');
      expect(result).toBe('');
    });

    it('should handle large content', async () => {
      const writer = new AtomicWriter();
      const targetPath = path.join(tempDir, 'large.txt');
      const largeContent = 'x'.repeat(1024 * 1024); // 1MB

      await writer.write(targetPath, largeContent);

      const result = fs.readFileSync(targetPath, 'utf8');
      expect(result.length).toBe(1024 * 1024);
    });

    it('should create parent directory if missing', async () => {
      const writer = new AtomicWriter({ createDir: true });
      const targetPath = path.join(tempDir, 'a', 'b', 'c', 'test.json');

      await writer.write(targetPath, '{"nested": true}');

      expect(fs.existsSync(targetPath)).toBe(true);
    });

    it('should handle concurrent writes to different files', async () => {
      const writer = new AtomicWriter();

      const writes = [1, 2, 3, 4, 5].map(i =>
        writer.write(path.join(tempDir, `file${i}.json`), `{"id": ${i}}`)
      );

      await Promise.all(writes);

      for (let i = 1; i <= 5; i++) {
        const result = JSON.parse(fs.readFileSync(path.join(tempDir, `file${i}.json`), 'utf8'));
        expect(result.id).toBe(i);
      }
    });
  });
});
