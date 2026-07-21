/**
 * Controlled service-level smoke: period → invoice → AR → payment → allocate.
 * Run: pnpm exec tsx scripts/smoke-payroll-to-cash.ts
 */
import { PrismaClient } from "@prisma/client";
import {
  createDraftInvoice,
  transitionInvoiceStatus,
} from "../lib/financial/invoice-service";
import {
  createClientPayment,
  verifyAndAllocatePayment,
} from "../lib/financial/payment-service";

const p = new PrismaClient();
const actor = {
  id: null as string | null,
  name: "integration-audit",
  role: "SUPER_ADMIN" as const,
  companyId: null as string | null,
};

async function main() {
  const period = await p.payrollPeriod.findFirst({
    where: { status: { not: "DRAFT" }, totalNet: { gt: 0 } },
    include: { company: true },
    orderBy: { createdAt: "desc" },
  });
  if (!period) {
    console.log(JSON.stringify({ ok: false, reason: "No eligible period" }));
    return;
  }

  const existing = await p.invoice.findFirst({
    where: {
      payrollPeriodId: period.id,
      status: { notIn: ["VOID", "CANCELLED"] },
    },
  });
  if (existing) {
    console.log(
      JSON.stringify({
        ok: true,
        skipped: true,
        invoiceId: existing.id,
        status: existing.status,
      }),
    );
    return;
  }

  let cur = await createDraftInvoice(
    {
      organizationId: period.company.organizationId,
      companyId: period.companyId,
      clientId: period.companyId,
      payrollPeriodId: period.id,
      notes: "AUDIT_SMOKE",
      items: [
        {
          kind: "PAYROLL",
          description: "Audit smoke net",
          unitPrice: Number(period.totalNet),
        },
      ],
    },
    actor,
  );

  for (const to of ["PENDING_APPROVAL", "APPROVED", "ISSUED"] as const) {
    cur = (await transitionInvoiceStatus(cur.id, to, actor)) as typeof cur;
  }

  const payment = await createClientPayment({
    organizationId: period.company.organizationId,
    companyId: period.companyId,
    paymentDate: new Date(),
    amount: Number(cur.grandTotal),
    notes: "AUDIT_SMOKE",
    actor,
  });

  await verifyAndAllocatePayment({
    paymentId: payment.id,
    allocations: [{ invoiceId: cur.id, amount: Number(cur.grandTotal) }],
    actor,
  });

  const invAfter = await p.invoice.findUnique({ where: { id: cur.id } });
  const recvAfter = await p.receivable.findUnique({
    where: { invoiceId: cur.id },
  });

  console.log(
    JSON.stringify(
      {
        ok: true,
        periodId: period.id,
        invoiceId: cur.id,
        invoiceNumber: invAfter?.invoiceNumber,
        invoiceStatus: invAfter?.status,
        paid: String(invAfter?.paidAmount),
        outstanding: String(invAfter?.outstandingAmount),
        receivableStatus: recvAfter?.status,
        receivableOutstanding: String(recvAfter?.outstanding),
      },
      null,
      2,
    ),
  );
}

main()
  .catch((e) => {
    console.error("SMOKE_FAIL", e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await p.$disconnect();
  });
