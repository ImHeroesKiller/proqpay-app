-- Phase 1A Enterprise Financial Core (additive, backward compatible)

-- Role enum extensions
ALTER TYPE "proqpay"."Role" ADD VALUE IF NOT EXISTS 'FINANCE_MANAGER';
ALTER TYPE "proqpay"."Role" ADD VALUE IF NOT EXISTS 'FINANCE_STAFF';
ALTER TYPE "proqpay"."Role" ADD VALUE IF NOT EXISTS 'PAYROLL_MANAGER';
ALTER TYPE "proqpay"."Role" ADD VALUE IF NOT EXISTS 'CLIENT';

-- New enums
DO $$ BEGIN
  CREATE TYPE "proqpay"."InvoiceStatus" AS ENUM (
    'DRAFT','PENDING_APPROVAL','APPROVED','ISSUED','PARTIALLY_PAID','PAID','OVERDUE','VOID','CANCELLED'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "proqpay"."InvoiceItemKind" AS ENUM (
    'PAYROLL','MANAGEMENT_FEE','BPJS','PPH21','ALLOWANCE','OVERTIME','REIMBURSEMENT','ADJUSTMENT','PENALTY','OTHER'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "proqpay"."ClientPaymentStatus" AS ENUM (
    'PENDING','VERIFIED','FAILED','REJECTED','VOID'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "proqpay"."ReceivableStatus" AS ENUM (
    'CURRENT','PARTIAL','OVERDUE','COLLECTED','WRITTEN_OFF'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "proqpay"."FundingSourceKind" AS ENUM (
    'CLIENT_ADVANCE','CLIENT_FUNDED','WORKING_CAPITAL','BANK_LOAN','INVESTOR','INTERNAL','OTHER'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "proqpay"."CashMovementType" AS ENUM (
    'IN','OUT','TRANSFER','PAYROLL','COLLECTION','EXPENSE'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "proqpay"."CollectionActivityType" AS ENUM (
    'CALL','EMAIL','MEETING','REMINDER','ESCALATION','NOTE','OTHER'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "proqpay"."WcApprovalDecision" AS ENUM (
    'APPROVED','REJECTED','REQUEST_CHANGES'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "proqpay"."WcSettlementKind" AS ENUM (
    'REPAYMENT','PARTIAL_REPAYMENT','WRITE_OFF','ADJUSTMENT'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS "proqpay"."invoice_sequences" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL,
  "year" INTEGER NOT NULL,
  "month" INTEGER NOT NULL,
  "last_value" INTEGER NOT NULL DEFAULT 0,
  "prefix" TEXT NOT NULL DEFAULT 'INV',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "invoice_sequences_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "invoice_sequences_organization_id_year_month_prefix_key"
  ON "proqpay"."invoice_sequences"("organization_id", "year", "month", "prefix");

CREATE TABLE IF NOT EXISTS "proqpay"."invoices" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL,
  "company_id" UUID NOT NULL,
  "client_id" UUID NOT NULL,
  "project_id" UUID,
  "payroll_period_id" UUID,
  "invoice_number" TEXT,
  "currency" TEXT NOT NULL DEFAULT 'IDR',
  "issue_date" DATE,
  "due_date" DATE,
  "status" "proqpay"."InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
  "subtotal" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "tax" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "grand_total" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "paid_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "outstanding_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "notes" TEXT,
  "created_by" UUID,
  "approved_by" UUID,
  "approved_at" TIMESTAMP(3),
  "issued_at" TIMESTAMP(3),
  "cancelled_at" TIMESTAMP(3),
  "version" INTEGER NOT NULL DEFAULT 1,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "invoices_organization_id_invoice_number_key"
  ON "proqpay"."invoices"("organization_id", "invoice_number");
CREATE INDEX IF NOT EXISTS "invoices_company_id_idx" ON "proqpay"."invoices"("company_id");
CREATE INDEX IF NOT EXISTS "invoices_client_id_idx" ON "proqpay"."invoices"("client_id");
CREATE INDEX IF NOT EXISTS "invoices_status_idx" ON "proqpay"."invoices"("status");
CREATE INDEX IF NOT EXISTS "invoices_payroll_period_id_idx" ON "proqpay"."invoices"("payroll_period_id");
CREATE INDEX IF NOT EXISTS "invoices_due_date_idx" ON "proqpay"."invoices"("due_date");

-- One non-void invoice per payroll period
CREATE UNIQUE INDEX IF NOT EXISTS "invoices_one_active_per_payroll_period"
  ON "proqpay"."invoices"("payroll_period_id")
  WHERE "payroll_period_id" IS NOT NULL
    AND "status" NOT IN ('VOID', 'CANCELLED');

CREATE TABLE IF NOT EXISTS "proqpay"."invoice_items" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "invoice_id" UUID NOT NULL,
  "kind" "proqpay"."InvoiceItemKind" NOT NULL DEFAULT 'OTHER',
  "description" TEXT NOT NULL,
  "quantity" DECIMAL(18,4) NOT NULL DEFAULT 1,
  "unit" TEXT,
  "unit_price" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "tax" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "invoice_items_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "invoice_items_invoice_id_idx" ON "proqpay"."invoice_items"("invoice_id");

CREATE TABLE IF NOT EXISTS "proqpay"."client_payments" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL,
  "company_id" UUID NOT NULL,
  "payment_date" DATE NOT NULL,
  "amount" DECIMAL(18,2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'IDR',
  "payment_method" TEXT,
  "bank_reference" TEXT,
  "payer" TEXT,
  "status" "proqpay"."ClientPaymentStatus" NOT NULL DEFAULT 'PENDING',
  "verified_by" UUID,
  "verified_at" TIMESTAMP(3),
  "notes" TEXT,
  "created_by" UUID,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "client_payments_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "client_payments_company_id_idx" ON "proqpay"."client_payments"("company_id");
CREATE INDEX IF NOT EXISTS "client_payments_status_idx" ON "proqpay"."client_payments"("status");
CREATE INDEX IF NOT EXISTS "client_payments_payment_date_idx" ON "proqpay"."client_payments"("payment_date");

CREATE TABLE IF NOT EXISTS "proqpay"."payment_allocations" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "payment_id" UUID NOT NULL,
  "invoice_id" UUID NOT NULL,
  "allocated_amount" DECIMAL(18,2) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "payment_allocations_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "payment_allocations_payment_id_invoice_id_key"
  ON "proqpay"."payment_allocations"("payment_id", "invoice_id");
CREATE INDEX IF NOT EXISTS "payment_allocations_invoice_id_idx" ON "proqpay"."payment_allocations"("invoice_id");

CREATE TABLE IF NOT EXISTS "proqpay"."receivables" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL,
  "company_id" UUID NOT NULL,
  "invoice_id" UUID NOT NULL,
  "outstanding" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "original_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "current_bucket" TEXT,
  "aging_days" INTEGER NOT NULL DEFAULT 0,
  "expected_collection" DATE,
  "status" "proqpay"."ReceivableStatus" NOT NULL DEFAULT 'CURRENT',
  "last_computed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "receivables_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "receivables_invoice_id_key" ON "proqpay"."receivables"("invoice_id");
CREATE INDEX IF NOT EXISTS "receivables_company_id_idx" ON "proqpay"."receivables"("company_id");
CREATE INDEX IF NOT EXISTS "receivables_status_idx" ON "proqpay"."receivables"("status");
CREATE INDEX IF NOT EXISTS "receivables_aging_days_idx" ON "proqpay"."receivables"("aging_days");

CREATE TABLE IF NOT EXISTS "proqpay"."working_capital_approvals" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "working_capital_request_id" UUID NOT NULL,
  "level" INTEGER NOT NULL DEFAULT 1,
  "decision" "proqpay"."WcApprovalDecision" NOT NULL,
  "decided_by" UUID,
  "decided_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "comment" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "working_capital_approvals_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "working_capital_approvals_working_capital_request_id_idx"
  ON "proqpay"."working_capital_approvals"("working_capital_request_id");

CREATE TABLE IF NOT EXISTS "proqpay"."working_capital_settlements" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "working_capital_request_id" UUID NOT NULL,
  "kind" "proqpay"."WcSettlementKind" NOT NULL DEFAULT 'REPAYMENT',
  "amount" DECIMAL(18,2) NOT NULL,
  "settlement_date" DATE NOT NULL,
  "reference" TEXT,
  "notes" TEXT,
  "recorded_by" UUID,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "working_capital_settlements_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "working_capital_settlements_working_capital_request_id_idx"
  ON "proqpay"."working_capital_settlements"("working_capital_request_id");

CREATE TABLE IF NOT EXISTS "proqpay"."funding_sources" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "kind" "proqpay"."FundingSourceKind" NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "notes" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "funding_sources_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "funding_sources_organization_id_code_key"
  ON "proqpay"."funding_sources"("organization_id", "code");

CREATE TABLE IF NOT EXISTS "proqpay"."treasury_accounts" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL,
  "company_id" UUID,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'IDR',
  "bank_name" TEXT,
  "account_number" TEXT,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "treasury_accounts_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "treasury_accounts_organization_id_code_key"
  ON "proqpay"."treasury_accounts"("organization_id", "code");

CREATE TABLE IF NOT EXISTS "proqpay"."cash_movements" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL,
  "company_id" UUID,
  "treasury_account_id" UUID NOT NULL,
  "movement_type" "proqpay"."CashMovementType" NOT NULL,
  "amount" DECIMAL(18,2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'IDR',
  "movement_date" DATE NOT NULL,
  "reference" TEXT,
  "description" TEXT,
  "client_payment_id" UUID,
  "created_by" UUID,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "cash_movements_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "cash_movements_treasury_account_id_idx" ON "proqpay"."cash_movements"("treasury_account_id");
CREATE INDEX IF NOT EXISTS "cash_movements_movement_date_idx" ON "proqpay"."cash_movements"("movement_date");
CREATE INDEX IF NOT EXISTS "cash_movements_company_id_idx" ON "proqpay"."cash_movements"("company_id");

CREATE TABLE IF NOT EXISTS "proqpay"."collection_activities" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "company_id" UUID NOT NULL,
  "invoice_id" UUID,
  "activity_type" "proqpay"."CollectionActivityType" NOT NULL,
  "summary" TEXT NOT NULL,
  "performed_by" UUID,
  "performed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "collection_activities_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "collection_activities_company_id_idx" ON "proqpay"."collection_activities"("company_id");
CREATE INDEX IF NOT EXISTS "collection_activities_invoice_id_idx" ON "proqpay"."collection_activities"("invoice_id");

CREATE TABLE IF NOT EXISTS "proqpay"."collection_notes" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "activity_id" UUID NOT NULL,
  "body" TEXT NOT NULL,
  "created_by" UUID,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "collection_notes_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "collection_notes_activity_id_idx" ON "proqpay"."collection_notes"("activity_id");

CREATE TABLE IF NOT EXISTS "proqpay"."financial_attachments" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "company_id" UUID NOT NULL,
  "invoice_id" UUID,
  "entity_type" TEXT NOT NULL,
  "entity_id" TEXT NOT NULL,
  "file_name" TEXT NOT NULL,
  "storage_path" TEXT NOT NULL,
  "mime_type" TEXT,
  "file_size" INTEGER,
  "uploaded_by" UUID,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "financial_attachments_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "financial_attachments_company_id_idx" ON "proqpay"."financial_attachments"("company_id");
CREATE INDEX IF NOT EXISTS "financial_attachments_entity_type_entity_id_idx"
  ON "proqpay"."financial_attachments"("entity_type", "entity_id");

CREATE TABLE IF NOT EXISTS "proqpay"."financial_audits" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "company_id" UUID,
  "actor_id" UUID,
  "actor_name" TEXT NOT NULL,
  "actor_role" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "entity_type" TEXT NOT NULL,
  "entity_id" TEXT NOT NULL,
  "detail" TEXT,
  "before_json" TEXT,
  "after_json" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "financial_audits_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "financial_audits_entity_type_entity_id_idx"
  ON "proqpay"."financial_audits"("entity_type", "entity_id");
CREATE INDEX IF NOT EXISTS "financial_audits_company_id_idx" ON "proqpay"."financial_audits"("company_id");
CREATE INDEX IF NOT EXISTS "financial_audits_created_at_idx" ON "proqpay"."financial_audits"("created_at");

-- FKs
ALTER TABLE "proqpay"."invoice_sequences"
  ADD CONSTRAINT "invoice_sequences_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "proqpay"."organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "proqpay"."invoices"
  ADD CONSTRAINT "invoices_company_id_fkey"
  FOREIGN KEY ("company_id") REFERENCES "proqpay"."companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "proqpay"."invoices"
  ADD CONSTRAINT "invoices_project_id_fkey"
  FOREIGN KEY ("project_id") REFERENCES "proqpay"."projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "proqpay"."invoices"
  ADD CONSTRAINT "invoices_payroll_period_id_fkey"
  FOREIGN KEY ("payroll_period_id") REFERENCES "proqpay"."payroll_periods"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "proqpay"."invoice_items"
  ADD CONSTRAINT "invoice_items_invoice_id_fkey"
  FOREIGN KEY ("invoice_id") REFERENCES "proqpay"."invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "proqpay"."client_payments"
  ADD CONSTRAINT "client_payments_company_id_fkey"
  FOREIGN KEY ("company_id") REFERENCES "proqpay"."companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "proqpay"."payment_allocations"
  ADD CONSTRAINT "payment_allocations_payment_id_fkey"
  FOREIGN KEY ("payment_id") REFERENCES "proqpay"."client_payments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "proqpay"."payment_allocations"
  ADD CONSTRAINT "payment_allocations_invoice_id_fkey"
  FOREIGN KEY ("invoice_id") REFERENCES "proqpay"."invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "proqpay"."receivables"
  ADD CONSTRAINT "receivables_invoice_id_fkey"
  FOREIGN KEY ("invoice_id") REFERENCES "proqpay"."invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "proqpay"."receivables"
  ADD CONSTRAINT "receivables_company_id_fkey"
  FOREIGN KEY ("company_id") REFERENCES "proqpay"."companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "proqpay"."working_capital_approvals"
  ADD CONSTRAINT "working_capital_approvals_working_capital_request_id_fkey"
  FOREIGN KEY ("working_capital_request_id") REFERENCES "proqpay"."working_capital_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "proqpay"."working_capital_settlements"
  ADD CONSTRAINT "working_capital_settlements_working_capital_request_id_fkey"
  FOREIGN KEY ("working_capital_request_id") REFERENCES "proqpay"."working_capital_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "proqpay"."funding_sources"
  ADD CONSTRAINT "funding_sources_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "proqpay"."organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "proqpay"."treasury_accounts"
  ADD CONSTRAINT "treasury_accounts_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "proqpay"."organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "proqpay"."treasury_accounts"
  ADD CONSTRAINT "treasury_accounts_company_id_fkey"
  FOREIGN KEY ("company_id") REFERENCES "proqpay"."companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "proqpay"."cash_movements"
  ADD CONSTRAINT "cash_movements_treasury_account_id_fkey"
  FOREIGN KEY ("treasury_account_id") REFERENCES "proqpay"."treasury_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "proqpay"."cash_movements"
  ADD CONSTRAINT "cash_movements_company_id_fkey"
  FOREIGN KEY ("company_id") REFERENCES "proqpay"."companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "proqpay"."cash_movements"
  ADD CONSTRAINT "cash_movements_client_payment_id_fkey"
  FOREIGN KEY ("client_payment_id") REFERENCES "proqpay"."client_payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "proqpay"."collection_activities"
  ADD CONSTRAINT "collection_activities_company_id_fkey"
  FOREIGN KEY ("company_id") REFERENCES "proqpay"."companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "proqpay"."collection_activities"
  ADD CONSTRAINT "collection_activities_invoice_id_fkey"
  FOREIGN KEY ("invoice_id") REFERENCES "proqpay"."invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "proqpay"."collection_notes"
  ADD CONSTRAINT "collection_notes_activity_id_fkey"
  FOREIGN KEY ("activity_id") REFERENCES "proqpay"."collection_activities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "proqpay"."financial_attachments"
  ADD CONSTRAINT "financial_attachments_company_id_fkey"
  FOREIGN KEY ("company_id") REFERENCES "proqpay"."companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "proqpay"."financial_attachments"
  ADD CONSTRAINT "financial_attachments_invoice_id_fkey"
  FOREIGN KEY ("invoice_id") REFERENCES "proqpay"."invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "proqpay"."financial_audits"
  ADD CONSTRAINT "financial_audits_company_id_fkey"
  FOREIGN KEY ("company_id") REFERENCES "proqpay"."companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;
