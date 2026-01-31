// ═══════════════════════════════════════════════════════════════════════════════
// LOGGER ABSTRACTION (GAP-017)
// ═══════════════════════════════════════════════════════════════════════════════
// Centralized logging abstraction to replace direct console.log calls
// Provides:
// - Configurable log levels (debug, info, warn, error, silent)
// - Environment variable configuration (LOG_LEVEL, LOG_FORMAT)
// - Prefix/context support for module identification
// - Structured logging with JSON output option
// - Child loggers for hierarchical contexts
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Log level constants
 */
export const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  SILENT: 4
};

/**
 * Map string level names to numeric values
 */
const LEVEL_MAP = {
  debug: LOG_LEVELS.DEBUG,
  info: LOG_LEVELS.INFO,
  warn: LOG_LEVELS.WARN,
  error: LOG_LEVELS.ERROR,
  silent: LOG_LEVELS.SILENT
};

/**
 * Map numeric levels back to string names
 */
const LEVEL_NAMES = {
  [LOG_LEVELS.DEBUG]: 'DEBUG',
  [LOG_LEVELS.INFO]: 'INFO',
  [LOG_LEVELS.WARN]: 'WARN',
  [LOG_LEVELS.ERROR]: 'ERROR',
  [LOG_LEVELS.SILENT]: 'SILENT'
};

/**
 * Parse log level from string
 * @param {string} levelStr - Level string (e.g., 'debug', 'INFO')
 * @param {number} defaultLevel - Default if invalid
 * @returns {number} Numeric log level
 */
function parseLevel(levelStr, defaultLevel = LOG_LEVELS.INFO) {
  if (typeof levelStr !== 'string') {
    return defaultLevel;
  }
  const level = LEVEL_MAP[levelStr.toLowerCase()];
  return level !== undefined ? level : defaultLevel;
}

/**
 * Format an Error object for logging
 * @param {Error} error - Error to format
 * @returns {Object} Formatted error object
 */
function formatError(error) {
  if (!(error instanceof Error)) {
    return error;
  }
  return {
    message: error.message,
    name: error.name,
    stack: error.stack,
    ...(error.code && { code: error.code })
  };
}

/**
 * Process arguments for logging, handling Error objects specially
 * @param {Array} args - Arguments to process
 * @returns {Array} Processed arguments
 */
function processArgs(args) {
  return args.map(arg => {
    if (arg instanceof Error) {
      return formatError(arg);
    }
    return arg;
  });
}

/**
 * Logger class providing configurable logging
 */
export class Logger {
  /**
   * Create a new Logger instance
   * @param {Object} options - Logger options
   * @param {string} options.level - Log level ('debug', 'info', 'warn', 'error', 'silent')
   * @param {string} options.prefix - Prefix to prepend to messages
   * @param {string} options.format - Output format ('text' or 'json')
   */
  constructor(options = {}) {
    // Determine log level: options > env > default
    const envLevel = process.env.LOG_LEVEL;
    const optionLevel = options.level;

    if (optionLevel !== undefined) {
      this.level = parseLevel(optionLevel);
    } else if (envLevel !== undefined) {
      this.level = parseLevel(envLevel);
    } else {
      this.level = LOG_LEVELS.INFO;
    }

    this.prefix = options.prefix || '';

    // Determine format: options > env > default
    const envFormat = process.env.LOG_FORMAT;
    this.format = options.format || envFormat || 'text';
  }

  /**
   * Set log level at runtime
   * @param {string|number} level - New log level
   */
  setLevel(level) {
    if (typeof level === 'number') {
      this.level = level;
    } else {
      this.level = parseLevel(level);
    }
  }

  /**
   * Create a child logger with additional prefix
   * @param {string} childPrefix - Additional prefix for child
   * @returns {Logger} New child logger
   */
  child(childPrefix) {
    return new Logger({
      level: LEVEL_NAMES[this.level].toLowerCase(),
      prefix: this.prefix + childPrefix,
      format: this.format
    });
  }

  /**
   * Internal log method
   * @private
   */
  _log(level, levelName, consoleFn, message, ...args) {
    if (this.level > level) {
      return;
    }

    const timestamp = new Date().toISOString();
    const processedArgs = processArgs(args);

    if (this.format === 'json') {
      const logObject = {
        timestamp,
        level: levelName,
        ...(this.prefix && { prefix: this.prefix }),
        message,
        ...(processedArgs.length === 1 && typeof processedArgs[0] === 'object'
          ? { data: processedArgs[0] }
          : processedArgs.length > 0 && { data: processedArgs })
      };
      consoleFn(JSON.stringify(logObject));
    } else {
      const prefixPart = this.prefix ? `${this.prefix} ` : '';
      const header = `${timestamp} [${levelName}] ${prefixPart}`;
      consoleFn(header, message, ...processedArgs);
    }
  }

  /**
   * Log debug message
   */
  debug(message, ...args) {
    this._log(LOG_LEVELS.DEBUG, 'DEBUG', console.debug, message, ...args);
  }

  /**
   * Log info message
   */
  info(message, ...args) {
    this._log(LOG_LEVELS.INFO, 'INFO', console.log, message, ...args);
  }

  /**
   * Log warning message
   */
  warn(message, ...args) {
    this._log(LOG_LEVELS.WARN, 'WARN', console.warn, message, ...args);
  }

  /**
   * Log error message
   */
  error(message, ...args) {
    this._log(LOG_LEVELS.ERROR, 'ERROR', console.error, message, ...args);
  }

  /**
   * Alias for info() - for console.log replacement compatibility
   */
  log(message, ...args) {
    this.info(message, ...args);
  }
}

/**
 * Create a new logger instance
 * @param {Object} options - Logger options
 * @returns {Logger} New logger instance
 */
export function createLogger(options = {}) {
  return new Logger(options);
}

// Default logger instance
const defaultLogger = createLogger();

export default defaultLogger;
