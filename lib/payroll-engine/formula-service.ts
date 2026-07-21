/**
 * Formula management — active versions are immutable (Increment 1.5).
 */

import { prisma } from "@/lib/db";
import { extractDependencies } from "@/lib/payroll-engine/formula-engine";

export async function listFormulas(companyId: string) {
  return prisma.payrollFormula.findMany({
    where: { companyId },
    include: {
      versions: { orderBy: { version: "desc" }, take: 20 },
    },
    orderBy: { code: "asc" },
  });
}

export async function getFormula(companyId: string, formulaId: string) {
  return prisma.payrollFormula.findFirst({
    where: { id: formulaId, companyId },
    include: { versions: { orderBy: { version: "desc" } } },
  });
}

/**
 * Create a new formula version. Never mutates an ACTIVE version's expression.
 */
export async function createFormulaVersion(input: {
  companyId: string;
  code: string;
  name: string;
  expression: string;
  description?: string | null;
  changeNote?: string | null;
  activate?: boolean;
  createdById?: string | null;
  effectiveFrom?: string | null;
}) {
  if (!input.expression.trim()) throw new Error("expression required");
  const dependsOn = extractDependencies(input.expression);

  // No interactive long tx — sequential for pooler
  const formula = await prisma.payrollFormula.upsert({
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
      ...(input.activate ? { status: "ACTIVE" as const } : {}),
    },
  });

  const last = await prisma.payrollFormulaVersion.findFirst({
    where: { formulaId: formula.id },
    orderBy: { version: "desc" },
  });
  const version = (last?.version ?? 0) + 1;

  if (input.activate) {
    await prisma.payrollFormulaVersion.updateMany({
      where: { formulaId: formula.id, isActive: true },
      data: { isActive: false, lifecycle: "DEPRECATED" },
    });
  }

  const row = await prisma.payrollFormulaVersion.create({
    data: {
      formulaId: formula.id,
      version,
      expression: input.expression,
      dependsOnJson: JSON.stringify(dependsOn),
      isActive: input.activate ?? false,
      lifecycle: input.activate ? "ACTIVE" : "DRAFT",
      changeNote: input.changeNote ?? null,
      createdById: input.createdById ?? null,
      effectiveFrom: input.effectiveFrom
        ? new Date(input.effectiveFrom)
        : new Date(),
    },
  });

  return { formula, version: row };
}

/** Activate a draft version (deprecates previous active). */
export async function activateFormulaVersion(
  companyId: string,
  versionId: string,
) {
  const ver = await prisma.payrollFormulaVersion.findUnique({
    where: { id: versionId },
    include: { formula: true },
  });
  if (!ver || ver.formula.companyId !== companyId) {
    throw new Error("Formula version not found");
  }
  if (ver.lifecycle === "ACTIVE" && ver.isActive) {
    return ver;
  }
  if (ver.lifecycle === "DEPRECATED") {
    throw new Error("Cannot re-activate a deprecated version — create a new version");
  }

  await prisma.payrollFormulaVersion.updateMany({
    where: { formulaId: ver.formulaId, isActive: true },
    data: { isActive: false, lifecycle: "DEPRECATED" },
  });
  await prisma.payrollFormula.update({
    where: { id: ver.formulaId },
    data: { status: "ACTIVE" },
  });
  return prisma.payrollFormulaVersion.update({
    where: { id: versionId },
    data: { isActive: true, lifecycle: "ACTIVE" },
  });
}

export async function archiveFormula(companyId: string, formulaId: string) {
  const f = await prisma.payrollFormula.findFirst({
    where: { id: formulaId, companyId },
  });
  if (!f) throw new Error("Formula not found");
  await prisma.payrollFormulaVersion.updateMany({
    where: { formulaId, isActive: true },
    data: { isActive: false, lifecycle: "DEPRECATED" },
  });
  return prisma.payrollFormula.update({
    where: { id: formulaId },
    data: { status: "ARCHIVED" },
  });
}

/** List active formula versions for calculation snapshot. */
export async function listActiveFormulaVersions(companyId: string) {
  const formulas = await prisma.payrollFormula.findMany({
    where: { companyId, status: "ACTIVE" },
    include: {
      versions: { where: { isActive: true }, take: 1 },
    },
  });
  return formulas
    .map((f) => ({
      formulaId: f.id,
      code: f.code,
      versionId: f.versions[0]?.id,
      version: f.versions[0]?.version,
      expression: f.versions[0]?.expression,
    }))
    .filter((x) => x.versionId);
}
