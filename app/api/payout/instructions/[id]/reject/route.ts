import { NextResponse } from "next/server";
import { requireApiAuth, tenantErrorResponse } from "@/lib/auth/api";
import { rejectInstruction } from "@/lib/payout/instruction-service";

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
    return run(alt.auth, req, ctx);
  }
  return run(gate.auth, req, ctx);
}

async function run(
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
    const body = (await req.json()) as { reason?: string };
    if (!body.reason?.trim()) {
      return NextResponse.json({ error: "reason required" }, { status: 400 });
    }
    const instruction = await rejectInstruction(auth, id, {
      reason: body.reason,
    });
    return NextResponse.json({ instruction });
  } catch (e) {
    return tenantErrorResponse(e);
  }
}
