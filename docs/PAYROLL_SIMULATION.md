# Simulation Engine

`PayrollSimulation` stores scenario JSON + result JSON.

Does **not** mutate `PayrollPeriod` or calculations.

Scenario knobs: UMK %, allowance factor, BPJS factor, THR bonus, headcount delta, funding model.

Outputs: Gross, Net, Employer Cost, WC Requirement, Margin Impact.

API: `GET/POST /api/payroll/simulate`
