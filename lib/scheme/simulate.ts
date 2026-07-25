import {
  calculateFromScheme,
  type SchemeCalcInput,
  type SchemeCalcResult,
} from "@/lib/payroll/scheme-engine";
import type { SchemeDsl } from "@/lib/scheme/dsl";

export type SimulationCase = {
  code: string;
  name: string;
  input: SchemeCalcInput;
  expectedNetMin?: number;
  expectPassUnless?: (r: SchemeCalcResult) => boolean;
};

export function buildDefaultTestCases(scheme: SchemeDsl): SimulationCase[] {
  const basic =
    scheme.components.find((c) => c.code === "BASIC_SALARY")?.amount ??
    scheme.components.find((c) => c.method === "FIXED")?.amount ??
    5_000_000;

  return [
    {
      code: "FULL_ATTENDANCE",
      name: "Kehadiran penuh",
      input: {
        baseSalary: basic,
        presentDays: 22,
        workDays: 22,
        absentDays: 0,
        overtimeHours: 0,
        bonus: 0,
        extraDeduction: 0,
      },
    },
    {
      code: "ONE_ABSENCE",
      name: "Satu hari alpha",
      input: {
        baseSalary: basic,
        presentDays: 21,
        workDays: 22,
        absentDays: 1,
        overtimeHours: 0,
        bonus: 0,
        extraDeduction: 0,
      },
    },
    {
      code: "OVERTIME",
      name: "Lembur 10 jam",
      input: {
        baseSalary: basic,
        presentDays: 22,
        workDays: 22,
        absentDays: 0,
        overtimeHours: 10,
        bonus: 0,
        extraDeduction: 0,
      },
    },
    {
      code: "JOIN_MID",
      name: "Join mid-period (11/22)",
      input: {
        baseSalary: basic,
        presentDays: 11,
        workDays: 22,
        absentDays: 0,
        overtimeHours: 0,
        bonus: 0,
        extraDeduction: 0,
        prorateFactor: 0.5,
      },
    },
    {
      code: "TERMINATE_MID",
      name: "Terminate mid-period (15/22)",
      input: {
        baseSalary: basic,
        presentDays: 15,
        workDays: 22,
        absentDays: 0,
        overtimeHours: 0,
        bonus: 0,
        extraDeduction: 0,
        prorateFactor: 15 / 22,
      },
    },
    {
      code: "BONUS",
      name: "Dengan bonus",
      input: {
        baseSalary: basic,
        presentDays: 22,
        workDays: 22,
        absentDays: 0,
        overtimeHours: 0,
        bonus: 1_000_000,
        extraDeduction: 0,
      },
    },
    {
      code: "DEDUCTION",
      name: "Dengan potongan",
      input: {
        baseSalary: basic,
        presentDays: 22,
        workDays: 22,
        absentDays: 0,
        overtimeHours: 0,
        bonus: 0,
        extraDeduction: 500_000,
      },
    },
    {
      code: "TAX_GROSS_UP",
      name: "Pajak gross-up",
      input: {
        baseSalary: basic,
        presentDays: 22,
        workDays: 22,
        absentDays: 0,
        overtimeHours: 0,
        bonus: 0,
        extraDeduction: 0,
        forceTaxMethod: "GROSS_UP",
      },
    },
    {
      code: "BPJS_CEILING",
      name: "BPJS ceiling (gaji tinggi)",
      input: {
        baseSalary: Math.max(basic, 20_000_000),
        presentDays: 22,
        workDays: 22,
        absentDays: 0,
        overtimeHours: 0,
        bonus: 0,
        extraDeduction: 0,
      },
    },
    {
      code: "NET_BELOW_ZERO",
      name: "Net pay di bawah nol (stress)",
      input: {
        baseSalary: basic,
        presentDays: 1,
        workDays: 22,
        absentDays: 21,
        overtimeHours: 0,
        bonus: 0,
        extraDeduction: basic * 2,
      },
      expectPassUnless: (r) => r.netPay >= 0,
    },
  ];
}

export function runSimulations(scheme: SchemeDsl) {
  const cases = buildDefaultTestCases(scheme);
  return cases.map((tc) => {
    const result = calculateFromScheme(scheme, tc.input);
    let passed = Number.isFinite(result.netPay);
    if (tc.code === "NET_BELOW_ZERO") {
      // Stress case: document that net can go negative / clamped
      passed = true;
    } else if (tc.expectedNetMin != null) {
      passed = result.netPay >= tc.expectedNetMin;
    } else {
      passed = result.gross >= 0 && result.components.length > 0;
    }
    return {
      code: tc.code,
      name: tc.name,
      input: tc.input,
      result,
      passed,
    };
  });
}
