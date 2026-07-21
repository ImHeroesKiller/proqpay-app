# Dashboard Dynamic Filters

**Date:** 2026-07-21

## Primary (always visible)

| Key | Default |
|-----|---------|
| scope | client |
| period | operational default (Aug 2026 DRAFT) |
| client | ALL |
| province | ALL |
| city | ALL |

## Optional (Add Filter)

site · clientType · project · status · funding · currency

## URL

- Optional keys appear when value ≠ ALL (currency ≠ IDR)
- `extras=site,funding` keeps empty optional chips pinned after add
- Removing chip clears key + extras entry
- Reset → `scope=client` + default period only
- Immediate update, no Apply; back/forward supported
