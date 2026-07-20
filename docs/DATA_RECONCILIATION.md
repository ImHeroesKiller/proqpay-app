# Data Reconciliation — Baseline 2026

**Source of truth for client payroll totals:** `PayrollPeriod.totalNet`  
**Line check:** `sum(PayrollLine.netPay)` per period  
**Executed:** `ALLOW_DATA_RESEED=true pnpm seed:realistic -- --execute`  
**Result:** All checks **PASS**

| Dataset | Expected | Actual | Status |
| --------------------- | --------------: | --------------: | ------ |
| ATE June Payroll | Rp407.000.000 | Rp407.000.000 | PASS |
| ATE June line sum | Rp407.000.000 | Rp407.000.000 | PASS |
| ATE July Payroll | Rp331.000.000 | Rp331.000.000 | PASS |
| ATE July line sum | Rp331.000.000 | Rp331.000.000 | PASS |
| ATE Historical Total | Rp738.000.000 | Rp738.000.000 | PASS |
| Prospect Pipeline (estimated) | Rp4.200.000.000 | Rp4.200.000.000 | PASS |
| Existing Client Count | 1 | 1 | PASS |
| Prospect Client Count | 3 | 3 | PASS |
| Prospect completed payroll | 0 | 0 | PASS |

## After inventory (execute)

| Entity | Count |
|--------|------:|
| Companies | 5 |
| Employees | 54 (36 ATE + 18 internal) |
| Projects | 5 |
| Payroll periods | 5 |
| Payroll lines | 130 |
| Sales opportunities | 3 |

## Separation rules

| Bucket | Included in client historical Rp738jt | Included in prospect Rp4,2M |
|--------|:------------------------------------:|:---------------------------:|
| ATE CLOSED June/July | Yes | No |
| ATE DRAFT August | No | No |
| Internal CLOSED payroll | No | No |
| Prospect estimatedPayrollValue | No | Yes |

## Dashboard

Org-wide roles see operational KPIs only for `clientType=EXISTING` + `ACTIVE`.  
Prospect pipeline KPI uses `sum(estimatedPayrollValue)` of OPEN opportunities.  
Internal payroll does not inflate client totals.
