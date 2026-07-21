import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { canManageInvoices } from "@/lib/auth/permissions";
import type { Role } from "@/types";
import { prisma } from "@/lib/db";
import { createDraftInvoice } from "@/lib/financial/invoice-service";
import { resolveFinancialTenant } from "@/lib/financial/tenant";
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
  const organizationId = session.user.organizationId;
  const invoices = await prisma.invoice.findMany({
    where: {
      ...(companyId ? { companyId } : {}),
      ...(organizationId && !companyId ? { organizationId } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      invoiceNumber: true,
      status: true,
      grandTotal: true,
      outstandingAmount: true,
      paidAmount: true,
      currency: true,
      dueDate: true,
      companyId: true,
      clientId: true,
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
    action?: "create" | "fromPayrollPeriod";
    organizationId?: string;
    companyId?: string;
    clientId?: string;
    projectId?: string;
    payrollPeriodId?: string;
    dueDate?: string;
    notes?: string;
    items?: {
      kind?: InvoiceItemKind;
      description: string;
      quantity?: number;
      unitPrice: number;
      tax?: number;
    }[];
  };

  const actor = {
    id: session.user.id,
    name: session.user.name ?? "User",
    role,
    companyId: session.user.companyId,
  };

  try {
    // Draft invoice from closed/approved payroll period totals
    if (body.action === "fromPayrollPeriod") {
      if (!body.payrollPeriodId) {
        return NextResponse.json(
          { error: "payrollPeriodId required" },
          { status: 400 },
        );
      }
      const period = await prisma.payrollPeriod.findUnique({
        where: { id: body.payrollPeriodId },
        include: { company: true },
      });
      if (!period) {
        return NextResponse.json({ error: "Period not found" }, { status: 404 });
      }
      if (
        role !== "SUPER_ADMIN" &&
        session.user.companyId &&
        period.companyId !== session.user.companyId
      ) {
        return NextResponse.json({ error: "Cross-company denied" }, { status: 403 });
      }

      const net = Number(period.totalNet);
      const bpjsEmployer = Number(period.totalBpjsEmployer);
      const items: {
        kind?: InvoiceItemKind;
        description: string;
        quantity?: number;
        unitPrice: number;
        tax?: number;
      }[] = [
        {
          kind: "PAYROLL",
          description: `Payroll net — ${period.name}`,
          quantity: 1,
          unitPrice: net,
        },
      ];
      if (bpjsEmployer > 0) {
        items.push({
          kind: "BPJS",
          description: `BPJS employer — ${period.name}`,
          quantity: 1,
          unitPrice: bpjsEmployer,
        });
      }

      const invoice = await createDraftInvoice(
        {
          organizationId: period.company.organizationId,
          companyId: period.companyId,
          clientId: period.companyId,
          projectId: period.projectId ?? undefined,
          payrollPeriodId: period.id,
          dueDate: body.dueDate
            ? new Date(body.dueDate)
            : period.company.paymentTermsDays
              ? new Date(
                  Date.now() + period.company.paymentTermsDays * 86400000,
                )
              : null,
          notes: body.notes ?? `Generated from payroll period ${period.name}`,
          items,
        },
        actor,
      );
      return NextResponse.json({ invoice }, { status: 201 });
    }

    const tenant = resolveFinancialTenant({
      role,
      sessionOrganizationId: session.user.organizationId,
      sessionCompanyId: session.user.companyId,
      bodyOrganizationId: body.organizationId,
      bodyCompanyId: body.companyId,
    });

    if (!body.clientId || !body.items?.length) {
      return NextResponse.json(
        { error: "clientId and items required" },
        { status: 400 },
      );
    }

    const invoice = await createDraftInvoice(
      {
        organizationId: tenant.organizationId,
        companyId: tenant.companyId,
        clientId: body.clientId,
        projectId: body.projectId,
        payrollPeriodId: body.payrollPeriodId,
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
        notes: body.notes,
        items: body.items,
      },
      actor,
    );
    return NextResponse.json({ invoice }, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Create failed" },
      { status: 400 },
    );
  }
}
