import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { actOnApprovalStep } from "@/lib/payroll/actions";
import type { Role } from "@/types";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = (await req.json()) as {
      stepId?: string;
      decision?: "APPROVED" | "REJECTED";
      comment?: string;
    };
    if (!body.stepId || !body.decision) {
      return NextResponse.json({ error: "stepId and decision required" }, { status: 400 });
    }
    await actOnApprovalStep(
      {
        userId: session.user.id,
        role: (session.user.role as Role) ?? "VIEWER",
        organizationId: session.user.organizationId,
        companyId: session.user.companyId,
      },
      body.stepId,
      body.decision,
      body.comment,
    );
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed" },
      { status: 400 },
    );
  }
}
