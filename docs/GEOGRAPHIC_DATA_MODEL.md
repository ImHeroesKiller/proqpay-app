# Geographic Data Model

**Date:** 2026-07-20  
**Branch:** `feat/proqpay-enterprise-revamp`  
**Migration applied:** **No** (documented proposal only)

---

## 1. Current schema

| Entity | Geo-related fields | Structured hierarchy? |
|--------|--------------------|------------------------|
| `Company` | `address` (free text) | No |
| `Branch` | `address` (free text), `code`, `name` | No country/province/city |
| `Project` | `site`, `location` (free text), optional `branchId` | No |
| `Employee` | `branchId` only | No work location / city |
| `PayrollPeriod` | via `companyId` / optional `projectId` | No |
| Location master tables | **None** | — |

No `country`, `province`, `city`, `regency`, `latitude`, `longitude`, or `locationId` columns exist.

---

## 2. Gaps

1. No Country → Province → City → Site master tables  
2. No stable codes on operational entities  
3. No employee **work location** separate from residential (residential not even modeled)  
4. No prospect **target province** field  
5. Cannot EXPLAIN-index geographic aggregates in SQL without joins to free text  

---

## 3. Proposed hierarchy (target)

```text
Country (code ID)
  └── Province (code ID-JK)
        └── CityRegency (code ID-JK-JB)
              └── Site (code SITE-ATE-JAKBAR-01)
                    ├── optional Company
                    ├── optional Project
                    └── optional Employees (work location)
```

### Recommended tables (future migration)

- `geo_countries` — code PK, name  
- `geo_provinces` — code PK, country_code FK  
- `geo_city_regencies` — code PK, province_code FK  
- `geo_sites` — code PK, city_code FK, company_id?, site_type  

### FKs on operational entities

- `companies.hq_site_id` or `companies.primary_city_code`  
- `projects.site_id`  
- `employees.work_site_id` (not home address)  
- `sales_opportunities.target_province_code`  

---

## 4. Reference data strategy (now)

**Approach B — Controlled operational mapping** in:

- `lib/data/geography/reference.ts` — master lists (not live ops)  
- `lib/data/geography/operational-mapping.ts` — explicit entity → geo  

Until migration, dashboard geography is **not inferred from addresses**.

---

## 5. Migration impact (if approved later)

| Risk | Mitigation |
|------|------------|
| Backfill free-text addresses incorrectly | Manual mapping review |
| Write path for new clients | Admin UI for site assignment |
| Index growth | Index `(country_code, province_code, city_code)` only after volume justifies |
| Tenant isolation | Site belongs to company; queries always join company scope |

**Backward compatibility:** keep free-text `address`/`location` columns; add nullable FKs.

---

## 6. Indexing needs (future)

- `projects(site_id)`  
- `employees(work_site_id)`  
- `payroll_periods(company_id, status)` already useful for geo-filtered aggregates  

---

## 7. Rollout plan

1. **Now:** Controlled mapping + Indonesia-first dashboard (done)  
2. **Next:** Seed geo reference tables without changing KPI formulas  
3. **Then:** Link ATE + Internal sites via FK  
4. **Later:** Employee work sites; prospect target provinces  
5. **Never:** Auto-promote residential address to work location  

---

## 8. Decision log

| Decision | Choice |
|----------|--------|
| Migration in this PR | **No** |
| Live multi-country ops | **No** — Indonesia only for actual ops |
| Fake province coloring | **No** |
| Source of truth for ATE location | Operational mapping → DKI Jakarta / Jakarta Barat |
