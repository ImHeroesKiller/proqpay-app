# ProQPay Capability Traceability Matrix

**Date:** 2026-07-21 · Branch `feat/proqpay-enterprise-revamp` · Schema `proqpay`

Status legend:

| Code | Meaning |
|------|---------|
| FULLY_CONNECTED | Schema + migration + backend + validation + RBAC + real frontend + audit (E2E may be partial) |
| PARTIALLY_CONNECTED | Some layers present; flow incomplete |
| DATABASE_ONLY | Model exists; little/no app use |
| BACKEND_ONLY | API/service without usable UI |
| FRONTEND_MOCK | UI without real persistence (none material for ops pages) |
| BROKEN | Intended path fails |
| NOT_IMPLEMENTED | Missing |
| OUT_OF_SCOPE | Explicitly non-product |

---

## Master Data

| Capability | DB Model | Migration | Backend Files | API | Frontend Files | RBAC | Tests | Status |
|------------|----------|-----------|---------------|-----|----------------|------|-------|--------|
| Client (Company CLIENT) | `companies` | master_data_i1 + base | `lib/master-data/service.ts` | `/api/master-data/clients` | `admin/master-data/clients`, `clients-master-client` | `canMasterData` | test-master-data | FULLY_CONNECTED |
| Project | `projects` | base | `lib/data/org.ts` list | — | `/projects` read | module | — | PARTIALLY_CONNECTED |
| Site | `sites` | master_data_i1 | service create/update | `/api/master-data/sites` | `admin/master-data/sites` | canMasterData | test-master-data | FULLY_CONNECTED (0 rows) |
| Position | `positions` | base | org list only | — | via org structure | — | — | DATABASE_ONLY / READ |
| Cost Center | `cost_centers` | base | org list | — | — | — | — | DATABASE_ONLY / READ |
| Pay Cycle | `pay_cycles` | master_data_i1 | service + pay-cycle math | `/api/master-data/pay-cycles` | pay-cycles admin | canMasterData | test-master-data | FULLY_CONNECTED |
| Payroll Group | `payroll_groups` | master_data_i1 | service | `/api/master-data/payroll-groups` | payroll-groups admin | canMasterData | test-master-data | FULLY_CONNECTED |
| Employee Assignment | `employee_payroll_assignments` | master_data_i1 | `assignEmployee` | POST groups `action=assign` | assign form on groups | PAYROLL_GROUP_MANAGE | test-master-data | FULLY_CONNECTED |
| Employee | `employees` | base | `lib/data/queries.ts` | — | list/detail; create disabled | module | — | PARTIALLY_CONNECTED |
| Payroll Component | `payroll_components` | base+engine | component-service | `/api/payroll/components` | engine page read | payroll module | test-payroll-engine | PARTIALLY_CONNECTED |
| Tax Config | `tax_configs` | base | used in recalculate defaults | — | — | — | — | DATABASE_ONLY (0 rows) |
| BPJS Config | `bpjs_configs` | base | recalculate defaults | — | — | — | — | DATABASE_ONLY (0 rows) |
| Holiday Calendar | `holiday_calendars` | base | seed only | — | — | — | — | DATABASE_ONLY |
| Approval Matrix | `approval_matrices` | base | submitPayrollForApproval | — | — | — | — | PARTIALLY_CONNECTED |
| Client Billing Profile | `client_billing_profiles` | payroll_engine | billing-profile-service | **none** | include on client get | — | — | BACKEND_ONLY / orphan service |

---

## Operational Intake

| Capability | DB Model | Migration | Backend | API | Frontend | RBAC | Tests | Status |
|------------|----------|-----------|---------|-----|----------|------|-------|--------|
| Attendance Record | `attendance_records` | base | listAttendance | — | `/attendance` read | attendance | — | PARTIALLY_CONNECTED |
| Timesheet import | — | — | — | — | — | — | — | NOT_IMPLEMENTED |
| OT handling | fields on attendance | base | not in calc path | — | display only | — | — | PARTIALLY_CONNECTED |
| Exception queue | — | — | — | — | — | — | — | NOT_IMPLEMENTED |
| Locking attendance | `is_locked` | base | field only | — | — | — | — | DATABASE_ONLY |

---

## Payroll Processing

| Capability | DB Model | Migration | Backend | API | Frontend | RBAC | Tests | Status |
|------------|----------|-----------|---------|-----|----------|------|-------|--------|
| Payroll Period | `payroll_periods` | base+i1 | master-data create + queries | payroll-periods | `/payroll` | period create + module | test-master-data | FULLY_CONNECTED |
| Payroll Lines | `payroll_lines` | base | recalculate | recalculate | detail table | session | — | FULLY_CONNECTED |
| Payroll Calculation | `payroll_calculations` | payroll_engine | calculation-service | `/api/payroll/calculate` | engine read | payroll | test-payroll-engine | PARTIALLY_CONNECTED (0 prod rows) |
| Calculation Items | `payroll_calculation_items` | payroll_engine | calc service | validate | engine | payroll | domain | PARTIALLY_CONNECTED |
| Formula / Version | formulas + versions | payroll_engine | formula-service | `/api/payroll/formulas` | engine read | payroll | domain | PARTIALLY_CONNECTED |
| Validation | `payroll_validations` | payroll_engine | validation-engine | `/api/payroll/validate` | engine list | payroll | domain | PARTIALLY_CONNECTED |
| Engine Approval | `payroll_approvals` + steps | payroll_engine | approval-service | `/api/payroll/approval` | engine display | payroll/approval | domain | PARTIALLY_CONNECTED |
| Legacy Approval | `approval_steps` | base | payroll/actions | `/api/payroll/approve` | `/approval` | session + roles | — | FULLY_CONNECTED |
| Revision | `payroll_revisions` | payroll_engine | revision-service | `/api/payroll/revisions` | engine | payroll | domain | PARTIALLY_CONNECTED |
| Snapshot | `payroll_snapshots` | payroll_engine | created on calc | no read API | — | — | — | PARTIALLY_CONNECTED |
| Journal | `payroll_journals` | payroll_engine | on calc | GET journal | engine | payroll | domain | PARTIALLY_CONNECTED |
| Budget | `payroll_budgets` | payroll_engine | budget-service | `/api/payroll/budget` | engine read | payroll | domain | PARTIALLY_CONNECTED |
| Lock / Close | status fields | base | guards only | **no lock API** | — | — | — | PARTIALLY_CONNECTED |

---

## Employee Payout

| Capability | DB Model | Migration | Backend | API | Frontend | RBAC | Tests | Status |
|------------|----------|-----------|---------|-----|----------|------|-------|--------|
| Bank Account | `bank_accounts` | base | queries / PI gen | — | settings/list | — | — | PARTIALLY_CONNECTED |
| Payment Instruction | `payment_instructions` | base | generatePaymentInstruction | generate-instruction | list + payroll action | session | — | FULLY_CONNECTED |
| PI Items | `payment_instruction_items` | base | generate | download CSV | list | session | — | FULLY_CONNECTED |
| Payment Confirmation | `payment_confirmations` | payment_confirmation | confirmations.ts | upload/verify | full UI | role in service | — | FULLY_CONNECTED |
| Confirmation Files | `payment_confirmation_files` | payment_confirmation | storage + create | upload | upload form | roles | — | FULLY_CONNECTED |
| Failed item / retry | item status enum | base | partial | — | — | — | — | PARTIALLY_CONNECTED |
| Disbursement batch | `disbursement_batches` | base | queries | — | `/disbursement` | module | — | PARTIALLY_CONNECTED |
| Payslip | — | — | — | — | — | — | — | NOT_IMPLEMENTED |

---

## Client Billing

| Capability | DB Model | Migration | Backend | API | Frontend | RBAC | Tests | Status |
|------------|----------|-----------|---------|-----|----------|------|-------|--------|
| Invoice | `invoices` | financial_core | invoice-service | GET/POST invoices | `/finance/invoices` + from period | canManageInvoices | financial unit + smoke | FULLY_CONNECTED |
| Invoice Items | `invoice_items` | financial_core | create with invoice | via POST | — | same | smoke | FULLY_CONNECTED |
| Invoice Sequence | `invoice_sequences` | financial_core | on ISSUE | internal | — | — | smoke | PARTIALLY_CONNECTED |
| Approve / Issue | status machine | financial_core | transitionInvoiceStatus | `/transition` | invoices UI | canManageInvoices | unit + smoke | FULLY_CONNECTED |
| Period linkage | `payroll_period_id` | financial_core | gate + unique open inv | fromPayrollPeriod | payroll actions | invoices | smoke | FULLY_CONNECTED |

---

## Collection

| Capability | DB Model | Migration | Backend | API | Frontend | RBAC | Tests | Status |
|------------|----------|-----------|---------|-----|----------|------|-------|--------|
| Receivable | `receivables` | financial_core | upsert on issue/pay | GET | `/finance/receivables` | receivables | smoke | FULLY_CONNECTED |
| Client Payment | `client_payments` | financial_core | payment-service | GET/POST | `/finance/payments` | client_payments | smoke | FULLY_CONNECTED |
| Payment Allocation | `payment_allocations` | financial_core | verifyAndAllocate | POST verify | payments UI | client_payments | smoke | FULLY_CONNECTED |
| Collection Activity | `collection_activities` | financial_core | collection-service | GET/POST | `/finance/collection` | collection | — | FULLY_CONNECTED |
| Collection Notes | `collection_notes` | financial_core | via activity note | POST | optional note field | collection | — | PARTIALLY_CONNECTED |
| Aging | fields + rules | financial_core | receivable-rules | GET | receivables UI | — | unit | PARTIALLY_CONNECTED |

---

## Payroll Finance

| Capability | DB Model | Migration | Backend | API | Frontend | RBAC | Tests | Status |
|------------|----------|-----------|---------|-----|----------|------|-------|--------|
| WC Request | `working_capital_requests` | base+finance | queries | approve/settle only | list; create disabled | WC module | — | PARTIALLY_CONNECTED |
| WC Approval | `working_capital_approvals` | financial_core | WC service | POST WC | — | WC | — | BACKEND_ONLY |
| Capital Partner | `capital_partners` | base | queries | — | read | commercial | — | PARTIALLY_CONNECTED |
| Capital Allocation | `capital_allocations` | base | queries | — | read | commercial | — | PARTIALLY_CONNECTED |
| Settlement | `working_capital_settlements` | financial_core | WC service | POST settle | — | WC | — | BACKEND_ONLY |
| Funding Source | `funding_sources` | financial_core | model | — | — | — | — | DATABASE_ONLY |
| Treasury Account | `treasury_accounts` | financial_core | treasury-service | GET/POST treasury | — | canViewTreasury | — | BACKEND_ONLY |
| Cash Movement | `cash_movements` | financial_core | treasury-service | POST treasury | — | treasury | — | BACKEND_ONLY |
| Financial Audit | `financial_audits` | financial_core | recordFinancialAudit | via services | — | — | smoke creates | PARTIALLY_CONNECTED |
| Journal export | payroll_journals | engine | GET journal | API | engine | payroll | — | PARTIALLY_CONNECTED |

---

## Dashboard & Cross-cutting

| Capability | DB Model | Backend | API | Frontend | Status |
|------------|----------|---------|-----|----------|--------|
| Executive dashboard KPIs | periods, employees, WC, sales | executive-dashboard.ts | — | `/dashboard` | PARTIALLY_CONNECTED (AR proxy) |
| Financial summary | invoices, AR, treasury | summary.ts | `/api/financial/summary` | **no dedicated UI** | BACKEND_ONLY |
| Audit log | `audit_logs` | queries + master audit | — | `/audit` | PARTIALLY_CONNECTED |
| App notifications | `app_notifications` | confirmations path | — | topbar partial | PARTIALLY_CONNECTED |
| Sales / Pricing | opportunities, pricing_rules | queries | — | read-only pages | OUT_OF_SCOPE / thin |

---

## Status counts (primary capabilities above)

| Status | Approx count |
|--------|-------------:|
| FULLY_CONNECTED | 18 |
| PARTIALLY_CONNECTED | 28 |
| BACKEND_ONLY | 6 |
| DATABASE_ONLY | 8 |
| NOT_IMPLEMENTED | 4 |
| OUT_OF_SCOPE | 2 |

*Counts are approximate for prioritization, not a formal metric.*
