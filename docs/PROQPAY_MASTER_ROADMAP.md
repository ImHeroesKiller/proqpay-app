# ProQPay Master Roadmap
## Enterprise Payroll Processing Platform

**Version:** 1.0  
**Date:** 2026-07-21  
**Branch baseline:** `feat/proqpay-enterprise-revamp`  
**Status after migration recovery:** Schema history valid · Financial Core applied · Payroll Engine applied · production data preserved  

---

## 1. Product positioning (non-negotiable)

| ProQPay IS | ProQPay IS NOT |
|------------|----------------|
| Enterprise **Payroll Processing** platform for outsourcing | HRIS (full people ops) |
| End-to-end: **ops data → payroll → billing → collection → payroll finance** | ATS / Recruitment (→ ProQHire) |
| Integration hub for attendance, HRIS, hire, leave | CRM / sales pipeline (→ CRM) |
| Invoice, AR, treasury, WC for **payroll cash cycle** | Full ERP / GL accounting (export journals only) |
| Employee **payroll** self-service | Performance management, learning, recruitment ESS |

### Canonical value chain

```text
Operational Data
       ↓
    Payroll
       ↓
    Billing
       ↓
   Collection
       ↓
 Payroll Finance
```

Every module must serve this chain. Features outside the chain are **out of product** or **integration-only**.

### Integration principle

> If data originates in another system, ProQPay builds **connectors / import / validation**, not a replacement product.

| Domain | System of record | ProQPay role |
|--------|------------------|--------------|
| Recruitment | ProQHire | Consume hire/placement payload (employee, project assignment) |
| Attendance / fingerprint / mobile | Attendance System | Import timesheet/attendance; exception queue |
| Leave | Leave System | Import leave that affects payroll |
| Master employee HR | HRIS (optional) | Sync employee demographics; ProQPay owns payroll-relevant fields |
| Sales pipeline | CRM | Optional commercial handoff; **no opportunity CRM** as core |
| General ledger | ERP / Accounting | Journal **export**, not full GL |

---

## 2. Current state inventory (as-built)

### 2.1 Strengths already in codebase

| Layer | Present |
|-------|---------|
| **Ops master (partial)** | Organization, Company, Branch, Department, Position, CostCenter, Project, ProjectAssignment, Employee, HolidayCalendar, ApprovalMatrix, BankAccount |
| **Payroll core (legacy + engine)** | PayrollPeriod, PayrollLine, ApprovalStep, PayrollComponent (+ engine columns), TaxConfig, BpjsConfig |
| **Payroll Engine (Phase 1B DB + API)** | Formulas, versions, calculations, items, snapshots, simulations, validations, approvals, revisions, journals, budgets, ClientBillingProfile, component categories |
| **Disbursement path** | DisbursementBatch, PaymentInstruction (+ items), PaymentConfirmation, generate-instruction API |
| **Financial Core (Phase 1A DB + API)** | Invoices, items, sequences, client payments, allocations, receivables, treasury, cash movements, collection activities/notes, WC approvals/settlements, funding sources, financial audits/attachments |
| **Working capital** | WorkingCapitalRequest + finance extensions |
| **Cross-cutting** | Role enum (incl. FINANCE_*, PAYROLL_MANAGER, CLIENT), AuditLog, AppNotification, multi-schema Prisma (`proqpay`) |
| **Migrate discipline** | `_prisma_migrations` baselined; `migrate deploy` ready |

### 2.2 Explicit non-core / borderline modules (watch list)

These exist but must not become product center of gravity:

| Module | Guidance |
|--------|----------|
| SalesOpportunity, PricingRule, capital partners/allocations UI | Keep only if they feed **billing / WC / funding** for payroll; do not expand into CRM |
| Clients page | Client = **Company** (client company) for payroll billing — not CRM account management |
| Attendance page | Must evolve into **import + exception** processor, not full attendance product |

### 2.3 Gap summary by master phase

| Phase | Theme | Maturity (as of roadmap date) |
|-------|--------|-------------------------------|
| 1 | Master Data | **~85%** (I1 shipped) — Client=`Company.entityKind`, Site, PayCycle, PayrollGroup, EmployeePayrollAssignment, period binding + admin UI/API; Shift Template still deferred |
| 2 | Contract & Billing Setup | **~25%** — ClientBillingProfile skeleton; no Service Contract / Headcount Agreement / SLA / amendment history |
| 3 | Operational Data Processing | **~20%** — AttendanceRecord model; no import wizard, exception queue, multi-source connectors |
| 4 | Payroll Processing | **~50%** — Engine + period/line + APIs; retro, THR, off-cycle, lock/closing incomplete |
| 5 | Employee Payout | **~40%** — instructions, confirmation, disbursement models; bank file formats, retry, payslip ESS incomplete |
| 6 | Client Billing | **~45%** — invoice model + API + workflow docs; tax invoice, CN/DN, delivery incomplete |
| 7 | Collection | **~40%** — AR, allocation, collection activity APIs; aging/DSO dashboards incomplete |
| 8 | Payroll Finance | **~45%** — treasury, WC, journal, budget models; margin/profitability/reconciliation incomplete |
| 9 | Employee Self Service | **~5%** — roles include CLIENT/employee paths thin |
| 10 | Executive Dashboard | **~50%** — dashboard exists with geo/filters; must rebind to true payroll→cash KPIs |
| AI | Assistants | **~0–10%** — not productized per module |

---

## 3. Domain architecture (target)

```text
┌──────────────────────────────────────────────────────────────────────────┐
│                         ProQPay Platform Shell                            │
│  RBAC · Audit · Notifications · Attachments · API · Import/Export · AI   │
└──────────────────────────────────────────────────────────────────────────┘
        │
        ├── ① Master Data & Config
        │      Company · Client · Project · Site · Cost Center · Position
        │      Payroll Group · Pay Cycle · Holiday · Shift · Bank
        │      Component · Formula · Tax · BPJS · Billing Profile · Approval
        │
        ├── ② Contract & Billing Rules
        │      Service Contract · Headcount · Billing/OT/Allowance rules
        │      SLA · Amendments · Client-specific payroll rules
        │
        ├── ③ Operational Intake
        │      Connectors · Import Wizard · Validation · Exception Queue
        │      → Operational Dataset (period-bound, approved)
        │
        ├── ④ Payroll Engine
        │      Run · Simulate · Validate · Approve · Lock · Retro · THR
        │      → Payroll Final (+ Journal)
        │
        ├── ⑤ Employee Payout
        │      Bank file · Disbursement · Status · Payslip · Notify
        │
        ├── ⑥ Client Billing
        │      Invoice draft → approve → deliver · CN/DN · Tax invoice
        │
        ├── ⑦ Collection
        │      AR · Aging · DSO · Reminder · Partial pay · Allocation
        │
        ├── ⑧ Payroll Finance
        │      Treasury · Funding · WC · Cashflow · Margin · Recon · Export
        │
        ├── ⑨ Employee Self-Service (payroll only)
        │
        └── ⑩ Executive Dashboards + AI Assistants
```

### Data ownership rules

| Data | Owner in ProQPay | Source of truth if external |
|------|------------------|-----------------------------|
| Payroll calculation results | ProQPay | — |
| Invoice / AR / collection | ProQPay | — |
| Attendance raw punches | External | Attendance system |
| Candidate pipeline | External | ProQHire |
| Chart of accounts / GL | External | ERP (ProQPay exports journals) |
| Employee bank for payout | ProQPay (payroll-critical) | May sync from HRIS |

---

## 4. Phase specifications

Each phase, when executed, **must** deliver:

1. Database schema (Prisma)  
2. Prisma migration (`migrate deploy` only)  
3. Backend API  
4. Business logic / domain services  
5. Frontend UI  
6. Dashboard widgets (where applicable)  
7. Permission matrix (Role × action)  
8. Testing (unit + API + critical E2E)  
9. Documentation (`docs/…`)  

**Non-functional baseline (every module):**  
Approval workflow (where state-changing) · RBAC · activity log · audit trail · attachment · notification · API · Excel import/export · bulk ops · search/filter · dashboard slice · responsive UI.

---

### PHASE 1 — Master Data

**Goal:** Foundations so every payroll run, invoice, and payout resolves clean dimensional context.

| Entity | Target capability | Current | Priority |
|--------|-------------------|---------|----------|
| Company | Multi-company org hierarchy, lifecycle | Exists | Harden |
| Client | Billing party (may = company type CLIENT) | Partial via companies/clients UI | **Clarify model** |
| Project | Billable / payroll scope | Exists | Harden |
| Site | Work location under project/client | **Gap** | Build |
| Cost Center | Cost allocation | Exists | Wire to payroll/invoice |
| Position | Role catalog for rates | Exists | Wire to components/rates |
| Payroll Group | Cohort for pay cycle | **Gap** | Build |
| Pay Cycle | Monthly / weekly / custom calendar | **Gap** (period exists ad-hoc) | Build |
| Holiday Calendar | OT/prorate rules | Exists | Engine integration |
| Shift Template | For OT / attendance mapping | **Gap** | Build (config only; not roster product) |
| BPJS / Tax Config | Per company | Exists | Versioned effective dates |
| Bank Configuration | Org/company payout banks | BankAccount exists | Standardize purpose |
| Payroll Component | Catalog | Exists + engine cols | Categories + formula link |
| Formula | Versioned expressions | Engine models exist | UI completeness |
| Billing Profile | Per client billing defaults | ClientBillingProfile | Expand fields |
| Approval Matrix | Configurable | Exists | Wire to payroll + invoice |

**Out of scope:** Org chart HRIS, job requisitions, performance grades.

**Exit criteria:**

- [ ] Site, PayrollGroup, PayCycle in schema + admin UI  
- [ ] All master entities CRUD with RBAC + audit  
- [ ] Period creation always tied to PayCycle + PayrollGroup  
- [ ] Docs: `docs/MASTER_DATA.md` + permission matrix  

---

### PHASE 2 — Contract & Billing Setup

**Goal:** Engine and invoice generator know **how to calculate and how to bill**.

| Capability | Notes |
|------------|--------|
| Service Contract | Client × company, effective dates, currency, tax, SLA refs |
| Headcount Agreement | Agreed HC / skill mix / rate cards |
| Billing Rules | Management fee, BPJS charge-out, markup, minimum fee |
| Overtime / Allowance / Deduction Rules | Client-specific overrides to components/formulas |
| SLA | Payroll calendar deadlines, invoice due days (TOP) |
| Amendment History | Versioned changes with effective dating |
| Client-specific Payroll Rules | Override defaults without forking global formulas |

**Depends on:** Phase 1 (Client, Project, Billing Profile, components, formulas).

**Exit criteria:**

- [ ] Contract version selected on PayrollCalculation + Invoice  
- [ ] Simulation respects contract rules  
- [ ] Invoice line kinds driven by contract billing rules  
- [ ] Docs: `docs/SERVICE_CONTRACT.md`  

**Out of scope:** CRM opportunity stages, proposal quoting tools (except frozen rate card on contract).

---

### PHASE 3 — Operational Data Processing

**Goal:** Trusted **Operational Dataset** ready for payroll — not an attendance product.

| Capability | Notes |
|------------|--------|
| Sources | Attendance, mobile, fingerprint, timesheet, leave, HRIS, ProQHire, Excel, CSV, API |
| Import Wizard | Map columns → canonical schema |
| Validation | Required fields, ranges, calendar, employment status |
| Duplicate Detection | Same employee × date × source |
| Missing Attendance / Employee | Exception generation |
| Data Correction | Controlled edit with audit |
| Exception Queue | Resolve / reassign / approve |
| Approval | Lock dataset for period |
| Audit Trail | Full lineage source → final |

**Canonical output entity (target):** `OperationalDataset` + `OperationalDatasetLine` (period, company, project/site, employee, pay elements inputs).

**Exit criteria:**

- [ ] At least Excel + API + one attendance connector  
- [ ] Exception queue UI with approval gate before payroll run  
- [ ] Payroll run **cannot** start without approved dataset (configurable)  
- [ ] Docs: `docs/OPERATIONAL_INTAKE.md`  

**Out of scope:** Fingerprint device management, leave request workflow, hiring workflow.

---

### PHASE 4 — Payroll Processing

**Goal:** **Payroll Final** via engine already deployed.

| Capability | Status guidance |
|------------|-----------------|
| Payroll Run | Bind period + group + contract + dataset → calculation |
| Simulation | Exists API — productize UI |
| Validation / Error Center | Exists models — unify Error Center UX |
| Approval Workflow | Engine + legacy ApprovalStep — consolidate |
| Retroactive / Off-cycle | **Gap** |
| THR / Bonus | Component + special run types |
| BPJS / PPh21 | Config exists — harden calc + statutory reports |
| Loan / Deduction | Component types + balances (**careful scope**) |
| Multi company / project / group | Required |
| Closing / Lock | Status machine + immutability |

**Exit criteria:**

- [ ] Locked calculation produces immutable snapshot + journal  
- [ ] Retro creates revision linked to original  
- [ ] Error Center resolves blockers before approve  
- [ ] Docs: extend `PAYROLL_ENGINE_ARCHITECTURE.md`  

---

### PHASE 5 — Employee Payout

**Goal:** Money to employees with traceable status.

| Capability | Notes |
|------------|--------|
| Bank Transfer File | Multi-bank formats (BCA, Mandiri, BRI, etc.) |
| Virtual Account | Optional funding channel |
| Disbursement | Batch from locked payroll |
| Payment Status / Failed / Retry | State machine on instruction items |
| Payslip | PDF + storage; employee-facing later in Phase 9 |
| Notification | SMS/email/app |
| Payroll History | Per employee pay archive |

**Leverage:** PaymentInstruction, PaymentConfirmation, DisbursementBatch.

**Exit criteria:**

- [ ] Bank file download from approved instruction  
- [ ] Confirmation reconcile against instruction items  
- [ ] Failed item retry without reopening payroll  
- [ ] Docs: `docs/PAYOUT.md`  

---

### PHASE 6 — Client Billing

**Goal:** **Invoice ready to send** from payroll + contract rules.

| Capability | Notes |
|------------|--------|
| Draft → Generate → Approve → Issue | InvoiceStatus already modeled |
| Tax Invoice | e-Faktur metadata (integration) |
| Billing Adjustment / Debit / Credit Note | New document types or invoice kinds |
| Delivery | Email / portal / API |
| Status + History | Full audit |

**Leverage:** Invoice, InvoiceItem, InvoiceSequence, ClientBillingProfile.

**Exit criteria:**

- [ ] One active invoice rule per payroll period (index already exists)  
- [ ] Invoice amounts reconcile to journal / calculation within tolerance  
- [ ] Docs: extend `INVOICE_WORKFLOW.md`  

---

### PHASE 7 — Collection

**Goal:** Invoice → **Cash**.

| Capability | Notes |
|------------|--------|
| AR | Receivable model exists |
| Collection activity / notes | Exists |
| Reminder | Scheduled notifications |
| Aging / DSO | Metrics + dashboard |
| Partial payment + allocation | ClientPayment + PaymentAllocation |
| Collection dashboard | Role-gated finance |

**Exit criteria:**

- [ ] Payment allocation updates receivable + invoice status  
- [ ] Aging buckets accurate to rules in `RECEIVABLE_RULES.md`  
- [ ] Docs: collection runbook  

---

### PHASE 8 — Payroll Finance

**Goal:** Fund payroll, track margin, export to ERP.

| Capability | Notes |
|------------|--------|
| Treasury / cash movements | Models exist |
| Working capital | Request + approval + settlement |
| Payroll funding | Link period funding status ↔ treasury/WC |
| Cashflow / margin / profitability | Analytical layer by client/project |
| Budget | PayrollBudget models |
| Reconciliation | Bank vs instruction vs confirmation |
| Journal export | To ERP (file/API) — not full GL |

**Exit criteria:**

- [ ] Funding readiness gate before disbursement  
- [ ] Margin view: payroll cost vs invoice vs collection  
- [ ] Journal export for locked periods  
- [ ] Docs: extend `FINANCIAL_ARCHITECTURE.md`, `TREASURY_MODEL.md`, `WORKING_CAPITAL.md`  

---

### PHASE 9 — Employee Self Service (payroll only)

| In scope | Out of scope |
|----------|--------------|
| Payslip, payroll history | Recruitment, apply jobs |
| Tax slip (1721-A1 meta), BPJS view | Performance reviews |
| Loan balance (payroll deductions) | LMS, OKR |
| Reimbursement **if payroll-paid** | Full expense ERP |
| Bank account for salary | Profile social |
| Payroll ticket / inquiry | HR case management full suite |
| Payroll AI assistant | Career coach AI |

**Exit criteria:**

- [ ] Employee role can view own payslips only (row-level security)  
- [ ] Ticket → ops queue without exposing finance admin  

---

### PHASE 10 — Executive Dashboard

| Slice | KPIs |
|-------|------|
| Operational | Employees processed, accuracy, cycle time, exception rate |
| Financial | Payroll value, invoice, collection, margin, cashflow, outstanding |
| Client | SLA, billing status, aging, DSO |
| Management | Branch, region, client, project, profitability |

**Rule:** Every widget must drill to operational entity (period, invoice, receivable) — no vanity metrics.

**Exit criteria:**

- [ ] Widgets powered by Financial Core + Payroll Engine + ops intake metrics  
- [ ] Filter consistency (company/client/period) documented  

---

### AI Assistants (cross-cutting)

| Assistant | Duties |
|-----------|--------|
| Operational AI | Validate imports, anomaly, suggest correction |
| Payroll AI | Explain components, detect errors, simulation narrative |
| Finance AI | Collection risk, invoice risk, cashflow forecast |
| Executive AI | Summary, anomaly, recommendation |

**Implementation principle:** AI **recommends**; humans **approve**. Every AI action audited. Prefer SpaceXAI/provider abstraction per platform standards.

---

## 5. Recommended build sequence (execution order)

Do **not** build phases in pure numeric order if dependencies block value. Use this **program increments**:

| Increment | Focus | Why first |
|-----------|--------|-----------|
| **I0** | Platform hygiene | Migrations, RBAC matrix, audit conventions, no CRM expansion | ✅ Done-ish (migrate recovery) |
| **I1** | Master Data completeness (Phase 1 gaps) | Site, PayrollGroup, PayCycle, client model clarity | Unblocks everything |
| **I2** | Contract & billing rules (Phase 2 MVP) | Engine + invoice need rules | Unblocks correct billing |
| **I3** | Payroll processing hardening (Phase 4) | Lock, error center, multi-group, THR path | Core product value |
| **I4** | Operational intake MVP (Phase 3) | Excel + exception queue | Data quality |
| **I5** | Payout completeness (Phase 5) | Bank files, retry, payslip gen | Close payroll loop |
| **I6** | Billing + Collection depth (Phase 6–7) | Issue, CN/DN, aging, allocation UX | Cash conversion |
| **I7** | Payroll finance analytics (Phase 8) | Margin, funding gates, journal export | Executive trust |
| **I8** | ESS + AI + Dashboard polish (Phase 9–10 + AI) | Differentiation | Scale |

---

## 6. Permission matrix (baseline roles)

Existing roles include:  
`SUPER_ADMIN`, `PAYROLL_ADMIN`, `PAYROLL_OPERATOR`, `FINANCE`, `FINANCE_MANAGER`, `FINANCE_STAFF`, `PAYROLL_MANAGER`, `HR`, `DIRECTOR`, `APPROVER`, `AUDITOR`, `VIEWER`, `CLIENT`

| Domain | Primary roles | Note |
|--------|---------------|------|
| Master data | SUPER_ADMIN, PAYROLL_ADMIN | HR read limited |
| Contract/billing setup | PAYROLL_MANAGER, FINANCE_MANAGER | Dual control |
| Operational intake | PAYROLL_OPERATOR, APPROVER | |
| Payroll run/approve | OPERATOR → MANAGER → DIRECTOR | Segregation of duties |
| Payout | FINANCE_STAFF execute; FINANCE_MANAGER approve | |
| Invoice | FINANCE_* | |
| Collection | FINANCE_STAFF / MANAGER | |
| Treasury / WC | FINANCE_MANAGER, DIRECTOR | |
| ESS | employee identity (future role or CLIENT portal) | Own records only |
| Audit | AUDITOR, SUPER_ADMIN | Read-all |

*Detailed matrix per phase lives in each phase doc when implemented.*

---

## 7. Technical standards

| Area | Standard |
|------|----------|
| Schema | Prisma multiSchema `proqpay` only for product tables |
| Migrations | **Only** `prisma migrate deploy` in shared envs; never `migrate reset` / `db push --force-reset` on prod |
| API | Route handlers under `app/api/*`; domain services in `lib/` |
| Money | `Decimal(18,2)`; never float |
| Dates | Explicit TZ policy (Asia/Jakarta for Indonesian payroll) |
| Idempotency | Invoice number, payment allocation, bank file generation |
| Soft boundaries | No `DROP` without versioned forward migration + approval |
| Testing | API tests for money paths; golden files for formula engine |
| Docs | One primary doc per phase deliverable |

---

## 8. Anti-goals (kill list)

Do **not** build inside ProQPay:

- Candidate pipeline, job posting, interview scheduling  
- Full CRM opportunities, deals, email sequences  
- Full HRIS: org design, performance, learning, discipline cases (except payroll-impact flags)  
- Device management for fingerprint hardware  
- Full accounting GL, fixed assets, AP for vendors outside payroll chain  
- Social intranet, chat product  

If sales/pricing entities remain, they must be justified only as **inputs to contract rates or WC**, and must not grow CRM UX.

---

## 9. Success metrics (product)

| Metric | Definition |
|--------|------------|
| Payroll cycle time | Dataset approved → payroll locked |
| Exception rate | Exceptions / employees processed |
| Payroll accuracy | Post-lock corrections / period |
| Invoice lag | Payroll lock → invoice issued |
| DSO | Days sales outstanding |
| Collection rate | Collected / issued (period) |
| Funding readiness | % periods funded before disbursement date |
| Margin visibility | % invoices with linked payroll cost |

---

## 10. Immediate next step (recommended)

**Increment I1 — Master Data completion:** shipped (see `docs/MASTER_DATA.md`, migration `20260721_master_data_i1`).

**Next: Increment I2 — Contract & Billing Rules MVP**

1. Service Contract + effective dating + amendment history.  
2. Headcount / billing / OT / allowance rules bound to Client + PayrollGroup.  
3. Wire invoice + payroll engine to contract version.  
4. Docs: `docs/SERVICE_CONTRACT.md`.

---

## 11. Traceability to existing docs

| Topic | Existing doc |
|-------|----------------|
| Financial domain | `FINANCIAL_DOMAIN_MODEL.md`, `FINANCIAL_ARCHITECTURE.md` |
| Invoice | `INVOICE_WORKFLOW.md` |
| Receivables | `RECEIVABLE_RULES.md`, `ACCOUNT_RECEIVABLE_*` |
| Treasury / WC | `TREASURY_MODEL.md`, `WORKING_CAPITAL.md` |
| Payroll engine | `PAYROLL_ENGINE_ARCHITECTURE.md`, `PAYROLL_*` |
| Billing profile | `BILLING_PROFILE.md` |
| Migrations | `PRISMA_MIGRATION_RECOVERY.md` |

This master roadmap is the **north star**. Phase docs refine; they must not contradict positioning in §1.

---

## 12. One-line north star

> **ProQPay is the system of record for outsourcing payroll processing and its cash cycle — from trusted operational inputs through payroll final, client invoice, collection, and payroll finance — integrating with Hire, Attendance, HRIS, CRM, and ERP without replacing them.**
