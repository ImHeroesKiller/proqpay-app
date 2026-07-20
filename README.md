# ProQPay — Enterprise Payroll Operating System

**An MSG Technology Product** by PT Mandiri Semesta Gemilang.

Corporate site: https://msg-os.com  
App (planned): https://msg-os.com/app

This is **not** an HRIS, ERP, or accounting suite. It is an **Enterprise Payroll Operating System**.

## Stack

- Next.js 15 · React 19 · TypeScript
- Tailwind CSS · shadcn-style Radix UI
- TanStack Query · TanStack Table · Recharts
- Auth.js (next-auth v5) · Prisma · PostgreSQL
- pnpm · Docker

## Modules

| Module | Path |
|--------|------|
| Dashboard | `/dashboard` |
| Employees | `/employees` |
| Payroll | `/payroll` |
| Approval | `/approval` |
| Disbursement | `/disbursement` |
| Working Capital | `/working-capital` |
| Reports | `/reports` |
| Audit | `/audit` |
| Settings | `/settings` |
| Roadmap | `/roadmap` |

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

Prisma schema targets **PostgreSQL**.

```bash
# optional with Docker
docker compose up -d db
pnpm db:push
```

v1 UI is driven by TypeScript seed data so the app runs without a live database.

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
