/**
 * PaymentService — client payments + multi-invoice allocation.
 */

import { prisma } from "@/lib/db";
import { applyPaymentToOutstanding } from "@/lib/financial/receivable-rules";
import {
  paymentStatusFromAmounts,
  type InvoiceStatusCode,
} from "@/lib/financial/invoice-status";
import { upsertReceivableTx } from "@/lib/financial/invoice-service";
import {
  recordFinancialAudit,
  type FinancialActor,
} from "@/lib/financial/audit";

function num(v: { toString(): string } | number): number {
  return typeof v === "number" ? v : Number(v.toString());
}

export async function createClientPayment(input: {
  organizationId: string;
  companyId: string;
  paymentDate: Date;
  amount: number;
  currency?: string;
  paymentMethod?: string | null;
  bankReference?: string | null;
  payer?: string | null;
  notes?: string | null;
  actor: FinancialActor;
}) {
  if (input.amount <= 0) throw new Error("Payment amount must be positive");
  const payment = await prisma.clientPayment.create({
    data: {
      organizationId: input.organizationId,
      companyId: input.companyId,
      paymentDate: input.paymentDate,
      amount: input.amount,
      currency: input.currency ?? "IDR",
      paymentMethod: input.paymentMethod ?? null,
      bankReference: input.bankReference ?? null,
      payer: input.payer ?? null,
      notes: input.notes ?? null,
      status: "PENDING",
      createdById: input.actor.id ?? null,
    },
  });
  await recordFinancialAudit({
    actor: input.actor,
    action: "PAYMENT_CREATED",
    entityType: "ClientPayment",
    entityId: payment.id,
    companyId: payment.companyId,
    after: { amount: input.amount, status: "PENDING" },
  });
  return payment;
}

/**
 * Verify payment and allocate across invoices (FIFO if invoiceIds omitted order preserved).
 */
export async function verifyAndAllocatePayment(input: {
  paymentId: string;
  allocations: { invoiceId: string; amount: number }[];
  actor: FinancialActor;
  treasuryAccountId?: string | null;
}) {
  return prisma.$transaction(async (tx) => {
    const payment = await tx.clientPayment.findUnique({
      where: { id: input.paymentId },
    });
    if (!payment) throw new Error("Payment not found");
    if (payment.status === "VERIFIED") {
      throw new Error("Payment already verified");
    }
    if (payment.status === "VOID" || payment.status === "REJECTED") {
      throw new Error("Payment cannot be verified in current status");
    }

    const totalAlloc = input.allocations.reduce((s, a) => s + a.amount, 0);
    if (Math.abs(totalAlloc - num(payment.amount)) > 0.0001) {
      throw new Error("Allocations must equal payment amount");
    }

    for (const alloc of input.allocations) {
      if (alloc.amount <= 0) throw new Error("Allocation must be positive");
      const inv = await tx.invoice.findUnique({ where: { id: alloc.invoiceId } });
      if (!inv) throw new Error(`Invoice ${alloc.invoiceId} not found`);
      if (!["ISSUED", "PARTIALLY_PAID", "OVERDUE"].includes(inv.status)) {
        throw new Error(`Invoice ${inv.id} is not open for payment`);
      }
      const outstanding = num(inv.outstandingAmount);
      applyPaymentToOutstanding(outstanding, alloc.amount);

      await tx.paymentAllocation.create({
        data: {
          paymentId: payment.id,
          invoiceId: inv.id,
          allocatedAmount: alloc.amount,
        },
      });

      const nextPaid = num(inv.paidAmount) + alloc.amount;
      const nextOut = Math.max(0, num(inv.grandTotal) - nextPaid);
      const nextStatus = paymentStatusFromAmounts(
        num(inv.grandTotal),
        nextPaid,
        inv.status as InvoiceStatusCode,
      );

      await tx.invoice.update({
        where: { id: inv.id },
        data: {
          paidAmount: nextPaid,
          outstandingAmount: nextOut,
          status: nextStatus,
          version: { increment: 1 },
        },
      });
      await upsertReceivableTx(tx, inv.id);
    }

    const verified = await tx.clientPayment.update({
      where: { id: payment.id },
      data: {
        status: "VERIFIED",
        verifiedAt: new Date(),
        verifiedById: input.actor.id ?? null,
      },
    });

    if (input.treasuryAccountId) {
      await tx.cashMovement.create({
        data: {
          organizationId: payment.organizationId,
          companyId: payment.companyId,
          treasuryAccountId: input.treasuryAccountId,
          movementType: "COLLECTION",
          amount: payment.amount,
          currency: payment.currency,
          movementDate: payment.paymentDate,
          reference: payment.bankReference,
          description: "Client payment collection",
          clientPaymentId: payment.id,
          createdById: input.actor.id ?? null,
        },
      });
    }

    await recordFinancialAudit({
      actor: input.actor,
      action: "PAYMENT_VERIFIED_ALLOCATED",
      entityType: "ClientPayment",
      entityId: payment.id,
      companyId: payment.companyId,
      after: { allocations: input.allocations },
    });

    return verified;
  });
}
