import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { canManageInvoices } from "@/lib/auth/permissions";
import type { Role } from "@/types";
import { prisma } from "@/lib/db";
import { transitionInvoiceStatus } from "@/lib/financial/invoice-service";
import type { InvoiceStatusCode } from "@/lib/financial/invoice-status";
import { assertFinancialCompanyAccess } from "@/lib/financial/tenant";

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const role = session.user.role as Role;
  if (!canManageInvoices(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await ctx.params;
  const body = (await req.json()) as { to: InvoiceStatusCode };

  try {
    const existing = await prisma.invoice.findUnique({
      where: { id },
      select: { companyId: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }
    assertFinancialCompanyAccess({
      role,
      sessionCompanyId: session.user.companyId,
      resourceCompanyId: existing.companyId,
    });

    const invoice = await transitionInvoiceStatus(id, body.to, {
      id: session.user.id,
      name: session.user.name ?? "User",
      role,
      companyId: session.user.companyId,
    });
    return NextResponse.json({ invoice });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Transition failed";
    const status = msg.includes("denied") || msg.includes("scope") ? 403 : 400;
    return NextResponse.json({ error: msg }, { status });
  }
}
