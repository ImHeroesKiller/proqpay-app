# ADR-004 — Payout Batch Identity & Segregation of Duties

**Status:** Accepted (design)  
**Date:** 2026-07-21  
**Phase:** Increment 2  

---

## Context

Increment 1 generates `PaymentInstruction` with `approvalStatus=APPROVED` at create time.  
`DisbursementBatch` exists as a legacy parallel monitor.  
Enterprise outsourcing requires dual control before bank files leave the system.

## Decisions

1. **Payment Batch = `PaymentInstruction`** for I2. Do not introduce a second batch aggregate unless multi-instruction grouping is proven necessary.  
2. **`DisbursementBatch` is legacy:** no new writes; UI labeled legacy.  
3. **Maker-checker is mandatory** on payment instructions before bank file generation.  
4. **Dual-axis status:** `approvalStatus` (control) × `executionStatus` (bank path).  
5. **Amounts are snapshotted from locked `PayrollLine`** at instruction create; never re-read mutable employee salary fields for PI amounts.  
6. **Bank connectivity is adapter-based** (`BankFileArtifact` + `BankPaymentAdapter`), not format-specific schema.  
7. **Reconciliation is a first-class session**, not only a period enum flag.

## Consequences

- Soft migration of `generate-instruction` behavior  
- Additional tables for artifacts, events, recon  
- Slightly more operator clicks; much higher control  

## Rejected alternatives

| Alternative | Why rejected |
|-------------|--------------|
| New PaymentBatch table wrapping one PI | Unnecessary indirection for MVP |
| Keep auto-approve for “speed” | Fails enterprise audit |
| Item amounts re-fetched from Employee at file gen | Money drift risk |
| Single bank CSV only forever | Blocks multi-bank clients |
