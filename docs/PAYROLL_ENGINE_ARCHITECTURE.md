# Payroll Engine Architecture (Phase 1B)

## Principle

Payroll Engine is the **metadata-driven source of truth** for calculation runs.

- Legacy `PayrollPeriod` / `PayrollLine` / `lib/payroll/engine.ts` remain for operational V1 recalculate.
- Engine runs produce **versioned** `PayrollCalculation` + immutable `PayrollSnapshot`.
- Financial Core issues invoices only after payroll is eligible (CLOSED) via Generate Invoice — not auto.

## Flow

```
Components + Formulas
  → CalculationService (formula graph)
  → ValidationService
  → Snapshot + Journal
  → Approval workflow
  → Revision (never overwrite)
  → (later) Generate Invoice → Financial Core
```

## Packages

| Path | Role |
|------|------|
| `lib/payroll-engine/formula-engine.ts` | Pure formula parser + dependency graph |
| `lib/payroll-engine/*-service.ts` | Transactional services |
| `app/api/payroll/*` | REST endpoints |
| `app/(app)/payroll-engine` | Minimal enterprise UI |

## Status (EngineRunStatus)

DRAFT → CALCULATING → VALIDATING → READY_FOR_APPROVAL → PARTIALLY_APPROVED → APPROVED → LOCKED/CLOSED/REVISED/CANCELLED/FAILED
