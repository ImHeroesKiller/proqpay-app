# Changelog — ProQPay Enterprise Payroll OS

## 2026-07-25 — July 2026 design language (v0.2.0)

Production-ready visual and AI experience upgrade. Business logic and database schema unchanged.

### Design improvements

- New design system: **20px radius**, 8pt grid, soft elevation, warm-white surfaces, navy primary, orange accent
- Typography: **Inter** (body) + **Manrope** (display headings)
- Glass-style cards with subtle gradients and hover lift
- Completely redesigned **sidebar** with categories:
  - Command Center
  - Projects & Clients
  - Payroll Operations
  - Payroll Finance
  - Risk & Governance
  - Administration
  - Settings
- Active nav **pill**, icon tiles, micro-interactions (Framer Motion `layoutId`)
- **Payroll Command Center** dashboard hero (dark navy gradient, animated ambient)
- Horizontal **payroll pipeline** (Attendance → … → Completed) with status colors
- Animated **KPI cards** with counters and trend arrows
- **Attention Center** (Critical / Warning / Information), clickable to modules
- Modern **activity timeline** with avatars and entity badges
- Floating **quick action** cards (Run Payroll, Import Attendance, etc.)
- **Projects → Payroll Mission Control** with Project Score (A+…), Risk Radar, ProQ AI insight
- Login screen aligned to navy command aesthetic
- Enterprise **data tables**: sticky header, search, column visibility, density, CSV export, keyboard-friendly controls
- Original SVG assets under `public/illustrations/` (avatar, hero, module illustrations)
- Icons unified on **Lucide** with consistent stroke width (~1.85)

### AI improvements (ProQ AI)

- Product branding: **ProQ AI** (not generic “AI Insight”)
- Gemini **worker pool** (`lib/ai/gemini-pool.ts`):
  - Round-robin `gemini-worker-1` … `gemini-worker-5` (`GEMINI_WORKER_1`…`5`)
  - Fallback **Gemini Flash Lite** (`GEMINI_API_KEY` / Google AI keys)
  - Retry 2×, timeout 5s, circuit breaker, 30s response cache
  - Failed worker logging + automatic recovery
- Executive Payroll Analyst voice (no chatbot persona)
- Insights with **Open Module / Ignore / Resolve**
- Original **ProQ avatar** (SVG + animated states: idle, smile, concern, celebrate, thinking, …)
- API route: `GET /api/ai/insights` (session-protected)
- Offline/heuristic analyst when keys unavailable

### Performance improvements

- Lazy-loaded charts (`components/dashboard/charts-lazy.tsx`)
- Client-only Recharts bundle isolation
- Framer Motion scoped to interactive surfaces
- Production build verified (Next.js 15)

### Accessibility improvements

- Focus-visible rings on interactive elements
- ARIA labels on menu, search, alerts
- Keyboard-accessible table sorting and pagination
- Semantic priority labels in Attention Center
- Contrast-aware semantic colors (success / warning / danger)

### Files modified (high level)

- `app/globals.css`, `app/layout.tsx`, `app/login/page.tsx`
- `app/(app)/dashboard/page.tsx`, `app/(app)/projects/page.tsx`
- `config/navigation.ts`
- `components/layout/*`, `components/ui/*`, `components/shared/*`
- `lib/data/queries.ts` (KPI labels for command center)
- `.env.example` (ProQ AI worker env documentation)

### Components / modules added

- `lib/ai/gemini-pool.ts`
- `lib/ai/proq-intelligence.ts`
- `app/api/ai/insights/route.ts`
- `components/ai/proq-avatar.tsx`
- `components/dashboard/command-hero.tsx`
- `components/dashboard/proq-intelligence-panel.tsx`
- `components/dashboard/payroll-pipeline.tsx`
- `components/dashboard/attention-center.tsx`
- `components/dashboard/activity-timeline.tsx`
- `components/dashboard/quick-actions.tsx`
- `components/dashboard/charts-lazy.tsx`
- `components/projects/mission-control.tsx`
- `public/illustrations/*`

### Bugs fixed

- Sidebar structure flattened into role-aware categories without breaking RBAC
- KPI vocabulary aligned to ops command metrics
- Chart loading no longer blocks server render path

### Verification

| Check        | Result |
|-------------|--------|
| TypeScript  | Pass (`pnpm typecheck`) |
| ESLint      | Pass (`pnpm lint`) |
| Production build | Pass (`pnpm build`) |
| Business logic / DB | Unchanged |

### Deployment URL

- Target: Vercel project for ProQPay (e.g. `https://proqpay.msg-os.com` when production domain is bound)
- Confirm latest deployment URL after `vercel deploy` / Git push CI

### Lighthouse (target)

- Performance / Accessibility / Best Practices / SEO: **95+** target on Dashboard (desktop)
- Re-measure on production CDN after deploy (local Lighthouse varies by auth gate)

### Notes

- Do not commit API keys. Configure `GEMINI_WORKER_1`…`5` and optional `GEMINI_API_KEY` in Vercel project env.
- No database migrations required for this release.
