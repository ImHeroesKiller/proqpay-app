# Financial API (Phase 1A)

All routes require session auth + module permission.

| Method | Path | Module | Description |
|--------|------|--------|-------------|
| GET | `/api/financial/invoices` | invoices | List |
| POST | `/api/financial/invoices` | invoices | Create draft |
| POST | `/api/financial/invoices/:id/transition` | invoices | Status machine |
| GET/POST | `/api/financial/payments` | client_payments | List / create / verify+allocate |
| GET | `/api/financial/receivables` | receivables | AR list |
| POST | `/api/financial/working-capital` | working_capital | approve / settle |
| GET/POST | `/api/financial/treasury` | treasury | summary / account / movement |
| GET/POST | `/api/financial/collection` | collection | activities |
| GET | `/api/financial/summary` | dashboard/invoices | Empty-safe aggregates |

Dashboard UI routes were **not** modified.

## Example: verify payment

```json
POST /api/financial/payments
{
  "action": "verify",
  "paymentId": "…",
  "allocations": [{ "invoiceId": "…", "amount": 350000000 }],
  "treasuryAccountId": "…"
}
```
