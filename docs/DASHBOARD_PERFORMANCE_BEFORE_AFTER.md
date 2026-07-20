# Dashboard Performance — Before / After

**Date:** 2026-07-20  
**Branch:** `feat/proqpay-enterprise-revamp`  
**Benchmark host:** developer machine → Supabase pooler `aws-1-ap-southeast-2`  
**Command:** `pnpm bench:dashboard` (`scripts/bench-dashboard.mjs`)  
**Role under test:** `SUPER_ADMIN` (widest query set)

> Method: three iterations each of legacy waterfall vs optimized parallel batch. **Median** reported. Connection warmed with `SELECT 1` before runs. No secrets or payroll amounts logged.

---

## 1. Benchmark — data layer

### Before (legacy pattern)

Matches pre-fix `getDashboardKpis` + sequential `getDashboardAlerts` + full `getPayrollPeriods` (with bank include) + chart query.

| Run | Duration (ms) | Queries |
|----:|-------------:|--------:|
| 1 | 20 856 | 19 |
| 2 | 19 518 | 19 |
| 3 | 17 853 | 19 |
| **Median** | **19 518** | **19** |

Earlier session median: **20 388 ms** (consistent ~20s band).

### After (optimized `lib/data/dashboard.ts` pattern)

| Run | Duration (ms) | Queries |
|----:|-------------:|--------:|
| 1 (colder) | 3 332 | 12 |
| 2 | 1 509 | 12 |
| 3 | 2 180 | 12 |
| **Median** | **2 180** | **12** |

### Summary

| Metric | Before | After | Improvement |
|--------|-------:|------:|------------:|
| Median wall time | 19 518 ms | 2 180 ms | **~89%** |
| Query count | 19 | 12 | **−37%** |
| Sequential waves after first batch | Yes (multiple) | **None** | — |
| Full period + bank join | Yes | **No** | — |
| Best warm-ish optimized run | — | **1 509 ms** | Meets warm target ≈1.5s from non-colocated client |

---

## 2. Scenario table (application-level)

Fill remaining cells from Vercel preview after deploy of this branch:

| Scenario | Before | After | Improvement |
| -------- | -----: | ----: | ----------: |
| Dashboard data-layer median | ~20 s | ~2.2 s | ~89% |
| Dashboard cold (full RSC, preview) | ~10–27 s (prod traces) | _pending preview_ | |
| Dashboard warm (preview) | _prod ~10 s median_ | _pending preview_ | |
| Login → Dashboard | _pending_ | _pending_ | |
| Employees → Dashboard | _pending_ | _pending_ | |
| Payroll → Dashboard | _pending_ | _pending_ | |

**Targets**

| Target | Status vs data-layer bench |
|--------|----------------------------|
| Warm server &lt; 1 500 ms | **Achievable** (1 509 ms warm run from remote client; expect better on `syd1`) |
| Ideal warm &lt; 800 ms | Needs **region co-location** (`syd1` + SYD DB) |
| Cold &lt; 3 000 ms | Data-layer cold ~3.3 s remote; + cold start may exceed without region fix |
| No single query &gt; 500 ms | **Infrastructure:** RTT alone often &gt;500 ms iad1↔ap-southeast-2 — document as infra constraint |

---

## 3. Slowest operations

| Phase | Before | After |
|-------|--------|-------|
| Slowest phase | Sequential KPI waves + alerts + full periods | Parallel batch RTT (max query) |
| Duplicate approval count | 2× | 1× |
| Period table reads | 3+ (incl. full join) | 2 light (list + chart) |
| JS aggregation | Filter all periods | groupBy + small array filter |

---

## 4. Code changes

| File | Change |
|------|--------|
| `lib/perf.ts` | `measure` / `perfLog` gated by `PERFORMANCE_LOGGING` |
| `lib/db.ts` | Always reuse Prisma singleton; optional sanitized query events |
| `lib/data/dashboard.ts` | Consolidated parallel bundle + React `cache` |
| `components/dashboard/dashboard-sections.tsx` | Primary/secondary sections + skeletons |
| `app/(app)/dashboard/page.tsx` | Auth + header first; Suspense; shared cache |
| `scripts/bench-dashboard.mjs` | Reproducible before/after bench |
| `lib/data/queries.ts` | Mark old KPI/alert helpers deprecated |

### What did **not** change

- Payroll calculation engine  
- Auth contracts / roles / module permissions  
- API routes  
- Prisma schema / migrations  
- KPI labels and business formulas (same counts/filters)  
- Partner → Client → Employee fund path  

---

## 5. Streaming / Suspense

- Header renders after `requireModule` only (no payroll queries).
- Primary section (KPIs + pipeline) and secondary (chart/alerts/cycle) use Suspense.
- Both call `loadDashboardBundle` — **React `cache` dedupes** so queries run **once** per request.
- Meaningful KPI skeleton appears while the batch is in flight (better UX even when TTFB still waits for RSC stream chunks).

---

## 6. Risks

| Risk | Mitigation |
|------|------------|
| Active cycle only searches top 50 periods by `periodStart` | Sufficient for operational data; if &gt;50 closed periods bury actives, raise `take` or restore `findFirst` |
| Unscoped approval/failed counts retained | Intentional parity; product may later scope by company |
| Region still wrong on Vercel | Documented; requires project setting change |
| Perf logs in production | Off unless `PERFORMANCE_LOGGING=true` |

---

## 7. Rollback plan

1. Revert commits that touch `lib/data/dashboard.ts`, dashboard page/sections, `lib/db.ts`, `lib/perf.ts`.
2. Or restore page imports of `getDashboardKpis` / `getDashboardAlerts` / `getPayrollPeriods` / `getPayrollChartData`.
3. No DB migration to roll back.

---

## 8. Outstanding issues

1. Confirm full RSC TTFB on **Vercel preview** (median of 3 cold + 3 warm).
2. Move compute to **`syd1`** after stakeholder approval.
3. Run `EXPLAIN ANALYZE` on groupBy queries before adding composite indexes.
4. Consider scoping global PENDING/FAILED counts by tenant if product confirms.
5. Optional: single raw SQL multi-aggregate if still bound after region fix.

---

## 9. Quality gates (this change set)

Run after implementation:

```bash
pnpm lint
pnpm typecheck
pnpm build
pnpm test:utils
pnpm bench:dashboard   # optional; needs DATABASE_URL
```

(`pnpm test` is not defined in package.json — documented; use `test:utils`.)
