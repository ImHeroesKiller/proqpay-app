# Increment 2 — Implementation Plan & Contract

**Status:** Ready for coding agent  
**Date:** 2026-07-21  
**Design review:** `docs/INCREMENT2_PAYOUT_DESIGN_REVIEW.md`  
**Do not start until:** I1 + I1.5 merged on branch; period LOCK + projected lines available  

---

## 0. Non-negotiable constraints

1. **ADR-001:** Payment amounts **only** from `PayrollLine` (projected). Never from raw calculation items at payout time.  
2. **ADR-003:** Engine versioning untouched by I2.  
3. **Additive migrations only** — no db push, reset, drop, truncate.  
4. **Production data safe.**  
5. **No auto-approve** of payment instructions.  
6. **Maker ≠ Checker** (except SUPER_ADMIN + mandatory comment).  
7. **DisbursementBatch:** stop new writes; UI label Legacy.  
8. **ClientPayment / Invoice:** do not rewrite financial core; only optional recon badge / policy flag.  
9. Prefer **short sequential writes** (Supabase pooler).  
10. Feature flag `PAYOUT_I2_ENFORCE_APPROVAL=true` default on for new PI path.

---

## 1. Product goal

Enterprise path:

```text
Locked period + projected lines
→ Create Payment Instruction (Maker)
→ Submit for approval
→ Checker approve
→ Generate bank file (adapter)
→ Submit / client transfer
→ Item execution (incl. partial fail + retry)
→ Payment confirmation
→ Reconciliation
→ Completed
```

---

## 2. Domain contract

### 2.1 Canonical names

| Product | Model |
|---------|--------|
| Payment Batch | `PaymentInstruction` |
| Payment Item | `PaymentInstructionItem` |
| Bank file | `BankFileArtifact` (new) |
| Execution attempt | `BankExecutionSession` (new) |
| Event log | `PaymentExecutionEvent` (new) |
| Recon | `ReconciliationSession` + `ReconciliationException` (new) |

### 2.2 Dual-axis status

**Approval (`approvalStatus`):**

```text
PENDING → APPROVED | REJECTED
REJECTED → (resubmit) PENDING
```

**Execution (`executionStatus`):**

```text
DRAFT → READY → GENERATED → SUBMITTED → PROCESSING
  → EXECUTED | PARTIALLY_FAILED | FAILED | CANCELLED
PARTIALLY_FAILED | FAILED → PROCESSING (retry)
```

**Item (`status`):**

```text
PENDING → VALIDATED → READY → PROCESSING → SUCCESS | FAILED | CANCELLED | REVERSED
FAILED → PROCESSING (retry, attempt++)
```

### 2.3 Invariants

```text
I1: period.status is LOCKED (preferred) or APPROVED+projected before PI create
I2: period.projectedCalculationId IS NOT NULL
I3: SUM(item.amount) == SUM(line.netPay) == period.totalNet (±0.01)
I4: item.payrollLineId required; amount copied from line.netPay at create (snapshot)
I5: makerUserId != checkerUserId unless SUPER_ADMIN
I6: no second OPEN instruction per period (configurable; default enforce)
I7: no item edit after executionStatus ∈ {GENERATED, SUBMITTED, PROCESSING, EXECUTED}
I8: PayrollLine immutable after period LOCK (already I1)
```

---

## 3. Database plan (additive)

### 3.1 Alter `payment_instructions`

| Column | Type | Notes |
|--------|------|-------|
| `maker_user_id` | UUID? | = generated_by if null backfill |
| `checker_user_id` | UUID? | |
| `submitted_for_approval_at` | timestamptz? | |
| `approved_at` | timestamptz? | |
| `rejected_at` | timestamptz? | |
| `rejection_reason` | text? | |
| `bank_adapter_code` | text | default `GENERIC_CSV` |
| `idempotency_key` | text? | unique (company_id, idempotency_key) |
| `content_checksum` | text? | hash of sorted lineId:amount |
| `max_item_retries` | int | default 3 |

### 3.2 Alter `payment_instruction_items`

| Column | Type |
|--------|------|
| `attempt_number` | int default 1 |
| `retry_of_item_id` | UUID? FK self |
| `beneficiary_account_last4` | text? |
| `confirmed_amount` | decimal? |
| `last_event_at` | timestamptz? |

### 3.3 New tables

```text
bank_file_artifacts
  id, company_id, payment_instruction_id, adapter_code, file_name,
  storage_path, content_checksum, byte_size, mime_type, version,
  generated_by, generated_at

bank_execution_sessions
  id, company_id, payment_instruction_id, artifact_id?,
  status, external_reference, request_meta, response_meta,
  started_at, finished_at, created_by

payment_execution_events  -- append-only
  id, company_id, payment_instruction_id, item_id?,
  event_type, payload_json, actor_id, created_at

reconciliation_sessions
  id, company_id, payroll_period_id, payment_instruction_id?,
  status, expected_amount, confirmed_amount, variance,
  opened_by, closed_by, opened_at, closed_at

reconciliation_exceptions
  id, session_id, code, severity, message, item_id?, confirmation_id?,
  status OPEN|RESOLVED|IGNORED, resolution_note, resolved_by, resolved_at
```

### 3.4 Enums

Prefer **not** breaking existing `PaymentInstructionStatus` consumers:

- Add values if needed: `GENERATED`, `PENDING_APPROVAL` **or** encode pending via `approvalStatus=PENDING` + `executionStatus=READY`.

**Recommended I2 encoding (minimal enum churn):**

| State | approvalStatus | executionStatus |
|-------|----------------|-----------------|
| Draft | PENDING | DRAFT |
| Ready for check | PENDING | READY |
| Approved | APPROVED | READY |
| File generated | APPROVED | GENERATED* or READY + artifact exists |
| Submitted | APPROVED | SUBMITTED |
| Done | APPROVED | EXECUTED |
| Partial | APPROVED | PARTIALLY_FAILED |

\* If GENERATED cannot be added quickly, use artifact existence as proxy + keep READY until SUBMITTED.

### 3.5 Indexes

- Unique open PI per period (partial unique index if PG supports)  
- `(company_id, execution_status)`  
- `(payment_instruction_id, status)` on items  

---

## 4. Service layer modules

```text
lib/payout/
  instruction-service.ts   # create, submit, approve, cancel
  item-service.ts          # validate, retry
  bank/
    types.ts
    registry.ts
    adapters/generic-csv.ts
    adapters/simulated.ts
    artifact-service.ts
  execution-service.ts     # submit, apply results
  recon-service.ts
  invariants.ts
  events.ts                # append PaymentExecutionEvent
```

Keep `lib/data/confirmations.ts` for proof path; call recon hooks after VERIFIED.

### 4.1 createInstruction(periodId)

```text
assert period LOCKED (or APPROVED+projected)
assert projectedCalculationId
assert no open PI (I6)
load lines
checksum = sha256(sorted lineId:netPay)
create PI approvalStatus=PENDING executionStatus=DRAFT
create items amount=line.netPay status=READY
event CREATED
```

### 4.2 submitForApproval

```text
assert maker
assert status DRAFT|READY and approval PENDING|REJECTED
set executionStatus=READY, submittedForApprovalAt
event SUBMITTED_FOR_APPROVAL
```

### 4.3 approve / reject

```text
assert checker role
assert maker != checker
approve → approvalStatus=APPROVED, approvedAt, checkerUserId
reject → REJECTED + reason
event APPROVED | REJECTED
```

### 4.4 generateFile

```text
assert APPROVED
adapter.generateFile → BankFileArtifact
executionStatus → GENERATED or keep READY
event FILE_GENERATED
```

### 4.5 submitExecution

```text
assert APPROVED and artifact exists (unless MANUAL)
idempotency: reject if already SUBMITTED+
create BankExecutionSession
set SUBMITTED → PROCESSING
simulated adapter: mark items SUCCESS/FAIL
rollup PI status
event SUBMITTED / ITEM_* 
```

### 4.6 retryItem

```text
assert FAILED and attempt < max
set PROCESSING, attempt++
optional new item row with retryOfItemId
event ITEM_RETRY
```

### 4.7 recon

```text
open session from PI + confirmed payments
match totals and optional refs
create exceptions
close → period.reconciliationStatus=RECONCILED
```

---

## 5. API contract

| Method | Path | Auth | Body / notes |
|--------|------|------|--------------|
| POST | `/api/payout/instructions` | Maker | `{ periodId, idempotencyKey?, adapterCode? }` |
| GET | `/api/payout/instructions` | Ops | filters status, company |
| GET | `/api/payout/instructions/:id` | Ops | detail |
| POST | `/api/payout/instructions/:id/submit-approval` | Maker | |
| POST | `/api/payout/instructions/:id/decision` | Checker | `{ decision: APPROVED\|REJECTED, comment? }` |
| POST | `/api/payout/instructions/:id/generate-file` | Ops | `{ adapterCode? }` |
| GET | `/api/payout/artifacts/:id/download` | Ops | signed URL |
| POST | `/api/payout/instructions/:id/submit` | Ops | `{ mode: SIMULATED\|MANUAL, externalReference? }` |
| POST | `/api/payout/items/:id/retry` | Ops | |
| POST | `/api/payout/instructions/:id/cancel` | Manager+ | `{ reason }` |
| GET/POST | `/api/payout/recon` | Finance | sessions |
| POST | `/api/payout/recon/exceptions/:id/resolve` | Finance | |

**Compat:**  
`POST /api/payroll/generate-instruction` → either:

- Create DRAFT + return id (breaking soft change), **or**
- Feature-flag old path off; UI uses new APIs only.

**Recommendation:** soft-break: generate creates DRAFT PENDING approval; response includes `{ id, requiresApproval: true }`.

---

## 6. UI contract

### 6.1 Routes

| Route | Purpose |
|-------|---------|
| `/payment-instructions` | Enhance as Payout Monitor (statuses, filters) |
| `/payment-instructions/[id]` | **New** batch detail: timeline, items table, actions |
| `/payment-instructions/approvals` | Checker queue |
| `/payment-instructions/failed` | Failed items queue |
| `/payment-instructions/reconciliation` | Recon workspace |
| `/payment-confirmation/*` | Keep |
| `/disbursement` | Banner: Legacy read-only |

### 6.2 Status → primary CTA

| Condition | CTA |
|-----------|-----|
| No PI, period LOCKED | Create payment batch |
| PI DRAFT, maker | Submit for approval |
| PI READY+PENDING, checker | Approve / Reject |
| APPROVED, no artifact | Generate bank file |
| Artifact exists | Download / Mark submitted |
| PARTIALLY_FAILED | Open failed queue |
| Confirmation VERIFIED | Open recon |
| Recon clear | Mark reconciled |

### 6.3 Period detail link

After lock: CTA “Create payment batch” → payout API.

---

## 7. Security contract

| Control | Implementation |
|---------|----------------|
| Tenant | `assertTenantOrThrow` all payout routes |
| Module RBAC | `payment_instructions`, new optional `payout_approve` via approval module |
| SoD | maker ≠ checker |
| Idempotency | header or body key unique per company |
| Audit | `PaymentExecutionEvent` + existing `AuditLog` |
| Files | private storage + signed GET |
| No full account in logs | use last4 / mask only |

---

## 8. Test contract

### Unit

- State transition matrix (legal/illegal)
- SoD rejection
- Amount invariant
- Checksum stability
- Adapter CSV golden file
- Recon match / mismatch

### Integration (DB)

```text
Lock period with lines
→ create PI
→ submit approval
→ approve as other user
→ generate file
→ simulate execution all SUCCESS
→ confirmation verify
→ recon RECONCILED
```

```text
Partial FAIL one item
→ retry SUCCESS
→ rollup EXECUTED
```

### Browser E2E (optional Playwright)

- Checker cannot see maker actions
- Failed queue retry button

### Commands (to add)

```text
pnpm test:payout
pnpm test:e2e:increment2
```

---

## 9. Phased delivery (coding sprints)

### Sprint I2-A — Control plane (3–5 days)

- [ ] Migration columns + events table (minimal)
- [ ] create / submit-approval / decision services
- [ ] Remove auto-approve from generate path
- [ ] UI: batch detail + approval actions
- [ ] Tests: SoD + transitions

**Exit:** No PI can be “approved” without checker.

### Sprint I2-B — Bank file (2–4 days)

- [ ] Adapter interface + GENERIC_CSV + SIMULATED
- [ ] BankFileArtifact generate/download
- [ ] UI download after approve

**Exit:** Approved batch produces downloadable artifact with checksum.

### Sprint I2-C — Execution & retry (3–4 days)

- [ ] submit simulated execution
- [ ] item fail/success rollup
- [ ] retry item API + failed queue UI

**Exit:** Partial fail → retry → EXECUTED.

### Sprint I2-D — Confirmation & recon (3–5 days)

- [ ] ReconciliationSession after confirmation verified
- [ ] Exception queue + resolve
- [ ] period.reconciliationStatus update
- [ ] Summary badges on payroll detail

**Exit:** End-to-end recon path green.

### Sprint I2-E — Hardening (2 days)

- [ ] Idempotency keys
- [ ] Open-PI uniqueness
- [ ] Runbook doc
- [ ] Full E2E + readiness update

---

## 10. Out of scope (explicit)

- Real bank API credentials product
- WC auto-funding before PI
- Payslip PDF ESS
- Multi-period mega-batch
- Deleting DisbursementBatch table
- Changing invoice mandatory-after-payout (config later)
- Treasury cash movement auto-post from PI

---

## 11. Definition of Done (Increment 2)

1. Maker-checker enforced with tests.  
2. PI amounts always match locked PayrollLines.  
3. Bank file via adapter + artifact stored.  
4. Partial failure + retry works.  
5. Confirmation still works and feeds recon.  
6. Reconciliation can reach RECONCILED.  
7. Legacy disbursement not written.  
8. Docs: INCREMENT2_IMPLEMENTATION.md report after ship.  
9. Roadmap payout maturity updated with evidence.  
10. `pnpm typecheck && pnpm test && pnpm test:e2e:increment2` pass.

---

## 12. Coding agent launch prompt

```text
Implement Increment 2 Phase I2-A through I2-D per docs/INCREMENT2_IMPLEMENTATION_PLAN.md
and docs/INCREMENT2_PAYOUT_DESIGN_REVIEW.md.

Constraints:
- ADR-001: amounts from PayrollLine only
- Additive migrations only; no db push/reset/drop
- Maker ≠ checker; no auto-approve on PI create
- PaymentInstruction is the batch; do not write DisbursementBatch
- Supabase pooler: avoid long interactive transactions
- Extend existing confirmation flow; add recon sessions
- Feature-flag or soft-migrate generate-instruction to require approval

Deliver:
- schema migration + services under lib/payout/
- APIs under app/api/payout/
- UI batch detail, approval queue, failed queue, recon workspace
- unit + integration E2E tests
- docs/INCREMENT2_IMPLEMENTATION.md when done

Start with I2-A only if splitting PRs; do not skip SoD.
```

---

## 13. Risks & mitigations

| Risk | Mitigation |
|------|------------|
| Soft-break generate-instruction | Flag + UI update same PR |
| Enum migration pain | Prefer dual-axis without new enum values first |
| Double PI | Partial unique index |
| Pooler timeouts | createMany chunks |
| Confirmation vs item mismatch | Recon exceptions not silent pass |

---

## 14. Success metrics (post-ship)

- % PI with distinct maker/checker = 100% (non-admin)
- Time to recon after confirmation < 1 day ops SLA
- Failed item retry success rate tracked
- Zero PI amount ≠ line sum incidents
