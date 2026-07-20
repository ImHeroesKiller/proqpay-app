# Receivable Rules

## Receivable ≠ Invoice

Receivable is **state** derived from invoice + allocations.

Created/updated when invoice is ISSUED / PARTIALLY_PAID / PAID / OVERDUE.

## Status

| Status | Rule |
|--------|------|
| COLLECTED | outstanding ≈ 0 |
| OVERDUE | outstanding > 0 and past due date |
| PARTIAL | 0 < outstanding < grandTotal |
| CURRENT | outstanding = grandTotal, not past due |
| WRITTEN_OFF | manual (future) |

## Aging

`agingDays` from due date; buckets Current / 1-30 / 31-60 / 61-90 / 90+.

## Payment rule

Allocation cannot exceed invoice outstanding (`applyPaymentToOutstanding`).

## Draft

Draft invoices and draft payroll **do not** create receivables.
