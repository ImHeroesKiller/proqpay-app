-- Increment 1 — Operational intake → Final payroll (additive only)
-- Schema: proqpay

-- Payroll period projection / population tracking
ALTER TABLE "proqpay"."payroll_periods"
  ADD COLUMN IF NOT EXISTS "latest_calculation_id" UUID,
  ADD COLUMN IF NOT EXISTS "projected_calculation_id" UUID,
  ADD COLUMN IF NOT EXISTS "projected_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "population_built_at" TIMESTAMP(3);

-- Attendance provenance
ALTER TABLE "proqpay"."attendance_records"
  ADD COLUMN IF NOT EXISTS "import_batch_id" UUID;

-- Enums (idempotent via DO blocks)
DO $$ BEGIN
  CREATE TYPE "proqpay"."AttendanceImportStatus" AS ENUM ('STAGED', 'PARTIAL', 'COMMITTED', 'FAILED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "proqpay"."AttendanceExceptionStatus" AS ENUM ('OPEN', 'RESOLVED', 'IGNORED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "proqpay"."AttendanceExceptionSeverity" AS ENUM ('ERROR', 'WARNING');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "proqpay"."attendance_import_batches" (
  "id" UUID NOT NULL,
  "company_id" UUID NOT NULL,
  "payroll_period_id" UUID,
  "file_name" TEXT NOT NULL,
  "content_checksum" TEXT NOT NULL,
  "status" "proqpay"."AttendanceImportStatus" NOT NULL DEFAULT 'STAGED',
  "total_rows" INTEGER NOT NULL DEFAULT 0,
  "success_rows" INTEGER NOT NULL DEFAULT 0,
  "exception_rows" INTEGER NOT NULL DEFAULT 0,
  "staged_rows" INTEGER NOT NULL DEFAULT 0,
  "created_by" UUID,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "committed_at" TIMESTAMP(3),
  CONSTRAINT "attendance_import_batches_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "attendance_import_batches_company_id_content_checksum_key"
  ON "proqpay"."attendance_import_batches"("company_id", "content_checksum");
CREATE INDEX IF NOT EXISTS "attendance_import_batches_company_id_idx"
  ON "proqpay"."attendance_import_batches"("company_id");
CREATE INDEX IF NOT EXISTS "attendance_import_batches_payroll_period_id_idx"
  ON "proqpay"."attendance_import_batches"("payroll_period_id");
CREATE INDEX IF NOT EXISTS "attendance_import_batches_status_idx"
  ON "proqpay"."attendance_import_batches"("status");

CREATE TABLE IF NOT EXISTS "proqpay"."attendance_staging_rows" (
  "id" UUID NOT NULL,
  "batch_id" UUID NOT NULL,
  "row_number" INTEGER NOT NULL,
  "employee_id" UUID NOT NULL,
  "employee_code" TEXT NOT NULL,
  "work_date" DATE NOT NULL,
  "type" "proqpay"."AttendanceType" NOT NULL DEFAULT 'PRESENT',
  "hours_worked" DECIMAL(6,2) NOT NULL DEFAULT 8,
  "overtime_hours" DECIMAL(6,2) NOT NULL DEFAULT 0,
  "project_id" UUID,
  "site_code" TEXT,
  "notes" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "attendance_staging_rows_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "attendance_staging_rows_batch_id_row_number_key"
  ON "proqpay"."attendance_staging_rows"("batch_id", "row_number");
CREATE INDEX IF NOT EXISTS "attendance_staging_rows_batch_id_idx"
  ON "proqpay"."attendance_staging_rows"("batch_id");

CREATE TABLE IF NOT EXISTS "proqpay"."attendance_import_exceptions" (
  "id" UUID NOT NULL,
  "batch_id" UUID NOT NULL,
  "row_number" INTEGER NOT NULL,
  "code" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "severity" "proqpay"."AttendanceExceptionSeverity" NOT NULL DEFAULT 'ERROR',
  "status" "proqpay"."AttendanceExceptionStatus" NOT NULL DEFAULT 'OPEN',
  "employee_code" TEXT,
  "work_date" TEXT,
  "raw_payload" TEXT NOT NULL,
  "resolved_at" TIMESTAMP(3),
  "resolved_by" UUID,
  "resolution_note" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "attendance_import_exceptions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "attendance_import_exceptions_batch_id_idx"
  ON "proqpay"."attendance_import_exceptions"("batch_id");
CREATE INDEX IF NOT EXISTS "attendance_import_exceptions_status_idx"
  ON "proqpay"."attendance_import_exceptions"("status");
CREATE INDEX IF NOT EXISTS "attendance_import_exceptions_code_idx"
  ON "proqpay"."attendance_import_exceptions"("code");

-- FKs (IF NOT EXISTS via exception swallow)
DO $$ BEGIN
  ALTER TABLE "proqpay"."attendance_import_batches"
    ADD CONSTRAINT "attendance_import_batches_company_id_fkey"
    FOREIGN KEY ("company_id") REFERENCES "proqpay"."companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "proqpay"."attendance_import_batches"
    ADD CONSTRAINT "attendance_import_batches_payroll_period_id_fkey"
    FOREIGN KEY ("payroll_period_id") REFERENCES "proqpay"."payroll_periods"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "proqpay"."attendance_staging_rows"
    ADD CONSTRAINT "attendance_staging_rows_batch_id_fkey"
    FOREIGN KEY ("batch_id") REFERENCES "proqpay"."attendance_import_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "proqpay"."attendance_import_exceptions"
    ADD CONSTRAINT "attendance_import_exceptions_batch_id_fkey"
    FOREIGN KEY ("batch_id") REFERENCES "proqpay"."attendance_import_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "proqpay"."attendance_records"
    ADD CONSTRAINT "attendance_records_import_batch_id_fkey"
    FOREIGN KEY ("import_batch_id") REFERENCES "proqpay"."attendance_import_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "attendance_records_import_batch_id_idx"
  ON "proqpay"."attendance_records"("import_batch_id");
