# Increment 1 — Implementation Report

**Date:** 2026-07-21  
**Branch:** `feat/proqpay-enterprise-revamp`  
**Migration:** `20260721_increment1_ops_intake` (additive)

---

## Objective achieved

Operational path:

```text
Create period → Materialize population (PayrollLine skeleton)
→ Import attendance CSV → Staging + Exception queue
→ Resolve exceptions → Run calculation (engine)
→ Submit/Approve (ApprovalStep)
→ Project calculation → PayrollLine (ADR-001)
→ Lock period → Generate Payment Instruction (from lines)
```

---

## Acceptance evidence

| Criterion | Evidence |
|-----------|----------|
| Population from group | `materializePayrollLines` + auto on period create |
| CSV import + validation | `lib/attendance/import-service.ts` |
| No duplicate re-import | unique `(companyId, contentChecksum)` |
| Exception queue | `attendance_import_exceptions` + UI/API |
| Tax/BPJS required | `requireStatutoryConfigs` — no silent defaults |
| Calculation | `runPeriodPayrollCalculation` |
| Project to lines | `projectCalculationToPayrollLines` |
| Approval | existing + RBAC hardened |
| Lock | `lockPayrollPeriod`; blocks recalc |
| PI from PayrollLine | `generatePaymentInstruction` requires `projectedCalculationId` |
| Tenant/RBAC | `lib/auth/api.ts` on touched routes |
| Service E2E | `pnpm test:e2e:increment1` → **ok** (18 lines → PI) |
| Unit tests | `pnpm test:increment1` → **ok** |
| Typecheck | `pnpm typecheck` → **ok** |

Service E2E sample result:

```json
{
  "ok": true,
  "periodId": "bc216152-fede-439f-9f4b-6e660fd3cf5b",
  "calculationId": "909134db-f1c8-423a-b5cc-e6e1e6e8783a",
  "piId": "0e6e8cf6-c778-411d-9b62-593049c94096",
  "itemCount": 18,
  "totalNet": "386158829.48"
}
```

---

## Database impact

| Change | Type |
|--------|------|
| `payroll_periods.latest_calculation_id` | additive |
| `payroll_periods.projected_calculation_id` | additive |
| `payroll_periods.projected_at` | additive |
| `payroll_periods.population_built_at` | additive |
| `attendance_records.import_batch_id` | additive |
| `attendance_import_batches` | new table |
| `attendance_staging_rows` | new table |
| `attendance_import_exceptions` | new table |
| Enums import/exception | new |

No drops, no resets. Production data preserved.

---

## API surface (new / hardened)

| Method | Route | Purpose |
|--------|-------|---------|
| POST | `/api/payroll/population` | Build lines from group |
| POST | `/api/payroll/run` | Engine calc for period |
| POST | `/api/payroll/project` | Calc → PayrollLine after APPROVED |
| POST | `/api/payroll/lock` | Lock / unlock |
| POST/GET | `/api/attendance/import` | CSV import + commit |
| GET/POST | `/api/attendance/exceptions` | Exception queue |
| POST | `/api/payroll/recalculate|submit|approve|generate-instruction` | RBAC + tenant hardened |

---

## UI changes

- Payroll period create: **group select** (no UUID paste)
- Payroll detail actions: Build population · Run calculation · Project · Lock · PI
- Attendance: CSV import + exception queue panel

---

## Residual risks

1. Browser E2E requires `playwright` + running dev server (`test:e2e:browser` skips if missing).  
2. Statutory formulas auto-seeded per company on first run (from Tax/BpjsConfig) — rates must be maintained in config UI (still minimal).  
3. Large interactive transactions avoided due to Supabase pooler timeouts; eventual consistency window is short sequential writes.  
4. Engine approval chain still separate from period `ApprovalStep` (ops uses period approval).  
5. PI bank integration remains SIMULATED.

---

## Increment 2 recommendation

**Payout completion**

- Failed PI item retry UI  
- Reconciliation workspace  
- Explicit PI maker-checker  
- Bank file format packs  
- Optional payslip PDF  

See `docs/IMPLEMENTATION_SEQUENCE.md` Increment 2.
