# Account Receivable Formulas

**Date:** 2026-07-21  
**Source module:** `lib/data/receivables.ts`

## Classification

| fundingModel enum | Presentation |
|-------------------|--------------|
| `SELF_FUNDED` | Client Funded |
| `WORKING_CAPITAL` | Working Capital |

## Metrics

### Client Funded

```
SUM(totalNet) WHERE status IN (CLOSED, VERIFIED, DISBURSED)
  AND fundingModel = SELF_FUNDED
  AND clientType = EXISTING
```

### Working Capital Used

```
max(
  SUM(totalNet CLOSED WORKING_CAPITAL EXISTING),
  SUM(approvedAmount - repaidAmount) for WC requests not COMPLETE/REPAID
)
```

### Total Outstanding (proxy AR)

```
SUM(approvedAmount - repaidAmount)
WHERE settlementStatus ≠ COMPLETE AND status ≠ REPAID
  AND (approvedAmount - repaidAmount) > 0
```

No `ClientInvoice` table — this is **settlement proxy only**.

### Collected (proxy)

```
= Client Funded closed totals
```

(Verified payment confirmations not required for current proxy.)

### Draft Funding Requirement

```
SUM(totalNet) WHERE status IN (DRAFT, WAITING, APPROVED) AND EXISTING
```

**Never** counted as outstanding AR.

### Overdue

```
Outstanding WC lines with dueDate < today
```

Aging only when `dueDate` present.

## Aging buckets

| Days past due | Bucket |
|---------------|--------|
| ≤ 0 | Current |
| 1–30 | 1–30 Days |
| 31–60 | 31–60 Days |
| 61–90 | 61–90 Days |
| > 90 | 90+ Days |

## Known limitations

1. No invoice / credit note ledger  
2. Collected is not cash-application true AR  
3. Current dataset is largely SELF_FUNDED CLOSED + DRAFT → AR outstanding often **Rp0**  
4. Draft August shows as **Draft Funding Requirement Rp350 Mio**, not overdue  

## Field sources

| Field | Model |
|-------|--------|
| totalNet, fundingModel, status | PayrollPeriod |
| approvedAmount, repaidAmount, settlementStatus, dueDate | WorkingCapitalRequest |
