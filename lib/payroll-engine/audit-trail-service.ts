/**
 * Per-employee payroll audit trail (Increment 1.5).
 * Traces Attendance → Formula/Tax/BPJS → Calc → Projection → PayrollLine.
 */

import { prisma } from "@/lib/db";

function num(v: { toString(): string } | number | null | undefined): number {
  if (v == null) return 0;
  return typeof v === "number" ? v : Number(v.toString());
}

export async function getEmployeePayrollAudit(input: {
  payrollPeriodId: string;
  employeeId: string;
  calculationId?: string;
}) {
  const period = await prisma.payrollPeriod.findUnique({
    where: { id: input.payrollPeriodId },
  });
  if (!period) throw new Error("Period not found");

  const employee = await prisma.employee.findUnique({
    where: { id: input.employeeId },
  });
  if (!employee) throw new Error("Employee not found");

  const calcId =
    input.calculationId ??
    period.projectedCalculationId ??
    period.latestCalculationId ??
    undefined;

  const calculation = calcId
    ? await prisma.payrollCalculation.findUnique({
        where: { id: calcId },
        include: {
          items: { where: { employeeId: input.employeeId } },
          journal: true,
          snapshot: true,
        },
      })
    : null;

  const attendance = await prisma.attendanceRecord.findMany({
    where: {
      employeeId: input.employeeId,
      companyId: period.companyId,
      workDate: { gte: period.periodStart, lte: period.periodEnd },
    },
    orderBy: { workDate: "asc" },
  });

  const line = await prisma.payrollLine.findFirst({
    where: {
      payrollPeriodId: input.payrollPeriodId,
      employeeId: input.employeeId,
    },
  });

  let tax = null;
  let bpjs = null;
  let formulas: {
    code: string;
    expression: string | null;
    version: number | null;
  }[] = [];

  if (calculation?.configSnapshotJson) {
    try {
      const snap = JSON.parse(calculation.configSnapshotJson) as {
        tax?: unknown;
        bpjs?: unknown;
        formulas?: { code: string; expression?: string; version?: number }[];
      };
      tax = snap.tax ?? null;
      bpjs = snap.bpjs ?? null;
      formulas = (snap.formulas ?? []).map((f) => ({
        code: f.code,
        expression: f.expression ?? null,
        version: f.version ?? null,
      }));
    } catch {
      /* ignore */
    }
  }

  if (!tax && calculation?.taxConfigId) {
    tax = await prisma.taxConfig.findUnique({
      where: { id: calculation.taxConfigId },
    });
  }
  if (!bpjs && calculation?.bpjsConfigId) {
    bpjs = await prisma.bpjsConfig.findUnique({
      where: { id: calculation.bpjsConfigId },
    });
  }

  const components: Record<string, number> = {};
  for (const it of calculation?.items ?? []) {
    components[it.componentCode] = num(it.finalValue);
  }

  const otHours = attendance.reduce(
    (s, r) => s + num(r.overtimeHours),
    0,
  );

  return {
    employee: {
      id: employee.id,
      code: employee.employeeCode,
      name: employee.name,
      baseSalary: num(employee.baseSalary),
      taxStatus: employee.taxStatus,
      ptkpStatus: employee.ptkpStatus,
    },
    period: {
      id: period.id,
      name: period.name,
      status: period.status,
      periodStart: period.periodStart,
      periodEnd: period.periodEnd,
      projectedCalculationId: period.projectedCalculationId,
      projectedAt: period.projectedAt,
      lockedAt: period.lockedAt,
    },
    chain: {
      attendance: {
        records: attendance.map((r) => ({
          date: r.workDate,
          type: r.type,
          hours: num(r.hoursWorked),
          ot: num(r.overtimeHours),
          locked: r.isLocked,
        })),
        totalOtHours: otHours,
      },
      calculation: calculation
        ? {
            id: calculation.id,
            runNumber: calculation.runNumber,
            revision: calculation.revision,
            status: calculation.status,
            runReason: calculation.runReason,
            calculatedAt: calculation.calculatedAt,
            components,
            formulaSources: calculation.items.map((i) => ({
              code: i.componentCode,
              expression: i.formulaSource,
              value: num(i.finalValue),
            })),
          }
        : null,
      tax,
      bpjs,
      formulas,
      projection: {
        projected: Boolean(
          period.projectedCalculationId &&
            period.projectedCalculationId === calcId,
        ),
        projectedAt: period.projectedAt,
        calculationId: period.projectedCalculationId,
      },
      payrollLine: line
        ? {
            id: line.id,
            baseSalary: num(line.baseSalary),
            allowances: num(line.allowances),
            overtime: num(line.overtime),
            bonuses: num(line.bonuses),
            deductions: num(line.deductions),
            tax: num(line.tax),
            bpjs: num(line.bpjs),
            netPay: num(line.netPay),
          }
        : null,
    },
  };
}

export async function getPeriodPayrollSummary(payrollPeriodId: string) {
  const period = await prisma.payrollPeriod.findUnique({
    where: { id: payrollPeriodId },
    include: {
      lines: true,
    },
  });
  if (!period) throw new Error("Period not found");

  const calcs = await prisma.payrollCalculation.findMany({
    where: { payrollPeriodId },
    orderBy: { runNumber: "desc" },
  });
  const latest = calcs[0] ?? null;
  const projected = period.projectedCalculationId
    ? calcs.find((c) => c.id === period.projectedCalculationId) ?? null
    : null;

  const openValidations = latest
    ? await prisma.payrollValidation.count({
        where: {
          calculationId: latest.id,
          resolutionStatus: "OPEN",
          severity: { in: ["ERROR", "BLOCKER"] },
        },
      })
    : 0;

  const lines = period.lines;
  const sum = (fn: (l: (typeof lines)[0]) => number) =>
    lines.reduce((s, l) => s + fn(l), 0);

  return {
    period: {
      id: period.id,
      name: period.name,
      status: period.status,
      employeeCount: period.employeeCount,
      lockedAt: period.lockedAt,
      projectedAt: period.projectedAt,
    },
    totals: {
      grossPayroll: num(period.totalGross) || sum((l) => num(l.baseSalary) + num(l.allowances) + num(l.overtime) + num(l.bonuses)),
      netPayroll: num(period.totalNet) || sum((l) => num(l.netPay)),
      totalTax: num(period.totalPph21) || sum((l) => num(l.tax)),
      totalBpjsEmployee: num(period.totalBpjsEmployee) || sum((l) => num(l.bpjs)),
      totalBpjsEmployer: num(period.totalBpjsEmployer),
      totalAllowance: sum((l) => num(l.allowances)),
      totalDeduction: sum((l) => num(l.deductions)),
      totalOvertime: sum((l) => num(l.overtime)),
      totalEmployees: lines.length || period.employeeCount,
    },
    validation: {
      openBlockersAndErrors: openValidations,
      status:
        openValidations > 0
          ? "HAS_OPEN_ISSUES"
          : latest
            ? "CLEAR"
            : "NO_CALCULATION",
    },
    revision: {
      latestRunNumber: latest?.runNumber ?? 0,
      latestRevision: latest?.revision ?? 0,
      runCount: calcs.length,
      projectedRunNumber: projected?.runNumber ?? null,
    },
    latestCalculation: latest
      ? {
          id: latest.id,
          status: latest.status,
          runReason: latest.runReason,
          calculatedAt: latest.calculatedAt,
        }
      : null,
  };
}
