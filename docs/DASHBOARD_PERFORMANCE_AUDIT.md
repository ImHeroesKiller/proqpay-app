# Dashboard Performance Audit

**Date:** 2026-07-20  
**Branch:** `feat/proqpay-enterprise-revamp`  
**Route:** `/dashboard`  
**DB host (from `DATABASE_URL`):** `aws-1-ap-southeast-2.pooler.supabase.com` (Supabase pooler **ap-southeast-2 / Sydney**, port **6543**)

---

## 1. Executive summary

Dashboard server runtime of **~10–27s** (production traces) is explained primarily by:

1. **Many database round-trips with sequential waves** in KPI + alerts loaders (≈19 logical queries for SUPER_ADMIN).
2. **Cross-region latency:** Vercel compute reported as **`iad1` (US East)** while PostgreSQL is **`ap-southeast-2` (Sydney)**. Each sequential query pays full RTT.
3. **Over-fetch:** `getPayrollPeriods()` loaded **all periods with `include: sourceBankAccount`** solely to compute pipeline counts and pick the active cycle.

A consolidated parallel data layer (`lib/data/dashboard.ts`) reduces wall-clock data load by **~89%** in local benchmarks against the same database (median **20.4s → 2.2s**). Remaining time is dominated by region RTT, not application CPU.

---

## 2. Root cause

| Rank | Cause | Evidence |
|------|--------|----------|
| 1 | Sequential query waves after initial `Promise.all` in `getDashboardKpis` + fully sequential `getDashboardAlerts` | Code inspection; legacy bench ~20s with 19 queries |
| 2 | Cross-region DB RTT (iad1 → ap-southeast-2) | Host string + Vercel region logs |
| 3 | Duplicate period reads (`getDashboardKpis` take 6 + full `getPayrollPeriods` + chart take 6) | Page + queries.ts |
| 4 | Heavy `findMany` + bank join for counts that only need `groupBy` | `getPayrollPeriods` include |
| 5 | Not N+1 loops over clients/employees | No loop-query pattern found |

**Not the primary cause:** middleware, `/api/auth/session`, bcrypt (login only), chart client JS, or missing indexes alone (tables are small; latency is network-bound).

---

## 3. Dependency map (before)

```text
Dashboard page
├── requireModule → auth() [JWT, no DB]
├── Promise.all
│   ├── getDashboardKpis
│   │   ├── Wave A (parallel ×7): employee.count, periods.findMany×6,
│   │   │   approval.count, period.count transfer, conf.count×3
│   │   ├── Wave B (sequential): employee.count probation
│   │   └── Wave C (sequential if executive): closed.count,
│   │       pendingConf.count, WC settlement, WC aggregate, sales aggregate
│   ├── getDashboardAlerts (sequential ×4)
│   │   ├── approval.count PENDING  ← DUPLICATE of KPI
│   │   ├── period.findFirst WAITING
│   │   ├── paymentInstruction.count
│   │   └── paymentInstructionItem.count FAILED
│   ├── getPayrollPeriods → findMany ALL + include sourceBankAccount
│   └── getPayrollChartData → findMany take 6
└── JS filters for pipeline counts + active period
```

**Query count (SUPER_ADMIN / DIRECTOR):** ≈ **19** DB operations  
**Query count (PAYROLL_ADMIN):** ≈ **14** (no WC/sales/exec extras, still sequential waves)

---

## 4. Dependency map (after)

```text
Dashboard page
├── requireModule → auth() [JWT]
├── PageHeader (immediate)
├── Suspense → DashboardPrimarySection
│   └── loadDashboardBundle (React.cache, once per request)
│       └── single Promise.all batch (8–12 queries)
└── Suspense → DashboardSecondarySection
    └── loadDashboardBundle (same cached promise — no re-query)
```

### Parallel batch inventory

| # | Query | Purpose |
|---|--------|---------|
| 1 | `employee.groupBy(status)` | Active + probation headcount |
| 2 | `payrollPeriod.groupBy(status)` | Pipeline + closed + pending confirmation counts |
| 3 | `payrollPeriod.findMany` take 50, **select** light fields | Current KPI period, active cycle, waiting alert |
| 4 | `paymentConfirmation.groupBy(status)` | Waiting verification + rejected |
| 5 | `paymentConfirmation.count` verified today | Verified today KPI |
| 6 | `approvalStep.count` PENDING | Approvals / alert |
| 7 | `paymentInstruction.count` DRAFT/READY | Alert |
| 8 | `paymentInstructionItem.count` FAILED | Alert |
| 9–10 | WC count + aggregate (role-gated) | Funding exposure |
| 11 | Sales aggregate (role-gated) | Weighted pipeline |
| 12 | `payrollPeriod.findMany` chart take 6 select | Chart |

---

## 5. Query inventory / slow queries

### Before (local bench vs ap-southeast-2 pooler)

| Metric | Value |
|--------|------:|
| Logical queries | 19 |
| Median wall time | **20 388 ms** |
| Runs | 20 608 / 20 388 / 19 923 ms |
| Pattern | Multi-wave sequential + full period join |

### After

| Metric | Value |
|--------|------:|
| Logical queries | **12** (exec) / **9** (ops-only) |
| Median wall time | **2 180 ms** |
| Runs | 3 332 / 1 509 / 2 180 ms |
| Pattern | One parallel batch + light select + groupBy |

Slowest operation remains **DB RTT** for the whole batch (~max of parallel queries), not JS transform (&lt;5 ms).

---

## 6. N+1 findings

**No classic N+1** (loop of per-row `findMany`) on Dashboard.

**Related anti-patterns found and fixed:**

- Sequential post-`Promise.all` waves (pseudo waterfall).
- Duplicate identical `approvalStep.count(PENDING)`.
- Loading full relational graphs for aggregations.

---

## 7. Index findings

Existing (relevant):

- `PayrollPeriod`: `companyId`, `status` (separate)
- `PaymentConfirmation`: `companyId`, `status`
- `ApprovalStep`: `payrollPeriodId` only
- `PaymentInstruction`: `companyId`, `executionStatus`

### Recommended (no migration applied — await EXPLAIN on preview)

| Index | Why |
|-------|-----|
| `payroll_periods (company_id, status)` | Composite for scoped groupBy/count |
| `payment_confirmations (company_id, status)` | Scoped groupBy |
| `payment_confirmations (company_id, status, verified_at)` | Verified-today filter |
| `approval_steps (status)` | Global PENDING count |
| `payment_instruction_items (status)` | FAILED count |

**Risk of adding indexes now:** write overhead on high-churn tables; unproven benefit until EXPLAIN shows seq scans under real volume. Tables are currently small — **network dominates**.

**Rollback:** drop index migration if write latency rises.

---

## 8. Runtime findings

| Scenario | Before (legacy loader) | After (bundle) |
|----------|----------------------:|---------------:|
| Data-layer median (local → SYD DB) | 20 388 ms | 2 180 ms |
| Improvement | — | **~89%** |
| Warm-ish optimized run | — | **1 509 ms** |
| JS transform | negligible | negligible |

Production page TTFB will also include Next RSC serialization + cold start; data-layer was the dominant cost.

---

## 9. Region findings

| Layer | Location |
|-------|----------|
| Vercel edge (user report) | Singapore |
| Vercel compute (user report) | **iad1** (US East) |
| Supabase / Prisma host | **aws-1-ap-southeast-2** (Sydney) |

**Latency path:** SG edge → US compute → Sydney DB → US → client.

### Recommendation (do not apply blindly)

1. Set Vercel project region to **`syd1`** (Sydney) to co-locate with the database — **highest remaining ROI**.
2. Alternative: `sin1` is closer than `iad1` but still not co-located with `ap-southeast-2`.
3. Optionally export `preferredRegion = "syd1"` on authenticated routes after infra approval.
4. Do **not** move the database without a full DR plan.

---

## 10. Connection pooling findings

| Item | Status |
|------|--------|
| `DATABASE_URL` | Pooler port **6543** + `pgbouncer=true` ✓ |
| `DIRECT_URL` | Port 5432 for migrations ✓ |
| Prisma singleton | **Fixed** — always assign to `globalThis` (was production-only skip) |
| Query log | Opt-in via `PERFORMANCE_LOGGING=true` (sanitized preview, no param values) |

---

## 11. Security considerations

- Scope still uses `companyWhere` / role gates for executive KPIs.
- No shared Redis/unstable_cache of payroll KPI data.
- React `cache` is **per-request** only, keyed by `userId + role + companyId`.
- Perf logs do not include tokens, passwords, or payroll amounts.
- Unscoped counts (`approvalStep` PENDING, `paymentInstructionItem` FAILED, WC exposure aggregate status-only) **preserved** to keep KPI semantics identical to pre-change behavior.

---

## 12. Prioritized recommendations

| Priority | Action | Expected impact |
|----------|--------|-----------------|
| P0 | Done: parallel consolidated queries | ~89% data-layer reduction |
| P0 | Done: remove full period+bank fetch | Less payload / less join time |
| P1 | Move Vercel region to `syd1` | Likely sub-800 ms warm data-layer |
| P2 | Add composite indexes after EXPLAIN | Helps as data grows |
| P3 | Scope approval/failed-item counts by company if product agrees | Security + smaller scans |
| P3 | Dynamic-import Recharts | Client JS only, not server TTFB |

---

## 13. How to re-profile

```bash
# Data-layer before/after against live DB
pnpm bench:dashboard

# Runtime logs in app
PERFORMANCE_LOGGING=true pnpm dev
# Load /dashboard → look for [PERF] lines
```
