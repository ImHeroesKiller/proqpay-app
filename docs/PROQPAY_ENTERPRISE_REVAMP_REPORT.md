# ProQPay Enterprise Revamp Report

**Product:** ProQPay — Enterprise Payroll Operating System  
**Owner organization:** PT Mandiri Semesta Gemilang (MSG)  
**Production URL:** https://proqpay.msg-os.com  
**Repository:** https://github.com/ImHeroesKiller/proqpay-app  
**Branch:** `feat/proqpay-enterprise-revamp`  
**Date:** 2026-07-20

---

## 1. Executive summary

ProQPay was upgraded from a functional but flat enterprise UI into a clearer **corporate payroll operating system shell**: grouped navigation, collapsible sidebar, operational topbar, command palette, help center, first-login onboarding, role-framed dashboard, standardized data tables, centralized status tokens, accessibility/reduced-motion support, and security headers.

**Business logic, authentication contracts, API contracts, and the fund path (Partner → Client bank → Employees) were not altered.**

Quality gates on this branch:

- `pnpm lint` — pass  
- `pnpm typecheck` — pass  
- `pnpm build` — pass  

---

## 2. Kondisi awal (initial state)

- Next.js 15 App Router + Auth.js + Prisma/Supabase with real payroll confirmation engine.
- Basic dark navy sidebar, minimal topbar (theme + user + sign out).
- Flat navigation with weak sectioning.
- Partial design system (button/card/input only).
- DataTable with basic search/sort/pagination.
- Framer Motion dependency unused.
- No command palette, onboarding, or help center.
- Incomplete page-level module enforcement on some routes.
- No HTTP security headers in Next config.
- UX felt closer to an early ops console than a presentation-ready enterprise OS.

See also: [UX_AUDIT.md](./UX_AUDIT.md).

---

## 3. Root cause

1. **Information architecture** not aligned to business contexts (ops vs finance vs commercial).  
2. **Incomplete design system** caused inconsistent density and ad-hoc patterns.  
3. **Weak orientation chrome** (no breadcrumbs/search/help) increased cognitive load.  
4. **Guidance gap** for multilevel payroll lifecycle.  
5. **Performance/a11y polish** deferred while domain features advanced.

---

## 4. Struktur aplikasi yang ditemukan

```
app/(app)/*          authenticated routes
app/api/*            auth + payroll + confirmation + reports
components/layout    shell
components/shared    table, header, kpi, empty, status
components/ui        primitives
config/navigation    role-aware nav
lib/auth             permissions + session scope
lib/domain           workflow + confirmation (canonical)
lib/data             Prisma queries
prisma/              schema + migrations
```

---

## 5. Daftar perubahan

### Design system

- Primary navy `#0B3A6E`, accent orange `#F28C28`, softer warm-gray background.
- Manrope headings + Inter body (`display: swap`).
- Radius reduced for enterprise feel; cards without heavy shadows.
- New UI primitives: dialog, dropdown, tooltip, sheet, skeleton, scroll-area.
- Status config centralized in `lib/design/status.ts`.
- Motion tokens + global `prefers-reduced-motion`.

### Application shell

- Collapsible sidebar with localStorage preference + collapsed tooltips.
- Business-grouped navigation (Payroll operations, Finance, Commercial, Governance, Administration).
- Mobile drawer with animation (respects reduced motion).
- Topbar: breadcrumb, page title, command search, help, theme, user menu + role.
- Skip-to-content link.

### Dashboard

- Role-based framing (Director/Exec, Finance, Payroll Admin, general).
- KPI grid + operational pipeline strip (draft → closed counts).
- Charts with empty states, tooltips, accessible labels.
- Contextual quick actions.

### Tables & pages

- Enterprise DataTable: search, clear, column visibility, sorting, selection hooks, sticky header, density, empty/error/skeleton, Indonesian-friendly pagination copy.
- Page headers with module eyebrows across routes.
- Empty states with “what happens next” guidance on key queues.
- Payroll detail: next-action callout + horizontal + vertical workflow.

### Guidance

- First login onboarding.
- Role-based product tour (director / finance / payroll / general).
- Help center: guides, FAQ, shortcuts, support contact (no lorem).
- Command palette (⌘/Ctrl+K) with role-filtered navigation + actions.

### Security / a11y / perf

- Security headers in `next.config.ts`.
- Open-redirect guard on login `callbackUrl`.
- Broader `requireModule` + scoped queries on employees/audit/reports/settings/working capital.
- Chart a11y + focus styles + semantic breadcrumbs.
- Documented Lighthouse procedure and build-size baseline.

---

## 6. Design system

| Token | Value |
|-------|-------|
| Primary / MSG blue | `#0B3A6E` |
| Accent orange | `#F28C28` |
| Background | `#F5F7FA` |
| Card | `#FFFFFF` |
| Destructive | risk/fail only |
| Radius | `0.5rem` |
| Motion micro | ~150ms |
| Motion panel | ~220ms |

Components: button, badge, card, input, dialog, dropdown, tooltip, sheet, skeleton, scroll-area, page-header, empty-state, kpi-card, data-table, status-badge, workflow-timeline.

---

## 7. Navigation architecture

| Group | Modules |
|-------|---------|
| Payroll operations | Dashboard, Employees, Projects, Attendance, Payroll, Approval, Payment instructions, Payment confirmation, Disbursement |
| Finance | Working capital, Capital partners, Capital allocations, Pricing |
| Commercial | Clients, Sales pipeline |
| Governance | Reports, Audit trail |
| Administration | Settings, Roadmap |

All items still filtered by `canAccessModule(role, module)`.

---

## 8. Workflow improvement

- Visual lifecycle retained via domain `buildPayrollWorkflow` / confirmation workflow.
- Payroll detail surfaces **What happens next** from current step.
- Horizontal chips on larger screens + vertical timeline.
- Empty states reinforce client-bank transfer rule.

**Unchanged rule:** Partner does not pay employees directly.

---

## 9. Onboarding dan interactive guidance

| Feature | Behavior |
|---------|----------|
| First login | Welcome + 3 orientation points; skip or continue |
| Product tour | Role variants; skip/finish; stored in localStorage |
| Help center | Tour relaunch, workflow/confirmation/WC guides, FAQ, shortcuts |
| Command palette | Search nav + quick actions + help/tour |

Respects `prefers-reduced-motion` via Framer + CSS.

---

## 10. Accessibility improvement

- Skip link, breadcrumbs, aria-current, dialog titles.
- Table column scopes, selectable rows labeled.
- Chart role/img + screen-reader summaries.
- Focus-visible ring system retained/strengthened.
- Document language `lang="id"`.
- Reduced motion policy.

Target: WCAG 2.1 AA trajectory; full axe CI deferred.

---

## 11. Performance improvement

- Enterprise visual density without heavy decoration.
- Build validated; FL JS documented in [LIGHTHOUSE_BASELINE.md](./LIGHTHOUSE_BASELINE.md).
- Next phase: dynamic import charts/shell overlays.

---

## 12. Security review

See [SECURITY_REVIEW.md](./SECURITY_REVIEW.md).

Highlights: headers added; module gates tightened; command palette permission-aware; login redirect hardened.

---

## 13. Lighthouse before vs after

Quantitative authenticated medians: **pending on preview** (procedure documented).  
Build-size after table and qualitative before/after captured in `docs/LIGHTHOUSE_BASELINE.md`.

---

## 14. Test result

See [TEST_REPORT.md](./TEST_REPORT.md). Lint / typecheck / build pass. Utility script pass. Playwright suite not yet introduced.

---

## 15. Responsive test

Shell designed for:

- Mobile drawer ≤ `lg`
- Collapsed desktop sidebar for 1280–1366 laptop density
- Table horizontal scroll inside card (no page-level overflow)

Physical device matrix should be re-checked on Vercel preview.

---

## 16. Known limitations

1. Bulk employee upload / new WC request remain disabled placeholders (existing product truth).  
2. No Playwright e2e or Lighthouse CI scores committed yet.  
3. CSP not enabled (headers partial).  
4. Demo password still visible on login for sandbox.  
5. Notification center is not faked — intentionally omitted (no fake notifications).  
6. Saved table views not implemented (column visibility is session-local only).

---

## 17. Risk dan mitigation

| Risk | Mitigation |
|------|------------|
| Operators relearn nav groups | Same routes; clearer labels; command palette |
| localStorage tour loops | Done flags per tour key |
| Bundle growth from shell | Build green; deferred code-splitting |
| Accidental business change | No schema/API/workflow rule edits |

**Rollback:** redeploy previous `main` commit; feature is branch-isolated.

---

## 18. Deployment result

- Branch ready for push + PR + Vercel preview.  
- Production promote **only after** preview smoke (auth, DB, storage signed URLs, payroll actions).

---

## 19. Production URL

https://proqpay.msg-os.com

---

## 20. Commit dan pull request

Structured commits on `feat/proqpay-enterprise-revamp` (see git log).  
PR to be opened against `main` with this report linked.

---

## 21. Rekomendasi fase berikutnya

1. Playwright multi-role e2e for payroll happy path.  
2. Lighthouse CI + axe in pipeline.  
3. Dynamic import for Recharts and shell overlays.  
4. CSP with nonces.  
5. Disable demo credential UI when `DEMO_MODE=false`.  
6. Optional org/client context switcher for multi-company operators.  
7. Saved views / URL-synced filters on major tables.  
8. Notification center fed by real audit/alert events only.

---

## Related documents

- [UX_AUDIT.md](./UX_AUDIT.md)  
- [LIGHTHOUSE_BASELINE.md](./LIGHTHOUSE_BASELINE.md)  
- [SECURITY_REVIEW.md](./SECURITY_REVIEW.md)  
- [TEST_REPORT.md](./TEST_REPORT.md)  
