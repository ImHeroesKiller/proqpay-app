# ProQPay UX / Architecture Audit (Baseline)

**Date:** 2026-07-20  
**Branch base:** `main` @ `c098985`  
**Production:** https://proqpay.msg-os.com  
**Scope:** Pre-implementation audit before enterprise revamp

---

## 1. Application structure found

```
app/
  (app)/          # Authenticated routes + AppShell layout
  api/            # Auth, payroll actions, payment confirmation, reports
  login/
  layout.tsx      # Root: Inter font, Providers
components/
  layout/         # AppShell, Sidebar, Topbar (basic)
  shared/         # DataTable, PageHeader, KpiCard, StatusBadge, EmptyState
  ui/             # Button, Card, Input, Label, Badge, Separator only
  {domain}/       # Feature tables/actions
config/navigation.ts
lib/
  auth/           # permissions, session, scope
  data/           # Prisma queries, mappers, seed
  domain/         # workflow + confirmation engine
  payroll/        # BPJS/PPh21 engine + server actions
prisma/schema.prisma
```

**Stack:** Next.js 15 App Router, React 19, Auth.js (JWT 8h), Prisma + Supabase PG, Tailwind v4, TanStack Table/Query, Recharts, Framer Motion (installed, unused), Lucide, Radix primitives (partially wired).

---

## 2. What works well (preserve)

- Clear product positioning as Enterprise Payroll OS (not generic HRIS).
- Role-based module access (`lib/auth/permissions.ts`) + server `requireModule`.
- Canonical payment flow: Partner → Client bank → Employees (never partner → employee).
- Confirmation Engine + workflow builders already domain-accurate.
- Payroll recalculate / submit / approve / generate instruction server actions.
- Demo multi-role accounts for QA.
- Scoped data access via `companyWhere` for multi-tenant safety basics.

---

## 3. Root causes of UI/UX issues

| Area | Finding | Impact |
|------|---------|--------|
| **Navigation IA** | Flat list + weak sectioning (`operations` / `internal` only) | Hard to scan for enterprise operators |
| **Shell** | Sidebar fixed 256px, no collapse, no tooltips, no preference | Poor laptop density; mobile drawer is basic overlay |
| **Topbar** | No breadcrumb, page title, search, notifications, help, org context | Weak orientation & discoverability |
| **Design system** | Incomplete UI kit (no dialog/dropdown/tooltip/sheet/skeleton wrappers) | Inconsistent patterns, duplicated ad-hoc markup |
| **Data tables** | Minimal: global search + sort + pagination only | Missing density, column visibility, bulk actions, sticky header polish |
| **Status tokens** | Large map inside `status-badge.tsx` only | Drift risk; hard to reuse in filters/charts |
| **Dashboard** | Partially role-aware KPIs but one layout for all roles | Executive vs operator needs not differentiated enough |
| **Guidance** | No onboarding, tour, help center, command palette | Steep learning curve for payroll workflow |
| **Motion** | Framer Motion unused; no reduced-motion policy | Missed polish + potential a11y gap when added poorly |
| **Page chrome** | Headers exist but no breadcrumb, inconsistent empty/error/loading | Uneven enterprise feel |
| **A11y** | Some focus rings; missing skip link, dialog traps not centralized, charts lack text alternatives | WCAG AA gaps |
| **Performance** | All app routes `force-dynamic`; charts always client-loaded; no security headers in `next.config` | LCP/TTFB room; BP/CSP missing |
| **Security UX** | Demo password shown on login page in UI | Acceptable for demo env; must not leak in public reports |

---

## 4. Dead code / duplication / hardcoding

- `appNavigation` marked deprecated but still exported.
- Table components per domain wrap thin `DataTable` with similar column patterns.
- Status labels/colors only in one badge map (good start; needs shared config module).
- Login pre-fills demo password (demo convenience; production risk if left on public marketing).
- Framer Motion dependency present but zero imports.

---

## 5. Security baseline notes (pre-change)

- Protected routes via Auth.js middleware `authorized` callback.
- Module gates on pages via `requireModule`.
- API routes need continued server-side role checks (existing pattern).
- No CSP / frame-ancestors / referrer-policy headers in Next config.
- Session maxAge 8 hours — appropriate for payroll ops.

**Constraint:** Do not change auth contract, API contracts, or business workflow rules during UI revamp.

---

## 6. Performance baseline (qualitative)

- Authenticated pages use `export const dynamic = "force-dynamic"` → no static shell caching.
- Recharts + full client tables loaded per page.
- Inter only (good); can add Manrope headings if weight budget allows.
- Lighthouse quantitative before/after will be captured in `docs/LIGHTHOUSE_BASELINE.md`.

---

## 7. Revamp priorities (ordered)

1. Application shell (grouped nav, collapse, topbar, mobile drawer).
2. Design tokens + shared status config + UI primitives.
3. Enterprise DataTable standard.
4. Role-based dashboard command center.
5. Command palette + Help + onboarding tours.
6. Page hierarchy consistency across all routes.
7. Workflow visualization clarity (no rule changes).
8. A11y, reduced motion, security headers.
9. Docs, tests, Lighthouse, PR/preview.

---

## 8. Non-goals for this revamp

- Database schema redesign.
- New payment rails or partner→employee disbursement.
- Fake notifications / dummy statistics.
- Replacing Auth.js or Prisma contracts.
- Full Playwright suite covering every edge case (core paths only if time-bound).
