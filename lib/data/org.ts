import { prisma } from "@/lib/db";
import type { SessionScope } from "@/lib/auth/scope";
import { companyWhere } from "@/lib/auth/scope";

export async function listProjects(scope: SessionScope) {
  const where = companyWhere(scope);
  return prisma.project.findMany({
    where: where.companyId ? { companyId: where.companyId } : undefined,
    include: {
      _count: { select: { assignments: true, payrollPeriods: true } },
    },
    orderBy: { name: "asc" },
  });
}

export async function listAttendance(scope: SessionScope, take = 100) {
  const where = companyWhere(scope);
  return prisma.attendanceRecord.findMany({
    where: where.companyId ? { companyId: where.companyId } : undefined,
    include: { employee: true, project: true },
    orderBy: { workDate: "desc" },
    take,
  });
}

export async function listOrgStructure(scope: SessionScope) {
  const companyId =
    scope.companyId ??
    (
      await prisma.company.findFirst({ orderBy: { createdAt: "asc" } })
    )?.id;
  if (!companyId) return null;
  const [branches, departments, positions, costCenters, matrices, components] =
    await Promise.all([
      prisma.branch.findMany({ where: { companyId } }),
      prisma.department.findMany({ where: { companyId } }),
      prisma.position.findMany({ where: { companyId } }),
      prisma.costCenter.findMany({ where: { companyId } }),
      prisma.approvalMatrix.findMany({
        where: { companyId },
        orderBy: { level: "asc" },
      }),
      prisma.payrollComponent.findMany({
        where: { companyId },
        orderBy: { sortOrder: "asc" },
      }),
    ]);
  return {
    companyId,
    branches,
    departments,
    positions,
    costCenters,
    matrices,
    components,
  };
}
