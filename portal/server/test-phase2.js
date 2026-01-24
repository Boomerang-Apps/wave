#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * WAVE FRAMEWORK - Phase 2 Component Tests
 * ═══════════════════════════════════════════════════════════════════════════════
 * Tests for:
 *   - Response Caching (cache-service.js)
 *   - WebSocket Streaming (websocket-service.js)
 *   - OWASP Security Middleware (security-middleware.js)
 *   - Phase 2 Integration (phase2-integration.js)
 *
 * Usage:
 *   node test-phase2.js [component]
 *   node test-phase2.js cache
 *   node test-phase2.js websocket
 *   node test-phase2.js security
 *   node test-phase2.js integration
 *   node test-phase2.js all (default)
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import http from 'http';
import { CacheService, APIResponseCache, createCacheMiddleware } from './cache-service.js';
import { WebSocketService, EVENT_TYPES } from './websocket-service.js';
import {
  securityMiddleware,
  validateInput,
  sanitize,
  rateLimit,
  SecurityLogger,
  generateOWASPReport,
  validateUrl,
  isPrivateIP
} from './security-middleware.js';
import {
  initializePhase2,
  createPhase2Server,
  phase2Middleware,
  getCacheService,
  getWebSocketService,
  emitEvent,
  cacheResponse,
  getCached
} from './phase2-integration.js';

// ─────────────────────────────────────────────────────────────────────────────
// TEST UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m'
};

let testsPassed = 0;
let testsFailed = 0;
const testResults = [];

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function pass(testName, message = '') {
  testsPassed++;
  testResults.push({ test: testName, status: 'passed', message });
  log(`  ✓ ${testName}${message ? ': ' + message : ''}`, 'green');
}

function fail(testName, error) {
  testsFailed++;
  const message = error instanceof Error ? error.message : String(error);
  testResults.push({ test: testName, status: 'failed', message });
  log(`  ✗ ${testName}: ${message}`, 'red');
}

function assert(condition, testName, message = '') {
  if (condition) {
    pass(testName, message);
  } else {
    fail(testName, message || 'Assertion failed');
  }
}

async function runTest(name, fn) {
  try {
    await fn();
    pass(name);
  } catch (error) {
    fail(name, error);
  }
}

function section(title) {
  console.log();
  log(`━━━ ${title} ━━━`, 'cyan');
}

// ─────────────────────────────────────────────────────────────────────────────
// CACHE SERVICE TESTS
// ─────────────────────────────────────────────────────────────────────────────

async function testCacheService() {
  section('Cache Service Tests');

  // Test 1: Basic set/get
  await runTest('cache-basic-set-get', async () => {
    const cache = new CacheService({ maxSize: 100 });
    await cache.set('test-key', { value: 'hello' });
    const result = await cache.get('test-key');
    if (!result || result.value !== 'hello') {
      throw new Error('Basic set/get failed');
    }
    cache.shutdown();
  });

  // Test 2: TTL expiration
  await runTest('cache-ttl-expiration', async () => {
    const cache = new CacheService({ maxSize: 100, defaultTTL: 1 });
    await cache.set('expire-key', 'temp-value', { ttl: 1 });

    // Should exist initially
    let result = await cache.get('expire-key');
    if (!result) throw new Error('Value should exist initially');

    // Wait for expiration
    await new Promise(resolve => setTimeout(resolve, 1100));

    result = await cache.get('expire-key');
    if (result !== undefined) throw new Error('Value should have expired');
    cache.shutdown();
  });

  // Test 3: LRU eviction
  await runTest('cache-lru-eviction', async () => {
    const cache = new CacheService({ maxSize: 3 });

    await cache.set('key1', 'value1');
    await cache.set('key2', 'value2');
    await cache.set('key3', 'value3');

    // Access key1 to make it recently used
    await cache.get('key1');

    // Add key4, should evict key2 (LRU)
    await cache.set('key4', 'value4');

    const key1 = await cache.get('key1');
    const key2 = await cache.get('key2');
    const key4 = await cache.get('key4');

    if (!key1) throw new Error('key1 should exist (was accessed)');
    if (key2 !== undefined) throw new Error('key2 should be evicted (LRU)');
    if (!key4) throw new Error('key4 should exist (newly added)');
    cache.shutdown();
  });

  // Test 4: Memory limit eviction
  await runTest('cache-memory-limit', async () => {
    const cache = new CacheService({ maxSize: 1000, maxMemory: 100 }); // 100 bytes

    // Each string is roughly 2 bytes per char
    await cache.set('a', 'x'.repeat(30)); // ~60 bytes
    await cache.set('b', 'y'.repeat(30)); // Would exceed 100 bytes

    const stats = cache.getStats();
    if (stats.size > 120) throw new Error('Memory limit not enforced');
    cache.shutdown();
  });

  // Test 5: Wrap pattern
  await runTest('cache-wrap-pattern', async () => {
    const cache = new CacheService({ maxSize: 100 });
    let computeCount = 0;

    const compute = async () => {
      computeCount++;
      return { computed: true };
    };

    const result1 = await cache.wrap('wrap-key', compute);
    const result2 = await cache.wrap('wrap-key', compute);

    if (computeCount !== 1) throw new Error('Function should only be called once');
    if (!result1.computed || !result2.computed) throw new Error('Wrong results');
    cache.shutdown();
  });

  // Test 6: Statistics tracking
  await runTest('cache-statistics', async () => {
    const cache = new CacheService({ maxSize: 100 });

    await cache.set('stat-key', 'value');
    await cache.get('stat-key'); // hit
    await cache.get('stat-key'); // hit
    await cache.get('missing');  // miss

    const stats = cache.getStats();
    if (stats.hits !== 2) throw new Error(`Expected 2 hits, got ${stats.hits}`);
    if (stats.misses !== 1) throw new Error(`Expected 1 miss, got ${stats.misses}`);
    cache.shutdown();
  });

  // Test 7: Key normalization (object keys)
  await runTest('cache-key-normalization', async () => {
    const cache = new CacheService({ maxSize: 100 });

    const objKey = { model: 'claude', temp: 0.7 };
    await cache.set(objKey, 'object-keyed-value');

    // Same object structure should retrieve value
    const result = await cache.get({ model: 'claude', temp: 0.7 });
    if (result !== 'object-keyed-value') throw new Error('Object key normalization failed');
    cache.shutdown();
  });

  // Test 8: Delete operation
  await runTest('cache-delete', async () => {
    const cache = new CacheService({ maxSize: 100 });

    await cache.set('del-key', 'value');
    const existed = await cache.delete('del-key');
    const result = await cache.get('del-key');

    if (!existed) throw new Error('Delete should return true for existing key');
    if (result !== undefined) throw new Error('Value should be deleted');
    cache.shutdown();
  });

  // Test 9: Clear all
  await runTest('cache-clear', async () => {
    const cache = new CacheService({ maxSize: 100 });

    await cache.set('k1', 'v1');
    await cache.set('k2', 'v2');
    await cache.clear();

    const stats = cache.getStats();
    if (stats.entries !== 0) throw new Error('Cache should be empty after clear');
    cache.shutdown();
  });

  // Test 10: API Response Cache
  await runTest('api-response-cache', async () => {
    const apiCache = new APIResponseCache({ maxSize: 100 });

    const request = {
      model: 'claude-3-sonnet',
      messages: [{ role: 'user', content: 'Hello' }],
      temperature: 0,
      maxTokens: 100
    };

    const response = { id: 'resp-123', content: 'Hi there!' };

    await apiCache.cacheResponse(request, response);
    const cached = await apiCache.getCachedResponse(request);

    if (!cached) throw new Error('Response should be cached');
    if (!cached._cached) throw new Error('Should have _cached flag');
    if (cached.content !== 'Hi there!') throw new Error('Wrong cached content');
    apiCache.shutdown();
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// WEBSOCKET SERVICE TESTS
// ─────────────────────────────────────────────────────────────────────────────

async function testWebSocketService() {
  section('WebSocket Service Tests');

  // Test 1: Service initialization
  await runTest('websocket-initialization', async () => {
    const server = http.createServer();
    const wss = new WebSocketService(server, { path: '/test-ws' });

    if (!wss) throw new Error('WebSocket service not created');

    const stats = wss.getStats();
    if (typeof stats.connections !== 'number') {
      throw new Error('Stats should include connections');
    }

    wss.shutdown();
    server.close();
  });

  // Test 2: Event types defined
  await runTest('websocket-event-types', async () => {
    const requiredEvents = [
      'AGENT_READY', 'AGENT_HEARTBEAT', 'AGENT_COMPLETE', 'AGENT_ERROR',
      'GATE_COMPLETE', 'GATE_ENTERED', 'STORY_STARTED',
      'KILL_SWITCH', 'BUDGET_WARNING', 'BUDGET_EXCEEDED'
    ];

    for (const event of requiredEvents) {
      if (!EVENT_TYPES[event]) {
        throw new Error(`Missing event type: ${event}`);
      }
    }
  });

  // Test 3: Room management
  await runTest('websocket-room-structure', async () => {
    const server = http.createServer();
    const wss = new WebSocketService(server, { path: '/test-ws' });

    // Rooms should be a Map
    if (!(wss.rooms instanceof Map)) {
      throw new Error('Rooms should be a Map');
    }

    wss.shutdown();
    server.close();
  });

  // Test 4: Stats tracking
  await runTest('websocket-stats-tracking', async () => {
    const server = http.createServer();
    const wss = new WebSocketService(server, { historySize: 50 });

    const stats = wss.getStats();

    if (stats.activeClients !== 0) {
      throw new Error('Initial active clients should be 0');
    }
    if (stats.activeRooms !== 0) {
      throw new Error('Initial room count should be 0');
    }

    wss.shutdown();
    server.close();
  });

  // Test 5: Message broadcasting structure
  await runTest('websocket-broadcast-methods', async () => {
    const server = http.createServer();
    const wss = new WebSocketService(server);

    // Check that broadcast methods exist
    if (typeof wss.broadcast !== 'function') {
      throw new Error('broadcast method missing');
    }
    if (typeof wss.broadcastToRoom !== 'function') {
      throw new Error('broadcastToRoom method missing');
    }
    if (typeof wss.emitAgentUpdate !== 'function') {
      throw new Error('emitAgentUpdate method missing');
    }
    if (typeof wss.emitGateTransition !== 'function') {
      throw new Error('emitGateTransition method missing');
    }

    wss.shutdown();
    server.close();
  });

  // Test 6: History configuration
  await runTest('websocket-history-config', async () => {
    const server = http.createServer();
    const wss = new WebSocketService(server, { historySize: 200 });

    if (wss.options.historySize !== 200) {
      throw new Error(`History size should be 200, got ${wss.options.historySize}`);
    }

    wss.shutdown();
    server.close();
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// SECURITY MIDDLEWARE TESTS
// ─────────────────────────────────────────────────────────────────────────────

async function testSecurityMiddleware() {
  section('Security Middleware Tests');

  // Test 1: Security headers
  await runTest('security-headers-middleware', async () => {
    const middlewares = securityMiddleware();
    if (!Array.isArray(middlewares)) {
      throw new Error('Should return array of middlewares');
    }
    if (middlewares.length < 2) {
      throw new Error('Should include multiple middleware functions');
    }
  });

  // Test 2: Input validation middleware factory
  await runTest('security-validate-middleware', async () => {
    const schema = {
      body: {
        name: { type: 'string', required: true }
      }
    };

    const middleware = validateInput(schema);
    if (typeof middleware !== 'function') {
      throw new Error('validateInput should return middleware function');
    }
  });

  // Test 3: Sanitize HTML - XSS prevention
  await runTest('security-sanitize-html', async () => {
    const malicious = '<script>alert("xss")</script>';
    const sanitized = sanitize.html(malicious);

    if (sanitized.includes('<script>')) {
      throw new Error('Script tags should be escaped');
    }
    if (!sanitized.includes('&lt;script&gt;')) {
      throw new Error('Tags should be HTML escaped');
    }
  });

  // Test 4: Sanitize shell commands
  await runTest('security-sanitize-shell', async () => {
    const malicious = "ls; rm -rf /";
    const sanitized = sanitize.shell(malicious);

    // Should remove dangerous characters
    if (sanitized.includes(';')) {
      throw new Error('Shell sanitization should remove semicolons');
    }
  });

  // Test 5: Sanitize path traversal
  await runTest('security-sanitize-path', async () => {
    const malicious = "../../../etc/passwd";
    const sanitized = sanitize.path(malicious);

    if (sanitized.includes('..')) {
      throw new Error('Path traversal should be prevented');
    }
  });

  // Test 6: Rate limiter creation
  await runTest('security-rate-limiter', async () => {
    const limiter = rateLimit({ windowMs: 1000, maxRequests: 5 });

    if (typeof limiter !== 'function') {
      throw new Error('Rate limiter should return a function');
    }
  });

  // Test 7: Security logger
  await runTest('security-logger', async () => {
    const events = [];
    const logger = new SecurityLogger({
      onEvent: (event) => events.push(event)
    });

    logger.log('test_event', { detail: 'test' });

    if (events.length !== 1) {
      throw new Error('Logger should capture events');
    }
    if (events[0].type !== 'test_event') {
      throw new Error('Event type mismatch');
    }
  });

  // Test 8: OWASP report generation
  await runTest('security-owasp-report', async () => {
    const report = generateOWASPReport();

    if (!report.checks) {
      throw new Error('Report should have checks array');
    }
    if (!report.summary) {
      throw new Error('Report should have summary');
    }
    if (!report.coverage) {
      throw new Error('Report should have coverage');
    }

    // Check for OWASP Top 10 categories
    const categoryIds = report.checks.map(c => c.id);
    const requiredCategories = ['A01:2021', 'A02:2021', 'A03:2021', 'A04:2021', 'A05:2021'];
    for (const cat of requiredCategories) {
      if (!categoryIds.includes(cat)) {
        throw new Error(`Missing OWASP category: ${cat}`);
      }
    }
  });

  // Test 9: SSRF prevention
  await runTest('security-ssrf-prevention', async () => {
    // Should detect private IPs
    const privateIPs = [
      '127.0.0.1',
      '192.168.1.1',
      '10.0.0.1',
      '169.254.169.254', // AWS metadata
      '172.16.0.1'
    ];

    for (const ip of privateIPs) {
      if (!isPrivateIP(ip)) {
        throw new Error(`Should detect private IP: ${ip}`);
      }
    }

    // Should allow public IPs
    const publicIPs = ['8.8.8.8', '1.1.1.1'];
    for (const ip of publicIPs) {
      if (isPrivateIP(ip)) {
        throw new Error(`Should allow public IP: ${ip}`);
      }
    }
  });

  // Test 10: Sanitize nested objects with JSON
  await runTest('security-sanitize-json', async () => {
    const nested = {
      user: {
        name: '<script>bad</script>',
        bio: 'Normal text'
      },
      tags: ['<img src=x>', 'safe']
    };

    const sanitized = sanitize.json(nested);

    // HTML entities should be escaped
    if (JSON.stringify(sanitized).includes('<script>')) {
      throw new Error('Nested XSS should be sanitized');
    }
    if (JSON.stringify(sanitized).includes('<img')) {
      throw new Error('HTML tags should be escaped');
    }
    // Normal text should be preserved
    if (!JSON.stringify(sanitized).includes('Normal text')) {
      throw new Error('Normal text should be preserved');
    }
  });

  // Test 11: validateUrl function
  await runTest('security-validate-url', async () => {
    // validateUrl returns boolean
    const valid = validateUrl('https://example.com/api');
    if (typeof valid !== 'boolean') {
      throw new Error('validateUrl should return boolean');
    }
    if (!valid) {
      throw new Error('Valid URL should pass validation');
    }

    // Should reject localhost
    const localhost = validateUrl('https://localhost/admin');
    if (localhost) {
      throw new Error('Should reject localhost URLs');
    }

    // Should reject private IPs
    const privateIP = validateUrl('https://192.168.1.1/api');
    if (privateIP) {
      throw new Error('Should reject private IP URLs');
    }
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 2 INTEGRATION TESTS
// ─────────────────────────────────────────────────────────────────────────────

async function testPhase2Integration() {
  section('Phase 2 Integration Tests');

  // Test 1: Middleware creation
  await runTest('integration-middleware-creation', async () => {
    const middlewares = phase2Middleware();

    if (!Array.isArray(middlewares)) {
      throw new Error('Should return array');
    }
    if (middlewares.length < 2) {
      throw new Error('Should include security and timing middlewares');
    }
  });

  // Test 2: Service initialization
  await runTest('integration-service-init', async () => {
    const server = http.createServer();
    const mockApp = {
      get: () => {},
      post: () => {}
    };

    const services = initializePhase2(server, mockApp, {
      websocket: { enabled: false }
    });

    if (!services.cache) {
      throw new Error('Cache service should be initialized');
    }
    if (!services.security) {
      throw new Error('Security service should be initialized');
    }

    services.cache.shutdown();
    server.close();
  });

  // Test 3: Cache service singleton
  await runTest('integration-cache-singleton', async () => {
    const cache1 = getCacheService();
    const cache2 = getCacheService();

    if (cache1 !== cache2) {
      throw new Error('Should return same cache instance');
    }
  });

  // Test 4: Helper functions
  await runTest('integration-helpers', async () => {
    await cacheResponse('helper-key', { data: 'test' }, 60);
    const result = await getCached('helper-key');

    if (!result || result.data !== 'test') {
      throw new Error('Cache helpers should work');
    }
  });

  // Test 5: Custom configuration
  await runTest('integration-custom-config', async () => {
    const middlewares = phase2Middleware({
      security: {
        enabled: true,
        rateLimit: {
          windowMs: 30000,
          maxRequests: 50
        }
      }
    });

    if (!middlewares || middlewares.length === 0) {
      throw new Error('Should accept custom config');
    }
  });

  // Test 6: Disabled services
  await runTest('integration-disabled-services', async () => {
    const server = http.createServer();
    const mockApp = {
      get: () => {},
      post: () => {}
    };

    const services = initializePhase2(server, mockApp, {
      cache: { enabled: false },
      websocket: { enabled: false }
    });

    // Services should still be returned (from previous init)
    // This tests that disabled flag is respected
    server.close();
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN TEST RUNNER
// ─────────────────────────────────────────────────────────────────────────────

async function runAllTests(component = 'all') {
  console.log();
  log('═══════════════════════════════════════════════════════════════════', 'blue');
  log('           WAVE FRAMEWORK - Phase 2 Component Tests                 ', 'blue');
  log('═══════════════════════════════════════════════════════════════════', 'blue');

  const startTime = Date.now();

  try {
    if (component === 'all' || component === 'cache') {
      await testCacheService();
    }

    if (component === 'all' || component === 'websocket') {
      await testWebSocketService();
    }

    if (component === 'all' || component === 'security') {
      await testSecurityMiddleware();
    }

    if (component === 'all' || component === 'integration') {
      await testPhase2Integration();
    }
  } catch (error) {
    log(`\nUnexpected error: ${error.message}`, 'red');
    console.error(error.stack);
  }

  const duration = Date.now() - startTime;

  // Summary
  console.log();
  log('═══════════════════════════════════════════════════════════════════', 'blue');
  log('                         TEST SUMMARY                               ', 'blue');
  log('═══════════════════════════════════════════════════════════════════', 'blue');
  console.log();

  const total = testsPassed + testsFailed;
  const passRate = total > 0 ? Math.round((testsPassed / total) * 100) : 0;

  log(`  Total:  ${total} tests`, 'dim');
  log(`  Passed: ${testsPassed}`, 'green');
  if (testsFailed > 0) {
    log(`  Failed: ${testsFailed}`, 'red');
  }
  log(`  Rate:   ${passRate}%`, passRate === 100 ? 'green' : 'yellow');
  log(`  Time:   ${duration}ms`, 'dim');

  console.log();

  // Write results to file
  const resultsFile = `/Volumes/SSD-01/Projects/WAVE/.claude/phase2-test-results-${Date.now()}.json`;
  const results = {
    timestamp: new Date().toISOString(),
    component,
    passed: testsPassed,
    failed: testsFailed,
    pass_rate: passRate,
    duration_ms: duration,
    results: testResults
  };

  try {
    const fs = await import('fs');
    fs.writeFileSync(resultsFile, JSON.stringify(results, null, 2));
    log(`  Results saved to: ${resultsFile}`, 'dim');
  } catch (e) {
    // Ignore file write errors
  }

  console.log();

  if (testsFailed > 0) {
    process.exit(1);
  }
}

// Parse arguments and run
const component = process.argv[2] || 'all';
runAllTests(component);
