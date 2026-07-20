# Formula Engine

## Expression language

Identifiers, numbers, `+ - * / ( )`, unary minus.

## Dependencies

`extractDependencies` + `topologicalSort` with **circular detection**.

## Evaluation

`evaluateFormulaGraph(nodes, baseValues)` in dependency order.

Default graph when no ACTIVE company formulas: BasicSalary, allowances, overtime, gross, loan, BPJS, PPh21, NetSalary, EmployerCost.

Formulas versioned via `PayrollFormula` + `PayrollFormulaVersion` (activate one version).

API: `GET/POST /api/payroll/formulas`
