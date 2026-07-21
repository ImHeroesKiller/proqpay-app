/**
 * ADR-001 — Project approved/ready PayrollCalculation → PayrollLine.
 * PayrollLine remains canonical operational payout output.
 * Uses sequential batch writes (pooler-safe; no long interactive tx).
 */

import { randomUUID } from "crypto";
import { prisma } from "@/lib/db";
import type { SessionScope } from "@/lib/auth/scope";
import { assertCompanyAccess } from "@/lib/auth/scope";

function num(v: { toString(): string } | number | null | undefined): number {
  if (v == null) return 0;
  return typeof v === "number" ? v : Number(v.toString());
}

const TOLERANCE = 0.02;

export async function projectCalculationToPayrollLines(
  scope: SessionScope,
  periodId: string,
  calculationId: string,
  opts?: { requireApprovedPeriod?: boolean },
) {
  const period = await prisma.payrollPeriod.findUnique({
    where: { id: periodId },
    include: { lines: true },
  });
  if (!period) throw new Error("Payroll period not found");
  if (!assertCompanyAccess(scope, period.companyId)) {
    throw new Error("Cross-company access denied");
  }
  if (["LOCKED", "CLOSED", "DISBURSED", "VERIFIED"].includes(period.status)) {
    throw new Error("Cannot project into locked/closed period");
  }
  if (opts?.requireApprovedPeriod && period.status !== "APPROVED") {
    throw new Error(
      "Period must be APPROVED before projecting calculation to lines",
    );
  }

  const calc = await prisma.payrollCalculation.findUnique({
    where: { id: calculationId },
    include: { items: true },
  });
  if (!calc) throw new Error("Calculation not found");
  if (calc.companyId !== period.companyId) {
    throw new Error("Calculation company does not match period");
  }
  if (calc.payrollPeriodId && calc.payrollPeriodId !== periodId) {
    throw new Error("Calculation is not for this payroll period");
  }
  if (
    !["READY_FOR_APPROVAL", "APPROVED", "LOCKED", "PARTIALLY_APPROVED"].includes(
      calc.status,
    )
  ) {
    throw new Error(
      `Calculation status ${calc.status} cannot be projected — run must succeed without blockers`,
    );
  }

  const byEmp = new Map<
    string,
    { name: string; values: Record<string, number> }
  >();
  for (const it of calc.items) {
    const empId = it.employeeId;
    if (!empId) continue;
    const cur = byEmp.get(empId) ?? { name: it.employeeName, values: {} };
    cur.values[it.componentCode] = num(it.finalValue);
    cur.name = it.employeeName;
    byEmp.set(empId, cur);
  }
  if (byEmp.size === 0) throw new Error("Calculation has no employee items");

  const calcEmpIds = [...byEmp.keys()];
  const employees = await prisma.employee.findMany({
    where: { id: { in: calcEmpIds } },
  });
  const empMap = new Map(employees.map((e) => [e.id, e]));
  const existingLines = await prisma.payrollLine.findMany({
    where: { payrollPeriodId: periodId },
  });
  const lineByEmp = new Map(existingLines.map((l) => [l.employeeId, l]));

  let totalGross = 0;
  let totalNet = 0;
  let totalDeductions = 0;
  let totalBpjsEmp = 0;
  let totalBpjsEr = 0;
  let totalPph = 0;

  const updates: {
    id: string;
    data: Record<string, unknown>;
  }[] = [];
  const creates: {
    id: string;
    payrollPeriodId: string;
    employeeId: string;
    employeeName: string;
    department: string;
    baseSalary: number;
    allowances: number;
    overtime: number;
    bonuses: number;
    deductions: number;
    tax: number;
    bpjs: number;
    netPay: number;
  }[] = [];

  for (const [employeeId, data] of byEmp) {
    const emp = empMap.get(employeeId);
    if (!emp) throw new Error(`Employee ${employeeId} missing`);
    const v = data.values;
    const baseSalary = v.BasicSalary ?? v.BaseSalary ?? 0;
    const allowances =
      (v.TransportAllowance ?? 0) + (v.MealAllowance ?? 0);
    const overtime = v.Overtime ?? 0;
    const bonuses = v.Bonus ?? 0;
    const deductions = v.Loan ?? 0;
    const tax = v.PPH21 ?? 0;
    const bpjs = v.BPJSEmployee ?? 0;
    const bpjsEmployer = v.BPJSEmployer ?? 0;
    const netPay = v.NetSalary ?? 0;
    const gross = v.Gross ?? baseSalary + allowances + overtime + bonuses;

    totalGross += gross;
    totalNet += netPay;
    totalDeductions += deductions + bpjs + tax;
    totalBpjsEmp += bpjs;
    totalBpjsEr += bpjsEmployer;
    totalPph += tax;

    const existing = lineByEmp.get(employeeId);
    const payload = {
      employeeName: data.name,
      department: emp.department || existing?.department || "—",
      baseSalary,
      allowances,
      overtime,
      bonuses,
      deductions,
      tax,
      bpjs,
      netPay,
    };
    if (existing) {
      updates.push({ id: existing.id, data: payload });
    } else {
      creates.push({
        id: randomUUID(),
        payrollPeriodId: periodId,
        employeeId,
        ...payload,
      });
    }
  }

  // Sequential updates (pooler-friendly)
  for (const u of updates) {
    await prisma.payrollLine.update({
      where: { id: u.id },
      data: u.data,
    });
  }
  if (creates.length) {
    const chunk = 50;
    for (let i = 0; i < creates.length; i += chunk) {
      await prisma.payrollLine.createMany({
        data: creates.slice(i, i + chunk),
      });
    }
  }

  await prisma.payrollLine.deleteMany({
    where: {
      payrollPeriodId: periodId,
      employeeId: { notIn: calcEmpIds },
    },
  });

  await prisma.payrollPeriod.update({
    where: { id: periodId },
    data: {
      totalGross,
      totalNet,
      totalDeductions,
      totalBpjsEmployee: totalBpjsEmp,
      totalBpjsEmployer: totalBpjsEr,
      totalPph21: totalPph,
      employeeCount: byEmp.size,
      projectedCalculationId: calculationId,
      projectedAt: new Date(),
      latestCalculationId: calculationId,
      version: { increment: 1 },
    },
  });

  if (
    calc.status === "READY_FOR_APPROVAL" ||
    calc.status === "PARTIALLY_APPROVED"
  ) {
    await prisma.payrollCalculation.update({
      where: { id: calculationId },
      data: { status: "APPROVED" },
    });
  }

  const sumNet = await prisma.payrollLine.aggregate({
    where: { payrollPeriodId: periodId },
    _sum: { netPay: true },
  });

  return {
    periodId,
    calculationId,
    employeeCount: byEmp.size,
    totalNet,
    totalGross,
    lineNetSum: num(sumNet._sum.netPay),
  };
}

export async function assertLinesMatchProjectedCalc(periodId: string) {
  const period = await prisma.payrollPeriod.findUnique({
    where: { id: periodId },
  });
  if (!period?.projectedCalculationId) {
    throw new Error(
      "Period has no projected calculation — project approved calculation first",
    );
  }
  const sum = await prisma.payrollLine.aggregate({
    where: { payrollPeriodId: periodId },
    _sum: { netPay: true },
  });
  const lineNet = num(sum._sum.netPay);
  const periodNet = num(period.totalNet);
  if (Math.abs(lineNet - periodNet) > TOLERANCE) {
    throw new Error(
      `PayrollLine sum (${lineNet}) does not match period totalNet (${periodNet})`,
    );
  }
  return true;
}
