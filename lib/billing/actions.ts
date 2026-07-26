"use server";

import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth/session";
import { issueInvoiceAfterPaymentInstruction } from "@/lib/billing/service";

export async function createDraftInvoiceFromPayroll(periodId: string, managementFeePercent = 5) {
  const scope = await requireSession();
  try {
    const result = await issueInvoiceAfterPaymentInstruction(
      scope,
      periodId,
      managementFeePercent,
    );
    return { ok: true as const, ...result };
  } catch (error) {
    return {
      ok: false as const,
      error:
        error instanceof Error ? error.message : "Invoice gagal diterbitkan",
    };
  }
}

export async function listInvoices() {
  await requireSession();
  return prisma.invoice.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { company: true, items: true },
  });
}
