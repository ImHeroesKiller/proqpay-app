-- ProQPay schema security (defense in depth)
-- App access: Next.js server + Prisma (postgres role via pooler) — bypasses RLS by design.
-- Browser/PostgREST: anon + authenticated have NO grants on proqpay (deny by default).
-- Do not expose SUPABASE_SERVICE_ROLE_KEY to the client.

CREATE SCHEMA IF NOT EXISTS proqpay;

ALTER TABLE IF EXISTS proqpay.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS proqpay.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS proqpay.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS proqpay.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS proqpay.payroll_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS proqpay.payroll_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS proqpay.approval_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS proqpay.disbursement_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS proqpay.working_capital_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS proqpay.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS proqpay.bank_accounts ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON ALL TABLES IN SCHEMA proqpay FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA proqpay FROM anon, authenticated;
REVOKE USAGE ON SCHEMA proqpay FROM anon, authenticated;

GRANT USAGE ON SCHEMA proqpay TO postgres;
GRANT ALL ON ALL TABLES IN SCHEMA proqpay TO postgres;
GRANT ALL ON ALL SEQUENCES IN SCHEMA proqpay TO postgres;
