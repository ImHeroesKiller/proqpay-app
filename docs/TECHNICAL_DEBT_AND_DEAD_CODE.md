# Technical Debt & Dead Code Audit

**Date:** 2026-07-21  
**Policy:** Audit-only — **do not delete** production code without a deprecation ticket.

---

## Artifact register

| Artifact | Type | Evidence | Risk | Recommendation |
|----------|------|----------|------|----------------|
| Dual payroll stacks (period/line vs calculation/items) | Architecture | Both in schema; PI uses lines only; engine 0 rows | **High** wrong payout | CONSOLIDATE via ADR-001 projection |
| Dual approval systems (`ApprovalStep` vs `PayrollApproval*`) | Architecture | Two APIs `/approve` vs `/approval` | Medium process confusion | CONSOLIDATE |
| `DisbursementBatch` | Model + UI read | Parallel to PI; monitor only | Medium dual truth | DEPRECATE writes; keep read legacy |
| `lib/data/receivables.ts` proxy AR | Presentation | Explicit “no invoice table” comment | **High** false AR | CONSOLIDATE → ADR-002 |
| `billing-profile-service` | Service no route | No `app/api` caller | Medium orphan | CONNECT |
| Engine write APIs without UI | API | calculate/simulate/budget/formulas | Low if unused | CONNECT or document internal-only |
| `/api/financial/treasury` | API no page | No nav page | Medium incomplete product | CONNECT |
| `/api/financial/summary` | API no page | — | Low | CONNECT to dashboard |
| `/api/financial/working-capital` | API no UI actions | WC page create disabled | Medium | CONNECT |
| Capital partners/allocations pages | UI read-only | 0 rows | Low non-core | KEEP thin / OUT_OF_SCOPE expand |
| Sales / Pricing pages | UI read-only | Non-core | Medium distraction | DEPRECATE from primary nav later |
| Roadmap `comingSoonModules` | Static | Only roadmap page | None | KEEP marketing |
| Employees create/bulk disabled | UI stub | `disabled title=Coming soon` | Medium | CONNECT |
| WC New request disabled | UI stub | same | High for WC clients | CONNECT |
| Reports Excel/PDF disabled | UI stub | reports page | Low | CONNECT later |
| `virusScanPlaceholder` | Security stub | payment-proof storage | Medium prod | INVESTIGATE / CONNECT AV |
| Zod unused on APIs | Quality | 0 zod in `app/api` | Medium injection/mass-assign | CONNECT validation layer |
| Legacy payroll APIs auth-only | Security | submit/approve/recalc/generate | **High** | CONNECT module RBAC |
| Engine by-id without company check | Security | calculationId routes | **High** IDOR | CONNECT tenant assert |
| `DEFAULT_BPJS` / `DEFAULT_TAX` | Implicit config | used when tables empty | High compliance risk | CONNECT mandatory configs |
| Attendance `is_locked` unused workflow | Schema | field only | Low | CONNECT lock workflow |
| HolidayCalendar unused in calc | Model | 0 rows; not referenced in engine | Low | INVESTIGATE |
| PricingRule not applied to invoice | Model | 0 rows | Medium commercial | CONNECT or DEPRECATE |
| AppNotification sparse | Feature | used on confirmation | Low | KEEP |
| Seed scripts `seed-realistic` destructive deletes | Script | deletes many tables | **High** if run on prod | Document guardrails |
| package.json `db:push` script | Tooling | available | High if misused | Operational policy: migrate deploy only |
| `docs/*` performance dashboards | Docs | many | None | KEEP |
| Command palette | Feature | filters by role | None | KEEP |
| Geographic map stack | Feature | executive dashboard | Medium complexity | KEEP for exec; isolate perf |

---

## Categories summary

| Category | Count (approx) | Action this quarter |
|----------|---------------:|---------------------|
| KEEP | many core | — |
| CONNECT | ~15 | P0–P4 backlog |
| CONSOLIDATE | 4 major | Payroll + AR + approvals + disbursement |
| DEPRECATE | 3–5 | Dual nav commercial; batch writes |
| DELETE_LATER | 0 now | After deprecation window |
| INVESTIGATE | holiday, AV, pricing | Spikes |

---

## Stale TODO / product honesty

| Location | Note |
|----------|------|
| Attendance page copy | Import “staged” — accurate; still ship blocker |
| Working capital page | “future-ready placeholders” — accurate |
| ENTERPRISE_IMPLEMENTATION.md | Bulk employee import placeholder — still true |
| PROQPAY_ENTERPRISE_REVAMP_REPORT.md | Known disabled controls — still true |

No systematic `TODO`/`FIXME` bomb in core paths; **disabled UI is the primary honesty signal**.

---

## Observability / ops debt

| Gap | Risk |
|-----|------|
| No structured app logger (console only) | Incident diagnosis slow |
| No background job runner / queue | Import/calc scale limited to request lifetime |
| No rate limit on auth/upload | Abuse |
| CSP not enforced | XSS residual |
| No runbook for recon / repair | Ops risk |
| Smoke scripts can write prod-like data | Need env guard |

---

## Recommended cleanup order (no code delete yet)

1. Security CONNECT (tenant + module RBAC)  
2. Payroll CONSOLIDATE projection  
3. AR dashboard CONSOLIDATE  
4. Nav declutter (sales/pricing secondary)  
5. Deprecation labels in UI for DisbursementBatch as “legacy monitor”
