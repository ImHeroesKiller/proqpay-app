# Data Reseed Plan — Realistic Baseline 2026

**Branch:** `feat/proqpay-enterprise-revamp`  
**Script:** `prisma/seed-realistic.ts`  
**Commands:**

```bash
pnpm seed:realistic -- --dry-run
ALLOW_DATA_RESEED=true pnpm seed:realistic -- --execute
```

---

## 1. Data deleted (cleanup)

| Category | Source before reseed |
|----------|----------------------|
| Demo company | `PT Mandiri Semesta Gemilang — Client Demo Co.` |
| Employees | 12 legacy MSG-1xxx rows |
| Payroll periods / lines | 4 periods / 12 lines (old nets ~123M) |
| Projects | `PRJ-DEMO` / Demo Event Ops |
| Sales opportunities | 3 anonymized legacy rows |
| Capital partner / allocation | Demo Funding Partner |
| Working capital | 3 legacy requests |
| Payment instructions / items | Legacy PI |
| Disbursements / approvals | Legacy workflow |
| Attendance / audit | Legacy sample |
| Non-operator users | None extra (all 6 operators recreated) |

Cleanup order: confirmation files → confirmations → PI items → PI → disbursements → approvals → payroll lines → capital allocations → WC → attendance → assignments → periods → employees → projects → pricing → sales → banks → capital partners → notifications → login history → audit → org structure children → companies → users (all, then recreated).

---

## 2. Data preserved

| Item | Notes |
|------|--------|
| Organization | `msg-technology` slug (same row reused) |
| Operator emails | `admin@`, `andi.`, `siti.`, `budi.`, `dewi.`, `rina.@msg-os.com` |
| Schema / migrations | Untouched |
| Env / Auth config | Untouched |
| Role enum definitions | Schema-level |

---

## 3. Safety mechanisms

| Control | Behavior |
|---------|----------|
| `ALLOW_DATA_RESEED=true` | Required for `--execute` |
| `--dry-run` (default without execute) | Inventory + plan only |
| Production-like detection | Blocks unless `--confirm-production` |
| No `migrate reset` | Explicit deletes only |
| Operator password | `OPERATOR_SEED_PASSWORD` or default seed constant (not rendered in prod UI) |

---

## 4. Dry-run result (pre-execute)

```
organization: 1
company: 1 (Client Demo Co.)
user: 6, employee: 12, payrollPeriod: 4, …
Mode: DRY-RUN — no writes
```

---

## 5. Execute result (post)

See `docs/DATA_RECONCILIATION.md` and `docs/DATASET_NEW_BASELINE.md`.

All reconciliation checks **PASS**.

---

## 6. Rollback plan

1. Restore DB from backup/snapshot taken before reseed (recommended for shared envs).  
2. Or re-run legacy `pnpm db:seed` (deprecated sample only).  
3. Or re-run `seed:realistic --execute` (idempotent cleanup + recreate).  

No schema migration to roll back.

---

## 7. Dashboard scope note

Dashboard operational payroll KPIs for org-wide roles filter:

```text
company.clientType = EXISTING AND lifecycleStatus = ACTIVE
```

This excludes:

- `INTERNAL` (ProQPay Internal Operations payroll)
- `PROSPECT` (pipeline only)
