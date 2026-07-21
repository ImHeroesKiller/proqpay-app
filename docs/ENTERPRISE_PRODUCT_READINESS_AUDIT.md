# ProQPay Enterprise Product Readiness Audit

**Date:** 2026-07-21  
**Branch:** `feat/proqpay-enterprise-revamp`  
**Schema:** `proqpay` on Supabase PostgreSQL  
**Type:** Audit-first (implementation deferred except prior security tenant work)  
**Companion docs:** listed in § Documents  

---

## 1. Executive verdict

### Core question

> Apakah ProQPay saat ini sudah dapat digunakan oleh perusahaan outsourcing untuk memproses payroll dari data operasional masuk sampai invoice tertagih?

### Answer

**Tidak untuk operasi produksi full-scope.**  
**Ya, terbatas, untuk controlled pilot** dengan data master yang sudah disiapkan (seed/ops), **tanpa mengandalkan attendance import**, dan dengan finance staff yang memahami multi-step invoice + payment UI.

| Question | Verdict |
|----------|---------|
| Dapat digunakan? | **Controlled pilot only** |
| Tipe client | 1–few **self-funded** clients; population pre-assigned; lines exist or recalculated; manual attendance outside system |
| Skala | **≤ tens of employees/period** operationally comfortable; not proven for multi-site high-volume import |
| Proses usable | Period create (from group), recalc/submit/approve, PI+CSV, confirmation, simple invoice→AR→pay |
| Proses tidak aman / tidak ready | Attendance intake gate, engine-as-primary calc, period lock, WC funding, treasury, statutory config UI, dashboard AR truth |
| Production blockers | Dual payroll SoT without projection; weak API tenant/RBAC on some routes; implicit tax/BPJS defaults; no ops intake gate |

### Overall readiness score: **44%** (Usable with major gaps)

```text
0–20% concept → 21–40% foundation → [44% YOU ARE HERE] → 61–80% operational → 81%+ production-ready
```

### Closing label

```text
✅ PROQPAY READY FOR CONTROLLED IMPLEMENTATION
```

Not blocked on unknowns — backlog is ranked and first increment is defined.  
Still **not** “ready for unsupervised production outsourcing ops.”

---

## 2. Business process readiness

| Flow | Score | One-line |
|------|------:|----------|
| A Setup | **58%** | Master I1 works; UUID UX; sites/tax/billing profile empty |
| B Intake | **12%** | No import/exception/lock gate |
| C Payroll | **48%** | Legacy path works if lines exist; no lock; dual SoT |
| D Payout | **47%** | PI+confirm real; bank sim; no retry/payslip |
| E Billing | **52%** | Simple draft/issue/AR; not commercial rules |
| F Collection | **55%** | Ledger+payment UI; dashboard proxy wrong |
| G Finance | **22%** | WC/treasury unused |

Detail: `docs/BUSINESS_PROCESS_READINESS_MATRIX.md`

---

## 3. Menu and CRUD readiness

| Area | Status |
|------|--------|
| Master clients/sites/cycles/groups | USABLE |
| Projects/employees create | MISSING / disabled |
| Attendance | READ_ONLY |
| Payroll ops + approval + PI + confirm | USABLE |
| Payroll engine | PARTIAL (read) |
| Finance invoices/AR/payments/collection | USABLE (new) |
| Treasury | MISSING page |
| WC | PARTIAL (create disabled) |
| Dashboard | PARTIAL (AR proxy) |

Detail: `docs/UI_CRUD_READINESS_MATRIX.md`

---

## 4. UX findings

| Issue | Impact |
|-------|--------|
| UUID paste everywhere | Setup 30–60 min vs target 10 |
| Attendance dead-end | Entire north-star intake fails |
| No lock action | Finalization unclear |
| Dual payroll UIs | Operator confusion |
| Engine empty “use API” | Not operator-grade |
| No margin view | Director finance incomplete |
| Multi-step invoice transitions | Extra clicks; workable |

Detail: `docs/UX_PROCESS_AUDIT.md`

---

## 5. Architecture findings

### Payroll SoT (ADR-001)

| Layer | Role |
|-------|------|
| `PayrollCalculation*` | Canonical **compute** |
| `PayrollPeriod` / `PayrollLine` | Canonical **cash ops / payout / billing base** |
| Projection | **Required** before PI/invoice |
| Legacy recalculate | Compatibility adapter |

### Financial SoT (ADR-002)

| Layer | Role |
|-------|------|
| Invoice / Receivable / Payment / Allocation | Canonical ledger |
| Dashboard period proxy | **Deprecate as AR** |

### Approvals

| System | Role |
|--------|------|
| `ApprovalStep` on period | **Operational** today |
| `PayrollApproval*` | Engine path; do not dual-gate PI until unified |

ADRs: `docs/adr/ADR-001-PAYROLL-CANONICAL-SOURCE.md`, `docs/adr/ADR-002-FINANCIAL-LEDGER-SOURCE.md`

---

## 6. Security and production findings

### Production blockers

| ID | Issue | Severity |
|----|-------|----------|
| PB-1 | By-id mutations without consistent company membership | HIGH |
| PB-2 | Legacy payroll routes module RBAC incomplete | HIGH |
| PB-3 | Tax/BPJS empty → silent defaults | HIGH (compliance) |
| PB-4 | Dual payroll write without projection | HIGH (money) |
| PB-5 | Dashboard AR ≠ ledger | MEDIUM (decision risk) |
| PB-6 | No AV on payment proof (placeholder) | MEDIUM |
| PB-7 | No CSP / rate limit | MEDIUM |
| PB-8 | Seed-realistic destructive if mis-run | HIGH (ops) |

### Production ops gaps

- No job queue for long imports  
- Limited structured logging  
- No formal recon runbook  
- Browser E2E not in CI  

---

## 7. Dead code and technical debt

Top CONNECT/CONSOLIDATE items: dual payroll, dual AR presentation, orphan billing profile service, treasury API sans UI, disabled employee/WC creates, DisbursementBatch legacy.

Detail: `docs/TECHNICAL_DEBT_AND_DEAD_CODE.md`

---

## 8. E2E results

| Scenario | Result | Failure point |
|----------|--------|---------------|
| E2E 1 Setup Client→Assignment | **PARTIAL PASS** | Project create missing; UUID UX; sites 0 in prod |
| E2E 2 CSV→Calc→Approve→Lock | **FAIL** | No CSV import; no exception queue; no lock API |
| E2E 3 Final→PI→Confirm→Recon | **PARTIAL PASS** | PI+confirm work; recon workspace missing; bank SIMULATED |
| E2E 4 Payroll→Invoice→Collected | **PASS (service)** + **UI path available** | Smoke `INV-2026-07-000001` PAID/COLLECTED; multi-alloc UI limited |
| E2E 5 Funding WC | **FAIL** | Create WC disabled; 0 WC rows; treasury empty |

Scripts: `scripts/smoke-payroll-to-cash.ts` (E2E 4 service). Browser E2E automation: **not present**.

---

## 9. Readiness scores (evidence-based)

| Domain | Score | Band |
|--------|------:|------|
| Master Data | **62%** | Operational w/ limitations |
| Operational Intake | **12%** | Concept/DB |
| Payroll Processing | **48%** | Usable major gaps |
| Employee Payout | **47%** | Usable major gaps |
| Client Billing | **52%** | Usable major gaps |
| Collection | **55%** | Usable major gaps |
| Payroll Finance | **22%** | Foundation |
| Dashboard | **48%** | Usable major gaps |
| UX | **40%** | Foundation |
| RBAC | **58%** | Usable major gaps |
| Security | **50%** | Usable major gaps |
| Test Coverage | **38%** | Foundation |
| Production Operations | **35%** | Foundation |
| **Overall product** | **44%** | Usable with major gaps |

Scoring does **not** credit schema-only features.

---

## 10. Implementation backlog

Ranked top 10 and full items: `docs/IMPLEMENTATION_BACKLOG.md`  
Sequence: `docs/IMPLEMENTATION_SEQUENCE.md`

| Rank | ID | Title | Score |
|-----:|----|-------|------:|
| 1 | BL-SOT-01 | Engine→Line projection | 15.6 |
| 2 | BL-PR-01 | Materialize lines from population | 13.3 |
| 3 | BL-PR-03 | Period lock | 13.3 |
| 4 | BL-SEC-01 | Tenant by-id | 13.3 |
| 5 | BL-OPS-01 | Attendance CSV import | 12.5 |

---

## 11. Recommended first increment

### Increment 1 — Operational Data → Final Payroll

**Why first (product):** North-star fails at intake; everything downstream depends on trusted lines + lock.  
**Why not only security first:** Security P0 can ship in parallel week-0; product value unlocks on Increment 1.

### Scope

1. Materialize `PayrollLine` from active assignments when creating/building a period  
2. Attendance CSV import + validation errors list (MVP exception queue)  
3. Calculation path that **writes/updates lines** (engine project **or** attendance-aware recalculate adapter per ADR-001)  
4. Period **lock** API + UI after approval  
5. Minimal Tax/BPJS config create (or hard fail without config)  
6. Group picker for period create (no UUID)

### Out of scope this increment

WC, treasury, CN/DN, payslip, bank multi-format, dashboard redesign full

### Dependencies

- ADR-001 accepted  
- Prefer BL-SEC-01/02 merged same sprint if multi-tenant QA  

### Files / modules (expected)

```text
lib/master-data/service.ts          # build lines from population
lib/payroll/actions.ts              # lock; attendance-aware recalc
lib/payroll-engine/calculation-service.ts + projectToLines.ts
app/api/attendance/import/route.ts
app/api/payroll/lock/route.ts
app/(app)/attendance/*
app/(app)/payroll/*
components/payroll/*
lib/master-data or admin for tax/bpjs
```

### Database impact

- Prefer **no** destructive change  
- Optional additive: `attendance_import_batches`, `attendance_import_errors`  
- Production data preserved  

### Acceptance criteria

1. Operator imports CSV for period date range → rows in `attendance_records`  
2. Invalid rows listed; valid rows committed  
3. “Build/run payroll” produces N lines for N assignments  
4. Totals on period = sum(lines)  
5. Approve then **Lock** → recalc returns error  
6. Locked period can generate PI from lines  
7. Automated tests cover import validation + lock + line materialization  
8. Docs/traceability updated  

### Testing plan

| Layer | Tests |
|-------|-------|
| Unit | CSV parse, OT rules, overlap, lock guards |
| Service | Import + materialize + calc project + lock |
| API | Auth + company scope + happy/fail import |
| Manual E2E | Demo company full path |
| Regression | Existing `pnpm test` + smoke payroll-to-cash |

### Risk

| Risk | Mitigation |
|------|------------|
| Calc wrong amounts | Golden fixtures; compare to known period |
| Import corrupts attendance | Transaction + dry-run mode |
| Lock too aggressive | Role-gated unlock with audit |

### Estimated effort

**2–4 engineering weeks** for 1–2 full-stack engineers.

---

## 12. Implementation launch prompt (copy-paste for coding agent)

```text
# EXECUTE INCREMENT 1 — Operational Data → Final Payroll

You are implementing ProQPay Increment 1 on branch feat/proqpay-enterprise-revamp.

## Read first (mandatory)
- docs/IMPLEMENTATION_SEQUENCE.md (Increment 1)
- docs/IMPLEMENTATION_BACKLOG.md items: BL-PR-01, BL-OPS-01, BL-OPS-02 (MVP), BL-SOT-01, BL-PR-03, BL-MD-02 (minimal), BL-UX-01 (period group picker)
- docs/adr/ADR-001-PAYROLL-CANONICAL-SOURCE.md
- docs/ENTERPRISE_PRODUCT_READINESS_AUDIT.md §11
- docs/CAPABILITY_TRACEABILITY_MATRIX.md

## Non-negotiable
- Production data in Supabase schema proqpay — NO prisma db push, migrate reset, drop, truncate
- Additive migrations only if required; prefer no schema change
- Do not expand to WC, treasury, CRM, payslip, CN/DN
- PayrollLine remains payout source of truth; engine must project to lines before PI
- Enforce session company isolation on new APIs
- Update docs after implementation

## Deliverables
1. Materialize payroll lines from active EmployeePayrollAssignment when building a period
2. Attendance CSV import API + UI (validate employee, date, duplicates; error report)
3. Calculation path that updates PayrollLine + period totals (engine projection preferred; document adapter if hybrid)
4. POST lock period (and optional unlock with elevated role) + UI button after APPROVED
5. Minimal TaxConfig/BpjsConfig create UI or hard-block submit when missing
6. Payroll period create: select payroll group from list (no raw UUID required)
7. Tests: unit + service/API for import, materialize, lock
8. Update CAPABILITY_TRACEABILITY_MATRIX + PROQPAY_MASTER_ROADMAP maturity with evidence
9. Run pnpm typecheck && pnpm test

## Acceptance criteria
- Import → build lines → calc → approve → lock works on demo company
- Locked period cannot recalculate
- SUM(payroll_lines.net_pay) equals payroll_periods.total_net
- PI generation still uses lines successfully after lock
- No production data loss

## Definition of Done
All acceptance criteria met, tests green, docs updated, brief PR summary with before/after readiness notes.
```

---

## Documents produced

| Document |
|----------|
| `docs/ENTERPRISE_PRODUCT_READINESS_AUDIT.md` (this file) |
| `docs/BUSINESS_PROCESS_READINESS_MATRIX.md` |
| `docs/UI_CRUD_READINESS_MATRIX.md` |
| `docs/UX_PROCESS_AUDIT.md` |
| `docs/TECHNICAL_DEBT_AND_DEAD_CODE.md` |
| `docs/IMPLEMENTATION_BACKLOG.md` |
| `docs/IMPLEMENTATION_SEQUENCE.md` |
| `docs/adr/ADR-001-PAYROLL-CANONICAL-SOURCE.md` |
| `docs/adr/ADR-002-FINANCIAL-LEDGER-SOURCE.md` |

## Changes during audit

No product code changes in this audit pass (documentation + ADR only).  
Prior integration work (finance UI, tenant helpers) remains in branch history.

---

## Final label

```text
✅ PROQPAY READY FOR CONTROLLED IMPLEMENTATION
```

**Safe next step:** Execute **Increment 1** using the launch prompt in §12.  
Optionally land **BL-SEC-01/02** in the same sprint as hard prerequisites for multi-tenant QA.
