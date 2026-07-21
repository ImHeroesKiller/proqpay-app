/**
 * Period lock / unlock — freezes lines and blocks recalculation.
 */

import { prisma } from "@/lib/db";
import type { SessionScope } from "@/lib/auth/scope";
import { assertCompanyAccess } from "@/lib/auth/scope";
import { assertLinesMatchProjectedCalc } from "@/lib/payroll-engine/project-to-lines";

export async function lockPayrollPeriod(scope: SessionScope, periodId: string) {
  const period = await prisma.payrollPeriod.findUnique({
    where: { id: periodId },
    include: { lines: true },
  });
  if (!period) throw new Error("Payroll period not found");
  if (!assertCompanyAccess(scope, period.companyId)) {
    throw new Error("Cross-company access denied");
  }
  if (period.status === "LOCKED") {
    throw new Error("Period already locked");
  }
  if (period.status !== "APPROVED") {
    throw new Error("Period must be APPROVED before lock");
  }
  if (!period.lines.length) {
    throw new Error("Cannot lock period without payroll lines");
  }
  if (!period.projectedCalculationId) {
    throw new Error(
      "Cannot lock — project an approved calculation to PayrollLine first",
    );
  }
  await assertLinesMatchProjectedCalc(periodId);

  const openExc = await prisma.attendanceImportException.count({
    where: {
      status: "OPEN",
      severity: "ERROR",
      batch: { companyId: period.companyId, payrollPeriodId: periodId },
    },
  });
  if (openExc > 0) {
    throw new Error("Cannot lock with open attendance exceptions");
  }

  // Sequential updates (pooler-safe)
  await prisma.payrollPeriod.update({
    where: { id: periodId },
    data: {
      status: "LOCKED",
      lockedAt: new Date(),
      lockedById: scope.userId,
      version: { increment: 1 },
    },
  });
  await prisma.attendanceRecord.updateMany({
    where: {
      companyId: period.companyId,
      workDate: { gte: period.periodStart, lte: period.periodEnd },
    },
    data: { isLocked: true },
  });
  if (period.projectedCalculationId) {
    await prisma.payrollCalculation.update({
      where: { id: period.projectedCalculationId },
      data: { status: "LOCKED" },
    });
  }

  return { periodId, status: "LOCKED" as const };
}

export async function unlockPayrollPeriod(
  scope: SessionScope,
  periodId: string,
) {
  const period = await prisma.payrollPeriod.findUnique({
    where: { id: periodId },
  });
  if (!period) throw new Error("Payroll period not found");
  if (!assertCompanyAccess(scope, period.companyId)) {
    throw new Error("Cross-company access denied");
  }
  if (period.status !== "LOCKED") {
    throw new Error("Only LOCKED periods can be unlocked");
  }
  // Elevated only (caller enforces roles)
  await prisma.payrollPeriod.update({
    where: { id: periodId },
    data: {
      status: "APPROVED",
      lockedAt: null,
      lockedById: null,
      version: { increment: 1 },
    },
  });
  await prisma.attendanceRecord.updateMany({
    where: {
      companyId: period.companyId,
      workDate: { gte: period.periodStart, lte: period.periodEnd },
    },
    data: { isLocked: false },
  });
  return { periodId, status: "APPROVED" as const };
}
