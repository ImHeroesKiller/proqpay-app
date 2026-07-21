import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { canAccessModule } from "@/lib/auth/permissions";
import type { Role } from "@/types";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canAccessModule(session.user.role as Role, "payroll")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const calculationId = new URL(req.url).searchParams.get("calculationId");
  if (!calculationId) {
    return NextResponse.json({ error: "calculationId required" }, { status: 400 });
  }
  const journal = await prisma.payrollJournal.findUnique({
    where: { calculationId },
  });
  return NextResponse.json({ journal });
}
