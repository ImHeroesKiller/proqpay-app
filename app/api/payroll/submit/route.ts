import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { submitPayrollForApproval } from "@/lib/payroll/actions";
import type { Role } from "@/types";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = (await req.json()) as { periodId?: string };
    if (!body.periodId) {
      return NextResponse.json({ error: "periodId required" }, { status: 400 });
    }
    await submitPayrollForApproval(
      {
        userId: session.user.id,
        role: (session.user.role as Role) ?? "VIEWER",
        organizationId: session.user.organizationId,
        companyId: session.user.companyId,
      },
      body.periodId,
    );
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed" },
      { status: 400 },
    );
  }
}
