/**
 * Async File I/O Tests (CQ-008)
 *
 * TDD tests for standardized async file operations.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import {
  readFile,
  writeFile,
  exists,
  mkdir,
  readdir,
  stat,
  unlink,
  rmdir,
  copyFile,
  rename,
  readJson,
  writeJson,
  ensureDir,
  remove,
  pathExists
} from '../utils/async-file-io.js';

describe('Async File I/O (CQ-008)', () => {
  let testDir;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'async-io-test-'));
  });

  afterEach(() => {
    try {
      fs.rmSync(testDir, { recursive: true, force: true });
    } catch (e) {
      // Ignore cleanup errors
    }
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Read Operations
  // ─────────────────────────────────────────────────────────────────────────────

  describe('Read Operations', () => {
    it('should read file as string', async () => {
      const filePath = path.join(testDir, 'test.txt');
      fs.writeFileSync(filePath, 'Hello, World!');

      const content = await readFile(filePath);

      expect(content).toBe('Hello, World!');
    });

    it('should read file as buffer', async () => {
      const filePath = path.join(testDir, 'test.txt');
      fs.writeFileSync(filePath, 'Hello, World!');

      const content = await readFile(filePath, { encoding: null });

      expect(Buffer.isBuffer(content)).toBe(true);
      expect(content.toString()).toBe('Hello, World!');
    });

    it('should throw on non-existent file', async () => {
      const filePath = path.join(testDir, 'nonexistent.txt');

      await expect(readFile(filePath)).rejects.toThrow();
    });

    it('should read directory contents', async () => {
      fs.writeFileSync(path.join(testDir, 'file1.txt'), 'a');
      fs.writeFileSync(path.join(testDir, 'file2.txt'), 'b');
      fs.mkdirSync(path.join(testDir, 'subdir'));

      const contents = await readdir(testDir);

      expect(contents).toContain('file1.txt');
      expect(contents).toContain('file2.txt');
      expect(contents).toContain('subdir');
    });

    it('should read directory with file types', async () => {
      fs.writeFileSync(path.join(testDir, 'file.txt'), 'a');
      fs.mkdirSync(path.join(testDir, 'subdir'));

      const contents = await readdir(testDir, { withFileTypes: true });

      const file = contents.find(d => d.name === 'file.txt');
      const dir = contents.find(d => d.name === 'subdir');

      expect(file.isFile()).toBe(true);
      expect(dir.isDirectory()).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Write Operations
  // ─────────────────────────────────────────────────────────────────────────────

  describe('Write Operations', () => {
    it('should write file', async () => {
      const filePath = path.join(testDir, 'output.txt');

      await writeFile(filePath, 'Test content');

      const content = fs.readFileSync(filePath, 'utf8');
      expect(content).toBe('Test content');
    });

    it('should write buffer', async () => {
      const filePath = path.join(testDir, 'output.bin');
      const data = Buffer.from([0x48, 0x65, 0x6c, 0x6c, 0x6f]);

      await writeFile(filePath, data);

      const content = fs.readFileSync(filePath);
      expect(content.toString()).toBe('Hello');
    });

    it('should create parent directories', async () => {
      const filePath = path.join(testDir, 'nested', 'dir', 'file.txt');

      await writeFile(filePath, 'nested content', { recursive: true });

      expect(fs.existsSync(filePath)).toBe(true);
      expect(fs.readFileSync(filePath, 'utf8')).toBe('nested content');
    });

    it('should overwrite existing file', async () => {
      const filePath = path.join(testDir, 'existing.txt');
      fs.writeFileSync(filePath, 'old content');

      await writeFile(filePath, 'new content');

      const content = fs.readFileSync(filePath, 'utf8');
      expect(content).toBe('new content');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Existence Checks
  // ─────────────────────────────────────────────────────────────────────────────

  describe('Existence Checks', () => {
    it('should return true for existing file', async () => {
      const filePath = path.join(testDir, 'exists.txt');
      fs.writeFileSync(filePath, 'content');

      const result = await exists(filePath);

      expect(result).toBe(true);
    });

    it('should return false for non-existent file', async () => {
      const filePath = path.join(testDir, 'nonexistent.txt');

      const result = await exists(filePath);

      expect(result).toBe(false);
    });

    it('should return true for existing directory', async () => {
      const dirPath = path.join(testDir, 'subdir');
      fs.mkdirSync(dirPath);

      const result = await exists(dirPath);

      expect(result).toBe(true);
    });

    it('pathExists should be alias for exists', async () => {
      const filePath = path.join(testDir, 'alias-test.txt');
      fs.writeFileSync(filePath, 'content');

      expect(await pathExists(filePath)).toBe(true);
      expect(await pathExists(path.join(testDir, 'missing.txt'))).toBe(false);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Directory Operations
  // ─────────────────────────────────────────────────────────────────────────────

  describe('Directory Operations', () => {
    it('should create directory', async () => {
      const dirPath = path.join(testDir, 'newdir');

      await mkdir(dirPath);

      expect(fs.existsSync(dirPath)).toBe(true);
      expect(fs.statSync(dirPath).isDirectory()).toBe(true);
    });

    it('should create nested directories', async () => {
      const dirPath = path.join(testDir, 'a', 'b', 'c');

      await mkdir(dirPath, { recursive: true });

      expect(fs.existsSync(dirPath)).toBe(true);
    });

    it('should not throw if directory already exists with recursive', async () => {
      const dirPath = path.join(testDir, 'existing');
      fs.mkdirSync(dirPath);

      await expect(mkdir(dirPath, { recursive: true })).resolves.not.toThrow();
    });

    it('ensureDir should create directory if not exists', async () => {
      const dirPath = path.join(testDir, 'ensure', 'nested');

      await ensureDir(dirPath);

      expect(fs.existsSync(dirPath)).toBe(true);
    });

    it('ensureDir should not fail if directory exists', async () => {
      const dirPath = path.join(testDir, 'existing');
      fs.mkdirSync(dirPath);

      await expect(ensureDir(dirPath)).resolves.not.toThrow();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Stats
  // ─────────────────────────────────────────────────────────────────────────────

  describe('Stats', () => {
    it('should get file stats', async () => {
      const filePath = path.join(testDir, 'stats.txt');
      fs.writeFileSync(filePath, 'content');

      const stats = await stat(filePath);

      expect(stats.isFile()).toBe(true);
      expect(stats.size).toBe(7);
    });

    it('should get directory stats', async () => {
      const dirPath = path.join(testDir, 'subdir');
      fs.mkdirSync(dirPath);

      const stats = await stat(dirPath);

      expect(stats.isDirectory()).toBe(true);
    });

    it('should throw for non-existent path', async () => {
      const filePath = path.join(testDir, 'nonexistent.txt');

      await expect(stat(filePath)).rejects.toThrow();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Delete Operations
  // ─────────────────────────────────────────────────────────────────────────────

  describe('Delete Operations', () => {
    it('should delete file', async () => {
      const filePath = path.join(testDir, 'todelete.txt');
      fs.writeFileSync(filePath, 'content');

      await unlink(filePath);

      expect(fs.existsSync(filePath)).toBe(false);
    });

    it('should delete empty directory', async () => {
      const dirPath = path.join(testDir, 'emptydir');
      fs.mkdirSync(dirPath);

      await rmdir(dirPath);

      expect(fs.existsSync(dirPath)).toBe(false);
    });

    it('remove should delete file', async () => {
      const filePath = path.join(testDir, 'remove-file.txt');
      fs.writeFileSync(filePath, 'content');

      await remove(filePath);

      expect(fs.existsSync(filePath)).toBe(false);
    });

    it('remove should delete directory recursively', async () => {
      const dirPath = path.join(testDir, 'remove-dir');
      fs.mkdirSync(dirPath);
      fs.writeFileSync(path.join(dirPath, 'file.txt'), 'content');
      fs.mkdirSync(path.join(dirPath, 'subdir'));
      fs.writeFileSync(path.join(dirPath, 'subdir', 'nested.txt'), 'nested');

      await remove(dirPath);

      expect(fs.existsSync(dirPath)).toBe(false);
    });

    it('remove should not throw on non-existent path', async () => {
      const filePath = path.join(testDir, 'nonexistent.txt');

      await expect(remove(filePath)).resolves.not.toThrow();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Copy and Rename
  // ─────────────────────────────────────────────────────────────────────────────

  describe('Copy and Rename', () => {
    it('should copy file', async () => {
      const srcPath = path.join(testDir, 'source.txt');
      const destPath = path.join(testDir, 'dest.txt');
      fs.writeFileSync(srcPath, 'original');

      await copyFile(srcPath, destPath);

      expect(fs.existsSync(destPath)).toBe(true);
      expect(fs.readFileSync(destPath, 'utf8')).toBe('original');
      expect(fs.existsSync(srcPath)).toBe(true); // Original preserved
    });

    it('should rename file', async () => {
      const srcPath = path.join(testDir, 'oldname.txt');
      const destPath = path.join(testDir, 'newname.txt');
      fs.writeFileSync(srcPath, 'content');

      await rename(srcPath, destPath);

      expect(fs.existsSync(destPath)).toBe(true);
      expect(fs.existsSync(srcPath)).toBe(false); // Original removed
    });

    it('should rename directory', async () => {
      const srcPath = path.join(testDir, 'olddir');
      const destPath = path.join(testDir, 'newdir');
      fs.mkdirSync(srcPath);
      fs.writeFileSync(path.join(srcPath, 'file.txt'), 'content');

      await rename(srcPath, destPath);

      expect(fs.existsSync(destPath)).toBe(true);
      expect(fs.existsSync(path.join(destPath, 'file.txt'))).toBe(true);
      expect(fs.existsSync(srcPath)).toBe(false);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // JSON Operations
  // ─────────────────────────────────────────────────────────────────────────────

  describe('JSON Operations', () => {
    it('should read JSON file', async () => {
      const filePath = path.join(testDir, 'data.json');
      fs.writeFileSync(filePath, JSON.stringify({ name: 'test', value: 42 }));

      const data = await readJson(filePath);

      expect(data).toEqual({ name: 'test', value: 42 });
    });

    it('should throw on invalid JSON', async () => {
      const filePath = path.join(testDir, 'invalid.json');
      fs.writeFileSync(filePath, 'not valid json');

      await expect(readJson(filePath)).rejects.toThrow();
    });

    it('should return default on missing file with option', async () => {
      const filePath = path.join(testDir, 'missing.json');

      const data = await readJson(filePath, { default: { empty: true } });

      expect(data).toEqual({ empty: true });
    });

    it('should write JSON file', async () => {
      const filePath = path.join(testDir, 'output.json');
      const data = { name: 'test', numbers: [1, 2, 3] };

      await writeJson(filePath, data);

      const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      expect(content).toEqual(data);
    });

    it('should write formatted JSON', async () => {
      const filePath = path.join(testDir, 'formatted.json');
      const data = { a: 1, b: 2 };

      await writeJson(filePath, data, { spaces: 2 });

      const content = fs.readFileSync(filePath, 'utf8');
      expect(content).toContain('\n'); // Formatted has newlines
    });

    it('should create parent dirs for JSON write', async () => {
      const filePath = path.join(testDir, 'nested', 'data.json');
      const data = { nested: true };

      await writeJson(filePath, data);

      expect(fs.existsSync(filePath)).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Error Handling
  // ─────────────────────────────────────────────────────────────────────────────

  describe('Error Handling', () => {
    it('should preserve error codes', async () => {
      const filePath = path.join(testDir, 'nonexistent.txt');

      try {
        await readFile(filePath);
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error.code).toBe('ENOENT');
      }
    });

    it('should handle permission errors gracefully', async () => {
      // Skip on Windows where permissions work differently
      if (process.platform === 'win32') {
        return;
      }

      const filePath = path.join(testDir, 'noperm.txt');
      fs.writeFileSync(filePath, 'content');
      fs.chmodSync(filePath, 0o000);

      try {
        await readFile(filePath);
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error.code).toBe('EACCES');
      } finally {
        fs.chmodSync(filePath, 0o644);
      }
    });
  });
});
