/**
 * CalculationService — runs metadata formula graph per employee, persists calculation.
 */

import { createHash } from "crypto";
import { prisma } from "@/lib/db";
import {
  defaultComponentGraph,
  evaluateFormulaGraph,
  extractDependencies,
  FormulaError,
  type FormulaNode,
} from "@/lib/payroll-engine/formula-engine";
import {
  hasBlockers,
  runValidationRules,
  type EmployeeCalcRow,
} from "@/lib/payroll-engine/validation-engine";
import type { EngineRunStatus } from "@prisma/client";

export type CalcEmployeeInput = {
  employeeId?: string | null;
  employeeCode?: string | null;
  employeeName: string;
  active?: boolean;
  baseSalary: number;
  overtimeHours?: number;
  bonus?: number;
  loan?: number;
  fundingModel?: "SELF_FUNDED" | "WORKING_CAPITAL";
};

async function loadFormulaNodes(companyId: string): Promise<FormulaNode[]> {
  const formulas = await prisma.payrollFormula.findMany({
    where: { companyId, status: "ACTIVE" },
    include: {
      versions: { where: { isActive: true }, take: 1 },
    },
  });
  const nodes: FormulaNode[] = [];
  for (const f of formulas) {
    const v = f.versions[0];
    if (!v) continue;
    let dependsOn: string[] = [];
    try {
      dependsOn = JSON.parse(v.dependsOnJson) as string[];
    } catch {
      dependsOn = extractDependencies(v.expression);
    }
    nodes.push({ code: f.code, expression: v.expression, dependsOn });
  }
  if (nodes.length === 0) return defaultComponentGraph();
  return nodes;
}

export async function runPayrollCalculation(input: {
  companyId: string;
  payrollPeriodId?: string | null;
  employees: CalcEmployeeInput[];
  createdById?: string | null;
  budgetAmount?: number | null;
  fundingModel?: "SELF_FUNDED" | "WORKING_CAPITAL";
  /** Increment 1.5 traceability */
  runNumber?: number;
  runReason?: string | null;
  taxConfigId?: string | null;
  bpjsConfigId?: string | null;
  formulaVersionIds?: string | null;
  configSnapshotJson?: string | null;
  parentCalculationId?: string | null;
}): Promise<{ calculationId: string; status: EngineRunStatus; issues: number; runNumber: number }> {
  const nodes = await loadFormulaNodes(input.companyId);
  const funding = input.fundingModel ?? "SELF_FUNDED";
  const runNumber = input.runNumber ?? 1;

  const calc = await prisma.payrollCalculation.create({
    data: {
      companyId: input.companyId,
      payrollPeriodId: input.payrollPeriodId ?? null,
      status: "CALCULATING",
      createdById: input.createdById ?? null,
      employeeCount: input.employees.length,
      runNumber,
      runReason: input.runReason ?? null,
      taxConfigId: input.taxConfigId ?? null,
      bpjsConfigId: input.bpjsConfigId ?? null,
      formulaVersionIds: input.formulaVersionIds ?? null,
      configSnapshotJson: input.configSnapshotJson ?? null,
      parentCalculationId: input.parentCalculationId ?? null,
      revision: runNumber,
    },
  });

  try {
    const rows: EmployeeCalcRow[] = [];
    const itemCreates: {
      calculationId: string;
      employeeId: string | null;
      employeeCode: string | null;
      employeeName: string;
      componentCode: string;
      componentName: string;
      formulaSource: string | null;
      calculatedValue: number;
      finalValue: number;
    }[] = [];

    let grossTotal = 0;
    let netTotal = 0;
    let employerCost = 0;

    for (const emp of input.employees) {
      const base: Record<string, number> = {
        BaseSalary: emp.baseSalary,
        OvertimeHours: emp.overtimeHours ?? 0,
        BonusInput: emp.bonus ?? 0,
        LoanInput: emp.loan ?? 0,
      };
      const values = evaluateFormulaGraph(nodes, base);
      rows.push({
        employeeId: emp.employeeId,
        employeeCode: emp.employeeCode,
        employeeName: emp.employeeName,
        active: emp.active ?? true,
        values,
      });

      for (const [code, val] of Object.entries(values)) {
        const node = nodes.find((n) => n.code === code);
        itemCreates.push({
          calculationId: calc.id,
          employeeId: emp.employeeId ?? null,
          employeeCode: emp.employeeCode ?? null,
          employeeName: emp.employeeName,
          componentCode: code,
          componentName: code,
          formulaSource: node?.expression ?? null,
          calculatedValue: val,
          finalValue: val,
        });
      }

      grossTotal += values.Gross ?? 0;
      netTotal += values.NetSalary ?? 0;
      employerCost += values.EmployerCost ?? values.Gross ?? 0;
    }

    // chunk createMany
    const chunk = 500;
    for (let i = 0; i < itemCreates.length; i += chunk) {
      await prisma.payrollCalculationItem.createMany({
        data: itemCreates.slice(i, i + chunk),
      });
    }

    await prisma.payrollCalculation.update({
      where: { id: calc.id },
      data: { status: "VALIDATING" },
    });

    const issues = runValidationRules({
      employees: rows,
      budgetAmount: input.budgetAmount,
      totalNet: netTotal,
      minSalary: 0,
      approvalReady: true,
    });

    if (issues.length) {
      const { suggestedActionFor } = await import(
        "@/lib/payroll-engine/validation-center"
      );
      await prisma.payrollValidation.createMany({
        data: issues.map((iss) => ({
          calculationId: calc.id,
          code: iss.code,
          severity: iss.severity,
          message: iss.message,
          employeeId: iss.employeeId ?? null,
          employeeName: iss.employeeName ?? null,
          suggestedAction: suggestedActionFor(iss.code, iss.message),
          resolutionStatus: "OPEN",
        })),
      });
    }

    if (hasBlockers(issues)) {
      await prisma.payrollCalculation.update({
        where: { id: calc.id },
        data: {
          status: "FAILED",
          errorMessage: "Validation blockers present",
          grossTotal,
          netTotal,
          employerCost,
          calculatedAt: new Date(),
        },
      });
      return {
        calculationId: calc.id,
        status: "FAILED",
        issues: issues.length,
        runNumber,
      };
    }

    const wcReq =
      funding === "WORKING_CAPITAL" ? netTotal : 0;
    const expectedClient = funding === "SELF_FUNDED" ? netTotal : 0;

    const payload = {
      employees: rows,
      totals: { grossTotal, netTotal, employerCost, wcReq, expectedClient },
      funding,
    };
    const payloadJson = JSON.stringify(payload);
    const checksum = createHash("sha256").update(payloadJson).digest("hex");

    await prisma.payrollSnapshot.create({
      data: {
        calculationId: calc.id,
        revision: runNumber,
        payloadJson,
        checksum,
      },
    });

    await prisma.payrollJournal.create({
      data: {
        calculationId: calc.id,
        companyId: input.companyId,
        grossPayroll: grossTotal,
        netPayroll: netTotal,
        allowanceTotal: rows.reduce(
          (s, r) =>
            s +
            (r.values.TransportAllowance ?? 0) +
            (r.values.MealAllowance ?? 0),
          0,
        ),
        deductionTotal: rows.reduce(
          (s, r) => s + (r.values.Loan ?? 0) + (r.values.BPJSEmployee ?? 0),
          0,
        ),
        employerCost,
        employeeCost: netTotal,
        bpjsEmployer: rows.reduce((s, r) => s + (r.values.BPJSEmployer ?? 0), 0),
        bpjsEmployee: rows.reduce((s, r) => s + (r.values.BPJSEmployee ?? 0), 0),
        taxTotal: rows.reduce((s, r) => s + (r.values.PPH21 ?? 0), 0),
        workingCapitalRequirement: wcReq,
      },
    });

    // Seed configurable approval chain
    const approval = await prisma.payrollApproval.create({
      data: {
        calculationId: calc.id,
        companyId: input.companyId,
        name: "Default payroll approval",
        status: "PENDING",
        steps: {
          create: [
            { level: 1, roleLabel: "Payroll Officer", status: "PENDING" },
            { level: 2, roleLabel: "Payroll Manager", status: "PENDING" },
            { level: 3, roleLabel: "Finance Manager", status: "PENDING" },
            { level: 4, roleLabel: "Director", status: "PENDING" },
          ],
        },
      },
    });

    await prisma.payrollCalculation.update({
      where: { id: calc.id },
      data: {
        status: "READY_FOR_APPROVAL",
        grossTotal,
        netTotal,
        employerCost,
        fundingRequirement: netTotal,
        workingCapitalRequirement: wcReq,
        expectedClientFunding: expectedClient,
        calculatedAt: new Date(),
      },
    });

    void approval;

    // Immutable revision snapshot for this run (never overwrite prior runs)
    await prisma.payrollRevision.create({
      data: {
        calculationId: calc.id,
        revisionNumber: runNumber,
        reason: input.runReason ?? `Run ${runNumber}`,
        baseRevision: runNumber > 1 ? runNumber - 1 : null,
        snapshotJson: payloadJson,
        createdById: input.createdById ?? null,
      },
    });

    return {
      calculationId: calc.id,
      status: "READY_FOR_APPROVAL",
      issues: issues.length,
      runNumber,
    };
  } catch (e) {
    const msg = e instanceof FormulaError || e instanceof Error ? e.message : "Calculation failed";
    await prisma.payrollCalculation.update({
      where: { id: calc.id },
      data: { status: "FAILED", errorMessage: msg },
    });
    if (e instanceof FormulaError) {
      await prisma.payrollValidation.create({
        data: {
          calculationId: calc.id,
          code: "FORMULA_ERROR",
          severity: "BLOCKER",
          message: msg,
          suggestedAction: "Fix formula expression in Formula Management",
          resolutionStatus: "OPEN",
        },
      });
    }
    throw e;
  }
}
