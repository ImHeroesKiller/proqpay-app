/**
 * SimulationService — what-if scenarios without mutating payroll periods.
 */

import { prisma } from "@/lib/db";
import {
  defaultComponentGraph,
  evaluateFormulaGraph,
} from "@/lib/payroll-engine/formula-engine";

export type SimulationScenario = {
  umkAdjustmentPct?: number;
  allowanceFactor?: number;
  bpjsFactor?: number;
  thrBonus?: number;
  headcountDelta?: number;
  baseEmployees: {
    name: string;
    baseSalary: number;
    overtimeHours?: number;
  }[];
  fundingModel?: "SELF_FUNDED" | "WORKING_CAPITAL";
};

export async function runPayrollSimulation(input: {
  companyId: string;
  name: string;
  scenario: SimulationScenario;
  createdById?: string | null;
}) {
  const nodes = defaultComponentGraph();
  const factor = 1 + (input.scenario.umkAdjustmentPct ?? 0) / 100;
  const allowFactor = input.scenario.allowanceFactor ?? 1;
  const bpjsFactor = input.scenario.bpjsFactor ?? 1;
  const thr = input.scenario.thrBonus ?? 0;

  let employees = [...input.scenario.baseEmployees];
  const delta = input.scenario.headcountDelta ?? 0;
  if (delta > 0) {
    for (let i = 0; i < delta; i++) {
      employees.push({
        name: `Simulated hire ${i + 1}`,
        baseSalary: 5_000_000,
      });
    }
  } else if (delta < 0) {
    employees = employees.slice(0, Math.max(0, employees.length + delta));
  }

  let grossTotal = 0;
  let netTotal = 0;
  let employerCost = 0;
  const details = [];

  for (const emp of employees) {
    const baseSalary = emp.baseSalary * factor;
    const values = evaluateFormulaGraph(nodes, {
      BaseSalary: baseSalary,
      OvertimeHours: emp.overtimeHours ?? 0,
      BonusInput: thr,
      LoanInput: 0,
    });
    // apply allowance / bpjs factors post-eval for scenario knobs
    values.TransportAllowance = (values.TransportAllowance ?? 0) * allowFactor;
    values.MealAllowance = (values.MealAllowance ?? 0) * allowFactor;
    values.BPJSEmployee = (values.BPJSEmployee ?? 0) * bpjsFactor;
    values.BPJSEmployer = (values.BPJSEmployer ?? 0) * bpjsFactor;
    values.Gross =
      (values.BasicSalary ?? 0) +
      (values.TransportAllowance ?? 0) +
      (values.MealAllowance ?? 0) +
      (values.Overtime ?? 0) +
      (values.Bonus ?? 0);
    values.NetSalary =
      values.Gross -
      (values.Loan ?? 0) -
      (values.BPJSEmployee ?? 0) -
      (values.PPH21 ?? 0);
    values.EmployerCost = values.Gross + (values.BPJSEmployer ?? 0);

    grossTotal += values.Gross;
    netTotal += values.NetSalary;
    employerCost += values.EmployerCost;
    details.push({ name: emp.name, values });
  }

  const funding = input.scenario.fundingModel ?? "SELF_FUNDED";
  const wcReq = funding === "WORKING_CAPITAL" ? netTotal : 0;
  const baselineNet = input.scenario.baseEmployees.reduce((s, e) => {
    const v = evaluateFormulaGraph(nodes, {
      BaseSalary: e.baseSalary,
      OvertimeHours: e.overtimeHours ?? 0,
      BonusInput: 0,
      LoanInput: 0,
    });
    return s + (v.NetSalary ?? 0);
  }, 0);
  const marginImpact = netTotal - baselineNet;

  const result = {
    details,
    totals: { grossTotal, netTotal, employerCost, wcReq, marginImpact },
  };

  const sim = await prisma.payrollSimulation.create({
    data: {
      companyId: input.companyId,
      name: input.name,
      scenarioJson: JSON.stringify(input.scenario),
      resultJson: JSON.stringify(result),
      grossTotal,
      netTotal,
      employerCost,
      workingCapitalRequirement: wcReq,
      marginImpact,
      createdById: input.createdById ?? null,
    },
  });

  return sim;
}
