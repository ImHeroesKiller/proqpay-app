# Dashboard Filter Behavior

**Date:** 2026-07-21  
**URL owner:** `app/(app)/dashboard/page.tsx` + `geo-filters.tsx`

---

## Default filters

| Param | Default |
|-------|---------|
| `scope` | `client` |
| `period` | Active/draft open period, else latest CLOSED (Agustus 2026 DRAFT in current dataset) |
| `province` | ALL (omitted) |
| `city` | ALL |
| `site` | ALL |
| `clientType` | ALL |
| `client` | ALL |
| `project` | ALL |
| `status` | ALL |
| `funding` | ALL |

**Country filter removed** — Indonesia only.

---

## Cascade rules

1. Changing **province** clears `city`, `site`
2. Changing **city** clears `site`
3. **City** select disabled until province selected
4. **Site** disabled until city selected (or project context)
5. **Scope** Internal excludes existing-client payroll from cycles/map; Client excludes internal

---

## URL parameters

`scope`, `province`, `city`, `site`, `clientType`, `client`, `project`, `period`, `status`, `funding`

Updates are **immediate** (no Apply button). Uses Next.js `router.push` with `scroll: false` for history.

---

## Reset behavior

**Reset filters** sets:

- `scope=client`
- `period=<default operational period id>`
- clears province/city/site/client/project/status/funding

---

## Browser history

Back/forward restores query string → server re-renders dashboard data with those filters.

---

## Scope behavior

| Scope | Companies | Payroll on map/cycles | Pipeline |
|-------|-----------|----------------------|----------|
| client | EXISTING + PROSPECT for counts; EXISTING payroll | EXISTING only | Yes |
| internal | INTERNAL | INTERNAL only | No |
| all | All types | EXISTING + INTERNAL periods | Yes |

Prospects never contribute to heatmap payroll values.
