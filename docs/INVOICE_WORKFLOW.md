# Invoice Workflow

## Status machine

```
DRAFT → PENDING_APPROVAL → APPROVED → ISSUED
                                      ↘ PARTIALLY_PAID → PAID
                                      ↘ OVERDUE ↗
DRAFT/… → CANCELLED | VOID (rules by status)
```

No skip transitions — enforced by `assertInvoiceTransition`.

## Numbering

On first transition to **ISSUED**:

`INV-YYYY-MM-######` via `InvoiceSequence` upsert + increment (not MAX+1).

## Payroll rule

`payrollStatusAllowsInvoice`: **DRAFT payroll cannot be invoiced**.

Duplicate active invoice for same payroll period is rejected.

## Service API

- `createDraftInvoice`
- `transitionInvoiceStatus`
- HTTP: `POST /api/financial/invoices`, `POST /api/financial/invoices/:id/transition`
