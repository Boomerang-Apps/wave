/**
 * TDD Tests for Path Validator (GAP-006)
 *
 * Tests path traversal protection including:
 * - Directory escape patterns blocked
 * - Symlink attack prevention
 * - Returns 403 on traversal attempt
 * - Audit logging of attempts
 *
 * Based on:
 * - OWASP Path Traversal Attack
 * - CWE-22: Improper Limitation of a Pathname
 * - Node.js Path Security
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';

// Import the module we're testing
import {
  validatePath,
  isPathWithinBase,
  resolveRealPath,
  createPathValidatorMiddleware,
  PATH_VALIDATOR_ERRORS
} from '../utils/path-validator.js';

describe('Path Validator (GAP-006)', () => {
  let tempDir;
  let allowedDir;
  let outsideDir;

  beforeEach(() => {
    // Create temp directories for testing
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'path-validator-test-'));
    allowedDir = path.join(tempDir, 'allowed');
    outsideDir = path.join(tempDir, 'outside');

    fs.mkdirSync(allowedDir, { recursive: true });
    fs.mkdirSync(outsideDir, { recursive: true });

    // Create test files
    fs.writeFileSync(path.join(allowedDir, 'test.txt'), 'test content');
    fs.writeFileSync(path.join(outsideDir, 'secret.txt'), 'secret content');
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  // ============================================
  // UNIT TESTS - isPathWithinBase
  // ============================================

  describe('isPathWithinBase', () => {
    it('should return true for path within base directory', () => {
      const testPath = path.join(allowedDir, 'test.txt');
      expect(isPathWithinBase(testPath, allowedDir)).toBe(true);
    });

    it('should return true for nested path within base', () => {
      const nestedDir = path.join(allowedDir, 'subdir');
      fs.mkdirSync(nestedDir, { recursive: true });
      const testPath = path.join(nestedDir, 'file.txt');
      expect(isPathWithinBase(testPath, allowedDir)).toBe(true);
    });

    it('should return false for path outside base directory', () => {
      const testPath = path.join(outsideDir, 'secret.txt');
      expect(isPathWithinBase(testPath, allowedDir)).toBe(false);
    });

    it('should return false for sibling directory', () => {
      const testPath = path.join(tempDir, 'sibling', 'file.txt');
      expect(isPathWithinBase(testPath, allowedDir)).toBe(false);
    });

    it('should return false for parent directory', () => {
      expect(isPathWithinBase(tempDir, allowedDir)).toBe(false);
    });

    it('should return true for base directory itself', () => {
      expect(isPathWithinBase(allowedDir, allowedDir)).toBe(true);
    });
  });

  // ============================================
  // UNIT TESTS - validatePath
  // ============================================

  describe('validatePath', () => {
    it('should accept valid path within allowed directory', () => {
      const testPath = path.join(allowedDir, 'test.txt');
      const result = validatePath(testPath, [allowedDir]);

      expect(result.valid).toBe(true);
      // Resolved path may differ due to symlink resolution (e.g., /var -> /private/var on macOS)
      expect(result.resolvedPath).toContain('test.txt');
    });

    it('should reject ../ traversal patterns', () => {
      const maliciousPath = path.join(allowedDir, '..', 'outside', 'secret.txt');
      const result = validatePath(maliciousPath, [allowedDir]);

      expect(result.valid).toBe(false);
      expect(result.error).toBe(PATH_VALIDATOR_ERRORS.TRAVERSAL_DETECTED);
    });

    it('should reject ../../ deep traversal', () => {
      const maliciousPath = path.join(allowedDir, '..', '..', 'etc', 'passwd');
      const result = validatePath(maliciousPath, [allowedDir]);

      expect(result.valid).toBe(false);
      expect(result.error).toBe(PATH_VALIDATOR_ERRORS.TRAVERSAL_DETECTED);
    });

    it('should reject URL-encoded traversal (%2e%2e%2f)', () => {
      const maliciousPath = path.join(allowedDir, '%2e%2e%2f', 'outside');
      const result = validatePath(maliciousPath, [allowedDir]);

      expect(result.valid).toBe(false);
      expect(result.error).toBe(PATH_VALIDATOR_ERRORS.TRAVERSAL_DETECTED);
    });

    it('should reject double URL-encoded traversal', () => {
      const maliciousPath = path.join(allowedDir, '%252e%252e%252f', 'outside');
      const result = validatePath(maliciousPath, [allowedDir]);

      expect(result.valid).toBe(false);
      expect(result.error).toBe(PATH_VALIDATOR_ERRORS.TRAVERSAL_DETECTED);
    });

    it('should reject backslash traversal patterns', () => {
      const maliciousPath = allowedDir + '\\..\\outside\\secret.txt';
      const result = validatePath(maliciousPath, [allowedDir]);

      expect(result.valid).toBe(false);
      expect(result.error).toBe(PATH_VALIDATOR_ERRORS.TRAVERSAL_DETECTED);
    });

    it('should reject null byte injection', () => {
      const maliciousPath = path.join(allowedDir, 'test.txt\x00.jpg');
      const result = validatePath(maliciousPath, [allowedDir]);

      expect(result.valid).toBe(false);
      expect(result.error).toBe(PATH_VALIDATOR_ERRORS.NULL_BYTE_DETECTED);
    });

    it('should reject paths with control characters', () => {
      const maliciousPath = path.join(allowedDir, 'test\nfile.txt');
      const result = validatePath(maliciousPath, [allowedDir]);

      expect(result.valid).toBe(false);
    });

    it('should accept path with multiple allowed base directories', () => {
      const testPath = path.join(outsideDir, 'secret.txt');
      const result = validatePath(testPath, [allowedDir, outsideDir]);

      expect(result.valid).toBe(true);
    });

    it('should reject empty path', () => {
      const result = validatePath('', [allowedDir]);

      expect(result.valid).toBe(false);
      expect(result.error).toBe(PATH_VALIDATOR_ERRORS.INVALID_PATH);
    });

    it('should reject non-string path', () => {
      const result = validatePath(null, [allowedDir]);

      expect(result.valid).toBe(false);
      expect(result.error).toBe(PATH_VALIDATOR_ERRORS.INVALID_PATH);
    });

    it('should reject when no allowed directories specified', () => {
      const testPath = path.join(allowedDir, 'test.txt');
      const result = validatePath(testPath, []);

      expect(result.valid).toBe(false);
      expect(result.error).toBe(PATH_VALIDATOR_ERRORS.NO_ALLOWED_PATHS);
    });
  });

  // ============================================
  // UNIT TESTS - Symlink Attack Prevention
  // ============================================

  describe('Symlink Attack Prevention', () => {
    it('should resolve symlinks before validation', () => {
      // Create a symlink inside allowed dir pointing outside
      const symlinkPath = path.join(allowedDir, 'malicious-link');

      try {
        fs.symlinkSync(outsideDir, symlinkPath);
      } catch (e) {
        // Skip on systems without symlink support
        return;
      }

      const targetPath = path.join(symlinkPath, 'secret.txt');
      const result = validatePath(targetPath, [allowedDir], { resolveSymlinks: true });

      expect(result.valid).toBe(false);
      expect(result.error).toBe(PATH_VALIDATOR_ERRORS.TRAVERSAL_DETECTED);
    });

    it('should accept symlinks that resolve within allowed directory', () => {
      const subdir = path.join(allowedDir, 'subdir');
      fs.mkdirSync(subdir, { recursive: true });
      fs.writeFileSync(path.join(subdir, 'file.txt'), 'content');

      const symlinkPath = path.join(allowedDir, 'valid-link');

      try {
        fs.symlinkSync(subdir, symlinkPath);
      } catch (e) {
        // Skip on systems without symlink support
        return;
      }

      const targetPath = path.join(symlinkPath, 'file.txt');
      const result = validatePath(targetPath, [allowedDir], { resolveSymlinks: true });

      expect(result.valid).toBe(true);
    });
  });

  // ============================================
  // UNIT TESTS - resolveRealPath
  // ============================================

  describe('resolveRealPath', () => {
    it('should resolve relative paths to absolute', () => {
      const result = resolveRealPath('./test');
      expect(path.isAbsolute(result)).toBe(true);
    });

    it('should normalize path separators', () => {
      const testPath = path.join(allowedDir, 'test.txt');
      const result = resolveRealPath(testPath);
      expect(result).not.toContain('..'); // Should be normalized
    });

    it('should handle non-existent paths gracefully', () => {
      const nonExistent = path.join(allowedDir, 'does-not-exist.txt');
      const result = resolveRealPath(nonExistent, { mustExist: false });
      expect(result).toBeDefined();
    });

    it('should return error for non-existent path when mustExist is true', () => {
      const nonExistent = path.join(allowedDir, 'does-not-exist.txt');
      const result = resolveRealPath(nonExistent, { mustExist: true });
      expect(result).toBeNull();
    });
  });

  // ============================================
  // INTEGRATION TESTS - Middleware
  // ============================================

  describe('createPathValidatorMiddleware', () => {
    let req, res, next;

    beforeEach(() => {
      req = {
        body: { projectPath: allowedDir },
        ip: '127.0.0.1',
        get: vi.fn().mockReturnValue('test-user-agent')
      };
      res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis()
      };
      next = vi.fn();
    });

    it('should call next() for valid projectPath', () => {
      const middleware = createPathValidatorMiddleware({
        allowedBasePaths: [allowedDir],
        pathField: 'projectPath'
      });

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should return 403 for path traversal attempt', () => {
      req.body.projectPath = path.join(allowedDir, '..', 'outside');

      const middleware = createPathValidatorMiddleware({
        allowedBasePaths: [allowedDir],
        pathField: 'projectPath'
      });

      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: PATH_VALIDATOR_ERRORS.TRAVERSAL_DETECTED
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 400 for missing projectPath', () => {
      req.body = {};

      const middleware = createPathValidatorMiddleware({
        allowedBasePaths: [allowedDir],
        pathField: 'projectPath',
        required: true
      });

      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(next).not.toHaveBeenCalled();
    });

    it('should skip validation if path field not present and not required', () => {
      req.body = {};

      const middleware = createPathValidatorMiddleware({
        allowedBasePaths: [allowedDir],
        pathField: 'projectPath',
        required: false
      });

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should add resolved path to request', () => {
      const middleware = createPathValidatorMiddleware({
        allowedBasePaths: [allowedDir],
        pathField: 'projectPath',
        addResolvedPath: true
      });

      middleware(req, res, next);

      expect(req.resolvedProjectPath).toBeDefined();
      expect(next).toHaveBeenCalled();
    });

    it('should call audit callback on traversal attempt', () => {
      const auditCallback = vi.fn();
      req.body.projectPath = path.join(allowedDir, '..', 'outside');

      const middleware = createPathValidatorMiddleware({
        allowedBasePaths: [allowedDir],
        pathField: 'projectPath',
        onTraversalAttempt: auditCallback
      });

      middleware(req, res, next);

      expect(auditCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          attemptedPath: expect.any(String),
          clientIp: '127.0.0.1',
          timestamp: expect.any(String)
        })
      );
    });
  });

  // ============================================
  // SECURITY TESTS
  // ============================================

  describe('Security - Encoding Variants', () => {
    const encodingVariants = [
      { name: 'URL encoded', path: '../%2e%2e/outside' },
      { name: 'Double URL encoded', path: '%252e%252e%252f' },
      { name: 'Unicode', path: '..%c0%af' },
      { name: 'Overlong UTF-8', path: '..%c0%2f' },
      { name: 'Mixed slashes', path: '..\\../' },
      { name: 'Triple dot', path: '.../' },
      { name: 'Dot space dot', path: '. ./' }
    ];

    encodingVariants.forEach(({ name, path: maliciousSegment }) => {
      it(`should block ${name} encoding`, () => {
        const maliciousPath = path.join(allowedDir, maliciousSegment, 'etc', 'passwd');
        const result = validatePath(maliciousPath, [allowedDir]);

        // Either detected as traversal or resolved outside allowed path
        expect(result.valid).toBe(false);
      });
    });
  });

  describe('Security - Error Messages', () => {
    it('should not leak absolute path in error response', () => {
      const req = {
        body: { projectPath: path.join(allowedDir, '..', 'outside') },
        ip: '127.0.0.1',
        get: vi.fn().mockReturnValue('test-user-agent')
      };
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis()
      };
      const next = vi.fn();

      const middleware = createPathValidatorMiddleware({
        allowedBasePaths: [allowedDir],
        pathField: 'projectPath'
      });

      middleware(req, res, next);

      const response = res.json.mock.calls[0][0];
      expect(response.message).not.toContain(tempDir);
      expect(response.message).not.toContain(allowedDir);
    });
  });

  // ============================================
  // ERROR CODES
  // ============================================

  describe('PATH_VALIDATOR_ERRORS constants', () => {
    it('should define TRAVERSAL_DETECTED error code', () => {
      expect(PATH_VALIDATOR_ERRORS.TRAVERSAL_DETECTED).toBe('path_traversal_detected');
    });

    it('should define NULL_BYTE_DETECTED error code', () => {
      expect(PATH_VALIDATOR_ERRORS.NULL_BYTE_DETECTED).toBe('null_byte_detected');
    });

    it('should define INVALID_PATH error code', () => {
      expect(PATH_VALIDATOR_ERRORS.INVALID_PATH).toBe('invalid_path');
    });

    it('should define NO_ALLOWED_PATHS error code', () => {
      expect(PATH_VALIDATOR_ERRORS.NO_ALLOWED_PATHS).toBe('no_allowed_paths');
    });
  });
});
