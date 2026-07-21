# Financial Domain Model

## Entities

| Model | Table | Purpose |
|-------|-------|---------|
| Invoice | invoices | Client bill |
| InvoiceItem | invoice_items | Line flexibility |
| InvoiceSequence | invoice_sequences | Numbering |
| ClientPayment | client_payments | Independent payments |
| PaymentAllocation | payment_allocations | N:M payment↔invoice |
| Receivable | receivables | AR state per invoice |
| WorkingCapitalApproval | working_capital_approvals | WC decision trail |
| WorkingCapitalSettlement | working_capital_settlements | WC repayment trail |
| FundingSource | funding_sources | Catalog |
| TreasuryAccount | treasury_accounts | Bank/cash books |
| CashMovement | cash_movements | Immutable cash ledger |
| CollectionActivity / Note | collection_* | Collection CRM lite |
| FinancialAttachment | financial_attachments | Files |
| FinancialAudit | financial_audits | Immutable audit |

## Relations

```
Organization → InvoiceSequence, TreasuryAccount, FundingSource
Company → Invoice, ClientPayment, Receivable, Collection*
PayrollPeriod → Invoice (optional, unique active)
Invoice → InvoiceItem, Receivable, PaymentAllocation, Collection
ClientPayment → PaymentAllocation, CashMovement
WorkingCapitalRequest → Approval*, Settlement*
```

## ER notes

- `clientId` on Invoice currently stores company UUID of billed client (same multi-tenant Company row)
- One **active** (non-void/cancelled) invoice per `payrollPeriodId` (partial unique index)
