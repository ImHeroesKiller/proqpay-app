# UX & Process Efficiency Audit

**Date:** 2026-07-21  
**Method:** Role-based task walkthrough against live routes, forms, and RBAC modules. Click counts are **heuristic minimums** for trained users who already know UUIDs; real first-time users will take longer.

---

## Role access summary

| Role | Can run payroll ops | Can finance/billing | Friction |
|------|:-------------------:|:-------------------:|----------|
| Payroll Operator | Yes (limited approval) | No invoices typically | UUID setup |
| Payroll Manager / Admin | Yes | Some invoices | UUID + dual engine |
| Finance Staff | Limited payroll | Payments, collection, invoices | No treasury UI |
| Finance Manager | WC view | Full finance modules | WC create disabled |
| Approver | Approve periods | Limited | Single period focus page |
| Director | Broad | Broad | Commercial noise (sales/pricing) |
| Auditor | Read + audit | Receivables view | No write |
| CLIENT | Dashboard + invoices | Payments view | Thin ESS |

---

## Task efficiency matrix

| # | Task | Clicks | Pages | Manual inputs | Errors / dead-ends | Est. current time | Target time | UX score /10 |
|---|------|-------:|------:|--------------:|--------------------|------------------:|------------:|-------------:|
| 1 | New payroll setup (client→assign) | 25–40 | 6–8 | Many UUIDs | Project create missing; site empty | 30–60 min | 10 min | **3** |
| 2 | Import attendance | — | 1 | — | **Dead-end** (list only) | Fail | 5 min | **0** |
| 3 | Create payroll period | 4–6 | 1 | group UUID, optional name | Empty pop blocks | 3–8 min | 1 min | **6** |
| 4 | Run payroll (recalc) | 3–5 | 2 | — | Lines may be empty if not seeded | 2–10 min | 2 min | **5** |
| 5 | Fix payroll error | — | engine/API | — | **No error center UI** | Fail/ad-hoc | 5 min | **2** |
| 6 | Submit approval | 2–3 | 1–2 | — | Clear | 1 min | 30s | **7** |
| 7 | Lock payroll | — | — | — | **No lock action** | Fail | 30s | **1** |
| 8 | Payment instruction | 2–4 | 2 | — | Need APPROVED; auto-approved PI | 2 min | 1 min | **7** |
| 9 | Confirm payment | 6–10 | 3 | file, bank fields | Good flow | 5–10 min | 3 min | **7** |
| 10 | Create invoice | 2–4 | 1–2 | — | From period button | 2 min | 1 min | **7** |
| 11 | Issue invoice | 3–5 | 1 | multi-step transitions | DRAFT→…→ISSUED multi-click | 2 min | 1 min | **6** |
| 12 | Record client payment | 4–7 | 1 | amount, date, invoice pick | Single-invoice allocate only | 3 min | 2 min | **6** |
| 13 | Close receivable | auto on full pay | 1 | — | Works if allocate full | 1 min | 1 min | **7** |
| 14 | View margin payroll | — | reports/dash | — | **Not available as margin view** | Fail | 1 min | **1** |

**Average UX score on completable tasks: ~5.5/10**  
**Blocker tasks (2,5,7,14): product not ready for unsupervised ops**

---

## Role journey notes

### Payroll Operator
1. Cannot create employees (disabled).  
2. Must paste payroll group UUID to create period (no picker).  
3. After approve path, can generate PI if role allows.  
4. Attendance cannot be fixed in product.

### Payroll Manager
1. Master data CRUD works but feels “admin tooling”, not guided wizard.  
2. Engine page is a **museum** of empty tables with “use API” empty states.  
3. Dual mental model: `/payroll` vs `/payroll-engine`.

### Finance Staff / Manager
1. Finance nav now present (invoices, AR, payments, collection).  
2. No treasury workspace despite permission module.  
3. WC “New request” disabled — cannot fund WC clients.  
4. Dashboard AR numbers may **not match** finance ledger (proxy).

### Approver
1. `/approval` usable for period steps.  
2. No combined “what needs me today” command center across invoices + payroll.

### Director
1. Rich dashboard filters; risk of trusting proxy AR.  
2. Commercial modules (sales/pricing) compete for attention vs payroll cash cycle.

---

## Friction catalog

| Type | Examples |
|------|----------|
| Redundant steps | Two Clients pages (commercial vs master); dual payroll UIs |
| Duplicate input | UUIDs re-entered across forms; no session company context fill |
| Hidden dependency | Period create needs assignments; tax empty still recalcs |
| Unclear terminology | Engine vs Operations; SELF_FUNDED vs “client funded” on dashboards |
| Dead-end pages | Attendance, Employees create, WC new, Engine write, Treasury missing |
| Missing confirmation | Some transitions lack destructive confirm (low risk today) |
| Missing success → next action | Invoice create shows message; weak deep-link to finance |
| Poor empty state | Sites 0, Engine 0 — guidance is API-oriented not operator-oriented |

---

## Design principles for UX consolidation (P5)

1. **Payroll Command Center** — single period workspace: intake status, calc, validation, approval, PI, invoice.  
2. **Entity pickers** — never require raw UUID for happy path.  
3. **Next action chip** — always show one primary next step by role.  
4. **One approval inbox** — payroll + invoice + WC.  
5. **Ledger-honest dashboard** — separate Funding vs AR.

---

## Acceptance criteria for UX readiness (target)

- Setup new client payroll group without UUID paste: ≤ 10 minutes  
- Import attendance → calc → approve → PI: ≤ 20 minutes guided  
- Invoice from closed period → collect: ≤ 10 minutes  
- Zero dead-end primary nav items for roles that see them  
