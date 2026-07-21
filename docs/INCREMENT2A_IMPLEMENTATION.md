# Increment 2A — Payout Control Plane (Shipped)

**Date:** 2026-07-21  
**Migration:** `20260721_increment2a_payout_control` (additive)  
**ADR:** ADR-004

---

## Objective achieved

```text
Locked period + projected PayrollLine
→ Create PI DRAFT (no auto-approve)
→ Maker Submit
→ Checker Approve / Reject
→ APPROVED + execution READY (bank file eligible — I2-B)
```

---

## State transition matrix

| Phase (derived) | approvalStatus | executionStatus | submittedAt | Allowed actions |
|-----------------|----------------|-----------------|-------------|-----------------|
| DRAFT | PENDING | DRAFT | null | SUBMIT, CANCEL |
| SUBMITTED | PENDING | DRAFT | set | APPROVE, REJECT, CANCEL |
| APPROVED | APPROVED | READY | set | (none I2-A; bank file I2-B) |
| REJECTED | REJECTED | DRAFT | null | RESUBMIT, CANCEL |
| CANCELLED | * | CANCELLED | * | none |

**Encoding:** No new enum values; dual-axis uses existing `ApprovalStatus` + `PaymentInstructionStatus`.

---

## API

| Method | Path |
|--------|------|
| POST | `/api/payout/instructions` |
| GET | `/api/payout/instructions` |
| GET | `/api/payout/instructions/:id` |
| POST | `/api/payout/instructions/:id/submit` |
| POST | `/api/payout/instructions/:id/approve` |
| POST | `/api/payout/instructions/:id/reject` |
| POST | `/api/payout/instructions/:id/resubmit` |
| POST | `/api/payout/instructions/:id/cancel` |

Compat: `POST /api/payroll/generate-instruction` → creates **DRAFT** + `requiresApproval: true`.

---

## Acceptance evidence

| Scenario | Result |
|----------|--------|
| Create DRAFT from locked period | pass |
| Idempotent create | pass |
| Duplicate active PI rejected | pass |
| Self-approval rejected | pass |
| Checker approve → READY | pass |
| Approved cannot cancel | pass |
| Reject → resubmit → approve | pass |
| Amount invariant on create/submit/approve | enforced |
| Service E2E | `pnpm test:e2e:increment2a` **ok** |
| Unit SM | `pnpm test:payout-i2a` **ok** |

---

## UI

- `/payment-instructions` — batch list + approval queue filter
- `/payment-instructions/[id]` — detail, timeline, invariants, actions
- Payroll detail — **Create payment batch (DRAFT)**

No UUID paste for primary create path (period-bound button).

---

## Migration summary

Columns on `payment_instructions`:  
`maker_user_id`, `checker_user_id`, `checked_at`, `rejection_reason`, `approval_comment`, `content_checksum`, `idempotency_key`, `cancelled_at`, `cancel_reason`

---

## Remaining risks → I2-B

1. Bank file generation not yet gated UI-only message  
2. Browser E2E multi-user session not automated (service E2E covers SoD)  
3. Existing legacy PI rows may have APPROVED from pre-I2-A  
4. CSV download allowed on DRAFT for preview (ops convenience)

## Readiness for I2-B

**Yes** — control plane complete; next: adapter + `BankFileArtifact` only after APPROVED+READY.
