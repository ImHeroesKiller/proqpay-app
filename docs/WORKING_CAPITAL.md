# Working Capital (Financial Core)

## Existing model

`WorkingCapitalRequest` remains the primary WC document.

## Additive trail

| Model | Purpose |
|-------|---------|
| WorkingCapitalApproval | Multi-level decisions |
| WorkingCapitalSettlement | Repayment / write-off events |

## Service

- `recordWcApproval` — writes approval + updates request status  
- `recordWcSettlement` — reduces exposure (`repaidAmount`), settlement status  

## Rules

- Settlement cannot exceed remaining exposure  
- Full repayment → request `REPAID` + settlement `COMPLETE`  

## HTTP

`POST /api/financial/working-capital` with `action: approve | settle`
