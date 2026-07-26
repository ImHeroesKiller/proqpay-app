import { randomUUID } from "crypto";
import { prisma } from "@/lib/db";
import type { SessionScope } from "@/lib/auth/scope";

export async function issueInvoiceAfterPaymentInstruction(
  scope: SessionScope,
  periodId: string,
  managementFeePercent = 5,
) {
  const period = await prisma.payrollPeriod.findUnique({
    where: { id: periodId },
    include: {
      company: { include: { billingProfile: true } },
      paymentInstructions: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });
  if (!period) throw new Error("Periode tidak ditemukan");
  const instruction = period.paymentInstructions[0];
  if (
    !instruction ||
    instruction.executionStatus !== "EXECUTED" ||
    period.paymentInstructionStatus !== "EXECUTED"
  ) {
    throw new Error(
      "Invoice hanya dapat diterbitkan setelah payment instruction selesai",
    );
  }
  const existing = await prisma.invoice.findFirst({
    where: { payrollPeriodId: periodId, status: { not: "CANCELLED" } },
  });
  if (existing) {
    return { invoiceId: existing.id, existing: true };
  }

  const gross = Number(period.totalGross);
  const bpjsEmployer = Number(period.totalBpjsEmployer);
  const fee = Math.round(gross * (managementFeePercent / 100));
  const subtotal = gross + bpjsEmployer + fee;
  const tax = Math.round(fee * 0.11);
  const total = subtotal + tax;
  const profile = period.company.billingProfile;
  const paymentMode = profile?.paymentMode ?? "REIMBURSEMENT";
  const topDays = profile?.topDays ?? 14;
  const now = new Date();
  const dueDate = new Date(now.getTime() + topDays * 86_400_000);
  const count = await prisma.invoice.count({
    where: { companyId: period.companyId },
  });
  const prefix = profile?.invoicePrefix || "INV";
  const invoiceNumber = `${prefix}-${now.getFullYear()}-${String(count + 1).padStart(5, "0")}`;
  const invoiceId = randomUUID();

  await prisma.$transaction(async (tx) => {
    await tx.invoice.create({
      data: {
        id: invoiceId,
        organizationId: period.company.organizationId,
        companyId: period.companyId,
        clientId: period.companyId,
        projectId: period.projectId,
        payrollPeriodId: period.id,
        invoiceNumber,
        status: "ISSUED",
        issueDate: now,
        dueDate,
        issuedAt: now,
        subtotal,
        tax,
        managementFee: fee,
        grandTotal: total,
        outstandingAmount: total,
        notes: `${paymentMode} · otomatis H+0 setelah payment instruction ${instruction.instructionNumber} selesai`,
        createdBy: scope.userId,
        items: {
          create: [
            {
              id: randomUUID(),
              kind: "PAYROLL",
              description: `Payroll ${period.name}`,
              quantity: 1,
              unitPrice: gross,
              amount: gross,
              sortOrder: 1,
            },
            {
              id: randomUUID(),
              kind: "BPJS",
              description: "BPJS employer",
              quantity: 1,
              unitPrice: bpjsEmployer,
              amount: bpjsEmployer,
              sortOrder: 2,
            },
            {
              id: randomUUID(),
              kind: "MANAGEMENT_FEE",
              description: `Management fee ${managementFeePercent}%`,
              quantity: 1,
              unitPrice: fee,
              amount: fee,
              sortOrder: 3,
            },
            {
              id: randomUUID(),
              kind: "OTHER",
              description: "PPN atas management fee",
              quantity: 1,
              unitPrice: tax,
              amount: tax,
              sortOrder: 4,
            },
          ],
        },
      },
    });
    await tx.receivable.create({
      data: {
        id: randomUUID(),
        organizationId: period.company.organizationId,
        companyId: period.companyId,
        invoiceId,
        originalAmount: total,
        outstanding: total,
        currentBucket: "CURRENT",
        agingDays: 0,
        expectedCollection: dueDate,
        status: "CURRENT",
      },
    });
    await tx.auditLog.create({
      data: {
        id: randomUUID(),
        companyId: period.companyId,
        userId: scope.userId,
        userName: "IDA Workflow",
        userRole: scope.role,
        action: "INVOICE_ISSUED_H0",
        entity: "Invoice",
        entityId: invoiceId,
        detail: `${invoiceNumber} · ${paymentMode}`,
        ip: "app",
      },
    });
  });
  return { invoiceId, invoiceNumber, existing: false };
}
