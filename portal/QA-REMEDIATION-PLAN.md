# WAVE Portal - QA Remediation Plan

**Date:** 2026-01-24
**Based On:** QA-CODE-REVIEW-REPORT.md
**Methodology:** TDD (Test-Driven Development)
**Status:** Ready for Implementation

---

## Executive Summary

This remediation plan addresses all findings from the comprehensive QA code review. Each issue includes:
- Gate 0 research from multiple credible sources
- TDD test specifications (write tests first)
- Step-by-step implementation guide
- Verification criteria

### Priority Matrix

| Priority | Issues | Risk Level | Estimated Tests |
|----------|--------|------------|-----------------|
| Immediate | SEC-001, SEC-002, CQ-001, CQ-004, CQ-005 | High | 45 |
| Short-Term | SEC-003, SEC-007, CQ-002, CQ-003 | Medium-High | 35 |
| Medium-Term | SEC-004 to SEC-009, CQ-006 to CQ-013 | Medium | 50 |
| **Total** | **21 Issues** | | **~130 Tests** |

---

## Immediate Priority Fixes

---

### SEC-001: Timing Attack Vulnerability

**File:** `portal/server/middleware/auth.js`
**Risk:** API key brute force via timing analysis

#### Gate 0 Research

| Source | Key Finding |
|--------|-------------|
| [Node.js Crypto Documentation](https://nodejs.org/api/crypto.html) | `crypto.timingSafeEqual()` compares buffers in constant time |
| [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/runtime-apis/web-crypto/) | Use constant-time comparison for all secret comparisons |
| [Better Stack Security Guide](https://betterstack.com/community/guides/security/) | Timing attacks can leak key bytes through response time variance |
| [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html) | Always use timing-safe comparison for credentials |

#### Why This Matters

Regular string comparison (`===` or `==`) exits early on first character mismatch. Attackers can measure response time differences to determine how many characters matched, eventually reconstructing the full API key.

```javascript
// VULNERABLE: Early exit reveals information
if (providedKey === storedKey) { /* ... */ }

// SECURE: Constant time comparison
const match = crypto.timingSafeEqual(
  Buffer.from(providedKey),
  Buffer.from(storedKey)
);
```

#### TDD Test Specifications

```javascript
// File: portal/server/__tests__/auth-timing-safe.test.js

describe('Timing-Safe API Key Comparison (SEC-001)', () => {
  // Unit Tests
  it('should use crypto.timingSafeEqual for key comparison');
  it('should handle keys of different lengths safely');
  it('should return false for mismatched keys in constant time');
  it('should return true for matching keys');
  it('should handle empty keys without throwing');
  it('should handle Buffer input');
  it('should handle string input');

  // Timing Tests (approximate)
  it('should have similar response time for wrong first character');
  it('should have similar response time for wrong last character');
  it('should have similar response time for completely wrong key');

  // Security Tests
  it('should not leak key length in error messages');
  it('should rate limit failed attempts');
});
```

#### Implementation Steps

1. **Import crypto module**
   ```javascript
   import crypto from 'crypto';
   ```

2. **Create timing-safe comparison function**
   ```javascript
   function timingSafeCompare(a, b) {
     // Handle length mismatch without leaking length
     const bufA = Buffer.from(String(a));
     const bufB = Buffer.from(String(b));

     // Pad shorter buffer to match lengths
     const maxLen = Math.max(bufA.length, bufB.length);
     const paddedA = Buffer.alloc(maxLen);
     const paddedB = Buffer.alloc(maxLen);
     bufA.copy(paddedA);
     bufB.copy(paddedB);

     // Length check must also be constant time
     const lengthMatch = bufA.length === bufB.length;
     const contentMatch = crypto.timingSafeEqual(paddedA, paddedB);

     return lengthMatch && contentMatch;
   }
   ```

3. **Replace all key comparisons in auth.js**
   - Find: `providedKey === storedKey`
   - Replace with: `timingSafeCompare(providedKey, storedKey)`

4. **Add to exported utilities**
   ```javascript
   export { timingSafeCompare };
   ```

#### Verification Criteria

- [ ] All tests pass
- [ ] `crypto.timingSafeEqual` called for every key comparison
- [ ] No early-exit comparison operators on sensitive data
- [ ] Response time variance < 5ms between wrong/right keys

---

### SEC-002: CSP Too Permissive

**File:** `portal/server/security-middleware.js`
**Risk:** XSS attacks via inline scripts

#### Gate 0 Research

| Source | Key Finding |
|--------|-------------|
| [OWASP CSP Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html) | Use nonces or hashes instead of `'unsafe-inline'` |
| [MDN Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP) | Nonces must be cryptographically random and unique per request |
| [content-security-policy.com](https://content-security-policy.com/) | Modern browsers support nonce-based CSP |
| [Google CSP Evaluator](https://csp-evaluator.withgoogle.com/) | Tool to validate CSP header effectiveness |

#### Why This Matters

`'unsafe-inline'` allows any inline `<script>` to execute, defeating the purpose of CSP. Attackers who can inject HTML can execute arbitrary JavaScript.

```javascript
// VULNERABLE
"script-src 'self' 'unsafe-inline'"

// SECURE (nonce-based)
"script-src 'self' 'nonce-${nonce}'"
```

#### TDD Test Specifications

```javascript
// File: portal/server/__tests__/csp-nonce.test.js

describe('CSP Nonce Implementation (SEC-002)', () => {
  // Nonce Generation Tests
  it('should generate cryptographically random nonce');
  it('should generate unique nonce per request');
  it('should generate base64-encoded nonce');
  it('should generate nonce of at least 128 bits');

  // CSP Header Tests
  it('should include nonce in script-src directive');
  it('should NOT include unsafe-inline in script-src');
  it('should NOT include unsafe-eval in script-src');
  it('should set nonce on res.locals for templates');

  // Integration Tests
  it('should pass nonce to rendered HTML');
  it('should block inline scripts without nonce');
  it('should allow inline scripts with valid nonce');

  // Security Tests
  it('should not reuse nonces across requests');
  it('should not expose nonce in error messages');
});
```

#### Implementation Steps

1. **Create nonce generator middleware**
   ```javascript
   import crypto from 'crypto';

   export function generateNonce(req, res, next) {
     // Generate 128-bit random nonce
     const nonce = crypto.randomBytes(16).toString('base64');
     res.locals.nonce = nonce;
     next();
   }
   ```

2. **Update CSP header construction**
   ```javascript
   export function setSecurityHeaders(req, res, next) {
     const nonce = res.locals.nonce;

     const csp = [
       "default-src 'self'",
       `script-src 'self' 'nonce-${nonce}'`,
       "style-src 'self' 'unsafe-inline'", // CSS inline often needed
       "img-src 'self' data: https:",
       "font-src 'self'",
       "connect-src 'self'",
       "frame-ancestors 'none'",
       "base-uri 'self'",
       "form-action 'self'"
     ].join('; ');

     res.setHeader('Content-Security-Policy', csp);
     next();
   }
   ```

3. **Apply middleware in order**
   ```javascript
   app.use(generateNonce);
   app.use(setSecurityHeaders);
   ```

4. **Update HTML templates**
   ```html
   <script nonce="<%= nonce %>">
     // Inline script now allowed
   </script>
   ```

#### Verification Criteria

- [ ] No `'unsafe-inline'` in script-src
- [ ] Nonce generated uniquely per request
- [ ] Nonce passed to all rendered templates
- [ ] CSP Evaluator shows no critical issues

---

### CQ-001: Missing JSON.parse try/catch

**File:** `portal/server/utils/dora-metrics.js:141-156`
**Risk:** Application crash on invalid JSON

#### Gate 0 Research

| Source | Key Finding |
|--------|-------------|
| [MDN JSON.parse](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/parse) | Throws SyntaxError on malformed JSON |
| [GeeksforGeeks JSON Error Handling](https://www.geeksforgeeks.org/javascript/how-to-catch-json-parse-error-in-javascript/) | Always wrap JSON.parse in try/catch |
| [json-parse-safe npm](https://www.npmjs.com/package/json-parse-safe) | Use safe parse utilities for cleaner code |
| [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices) | Handle all possible exceptions at system boundaries |

#### TDD Test Specifications

```javascript
// File: portal/server/__tests__/safe-json-parse.test.js

describe('Safe JSON Parse (CQ-001)', () => {
  // Basic Functionality
  it('should parse valid JSON successfully');
  it('should return fallback for invalid JSON');
  it('should return fallback for empty string');
  it('should return fallback for null input');
  it('should return fallback for undefined input');

  // Error Information
  it('should include error details in result');
  it('should not throw on malformed JSON');
  it('should log parsing errors');

  // Edge Cases
  it('should handle JSON with trailing commas');
  it('should handle JSON with single quotes');
  it('should handle truncated JSON');
  it('should handle very large JSON');

  // Integration with dora-metrics.js
  it('should use safeJsonParse in parseMetricsFile');
  it('should continue processing on parse error');
  it('should report parse errors to monitoring');
});
```

#### Implementation Steps

1. **Create safe JSON parse utility**
   ```javascript
   // File: portal/server/utils/safe-json.js

   /**
    * Safely parse JSON with error handling
    * @param {string} jsonString - JSON string to parse
    * @param {*} fallback - Value to return on error
    * @returns {{ data: *, error: Error|null }}
    */
   export function safeJsonParse(jsonString, fallback = null) {
     if (typeof jsonString !== 'string') {
       return {
         data: fallback,
         error: new Error('Input must be a string')
       };
     }

     try {
       return {
         data: JSON.parse(jsonString),
         error: null
       };
     } catch (error) {
       console.error('[SafeJSON] Parse error:', error.message);
       return {
         data: fallback,
         error
       };
     }
   }
   ```

2. **Update dora-metrics.js**
   ```javascript
   import { safeJsonParse } from './safe-json.js';

   // Replace: const data = JSON.parse(content);
   // With:
   const { data, error } = safeJsonParse(content, {});
   if (error) {
     console.error(`[DORA] Failed to parse ${filepath}:`, error.message);
     return null; // or appropriate fallback
   }
   ```

3. **Apply to all JSON.parse calls in codebase**
   - Search: `JSON.parse(`
   - Review each for try/catch or replace with safeJsonParse

#### Verification Criteria

- [ ] All JSON.parse calls wrapped or use safeJsonParse
- [ ] No uncaught SyntaxError from JSON.parse
- [ ] Errors logged with context
- [ ] Application continues on parse failure

---

### CQ-004: Unbounded Map Growth

**File:** `portal/server/utils/signal-deduplicator.js:78`
**Risk:** Memory leak from unbounded cache

#### Gate 0 Research

| Source | Key Finding |
|--------|-------------|
| [lru-cache npm](https://www.npmjs.com/package/lru-cache) | Provides bounded Map with automatic eviction |
| [GitHub isaacs/node-lru-cache](https://github.com/isaacs/node-lru-cache) | Requires max, ttl, or maxSize to prevent unbounded growth |
| [Node.js Memory Leak Detection](https://habr.com/en/articles/880798/) | Unbounded caches are common source of memory leaks |
| [WeakMap MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/WeakMap) | Use WeakMap when keys are objects and enumeration not needed |

#### TDD Test Specifications

```javascript
// File: portal/server/__tests__/bounded-cache.test.js

describe('Bounded Cache Implementation (CQ-004/CQ-005)', () => {
  // Size Limiting
  it('should enforce maximum entry count');
  it('should evict least recently used when full');
  it('should not exceed maxSize');

  // TTL Support
  it('should expire entries after TTL');
  it('should return undefined for expired entries');
  it('should clean up expired entries');

  // LRU Behavior
  it('should update access time on get');
  it('should evict oldest unused entry');
  it('should keep recently accessed entries');

  // Integration Tests
  it('should replace unbounded Map in signal-deduplicator');
  it('should replace unbounded Map in run-tracker');
  it('should maintain functionality after replacement');

  // Memory Tests
  it('should stabilize memory usage under load');
  it('should not grow indefinitely');
});
```

#### Implementation Steps

1. **Create bounded cache utility**
   ```javascript
   // File: portal/server/utils/bounded-cache.js

   /**
    * LRU Cache with max size and TTL support
    * Prevents unbounded memory growth
    */
   export class BoundedCache {
     constructor(options = {}) {
       this.max = options.max || 1000;
       this.ttl = options.ttl || 5 * 60 * 1000; // 5 minutes default
       this.cache = new Map();
     }

     get(key) {
       const entry = this.cache.get(key);
       if (!entry) return undefined;

       // Check TTL
       if (Date.now() > entry.expiry) {
         this.cache.delete(key);
         return undefined;
       }

       // Update for LRU (move to end)
       this.cache.delete(key);
       this.cache.set(key, entry);

       return entry.value;
     }

     set(key, value) {
       // Evict if at max capacity
       if (this.cache.size >= this.max) {
         const firstKey = this.cache.keys().next().value;
         this.cache.delete(firstKey);
       }

       this.cache.set(key, {
         value,
         expiry: Date.now() + this.ttl
       });
     }

     has(key) {
       return this.get(key) !== undefined;
     }

     delete(key) {
       return this.cache.delete(key);
     }

     clear() {
       this.cache.clear();
     }

     get size() {
       return this.cache.size;
     }

     // Cleanup expired entries
     prune() {
       const now = Date.now();
       for (const [key, entry] of this.cache) {
         if (now > entry.expiry) {
           this.cache.delete(key);
         }
       }
     }
   }
   ```

2. **Update signal-deduplicator.js**
   ```javascript
   import { BoundedCache } from './bounded-cache.js';

   // Replace: this.seenSignals = new Map();
   // With:
   this.seenSignals = new BoundedCache({
     max: 10000,      // Max 10k signals
     ttl: 60 * 1000   // 1 minute TTL
   });
   ```

3. **Update run-tracker.js (CQ-005)**
   ```javascript
   import { BoundedCache } from './bounded-cache.js';

   // Replace unbounded array with bounded cache
   this.runHistory = new BoundedCache({
     max: 1000,
     ttl: 24 * 60 * 60 * 1000 // 24 hour TTL
   });
   ```

#### Verification Criteria

- [ ] No unbounded Map or Array for caching
- [ ] Max size enforced with eviction
- [ ] TTL-based expiration working
- [ ] Memory stable under sustained load

---

### CQ-005: Unbounded Array Growth

**File:** `portal/server/utils/run-tracker.js:248`
**Risk:** Memory leak from unbounded history

See CQ-004 above - same solution applies using BoundedCache or a bounded array implementation.

---

## Short-Term Priority Fixes

---

### SEC-003: No Distributed Rate Limiting

**File:** `portal/server/utils/rate-limiter.js`
**Risk:** Rate limit bypass via multiple servers

#### Gate 0 Research

| Source | Key Finding |
|--------|-------------|
| [Redis Rate Limiting](https://redis.io/docs/data-types/counters/) | Use atomic INCR for distributed counters |
| [Token Bucket Algorithm](https://en.wikipedia.org/wiki/Token_bucket) | Standard algorithm for rate limiting |
| [Sliding Window Pattern](https://blog.cloudflare.com/counting-things-a-lot-of-different-things/) | More accurate than fixed windows |
| [rate-limiter-flexible npm](https://www.npmjs.com/package/rate-limiter-flexible) | Production-ready distributed rate limiting |

#### TDD Test Specifications

```javascript
describe('Distributed Rate Limiting (SEC-003)', () => {
  // Redis Integration
  it('should store counts in Redis');
  it('should use atomic INCR operation');
  it('should handle Redis connection failure gracefully');
  it('should fallback to in-memory on Redis unavailable');

  // Algorithm Tests
  it('should implement sliding window correctly');
  it('should reset window at correct interval');
  it('should track per-IP counters');

  // Distributed Tests
  it('should share state across multiple instances');
  it('should enforce global limit across servers');

  // Edge Cases
  it('should handle clock skew between servers');
  it('should expire old entries');
});
```

#### Implementation Steps

1. Install Redis client: `npm install ioredis`
2. Create Redis-backed rate limiter
3. Implement sliding window with Lua script for atomicity
4. Add fallback to in-memory when Redis unavailable

---

### SEC-007: No Key Material Zeroing

**File:** `portal/server/utils/prompt-encryptor.js`
**Risk:** Sensitive keys persist in memory

#### Gate 0 Research

| Source | Key Finding |
|--------|-------------|
| [Node.js Buffer docs](https://nodejs.org/api/buffer.html) | Use `buf.fill(0)` to zero sensitive data |
| [Node.js Crypto Issue #18896](https://github.com/nodejs/node/issues/18896) | Request for secure memory allocation |
| [OWASP Cryptographic Storage](https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html) | Zero keys immediately after use |
| [libsodium docs](https://doc.libsodium.org/memory_management) | Automatic key zeroing on deallocation |

#### TDD Test Specifications

```javascript
describe('Key Material Zeroing (SEC-007)', () => {
  it('should zero key buffer after encryption');
  it('should zero key buffer after decryption');
  it('should zero IV buffer after use');
  it('should use Buffer.alloc instead of allocUnsafe for keys');
  it('should zero derived keys after use');
  it('should handle errors without leaking key material');
});
```

#### Implementation Steps

```javascript
// After using a key
function secureCleanup(buffer) {
  if (Buffer.isBuffer(buffer)) {
    buffer.fill(0);
  }
}

// Usage in encrypt function
try {
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  // ... encryption logic
  return result;
} finally {
  secureCleanup(key);
  secureCleanup(iv);
}
```

---

### CQ-002: Promise.race Cleanup Missing

**File:** `portal/server/utils/test-verifier.js:150-160`
**Risk:** Dangling promises, resource leaks

#### Gate 0 Research

| Source | Key Finding |
|--------|-------------|
| [AbortController MDN](https://developer.mozilla.org/en-US/docs/Web/API/AbortController) | Standard mechanism for cancellation |
| [Nearform AbortSignal Guide](https://nearform.com/insights/using-abortsignal-in-node-js/) | Proper cleanup with AbortSignal |
| [abort-controller-x npm](https://www.npmjs.com/package/abort-controller-x) | Enhanced Promise.race with cleanup |
| [OpenJS Foundation](https://openjsf.org/blog/using-abortsignal-in-node-js) | Best practices for Node.js cancellation |

#### TDD Test Specifications

```javascript
describe('Promise.race with Cleanup (CQ-002)', () => {
  it('should abort pending promises on winner resolution');
  it('should clean up timeout on success');
  it('should clean up operation on timeout');
  it('should not leak AbortController listeners');
  it('should propagate abort signal to child operations');
});
```

#### Implementation Steps

```javascript
async function raceWithCleanup(promises, signal) {
  const controller = new AbortController();

  // Link to parent signal if provided
  if (signal) {
    signal.addEventListener('abort', () => controller.abort());
  }

  try {
    return await Promise.race(
      promises.map(p => typeof p === 'function' ? p(controller.signal) : p)
    );
  } finally {
    controller.abort(); // Cleanup losers
  }
}
```

---

### CQ-003: Async Function Not Awaited

**File:** `portal/server/utils/heartbeat-manager.js:476`
**Risk:** Silent failures, unhandled rejections

#### Gate 0 Research

| Source | Key Finding |
|--------|-------------|
| [JavaScript.info Async/Await](https://javascript.info/async-await) | Always handle async function results |
| [The Codebarbarian Guide](https://thecodebarbarian.com/80-20-guide-to-async-await-in-node.js.html) | Every async call needs error handling |
| [Jake Archibald Blog](https://jakearchibald.com/2023/unhandled-rejections/) | Unhandled rejections crash Node.js |
| [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices) | Use global unhandledRejection handler as safety net |

#### TDD Test Specifications

```javascript
describe('Async Function Handling (CQ-003)', () => {
  it('should await all async function calls');
  it('should catch errors from async functions');
  it('should not have floating promises');
  it('should use Promise.all for parallel async operations');
  it('should log errors from fire-and-forget async calls');
});
```

#### Implementation Steps

```javascript
// Pattern 1: Await the call
await someAsyncFunction();

// Pattern 2: Fire-and-forget with error handling
someAsyncFunction().catch(err => {
  console.error('[HeartbeatManager] Async error:', err);
});

// Pattern 3: Queue for batch processing
this.pendingOperations.push(someAsyncFunction());
// Later: await Promise.allSettled(this.pendingOperations);
```

---

## Medium-Term Priority Fixes

---

### SEC-004: SQL Injection Regex Bypassable

**File:** `portal/server/middleware/validation.js`
**Risk:** SQL injection through regex bypass

#### Gate 0 Research

| Source | Key Finding |
|--------|-------------|
| [Snyk SQL Injection Prevention](https://snyk.io/blog/preventing-sql-injection-attacks-node-js/) | Use parameterized queries, not regex |
| [OWASP SQL Injection Prevention](https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html) | Prepared statements are only reliable defense |
| [StackHawk Node.js Guide](https://www.stackhawk.com/blog/node-js-sql-injection-guide-examples-and-prevention/) | ORMs provide built-in protection |
| [Codecademy SQL Injection Course](https://www.codecademy.com/learn/learn-to-prevent-sql-injections-with-node-js/) | Defense in depth approach |

**Solution:** Replace regex-based validation with parameterized queries or ORM.

---

### SEC-005: TOCTOU in Path Validation

**File:** `portal/server/utils/path-validator.js`
**Risk:** Race condition between check and use

#### Gate 0 Research

| Source | Key Finding |
|--------|-------------|
| [CWE-367](https://cwe.mitre.org/data/definitions/367.html) | Official TOCTOU vulnerability definition |
| [SEI CERT C Coding Standard](https://wiki.sei.cmu.edu/confluence/display/c/FIO45-C.+Avoid+TOCTOU+race+conditions+while+accessing+files) | Use file descriptors instead of paths |
| [Wikipedia TOCTOU](https://en.wikipedia.org/wiki/Time-of-check_to_time-of-use) | Use atomic operations |
| [IBM Security Bulletin](https://www.ibm.com/support/pages/security-bulletin-ibm-app-connect-enterprise-vulnerable-time-check-time-use-toctou-race-condition-due-nodejs-module-snowflake-cve-2025-46328) | Real-world Node.js TOCTOU example |

**Solution:** Open file first, then validate the opened file descriptor.

---

### SEC-006: Memory-Only Rate Limits

**File:** `portal/server/middleware/auth.js`
**Risk:** Rate limits reset on restart

**Solution:** Persist to Redis or file-based storage.

---

### SEC-008: HSTS Only on HTTPS

**File:** `portal/server/security-middleware.js`
**Risk:** Missing HSTS on development

**Solution:** Always set HSTS header regardless of request protocol.

---

### SEC-009: Weak Passphrase Minimum

**File:** `portal/server/utils/prompt-encryptor.js`
**Risk:** Weak encryption keys from short passphrases

**Solution:** Increase minimum passphrase length to 12 characters.

---

### CQ-006 to CQ-013: Code Quality Improvements

| ID | Issue | Solution |
|----|-------|----------|
| CQ-006 | Hardcoded rate limits | Extract to configuration file |
| CQ-007 | Weak lock mechanism | Implement proper mutex with async-lock |
| CQ-008 | Inconsistent async/sync | Standardize on async throughout |
| CQ-009 | No git validation | Validate git repo before operations |
| CQ-010 | Duplicate pattern logic | Extract PatternMatcher class |
| CQ-011 | Duplicate state persistence | Create StatePersistence base class |
| CQ-012 | Callback leak potential | Add cleanup in finally blocks |
| CQ-013 | Mutable config returns | Return Object.freeze() copies |

---

## Implementation Order

### Phase 1: Critical Security (Week 1)
1. SEC-001: Timing-safe comparison
2. SEC-002: CSP nonce implementation
3. CQ-001: Safe JSON parsing
4. CQ-004/005: Bounded caches

### Phase 2: Stability (Week 2)
5. CQ-002: Promise cleanup
6. CQ-003: Async error handling
7. SEC-007: Key zeroing
8. SEC-003: Distributed rate limiting (if Redis available)

### Phase 3: Hardening (Week 3-4)
9. SEC-004: Parameterized queries
10. SEC-005: TOCTOU fixes
11. SEC-006 to SEC-009: Remaining security
12. CQ-006 to CQ-013: Code quality

---

## Verification Checklist

After completing all fixes:

- [ ] All new tests pass (130+ new tests)
- [ ] Coverage remains above 88%
- [ ] No security warnings from npm audit
- [ ] CSP Evaluator shows no critical issues
- [ ] Load test shows stable memory usage
- [ ] All timing attack mitigations verified
- [ ] No unbounded collections in codebase

---

## Test Commands

```bash
# Run specific test file
npm test -- portal/server/__tests__/auth-timing-safe.test.js

# Run all new security tests
npm test -- --grep "SEC-"

# Run all new code quality tests
npm test -- --grep "CQ-"

# Run with coverage
npm test -- --coverage

# Run memory profiling
node --expose-gc --inspect portal/server/index.js
```

---

## Sources Reference

### Security
- [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [CWE/SANS Top 25](https://cwe.mitre.org/top25/)
- [Snyk Security Blog](https://snyk.io/blog/)

### Node.js
- [Node.js API Documentation](https://nodejs.org/api/)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)
- [JavaScript.info](https://javascript.info/)

### Patterns
- [Martin Fowler Patterns](https://martinfowler.com/)
- [Redis Documentation](https://redis.io/docs/)
- [MDN Web Docs](https://developer.mozilla.org/)

---

*Report generated by Claude Opus 4.5*
*Based on QA-CODE-REVIEW-REPORT.md*
*Ready for TDD implementation*
