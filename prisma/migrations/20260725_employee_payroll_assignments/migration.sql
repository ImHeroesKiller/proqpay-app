-- Additive only: ensure employee_payroll_assignments exists for payroll group history.
-- Does NOT add employees.payroll_group_id (enterprise model uses assignments).

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS proqpay.employee_payroll_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES proqpay.employees(id) ON DELETE CASCADE,
  payroll_group_id UUID REFERENCES proqpay.payroll_groups(id) ON DELETE SET NULL,
  company_id UUID REFERENCES proqpay.companies(id) ON DELETE SET NULL,
  project_id UUID REFERENCES proqpay.projects(id) ON DELETE SET NULL,
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_to DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  status TEXT DEFAULT 'ACTIVE',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- The table may already exist from an earlier partial/manual rollout.
-- Add every runtime column defensively before creating indexes.
ALTER TABLE proqpay.employee_payroll_assignments
  ADD COLUMN IF NOT EXISTS payroll_group_id UUID,
  ADD COLUMN IF NOT EXISTS company_id UUID,
  ADD COLUMN IF NOT EXISTS project_id UUID,
  ADD COLUMN IF NOT EXISTS effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS effective_to DATE,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ACTIVE',
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'employee_payroll_assignments_payroll_group_id_fkey') THEN
    ALTER TABLE proqpay.employee_payroll_assignments
      ADD CONSTRAINT employee_payroll_assignments_payroll_group_id_fkey
      FOREIGN KEY (payroll_group_id) REFERENCES proqpay.payroll_groups(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'employee_payroll_assignments_company_id_fkey') THEN
    ALTER TABLE proqpay.employee_payroll_assignments
      ADD CONSTRAINT employee_payroll_assignments_company_id_fkey
      FOREIGN KEY (company_id) REFERENCES proqpay.companies(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'employee_payroll_assignments_project_id_fkey') THEN
    ALTER TABLE proqpay.employee_payroll_assignments
      ADD CONSTRAINT employee_payroll_assignments_project_id_fkey
      FOREIGN KEY (project_id) REFERENCES proqpay.projects(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_epa_employee ON proqpay.employee_payroll_assignments(employee_id);
CREATE INDEX IF NOT EXISTS idx_epa_group ON proqpay.employee_payroll_assignments(payroll_group_id);
CREATE INDEX IF NOT EXISTS idx_epa_company ON proqpay.employee_payroll_assignments(company_id);
CREATE INDEX IF NOT EXISTS idx_epa_project ON proqpay.employee_payroll_assignments(project_id);
CREATE INDEX IF NOT EXISTS idx_epa_effective ON proqpay.employee_payroll_assignments(effective_from);
