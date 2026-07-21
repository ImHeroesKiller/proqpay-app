import { NextResponse } from "next/server";
import {
  PAYROLL_APPROVER_ROLES,
  requireApiAuth,
  tenantErrorResponse,
  type ApiAuth,
} from "@/lib/auth/api";
import { canAccessModule } from "@/lib/auth/permissions";
import { actOnApprovalStep } from "@/lib/payroll/actions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const gate = await requireApiAuth({ roles: PAYROLL_APPROVER_ROLES });
  if (!gate.ok) return gate.response;

  const role = gate.auth.role;
  if (
    !canAccessModule(role, "approval") &&
    !canAccessModule(role, "payroll") &&
    role !== "SUPER_ADMIN"
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return handleApprove(gate.auth, req);
}

async function handleApprove(auth: ApiAuth, req: Request) {
  try {
    const body = (await req.json()) as {
      stepId?: string;
      decision?: "APPROVED" | "REJECTED";
      comment?: string;
    };
    if (!body.stepId || !body.decision) {
      return NextResponse.json(
        { error: "stepId and decision required" },
        { status: 400 },
      );
    }
    await actOnApprovalStep(auth, body.stepId, body.decision, body.comment);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return tenantErrorResponse(e);
  }
}
