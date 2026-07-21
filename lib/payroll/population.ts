/**
 * Employee population resolution from Payroll Group assignments.
 * Materializes skeleton PayrollLine rows for a period (Increment 1).
 */

import { randomUUID } from "crypto";
import { prisma } from "@/lib/db";
import type { SessionScope } from "@/lib/auth/scope";
import { assertCompanyAccess } from "@/lib/auth/scope";

export async function listActiveAssignments(
  payrollGroupId: string,
  asOf: Date,
) {
  return prisma.employeePayrollAssignment.findMany({
    where: {
      payrollGroupId,
      status: "ACTIVE",
      effectiveFrom: { lte: asOf },
      OR: [{ effectiveTo: null }, { effectiveTo: { gte: asOf } }],
      employee: { status: { in: ["ACTIVE", "PROBATION"] } },
    },
    include: {
      employee: true,
    },
    orderBy: { employee: { name: "asc" } },
  });
}

/**
 * Create payroll lines for all active assignments on the period's group.
 * Uses batch writes (no long interactive transactions — Supabase pooler safe).
 */
export async function materializePayrollLines(
  scope: SessionScope,
  periodId: string,
  opts?: { replaceExisting?: boolean },
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
    throw new Error("Cannot rebuild population on locked/closed period");
  }
  if (!period.payrollGroupId) {
    throw new Error("Period has no payroll group — cannot resolve population");
  }

  const assignments = await listActiveAssignments(
    period.payrollGroupId,
    period.periodEnd,
  );
  if (assignments.length === 0) {
    throw new Error("Employee population is empty for this payroll group");
  }

  const activeEmpIds = new Set(assignments.map((a) => a.employeeId));
  const orphanIds = period.lines
    .filter((l) => !activeEmpIds.has(l.employeeId))
    .map((l) => l.id);
  if (orphanIds.length) {
    await prisma.payrollLine.deleteMany({ where: { id: { in: orphanIds } } });
  }

  const existing = await prisma.payrollLine.findMany({
    where: { payrollPeriodId: periodId },
    select: { employeeId: true },
  });
  const have = new Set(existing.map((e) => e.employeeId));

  const toCreate = assignments
    .filter((a) => !have.has(a.employeeId))
    .map((a) => ({
      id: randomUUID(),
      payrollPeriodId: periodId,
      employeeId: a.employee.id,
      employeeName: a.employee.name,
      department: a.employee.department || "—",
      baseSalary: a.employee.baseSalary,
      allowances: 0,
      overtime: 0,
      bonuses: 0,
      deductions: 0,
      tax: 0,
      bpjs: 0,
      netPay: 0,
    }));

  if (toCreate.length) {
    // chunk createMany for large populations
    const chunk = 50;
    for (let i = 0; i < toCreate.length; i += chunk) {
      await prisma.payrollLine.createMany({
        data: toCreate.slice(i, i + chunk),
        skipDuplicates: true,
      });
    }
  }

  const count = await prisma.payrollLine.count({
    where: { payrollPeriodId: periodId },
  });
  await prisma.payrollPeriod.update({
    where: { id: periodId },
    data: {
      employeeCount: count,
      populationBuiltAt: new Date(),
      version: { increment: 1 },
    },
  });

  return { periodId, employeeCount: count };
}
