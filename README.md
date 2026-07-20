# ProQPay — Enterprise Payroll Operating System

**An MSG Technology Product** by PT Mandiri Semesta Gemilang.

| Environment | URL |
|-------------|-----|
| Corporate site (MSG) | https://www.msg-os.com |
| ProQPay app (production) | https://proqpay.msg-os.com |
| Login | https://proqpay.msg-os.com/login |
| Local dev | http://localhost:3001 |

This is **not** an HRIS, ERP, or accounting suite. It is an **Enterprise Payroll Operating System**.

## Stack

- Next.js 15 · React 19 · TypeScript
- Tailwind CSS · shadcn-style Radix UI
- TanStack Query · TanStack Table · Recharts
- Auth.js (next-auth v5) · Prisma · PostgreSQL
- pnpm · Docker

## Payroll models

1. **Client self-transfer (default)** — validation → approval → payment instruction → **client transfers from client bank** → **upload proof** → ProQPay verifies → payroll closed.  
2. **Working capital (optional)** — funding request → partner funds **client bank** → client transfers to employees → proof → verify → settlement / revenue share → closed.  

**Never:** Funding Partner → Employee. Always: (Partner →) Client → Employee.

### Payment Confirmation Engine

`/payment-confirmation` — upload proof (PDF/PNG/JPG, private Supabase Storage `payment-proof`, signed URLs only), verification workflow, audit.

## Modules

| Module | Path | Audience |
|--------|------|----------|
| Dashboard | `/dashboard` | Operations (+ executive KPIs by role) |
| Employees | `/employees` | Ops |
| Payroll | `/payroll` | Ops |
| Approval | `/approval` | Ops |
| Payment instructions | `/payment-instructions` | Ops |
| Disbursement (legacy) | `/disbursement` | Ops |
| Working Capital | `/working-capital` | Ops / Finance |
| Reports | `/reports` | Ops |
| Audit | `/audit` | Ops |
| Settings | `/settings` | Ops |
| Clients | `/clients` | Internal commercial |
| Sales pipeline | `/sales` | Internal commercial |
| Pricing | `/pricing` | Internal commercial |
| Capital partners | `/capital-partners` | Internal commercial |
| Capital allocations | `/capital-allocations` | Internal commercial |
| Roadmap | `/roadmap` | All |

## Demo login

| Email | Role | Password |
|-------|------|----------|
| siti.rahayu@msg-os.com | Payroll Admin | `ProQPay2026!` |
| budi.santoso@msg-os.com | Finance | `ProQPay2026!` |
| andi.wijaya@msg-os.com | Director | `ProQPay2026!` |
| admin@msg-os.com | Super Admin | `ProQPay2026!` |

## Development

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

Open http://localhost:3001

```bash
pnpm lint
pnpm typecheck
pnpm build
```

## Database

Prisma → **Supabase PostgreSQL** (schema `proqpay`).

```bash
pnpm db:push
pnpm db:seed
```

### Production env (Vercel)

Set at least:

- `AUTH_SECRET`, `AUTH_TRUST_HOST=true`
- `NEXTAUTH_URL` / `AUTH_URL` = `https://proqpay.msg-os.com`
- `NEXT_PUBLIC_APP_URL` = `https://proqpay.msg-os.com`
- `DATABASE_URL` (pooler `:6543` + `pgbouncer=true`)
- `DIRECT_URL` (pooler `:5432`)
- Supabase URL + keys as needed

See `.env.example` for the full list.

## Architecture

```
app/                 routes (App Router)
  (app)/             authenticated shell
  login/
  api/auth/
components/          UI + layout + shared
config/              navigation config
lib/
  auth.ts            Auth.js
  data/seed.ts       Indonesian demo data
  utils.ts
prisma/schema.prisma production schema
types/               shared domain types
```

## Security (v1 foundations)

- Credentials auth + JWT session (8h max age)
- Role model: SUPER_ADMIN, PAYROLL_ADMIN, FINANCE, HR, DIRECTOR, APPROVER, VIEWER
- Audit trail UI for material actions
- Ready for MFA and finer RBAC enforcement
