# WAVE Framework - Gap Remediation Plan

**Plan ID:** GRP-2026-0130-001
**Created:** 2026-01-30
**Based On:** GATE-0-ANALYSIS-VALIDATION.md
**Methodology:** Test-Driven Development (TDD)
**Owner:** CTO Master / Development Team

---

## Executive Summary

This plan addresses 17 identified gaps from the Gate 0 Analysis. Each gap includes:
- Root cause analysis
- TDD test specifications (write tests FIRST)
- Implementation steps
- Verification criteria
- Estimated effort

### Priority Overview

| Priority | Gaps | Total Effort | Target Completion |
|----------|------|--------------|-------------------|
| **CRITICAL** | GAP-001 | 2-4 hours | Day 1 |
| **HIGH** | GAP-002 to GAP-009 | 18-34 hours | Days 1-5 |
| **MEDIUM** | GAP-010 to GAP-013 | 13-26 hours | Week 2 |
| **LOW** | GAP-014 to GAP-017 | 14-28 hours | Week 3-4 |

---

## Phase 1: CRITICAL - Safety Scoring (Day 1)

---

### GAP-001: Destructive Commands Score Too High

**Severity:** CRITICAL
**File:** `orchestrator/src/safety/unified.py`
**Current:** `rm -rf /` scores 0.7
**Required:** Score < 0.5 (must block)

#### Root Cause

The constitutional AI scorer lacks sufficient penalty weight for destructive file system commands.

#### TDD Test Specifications

```python
# File: orchestrator/tests/test_gap_001_destructive_commands.py

import pytest
from src.safety.unified import UnifiedSafetyChecker, score_action

class TestDestructiveCommandBlocking:
    """GAP-001: Destructive commands must score < 0.5"""

    @pytest.fixture
    def checker(self):
        return UnifiedSafetyChecker()

    # Core Tests (MUST PASS)
    def test_rm_rf_root_blocked(self, checker):
        """rm -rf / must be blocked (score < 0.5)"""
        result = checker.check("rm -rf /")
        assert result.score < 0.5, f"Expected <0.5, got {result.score}"
        assert not result.safe
        assert len(result.violations) > 0

    def test_rm_rf_wildcard_blocked(self, checker):
        """rm -rf * must be blocked"""
        result = checker.check("rm -rf *")
        assert result.score < 0.5

    def test_rm_rf_home_blocked(self, checker):
        """rm -rf ~ must be blocked"""
        result = checker.check("rm -rf ~")
        assert result.score < 0.5

    def test_rm_rf_var_blocked(self, checker):
        """rm -rf /var must be blocked"""
        result = checker.check("rm -rf /var")
        assert result.score < 0.5

    # Variant Tests
    def test_rm_force_recursive_blocked(self, checker):
        """rm --force --recursive / must be blocked"""
        result = checker.check("rm --force --recursive /")
        assert result.score < 0.5

    def test_sudo_rm_rf_blocked(self, checker):
        """sudo rm -rf / must be blocked"""
        result = checker.check("sudo rm -rf /")
        assert result.score < 0.3  # Even lower for sudo

    # Edge Cases
    def test_rm_rf_in_safe_dir_allowed(self, checker):
        """rm -rf ./node_modules should be allowed"""
        result = checker.check("rm -rf ./node_modules")
        assert result.score >= 0.5  # Acceptable

    def test_rm_rf_tmp_allowed(self, checker):
        """rm -rf /tmp/test should be allowed"""
        result = checker.check("rm -rf /tmp/test-abc123")
        assert result.score >= 0.5

    # Other Destructive Commands
    def test_dd_if_dev_zero_blocked(self, checker):
        """dd if=/dev/zero of=/dev/sda must be blocked"""
        result = checker.check("dd if=/dev/zero of=/dev/sda")
        assert result.score < 0.3

    def test_mkfs_blocked(self, checker):
        """mkfs.ext4 /dev/sda must be blocked"""
        result = checker.check("mkfs.ext4 /dev/sda")
        assert result.score < 0.3

    def test_format_c_blocked(self, checker):
        """format c: must be blocked"""
        result = checker.check("format c:")
        assert result.score < 0.5

    # Backward Compatibility
    def test_score_action_function(self):
        """Backward compatible score_action function"""
        score, violations, risks = score_action("rm -rf /")
        assert score < 0.5
        assert len(violations) > 0
```

#### Implementation Steps

1. **Add destructive command patterns with high penalties**

```python
# File: orchestrator/src/safety/unified.py

# Add after line 50 (after SERVER_SIDE_CONTENT_PATTERNS)

DESTRUCTIVE_COMMAND_PATTERNS = {
    # Pattern: (regex, penalty_multiplier, description)
    r"rm\s+(-[rf]+\s+)*(/|\*|~|/var|/etc|/usr|/home)": (0.1, "Destructive rm on system paths"),
    r"rm\s+--force\s+--recursive\s+(/|\*)": (0.1, "Destructive rm with long flags"),
    r"sudo\s+rm\s+-rf": (0.05, "Sudo destructive rm"),
    r"dd\s+if=/dev/(zero|random|urandom)\s+of=/dev/": (0.1, "Disk wipe command"),
    r"mkfs\.\w+\s+/dev/": (0.1, "Filesystem format command"),
    r"format\s+[a-z]:": (0.2, "Windows format command"),
    r":(){ :|:& };:": (0.05, "Fork bomb"),
    r">\s*/dev/sd[a-z]": (0.1, "Direct device write"),
    r"chmod\s+-R\s+777\s+/": (0.2, "Dangerous chmod on root"),
}

SAFE_RM_PATTERNS = [
    r"rm\s+-rf\s+\./",           # Current directory relative
    r"rm\s+-rf\s+/tmp/",         # Temp directory
    r"rm\s+-rf\s+node_modules",  # Node modules
    r"rm\s+-rf\s+\.next",        # Next.js build
    r"rm\s+-rf\s+dist/",         # Build output
    r"rm\s+-rf\s+build/",        # Build output
    r"rm\s+-rf\s+coverage/",     # Test coverage
]
```

2. **Update scoring function**

```python
def _check_destructive_commands(self, content: str) -> Tuple[float, List[str]]:
    """Check for destructive commands, return (penalty_multiplier, violations)"""
    violations = []
    min_multiplier = 1.0

    # First check if it's a safe rm pattern
    for safe_pattern in SAFE_RM_PATTERNS:
        if re.search(safe_pattern, content, re.IGNORECASE):
            return 1.0, []  # No penalty for safe patterns

    # Check destructive patterns
    for pattern, (multiplier, description) in DESTRUCTIVE_COMMAND_PATTERNS.items():
        if re.search(pattern, content, re.IGNORECASE):
            violations.append(f"BLOCKED: {description}")
            min_multiplier = min(min_multiplier, multiplier)

    return min_multiplier, violations
```

3. **Integrate into main check method**

```python
def check(self, content: str, file_path: Optional[str] = None) -> SafetyResult:
    # ... existing code ...

    # Check destructive commands FIRST (highest priority)
    destructive_multiplier, destructive_violations = self._check_destructive_commands(content)
    if destructive_multiplier < 0.5:
        return SafetyResult(
            safe=False,
            score=destructive_multiplier,
            violations=destructive_violations,
            risks=["CRITICAL: Destructive command detected"],
            recommendation="This action is blocked for safety reasons"
        )

    # ... rest of existing checks ...
```

#### Verification Criteria

- [ ] All 13 test cases pass
- [ ] `rm -rf /` scores < 0.5
- [ ] `sudo rm -rf /` scores < 0.3
- [ ] Safe rm patterns score >= 0.5
- [ ] Backward compatible function works

---

## Phase 2: HIGH Priority - Safety & Security (Days 1-3)

---

### GAP-002: Client-Side Env Vars Not Blocked

**Severity:** HIGH
**File:** `orchestrator/src/safety/unified.py`
**Current:** Client env vars score 1.0
**Required:** Score < 1.0 with violations

#### TDD Test Specifications

```python
# File: orchestrator/tests/test_gap_002_client_env_vars.py

class TestClientSideEnvVarDetection:
    """GAP-002: Environment variables in client components must be flagged"""

    def test_process_env_in_client_component(self, checker):
        """process.env in 'use client' file should flag"""
        code = '''
        "use client"
        const apiKey = process.env.API_KEY;
        '''
        result = checker.check(code, file_path="components/LoginForm.tsx")
        assert result.score < 1.0
        assert any("env" in v.lower() for v in result.violations)

    def test_process_env_in_server_component_ok(self, checker):
        """process.env in server file should be allowed"""
        code = '''
        const dbUrl = process.env.DATABASE_URL;
        '''
        result = checker.check(code, file_path="app/api/users/route.ts")
        assert result.score >= 0.8  # Server-side is OK

    def test_next_public_env_in_client_ok(self, checker):
        """NEXT_PUBLIC_ env vars in client are OK"""
        code = '''
        "use client"
        const appUrl = process.env.NEXT_PUBLIC_APP_URL;
        '''
        result = checker.check(code, file_path="components/Header.tsx")
        assert result.score >= 0.8  # Public vars are OK

    def test_private_env_in_jsx_blocked(self, checker):
        """Private env vars in JSX should be blocked"""
        code = '''
        export default function Page() {
            return <div data-key={process.env.SECRET_KEY} />;
        }
        '''
        result = checker.check(code, file_path="app/page.tsx")
        # page.tsx without 'use client' is server, but exposed in JSX
        assert result.score < 1.0 or len(result.violations) > 0
```

#### Implementation

```python
# Add to unified.py

CLIENT_SIDE_INDICATORS = [
    r'"use client"',
    r"'use client'",
]

PRIVATE_ENV_PATTERNS = [
    r"process\.env\.(?!NEXT_PUBLIC_)\w+",  # Non-public env vars
    r"import\.meta\.env\.(?!VITE_)\w+",     # Non-public Vite env vars
]

def _is_client_component(self, content: str, file_path: Optional[str]) -> bool:
    """Determine if code runs on client side"""
    # Explicit 'use client' directive
    for indicator in CLIENT_SIDE_INDICATORS:
        if re.search(indicator, content):
            return True

    # Client-side file patterns
    if file_path:
        client_patterns = [
            r"components/.*\.(tsx?|jsx?)$",
            r"hooks/.*\.(tsx?|jsx?)$",
            r"app/.*page\.(tsx?|jsx?)$",  # Pages can be either
        ]
        for pattern in client_patterns:
            if re.search(pattern, file_path):
                # Check for server indicators
                if not is_server_side_content(content):
                    return True

    return False

def _check_client_side_secrets(self, content: str, file_path: Optional[str]) -> Tuple[float, List[str]]:
    """Check for secrets exposed in client-side code"""
    if not self._is_client_component(content, file_path):
        return 1.0, []  # Server-side, no penalty

    violations = []
    penalty = 1.0

    for pattern in PRIVATE_ENV_PATTERNS:
        matches = re.findall(pattern, content)
        if matches:
            violations.append(f"Client-side env var exposure: {matches}")
            penalty = min(penalty, 0.6)

    return penalty, violations
```

---

### GAP-003: API Keys in Client Code Not Detected

**Severity:** HIGH
**File:** `orchestrator/src/safety/unified.py`

#### TDD Test Specifications

```python
# File: orchestrator/tests/test_gap_003_api_key_detection.py

class TestClientSideApiKeyDetection:
    """GAP-003: API keys in client code must be detected"""

    def test_hardcoded_api_key_in_client(self, checker):
        """Hardcoded API key in client file should flag"""
        code = '''
        "use client"
        const stripe = new Stripe("sk_live_abc123xyz");
        '''
        result = checker.check(code, file_path="components/Payment.tsx")
        assert result.score < 0.85 or len(result.violations) > 0

    def test_api_key_pattern_detection(self, checker):
        """Various API key patterns should be detected"""
        patterns = [
            'const key = "sk_live_abcd1234";',
            'const key = "pk_test_abcd1234";',
            'apiKey: "AIzaSy1234567890";',
            'authorization: "Bearer eyJhbGciOiJIUzI1NiIs"',
        ]
        for code in patterns:
            result = checker.check(f'"use client"\n{code}', file_path="comp.tsx")
            assert result.score < 1.0 or len(result.violations) > 0

    def test_api_key_in_server_ok(self, checker):
        """API key in server file should be allowed"""
        code = '''
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
        '''
        result = checker.check(code, file_path="app/api/payment/route.ts")
        assert result.score >= 0.8
```

#### Implementation

```python
# Add to unified.py

API_KEY_PATTERNS = [
    # Stripe
    (r'["\']sk_live_[a-zA-Z0-9]{24,}["\']', "Stripe live secret key"),
    (r'["\']sk_test_[a-zA-Z0-9]{24,}["\']', "Stripe test secret key"),
    (r'["\']pk_live_[a-zA-Z0-9]{24,}["\']', "Stripe live publishable key"),

    # Google
    (r'["\']AIzaSy[a-zA-Z0-9_-]{33}["\']', "Google API key"),

    # AWS
    (r'["\']AKIA[A-Z0-9]{16}["\']', "AWS access key"),

    # Generic patterns
    (r'["\']Bearer\s+eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+["\']', "JWT token"),
    (r'api[_-]?key["\']?\s*[:=]\s*["\'][a-zA-Z0-9]{16,}["\']', "Generic API key"),
    (r'secret[_-]?key["\']?\s*[:=]\s*["\'][a-zA-Z0-9]{16,}["\']', "Generic secret key"),
]

def _check_api_keys(self, content: str, file_path: Optional[str]) -> Tuple[float, List[str]]:
    """Check for hardcoded API keys"""
    violations = []
    penalty = 1.0

    is_client = self._is_client_component(content, file_path)

    for pattern, description in API_KEY_PATTERNS:
        if re.search(pattern, content):
            if is_client:
                violations.append(f"CRITICAL: {description} exposed in client code")
                penalty = min(penalty, 0.3)
            else:
                violations.append(f"WARNING: {description} - use environment variable")
                penalty = min(penalty, 0.7)

    return penalty, violations
```

---

### GAP-004: Backward Compatibility Scoring

**Severity:** MEDIUM
**Current:** Score = 0.7 for dangerous actions
**Required:** Score < 0.5

#### Implementation

Ensure `score_action()` function uses the updated scoring:

```python
def score_action(action: str, context: str = "") -> Tuple[float, List[str], List[str]]:
    """
    Backward-compatible scoring function.

    Returns:
        Tuple of (score, violations, risks)
    """
    checker = UnifiedSafetyChecker()
    result = checker.check(action)
    return result.score, result.violations, result.risks
```

---

### GAP-005: Timing Attack Vulnerability

**Severity:** HIGH
**File:** `portal/server/middleware/auth.js`

#### TDD Test Specifications

```javascript
// File: portal/server/__tests__/auth-timing-safe.test.js

describe('Timing-Safe API Key Comparison (GAP-005)', () => {
  it('should use crypto.timingSafeEqual for key comparison', () => {
    // Verify implementation uses timing-safe comparison
    const authModule = require('../middleware/auth.js');
    expect(authModule.timingSafeCompare).toBeDefined();
  });

  it('should return false for mismatched keys in constant time', async () => {
    const times = [];
    for (let i = 0; i < 100; i++) {
      const start = process.hrtime.bigint();
      timingSafeCompare('wrong_first_char', 'correct_key_value');
      times.push(Number(process.hrtime.bigint() - start));
    }

    const times2 = [];
    for (let i = 0; i < 100; i++) {
      const start = process.hrtime.bigint();
      timingSafeCompare('correct_key_valux', 'correct_key_value');
      times2.push(Number(process.hrtime.bigint() - start));
    }

    // Standard deviation should be similar (constant time)
    const stdDev1 = calculateStdDev(times);
    const stdDev2 = calculateStdDev(times2);
    expect(Math.abs(stdDev1 - stdDev2)).toBeLessThan(1000000); // 1ms variance
  });

  it('should handle keys of different lengths safely', () => {
    expect(timingSafeCompare('short', 'verylongkey')).toBe(false);
    expect(timingSafeCompare('verylongkey', 'short')).toBe(false);
  });
});
```

#### Implementation

```javascript
// File: portal/server/middleware/auth.js

import crypto from 'crypto';

/**
 * Timing-safe string comparison to prevent timing attacks.
 * @param {string} a - First string
 * @param {string} b - Second string
 * @returns {boolean} - True if strings match
 */
export function timingSafeCompare(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));

  // Pad to same length without leaking length info
  const maxLen = Math.max(bufA.length, bufB.length);
  const paddedA = Buffer.alloc(maxLen);
  const paddedB = Buffer.alloc(maxLen);
  bufA.copy(paddedA);
  bufB.copy(paddedB);

  // Both length check and content check must pass
  const lengthMatch = bufA.length === bufB.length;
  const contentMatch = crypto.timingSafeEqual(paddedA, paddedB);

  return lengthMatch && contentMatch;
}

// Replace all occurrences of:
// if (providedKey === storedKey)
// With:
// if (timingSafeCompare(providedKey, storedKey))
```

---

### GAP-006: CSP Too Permissive

**Severity:** HIGH
**File:** `portal/server/security-middleware.js`

#### Implementation

```javascript
// File: portal/server/security-middleware.js

import crypto from 'crypto';

/**
 * Generate cryptographically random nonce for CSP
 */
export function generateNonce(req, res, next) {
  res.locals.nonce = crypto.randomBytes(16).toString('base64');
  next();
}

/**
 * Set security headers with nonce-based CSP
 */
export function setSecurityHeaders(req, res, next) {
  const nonce = res.locals.nonce;

  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}'`,
    "style-src 'self' 'unsafe-inline'",  // CSS inline often needed
    "img-src 'self' data: https:",
    "font-src 'self'",
    "connect-src 'self' wss:",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "upgrade-insecure-requests"
  ].join('; ');

  res.setHeader('Content-Security-Policy', csp);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');

  next();
}
```

---

### GAP-007: Missing JSON.parse try/catch

**Severity:** HIGH
**File:** `portal/server/utils/dora-metrics.js:141`

#### Implementation

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

---

### GAP-008 & GAP-009: Unbounded Collection Growth

**Severity:** HIGH
**Files:** `signal-deduplicator.js:78`, `run-tracker.js:248`

#### Implementation

```javascript
// File: portal/server/utils/bounded-cache.js

/**
 * LRU Cache with max size and TTL support
 * Prevents unbounded memory growth (GAP-008, GAP-009)
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

    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return undefined;
    }

    // Move to end for LRU
    this.cache.delete(key);
    this.cache.set(key, entry);
    return entry.value;
  }

  set(key, value) {
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

---

## Phase 3: MEDIUM Priority (Week 2)

### GAP-010: No Distributed Rate Limiting

**File:** `portal/server/utils/rate-limiter.js`

Use Redis for distributed state:
```javascript
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

export async function checkRateLimit(key, limit, windowMs) {
  const current = await redis.incr(key);
  if (current === 1) {
    await redis.pexpire(key, windowMs);
  }
  return current <= limit;
}
```

### GAP-011: No Key Material Zeroing

**File:** `portal/server/utils/prompt-encryptor.js`

```javascript
function secureCleanup(buffer) {
  if (Buffer.isBuffer(buffer)) {
    buffer.fill(0);
  }
}

// Usage:
try {
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  // ... encryption
  return result;
} finally {
  secureCleanup(key);
  secureCleanup(iv);
}
```

### GAP-012: Promise.race Cleanup Missing

**File:** `portal/server/utils/test-verifier.js`

```javascript
async function raceWithCleanup(promises, signal) {
  const controller = new AbortController();

  if (signal) {
    signal.addEventListener('abort', () => controller.abort());
  }

  try {
    return await Promise.race(
      promises.map(p => typeof p === 'function' ? p(controller.signal) : p)
    );
  } finally {
    controller.abort();
  }
}
```

### GAP-013: Async Function Not Awaited

**File:** `portal/server/utils/heartbeat-manager.js:476`

```javascript
// Pattern 1: Await the call
await someAsyncFunction();

// Pattern 2: Fire-and-forget with error handling
someAsyncFunction().catch(err => {
  console.error('[HeartbeatManager] Async error:', err);
});
```

---

## Phase 4: LOW Priority (Week 3-4)

| Gap ID | Issue | Solution |
|--------|-------|----------|
| GAP-014 | SQL injection regex | Use parameterized queries |
| GAP-015 | TOCTOU in path validation | Validate opened file descriptor |
| GAP-016 | Hardcoded rate limits | Extract to config file |
| GAP-017 | 97 console.log calls | Replace with logger abstraction |

---

## Implementation Schedule

### Day 1 (CRITICAL + HIGH START)
- [ ] GAP-001: Fix destructive command scoring
- [ ] Run tests, verify all 13 test cases pass
- [ ] GAP-002: Add client-side env var detection
- [ ] GAP-003: Add client-side API key detection

### Day 2 (HIGH CONTINUED)
- [ ] GAP-004: Verify backward compatibility
- [ ] GAP-005: Implement timing-safe comparison
- [ ] GAP-006: Implement CSP nonce system

### Day 3-5 (HIGH COMPLETION)
- [ ] GAP-007: Safe JSON parsing
- [ ] GAP-008: Bounded cache for signal-deduplicator
- [ ] GAP-009: Bounded cache for run-tracker
- [ ] Full regression test suite

### Week 2 (MEDIUM)
- [ ] GAP-010: Distributed rate limiting (if Redis available)
- [ ] GAP-011: Key material zeroing
- [ ] GAP-012: Promise.race cleanup
- [ ] GAP-013: Async error handling

### Week 3-4 (LOW)
- [ ] GAP-014 to GAP-017
- [ ] Documentation updates
- [ ] Final production approval

---

## Verification Checklist

### Safety Tests (Must Pass)
- [ ] `test_destructive_commands_always_blocked` PASS
- [ ] `test_client_component_blocks_env_vars` PASS
- [ ] `test_api_key_warns_in_client_code` PASS
- [ ] `test_backward_compatible_score_action` PASS

### Portal Tests (Must Pass)
- [ ] All 1,212 tests pass
- [ ] Coverage remains >= 88%
- [ ] No new security warnings

### Integration Tests
- [ ] Gate system full progression works
- [ ] Safety scoring blocks dangerous actions
- [ ] Pre-flight validation passes all checks

---

## Success Criteria

1. **All 4 safety test failures resolved**
2. **Destructive commands score < 0.5**
3. **Client-side secrets detected with violations**
4. **No unbounded collections in codebase**
5. **Timing-safe comparison implemented**
6. **CSP nonce-based (no unsafe-inline)**
7. **Full test suite passes**

---

## Rollback Plan

If issues arise during implementation:

1. **Git revert** to pre-fix commit
2. **Re-run test suite** to verify stability
3. **Document** what failed and why
4. **Create** smaller incremental fix PR

---

## Approvals Required

| Phase | Approver | Status |
|-------|----------|--------|
| Phase 1 (Critical) | CTO | PENDING |
| Phase 2 (High) | QA Lead | PENDING |
| Phase 3 (Medium) | Tech Lead | PENDING |
| Phase 4 (Low) | Team Lead | PENDING |
| Final Production | CTO + QA | PENDING |

---

**Plan Created By:** CTO Master Agent (Claude Opus 4.5)
**Date:** 2026-01-30
**Review Required By:** 2026-01-31

---

**END OF GAP REMEDIATION PLAN**
