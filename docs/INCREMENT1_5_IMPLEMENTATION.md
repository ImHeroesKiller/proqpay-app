# Increment 1.5 — Enterprise Payroll Engine Completion

**Date:** 2026-07-21  
**Branch:** `feat/proqpay-enterprise-revamp`  
**Migration:** `20260721_increment1_5_engine` (additive)  
**ADR:** ADR-001 unchanged — Calculation = compute · PayrollLine = ops output

---

## Delivered capabilities

| # | Module | Status |
|---|--------|--------|
| 1 | Tax configuration (versioned, PTKP JSON, activate) | Done |
| 2 | BPJS configuration (versioned, ceilings, activate) | Done |
| 3 | Formula management (draft/active/deprecated, immutable active) | Done |
| 4 | Validation center (filter, resolve, re-run) | Done |
| 5 | Calculation revisions (runNumber, reason, config snapshot) | Done |
| 6 | Calculation comparison (run A vs B) | Done |
| 7 | Employee payroll audit trail | Done |
| 8 | Projection verification gate | Done |
| 9 | Payroll executive summary | Done |

---

## Operator flow (engine)

```text
Configure Tax + BPJS + Formulas
→ Create period / import attendance (I1)
→ Run calculation (creates Run #N, never overwrites prior)
→ Validation center (resolve/re-run)
→ Compare runs
→ Approve period
→ Verify + Project → PayrollLine
→ Audit trail (per employee)
→ Summary KPIs
→ Lock
```

---

## Acceptance evidence

| Criterion | Evidence |
|-----------|----------|
| Versioned calc runs | `runNumber`, `parentCalculationId`, `configSnapshotJson` |
| Tax/BPJS/formula on run | Snapshot + FK ids on `PayrollCalculation` |
| No silent statutory fallback | Still requires active Tax/BPJS |
| Immutable formula activate | New version only; ACTIVE expression not edited |
| Validation center | `/payroll-engine/validations` + API |
| Compare | `/payroll-engine/compare` + API |
| Audit trail | `/payroll-engine/audit` + API |
| Projection verify | GET/POST `/api/payroll/project` with checks |
| Summary | `/api/payroll/summary` + period detail panel |
| Service E2E | `pnpm test:e2e:increment1-5` → **ok** |

Sample E2E:

```json
{
  "ok": true,
  "run1": "...",
  "run2": "...",
  "taxVersion": 2,
  "bpjsVersion": 2,
  "summaryNet": 385417500
}
```

---

## UI routes

| Route | Purpose |
|-------|---------|
| `/payroll-engine` | Hub + recent runs |
| `/payroll-engine/tax` | Tax versions |
| `/payroll-engine/bpjs` | BPJS versions |
| `/payroll-engine/formulas` | Formula versions |
| `/payroll-engine/validations` | Validation center |
| `/payroll-engine/compare` | Run comparison |
| `/payroll-engine/audit` | Employee audit trail |
| `/payroll/[id]` | Summary KPIs + engine deep links |

---

## Database (additive)

- `tax_configs`: version, lifecycle, ptkp_json, rules_json, …
- `bpjs_configs`: version, lifecycle, …
- `payroll_formula_versions`: lifecycle, effective_from/to
- `payroll_calculations`: run_number, run_reason, tax/bpjs ids, config_snapshot_json, parent_calculation_id
- `payroll_validations`: suggested_action, resolution_status, resolve metadata

---

## Tests

| Command | Result |
|---------|--------|
| `pnpm typecheck` | pass |
| `pnpm test` (incl. increment1-5 unit) | pass |
| `pnpm test:e2e:increment1-5` | pass |

---

## Readiness score (updated)

| Domain | Before I1.5 | After I1.5 |
|--------|------------:|-----------:|
| Payroll Processing | ~68% | **~78%** |
| Overall product | ~44–55% | **~58%** |

Still not full payout bank / treasury maturity — those are Increment 2+.

---

## Residual risks

1. Formula auto-seed on first calc if none exist (from statutory rates) — explicit UI still preferred.  
2. Validation center / audit UI still use period/employee IDs (not full pickers everywhere).  
3. Browser E2E optional (Playwright).  
4. Progressive tax brackets in `rulesJson` stored but engine still uses TER rate for PPH21.  
5. Engine multi-step approval (`PayrollApproval`) remains secondary to period `ApprovalStep`.

---

## Increment 2 recommendation

**Employee Payout completion:** failed item retry, recon workspace, PI maker-checker, multi bank formats, payslip.
