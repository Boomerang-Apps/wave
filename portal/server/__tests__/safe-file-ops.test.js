/**
 * Safe File Operations Tests (SEC-005)
 *
 * TDD tests for TOCTOU-safe file operations.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import {
  SafeFileHandle,
  safeOpen,
  safeReadFile,
  safeWriteFile,
  withSafeFile,
  SAFE_FILE_ERRORS
} from '../utils/safe-file-ops.js';

describe('Safe File Operations (SEC-005)', () => {
  let testDir;
  let testFile;

  beforeEach(() => {
    // Create a temporary test directory
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'safe-file-test-'));
    testFile = path.join(testDir, 'test.txt');
    fs.writeFileSync(testFile, 'Hello, World!');
  });

  afterEach(() => {
    // Clean up test directory
    try {
      fs.rmSync(testDir, { recursive: true, force: true });
    } catch (e) {
      // Ignore cleanup errors
    }
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // safeOpen
  // ─────────────────────────────────────────────────────────────────────────────

  describe('safeOpen', () => {
    it('should open file within allowed directory', async () => {
      const handle = await safeOpen(testFile, [testDir]);

      expect(handle).toBeInstanceOf(SafeFileHandle);
      expect(handle.isFile).toBe(true);
      expect(handle.size).toBe(13); // "Hello, World!"

      await handle.close();
    });

    it('should reject file outside allowed directory', async () => {
      const outsidePath = path.join(os.tmpdir(), 'outside.txt');

      await expect(safeOpen(outsidePath, [testDir]))
        .rejects.toMatchObject({ code: SAFE_FILE_ERRORS.PATH_OUTSIDE_ALLOWED });
    });

    it('should reject null path', async () => {
      await expect(safeOpen(null, [testDir]))
        .rejects.toMatchObject({ code: SAFE_FILE_ERRORS.INVALID_PATH });
    });

    it('should reject path with null bytes', async () => {
      await expect(safeOpen(testFile + '\x00', [testDir]))
        .rejects.toMatchObject({ code: SAFE_FILE_ERRORS.INVALID_PATH });
    });

    it('should reject non-existent file', async () => {
      const nonExistent = path.join(testDir, 'nonexistent.txt');

      await expect(safeOpen(nonExistent, [testDir]))
        .rejects.toMatchObject({ code: SAFE_FILE_ERRORS.FILE_NOT_FOUND });
    });

    it('should reject directory when requireFile is true', async () => {
      await expect(safeOpen(testDir, [testDir], { requireFile: true }))
        .rejects.toMatchObject({ code: SAFE_FILE_ERRORS.NOT_A_FILE });
    });

    it('should allow directory when requireFile is false', async () => {
      const handle = await safeOpen(testDir, [testDir], { requireFile: false });

      expect(handle.isDirectory).toBe(true);

      await handle.close();
    });

    it('should reject path traversal attempts', async () => {
      const parentDir = path.dirname(testDir);
      const traversalPath = path.join(testDir, '..', 'other.txt');

      await expect(safeOpen(traversalPath, [testDir]))
        .rejects.toMatchObject({ code: SAFE_FILE_ERRORS.PATH_OUTSIDE_ALLOWED });
    });

    it('should detect symlink escape', async () => {
      // Create a symlink that points outside the allowed directory
      const outsideFile = path.join(os.tmpdir(), 'outside-target.txt');
      const symlinkPath = path.join(testDir, 'symlink.txt');

      try {
        fs.writeFileSync(outsideFile, 'outside content');
        fs.symlinkSync(outsideFile, symlinkPath);

        await expect(safeOpen(symlinkPath, [testDir]))
          .rejects.toMatchObject({ code: SAFE_FILE_ERRORS.SYMLINK_ESCAPE });
      } finally {
        try {
          fs.unlinkSync(outsideFile);
        } catch (e) {}
      }
    });

    it('should allow symlink within allowed directory', async () => {
      // Create a symlink that points within the allowed directory
      const targetFile = path.join(testDir, 'target.txt');
      const symlinkPath = path.join(testDir, 'symlink.txt');

      fs.writeFileSync(targetFile, 'target content');
      fs.symlinkSync(targetFile, symlinkPath);

      const handle = await safeOpen(symlinkPath, [testDir]);

      expect(handle.isFile).toBe(true);

      await handle.close();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // SafeFileHandle
  // ─────────────────────────────────────────────────────────────────────────────

  describe('SafeFileHandle', () => {
    it('should read file contents', async () => {
      const handle = await safeOpen(testFile, [testDir]);

      const content = await handle.readAll();

      expect(content).toBe('Hello, World!');

      await handle.close();
    });

    it('should read with buffer', async () => {
      const handle = await safeOpen(testFile, [testDir]);

      const buffer = Buffer.alloc(5);
      const { bytesRead } = await handle.read(buffer, 0, 5, 0);

      expect(bytesRead).toBe(5);
      expect(buffer.toString()).toBe('Hello');

      await handle.close();
    });

    it('should write to file', async () => {
      const handle = await safeOpen(testFile, [testDir], { flags: 'r+' });

      await handle.write('Test', 0);
      await handle.close();

      // Writing 4 bytes at position 0 overwrites "Hell" with "Test", leaving "o, World!"
      const content = fs.readFileSync(testFile, 'utf8');
      expect(content).toBe('Testo, World!');
    });

    it('should truncate file', async () => {
      const handle = await safeOpen(testFile, [testDir], { flags: 'r+' });

      await handle.truncate(5);
      await handle.close();

      const content = fs.readFileSync(testFile, 'utf8');
      expect(content).toBe('Hello');
    });

    it('should refresh stats', async () => {
      const handle = await safeOpen(testFile, [testDir], { flags: 'r+' });

      const initialSize = handle.size;
      await handle.write('Extra content!', handle.size);

      await handle.refreshStats();

      expect(handle.size).toBeGreaterThan(initialSize);

      await handle.close();
    });

    it('should throw on operations after close', async () => {
      const handle = await safeOpen(testFile, [testDir]);
      await handle.close();

      expect(handle.isClosed).toBe(true);

      await expect(handle.readAll()).rejects.toThrow('closed');
    });

    it('should provide realPath', async () => {
      const handle = await safeOpen(testFile, [testDir]);

      expect(handle.realPath).toContain('test.txt');

      await handle.close();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // safeReadFile
  // ─────────────────────────────────────────────────────────────────────────────

  describe('safeReadFile', () => {
    it('should read file content', async () => {
      const content = await safeReadFile(testFile, [testDir]);

      expect(content).toBe('Hello, World!');
    });

    it('should read as buffer', async () => {
      const content = await safeReadFile(testFile, [testDir], { encoding: null });

      expect(Buffer.isBuffer(content)).toBe(true);
      expect(content.toString()).toBe('Hello, World!');
    });

    it('should reject file outside allowed directory', async () => {
      const outsidePath = path.join(os.tmpdir(), 'outside.txt');

      await expect(safeReadFile(outsidePath, [testDir]))
        .rejects.toMatchObject({ code: SAFE_FILE_ERRORS.PATH_OUTSIDE_ALLOWED });
    });

    it('should automatically close handle', async () => {
      // Just verify it doesn't leak handles
      for (let i = 0; i < 10; i++) {
        await safeReadFile(testFile, [testDir]);
      }
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // safeWriteFile
  // ─────────────────────────────────────────────────────────────────────────────

  describe('safeWriteFile', () => {
    it('should write file content', async () => {
      const newFile = path.join(testDir, 'new.txt');

      await safeWriteFile(newFile, 'New content', [testDir]);

      const content = fs.readFileSync(newFile, 'utf8');
      expect(content).toBe('New content');
    });

    it('should overwrite existing file', async () => {
      await safeWriteFile(testFile, 'Overwritten', [testDir]);

      const content = fs.readFileSync(testFile, 'utf8');
      expect(content).toBe('Overwritten');
    });

    it('should write buffer', async () => {
      const newFile = path.join(testDir, 'buffer.txt');

      await safeWriteFile(newFile, Buffer.from('Buffer content'), [testDir]);

      const content = fs.readFileSync(newFile, 'utf8');
      expect(content).toBe('Buffer content');
    });

    it('should reject write outside allowed directory', async () => {
      const outsidePath = path.join(os.tmpdir(), 'outside-write.txt');

      await expect(safeWriteFile(outsidePath, 'content', [testDir]))
        .rejects.toMatchObject({ code: SAFE_FILE_ERRORS.PATH_OUTSIDE_ALLOWED });
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // withSafeFile
  // ─────────────────────────────────────────────────────────────────────────────

  describe('withSafeFile', () => {
    it('should execute function with handle', async () => {
      const result = await withSafeFile(testFile, [testDir], async (handle) => {
        const content = await handle.readAll();
        return content.length;
      });

      expect(result).toBe(13);
    });

    it('should close handle even on error', async () => {
      let capturedHandle;

      await expect(withSafeFile(testFile, [testDir], async (handle) => {
        capturedHandle = handle;
        throw new Error('Test error');
      })).rejects.toThrow('Test error');

      // Handle should be closed
      expect(capturedHandle.isClosed).toBe(true);
    });

    it('should return function result', async () => {
      const result = await withSafeFile(testFile, [testDir], async (handle) => {
        return handle.size;
      });

      expect(result).toBe(13);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Multiple Allowed Paths
  // ─────────────────────────────────────────────────────────────────────────────

  describe('Multiple Allowed Paths', () => {
    let secondDir;
    let secondFile;

    beforeEach(() => {
      secondDir = fs.mkdtempSync(path.join(os.tmpdir(), 'safe-file-test2-'));
      secondFile = path.join(secondDir, 'second.txt');
      fs.writeFileSync(secondFile, 'Second file');
    });

    afterEach(() => {
      try {
        fs.rmSync(secondDir, { recursive: true, force: true });
      } catch (e) {}
    });

    it('should allow access to multiple directories', async () => {
      const allowedPaths = [testDir, secondDir];

      const content1 = await safeReadFile(testFile, allowedPaths);
      const content2 = await safeReadFile(secondFile, allowedPaths);

      expect(content1).toBe('Hello, World!');
      expect(content2).toBe('Second file');
    });

    it('should reject path outside all allowed directories', async () => {
      const allowedPaths = [testDir, secondDir];
      const outsidePath = path.join(os.tmpdir(), 'outside.txt');

      await expect(safeReadFile(outsidePath, allowedPaths))
        .rejects.toMatchObject({ code: SAFE_FILE_ERRORS.PATH_OUTSIDE_ALLOWED });
    });
  });
});
