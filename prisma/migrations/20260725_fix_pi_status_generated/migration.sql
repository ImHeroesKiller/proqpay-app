-- Fix: PrismaClientUnknownRequestError on dashboard
-- Value 'GENERATED' not found in enum 'PaymentInstructionStatus'
--
-- Root cause: production PostgreSQL enum and rows still contained legacy
-- label GENERATED (added outside current Prisma schema / via older workflow).
-- Application code and prisma/schema.prisma use READY for generated
-- instructions (see generatePaymentInstruction).
--
-- Safe data conversion only — no drops, no deletes.

-- Ensure READY exists (idempotent; already present in prod schema)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    JOIN pg_namespace n ON t.typnamespace = n.oid
    WHERE n.nspname = 'proqpay'
      AND t.typname = 'PaymentInstructionStatus'
      AND e.enumlabel = 'READY'
  ) THEN
    ALTER TYPE "proqpay"."PaymentInstructionStatus" ADD VALUE 'READY';
  END IF;
END $$;

-- Convert legacy GENERATED → READY on payroll periods
UPDATE "proqpay"."payroll_periods"
SET "payment_instruction_status" = 'READY'::"proqpay"."PaymentInstructionStatus",
    "updated_at" = NOW()
WHERE "payment_instruction_status"::text = 'GENERATED';

-- Convert legacy GENERATED → READY on payment instructions
UPDATE "proqpay"."payment_instructions"
SET "execution_status" = 'READY'::"proqpay"."PaymentInstructionStatus",
    "updated_at" = NOW()
WHERE "execution_status"::text = 'GENERATED';

-- Note: PostgreSQL cannot DROP ENUM values without recreating the type.
-- Leaving unused label GENERATED on the type is harmless once no rows use it.
-- Prisma Client only fails when deserializing a value not in the schema.
