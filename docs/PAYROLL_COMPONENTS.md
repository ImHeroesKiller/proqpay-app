# Payroll Components

Master data in `PayrollComponent` (extended columns for engine):

- categoryCode, calculationType, bpjsApplicable, currency, isSystem, isEditable, formulaExpression

Categories master: `PayrollComponentCategory` (system codes: Basic Salary, Allowance, Deduction, Tax, BPJS, Overtime, …).

API: `GET/POST /api/payroll/components`
