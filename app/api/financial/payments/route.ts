import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { canAccessModule } from "@/lib/auth/permissions";
import type { Role } from "@/types";
import {
  createClientPayment,
  verifyAndAllocatePayment,
} from "@/lib/financial/payment-service";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const role = session.user.role as Role;
  if (!canAccessModule(role, "client_payments")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const companyId = session.user.companyId;
  const payments = await prisma.clientPayment.findMany({
    where: companyId ? { companyId } : undefined,
    orderBy: { paymentDate: "desc" },
    take: 50,
  });
  return NextResponse.json({ payments });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const role = session.user.role as Role;
  if (!canAccessModule(role, "client_payments")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await req.json()) as {
    action?: "create" | "verify";
    organizationId?: string;
    companyId?: string;
    paymentDate?: string;
    amount?: number;
    paymentId?: string;
    allocations?: { invoiceId: string; amount: number }[];
    treasuryAccountId?: string;
  };

  const actor = {
    id: session.user.id,
    name: session.user.name ?? "User",
    role,
    companyId: session.user.companyId,
  };

  try {
    if (body.action === "verify") {
      if (!body.paymentId || !body.allocations?.length) {
        return NextResponse.json(
          { error: "paymentId and allocations required" },
          { status: 400 },
        );
      }
      const payment = await verifyAndAllocatePayment({
        paymentId: body.paymentId,
        allocations: body.allocations,
        actor,
        treasuryAccountId: body.treasuryAccountId,
      });
      return NextResponse.json({ payment });
    }

    if (!body.organizationId || !body.companyId || !body.amount || !body.paymentDate) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    const payment = await createClientPayment({
      organizationId: body.organizationId,
      companyId: body.companyId,
      paymentDate: new Date(body.paymentDate),
      amount: body.amount,
      actor,
    });
    return NextResponse.json({ payment }, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Payment failed" },
      { status: 400 },
    );
  }
}
