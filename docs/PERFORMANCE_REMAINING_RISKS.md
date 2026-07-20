# Performance — Remaining Risks & Next Steps

**Date:** 2026-07-20  
**Branch:** `feat/proqpay-enterprise-revamp`

---

## 1. Bottlenecks still remaining

| Bottleneck | Severity | Why it remains |
|------------|----------|----------------|
| **DB RTT when compute ≠ Sydney** | Critical until preview proves `syd1` | Historical iad1; local bench shows ~1.2 s per query floor |
| **Payment confirmation list (~2.8 s remote)** | Medium | Multi-relation select still pays RTT + join; small row counts |
| **Employees full table to browser** | Medium at 54 rows; grows later | Client table filter/sort; no server pagination yet |
| **Login bcrypt cost** | Intentional | Security; do not weaken without analysis |
| **force-dynamic everywhere** | Accepted | Correct for tenant payroll; limits static edge caching |
| **Authenticated Lighthouse / INP / LCP** | Unknown this session | Needs browser run on preview |
| **Cold starts on serverless** | Medium | Warm improves; Fluid Compute / min instances plan-dependent |

---

## 2. Infrastructure dependencies

- Vercel project must **honor** `vercel.json` `regions: ["syd1"]` (plan-supported region).
- Preview and production env must point at the **same** Sydney pooler dataset (no accidental US DB).
- Supabase pooler **6543** + Prisma singleton required under concurrency.
- `DIRECT_URL` remains for migrations only.

---

## 3. Region limitations

- `preferredRegion` / project `regions` may differ by plan; confirm in deployment function metadata.
- Edge Middleware still global; region pin applies to **Node serverless / RSC**, not necessarily middleware.
- Users in Indonesia still hit a nearby edge POP; that is fine. Avoid moving DB to Singapore without DR plan.
- Failover multi-region was **not** configured (Enterprise feature).

---

## 4. Database limitations

- Tables are small; **indexes not added** without EXPLAIN proof (write overhead risk).
- Unscoped counts (global PENDING approvals / FAILED instruction items) retained for KPI parity — revisit with product for tenant scoping.
- Prisma relation queries can emit multiple SQL statements (confirmation list).

### Index candidates (future, evidence-gated)

| Index | Candidate query |
|-------|-----------------|
| `(company_id, status)` on payroll_periods | groupBy / filters |
| `(company_id, status)` on payment_confirmations | list + groupBy |
| `(status)` on approval_steps | PENDING count |

**Rollback:** drop migration if write latency rises.

---

## 5. Caching risks

| Risk | Mitigation |
|------|------------|
| Shared cache of payroll KPIs across tenants | **Not used** |
| React `cache` key missing tenant | Dashboard keyed by userId+role+companyId; session is per-request |
| Stale `unstable_cache` | Not introduced |
| Prefetch serving wrong role UI | Prefetch only routes; server re-auth on navigation |

---

## 6. Security risks

| Risk | Status |
|------|--------|
| Perf logs leaking PII / amounts | Gated; keys sanitized; no tokens |
| Login select still needs passwordHash | Server-only authorize path |
| Weakening bcrypt | **Not done** |
| Tenant isolation regression | Disbursement filter uses company via relation for non–super-admin |
| Over-broad SUPER_ADMIN unscoped lists | Same as before for org-wide roles |

---

## 7. What we intentionally did **not** do

- Reseed or delete dataset  
- Merge to `main` / production deploy  
- Move Supabase region  
- Mass `memo` / `useMemo` without profiler proof  
- Add indexes without EXPLAIN  
- Global Redis cache for payroll  
- Disable all client JS for tables  

---

## 8. Recommended next steps (ordered)

1. **Deploy preview** of this branch; confirm logs show `VERCEL_REGION=syd1`.  
2. Measure authenticated **3 cold + 5 warm** TTFB for `/login`, `/dashboard`, `/payroll`, `/employees`, `/reports`.  
3. Chrome DevTools: count **RSC requests** on first Dashboard paint (prefetch regression test).  
4. Re-run Lighthouse authenticated (Dashboard, Employees, Payroll, Reports).  
5. If warm dashboard still &gt; 1 s on syd1, profile Prisma SQL with `PERFORMANCE_LOGGING` and consider composite indexes + EXPLAIN.  
6. Add **server pagination** (25–50/page) for employees/audit when headcount grows.  
7. Optional: split Framer Motion from shell if mobile drawer cost shows in INP.  

---

## 9. Acceptance vs targets

| Target | Status |
|--------|--------|
| Dashboard warm data-layer &lt; 1 s after region alignment | **Pending syd1 preview** (remote median ~1.3 s) |
| No N+1 | Met on audited routes |
| No unnecessary duplicate dashboard queries | Met (React cache) |
| Independent queries parallel on dashboard | Met |
| Prefetch storm reduced | Code landed; browser verify pending |
| Correctness KPIs unchanged | Met (no business formula changes) |
