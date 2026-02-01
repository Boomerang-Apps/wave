# /security - Security Scan

**Tier:** 2 (Workflow Command)
**Priority:** P1 (HIGH)
**Recommended Model:** Sonnet
**Aliases:** /sec, /audit-security, /vuln

## Purpose

Focused security analysis including dependency vulnerabilities, secret detection, OWASP patterns, and security best practices.

## Usage

```bash
/security                  # Full security scan
/security deps             # Dependency vulnerabilities only
/security secrets          # Secret detection only
/security owasp            # OWASP pattern check only
/security headers          # HTTP security headers only
/security --fix            # Auto-fix where possible
```

---

## What It Checks

| Check | Tool | Threshold |
|-------|------|-----------|
| Dependency vulnerabilities | `npm audit` | 0 critical, 0 high |
| Secret detection | `gitleaks` | 0 secrets |
| OWASP patterns | `semgrep` | 0 high-risk patterns |
| SQL injection | `semgrep` | 0 findings |
| XSS vulnerabilities | `semgrep` | 0 findings |
| Hardcoded credentials | `gitleaks` + custom | 0 findings |
| HTTP security headers | Custom | All required present |
| CORS configuration | Custom | Properly configured |
| Auth patterns | Custom | Best practices |
| Input validation | `semgrep` | All inputs validated |

---

## Commands Run

```bash
# Dependency audit
npm audit --json
pnpm audit --json 2>/dev/null || true

# Secret detection
gitleaks detect --source . --no-git -f json

# OWASP patterns (semgrep)
npx @semgrep/semgrep --config "p/owasp-top-ten" --json

# SQL injection patterns
npx @semgrep/semgrep --config "p/sql-injection" --json

# XSS patterns
npx @semgrep/semgrep --config "p/xss" --json

# Custom security checks
grep -r "dangerouslySetInnerHTML" src/
grep -r "eval(" src/
grep -r "innerHTML" src/
```

---

## Output

```
╔══════════════════════════════════════════════════════════════════════════════╗
║  SECURITY SCAN                                                    /security  ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  DEPENDENCY VULNERABILITIES                                                  ║
║  ─────────────────────────                                                   ║
║                                                                              ║
║  ┌──────────────┬───────┬──────────────────────────────────────────────────┐ ║
║  │ Severity     │ Count │ Status                                           │ ║
║  ├──────────────┼───────┼──────────────────────────────────────────────────┤ ║
║  │ Critical     │ 0     │ ✓ Pass                                           │ ║
║  │ High         │ 0     │ ✓ Pass                                           │ ║
║  │ Moderate     │ 2     │ ⚠ Review                                         │ ║
║  │ Low          │ 5     │ ⚠ Review                                         │ ║
║  └──────────────┴───────┴──────────────────────────────────────────────────┘ ║
║                                                                              ║
║  Moderate Issues:                                                            ║
║  ├── lodash@4.17.20 → Prototype pollution (upgrade to 4.17.21)              ║
║  └── axios@0.21.1 → SSRF vulnerability (upgrade to 0.21.4)                  ║
║                                                                              ║
║  SECRET DETECTION                                                            ║
║  ────────────────                                                            ║
║                                                                              ║
║  ✓ No secrets detected in codebase                                          ║
║                                                                              ║
║  Scanned:                                                                    ║
║  ├── 1,234 files                                                            ║
║  ├── Patterns: AWS, GCP, Azure, GitHub, Stripe, etc.                        ║
║  └── Excluded: .env*, node_modules/, .git/                                  ║
║                                                                              ║
║  OWASP TOP 10 ANALYSIS                                                       ║
║  ─────────────────────                                                       ║
║                                                                              ║
║  ┌─────────────────────────────────────┬────────┬───────────────────────────┐║
║  │ Category                            │ Status │ Details                   │║
║  ├─────────────────────────────────────┼────────┼───────────────────────────┤║
║  │ A01: Broken Access Control          │ ✓ Pass │ RLS enabled on all tables │║
║  │ A02: Cryptographic Failures         │ ✓ Pass │ bcrypt for passwords      │║
║  │ A03: Injection                      │ ✓ Pass │ Parameterized queries     │║
║  │ A04: Insecure Design                │ ✓ Pass │ Input validation present  │║
║  │ A05: Security Misconfiguration      │ ⚠ Warn │ Missing CSP header        │║
║  │ A06: Vulnerable Components          │ ⚠ Warn │ 2 moderate vulns          │║
║  │ A07: Auth Failures                  │ ✓ Pass │ Rate limiting enabled     │║
║  │ A08: Data Integrity Failures        │ ✓ Pass │ Signed cookies            │║
║  │ A09: Logging Failures               │ ✓ Pass │ Audit logging enabled     │║
║  │ A10: SSRF                           │ ✓ Pass │ URL validation present    │║
║  └─────────────────────────────────────┴────────┴───────────────────────────┘║
║                                                                              ║
║  CODE PATTERNS                                                               ║
║  ─────────────                                                               ║
║                                                                              ║
║  ⚠ 1 potential issue found:                                                 ║
║                                                                              ║
║  ┌────────────────────────────┬────────────────────────────────────────────┐ ║
║  │ File                       │ Issue                                      │ ║
║  ├────────────────────────────┼────────────────────────────────────────────┤ ║
║  │ src/utils/render.tsx:45    │ dangerouslySetInnerHTML (sanitize input)   │ ║
║  └────────────────────────────┴────────────────────────────────────────────┘ ║
║                                                                              ║
║  HTTP SECURITY HEADERS                                                       ║
║  ─────────────────────                                                       ║
║                                                                              ║
║  ┌────────────────────────────────────┬────────┬───────────────────────────┐ ║
║  │ Header                             │ Status │ Value                     │ ║
║  ├────────────────────────────────────┼────────┼───────────────────────────┤ ║
║  │ Strict-Transport-Security          │ ✓ Set  │ max-age=31536000          │ ║
║  │ X-Content-Type-Options             │ ✓ Set  │ nosniff                   │ ║
║  │ X-Frame-Options                    │ ✓ Set  │ DENY                      │ ║
║  │ Content-Security-Policy            │ ✗ Miss │ Not configured            │ ║
║  │ X-XSS-Protection                   │ ✓ Set  │ 1; mode=block             │ ║
║  │ Referrer-Policy                    │ ✓ Set  │ strict-origin             │ ║
║  └────────────────────────────────────┴────────┴───────────────────────────┘ ║
║                                                                              ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  SECURITY SCORE: 85/100                                                      ║
║  STATUS: ⚠ REVIEW REQUIRED                                                   ║
║                                                                              ║
║  CRITICAL ACTIONS:                                                           ║
║  1. Add Content-Security-Policy header                                       ║
║  2. Upgrade lodash and axios dependencies                                    ║
║  3. Review dangerouslySetInnerHTML usage                                     ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

---

## Auto-Fix (`/security --fix`)

```bash
/security --fix deps      # npm audit fix
/security --fix headers   # Add security headers config
/security --fix all       # Fix everything auto-fixable
```

### Dependency Fix
```bash
npm audit fix
npm audit fix --force  # If needed (may have breaking changes)
```

### Headers Fix (Next.js)
```typescript
// next.config.js - automatically added
const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline';"
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY'
  },
  // ... other headers
];
```

---

## Severity Levels

| Level | Description | Action Required |
|-------|-------------|-----------------|
| Critical | Active exploit, data breach risk | Block deployment |
| High | Serious vulnerability | Fix before merge |
| Moderate | Potential risk | Fix within sprint |
| Low | Minor issue | Track for future |
| Info | Best practice | Optional |

---

## Integration

```bash
# Part of /harden
/harden security

# Standalone
/security

# CI mode (fails on critical/high)
/security --ci

# Specific focus
/security deps
/security owasp
```

---

## Research Validation

This command is backed by industry standards and best practices:

### Security Standards
| Source | Type | URL |
|--------|------|-----|
| OWASP Top 10 2025 | Industry Standard | https://owasp.org/Top10/2025/0x00_2025-Introduction/ |
| OWASP WSTG v5.0 | Testing Guide | https://owasp.org/www-project-web-security-testing-guide/ |
| OWASP ASVS 5.0 | Verification Standard | https://owasp.org/www-project-application-security-verification-standard/ |
| npm audit | Official Documentation | https://docs.npmjs.com/auditing-package-dependencies-for-security-vulnerabilities/ |
| Semgrep | Tool Documentation | https://github.com/semgrep/semgrep |
| Gitleaks | Secrets Detection | https://github.com/gitleaks/gitleaks |

### OWASP Top 10 2025 Categories
1. **A01:2025** - Broken Access Control (3.73% of applications)
2. **A02:2025** - Security Misconfiguration (moved from #5)
3. **A03:2025** - Software Supply Chain Failures (expanded)
4. **A04:2025** - Cryptographic Failures (moved from #2)
5. **A05:2025** - Injection (XSS, SQLi)
6. **A10:2025** - Mishandling of Exceptional Conditions (NEW)

### Key Insights Applied
- Semgrep scans thousands of lines per second, CI/CD-friendly
- Gitleaks prevents hardcoded API keys using customizable regex patterns
- npm audit reports vulnerabilities with severity levels (critical, high, moderate, low)
- Combined tools (SAST + SCA + secrets) provide comprehensive coverage

---

## Related Commands

| Command | Focus |
|---------|-------|
| `/harden` | Full hardening (includes security) |
| `/keys` | Credential validation |
| `/gate-2` | Build verification (includes basic security) |

