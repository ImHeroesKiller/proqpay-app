# ProQPay Security Review (Revamp Scope)

**Date:** 2026-07-20  
**Scope:** UI/shell revamp + light hardening. **No change** to authentication provider contract, payroll business rules, or payment fund path (Partner → Client bank → Employee only).

---

## 1. Authentication & session

| Control | Status | Notes |
|---------|--------|-------|
| Auth.js JWT sessions | OK | `maxAge` 8 hours |
| Middleware protection | OK | Unauthenticated users redirected to `/login` |
| Login open redirect | **Hardened** | `callbackUrl` must start with `/` |
| Demo password in login UI | Known | Sandbox convenience; do not surface in public marketing materials |
| Password hashing | OK | bcrypt via credentials provider (server) |

---

## 2. Authorization

| Control | Status | Notes |
|---------|--------|-------|
| Module RBAC | OK | `canAccessModule` + `requireModule` on pages |
| Server-side page gates | Improved | Employees, audit, reports, settings, working capital now consistently use `requireModule` + scoped queries |
| API routes | Existing | Payroll actions / confirmation / download must continue role checks (unchanged contracts) |
| Command palette | OK | Only exposes nav items from `navigationForRole` |
| UI hiding ≠ security | Documented | Server enforcement remains mandatory |

---

## 3. Data isolation

| Control | Status | Notes |
|---------|--------|-------|
| Company scope | OK | `companyWhere` / role checks on queries |
| Confidential modules | OK | Clients, sales, pricing, capital restricted |
| Payroll data in console | Policy | Do not log tokens, signed URLs, or payroll rows client-side |

---

## 4. File upload & storage

| Control | Status | Notes |
|---------|--------|-------|
| Payment proof | Existing | Private storage + signed URLs |
| Type/size validation | Existing | Upload route validates; UI documents PDF/PNG/JPG max 10MB |
| Public bucket exposure | Avoided | Signed URL pattern retained |

---

## 5. HTTP security headers (added)

Applied via `next.config.ts` to all routes:

- `X-Frame-Options: DENY` (clickjacking)
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- `X-DNS-Prefetch-Control: on`
- `poweredByHeader: false` (already)

**Not yet:** full Content-Security-Policy (requires careful nonce strategy for Next.js — recommended next phase).

---

## 6. XSS / CSRF / injection

| Risk | Status |
|------|--------|
| React default escaping | OK for standard rendering |
| Dangerously set HTML | Not introduced |
| CSRF on Auth.js | Session cookie + same-site defaults of Auth.js |
| Zod validation | Used on forms/actions where already present |

---

## 7. Sensitive exposure checklist

- [x] No secrets committed in source
- [x] `.env.local` gitignored
- [x] Demo password only in constants for sandbox (existing)
- [ ] CSP report-only rollout (next phase)
- [ ] Rate limit on `/api/auth` and upload endpoints (infra/WAF)

---

## 8. Residual risks

1. Demo credentials documented in app login (acceptable for demo; disable in production cutover).
2. JWT cannot be revoked mid-session without blocklist (8h maxAge mitigates).
3. CSP not yet enforced.
4. Rate limiting depends on platform (Vercel/WAF).

---

## 9. Recommendation for production cutover

1. Disable demo password display when `NODE_ENV=production` and env flag `DEMO_MODE=false`.
2. Add CSP with nonces.
3. Enforce MFA for SUPER_ADMIN / DIRECTOR (future).
4. Periodic access review of confidential modules.
