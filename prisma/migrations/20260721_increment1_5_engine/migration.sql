-- Increment 1.5 — Enterprise Payroll Engine completion (additive only)
-- Schema: proqpay

-- Tax config versioning / PTKP
ALTER TABLE "proqpay"."tax_configs"
  ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "lifecycle" TEXT NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN IF NOT EXISTS "effective_to" DATE,
  ADD COLUMN IF NOT EXISTS "ptkp_json" TEXT,
  ADD COLUMN IF NOT EXISTS "rules_json" TEXT,
  ADD COLUMN IF NOT EXISTS "change_note" TEXT,
  ADD COLUMN IF NOT EXISTS "created_by" UUID;

CREATE INDEX IF NOT EXISTS "tax_configs_lifecycle_idx" ON "proqpay"."tax_configs"("lifecycle");

-- BPJS versioning
ALTER TABLE "proqpay"."bpjs_configs"
  ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "lifecycle" TEXT NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN IF NOT EXISTS "effective_to" DATE,
  ADD COLUMN IF NOT EXISTS "change_note" TEXT,
  ADD COLUMN IF NOT EXISTS "created_by" UUID;

CREATE INDEX IF NOT EXISTS "bpjs_configs_lifecycle_idx" ON "proqpay"."bpjs_configs"("lifecycle");

-- Formula version immutability metadata
ALTER TABLE "proqpay"."payroll_formula_versions"
  ADD COLUMN IF NOT EXISTS "lifecycle" TEXT NOT NULL DEFAULT 'DRAFT',
  ADD COLUMN IF NOT EXISTS "effective_from" DATE,
  ADD COLUMN IF NOT EXISTS "effective_to" DATE;

-- Calculation traceability
ALTER TABLE "proqpay"."payroll_calculations"
  ADD COLUMN IF NOT EXISTS "run_number" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "run_reason" TEXT,
  ADD COLUMN IF NOT EXISTS "tax_config_id" UUID,
  ADD COLUMN IF NOT EXISTS "bpjs_config_id" UUID,
  ADD COLUMN IF NOT EXISTS "config_snapshot_json" TEXT,
  ADD COLUMN IF NOT EXISTS "parent_calculation_id" UUID;

CREATE INDEX IF NOT EXISTS "payroll_calculations_run_number_idx"
  ON "proqpay"."payroll_calculations"("run_number");

-- Validation center
ALTER TABLE "proqpay"."payroll_validations"
  ADD COLUMN IF NOT EXISTS "suggested_action" TEXT,
  ADD COLUMN IF NOT EXISTS "resolution_status" TEXT NOT NULL DEFAULT 'OPEN',
  ADD COLUMN IF NOT EXISTS "resolved_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "resolved_by" UUID,
  ADD COLUMN IF NOT EXISTS "resolution_note" TEXT;

CREATE INDEX IF NOT EXISTS "payroll_validations_resolution_status_idx"
  ON "proqpay"."payroll_validations"("resolution_status");
