# Prisma Migration Recovery & Baselining (Production-Safe)

**Date:** 2026-07-21  
**Branch:** `feat/proqpay-enterprise-revamp`  
**Database:** Supabase PostgreSQL `proqpay` schema (ap-southeast-2)  
**Audit tool:** `scripts/audit-db-migrations.mjs` (read-only)

---

## 1. Root cause analysis

### What happened

| Fact | Evidence |
|------|----------|
| Schema was **not** created by `prisma migrate deploy` | Table `_prisma_migrations` **does not exist** |
| Schema was built mainly via **`prisma db push`** (+ documented stubs) | Migration SQL for 20260720_* is only comments + `SELECT 1` with header “Applied via db push” |
| Production / shared DB has **real operational data** | `companies=5`, `employees=54`, `payroll_periods=5`, `payroll_lines=130`, `users=6` |
| Phase 1A/1B SQL **never applied** | Tables `invoices`, `payroll_calculations`, etc. **MISSING**; Role enum lacks new roles; `payroll_components` lacks engine columns |
| Shared Supabase project | Many **unrelated** tables in `public` (IDA/PA/workspaces) — must not be touched |

### Why P3005 occurs

```
P3005: The database schema is not empty.
```

Prisma `migrate deploy` (or first migrate command) finds:

1. **Non-empty database** (33 tables in `proqpay` + many in `public`)
2. **No migration history** (`_prisma_migrations` absent)

Prisma refuses to treat this as a greenfield migrate target without an explicit **baseline**.

### Why four migrations show as “pending”

| Migration folder | SQL reality | Reflected in DB? |
|------------------|-------------|------------------|
| `20260720_business_workflow` | Stub (`SELECT 1`) — docs only | **Yes** (via historical `db push`) |
| `20260720_payment_confirmation` | Stub (`SELECT 1`) — docs only | **Yes** (via historical `db push`) |
| `20260721_financial_core` | Full additive DDL (~431 lines) | **No** |
| `20260721_payroll_engine` | Full additive DDL (~298 lines) | **No** |

So: “4 pending” is correct from Prisma’s view (no history table), but **only the last two** still need DDL execution.

---

## 2. Current-state diagram

```text
                    ┌─────────────────────────────────────┐
                    │         prisma/schema.prisma         │
                    │  (ops + Financial Core + Engine)     │
                    └─────────────────┬───────────────────┘
                                      │
              ┌───────────────────────┼───────────────────────┐
              │                       │                       │
              ▼                       ▼                       ▼
     ┌────────────────┐    ┌────────────────────┐   ┌──────────────────┐
     │ Migration files│    │ Live Supabase DB    │   │ _prisma_migrations│
     │ 4 folders      │    │ schema: proqpay     │   │ **DOES NOT EXIST**│
     └───────┬────────┘    └─────────┬──────────┘   └──────────────────┘
             │                       │
     ┌───────┴────────┐              │
     │ Stub x2 (push) │              │
     │ Real SQL x2    │              │
     └────────────────┘              │
                                     ▼
                    ┌────────────────────────────────────┐
                    │ proqpay: 33 tables WITH DATA         │
                    │ (ops: companies, employees, payroll…)│
                    │ MISSING: invoices, calculations…     │
                    │ Role: no FINANCE_MANAGER / CLIENT…   │
                    │ payroll_components: no engine cols   │
                    └────────────────────────────────────┘
                                     │
                                     ▼
                    ┌────────────────────────────────────┐
                    │ public: many non-ProQPay tables      │
                    │ (IDA / chat / workspaces) — leave alone│
                    └────────────────────────────────────┘
```

### Table inventory (high level)

**Present (ops — keep data):**  
organizations, companies, users, employees, payroll_periods, payroll_lines, payment_instructions*, payment_confirmations*, working_capital_requests, projects, … (33 total)

**Missing (must ADD via SQL — no data loss):**  
All Financial Core + Payroll Engine tables listed in audit `expectedMissing` (26+ tables), plus engine columns on `payroll_components`, plus Role enum values.

---

## 3. Best strategy (recommended)

### Name: **Baseline historical stubs → Deploy additive SQL**

| Step | Action | Why |
|------|--------|-----|
| A | Create migration history by **marking first two stubs as already applied** | Matches reality: schema already from `db push` |
| B | **`prisma migrate deploy`** to run financial_core + payroll_engine | Additive DDL only; fills gap to `schema.prisma` |
| C | Verify with audit script + `migrate status` | Confirm history + tables |
| D | Future changes only via new migrations + `migrate deploy` | End P3005 forever |

This is Prisma’s standard **baselining** approach for existing production DBs.

### Strategies considered and rejected

| Approach | Verdict |
|----------|---------|
| `migrate reset` / `db push --force-reset` | **Forbidden** — data loss |
| `DROP SCHEMA proqpay` | **Forbidden** |
| Mark **all four** as applied without running 1A/1B SQL | **Wrong** — schema would remain incomplete |
| Single squashed baseline replacing 4 folders mid-flight | Possible later, but **riskier** history rewrite; not needed |
| `db push` for 1A/1B then mark all applied | Works but **bypasses migration SQL review**; worse for audit trail |
| Run raw SQL manually then invent checksums | Error-prone; prefer Prisma apply for real SQL migrations |

---

## 4. Step-by-step procedure

### Phase 0 — Preconditions (read-only)

1. Confirm backup / Supabase PITR available for the project.
2. Run audit:

```bash
node scripts/audit-db-migrations.mjs
```

3. Confirm:
   - `_prisma_migrations` missing **or** empty of our four names  
   - ops tables + row counts intact  
   - invoices / payroll_calculations still missing  

4. Use **DIRECT_URL** (session mode, port 5432) for migrate commands — not transaction pooler 6543 if possible.

```bash
# Ensure .env has DIRECT_URL for migrations (schema already expects it)
export $(grep -v '^#' .env.local | xargs)   # local only; never print
```

### Phase 1 — Baseline stub migrations (no DDL change)

These only create `_prisma_migrations` and insert “already applied” rows for the two **documentation stubs**. They do **not** re-run schema creation.

```bash
cd /path/to/proqpay-app

# 1) Mark business workflow stub as applied (creates history table if needed)
pnpm exec prisma migrate resolve --applied 20260720_business_workflow

# 2) Mark payment confirmation stub as applied
pnpm exec prisma migrate resolve --applied 20260720_payment_confirmation
```

**Expected:**

- `_prisma_migrations` exists  
- Two rows finished  
- `migrate status` shows remaining: financial_core, payroll_engine  

```bash
pnpm exec prisma migrate status
```

### Phase 2 — Apply real additive migrations

```bash
pnpm exec prisma migrate deploy
```

**Expected:**

- Applies `20260721_financial_core`  
- Applies `20260721_payroll_engine`  
- Exit code 0  

### Phase 3 — Verify

```bash
node scripts/audit-db-migrations.mjs
pnpm exec prisma migrate status
pnpm exec prisma generate
pnpm typecheck
```

**Success criteria:**

- `expectedMissing` empty (or only optional future tables)  
- `invoices`, `payroll_calculations` present with count 0  
- Role includes FINANCE_MANAGER, FINANCE_STAFF, PAYROLL_MANAGER, CLIENT  
- `payroll_components` has `formula_expression`, `category_code`, etc.  
- `migrate status`: **Database schema is up to date**  
- Ops row counts unchanged: companies 5, employees 54, periods 5, lines 130, users 6  

### Phase 4 — Optional post-baseline hygiene (later, non-urgent)

- Add a short README in each stub migration folder clarifying they are baselines.  
- Do **not** rewrite past migration checksums unless coordinating all environments.  
- For **new** environments: `migrate deploy` from empty → runs all four in order (stubs are no-ops, then real SQL).

---

## 5. Prisma commands (exact sequence)

```bash
# --- READ-ONLY CHECK ---
node scripts/audit-db-migrations.mjs
pnpm exec prisma migrate status

# --- BASELINE (stubs only) ---
pnpm exec prisma migrate resolve --applied 20260720_business_workflow
pnpm exec prisma migrate resolve --applied 20260720_payment_confirmation

# --- APPLY REAL DDL ---
pnpm exec prisma migrate deploy

# --- VERIFY ---
pnpm exec prisma migrate status
node scripts/audit-db-migrations.mjs
pnpm exec prisma generate
```

**Do not use:**

```bash
prisma migrate reset
prisma db push --force-reset
prisma migrate dev   # on production; can prompt to reset / create drift migrations
```

---

## 6. SQL to review before deploy

### A. Stub migrations (already “applied” via resolve — no real DDL)

- `20260720_business_workflow/migration.sql` → `SELECT 1;` only  
- `20260720_payment_confirmation/migration.sql` → `SELECT 1;` only  

**Safe** to mark applied.

### B. `20260721_financial_core/migration.sql` (will EXECUTE)

**Intended operations (additive):**

- `ALTER TYPE Role ADD VALUE IF NOT EXISTS …`  
- `CREATE TYPE` for invoice/payment/receivable/treasury enums (guarded)  
- `CREATE TABLE IF NOT EXISTS` for financial tables  
- `CREATE INDEX` / unique partial index (one active invoice per payroll period)  
- `ALTER TABLE … ADD CONSTRAINT` FKs  

**Review checklist:**

| Check | Status in file |
|-------|----------------|
| DROP TABLE | None intended |
| DROP COLUMN | None |
| TRUNCATE | None |
| DROP SCHEMA | None |
| Destructive renames | None |
| IF NOT EXISTS / exception handlers | Yes for types/tables |
| FK targets exist | References existing companies, organizations, projects, payroll_periods, working_capital_requests |

**Note on `ADD VALUE IF NOT EXISTS`:** requires PostgreSQL 9.1+ / Supabase OK. Some Prisma transactions historically conflicted with enum ADD VALUE; if deploy fails mid-enum, re-run deploy after fixing (values already added are safe with IF NOT EXISTS).

**Note on FK ADD CONSTRAINT without IF NOT EXISTS:** if a constraint name already exists, step may error — first deploy on this DB should be clean (tables new).

### C. `20260721_payroll_engine/migration.sql` (will EXECUTE)

**Intended operations:**

- `ALTER TABLE payroll_components ADD COLUMN IF NOT EXISTS …` (nullable/extension cols)  
- New enums + tables for formulas, calculations, approvals, journals, budgets, billing profile  
- FKs with `EXCEPTION WHEN duplicate_object`  

**Review checklist:**

| Check | Status |
|-------|--------|
| DROP | None |
| Only ADD COLUMN on existing table | Yes (`payroll_components`) |
| Defaults safe for existing rows | Yes (boolean defaults, nullable strings) |
| Does not rewrite employee/payroll data | Yes |

---

## 7. Risks per step

| Step | Risk | Likelihood | Mitigation |
|------|------|------------|------------|
| resolve --applied stubs | Marking applied if schema **doesn’t** match stubs’ intended “push” state | Low | Audit shows ops tables present; stubs are no-ops |
| migrate deploy financial | Partial apply if network drop mid-migration | Low–med | Supabase PITR; re-run deploy (IF NOT EXISTS helps); inspect `_prisma_migrations` |
| Enum ADD VALUE | Transaction / lock issues | Low | IF NOT EXISTS; retry |
| Unique index one-invoice-per-period | Fails if dirty partial data | N/A | Table empty on first create |
| Wrong URL (pooler 6543) | Flaky migrate / prepared statement issues | Med | Prefer DIRECT_URL session port 5432 |
| Touching `public` schema | Collateral damage | High if manual SQL wrong | **Never** migrate/public drop; only proqpay DDL |
| Concurrent app writes during migrate | Lock waits | Low | Run in maintenance window if high traffic |

**Data loss risk of recommended path:** **None** for existing ops rows if only additive DDL runs.

---

## 8. Rollback plan

### If baseline resolve succeeded but deploy not yet run

```bash
# Only if you must undo history markers (rare)
# Prefer: leave markers; they match reality.
```

Manual delete from `_prisma_migrations` is possible but usually unnecessary.

### If deploy fails mid-way

1. Capture error message + `SELECT * FROM _prisma_migrations`.  
2. Re-run audit script — which tables now exist?  
3. Prefer **fix deploy** if migrations are idempotent (IF NOT EXISTS).  
4. If a failed migration is stuck “failed” in history, use Prisma docs for `migrate resolve --rolled-back <name>` then fix SQL and re-deploy — **only after review**.  
5. Supabase: restore to PITR timestamp **before** deploy if catastrophic (should not be needed for additive DDL).

### If need to abandon new modules only

Dropping Phase 1A/1B tables is possible later with a **new** forward migration (explicit DROP) — not recommended unless product discards features. Never drop ops tables.

---

## 9. Checklist BEFORE execute

- [ ] Supabase backup / PITR confirmed  
- [ ] Window chosen (low traffic)  
- [ ] `node scripts/audit-db-migrations.mjs` saved output  
- [ ] Row counts noted: companies=5, employees=54, periods=5, lines=130, users=6  
- [ ] `DIRECT_URL` works for CLI  
- [ ] Reviewed financial_core + payroll_engine SQL for DROP/TRUNCATE  
- [ ] No parallel `db push` / other migrate from another machine  
- [ ] App can tolerate brief locks on `payroll_components` ALTER  
- [ ] Stakeholders know Financial/Payroll engine tables start **empty**  

---

## 10. Checklist AFTER execute

- [ ] `prisma migrate status` → up to date  
- [ ] Four rows in `_prisma_migrations`, all finished  
- [ ] `invoices`, `receivables`, `client_payments`, `payroll_calculations`, … exist  
- [ ] Role enum has FINANCE_MANAGER, FINANCE_STAFF, PAYROLL_MANAGER, CLIENT  
- [ ] Ops row counts **unchanged**  
- [ ] `public` table list unchanged  
- [ ] `pnpm exec prisma generate` + `pnpm typecheck` OK  
- [ ] Smoke: login, dashboard, payroll list  
- [ ] Optional: POST financial/payroll-engine API smoke on empty tables  
- [ ] Document deploy time + operator in runbook  

---

## Expected end state

| Item | Target |
|------|--------|
| Data | All existing proqpay rows intact |
| Schema | Matches `prisma/schema.prisma` (ops + Financial Core + Payroll Engine) |
| History | `_prisma_migrations` complete for all 4 folders |
| Future | Only `pnpm exec prisma migrate deploy` for new migrations |
| P3005 | Gone |

---

## Appendix — Audit snapshot (2026-07-21)

```
_prisma_migrations: MISSING
proqpay tables: 33 (ops only)
invoices / payroll_calculations: MISSING
Role: SUPER_ADMIN, PAYROLL_ADMIN, FINANCE, HR, DIRECTOR, APPROVER, VIEWER,
      PAYROLL_OPERATOR, AUDITOR  (no Phase 1A role extensions yet)
payroll_components columns: no formula_expression / category_code yet
```

Re-run anytime:

```bash
node scripts/audit-db-migrations.mjs
```
