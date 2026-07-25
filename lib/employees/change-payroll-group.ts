"use server";

import { randomUUID } from "crypto";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth/session";

/**
 * Change employee payroll group without overwriting history:
 * close prior active assignments, open a new one with effective date.
 */
export async function changeEmployeePayrollGroup(input: {
  employeeId: string;
  payrollGroupId: string;
  effectiveFrom: string | Date;
  projectId?: string | null;
  notes?: string;
}) {
  const scope = await requireSession();
  const user = await prisma.user.findUnique({ where: { id: scope.userId } });
  const employee = await prisma.employee.findUnique({
    where: { id: input.employeeId },
  });
  if (!employee) return { ok: false as const, error: "Karyawan tidak ditemukan" };

  if (
    scope.role !== "SUPER_ADMIN" &&
    scope.companyId &&
    employee.companyId !== scope.companyId
  ) {
    return { ok: false as const, error: "Akses ditolak" };
  }

  const effectiveFrom =
    typeof input.effectiveFrom === "string"
      ? new Date(input.effectiveFrom)
      : input.effectiveFrom;
  if (Number.isNaN(effectiveFrom.getTime())) {
    return { ok: false as const, error: "Tanggal efektif tidak valid" };
  }

  const group = await prisma.payrollGroup.findUnique({
    where: { id: input.payrollGroupId },
  });
  if (!group) return { ok: false as const, error: "Payroll group tidak ditemukan" };

  const dayBefore = new Date(effectiveFrom);
  dayBefore.setDate(dayBefore.getDate() - 1);

  const assignmentId = randomUUID();

  await prisma.$transaction(async (tx) => {
    await tx.employeePayrollAssignment.updateMany({
      where: {
        employeeId: input.employeeId,
        isActive: true,
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: effectiveFrom } }],
      },
      data: {
        isActive: false,
        status: "SUPERSEDED",
        effectiveTo: dayBefore,
      },
    });

    await tx.employeePayrollAssignment.create({
      data: {
        id: assignmentId,
        employeeId: input.employeeId,
        payrollGroupId: input.payrollGroupId,
        companyId: employee.companyId,
        projectId: input.projectId ?? group.projectId ?? null,
        effectiveFrom,
        effectiveTo: null,
        isActive: true,
        status: "ACTIVE",
        notes: input.notes ?? null,
      },
    });
  });

  await prisma.auditLog.create({
    data: {
      id: randomUUID(),
      companyId: employee.companyId,
      userId: scope.userId,
      userName: user?.name ?? "User",
      userRole: scope.role,
      action: "EMPLOYEE_PAYROLL_GROUP_CHANGE",
      entity: "EmployeePayrollAssignment",
      entityId: assignmentId,
      detail: `group ${group.code} effective ${effectiveFrom.toISOString().slice(0, 10)}`,
      ip: "app",
    },
  });

  return { ok: true as const, assignmentId };
}
