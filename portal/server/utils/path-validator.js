/**
 * Path Validator Utility (GAP-006)
 *
 * Provides path traversal protection for all file system operations.
 * Validates paths against allowed base directories and prevents
 * directory escape attacks.
 *
 * Based on:
 * - OWASP Path Traversal Attack
 * - CWE-22: Improper Limitation of a Pathname
 * - Node.js Path Security best practices
 *
 * @see https://owasp.org/www-community/attacks/Path_Traversal
 * @see https://cwe.mitre.org/data/definitions/22.html
 */

import path from 'path';
import fs from 'fs';

// Error codes for path validation
export const PATH_VALIDATOR_ERRORS = {
  TRAVERSAL_DETECTED: 'path_traversal_detected',
  NULL_BYTE_DETECTED: 'null_byte_detected',
  INVALID_PATH: 'invalid_path',
  NO_ALLOWED_PATHS: 'no_allowed_paths',
  PATH_NOT_FOUND: 'path_not_found',
  SYMLINK_ESCAPE: 'symlink_escape'
};

// Path traversal patterns to detect
const TRAVERSAL_PATTERNS = [
  /\.\.\//,                    // ../
  /\.\.\\/,                    // ..\
  /%2e%2e%2f/i,               // URL encoded ../
  /%2e%2e%5c/i,               // URL encoded ..\
  /%252e%252e%252f/i,         // Double URL encoded
  /%252e%252e%255c/i,         // Double URL encoded backslash
  /%c0%af/i,                  // Unicode
  /%c0%2f/i,                  // Overlong UTF-8
  /%c1%9c/i,                  // Another overlong
  /\.\s+\.\//,                // Dot space dot
  /\.{3,}\//                  // Multiple dots
];

// Dangerous absolute paths (system directories)
// Note: /var/folders is macOS temp, /var/tmp is allowed
const DANGEROUS_PATHS = [
  /^\/etc\//i,
  /^\/var\/(?!folders|tmp)/i,  // Allow /var/folders and /var/tmp
  /^\/usr\//i,
  /^\/root\//i,
  /^\/proc\//i,
  /^\/sys\//i,
  /^c:\\windows/i,
  /^c:\\program files/i,
  /^c:\\users\\[^\\]+\\appdata/i  // Only block AppData, not all users
];

/**
 * Check if a path contains traversal patterns
 *
 * @param {string} inputPath - Path to check
 * @returns {boolean} True if traversal pattern detected
 */
function containsTraversalPattern(inputPath) {
  if (!inputPath) return false;

  // Normalize path separators for checking
  const normalized = inputPath.replace(/\\/g, '/');

  // Check against traversal patterns
  for (const pattern of TRAVERSAL_PATTERNS) {
    if (pattern.test(inputPath) || pattern.test(normalized)) {
      return true;
    }
  }

  return false;
}

/**
 * Check if path contains null bytes
 *
 * @param {string} inputPath - Path to check
 * @returns {boolean} True if null byte detected
 */
function containsNullByte(inputPath) {
  return inputPath.includes('\x00') || inputPath.includes('\0');
}

/**
 * Check if path contains control characters
 *
 * @param {string} inputPath - Path to check
 * @returns {boolean} True if control characters detected
 */
function containsControlChars(inputPath) {
  // eslint-disable-next-line no-control-regex
  return /[\x00-\x1f\x7f]/.test(inputPath);
}

/**
 * Check if a resolved path is within a base directory
 *
 * @param {string} resolvedPath - Absolute resolved path
 * @param {string} basePath - Base directory path
 * @returns {boolean} True if path is within base
 */
export function isPathWithinBase(resolvedPath, basePath) {
  // Normalize both paths
  const normalizedResolved = path.normalize(resolvedPath);
  const normalizedBase = path.normalize(basePath);

  // Ensure base ends with separator for proper prefix check
  const baseWithSep = normalizedBase.endsWith(path.sep)
    ? normalizedBase
    : normalizedBase + path.sep;

  // Check if resolved path starts with base or equals base
  return normalizedResolved === normalizedBase ||
         normalizedResolved.startsWith(baseWithSep);
}

/**
 * Resolve a path to its real absolute path
 *
 * @param {string} inputPath - Path to resolve
 * @param {Object} options - Options
 * @param {boolean} options.mustExist - Whether path must exist
 * @returns {string|null} Resolved path or null if error
 */
export function resolveRealPath(inputPath, options = {}) {
  const { mustExist = false } = options;

  try {
    // First resolve to absolute path
    const absolutePath = path.resolve(inputPath);

    if (mustExist) {
      // Use realpath to follow symlinks and verify existence
      return fs.realpathSync(absolutePath);
    }

    // For non-existent paths, just normalize
    return path.normalize(absolutePath);
  } catch (e) {
    if (mustExist) {
      return null;
    }
    // For non-existent paths, return normalized absolute
    return path.normalize(path.resolve(inputPath));
  }
}

/**
 * Validate a path against allowed base directories
 *
 * @param {string} inputPath - Path to validate
 * @param {string[]} allowedBasePaths - Array of allowed base directories
 * @param {Object} options - Validation options
 * @param {boolean} options.resolveSymlinks - Whether to resolve symlinks
 * @param {boolean} options.mustExist - Whether path must exist
 * @returns {Object} Validation result { valid, resolvedPath, error, message }
 */
export function validatePath(inputPath, allowedBasePaths, options = {}) {
  const { resolveSymlinks = true, mustExist = false } = options;

  // Check for null/undefined/non-string
  if (!inputPath || typeof inputPath !== 'string') {
    return {
      valid: false,
      error: PATH_VALIDATOR_ERRORS.INVALID_PATH,
      message: 'Path must be a non-empty string'
    };
  }

  // Check for empty allowed paths
  if (!allowedBasePaths || allowedBasePaths.length === 0) {
    return {
      valid: false,
      error: PATH_VALIDATOR_ERRORS.NO_ALLOWED_PATHS,
      message: 'No allowed base paths configured'
    };
  }

  // Check for null bytes (critical security issue)
  if (containsNullByte(inputPath)) {
    return {
      valid: false,
      error: PATH_VALIDATOR_ERRORS.NULL_BYTE_DETECTED,
      message: 'Invalid characters in path'
    };
  }

  // Check for control characters
  if (containsControlChars(inputPath)) {
    return {
      valid: false,
      error: PATH_VALIDATOR_ERRORS.INVALID_PATH,
      message: 'Invalid characters in path'
    };
  }

  // Check for traversal patterns in raw input
  if (containsTraversalPattern(inputPath)) {
    return {
      valid: false,
      error: PATH_VALIDATOR_ERRORS.TRAVERSAL_DETECTED,
      message: 'Path traversal attempt detected'
    };
  }

  // Decode URL encoding and check again
  try {
    const decoded = decodeURIComponent(inputPath);
    if (decoded !== inputPath && containsTraversalPattern(decoded)) {
      return {
        valid: false,
        error: PATH_VALIDATOR_ERRORS.TRAVERSAL_DETECTED,
        message: 'Path traversal attempt detected'
      };
    }

    // Double decode check
    const doubleDecoded = decodeURIComponent(decoded);
    if (doubleDecoded !== decoded && containsTraversalPattern(doubleDecoded)) {
      return {
        valid: false,
        error: PATH_VALIDATOR_ERRORS.TRAVERSAL_DETECTED,
        message: 'Path traversal attempt detected'
      };
    }
  } catch (e) {
    // Invalid URL encoding - could be an attack
  }

  // GAP-015: TOCTOU-safe path resolution
  // Try realpathSync directly without existsSync check to avoid race condition
  let resolvedPath;
  if (resolveSymlinks) {
    try {
      // Atomically resolve symlinks - no TOCTOU vulnerability
      resolvedPath = fs.realpathSync(inputPath);
    } catch (e) {
      // File doesn't exist
      if (mustExist) {
        return {
          valid: false,
          error: PATH_VALIDATOR_ERRORS.PATH_NOT_FOUND,
          message: 'Path does not exist'
        };
      }
      // For non-existent paths, resolve parent to get canonical base path
      // This handles macOS /var -> /private/var symlink properly
      const parentDir = path.dirname(inputPath);
      const basename = path.basename(inputPath);
      try {
        const resolvedParent = fs.realpathSync(parentDir);
        resolvedPath = path.join(resolvedParent, basename);
      } catch (parentErr) {
        // Parent also doesn't exist, use path.resolve
        resolvedPath = path.resolve(inputPath);
      }
    }
  } else {
    // No symlink resolution requested
    if (mustExist) {
      try {
        fs.accessSync(inputPath, fs.constants.F_OK);
        resolvedPath = path.resolve(inputPath);
      } catch (e) {
        return {
          valid: false,
          error: PATH_VALIDATOR_ERRORS.PATH_NOT_FOUND,
          message: 'Path does not exist'
        };
      }
    } else {
      resolvedPath = path.resolve(inputPath);
    }
  }

  // Normalize the resolved path
  resolvedPath = path.normalize(resolvedPath);

  // Check against dangerous system paths
  for (const dangerousPattern of DANGEROUS_PATHS) {
    if (dangerousPattern.test(resolvedPath)) {
      return {
        valid: false,
        error: PATH_VALIDATOR_ERRORS.TRAVERSAL_DETECTED,
        message: 'Access to system directories is not allowed'
      };
    }
  }

  // Validate against allowed base paths
  // GAP-015: TOCTOU-safe base path resolution
  // Also resolve base paths to handle symlinks (e.g., /var -> /private/var on macOS)
  let isWithinAllowed = false;
  for (const basePath of allowedBasePaths) {
    let resolvedBase;
    try {
      // GAP-015: Try realpathSync directly without existsSync check
      resolvedBase = fs.realpathSync(basePath);
    } catch (e) {
      // Base path doesn't exist, use path.resolve
      resolvedBase = path.resolve(basePath);
    }

    if (isPathWithinBase(resolvedPath, resolvedBase)) {
      isWithinAllowed = true;
      break;
    }
  }

  if (!isWithinAllowed) {
    return {
      valid: false,
      error: PATH_VALIDATOR_ERRORS.TRAVERSAL_DETECTED,
      message: 'Path is outside allowed directories'
    };
  }

  return {
    valid: true,
    resolvedPath: resolvedPath
  };
}

/**
 * Create Express middleware for path validation
 *
 * @param {Object} config - Middleware configuration
 * @param {string[]} config.allowedBasePaths - Allowed base directories
 * @param {string} config.pathField - Request body field containing path
 * @param {boolean} config.required - Whether path field is required
 * @param {boolean} config.addResolvedPath - Add resolved path to request
 * @param {Function} config.onTraversalAttempt - Callback for traversal attempts
 * @returns {Function} Express middleware
 */
export function createPathValidatorMiddleware(config = {}) {
  const {
    allowedBasePaths = [],
    pathField = 'projectPath',
    required = false,
    addResolvedPath = false,
    onTraversalAttempt = null,
    resolveSymlinks = true
  } = config;

  return (req, res, next) => {
    const inputPath = req.body?.[pathField] || req.query?.[pathField];

    // If path not present
    if (!inputPath) {
      if (required) {
        return res.status(400).json({
          error: PATH_VALIDATOR_ERRORS.INVALID_PATH,
          message: `${pathField} is required`
        });
      }
      return next();
    }

    // Validate the path
    const result = validatePath(inputPath, allowedBasePaths, { resolveSymlinks });

    if (!result.valid) {
      // Log traversal attempt if callback provided
      if (onTraversalAttempt && result.error === PATH_VALIDATOR_ERRORS.TRAVERSAL_DETECTED) {
        onTraversalAttempt({
          attemptedPath: inputPath,
          clientIp: req.ip || req.connection?.remoteAddress,
          timestamp: new Date().toISOString(),
          error: result.error,
          userAgent: req.get('User-Agent')
        });
      }

      // Return 403 for traversal attempts, 400 for other errors
      const statusCode = result.error === PATH_VALIDATOR_ERRORS.TRAVERSAL_DETECTED ? 403 : 400;

      return res.status(statusCode).json({
        error: result.error,
        message: result.message
      });
    }

    // Add resolved path to request if configured
    if (addResolvedPath) {
      req[`resolved${pathField.charAt(0).toUpperCase() + pathField.slice(1)}`] = result.resolvedPath;
    }

    next();
  };
}

/**
 * Validate and resolve a path (utility function)
 *
 * @param {string} inputPath - Path to validate
 * @param {string} basePath - Single allowed base path
 * @returns {string|null} Resolved path or null if invalid
 */
export function safeResolvePath(inputPath, basePath) {
  const result = validatePath(inputPath, [basePath]);
  return result.valid ? result.resolvedPath : null;
}

export default {
  validatePath,
  isPathWithinBase,
  resolveRealPath,
  createPathValidatorMiddleware,
  safeResolvePath,
  PATH_VALIDATOR_ERRORS
};
