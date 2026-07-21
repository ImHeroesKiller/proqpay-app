# Executive Dashboard Data Integration

**Date:** 2026-07-20  
**Loader:** `lib/data/executive-dashboard.ts` → `getExecutiveDashboardData`  
**UI:** `components/dashboard/executive/*`  

---

## Positioning copy

| Element | Source |
|---------|--------|
| Title | Fixed: Global Payroll Command Center |
| Subtitle | Fixed executive monitoring copy (no multi-country claim) |
| Context | Indonesia primary market for first three years |

---

## Actual vs draft vs pipeline

| Concept | Definition | DB source |
|---------|------------|-----------|
| **Historical client payroll** | Sum `totalNet` where period `status = CLOSED` and company `clientType = EXISTING` | `PayrollPeriod` |
| **Current draft payroll** | Sum `totalNet` where `status = DRAFT` and EXISTING | `PayrollPeriod` |
| **Prospect pipeline** | Sum `estimatedPayrollValue` where opportunity `status = OPEN` | `SalesOpportunity` |
| **Internal payroll** | Excluded from client historical KPI | INTERNAL company periods |

---

## Widget data sources

| Widget | Source | Geo join |
|--------|--------|----------|
| Primary KPI strip | Aggregates above | Filter-aware |
| Geographic KPI strip | Distinct codes from mapped EXISTING active clients | Operational mapping |
| Indonesia footprint map | Province rollup of companies/projects/periods/sales | Mapping + ID province reference |
| City distribution table | Same rollup by city code | Mapping |
| Payroll trend chart | EXISTING periods chronological | Filtered |
| Payroll by province/city | CLOSED vs DRAFT totals | Mapping |
| Employees by province | Employee groupBy company × mapping | Mapping |
| Pipeline by geography | OPEN sales × mapping | Mapping |
| Workflow status | Period status counts | Filtered |
| Recent cycles table | Periods + project code + mapping columns | Mapping |
| Executive insights | Rule-based on aggregates | — |
| Geographic alerts | Unassigned locations, concentration, pending approvals | Mapping + `approvalStep` |
| 3-year roadmap | Static plan structure (not payroll forecast) | — |
| Validation footer | Unfiltered integrity checks on org scope | — |

---

## Geographic filter behavior

URL query params (shareable):

`country`, `province`, `city`, `site`, `clientType`, `client`, `project`, `period`, `status`, `funding`, `currency`

Defaults:

- `country=ID`  
- province/city/site = ALL (omitted)  

Cascading:

- Province disabled when country = ALL (readiness mode)  
- City disabled until province selected  
- Site disabled until city or project context  

Server parses `searchParams` in `app/(app)/dashboard/page.tsx` and passes `GeoFilters` into the loader.

---

## Query inventory

Single `Promise.all` batch (**6 queries**):

1. `company.findMany`  
2. `project.findMany`  
3. `employee.groupBy(companyId, status)`  
4. `payrollPeriod.findMany` (scoped)  
5. `salesOpportunity.findMany` OPEN (role-gated)  
6. `approvalStep.count` PENDING  

**No per-province loops.** Geography is in-memory after the batch using controlled mapping.

| Metric | Value |
|--------|------:|
| Query count | **6** |
| Parallel waves | **1** |
| Geo source | controlled_operational_mapping |

Additional filter options call: 3 light queries (`getExecutiveFilterOptions`) on page load (can be merged later).

---

## Caching

- Request-scoped promise map in `getExecutiveDashboardData` (dedupe concurrent callers)  
- React `cache` export `loadExecutiveDashboard` available for RSC  
- **No** cross-request Redis/unstable_cache of payroll totals  

---

## Performance notes

- Dataset size is small (54 employees, 5 periods); bottleneck remains DB RTT when not co-located  
- Mapping is O(n) in-memory  
- Charts receive pre-aggregated series only  

---

## Validation expectations

| Metric | Expected |
|--------|----------|
| Historical | Rp738.000.000 |
| Draft | Rp350.000.000 |
| Pipeline | Rp4.200.000.000 |
| Existing clients | 1 |
| Prospects | 3 |
| ATE profiles | 36 |
| Internal | 18 |
| Total employees | 54 |
| Prospect completed payroll | 0 |
