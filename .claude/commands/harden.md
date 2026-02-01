# /harden - Production Hardening & Quality Gate

**Tier:** 2 (Workflow Command)
**Priority:** P0 (CRITICAL)
**Recommended Model:** Sonnet
**Aliases:** /quality, /production-check, /hardening

## Purpose

Comprehensive post-completion quality gate ensuring code is production-ready. Runs security scans, performance analysis, code quality checks, accessibility audits, and production readiness verification.

## When to Run

- Before any PR to main
- Before any deployment
- After completing major features
- Weekly on full codebase
- Before Wave completion signoff

## Usage

```bash
/harden                    # Full hardening suite (all checks)
/harden quick              # Fast essential checks only (~2 min)
/harden security           # Security checks only
/harden performance        # Performance checks only
/harden quality            # Code quality checks only
/harden a11y               # Accessibility checks only
/harden production         # Production readiness only
/harden --fix              # Auto-fix what's possible
/harden --ci               # CI mode (exit codes, no interactive)
/harden --report           # Generate HTML report
```

---

## Check Categories

### 1. Security Scan (`/harden security`)

| Check | Tool | Threshold |
|-------|------|-----------|
| Dependency vulnerabilities | `npm audit` / `pnpm audit` | 0 critical, 0 high |
| Deep vulnerability scan | `snyk test` (if available) | 0 critical |
| Secret detection | `gitleaks` / `git-secrets` | 0 secrets |
| License compliance | `license-checker` | No GPL in production |
| OWASP patterns | Custom regex + semgrep | 0 high-risk patterns |
| SQL injection | Pattern analysis | 0 vulnerable queries |
| XSS vulnerabilities | Pattern analysis | 0 unescaped outputs |
| Dependency freshness | `npm outdated` | No major versions behind |

#### Security Commands Run
```bash
# Dependency audit
pnpm audit --audit-level=high

# Secret detection
gitleaks detect --source . --verbose

# License check
npx license-checker --production --onlyAllow "MIT;Apache-2.0;BSD-2-Clause;BSD-3-Clause;ISC"

# OWASP patterns (custom)
grep -r "eval(" --include="*.ts" --include="*.tsx" src/
grep -r "dangerouslySetInnerHTML" --include="*.tsx" src/
grep -r "innerHTML" --include="*.ts" src/
```

#### Output
```
╔══════════════════════════════════════════════════════════════════════════════╗
║  SECURITY SCAN                                           /harden security    ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  DEPENDENCY VULNERABILITIES                                                  ║
║  ──────────────────────────                                                  ║
║  ✓ Critical: 0                                                               ║
║  ✓ High: 0                                                                   ║
║  ⚠ Moderate: 2                                                               ║
║    └── lodash@4.17.20 - Prototype Pollution (upgrade to 4.17.21)             ║
║    └── node-fetch@2.6.1 - ReDoS (upgrade to 2.6.7)                           ║
║  ○ Low: 5 (acceptable)                                                       ║
║                                                                              ║
║  SECRET DETECTION                                                            ║
║  ────────────────                                                            ║
║  ✓ No secrets found in codebase                                              ║
║  ✓ .env files in .gitignore                                                  ║
║  ✓ No API keys in source code                                                ║
║                                                                              ║
║  LICENSE COMPLIANCE                                                          ║
║  ──────────────────                                                          ║
║  ✓ All dependencies use compatible licenses                                  ║
║  ✓ No GPL/AGPL in production dependencies                                    ║
║                                                                              ║
║  OWASP PATTERNS                                                              ║
║  ──────────────                                                              ║
║  ✓ No eval() usage                                                           ║
║  ⚠ dangerouslySetInnerHTML: 2 instances (verified safe)                      ║
║    └── src/components/RichText.tsx:45 - sanitized with DOMPurify             ║
║    └── src/components/MarkdownRenderer.tsx:23 - sanitized                    ║
║  ✓ No raw SQL queries (using Supabase client)                                ║
║                                                                              ║
║  DEPENDENCY FRESHNESS                                                        ║
║  ────────────────────                                                        ║
║  ⚠ 3 packages have major updates available                                   ║
║    └── next: 14.0.0 → 14.1.0 (minor)                                         ║
║    └── react-hook-form: 7.48.0 → 7.50.0 (minor)                              ║
║    └── zod: 3.22.0 → 3.22.4 (patch)                                          ║
║                                                                              ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  SECURITY SCORE: 92/100                                                      ║
║  STATUS: ✓ PASS (2 moderate vulnerabilities - non-blocking)                  ║
║                                                                              ║
║  Fix: pnpm update lodash node-fetch                                          ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

---

### 2. Performance Analysis (`/harden performance`)

| Check | Tool | Threshold |
|-------|------|-----------|
| Bundle size | `@next/bundle-analyzer` | <300KB gzipped |
| Lighthouse Performance | `lighthouse-ci` | >90 score |
| Lighthouse SEO | `lighthouse-ci` | >90 score |
| Lighthouse Best Practices | `lighthouse-ci` | >90 score |
| Core Web Vitals - LCP | Lighthouse | <2.5s |
| Core Web Vitals - FID | Lighthouse | <100ms |
| Core Web Vitals - CLS | Lighthouse | <0.1 |
| Image optimization | Custom check | All images optimized |
| Code splitting | Webpack analysis | Proper chunking |
| Tree shaking | Bundle analysis | No dead imports |

#### Performance Commands Run
```bash
# Bundle analysis
ANALYZE=true pnpm build

# Lighthouse CI
npx lhci autorun --collect.url=http://localhost:3000

# Image check
find . -name "*.png" -o -name "*.jpg" | xargs -I {} identify -verbose {} | grep -E "Quality|Compression"
```

#### Output
```
╔══════════════════════════════════════════════════════════════════════════════╗
║  PERFORMANCE ANALYSIS                                 /harden performance    ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  BUNDLE SIZE                                                                 ║
║  ───────────                                                                 ║
║  Total: 287KB gzipped (budget: 300KB)                    ✓ PASS              ║
║                                                                              ║
║  Breakdown:                                                                  ║
║  ├── Framework (Next.js, React): 142KB                                       ║
║  ├── UI Components: 45KB                                                     ║
║  ├── Features: 67KB                                                          ║
║  └── Third-party: 33KB                                                       ║
║                                                                              ║
║  Largest chunks:                                                             ║
║  ├── _app.js: 89KB                                                           ║
║  ├── auth.js: 34KB                                                           ║
║  └── dashboard.js: 28KB                                                      ║
║                                                                              ║
║  LIGHTHOUSE SCORES                                                           ║
║  ─────────────────                                                           ║
║  Performance:      87  ⚠ (target: 90)                                        ║
║  Accessibility:    94  ✓                                                     ║
║  Best Practices:   92  ✓                                                     ║
║  SEO:              100 ✓                                                     ║
║                                                                              ║
║  CORE WEB VITALS                                                             ║
║  ───────────────                                                             ║
║  LCP (Largest Contentful Paint):  2.3s   ✓ (target: <2.5s)                   ║
║  FID (First Input Delay):         45ms   ✓ (target: <100ms)                  ║
║  CLS (Cumulative Layout Shift):   0.05   ✓ (target: <0.1)                    ║
║  TTFB (Time to First Byte):       180ms  ✓                                   ║
║  FCP (First Contentful Paint):    1.1s   ✓                                   ║
║                                                                              ║
║  IMAGE OPTIMIZATION                                                          ║
║  ──────────────────                                                          ║
║  ⚠ 3 images need optimization:                                               ║
║    └── public/hero.png: 1.2MB → use next/image + WebP                        ║
║    └── public/about.jpg: 800KB → compress to <200KB                          ║
║    └── public/team.png: 600KB → use next/image                               ║
║                                                                              ║
║  CODE SPLITTING                                                              ║
║  ──────────────                                                              ║
║  ✓ Dynamic imports: 12 lazy-loaded routes                                    ║
║  ✓ Vendor chunk separation: enabled                                          ║
║  ✓ CSS code splitting: enabled                                               ║
║                                                                              ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  PERFORMANCE SCORE: 85/100                                                   ║
║  STATUS: ⚠ PASS WITH WARNINGS                                                ║
║                                                                              ║
║  Fix: /harden --fix images                                                   ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

---

### 3. Code Quality (`/harden quality`)

| Check | Tool | Threshold |
|-------|------|-----------|
| TypeScript strict | `tsc --noEmit` | 0 errors |
| ESLint | `eslint` | 0 errors, 0 warnings |
| Cyclomatic complexity | `eslint-plugin-complexity` | Max 10 per function |
| Dead code | `ts-prune` | 0 unused exports |
| Duplicate code | `jscpd` | <3% duplication |
| Type coverage | `type-coverage` | >95% |
| Import cycles | `madge` | 0 circular imports |
| Console statements | grep | 0 in production code |

#### Code Quality Commands Run
```bash
# TypeScript
pnpm tsc --noEmit --strict

# ESLint (strict)
pnpm eslint . --max-warnings 0

# Dead code detection
npx ts-prune --error

# Duplicate code
npx jscpd src/ --threshold 3

# Type coverage
npx type-coverage --detail --strict

# Circular dependencies
npx madge --circular --extensions ts,tsx src/

# Console statements
grep -r "console\." --include="*.ts" --include="*.tsx" src/ | grep -v ".test." | grep -v ".spec."
```

#### Output
```
╔══════════════════════════════════════════════════════════════════════════════╗
║  CODE QUALITY                                            /harden quality     ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  TYPESCRIPT                                                                  ║
║  ──────────                                                                  ║
║  ✓ Strict mode: enabled                                                      ║
║  ✓ Errors: 0                                                                 ║
║  ✓ No implicit any: enforced                                                 ║
║  ✓ Strict null checks: enabled                                               ║
║                                                                              ║
║  ESLINT                                                                      ║
║  ──────                                                                      ║
║  ✓ Errors: 0                                                                 ║
║  ✓ Warnings: 0                                                               ║
║  ✓ Rules: 145 active                                                         ║
║                                                                              ║
║  COMPLEXITY                                                                  ║
║  ──────────                                                                  ║
║  ✓ Average complexity: 4.2 (excellent)                                       ║
║  ✓ Max complexity: 8 (threshold: 10)                                         ║
║  ⚠ High complexity functions (6-10):                                         ║
║    └── src/features/auth/lib/validate.ts:validateForm (8)                    ║
║    └── src/features/payments/lib/process.ts:processPayment (7)               ║
║                                                                              ║
║  DEAD CODE                                                                   ║
║  ─────────                                                                   ║
║  ✓ Unused exports: 0                                                         ║
║  ✓ Unused dependencies: 0                                                    ║
║                                                                              ║
║  DUPLICATE CODE                                                              ║
║  ──────────────                                                              ║
║  ✓ Duplication: 1.8% (threshold: 3%)                                         ║
║  ○ Similar blocks: 4 (acceptable)                                            ║
║                                                                              ║
║  TYPE COVERAGE                                                               ║
║  ─────────────                                                               ║
║  ✓ Coverage: 98.2% (threshold: 95%)                                          ║
║  ✓ Untyped: 23 of 1,245 identifiers                                          ║
║                                                                              ║
║  CIRCULAR DEPENDENCIES                                                       ║
║  ─────────────────────                                                       ║
║  ✓ No circular imports detected                                              ║
║                                                                              ║
║  CONSOLE STATEMENTS                                                          ║
║  ──────────────────                                                          ║
║  ⚠ 2 console statements in production code:                                  ║
║    └── src/lib/logger.ts:15 - console.error (intentional)                    ║
║    └── src/features/debug/panel.tsx:8 - console.log (remove)                 ║
║                                                                              ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  CODE QUALITY SCORE: 94/100                                                  ║
║  STATUS: ✓ PASS                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

---

### 4. Test Coverage (`/harden tests`)

| Check | Tool | Threshold |
|-------|------|-----------|
| Unit test coverage | `vitest --coverage` | >80% |
| Branch coverage | `vitest --coverage` | >70% |
| Integration tests | Custom | Critical paths covered |
| E2E tests | Playwright | Critical flows covered |
| Test quality | Custom | No skipped tests |

#### Output
```
╔══════════════════════════════════════════════════════════════════════════════╗
║  TEST COVERAGE                                              /harden tests    ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  UNIT TESTS                                                                  ║
║  ──────────                                                                  ║
║  ✓ Statement coverage: 84.2% (threshold: 80%)                                ║
║  ✓ Branch coverage: 76.5% (threshold: 70%)                                   ║
║  ✓ Function coverage: 89.1%                                                  ║
║  ✓ Line coverage: 83.8%                                                      ║
║                                                                              ║
║  Coverage by feature:                                                        ║
║  ├── auth: 92%       ████████████████████░░ ✓                                ║
║  ├── profiles: 85%   █████████████████░░░░░ ✓                                ║
║  ├── payments: 88%   ██████████████████░░░░ ✓                                ║
║  ├── messaging: 72%  ██████████████░░░░░░░░ ⚠                                ║
║  └── projects: 78%   ████████████████░░░░░░ ✓                                ║
║                                                                              ║
║  INTEGRATION TESTS                                                           ║
║  ─────────────────                                                           ║
║  ✓ API endpoints tested: 24/24 (100%)                                        ║
║  ✓ Database operations: 18/18 (100%)                                         ║
║  ✓ External services: mocked                                                 ║
║                                                                              ║
║  E2E TESTS (Playwright)                                                      ║
║  ──────────────────────                                                      ║
║  ✓ Critical flows covered:                                                   ║
║    ├── User registration: ✓                                                  ║
║    ├── User login: ✓                                                         ║
║    ├── Password reset: ✓                                                     ║
║    ├── Profile creation: ✓                                                   ║
║    ├── Payment flow: ✓                                                       ║
║    └── Project creation: ✓                                                   ║
║                                                                              ║
║  TEST QUALITY                                                                ║
║  ────────────                                                                ║
║  ✓ Skipped tests: 0                                                          ║
║  ✓ Flaky tests: 0                                                            ║
║  ✓ Average test duration: 45ms                                               ║
║  ⚠ Slow tests (>1s): 3                                                       ║
║                                                                              ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  TEST SCORE: 88/100                                                          ║
║  STATUS: ✓ PASS                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

---

### 5. Accessibility (`/harden a11y`)

| Check | Tool | Threshold |
|-------|------|-----------|
| axe-core audit | `@axe-core/playwright` | 0 critical, 0 serious |
| WCAG 2.1 AA | axe-core | Full compliance |
| Color contrast | axe-core | 4.5:1 minimum |
| Keyboard navigation | Playwright | All elements reachable |
| Focus indicators | Visual check | Visible on all elements |
| ARIA labels | axe-core | All interactive elements labeled |
| Skip links | Manual | Present and functional |
| Screen reader | `@testing-library` | Announced correctly |

#### Output
```
╔══════════════════════════════════════════════════════════════════════════════╗
║  ACCESSIBILITY AUDIT                                        /harden a11y     ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  AXE-CORE SCAN                                                               ║
║  ─────────────                                                               ║
║  ✓ Critical: 0                                                               ║
║  ✓ Serious: 0                                                                ║
║  ⚠ Moderate: 2                                                               ║
║    └── color-contrast: 1 element below 4.5:1 ratio                           ║
║    └── link-name: 1 link missing accessible name                             ║
║  ○ Minor: 4 (acceptable)                                                     ║
║                                                                              ║
║  WCAG 2.1 COMPLIANCE                                                         ║
║  ───────────────────                                                         ║
║  Level A:   ✓ 25/25 criteria pass                                            ║
║  Level AA:  ⚠ 12/13 criteria pass                                            ║
║    └── 1.4.3 Contrast (Minimum): 1 failure                                   ║
║  Level AAA: ○ Not required                                                   ║
║                                                                              ║
║  COLOR CONTRAST                                                              ║
║  ──────────────                                                              ║
║  ⚠ 1 element fails contrast check:                                           ║
║    └── .muted-text on .card-background: 3.8:1 (needs 4.5:1)                  ║
║        Location: src/components/ui/Card.tsx                                  ║
║        Fix: Change --muted from hsl(215 20% 65%) to hsl(215 20% 45%)         ║
║                                                                              ║
║  KEYBOARD NAVIGATION                                                         ║
║  ───────────────────                                                         ║
║  ✓ All interactive elements focusable                                        ║
║  ✓ Tab order logical                                                         ║
║  ✓ No keyboard traps                                                         ║
║  ✓ Skip link present                                                         ║
║                                                                              ║
║  FOCUS INDICATORS                                                            ║
║  ─────────────────                                                           ║
║  ✓ All focusable elements have visible focus                                 ║
║  ✓ Focus ring contrast: 3:1+                                                 ║
║                                                                              ║
║  ARIA LABELS                                                                 ║
║  ───────────                                                                 ║
║  ✓ Buttons: 45/45 labeled                                                    ║
║  ✓ Inputs: 32/32 labeled                                                     ║
║  ⚠ Icons: 22/24 labeled                                                      ║
║    └── Missing: IconButton (settings), IconButton (close)                    ║
║  ✓ Images: 18/18 have alt text                                               ║
║                                                                              ║
║  RTL SUPPORT                                                                 ║
║  ───────────                                                                 ║
║  ✓ dir="rtl" supported                                                       ║
║  ✓ Logical properties used (start/end)                                       ║
║  ⚠ 2 components need RTL fix                                                 ║
║    └── Sidebar: fixed left position                                          ║
║    └── Toast: animation direction                                            ║
║                                                                              ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  ACCESSIBILITY SCORE: 89/100                                                 ║
║  STATUS: ⚠ PASS WITH WARNINGS                                                ║
║                                                                              ║
║  Fix: Update muted color contrast, add 2 ARIA labels                         ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

---

### 6. Production Readiness (`/harden production`)

| Check | Verification |
|-------|--------------|
| Environment variables | All required vars documented and set |
| Error tracking | Sentry/similar configured |
| Logging | Structured logging enabled |
| Rate limiting | Configured on public endpoints |
| CORS | Properly configured |
| CSP headers | Content Security Policy set |
| Health check | `/api/health` endpoint exists |
| Graceful shutdown | Handles SIGTERM |
| Database | Connection pooling, migrations up to date |
| Caching | Redis/CDN configured |
| Monitoring | APM/metrics configured |
| Backups | Database backup configured |

#### Output
```
╔══════════════════════════════════════════════════════════════════════════════╗
║  PRODUCTION READINESS                                 /harden production     ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  ENVIRONMENT                                                                 ║
║  ───────────                                                                 ║
║  ✓ .env.example up to date                                                   ║
║  ✓ All required vars documented                                              ║
║  ✓ No secrets in codebase                                                    ║
║  ✓ Production env vars set in Vercel                                         ║
║                                                                              ║
║  ERROR TRACKING                                                              ║
║  ──────────────                                                              ║
║  ✓ Sentry configured                                                         ║
║  ✓ Source maps uploaded                                                      ║
║  ✓ Error boundaries in place                                                 ║
║  ✓ Unhandled rejection handler                                               ║
║                                                                              ║
║  LOGGING                                                                     ║
║  ───────                                                                     ║
║  ✓ Structured logging enabled                                                ║
║  ✓ Log levels configured                                                     ║
║  ✓ PII filtered from logs                                                    ║
║  ✓ Request ID tracing                                                        ║
║                                                                              ║
║  RATE LIMITING                                                               ║
║  ─────────────                                                               ║
║  ✓ Auth endpoints: 5 req/min                                                 ║
║  ✓ API endpoints: 100 req/min                                                ║
║  ⚠ Missing on:                                                               ║
║    └── /api/upload (add limit)                                               ║
║    └── /api/export (add limit)                                               ║
║                                                                              ║
║  SECURITY HEADERS                                                            ║
║  ────────────────                                                            ║
║  ✓ X-Frame-Options: DENY                                                     ║
║  ✓ X-Content-Type-Options: nosniff                                           ║
║  ✓ Referrer-Policy: strict-origin-when-cross-origin                          ║
║  ✓ X-XSS-Protection: 1; mode=block                                           ║
║  ✗ Content-Security-Policy: NOT SET                                          ║
║    └── BLOCKING: Add CSP header for XSS protection                           ║
║  ✓ Strict-Transport-Security: max-age=31536000                               ║
║                                                                              ║
║  CORS                                                                        ║
║  ────                                                                        ║
║  ✓ Origins whitelist configured                                              ║
║  ✓ Credentials handling correct                                              ║
║  ✓ Preflight caching enabled                                                 ║
║                                                                              ║
║  HEALTH & MONITORING                                                         ║
║  ──────────────────                                                          ║
║  ✓ /api/health endpoint: returns 200                                         ║
║  ✓ Database health check included                                            ║
║  ✓ Graceful shutdown handler                                                 ║
║  ⚠ APM/metrics: not configured                                               ║
║                                                                              ║
║  DATABASE                                                                    ║
║  ────────                                                                    ║
║  ✓ Connection pooling: enabled                                               ║
║  ✓ Migrations: up to date                                                    ║
║  ✓ Indexes: optimized                                                        ║
║  ✓ RLS policies: enabled                                                     ║
║                                                                              ║
║  CACHING                                                                     ║
║  ───────                                                                     ║
║  ✓ Static assets: CDN cached                                                 ║
║  ✓ API responses: Cache-Control headers set                                  ║
║  ○ Redis: not configured (optional)                                          ║
║                                                                              ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  PRODUCTION SCORE: 82/100                                                    ║
║  STATUS: ✗ BLOCKING ISSUE                                                    ║
║                                                                              ║
║  MUST FIX:                                                                   ║
║  1. Add Content-Security-Policy header                                       ║
║                                                                              ║
║  RECOMMENDED:                                                                ║
║  1. Add rate limiting to /api/upload, /api/export                            ║
║  2. Configure APM/metrics                                                    ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

---

## Full Hardening Report (`/harden`)

```
╔══════════════════════════════════════════════════════════════════════════════╗
║  PRODUCTION HARDENING REPORT                                       /harden   ║
║  Project: AirView | Date: 2026-02-01 | Branch: main                          ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  CATEGORY SCORES                                                             ║
║  ───────────────                                                             ║
║                                                                              ║
║  Security:           92/100  ████████████████████░░░░ ✓                      ║
║  Performance:        85/100  █████████████████░░░░░░░ ⚠                      ║
║  Code Quality:       94/100  ███████████████████░░░░░ ✓                      ║
║  Test Coverage:      88/100  ██████████████████░░░░░░ ✓                      ║
║  Accessibility:      89/100  ██████████████████░░░░░░ ⚠                      ║
║  Production Ready:   82/100  ████████████████░░░░░░░░ ✗                      ║
║                                                                              ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  OVERALL SCORE: 88/100                                                       ║
║  STATUS: ⚠ READY WITH BLOCKING ISSUES                                        ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  BLOCKING ISSUES (must fix before deploy)                                    ║
║  ────────────────────────────────────────                                    ║
║  1. ✗ CSP headers not configured                                             ║
║     → Add Content-Security-Policy in next.config.js                          ║
║     → Risk: XSS vulnerabilities                                              ║
║                                                                              ║
║  HIGH PRIORITY (fix soon)                                                    ║
║  ────────────────────────                                                    ║
║  2. ⚠ 2 moderate dependency vulnerabilities                                  ║
║     → Run: pnpm update lodash node-fetch                                     ║
║                                                                              ║
║  3. ⚠ Lighthouse Performance: 85 (target: 90)                                ║
║     → Optimize 3 images                                                      ║
║     → Lazy load hero image                                                   ║
║                                                                              ║
║  4. ⚠ Color contrast issue on muted text                                     ║
║     → Update --muted CSS variable                                            ║
║                                                                              ║
║  5. ⚠ Rate limiting missing on 2 endpoints                                   ║
║     → Add to /api/upload, /api/export                                        ║
║                                                                              ║
║  MEDIUM PRIORITY (nice to have)                                              ║
║  ─────────────────────────────                                               ║
║  6. ○ 2 ARIA labels missing on icon buttons                                  ║
║  7. ○ 1 console.log in production code                                       ║
║  8. ○ Configure APM/metrics                                                  ║
║  9. ○ 3 slow tests (>1s)                                                     ║
║                                                                              ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  QUICK FIXES                                                                 ║
║  ───────────                                                                 ║
║                                                                              ║
║  # Fix dependencies                                                          ║
║  pnpm update lodash node-fetch                                               ║
║                                                                              ║
║  # Fix images                                                                ║
║  /harden --fix images                                                        ║
║                                                                              ║
║  # Fix all auto-fixable                                                      ║
║  /harden --fix                                                               ║
║                                                                              ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  NEXT STEPS                                                                  ║
║  ──────────                                                                  ║
║  1. Fix blocking CSP issue                                                   ║
║  2. Run /harden again                                                        ║
║  3. When score >90 and no blockers → approve for production                  ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

---

## Quick Mode (`/harden quick`)

Fast essential checks only (~2 minutes):

```bash
/harden quick
```

Runs only:
- `pnpm audit` (critical/high only)
- `pnpm tsc --noEmit`
- `pnpm lint`
- `pnpm test --coverage`
- Basic security patterns

---

## Auto-Fix Mode (`/harden --fix`)

```bash
/harden --fix              # Fix all auto-fixable issues
/harden --fix security     # Fix security issues only
/harden --fix images       # Optimize images
/harden --fix lint         # Fix lint issues
```

What can be auto-fixed:
- Dependency updates (patch/minor)
- Lint issues (with `--fix`)
- Image optimization
- Console statement removal
- Import sorting

---

## CI Integration (`/harden --ci`)

```yaml
# .github/workflows/harden.yml
name: Hardening Check
on: [push, pull_request]

jobs:
  harden:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - run: pnpm install
      - run: pnpm harden:ci
        # Exit code 0 = pass, 1 = blocking issues
```

---

## Signal File

```json
// .claude/signals/harden-{timestamp}.json
{
  "command": "/harden",
  "timestamp": "2026-02-01T15:00:00Z",
  "branch": "main",
  "commit": "abc123",
  "overallScore": 88,
  "status": "BLOCKING_ISSUES",
  "scores": {
    "security": 92,
    "performance": 85,
    "quality": 94,
    "tests": 88,
    "accessibility": 89,
    "production": 82
  },
  "blocking": [
    {
      "category": "production",
      "issue": "CSP headers not configured",
      "severity": "critical"
    }
  ],
  "warnings": 8,
  "passed": true
}
```

---

## Integration

### With /done
```bash
# /done can optionally run /harden quick
/done --harden
```

### With /gate-7
```bash
# Gate 7 includes hardening check
/gate-7 story AUTH-BE-001
# Runs /harden quick before merge approval
```

### With CI/CD
```bash
# Block merge if hardening fails
/harden --ci --threshold 85
```

---

## Research Validation

This command is backed by industry standards and best practices:

### Security Standards
| Source | Type | URL |
|--------|------|-----|
| OWASP Top 10 2025 | Industry Standard | https://owasp.org/Top10/2025/0x00_2025-Introduction/ |
| OWASP ASVS 5.0 | Industry Standard | https://owasp.org/www-project-application-security-verification-standard/ |
| OWASP WSTG | Testing Guide | https://owasp.org/www-project-web-security-testing-guide/ |
| npm audit docs | Official Documentation | https://docs.npmjs.com/auditing-package-dependencies-for-security-vulnerabilities/ |
| Semgrep SAST | Tool Documentation | https://github.com/semgrep/semgrep |
| Gitleaks | Tool Documentation | https://github.com/gitleaks/gitleaks |

### Performance Standards
| Source | Type | URL |
|--------|------|-----|
| Core Web Vitals | Google Official | https://developers.google.com/search/docs/appearance/core-web-vitals |
| Lighthouse Documentation | Google Official | https://developers.google.com/speed/docs/insights/v5/about |
| Web Vitals Thresholds | Google Official | https://web.dev/vitals/ |

### Accessibility Standards
| Source | Type | URL |
|--------|------|-----|
| WCAG 2.1 AA | W3C Standard | https://www.w3.org/WAI/standards-guidelines/wcag/ |
| axe-core | Tool Documentation | https://github.com/dequelabs/axe-core |
| Pa11y | Tool Documentation | https://pa11y.org/ |

### Key Insights Applied
- OWASP Top 10 2025 places Broken Access Control at #1, Security Misconfiguration at #2
- Core Web Vitals thresholds: LCP <2.5s, INP <200ms, CLS <0.1 (measured at 75th percentile)
- WCAG 2.1 AA requires 4.5:1 contrast ratio for normal text
- Combined axe-core + Pa11y catches 35% of accessibility issues (vs 27% or 20% alone)

---

## Thresholds Configuration

Create `.claude/harden.config.json`:

```json
{
  "thresholds": {
    "overall": 85,
    "security": 90,
    "performance": 80,
    "quality": 85,
    "tests": 80,
    "accessibility": 85,
    "production": 80
  },
  "blocking": {
    "criticalVulnerabilities": 0,
    "highVulnerabilities": 0,
    "secretsInCode": 0,
    "cspRequired": true,
    "testCoverageMin": 70
  },
  "skip": [
    "lighthouse"  // Skip if no browser available
  ]
}
```
