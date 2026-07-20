/**
 * Indonesian payroll calculation engine (enterprise V1).
 * Extends existing PayrollLine fields — does not replace the data model.
 *
 * BPJS / PPh21 rates are simplified operational defaults (configurable via BpjsConfig / TaxConfig).
 * Not a substitute for official DJP/BPJS filing systems.
 */

export type CalcEmployeeInput = {
  baseSalary: number;
  taxStatus?: string | null; // e.g. TK/0, K/1
  hasNpwp?: boolean;
  overtimeHours?: number;
  presentDays?: number;
  workDaysInPeriod?: number;
};

export type BpjsRates = {
  kesehatanEmployee: number;
  kesehatanEmployer: number;
  jhtEmployee: number;
  jhtEmployer: number;
  jkkEmployer: number;
  jkmEmployer: number;
  jpEmployee: number;
  jpEmployer: number;
  maxWageKesehatan: number;
  maxWageJp: number;
};

export type TaxRates = {
  defaultTerRate: number;
  nonNpwpSurcharge: number;
};

export type LineCalcResult = {
  baseSalary: number;
  allowances: number;
  overtime: number;
  bonuses: number;
  deductions: number;
  tax: number;
  bpjs: number;
  bpjsEmployer: number;
  pph21: number;
  netPay: number;
  gross: number;
};

export const DEFAULT_BPJS: BpjsRates = {
  kesehatanEmployee: 0.01,
  kesehatanEmployer: 0.04,
  jhtEmployee: 0.02,
  jhtEmployer: 0.037,
  jkkEmployer: 0.0024,
  jkmEmployer: 0.003,
  jpEmployee: 0.01,
  jpEmployer: 0.02,
  maxWageKesehatan: 12_000_000,
  maxWageJp: 10_547_400,
};

export const DEFAULT_TAX: TaxRates = {
  defaultTerRate: 0.05,
  nonNpwpSurcharge: 0.2,
};

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

export function calcBpjs(
  base: number,
  rates: BpjsRates = DEFAULT_BPJS,
): { employee: number; employer: number } {
  const wageKes = Math.min(base, rates.maxWageKesehatan);
  const wageJp = Math.min(base, rates.maxWageJp);
  const employee =
    wageKes * rates.kesehatanEmployee +
    base * rates.jhtEmployee +
    wageJp * rates.jpEmployee;
  const employer =
    wageKes * rates.kesehatanEmployer +
    base * rates.jhtEmployer +
    base * rates.jkkEmployer +
    base * rates.jkmEmployer +
    wageJp * rates.jpEmployer;
  return { employee: roundMoney(employee), employer: roundMoney(employer) };
}

/** Simplified monthly TER-style withholding for demo/ops V1. */
export function calcPph21(
  taxableMonthly: number,
  opts: { hasNpwp?: boolean; terRate?: number; surcharge?: number } = {},
): number {
  const rate = opts.terRate ?? DEFAULT_TAX.defaultTerRate;
  const surcharge = opts.hasNpwp === false ? (opts.surcharge ?? DEFAULT_TAX.nonNpwpSurcharge) : 0;
  const effective = rate * (1 + surcharge);
  return roundMoney(Math.max(0, taxableMonthly) * effective);
}

export function calculatePayrollLine(
  input: CalcEmployeeInput,
  bpjsRates: BpjsRates = DEFAULT_BPJS,
  taxRates: TaxRates = DEFAULT_TAX,
): LineCalcResult {
  const workDays = input.workDaysInPeriod ?? 22;
  const present = input.presentDays ?? workDays;
  const attendanceFactor = workDays > 0 ? Math.min(1, present / workDays) : 1;

  const baseSalary = roundMoney(input.baseSalary * attendanceFactor);
  const allowances = roundMoney(input.baseSalary * 0.15 * attendanceFactor);
  const otHours = input.overtimeHours ?? 0;
  const hourly = input.baseSalary / 173;
  const overtime = roundMoney(otHours * hourly * 1.5);
  const bonuses = 0;
  const deductions = 150_000;

  const gross = roundMoney(baseSalary + allowances + overtime + bonuses);
  const bpjs = calcBpjs(input.baseSalary, bpjsRates);
  const taxable = Math.max(0, gross - bpjs.employee);
  const pph21 = calcPph21(taxable, {
    hasNpwp: input.hasNpwp !== false,
    terRate: taxRates.defaultTerRate,
    surcharge: taxRates.nonNpwpSurcharge,
  });

  const netPay = roundMoney(
    gross - deductions - pph21 - bpjs.employee,
  );

  return {
    baseSalary,
    allowances,
    overtime,
    bonuses,
    deductions,
    tax: pph21,
    bpjs: bpjs.employee,
    bpjsEmployer: bpjs.employer,
    pph21,
    netPay,
    gross,
  };
}
