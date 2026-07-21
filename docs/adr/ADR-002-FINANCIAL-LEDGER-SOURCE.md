# ADR-002 — Financial Ledger Source of Truth

**Status:** Accepted (audit decision 2026-07-21)  
**Context:** Dashboard AR uses operational proxies while true invoice/receivable tables exist.  
**Decision date:** 2026-07-21  

---

## Context

| Concern | Current sources | Problem |
|---------|-----------------|---------|
| Invoice | `invoices` + items | Real ledger (1 paid smoke row) |
| AR | `receivables` | Real; auto-updated on issue/allocate |
| Dashboard AR | `lib/data/receivables.ts` proxy from payroll periods | Comment admits no invoice table usage; mislabels draft payroll as AR |
| Cash | `cash_movements` + optional treasury | Not used when treasuryAccountId omitted on verify |
| WC | `working_capital_requests` | 0 rows; UI create disabled |

## Decision

### Canonical commercial ledger

```text
Invoice              = commercial claim (status machine)
Receivable           = AR state derived 1:1 from open invoices
ClientPayment        = cash receipt event
PaymentAllocation    = applied cash to invoice
CollectionActivity   = collection ops log
FinancialAudit       = immutable financial trail
TreasuryAccount      = cash accounts
CashMovement         = treasury movements
```

### Projection / presentation only

```text
lib/data/receivables.ts period proxies  →  DEPRECATE for executive AR widgets
Executive dashboard AR widgets          →  MUST read receivables + invoices
```

### Rules

1. Never present payroll period totals as “invoice outstanding” without an issued invoice.  
2. Issuing invoice **must** create/update receivable (already in `transitionInvoiceStatus`).  
3. Payment verification **must** recompute receivable + invoice outstanding (already in payment-service).  
4. Optional cash_movement on verify is insufficient for treasury completeness — posting policy must be explicit.

## Migration path

| Step | Work |
|------|------|
| 1 | Rebind executive AR KPI/list to `prisma.receivable` / invoice aggregates |
| 2 | Keep proxy formulas only as “funding requirement” not “AR” |
| 3 | Add reconciliation report: period net vs issued invoice totals |
| 4 | Mark `lib/data/receivables.ts` as funding-view helper, rename if needed |

## Verification

- Outstanding AR sum == sum(receivables.outstanding where status not COLLECTED/WRITTEN_OFF)  
- PAID invoices have receivable COLLECTED and outstanding 0  
- Dashboard AR total equals ledger within same filter  

## Consequences

- Single commercial truth for finance roles  
- Removes false confidence from closed payroll without invoice  
