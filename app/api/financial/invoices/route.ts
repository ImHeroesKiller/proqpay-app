import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { canManageInvoices } from "@/lib/auth/permissions";
import type { Role } from "@/types";
import { prisma } from "@/lib/db";
import { createDraftInvoice } from "@/lib/financial/invoice-service";
import type { InvoiceItemKind } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const role = session.user.role as Role;
  if (!canManageInvoices(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const companyId = session.user.companyId;
  const invoices = await prisma.invoice.findMany({
    where: companyId ? { companyId } : undefined,
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      invoiceNumber: true,
      status: true,
      grandTotal: true,
      outstandingAmount: true,
      currency: true,
      dueDate: true,
      companyId: true,
      payrollPeriodId: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ invoices });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const role = session.user.role as Role;
  if (!canManageInvoices(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await req.json()) as {
    organizationId: string;
    companyId: string;
    clientId: string;
    projectId?: string;
    payrollPeriodId?: string;
    dueDate?: string;
    notes?: string;
    items: {
      kind?: InvoiceItemKind;
      description: string;
      quantity?: number;
      unitPrice: number;
      tax?: number;
    }[];
  };

  try {
    const invoice = await createDraftInvoice(
      {
        organizationId: body.organizationId,
        companyId: body.companyId,
        clientId: body.clientId,
        projectId: body.projectId,
        payrollPeriodId: body.payrollPeriodId,
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
        notes: body.notes,
        items: body.items,
      },
      {
        id: session.user.id,
        name: session.user.name ?? "User",
        role,
        companyId: session.user.companyId,
      },
    );
    return NextResponse.json({ invoice }, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Create failed" },
      { status: 400 },
    );
  }
}
