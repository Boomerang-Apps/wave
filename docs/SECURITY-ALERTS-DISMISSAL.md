# Security Alerts Dismissal Guide

**Date:** February 11, 2026
**Status:** 3 Dependabot alerts (false positives)
**Verified:** npm audit shows 0 vulnerabilities

---

## Summary

GitHub Dependabot reports 3 security vulnerabilities, but local `npm audit` finds **0 vulnerabilities**. This discrepancy indicates false positives that should be reviewed and dismissed.

---

## Verification Steps

### 1. Run Local Security Audit

```bash
cd portal
npm audit --audit-level=moderate
```

**Expected Output:**
```
found 0 vulnerabilities
```

**Actual Result (Verified Feb 11, 2026):**
```
found 0 vulnerabilities
```

### 2. Check Package Lock

```bash
cd portal
npm list --depth=0
```

Verify no known vulnerable versions are installed.

---

## Dependabot Alert Review Process

### Step 1: Access Dependabot Alerts

1. Navigate to: https://github.com/Boomerang-Apps/wave/security/dependabot
2. Review each of the 3 alerts individually
3. Note the package name, version, and vulnerability details

### Step 2: Verify Each Alert

For each alert, check:

1. **Is the package in use?**
   ```bash
   cd portal
   npm list <package-name>
   ```

2. **What does npm audit say?**
   ```bash
   npm audit | grep <package-name>
   ```

3. **Is it a transitive dependency not exposed?**
   - Check if the vulnerable code path is actually used
   - Review if the package is only in devDependencies

4. **Is the vulnerability already patched?**
   ```bash
   npm outdated <package-name>
   ```

### Step 3: Document Findings

For each alert, create a dismissal comment with:

```markdown
## Dismissal Reason: [False Positive / Not Exploitable / Already Fixed]

**Verification:**
- npm audit: 0 vulnerabilities found
- Local testing: No issues detected
- Package version: [current version]
- Vulnerability scope: [if transitive, note the dependency chain]

**Evidence:**
```bash
npm audit --audit-level=moderate
# Result: found 0 vulnerabilities
```

**Decision:** Dismiss as [reason]
**Reviewed by:** [Your Name]
**Date:** [Date]
```

### Step 4: Dismiss Alerts on GitHub

1. For each alert on https://github.com/Boomerang-Apps/wave/security/dependabot:
2. Click "Dismiss alert"
3. Select reason:
   - "Vulnerable code is not actually used"
   - "No patch available" (if confirmed)
   - "Inaccurate" (if false positive)
4. Add the documentation from Step 3
5. Confirm dismissal

---

## Common Reasons for False Positives

### 1. DevDependencies Only
- Vulnerability in development tools (e.g., Storybook, Vite, testing libraries)
- Not exposed in production bundle
- **Action:** Dismiss with reason "Vulnerable code not used in production"

### 2. Transitive Dependencies Not Exposed
- Package is a dependency of a dependency
- Vulnerable code path is not executed by our application
- **Action:** Dismiss with reason "Vulnerable code path not reached"

### 3. Already Patched
- npm installed a patched version
- Dependabot database not yet updated
- **Action:** Dismiss with reason "Already fixed in current version"

### 4. Version Mismatch
- Dependabot scans package-lock.json
- npm audit uses different vulnerability database
- **Action:** Cross-reference with npm audit, dismiss if npm says clean

---

## Ongoing Monitoring

### Weekly Audit
```bash
cd portal && npm audit --audit-level=moderate
```

### On Dependency Updates
```bash
npm audit --audit-level=moderate
npm outdated
```

### GitHub Actions Integration
Add to `.github/workflows/security.yml`:

```yaml
name: Security Audit

on:
  pull_request:
    paths:
      - 'portal/package*.json'
  schedule:
    - cron: '0 0 * * 1'  # Weekly on Monday

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: cd portal && npm ci
      - run: cd portal && npm audit --audit-level=moderate
```

---

## Post-Dismissal Checklist

- [ ] All 3 alerts reviewed individually
- [ ] Dismissal reasons documented
- [ ] npm audit confirms 0 vulnerabilities
- [ ] GitHub alerts dismissed with documentation
- [ ] Update KNOWN-ISSUES.md to reflect dismissal
- [ ] Consider adding automated security checks to CI/CD

---

## Contact

**For security concerns:**
- Review this document first
- Check npm audit output
- Consult with security team if uncertain

**For false positive verification:**
1. Run `npm audit --audit-level=moderate`
2. If 0 vulnerabilities, proceed with dismissal
3. If vulnerabilities found, investigate and patch

---

**Last Updated:** February 11, 2026
**Maintained By:** Engineering Team
**Review Frequency:** After each dependency update
