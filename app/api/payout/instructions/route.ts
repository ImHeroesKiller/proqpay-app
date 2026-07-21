import { NextResponse } from "next/server";
import {
  requireApiAuth,
  tenantErrorResponse,
} from "@/lib/auth/api";
import {
  createInstruction,
  listInstructions,
} from "@/lib/payout/instruction-service";
import { isMakerRole } from "@/lib/payout/state-machine";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const gate = await requireApiAuth({ module: "payment_instructions" });
  if (!gate.ok) return gate.response;
  try {
    const url = new URL(req.url);
    const rows = await listInstructions(gate.auth, {
      approvalStatus: url.searchParams.get("approvalStatus") ?? undefined,
      executionStatus: url.searchParams.get("executionStatus") ?? undefined,
      phase: url.searchParams.get("phase") ?? undefined,
      take: Number(url.searchParams.get("take") ?? 50),
    });
    return NextResponse.json({ instructions: rows });
  } catch (e) {
    return tenantErrorResponse(e);
  }
}

export async function POST(req: Request) {
  const gate = await requireApiAuth({ module: "payment_instructions" });
  if (!gate.ok) return gate.response;
  if (!isMakerRole(gate.auth.role) && gate.auth.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const body = (await req.json()) as {
      periodId?: string;
      idempotencyKey?: string;
    };
    if (!body.periodId) {
      return NextResponse.json({ error: "periodId required" }, { status: 400 });
    }
    const result = await createInstruction(gate.auth, {
      periodId: body.periodId,
      idempotencyKey: body.idempotencyKey ?? null,
    });
    return NextResponse.json(result, {
      status: result.idempotent ? 200 : 201,
    });
  } catch (e) {
    return tenantErrorResponse(e);
  }
}
