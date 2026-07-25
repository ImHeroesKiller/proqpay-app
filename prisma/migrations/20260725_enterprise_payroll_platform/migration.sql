-- Enterprise Payroll Platform (additive only)
-- Schema: proqpay
-- Safe to re-run partially: uses IF NOT EXISTS

CREATE SCHEMA IF NOT EXISTS proqpay;
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── Payroll groups ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS proqpay.payroll_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES proqpay.companies(id) ON DELETE CASCADE,
  project_id UUID REFERENCES proqpay.projects(id) ON DELETE SET NULL,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  worker_type TEXT NOT NULL DEFAULT 'MONTHLY',
  pay_cycle TEXT NOT NULL DEFAULT 'MONTHLY',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, code)
);
CREATE INDEX IF NOT EXISTS idx_payroll_groups_company ON proqpay.payroll_groups(company_id);
CREATE INDEX IF NOT EXISTS idx_payroll_groups_project ON proqpay.payroll_groups(project_id);

-- Link employees to payroll group (additive column)
DO $$ BEGIN
  ALTER TABLE proqpay.employees ADD COLUMN IF NOT EXISTS payroll_group_id UUID REFERENCES proqpay.payroll_groups(id) ON DELETE SET NULL;
EXCEPTION WHEN others THEN NULL;
END $$;

-- Component breakdown on payroll lines
DO $$ BEGIN
  ALTER TABLE proqpay.payroll_lines ADD COLUMN IF NOT EXISTS component_breakdown JSONB;
  ALTER TABLE proqpay.payroll_lines ADD COLUMN IF NOT EXISTS bpjs_employer NUMERIC(18,2) DEFAULT 0;
  ALTER TABLE proqpay.payroll_lines ADD COLUMN IF NOT EXISTS pph21 NUMERIC(18,2) DEFAULT 0;
  ALTER TABLE proqpay.payroll_lines ADD COLUMN IF NOT EXISTS gross_pay NUMERIC(18,2) DEFAULT 0;
  ALTER TABLE proqpay.payroll_lines ADD COLUMN IF NOT EXISTS present_days NUMERIC(8,2);
  ALTER TABLE proqpay.payroll_lines ADD COLUMN IF NOT EXISTS overtime_hours NUMERIC(8,2);
  ALTER TABLE proqpay.payroll_lines ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT false;
  ALTER TABLE proqpay.payroll_lines ADD COLUMN IF NOT EXISTS version INT DEFAULT 1;
EXCEPTION WHEN others THEN NULL;
END $$;

-- Period snapshot / lock metadata
DO $$ BEGIN
  ALTER TABLE proqpay.payroll_periods ADD COLUMN IF NOT EXISTS payroll_group_id UUID REFERENCES proqpay.payroll_groups(id) ON DELETE SET NULL;
  ALTER TABLE proqpay.payroll_periods ADD COLUMN IF NOT EXISTS locked_by UUID;
  ALTER TABLE proqpay.payroll_periods ADD COLUMN IF NOT EXISTS snapshot_json JSONB;
  ALTER TABLE proqpay.payroll_periods ADD COLUMN IF NOT EXISTS calculation_version INT DEFAULT 1;
EXCEPTION WHEN others THEN NULL;
END $$;

-- Project headcount quota
DO $$ BEGIN
  ALTER TABLE proqpay.projects ADD COLUMN IF NOT EXISTS headcount_quota INT;
  ALTER TABLE proqpay.projects ADD COLUMN IF NOT EXISTS service_type TEXT;
  ALTER TABLE proqpay.projects ADD COLUMN IF NOT EXISTS budget_amount NUMERIC(18,2);
  ALTER TABLE proqpay.projects ADD COLUMN IF NOT EXISTS operational_pic TEXT;
EXCEPTION WHEN others THEN NULL;
END $$;

-- ─── Import center ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS proqpay.import_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  version TEXT NOT NULL DEFAULT '1.0',
  columns_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS proqpay.import_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES proqpay.companies(id) ON DELETE SET NULL,
  template_code TEXT NOT NULL,
  template_version TEXT NOT NULL DEFAULT '1.0',
  file_name TEXT NOT NULL,
  file_checksum TEXT,
  status TEXT NOT NULL DEFAULT 'UPLOADED',
  total_rows INT NOT NULL DEFAULT 0,
  valid_rows INT NOT NULL DEFAULT 0,
  error_rows INT NOT NULL DEFAULT 0,
  warning_rows INT NOT NULL DEFAULT 0,
  committed_rows INT NOT NULL DEFAULT 0,
  uploaded_by UUID,
  committed_by UUID,
  committed_at TIMESTAMPTZ,
  error_summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_import_batches_company ON proqpay.import_batches(company_id);
CREATE INDEX IF NOT EXISTS idx_import_batches_status ON proqpay.import_batches(status);

CREATE TABLE IF NOT EXISTS proqpay.import_staging_rows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL REFERENCES proqpay.import_batches(id) ON DELETE CASCADE,
  row_number INT NOT NULL,
  raw_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'PENDING',
  errors_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  warnings_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_import_staging_batch ON proqpay.import_staging_rows(batch_id);

CREATE TABLE IF NOT EXISTS proqpay.import_validation_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL REFERENCES proqpay.import_batches(id) ON DELETE CASCADE,
  staging_row_id UUID REFERENCES proqpay.import_staging_rows(id) ON DELETE CASCADE,
  severity TEXT NOT NULL DEFAULT 'ERROR',
  field_name TEXT,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS proqpay.import_commit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL REFERENCES proqpay.import_batches(id) ON DELETE CASCADE,
  staging_row_id UUID,
  action TEXT NOT NULL,
  entity TEXT,
  entity_id TEXT,
  detail TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── AI Scheme Builder ────────────────────────────────────
CREATE TABLE IF NOT EXISTS proqpay.payroll_scheme_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES proqpay.companies(id) ON DELETE SET NULL,
  project_id UUID REFERENCES proqpay.projects(id) ON DELETE SET NULL,
  payroll_group_id UUID REFERENCES proqpay.payroll_groups(id) ON DELETE SET NULL,
  title TEXT NOT NULL DEFAULT 'Skema Payroll Baru',
  status TEXT NOT NULL DEFAULT 'DRAFT',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS proqpay.payroll_scheme_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES proqpay.payroll_scheme_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  structured_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_scheme_messages_conv ON proqpay.payroll_scheme_messages(conversation_id);

CREATE TABLE IF NOT EXISTS proqpay.payroll_scheme_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES proqpay.payroll_scheme_conversations(id) ON DELETE CASCADE,
  company_id UUID REFERENCES proqpay.companies(id) ON DELETE SET NULL,
  project_id UUID,
  payroll_group_id UUID,
  scheme_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'AI_GENERATED',
  dsl_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  unresolved_assumptions JSONB NOT NULL DEFAULT '[]'::jsonb,
  version INT NOT NULL DEFAULT 1,
  effective_date DATE,
  created_by UUID,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  activated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS proqpay.payroll_scheme_simulations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  draft_id UUID NOT NULL REFERENCES proqpay.payroll_scheme_drafts(id) ON DELETE CASCADE,
  test_case_code TEXT NOT NULL,
  test_case_name TEXT NOT NULL,
  input_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  result_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  expected_json JSONB,
  passed BOOLEAN,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS proqpay.payroll_scheme_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  draft_id UUID NOT NULL REFERENCES proqpay.payroll_scheme_drafts(id) ON DELETE CASCADE,
  level INT NOT NULL DEFAULT 1,
  approver_role TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING',
  comment TEXT,
  acted_by UUID,
  acted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Payroll validation issues ────────────────────────────
CREATE TABLE IF NOT EXISTS proqpay.payroll_validation_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_period_id UUID NOT NULL REFERENCES proqpay.payroll_periods(id) ON DELETE CASCADE,
  payroll_line_id UUID REFERENCES proqpay.payroll_lines(id) ON DELETE CASCADE,
  employee_id UUID,
  severity TEXT NOT NULL DEFAULT 'WARNING',
  code TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'OPEN',
  resolved_by UUID,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_validation_period ON proqpay.payroll_validation_issues(payroll_period_id);

-- ─── Payslips ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS proqpay.payslips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_period_id UUID NOT NULL REFERENCES proqpay.payroll_periods(id) ON DELETE CASCADE,
  payroll_line_id UUID REFERENCES proqpay.payroll_lines(id) ON DELETE SET NULL,
  employee_id UUID NOT NULL REFERENCES proqpay.employees(id) ON DELETE CASCADE,
  payslip_number TEXT NOT NULL,
  payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  issued_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (payroll_period_id, employee_id)
);

-- ─── Billing / invoices ───────────────────────────────────
CREATE TABLE IF NOT EXISTS proqpay.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES proqpay.companies(id) ON DELETE CASCADE,
  payroll_period_id UUID REFERENCES proqpay.payroll_periods(id) ON DELETE SET NULL,
  invoice_number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'DRAFT',
  issue_date DATE,
  due_date DATE,
  subtotal NUMERIC(18,2) NOT NULL DEFAULT 0,
  tax_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  management_fee NUMERIC(18,2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'IDR',
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, invoice_number)
);

CREATE TABLE IF NOT EXISTS proqpay.invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES proqpay.invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity NUMERIC(18,2) NOT NULL DEFAULT 1,
  unit_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  line_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed import templates (idempotent)
INSERT INTO proqpay.import_templates (code, name, description, version, columns_json)
VALUES
  ('EMPLOYEE_MASTER', 'Employee Master', 'Master data karyawan', '1.0',
   '[{"key":"employee_code","label":"Kode Karyawan","required":true},{"key":"name","label":"Nama","required":true},{"key":"email","label":"Email","required":true},{"key":"phone","label":"Telepon","required":false},{"key":"department","label":"Departemen","required":true},{"key":"position","label":"Jabatan","required":true},{"key":"join_date","label":"Tanggal Masuk","required":true},{"key":"base_salary","label":"Gaji Pokok","required":true},{"key":"bank_name","label":"Bank","required":true},{"key":"bank_account","label":"No Rekening","required":true},{"key":"tax_status","label":"Status Pajak","required":true},{"key":"bpjs_number","label":"No BPJS","required":false},{"key":"npwp","label":"NPWP","required":false}]'::jsonb),
  ('EMPLOYEE_PERSONAL', 'Employee Personal Profile', 'Profil personal', '1.0',
   '[{"key":"employee_code","label":"Kode Karyawan","required":true},{"key":"identity_number","label":"NIK","required":true},{"key":"birth_date","label":"Tanggal Lahir","required":false},{"key":"address","label":"Alamat","required":false}]'::jsonb),
  ('EMPLOYEE_CONTRACT', 'Employee Contract', 'Kontrak kerja', '1.0',
   '[{"key":"employee_code","label":"Kode Karyawan","required":true},{"key":"contract_type","label":"Jenis Kontrak","required":true},{"key":"start_date","label":"Mulai","required":true},{"key":"end_date","label":"Selesai","required":false}]'::jsonb),
  ('PROJECT_ASSIGNMENT', 'Project Assignment', 'Penempatan project', '1.0',
   '[{"key":"employee_code","label":"Kode Karyawan","required":true},{"key":"project_code","label":"Kode Project","required":true},{"key":"start_date","label":"Mulai","required":true},{"key":"end_date","label":"Selesai","required":false},{"key":"role_label","label":"Peran","required":false}]'::jsonb),
  ('COMPENSATION', 'Compensation', 'Riwayat kompensasi', '1.0',
   '[{"key":"employee_code","label":"Kode Karyawan","required":true},{"key":"base_salary","label":"Gaji Pokok","required":true},{"key":"effective_date","label":"Efektif","required":true}]'::jsonb),
  ('BANK_ACCOUNT', 'Bank Account', 'Rekening bank', '1.0',
   '[{"key":"employee_code","label":"Kode Karyawan","required":true},{"key":"bank_name","label":"Bank","required":true},{"key":"bank_account","label":"No Rekening","required":true}]'::jsonb),
  ('TAX_PROFILE', 'Tax Profile', 'Profil pajak', '1.0',
   '[{"key":"employee_code","label":"Kode Karyawan","required":true},{"key":"ptkp_status","label":"PTKP","required":true},{"key":"npwp","label":"NPWP","required":false},{"key":"tax_method","label":"Metode Pajak","required":true}]'::jsonb),
  ('BPJS_ENROLLMENT', 'BPJS Enrollment', 'Kepesertaan BPJS', '1.0',
   '[{"key":"employee_code","label":"Kode Karyawan","required":true},{"key":"bpjs_kesehatan","label":"BPJS Kesehatan","required":false},{"key":"bpjs_tk","label":"BPJS TK","required":false}]'::jsonb),
  ('ATTENDANCE_SUMMARY', 'Attendance Summary', 'Ringkasan kehadiran', '1.0',
   '[{"key":"employee_code","label":"Kode Karyawan","required":true},{"key":"period_start","label":"Periode Mulai","required":true},{"key":"period_end","label":"Periode Selesai","required":true},{"key":"present_days","label":"Hari Hadir","required":true},{"key":"absent_days","label":"Hari Alpha","required":false},{"key":"overtime_hours","label":"Jam Lembur","required":false}]'::jsonb),
  ('PAYROLL_VARIABLE', 'Payroll Variable', 'Komponen variable', '1.0',
   '[{"key":"employee_code","label":"Kode Karyawan","required":true},{"key":"component_code","label":"Kode Komponen","required":true},{"key":"amount","label":"Nominal","required":true}]'::jsonb),
  ('EMPLOYEE_MUTATION', 'Employee Mutation', 'Mutasi karyawan', '1.0',
   '[{"key":"employee_code","label":"Kode Karyawan","required":true},{"key":"to_project_code","label":"Project Tujuan","required":false},{"key":"to_department","label":"Departemen Tujuan","required":false},{"key":"effective_date","label":"Efektif","required":true}]'::jsonb),
  ('EMPLOYEE_TERMINATION', 'Employee Termination', 'Terminasi karyawan', '1.0',
   '[{"key":"employee_code","label":"Kode Karyawan","required":true},{"key":"terminate_date","label":"Tanggal Berhenti","required":true},{"key":"reason","label":"Alasan","required":false}]'::jsonb)
ON CONFLICT (code) DO NOTHING;
