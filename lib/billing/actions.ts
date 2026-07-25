"use server";

import { randomUUID } from "crypto";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth/session";

export async function createDraftInvoiceFromPayroll(periodId: string, managementFeePercent = 5) {
  const scope = await requireSession();
  const user = await prisma.user.findUnique({ where: { id: scope.userId } });
  const period = await prisma.payrollPeriod.findUnique({
    where: { id: periodId },
    include: { company: true, lines: true },
  });
  if (!period) return { ok: false as const, error: "Periode tidak ditemukan" };
  if (!["LOCKED", "APPROVED", "DISBURSED", "PAYMENT_INSTRUCTION_GENERATED", "CLOSED"].includes(period.status)) {
    // Allow draft after approval/lock; still allow APPROVED
    if (period.status === "DRAFT" || period.status === "WAITING") {
      return {
        ok: false as const,
        error: "Invoice draft hanya dapat dibuat setelah payroll disetujui atau dikunci",
      };
    }
  }

  const existing = await prisma.invoice.findFirst({
    where: { payrollPeriodId: periodId, status: "DRAFT" },
  });
  if (existing) {
    return { ok: true as const, invoiceId: existing.id, existing: true };
  }

  const gross = Number(period.totalGross);
  const bpjsEmployer = Number(period.totalBpjsEmployer);
  const fee = Math.round(gross * (managementFeePercent / 100));
  const subtotal = gross + bpjsEmployer + fee;
  const tax = Math.round(fee * 0.11); // PPN on management fee (simplified)
  const total = subtotal + tax;

  const count = await prisma.invoice.count({ where: { companyId: period.companyId } });
  const invoiceNumber = `INV-${new Date().getFullYear()}-${String(count + 1).padStart(5, "0")}`;
  const id = randomUUID();

  await prisma.invoice.create({
    data: {
      id,
      organizationId: period.company.organizationId,
      companyId: period.companyId,
      clientId: period.companyId,
      payrollPeriodId: periodId,
      invoiceNumber,
      status: "DRAFT",
      issueDate: new Date(),
      dueDate: new Date(Date.now() + 14 * 86400000),
      subtotal,
      taxAmount: tax,
      managementFee: fee,
      totalAmount: total,
      notes: `Draft invoice dari payroll ${period.name}`,
      createdBy: scope.userId,
      items: {
        create: [
          {
            id: randomUUID(),
            description: `Managed payroll — ${period.name} (${period.employeeCount} karyawan)`,
            quantity: 1,
            unitAmount: gross,
            lineAmount: gross,
            sortOrder: 1,
          },
          {
            id: randomUUID(),
            description: "BPJS employer (recharge)",
            quantity: 1,
            unitAmount: bpjsEmployer,
            lineAmount: bpjsEmployer,
            sortOrder: 2,
          },
          {
            id: randomUUID(),
            description: `Management fee ${managementFeePercent}%`,
            quantity: 1,
            unitAmount: fee,
            lineAmount: fee,
            sortOrder: 3,
          },
          {
            id: randomUUID(),
            description: "PPN 11% (atas management fee)",
            quantity: 1,
            unitAmount: tax,
            lineAmount: tax,
            sortOrder: 4,
          },
        ],
      },
    },
  });

  await prisma.auditLog.create({
    data: {
      id: randomUUID(),
      companyId: period.companyId,
      userId: scope.userId,
      userName: user?.name ?? "User",
      userRole: scope.role,
      action: "INVOICE_DRAFT_CREATE",
      entity: "Invoice",
      entityId: id,
      detail: invoiceNumber,
      ip: "app",
    },
  });

  return { ok: true as const, invoiceId: id, invoiceNumber, existing: false };
}

export async function listInvoices() {
  await requireSession();
  return prisma.invoice.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { company: true, items: true },
  });
}
