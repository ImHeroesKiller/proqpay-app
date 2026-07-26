CREATE TABLE IF NOT EXISTS "proqpay"."bank_file_templates" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "company_id" UUID NOT NULL,
  "bank_code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "file_type" TEXT NOT NULL DEFAULT 'CSV',
  "delimiter" TEXT NOT NULL DEFAULT ',',
  "sheet_name" TEXT,
  "columns_json" JSONB NOT NULL DEFAULT '[]',
  "mapping_json" JSONB NOT NULL DEFAULT '{}',
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_by" UUID,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "bank_file_templates_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "bank_file_templates_company_id_fkey"
    FOREIGN KEY ("company_id") REFERENCES "proqpay"."companies"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "bank_file_templates_company_id_bank_code_version_key"
  ON "proqpay"."bank_file_templates"("company_id", "bank_code", "version");
CREATE INDEX IF NOT EXISTS "bank_file_templates_company_id_bank_code_is_active_idx"
  ON "proqpay"."bank_file_templates"("company_id", "bank_code", "is_active");

ALTER TABLE "proqpay"."payment_instructions"
  ADD COLUMN IF NOT EXISTS "bank_template_id" UUID,
  ADD COLUMN IF NOT EXISTS "export_bank_code" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'payment_instructions_bank_template_id_fkey'
  ) THEN
    ALTER TABLE "proqpay"."payment_instructions"
      ADD CONSTRAINT "payment_instructions_bank_template_id_fkey"
      FOREIGN KEY ("bank_template_id")
      REFERENCES "proqpay"."bank_file_templates"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

ALTER TABLE "proqpay"."client_billing_profiles"
  ADD COLUMN IF NOT EXISTS "payment_mode" TEXT NOT NULL DEFAULT 'REIMBURSEMENT';
