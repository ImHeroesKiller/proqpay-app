# Financial Architecture — Phase 1A

**Date:** 2026-07-21  
**Branch:** `feat/proqpay-enterprise-revamp`

## Principle

**Financial Core is the source of truth** for billing, AR, client payments, WC settlement trail, and treasury movements.

- Dashboard only **reads** aggregates (`getFinancialCoreSummary` / `/api/financial/summary`)
- Payroll remains operational; **invoice** is the bill; **receivable** is financial state
- Transactions append audit rows (`FinancialAudit`) — treat as immutable

## Layers

```
API (app/api/financial/*)
  → Services (lib/financial/*)
    → Prisma models (proqpay schema)
    → Pure domain rules (invoice-status, receivable-rules, working-capital-rules)
```

## Separation from payroll ops

| Operational (existing) | Financial Core (new) |
|------------------------|----------------------|
| PaymentInstruction | Invoice |
| PaymentConfirmation | ClientPayment + PaymentAllocation |
| WorkingCapitalRequest | + Approvals + Settlements trail |
| Dashboard proxies | Receivable ledger |

Existing tables were **not** renamed or removed.

## Migration

`prisma/migrations/20260721_financial_core/migration.sql`

## Next (1B)

- Invoice UI, PDF, email  
- Auto-invoice from closed payroll  
- Full cash application  
- Client portal AR view  
- AI / forecasting  
