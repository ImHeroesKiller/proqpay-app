/**
 * RevisionService — never overwrite; create revision snapshots.
 */

import { prisma } from "@/lib/db";

export async function createPayrollRevision(input: {
  calculationId: string;
  reason: string;
  createdById?: string | null;
  createdByName?: string | null;
}) {
  return prisma.$transaction(async (tx) => {
    const calc = await tx.payrollCalculation.findUnique({
      where: { id: input.calculationId },
      include: { snapshot: true, items: true },
    });
    if (!calc) throw new Error("Calculation not found");
    if (calc.status === "LOCKED" || calc.status === "CLOSED") {
      // allow revision record but mark REVISED path
    }

    const last = await tx.payrollRevision.findFirst({
      where: { calculationId: calc.id },
      orderBy: { revisionNumber: "desc" },
    });
    const nextRev = (last?.revisionNumber ?? calc.revision) + 1;

    const snapshotJson =
      calc.snapshot?.payloadJson ??
      JSON.stringify({
        items: calc.items,
        totals: {
          gross: calc.grossTotal,
          net: calc.netTotal,
        },
      });

    const revision = await tx.payrollRevision.create({
      data: {
        calculationId: calc.id,
        revisionNumber: nextRev,
        reason: input.reason,
        baseRevision: calc.revision,
        snapshotJson,
        createdById: input.createdById ?? null,
        createdByName: input.createdByName ?? null,
      },
    });

    await tx.payrollCalculation.update({
      where: { id: calc.id },
      data: {
        revision: nextRev,
        status: "REVISED",
      },
    });

    return revision;
  });
}

export async function listRevisions(calculationId: string) {
  return prisma.payrollRevision.findMany({
    where: { calculationId },
    orderBy: { revisionNumber: "desc" },
  });
}
