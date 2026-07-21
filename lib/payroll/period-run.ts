/**
 * Period-scoped payroll run: statutory gate → attendance inputs → engine calc.
 * Each run creates a new PayrollCalculation (versioned, never overwritten).
 */

import { prisma } from "@/lib/db";
import type { SessionScope } from "@/lib/auth/scope";
import { assertCompanyAccess } from "@/lib/auth/scope";
import {
  runPayrollCalculation,
  type CalcEmployeeInput,
} from "@/lib/payroll-engine/calculation-service";
import { materializePayrollLines } from "@/lib/payroll/population";
import { projectCalculationToPayrollLines } from "@/lib/payroll-engine/project-to-lines";
import { buildStatutoryGraph } from "@/lib/payroll-engine/statutory-graph";
import { listActiveFormulaVersions } from "@/lib/payroll-engine/formula-service";

export async function requireStatutoryConfigs(companyId: string) {
  const [tax, bpjs] = await Promise.all([
    prisma.taxConfig.findFirst({
      where: { companyId, isActive: true },
      orderBy: [{ version: "desc" }, { effectiveFrom: "desc" }],
    }),
    prisma.bpjsConfig.findFirst({
      where: { companyId, isActive: true },
      orderBy: [{ version: "desc" }, { effectiveFrom: "desc" }],
    }),
  ]);
  if (!tax) {
    throw new Error(
      "Active TaxConfig required — configure tax rates in Payroll Engine → Tax before running payroll",
    );
  }
  if (!bpjs) {
    throw new Error(
      "Active BpjsConfig required — configure BPJS in Payroll Engine → BPJS before running payroll",
    );
  }
  return { tax, bpjs };
}

export async function countOpenAttendanceExceptions(
  companyId: string,
  payrollPeriodId?: string | null,
) {
  return prisma.attendanceImportException.count({
    where: {
      status: "OPEN",
      severity: "ERROR",
      batch: {
        companyId,
        ...(payrollPeriodId ? { payrollPeriodId } : {}),
      },
    },
  });
}

export async function attendanceOtByEmployee(
  companyId: string,
  periodStart: Date,
  periodEnd: Date,
  employeeIds: string[],
) {
  if (!employeeIds.length) return new Map<string, number>();
  const rows = await prisma.attendanceRecord.groupBy({
    by: ["employeeId"],
    where: {
      companyId,
      employeeId: { in: employeeIds },
      workDate: { gte: periodStart, lte: periodEnd },
    },
    _sum: { overtimeHours: true },
  });
  const map = new Map<string, number>();
  for (const r of rows) {
    map.set(r.employeeId, Number(r._sum.overtimeHours ?? 0));
  }
  return map;
}

export async function runPeriodPayrollCalculation(
  scope: SessionScope,
  periodId: string,
  opts?: {
    projectImmediately?: boolean;
    skipExceptionGate?: boolean;
    runReason?: string;
  },
) {
  const period = await prisma.payrollPeriod.findUnique({
    where: { id: periodId },
  });
  if (!period) throw new Error("Payroll period not found");
  if (!assertCompanyAccess(scope, period.companyId)) {
    throw new Error("Cross-company access denied");
  }
  if (["LOCKED", "CLOSED", "DISBURSED", "VERIFIED"].includes(period.status)) {
    throw new Error("Cannot calculate locked/closed period");
  }

  const { tax, bpjs } = await requireStatutoryConfigs(period.companyId);

  if (!opts?.skipExceptionGate) {
    const open = await countOpenAttendanceExceptions(
      period.companyId,
      periodId,
    );
    if (open > 0) {
      throw new Error(
        `${open} open attendance exception(s) — resolve exception queue before calculation`,
      );
    }
  }

  const lineCount = await prisma.payrollLine.count({
    where: { payrollPeriodId: periodId },
  });
  if (lineCount === 0) {
    await materializePayrollLines(scope, periodId);
  }

  const lines = await prisma.payrollLine.findMany({
    where: { payrollPeriodId: periodId },
    include: { employee: true },
  });
  if (!lines.length) throw new Error("No payroll lines / population empty");

  const otMap = await attendanceOtByEmployee(
    period.companyId,
    period.periodStart,
    period.periodEnd,
    lines.map((l) => l.employeeId),
  );

  const employees: CalcEmployeeInput[] = lines.map((l) => ({
    employeeId: l.employeeId,
    employeeCode: l.employee.employeeCode,
    employeeName: l.employeeName,
    active: ["ACTIVE", "PROBATION"].includes(l.employee.status),
    baseSalary: Number(l.employee.baseSalary),
    overtimeHours: otMap.get(l.employeeId) ?? 0,
    bonus: 0,
    loan: 0,
    fundingModel: period.fundingModel as "SELF_FUNDED" | "WORKING_CAPITAL",
  }));

  await ensureCompanyDefaultFormulas(period.companyId);

  const prev = await prisma.payrollCalculation.findFirst({
    where: { payrollPeriodId: periodId },
    orderBy: { runNumber: "desc" },
  });
  const runNumber = (prev?.runNumber ?? 0) + 1;
  const formulaVers = await listActiveFormulaVersions(period.companyId);

  const configSnapshot = {
    tax: {
      id: tax.id,
      version: tax.version,
      name: tax.name,
      method: tax.method,
      defaultTerRate: Number(tax.defaultTerRate),
      nonNpwpSurcharge: Number(tax.nonNpwpSurcharge),
      ptkpJson: tax.ptkpJson,
    },
    bpjs: {
      id: bpjs.id,
      version: bpjs.version,
      name: bpjs.name,
      kesehatanEmployee: Number(bpjs.kesehatanEmployee),
      kesehatanEmployer: Number(bpjs.kesehatanEmployer),
      jhtEmployee: Number(bpjs.jhtEmployee),
      jhtEmployer: Number(bpjs.jhtEmployer),
      jkkEmployer: Number(bpjs.jkkEmployer),
      jkmEmployer: Number(bpjs.jkmEmployer),
      jpEmployee: Number(bpjs.jpEmployee),
      jpEmployer: Number(bpjs.jpEmployer),
      maxWageKesehatan: Number(bpjs.maxWageKesehatan),
      maxWageJp: Number(bpjs.maxWageJp),
    },
    formulas: formulaVers,
    runNumber,
    runAt: new Date().toISOString(),
    runBy: scope.userId,
  };

  const result = await runPayrollCalculation({
    companyId: period.companyId,
    payrollPeriodId: periodId,
    employees,
    createdById: scope.userId,
    fundingModel: period.fundingModel as "SELF_FUNDED" | "WORKING_CAPITAL",
    runNumber,
    runReason: opts?.runReason ?? `Payroll run #${runNumber}`,
    taxConfigId: tax.id,
    bpjsConfigId: bpjs.id,
    formulaVersionIds: JSON.stringify(
      formulaVers.map((f) => f.versionId).filter(Boolean),
    ),
    configSnapshotJson: JSON.stringify(configSnapshot),
    parentCalculationId: prev?.id ?? null,
  });

  await prisma.payrollPeriod.update({
    where: { id: periodId },
    data: {
      latestCalculationId: result.calculationId,
      version: { increment: 1 },
    },
  });

  let projection = null;
  if (opts?.projectImmediately && result.status !== "FAILED") {
    projection = await projectCalculationToPayrollLines(
      scope,
      periodId,
      result.calculationId,
      { requireApprovedPeriod: false },
    );
  }

  return { ...result, projection, configSnapshot };
}

async function ensureCompanyDefaultFormulas(companyId: string) {
  const { tax, bpjs } = await requireStatutoryConfigs(companyId);
  const count = await prisma.payrollFormula.count({
    where: { companyId, status: "ACTIVE" },
  });
  if (count > 0) return;

  const nodes = buildStatutoryGraph({
    kesehatanEmployee: Number(bpjs.kesehatanEmployee),
    jhtEmployee: Number(bpjs.jhtEmployee),
    jpEmployee: Number(bpjs.jpEmployee),
    kesehatanEmployer: Number(bpjs.kesehatanEmployer),
    jhtEmployer: Number(bpjs.jhtEmployer),
    jkkEmployer: Number(bpjs.jkkEmployer),
    jkmEmployer: Number(bpjs.jkmEmployer),
    jpEmployer: Number(bpjs.jpEmployer),
    terRate: Number(tax.defaultTerRate),
  });

  for (const n of nodes) {
    const formula = await prisma.payrollFormula.create({
      data: {
        companyId,
        code: n.code,
        name: n.code,
        status: "ACTIVE",
      },
    });
    await prisma.payrollFormulaVersion.create({
      data: {
        formulaId: formula.id,
        version: 1,
        expression: n.expression,
        dependsOnJson: JSON.stringify(n.dependsOn),
        isActive: true,
        lifecycle: "ACTIVE",
        changeNote: "Auto-seeded from active Tax/BPJS config (Increment 1.5)",
        effectiveFrom: new Date(),
      },
    });
  }
}
