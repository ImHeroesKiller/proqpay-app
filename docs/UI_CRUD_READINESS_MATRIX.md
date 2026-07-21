# UI · CRUD · Action Readiness Matrix

**Date:** 2026-07-21

Status: `USABLE` · `READ_ONLY` · `PARTIAL` · `MOCK` · `BROKEN` · `EMPTY_SHELL` · `MISSING`

---

## Navigation / page matrix

| Menu | Route | Purpose | Real data | CRUD | Actions | RBAC | Responsive | E2E | Status |
|------|-------|---------|:---------:|------|---------|:----:|:----------:|:---:|--------|
| Dashboard | `/dashboard` | Exec KPIs + map | Yes | — | Filters | Yes | Yes | Manual | PARTIAL (AR proxy) |
| Clients (commercial) | `/clients` | Client list | Yes | R | — | Confidential | Yes | — | READ_ONLY |
| Master Clients | `/admin/master-data/clients` | Billing client CRUD | Yes | CRU | Activate via status | master_data | Yes | Manual | USABLE |
| Projects | `/projects` | Project list | Yes | R | — | Yes | Yes | — | READ_ONLY |
| Sites | `/admin/master-data/sites` | Site CRUD | Empty | CRU | Status | master_data | Yes | — | USABLE (empty) |
| Pay Cycles | `/admin/master-data/pay-cycles` | Cycle CRUD + preview | Yes | CRU | Preview schedule | master_data | Yes | — | USABLE |
| Payroll Groups | `/admin/master-data/payroll-groups` | Group + assign | Yes | CRU | Assign employee | master_data | Yes | — | PARTIAL (UUID UX) |
| Employees | `/employees` | Directory | Yes | R | Create disabled | Yes | Yes | — | PARTIAL |
| Employee detail | `/employees/[id]` | Profile | Yes | R | — | Yes | Yes | — | READ_ONLY |
| Attendance | `/attendance` | Attendance list | Yes | R | — | Yes | Yes | — | READ_ONLY |
| Payroll periods | `/payroll` | Period list + create | Yes | CR | Preview/create | Yes | Yes | Manual | USABLE |
| Payroll detail | `/payroll/[id]` | Lines + workflow | Yes | R | Recalc/submit/PI/invoice | Yes | Yes | Manual | USABLE |
| Payroll Engine | `/payroll-engine` | Engine console | Empty | R | — (API only writes) | payroll | Yes | — | PARTIAL |
| Approvals | `/approval` | Period approvals | Yes | — | Approve/reject | approval | Yes | Manual | USABLE |
| Payment Instructions | `/payment-instructions` | PI list | Yes | R | Download CSV | Yes | Yes | Manual | USABLE |
| Payment Confirmation | `/payment-confirmation*` | Proof lifecycle | Yes | CRU | Upload/verify | Yes | Yes | Manual | USABLE |
| Disbursement | `/disbursement` | Batch monitor | Yes | R | — | Yes | Yes | — | READ_ONLY |
| Invoices | `/finance/invoices` | Invoice lifecycle | Yes (1) | R + transitions | Approve/issue | invoices | Yes | Manual | USABLE |
| Receivables | `/finance/receivables` | AR ledger | Yes (1) | R | — | receivables | Yes | Manual | USABLE |
| Client Payments | `/finance/payments` | Receipts | Yes (1) | C + verify | Create/allocate | client_payments | Yes | Manual | PARTIAL (single inv) |
| Collection | `/finance/collection` | Collection log | Empty | C | Log activity | collection | Yes | — | USABLE |
| Working Capital | `/working-capital` | WC monitor | Empty | R | Create disabled | WC | Yes | — | PARTIAL |
| Treasury | — | Cash accounts | — | — | — | module exists | — | — | **MISSING** |
| Capital Partners | `/capital-partners` | Partners | Empty | R | — | commercial | Yes | — | READ_ONLY |
| Capital Allocations | `/capital-allocations` | Allocations | Empty | R | — | commercial | Yes | — | READ_ONLY |
| Sales | `/sales` | Pipeline | Yes | R | — | commercial | Yes | — | READ_ONLY (non-core) |
| Pricing | `/pricing` | Pricing rules | Empty | R | — | commercial | Yes | — | READ_ONLY |
| Reports | `/reports` | Analytics | Yes | — | CSV export | Yes | Yes | — | PARTIAL |
| Audit | `/audit` | Audit trail | Yes | R | — | Yes | Yes | — | READ_ONLY |
| Settings | `/settings` | Org display | Yes | R | — | Yes | Yes | — | READ_ONLY |
| Roadmap | `/roadmap` | Coming soon cards | Static | — | — | Yes | Yes | — | MOCK |

---

## Entity action completeness

Legend: Y = present · P = partial · N = missing

| Entity | C | List | Detail | U | Act/Deact | Del/Arch | Search | Filter | Sort | Page | Import | Export | Bulk | Approve | Transition | Attach | Audit |
|--------|:-:|:----:|:------:|:-:|:---------:|:--------:|:------:|:------:|:----:|:----:|:------:|:------:|:----:|:-------:|:----------:|:------:|:-----:|
| Client | Y | Y | P | Y | Y | N | Y | P | P | P | N | N | N | N | lifecycle | N | Y |
| Project | N | Y | N | N | N | N | P | N | N | N | N | N | N | N | N | N | N |
| Site | Y | Y | N | Y | Y | N | Y | P | P | P | N | N | N | N | status | N | Y |
| Pay Cycle | Y | Y | P | Y | Y | N | Y | P | P | P | N | N | N | N | status | N | Y |
| Payroll Group | Y | Y | P | Y | Y | N | Y | P | P | P | N | N | N | N | status | N | Y |
| Assignment | Y | P | N | N | N | N | N | N | N | N | N | N | N | N | N | N | Y |
| Employee | N | Y | Y | N | N | N | Y | N | Y | Y | N | N | N | N | N | N | N |
| Attendance | N | Y | N | N | N | N | N | N | N | N | N | N | N | N | N | N | N |
| Payroll Period | Y | Y | Y | N | N | N | Y | N | Y | Y | N | P | N | via steps | Y | N | Y |
| Payroll Line | N | Y | N | via recalc | N | N | Y | N | Y | Y | N | CSV reg | N | N | N | N | P |
| Calculation | API | P | P | N | N | N | N | N | N | N | N | N | N | engine | engine | N | P |
| Payment Instruction | auto | Y | N | N | N | N | P | N | N | N | N | CSV | N | auto | status | N | Y |
| Confirmation | Y | Y | Y | N | N | N | P | P | N | N | N | N | N | verify | Y | Y | Y |
| Invoice | Y | Y | N | N | N | N | N | N | N | N | N | N | N | Y | Y | N | Y |
| Receivable | auto | Y | N | auto | N | N | N | N | N | N | N | N | N | N | auto | N | Y |
| Client Payment | Y | Y | N | N | N | N | N | N | N | N | N | N | N | verify | Y | N | Y |
| Collection Act | Y | Y | N | N | N | N | N | N | N | N | N | N | N | N | N | N | P |
| WC Request | N | Y | N | N | N | N | P | N | N | N | N | N | N | API | API | N | P |
| Treasury | API | API | N | API | N | N | N | N | N | N | N | N | N | N | N | N | Y |
| Component | API | eng | N | API | N | N | N | N | N | N | N | N | N | N | N | N | N |
| Tax/BPJS | N | N | N | N | N | N | N | N | N | N | N | N | N | N | N | N | N |
| Billing Profile | N | N | N | service | N | N | N | N | N | N | N | N | N | N | N | N | N |

### Rule for claiming FULLY_CONNECTED

Do **not** claim FULLY_CONNECTED when:

- critical create is disabled (Employee, WC, Project)  
- import gate missing (Attendance)  
- lock missing (Period)  
- commercial fee rules missing (Invoice)  

---

## API surface vs UI (gaps)

| Backend capability | UI |
|--------------------|-----|
| `/api/payroll/calculate|simulate|budget|formulas|components` | Engine page **display only** |
| `/api/financial/treasury` | **No page** |
| `/api/financial/working-capital` | **No actions** |
| `/api/financial/summary` | **No page** |
| billing-profile-service | **No route** |
| Project/Employee mutations | **No API** |
