import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { canAccessModule } from "@/lib/auth/permissions";
import type { Role } from "@/types";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const role = session.user.role as Role;
  if (!canAccessModule(role, "receivables")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const companyId = session.user.companyId;
  const receivables = await prisma.receivable.findMany({
    where: companyId ? { companyId } : undefined,
    orderBy: { agingDays: "desc" },
    take: 100,
    include: {
      invoice: {
        select: {
          invoiceNumber: true,
          status: true,
          dueDate: true,
          grandTotal: true,
        },
      },
    },
  });

  return NextResponse.json({ receivables });
}
