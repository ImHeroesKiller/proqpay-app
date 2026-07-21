# Implementation Backlog (Audit → Engineering)

**Date:** 2026-07-21  
**Source audits:** Enterprise Product Readiness + Capability Integration  
**Rule:** Each item is executable without re-audit if acceptance criteria met.

### Priority score formula

```text
Score = (Business Impact × Frequency × Risk Reduction × Dependency Unblock) / Complexity
```
Each factor 1–5. Higher = do sooner.

---

## P0 — Production blockers

### BL-SEC-01 · Tenant assert on by-id mutations
| Field | Content |
|-------|---------|
| Business problem | Cross-tenant IDOR risk on engine/master/financial by UUID |
| Evidence | calculationId routes; master PATCH by id; residual engine gaps |
| Root cause | Session company not always enforced on resource load |
| Scope | Shared helper + apply to all mutation APIs |
| Files | `lib/auth/scope.ts`, `lib/financial/tenant.ts`, all `app/api/**` mutations |
| DB | none |
| API | assert before update |
| Frontend | none |
| Security | Critical |
| Deps | none |
| Risk | Low if tests cover roles |
| Complexity | 3 |
| Factors | BI5 F4 RR5 DU4 / C3 → **Score 13.3** |
| AC | Non-member company returns 403; SUPER_ADMIN documented |
| Tests | API tests multi-company |
| DoD | All mutating routes use assert; security section updated |

### BL-SEC-02 · Module RBAC on legacy payroll routes
| Field | Content |
|-------|---------|
| Business problem | Authenticated wrong-role can hit submit/approve/recalc/generate |
| Evidence | Routes auth-only; service has partial company check |
| Root cause | Historical actions before module matrix |
| Scope | `canAccessModule` + role lists for each action |
| Files | `app/api/payroll/submit|approve|recalculate|generate-instruction` |
| Complexity | 2 |
| Score | BI4 F5 RR4 DU3 / C2 → **12.0** |
| AC | VIEWER/CLIENT cannot mutate; APPROVER can approve only |
| Tests | role matrix table |

### BL-SEC-03 · Mandatory statutory config gate
| Field | Content |
|-------|---------|
| Business problem | Payroll runs with empty tax/bpjs tables → compliance risk |
| Evidence | tax_config=0 bpjs=0; DEFAULT_* in engine |
| Root cause | Convenience defaults |
| Scope | Block period submit if no active TaxConfig+BpjsConfig (or explicit org override flag) |
| Files | `lib/payroll/actions.ts`, master admin UI for configs |
| Complexity | 3 |
| Score | BI5 F4 RR5 DU3 / C3 → **10.0** |

### BL-SOT-01 · Engine → PayrollLine projection (ADR-001)
| Field | Content |
|-------|---------|
| Business problem | Engine results cannot pay employees |
| Evidence | PI uses lines; calc rows 0; dual stack |
| Root cause | Coexistence without projection |
| Scope | `projectCalculationToPeriod(calculationId)` transactional |
| Files | `lib/payroll-engine/*`, `lib/payroll/actions.ts`, period detail UI |
| DB | additive only if mapping table needed (prefer none) |
| Complexity | 4 |
| Score | BI5 F5 RR5 DU5 / C4 → **15.6** **(top)** |
| AC | After project: sum(lines.net)=calc.net; PI uses projected lines |
| Tests | unit + service smoke + multi-employee |

---

## P1 — Operational data → payroll

### BL-OPS-01 · Attendance CSV import
| Field | Content |
|-------|---------|
| Business problem | No gate from real timesheets to payroll |
| Evidence | Attendance READ_ONLY; import missing |
| Root cause | Not built |
| Scope | Upload CSV, map columns, upsert AttendanceRecord, reject invalid |
| Files | `app/api/attendance/import`, `app/(app)/attendance`, services |
| DB | optional import_batch table (additive) |
| Complexity | 4 |
| Score | BI5 F5 RR4 DU5 / C4 → **12.5** |
| AC | 100-row sample import; duplicates reported; audit trail |

### BL-OPS-02 · Exception queue
| Field | Content |
|-------|---------|
| Business problem | Bad rows block payroll silently or fail late |
| Scope | Exception entity: missing emp, invalid date, OT rule |
| Complexity | 4 |
| Score | BI4 F4 RR4 DU4 / C4 → **8.0** |
| Deps | BL-OPS-01 |

### BL-PR-01 · Materialize lines from population
| Field | Content |
|-------|---------|
| Business problem | Period create does not create payroll lines |
| Evidence | createPayrollPeriodFromGroup sets employeeCount only |
| Scope | On create or “Build population”: insert lines from active assignments |
| Files | `lib/master-data/service.ts`, period UI |
| Complexity | 3 |
| Score | BI5 F5 RR4 DU5 / C3 → **13.3** |
| AC | New period has N lines for N assignments |

### BL-PR-03 · Lock / unlock period
| Field | Content |
|-------|---------|
| Business problem | No hard freeze after approval |
| Evidence | LOCKED enum; no API/button; recalc blocks LOCKED only if set |
| Scope | POST lock with role; immutable lines; unlock with dual control |
| Complexity | 3 |
| Score | BI5 F4 RR5 DU4 / C3 → **13.3** |

### BL-PR-04 · Validation center UI
| Field | Content |
|-------|---------|
| Business problem | Errors not actionable for operators |
| Scope | Period-scoped issue list from engine validations + line anomalies |
| Complexity | 3 |
| Score | BI4 F4 RR3 DU3 / C3 → **5.3** |

### BL-OPS-03 · Operational dataset lock
| Field | Content |
|-------|---------|
| Business problem | Attendance editable after calc |
| Scope | Lock attendance rows for period date range |
| Complexity | 3 |
| Score | BI3 F3 RR4 DU3 / C3 → **4.0** |
| Deps | BL-OPS-01 |

---

## P2 — Payout completion

### BL-PO-01 · Explicit PI approval (maker-checker)
| Complexity | 3 | Score | BI4 F3 RR4 DU2 / C3 → **5.3** |

### BL-PO-02 · Failed item retry
| Complexity | 3 | Score | BI3 F3 RR3 DU2 / C3 → **3.0** |

### BL-PO-03 · Reconciliation workspace
| Complexity | 4 | Score | BI4 F3 RR4 DU2 / C4 → **3.0** |

### BL-PO-04 · Payslip generation (PDF)
| Complexity | 4 | Score | BI3 F4 RR2 DU1 / C4 → **1.5** |

---

## P3 — Billing rules

### BL-BI-01 · Billing profile API + UI
| Complexity | 3 | Score | BI4 F3 RR3 DU3 / C3 → **4.0** |

### BL-BI-02 · Apply pricing rules to invoice draft
| Complexity | 4 | Score | BI4 F3 RR3 DU2 / C4 → **2.3** |

### BL-BI-03 · Credit/Debit notes
| Complexity | 4 | Score | BI3 F2 RR3 DU1 / C4 → **1.1** |

### BL-MD-02 · Tax/BPJS admin UI
| Complexity | 3 | Score | BI5 F3 RR5 DU3 / C3 → **8.3** | (also P0 adjacent)

---

## P4 — Collection & treasury

### BL-CO-03 · Dashboard AR ledger bind (ADR-002)
| Complexity | 3 | Score | BI4 F5 RR4 DU3 / C3 → **8.0** |

### BL-CO-01 · Multi-invoice allocation UI
| Complexity | 3 | Score | BI3 F3 RR3 DU2 / C3 → **3.0** |

### BL-PF-02 · Treasury UI
| Complexity | 3 | Score | BI3 F2 RR3 DU2 / C3 → **2.0** |

### BL-PF-01 · WC request create from period
| Complexity | 3 | Score | BI4 F3 RR3 DU3 / C3 → **4.0** |

---

## P5 — UX consolidation

### BL-UX-01 · Entity pickers (kill UUID paste)
| Complexity | 3 | Score | BI4 F5 RR2 DU3 / C3 → **6.7** |

### BL-UX-02 · Payroll command center
| Complexity | 5 | Score | BI5 F4 RR3 DU4 / C5 → **4.8** |

### BL-UX-03 · Unified approval inbox
| Complexity | 4 | Score | BI3 F4 RR2 DU2 / C4 → **2.0** |

### BL-MD-01 · Project CRUD
| Complexity | 3 | Score | BI3 F3 RR2 DU3 / C3 → **3.0** |

### BL-MD-06 · Employee create/edit
| Complexity | 3 | Score | BI4 F4 RR2 DU3 / C3 → **5.3** |

---

## Ranked top 10 (execute order)

| Rank | ID | Title | Score |
|-----:|----|-------|------:|
| 1 | BL-SOT-01 | Engine→Line projection + ownership | 15.6 |
| 2 | BL-PR-01 | Materialize lines from population | 13.3 |
| 3 | BL-PR-03 | Period lock/unlock | 13.3 |
| 4 | BL-SEC-01 | Tenant by-id asserts | 13.3 |
| 5 | BL-OPS-01 | Attendance CSV import | 12.5 |
| 6 | BL-SEC-02 | Module RBAC legacy payroll | 12.0 |
| 7 | BL-SEC-03 | Statutory config gate | 10.0 |
| 8 | BL-MD-02 | Tax/BPJS admin | 8.3 |
| 9 | BL-OPS-02 | Exception queue | 8.0 |
| 10 | BL-CO-03 | Dashboard AR ledger bind | 8.0 |

---

## Definition of Done (global)

1. Acceptance criteria checked with automated test where listed  
2. Traceability matrix status updated  
3. Roadmap maturity adjusted with evidence  
4. No destructive migration without additive plan  
5. Security review note for any auth change  
