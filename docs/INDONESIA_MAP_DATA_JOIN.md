# Indonesia Map Data Join

**Date:** 2026-07-21

---

## Join keys

| Layer | Key | Example |
|-------|-----|---------|
| TopoJSON feature | `HASC_2` | `ID.JK.JB` |
| TopoJSON feature | `ID_2` | `68` |
| ProQPay operational city | `cityCode` | `ID-JK-JB` |
| ProQPay mapping | `SITE-ATE-JAKBAR-01` | Jakarta Barat |

Primary join: **HASC_2 → cityCode** via `lib/data/geography/topology-join.ts`.

Fallback: `ID_2` numeric id.

Do **not** join only on free-text `NAME_2` in production paths (normalization helper exists for edge cases).

---

## Canonical operational joins (current)

| cityCode | Province | City | HASC_2 | ID_2 | Use |
|----------|----------|------|--------|------|-----|
| ID-JK-JB | DKI Jakarta | Jakarta Barat | ID.JK.JB | 68 | ATE existing client |
| ID-JK-JP | DKI Jakarta | Jakarta Pusat | ID.JK.JP | 69 | Internal ProQPay HQ |

Prospects remain **Unassigned** (no topology fill).

---

## Metric joined to geometry

For selected payroll period:

- Sum `PayrollPeriod.totalNet` by operational `cityCode`
- Scope Client → EXISTING only
- Scope Internal → INTERNAL only
- Prospect pipeline **excluded** from heatmap

Color scale: sequential navy-blue by value domain of selected period.

---

## Validation checks

| Check | Status |
|-------|--------|
| Operational city without topology join | Fail CI manual review — listed in OPERATIONAL_TOPOLOGY_JOINS |
| Topology city without operational data | Neutral gray (no data) — expected |
| Province mismatch (ops vs topology) | Jakarta Raya (topology) ↔ DKI Jakarta (ops labels) documented |
| Duplicate HASC | Not present in join table |

---

## Default period map expectation

| Period | City fill | Label |
|--------|-----------|--------|
| Agustus 2026 DRAFT | Jakarta Barat ≈ Rp350 Mio | Draft Payroll Value |
| Juli 2026 CLOSED | Jakarta Barat ≈ Rp331 Mio | Actual Payroll Value |
| Juni 2026 CLOSED | Jakarta Barat ≈ Rp407 Mio | Actual Payroll Value |

No multi-city random split of a single period total.
