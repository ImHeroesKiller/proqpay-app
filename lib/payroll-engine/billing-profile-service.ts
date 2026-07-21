import { prisma } from "@/lib/db";
import type { BillingMethod, InvoiceGrouping } from "@prisma/client";

export async function getBillingProfile(companyId: string) {
  return prisma.clientBillingProfile.findUnique({ where: { companyId } });
}

export async function upsertBillingProfile(input: {
  companyId: string;
  billingMethod?: BillingMethod;
  topDays?: number;
  invoiceGrouping?: InvoiceGrouping;
  invoicePrefix?: string;
  currency?: string;
  taxConfiguration?: string | null;
  notes?: string | null;
}) {
  const top = input.topDays ?? 30;
  if (![7, 14, 30, 45, 60].includes(top) && top < 1) {
    throw new Error("Invalid TOP days");
  }
  return prisma.clientBillingProfile.upsert({
    where: { companyId: input.companyId },
    create: {
      companyId: input.companyId,
      billingMethod: input.billingMethod ?? "PAYROLL_SERVICE",
      topDays: top,
      invoiceGrouping: input.invoiceGrouping ?? "PER_PAYROLL",
      invoicePrefix: input.invoicePrefix ?? "INV",
      currency: input.currency ?? "IDR",
      taxConfiguration: input.taxConfiguration ?? null,
      notes: input.notes ?? null,
    },
    update: {
      billingMethod: input.billingMethod,
      topDays: input.topDays,
      invoiceGrouping: input.invoiceGrouping,
      invoicePrefix: input.invoicePrefix,
      currency: input.currency,
      taxConfiguration: input.taxConfiguration,
      notes: input.notes,
    },
  });
}
