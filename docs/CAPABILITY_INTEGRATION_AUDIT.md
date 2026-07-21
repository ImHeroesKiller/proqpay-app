# ProQPay Capability Integration Audit

**Date:** 2026-07-21  
**Branch:** `feat/proqpay-enterprise-revamp`  
**Database:** Supabase PostgreSQL · schema `proqpay`  
**Auditor role:** Principal Full-Stack / Prisma / Next.js / QA  
**Production data:** Preserved (no migrate reset, no destructive DDL)

---

## 1. Executive Summary

### Verdict

**⚠️ PROQPAY CAPABILITY INTEGRATION PARTIAL**

| Question | Answer |
|----------|--------|
| Database connected to backend? | **Yes** for core payroll ops + master I1 + financial services. Many models remain **DATABASE_ONLY** or RSC-read-only. |
| Backend connected to frontend? | **Partial.** Ops payroll path and master-data I1 are UI-wired. Financial core APIs were **API-only** until this audit’s finance UI. Engine write APIs still lack interactive UI. |
| Payroll-to-cash E2E? | **Service-level YES** (smoke 2026-07-21). **Browser E2E not fully automated.** Legacy path: period → PI → confirmation is UI-real; billing→collection was empty in production until smoke. |
| Still mock / DB-only? | No operational page uses seed mock arrays. Gaps are **read-only UI**, **API-only**, **DATABASE_ONLY** masters, and **proxy AR** on dashboard. |

### Production row snapshot (pre-smoke financials were zero)

| Model | Count | Notes |
|-------|------:|-------|
| organization | 1 | |
| company | 5 | |
| user | 6 | |
| employee | 54 | |
| project | 5 | |
| site | **0** | UI/API exist; no production sites |
| pay_cycle | 5 | |
| payroll_group | 5 | |
| employee_payroll_assignment | 48 | |
| payroll_period | 5 | 4 CLOSED, 1 DRAFT; all bound to group+cycle |
| payroll_line | 130 | |
| payment_instruction | 4 | |
| payment_confirmation | 4 | |
| invoice / receivable / client_payment | **0 → 1** after controlled smoke | |
| payroll_calculation / formula | **0** | Engine unused in prod data |
| tax_config / bpjs_config / holiday | **0** | Recalc uses code defaults |
| working_capital_request | 0 | |
| treasury_account / cash_movement | 0 | |

### Smoke evidence (service chain)

```text
CLOSED period "Juli 2026"
→ createDraftInvoice
→ PENDING_APPROVAL → APPROVED → ISSUED (AR opened)
→ createClientPayment + verifyAndAllocatePayment
→ invoiceStatus=PAID, receivableStatus=COLLECTED, outstanding=0
Invoice: INV-2026-07-000001
```

Script: `scripts/smoke-payroll-to-cash.ts`

---

## 2. Audit Scope

In scope: Master Data → Ops Intake → Payroll → Payout → Billing → Collection → Payroll Finance → Dashboard.

Out of scope: Recruitment, full HRIS, CRM expansion, attendance device mgmt, full GL.

---

## 3. Architecture Map

```text
┌─────────────────────────────────────────────────────────────┐
│ Next.js App Router (RSC pages + client fetch)               │
│  requireModule (page) · canAccessModule / canMasterData     │
└────────────────────────────┬────────────────────────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        ▼                    ▼                    ▼
 lib/data/* (RSC Prisma)   app/api/*            lib/* services
 queries, dashboard,       master-data,         master-data/service
 confirmations, org        payroll, financial   financial/*
                                                payroll/actions
                                                payroll-engine/*
        └────────────────────┬────────────────────┘
                             ▼
                    Prisma Client → proqpay schema
```

**Two parallel payroll stacks**

1. **Legacy ops:** `PayrollPeriod` + `PayrollLine` + `ApprovalStep` → PI → Confirmation  
2. **Engine 1B:** `PayrollCalculation` + formulas/validations/journal — **not writing PayrollLine**; PI generation uses period lines only.

---

## 4. Database Capability Matrix (summary)

Full model↔layer matrix: `docs/CAPABILITY_TRACEABILITY_MATRIX.md`.

| Domain | DB readiness | App usability |
|--------|-------------:|---------------|
| Master I1 (client/site/cycle/group/assign) | High | High (site empty data) |
| Org structure (branch/dept/position/CC) | Medium | Read-only RSC |
| Payroll period/lines/approval/PI/confirm | High | High (legacy path) |
| Payroll engine | High schema | Low usage (0 rows; UI read-only) |
| Billing / AR / payment | High schema | **Was backend-only; UI added this audit** |
| WC / treasury / capital | Medium | Read-only or approve API only |
| Attendance | Low | Read-only list |

---

## 5. Backend Coverage

- **~29** API route files  
- **Zod on APIs:** 0 (manual validation)  
- **Tenant helpers** `companyWhere` / `assertCompanyAccess` used mainly in RSC `lib/data/*`, not consistently on APIs  
- **Strengths:** master-data service rules (overlap, effective dates), invoice status machine, payment allocation rules, confirmation verify path, financial audit append  
- **Weaknesses:** legacy payroll routes auth-only (no module check); engine routes accept calculationId without company assert; billing-profile service **no API**

---

## 6. Frontend Coverage

| Area | Status |
|------|--------|
| Master data admin CRUD | REAL |
| Payroll list/detail actions | REAL |
| Approvals / PI download / confirmation | REAL |
| Finance invoices / AR / payments / collection | **REAL (added this audit)** |
| Payroll engine | PARTIAL (read-only) |
| Employees create/upload | Disabled |
| WC create / approve UI | Disabled / missing |
| Attendance write/import | Missing |
| Dashboard AR widget | **Proxy** (not invoice ledger) |
| Roadmap | COMING_SOON static |

Navigation now includes Finance: Invoices, Receivables, Client Payments, Collection.

---

## 7. End-to-End Flow

### Connection traces (critical actions)

| # | Action | Path | Status |
|---|--------|------|--------|
| 1 | Create Site | `/admin/master-data/sites` → POST `/api/master-data/sites` → `createSite` | FULLY CONNECTED (data empty) |
| 2 | Create Pay Cycle | UI → POST pay-cycles API | FULLY CONNECTED |
| 3 | Create Payroll Group | UI → POST payroll-groups | FULLY CONNECTED |
| 4 | Assign Employee | UI form → POST `action=assign` | **FULLY CONNECTED (UI added)** |
| 5 | Create Payroll Period | `/payroll` CreatePeriodForm → POST payroll-periods | FULLY CONNECTED |
| 6 | Attendance input | `/attendance` list only | DATABASE_ONLY / READ_ONLY |
| 7 | Run calculation | Engine API / legacy recalculate | PARTIAL (engine unused; legacy REAL) |
| 8 | Resolve errors | Engine validations API; no validation center UI | PARTIAL |
| 9 | Approve payroll | `/approval` → POST `/api/payroll/approve` | FULLY CONNECTED (legacy) |
| 10 | Lock payroll | Status field; **no lock API** | PARTIAL |
| 11 | Generate PI | Payroll detail → generate-instruction | FULLY CONNECTED |
| 12 | Confirm payment | Upload + verify APIs + UI | FULLY CONNECTED |
| 13 | Generate invoice | Payroll detail → `fromPayrollPeriod` + Finance UI | **FULLY CONNECTED (this audit)** |
| 14 | Approve/issue invoice | Finance invoices UI → transition API | FULLY CONNECTED |
| 15 | Record client payment | Finance payments UI | FULLY CONNECTED |
| 16 | Allocate payment | Verify + allocate on payments UI | FULLY CONNECTED |
| 17 | Update receivable | Auto on issue/allocate | FULLY CONNECTED (service) |
| 18 | Close cycle | Status CLOSED in data; no formal close workflow API | PARTIAL |

### Broken / thin links

1. Engine calc ↛ PayrollLine ↛ PI (chain break if only engine used)  
2. Tax/BPJS config tables empty → defaults in code  
3. Site count 0 → groups/periods without location dimension  
4. Dashboard AR still proxy formulas, not `receivables` table  
5. Disbursement batches display-only  
6. WC request create disabled; capital partner/allocation read-only  
7. No payslip / bank file formats beyond CSV download  

---

## 8. Security Findings

| Severity | Finding | Notes |
|----------|---------|-------|
| **HIGH** | Financial POST previously accepted body `organizationId`/`companyId` without binding session | **Mitigated:** `lib/financial/tenant.ts` + invoice/payment/collection routes |
| **HIGH** | Engine routes: calculationId without company membership check | Residual IDOR risk for multi-tenant company users |
| **MEDIUM** | Legacy `/api/payroll/submit|approve|recalculate|generate-instruction` — session only, no `canAccessModule` | Service does company check for non-SUPER_ADMIN |
| **MEDIUM** | SUPER_ADMIN with null companyId lists unscoped financial entities | Operational convenience; document for prod |
| **MEDIUM** | Demo credentials / password on login UI | Known sandbox risk |
| **LOW** | No Zod on APIs | Mass-assignment / type coercion risk |
| **LOW** | AV scan placeholder on payment proof | Documented |
| **OK** | Page `requireModule`, bcrypt passwords, payment proof signed storage pattern | |

---

## 9. Data Integrity Findings (read-only SQL/Prisma)

| Check | Result |
|-------|--------|
| Payroll periods without group | **0** |
| Payroll periods without pay cycle | **0** |
| Active employees without active assignment | **0** |
| Payroll lines orphan employee | **0** |
| Invoice vs receivable mismatch | N/A pre-smoke; smoke consistent (COLLECTED/0) |
| Sites | **0** (gap) |
| Tax/BPJS configs | **0** (gap) |
| Engine calculations | **0** (gap) |

No automatic repair performed.

---

## 10. Test Coverage

| Suite | Command | Result |
|-------|---------|--------|
| Utils | `pnpm test:utils` | pass |
| Financial domain (unit, no DB) | `pnpm test:financial` | pass |
| Payroll engine domain | `pnpm test:payroll-engine` | pass |
| Master data domain | `pnpm test:master-data` | pass |
| Typecheck | `pnpm typecheck` | pass |
| Service smoke payroll→cash | `tsx scripts/smoke-payroll-to-cash.ts` | **pass** |
| Browser E2E | — | **not in CI** |
| API HTTP integration auth tests | — | **not automated** |

| Flow | Unit | API script | Integration | E2E browser | Status |
|------|:----:|:----------:|:-----------:|:-----------:|--------|
| Invoice transitions | Yes | Domain only | Smoke service | No | Partial |
| Payment allocation | Yes | Domain only | Smoke service | No | Partial |
| Master data rules | Yes | test-master-data | Partial | No | Partial |
| Legacy payroll approve/PI | No | Manual | Prod data exists | No | Weak |
| Attendance import | No | No | No | No | None |

---

## 11. Critical Gaps

1. **Attendance → payroll calc** not wired (import/exception queue missing)  
2. **Engine stack disconnected** from PI/payout  
3. **Lock/close period** operations incomplete  
4. **Treasury UI** still missing (API only)  
5. **Dashboard KPIs** not fully rebound to invoice/receivable tables  
6. **Employee CRUD** disabled  
7. **Billing profile / tax invoice / CN-DN** incomplete  
8. **API tenant isolation** incomplete outside financial mutations  

---

## 12. Completed Fixes (this audit)

| Fix | Files |
|-----|-------|
| Finance UI: invoices, receivables, payments, collection | `app/(app)/finance/**`, `components/finance/**` |
| Nav entries for finance modules | `config/navigation.ts` |
| Create invoice draft from payroll period | `app/api/financial/invoices/route.ts` + `payroll-actions.tsx` |
| Employee assign form on payroll groups | `payroll-groups-master-client.tsx` |
| Tenant resolve for financial mutations | `lib/financial/tenant.ts` + invoice/payment/collection routes |
| Invoice transition company assert | `invoices/[id]/transition/route.ts` |
| Smoke script payroll→cash | `scripts/smoke-payroll-to-cash.ts` |
| This audit + traceability docs | `docs/CAPABILITY_*.md` |

**No schema migration.** Production row integrity preserved; smoke added 1 invoice chain for closed period Juli 2026 (documented).

---

## 13. Remaining Backlog

### Critical
- Unify engine calc results into period lines or dual-write for PI  
- Attendance import + exception queue feeding calc  

### High
- Tenant assert on all engine/master PATCH-by-id APIs  
- Lock/unlock period API + UI  
- Dashboard AR rebind to `receivables`  
- Treasury UI + WC request create  

### Medium
- Zod validation layer  
- Employee CRUD  
- Tax/BPJS config admin UI  
- Site bootstrap for all clients  
- Browser E2E Playwright  

### Low
- Payslip ESS  
- Bank file multi-format  
- CSP / rate limits  

---

## 14. Recommended Next Increment

**Single priority:** *Operational Data → Payroll Engine bridge*

Deliver:

1. Attendance import (CSV) → `AttendanceRecord` with validation/exception queue  
2. Engine `runPayrollCalculation` writes/syncs `PayrollLine` for the period  
3. Lock period after approval  
4. One browser E2E: import → calc → approve → PI  

This closes the largest integrity risk between “pretty engine” and “money movement path.”

---

## Capability scores (evidence-based)

| Dimension | Score | Basis |
|-----------|------:|-------|
| Database readiness | **82%** | 67 models; migrations applied; sparse financial/engine rows |
| Backend coverage | **68%** | Strong services; gaps on org masters, lock, WC create, billing profile API |
| Frontend coverage | **58%** | Ops + master strong; engine write, treasury, ESS weak; finance UI new |
| RBAC coverage | **62%** | Modules mapped; API inconsistencies; tenant holes residual |
| E2E coverage | **45%** | Service smoke pass; browser not automated; attendance gap |
| Test coverage | **40%** | Domain unit scripts; no HTTP/browser suite |
| **Overall usable maturity** | **~55%** | Payroll ops usable; cash cycle services proven; product surface incomplete |

---

*Maturity must not rise on schema alone. Numbers above reflect connected capabilities only.*
