# ProQPay Increment 2 — Enterprise Payout & Execution  
## Design Review (No Implementation)

**Date:** 2026-07-21  
**Branch:** `feat/proqpay-enterprise-revamp`  
**Baseline:** Increment 1 + 1.5 complete  
**Constraint:** ADR-001 / ADR-003 unchanged — `PayrollLine` remains payout input; calc is never PI source

---

## Executive verdict

| Question | Answer |
|----------|--------|
| **1. Apakah desain I2 siap diimplementasikan?** | **Ya, dengan preconditions wajib** (lihat § Architecture must-fix). Domain models sudah 70% ada; lifecycle & maker-checker **belum** enterprise-grade. |
| **2. Production blockers?** | Auto-`approvalStatus=APPROVED` on generate; no dual-control; no item retry UI; no recon workspace; bank format = single CSV; dual period/PI status confusion; DisbursementBatch legacy parallel; no idempotency key on submit; no job queue. |
| **3. Perubahan arsitektur wajib sebelum coding?** | (A) Clarify **PaymentBatch = PaymentInstruction** (or introduce thin Batch header). (B) **Real maker-checker** on PI. (C) **BankFileArtifact + Adapter** interface. (D) **ReconciliationSession** domain. (E) Decouple period status soup from PI lifecycle. |
| **4. Urutan implementasi paling aman?** | See plan phases P0→P4 in `INCREMENT2_IMPLEMENTATION_PLAN.md`. |

**Final label:** `✅ DESIGN READY FOR CONTROLLED IMPLEMENTATION`  
(not “ready for unsupervised multi-bank production”)

---

## 1. As-built payout domain (evidence)

### What exists today

| Entity | Table | Role today | Gap |
|--------|-------|------------|-----|
| PayrollLine | `payroll_lines` | Canonical net pay source (ADR-001) | OK |
| PaymentInstruction | `payment_instructions` | Generated from lines; CSV download | Auto-approved; SIMULATED |
| PaymentInstructionItem | `payment_instruction_items` | Per-employee amount + status enum | No retry/execution UI |
| PaymentConfirmation | `payment_confirmations` | Client transfer proof upload/verify | Header-level, not item-level |
| PaymentConfirmationFile | `payment_confirmation_files` | Proof storage | OK pattern |
| DisbursementBatch | `disbursement_batches` | **Legacy monitor** | Parallel truth; DEPRECATE writes |
| Period statuses | `payroll_periods.status` | Mix of payroll + payout lifecycle | Overloaded |
| ClientPayment / Invoice | financial core | Separate AR path | Handoff weak |

### Critical as-built anti-patterns

1. **`generatePaymentInstruction` sets `approvalStatus: APPROVED` immediately**  
   → Maker-checker is fake; same user generates “approved” batch.

2. **`executionStatus: READY` at create**  
   → Skips DRAFT → Ready → Approved → Generated → Submitted ladder.

3. **Period status used as payout tracker** (`WAITING_CLIENT_TRANSFER`, `TRANSFER_PROOF_UPLOADED`, …)  
   → Confuses lock/calc freeze with bank execution; I1 correctly keeps LOCKED when PI generated but still dual-tracks.

4. **Confirmation is instruction-level**, not item-level  
   → Partial success / per-employee bank fail cannot be reconciled cleanly.

5. **Bank integration = one CSV** (`buildInstructionCsv`)  
   → No adapter; hard to add BCA/Mandiri/BNI/API.

6. **DisbursementBatch** coexists without linkage to PI  
   → Dashboard/monitor risk of wrong source.

7. **Commercial handoff**  
   → Invoice-from-period uses period totals; no hard gate “payout reconciled before invoice” or vice-versa policy.

---

## 2. Target enterprise architecture

```text
┌──────────────────────────────────────────────────────────────────┐
│ Locked PayrollPeriod  +  projected PayrollLine[] (immutable nets) │
└───────────────────────────────┬──────────────────────────────────┘
                                │ create (Maker)
                                ▼
┌──────────────────────────────────────────────────────────────────┐
│ PaymentInstruction  (= Payment Batch header)                      │
│  approvalStatus · executionStatus · integrationStatus · version   │
│  bankProfileId · adapterCode · idempotencyKey                     │
└───────────────┬───────────────────────────────┬──────────────────┘
                │ items                         │ artifacts
                ▼                               ▼
┌──────────────────────────┐      ┌────────────────────────────────┐
│ PaymentInstructionItem[] │      │ BankFileArtifact[]             │
│  amount · bank · status  │      │  format · checksum · payload   │
│  retryOfItemId · attempts│      │  Adapter generates/parses      │
└──────────┬───────────────┘      └───────────────┬────────────────┘
           │ execution results                    │ submit
           ▼                                      ▼
┌──────────────────────────┐      ┌────────────────────────────────┐
│ ExecutionEvent (append)  │      │ BankExecutionSession           │
│  SUCCESS/FAIL/PARTIAL    │      │  submittedAt · response · ref  │
└──────────┬───────────────┘      └───────────────┬────────────────┘
           │                                      │
           └──────────────┬───────────────────────┘
                          ▼
┌──────────────────────────────────────────────────────────────────┐
│ PaymentConfirmation (client proof)  +  item-level matches (opt)   │
└───────────────────────────────┬──────────────────────────────────┘
                                ▼
┌──────────────────────────────────────────────────────────────────┐
│ ReconciliationSession                                             │
│  expected (items) vs actual (confirm/bank response)               │
│  EXCEPTION queue → retry items → RECONCILED                       │
└───────────────────────────────┬──────────────────────────────────┘
                                ▼
┌──────────────────────────────────────────────────────────────────┐
│ Period.reconciliationStatus = RECONCILED · optional CLOSED        │
│ Commercial: invoice/AR may reference payout complete flag         │
└──────────────────────────────────────────────────────────────────┘
```

### Naming decision (required)

| Term (product) | Canonical model | Notes |
|----------------|-----------------|-------|
| **Payment Batch** | `PaymentInstruction` | Do **not** invent parallel batch table unless multi-PI aggregation is required later |
| **Payment Item** | `PaymentInstructionItem` | |
| **Legacy batch** | `DisbursementBatch` | Read-only historical; stop writing |

**Rationale:** Schema already has PI + items + enums. Introducing a second “Batch” aggregate without need doubles state. If product needs multi-period batching, add `PaymentBatch` later as optional parent of N instructions — **out of I2 MVP**.

---

## 3. State machine design

### 3.1 PaymentInstruction.executionStatus (canonical batch lifecycle)

```text
DRAFT
  → READY              (items validated, bank profile selected)
  → PENDING_APPROVAL   (submitted to checker)   [NEW semantic; map or extend enum]
  → APPROVED           (checker OK)             [use approvalStatus + READY]
  → GENERATED          (bank file artifact exists)
  → SUBMITTED          (sent to bank / handed to client)
  → PROCESSING
  → EXECUTED           (all items SUCCESS)
  → PARTIALLY_FAILED
  → FAILED
  → CANCELLED

From PARTIALLY_FAILED / FAILED:
  → PROCESSING         (retry subset)
  → EXECUTED | PARTIALLY_FAILED | FAILED

Terminal ops for I2 recon path:
  EXECUTED / PARTIALLY_FAILED + recon → RECONCILED (on period or recon session)
```

**Existing enum already has:**  
`NOT_STARTED | DRAFT | READY | SUBMITTED | PROCESSING | EXECUTED | PARTIALLY_FAILED | FAILED | CANCELLED`

**Additive enum values recommended (I2 migration):**

| Value | Purpose |
|-------|---------|
| `PENDING_APPROVAL` | After maker submit, before checker |
| `GENERATED` | Bank file produced |
| `RECONCILED` | Optional on PI, or keep only on period |

Alternatively avoid enum explosion: keep `approvalStatus` separate (PENDING/APPROVED/REJECTED) and use `executionStatus` only for bank path. **Preferred:** dual-axis design.

### 3.2 Dual-axis model (recommended)

| Axis | Field | Values (I2) |
|------|-------|-------------|
| Approval | `approvalStatus` | `PENDING` → `APPROVED` \| `REJECTED` |
| Execution | `executionStatus` | `DRAFT` → `READY` → `GENERATED` → `SUBMITTED` → `PROCESSING` → `EXECUTED` \| `PARTIALLY_FAILED` \| `FAILED` → `CANCELLED` |
| Integration | `integrationStatus` | `SIMULATED` \| `FILE_BASED` \| `API_CONNECTED` \| `MANUAL_CONFIRMATION` |

**Forbidden:** setting `approvalStatus=APPROVED` on create.

### 3.3 PaymentInstructionItem.status

```text
PENDING → VALIDATED → READY → PROCESSING → SUCCESS
                                      ↘ FAILED → (retry) PROCESSING → SUCCESS | FAILED
                                      ↘ CANCELLED
                                      ↘ REVERSED
```

### 3.4 PaymentConfirmationStatus (keep)

```text
UPLOADED → UNDER_REVIEW → VERIFIED | REJECTED | NEED_REVISION
```

### 3.5 ReconciliationStatus (period + session)

```text
NOT_STARTED → IN_PROGRESS → RECONCILED | EXCEPTION
```

### 3.6 Transition rules (summary)

| From → To | Guard |
|-----------|-------|
| DRAFT → READY | Lines projected; period LOCKED; items bank-validated |
| READY → PENDING_APPROVAL | Maker role; not same as auto-approve |
| PENDING_APPROVAL → APPROVED | Checker ≠ maker; role in matrix |
| PENDING_APPROVAL → REJECTED | Checker; comment required |
| REJECTED → DRAFT/READY | Maker edits; resubmit |
| APPROVED → GENERATED | Adapter produces artifact; checksum stored |
| GENERATED → SUBMITTED | Idempotency key; once-only per version |
| SUBMITTED → PROCESSING | Bank ack or manual mark |
| PROCESSING → EXECUTED | All items SUCCESS |
| PROCESSING → PARTIALLY_FAILED | Some FAILED |
| FAILED item → PROCESSING | Retry with attempt++ ; max attempts |
| Any pre-SUBMITTED → CANCELLED | Elevated role; no bank file sent |
| After EXECUTED/PARTIAL → recon session | Finance/ops |

---

## 4. Payment domain model (target)

### 4.1 Keep / extend

```text
PaymentInstruction
  + makerId, checkerId, submittedForApprovalAt, approvedAt, rejectedAt, rejectionReason
  + bankAdapterCode (e.g. GENERIC_CSV, BCA_LLG, MANDIRI_CSV, MANUAL)
  + bankProfileId? (BankAccount or new BankExportProfile)
  + idempotencyKey (unique company+key)
  + contentChecksum (hash of item set + amounts)
  + retryCount

PaymentInstructionItem
  + attemptNumber
  + retryOfItemId? (self-FK)
  + beneficiaryAccountHash (for recon; not full PAN)
  + bankResponseCode / bankResponseMessage
  + confirmedAmount? (from bank/confirmation match)
```

### 4.2 New additive tables (recommended)

| Model | Purpose |
|-------|---------|
| `BankFileArtifact` | Generated/uploaded bank file; format, checksum, storage path, instructionId, version |
| `BankExecutionSession` | One submit attempt; request/response metadata; status |
| `PaymentExecutionEvent` | Append-only event log per item/batch (immutable audit) |
| `ReconciliationSession` | Period or instruction scoped recon run |
| `ReconciliationException` | Unmatched / amount mismatch / duplicate confirmation |
| `PaymentItemConfirmation` (optional) | Link confirmation to items if partial |

### 4.3 Explicitly not in I2

- Live bank API productization (stub adapter only)
- WC funding orchestration (flag only)
- Payslip ESS (optional stretch)
- Multi-period mega-batch parent

---

## 5. Maker-checker design

### 5.1 Roles

| Role | Maker (create/edit/submit PI) | Checker (approve PI) | Execute/submit bank | Confirm proof | Recon |
|------|:-----------------------------:|:--------------------:|:-------------------:|:-------------:|:----:|
| PAYROLL_OPERATOR | Yes | No | No | Upload | No |
| PAYROLL_ADMIN / MANAGER | Yes | Yes* | Yes* | Yes | View |
| FINANCE / FINANCE_MANAGER | No** | Yes | Yes | Verify | Yes |
| APPROVER | No | Yes (PI only if in matrix) | No | No | No |
| DIRECTOR / SUPER_ADMIN | Override | Override | Override | Yes | Yes |
| AUDITOR / VIEWER | No | No | No | No | View |

\* Same user **cannot** maker+check same instruction unless `SUPER_ADMIN` with audit flag.  
\*\* Optional: finance as maker for WC path only — default **no**.

### 5.2 Segregation rule (hard)

```text
IF instruction.makerUserId == actor.id
  AND action == APPROVE
  AND actor.role != SUPER_ADMIN
THEN reject 403 "Maker cannot approve own payment batch"
```

Store both `generatedById` (maker) and `approvedById` (checker).

### 5.3 Hierarchy (configurable later)

I2 MVP: single checker step using `approvalStatus`.  
I2.1: multi-level matrix reusing `ApprovalMatrix` with entity=`PAYMENT_INSTRUCTION`.

### 5.4 Rejection / resubmit

```text
Checker REJECTED + comment
  → executionStatus stays DRAFT or READY
  → approvalStatus REJECTED
  → Maker edits items (only if not GENERATED)
  → resubmit → PENDING + new version++
```

After GENERATED, edits require **new instruction version** (cancel old, create v+1) to preserve audit.

---

## 6. Bank adapter design

### 6.1 Interface (conceptual)

```text
BankPaymentAdapter {
  code: string
  capabilities: { fileExport, fileImport, apiSubmit, apiStatus }

  validateItems(items, profile) → ValidationResult
  generateFile(instruction, items, profile) → BankFileArtifactDTO
  parseResponse(file|apiPayload) → ItemExecutionResult[]
  submit?(artifact, credentials) → BankExecutionSession  // optional
}
```

### 6.2 Built-in adapters (I2)

| Code | Role |
|------|------|
| `GENERIC_CSV` | Current CSV (compat) |
| `CLIENT_SELF_TRANSFER_PACK` | Human-readable pack for client ops |
| `SIMULATED_BANK` | Deterministic fake SUCCESS/FAIL for tests |
| `MANUAL_EXTERNAL` | Mark submitted manually with reference |

**Plugin path:** adapters registered in code map; future BCA/Mandiri as separate modules without schema rewrite.

### 6.3 Artifact storage

- Private bucket (same pattern as payment proof)
- Store: `storagePath`, `sha256`, `byteSize`, `mimeType`, `adapterCode`, `instructionVersion`
- Download via signed URL + RBAC

### 6.4 Do not

- Embed bank-specific columns on `PaymentInstruction`
- Parse only in UI
- Treat file generation as approval

---

## 7. Reconciliation design

```text
Expected = sum(SUCCESS items) + open FAILED
Actual   = verified PaymentConfirmation.amount
        + optional bank response SUCCESS totals

Match rules:
  |expected - actual| <= tolerance (IDR 1)  → RECONCILED
  actual < expected (material)              → EXCEPTION PARTIAL
  actual > expected                         → EXCEPTION OVERPAY / unapplied
  duplicate confirmation ref                → EXCEPTION DUPLICATE
  item FAILED without retry                 → EXCEPTION OPEN_FAILURES
```

### Workspace UI

| Queue | Content |
|-------|---------|
| Failed items | Item status FAILED; retry CTA |
| Unmatched confirmations | Confirmation without instruction link / amount mismatch |
| Partial batches | PARTIALLY_FAILED |
| Ready to close | All SUCCESS + confirmation VERIFIED |

### Manual adjustment (controlled)

- Finance-only; writes `ReconciliationException` resolution + `PaymentExecutionEvent`
- Never silent rewrite of PayrollLine net

---

## 8. Commercial handoff

| Event | Payroll | Billing/AR |
|-------|---------|------------|
| Lines projected + locked | Source of truth for PI amounts | Invoice **may** draft from period (existing) |
| PI EXECUTED / RECONCILED | Period recon status | Optional policy: block invoice issue until recon **OR** allow parallel (config) |
| Default I2 policy | **Allow** invoice independent of bank recon | Document risk; prefer “recon recommended” badge |
| Divergence prevention | PI item amount **must equal** PayrollLine.netPay at generation; freeze snapshot | Invoice from period totals must match SUM(lines) within tolerance |

**Invariant:**

```text
At PI generate time:
  SUM(items.amount) == SUM(lines.netPay) == period.totalNet  (±0.01)
```

No path from PI back to mutate PayrollLine.

---

## 9. Sequence diagrams

### 9.1 Happy path (self-funded client transfer)

```text
Operator                System                 Checker              Client
   |                       |                      |                   |
   |-- create PI from LOCKED period + lines ------>|                   |
   |                       |-- DRAFT/READY items --|                   |
   |-- submit for approval ----------------------->|                   |
   |                       |-- PENDING_APPROVAL -->|                   |
   |                       |                      |-- approve -------->|
   |                       |-- APPROVED -----------|                   |
   |-- generate bank file ------------------------>|                   |
   |                       |-- GENERATED artifact -|                   |
   |-- mark submitted / download ----------------->|                   |
   |                       |                      |-- transfer employees
   |                       |                      |                   |-- upload proof
   |                       |<------- confirmation UPLOADED ------------|
   |                       |-- under review ------>|                   |
   |                       |<------ VERIFIED ------|                   |
   |-- open recon session ------------------------>|                   |
   |                       |-- match amounts ------|                   |
   |                       |-- RECONCILED ---------|                   |
```

### 9.2 Partial failure + retry

```text
Bank response → item 3 FAILED
  → PI PARTIALLY_FAILED
  → Operator retry item 3 (new attempt / child item)
  → PROCESSING → SUCCESS
  → PI EXECUTED when no open FAILED
  → Recon
```

---

## 10. Database impact (design only)

| Change | Type | Risk |
|--------|------|------|
| PI maker/checker/idempotency/adapter fields | Additive columns | Low |
| Item attempt/retryOf | Additive | Low |
| BankFileArtifact | New table | Low |
| BankExecutionSession | New table | Low |
| PaymentExecutionEvent | New append-only | Low |
| ReconciliationSession + Exception | New tables | Low |
| Enum extensions | Additive values | Medium (Prisma + PG) |
| DisbursementBatch | No schema delete; stop writes | Low |

**No destructive migrations.**

---

## 11. API design (target)

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/payout/instructions` | Create PI from locked period (Maker) |
| GET | `/api/payout/instructions` | List/filter by status |
| GET | `/api/payout/instructions/:id` | Detail + items + artifacts |
| POST | `/api/payout/instructions/:id/submit-approval` | Maker → checker |
| POST | `/api/payout/instructions/:id/approve` | Checker approve/reject |
| POST | `/api/payout/instructions/:id/generate-file` | Adapter generate |
| GET | `/api/payout/instructions/:id/artifacts/:artifactId/download` | Signed download |
| POST | `/api/payout/instructions/:id/submit` | Mark submitted / simulated bank |
| POST | `/api/payout/items/:id/retry` | Retry failed item |
| POST | `/api/payout/instructions/:id/cancel` | Cancel pre-submit |
| GET/POST | `/api/payout/recon/sessions` | Recon workspace |
| POST | `/api/payout/recon/exceptions/:id/resolve` | Close exception |
| (existing) | confirmation upload/verify | Keep; bind to recon |

**Deprecate for new clients:** bare `/api/payroll/generate-instruction` auto-approve behavior — keep as thin wrapper that creates DRAFT + requires approval, or feature-flag.

---

## 12. UI navigation

| Screen | Route (proposed) | Primary role |
|--------|------------------|--------------|
| Payout monitor | `/payout` or enhance `/payment-instructions` | Ops/Finance |
| Batch detail | `/payout/[id]` | Ops |
| Approval inbox (PI) | `/payout/approvals` or unified `/approval?type=pi` | Checker |
| Failed items queue | `/payout/failed` | Ops |
| Bank files | section in batch detail | Ops |
| Confirmation | `/payment-confirmation` (keep) | Client/Ops/Finance |
| Recon workspace | `/payout/reconciliation` | Finance |
| Disbursement legacy | `/disbursement` | Label “Legacy” |

**UX principles**

- One primary CTA per status (“Submit for approval”, “Generate file”, “Retry 3 failed”)
- Failed queue first for ops morning standup
- Director: KPI only (executed amount, fail rate, recon lag) — no maker actions

---

## 13. Security findings

| ID | Finding | Severity | I2 requirement |
|----|---------|----------|----------------|
| S1 | Auto-approve on generate | **CRITICAL** | Remove; enforce maker≠checker |
| S2 | No idempotency on submit/generate | **HIGH** | Unique idempotencyKey |
| S3 | Replay download/submit | **MEDIUM** | Signed URL TTL + submit once |
| S4 | Masked account only in items; full account in Employee | **HIGH** | Never send full PAN to client logs; encrypt at rest already partial |
| S5 | Tenant by-id on PI | **HIGH** | assertCompanyAccess all routes |
| S6 | Confirmation verify without recon | **MEDIUM** | Link to recon session |
| S7 | SUPER_ADMIN override | **LOW** | Allow with mandatory comment + audit |
| S8 | Audit immutability | **MEDIUM** | ExecutionEvent append-only; no update |

---

## 14. Production readiness

| Concern | Current | I2 design |
|---------|---------|-----------|
| Background jobs | None | Prefer sync for file gen; queue for bank API later (`payout_jobs` optional) |
| Retry | Enum only | Item-level maxAttempts=3; exponential backoff only if API |
| Locking | Period lock OK | PI version lock: no edit after GENERATED |
| Concurrency | Risk double PI | Unique partial index: one OPEN PI per period (status not CANCELLED/EXECUTED) **or** allow multi with explicit flag |
| Transactions | Pooler-sensitive | Batch writes; short tx (lessons from I1) |
| Observability | AuditLog sparse | Structured events + metrics: fail rate, recon lag |
| Recovery | Manual | Runbook: cancel DRAFT; reverse FAILED items; re-issue v+1 |

**Recommended unique rule:**

```text
At most one PaymentInstruction per payrollPeriodId
  where executionStatus NOT IN (CANCELLED, FAILED)
  AND approvalStatus != REJECTED
```

Configurable later for multi-batch.

---

## 15. UX process efficiency (target)

| Task | Today | Target I2 |
|------|------:|----------:|
| Generate PI | 1 click, auto-approved | 2–3 clicks (create → submit → checker) |
| Get bank file | 1 download | 1 generate + download after approve |
| Handle 1 fail | Impossible in UI | Failed queue → retry |
| Confirm client paid | Upload/verify | Same + auto-open recon |
| Close period payout | Manual status | Recon complete CTA |

---

## 16. Architecture must-fix before coding

| # | Must-fix | Why |
|---|-----------|-----|
| M1 | Stop auto-approve PI | Security / SoD |
| M2 | Treat PI as batch; deprecate DisbursementBatch writes | Single source |
| M3 | Bank adapter interface + artifact table | Multi-bank |
| M4 | Item retry + partial status path | Real ops |
| M5 | Reconciliation session | Close the loop |
| M6 | Dual-axis approval vs execution statuses | Clear SM |
| M7 | Period remains LOCKED for calc; payout status on PI/recon | Avoid status soup growth |
| M8 | Invariant PI amounts == lines | No money drift |

**Optional before I2:** none blocking if M1–M8 in plan.

---

## 17. Safe implementation order

```text
Phase A — Correctness & control
  A1 PI create DRAFT (no auto-approve)
  A2 Maker submit + Checker approve (SoD)
  A3 Invariant checks + unique open PI policy

Phase B — Bank file
  B1 Adapter interface + GENERIC_CSV
  B2 BankFileArtifact generate/download
  B3 SIMULATED execution results

Phase C — Failure & retry
  C1 Item fail injection (sim) + failed queue UI
  C2 Retry item + PARTIALLY_FAILED rollup

Phase D — Confirmation & recon
  D1 Keep confirmation; link recon session
  D2 Match amounts; exception queue
  D3 Mark RECONCILED

Phase E — Hardening
  E1 Idempotency keys
  E2 Metrics + runbook
  E3 E2E browser + service tests
```

Do **not** start with payslip or real bank API.

---

## 18. Final verdict (repeat)

1. **Ready to implement?** Yes — design mature enough with M1–M8.  
2. **Blockers if ignored?** Fake approval, dual batch models, no recon, single CSV lock-in.  
3. **Mandatory arch changes?** SoD, adapter/artifact, recon domain, dual-axis status, freeze amounts from lines.  
4. **Safest order?** A → B → C → D → E above.

**Implementation contract:** `docs/INCREMENT2_IMPLEMENTATION_PLAN.md`
