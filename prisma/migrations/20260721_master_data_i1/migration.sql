-- Increment I1 — Master Data Completion (additive, production-safe)
-- Creates: CompanyEntityKind fields, sites, pay_cycles, payroll_groups,
-- employee_payroll_assignments, PayrollPeriod binding columns.
-- Backfills legacy defaults deterministically. No DROP / TRUNCATE / DELETE.

-- ── Enums ────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE "proqpay"."CompanyEntityKind" AS ENUM ('INTERNAL', 'CLIENT', 'VENDOR', 'PARTNER');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "proqpay"."MasterDataStatus" AS ENUM ('ACTIVE', 'INACTIVE');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "proqpay"."PayCycleFrequency" AS ENUM ('WEEKLY', 'BIWEEKLY', 'SEMIMONTHLY', 'MONTHLY', 'CUSTOM');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "proqpay"."AssignmentStatus" AS ENUM ('ACTIVE', 'ENDED', 'SUSPENDED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ── Company billing / entity kind (additive) ─────────────
ALTER TABLE "proqpay"."companies"
  ADD COLUMN IF NOT EXISTS "entity_kind" "proqpay"."CompanyEntityKind" NOT NULL DEFAULT 'CLIENT';
ALTER TABLE "proqpay"."companies"
  ADD COLUMN IF NOT EXISTS "billing_name" TEXT;
ALTER TABLE "proqpay"."companies"
  ADD COLUMN IF NOT EXISTS "billing_address" TEXT;
ALTER TABLE "proqpay"."companies"
  ADD COLUMN IF NOT EXISTS "payment_terms_days" INTEGER DEFAULT 30;
ALTER TABLE "proqpay"."companies"
  ADD COLUMN IF NOT EXISTS "default_currency" TEXT NOT NULL DEFAULT 'IDR';
ALTER TABLE "proqpay"."companies"
  ADD COLUMN IF NOT EXISTS "billing_contact_name" TEXT;
ALTER TABLE "proqpay"."companies"
  ADD COLUMN IF NOT EXISTS "billing_contact_email" TEXT;
ALTER TABLE "proqpay"."companies"
  ADD COLUMN IF NOT EXISTS "billing_contact_phone" TEXT;

CREATE INDEX IF NOT EXISTS "companies_entity_kind_idx"
  ON "proqpay"."companies"("entity_kind");

-- Backfill billing_name from name where empty
UPDATE "proqpay"."companies"
SET "billing_name" = "name"
WHERE "billing_name" IS NULL;

-- ── Sites ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "proqpay"."sites" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "company_id" UUID NOT NULL,
  "project_id" UUID,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "address" TEXT,
  "city" TEXT,
  "province" TEXT,
  "postal_code" TEXT,
  "timezone" TEXT NOT NULL DEFAULT 'Asia/Jakarta',
  "status" "proqpay"."MasterDataStatus" NOT NULL DEFAULT 'ACTIVE',
  "effective_from" DATE NOT NULL DEFAULT CURRENT_DATE,
  "effective_to" DATE,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "sites_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "sites_company_id_code_key"
  ON "proqpay"."sites"("company_id", "code");
CREATE INDEX IF NOT EXISTS "sites_company_id_idx" ON "proqpay"."sites"("company_id");
CREATE INDEX IF NOT EXISTS "sites_project_id_idx" ON "proqpay"."sites"("project_id");
CREATE INDEX IF NOT EXISTS "sites_status_idx" ON "proqpay"."sites"("status");

DO $$ BEGIN
  ALTER TABLE "proqpay"."sites"
    ADD CONSTRAINT "sites_company_id_fkey"
    FOREIGN KEY ("company_id") REFERENCES "proqpay"."companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "proqpay"."sites"
    ADD CONSTRAINT "sites_project_id_fkey"
    FOREIGN KEY ("project_id") REFERENCES "proqpay"."projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ── Pay cycles ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "proqpay"."pay_cycles" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "company_id" UUID NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "frequency" "proqpay"."PayCycleFrequency" NOT NULL DEFAULT 'MONTHLY',
  "period_definition" TEXT NOT NULL DEFAULT 'calendar_month',
  "cutoff_day" INTEGER NOT NULL DEFAULT 25,
  "payment_day" INTEGER NOT NULL DEFAULT 28,
  "approval_lag_days" INTEGER NOT NULL DEFAULT 2,
  "timezone" TEXT NOT NULL DEFAULT 'Asia/Jakarta',
  "status" "proqpay"."MasterDataStatus" NOT NULL DEFAULT 'ACTIVE',
  "custom_config" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "pay_cycles_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "pay_cycles_company_id_code_key"
  ON "proqpay"."pay_cycles"("company_id", "code");
CREATE INDEX IF NOT EXISTS "pay_cycles_company_id_idx" ON "proqpay"."pay_cycles"("company_id");
CREATE INDEX IF NOT EXISTS "pay_cycles_status_idx" ON "proqpay"."pay_cycles"("status");

DO $$ BEGIN
  ALTER TABLE "proqpay"."pay_cycles"
    ADD CONSTRAINT "pay_cycles_company_id_fkey"
    FOREIGN KEY ("company_id") REFERENCES "proqpay"."companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ── Payroll groups ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS "proqpay"."payroll_groups" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "company_id" UUID NOT NULL,
  "pay_cycle_id" UUID NOT NULL,
  "project_id" UUID,
  "site_id" UUID,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'IDR',
  "status" "proqpay"."MasterDataStatus" NOT NULL DEFAULT 'ACTIVE',
  "effective_from" DATE NOT NULL DEFAULT CURRENT_DATE,
  "effective_to" DATE,
  "cutoff_policy" TEXT,
  "payment_policy" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "payroll_groups_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "payroll_groups_company_id_code_key"
  ON "proqpay"."payroll_groups"("company_id", "code");
CREATE INDEX IF NOT EXISTS "payroll_groups_company_id_idx" ON "proqpay"."payroll_groups"("company_id");
CREATE INDEX IF NOT EXISTS "payroll_groups_pay_cycle_id_idx" ON "proqpay"."payroll_groups"("pay_cycle_id");
CREATE INDEX IF NOT EXISTS "payroll_groups_project_id_idx" ON "proqpay"."payroll_groups"("project_id");
CREATE INDEX IF NOT EXISTS "payroll_groups_site_id_idx" ON "proqpay"."payroll_groups"("site_id");
CREATE INDEX IF NOT EXISTS "payroll_groups_status_idx" ON "proqpay"."payroll_groups"("status");

DO $$ BEGIN
  ALTER TABLE "proqpay"."payroll_groups"
    ADD CONSTRAINT "payroll_groups_company_id_fkey"
    FOREIGN KEY ("company_id") REFERENCES "proqpay"."companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "proqpay"."payroll_groups"
    ADD CONSTRAINT "payroll_groups_pay_cycle_id_fkey"
    FOREIGN KEY ("pay_cycle_id") REFERENCES "proqpay"."pay_cycles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "proqpay"."payroll_groups"
    ADD CONSTRAINT "payroll_groups_project_id_fkey"
    FOREIGN KEY ("project_id") REFERENCES "proqpay"."projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "proqpay"."payroll_groups"
    ADD CONSTRAINT "payroll_groups_site_id_fkey"
    FOREIGN KEY ("site_id") REFERENCES "proqpay"."sites"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ── Employee payroll assignments ─────────────────────────
CREATE TABLE IF NOT EXISTS "proqpay"."employee_payroll_assignments" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "employee_id" UUID NOT NULL,
  "payroll_group_id" UUID NOT NULL,
  "project_id" UUID,
  "site_id" UUID,
  "position_id" UUID,
  "cost_center_id" UUID,
  "effective_from" DATE NOT NULL,
  "effective_to" DATE,
  "status" "proqpay"."AssignmentStatus" NOT NULL DEFAULT 'ACTIVE',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "employee_payroll_assignments_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "employee_payroll_assignments_employee_id_idx"
  ON "proqpay"."employee_payroll_assignments"("employee_id");
CREATE INDEX IF NOT EXISTS "employee_payroll_assignments_payroll_group_id_idx"
  ON "proqpay"."employee_payroll_assignments"("payroll_group_id");
CREATE INDEX IF NOT EXISTS "employee_payroll_assignments_status_idx"
  ON "proqpay"."employee_payroll_assignments"("status");
CREATE INDEX IF NOT EXISTS "employee_payroll_assignments_effective_from_effective_to_idx"
  ON "proqpay"."employee_payroll_assignments"("effective_from", "effective_to");

DO $$ BEGIN
  ALTER TABLE "proqpay"."employee_payroll_assignments"
    ADD CONSTRAINT "employee_payroll_assignments_employee_id_fkey"
    FOREIGN KEY ("employee_id") REFERENCES "proqpay"."employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "proqpay"."employee_payroll_assignments"
    ADD CONSTRAINT "employee_payroll_assignments_payroll_group_id_fkey"
    FOREIGN KEY ("payroll_group_id") REFERENCES "proqpay"."payroll_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "proqpay"."employee_payroll_assignments"
    ADD CONSTRAINT "employee_payroll_assignments_project_id_fkey"
    FOREIGN KEY ("project_id") REFERENCES "proqpay"."projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "proqpay"."employee_payroll_assignments"
    ADD CONSTRAINT "employee_payroll_assignments_site_id_fkey"
    FOREIGN KEY ("site_id") REFERENCES "proqpay"."sites"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "proqpay"."employee_payroll_assignments"
    ADD CONSTRAINT "employee_payroll_assignments_position_id_fkey"
    FOREIGN KEY ("position_id") REFERENCES "proqpay"."positions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "proqpay"."employee_payroll_assignments"
    ADD CONSTRAINT "employee_payroll_assignments_cost_center_id_fkey"
    FOREIGN KEY ("cost_center_id") REFERENCES "proqpay"."cost_centers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ── PayrollPeriod binding columns (nullable) ─────────────
ALTER TABLE "proqpay"."payroll_periods"
  ADD COLUMN IF NOT EXISTS "locked_by_id" UUID;
ALTER TABLE "proqpay"."payroll_periods"
  ADD COLUMN IF NOT EXISTS "payroll_group_id" UUID;
ALTER TABLE "proqpay"."payroll_periods"
  ADD COLUMN IF NOT EXISTS "pay_cycle_id" UUID;
ALTER TABLE "proqpay"."payroll_periods"
  ADD COLUMN IF NOT EXISTS "cutoff_at" TIMESTAMP(3);
ALTER TABLE "proqpay"."payroll_periods"
  ADD COLUMN IF NOT EXISTS "approval_due_at" TIMESTAMP(3);
ALTER TABLE "proqpay"."payroll_periods"
  ADD COLUMN IF NOT EXISTS "payment_due_at" DATE;

CREATE INDEX IF NOT EXISTS "payroll_periods_payroll_group_id_idx"
  ON "proqpay"."payroll_periods"("payroll_group_id");
CREATE INDEX IF NOT EXISTS "payroll_periods_pay_cycle_id_idx"
  ON "proqpay"."payroll_periods"("pay_cycle_id");

DO $$ BEGIN
  ALTER TABLE "proqpay"."payroll_periods"
    ADD CONSTRAINT "payroll_periods_payroll_group_id_fkey"
    FOREIGN KEY ("payroll_group_id") REFERENCES "proqpay"."payroll_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "proqpay"."payroll_periods"
    ADD CONSTRAINT "payroll_periods_pay_cycle_id_fkey"
    FOREIGN KEY ("pay_cycle_id") REFERENCES "proqpay"."pay_cycles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "proqpay"."payroll_periods"
    ADD CONSTRAINT "payroll_periods_locked_by_id_fkey"
    FOREIGN KEY ("locked_by_id") REFERENCES "proqpay"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ── Deterministic backfill ───────────────────────────────
-- 1) Legacy monthly pay cycle per company (idempotent by code)
INSERT INTO "proqpay"."pay_cycles" (
  "id", "company_id", "code", "name", "frequency", "period_definition",
  "cutoff_day", "payment_day", "approval_lag_days", "timezone", "status",
  "created_at", "updated_at"
)
SELECT
  gen_random_uuid(),
  c."id",
  'LEGACY_MONTHLY',
  'Legacy Monthly Cycle',
  'MONTHLY',
  'calendar_month',
  25,
  28,
  2,
  'Asia/Jakarta',
  'ACTIVE',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "proqpay"."companies" c
WHERE NOT EXISTS (
  SELECT 1 FROM "proqpay"."pay_cycles" pc
  WHERE pc."company_id" = c."id" AND pc."code" = 'LEGACY_MONTHLY'
);

-- 2) Default payroll group per company
INSERT INTO "proqpay"."payroll_groups" (
  "id", "company_id", "pay_cycle_id", "code", "name", "currency", "status",
  "effective_from", "cutoff_policy", "payment_policy", "created_at", "updated_at"
)
SELECT
  gen_random_uuid(),
  c."id",
  pc."id",
  'LEGACY_DEFAULT',
  'Legacy Default Group',
  COALESCE(c."default_currency", 'IDR'),
  'ACTIVE',
  CURRENT_DATE,
  'cutoff_day from pay cycle',
  'payment_day from pay cycle',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "proqpay"."companies" c
JOIN "proqpay"."pay_cycles" pc
  ON pc."company_id" = c."id" AND pc."code" = 'LEGACY_MONTHLY'
WHERE NOT EXISTS (
  SELECT 1 FROM "proqpay"."payroll_groups" g
  WHERE g."company_id" = c."id" AND g."code" = 'LEGACY_DEFAULT'
);

-- 3) Bind existing payroll periods to legacy group + cycle
UPDATE "proqpay"."payroll_periods" pp
SET
  "payroll_group_id" = g."id",
  "pay_cycle_id" = g."pay_cycle_id",
  "payment_due_at" = COALESCE(pp."payment_due_at", pp."pay_date"),
  "updated_at" = CURRENT_TIMESTAMP
FROM "proqpay"."payroll_groups" g
WHERE g."company_id" = pp."company_id"
  AND g."code" = 'LEGACY_DEFAULT'
  AND pp."payroll_group_id" IS NULL;

-- 4) Assign ACTIVE/PROBATION employees to legacy group (from join_date)
INSERT INTO "proqpay"."employee_payroll_assignments" (
  "id", "employee_id", "payroll_group_id", "project_id", "position_id", "cost_center_id",
  "effective_from", "effective_to", "status", "created_at", "updated_at"
)
SELECT
  gen_random_uuid(),
  e."id",
  g."id",
  NULL,
  e."position_id",
  e."cost_center_id",
  e."join_date",
  NULL,
  'ACTIVE',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "proqpay"."employees" e
JOIN "proqpay"."payroll_groups" g
  ON g."company_id" = e."company_id" AND g."code" = 'LEGACY_DEFAULT'
WHERE e."status" IN ('ACTIVE', 'PROBATION')
  AND NOT EXISTS (
    SELECT 1 FROM "proqpay"."employee_payroll_assignments" a
    WHERE a."employee_id" = e."id"
      AND a."payroll_group_id" = g."id"
      AND a."status" = 'ACTIVE'
      AND a."effective_to" IS NULL
  );
