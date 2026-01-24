/**
 * Error Handler Utility (GAP-011)
 *
 * Eliminates silent failures by providing standardized error logging
 * with correlation IDs, context, and severity levels.
 *
 * Based on:
 * - OWASP A09:2021 Security Logging Failures
 * - 12-Factor App - Logs (treat logs as event streams)
 * - Node.js Error Handling Best Practices
 *
 * @see https://owasp.org/Top10/A09_2021-Security_Logging_and_Monitoring_Failures/
 * @see https://12factor.net/logs
 */

import crypto from 'crypto';

// Log levels
export const LOG_LEVELS = {
  ERROR: 'ERROR',
  WARN: 'WARN',
  INFO: 'INFO'
};

// Sensitive patterns to redact
const SENSITIVE_PATTERNS = [
  /password\s*[=:]\s*['"]?([^'"\s]+)/gi,
  /secret\s*[=:]\s*['"]?([^'"\s]+)/gi,
  /api[_-]?key\s*[=:]\s*['"]?([^'"\s]+)/gi,
  /token\s*[=:]\s*['"]?([^'"\s]+)/gi,
  /authorization\s*[=:]\s*['"]?([^'"\s]+)/gi,
  /bearer\s+([^\s]+)/gi
];

// Maximum message length to prevent log flooding
const MAX_MESSAGE_LENGTH = 2000;

/**
 * Generate a correlation ID (UUID v4)
 *
 * @returns {string} UUID for request tracing
 */
export function generateCorrelationId() {
  return crypto.randomUUID();
}

/**
 * Sanitize a message for safe logging
 * Prevents log injection and redacts sensitive data
 *
 * @param {any} input - Input to sanitize
 * @returns {string} Sanitized string
 */
export function sanitizeForLog(input) {
  if (input === null) return 'null';
  if (input === undefined) return 'undefined';

  let str;
  if (typeof input === 'object') {
    try {
      str = JSON.stringify(input);
    } catch (e) {
      str = String(input);
    }
  } else {
    str = String(input);
  }

  // Remove newlines and carriage returns (prevent log injection)
  str = str.replace(/[\r\n]/g, ' ');

  // Remove template literal injection attempts
  str = str.replace(/\$\{/g, '[EXPR]');

  // Redact sensitive patterns
  for (const pattern of SENSITIVE_PATTERNS) {
    str = str.replace(pattern, (match, value) => {
      const key = match.split(/[=:]/)[0];
      return `${key}=[REDACTED]`;
    });
  }

  // Truncate if too long
  if (str.length > MAX_MESSAGE_LENGTH) {
    str = str.substring(0, MAX_MESSAGE_LENGTH) + '...[truncated]';
  }

  return str;
}

/**
 * Create error context with metadata
 *
 * @param {string} operation - Name of the operation
 * @param {Object} metadata - Additional context
 * @param {string} correlationId - Optional correlation ID
 * @returns {Object} Error context
 */
export function createErrorContext(operation, metadata = {}, correlationId = null) {
  return {
    correlationId: correlationId || generateCorrelationId(),
    timestamp: new Date().toISOString(),
    operation,
    metadata
  };
}

/**
 * Format a log entry as JSON string
 *
 * @param {string} level - Log level
 * @param {string} message - Error message
 * @param {Object} context - Error context
 * @param {Error} error - Original error object
 * @returns {string} Formatted log entry
 */
function formatLogEntry(level, message, context, error = null) {
  const entry = {
    level,
    timestamp: context.timestamp,
    correlation_id: context.correlationId,
    operation: context.operation,
    message: sanitizeForLog(message),
    metadata: context.metadata
  };

  // Include stack trace in non-production for debugging
  if (error && error.stack && process.env.NODE_ENV !== 'production') {
    entry.stack = sanitizeForLog(error.stack);
  }

  return JSON.stringify(entry);
}

/**
 * Log an error with full context
 *
 * @param {Error|string} error - Error object or message
 * @param {string} operation - Name of the operation that failed
 * @param {Object} metadata - Additional context
 * @param {string} correlationId - Optional correlation ID for tracing
 * @returns {string} Correlation ID for tracking
 */
export function logError(error, operation, metadata = {}, correlationId = null) {
  const context = createErrorContext(operation, metadata, correlationId);
  const message = error instanceof Error ? error.message : String(error);

  const logEntry = formatLogEntry(LOG_LEVELS.ERROR, message, context, error instanceof Error ? error : null);

  // Output to stderr for 12-factor compliance
  console.error(logEntry);

  // Track in singleton for metrics
  ErrorHandler.getInstance()._incrementErrorCount();

  return context.correlationId;
}

/**
 * Log a warning with context
 *
 * @param {string} message - Warning message
 * @param {string} operation - Name of the operation
 * @param {Object} metadata - Additional context
 * @returns {string} Correlation ID
 */
export function logWarn(message, operation, metadata = {}) {
  const context = createErrorContext(operation, metadata);
  const logEntry = formatLogEntry(LOG_LEVELS.WARN, message, context);

  console.warn(logEntry);

  return context.correlationId;
}

/**
 * Log info with context
 *
 * @param {string} message - Info message
 * @param {string} operation - Name of the operation
 * @param {Object} metadata - Additional context
 * @returns {string} Correlation ID
 */
export function logInfo(message, operation, metadata = {}) {
  const context = createErrorContext(operation, metadata);
  const logEntry = formatLogEntry(LOG_LEVELS.INFO, message, context);

  console.info(logEntry);

  return context.correlationId;
}

/**
 * Safely execute a synchronous operation
 * Logs errors but returns a default value instead of throwing
 *
 * @param {Function} fn - Function to execute
 * @param {string} operation - Name of the operation
 * @param {Object} options - Options { defaultValue, silent, metadata }
 * @returns {any} Result or default value
 */
export function trySafe(fn, operation, options = {}) {
  const { defaultValue = null, silent = false, metadata = {} } = options;

  try {
    return fn();
  } catch (error) {
    if (!silent) {
      logError(error, operation, metadata);
    }
    return defaultValue;
  }
}

/**
 * Safely execute an async operation
 * Logs errors but returns a default value instead of rejecting
 *
 * @param {Function} fn - Async function to execute
 * @param {string} operation - Name of the operation
 * @param {Object} options - Options { defaultValue, silent, metadata }
 * @returns {Promise<any>} Result or default value
 */
export async function trySafeAsync(fn, operation, options = {}) {
  const { defaultValue = null, silent = false, metadata = {} } = options;

  try {
    return await fn();
  } catch (error) {
    if (!silent) {
      logError(error, operation, metadata);
    }
    return defaultValue;
  }
}

/**
 * Wrap an async function to log errors before re-throwing
 * Use when you want errors to propagate but still be logged
 *
 * @param {Function} fn - Async function to wrap
 * @param {string} operation - Name of the operation
 * @param {Object} metadata - Additional context
 * @returns {Function} Wrapped function
 */
export function wrapAsync(fn, operation, metadata = {}) {
  return async function (...args) {
    try {
      return await fn(...args);
    } catch (error) {
      logError(error, operation, metadata);
      throw error; // Re-throw for caller to handle
    }
  };
}

/**
 * ErrorHandler Singleton
 * Provides centralized error handling with metrics
 */
export class ErrorHandler {
  static #instance = null;
  #errorCount = 0;
  #customOutputHandler = null;

  constructor() {
    if (ErrorHandler.#instance) {
      return ErrorHandler.#instance;
    }
    ErrorHandler.#instance = this;
  }

  static getInstance() {
    if (!ErrorHandler.#instance) {
      ErrorHandler.#instance = new ErrorHandler();
    }
    return ErrorHandler.#instance;
  }

  _incrementErrorCount() {
    this.#errorCount++;
  }

  getErrorCount() {
    return this.#errorCount;
  }

  resetErrorCount() {
    this.#errorCount = 0;
  }

  setOutputHandler(handler) {
    this.#customOutputHandler = handler;
  }

  getOutputHandler() {
    return this.#customOutputHandler;
  }

  logError(error, operation, metadata = {}) {
    const correlationId = logError(error, operation, metadata);

    if (this.#customOutputHandler) {
      this.#customOutputHandler({
        level: LOG_LEVELS.ERROR,
        error,
        operation,
        metadata,
        correlationId
      });
    }

    return correlationId;
  }

  logWarn(message, operation, metadata = {}) {
    const correlationId = logWarn(message, operation, metadata);

    if (this.#customOutputHandler) {
      this.#customOutputHandler({
        level: LOG_LEVELS.WARN,
        message,
        operation,
        metadata,
        correlationId
      });
    }

    return correlationId;
  }

  logInfo(message, operation, metadata = {}) {
    const correlationId = logInfo(message, operation, metadata);

    if (this.#customOutputHandler) {
      this.#customOutputHandler({
        level: LOG_LEVELS.INFO,
        message,
        operation,
        metadata,
        correlationId
      });
    }

    return correlationId;
  }
}

export default {
  logError,
  logWarn,
  logInfo,
  generateCorrelationId,
  trySafe,
  trySafeAsync,
  createErrorContext,
  sanitizeForLog,
  wrapAsync,
  ErrorHandler,
  LOG_LEVELS
};
