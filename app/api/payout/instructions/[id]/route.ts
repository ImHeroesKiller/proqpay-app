import { NextResponse } from "next/server";
import { requireApiAuth, tenantErrorResponse } from "@/lib/auth/api";
import { getInstruction } from "@/lib/payout/instruction-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const gate = await requireApiAuth({ module: "payment_instructions" });
  if (!gate.ok) return gate.response;
  try {
    const { id } = await ctx.params;
    const instruction = await getInstruction(gate.auth, id);
    return NextResponse.json({ instruction });
  } catch (e) {
    return tenantErrorResponse(e);
  }
}
