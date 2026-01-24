/**
 * Rate Limit Enforcer Middleware (GAP-004)
 *
 * Enforces rate limiting on agent operations by wrapping AgentRateLimiter.
 * Returns 429 Too Many Requests when limits are exceeded.
 *
 * Based on:
 * - AWS API Gateway Throttling
 * - RFC 6585 (429 Too Many Requests)
 * - express-rate-limit best practices
 *
 * @see https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-request-throttling.html
 * @see https://datatracker.ietf.org/doc/html/rfc6585
 */

import { AgentRateLimiter } from '../utils/rate-limiter.js';

// Error codes for rate limiting
export const RATE_LIMIT_ERRORS = {
  RATE_EXCEEDED: 'rate_limit_exceeded',
  TOKEN_RATE_EXCEEDED: 'token_rate_exceeded',
  TOKENS_PER_REQUEST_EXCEEDED: 'tokens_per_request_exceeded',
  MISSING_PROJECT_PATH: 'missing_project_path',
  MISSING_AGENT: 'missing_agent'
};

// Cache of rate limiters per project
const rateLimiterCache = new Map();

/**
 * Get or create a rate limiter for a project path
 */
function getLimiterForProject(projectPath) {
  if (!rateLimiterCache.has(projectPath)) {
    rateLimiterCache.set(projectPath, new AgentRateLimiter({ projectPath }));
  }
  return rateLimiterCache.get(projectPath);
}

/**
 * Extract agent identifier from request
 *
 * Checks in order:
 * 1. req.params.agentType (route params)
 * 2. req.body.agent (body)
 * 3. req.body.agentType (body)
 * 4. req.query.agent (query params)
 *
 * @param {Object} req - Express request object
 * @returns {string|null} Agent identifier or null
 */
export function extractAgentFromRequest(req) {
  // Check route params first
  if (req.params?.agentType) {
    return req.params.agentType;
  }

  // Check body
  if (req.body?.agent) {
    return req.body.agent;
  }

  if (req.body?.agentType) {
    return req.body.agentType;
  }

  // Check query params
  if (req.query?.agent) {
    return req.query.agent;
  }

  return null;
}

/**
 * Create rate limit enforcer middleware
 *
 * @param {Object} options - Configuration options
 * @param {AgentRateLimiter} options.limiter - Rate limiter instance (required)
 * @param {number} options.estimatedTokens - Default estimated tokens per request
 * @param {boolean} options.requireAgent - Whether to require agent identification
 * @param {boolean} options.recordOnComplete - Record request after completion
 * @returns {Function} Express middleware function
 */
export function createRateLimitEnforcer(options = {}) {
  const {
    limiter,
    estimatedTokens = 0,
    requireAgent = false,
    recordOnComplete = false
  } = options;

  if (!limiter) {
    throw new Error('limiter is required for createRateLimitEnforcer');
  }

  return (req, res, next) => {
    // Extract project path
    const projectPath = req.body?.projectPath || req.query?.projectPath;

    if (!projectPath) {
      return res.status(400).json({
        error: RATE_LIMIT_ERRORS.MISSING_PROJECT_PATH,
        message: 'projectPath is required for rate limiting'
      });
    }

    // Extract agent
    const agentId = extractAgentFromRequest(req);

    if (!agentId && requireAgent) {
      return res.status(400).json({
        error: RATE_LIMIT_ERRORS.MISSING_AGENT,
        message: 'Agent identifier is required'
      });
    }

    // If no agent can be determined and not required, skip rate limiting
    if (!agentId) {
      return next();
    }

    // Get estimated tokens from request body (sanitize negative values)
    const tokens = Math.max(0, req.body?.estimatedTokens || estimatedTokens);

    // Check rate limit
    const check = limiter.checkLimit(agentId, tokens);

    // Always add rate limit headers
    const headers = limiter.getHeaders(agentId);
    res.set(headers);

    if (!check.allowed) {
      // Add Retry-After header
      if (check.retryAfter) {
        res.set({ 'Retry-After': check.retryAfter });
      }

      // Determine specific error code
      let errorCode = RATE_LIMIT_ERRORS.RATE_EXCEEDED;
      if (check.reason === 'token_rate_exceeded') {
        errorCode = RATE_LIMIT_ERRORS.TOKEN_RATE_EXCEEDED;
      } else if (check.reason === 'tokens_per_request_exceeded') {
        errorCode = RATE_LIMIT_ERRORS.TOKENS_PER_REQUEST_EXCEEDED;
      }

      return res.status(429).json({
        error: errorCode,
        message: check.message,
        retryAfter: check.retryAfter,
        limit: check.limit,
        current: check.current
      });
    }

    // Record request if configured to do so immediately
    if (!recordOnComplete) {
      // We don't record immediately - let the endpoint do it
    }

    next();
  };
}

/**
 * Get rate limit middleware for a specific project
 *
 * @param {Object} options - Configuration options
 * @param {string} options.projectPath - Project path for rate limiting
 * @param {number} options.estimatedTokens - Default estimated tokens
 * @param {boolean} options.requireAgent - Whether to require agent
 * @returns {Function} Express middleware function
 */
export function getRateLimitMiddleware(options = {}) {
  const { projectPath, ...middlewareOptions } = options;

  // Get or create limiter for this project
  const limiter = projectPath
    ? getLimiterForProject(projectPath)
    : new AgentRateLimiter();

  return createRateLimitEnforcer({
    limiter,
    ...middlewareOptions
  });
}

/**
 * Clear the limiter cache (useful for testing)
 */
export function clearLimiterCache() {
  rateLimiterCache.clear();
}

export default {
  createRateLimitEnforcer,
  getRateLimitMiddleware,
  extractAgentFromRequest,
  clearLimiterCache,
  RATE_LIMIT_ERRORS
};
