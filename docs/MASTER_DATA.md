# ProQPay Master Data (Increment I1)

**Status:** Implemented on branch `feat/proqpay-enterprise-revamp`  
**Migration:** `20260721_master_data_i1`  
**Schema:** `proqpay`

---

## 1. Purpose

Remove implicit payroll defaults. Every new payroll period is created in explicit business context:

- **Client** (billing party)
- **Project** (optional scope)
- **Site** (optional operational location)
- **Payroll Group** (population)
- **Pay Cycle** (calendar rules)
- **Employee assignments** (who is in the population)

---

## 2. Domain boundaries

| In scope | Out of scope |
|----------|--------------|
| Client billing identity | CRM / sales pipeline |
| Sites as locations | Full facility management |
| Payroll groups / cycles | HRIS workforce planning |
| Effective-dated payroll assignment | Recruitment, performance |

North-star flow remains: **Ops data → Payroll → Billing → Collection → Payroll Finance**.

---

## 3. Client decision

**Decision: Client = `Company` with `entityKind = CLIENT`.**

### Why not a separate Client table?

- Existing product already treats companies as clients (`/clients`, `ClientBillingProfile.companyId`, employees under company).
- Introducing a parallel Client entity would duplicate FKs across Employee, Project, Invoice, PayrollPeriod.
- Additive `CompanyEntityKind` (`INTERNAL | CLIENT | VENDOR | PARTNER`) classifies without breaking data.

### Client / billing fields (I1 additive)

| Field | Role |
|-------|------|
| `entityKind` | Classification (default `CLIENT` for existing rows) |
| `billingName` | Invoice presentation |
| `billingAddress` | Billing address |
| `paymentTermsDays` | TOP days |
| `defaultCurrency` | Default IDR |
| `billingContactName/Email/Phone` | Operational billing contacts only |
| `ClientBillingProfile` | Existing 1:1 billing defaults |

Contacts are **billing/payroll operational** only — not CRM contacts.

---

## 4. Site model

Table: `sites`

- Unique `(company_id, code)`
- Optional `project_id` (site must belong to same company; project scope validated in service)
- Status `ACTIVE | INACTIVE`
- Effective dating `effective_from` / `effective_to`

**Site ≠ Project.** Project remains commercial/ops engagement; site is a location under the client (and optionally under a project).

---

## 5. Payroll Group model

Table: `payroll_groups`

- Bound to `company_id` + required `pay_cycle_id`
- Optional `project_id`, `site_id`
- Unique `(company_id, code)`
- Currency, cutoff/payment policy notes, effective dates

Examples:

- Monthly payroll client A, Jakarta site  
- Weekly payroll client B, project maintenance  
- Legacy default group (backfilled as `LEGACY_DEFAULT`)

---

## 6. Pay Cycle model

Table: `pay_cycles`

Frequencies: `WEEKLY | BIWEEKLY | SEMIMONTHLY | MONTHLY | CUSTOM`

| Field | Meaning |
|-------|---------|
| `cutoff_day` | Day-of-month (or clamped) for ops cutoff |
| `payment_day` | Target payment day |
| `approval_lag_days` | Days after period end for approval due |
| `custom_config` | **JSON only** (e.g. `{"periodDays":14}`) — never executable code |

Schedule math: `lib/master-data/pay-cycle.ts`.

---

## 7. Effective-dated employee assignment

Table: `employee_payroll_assignments`

- `employee_id` + `payroll_group_id`
- Optional project / site / position / cost center snapshot dimensions
- `effective_from` / `effective_to` / `status`
- Overlap of ACTIVE ranges for the same employee is **rejected**

This preserves history; changing assignment does not rewrite past payroll periods.

---

## 8. Payroll Period binding

Additive columns on `payroll_periods` (nullable for safety):

| Column | Notes |
|--------|--------|
| `payroll_group_id` | FK → payroll_groups |
| `pay_cycle_id` | FK → pay_cycles |
| `cutoff_at` | Timestamp |
| `approval_due_at` | Timestamp |
| `payment_due_at` | Date (complements existing `pay_date`) |
| `locked_by_id` | FK → users |

**New periods** must be created via `createPayrollPeriodFromGroup` (API `/api/master-data/payroll-periods`) which:

1. Requires ACTIVE group + ACTIVE cycle  
2. Computes dates from pay cycle  
3. Rejects overlapping periods for the same group  
4. Warns/rejects empty population (unless `allowEmptyPopulation`)  

**Deferred:** `NOT NULL` on `payroll_group_id` / `pay_cycle_id` until all environments verified. Migration B not applied yet.

---

## 9. Data migration / backfill

Migration `20260721_master_data_i1` is **additive** and includes deterministic backfill:

1. `entity_kind = CLIENT`, `billing_name = name` for companies  
2. Per company: pay cycle `LEGACY_MONTHLY`  
3. Per company: payroll group `LEGACY_DEFAULT` → that cycle  
4. Existing `payroll_periods` bound to legacy group + cycle; `payment_due_at = pay_date`  
5. ACTIVE/PROBATION employees assigned to `LEGACY_DEFAULT` from `join_date`

No DROP / TRUNCATE / DELETE of operational data.

### Verification queries

```sql
SELECT count(*) FROM proqpay.payroll_periods WHERE payroll_group_id IS NULL;
SELECT count(*) FROM proqpay.companies c
  WHERE NOT EXISTS (SELECT 1 FROM proqpay.payroll_groups g WHERE g.company_id = c.id AND g.code = 'LEGACY_DEFAULT');
SELECT count(*) FROM proqpay.employees e
  WHERE e.status IN ('ACTIVE','PROBATION')
  AND NOT EXISTS (
    SELECT 1 FROM proqpay.employee_payroll_assignments a
    WHERE a.employee_id = e.id AND a.status = 'ACTIVE' AND a.effective_to IS NULL
  );
```

---

## 10. Permissions

Capabilities (`lib/master-data/permissions.ts`):

| Capability | Roles |
|------------|--------|
| MASTER_DATA_VIEW / GROUP_VIEW / CYCLE_VIEW | SUPER_ADMIN, DIRECTOR, PAYROLL_*, FINANCE*, HR, AUDITOR, VIEWER, APPROVER (view set) |
| MASTER_DATA_MANAGE / GROUP_MANAGE / CYCLE_MANAGE | SUPER_ADMIN, PAYROLL_ADMIN, PAYROLL_MANAGER, DIRECTOR |
| PAYROLL_PERIOD_CREATE | + PAYROLL_OPERATOR |
| PAYROLL_PERIOD_MANAGE | SUPER_ADMIN, PAYROLL_ADMIN, PAYROLL_MANAGER, DIRECTOR |

Nav module: `master_data` in `lib/auth/permissions.ts`.  
**API enforces** capabilities — UI is not the sole gate.

---

## 11. API

| Method | Path | Purpose |
|--------|------|---------|
| GET/POST/PATCH | `/api/master-data/clients` | List / create / update clients |
| GET/POST/PATCH | `/api/master-data/sites` | Sites |
| GET/POST/PATCH | `/api/master-data/pay-cycles` | Cycles + schedule preview (`?id=`) |
| GET/POST/PATCH | `/api/master-data/payroll-groups` | Groups; POST `action=assign` for assignments |
| GET/POST | `/api/master-data/payroll-periods` | Preview / create period from group |

---

## 12. Operational workflow

1. Ensure client (`Company` CLIENT) has billing fields.  
2. Create pay cycle(s).  
3. Create site(s) as needed.  
4. Create payroll group → bind cycle (+ project/site).  
5. Assign employees (effective-dated).  
6. On Payroll page: preview → create period from group.  
7. Continue existing payroll run / engine / payout flow.

---

## 13. Known limitations

- Admin create forms use company/cycle UUIDs (not pickers) — improve UX in later polish.  
- Period FKs remain nullable (legacy safety); app **requires** group for **new** periods.  
- Client deactivate maps ACTIVE/INACTIVE to lifecycleStatus; other lifecycle values use edit form.  
- Project still has legacy string `site` field — new `Site` model is the structured path.  
- Shift templates deferred (roadmap Phase 1 remainder).

---

## 14. Deferred decisions

| Item | Status |
|------|--------|
| NOT NULL on period.group/cycle | Deferred Migration B after production verification |
| Separate Client table | Rejected for I1 |
| Organization-level shared pay cycles | Company-scoped only for now |
| Shift Template master | Deferred |

---

## 15. Transition to I2 Contract & Billing Rules

I2 will attach:

- Service Contract / Headcount Agreement / SLA / amendments  
- Client-specific billing & payroll rules  

to the **Client + Payroll Group** foundations from I1. Invoice generation should select contract version using company/group/period context established here.
