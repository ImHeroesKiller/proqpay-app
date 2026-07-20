-- ProQPay business workflow refinement (additive)
-- Applied safely via Prisma db push against schema proqpay.
-- Does not drop tables or truncate data.
--
-- Models added/extended:
--   PayrollFundingModel, payment_instructions, payment_instruction_items
--   sales_opportunities, pricing_rules, capital_partners, capital_allocations
--   Company lifecycle + default funding fields
--   PayrollPeriod funding / payment-instruction / reconciliation fields
--   BankAccount purpose + masking fields
--   WorkingCapitalRequest commercial/settlement fields
--
-- Runtime: DATABASE_URL (pooler :6543)
-- Migrations: DIRECT_URL (pooler :5432)
-- Project: jlhiiyjsziaqtdbvftyy (ap-southeast-2)

-- This file documents intent. Source of truth remains prisma/schema.prisma.
SELECT 1;
