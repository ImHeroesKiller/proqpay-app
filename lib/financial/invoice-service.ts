/**
 * InvoiceService — transaction-safe invoice lifecycle.
 */

import { prisma } from "@/lib/db";
import type { InvoiceItemKind, InvoiceStatus, Prisma } from "@prisma/client";
import {
  assertInvoiceTransition,
  createsReceivable,
  formatInvoiceNumber,
  payrollStatusAllowsInvoice,
  type InvoiceStatusCode,
} from "@/lib/financial/invoice-status";
import {
  agingBucket,
  agingDays,
  deriveReceivableStatus,
} from "@/lib/financial/receivable-rules";
import {
  recordFinancialAudit,
  type FinancialActor,
} from "@/lib/financial/audit";

function num(v: { toString(): string } | number): number {
  return typeof v === "number" ? v : Number(v.toString());
}

export type CreateInvoiceInput = {
  organizationId: string;
  companyId: string;
  clientId: string;
  projectId?: string | null;
  payrollPeriodId?: string | null;
  currency?: string;
  dueDate?: Date | null;
  notes?: string | null;
  items: {
    kind?: InvoiceItemKind;
    description: string;
    quantity?: number;
    unit?: string | null;
    unitPrice: number;
    tax?: number;
  }[];
};

async function nextInvoiceNumber(
  tx: Prisma.TransactionClient,
  organizationId: string,
  at = new Date(),
): Promise<string> {
  const year = at.getUTCFullYear();
  const month = at.getUTCMonth() + 1;
  const prefix = "INV";
  const row = await tx.invoiceSequence.upsert({
    where: {
      organizationId_year_month_prefix: {
        organizationId,
        year,
        month,
        prefix,
      },
    },
    create: {
      organizationId,
      year,
      month,
      prefix,
      lastValue: 1,
    },
    update: {
      lastValue: { increment: 1 },
    },
  });
  return formatInvoiceNumber(prefix, year, month, row.lastValue);
}

function totalsFromItems(
  items: CreateInvoiceInput["items"],
): { subtotal: number; tax: number; grandTotal: number } {
  let subtotal = 0;
  let tax = 0;
  for (const it of items) {
    const qty = it.quantity ?? 1;
    const amount = qty * it.unitPrice;
    subtotal += amount;
    tax += it.tax ?? 0;
  }
  return { subtotal, tax, grandTotal: subtotal + tax };
}

export async function createDraftInvoice(
  input: CreateInvoiceInput,
  actor: FinancialActor,
) {
  if (!input.items.length) throw new Error("Invoice requires at least one item");

  if (input.payrollPeriodId) {
    const period = await prisma.payrollPeriod.findUnique({
      where: { id: input.payrollPeriodId },
    });
    if (!period) throw new Error("Payroll period not found");
    if (!payrollStatusAllowsInvoice(period.status)) {
      throw new Error("Draft payroll cannot be invoiced / become receivable");
    }
    const existing = await prisma.invoice.findFirst({
      where: {
        payrollPeriodId: input.payrollPeriodId,
        status: { notIn: ["VOID", "CANCELLED"] },
      },
    });
    if (existing) {
      throw new Error("Invoice already exists for this payroll period");
    }
  }

  const { subtotal, tax, grandTotal } = totalsFromItems(input.items);

  const invoice = await prisma.$transaction(async (tx) => {
    const created = await tx.invoice.create({
      data: {
        organizationId: input.organizationId,
        companyId: input.companyId,
        clientId: input.clientId,
        projectId: input.projectId ?? null,
        payrollPeriodId: input.payrollPeriodId ?? null,
        currency: input.currency ?? "IDR",
        dueDate: input.dueDate ?? null,
        notes: input.notes ?? null,
        status: "DRAFT",
        subtotal,
        tax,
        grandTotal,
        paidAmount: 0,
        outstandingAmount: grandTotal,
        createdById: actor.id ?? null,
        items: {
          create: input.items.map((it, i) => {
            const qty = it.quantity ?? 1;
            const amount = qty * it.unitPrice;
            return {
              kind: it.kind ?? "OTHER",
              description: it.description,
              quantity: qty,
              unit: it.unit ?? null,
              unitPrice: it.unitPrice,
              amount,
              tax: it.tax ?? 0,
              sortOrder: i,
            };
          }),
        },
      },
      include: { items: true },
    });
    return created;
  });

  await recordFinancialAudit({
    actor,
    action: "INVOICE_CREATED",
    entityType: "Invoice",
    entityId: invoice.id,
    companyId: invoice.companyId,
    after: { status: invoice.status, grandTotal: num(invoice.grandTotal) },
  });

  return invoice;
}

export async function transitionInvoiceStatus(
  invoiceId: string,
  to: InvoiceStatusCode,
  actor: FinancialActor,
) {
  return prisma.$transaction(async (tx) => {
    const inv = await tx.invoice.findUnique({ where: { id: invoiceId } });
    if (!inv) throw new Error("Invoice not found");
    const from = inv.status as InvoiceStatusCode;
    assertInvoiceTransition(from, to);

    const data: Prisma.InvoiceUpdateInput = {
      status: to as InvoiceStatus,
      version: { increment: 1 },
    };

    if (to === "APPROVED") {
      data.approvedAt = new Date();
      data.approvedById = actor.id ?? null;
    }
    if (to === "ISSUED") {
      if (!inv.invoiceNumber) {
        const number = await nextInvoiceNumber(tx, inv.organizationId);
        data.invoiceNumber = number;
      }
      data.issuedAt = new Date();
      data.issueDate = inv.issueDate ?? new Date();
      if (!inv.dueDate) {
        const due = new Date();
        due.setUTCDate(due.getUTCDate() + 30);
        data.dueDate = due;
      }
    }
    if (to === "CANCELLED" || to === "VOID") {
      data.cancelledAt = new Date();
    }

    const updated = await tx.invoice.update({
      where: { id: invoiceId },
      data,
    });

    if (createsReceivable(to) || to === "PAID" || to === "PARTIALLY_PAID") {
      await upsertReceivableTx(tx, updated.id);
    }
    if (to === "VOID" || to === "CANCELLED") {
      await tx.receivable.deleteMany({ where: { invoiceId } });
    }

    await recordFinancialAudit({
      actor,
      action: `INVOICE_${to}`,
      entityType: "Invoice",
      entityId: invoiceId,
      companyId: inv.companyId,
      before: { status: from },
      after: { status: to },
    });

    return updated;
  });
}

export async function upsertReceivableTx(
  tx: Prisma.TransactionClient,
  invoiceId: string,
  now = new Date(),
) {
  const inv = await tx.invoice.findUnique({ where: { id: invoiceId } });
  if (!inv) throw new Error("Invoice not found");
  const outstanding = num(inv.outstandingAmount);
  const grand = num(inv.grandTotal);
  const due = inv.dueDate;
  const days = agingDays(due, now);
  const status = deriveReceivableStatus({
    outstanding,
    grandTotal: grand,
    dueDate: due,
    now,
  });

  return tx.receivable.upsert({
    where: { invoiceId },
    create: {
      organizationId: inv.organizationId,
      companyId: inv.companyId,
      invoiceId,
      outstanding,
      originalAmount: grand,
      agingDays: Math.max(0, days),
      currentBucket: agingBucket(days),
      expectedCollection: due,
      status,
      lastComputedAt: now,
    },
    update: {
      outstanding,
      originalAmount: grand,
      agingDays: Math.max(0, days),
      currentBucket: agingBucket(days),
      expectedCollection: due,
      status,
      lastComputedAt: now,
    },
  });
}

export async function recomputeReceivable(invoiceId: string) {
  return prisma.$transaction((tx) => upsertReceivableTx(tx, invoiceId));
}
