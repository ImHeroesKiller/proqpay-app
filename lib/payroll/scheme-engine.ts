import {
  evaluateExpression,
  roundMoney,
} from "@/lib/payroll/expression";
import { calcBpjs, calcPph21, DEFAULT_BPJS, DEFAULT_TAX } from "@/lib/payroll/engine";
import type { SchemeComponent, SchemeDsl } from "@/lib/scheme/dsl";

export type SchemeCalcInput = {
  baseSalary: number;
  presentDays: number;
  workDays: number;
  absentDays: number;
  overtimeHours: number;
  bonus: number;
  extraDeduction: number;
  prorateFactor?: number;
  hasNpwp?: boolean;
  forceTaxMethod?: "GROSS" | "NET" | "GROSS_UP";
};

export type ComponentLine = {
  code: string;
  name: string;
  kind: string;
  amount: number;
  formula?: string;
};

export type SchemeCalcResult = {
  components: ComponentLine[];
  gross: number;
  deductions: number;
  bpjsEmployee: number;
  bpjsEmployer: number;
  pph21: number;
  netPay: number;
  taxMethod: string;
};

function qtyFor(
  source: SchemeComponent["quantitySource"],
  input: SchemeCalcInput,
): number {
  switch (source) {
    case "PRESENT_DAYS":
      return input.presentDays;
    case "WORK_DAYS":
      return input.workDays;
    case "OVERTIME_HOURS":
      return input.overtimeHours;
    case "ABSENT_DAYS":
      return input.absentDays;
    case "FIXED":
    default:
      return 1;
  }
}

function componentAmount(
  c: SchemeComponent,
  input: SchemeCalcInput,
  runningGross: number,
): number {
  const factor = input.prorateFactor ?? 1;
  switch (c.method) {
    case "FIXED": {
      const base = c.amount ?? 0;
      return roundMoney(c.proratable ? base * factor : base);
    }
    case "QUANTITY_RATE": {
      const q = qtyFor(c.quantitySource, input);
      return roundMoney(q * (c.rate ?? 0));
    }
    case "PERCENT_OF_BASIC":
      return roundMoney(input.baseSalary * ((c.percent ?? 0) / 100) * factor);
    case "PERCENT_OF_GROSS":
      return roundMoney(runningGross * ((c.percent ?? 0) / 100));
    case "ATTENDANCE_BASED": {
      const q = input.presentDays;
      return roundMoney(q * (c.rate ?? c.amount ?? 0));
    }
    case "FORMULA": {
      if (!c.formula) return 0;
      const hourly = input.baseSalary / 173;
      const ctx = {
        BASIC_SALARY: input.baseSalary,
        PRESENT_DAYS: input.presentDays,
        WORK_DAYS: input.workDays,
        ABSENT_DAYS: input.absentDays,
        OVERTIME_HOURS: input.overtimeHours,
        HOURLY_RATE: hourly,
        GROSS: runningGross,
        ALLOWANCES: 0,
        BONUS: input.bonus,
        DEDUCTION: input.extraDeduction,
        RATE: c.rate ?? 0,
        QUANTITY: qtyFor(c.quantitySource, input),
        AMOUNT: c.amount ?? 0,
      };
      try {
        return roundMoney(evaluateExpression(c.formula, ctx));
      } catch {
        return 0;
      }
    }
    default:
      return 0;
  }
}

export function calculateFromScheme(
  scheme: SchemeDsl,
  input: SchemeCalcInput,
): SchemeCalcResult {
  const components: ComponentLine[] = [];
  let gross = 0;
  let deductions = 0;

  // Ensure basic exists as context even if only in input
  const ordered = [...scheme.components];

  for (const c of ordered) {
    const amount = componentAmount(c, input, gross);
    if (c.kind === "EARNING") {
      gross = roundMoney(gross + amount);
      components.push({
        code: c.code,
        name: c.name,
        kind: c.kind,
        amount,
        formula: c.formula,
      });
    } else if (c.kind === "DEDUCTION") {
      deductions = roundMoney(deductions + amount);
      components.push({
        code: c.code,
        name: c.name,
        kind: c.kind,
        amount,
        formula: c.formula,
      });
    } else {
      components.push({
        code: c.code,
        name: c.name,
        kind: c.kind,
        amount,
        formula: c.formula,
      });
    }
  }

  if (input.bonus > 0) {
    gross = roundMoney(gross + input.bonus);
    components.push({
      code: "BONUS",
      name: "Bonus",
      kind: "EARNING",
      amount: input.bonus,
    });
  }
  if (input.extraDeduction > 0) {
    deductions = roundMoney(deductions + input.extraDeduction);
    components.push({
      code: "EXTRA_DED",
      name: "Potongan tambahan",
      kind: "DEDUCTION",
      amount: input.extraDeduction,
    });
  }

  // If scheme has no BASIC, inject from input
  if (!components.some((c) => c.code === "BASIC_SALARY") && input.baseSalary > 0) {
    const factor = input.prorateFactor ?? input.presentDays / Math.max(1, input.workDays);
    const basicAmt = roundMoney(input.baseSalary * factor);
    gross = roundMoney(gross + basicAmt);
    components.unshift({
      code: "BASIC_SALARY",
      name: "Gaji Pokok",
      kind: "EARNING",
      amount: basicAmt,
    });
  }

  const bpjsBase = input.baseSalary;
  let bpjsEmployee = 0;
  let bpjsEmployer = 0;
  if (scheme.bpjsPolicy?.enabled !== false && scheme.bpjsPolicy?.method !== "NONE") {
    const b = calcBpjs(bpjsBase, DEFAULT_BPJS);
    bpjsEmployee = b.employee;
    bpjsEmployer = b.employer;
  }

  const taxMethod =
    input.forceTaxMethod ?? scheme.taxPolicy?.method ?? "GROSS";
  let pph21 = 0;
  const taxableBase = Math.max(0, gross - bpjsEmployee);

  if (taxMethod === "GROSS") {
    pph21 = calcPph21(taxableBase, {
      hasNpwp: input.hasNpwp !== false,
      terRate: DEFAULT_TAX.defaultTerRate,
    });
  } else if (taxMethod === "GROSS_UP") {
    // Iterative gross-up approximation
    let tax = calcPph21(taxableBase, {
      hasNpwp: input.hasNpwp !== false,
      terRate: DEFAULT_TAX.defaultTerRate,
    });
    for (let i = 0; i < 5; i++) {
      tax = calcPph21(taxableBase + tax, {
        hasNpwp: input.hasNpwp !== false,
        terRate: DEFAULT_TAX.defaultTerRate,
      });
    }
    pph21 = tax;
    gross = roundMoney(gross + pph21);
    components.push({
      code: "TAX_GROSS_UP",
      name: "Gross-up PPh21",
      kind: "EARNING",
      amount: pph21,
    });
  } else {
    // NET — employer bears tax (shown as employer cost, not employee net impact)
    pph21 = calcPph21(taxableBase, {
      hasNpwp: input.hasNpwp !== false,
      terRate: DEFAULT_TAX.defaultTerRate,
    });
  }

  if (bpjsEmployee > 0) {
    components.push({
      code: "BPJS_EMPLOYEE",
      name: "BPJS Karyawan",
      kind: "DEDUCTION",
      amount: bpjsEmployee,
    });
  }
  if (pph21 > 0 && taxMethod !== "NET") {
    components.push({
      code: "PPH21",
      name: "PPh21",
      kind: "DEDUCTION",
      amount: pph21,
    });
  }

  const employeeTax = taxMethod === "NET" ? 0 : pph21;
  const netPay = roundMoney(
    gross - deductions - bpjsEmployee - employeeTax,
  );

  return {
    components,
    gross,
    deductions,
    bpjsEmployee,
    bpjsEmployer,
    pph21,
    netPay,
    taxMethod,
  };
}
