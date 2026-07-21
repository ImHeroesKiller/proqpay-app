# ADR-003 — Payroll Engine Versioning & Traceability

**Status:** Accepted  
**Date:** 2026-07-21  
**Related:** ADR-001 (canonical compute vs ops lines)

---

## Decision

1. Every calculation run creates a **new** `PayrollCalculation` with monotonic `runNumber` per period.  
2. Prior runs are **never overwritten**.  
3. Each run stores immutable `configSnapshotJson` including tax, BPJS, and formula version ids.  
4. Active formula **expressions** are immutable; edits create a new `PayrollFormulaVersion`.  
5. Active tax/BPJS configs are deprecated (not mutated) when a new version is activated.  
6. Projection must pass verification (approved period, no open blockers, valid tax/BPJS/formula) and may be re-run until lock.

## Consequences

- Full auditability of payroll amounts  
- Safe multi-revision what-if before lock  
- Slightly more storage for calc items/snapshots  

## Non-goals

- Full progressive tax engine from brackets (stored in rulesJson for future)  
- Replacing period-level ApprovalStep  
