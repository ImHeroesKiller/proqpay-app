"use server";

import { requireSession } from "@/lib/auth/session";
import { runPayrollValidation } from "@/lib/validation/payroll";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/db";

export async function runValidationAction(periodId: string) {
  const scope = await requireSession();
  try {
    const result = await runPayrollValidation(periodId);
    const user = await prisma.user.findUnique({ where: { id: scope.userId } });
    await prisma.auditLog.create({
      data: {
        id: randomUUID(),
        companyId: scope.companyId,
        userId: scope.userId,
        userName: user?.name ?? "User",
        userRole: scope.role,
        action: "PAYROLL_VALIDATE",
        entity: "PayrollPeriod",
        entityId: periodId,
        detail: `${result.total} issues`,
        ip: "app",
      },
    });
    return {
      ok: true as const,
      total: result.total,
      critical: result.critical,
      warning: result.warning,
    };
  } catch {
    return {
      ok: false as const,
      error: "Validasi gagal dijalankan. Pastikan periode tersedia.",
    };
  }
}
