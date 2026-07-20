# Indonesia Payroll Command Center — UI V2

**Date:** 2026-07-21  
**Branch:** `feat/proqpay-enterprise-revamp`

---

## Positioning

| Element | Copy |
|---------|------|
| Title | Indonesia Payroll Command Center |
| Subtitle | Executive monitoring of payroll operations, workforce, clients, funding, and delivery across Indonesia. |
| Context | Designed for nationwide payroll operations across provinces, cities, projects, and client locations. |

Removed: global command center, world map, multi-country KPIs, global readiness, country selector.

---

## Layout (desktop)

1. Header + breadcrumb + cascading filters  
2. KPI grid 4 columns (2 tablet, 1 mobile) — rounded 16px cards, clickable  
3. **Full-width** Indonesia city/regency choropleth  
4. Insights · Alerts · Indonesia Operational Coverage  
5. Analytics charts  
6. Recent payroll cycles table  

---

## Map

- Title dynamic: Draft/Actual Payroll Distribution — {Period}
- Metric: selected period `totalNet` by operational city
- Colors: sequential blue scale (not red)
- Compact IDR: Mio / Bio / Tri
- Tooltip: city, province, period, status, value (compact + exact), employees, clients, projects, funding
- Lazy dynamic import + fetch `/geo/IDN.json`

---

## Number format

`formatCompactIDR` in `lib/format/idr.ts`:

- Rp738.000.000 → **Rp738 Mio**
- Rp4.200.000.000 → **Rp4,2 Bio**

---

## Data integrity

| Metric | Expected |
|--------|----------|
| Historical | Rp738 Mio |
| June | Rp407 Mio |
| July | Rp331 Mio |
| August draft | Rp350 Mio |
| Pipeline | Rp4,2 Bio |
| Existing / Prospect clients | 1 / 3 |
| ATE / Internal / Total emp | 36 / 18 / 54 |
| Prospect completed payroll | 0 |

Default map (August draft, scope client): **Jakarta Barat Rp350 Mio** only.
