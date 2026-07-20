# Lighthouse Baseline & Performance Notes

**Date:** 2026-07-20  
**Branch:** `feat/proqpay-enterprise-revamp`  
**Production URL:** https://proqpay.msg-os.com  
**Method note:** Full authenticated Lighthouse CI against production requires live credentials and is environment-dependent. Below captures structural baseline + production-oriented targets, plus post-revamp improvements measurable from the production build output.

---

## 1. How to re-run audits

```bash
# Production build first
pnpm build && pnpm start

# Chrome Lighthouse CLI example (install lighthouse globally if needed)
# npx lighthouse http://localhost:3001/login --view --preset=desktop
# npx lighthouse http://localhost:3001/login --view --form-factor=mobile

# For authenticated routes, use a persistent Chrome profile after manual login,
# or Lighthouse user-flow scripts with storageState.
```

Recommended: run each page **≥3 times**, take the **median**.

### Pages to audit

| Route | Auth |
|-------|------|
| `/login` | Public |
| `/dashboard` | Yes |
| `/employees` | Yes |
| `/payroll` | Yes |
| `/approval` | Yes |
| `/payment-instructions` | Yes |
| `/payment-confirmation` | Yes |
| `/working-capital` | Yes |
| `/reports` | Yes |

### Targets

| Category | Target |
|----------|--------|
| Performance | ≥ 90 |
| Accessibility | ≥ 95 |
| Best Practices | ≥ 95 |
| SEO (login/public) | ≥ 90 |
| LCP | < 2.5s |
| CLS | < 0.1 |
| INP | < 200ms |

---

## 2. Before (baseline qualitative — pre-revamp `main`)

| Area | Observation |
|------|-------------|
| Shell JS | Sidebar always expanded; no collapse preference |
| Motion | Framer Motion installed but unused (dead weight if tree-shaken poorly) |
| Charts | Recharts client-only; no empty/a11y alternatives |
| Security headers | None in `next.config` |
| Fonts | Inter only |
| Tables | Client tables without sticky header polish / column controls |
| Routes | All `force-dynamic` (expected for scoped payroll data) |

### Production build first-load (shared)

From pre-revamp architecture (approximate, Next 15):

- Shared First Load JS ≈ **100–110 kB**
- Dashboard higher due to Recharts (~250 kB range)

---

## 3. After (this revamp — measured production build)

**Command:** `pnpm build` (2026-07-20) — **success**

| Route | Size | First Load JS |
|-------|------|---------------|
| `/login` | 4.37 kB | 119 kB |
| `/dashboard` | 2.4 kB | 265 kB |
| `/employees` | 1.77 kB | 163 kB |
| `/payroll` | 1.83 kB | 163 kB |
| `/approval` | 3.46 kB | 115 kB |
| `/payment-instructions` | 834 B | 107 kB |
| `/payment-confirmation` | 834 B | 107 kB |
| `/working-capital` | 2.65 kB | 204 kB |
| `/reports` | 7.95 kB | 228 kB |
| Shared | — | 103 kB |
| Middleware | — | 86.7 kB |

### Interpretation

- List/instruction pages stay lean (~107–163 kB FL).
- Dashboard/reports carry Recharts cost (expected); charts now have empty states + sr-only summaries for a11y.
- Shell features (command palette, tour, help) are client-side in AppShell — amortized across authenticated routes.

---

## 4. Performance work completed

- Reduced-motion CSS global policy
- Lighter card chrome (no heavy shadows)
- Sticky table headers with backdrop blur only where needed
- Manrope + Inter with `display: swap`
- Skip-to-content link
- Security headers (frame deny, nosniff, referrer policy, permissions-policy)
- Login open-redirect hardening (`callbackUrl` must start with `/`)
- Chart empty states avoid layout thrash on zero data

---

## 5. Remaining opportunities (next phase)

1. Dynamic-import Recharts only when chart section mounts.
2. Split AppShell overlays (tour/help/command) with `next/dynamic`.
3. Consider partial streaming/Suspense around KPI grids.
4. Authenticated Lighthouse user flows in CI.
5. Image/icon sprite audit if brand assets expand.

---

## 6. Median Lighthouse scores (to fill after CI run)

| Page | Mode | Perf | A11y | BP | SEO | Notes |
|------|------|------|------|----|-----|-------|
| `/login` | Desktop | _pending_ | _pending_ | _pending_ | _pending_ | Run 3× median |
| `/login` | Mobile | _pending_ | _pending_ | _pending_ | _pending_ | |
| `/dashboard` | Desktop | _pending_ | _pending_ | _pending_ | n/a | Auth required |
| `/dashboard` | Mobile | _pending_ | _pending_ | _pending_ | n/a | Auth required |

> Fill table after local/preview authenticated runs. Bundle table above is the reproducible CI-friendly baseline.
