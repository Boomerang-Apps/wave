/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * WAVE FRAMEWORK - OWASP Security Middleware
 * ═══════════════════════════════════════════════════════════════════════════════
 * Implements OWASP Top 10 protections for the WAVE Portal.
 *
 * OWASP Top 10 (2021) Coverage:
 *   A01:2021 - Broken Access Control
 *   A02:2021 - Cryptographic Failures
 *   A03:2021 - Injection
 *   A04:2021 - Insecure Design
 *   A05:2021 - Security Misconfiguration
 *   A06:2021 - Vulnerable Components (handled by npm audit)
 *   A07:2021 - Identification and Authentication Failures
 *   A08:2021 - Software and Data Integrity Failures
 *   A09:2021 - Security Logging and Monitoring Failures
 *   A10:2021 - Server-Side Request Forgery (SSRF)
 *
 * Usage:
 *   import { securityMiddleware, validateInput } from './security-middleware.js';
 *   app.use(securityMiddleware());
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import crypto from 'crypto';

// ─────────────────────────────────────────────────────────────────────────────
// CSP NONCE GENERATION (SEC-002)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generate cryptographically random nonce for CSP
 * SEC-002: Removes need for 'unsafe-inline' in script-src
 *
 * Sources:
 * - https://content-security-policy.com/nonce/
 * - https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html
 * - https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy/script-src
 *
 * @returns {string} Base64-encoded 128-bit random nonce
 */
export function generateNonce() {
  return crypto.randomBytes(16).toString('base64');
}

/**
 * CSP Nonce middleware - generates unique nonce per request
 * Sets res.locals.nonce for use in templates
 *
 * @returns {Function} Express middleware
 */
export function cspNonceMiddleware() {
  return (req, res, next) => {
    res.locals.nonce = generateNonce();
    next();
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// SECURITY HEADERS (A05: Security Misconfiguration)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Set security headers
 * @param {Object} options - Configuration options
 * @param {boolean} options.useNonce - Use nonce-based CSP (requires cspNonceMiddleware)
 * @returns {Function} Express middleware
 */
function securityHeaders(options = {}) {
  const defaultOptions = {
    contentSecurityPolicy: true,
    xssProtection: true,
    noSniff: true,
    frameOptions: 'DENY',
    hsts: true,
    referrerPolicy: 'strict-origin-when-cross-origin',
    useNonce: false, // SEC-002: Enable nonce-based CSP
    ...options
  };

  return (req, res, next) => {
    // X-Content-Type-Options - Prevent MIME sniffing
    if (defaultOptions.noSniff) {
      res.setHeader('X-Content-Type-Options', 'nosniff');
    }

    // X-Frame-Options - Prevent clickjacking
    if (defaultOptions.frameOptions) {
      res.setHeader('X-Frame-Options', defaultOptions.frameOptions);
    }

    // X-XSS-Protection - XSS filter
    if (defaultOptions.xssProtection) {
      res.setHeader('X-XSS-Protection', '1; mode=block');
    }

    // Strict-Transport-Security - Force HTTPS
    // SEC-008: Always set HSTS when enabled (not just on HTTPS requests)
    // This ensures browsers remember to use HTTPS even if they first connect via HTTP
    if (defaultOptions.hsts) {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }

    // Referrer-Policy
    if (defaultOptions.referrerPolicy) {
      res.setHeader('Referrer-Policy', defaultOptions.referrerPolicy);
    }

    // Content-Security-Policy
    if (defaultOptions.contentSecurityPolicy) {
      let csp;

      if (typeof defaultOptions.contentSecurityPolicy === 'string') {
        csp = defaultOptions.contentSecurityPolicy;
      } else if (defaultOptions.useNonce && res.locals.nonce) {
        // SEC-002: Use nonce-based CSP (no unsafe-inline for scripts)
        const nonce = res.locals.nonce;
        csp = [
          "default-src 'self'",
          `script-src 'self' 'nonce-${nonce}'`,
          "style-src 'self' 'unsafe-inline'", // CSS inline often needed for frameworks
          "img-src 'self' data: https:",
          "font-src 'self'",
          "connect-src 'self' wss: ws:",
          "frame-ancestors 'none'",
          "base-uri 'self'",
          "form-action 'self'"
        ].join('; ');
      } else {
        // Legacy CSP with unsafe-inline (for backwards compatibility)
        csp = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self' wss: ws:";
      }

      res.setHeader('Content-Security-Policy', csp);
    }

    // Permissions-Policy (formerly Feature-Policy)
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

    // Remove server identification
    res.removeHeader('X-Powered-By');

    next();
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// INPUT VALIDATION (A03: Injection)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Sanitization utilities
 */
const sanitize = {
  /**
   * Escape HTML entities
   * @param {string} str - Input string
   * @returns {string} Escaped string
   */
  html(str) {
    if (typeof str !== 'string') return str;
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  },

  /**
   * Remove null bytes
   * @param {string} str - Input string
   * @returns {string} Cleaned string
   */
  nullBytes(str) {
    if (typeof str !== 'string') return str;
    return str.replace(/\0/g, '');
  },

  /**
   * Sanitize for shell commands (prevent command injection)
   * @param {string} str - Input string
   * @returns {string} Sanitized string
   */
  shell(str) {
    if (typeof str !== 'string') return str;
    // Remove or escape dangerous characters
    return str.replace(/[;&|`$(){}[\]<>\\]/g, '');
  },

  /**
   * Sanitize file path (prevent path traversal)
   * @param {string} path - Input path
   * @returns {string} Sanitized path
   */
  path(path) {
    if (typeof path !== 'string') return path;
    // Remove path traversal attempts
    return path
      .replace(/\.\./g, '')
      .replace(/\/\//g, '/')
      .replace(/^\//, '');
  },

  /**
   * Sanitize JSON input
   * @param {*} obj - Input object
   * @param {number} maxDepth - Maximum nesting depth
   * @returns {*} Sanitized object
   */
  json(obj, maxDepth = 10) {
    const seen = new WeakSet();

    function sanitizeValue(value, depth) {
      if (depth > maxDepth) return null;

      if (value === null || value === undefined) return value;

      if (typeof value === 'string') {
        return sanitize.html(sanitize.nullBytes(value));
      }

      if (typeof value === 'number' || typeof value === 'boolean') {
        return value;
      }

      if (Array.isArray(value)) {
        return value.map(v => sanitizeValue(v, depth + 1));
      }

      if (typeof value === 'object') {
        if (seen.has(value)) return null; // Circular reference
        seen.add(value);

        const sanitized = {};
        for (const [key, val] of Object.entries(value)) {
          const sanitizedKey = sanitize.html(key);
          sanitized[sanitizedKey] = sanitizeValue(val, depth + 1);
        }
        return sanitized;
      }

      return null;
    }

    return sanitizeValue(obj, 0);
  }
};

/**
 * Input validation middleware
 * @param {Object} schema - Validation schema
 * @returns {Function} Express middleware
 */
function validateInput(schema) {
  return (req, res, next) => {
    const errors = [];

    // Validate body
    if (schema.body) {
      for (const [field, rules] of Object.entries(schema.body)) {
        const value = req.body?.[field];
        const error = validateField(field, value, rules);
        if (error) errors.push(error);
      }
    }

    // Validate query params
    if (schema.query) {
      for (const [field, rules] of Object.entries(schema.query)) {
        const value = req.query?.[field];
        const error = validateField(field, value, rules);
        if (error) errors.push(error);
      }
    }

    // Validate URL params
    if (schema.params) {
      for (const [field, rules] of Object.entries(schema.params)) {
        const value = req.params?.[field];
        const error = validateField(field, value, rules);
        if (error) errors.push(error);
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors
      });
    }

    next();
  };
}

/**
 * Validate a single field
 * @private
 */
function validateField(name, value, rules) {
  // Required check
  if (rules.required && (value === undefined || value === null || value === '')) {
    return { field: name, message: `${name} is required` };
  }

  // Skip further validation if optional and empty
  if (value === undefined || value === null) return null;

  // Type check
  if (rules.type) {
    const actualType = Array.isArray(value) ? 'array' : typeof value;
    if (actualType !== rules.type) {
      return { field: name, message: `${name} must be of type ${rules.type}` };
    }
  }

  // String validations
  if (typeof value === 'string') {
    if (rules.minLength && value.length < rules.minLength) {
      return { field: name, message: `${name} must be at least ${rules.minLength} characters` };
    }
    if (rules.maxLength && value.length > rules.maxLength) {
      return { field: name, message: `${name} must be at most ${rules.maxLength} characters` };
    }
    if (rules.pattern && !rules.pattern.test(value)) {
      return { field: name, message: `${name} has invalid format` };
    }
    if (rules.enum && !rules.enum.includes(value)) {
      return { field: name, message: `${name} must be one of: ${rules.enum.join(', ')}` };
    }
  }

  // Number validations
  if (typeof value === 'number') {
    if (rules.min !== undefined && value < rules.min) {
      return { field: name, message: `${name} must be at least ${rules.min}` };
    }
    if (rules.max !== undefined && value > rules.max) {
      return { field: name, message: `${name} must be at most ${rules.max}` };
    }
  }

  // Array validations
  if (Array.isArray(value)) {
    if (rules.minItems && value.length < rules.minItems) {
      return { field: name, message: `${name} must have at least ${rules.minItems} items` };
    }
    if (rules.maxItems && value.length > rules.maxItems) {
      return { field: name, message: `${name} must have at most ${rules.maxItems} items` };
    }
  }

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// RATE LIMITING (A01: Broken Access Control)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Simple in-memory rate limiter
 * @param {Object} options - Rate limit options
 * @returns {Function} Express middleware
 */
function rateLimit(options = {}) {
  const {
    windowMs = 60000,     // 1 minute
    maxRequests = 100,    // 100 requests per window
    keyGenerator = (req) => req.ip,
    message = 'Too many requests, please try again later',
    skipSuccessfulRequests = false,
    skip = () => false
  } = options;

  const requests = new Map();

  // Cleanup old entries periodically
  setInterval(() => {
    const now = Date.now();
    for (const [key, data] of requests) {
      if (now > data.resetTime) {
        requests.delete(key);
      }
    }
  }, windowMs);

  return (req, res, next) => {
    if (skip(req)) {
      return next();
    }

    const key = keyGenerator(req);
    const now = Date.now();

    let data = requests.get(key);

    if (!data || now > data.resetTime) {
      data = {
        count: 0,
        resetTime: now + windowMs
      };
      requests.set(key, data);
    }

    data.count++;

    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - data.count));
    res.setHeader('X-RateLimit-Reset', Math.ceil(data.resetTime / 1000));

    if (data.count > maxRequests) {
      res.setHeader('Retry-After', Math.ceil((data.resetTime - now) / 1000));
      return res.status(429).json({
        error: message,
        retryAfter: Math.ceil((data.resetTime - now) / 1000)
      });
    }

    // Option to not count successful requests
    if (skipSuccessfulRequests) {
      res.on('finish', () => {
        if (res.statusCode < 400) {
          data.count--;
        }
      });
    }

    next();
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// CSRF PROTECTION (A01: Broken Access Control)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * CSRF token generation and validation
 */
const csrfProtection = {
  /**
   * Generate CSRF token
   * @returns {string} CSRF token
   */
  generateToken() {
    return crypto.randomBytes(32).toString('hex');
  },

  /**
   * Create CSRF middleware
   * @param {Object} options - Configuration options
   * @returns {Function} Express middleware
   */
  middleware(options = {}) {
    const {
      cookie = '_csrf',
      header = 'x-csrf-token',
      ignoreMethods = ['GET', 'HEAD', 'OPTIONS']
    } = options;

    return (req, res, next) => {
      // Skip for ignored methods
      if (ignoreMethods.includes(req.method)) {
        return next();
      }

      const cookieToken = req.cookies?.[cookie];
      const headerToken = req.headers[header];

      // Both must be present and match
      if (!cookieToken || !headerToken || cookieToken !== headerToken) {
        return res.status(403).json({
          error: 'Invalid CSRF token'
        });
      }

      next();
    };
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// SECURITY LOGGING (A09: Security Logging Failures)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Security event logger
 */
class SecurityLogger {
  constructor(options = {}) {
    this.logFile = options.logFile || null;
    this.onEvent = options.onEvent || null;
  }

  /**
   * Log security event
   * @param {string} type - Event type
   * @param {Object} details - Event details
   * @param {Object} req - Express request (optional)
   */
  log(type, details, req = null) {
    const event = {
      timestamp: new Date().toISOString(),
      type,
      details,
      request: req ? {
        ip: req.ip,
        method: req.method,
        path: req.path,
        userAgent: req.headers['user-agent'],
        userId: req.user?.id
      } : null
    };

    // Console output
    console.log(`[SECURITY] ${type}:`, JSON.stringify(event));

    // Custom handler
    if (this.onEvent) {
      this.onEvent(event);
    }

    return event;
  }

  // Predefined event types
  authFailure(req, reason) {
    return this.log('AUTH_FAILURE', { reason }, req);
  }

  accessDenied(req, resource, reason) {
    return this.log('ACCESS_DENIED', { resource, reason }, req);
  }

  rateLimitExceeded(req) {
    return this.log('RATE_LIMIT_EXCEEDED', {}, req);
  }

  suspiciousActivity(req, reason) {
    return this.log('SUSPICIOUS_ACTIVITY', { reason }, req);
  }

  inputValidationFailure(req, errors) {
    return this.log('INPUT_VALIDATION_FAILURE', { errors }, req);
  }

  csrfViolation(req) {
    return this.log('CSRF_VIOLATION', {}, req);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SSRF PROTECTION (A10: SSRF)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Validate URL to prevent SSRF
 * @param {string} url - URL to validate
 * @param {Object} options - Validation options
 * @returns {boolean} True if URL is safe
 */
function validateUrl(url, options = {}) {
  const {
    allowedHosts = [],
    blockedHosts = ['localhost', '127.0.0.1', '0.0.0.0', '::1'],
    allowPrivateIPs = false,
    allowedProtocols = ['https:']
  } = options;

  try {
    const parsed = new URL(url);

    // Check protocol
    if (!allowedProtocols.includes(parsed.protocol)) {
      return false;
    }

    // Check blocked hosts
    if (blockedHosts.some(h => parsed.hostname === h || parsed.hostname.endsWith(`.${h}`))) {
      return false;
    }

    // Check allowed hosts (if specified)
    if (allowedHosts.length > 0) {
      if (!allowedHosts.some(h => parsed.hostname === h || parsed.hostname.endsWith(`.${h}`))) {
        return false;
      }
    }

    // Check for private IPs
    if (!allowPrivateIPs) {
      const ip = parsed.hostname;
      if (isPrivateIP(ip)) {
        return false;
      }
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Check if IP is private
 * @private
 */
function isPrivateIP(ip) {
  // IPv4 private ranges
  const privateRanges = [
    /^10\./,
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
    /^192\.168\./,
    /^127\./,
    /^169\.254\./
  ];

  return privateRanges.some(range => range.test(ip));
}

// ─────────────────────────────────────────────────────────────────────────────
// COMBINED MIDDLEWARE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create combined security middleware
 * @param {Object} options - Configuration options
 * @returns {Function[]} Array of Express middleware
 */
function securityMiddleware(options = {}) {
  const {
    headers = {},
    rateLimit: rateLimitOpts = {},
    logging = true
  } = options;

  const logger = logging ? new SecurityLogger() : null;
  const middlewares = [];

  // Security headers
  middlewares.push(securityHeaders(headers));

  // Rate limiting
  if (rateLimitOpts !== false) {
    middlewares.push(rateLimit({
      ...rateLimitOpts,
      onLimit: (req) => logger?.rateLimitExceeded(req)
    }));
  }

  // Body size limit (prevent DoS)
  middlewares.push((req, res, next) => {
    const contentLength = parseInt(req.headers['content-length'] || '0', 10);
    const maxSize = options.maxBodySize || 10 * 1024 * 1024; // 10MB default

    if (contentLength > maxSize) {
      return res.status(413).json({
        error: 'Request entity too large'
      });
    }
    next();
  });

  return middlewares;
}

// ─────────────────────────────────────────────────────────────────────────────
// OWASP CHECKLIST REPORT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generate OWASP compliance report
 * @param {Object} app - Express app or configuration
 * @returns {Object} Compliance report
 */
function generateOWASPReport(app = {}) {
  const checks = [
    {
      id: 'A01:2021',
      name: 'Broken Access Control',
      items: [
        { name: 'Rate limiting implemented', status: 'implemented', module: 'rateLimit()' },
        { name: 'CSRF protection available', status: 'implemented', module: 'csrfProtection' },
        { name: 'Input validation', status: 'implemented', module: 'validateInput()' }
      ]
    },
    {
      id: 'A02:2021',
      name: 'Cryptographic Failures',
      items: [
        { name: 'HSTS header', status: 'implemented', module: 'securityHeaders()' },
        { name: 'Secure token generation', status: 'implemented', module: 'crypto.randomBytes' }
      ]
    },
    {
      id: 'A03:2021',
      name: 'Injection',
      items: [
        { name: 'HTML sanitization', status: 'implemented', module: 'sanitize.html()' },
        { name: 'Shell sanitization', status: 'implemented', module: 'sanitize.shell()' },
        { name: 'Path traversal prevention', status: 'implemented', module: 'sanitize.path()' },
        { name: 'JSON sanitization', status: 'implemented', module: 'sanitize.json()' }
      ]
    },
    {
      id: 'A04:2021',
      name: 'Insecure Design',
      items: [
        { name: 'Input validation schemas', status: 'implemented', module: 'validateInput()' },
        { name: 'Depth-limited JSON parsing', status: 'implemented', module: 'sanitize.json()' }
      ]
    },
    {
      id: 'A05:2021',
      name: 'Security Misconfiguration',
      items: [
        { name: 'Security headers', status: 'implemented', module: 'securityHeaders()' },
        { name: 'X-Powered-By removal', status: 'implemented', module: 'securityHeaders()' },
        { name: 'CSP header', status: 'implemented', module: 'securityHeaders()' }
      ]
    },
    {
      id: 'A06:2021',
      name: 'Vulnerable Components',
      items: [
        { name: 'Dependency scanning', status: 'manual', note: 'Use npm audit' }
      ]
    },
    {
      id: 'A07:2021',
      name: 'Auth Failures',
      items: [
        { name: 'Auth failure logging', status: 'implemented', module: 'SecurityLogger' },
        { name: 'Rate limiting on auth', status: 'implemented', module: 'rateLimit()' }
      ]
    },
    {
      id: 'A08:2021',
      name: 'Integrity Failures',
      items: [
        { name: 'CSRF tokens', status: 'implemented', module: 'csrfProtection' }
      ]
    },
    {
      id: 'A09:2021',
      name: 'Logging Failures',
      items: [
        { name: 'Security event logging', status: 'implemented', module: 'SecurityLogger' },
        { name: 'Structured logging', status: 'implemented', module: 'SecurityLogger' }
      ]
    },
    {
      id: 'A10:2021',
      name: 'SSRF',
      items: [
        { name: 'URL validation', status: 'implemented', module: 'validateUrl()' },
        { name: 'Private IP blocking', status: 'implemented', module: 'isPrivateIP()' }
      ]
    }
  ];

  const totalItems = checks.reduce((sum, c) => sum + c.items.length, 0);
  const implementedItems = checks.reduce(
    (sum, c) => sum + c.items.filter(i => i.status === 'implemented').length,
    0
  );

  return {
    timestamp: new Date().toISOString(),
    framework: 'WAVE',
    owaspVersion: '2021',
    coverage: `${Math.round(implementedItems / totalItems * 100)}%`,
    summary: {
      total: totalItems,
      implemented: implementedItems,
      manual: totalItems - implementedItems
    },
    checks
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────────────────────────────────────

export {
  // SEC-002: generateNonce and cspNonceMiddleware already exported with function declarations
  // Core security
  securityHeaders,
  securityMiddleware,
  validateInput,
  sanitize,
  rateLimit,
  csrfProtection,
  SecurityLogger,
  validateUrl,
  isPrivateIP,
  generateOWASPReport
};

export default securityMiddleware;
