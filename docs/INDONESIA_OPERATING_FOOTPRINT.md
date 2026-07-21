# Indonesia Operating Footprint

**Date:** 2026-07-20  
**Primary market:** Indonesia (years 1–3)  
**Architecture:** Multinational-ready; operations Indonesia-first  

---

## Positioning

> Designed for enterprise and multinational payroll operations, with Indonesia as the primary operating market for the first three years.

Dashboard default:

- Country = **Indonesia**  
- View = **National Overview**  
- Global readiness is secondary mode (filter Country = All countries readiness)

---

## Definitions

| Label | Meaning |
|-------|---------|
| **Active Operation** | Existing client or internal site with controlled geo mapping and live records |
| **Prospect** | Pipeline client/opportunity — **no** completed payroll |
| **Strategic Expansion** | 3-year plan geography — **not** live payroll |
| **No Active Data** | Reference province without ops, prospect, or plan highlight |
| **Unassigned** | Known entity without province/city mapping |

---

## Current actual footprint

| Entity | Type | Country | Province | City | Site |
|--------|------|---------|----------|------|------|
| PT Anak Tiga Emas | EXISTING | Indonesia | DKI Jakarta | Jakarta Barat | SITE-ATE-JAKBAR-01 |
| ATE-MPS-2026 | Project ACTIVE | Indonesia | DKI Jakarta | Jakarta Barat | SITE-ATE-JAKBAR-01 |
| ProQPay Internal Operations | INTERNAL | Indonesia | DKI Jakarta | Jakarta Pusat | SITE-MSG-HO-01 |
| INT-PQP-2026 | Project ACTIVE | Indonesia | DKI Jakarta | Jakarta Pusat | SITE-MSG-HO-01 |

### Actuals (must not change)

| Metric | Value |
|--------|------:|
| Historical existing-client payroll | Rp738.000.000 |
| Current draft (Aug 2026 ATE) | Rp350.000.000 |
| Prospect pipeline | Rp4.200.000.000 |
| Existing clients | 1 |
| Prospect clients | 3 |
| ATE employee profiles | 36 |
| Internal employees | 18 |
| Total employees | 54 |
| Prospect completed payroll | 0 |

---

## Prospect footprint

| Prospect | Country | Province / City |
|----------|---------|-----------------|
| PT Mitra Langgeng Sejati | Indonesia | Unassigned |
| PT Qjob Saka Gemilang | Indonesia | Unassigned |
| PT Oversea Global Group | Indonesia | Unassigned |

Pipeline geography charts may show “Indonesia (unassigned province)” until BD assigns targets.

---

## 3-year expansion framework

### Year 1 — Core Market Establishment (**Actual** capabilities live)

Focus: Jabodetabek, DKI Jakarta, Banten, Jawa Barat  

Capabilities in product: payroll ops, employees, approvals, PI, confirmation, disbursement, reporting.

### Year 2 — Java Expansion (**Strategic Plan**)

Focus: Jawa Tengah, Jawa Timur, industrial corridors  

Not colored as Active Operation.

### Year 3 — National Expansion (**Strategic Plan**)

Focus: Sumatera, Kalimantan, Sulawesi, Bali  

No invented projected payroll numbers.

---

## Hierarchy

```text
Indonesia
  → Province (e.g. DKI Jakarta)
    → City / Regency (e.g. Jakarta Barat)
      → Site / Project (e.g. ATE-MPS-2026)
```

Breadcrumb example:

`Indonesia / DKI Jakarta / Jakarta Barat / ATE-MPS-2026`

---

## Dashboard behavior

1. Default country Indonesia  
2. Map = **Indonesia Payroll Operating Footprint** (not fake world map)  
3. Click province → sets URL `province=` → city table filters  
4. Cascading filters: Country → Province → City → Site  
5. Strategic provinces outlined, not filled as active  
6. Equivalent accessible table under map  

---

## Source of location

**Controlled operational mapping** (`lib/data/geography/operational-mapping.ts`)  

Not employee residential address. Not free-text inventing.
