import { NextResponse } from "next/server";
import {
  ATTENDANCE_MUTATOR_ROLES,
  requireApiAuth,
  tenantErrorResponse,
} from "@/lib/auth/api";
import {
  listExceptions,
  resolveException,
} from "@/lib/attendance/import-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const gate = await requireApiAuth({ module: "attendance" });
  if (!gate.ok) return gate.response;

  try {
    const url = new URL(req.url);
    const exceptions = await listExceptions(gate.auth, {
      companyId: url.searchParams.get("companyId") ?? undefined,
      batchId: url.searchParams.get("batchId") ?? undefined,
      payrollPeriodId: url.searchParams.get("payrollPeriodId") ?? undefined,
      status:
        (url.searchParams.get("status") as "OPEN" | "RESOLVED" | "IGNORED") ||
        "OPEN",
    });
    return NextResponse.json({ exceptions });
  } catch (e) {
    return tenantErrorResponse(e);
  }
}

export async function POST(req: Request) {
  const gate = await requireApiAuth({
    module: "attendance",
    roles: ATTENDANCE_MUTATOR_ROLES,
  });
  if (!gate.ok) return gate.response;

  try {
    const body = (await req.json()) as {
      exceptionId?: string;
      action?: "RESOLVED" | "IGNORED";
      note?: string;
    };
    if (!body.exceptionId || !body.action) {
      return NextResponse.json(
        { error: "exceptionId and action required" },
        { status: 400 },
      );
    }
    const updated = await resolveException(
      gate.auth,
      body.exceptionId,
      body.action,
      body.note,
    );
    return NextResponse.json({ exception: updated });
  } catch (e) {
    return tenantErrorResponse(e);
  }
}
