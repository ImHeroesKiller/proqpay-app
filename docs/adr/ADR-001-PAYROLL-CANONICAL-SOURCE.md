# ADR-001 — Payroll Canonical Source of Truth

**Status:** Accepted (audit decision 2026-07-21)  
**Context:** Dual payroll stacks create divergence risk between ops payout and engine calculation.  
**Decision date:** 2026-07-21  
**Branch:** `feat/proqpay-enterprise-revamp`

---

## Context

ProQPay currently has two write paths:

| Stack | Models | Used by | Prod rows |
|-------|--------|---------|-----------|
| **Legacy ops** | `PayrollPeriod`, `PayrollLine`, `ApprovalStep` | Recalculate, submit, approve, PI, confirmation, invoice-from-period | Periods 5, lines 130, approvals 12 |
| **Engine 1B** | `PayrollCalculation`, `PayrollCalculationItem`, `PayrollSnapshot`, `PayrollJournal`, `PayrollApproval*` | `/api/payroll/calculate`, engine UI (read) | **0** |

Payment instruction generation **only** reads `PayrollLine.netPay`. Engine items never reach payout.

## Decision

### Canonical operational payroll (money-moving path)

```text
PayrollPeriod  = run container (status, funding, lock, totals)
PayrollLine    = employee payout line of truth (net pay → PI items)
ApprovalStep   = operational approval for period (until engine matrix is unified)
```

### Canonical calculation engine (compute path)

```text
PayrollCalculation       = calculation run (revisioned)
PayrollCalculationItem   = component-level results
PayrollSnapshot          = immutable JSON of accepted run
PayrollJournal           = financial summary of accepted run
PayrollValidation        = issue list for a run
```

### Rule

1. **Write new calculation logic only on the engine stack.**
2. **Before payout or invoice**, engine result **must project** into `PayrollLine` + update `PayrollPeriod` totals.
3. **`PayrollLine` remains the payout/billing projection** until PI and invoice are re-pointed (future).
4. Legacy `recalculatePayrollPeriod` becomes a **compatibility adapter** that may call engine defaults, then write lines.
5. Engine-only approval (`PayrollApproval`) must not be the sole gate for PI until projection + lock is enforced.

## Compatibility layer (required)

```text
runPayrollCalculation(periodId)
  → validations (no blockers)
  → engine approval (optional multi-step)
  → projectToPayrollLines(periodId, calculationId)  // NEW
  → set period status READY_FOR_APPROVAL / LOCKED per policy
  → generatePaymentInstruction reads lines
```

## Deprecation path

| Phase | Action |
|-------|--------|
| Now | Document dual stack; block treating engine as final without projection |
| P1 | Implement `projectToPayrollLines`; lock period after projection |
| P2 | Deprecate legacy pure `calculatePayrollLine` as primary; keep as fallback |
| P3 | Optional: PI items reference calculation item IDs; lines remain summary |

## Divergence risks

- Engine gross/net ≠ line net → wrong bank transfer  
- Invoice from period totals after engine-only edit without projection  
- Double approval UX (period vs calculation)

## Verification rules

1. For any `LOCKED`/`APPROVED` period with linked calculation:  
   `SUM(PayrollLine.netPay) == PayrollCalculation.netTotal` (tolerance 0.01)  
2. PI total == period totalNet == SUM(lines)  
3. No PI generation if blockers on linked open calculation  

## Consequences

- Product path stays bank-safe  
- Engine investment is not wasted  
- Clear ownership: engine owns formulas; period/line owns cash operations  

## Related

- Increment P1 — Operational Data to Payroll (IMPLEMENTATION_BACKLOG)  
- `lib/payroll/actions.ts`, `lib/payroll-engine/calculation-service.ts`
