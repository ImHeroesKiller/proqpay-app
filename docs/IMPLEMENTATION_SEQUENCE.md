# Implementation Sequence

**Date:** 2026-07-21  
**Principle:** Unblock money-safe payroll path before commercial polish.

```text
P0 Security + Source of Truth
        ↓
P1 Intake + Calc + Lines + Lock
        ↓
P2 Payout hardening
        ↓
P3 Billing commercial rules
        ↓
P4 Collection + Treasury + WC
        ↓
P5 UX consolidation
```

---

## Increment 0 — Production blockers (1–2 weeks)

**Goal:** Stop unsafe multi-tenant and dual-truth money risk.

| Order | Item | Why first |
|------:|------|-----------|
| 1 | BL-SEC-01 Tenant asserts | Unblocks safe multi-company testing |
| 2 | BL-SEC-02 Module RBAC legacy payroll | Prevent wrong-role mutations |
| 3 | BL-SOT-01 Engine→Line projection (design + stub OK) | Unblocks P1 calc path |
| 4 | BL-SEC-03 Statutory config gate (feature flag allowed) | Compliance |

**Exit criteria**

- [ ] Mutating APIs 403 on cross-company  
- [ ] VIEWER cannot submit payroll  
- [ ] ADR-001 documented + projection function skeleton or full  
- [ ] Tests green  

**DB impact:** none expected  
**Risk:** Low–Medium  

---

## Increment 1 — Operational Data → Final Payroll ✅ SHIPPED 2026-07-21

**Report:** `docs/INCREMENT1_IMPLEMENTATION.md`  
**Migration:** `20260721_increment1_ops_intake`  
**E2E:** `pnpm test:e2e:increment1` (service) · `pnpm test:e2e:browser` (optional Playwright)

**Goal:** Operator can go from attendance file to locked payroll ready for payout.

## Increment 1.5 — Enterprise Payroll Engine ✅ SHIPPED 2026-07-21

**Report:** `docs/INCREMENT1_5_IMPLEMENTATION.md`  
**Migration:** `20260721_increment1_5_engine`  
**E2E:** `pnpm test:e2e:increment1-5`

**Goal:** Tax/BPJS/formula versioning, validation center, multi-run compare, audit trail, projection verify, payroll summary — without changing ADR-001.

| Order | Item |
|------:|------|
| 1 | BL-PR-01 Materialize lines from population |
| 2 | BL-OPS-01 Attendance CSV import |
| 3 | BL-OPS-02 Exception queue (MVP) |
| 4 | BL-SOT-01 Complete projection from calc (or enhanced recalc consuming attendance) |
| 5 | BL-PR-03 Lock period |
| 6 | BL-PR-04 Validation center (MVP list) |
| 7 | BL-MD-02 Tax/BPJS admin (minimal) |
| 8 | BL-UX-01 Group/employee pickers (at least for period create) |

**Architecture constraint (ADR-001)**

```text
Import attendance
  → resolve population lines
  → calculate (engine preferred; legacy adapter OK)
  → project to PayrollLine
  → validate
  → approve (existing ApprovalStep OK)
  → LOCK
  → (later) PI
```

**Exit criteria**

- [ ] E2E 2 path completes on demo company without seed magic lines  
- [ ] Locked period cannot recalc  
- [ ] SUM(lines) matches period totals  
- [ ] Import produces audit log + exception list  

**DB impact:** prefer additive `attendance_import_batches` if needed; no destructive  
**Risk:** Medium (calc correctness)  

**Launch prompt:** see ENTERPRISE_PRODUCT_READINESS_AUDIT.md §12  

---

## Increment 2 — Enterprise Payout & Execution

**Design review:** `docs/INCREMENT2_PAYOUT_DESIGN_REVIEW.md`  
**Implementation contract:** `docs/INCREMENT2_IMPLEMENTATION_PLAN.md`

| Phase | Focus | Status |
|-------|--------|--------|
| **I2-A** | Maker-checker, no auto-approve | ✅ **SHIPPED** — `docs/INCREMENT2A_IMPLEMENTATION.md` · `pnpm test:e2e:increment2a` |
| I2-B | Bank adapter + file artifact | Pending |
| I2-C | Execution + item retry | Pending |
| I2-D | Confirmation → recon session | Pending |
| I2-E | Hardening | Pending |

**Canonical batch model:** `PaymentInstruction` (DisbursementBatch legacy read-only)

---

## Increment 3 — Billing rules (2 weeks)

| Items | BL-BI-01, BL-BI-02, fee on draft invoice, BL-BI-03 later |
| Exit | Invoice draft uses billing profile + optional management fee |

---

## Increment 4 — Collection & treasury (2 weeks)

| Items | BL-CO-03, BL-CO-01, BL-PF-02, BL-PF-01 |
| Exit | Dashboard AR matches ledger; WC request creatable for WC periods |

---

## Increment 5 — UX consolidation (ongoing)

| Items | BL-UX-02 command center, BL-UX-03 inbox, BL-MD-01/06 CRUD |
| Exit | Setup without UUID paste; reduced page hops |

---

## Dependency graph

```text
BL-SEC-01 ──┐
BL-SEC-02 ──┼──► safe multi-tenant QA
BL-SEC-03 ──┘
BL-PR-01 ──────────► BL-OPS-01/02 ──► BL-SOT-01 ──► BL-PR-03 ──► Payout
BL-MD-02 ──────────► BL-SEC-03 / recalc quality
BL-SOT-01 ─────────► Invoice totals trust
BL-CO-03 ──────────► Director trust in dashboard
BL-PF-01 ──────────► WC client type support
```

---

## What not to start yet

- Full CRM/sales expansion  
- Device attendance management  
- Full GL ERP  
- Graphite-scale microservices  
- Deleting DisbursementBatch without migration window  

---

## Tracking

Update after each increment:

1. `docs/CAPABILITY_TRACEABILITY_MATRIX.md` statuses  
2. `docs/PROQPAY_MASTER_ROADMAP.md` phase %  
3. `docs/IMPLEMENTATION_BACKLOG.md` item status (add column when executing)  
