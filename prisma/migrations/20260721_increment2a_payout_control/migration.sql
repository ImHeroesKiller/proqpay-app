-- Increment 2A — Payout control plane (additive only)
-- Schema: proqpay

ALTER TABLE "proqpay"."payment_instructions"
  ADD COLUMN IF NOT EXISTS "maker_user_id" UUID,
  ADD COLUMN IF NOT EXISTS "checker_user_id" UUID,
  ADD COLUMN IF NOT EXISTS "checked_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "rejection_reason" TEXT,
  ADD COLUMN IF NOT EXISTS "approval_comment" TEXT,
  ADD COLUMN IF NOT EXISTS "content_checksum" TEXT,
  ADD COLUMN IF NOT EXISTS "idempotency_key" TEXT,
  ADD COLUMN IF NOT EXISTS "cancelled_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "cancel_reason" TEXT;

-- Backfill maker from generated_by where missing
UPDATE "proqpay"."payment_instructions"
SET "maker_user_id" = "generated_by"
WHERE "maker_user_id" IS NULL AND "generated_by" IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "payment_instructions_company_id_idempotency_key_key"
  ON "proqpay"."payment_instructions"("company_id", "idempotency_key")
  WHERE "idempotency_key" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "payment_instructions_approval_status_idx"
  ON "proqpay"."payment_instructions"("approval_status");

DO $$ BEGIN
  ALTER TABLE "proqpay"."payment_instructions"
    ADD CONSTRAINT "payment_instructions_maker_user_id_fkey"
    FOREIGN KEY ("maker_user_id") REFERENCES "proqpay"."users"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "proqpay"."payment_instructions"
    ADD CONSTRAINT "payment_instructions_checker_user_id_fkey"
    FOREIGN KEY ("checker_user_id") REFERENCES "proqpay"."users"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
