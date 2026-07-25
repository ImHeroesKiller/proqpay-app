import { describe, expect, it } from "vitest";
import {
  calcBpjs,
  calcPph21,
  calculatePayrollLine,
  DEFAULT_BPJS,
} from "@/lib/payroll/engine";
import { evaluateExpression } from "@/lib/payroll/expression";
import { calculateFromScheme } from "@/lib/payroll/scheme-engine";
import { parseSchemeDsl } from "@/lib/scheme/dsl";
import { runSimulations } from "@/lib/scheme/simulate";
import { validateRows } from "@/lib/import/validate";
import { IMPORT_TEMPLATES } from "@/lib/import/templates";

describe("payroll engine", () => {
  it("calculates BPJS with kesehatan ceiling", () => {
    const high = calcBpjs(20_000_000, DEFAULT_BPJS);
    const mid = calcBpjs(10_000_000, DEFAULT_BPJS);
    expect(high.employee).toBeGreaterThan(mid.employee);
    expect(high.employer).toBeGreaterThan(0);
  });

  it("calculates PPh21 TER style", () => {
    const tax = calcPph21(10_000_000, { hasNpwp: true, terRate: 0.05 });
    expect(tax).toBe(500_000);
    const noNpwp = calcPph21(10_000_000, { hasNpwp: false, terRate: 0.05 });
    expect(noNpwp).toBeGreaterThan(tax);
  });

  it("produces line breakdown with net pay", () => {
    const line = calculatePayrollLine({
      baseSalary: 5_000_000,
      presentDays: 22,
      workDaysInPeriod: 22,
      hasNpwp: true,
    });
    expect(line.gross).toBeGreaterThan(0);
    expect(line.netPay).toBeLessThan(line.gross);
    expect(line.bpjs).toBeGreaterThan(0);
  });
});

describe("expression engine", () => {
  it("evaluates whitelist formulas only", () => {
    expect(
      evaluateExpression("BASIC_SALARY * 0.1 + PRESENT_DAYS * 25000", {
        BASIC_SALARY: 5_000_000,
        PRESENT_DAYS: 20,
      }),
    ).toBe(500_000 + 500_000);
  });

  it("rejects disallowed variables", () => {
    expect(() =>
      evaluateExpression("process.exit()", { BASIC_SALARY: 1 }),
    ).toThrow();
  });
});

describe("scheme DSL + simulation", () => {
  const sample = {
    schemeName: "SPG Monthly Jakarta",
    currency: "IDR" as const,
    workerType: "MONTHLY" as const,
    components: [
      {
        code: "BASIC_SALARY",
        name: "Gaji Pokok",
        kind: "EARNING" as const,
        method: "FIXED" as const,
        amount: 5_000_000,
        taxable: true,
        bpjsApplicable: true,
        proratable: true,
      },
      {
        code: "MEAL_ALLOWANCE",
        name: "Uang Makan",
        kind: "EARNING" as const,
        method: "QUANTITY_RATE" as const,
        quantitySource: "PRESENT_DAYS" as const,
        rate: 25_000,
        taxable: true,
        bpjsApplicable: false,
        proratable: false,
      },
    ],
    taxPolicy: { method: "GROSS_UP" as const },
    bpjsPolicy: { enabled: true, method: "STANDARD" as const },
  };

  it("parses valid DSL", () => {
    const parsed = parseSchemeDsl(sample);
    expect(parsed.ok).toBe(true);
  });

  it("simulates SPG scheme", () => {
    const parsed = parseSchemeDsl(sample);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const result = calculateFromScheme(parsed.data, {
      baseSalary: 5_000_000,
      presentDays: 22,
      workDays: 22,
      absentDays: 0,
      overtimeHours: 0,
      bonus: 0,
      extraDeduction: 0,
    });
    expect(result.gross).toBeGreaterThan(5_000_000);
    expect(result.components.length).toBeGreaterThan(1);
    const sims = runSimulations(parsed.data);
    expect(sims.length).toBe(10);
    expect(sims.every((s) => typeof s.passed === "boolean")).toBe(true);
  });
});

describe("import validation", () => {
  it("flags missing required and negative salary", () => {
    const tpl = IMPORT_TEMPLATES.find((t) => t.code === "EMPLOYEE_MASTER")!;
    const rows = validateRows(tpl, [
      {
        rowNumber: 2,
        data: {
          employee_code: "E1",
          name: "A",
          email: "bad",
          department: "Ops",
          position: "SPG",
          join_date: "2026-01-01",
          base_salary: "-100",
          bank_name: "BCA",
          bank_account: "123",
          tax_status: "TK/0",
        },
      },
    ]);
    expect(rows[0].status).toBe("ERROR");
    expect(rows[0].errors.some((e) => e.includes("negatif") || e.includes("email"))).toBe(
      true,
    );
  });
});
