# Account Receivable Widget

**Date:** 2026-07-21  
**Component:** `components/dashboard/executive/account-receivable.tsx`  
**Formulas:** `lib/data/receivables.ts`

## Metrics strip

| Metric | Meaning |
|--------|---------|
| Total Outstanding | WC requests not fully settled (approved − repaid) |
| Client Funded | CLOSED periods with `SELF_FUNDED` |
| Working Capital Used | CLOSED `WORKING_CAPITAL` periods and/or WC outstanding |
| Collected | Proxy = client-funded closed totals |
| Draft Funding Requirement / Overdue | Draft total when draft exists; else overdue WC |

## Table

Max 5 visible rows; scroll for more. Links to payroll detail or `/working-capital`.

## Domain note

In ProQPay, **SELF_FUNDED = client-funded** (client bank). Not inverted to WC.
