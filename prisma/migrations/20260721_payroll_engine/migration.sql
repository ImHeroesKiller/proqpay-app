-- Phase 1B Enterprise Payroll Engine (additive)

-- Extend payroll_components
ALTER TABLE "proqpay"."payroll_components" ADD COLUMN IF NOT EXISTS "category_code" TEXT;
ALTER TABLE "proqpay"."payroll_components" ADD COLUMN IF NOT EXISTS "calculation_type" TEXT;
ALTER TABLE "proqpay"."payroll_components" ADD COLUMN IF NOT EXISTS "bpjs_applicable" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "proqpay"."payroll_components" ADD COLUMN IF NOT EXISTS "currency" TEXT NOT NULL DEFAULT 'IDR';
ALTER TABLE "proqpay"."payroll_components" ADD COLUMN IF NOT EXISTS "is_system" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "proqpay"."payroll_components" ADD COLUMN IF NOT EXISTS "is_editable" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "proqpay"."payroll_components" ADD COLUMN IF NOT EXISTS "formula_expression" TEXT;

DO $$ BEGIN CREATE TYPE "proqpay"."EngineRunStatus" AS ENUM ('DRAFT','CALCULATING','VALIDATING','READY_FOR_APPROVAL','PARTIALLY_APPROVED','APPROVED','LOCKED','CLOSED','REVISED','CANCELLED','FAILED'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "proqpay"."FormulaStatus" AS ENUM ('DRAFT','ACTIVE','ARCHIVED'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "proqpay"."ValidationSeverity" AS ENUM ('INFO','WARNING','ERROR','BLOCKER'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "proqpay"."EngineApprovalAction" AS ENUM ('APPROVE','REJECT','REQUEST_REVISION','COMMENT'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "proqpay"."BudgetScopeType" AS ENUM ('COMPANY','CLIENT','PROJECT','SITE'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "proqpay"."BillingMethod" AS ENUM ('PAYROLL_SERVICE','FIXED_FEE','HYBRID','OTHER'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "proqpay"."InvoiceGrouping" AS ENUM ('PER_PAYROLL','PER_PROJECT','PER_SITE','CONSOLIDATED'); EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS "proqpay"."client_billing_profiles" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "company_id" UUID NOT NULL,
  "billing_method" "proqpay"."BillingMethod" NOT NULL DEFAULT 'PAYROLL_SERVICE',
  "top_days" INTEGER NOT NULL DEFAULT 30,
  "invoice_grouping" "proqpay"."InvoiceGrouping" NOT NULL DEFAULT 'PER_PAYROLL',
  "invoice_prefix" TEXT NOT NULL DEFAULT 'INV',
  "currency" TEXT NOT NULL DEFAULT 'IDR',
  "tax_configuration" TEXT,
  "notes" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "client_billing_profiles_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "client_billing_profiles_company_id_key" ON "proqpay"."client_billing_profiles"("company_id");

CREATE TABLE IF NOT EXISTS "proqpay"."payroll_component_categories" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "company_id" UUID,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "display_order" INTEGER NOT NULL DEFAULT 0,
  "is_system" BOOLEAN NOT NULL DEFAULT true,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "payroll_component_categories_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "payroll_component_categories_company_id_code_key" ON "proqpay"."payroll_component_categories"("company_id", "code");

CREATE TABLE IF NOT EXISTS "proqpay"."payroll_formulas" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "company_id" UUID NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "status" "proqpay"."FormulaStatus" NOT NULL DEFAULT 'DRAFT',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "payroll_formulas_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "payroll_formulas_company_id_code_key" ON "proqpay"."payroll_formulas"("company_id", "code");

CREATE TABLE IF NOT EXISTS "proqpay"."payroll_formula_versions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "formula_id" UUID NOT NULL,
  "version" INTEGER NOT NULL,
  "expression" TEXT NOT NULL,
  "depends_on_json" TEXT NOT NULL DEFAULT '[]',
  "is_active" BOOLEAN NOT NULL DEFAULT false,
  "change_note" TEXT,
  "created_by" UUID,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "payroll_formula_versions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "payroll_formula_versions_formula_id_version_key" ON "proqpay"."payroll_formula_versions"("formula_id", "version");

CREATE TABLE IF NOT EXISTS "proqpay"."payroll_calculations" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "company_id" UUID NOT NULL,
  "payroll_period_id" UUID,
  "revision" INTEGER NOT NULL DEFAULT 1,
  "status" "proqpay"."EngineRunStatus" NOT NULL DEFAULT 'DRAFT',
  "employee_count" INTEGER NOT NULL DEFAULT 0,
  "gross_total" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "net_total" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "employer_cost" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "funding_requirement" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "working_capital_requirement" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "expected_client_funding" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "formula_version_ids" TEXT,
  "error_message" TEXT,
  "calculated_at" TIMESTAMP(3),
  "created_by" UUID,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "payroll_calculations_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "payroll_calculations_company_id_idx" ON "proqpay"."payroll_calculations"("company_id");
CREATE INDEX IF NOT EXISTS "payroll_calculations_payroll_period_id_idx" ON "proqpay"."payroll_calculations"("payroll_period_id");
CREATE INDEX IF NOT EXISTS "payroll_calculations_status_idx" ON "proqpay"."payroll_calculations"("status");

CREATE TABLE IF NOT EXISTS "proqpay"."payroll_calculation_items" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "calculation_id" UUID NOT NULL,
  "employee_id" UUID,
  "employee_code" TEXT,
  "employee_name" TEXT NOT NULL,
  "component_code" TEXT NOT NULL,
  "component_name" TEXT NOT NULL,
  "formula_source" TEXT,
  "calculated_value" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "manual_override" DECIMAL(18,2),
  "final_value" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "payroll_calculation_items_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "payroll_calculation_items_calculation_id_idx" ON "proqpay"."payroll_calculation_items"("calculation_id");

CREATE TABLE IF NOT EXISTS "proqpay"."payroll_snapshots" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "calculation_id" UUID NOT NULL,
  "revision" INTEGER NOT NULL DEFAULT 1,
  "payload_json" TEXT NOT NULL,
  "checksum" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "payroll_snapshots_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "payroll_snapshots_calculation_id_key" ON "proqpay"."payroll_snapshots"("calculation_id");

CREATE TABLE IF NOT EXISTS "proqpay"."payroll_simulations" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "company_id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "scenario_json" TEXT NOT NULL,
  "result_json" TEXT,
  "gross_total" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "net_total" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "employer_cost" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "working_capital_requirement" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "margin_impact" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "created_by" UUID,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "payroll_simulations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "proqpay"."payroll_validations" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "calculation_id" UUID NOT NULL,
  "code" TEXT NOT NULL,
  "severity" "proqpay"."ValidationSeverity" NOT NULL DEFAULT 'WARNING',
  "message" TEXT NOT NULL,
  "employee_id" UUID,
  "employee_name" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "payroll_validations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "proqpay"."payroll_approvals" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "calculation_id" UUID NOT NULL,
  "company_id" UUID NOT NULL,
  "name" TEXT NOT NULL DEFAULT 'Default payroll approval',
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "payroll_approvals_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "proqpay"."payroll_approval_steps" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "approval_id" UUID NOT NULL,
  "level" INTEGER NOT NULL,
  "role_label" TEXT NOT NULL,
  "assignee_name" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "action" "proqpay"."EngineApprovalAction",
  "comment" TEXT,
  "acted_at" TIMESTAMP(3),
  "acted_by" UUID,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "payroll_approval_steps_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "proqpay"."payroll_revisions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "calculation_id" UUID NOT NULL,
  "revision_number" INTEGER NOT NULL,
  "reason" TEXT NOT NULL,
  "base_revision" INTEGER,
  "snapshot_json" TEXT,
  "created_by" UUID,
  "created_by_name" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "payroll_revisions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "payroll_revisions_calculation_id_revision_number_key" ON "proqpay"."payroll_revisions"("calculation_id", "revision_number");

CREATE TABLE IF NOT EXISTS "proqpay"."payroll_journals" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "calculation_id" UUID NOT NULL,
  "company_id" UUID NOT NULL,
  "gross_payroll" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "net_payroll" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "allowance_total" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "deduction_total" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "employer_cost" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "employee_cost" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "bpjs_employer" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "bpjs_employee" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "tax_total" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "working_capital_requirement" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "payroll_journals_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "payroll_journals_calculation_id_key" ON "proqpay"."payroll_journals"("calculation_id");

CREATE TABLE IF NOT EXISTS "proqpay"."payroll_budgets" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "company_id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "scope_type" "proqpay"."BudgetScopeType" NOT NULL DEFAULT 'COMPANY',
  "scope_id" TEXT,
  "period_label" TEXT,
  "amount" DECIMAL(18,2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'IDR',
  "active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "payroll_budgets_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "proqpay"."payroll_budget_allocations" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "budget_id" UUID NOT NULL,
  "label" TEXT NOT NULL,
  "amount" DECIMAL(18,2) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "payroll_budget_allocations_pkey" PRIMARY KEY ("id")
);

-- FKs (ignore if exist)
DO $$ BEGIN
  ALTER TABLE "proqpay"."client_billing_profiles" ADD CONSTRAINT "client_billing_profiles_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "proqpay"."companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "proqpay"."payroll_component_categories" ADD CONSTRAINT "payroll_component_categories_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "proqpay"."companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "proqpay"."payroll_formulas" ADD CONSTRAINT "payroll_formulas_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "proqpay"."companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "proqpay"."payroll_formula_versions" ADD CONSTRAINT "payroll_formula_versions_formula_id_fkey" FOREIGN KEY ("formula_id") REFERENCES "proqpay"."payroll_formulas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "proqpay"."payroll_calculations" ADD CONSTRAINT "payroll_calculations_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "proqpay"."companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "proqpay"."payroll_calculation_items" ADD CONSTRAINT "payroll_calculation_items_calculation_id_fkey" FOREIGN KEY ("calculation_id") REFERENCES "proqpay"."payroll_calculations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "proqpay"."payroll_snapshots" ADD CONSTRAINT "payroll_snapshots_calculation_id_fkey" FOREIGN KEY ("calculation_id") REFERENCES "proqpay"."payroll_calculations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "proqpay"."payroll_simulations" ADD CONSTRAINT "payroll_simulations_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "proqpay"."companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "proqpay"."payroll_validations" ADD CONSTRAINT "payroll_validations_calculation_id_fkey" FOREIGN KEY ("calculation_id") REFERENCES "proqpay"."payroll_calculations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "proqpay"."payroll_approvals" ADD CONSTRAINT "payroll_approvals_calculation_id_fkey" FOREIGN KEY ("calculation_id") REFERENCES "proqpay"."payroll_calculations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "proqpay"."payroll_approvals" ADD CONSTRAINT "payroll_approvals_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "proqpay"."companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "proqpay"."payroll_approval_steps" ADD CONSTRAINT "payroll_approval_steps_approval_id_fkey" FOREIGN KEY ("approval_id") REFERENCES "proqpay"."payroll_approvals"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "proqpay"."payroll_revisions" ADD CONSTRAINT "payroll_revisions_calculation_id_fkey" FOREIGN KEY ("calculation_id") REFERENCES "proqpay"."payroll_calculations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "proqpay"."payroll_journals" ADD CONSTRAINT "payroll_journals_calculation_id_fkey" FOREIGN KEY ("calculation_id") REFERENCES "proqpay"."payroll_calculations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "proqpay"."payroll_journals" ADD CONSTRAINT "payroll_journals_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "proqpay"."companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "proqpay"."payroll_budgets" ADD CONSTRAINT "payroll_budgets_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "proqpay"."companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "proqpay"."payroll_budget_allocations" ADD CONSTRAINT "payroll_budget_allocations_budget_id_fkey" FOREIGN KEY ("budget_id") REFERENCES "proqpay"."payroll_budgets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
