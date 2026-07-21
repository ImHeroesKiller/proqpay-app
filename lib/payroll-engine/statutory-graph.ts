/**
 * Build formula graph using explicit Tax/BPJS rates (no silent hardcoded production defaults).
 */

import type { FormulaNode } from "@/lib/payroll-engine/formula-engine";

export type StatutoryRates = {
  kesehatanEmployee: number;
  jhtEmployee: number;
  jpEmployee: number;
  kesehatanEmployer: number;
  jhtEmployer: number;
  jkkEmployer: number;
  jkmEmployer: number;
  jpEmployer: number;
  terRate: number;
};

function r(n: number): string {
  // Keep enough precision for rates
  return String(n);
}

export function buildStatutoryGraph(rates: StatutoryRates): FormulaNode[] {
  const bpjsEmp =
    rates.kesehatanEmployee + rates.jhtEmployee + rates.jpEmployee;
  const bpjsEr =
    rates.kesehatanEmployer +
    rates.jhtEmployer +
    rates.jkkEmployer +
    rates.jkmEmployer +
    rates.jpEmployer;

  return [
    {
      code: "BasicSalary",
      expression: "BaseSalary",
      dependsOn: ["BaseSalary"],
    },
    {
      code: "TransportAllowance",
      expression: "BaseSalary * 0.05",
      dependsOn: ["BaseSalary"],
    },
    {
      code: "MealAllowance",
      expression: "BaseSalary * 0.05",
      dependsOn: ["BaseSalary"],
    },
    {
      code: "Overtime",
      expression: "OvertimeHours * (BaseSalary / 173) * 1.5",
      dependsOn: ["BaseSalary", "OvertimeHours"],
    },
    {
      code: "Bonus",
      expression: "BonusInput",
      dependsOn: ["BonusInput"],
    },
    {
      code: "Gross",
      expression:
        "BasicSalary + TransportAllowance + MealAllowance + Overtime + Bonus",
      dependsOn: [
        "BasicSalary",
        "TransportAllowance",
        "MealAllowance",
        "Overtime",
        "Bonus",
      ],
    },
    {
      code: "Loan",
      expression: "LoanInput",
      dependsOn: ["LoanInput"],
    },
    {
      code: "BPJSEmployee",
      expression: `BaseSalary * ${r(bpjsEmp)}`,
      dependsOn: ["BaseSalary"],
    },
    {
      code: "BPJSEmployer",
      expression: `BaseSalary * ${r(bpjsEr)}`,
      dependsOn: ["BaseSalary"],
    },
    {
      code: "PPH21",
      expression: `Gross * ${r(rates.terRate)}`,
      dependsOn: ["Gross"],
    },
    {
      code: "NetSalary",
      expression: "Gross - Loan - BPJSEmployee - PPH21",
      dependsOn: ["Gross", "Loan", "BPJSEmployee", "PPH21"],
    },
    {
      code: "EmployerCost",
      expression: "Gross + BPJSEmployer",
      dependsOn: ["Gross", "BPJSEmployer"],
    },
  ];
}
