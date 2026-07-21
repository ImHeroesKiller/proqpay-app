# Performance Before / After V2

**Date:** 2026-07-20  
**Branch:** `feat/proqpay-enterprise-revamp`  
**Dataset:** Realistic reseed (54 employees, historical payroll Rp738M, draft Rp350M, pipeline Rp4.2B)  
**Bench host:** developer machine → Supabase pooler `aws-1-ap-southeast-2`  
**Commands:** `pnpm bench:dashboard`, `pnpm bench:routes`  

> Medians of ≥3 runs. No secrets or per-employee payroll amounts logged.

---

## 1. Summary table (data-layer + config)

| Metric | Before (V2 start) | After (this PR set) | Improvement |
| ---------------------- | ----------------: | ------------------: | ----------: |
| Dashboard warm data-layer (median) | 1 639 ms (12 q) | **1 333 ms** (12 q, routes bench) | ~19% (same query count; run variance / warm) |
| Dashboard cold-ish optimized | 2 945–3 332 ms | ~3 167 ms first batch run | Still RTT/cold-connection bound |
| Dashboard legacy waterfall | 18 010 ms / 19 q | unchanged (not used in prod path) | prior ~91% already |
| Login data path | full `user` row | **select** minimal columns | smaller payload; 1 query |
| `/payroll` list | + bank join ~1 914 ms | **no bank ~1 162 ms** | **~39%** |
| `/disbursement` | 2-step ~2 392 ms | **1 query ~1 170 ms** | **~51%** |
| `/reports` employees | full findMany + JS reduce | **groupBy department** | 1 aggregate query; less payload |
| Query count Dashboard | 12 | 12 | — (already optimized) |
| Compute region config | iad1 / default | **`syd1`** | config landed; **preview verify pending** |
| Warm RSC navigation (browser) | pending preview | pending preview | — |
| First-load JS Dashboard | baseline unknown this session | lazy charts + shell overlays | **pending build analyzer / preview** |
| INP / LCP (Lighthouse) | see prior LIGHTHOUSE_BASELINE | re-run on authenticated preview | pending |

---

## 2. Route data-layer ranking (after query fixes)

| Route pattern | Median ms | Queries / waves |
|---------------|----------:|-----------------|
| payment-confirmation list | 2 799 | 1 logical (joined) |
| payment-instructions | 1 855 | 1 + bank select |
| employees | 1 500 | 1 |
| dashboard optimized ×12 | 1 333 | 1 parallel wave |
| disbursement direct | 1 170 | 1 |
| reports dept groupBy | 1 173 | 1 |
| payroll no bank | 1 162 | 1 |
| audit / sales | ~1 15x | 1 |
| `SELECT 1` RTT floor | **1 168** | — |

**Interpretation:** After waterfalls are removed, **remaining time ≈ network RTT**. Production on `syd1` is required to break the ~1.1 s floor.

---

## 3. Disbursement A/B (same dataset)

| Variant | Median | Runs |
|---------|-------:|------|
| Legacy periods→ids→batches | 2 392 ms | 2 870 / 2 392 / 2 352 |
| Direct `disbursementBatch.findMany` | 1 170 ms | 1 170 / 1 140 / 1 400 |

---

## 4. Payroll list A/B

| Variant | Median |
|---------|-------:|
| `include: sourceBankAccount` | 1 914 ms |
| No bank join | 1 162 ms |

UI columns on `/payroll` do not display bank; detail route still loads bank via `getPayrollPeriodById`.

---

## 5. Region A/B

| | A Historical | B This branch |
|--|-------------:|--------------:|
| Region | iad1 / default | **syd1** |
| Local evidence | RTT ~1.2 s per query from remote client | Config: `vercel.json` + `preferredRegion` |
| Preview cold/warm TTFB | Not measured this session | **Required next step** |

Expected (engineering estimate, not measured on Vercel yet):

| Metric | Non-colocated | Colocated syd1+SYD DB |
|--------|--------------:|----------------------:|
| Per-query RTT | 200–1200+ ms | ~5–40 ms typical |
| Dashboard warm data-layer | ~1.3–2.2 s | **target &lt; 800–1000 ms** |

---

## 6. Navigation / prefetch

| Metric | Before | After |
|--------|--------|-------|
| Sidebar Link prefetch | default on (viewport) | **false** for all items |
| Intent prefetch | none | hover/focus on 6 primary routes |
| Concurrent RSC on first paint | high risk | significantly reduced |

Browser Network confirmation: pending authenticated preview.

---

## 7. Bundle / perceived performance

| Change | Effect |
|--------|--------|
| Lazy CommandPalette / Help / Tour | JS loaded when overlay opens |
| Lazy Dashboard + Reports charts | Recharts off primary shell path |
| `app/(app)/loading.tsx` | Shell skeleton on navigation |
| Dashboard Suspense sections | Unchanged progressive KPI → secondary |

---

## 8. Correctness gates (business)

| Check | Expected | Touched by V2 perf? |
|-------|----------|---------------------|
| Historical payroll total (ATE Jun+Jul) | Rp738.000.000 | No formula change |
| Current draft | Rp350.000.000 | No |
| Pipeline | Rp4.200.000.000 | No |
| Tenant isolation / roles | unchanged | session cache only |
| Reseed | **not run** | — |

---

## 9. Quality gates

```bash
pnpm lint          # pass
pnpm typecheck     # pass
pnpm test:utils    # pass
pnpm build         # run before push
pnpm bench:dashboard
pnpm bench:routes
```

---

## 10. Code map

| Area | Files |
|------|--------|
| Region | `vercel.json`, `lib/runtime-region.ts`, `app/(app)/layout.tsx` |
| Queries | `lib/data/queries.ts`, `lib/data/confirmations.ts` |
| Prefetch | `components/layout/sidebar.tsx` |
| Bundle | `components/layout/app-shell.tsx`, `dashboard-charts-lazy.tsx`, reports page |
| Session | `lib/auth/session.ts` (React `cache`) |
| Perf logs | `lib/perf.ts` |
| Bench | `scripts/bench-routes.mjs`, `package.json` script |
| Loading | `app/(app)/loading.tsx` |
