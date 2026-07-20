import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { canAccessModule } from "@/lib/auth/permissions";
import type { Role } from "@/types";
import {
  recordWcApproval,
  recordWcSettlement,
} from "@/lib/financial/working-capital-service";
import type { WcApprovalDecision, WcSettlementKind } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const role = session.user.role as Role;
  if (!canAccessModule(role, "working_capital")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await req.json()) as {
    action: "approve" | "settle";
    workingCapitalRequestId: string;
    decision?: WcApprovalDecision;
    comment?: string;
    amount?: number;
    settlementDate?: string;
    kind?: WcSettlementKind;
  };

  const actor = {
    id: session.user.id,
    name: session.user.name ?? "User",
    role,
    companyId: session.user.companyId,
  };

  try {
    if (body.action === "approve") {
      if (!body.decision) {
        return NextResponse.json({ error: "decision required" }, { status: 400 });
      }
      const approval = await recordWcApproval({
        workingCapitalRequestId: body.workingCapitalRequestId,
        decision: body.decision,
        comment: body.comment,
        actor,
      });
      return NextResponse.json({ approval });
    }
    if (body.action === "settle") {
      if (!body.amount || !body.settlementDate) {
        return NextResponse.json(
          { error: "amount and settlementDate required" },
          { status: 400 },
        );
      }
      const result = await recordWcSettlement({
        workingCapitalRequestId: body.workingCapitalRequestId,
        amount: body.amount,
        settlementDate: new Date(body.settlementDate),
        kind: body.kind,
        actor,
      });
      return NextResponse.json(result);
    }
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "WC action failed" },
      { status: 400 },
    );
  }
}
