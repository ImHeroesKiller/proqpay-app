import { NextResponse } from "next/server";
import { requireApiAuth, tenantErrorResponse } from "@/lib/auth/api";
import { approveInstruction } from "@/lib/payout/instruction-service";
import { canAccessModule } from "@/lib/auth/permissions";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const gate = await requireApiAuth({ module: "payment_instructions" });
  if (!gate.ok) {
    const alt = await requireApiAuth({ module: "approval" });
    if (!alt.ok) return gate.response;
    return handle(alt.auth, req, ctx);
  }
  if (
    !canAccessModule(gate.auth.role, "approval") &&
    !canAccessModule(gate.auth.role, "payment_instructions") &&
    gate.auth.role !== "SUPER_ADMIN"
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return handle(gate.auth, req, ctx);
}

async function handle(
  auth: {
    userId: string;
    role: import("@/types").Role;
    organizationId?: string | null;
    companyId?: string | null;
    name: string;
  },
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await ctx.params;
    const body = (await req.json().catch(() => ({}))) as { comment?: string };
    const instruction = await approveInstruction(auth, id, {
      comment: body.comment,
    });
    return NextResponse.json({ instruction });
  } catch (e) {
    return tenantErrorResponse(e);
  }
}
