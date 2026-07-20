# Geographic Dashboard Security

**Date:** 2026-07-20  

---

## Authentication

- Route still gated by `requireModule("dashboard")`  
- Session scope: `userId`, `role`, `companyId`  

---

## Tenant / company scope

| Role | Company visibility |
|------|--------------------|
| SUPER_ADMIN | Org-wide (all companies) |
| DIRECTOR | Org-wide when `companyId` null; else bound company |
| PAYROLL_ADMIN / FINANCE / others with companyId | **Only** their `companyId` |
| Unbound non-admin | Impossible company id filter (no data) |

Implemented via `executiveCompanyWhere` / `payrollCompanyWhere` in `lib/data/executive-dashboard.ts`.

Geographic filters **never** expand beyond this company scope.

---

## Client / project scope

- Client filter further restricts companies already in scope  
- Project filter restricts projects already in scope  
- No cross-tenant project codes leaked  

---

## Aggregate privacy

- Dashboard shows **counts and sums**, not employee personal addresses  
- No residential address field is read  
- Work location comes only from **operational mapping** or future `work_site_id`  

---

## Employee address protection

| Allowed | Forbidden |
|---------|-----------|
| Headcount by province/city | Listing home addresses |
| Work site label from mapping | Inferring geo from personal data |
| Client office site names | PII in map tooltips |

---

## Prospect vs actual

- Prospects never contribute to historical CLOSED payroll KPI  
- Prospect status on map ≠ Active Operation fill  
- Pipeline sums only OPEN opportunities  

---

## Role visibility

- Sales pipeline aggregates require `canViewSalesPipeline(role)`  
- Without permission, pipeline KPI shows 0 and sales query is skipped  

---

## Shareable URL risk

- Filters in query string may reveal selected client UUID to anyone with the link  
- Still requires authenticated session and module access  
- Do not put secrets in URL  

---

## Residual risks

1. Controlled mapping is global config (not per-tenant DB) — acceptable for single-org MSG deployment  
2. Pending approval count is currently org-wide PENDING (parity with existing dashboard)  
3. Future multi-tenant SaaS should move mapping into tenant-scoped tables  
