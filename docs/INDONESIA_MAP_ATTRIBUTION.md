# Indonesia Map Attribution

**Date:** 2026-07-21  
**Branch:** `feat/proqpay-enterprise-revamp`

---

## Source repository

| Field | Value |
|-------|--------|
| Repository | https://github.com/anggakhrsma/indonesia-map |
| Demo | https://anggakhrsma.github.io/indonesia-map/ |
| Purpose of source | Simple choropleth map using D3.js + TopoJSON |
| File used | `data/IDN.json` only |

---

## License status

| Check | Result |
|-------|--------|
| LICENSE / LICENCE file in source repo | **Not present** (as of clone 2026-07-21) |
| SPDX / explicit terms in README | **None** (README is a one-line description) |
| Claim of ProQPay ownership of geometry | **No** — third-party geometry asset |

**Usage policy in this project**

- Geometry/topology only is vendored for operational visualization.
- Population CSV and demo UI/CSS/animation **are not** copied.
- Asset is **not** claimed as original ProQPay IP.
- If rights holders object or terms are clarified as non-permissive, replace geometry with an official/open-license source (see plan below).

---

## Files in ProQPay

| Path | Role |
|------|------|
| `public/geo/IDN.json` | Vendored TopoJSON (city/regency geometries, ~250 KB) |
| `components/dashboard/executive/indonesia-choropleth.tsx` | ProQPay map renderer (original UI code) |
| `lib/data/geography/topology-join.ts` | Join table HASC_2 / ID_2 → ProQPay city codes |

---

## What was **not** used from the source repo

- `data/IDN.csv` (population / Kemendagri-style attributes)
- Population choropleth coloring
- Long entrance animation (~2s) from the demo
- HTML/CSS layout of the demo site

---

## Topology feature properties used

- `NAME_1` — province-level name (e.g. Jakarta Raya)
- `NAME_2` — city/regency name (e.g. Jakarta Barat)
- `ID_1`, `ID_2` — numeric feature ids
- `HASC_2` — hierarchical code (e.g. `ID.JK.JB`)
- `TYPE_2` / `ENGTYPE_2` — Kota/Kabupaten type

---

## Replacement plan

If license is inadequate for continued use:

1. Obtain BPS/BIG or Natural Earth / open GADM-compatible Indonesia ADM2 geometry with clear open license (e.g. ODbL, CC-BY).
2. Re-export as TopoJSON with equivalent `HASC_2` or BPS codes.
3. Update `topology-join.ts` only; keep ProQPay metric layer unchanged.
4. Remove `public/geo/IDN.json` and re-attribute.

---

## Credit

Map geometry derived from the public repository [anggakhrsma/indonesia-map](https://github.com/anggakhrsma/indonesia-map). ProQPay visualization code, metrics, and operational joins are original to this product.
