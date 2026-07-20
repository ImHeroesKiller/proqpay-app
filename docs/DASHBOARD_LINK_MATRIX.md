# Dashboard Link Matrix

**Date:** 2026-07-21  
**Route helpers:** `lib/routes/app-routes.ts`

| Component | Destination | Filter / context | Status |
|-----------|-------------|------------------|--------|
| KPI Historical Client Payroll | `/payroll?status=CLOSED&clientType=EXISTING` | CLOSED + EXISTING | Active |
| KPI Current Draft Payroll | `/payroll/[id]` of draft period | August draft id | Active |
| KPI Prospect Pipeline | `/sales?clientType=PROSPECT` | PROSPECT | Active |
| KPI Existing Clients | `/clients?type=EXISTING` | type | Active |
| KPI Prospect Clients | `/clients?type=PROSPECT` | type | Active |
| KPI Active Client Employees | `/employees?scope=client&status=ACTIVE` | scope+status | Active |
| KPI Internal Employees | `/employees?scope=internal&status=ACTIVE` | scope+status | Active |
| KPI Payroll Completion | `/payroll` | list | Active |
| Map city click | `/dashboard?…&city=ID-JK-JB&province=ID-JK&period=…` | city filter | Active |
| City ranking row | same as map city | city filter | Active |
| Trend chart point | `/payroll/[id]` | period | Active |
| Recent cycle row / Open | `/payroll/[id]` | period | Active |
| Insight CTA | varies (payroll, sales, dashboard city) | per rule | Active |
| Alert CTA | payroll / sales / approval / dashboard | per rule | Active |
| Quick link Approvals | `/approval` | — | Active |
| Quick link Payment instructions | `/payment-instructions` | — | Active |
| Quick link Disbursement | `/disbursement` | — | Active |
| AR Total Outstanding | `/working-capital` | WC settlement | Active |
| AR Client Funded | `/payroll?status=CLOSED` | CLOSED | Active |
| AR Working Capital Used | `/working-capital` | — | Active |
| AR Draft Funding Requirement | `/payroll?status=DRAFT` | DRAFT | Active |
| AR row (WC) | `/working-capital` | — | Active |
| AR row (period/draft) | `/payroll/[id]` | period | Active |

**Note:** List pages may not yet implement every query param server-side; links establish the navigation contract for progressive enhancement.
