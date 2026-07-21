# Dashboard Compact Layout

**Date:** 2026-07-21

## Filter toolbar

- Single horizontal row (`overflow-x: auto`, nowrap)
- Default chips: Scope · Period · Client · Province · City
- `+ Add Filter` for optional chips
- Reset restores defaults

## KPI strip

- Desktop `xl:`: `grid-cols-8` one row
- Below xl: horizontal scroll, min card ~11.5rem
- Compact padding 14px, radius 16px, truncated labels

## Lists

- City ranking & recent cycles & AR lines: max **5** body rows visible
- Sticky header, vertical scroll for remainder
- Caption “Showing 5 of N …” when N > 5

## Removed

- Indonesia Operational Coverage widget

## Added

- Account Receivable full-width section
