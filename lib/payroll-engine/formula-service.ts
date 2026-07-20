import { prisma } from "@/lib/db";
import { extractDependencies } from "@/lib/payroll-engine/formula-engine";

export async function listFormulas(companyId: string) {
  return prisma.payrollFormula.findMany({
    where: { companyId },
    include: {
      versions: { orderBy: { version: "desc" }, take: 5 },
    },
    orderBy: { code: "asc" },
  });
}

export async function createFormulaVersion(input: {
  companyId: string;
  code: string;
  name: string;
  expression: string;
  description?: string | null;
  changeNote?: string | null;
  activate?: boolean;
  createdById?: string | null;
}) {
  const dependsOn = extractDependencies(input.expression);
  return prisma.$transaction(async (tx) => {
    const formula = await tx.payrollFormula.upsert({
      where: {
        companyId_code: { companyId: input.companyId, code: input.code },
      },
      create: {
        companyId: input.companyId,
        code: input.code,
        name: input.name,
        description: input.description ?? null,
        status: input.activate ? "ACTIVE" : "DRAFT",
      },
      update: {
        name: input.name,
        description: input.description ?? null,
        status: input.activate ? "ACTIVE" : undefined,
      },
    });

    const last = await tx.payrollFormulaVersion.findFirst({
      where: { formulaId: formula.id },
      orderBy: { version: "desc" },
    });
    const version = (last?.version ?? 0) + 1;

    if (input.activate) {
      await tx.payrollFormulaVersion.updateMany({
        where: { formulaId: formula.id },
        data: { isActive: false },
      });
    }

    const row = await tx.payrollFormulaVersion.create({
      data: {
        formulaId: formula.id,
        version,
        expression: input.expression,
        dependsOnJson: JSON.stringify(dependsOn),
        isActive: input.activate ?? false,
        changeNote: input.changeNote ?? null,
        createdById: input.createdById ?? null,
      },
    });

    return { formula, version: row };
  });
}
