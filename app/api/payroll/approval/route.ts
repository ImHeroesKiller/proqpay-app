import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { canAccessModule } from "@/lib/auth/permissions";
import type { Role } from "@/types";
import {
  actOnApprovalStep,
  getApprovalTimeline,
} from "@/lib/payroll-engine/approval-service";
import type { EngineApprovalAction } from "@prisma/client";

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
  const approval = await getApprovalTimeline(calculationId);
  return NextResponse.json({ approval });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canAccessModule(session.user.role as Role, "approval") &&
      !canAccessModule(session.user.role as Role, "payroll")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = (await req.json()) as {
    stepId: string;
    action: EngineApprovalAction;
    comment?: string;
  };
  try {
    const result = await actOnApprovalStep({
      stepId: body.stepId,
      action: body.action,
      comment: body.comment,
      actorId: session.user.id,
    });
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Approval failed" },
      { status: 400 },
    );
  }
}
