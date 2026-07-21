# Business Process Readiness Matrix

**Date:** 2026-07-21 · Branch `feat/proqpay-enterprise-revamp`  
**Evidence base:** live DB row counts, Prisma schema, services, UI routes, prior capability audit + smoke.

**Production snapshot (key):**

| Entity | Count | Signal |
|--------|------:|--------|
| clients/companies | 5 | usable |
| sites | **0** | setup incomplete in prod |
| pay cycles / groups | 5 / 5 | usable |
| assignments | 48 | usable |
| attendance | 12 | sample only; no import |
| payroll periods | 5 (4 CLOSED, 1 DRAFT) | ops path used |
| payroll lines | 130 | payout source |
| PI / confirmations | 4 / 4 | payout path used |
| engine calculations | **0** | unused |
| tax/bpjs configs | **0** | implicit defaults |
| invoices / AR / payments | 1 / 1 / 1 | smoke only |
| WC / treasury | **0** | unused |

---

## Flow A — Client and Payroll Setup

```text
Client → Project → Site → Pay Cycle → Payroll Group → Assignment
→ Component → Tax/BPJS → Billing Profile
```

| Step | UI create | API | Rules | Prod data | Status |
|------|:---------:|:---:|:-----:|:---------:|--------|
| Client | Yes (master-data) | CRUD | entityKind CLIENT | 5 | USABLE |
| Project | No | No | — | 5 (seed) | READ_ONLY |
| Site | Yes | CRUD | effective dates | **0** | USABLE empty |
| Pay Cycle | Yes | CRUD | schedule preview | 5 | USABLE |
| Payroll Group | Yes | CRUD | requires cycle | 5 | USABLE |
| Assignment | Yes (UUID form) | assign action | effective date, overlap | 48 | PARTIAL UX |
| Component | No UI write | POST API | — | **0** | BACKEND |
| Tax/BPJS | No | used by recalc if present | defaults in code | **0** | IMPLICIT DEFAULTS |
| Billing Profile | No | service only | — | **0** | ORPHAN |

**Readiness: 58%**

| Dimension | Finding |
|-----------|---------|
| Broken steps | Project create missing; Tax/BPJS/Billing not configurable in UI; Sites unused |
| UX friction | Master forms require **raw UUIDs** (companyId, payCycleId, employeeId, projectId) |
| Data risks | Payroll allowed with empty tax/bpjs/component tables via code defaults |
| Population preview | Yes on period create (`previewPeriodFromGroup`) |
| Effective dates | Site, group, assignment supported in schema/service |
| Mutation history | Master audit log yes; incomplete for projects/employees |

**Backlog IDs:** BL-MD-01 Project CRUD · BL-MD-02 Tax/BPJS admin · BL-MD-03 Billing profile API/UI · BL-MD-04 Lookup selectors (no UUID paste) · BL-MD-05 Site bootstrap

---

## Flow B — Operational Data Intake

```text
Source → Upload → Mapping → Validation → Exception → Correction → Approve → Lock
```

| Capability | Present? | Evidence |
|------------|:--------:|----------|
| CSV/Excel import | **No** | Attendance page text: "staged" |
| API ingestion | **No** | No intake route |
| Attendance list | Yes | RSC `listAttendance` |
| Duplicate detection | Partial | DB unique `(employeeId, workDate)` only |
| Missing employee | No | No import validation pipeline |
| Invalid assignment | No | Not checked at intake |
| OT validation | No | Fields stored only |
| Exception queue | **No** | — |
| Correction UI | **No** | — |
| Dataset lock | Field `is_locked` only | No workflow |
| Source-file trace | **No** | — |
| Re-import policy | **No** | — |

**Readiness: 12%** — **no operational data gate** before payroll.

**Backlog:** BL-OPS-01 Import CSV · BL-OPS-02 Exception queue · BL-OPS-03 Lock operational dataset · BL-OPS-04 Source file audit

---

## Flow C — Payroll Processing

```text
Period → Population → Ops input → Calc → Validate → Fix → Revise → Approve → Lock → Final
```

| Step | Legacy path | Engine path | Status |
|------|-------------|-------------|--------|
| Create period | From group + cycle; overlap check; pop preview | N/A | USABLE |
| Population | Count assignments; **does not auto-create lines** | Body employees on calc API | GAP: empty lines unless seeded |
| Ops input | Not consumed by recalc | overtimeHours in API body only | BROKEN product path |
| Calculation | `recalculate` updates existing lines (defaults OT/allowance) | `runPayrollCalculation` | Dual stack |
| Validation | Weak | Severity + blockers | Engine only |
| Error center | No | Partial engine display | MISSING |
| Revision | Period version++ | PayrollRevision | PARTIAL |
| Approval | ApprovalStep + matrix (or default 3-level) | PayrollApproval* | Dual |
| Lock | Status enum; **no lock API/button** | Engine LOCKED | **GAP** |
| Snapshot | No | PayrollSnapshot on calc | Engine only |

**Source of truth decision:** see `docs/adr/ADR-001-PAYROLL-CANONICAL-SOURCE.md`  
- Period/Line = cash ops truth  
- Calculation = compute truth  
- Projection required before PI

**Readiness: 48%** (usable for seeded line-based runs; not for real ops intake)

**Backlog:** BL-PR-01 Project lines from population · BL-PR-02 Engine→Line bridge · BL-PR-03 Lock/unlock · BL-PR-04 Validation center UI · BL-PR-05 Unify approval

---

## Flow D — Employee Payout

```text
Final → PI → Approve → Bank file → Submit → Execute → Fail/Retry → Confirm → Recon → Payslip
```

| Step | Status | Evidence |
|------|--------|----------|
| PI generation | USABLE | From APPROVED period; lines source |
| PI approval | WEAK | Auto `approvalStatus=APPROVED` on generate |
| Bank file | PARTIAL | CSV download only (simulated) |
| Submission/execution | PARTIAL | Status fields; SIMULATED integration |
| Failure/retry | PARTIAL | Item status enum; no UI retry |
| Confirmation upload/verify | USABLE | Full UI + roles |
| Reconciliation | PARTIAL | Period recon status; no recon workspace |
| Payslip | MISSING | — |
| Duplicate PI | PARTIAL | New number per count; no hard block |

**Readiness: 47%**

**Backlog:** BL-PO-01 PI approval step · BL-PO-02 Failed item retry UI · BL-PO-03 Recon workspace · BL-PO-04 Payslip · BL-PO-05 Bank format packs

---

## Flow E — Client Billing

```text
Final payroll → Billable → Draft → Adjust → Approve → Issue → Deliver → AR
```

| Step | Status | Evidence |
|------|--------|----------|
| Generate draft from period | USABLE | `fromPayrollPeriod` net + BPJS employer |
| Billing profile rules | MISSING | 0 profiles; prefix hardcoded INV |
| Pricing rules | UNUSED | 0 rows; not applied to invoice |
| Adjustments / CN / DN | MISSING | — |
| Tax commercial | WEAK | item tax field only |
| Approval / Issue | USABLE | Finance UI transitions |
| Delivery evidence | MISSING | — |
| Receivable on issue | USABLE | Service + smoke proven |
| Implicit defaults | **Yes** | Net+BPJS only; no fee/management calc |

**Readiness: 52%**

**Backlog:** BL-BI-01 Billing profile API/UI · BL-BI-02 Fee/pricing engine · BL-BI-03 Adjustments CN/DN · BL-BI-04 Delivery log

---

## Flow F — Collection

```text
AR → Aging → Reminder → Activity → Payment → Verify → Allocate → Partial → Collected
```

| Step | Status | Notes |
|------|--------|-------|
| True AR ledger | USABLE | `receivables` table |
| Aging fields | PARTIAL | stored; limited UI buckets |
| DSO dashboard | MISSING | — |
| Reminder automation | MISSING | — |
| Collection activity | USABLE | UI + API |
| Client payment + allocate | USABLE | UI; multi-invoice API exists; UI is single-invoice |
| Partial payment | SERVICE YES | UI needs multi-alloc UX |
| Overpayment / unapplied cash | MISSING | Allocation must equal payment |
| Reversal | WEAK | VOID statuses; no reverse alloc UI |
| Dashboard AR | **WRONG SOURCE** | proxy periods (ADR-002) |

**Readiness: 55%**

**Backlog:** BL-CO-01 Multi-invoice allocate UI · BL-CO-02 Unapplied cash · BL-CO-03 Dashboard ledger bind · BL-CO-04 Aging/DSO widgets

---

## Flow G — Payroll Finance

```text
Funding req → Decision → WC request → Approve → Fund → Payout → Collect → Settle → Margin → Journal
```

| Step | Status | Notes |
|------|--------|-------|
| Funding requirement | PARTIAL | Period funding fields; engine WC requirement |
| Self vs WC model | USABLE field | Company default + period |
| WC request create | **DISABLED** | Button coming soon; 0 rows |
| WC approve/settle API | BACKEND | No UI |
| Partner allocation | READ_ONLY | 0 partners |
| Treasury | BACKEND | 0 accounts |
| Margin | MISSING product | — |
| Journal export | PARTIAL | Engine journal GET; 0 rows |

**Readiness: 22%**

**Backlog:** BL-PF-01 WC request from period · BL-PF-02 Treasury UI · BL-PF-03 Settlement UI · BL-PF-04 Margin report · BL-PF-05 Journal export file

---

## Summary readiness by flow

| Flow | Score | Production-safe? |
|------|------:|------------------|
| A Setup | **58%** | Controlled demo only (UUID friction; missing tax/BPJS UI) |
| B Intake | **12%** | **No** |
| C Payroll | **48%** | Only if lines pre-seeded / recalculated |
| D Payout | **47%** | Demo bank CSV + manual confirm |
| E Billing | **52%** | Simple invoice; not commercial-grade |
| F Collection | **55%** | Ledger yes; ops tooling thin |
| G Finance | **22%** | **No** for WC clients |

**Weighted product readiness (equal weight flows): ~42%**
