# ProQPay Enterprise Payroll — Gap Analysis & Implementation Status

**Single application:** `proqpay-app` only. No V2, no parallel app.

## Step 1 — Gap analysis (summary)

| Module | Before | Status after this release |
|--------|--------|---------------------------|
| Organization | Company only | + Branch, Dept, Position, Cost center, Holiday, Approval matrix |
| Employees | Directory R/O | Extended profile fields (BPJS/tax/contract) + links to org structure |
| Projects | Missing | **New** Project + Assignment (extends app, same nav shell) |
| Attendance | Missing | **New** Attendance records + list page |
| Payroll | View seed | **Recalculate** (BPJS/PPh21 engine), submit, generate PI |
| Components | Embedded in lines | **PayrollComponent** catalog + engine mapping |
| BPJS | Flat line field | **BpjsConfig** + employer/employee calc on recalculate |
| PPh21 | Flat tax field | **TaxConfig** TER-style + recalc |
| Approval | Display only | **Approve/Reject actions** + matrix-driven steps |
| Payment | PI view + confirmation | + **Generate PI**, **Download CSV** |
| Reports | Charts R/O | + **Payroll register CSV** |
| Audit | List | Extended with new actions |
| RBAC | 7 roles | + PAYROLL_OPERATOR, AUDITOR; projects/attendance modules |
| Clients | Cards | Unchanged (reuse) |

## Architecture principles followed

- One Next.js app, one Prisma schema `proqpay`, one sidebar.
- Additive DB only; existing routes extended (not replaced).
- Confirmation Engine remains source of truth for post-instruction payment.
- Disbursement = monitoring label; not a second payment rail.

## Known limitations (honest)

- Attendance CSV import UI not yet interactive (data model + list ready).
- Full progressive PPh21 / official TER tables not embedded (configurable rates).
- Employee bulk import still placeholder.
- Excel/PDF report packs next.
- Client Portal as separate persona not fully split (same app RBAC).

## Production readiness (this increment)

**~55–60%** operable Indonesian payroll control plane for design partners.
