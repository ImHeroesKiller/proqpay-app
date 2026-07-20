# Performance Audit V2 — Post–New Dataset

**Date:** 2026-07-20  
**Branch:** `feat/proqpay-enterprise-revamp`  
**Scope:** End-to-end app routes after realistic reseed (not Dashboard-only)  
**Dataset:** 1 existing client · 3 prospects · 54 employees · 5 payroll periods · pipeline Rp4.2B  

> Method: data-layer benchmarks against live Supabase pooler, code inventory of server routes, structured evidence for each change. No secrets logged. No reseed during audit.

---

## 1. Environment (what was actually tested)

| Item | Value |
|------|--------|
| Git branch | `feat/proqpay-enterprise-revamp` |
| Local DB host (from `DATABASE_URL` host only) | `aws-1-ap-southeast-2.pooler.supabase.com` |
| Supabase DB region | **ap-southeast-2 / Sydney** |
| Pooler | Port **6543**, `pgbouncer=true` (transaction pooler) |
| Direct URL | Port **5432** (migrations) |
| Prisma | Singleton `lib/db.ts` · Node runtime (not Edge) |
| Vercel compute (historical baseline) | **iad1** (US East) per prior production traces |
| Vercel compute (this change — Candidate B) | **`syd1`** via `vercel.json` `regions` + `preferredRegion` on `(app)` layout |
| Edge | User-proximate (e.g. Singapore for ID users); compute region is separate |
| Benchmark host | Developer machine → Sydney pooler (cross-region / WAN) |
| Cold vs warm | Explicit RTT warm-up `SELECT 1`; report **median** of ≥3 runs |
| Auth / secrets | Not printed; `PERFORMANCE_LOGGING` optional |

**Preview URL / deployment SHA:** not available in this local audit session — confirm on next Vercel preview after push (see remaining risks).

**Dataset integrity (spot counts, no PII):** employees **54**, payroll periods **5**, payroll lines **130**, OPEN sales **3**, companies **5**.

---

## 2. Baseline after reseed (before V2 code changes)

### Dashboard data-layer (`pnpm bench:dashboard`)

| Pattern | Queries | Median wall time | Runs (ms) |
|---------|--------:|-----------------:|-----------|
| Legacy waterfall | 19 | **18 010** | 19 740 / 18 010 / 17 031 |
| Optimized parallel batch | 12 | **1 639** | 2 945 / 1 639 / 1 585 |
| Improvement | −37% queries | **~91%** | — |

### Network floor (smoking gun)

| Probe | Median |
|-------|-------:|
| `SELECT 1` RTT (warm) | **~1 168–1 285 ms** from bench host |
| First cold `SELECT 1` | **~3.2–3.4 s** |

**Conclusion:** Almost every single-query list route is **network-RTT bound** (~1.1–1.5 s) from a non-colocated client. Application CPU and table size (54 employees) are **not** the primary limiter. Co-locating Vercel compute with Sydney DB is the highest remaining ROI for production TTFB.

### List-route data-layer medians (before code optimisations where applicable)

| Route / pattern | Median ms | Notes |
|-----------------|----------:|-------|
| `/employees` findMany | 1 500 | 1 query |
| `/payroll` + bank join | 1 914 | List UI does **not** use bank |
| `/payroll` no bank | 1 162 | Same RTT floor, less join cost |
| `/disbursement` legacy 2-step | 2 392 | Periods then batches |
| `/disbursement` direct | 1 170 | 1 query |
| `/payment-instructions` | ~1 855 | Instruction + bank |
| `/payment-confirmation` list | ~2 799 | Multi-relation select |
| `/audit` take 100 | ~1 153 | RTT floor |
| `/sales` | ~1 163 | RTT floor |
| `/dashboard` optimized ×12 parallel | **1 333** | Max of parallel batch ≈ RTT |

---

## 3. Route ranking (server data-layer, remote → SYD)

Slowest first (median):

1. `/payment-confirmation` list (~2.8 s) — multi-join  
2. `/disbursement` legacy (~2.4 s) — **fixed** to ~1.2 s  
3. `/payroll` + bank (~1.9 s) — **fixed** list path without bank  
4. `/payment-instructions` (~1.9 s)  
5. `/employees` (~1.5 s)  
6. `/dashboard` optimized (~1.3–1.6 s)  
7. Simple 1-query routes (~1.15–1.2 s) — pure RTT  

Production TTFB = auth/JWT + data-layer + RSC serialize + cold start. Login remains bcrypt-bound (~0.1–0.3 s CPU) plus one user lookup RTT.

---

## 4. Root causes (factual)

| Rank | Cause | Evidence |
|------|--------|----------|
| 1 | **Cross-region RTT** compute↔DB (iad1→SYD historically; WAN from bench host now) | `SELECT 1` median ~1.2 s |
| 2 | **Sequential query waterfalls** on some routes | Disbursement 2-step ~2.4 s vs 1.2 s |
| 3 | **Unnecessary bank join** on payroll list | 1.9 s vs 1.2 s |
| 4 | **Over-fetch** confirmation list / full employee dump on reports | Relation payload; reports now `groupBy` |
| 5 | **Sidebar mass Link prefetch** | Default Next.js viewport prefetch × many nav items → concurrent RSC storms |
| 6 | **Heavy client modules always mounted** | Command palette, help, tour, Recharts on critical path |

**Not primary:** missing composite indexes on tiny tables; bcrypt alone; chart CPU for TTFB.

---

## 5. Query inventory (representative)

### `/dashboard` (after prior + V2 region)

```text
requireModule → auth JWT
loadDashboardBundle (React.cache, once)
└── Promise.all × 8–12 (groupBy / count / light findMany)
```

### `/payroll`

```text
requireModule
getPayrollPeriods  → findMany (no bank)   # was + sourceBankAccount
```

### `/disbursement` (after)

```text
requireModule
getDisbursements → disbursementBatch.findMany
                   [optional payrollPeriod.companyId filter]
# was: getPayrollPeriods(+bank) → ids → findMany batches
```

### `/approval`

```text
requireModule
getPayrollPeriods (light)
getApprovalSteps(periodId)   # sequential by necessity
```

### `/reports` (after)

```text
requireModule
Promise.all
├── getEmployeeDepartmentCosts → employee.groupBy(department)
├── getPayrollPeriods
└── getPayrollChartData
```

### `/payment-confirmation`

```text
requireModule
listPaymentConfirmations → findMany + select (company, period, instruction names only)
```

### Login `authorize`

```text
getUserByEmail (select minimal columns including passwordHash)
bcrypt.compare
return JWT user claims (no large relations)
```

---

## 6. Region comparison

| | Baseline A | Candidate B |
|--|------------|-------------|
| Compute | Default / **iad1** (historical) | **`syd1`** |
| Database | ap-southeast-2 | ap-southeast-2 (unchanged) |
| Config | none | `vercel.json` `regions: ["syd1"]` + `preferredRegion` on `app/(app)/layout.tsx` |
| Path (ID users) | ID → SG edge → **US compute** → SYD DB | ID → SG edge → **SYD compute** → SYD DB |

### Controlled comparison status

| Metric | A (remote/non-colocated bench) | B (syd1 production/preview) |
|--------|-------------------------------:|----------------------------:|
| `SELECT 1` | ~1.2 s median | **Pending Vercel preview** (expect tens of ms in-region) |
| Dashboard optimized | ~1.3–1.6 s | **Pending** — target warm &lt; 800–1000 ms after co-location |
| Login + 1 user query | ~RTT + bcrypt | **Pending** |

Local A/B of Vercel regions cannot be simulated on a laptop; config for B is landed and must be verified on preview logs (`VERCEL_REGION=syd1`, `[PERF]` lines).

**Trade-off for Indonesian users:** Co-locating with Sydney DB minimizes **query** latency. Client-to-edge may still land in Singapore; that hop is small vs US↔AU DB RTT.

---

## 7. Bundle / hydration findings

| Module | Finding | Action |
|--------|---------|--------|
| Recharts (dashboard) | Client chart on secondary section | `DashboardChartsLazy` dynamic + `ssr: false` |
| Recharts (reports) | Charts block chart panel only | `next/dynamic` on `ReportsCharts` |
| Command palette | Large dialog + nav graph | Dynamic import; mount only when open |
| Help center / product tour | Onboarding overlays | Dynamic; mount when open |
| Hotkey ⌘K | Was coupled to full palette module | Split to `use-command-palette-hotkey.ts` |
| Framer Motion | Mobile drawer only | Kept (small usage); not mass-memoized |
| App shell | Always client | Acceptable; children stream as RSC |

First-load JS numeric deltas require `next build` analyzer / preview Network panel (see before-after doc).

---

## 8. Prefetch findings

| Before | After |
|--------|--------|
| Sidebar `<Link>` default **prefetch=true** when in viewport | **`prefetch={false}`** on all sidebar links |
| Many concurrent RSC prefetches on first paint | Intent prefetch on **hover/focus** for primary routes only |

Primary intent set: `/dashboard`, `/employees`, `/payroll`, `/approval`, `/payment-confirmation`, `/reports`.

---

## 9. Login findings

| Item | Status |
|------|--------|
| User lookup | Single `findUnique` with **select** (no password-adjacent extras beyond hash) |
| Relations | None loaded |
| Hashing | bcrypt unchanged (security preserved) |
| Session | JWT strategy; `requireSession` React `cache` for RSC dedupe |
| Double dashboard fetch | No preload after login beyond redirect |

---

## 10. Caching / RSC

| Mechanism | Use |
|-----------|-----|
| `force-dynamic` on app pages | Kept — tenant payroll data must not be shared statically |
| React `cache` | `loadDashboardBundle`, `requireSession` |
| `unstable_cache` / Redis | **Not** used for payroll KPIs |
| `PERFORMANCE_LOGGING` | Opt-in; logs region + duration + counts only |

---

## 11. Risks

See `docs/PERFORMANCE_REMAINING_RISKS.md`.

---

## 12. How to re-profile

```bash
pnpm bench:dashboard
pnpm bench:routes
PERFORMANCE_LOGGING=true pnpm dev   # local [PERF] lines
# After deploy preview: confirm VERCEL_REGION=syd1 in function logs
```
