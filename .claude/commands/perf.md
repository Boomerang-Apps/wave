# /perf - Performance Analysis

**Tier:** 2 (Workflow Command)
**Priority:** P1 (HIGH)
**Recommended Model:** Sonnet
**Aliases:** /performance, /lighthouse, /bundle

## Purpose

Focused performance analysis including bundle size, Lighthouse scores, Core Web Vitals, and optimization recommendations.

## Usage

```bash
/perf                      # Full performance analysis
/perf bundle               # Bundle size analysis only
/perf lighthouse           # Lighthouse CI only
/perf vitals               # Core Web Vitals only
/perf images               # Image optimization check
/perf --fix                # Auto-optimize images
```

---

## What It Checks

| Check | Tool | Threshold |
|-------|------|-----------|
| Bundle size (gzipped) | `@next/bundle-analyzer` | <300KB |
| Lighthouse Performance | `lighthouse-ci` | >90 |
| Lighthouse SEO | `lighthouse-ci` | >90 |
| Lighthouse Best Practices | `lighthouse-ci` | >90 |
| LCP (Largest Contentful Paint) | Lighthouse | <2.5s |
| FID (First Input Delay) | Lighthouse | <100ms |
| CLS (Cumulative Layout Shift) | Lighthouse | <0.1 |
| TTFB (Time to First Byte) | Lighthouse | <600ms |
| Image optimization | Custom | All optimized |
| Code splitting | Webpack | Proper chunking |
| Tree shaking | Bundle analysis | No dead code |

---

## Commands Run

```bash
# Bundle analysis
ANALYZE=true pnpm build

# Lighthouse CI
npx lhci autorun --collect.url=http://localhost:3000 --collect.numberOfRuns=3

# Core Web Vitals
npx web-vitals-reporter

# Image check
find public -type f \( -name "*.png" -o -name "*.jpg" -o -name "*.jpeg" \) -size +100k
```

---

## Output

```
╔══════════════════════════════════════════════════════════════════════════════╗
║  PERFORMANCE ANALYSIS                                               /perf    ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  BUNDLE SIZE                                                   Budget: 300KB ║
║  ───────────                                                                 ║
║                                                                              ║
║  Total: 245KB gzipped                                        ✓ UNDER BUDGET  ║
║                                                                              ║
║  ┌─────────────────────────────────────────────────────────────────────────┐ ║
║  │ Framework    ████████████████████                         142KB (58%)   │ ║
║  │ UI           ██████                                        45KB (18%)   │ ║
║  │ Features     ████████                                      67KB (27%)   │ ║
║  │ Third-party  ████                                          33KB (13%)   │ ║
║  └─────────────────────────────────────────────────────────────────────────┘ ║
║                                                                              ║
║  Top 5 Largest Modules:                                                      ║
║  ├── react-dom: 42KB                                                         ║
║  ├── next/router: 28KB                                                       ║
║  ├── @radix-ui/react-dialog: 12KB                                            ║
║  ├── date-fns: 11KB                                                          ║
║  └── zod: 9KB                                                                ║
║                                                                              ║
║  LIGHTHOUSE SCORES                                                           ║
║  ─────────────────                                                           ║
║                                                                              ║
║  Performance:      92  ████████████████████░░░░ ✓                            ║
║  Accessibility:    98  ████████████████████████ ✓                            ║
║  Best Practices:   95  ███████████████████░░░░░ ✓                            ║
║  SEO:              100 █████████████████████████ ✓                           ║
║                                                                              ║
║  CORE WEB VITALS                                                             ║
║  ───────────────                                                             ║
║                                                                              ║
║  LCP  │ 2.1s  │ ████████████████░░░░ │ ✓ Good (<2.5s)                        ║
║  FID  │ 35ms  │ ███░░░░░░░░░░░░░░░░░ │ ✓ Good (<100ms)                       ║
║  CLS  │ 0.04  │ ████░░░░░░░░░░░░░░░░ │ ✓ Good (<0.1)                         ║
║  TTFB │ 180ms │ ████░░░░░░░░░░░░░░░░ │ ✓ Good (<600ms)                       ║
║  FCP  │ 1.1s  │ ██████████░░░░░░░░░░ │ ✓ Good (<1.8s)                        ║
║                                                                              ║
║  IMAGE OPTIMIZATION                                                          ║
║  ──────────────────                                                          ║
║                                                                              ║
║  ⚠ 3 images need optimization:                                               ║
║                                                                              ║
║  ┌────────────────────────┬──────────┬──────────┬─────────────────────────┐  ║
║  │ File                   │ Current  │ Target   │ Action                  │  ║
║  ├────────────────────────┼──────────┼──────────┼─────────────────────────┤  ║
║  │ public/hero.png        │ 1.2MB    │ <200KB   │ Convert to WebP         │  ║
║  │ public/about.jpg       │ 800KB    │ <150KB   │ Compress + resize       │  ║
║  │ public/team.png        │ 600KB    │ <100KB   │ Use next/image          │  ║
║  └────────────────────────┴──────────┴──────────┴─────────────────────────┘  ║
║                                                                              ║
║  CODE SPLITTING                                                              ║
║  ──────────────                                                              ║
║  ✓ Dynamic imports: 12 lazy-loaded routes                                    ║
║  ✓ Vendor chunk: separated                                                   ║
║  ✓ CSS splitting: enabled                                                    ║
║  ✓ Tree shaking: working                                                     ║
║                                                                              ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  PERFORMANCE SCORE: 92/100                                                   ║
║  STATUS: ✓ PASS                                                              ║
║                                                                              ║
║  RECOMMENDATIONS:                                                            ║
║  1. Optimize 3 images: /perf --fix images                                    ║
║  2. Consider lazy loading date-fns (11KB)                                    ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

---

## Auto-Fix (`/perf --fix`)

```bash
/perf --fix images    # Optimize all images
/perf --fix bundle    # Suggest bundle optimizations
```

### Image Optimization
```bash
# Converts to WebP, resizes, compresses
npx sharp-cli public/hero.png -o public/hero.webp --webp
npx sharp-cli public/about.jpg -o public/about.webp --resize 1200 --webp
```

---

## Integration

```bash
# Part of /harden
/harden performance

# Standalone
/perf

# CI mode
/perf --ci --threshold 85
```

---

## Research Validation

This command is backed by industry standards and best practices:

### Performance Standards
| Source | Type | URL |
|--------|------|-----|
| Core Web Vitals | Google Official | https://developers.google.com/search/docs/appearance/core-web-vitals |
| Lighthouse Documentation | Google Official | https://developers.google.com/speed/docs/insights/v5/about |
| PageSpeed Insights | Google Official | https://pagespeed.web.dev/ |
| Web Vitals | Google Official | https://web.dev/vitals/ |

### Core Web Vitals Thresholds (2025)
| Metric | Good | Needs Improvement | Poor |
|--------|------|-------------------|------|
| LCP | <2.5s | 2.5s - 4.0s | >4.0s |
| INP | <200ms | 200ms - 500ms | >500ms |
| CLS | <0.1 | 0.1 - 0.25 | >0.25 |

### Key Changes for 2025-2026
- **INP replaced FID** (March 2024) - measures all interactions, not just first
- **Stricter thresholds coming** (Q4 2025) - prepare for tighter requirements
- **75th percentile measurement** - 75% of page loads must meet thresholds

### Lighthouse Scoring
| Score Range | Rating |
|-------------|--------|
| 90-100 | Good (green) |
| 50-89 | Needs Improvement (orange) |
| 0-49 | Poor (red) |

### Key Insights Applied
- Lighthouse uses lab data (simulated 3G, Moto G4)
- Core Web Vitals uses real user data (CrUX)
- Bundle size directly impacts LCP
- Image optimization is often the biggest win

---

## Related Commands

| Command | Focus |
|---------|-------|
| `/harden` | Full hardening (includes perf) |
| `/build` | Build validation |
| `/lighthouse` | Alias for `/perf lighthouse` |
