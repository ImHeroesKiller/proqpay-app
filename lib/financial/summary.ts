/**
 * Financial summary contract for executive dashboard loaders.
 * Safe empty defaults when no financial core data exists.
 */

import { prisma } from "@/lib/db";

export type FinancialCoreSummary = {
  financialSummary: {
    invoiceCount: number;
    openInvoiceTotal: number;
    paidInvoiceTotal: number;
  };
  invoiceSummary: {
    draft: number;
    issued: number;
    paid: number;
    overdue: number;
  };
  receivableSummary: {
    outstanding: number;
    collected: number;
    overdue: number;
  };
  workingCapitalSummary: {
    requestCount: number;
    approvedExposure: number;
  };
  treasurySummary: {
    accountCount: number;
    movementCount: number;
  };
};

export async function getFinancialCoreSummary(input: {
  organizationId?: string | null;
  companyId?: string | null;
}): Promise<FinancialCoreSummary> {
  const empty: FinancialCoreSummary = {
    financialSummary: {
      invoiceCount: 0,
      openInvoiceTotal: 0,
      paidInvoiceTotal: 0,
    },
    invoiceSummary: { draft: 0, issued: 0, paid: 0, overdue: 0 },
    receivableSummary: { outstanding: 0, collected: 0, overdue: 0 },
    workingCapitalSummary: { requestCount: 0, approvedExposure: 0 },
    treasurySummary: { accountCount: 0, movementCount: 0 },
  };

  try {
    const companyFilter = input.companyId
      ? { companyId: input.companyId }
      : input.organizationId
        ? { organizationId: input.organizationId }
        : {};

    const [invoiceCount, invoicesByStatus, receivables, wcCount, treasury] =
      await Promise.all([
        prisma.invoice.count({ where: companyFilter }),
        prisma.invoice.groupBy({
          by: ["status"],
          where: companyFilter,
          _count: { _all: true },
          _sum: { grandTotal: true, outstandingAmount: true },
        }),
        prisma.receivable.groupBy({
          by: ["status"],
          where: input.companyId ? { companyId: input.companyId } : {},
          _sum: { outstanding: true },
          _count: { _all: true },
        }),
        prisma.workingCapitalRequest.count({
          where: input.companyId ? { companyId: input.companyId } : {},
        }),
        Promise.all([
          prisma.treasuryAccount.count({
            where: input.organizationId
              ? { organizationId: input.organizationId }
              : {},
          }),
          prisma.cashMovement.count({
            where: input.organizationId
              ? { organizationId: input.organizationId }
              : {},
          }),
        ]),
      ]);

    const statusMap = new Map(
      invoicesByStatus.map((r) => [r.status, r._count._all]),
    );
    let openTotal = 0;
    let paidTotal = 0;
    for (const r of invoicesByStatus) {
      if (["ISSUED", "PARTIALLY_PAID", "OVERDUE"].includes(r.status)) {
        openTotal += Number(r._sum.outstandingAmount ?? 0);
      }
      if (r.status === "PAID") {
        paidTotal += Number(r._sum.grandTotal ?? 0);
      }
    }

    let recOutstanding = 0;
    let recCollected = 0;
    let recOverdue = 0;
    for (const r of receivables) {
      const sum = Number(r._sum.outstanding ?? 0);
      if (r.status === "COLLECTED") recCollected += 1;
      else if (r.status === "OVERDUE") {
        recOverdue += sum;
        recOutstanding += sum;
      } else {
        recOutstanding += sum;
      }
    }

    return {
      financialSummary: {
        invoiceCount,
        openInvoiceTotal: openTotal,
        paidInvoiceTotal: paidTotal,
      },
      invoiceSummary: {
        draft: statusMap.get("DRAFT") ?? 0,
        issued: (statusMap.get("ISSUED") ?? 0) + (statusMap.get("PARTIALLY_PAID") ?? 0),
        paid: statusMap.get("PAID") ?? 0,
        overdue: statusMap.get("OVERDUE") ?? 0,
      },
      receivableSummary: {
        outstanding: recOutstanding,
        collected: recCollected,
        overdue: recOverdue,
      },
      workingCapitalSummary: {
        requestCount: wcCount,
        approvedExposure: 0,
      },
      treasurySummary: {
        accountCount: treasury[0],
        movementCount: treasury[1],
      },
    };
  } catch {
    // Tables may not be migrated yet in local envs
    return empty;
  }
}
